import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import { getDb } from '../db/database.js';
import authMiddleware from '../middleware/auth.js';
import CSVParserService from '../services/FinCSVParserService.js';

const router = express.Router();
const upload = multer({ limits: { fileSize: 5 * 1024 * 1024 } });

// Store previews in memory (keyed by user_id)
const previews = new Map();

// POST /upload - Upload, parse, return preview
router.post('/upload', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const chunks = [];
    for await (const chunk of req.file.stream) {
      chunks.push(chunk);
    }
    const content = Buffer.concat(chunks).toString('utf-8');
    const fileHash = CSVParserService.computeHash(content);
    const db = getDb();

    const existingImport = db.prepare('SELECT id, filename FROM csv_imports WHERE user_id = ? AND file_hash = ?').get(req.user.id, fileHash);
    if (existingImport) {
      return res.status(409).json({
        error: 'Este arquivo ja foi importado anteriormente',
        existingImport,
      });
    }

    const rows = CSVParserService.parse(content);
    const rowsWithDuplicates = CSVParserService.findDuplicates(db, req.user.id, rows);

    const duplicateCount = rowsWithDuplicates.filter(r => r.isDuplicate).length;

    previews.set(req.user.id, {
      rows: rowsWithDuplicates,
      filename: req.file.originalname,
      fileHash,
      timestamp: Date.now(),
    });

    res.json({
      filename: req.file.originalname,
      fileHash,
      totalRows: rows.length,
      duplicateCount,
      newCount: rows.length - duplicateCount,
      preview: rowsWithDuplicates.slice(0, 20),
    });
  } catch (error) {
    console.error('[Financeiro:CSV] Upload error:', error);
    res.status(500).json({ error: error.message || 'Erro ao processar CSV' });
  }
});

// POST /confirm - Confirm import (save to DB)
router.post('/confirm', authMiddleware, (req, res) => {
  try {
    const preview = previews.get(req.user.id);
    if (!preview) {
      return res.status(400).json({ error: 'Nenhum preview disponível. Faça upload novamente.' });
    }

    const { skipDuplicates = true } = req.body;
    const db = getDb();

    const importId = uuidv4();
    let importedCount = 0;
    let skippedCount = 0;

    const insertExpense = db.prepare(`
      INSERT INTO expenses (id, user_id, csv_import_id, purchase_date, card_holder, card_last_four, bank_category, description, installment, value_usd, exchange_rate, value_brl, category_source, source, is_refund)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'bank', 'csv', ?)
    `);

    const doImport = db.transaction(() => {
      db.prepare('INSERT INTO csv_imports (id, user_id, filename, file_hash, row_count) VALUES (?, ?, ?, ?, ?)').run(importId, req.user.id, preview.filename, preview.fileHash, preview.rows.length);

      for (const row of preview.rows) {
        if (skipDuplicates && row.isDuplicate) {
          skippedCount++;
          continue;
        }

        insertExpense.run(
          uuidv4(), req.user.id, importId,
          row.purchase_date, row.card_holder, row.card_last_four, row.bank_category,
          row.description, row.installment, row.value_usd, row.exchange_rate, row.value_brl,
          row.is_refund
        );
        importedCount++;
      }

      db.prepare('UPDATE csv_imports SET imported_count = ?, skipped_count = ? WHERE id = ?').run(importedCount, skippedCount, importId);
    });

    doImport();
    previews.delete(req.user.id);

    res.json({
      success: true,
      importId,
      importedCount,
      skippedCount,
      totalRows: preview.rows.length,
    });
  } catch (error) {
    console.error('[Financeiro:CSV] Confirm error:', error);
    res.status(500).json({ error: 'Erro ao confirmar importação' });
  }
});

// GET /imports - List past imports
router.get('/imports', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const imports = db.prepare('SELECT * FROM csv_imports WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
    res.json({ imports });
  } catch (error) {
    console.error('[Financeiro:CSV] List imports error:', error);
    res.status(500).json({ error: 'Erro ao listar importações' });
  }
});

// DELETE /imports/:id - Delete import + associated expenses
router.delete('/imports/:id', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const importRecord = db.prepare('SELECT * FROM csv_imports WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);

    if (!importRecord) {
      return res.status(404).json({ error: 'Importação não encontrada' });
    }

    const doDelete = db.transaction(() => {
      db.prepare("UPDATE expenses SET deleted_at = datetime('now') WHERE csv_import_id = ? AND user_id = ?").run(req.params.id, req.user.id);
      db.prepare('DELETE FROM csv_imports WHERE id = ?').run(req.params.id);
    });

    doDelete();
    res.json({ success: true });
  } catch (error) {
    console.error('[Financeiro:CSV] Delete import error:', error);
    res.status(500).json({ error: 'Erro ao deletar importação' });
  }
});

export default router;

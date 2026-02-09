import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import { getDb } from '../db/database.js';
import authMiddleware from '../middleware/auth.js';
import { getParser, AVAILABLE_BANKS } from '../services/csv-parsers/index.js';

const router = express.Router();
const upload = multer({ limits: { fileSize: 5 * 1024 * 1024 } });

// Store previews in memory (keyed by user_id)
const previews = new Map();

/**
 * Offset a YYYY-MM string by N months
 * e.g. offsetMonth('2026-01', 2) => '2026-03'
 */
function offsetMonth(yearMonth, offset) {
  const [year, month] = yearMonth.split('-').map(Number);
  const date = new Date(year, month - 1 + offset, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

// GET /banks - List available bank parsers
router.get('/banks', authMiddleware, (req, res) => {
  res.json({ banks: AVAILABLE_BANKS });
});

// POST /upload - Upload, parse, return preview
router.post('/upload', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const bankId = req.body.bankId;
    if (!bankId) {
      return res.status(400).json({ error: 'Banco não selecionado' });
    }

    const parser = getParser(bankId);

    const content = req.file.buffer.toString('utf-8');
    const fileHash = parser.computeHash(content);
    const db = getDb();

    const existingImport = db.prepare('SELECT id, filename FROM csv_imports WHERE user_id = ? AND file_hash = ?').get(req.user.id, fileHash);
    if (existingImport) {
      return res.status(409).json({
        error: 'Este arquivo ja foi importado anteriormente',
        existingImport,
      });
    }

    const billingMonth = parser.parseBillingMonth(req.file.originalname);
    const rows = parser.parse(content);
    const rowsWithDuplicates = parser.findDuplicates(db, req.user.id, rows);

    const duplicateCount = rowsWithDuplicates.filter(r => r.isDuplicate).length;
    const reconciliationCount = rowsWithDuplicates.filter(r => r.isReconciliation).length;

    previews.set(req.user.id, {
      rows: rowsWithDuplicates,
      filename: req.file.originalname,
      fileHash,
      billingMonth,
      bankId,
      timestamp: Date.now(),
    });

    res.json({
      filename: req.file.originalname,
      fileHash,
      billingMonth,
      bankId,
      totalRows: rows.length,
      duplicateCount,
      reconciliationCount,
      newCount: rows.length - duplicateCount - reconciliationCount,
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
    const { billingMonth } = preview;

    const importId = uuidv4();
    let importedCount = 0;
    let skippedCount = 0;
    let projectedCount = 0;
    let reconciledCount = 0;

    const insertExpense = db.prepare(`
      INSERT INTO expenses (id, user_id, csv_import_id, purchase_date, card_holder, card_last_four, bank_category, description, installment, value_usd, exchange_rate, value_brl, category_source, source, is_refund, installment_group_id, installment_number, installment_total, billing_month)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'bank', ?, ?, ?, ?, ?, ?)
    `);

    const reconcileStmt = db.prepare(`
      UPDATE expenses SET source = 'csv', csv_import_id = ?, billing_month = COALESCE(?, billing_month), updated_at = datetime('now')
      WHERE id = ? AND source = 'csv_projected'
    `);

    const doImport = db.transaction(() => {
      db.prepare('INSERT INTO csv_imports (id, user_id, filename, file_hash, row_count, bank_id) VALUES (?, ?, ?, ?, ?, ?)').run(importId, req.user.id, preview.filename, preview.fileHash, preview.rows.length, preview.bankId);

      for (const row of preview.rows) {
        // Skip duplicates
        if (skipDuplicates && row.isDuplicate) {
          skippedCount++;
          continue;
        }

        const rowBillingMonth = billingMonth || row.purchase_date.substring(0, 7);

        // ═══ Scenario 1: Reconciliation ═══
        if (row.isReconciliation && row.projectedExpenseId) {
          reconcileStmt.run(importId, rowBillingMonth, row.projectedExpenseId);
          reconciledCount++;
          continue;
        }

        // Determine installment_group_id
        const hasInstallment = row.installment_number && row.installment_total;
        const canProject = hasInstallment && row.installment_number < row.installment_total && !row.is_refund;
        const groupId = hasInstallment ? uuidv4() : null;

        // ═══ Scenario 2: Import with future projections ═══
        // ═══ Scenario 3: Simple import ═══
        insertExpense.run(
          uuidv4(), req.user.id, importId,
          row.purchase_date, row.card_holder, row.card_last_four, row.bank_category,
          row.description, row.installment, row.value_usd, row.exchange_rate, row.value_brl,
          'csv', row.is_refund,
          groupId, row.installment_number || null, row.installment_total || null,
          rowBillingMonth
        );
        importedCount++;

        // Generate future projected installments
        if (canProject && billingMonth) {
          const remaining = row.installment_total - row.installment_number;
          for (let offset = 1; offset <= remaining; offset++) {
            const futureNumber = row.installment_number + offset;
            const futureBillingMonth = offsetMonth(billingMonth, offset);
            const futureInstallmentLabel = `${String(futureNumber).padStart(2, '0')}/${String(row.installment_total).padStart(2, '0')}`;

            insertExpense.run(
              uuidv4(), req.user.id, null,
              row.purchase_date, row.card_holder, row.card_last_four, row.bank_category,
              row.description, futureInstallmentLabel, row.value_usd, row.exchange_rate, row.value_brl,
              'csv_projected', row.is_refund,
              groupId, futureNumber, row.installment_total,
              futureBillingMonth
            );
            projectedCount++;
          }
        }
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
      projectedCount,
      reconciledCount,
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

// DELETE /imports/:id - Delete import + associated expenses + orphaned projections
router.delete('/imports/:id', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const importRecord = db.prepare('SELECT * FROM csv_imports WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);

    if (!importRecord) {
      return res.status(404).json({ error: 'Importação não encontrada' });
    }

    const doDelete = db.transaction(() => {
      // Find installment_group_ids from this import's expenses (for cascade)
      const groups = db.prepare(
        'SELECT DISTINCT installment_group_id FROM expenses WHERE csv_import_id = ? AND installment_group_id IS NOT NULL'
      ).all(req.params.id).map(r => r.installment_group_id);

      // Soft-delete import's expenses
      db.prepare("UPDATE expenses SET deleted_at = datetime('now') WHERE csv_import_id = ? AND user_id = ?").run(req.params.id, req.user.id);

      // Soft-delete orphaned projections from same installment groups
      if (groups.length > 0) {
        const placeholders = groups.map(() => '?').join(',');
        db.prepare(
          `UPDATE expenses SET deleted_at = datetime('now') WHERE installment_group_id IN (${placeholders}) AND source = 'csv_projected' AND deleted_at IS NULL`
        ).run(...groups);
      }

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

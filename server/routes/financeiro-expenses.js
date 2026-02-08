import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/database.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// GET / - List with filters + pagination
router.get('/', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const { month, category, holder, card, source, search, page = 1, limit = 50 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let where = 'WHERE e.user_id = ? AND e.deleted_at IS NULL';
    const params = [req.user.id];

    if (month) {
      where += ' AND e.purchase_date LIKE ?';
      params.push(`${month}%`);
    }
    if (category) {
      where += ' AND e.category_id = ?';
      params.push(category);
    }
    if (holder) {
      where += ' AND e.card_holder = ?';
      params.push(holder);
    }
    if (card) {
      where += ' AND e.card_last_four = ?';
      params.push(card);
    }
    if (source) {
      where += ' AND e.source = ?';
      params.push(source);
    }
    if (search) {
      where += ' AND e.description LIKE ?';
      params.push(`%${search}%`);
    }

    const countRow = db.prepare(`SELECT COUNT(*) as total FROM expenses e ${where}`).get(...params);

    const expenses = db.prepare(`
      SELECT e.*, c.name as category_name, c.icon as category_icon, c.color as category_color
      FROM expenses e
      LEFT JOIN categories c ON e.category_id = c.id
      ${where}
      ORDER BY e.purchase_date DESC, e.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, Number(limit), offset);

    res.json({
      expenses,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: countRow.total,
        pages: Math.ceil(countRow.total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('[Financeiro:Expenses] List error:', error);
    res.status(500).json({ error: 'Erro ao listar despesas' });
  }
});

// POST / - Create manual expense
router.post('/', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const { purchase_date, description, value_brl, category_id, card_holder, card_last_four, installment, notes } = req.body;

    if (!purchase_date || !description || value_brl === undefined) {
      return res.status(400).json({ error: 'Campos obrigatorios: purchase_date, description, value_brl' });
    }

    const id = uuidv4();
    const isRefund = Number(value_brl) < 0 ? 1 : 0;

    db.prepare(`
      INSERT INTO expenses (id, user_id, purchase_date, description, value_brl, category_id, category_source, card_holder, card_last_four, installment, source, is_refund, notes)
      VALUES (?, ?, ?, ?, ?, ?, 'manual', ?, ?, ?, 'manual', ?, ?)
    `).run(id, req.user.id, purchase_date, description, value_brl, category_id || null, card_holder || null, card_last_four || null, installment || null, isRefund, notes || null);

    const expense = db.prepare(`
      SELECT e.*, c.name as category_name, c.icon as category_icon, c.color as category_color
      FROM expenses e LEFT JOIN categories c ON e.category_id = c.id
      WHERE e.id = ?
    `).get(id);

    res.status(201).json({ expense });
  } catch (error) {
    console.error('[Financeiro:Expenses] Create error:', error);
    res.status(500).json({ error: 'Erro ao criar despesa' });
  }
});

// PUT /:id - Update expense
router.put('/:id', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM expenses WHERE id = ? AND user_id = ? AND deleted_at IS NULL').get(req.params.id, req.user.id);

    if (!existing) {
      return res.status(404).json({ error: 'Despesa nao encontrada' });
    }

    const { purchase_date, description, value_brl, category_id, category_source, card_holder, card_last_four, installment, notes } = req.body;

    db.prepare(`
      UPDATE expenses SET
        purchase_date = COALESCE(?, purchase_date),
        description = COALESCE(?, description),
        value_brl = COALESCE(?, value_brl),
        category_id = COALESCE(?, category_id),
        category_source = COALESCE(?, category_source),
        card_holder = COALESCE(?, card_holder),
        card_last_four = COALESCE(?, card_last_four),
        installment = COALESCE(?, installment),
        notes = COALESCE(?, notes),
        is_refund = CASE WHEN ? IS NOT NULL THEN CASE WHEN ? < 0 THEN 1 ELSE 0 END ELSE is_refund END,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(
      purchase_date || null, description || null, value_brl ?? null,
      category_id || null, category_source || null,
      card_holder || null, card_last_four || null, installment || null, notes || null,
      value_brl ?? null, value_brl ?? null,
      req.params.id
    );

    const expense = db.prepare(`
      SELECT e.*, c.name as category_name, c.icon as category_icon, c.color as category_color
      FROM expenses e LEFT JOIN categories c ON e.category_id = c.id
      WHERE e.id = ?
    `).get(req.params.id);

    res.json({ expense });
  } catch (error) {
    console.error('[Financeiro:Expenses] Update error:', error);
    res.status(500).json({ error: 'Erro ao atualizar despesa' });
  }
});

// DELETE /:id - Soft delete
router.delete('/:id', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const result = db.prepare("UPDATE expenses SET deleted_at = datetime('now') WHERE id = ? AND user_id = ? AND deleted_at IS NULL").run(req.params.id, req.user.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Despesa nao encontrada' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('[Financeiro:Expenses] Delete error:', error);
    res.status(500).json({ error: 'Erro ao deletar despesa' });
  }
});

// POST /bulk-category - Batch update categories
router.post('/bulk-category', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const { updates } = req.body;

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ error: 'Lista de atualizacoes vazia' });
    }

    const stmt = db.prepare(`
      UPDATE expenses SET category_id = ?, category_source = ?, category_confidence = ?, updated_at = datetime('now')
      WHERE id = ? AND user_id = ?
    `);

    const updateMany = db.transaction((items) => {
      let count = 0;
      for (const { id, category_id, category_source = 'manual', category_confidence } of items) {
        const result = stmt.run(category_id, category_source, category_confidence || null, id, req.user.id);
        count += result.changes;
      }
      return count;
    });

    const updated = updateMany(updates);
    res.json({ success: true, updated });
  } catch (error) {
    console.error('[Financeiro:Expenses] Bulk category error:', error);
    res.status(500).json({ error: 'Erro ao atualizar categorias' });
  }
});

export default router;

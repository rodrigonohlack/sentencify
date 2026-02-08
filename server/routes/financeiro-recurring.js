import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/database.js';
import authMiddleware from '../middleware/auth.js';
import RecurringService from '../services/FinRecurringService.js';

const router = express.Router();

// GET / - List recurring expenses
router.get('/', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const recurring = db.prepare(`
      SELECT r.*, c.name as category_name, c.icon as category_icon, c.color as category_color
      FROM recurring_expenses r
      LEFT JOIN categories c ON r.category_id = c.id
      WHERE r.user_id = ? AND r.deleted_at IS NULL
      ORDER BY r.due_day ASC
    `).all(req.user.id);

    res.json({ recurring });
  } catch (error) {
    console.error('[Financeiro:Recurring] List error:', error);
    res.status(500).json({ error: 'Erro ao listar recorrencias' });
  }
});

// POST / - Create recurring expense
router.post('/', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const { description, value_brl, category_id, due_day, notes } = req.body;

    if (!description || value_brl === undefined || !due_day) {
      return res.status(400).json({ error: 'Campos obrigatorios: description, value_brl, due_day' });
    }

    if (due_day < 1 || due_day > 31) {
      return res.status(400).json({ error: 'due_day deve ser entre 1 e 31' });
    }

    const id = uuidv4();
    db.prepare(`
      INSERT INTO recurring_expenses (id, user_id, description, value_brl, category_id, due_day, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.user.id, description, value_brl, category_id || null, due_day, notes || null);

    const recurring = db.prepare(`
      SELECT r.*, c.name as category_name, c.icon as category_icon, c.color as category_color
      FROM recurring_expenses r
      LEFT JOIN categories c ON r.category_id = c.id
      WHERE r.id = ?
    `).get(id);

    res.status(201).json({ recurring });
  } catch (error) {
    console.error('[Financeiro:Recurring] Create error:', error);
    res.status(500).json({ error: 'Erro ao criar recorrencia' });
  }
});

// PUT /:id - Update recurring expense
router.put('/:id', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM recurring_expenses WHERE id = ? AND user_id = ? AND deleted_at IS NULL').get(req.params.id, req.user.id);

    if (!existing) {
      return res.status(404).json({ error: 'Recorrencia nao encontrada' });
    }

    const { description, value_brl, category_id, due_day, notes } = req.body;

    db.prepare(`
      UPDATE recurring_expenses SET
        description = COALESCE(?, description),
        value_brl = COALESCE(?, value_brl),
        category_id = COALESCE(?, category_id),
        due_day = COALESCE(?, due_day),
        notes = COALESCE(?, notes),
        updated_at = datetime('now')
      WHERE id = ?
    `).run(description || null, value_brl ?? null, category_id || null, due_day || null, notes || null, req.params.id);

    const recurring = db.prepare(`
      SELECT r.*, c.name as category_name, c.icon as category_icon, c.color as category_color
      FROM recurring_expenses r
      LEFT JOIN categories c ON r.category_id = c.id
      WHERE r.id = ?
    `).get(req.params.id);

    res.json({ recurring });
  } catch (error) {
    console.error('[Financeiro:Recurring] Update error:', error);
    res.status(500).json({ error: 'Erro ao atualizar recorrencia' });
  }
});

// DELETE /:id - Soft delete
router.delete('/:id', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const result = db.prepare("UPDATE recurring_expenses SET deleted_at = datetime('now') WHERE id = ? AND user_id = ? AND deleted_at IS NULL").run(req.params.id, req.user.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Recorrencia nao encontrada' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('[Financeiro:Recurring] Delete error:', error);
    res.status(500).json({ error: 'Erro ao deletar recorrencia' });
  }
});

// POST /:id/toggle - Pause/resume
router.post('/:id/toggle', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM recurring_expenses WHERE id = ? AND user_id = ? AND deleted_at IS NULL').get(req.params.id, req.user.id);

    if (!existing) {
      return res.status(404).json({ error: 'Recorrencia nao encontrada' });
    }

    const newState = existing.is_active ? 0 : 1;
    db.prepare("UPDATE recurring_expenses SET is_active = ?, updated_at = datetime('now') WHERE id = ?").run(newState, req.params.id);

    res.json({ success: true, is_active: newState });
  } catch (error) {
    console.error('[Financeiro:Recurring] Toggle error:', error);
    res.status(500).json({ error: 'Erro ao alterar recorrencia' });
  }
});

// POST /generate - Generate current month entries
router.post('/generate', authMiddleware, (req, res) => {
  try {
    const { month } = req.body;
    const db = getDb();

    const now = new Date();
    const yearMonth = month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const result = RecurringService.generateForMonth(db, req.user.id, yearMonth);

    res.json({ success: true, ...result });
  } catch (error) {
    console.error('[Financeiro:Recurring] Generate error:', error);
    res.status(500).json({ error: 'Erro ao gerar despesas recorrentes' });
  }
});

// GET /reminders - Upcoming due dates
router.get('/reminders', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const settings = db.prepare('SELECT reminder_days FROM financeiro_settings WHERE user_id = ?').get(req.user.id);
    const days = settings?.reminder_days || 3;

    const reminders = RecurringService.getReminders(db, req.user.id, days);
    res.json({ reminders });
  } catch (error) {
    console.error('[Financeiro:Recurring] Reminders error:', error);
    res.status(500).json({ error: 'Erro ao buscar lembretes' });
  }
});

export default router;

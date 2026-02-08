import express from 'express';
import { getDb } from '../db/database.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// GET /
router.get('/', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    let settings = db.prepare('SELECT * FROM financeiro_settings WHERE user_id = ?').get(req.user.id);

    if (!settings) {
      db.prepare("INSERT INTO financeiro_settings (user_id) VALUES (?)").run(req.user.id);
      settings = db.prepare('SELECT * FROM financeiro_settings WHERE user_id = ?').get(req.user.id);
    }

    res.json({ settings });
  } catch (error) {
    console.error('[Financeiro:Settings] Get error:', error);
    res.status(500).json({ error: 'Erro ao buscar configuracoes' });
  }
});

// PUT /
router.put('/', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const { preferred_provider, default_view, reminder_days } = req.body;

    const existing = db.prepare('SELECT 1 FROM financeiro_settings WHERE user_id = ?').get(req.user.id);
    if (!existing) {
      db.prepare("INSERT INTO financeiro_settings (user_id) VALUES (?)").run(req.user.id);
    }

    db.prepare(`
      UPDATE financeiro_settings SET
        preferred_provider = COALESCE(?, preferred_provider),
        default_view = COALESCE(?, default_view),
        reminder_days = COALESCE(?, reminder_days),
        updated_at = datetime('now')
      WHERE user_id = ?
    `).run(preferred_provider || null, default_view || null, reminder_days ?? null, req.user.id);

    const settings = db.prepare('SELECT * FROM financeiro_settings WHERE user_id = ?').get(req.user.id);
    res.json({ settings });
  } catch (error) {
    console.error('[Financeiro:Settings] Update error:', error);
    res.status(500).json({ error: 'Erro ao atualizar configuracoes' });
  }
});

export default router;

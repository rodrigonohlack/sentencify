// server/routes/users.js - Listagem de usuários
// v1.40.12 - API para listar usuários disponíveis para compartilhamento

import express from 'express';
import { getDb } from '../db/database.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// ═══════════════════════════════════════════════════════════════════════════
// MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════════════

// Aplicar auth em todas as rotas
router.use(authMiddleware);

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/users - Listar todos os usuários (exceto o próprio)
// ═══════════════════════════════════════════════════════════════════════════

router.get('/', (req, res) => {
  try {
    const db = getDb();
    const userId = req.user.id;

    const users = db.prepare(`
      SELECT id, email FROM users
      WHERE id != ?
      ORDER BY email
    `).all(userId);

    res.json({ users });
  } catch (error) {
    console.error('[Users] List error:', error);
    res.status(500).json({ error: 'Erro ao listar usuários' });
  }
});

export default router;

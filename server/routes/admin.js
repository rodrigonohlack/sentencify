// server/routes/admin.js - Rotas de Administração
// v1.0.0 - CRUD de emails autorizados (protegido por senha)

import { Router } from 'express';
import crypto from 'crypto';
import { getDb } from '../db/database.js';

const router = Router();

/**
 * Middleware de autenticação admin
 * Valida senha via header X-Admin-Password (mesma senha do ACCESS_PASSWORD_HASH)
 */
const adminAuth = (req, res, next) => {
  const storedHash = process.env.ACCESS_PASSWORD_HASH;

  if (!storedHash) {
    // Modo desenvolvimento - liberar acesso
    return next();
  }

  const password = req.headers['x-admin-password'];

  if (!password) {
    return res.status(401).json({ error: 'Senha de admin não fornecida' });
  }

  const inputHash = crypto
    .createHash('sha256')
    .update(password)
    .digest('hex');

  try {
    const isValid = crypto.timingSafeEqual(
      Buffer.from(inputHash, 'hex'),
      Buffer.from(storedHash, 'hex')
    );

    if (!isValid) {
      return res.status(401).json({ error: 'Senha incorreta' });
    }

    next();
  } catch {
    return res.status(401).json({ error: 'Senha incorreta' });
  }
};

// Aplicar auth em todas as rotas
router.use(adminAuth);

/**
 * GET /api/admin/emails
 * Lista todos os emails autorizados
 */
router.get('/emails', (req, res) => {
  try {
    const db = getDb();
    const emails = db.prepare(`
      SELECT id, email, created_at, created_by
      FROM allowed_emails
      ORDER BY created_at DESC
    `).all();

    res.json({ emails });
  } catch (error) {
    console.error('[Admin] Erro ao listar emails:', error);
    res.status(500).json({ error: 'Erro ao listar emails' });
  }
});

/**
 * POST /api/admin/emails
 * Adiciona um email autorizado
 * Body: { email: string }
 */
router.post('/emails', (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Email inválido' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const db = getDb();

    // Verificar se já existe
    const existing = db.prepare('SELECT id FROM allowed_emails WHERE email = ?').get(normalizedEmail);
    if (existing) {
      return res.status(409).json({ error: 'Email já está na lista' });
    }

    // Inserir
    const result = db.prepare(`
      INSERT INTO allowed_emails (email, created_by)
      VALUES (?, ?)
    `).run(normalizedEmail, 'admin');

    console.log(`[Admin] Email adicionado: ${normalizedEmail}`);

    res.status(201).json({
      success: true,
      email: {
        id: result.lastInsertRowid,
        email: normalizedEmail,
        created_at: new Date().toISOString(),
      }
    });
  } catch (error) {
    console.error('[Admin] Erro ao adicionar email:', error);
    res.status(500).json({ error: 'Erro ao adicionar email' });
  }
});

/**
 * DELETE /api/admin/emails/:id
 * Remove um email autorizado
 */
router.delete('/emails/:id', (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();

    // Buscar email antes de deletar (para log)
    const email = db.prepare('SELECT email FROM allowed_emails WHERE id = ?').get(id);

    if (!email) {
      return res.status(404).json({ error: 'Email não encontrado' });
    }

    db.prepare('DELETE FROM allowed_emails WHERE id = ?').run(id);

    console.log(`[Admin] Email removido: ${email.email}`);

    res.json({ success: true });
  } catch (error) {
    console.error('[Admin] Erro ao remover email:', error);
    res.status(500).json({ error: 'Erro ao remover email' });
  }
});

/**
 * GET /api/admin/stats
 * Estatísticas gerais do sistema
 */
router.get('/stats', (req, res) => {
  try {
    const db = getDb();

    const stats = {
      allowedEmails: db.prepare('SELECT COUNT(*) as count FROM allowed_emails').get().count,
      users: db.prepare('SELECT COUNT(*) as count FROM users').get().count,
      models: db.prepare('SELECT COUNT(*) as count FROM models WHERE deleted_at IS NULL').get().count,
    };

    res.json(stats);
  } catch (error) {
    console.error('[Admin] Erro ao obter stats:', error);
    res.status(500).json({ error: 'Erro ao obter estatísticas' });
  }
});

export default router;

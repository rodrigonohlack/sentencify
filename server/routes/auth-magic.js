// server/routes/auth-magic.js - Magic Link Authentication Routes
// v1.0.1 - Validação de emails autorizados (allowed_emails)

import express from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/database.js';
import EmailService from '../services/EmailService.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Usar função getter para ler JWT_SECRET após dotenv carregar
const getJwtSecret = () => process.env.JWT_SECRET;
const JWT_ACCESS_EXPIRES = '7d';
const MAGIC_LINK_EXPIRES_MINUTES = 15;

// POST /api/auth/request-link
// Solicita um magic link para o email fornecido
router.post('/request-link', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Email inválido' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const db = getDb();

    // Verificar se email está na lista de autorizados
    const isAllowed = db.prepare('SELECT 1 FROM allowed_emails WHERE email = ?').get(normalizedEmail);
    if (!isAllowed) {
      console.log(`[Auth] Email não autorizado: ${normalizedEmail}`);
      return res.status(403).json({ error: 'Email não autorizado. Contate o administrador.' });
    }

    // Criar ou buscar usuário
    let user = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail);

    if (!user) {
      const userId = uuidv4();
      db.prepare('INSERT INTO users (id, email) VALUES (?, ?)').run(userId, normalizedEmail);
      user = { id: userId, email: normalizedEmail };
      console.log(`[Auth] New user created: ${normalizedEmail}`);
    }

    // Gerar token único
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + MAGIC_LINK_EXPIRES_MINUTES * 60 * 1000).toISOString();

    // Salvar magic link
    db.prepare(`
      INSERT INTO magic_links (id, user_id, token, expires_at)
      VALUES (?, ?, ?, ?)
    `).run(uuidv4(), user.id, token, expiresAt);

    // Construir URL do magic link
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const magicLink = `${frontendUrl}/auth/verify?token=${token}`;

    // Enviar email
    EmailService.init();
    await EmailService.sendMagicLink(normalizedEmail, magicLink);

    res.json({
      success: true,
      message: 'Link de acesso enviado para seu email',
      // Em desenvolvimento, retorna o link para facilitar testes
      ...(process.env.NODE_ENV !== 'production' && { devLink: magicLink }),
    });
  } catch (error) {
    console.error('[Auth] Request link error:', error);
    res.status(500).json({ error: 'Erro ao enviar link de acesso' });
  }
});

// GET /api/auth/verify/:token
// Valida o token do magic link e retorna JWT
router.get('/verify/:token', (req, res) => {
  try {
    const { token } = req.params;
    const db = getDb();

    // Buscar magic link válido
    const magicLink = db.prepare(`
      SELECT ml.*, u.email
      FROM magic_links ml
      JOIN users u ON ml.user_id = u.id
      WHERE ml.token = ? AND ml.used_at IS NULL AND ml.expires_at > datetime('now')
    `).get(token);

    if (!magicLink) {
      return res.status(400).json({ error: 'Link inválido ou expirado' });
    }

    // Marcar como usado
    db.prepare(`UPDATE magic_links SET used_at = datetime('now') WHERE id = ?`).run(magicLink.id);

    // Atualizar último login
    db.prepare(`UPDATE users SET last_login_at = datetime('now') WHERE id = ?`).run(magicLink.user_id);

    // Gerar access token JWT
    const accessToken = jwt.sign(
      { userId: magicLink.user_id, email: magicLink.email },
      getJwtSecret(),
      { expiresIn: JWT_ACCESS_EXPIRES }
    );

    // Gerar refresh token
    const refreshToken = crypto.randomBytes(32).toString('hex');
    const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    db.prepare(`
      INSERT INTO refresh_tokens (id, user_id, token, expires_at)
      VALUES (?, ?, ?, ?)
    `).run(uuidv4(), magicLink.user_id, refreshToken, refreshExpiresAt);

    console.log(`[Auth] User authenticated: ${magicLink.email}`);

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: magicLink.user_id,
        email: magicLink.email,
      },
    });
  } catch (error) {
    console.error('[Auth] Verify error:', error);
    res.status(500).json({ error: 'Erro ao verificar token' });
  }
});

// POST /api/auth/refresh
// Renova o access token usando o refresh token
router.post('/refresh', (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token não fornecido' });
    }

    const db = getDb();

    // Buscar refresh token válido
    const stored = db.prepare(`
      SELECT rt.*, u.email
      FROM refresh_tokens rt
      JOIN users u ON rt.user_id = u.id
      WHERE rt.token = ? AND rt.revoked_at IS NULL AND rt.expires_at > datetime('now')
    `).get(refreshToken);

    if (!stored) {
      return res.status(401).json({ error: 'Refresh token inválido ou expirado' });
    }

    // Revogar token antigo (rotation)
    db.prepare(`UPDATE refresh_tokens SET revoked_at = datetime('now') WHERE id = ?`).run(stored.id);

    // Gerar novos tokens
    const accessToken = jwt.sign(
      { userId: stored.user_id, email: stored.email },
      getJwtSecret(),
      { expiresIn: JWT_ACCESS_EXPIRES }
    );

    const newRefreshToken = crypto.randomBytes(32).toString('hex');
    const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    db.prepare(`
      INSERT INTO refresh_tokens (id, user_id, token, expires_at)
      VALUES (?, ?, ?, ?)
    `).run(uuidv4(), stored.user_id, newRefreshToken, refreshExpiresAt);

    res.json({ accessToken, refreshToken: newRefreshToken });
  } catch (error) {
    console.error('[Auth] Refresh error:', error);
    res.status(500).json({ error: 'Erro ao renovar token' });
  }
});

// GET /api/auth/me
// Retorna informações do usuário autenticado
router.get('/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

// POST /api/auth/logout
// Revoga o refresh token
router.post('/logout', authMiddleware, (req, res) => {
  try {
    const { refreshToken } = req.body;
    const db = getDb();

    if (refreshToken) {
      db.prepare(`UPDATE refresh_tokens SET revoked_at = datetime('now') WHERE token = ?`).run(refreshToken);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[Auth] Logout error:', error);
    res.status(500).json({ error: 'Erro ao fazer logout' });
  }
});

export default router;

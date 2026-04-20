// server/routes/google-drive.js
// v1.42.00 - Endpoints de OAuth Authorization Code Flow para Google Drive
//
// Rotas:
//   GET  /api/google-drive/status       — { connected, email?, photo? }
//   GET  /api/google-drive/auth-url     — { url } para redirect ao consentimento
//   GET  /api/google-drive/callback     — callback do Google (valida state JWT)
//   GET  /api/google-drive/access-token — token atual (refresh server-side se necessário)
//   POST /api/google-drive/disconnect   — revoga no Google + deleta row

import express from 'express';
import { getDb } from '../db/database.js';
import authMiddleware from '../middleware/auth.js';
import {
  buildAuthUrl,
  verifyStateToken,
  exchangeCodeForTokens,
  refreshAccessToken,
  revokeToken,
  fetchUserInfo,
  encryptRefreshToken,
  decryptRefreshToken,
  isAccessTokenValid,
} from '../services/GoogleDriveAuthService.js';

const router = express.Router();

// Frontend base URL para redirecionar após callback.
// Em prod usa o próprio domínio (redirect_uri já inclui domínio);
// em dev, volta para localhost:3000 (vite) em vez de localhost:3001 (server).
const getFrontendUrl = () => {
  if (process.env.NODE_ENV === 'production') return '';
  return process.env.FRONTEND_URL || 'http://localhost:3000';
};

// ═══════════════════════════════════════════════════════════════════════════
// GET /status — estado atual da conexão do usuário autenticado
// ═══════════════════════════════════════════════════════════════════════════

router.get('/status', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const row = db.prepare(
      'SELECT google_email, photo_url FROM google_drive_tokens WHERE user_id = ?'
    ).get(req.user.id);

    if (!row) return res.json({ connected: false });
    return res.json({
      connected: true,
      email: row.google_email,
      photo: row.photo_url || null,
    });
  } catch (e) {
    console.error('[GoogleDrive] Erro ao buscar status:', e);
    res.status(500).json({ error: 'Erro ao buscar status' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// GET /auth-url — URL de consentimento Google para o usuário atual
// ═══════════════════════════════════════════════════════════════════════════

router.get('/auth-url', authMiddleware, (req, res) => {
  try {
    const url = buildAuthUrl(req.user.id);
    res.json({ url });
  } catch (e) {
    console.error('[GoogleDrive] Erro ao gerar auth URL:', e);
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// GET /callback — Google redireciona para cá após autorização
// ═══════════════════════════════════════════════════════════════════════════
// SEM authMiddleware — a validação vem pelo `state` JWT.

router.get('/callback', async (req, res) => {
  const { code, state, error } = req.query;
  const frontend = getFrontendUrl();

  if (error) {
    console.warn('[GoogleDrive] Callback com erro:', error);
    return res.redirect(`${frontend}/?drive=error&reason=${encodeURIComponent(String(error))}`);
  }

  if (!code || !state) {
    return res.redirect(`${frontend}/?drive=error&reason=missing_params`);
  }

  let userId;
  try {
    userId = verifyStateToken(String(state));
  } catch (e) {
    console.warn('[GoogleDrive] State JWT inválido:', e.message);
    return res.redirect(`${frontend}/?drive=error&reason=invalid_state`);
  }

  try {
    const tokens = await exchangeCodeForTokens(String(code));
    const userInfo = await fetchUserInfo(tokens.accessToken);

    const expiresAt = Date.now() + tokens.expiresIn * 1000;
    const encrypted = encryptRefreshToken(tokens.refreshToken);

    const db = getDb();
    db.prepare(`
      INSERT INTO google_drive_tokens (
        user_id, google_email, google_user_id, photo_url,
        refresh_token_encrypted, access_token, access_token_expires_at, scope,
        connected_at, last_used_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      ON CONFLICT(user_id) DO UPDATE SET
        google_email = excluded.google_email,
        google_user_id = excluded.google_user_id,
        photo_url = excluded.photo_url,
        refresh_token_encrypted = excluded.refresh_token_encrypted,
        access_token = excluded.access_token,
        access_token_expires_at = excluded.access_token_expires_at,
        scope = excluded.scope,
        connected_at = datetime('now'),
        last_used_at = datetime('now')
    `).run(
      userId,
      userInfo.email,
      userInfo.id,
      userInfo.picture || null,
      encrypted,
      tokens.accessToken,
      expiresAt,
      tokens.scope || ''
    );

    console.log(`[GoogleDrive] Conectado: userId=${userId}, email=${userInfo.email}`);
    return res.redirect(`${frontend}/?drive=connected`);
  } catch (e) {
    console.error('[GoogleDrive] Erro no callback:', e);
    return res.redirect(`${frontend}/?drive=error&reason=${encodeURIComponent(e.message)}`);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// GET /access-token — retorna token válido, faz refresh se expirado
// ═══════════════════════════════════════════════════════════════════════════

router.get('/access-token', authMiddleware, async (req, res) => {
  try {
    const db = getDb();
    const row = db.prepare(`
      SELECT refresh_token_encrypted, access_token, access_token_expires_at
      FROM google_drive_tokens WHERE user_id = ?
    `).get(req.user.id);

    if (!row) {
      return res.status(404).json({ error: 'Google Drive não conectado', code: 'NOT_CONNECTED' });
    }

    // Se ainda válido, retorna direto
    if (row.access_token && isAccessTokenValid(row.access_token_expires_at)) {
      db.prepare('UPDATE google_drive_tokens SET last_used_at = datetime(\'now\') WHERE user_id = ?').run(req.user.id);
      return res.json({
        access_token: row.access_token,
        expires_at: row.access_token_expires_at,
      });
    }

    // Caso contrário, refresh
    const refreshToken = decryptRefreshToken(row.refresh_token_encrypted);
    let refreshed;
    try {
      refreshed = await refreshAccessToken(refreshToken);
    } catch (e) {
      if (e.code === 'REFRESH_TOKEN_REVOKED') {
        // Usuário revogou no Google → limpar nossa row para exigir nova conexão
        db.prepare('DELETE FROM google_drive_tokens WHERE user_id = ?').run(req.user.id);
        return res.status(401).json({
          error: 'Autorização revogada no Google. Reconecte.',
          code: 'REFRESH_TOKEN_REVOKED'
        });
      }
      throw e;
    }

    const expiresAt = Date.now() + refreshed.expiresIn * 1000;
    db.prepare(`
      UPDATE google_drive_tokens
      SET access_token = ?, access_token_expires_at = ?, last_used_at = datetime('now')
      WHERE user_id = ?
    `).run(refreshed.accessToken, expiresAt, req.user.id);

    return res.json({
      access_token: refreshed.accessToken,
      expires_at: expiresAt,
    });
  } catch (e) {
    console.error('[GoogleDrive] Erro ao obter access token:', e);
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /disconnect — revoga no Google + deleta row
// ═══════════════════════════════════════════════════════════════════════════

router.post('/disconnect', authMiddleware, async (req, res) => {
  try {
    const db = getDb();
    const row = db.prepare(
      'SELECT refresh_token_encrypted, access_token FROM google_drive_tokens WHERE user_id = ?'
    ).get(req.user.id);

    if (row) {
      // Tenta revogar no Google — primeiro refresh token, fallback access token.
      // Revogar refresh invalida toda a cadeia; se já foi revogado, silenciamos.
      try {
        const refreshToken = decryptRefreshToken(row.refresh_token_encrypted);
        await revokeToken(refreshToken);
      } catch (e) {
        if (row.access_token) await revokeToken(row.access_token);
      }

      db.prepare('DELETE FROM google_drive_tokens WHERE user_id = ?').run(req.user.id);
      console.log(`[GoogleDrive] Desconectado: userId=${req.user.id}`);
    }

    res.json({ success: true });
  } catch (e) {
    console.error('[GoogleDrive] Erro ao desconectar:', e);
    res.status(500).json({ error: e.message });
  }
});

export default router;

// server/services/GoogleDriveAuthService.js
// v1.42.00 - Google Drive OAuth 2.0 Authorization Code Flow
//
// Fluxo server-side com refresh tokens persistidos (criptografados).
// Substitui o Implicit Flow client-side anterior que exigia popup a cada
// expiração de token.

import crypto from 'crypto';
import jwt from 'jsonwebtoken';

// ═══════════════════════════════════════════════════════════════════════════
// ENV VARS
// ═══════════════════════════════════════════════════════════════════════════

const getClientId = () => process.env.GOOGLE_CLIENT_ID;
const getClientSecret = () => process.env.GOOGLE_CLIENT_SECRET;
const getRedirectUri = () => process.env.GOOGLE_DRIVE_REDIRECT_URI;
const getEncryptionKey = () => process.env.GOOGLE_TOKEN_ENCRYPTION_KEY;
const getJwtSecret = () => process.env.JWT_SECRET;

// Scopes: drive.file (arquivos criados pelo app) + drive.readonly (ler
// compartilhados) + profile/email (foto + identidade) + openid (exigido
// pela API OAuth2 quando se usa email/profile).
const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'openid'
].join(' ');

// Margem de segurança antes de considerar o access token expirado (2 min).
const ACCESS_TOKEN_MARGIN_MS = 2 * 60 * 1000;

// ═══════════════════════════════════════════════════════════════════════════
// CRYPTO — AES-256-GCM com IV único por refresh token
// ═══════════════════════════════════════════════════════════════════════════

// Deriva uma key de 32 bytes a partir da env var (hex ou base64).
// Aceita 64 chars hex (32 bytes) ou 44 chars base64 (32 bytes).
function getKey() {
  const raw = getEncryptionKey();
  if (!raw) throw new Error('GOOGLE_TOKEN_ENCRYPTION_KEY não configurada');
  if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, 'hex');
  const buf = Buffer.from(raw, 'base64');
  if (buf.length !== 32) {
    throw new Error('GOOGLE_TOKEN_ENCRYPTION_KEY deve ter 32 bytes (64 hex ou 44 base64)');
  }
  return buf;
}

// Formato armazenado: base64(iv) + ':' + base64(authTag) + ':' + base64(ciphertext)
export function encryptRefreshToken(plain) {
  const key = getKey();
  const iv = crypto.randomBytes(12); // GCM padrão
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${ciphertext.toString('base64')}`;
}

export function decryptRefreshToken(stored) {
  const key = getKey();
  const [ivB64, tagB64, ctB64] = stored.split(':');
  if (!ivB64 || !tagB64 || !ctB64) {
    throw new Error('Formato inválido de refresh token criptografado');
  }
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(tagB64, 'base64');
  const ciphertext = Buffer.from(ctB64, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

// ═══════════════════════════════════════════════════════════════════════════
// OAUTH STATE — JWT curto com userId + nonce (CSRF protection)
// ═══════════════════════════════════════════════════════════════════════════

export function createStateToken(userId) {
  return jwt.sign(
    { userId, nonce: crypto.randomBytes(8).toString('hex') },
    getJwtSecret(),
    { expiresIn: '10m' }
  );
}

export function verifyStateToken(state) {
  const decoded = jwt.verify(state, getJwtSecret());
  if (!decoded.userId) throw new Error('State token sem userId');
  return decoded.userId;
}

// ═══════════════════════════════════════════════════════════════════════════
// AUTH URL — monta URL de consentimento do Google
// ═══════════════════════════════════════════════════════════════════════════

export function buildAuthUrl(userId) {
  const clientId = getClientId();
  const redirectUri = getRedirectUri();
  if (!clientId || !redirectUri) {
    throw new Error('GOOGLE_CLIENT_ID ou GOOGLE_DRIVE_REDIRECT_URI não configurados');
  }
  const state = createStateToken(userId);
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',          // Necessário para receber refresh_token
    prompt: 'consent',               // Força tela de consentimento (garante refresh_token mesmo em re-autorização)
    include_granted_scopes: 'true',
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// EXCHANGE CODE — troca code por access_token + refresh_token
// ═══════════════════════════════════════════════════════════════════════════

export async function exchangeCodeForTokens(code) {
  const clientId = getClientId();
  const clientSecret = getClientSecret();
  const redirectUri = getRedirectUri();
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Env vars do Google OAuth não configuradas');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }).toString(),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Google token exchange failed: ${data.error || response.status} - ${data.error_description || ''}`);
  }

  // data: { access_token, expires_in, refresh_token, scope, token_type, id_token }
  if (!data.refresh_token) {
    throw new Error('Google não retornou refresh_token. Revogue o acesso do app em myaccount.google.com/permissions e tente novamente.');
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    scope: data.scope,
    idToken: data.id_token,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// REFRESH ACCESS TOKEN — server-to-server, sem popup
// ═══════════════════════════════════════════════════════════════════════════

export async function refreshAccessToken(refreshToken) {
  const clientId = getClientId();
  const clientSecret = getClientSecret();
  if (!clientId || !clientSecret) {
    throw new Error('Env vars do Google OAuth não configuradas');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }).toString(),
  });

  const data = await response.json();
  if (!response.ok) {
    // Se invalid_grant, o refresh token foi revogado/expirado — precisa reconectar
    const code = data.error === 'invalid_grant' ? 'REFRESH_TOKEN_REVOKED' : 'REFRESH_FAILED';
    const err = new Error(`Google refresh failed: ${data.error || response.status}`);
    err.code = code;
    throw err;
  }

  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// REVOKE TOKEN — desconexão limpa
// ═══════════════════════════════════════════════════════════════════════════

export async function revokeToken(token) {
  try {
    const response = await fetch('https://oauth2.googleapis.com/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token }).toString(),
    });
    return response.ok;
  } catch (e) {
    console.warn('[GoogleDriveAuth] Falha ao revogar token (ignorando):', e.message);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FETCH USER INFO — email + foto
// ═══════════════════════════════════════════════════════════════════════════

export async function fetchUserInfo(accessToken) {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error(`Falha ao buscar user info: ${response.status}`);
  }
  return response.json(); // { id, email, picture, name, ... }
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════════════════════════

export function isAccessTokenValid(expiresAt) {
  if (!expiresAt) return false;
  return Date.now() < expiresAt - ACCESS_TOKEN_MARGIN_MS;
}

export { SCOPES, ACCESS_TOKEN_MARGIN_MS };

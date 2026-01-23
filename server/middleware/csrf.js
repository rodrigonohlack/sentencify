import crypto from 'crypto';

/**
 * @file csrf.js
 * @description Middleware CSRF usando Double Submit Cookie pattern
 * Gera token no cookie e valida no header X-CSRF-Token
 */

const CSRF_COOKIE_NAME = 'sentencify-csrf';
const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_TOKEN_LENGTH = 32; // 256 bits

/**
 * Gera um novo token CSRF e seta como cookie
 */
export function generateCSRFToken(req, res) {
  const token = crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');

  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000, // 24 horas
    path: '/',
  });

  return token;
}

/**
 * Middleware que valida CSRF token em requests mutativas (POST, PUT, DELETE)
 * Compara o token do header X-CSRF-Token com o cookie
 */
export function csrfProtection(req, res, next) {
  // Metodos seguros nao precisam de CSRF
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  const headerToken = req.headers[CSRF_HEADER_NAME];

  if (!cookieToken || !headerToken) {
    return res.status(403).json({
      error: { type: 'csrf_error', message: 'CSRF token ausente' }
    });
  }

  // Comparacao timing-safe para prevenir timing attacks
  try {
    const cookieBuf = Buffer.from(cookieToken, 'hex');
    const headerBuf = Buffer.from(headerToken, 'hex');

    if (cookieBuf.length !== headerBuf.length || !crypto.timingSafeEqual(cookieBuf, headerBuf)) {
      return res.status(403).json({
        error: { type: 'csrf_error', message: 'CSRF token inválido' }
      });
    }
  } catch {
    return res.status(403).json({
      error: { type: 'csrf_error', message: 'CSRF token malformado' }
    });
  }

  next();
}

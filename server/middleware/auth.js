// server/middleware/auth.js - JWT Authentication Middleware
// v1.0.0 - Validação de tokens JWT

import jwt from 'jsonwebtoken';

// Usar função getter para ler JWT_SECRET após dotenv carregar
const getJwtSecret = () => process.env.JWT_SECRET;

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer '
    const jwtSecret = getJwtSecret();

    if (!jwtSecret) {
      console.error('[Auth] JWT_SECRET não configurado');
      return res.status(500).json({ error: 'Erro de configuração do servidor' });
    }

    const decoded = jwt.verify(token, jwtSecret);

    // Adiciona informações do usuário ao request
    req.user = {
      id: decoded.userId,
      email: decoded.email,
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado', code: 'TOKEN_EXPIRED' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token inválido', code: 'TOKEN_INVALID' });
    }
    console.error('[Auth] Middleware error:', error);
    return res.status(500).json({ error: 'Erro ao validar token' });
  }
};

// Middleware opcional - não falha se não houver token
export const optionalAuthMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  try {
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, getJwtSecret());
    req.user = {
      id: decoded.userId,
      email: decoded.email,
    };
  } catch {
    req.user = null;
  }

  next();
};

export default authMiddleware;

// server/middleware/financeiro-access.js
// Restringe acesso às rotas /api/financeiro/* ao email autorizado

import authMiddleware from './auth.js';

const ALLOWED_EMAIL = 'rodrigo.nohlack@gmail.com';

export default function financeiroAccess(req, res, next) {
  // Primeiro autentica (popula req.user) se ainda não autenticado
  authMiddleware(req, res, (err) => {
    if (err) return next(err);
    // Se authMiddleware retornou resposta (401/500), não continua
    if (res.headersSent) return;

    if (req.user.email !== ALLOWED_EMAIL) {
      return res.status(403).json({ error: 'Acesso restrito' });
    }
    next();
  });
}

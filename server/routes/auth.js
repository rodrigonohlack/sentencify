/**
 * Rota de autenticação simples
 * v1.33.41
 *
 * Valida senha via hash SHA-256 armazenado em variável de ambiente.
 * Não guarda nada em banco de dados - apenas valida e retorna sucesso/erro.
 */

import { Router } from 'express';
import crypto from 'crypto';

const router = Router();

/**
 * POST /api/auth
 *
 * Body: { password: string }
 * Response: { success: boolean, error?: string }
 *
 * A senha é hasheada com SHA-256 e comparada com ACCESS_PASSWORD_HASH (env var).
 * Se não houver hash configurado, o acesso é liberado (modo desenvolvimento).
 */
router.post('/', (req, res) => {
  const { password } = req.body;

  // Verificar se tem hash configurado
  const storedHash = process.env.ACCESS_PASSWORD_HASH;

  if (!storedHash) {
    // Sem hash = modo desenvolvimento, liberar acesso
    console.log('[Auth] Modo desenvolvimento - sem ACCESS_PASSWORD_HASH configurado');
    return res.json({ success: true, dev: true });
  }

  if (!password) {
    return res.status(400).json({ success: false, error: 'Senha não fornecida' });
  }

  // Gerar hash da senha recebida
  const inputHash = crypto
    .createHash('sha256')
    .update(password)
    .digest('hex');

  // Comparar hashes (timing-safe para evitar timing attacks)
  const isValid = crypto.timingSafeEqual(
    Buffer.from(inputHash, 'hex'),
    Buffer.from(storedHash, 'hex')
  );

  if (isValid) {
    console.log('[Auth] Login bem-sucedido');
    return res.json({ success: true });
  } else {
    console.log('[Auth] Senha incorreta');
    return res.status(401).json({ success: false, error: 'Senha incorreta' });
  }
});

/**
 * GET /api/auth
 *
 * Verifica se autenticação está habilitada (se há hash configurado).
 * Usado pelo frontend para decidir se mostra tela de login.
 */
router.get('/', (req, res) => {
  const hasAuth = !!process.env.ACCESS_PASSWORD_HASH;
  res.json({ authEnabled: hasAuth });
});

export default router;

// Autenticação - Vercel Serverless Function
// v1.33.41: Autenticação simples com senha hasheada

import crypto from 'crypto';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET /api/auth - verifica se auth está habilitada
  if (req.method === 'GET') {
    const hasAuth = !!process.env.ACCESS_PASSWORD_HASH;
    return res.json({ authEnabled: hasAuth });
  }

  // POST /api/auth - valida senha
  if (req.method === 'POST') {
    const { password } = req.body || {};

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
    try {
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
    } catch (error) {
      // Se o hash armazenado tiver formato inválido
      console.error('[Auth] Erro ao comparar hashes:', error.message);
      return res.status(500).json({ success: false, error: 'Erro de configuração do servidor' });
    }
  }

  return res.status(405).json({ error: { message: 'Method not allowed' } });
}

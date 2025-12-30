// Proxy para Claude API - Vercel Serverless Function
// v1.32.41: Suporte a deploy Vercel

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: { message: 'Method not allowed' } });
  }

  try {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
      return res.status(401).json({
        error: {
          type: 'authentication_error',
          message: 'API key não fornecida. Configure em Configurações IA.'
        }
      });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'prompt-caching-2024-07-31'
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();

    // Log para debug (apenas em desenvolvimento)
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Claude] ${req.body.model} - ${response.status} - ` +
        `${data.usage?.input_tokens || 0} in / ${data.usage?.output_tokens || 0} out`);
    }

    res.status(response.status).json(data);

  } catch (error) {
    console.error('[Claude] Erro:', error.message);
    res.status(500).json({
      error: {
        type: 'server_error',
        message: error.message || 'Erro ao conectar com Claude API'
      }
    });
  }
}

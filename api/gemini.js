// Proxy para Gemini API - Vercel Serverless Function
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
    const { model, request } = req.body;
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
      return res.status(401).json({
        error: {
          code: 401,
          message: 'API key não fornecida. Configure em Configurações IA.',
          status: 'UNAUTHENTICATED'
        }
      });
    }

    // URL da API Gemini (key via header, não na URL)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify(request)
    });

    const data = await response.json();

    // Log para debug (apenas em desenvolvimento)
    if (process.env.NODE_ENV !== 'production') {
      const usage = data.usageMetadata || {};
      const finishReason = data.candidates?.[0]?.finishReason;
      console.log(`[Gemini] ${model} - ${response.status} - ` +
        `${usage.promptTokenCount || 0} in / ${usage.candidatesTokenCount || 0} out` +
        (finishReason ? ` - ${finishReason}` : ''));

      // Log de thought signature se presente (Gemini 3)
      const signature = data.candidates?.[0]?.content?.parts?.[0]?.thoughtSignature;
      if (signature) {
        console.log(`[Gemini 3] Thought signature presente (${signature.length} chars)`);
      }
    }

    // Verificar bloqueio de segurança
    if (data.promptFeedback?.blockReason) {
      console.warn(`[Gemini] Prompt bloqueado: ${data.promptFeedback.blockReason}`);
    }

    const finishReason = data.candidates?.[0]?.finishReason;
    if (finishReason === 'SAFETY' || finishReason === 'RECITATION') {
      console.warn(`[Gemini] Resposta filtrada: ${finishReason}`);
    }

    res.status(response.status).json(data);

  } catch (error) {
    console.error('[Gemini] Erro:', error.message);
    res.status(500).json({
      error: {
        code: 500,
        message: error.message || 'Erro ao conectar com Gemini API',
        status: 'INTERNAL'
      }
    });
  }
}

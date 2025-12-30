import { Router } from 'express';

const router = Router();

/**
 * Proxy para Gemini API (Google)
 * POST /api/gemini/generate
 *
 * Suporta Gemini 2.5 e 3.0 com suas diferenças:
 * - Gemini 2.5: thinking_budget (numérico)
 * - Gemini 3: thinking_level (enum: minimal/low/medium/high)
 * - Gemini 3: thought signatures para multi-turn
 */
router.post('/generate', async (req, res) => {
  try {
    const { model, apiKey, request } = req.body;
    const key = apiKey || process.env.GOOGLE_API_KEY;

    if (!key) {
      return res.status(401).json({
        error: {
          code: 401,
          message: 'API key não fornecida. Configure em Configurações IA.',
          status: 'UNAUTHENTICATED'
        }
      });
    }

    // URL da API Gemini
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
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
        (finishReason ? ` - ${finishReason}` : '')); // v1.32.26: Log finishReason

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
});

/**
 * Endpoint para listar modelos disponíveis
 * GET /api/gemini/models
 */
router.get('/models', async (req, res) => {
  try {
    const apiKey = req.query.apiKey || process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      return res.status(401).json({
        error: { message: 'API key não fornecida' }
      });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    res.status(response.status).json(data);

  } catch (error) {
    res.status(500).json({
      error: { message: error.message }
    });
  }
});

export default router;

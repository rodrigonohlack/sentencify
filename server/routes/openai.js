import { Router } from 'express';

const router = Router();

/**
 * Proxy para OpenAI API
 * POST /api/openai/chat
 *
 * GPT-5.2 modelos:
 * - gpt-5.2: com reasoning (thinking)
 * - gpt-5.2-chat-latest: rápido, sem thinking
 */
router.post('/chat', async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'] || process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res.status(401).json({
        error: {
          type: 'authentication_error',
          message: 'API key OpenAI não fornecida. Configure em Configurações IA.'
        }
      });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();

    // Log para debug
    if (process.env.NODE_ENV !== 'production') {
      const model = req.body.model || 'unknown';
      const usage = data.usage || {};
      const cached = usage.prompt_tokens_details?.cached_tokens || 0;
      console.log(`[OpenAI] ${model} - ${response.status} - ` +
        `${usage.prompt_tokens || 0} in (${cached} cached) / ${usage.completion_tokens || 0} out`);

      // Log reasoning se presente
      const reasoning = data.choices?.[0]?.message?.reasoning_details;
      if (reasoning) {
        console.log(`[OpenAI] Reasoning details presente (${reasoning.length} chars)`);
      }
    }

    // Verificar erros específicos da OpenAI
    if (data.error) {
      console.error(`[OpenAI] API Error: ${data.error.message}`);
    }

    res.status(response.status).json(data);

  } catch (error) {
    console.error('[OpenAI] Erro:', error.message);
    res.status(500).json({
      error: {
        type: 'server_error',
        message: error.message || 'Erro ao conectar com OpenAI API'
      }
    });
  }
});

/**
 * Endpoint para listar modelos disponíveis
 * GET /api/openai/models
 */
router.get('/models', async (req, res) => {
  try {
    const apiKey = req.query.apiKey || process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res.status(401).json({
        error: { message: 'API key não fornecida' }
      });
    }

    const response = await fetch('https://api.openai.com/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    const data = await response.json();

    res.status(response.status).json(data);

  } catch (error) {
    res.status(500).json({
      error: { message: error.message }
    });
  }
});

export default router;

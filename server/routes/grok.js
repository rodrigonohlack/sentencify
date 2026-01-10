import { Router } from 'express';

const router = Router();

/**
 * Proxy para xAI Grok API (OpenAI-compatible)
 * POST /api/grok/chat
 *
 * Grok 4.1 modelos:
 * - grok-4-1-fast-reasoning: com reasoning embutido (2M contexto)
 * - grok-4-1-fast-non-reasoning: rápido, sem thinking
 */
router.post('/chat', async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'] || process.env.XAI_API_KEY;

    if (!apiKey) {
      return res.status(401).json({
        error: {
          type: 'authentication_error',
          message: 'API key xAI não fornecida. Configure em Configurações IA.'
        }
      });
    }

    // xAI usa formato OpenAI-compatible
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
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
      console.log(`[Grok] ${model} - ${response.status} - ` +
        `${usage.prompt_tokens || 0} in / ${usage.completion_tokens || 0} out`);
    }

    // Verificar erros específicos do Grok
    if (data.error) {
      console.error(`[Grok] API Error: ${data.error.message}`);
    }

    res.status(response.status).json(data);

  } catch (error) {
    console.error('[Grok] Erro:', error.message);
    res.status(500).json({
      error: {
        type: 'server_error',
        message: error.message || 'Erro ao conectar com xAI Grok API'
      }
    });
  }
});

export default router;

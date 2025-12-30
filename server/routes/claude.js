import { Router } from 'express';

const router = Router();

/**
 * Proxy para Claude API (Anthropic)
 * POST /api/claude/messages
 */
router.post('/messages', async (req, res) => {
  try {
    // API key do header ou variável de ambiente
    const apiKey = req.headers['x-api-key'] || process.env.ANTHROPIC_API_KEY;

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
});

export default router;

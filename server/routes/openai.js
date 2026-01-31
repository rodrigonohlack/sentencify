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

/**
 * Streaming SSE para evitar timeout do Render
 * POST /api/openai/stream
 */
router.post('/stream', async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'] || process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res.status(401).json({
        error: { message: 'API key não fornecida' }
      });
    }

    // Headers SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({ ...req.body, stream: true, stream_options: { include_usage: true } })
    });

    if (!response.ok) {
      const errorData = await response.json();
      res.write(`data: ${JSON.stringify({ type: 'error', error: errorData.error })}\n\n`);
      return res.end();
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let usage = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        res.write(`data: ${JSON.stringify({ type: 'done', usage })}\n\n`);
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              res.write(`data: ${JSON.stringify({ type: 'text', text: content })}\n\n`);
            }
            if (parsed.usage) {
              usage = parsed.usage;
            }
          } catch (e) {
            // Ignorar erros de parse
          }
        }
      }
    }

    res.end();

  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({ error: { message: error.message } });
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', error: { message: error.message } })}\n\n`);
      res.end();
    }
  }
});

export default router;

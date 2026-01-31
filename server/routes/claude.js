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

/**
 * Streaming SSE para evitar timeout do Render
 * POST /api/claude/stream
 */
router.post('/stream', async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'] || process.env.ANTHROPIC_API_KEY;

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

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'prompt-caching-2024-07-31'
      },
      body: JSON.stringify({ ...req.body, stream: true })
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
          try {
            const parsed = JSON.parse(line.slice(6));

            // Claude stream events
            if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
              res.write(`data: ${JSON.stringify({ type: 'text', text: parsed.delta.text })}\n\n`);
            }

            if (parsed.type === 'message_delta' && parsed.usage) {
              usage = {
                input_tokens: parsed.usage.input_tokens || 0,
                output_tokens: parsed.usage.output_tokens || 0
              };
            }

            if (parsed.type === 'message_start' && parsed.message?.usage) {
              usage = parsed.message.usage;
            }
          } catch (e) {
            // Ignorar erros de parse (event: lines, etc)
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

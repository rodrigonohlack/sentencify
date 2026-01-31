import { Router } from 'express';
import { createHash } from 'crypto';

const router = Router();

/**
 * Proxy para xAI Grok API (OpenAI-compatible)
 * POST /api/grok/chat
 *
 * Grok 4.1 modelos:
 * - grok-4-1-fast-reasoning: com reasoning embutido (2M contexto)
 * - grok-4-1-fast-non-reasoning: rápido, sem thinking
 *
 * v1.36.14: Adicionado x-grok-conv-id para melhorar cache hit rate
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

    // v1.36.14: Gerar x-grok-conv-id baseado na API key
    // v1.36.16: Formatar como UUID4 válido (xAI espera formato uuid4)
    // Mesmo usuário = mesmo ID de sessão = melhor cache hit rate
    const hash = createHash('md5').update(apiKey).digest('hex');
    const convId = `${hash.slice(0,8)}-${hash.slice(8,12)}-4${hash.slice(13,16)}-a${hash.slice(17,20)}-${hash.slice(20,32)}`;

    // xAI usa formato OpenAI-compatible
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'x-grok-conv-id': convId
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();

    // Log para debug (v1.36.14: mostra cached tokens)
    if (process.env.NODE_ENV !== 'production') {
      const model = req.body.model || 'unknown';
      const usage = data.usage || {};
      const cached = usage.prompt_tokens_details?.cached_tokens || 0;
      console.log(`[Grok] ${model} - ${response.status} - ` +
        `${usage.prompt_tokens || 0} in (${cached} cached) / ${usage.completion_tokens || 0} out`);
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

/**
 * Streaming SSE para evitar timeout do Render
 * POST /api/grok/stream
 */
router.post('/stream', async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'] || process.env.XAI_API_KEY;

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

    // Gerar conv-id para cache
    const hash = createHash('md5').update(apiKey).digest('hex');
    const convId = `${hash.slice(0,8)}-${hash.slice(8,12)}-4${hash.slice(13,16)}-a${hash.slice(17,20)}-${hash.slice(20,32)}`;

    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'x-grok-conv-id': convId
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

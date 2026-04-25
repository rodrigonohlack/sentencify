import { Router } from 'express';

const router = Router();

/**
 * Proxy para DeepSeek API (OpenAI-compatible)
 * POST /api/deepseek/chat
 *
 * DeepSeek V4 modelos:
 * - deepseek-v4-flash: $0.14/$0.28 per M tokens, 1M ctx, cache hit $0.028
 * - deepseek-v4-pro:   $1.74/$3.48 per M tokens, 1M ctx, cache hit $0.145
 *
 * Context caching é implícito (prefix match), reportado via
 * usage.prompt_tokens_details.cached_tokens (mesmo formato OpenAI).
 */
router.post('/chat', async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'] || process.env.DEEPSEEK_API_KEY;

    if (!apiKey) {
      return res.status(401).json({
        error: {
          type: 'authentication_error',
          message: 'API key DeepSeek não fornecida. Configure em Configurações IA.'
        }
      });
    }

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();

    if (process.env.NODE_ENV !== 'production') {
      const model = req.body.model || 'unknown';
      const usage = data.usage || {};
      // v1.43.02: DeepSeek tem campos próprios de cache (não segue padrão OpenAI)
      const cacheHit = usage.prompt_cache_hit_tokens || 0;
      const cacheMiss = usage.prompt_cache_miss_tokens || 0;
      const total = usage.prompt_tokens || 0;
      const hitRate = total > 0 ? Math.round((cacheHit / total) * 100) : 0;
      console.log(`[DeepSeek] ${model} - ${response.status} - ` +
        `${total} in (${cacheHit} hit / ${cacheMiss} miss = ${hitRate}%) / ${usage.completion_tokens || 0} out`);
    }

    if (data.error) {
      console.error(`[DeepSeek] API Error: ${data.error.message}`);
    }

    res.status(response.status).json(data);

  } catch (error) {
    console.error('[DeepSeek] Erro:', error.message);
    res.status(500).json({
      error: {
        type: 'server_error',
        message: error.message || 'Erro ao conectar com DeepSeek API'
      }
    });
  }
});

/**
 * Streaming SSE para evitar timeout do Render
 * POST /api/deepseek/stream
 */
router.post('/stream', async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'] || process.env.DEEPSEEK_API_KEY;

    if (!apiKey) {
      return res.status(401).json({
        error: { message: 'API key não fornecida' }
      });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
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

    // v1.43.03: Diagnóstico — contar chunks por tipo (text vs reasoning vs vazio)
    // para identificar por que algumas respostas vinham com fullText='' (DeepSeek
    // V4 pode mandar tudo em delta.reasoning_content quando em modo thinking).
    const debug = process.env.NODE_ENV !== 'production';
    let contentChunks = 0;
    let reasoningChunks = 0;
    let emptyDeltaChunks = 0;
    let firstSampleLogged = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        res.write(`data: ${JSON.stringify({ type: 'done', usage })}\n\n`);
        if (debug) {
          const model = req.body.model || 'unknown';
          console.log(`[DeepSeek-stream] ${model} - chunks: ${contentChunks} content, ${reasoningChunks} reasoning, ${emptyDeltaChunks} empty`);
        }
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        // v1.43.03: aceitar tanto `data: ` (com espaço, padrão SSE) quanto `data:` (sem)
        const trimmed = line.startsWith('data:') ? line.slice(line.startsWith('data: ') ? 6 : 5).trim() : null;
        if (trimmed !== null) {
          if (trimmed === '[DONE]') continue;
          if (!trimmed) continue;

          try {
            const parsed = JSON.parse(trimmed);

            // v1.43.03: log do shape do PRIMEIRO chunk em dev pra diagnóstico
            if (debug && !firstSampleLogged && parsed.choices?.[0]?.delta) {
              firstSampleLogged = true;
              const delta = parsed.choices[0].delta;
              console.log(`[DeepSeek-stream] First delta keys:`, Object.keys(delta), '— sample:', JSON.stringify(delta).slice(0, 200));
            }

            const delta = parsed.choices?.[0]?.delta || {};
            const content = delta.content;
            const reasoningContent = delta.reasoning_content;

            if (content) {
              contentChunks++;
              res.write(`data: ${JSON.stringify({ type: 'text', text: content })}\n\n`);
            } else if (reasoningContent) {
              // v1.43.03: emitir reasoning como tipo separado (cliente pode ignorar
              // ou logar). NÃO concatena na resposta final.
              reasoningChunks++;
              res.write(`data: ${JSON.stringify({ type: 'reasoning', text: reasoningContent })}\n\n`);
            } else if (delta && Object.keys(delta).length > 0 && !delta.role) {
              // delta tem campos mas nem content nem reasoning_content
              emptyDeltaChunks++;
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

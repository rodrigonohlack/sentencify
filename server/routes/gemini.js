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

    // Log de erros HTTP (sempre, incluindo produção)
    if (!response.ok) {
      const errorMsg = data.error?.message || JSON.stringify(data).slice(0, 200);
      console.error(`[Gemini] ${model} - HTTP ${response.status}: ${errorMsg}`);
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

/**
 * Streaming SSE para evitar timeout do Render
 * POST /api/gemini/stream
 */
router.post('/stream', async (req, res) => {
  try {
    const { model, apiKey, request } = req.body;
    const key = apiKey || process.env.GOOGLE_API_KEY;

    if (!key) {
      return res.status(401).json({
        error: { message: 'API key não fornecida' }
      });
    }

    // Headers SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    // URL com streamGenerateContent e alt=sse
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${key}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
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
        // Processar buffer restante antes de terminar (pode conter usageMetadata)
        if (buffer.trim()) {
          const line = buffer.trim();
          if (line.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(line.slice(6));
              if (parsed.usageMetadata) {
                usage = parsed.usageMetadata;
              }
            } catch (e) {
              // Ignorar erros de parse no buffer final
            }
          }
        }
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

            // Extrair texto (ignorar thinking blocks)
            const parts = parsed.candidates?.[0]?.content?.parts || [];
            for (const part of parts) {
              if (!part.thought && part.text) {
                res.write(`data: ${JSON.stringify({ type: 'text', text: part.text })}\n\n`);
              }
            }

            // Capturar usage metadata
            if (parsed.usageMetadata) {
              usage = parsed.usageMetadata;
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

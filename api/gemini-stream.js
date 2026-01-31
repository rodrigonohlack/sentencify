/**
 * @file gemini-stream.js
 * @description Endpoint de streaming SSE para Gemini API
 * Evita timeout do Render mantendo conexao ativa com chunks
 */

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: { message: 'Method not allowed' } });
  }

  try {
    const { model, apiKey, request } = req.body;

    if (!apiKey) {
      return res.status(401).json({
        error: {
          type: 'authentication_error',
          message: 'API key nao fornecida. Configure em Configuracoes IA.'
        }
      });
    }

    // Configurar headers SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    // Gemini usa endpoint diferente para streaming
    const streamUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}&alt=sse`;

    const response = await fetch(streamUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const errorData = await response.json();
      res.write(`data: ${JSON.stringify({ type: 'error', error: errorData.error })}\n\n`);
      res.end();
      return;
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

          try {
            const parsed = JSON.parse(data);

            // Extrair texto das parts (ignorar thinking blocks)
            const parts = parsed.candidates?.[0]?.content?.parts || [];
            for (const part of parts) {
              // Ignorar thinking blocks (thought: true)
              if (!part.thought && part.text) {
                res.write(`data: ${JSON.stringify({ type: 'text', text: part.text })}\n\n`);
              }
            }

            // Capturar usage
            if (parsed.usageMetadata) {
              usage = {
                promptTokenCount: parsed.usageMetadata.promptTokenCount || 0,
                candidatesTokenCount: parsed.usageMetadata.candidatesTokenCount || 0
              };
            }

          } catch (e) {
            // Ignorar erros de parse
          }
        }
      }
    }

    res.end();

  } catch (error) {
    console.error('[Gemini Stream] Erro:', error.message);

    if (!res.headersSent) {
      res.status(500).json({
        error: {
          type: 'server_error',
          message: error.message || 'Erro ao conectar com Gemini API'
        }
      });
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', error: { message: error.message } })}\n\n`);
      res.end();
    }
  }
}

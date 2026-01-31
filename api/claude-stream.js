/**
 * @file claude-stream.js
 * @description Endpoint de streaming SSE para Claude API
 * Evita timeout do Render mantendo conexão ativa com chunks
 */

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: { message: 'Method not allowed' } });
  }

  try {
    const apiKey = req.headers['x-api-key'];

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
    res.setHeader('X-Accel-Buffering', 'no'); // Desabilita buffering no nginx/Render

    // Adicionar stream: true ao body
    const requestBody = {
      ...req.body,
      stream: true
    };

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'prompt-caching-2024-07-31'
      },
      body: JSON.stringify(requestBody)
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
    let inputTokens = 0;
    let outputTokens = 0;

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        // Enviar evento final com usage
        res.write(`data: ${JSON.stringify({ type: 'done', usage: { input_tokens: inputTokens, output_tokens: outputTokens } })}\n\n`);
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Manter linha incompleta no buffer

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);

          if (data === '[DONE]') {
            continue;
          }

          try {
            const parsed = JSON.parse(data);

            // Extrair texto do delta
            if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
              res.write(`data: ${JSON.stringify({ type: 'text', text: parsed.delta.text })}\n\n`);
            }

            // Capturar usage do message_start
            if (parsed.type === 'message_start' && parsed.message?.usage) {
              inputTokens = parsed.message.usage.input_tokens || 0;
            }

            // Capturar usage final
            if (parsed.type === 'message_delta' && parsed.usage) {
              outputTokens = parsed.usage.output_tokens || 0;
            }

          } catch (e) {
            // Ignorar erros de parse
          }
        }
      }
    }

    res.end();

  } catch (error) {
    console.error('[Claude Stream] Erro:', error.message);

    // Se headers ainda nao foram enviados
    if (!res.headersSent) {
      res.status(500).json({
        error: {
          type: 'server_error',
          message: error.message || 'Erro ao conectar com Claude API'
        }
      });
    } else {
      // Se ja iniciou streaming, enviar erro como evento
      res.write(`data: ${JSON.stringify({ type: 'error', error: { message: error.message } })}\n\n`);
      res.end();
    }
  }
}

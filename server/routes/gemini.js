import { Router } from 'express';
import { Readable } from 'stream';
import authMiddleware from '../middleware/auth.js';
import {
  getOrCreateCache,
  refreshCache,
  deleteCache,
  markUsed,
} from '../services/GeminiCacheService.js';
import {
  startResumableUpload,
  persistUploadedFile,
  getFileStatus,
  attachCacheToMedia,
  deleteMedia,
  GEMINI_UPLOAD_BASE,
} from '../services/GeminiMediaService.js';
const router = Router();

const getApiKey = (req) => req.headers['x-api-key'] || process.env.GOOGLE_API_KEY;
const requireKey = (req, res) => {
  const k = getApiKey(req);
  if (!k) {
    res.status(401).json({
      error: { code: 401, message: 'API key não fornecida.', status: 'UNAUTHENTICATED' },
    });
    return null;
  }
  return k;
};

// ════════════════════════════════════════════════════════════════════
// POST /api/gemini/generate
// Proxy padrão. v1.43.00: aceita campo extra "cachedContent" no body.
// ════════════════════════════════════════════════════════════════════
router.post('/generate', async (req, res) => {
  try {
    const { model, request, cachedContent } = req.body;
    const key = requireKey(req, res);
    if (!key) return;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const finalRequest = { ...request };
    if (cachedContent) {
      finalRequest.cachedContent = cachedContent;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify(finalRequest),
    });

    const data = await response.json();

    if (process.env.NODE_ENV !== 'production') {
      const usage = data.usageMetadata || {};
      const finishReason = data.candidates?.[0]?.finishReason;
      const cacheTokens = usage.cachedContentTokenCount || 0;
      console.log(`[Gemini] ${model} - ${response.status} - ` +
        `${usage.promptTokenCount || 0} in / ${usage.candidatesTokenCount || 0} out` +
        (cacheTokens ? ` / cache:${cacheTokens}` : '') +
        (finishReason ? ` - ${finishReason}` : ''));
    }

    if (data.promptFeedback?.blockReason) {
      console.warn(`[Gemini] Prompt bloqueado: ${data.promptFeedback.blockReason}`);
    }

    const finishReason = data.candidates?.[0]?.finishReason;
    if (finishReason === 'SAFETY' || finishReason === 'RECITATION') {
      console.warn(`[Gemini] Resposta filtrada: ${finishReason}`);
    }

    if (!response.ok) {
      const errorMsg = data.error?.message || JSON.stringify(data).slice(0, 200);
      console.error(`[Gemini] ${model} - HTTP ${response.status}: ${errorMsg}`);
    }

    res.status(response.status).json(data);

  } catch (error) {
    console.error('[Gemini] Erro:', error.message);
    res.status(500).json({
      error: { code: 500, message: error.message || 'Erro ao conectar com Gemini API', status: 'INTERNAL' },
    });
  }
});

// ════════════════════════════════════════════════════════════════════
// GET /api/gemini/models
// ════════════════════════════════════════════════════════════════════
router.get('/models', async (req, res) => {
  try {
    const apiKey = requireKey(req, res);
    if (!apiKey) return;
    const url = `https://generativelanguage.googleapis.com/v1beta/models`;
    const response = await fetch(url, { headers: { 'x-goog-api-key': apiKey } });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// ════════════════════════════════════════════════════════════════════
// POST /api/gemini/stream  (SSE existente, sem mudança)
// ════════════════════════════════════════════════════════════════════
router.post('/stream', async (req, res) => {
  try {
    const { model, request, cachedContent } = req.body;
    const key = requireKey(req, res);
    if (!key) return;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const finalRequest = cachedContent ? { ...request, cachedContent } : request;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify(finalRequest),
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
    let groundingMetadata = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        if (buffer.trim()) {
          const line = buffer.trim();
          if (line.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(line.slice(6));
              if (parsed.usageMetadata) usage = parsed.usageMetadata;
              const gm = parsed.candidates?.[0]?.groundingMetadata;
              if (gm) groundingMetadata = gm;
            } catch { /* */ }
          }
        }
        res.write(`data: ${JSON.stringify({ type: 'done', usage, groundingMetadata })}\n\n`);
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const parsed = JSON.parse(line.slice(6));
            const parts = parsed.candidates?.[0]?.content?.parts || [];
            for (const part of parts) {
              if (!part.thought && part.text) {
                res.write(`data: ${JSON.stringify({ type: 'text', text: part.text })}\n\n`);
              }
            }
            if (parsed.usageMetadata) usage = parsed.usageMetadata;
            const gm = parsed.candidates?.[0]?.groundingMetadata;
            if (gm) groundingMetadata = gm;
          } catch { /* */ }
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

// ════════════════════════════════════════════════════════════════════
// POST /api/gemini/cache
// Body: { model, systemInstruction, stableContents, ttlSeconds? }
// Idempotente via hash. Retorna { cacheName, cacheId, hit, tokenCount }
// ════════════════════════════════════════════════════════════════════
router.post('/cache', authMiddleware, async (req, res) => {
  try {
    const apiKey = requireKey(req, res);
    if (!apiKey) return;

    const { model, systemInstruction, stableContents, ttlSeconds } = req.body || {};
    if (!model || !Array.isArray(stableContents) || stableContents.length === 0) {
      return res.status(400).json({ error: { message: 'model e stableContents obrigatórios' } });
    }

    const result = await getOrCreateCache({
      userId: req.user.id,
      apiKey,
      model,
      systemInstruction,
      stableContents,
      ttlSeconds,
    });
    res.json(result);
  } catch (error) {
    console.error('[Gemini cache create]', error.message);
    res.status(error.status || 500).json({ error: { message: error.message } });
  }
});

router.post('/cache/:id/refresh', authMiddleware, async (req, res) => {
  try {
    const apiKey = requireKey(req, res);
    if (!apiKey) return;
    const { ttlSeconds } = req.body || {};
    const result = await refreshCache({
      cacheId: req.params.id,
      userId: req.user.id,
      apiKey,
      ttlSeconds,
    });
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({ error: { message: error.message } });
  }
});

router.delete('/cache/:id', authMiddleware, async (req, res) => {
  try {
    const apiKey = requireKey(req, res);
    if (!apiKey) return;
    const result = await deleteCache({
      cacheId: req.params.id,
      userId: req.user.id,
      apiKey,
    });
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({ error: { message: error.message } });
  }
});

// ════════════════════════════════════════════════════════════════════
// POST /api/gemini/media/upload
// Headers: X-File-Name, X-File-Mime, X-File-Size, Authorization, x-api-key
// Body: stream do binário (application/octet-stream) — pipe direto pro Google
// Resposta: { id, fileUri, status, expiresAt }
// ════════════════════════════════════════════════════════════════════
// MIME types aceitos pelo Gemini File API (áudio/vídeo)
// Referência: https://ai.google.dev/gemini-api/docs/audio + /video
const ALLOWED_MEDIA_MIMES = new Set([
  // Áudio
  'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/wave',
  'audio/aiff', 'audio/x-aiff', 'audio/aac', 'audio/ogg', 'audio/flac',
  'audio/x-flac', 'audio/webm',
  // Vídeo
  'video/mp4', 'video/mpeg', 'video/mov', 'video/quicktime',
  'video/avi', 'video/x-msvideo', 'video/x-flv', 'video/flv',
  'video/mpg', 'video/webm', 'video/wmv', 'video/x-ms-wmv', 'video/3gpp',
]);

// Filename seguro: sem path traversal nem caracteres de controle
const SAFE_FILENAME_RE = /^[\w\-.()\[\] À-ÿ]+\.[a-zA-Z0-9]{1,8}$/;

function decodeHeader(value) {
  if (!value) return '';
  try { return decodeURIComponent(value); }
  catch { return value; }
}

router.post('/media/upload', authMiddleware, async (req, res) => {
  try {
    const apiKey = requireKey(req, res);
    if (!apiKey) return;

    const fileName = decodeHeader(req.headers['x-file-name']);
    const mimeType = (req.headers['x-file-mime'] || '').toString().toLowerCase();
    const fileSize = parseInt(req.headers['x-file-size'] || '0', 10);

    if (!fileName || !mimeType || !fileSize) {
      return res.status(400).json({
        error: { message: 'Headers X-File-Name, X-File-Mime e X-File-Size obrigatórios' },
      });
    }

    // Sanitização do nome (evita path traversal + caracteres de controle)
    if (fileName.includes('/') || fileName.includes('\\') || fileName.includes('\0')
        || fileName.length > 255 || !SAFE_FILENAME_RE.test(fileName)) {
      return res.status(400).json({
        error: { message: 'Nome de arquivo inválido' },
      });
    }

    // Whitelist de MIME types
    if (!ALLOWED_MEDIA_MIMES.has(mimeType)) {
      return res.status(415).json({
        error: { message: `MIME type não suportado: ${mimeType}` },
      });
    }

    const MAX_SIZE = 500 * 1024 * 1024; // 500MB
    if (fileSize > MAX_SIZE) {
      return res.status(413).json({ error: { message: `Arquivo excede ${MAX_SIZE} bytes` } });
    }
    if (fileSize <= 0) {
      return res.status(400).json({ error: { message: 'Tamanho inválido' } });
    }

    // 1) Inicia upload resumable
    const uploadUrl = await startResumableUpload({ apiKey, fileName, fileSize, mimeType });

    // 2) Faz pipe do request → upload URL (sem tocar disco)
    const webStream = Readable.toWeb(req);
    const uploadResp = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Content-Length': String(fileSize),
        'X-Goog-Upload-Offset': '0',
        'X-Goog-Upload-Command': 'upload, finalize',
      },
      body: webStream,
      duplex: 'half',
    });

    const uploadData = await uploadResp.json();
    if (!uploadResp.ok) {
      throw new Error(uploadData?.error?.message || `Upload final falhou (${uploadResp.status})`);
    }

    // 3) Persiste no SQLite
    const persisted = persistUploadedFile({
      userId: req.user.id,
      fileName,
      fileSize,
      mimeType,
      fileResource: uploadData,
    });

    res.json(persisted);

  } catch (error) {
    console.error('[Gemini media upload]', error.message);
    res.status(500).json({ error: { message: error.message } });
  }
});

router.get('/media/:id/status', authMiddleware, async (req, res) => {
  try {
    const apiKey = requireKey(req, res);
    if (!apiKey) return;
    const result = await getFileStatus({
      apiKey,
      mediaId: req.params.id,
      userId: req.user.id,
    });
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({ error: { message: error.message } });
  }
});

router.post('/media/:id/cache', authMiddleware, async (req, res) => {
  try {
    const apiKey = requireKey(req, res);
    if (!apiKey) return;
    const { model, systemInstruction, ttlSeconds } = req.body || {};
    if (!model) return res.status(400).json({ error: { message: 'model obrigatório' } });

    const cache = await attachCacheToMedia({
      userId: req.user.id,
      apiKey,
      mediaId: req.params.id,
      model,
      systemInstruction,
      ttlSeconds,
    });
    res.json(cache);
  } catch (error) {
    res.status(error.status || 500).json({ error: { message: error.message } });
  }
});

router.delete('/media/:id', authMiddleware, async (req, res) => {
  try {
    const apiKey = requireKey(req, res);
    if (!apiKey) return;
    const result = await deleteMedia({
      userId: req.user.id,
      apiKey,
      mediaId: req.params.id,
    });
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({ error: { message: error.message } });
  }
});

// Hook de uso: o frontend chama este endpoint depois de uma generateContent
// bem-sucedida que usou cachedContent — apenas para incrementar hit_count.
// Aceita lookup por id (param) OU por cacheName (body) para o caminho de
// mídia onde o frontend só conhece o cacheName. Sempre valida ownership.
router.post('/cache/:id/used', authMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const { cacheName } = req.body || {};
    // 'lookup-by-name' como sentinela quando o cliente só tem o nome
    const useName = id === 'lookup-by-name';
    const result = markUsed({
      cacheId: useName ? null : id,
      cacheName: useName ? cacheName : null,
      userId: req.user.id,
    });
    res.json({ ok: true, updated: result.updated });
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
});

export default router;

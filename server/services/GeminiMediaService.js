// server/services/GeminiMediaService.js
// v1.43.00 — Upload de áudio/vídeo para a Gemini File API
//
// Protocolo: upload "resumable" do Google em duas etapas
//   1) POST /upload/v1beta/files com cabeçalhos X-Goog-Upload-* → URL temporária
//   2) PUT/POST nessa URL com o binário (em stream) → metadata do file
//
// Importante: o backend NÃO armazena o binário em disco nem em memória.
// O handler HTTP em routes/gemini.js faz pipe do request → fetch para o
// upload URL, byte-a-byte (busboy + ReadableStream).

import { randomUUID } from 'crypto';
import { getDb } from '../db/database.js';
import {
  getOrCreateCache,
  deleteCache as deleteCacheFn,
  _internalDeleteCache,
} from './GeminiCacheService.js';

const GEMINI_UPLOAD_BASE = 'https://generativelanguage.googleapis.com/upload/v1beta/files';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

// File API apaga arquivos em 48h. Refletimos esse limite no SQLite.
const FILE_API_TTL_MS = 48 * 60 * 60 * 1000;

/**
 * Inicia o upload resumable e retorna a URL temporária para envio do binário.
 * Quem faz o pipe do binário é o caller (handler HTTP).
 */
export async function startResumableUpload({ apiKey, fileName, fileSize, mimeType }) {
  if (!apiKey) throw new Error('apiKey requerida');
  if (!fileName || !fileSize || !mimeType) {
    throw new Error('fileName, fileSize e mimeType são obrigatórios');
  }

  const res = await fetch(GEMINI_UPLOAD_BASE, {
    method: 'POST',
    headers: {
      'x-goog-api-key': apiKey,
      'X-Goog-Upload-Protocol': 'resumable',
      'X-Goog-Upload-Command': 'start',
      'X-Goog-Upload-Header-Content-Length': String(fileSize),
      'X-Goog-Upload-Header-Content-Type': mimeType,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ file: { display_name: fileName } }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini upload init falhou (${res.status}): ${text.slice(0, 200)}`);
  }

  const uploadUrl = res.headers.get('x-goog-upload-url');
  if (!uploadUrl) {
    throw new Error('Gemini não retornou X-Goog-Upload-URL');
  }
  return uploadUrl;
}

/**
 * Persiste no SQLite o file recém-enviado. Chamado pelo handler HTTP
 * depois que o pipe do binário concluiu com sucesso.
 */
export function persistUploadedFile({ userId, fileName, fileSize, mimeType, fileResource }) {
  const db = getDb();
  const id = randomUUID();
  const now = Date.now();
  const expiresAt = now + FILE_API_TTL_MS;
  const fileUri = fileResource?.file?.uri || fileResource?.uri;
  const status = (fileResource?.file?.state || fileResource?.state || 'PROCESSING').toUpperCase();

  if (!fileUri) {
    throw new Error('Resposta da File API não contém uri');
  }

  db.prepare(`
    INSERT INTO gemini_media_files
      (id, user_id, file_uri, file_mime, file_name, file_size,
       status, uploaded_at, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)
  `).run(id, userId, fileUri, mimeType, fileName, fileSize, status, expiresAt);

  return { id, fileUri, status, expiresAt };
}

/**
 * Consulta status do file no Gemini (ACTIVE / PROCESSING / FAILED).
 */
export async function getFileStatus({ apiKey, mediaId, userId }) {
  const db = getDb();
  const row = db.prepare(`
    SELECT id, file_uri, status, duration_seconds, cache_id
    FROM gemini_media_files
    WHERE id = ? AND user_id = ? AND deleted_at IS NULL
  `).get(mediaId, userId);
  if (!row) {
    const e = new Error('media não encontrado');
    e.status = 404;
    throw e;
  }

  const path = row.file_uri.startsWith('http')
    ? row.file_uri
    : `${GEMINI_API_BASE}/${row.file_uri.replace(/^\/+/, '')}`;

  const res = await fetch(path, {
    headers: { 'x-goog-api-key': apiKey },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || `Gemini files.get ${res.status}`);
  }

  const newStatus = (data.state || 'UNKNOWN').toUpperCase();
  const duration = data.videoMetadata?.videoDuration
    ? parseDuration(data.videoMetadata.videoDuration)
    : null;

  if (newStatus !== row.status || (duration && duration !== row.duration_seconds)) {
    db.prepare(`
      UPDATE gemini_media_files
      SET status = ?, duration_seconds = COALESCE(?, duration_seconds)
      WHERE id = ?
    `).run(newStatus, duration, mediaId);
  }

  return {
    id: mediaId,
    status: newStatus,
    fileUri: row.file_uri,
    durationSeconds: duration ?? row.duration_seconds,
    cacheId: row.cache_id,
  };
}

function parseDuration(s) {
  if (!s) return null;
  if (s.endsWith('s') && !s.includes('PT')) {
    const n = parseFloat(s);
    return Number.isFinite(n) ? Math.round(n) : null;
  }
  const m = s.match(/PT(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?/);
  if (!m) return null;
  return (parseInt(m[1] || '0', 10)) * 60 + Math.round(parseFloat(m[2] || '0'));
}

/**
 * Cria CachedContent ligado a este file. systemInstruction tipicamente vem
 * com o "persona de juiz do trabalho". Cache fica vinculado em SQLite.
 */
export async function attachCacheToMedia({
  userId,
  apiKey,
  mediaId,
  model,
  systemInstruction,
  ttlSeconds,
}) {
  const db = getDb();
  const row = db.prepare(`
    SELECT id, file_uri, file_mime, status, cache_id
    FROM gemini_media_files
    WHERE id = ? AND user_id = ? AND deleted_at IS NULL
  `).get(mediaId, userId);
  if (!row) {
    const e = new Error('media não encontrado');
    e.status = 404;
    throw e;
  }
  if (row.status !== 'ACTIVE') {
    const e = new Error(`media ainda não está ACTIVE (status: ${row.status})`);
    e.status = 409;
    throw e;
  }

  const stableContents = [{
    role: 'user',
    parts: [{ fileData: { fileUri: row.file_uri, mimeType: row.file_mime } }],
  }];

  const cache = await getOrCreateCache({
    userId,
    apiKey,
    model,
    systemInstruction,
    stableContents,
    ttlSeconds,
  });

  db.prepare(`UPDATE gemini_media_files SET cache_id = ? WHERE id = ?`)
    .run(cache.cacheId, mediaId);

  return cache;
}

export async function deleteMedia({ userId, apiKey, mediaId }) {
  const db = getDb();
  const row = db.prepare(`
    SELECT id, file_uri, cache_id FROM gemini_media_files
    WHERE id = ? AND user_id = ? AND deleted_at IS NULL
  `).get(mediaId, userId);
  if (!row) return { deleted: false };

  if (row.cache_id) {
    try {
      await deleteCacheFn({ cacheId: row.cache_id, userId, apiKey });
    } catch (e) {
      console.warn(`[GeminiMedia] Falha ao apagar cache associado: ${e.message}`);
    }
  }

  const path = row.file_uri.startsWith('http')
    ? row.file_uri
    : `${GEMINI_API_BASE}/${row.file_uri.replace(/^\/+/, '')}`;
  try {
    const res = await fetch(path, {
      method: 'DELETE',
      headers: { 'x-goog-api-key': apiKey },
    });
    if (!res.ok && res.status !== 404) {
      console.warn(`[GeminiMedia] DELETE ${row.file_uri} -> ${res.status}`);
    }
  } catch (e) {
    console.warn(`[GeminiMedia] Falha ao apagar file: ${e.message}`);
  }

  db.prepare(`UPDATE gemini_media_files SET deleted_at = datetime('now') WHERE id = ?`)
    .run(mediaId);

  return { deleted: true };
}

/**
 * Housekeeping: marca como expired files passados do TTL de 48h da File API
 * e tenta apagar caches associados. Chamado pelo cron horário.
 */
export async function pruneExpired({ apiKey }) {
  const db = getDb();
  const now = Date.now();
  const expired = db.prepare(`
    SELECT id, cache_id, file_uri FROM gemini_media_files
    WHERE deleted_at IS NULL AND expires_at < ? AND status != 'EXPIRED'
  `).all(now);

  for (const row of expired) {
    db.prepare(`UPDATE gemini_media_files SET status = 'EXPIRED' WHERE id = ?`).run(row.id);
    if (row.cache_id) {
      try {
        await _internalDeleteCache({ cacheId: row.cache_id, apiKey });
      } catch { /* swallow */ }
    }
  }

  const hardDeleted = db.prepare(`
    DELETE FROM gemini_media_files
    WHERE deleted_at IS NOT NULL
      AND julianday('now') - julianday(deleted_at) > 7
  `).run().changes;

  return { expired: expired.length, hardDeleted };
}

export { GEMINI_UPLOAD_BASE, GEMINI_API_BASE, FILE_API_TTL_MS };

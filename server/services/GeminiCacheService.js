// server/services/GeminiCacheService.js
// v1.43.00 — Gerencia CachedContent na Gemini API
//
// Estratégia: hash determinístico de (model + system + stable_contents) →
// idempotente. Mesmo conjunto retorna mesmo cache enquanto válido.
// Quando expira ou é apagado pelo Google, recriado sob demanda.

import { createHash, randomUUID } from 'crypto';
import { getDb } from '../db/database.js';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_TTL_SECONDS = 3600;

function hashKey(model, systemInstruction, stableContents) {
  const sys = typeof systemInstruction === 'string'
    ? systemInstruction
    : JSON.stringify(systemInstruction || null);
  const stable = JSON.stringify(stableContents || []);
  return createHash('sha256').update(`${model}::${sys}::${stable}`).digest('hex');
}

async function geminiRequest(path, apiKey, init = {}) {
  const url = `${GEMINI_API_BASE}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  if (!res.ok) {
    const err = new Error(data?.error?.message || `Gemini API ${res.status}`);
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
}

/**
 * Busca cache existente válido ou cria um novo no Gemini.
 * Idempotente via cache_key_hash + user_id + model.
 */
export async function getOrCreateCache({
  userId,
  apiKey,
  model,
  systemInstruction,
  stableContents,
  ttlSeconds = DEFAULT_TTL_SECONDS,
}) {
  if (!userId) throw new Error('userId requerido');
  if (!apiKey) throw new Error('apiKey requerida');
  if (!model) throw new Error('model requerido');
  if (!Array.isArray(stableContents) || stableContents.length === 0) {
    throw new Error('stableContents requerido (array com ao menos 1 item)');
  }

  const db = getDb();
  const keyHash = hashKey(model, systemInstruction, stableContents);
  const now = Date.now();

  // Tenta hit em cache válido
  const existing = db.prepare(`
    SELECT id, cache_name, expires_at, token_count
    FROM gemini_caches
    WHERE user_id = ? AND cache_key_hash = ? AND model = ?
      AND deleted_at IS NULL AND expires_at > ?
    ORDER BY created_at DESC LIMIT 1
  `).get(userId, keyHash, model, now);

  if (existing) {
    db.prepare(`
      UPDATE gemini_caches
      SET hit_count = hit_count + 1, last_used_at = datetime('now')
      WHERE id = ?
    `).run(existing.id);
    return {
      hit: true,
      cacheId: existing.id,
      cacheName: existing.cache_name,
      expiresAt: existing.expires_at,
      tokenCount: existing.token_count,
    };
  }

  // Miss: cria novo CachedContent no Gemini
  const body = {
    model: `models/${model}`,
    contents: stableContents,
    ttl: `${ttlSeconds}s`,
  };
  if (systemInstruction) {
    body.systemInstruction = typeof systemInstruction === 'string'
      ? { parts: [{ text: systemInstruction }] }
      : systemInstruction;
  }

  const created = await geminiRequest('/cachedContents', apiKey, {
    method: 'POST',
    body: JSON.stringify(body),
  });

  const cacheName = created.name; // "cachedContents/xxx"
  const tokenCount = created.usageMetadata?.totalTokenCount || 0;
  const id = randomUUID();
  const expiresAt = now + ttlSeconds * 1000;

  // Antes de inserir, remove rows com mesma chave que já não servem mais
  // (expiradas ou soft-deleted) para evitar colisão na UNIQUE constraint.
  // Caches válidos com mesma chave teriam sido pegos no SELECT inicial.
  db.prepare(`
    DELETE FROM gemini_caches
    WHERE user_id = ? AND cache_key_hash = ? AND model = ?
      AND (expires_at <= ? OR deleted_at IS NOT NULL)
  `).run(userId, keyHash, model, now);

  // Em caso de race, ON CONFLICT mantém o registro existente. O "perdedor"
  // criou um CachedContent no Google que não vamos rastrear → best-effort
  // delete imediato para não vazar quota até o TTL.
  try {
    db.prepare(`
      INSERT INTO gemini_caches
        (id, user_id, cache_key_hash, cache_name, model, token_count,
         ttl_seconds, expires_at, hit_count, last_used_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, datetime('now'), datetime('now'))
    `).run(id, userId, keyHash, cacheName, model, tokenCount, ttlSeconds, expiresAt);
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) {
      const winner = db.prepare(`
        SELECT id, cache_name, expires_at, token_count
        FROM gemini_caches
        WHERE user_id = ? AND cache_key_hash = ? AND model = ?
          AND deleted_at IS NULL
        ORDER BY created_at DESC LIMIT 1
      `).get(userId, keyHash, model);
      if (winner) {
        // Best-effort: apaga nosso cache órfão no Google (não persistido)
        geminiRequest(`/${cacheName}`, apiKey, { method: 'DELETE' })
          .catch((delErr) => {
            if (delErr.status !== 404) {
              console.warn(`[GeminiCache] Race orphan delete falhou ${cacheName}: ${delErr.message}`);
            }
          });
        return {
          hit: true,
          cacheId: winner.id,
          cacheName: winner.cache_name,
          expiresAt: winner.expires_at,
          tokenCount: winner.token_count,
        };
      }
    }
    throw e;
  }

  return { hit: false, cacheId: id, cacheName, expiresAt, tokenCount };
}

/**
 * Incrementa hit_count + atualiza last_used_at. Valida ownership por userId
 * (impede IDOR — usuário A não pode inflar métricas de cache do usuário B).
 *
 * Aceita também lookup por cacheName (para o caminho de mídia onde o
 * frontend só conhece o cacheName, não o cacheId). Sempre exige userId.
 */
export function markUsed({ cacheId, cacheName, userId }) {
  if (!userId) return { updated: 0 };
  const db = getDb();
  if (cacheId) {
    return { updated: db.prepare(`
      UPDATE gemini_caches
      SET hit_count = hit_count + 1, last_used_at = datetime('now')
      WHERE id = ? AND user_id = ? AND deleted_at IS NULL
    `).run(cacheId, userId).changes };
  }
  if (cacheName) {
    return { updated: db.prepare(`
      UPDATE gemini_caches
      SET hit_count = hit_count + 1, last_used_at = datetime('now')
      WHERE cache_name = ? AND user_id = ? AND deleted_at IS NULL
    `).run(cacheName, userId).changes };
  }
  return { updated: 0 };
}

export async function refreshCache({ cacheId, userId, apiKey, ttlSeconds = DEFAULT_TTL_SECONDS }) {
  const db = getDb();
  const row = db.prepare(`
    SELECT cache_name FROM gemini_caches
    WHERE id = ? AND user_id = ? AND deleted_at IS NULL
  `).get(cacheId, userId);
  if (!row) throw Object.assign(new Error('Cache não encontrado'), { status: 404 });

  await geminiRequest(`/${row.cache_name}`, apiKey, {
    method: 'PATCH',
    body: JSON.stringify({ ttl: `${ttlSeconds}s` }),
  });

  const expiresAt = Date.now() + ttlSeconds * 1000;
  db.prepare(`
    UPDATE gemini_caches SET ttl_seconds = ?, expires_at = ? WHERE id = ?
  `).run(ttlSeconds, expiresAt, cacheId);

  return { cacheId, cacheName: row.cache_name, expiresAt };
}

export async function deleteCache({ cacheId, userId, apiKey }) {
  const db = getDb();
  const row = db.prepare(`
    SELECT cache_name FROM gemini_caches
    WHERE id = ? AND user_id = ? AND deleted_at IS NULL
  `).get(cacheId, userId);
  if (!row) return { deleted: false };

  // Best-effort no Google; se 404 (já apagado), seguimos
  try {
    await geminiRequest(`/${row.cache_name}`, apiKey, { method: 'DELETE' });
  } catch (e) {
    if (e.status !== 404) {
      console.warn(`[GeminiCache] Falha ao deletar ${row.cache_name}: ${e.message}`);
    }
  }

  db.prepare(`UPDATE gemini_caches SET deleted_at = datetime('now') WHERE id = ?`).run(cacheId);
  return { deleted: true };
}

/**
 * Versão SEM ownership check, usada APENAS por código de housekeeping
 * interno (cron de prune). Não exposta via HTTP.
 */
export async function _internalDeleteCache({ cacheId, apiKey }) {
  const db = getDb();
  const row = db.prepare(`
    SELECT cache_name FROM gemini_caches WHERE id = ? AND deleted_at IS NULL
  `).get(cacheId);
  if (!row) return { deleted: false };

  if (apiKey) {
    try {
      await geminiRequest(`/${row.cache_name}`, apiKey, { method: 'DELETE' });
    } catch (e) {
      if (e.status !== 404) {
        console.warn(`[GeminiCache prune] Falha ao deletar ${row.cache_name}: ${e.message}`);
      }
    }
  }

  db.prepare(`UPDATE gemini_caches SET deleted_at = datetime('now') WHERE id = ?`).run(cacheId);
  return { deleted: true };
}

/**
 * Housekeeping: remove caches expirados do SQLite e tenta apagar do Google.
 * Chamado pelo cron e no startup.
 */
export async function pruneExpired({ apiKey }) {
  const db = getDb();
  const now = Date.now();
  const expired = db.prepare(`
    SELECT id, cache_name FROM gemini_caches
    WHERE deleted_at IS NULL AND expires_at < ?
  `).all(now);

  let deleted = 0;
  for (const row of expired) {
    if (apiKey) {
      try {
        await geminiRequest(`/${row.cache_name}`, apiKey, { method: 'DELETE' });
      } catch (e) {
        if (e.status !== 404) {
          console.warn(`[GeminiCache prune] ${row.cache_name}: ${e.message}`);
        }
      }
    }
    db.prepare(`UPDATE gemini_caches SET deleted_at = datetime('now') WHERE id = ?`).run(row.id);
    deleted++;
  }

  // Hard-delete de rows soft-deleted há > 7 dias
  const hardDeleted = db.prepare(`
    DELETE FROM gemini_caches
    WHERE deleted_at IS NOT NULL
      AND julianday('now') - julianday(deleted_at) > 7
  `).run().changes;

  return { deleted, hardDeleted };
}

export { hashKey };

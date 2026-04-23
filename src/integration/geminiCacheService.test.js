// @vitest-environment node
/**
 * @file geminiCacheService.test.js
 * @description Testes de integração do GeminiCacheService (backend) com
 *   SQLite in-memory + fetch mockado. v1.43.00.
 *
 * IMPORTANTE: importa o código REAL de produção (server/services/...).
 * Não duplica funções aqui. Roda em env=node para suportar better-sqlite3.
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import Database from 'better-sqlite3';

// Configurar in-memory ANTES de importar o módulo (DB_PATH é lido no top-level)
process.env.DB_PATH = ':memory:';

// Importa serviço + getDb depois de setar DB_PATH
const { initDatabase, getDb } = await import('../../server/db/database.js');
const {
  hashKey,
  getOrCreateCache,
  refreshCache,
  deleteCache,
  markUsed,
  pruneExpired,
} = await import('../../server/services/GeminiCacheService.js');

// Inicializa schema in-memory (roda todas as migrations)
beforeAll(() => {
  initDatabase();
  // Insere user de teste (FK requirement)
  const db = getDb();
  db.prepare(`INSERT OR IGNORE INTO users (id, email) VALUES (?, ?)`)
    .run('test-user', 'test@example.com');
});

beforeEach(() => {
  // Limpa caches antes de cada teste
  const db = getDb();
  db.prepare('DELETE FROM gemini_caches').run();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ═══════════════════════════════════════════════════════════════════════════
// hashKey (pure)
// ═══════════════════════════════════════════════════════════════════════════

describe('hashKey', () => {
  it('é determinístico', () => {
    const a = hashKey('m', 'sys', [{ a: 1 }]);
    const b = hashKey('m', 'sys', [{ a: 1 }]);
    expect(a).toBe(b);
  });

  it('SHA-256 hex (64 chars)', () => {
    expect(hashKey('m', 's', [])).toMatch(/^[0-9a-f]{64}$/);
  });

  it('muda com modelo', () => {
    expect(hashKey('a', 's', []))
      .not.toBe(hashKey('b', 's', []));
  });

  it('muda com system', () => {
    expect(hashKey('m', 'a', []))
      .not.toBe(hashKey('m', 'b', []));
  });

  it('muda com stableContents', () => {
    expect(hashKey('m', 's', [{ a: 1 }]))
      .not.toBe(hashKey('m', 's', [{ a: 2 }]));
  });

  it('aceita system como objeto (serializado via JSON)', () => {
    const a = hashKey('m', { parts: [{ text: 'x' }] }, []);
    const b = hashKey('m', { parts: [{ text: 'x' }] }, []);
    expect(a).toBe(b);
  });

  it('null vs undefined no system → mesmo hash', () => {
    expect(hashKey('m', null, [])).toBe(hashKey('m', undefined, []));
  });

  it('formato exato do hash (regression: model::sys::stable)', async () => {
    // Quando systemInstruction é string, é usada DIRETAMENTE (sem JSON.stringify).
    // Quando é objeto/null, é serializada via JSON.stringify(s || null).
    const { createHash } = await import('crypto');

    // Caso 1: system como string
    const expectedStr = createHash('sha256')
      .update('gemini-3-pro::sys::[{"role":"user"}]')
      .digest('hex');
    expect(hashKey('gemini-3-pro', 'sys', [{ role: 'user' }])).toBe(expectedStr);

    // Caso 2: system como objeto (vira JSON)
    const expectedObj = createHash('sha256')
      .update('m::{"parts":[{"text":"x"}]}::[]')
      .digest('hex');
    expect(hashKey('m', { parts: [{ text: 'x' }] }, [])).toBe(expectedObj);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// getOrCreateCache
// ═══════════════════════════════════════════════════════════════════════════

describe('getOrCreateCache', () => {
  const stableContents = [{ role: 'user', parts: [{ text: 'doc' }] }];

  it('cache MISS: chama Gemini e persiste no SQLite', async () => {
    const fetchSpy = vi.fn().mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({
        name: 'cachedContents/abc123',
        usageMetadata: { totalTokenCount: 5000 },
      }),
    });
    global.fetch = fetchSpy;

    const result = await getOrCreateCache({
      userId: 'test-user',
      apiKey: 'KEY',
      model: 'gemini-3-pro',
      systemInstruction: 'sys',
      stableContents,
      ttlSeconds: 3600,
    });

    expect(result.hit).toBe(false);
    expect(result.cacheName).toBe('cachedContents/abc123');
    expect(result.tokenCount).toBe(5000);
    expect(result.cacheId).toMatch(/-/); // UUID
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Persistido no SQLite
    const db = getDb();
    const row = db.prepare('SELECT * FROM gemini_caches WHERE id = ?').get(result.cacheId);
    expect(row).toBeTruthy();
    expect(row.cache_name).toBe('cachedContents/abc123');
    expect(row.user_id).toBe('test-user');
    expect(row.token_count).toBe(5000);
  });

  it('cache HIT: 2ª chamada com mesma chave NÃO chama Gemini', async () => {
    const fetchSpy = vi.fn().mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({
        name: 'cachedContents/abc',
        usageMetadata: { totalTokenCount: 100 },
      }),
    });
    global.fetch = fetchSpy;

    const args = {
      userId: 'test-user', apiKey: 'K', model: 'm', systemInstruction: 's', stableContents,
    };

    const first = await getOrCreateCache(args);
    expect(first.hit).toBe(false);

    const second = await getOrCreateCache(args);
    expect(second.hit).toBe(true);
    expect(second.cacheName).toBe('cachedContents/abc');
    expect(second.cacheId).toBe(first.cacheId);

    // fetch chamado APENAS 1 vez (na criação)
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('cache HIT incrementa hit_count e atualiza last_used_at', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({ name: 'cachedContents/x', usageMetadata: { totalTokenCount: 0 } }),
    });

    const args = {
      userId: 'test-user', apiKey: 'K', model: 'm', stableContents,
    };
    const first = await getOrCreateCache(args);

    // 3 hits adicionais
    await getOrCreateCache(args);
    await getOrCreateCache(args);
    await getOrCreateCache(args);

    const db = getDb();
    const row = db.prepare('SELECT hit_count, last_used_at FROM gemini_caches WHERE id = ?').get(first.cacheId);
    expect(row.hit_count).toBe(3);
    expect(row.last_used_at).toBeTruthy();
  });

  it('cache expirado NÃO conta como hit (cria novo)', async () => {
    const fetchSpy = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ name: 'cachedContents/old', usageMetadata: { totalTokenCount: 0 } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ name: 'cachedContents/new', usageMetadata: { totalTokenCount: 0 } }),
      });
    global.fetch = fetchSpy;

    const args = {
      userId: 'test-user', apiKey: 'K', model: 'm', stableContents,
    };
    const first = await getOrCreateCache(args);

    // Força expiração
    const db = getDb();
    db.prepare('UPDATE gemini_caches SET expires_at = ? WHERE id = ?')
      .run(Date.now() - 1000, first.cacheId);

    const second = await getOrCreateCache(args);
    expect(second.hit).toBe(false);
    expect(second.cacheName).toBe('cachedContents/new');
    expect(second.cacheId).not.toBe(first.cacheId);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('inputs diferentes geram caches separados (não colidem)', async () => {
    const fetchSpy = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ name: 'cachedContents/A', usageMetadata: { totalTokenCount: 100 } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ name: 'cachedContents/B', usageMetadata: { totalTokenCount: 200 } }),
      });
    global.fetch = fetchSpy;

    const a = await getOrCreateCache({
      userId: 'test-user', apiKey: 'K', model: 'm', systemInstruction: 'A', stableContents,
    });
    const b = await getOrCreateCache({
      userId: 'test-user', apiKey: 'K', model: 'm', systemInstruction: 'B', stableContents,
    });

    expect(a.cacheId).not.toBe(b.cacheId);
    expect(a.cacheName).toBe('cachedContents/A');
    expect(b.cacheName).toBe('cachedContents/B');
  });

  it('exige userId/apiKey/model/stableContents', async () => {
    await expect(getOrCreateCache({ apiKey: 'K', model: 'm', stableContents: [{}] }))
      .rejects.toThrow(/userId/);
    await expect(getOrCreateCache({ userId: 'u', model: 'm', stableContents: [{}] }))
      .rejects.toThrow(/apiKey/);
    await expect(getOrCreateCache({ userId: 'u', apiKey: 'K', stableContents: [{}] }))
      .rejects.toThrow(/model/);
    await expect(getOrCreateCache({ userId: 'u', apiKey: 'K', model: 'm', stableContents: [] }))
      .rejects.toThrow(/stableContents/);
  });

  it('propaga erro do Gemini API (4xx/5xx)', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => JSON.stringify({ error: { message: 'API key inválida' } }),
    });

    await expect(getOrCreateCache({
      userId: 'test-user', apiKey: 'BAD', model: 'm', stableContents,
    })).rejects.toThrow(/API key inválida/);

    // Nada persistido no SQLite após falha
    const db = getDb();
    const count = db.prepare('SELECT COUNT(*) as n FROM gemini_caches').get();
    expect(count.n).toBe(0);
  });

  it('inclui systemInstruction no body quando string', async () => {
    const fetchSpy = vi.fn().mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({ name: 'cachedContents/x', usageMetadata: { totalTokenCount: 0 } }),
    });
    global.fetch = fetchSpy;

    await getOrCreateCache({
      userId: 'test-user', apiKey: 'K', model: 'm',
      systemInstruction: 'você é juiz',
      stableContents,
    });

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body.systemInstruction).toEqual({ parts: [{ text: 'você é juiz' }] });
    expect(body.model).toBe('models/m');
    expect(body.ttl).toBe('3600s');
  });

  it('inclui systemInstruction como objeto quando já formatado', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({ name: 'cachedContents/x', usageMetadata: { totalTokenCount: 0 } }),
    });

    await getOrCreateCache({
      userId: 'test-user', apiKey: 'K', model: 'm',
      systemInstruction: { parts: [{ text: 'pre-formatado' }] },
      stableContents,
    });

    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.systemInstruction).toEqual({ parts: [{ text: 'pre-formatado' }] });
  });

  it('isolamento por user_id (mesmo hash, users diferentes → caches diferentes)', async () => {
    // Insere outro user
    const db = getDb();
    db.prepare('INSERT INTO users (id, email) VALUES (?, ?)').run('user-2', 'two@example.com');

    const fetchSpy = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ name: 'cachedContents/u1', usageMetadata: { totalTokenCount: 0 } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ name: 'cachedContents/u2', usageMetadata: { totalTokenCount: 0 } }),
      });
    global.fetch = fetchSpy;

    const a = await getOrCreateCache({
      userId: 'test-user', apiKey: 'K', model: 'm', stableContents,
    });
    const b = await getOrCreateCache({
      userId: 'user-2', apiKey: 'K', model: 'm', stableContents,
    });

    expect(a.cacheId).not.toBe(b.cacheId);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// markUsed
// ═══════════════════════════════════════════════════════════════════════════

describe('markUsed', () => {
  it('incrementa hit_count e atualiza last_used_at por cacheId + userId', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({ name: 'cachedContents/x', usageMetadata: { totalTokenCount: 0 } }),
    });
    const created = await getOrCreateCache({
      userId: 'test-user', apiKey: 'K', model: 'm', stableContents: [{}],
    });

    markUsed({ cacheId: created.cacheId, userId: 'test-user' });
    markUsed({ cacheId: created.cacheId, userId: 'test-user' });

    const db = getDb();
    const row = db.prepare('SELECT hit_count, last_used_at FROM gemini_caches WHERE id = ?')
      .get(created.cacheId);
    expect(row.hit_count).toBe(2);
    expect(row.last_used_at).toBeTruthy();
  });

  it('IDOR: NÃO incrementa quando userId não é o dono', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({ name: 'cachedContents/x', usageMetadata: { totalTokenCount: 0 } }),
    });
    const created = await getOrCreateCache({
      userId: 'test-user', apiKey: 'K', model: 'm', stableContents: [{}],
    });

    const result = markUsed({ cacheId: created.cacheId, userId: 'OUTRO-USER' });
    expect(result.updated).toBe(0);

    const row = getDb().prepare('SELECT hit_count FROM gemini_caches WHERE id = ?').get(created.cacheId);
    expect(row.hit_count).toBe(0);
  });

  it('lookup por cacheName + userId funciona (caminho de mídia)', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({ name: 'cachedContents/abc-media', usageMetadata: { totalTokenCount: 0 } }),
    });
    const created = await getOrCreateCache({
      userId: 'test-user', apiKey: 'K', model: 'm', stableContents: [{}],
    });

    const result = markUsed({ cacheName: created.cacheName, userId: 'test-user' });
    expect(result.updated).toBe(1);

    const row = getDb().prepare('SELECT hit_count FROM gemini_caches WHERE id = ?').get(created.cacheId);
    expect(row.hit_count).toBe(1);
  });

  it('sem userId retorna { updated: 0 } sem efeito', () => {
    const result = markUsed({ cacheId: 'qualquer', userId: null });
    expect(result.updated).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// refreshCache
// ═══════════════════════════════════════════════════════════════════════════

describe('refreshCache', () => {
  it('chama PATCH /cachedContents/xxx e atualiza expires_at', async () => {
    const fetchSpy = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ name: 'cachedContents/x', usageMetadata: { totalTokenCount: 0 } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ name: 'cachedContents/x', ttl: '7200s' }),
      });
    global.fetch = fetchSpy;

    const created = await getOrCreateCache({
      userId: 'test-user', apiKey: 'K', model: 'm', stableContents: [{}],
    });
    const oldExpires = created.expiresAt;

    await new Promise((r) => setTimeout(r, 10)); // garante delta de tempo

    const refreshed = await refreshCache({
      cacheId: created.cacheId,
      userId: 'test-user',
      apiKey: 'K',
      ttlSeconds: 7200,
    });

    expect(refreshed.expiresAt).toBeGreaterThan(oldExpires);

    // PATCH chamado
    const patchCall = fetchSpy.mock.calls[1];
    expect(patchCall[1].method).toBe('PATCH');
    expect(JSON.parse(patchCall[1].body)).toEqual({ ttl: '7200s' });
  });

  it('404 quando cache não pertence ao user', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({ name: 'cachedContents/x', usageMetadata: { totalTokenCount: 0 } }),
    });
    const created = await getOrCreateCache({
      userId: 'test-user', apiKey: 'K', model: 'm', stableContents: [{}],
    });

    await expect(refreshCache({
      cacheId: created.cacheId,
      userId: 'OUTRO-USER',
      apiKey: 'K',
    })).rejects.toMatchObject({ status: 404 });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// deleteCache
// ═══════════════════════════════════════════════════════════════════════════

describe('deleteCache', () => {
  it('chama DELETE no Gemini e marca deleted_at no SQLite', async () => {
    const fetchSpy = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ name: 'cachedContents/x', usageMetadata: { totalTokenCount: 0 } }),
      })
      .mockResolvedValueOnce({ ok: true, text: async () => '' });
    global.fetch = fetchSpy;

    const created = await getOrCreateCache({
      userId: 'test-user', apiKey: 'K', model: 'm', stableContents: [{}],
    });

    const result = await deleteCache({
      cacheId: created.cacheId, userId: 'test-user', apiKey: 'K',
    });
    expect(result.deleted).toBe(true);

    const db = getDb();
    const row = db.prepare('SELECT deleted_at FROM gemini_caches WHERE id = ?')
      .get(created.cacheId);
    expect(row.deleted_at).toBeTruthy();

    expect(fetchSpy.mock.calls[1][1].method).toBe('DELETE');
  });

  it('404 do Gemini é absorvido (já apagado)', async () => {
    const fetchSpy = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ name: 'cachedContents/x', usageMetadata: { totalTokenCount: 0 } }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => JSON.stringify({ error: { message: 'not found' } }),
      });
    global.fetch = fetchSpy;

    const created = await getOrCreateCache({
      userId: 'test-user', apiKey: 'K', model: 'm', stableContents: [{}],
    });

    const result = await deleteCache({
      cacheId: created.cacheId, userId: 'test-user', apiKey: 'K',
    });
    expect(result.deleted).toBe(true); // soft-delete local procede
  });

  it('cache inexistente retorna { deleted: false } silenciosamente', async () => {
    const result = await deleteCache({
      cacheId: 'inexistente-uuid', userId: 'test-user', apiKey: 'K',
    });
    expect(result.deleted).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// pruneExpired
// ═══════════════════════════════════════════════════════════════════════════

describe('pruneExpired', () => {
  it('marca como deleted apenas caches com expires_at < now', async () => {
    const fetchSpy = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ name: 'cachedContents/old', usageMetadata: { totalTokenCount: 0 } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ name: 'cachedContents/new', usageMetadata: { totalTokenCount: 0 } }),
      })
      // DELETE no Google para o expirado
      .mockResolvedValueOnce({ ok: true, text: async () => '' });
    global.fetch = fetchSpy;

    const old = await getOrCreateCache({
      userId: 'test-user', apiKey: 'K', model: 'm', systemInstruction: 'A', stableContents: [{}],
    });
    const fresh = await getOrCreateCache({
      userId: 'test-user', apiKey: 'K', model: 'm', systemInstruction: 'B', stableContents: [{}],
    });

    // Força expiração apenas do "old"
    const db = getDb();
    db.prepare('UPDATE gemini_caches SET expires_at = ? WHERE id = ?')
      .run(Date.now() - 1000, old.cacheId);

    const result = await pruneExpired({ apiKey: 'K' });
    expect(result.deleted).toBe(1);

    const oldRow = db.prepare('SELECT deleted_at FROM gemini_caches WHERE id = ?').get(old.cacheId);
    const freshRow = db.prepare('SELECT deleted_at FROM gemini_caches WHERE id = ?').get(fresh.cacheId);
    expect(oldRow.deleted_at).toBeTruthy();
    expect(freshRow.deleted_at).toBeNull();
  });

  it('funciona sem apiKey (apenas marca local)', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({ name: 'cachedContents/x', usageMetadata: { totalTokenCount: 0 } }),
    });
    const c = await getOrCreateCache({
      userId: 'test-user', apiKey: 'K', model: 'm', stableContents: [{}],
    });
    const db = getDb();
    db.prepare('UPDATE gemini_caches SET expires_at = ? WHERE id = ?')
      .run(Date.now() - 1000, c.cacheId);

    // sem apiKey: pula a chamada DELETE no Google
    const result = await pruneExpired({ apiKey: null });
    expect(result.deleted).toBe(1);
  });
});

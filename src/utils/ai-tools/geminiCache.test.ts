/**
 * @file geminiCache.test.ts
 * @description Testes da estratégia de splitting (estável x volátil) e dos
 *   helpers de cache do Gemini. v1.43.00.
 *
 * Cobre o código REAL do produto (importa de ./geminiCache).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  estimateTokens,
  splitStableFromVolatile,
  shouldCacheRequest,
  isCacheInvalidError,
  localHashKey,
  ensureGeminiCache,
  GEMINI_CACHE_MIN_TOKENS,
  GEMINI_CACHE_DEFAULT_TTL,
} from './geminiCache';
import type { GeminiRequest } from '../../types';

// ═══════════════════════════════════════════════════════════════════════════
// estimateTokens
// ═══════════════════════════════════════════════════════════════════════════

describe('estimateTokens', () => {
  it('retorna 0 para null/undefined', () => {
    expect(estimateTokens(null)).toBe(0);
    expect(estimateTokens(undefined)).toBe(0);
  });

  it('estima ~1 token / 4 chars para strings', () => {
    expect(estimateTokens('a'.repeat(4))).toBe(1);
    expect(estimateTokens('a'.repeat(40))).toBe(10);
    expect(estimateTokens('a'.repeat(4001))).toBe(1001);
  });

  it('serializa objetos via JSON.stringify antes de medir', () => {
    const obj = { foo: 'bar' }; // {"foo":"bar"} = 13 chars → 4 tokens
    expect(estimateTokens(obj)).toBe(Math.ceil(JSON.stringify(obj).length / 4));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// splitStableFromVolatile
// ═══════════════════════════════════════════════════════════════════════════

describe('splitStableFromVolatile', () => {
  it('última mensagem do usuário é SEMPRE volátil (a pergunta atual)', () => {
    const req: GeminiRequest = {
      contents: [
        { role: 'user', parts: [{ text: 'a'.repeat(5000) }] }, // estável (longo)
        { role: 'user', parts: [{ text: 'pergunta curta' }] },  // a última, volátil mesmo curta
      ],
    };
    const result = splitStableFromVolatile(req);
    expect(result.stableContents).toHaveLength(1);
    expect(result.volatileContents).toHaveLength(1);
    expect(result.volatileContents[0]).toEqual({
      role: 'user',
      parts: [{ text: 'pergunta curta' }],
    });
  });

  it('mesmo texto longo, se for a única mensagem, vai pra volátil', () => {
    const req: GeminiRequest = {
      contents: [{ role: 'user', parts: [{ text: 'a'.repeat(10000) }] }],
    };
    const result = splitStableFromVolatile(req);
    expect(result.stableContents).toHaveLength(0);
    expect(result.volatileContents).toHaveLength(1);
  });

  it('classifica mensagem com fileData como estável', () => {
    const req: GeminiRequest = {
      contents: [
        { role: 'user', parts: [{ fileData: { fileUri: 'files/abc', mimeType: 'audio/mp3' } }] },
        { role: 'user', parts: [{ text: 'sintetize' }] },
      ],
    };
    const result = splitStableFromVolatile(req);
    expect(result.stableContents).toHaveLength(1);
    const stable = result.stableContents[0] as { parts: unknown[] };
    expect(stable.parts[0]).toEqual({ fileData: { fileUri: 'files/abc', mimeType: 'audio/mp3' } });
  });

  it('aceita também file_data (snake_case)', () => {
    const req: GeminiRequest = {
      contents: [
        { role: 'user', parts: [{ file_data: { file_uri: 'files/x', mime_type: 'audio/mp3' } }] },
        { role: 'user', parts: [{ text: 'q?' }] },
      ],
    };
    const result = splitStableFromVolatile(req);
    expect(result.stableContents).toHaveLength(1);
  });

  // v1.43.01: PDFs/imagens em base64 entram como inlineData (formato dominante)
  it('detecta inlineData (PDF base64) como part estável', () => {
    const req: GeminiRequest = {
      contents: [
        { role: 'user', parts: [{ inlineData: { mimeType: 'application/pdf', data: 'BASE64...' } }] },
        { role: 'user', parts: [{ text: 'q?' }] },
      ],
    };
    const result = splitStableFromVolatile(req);
    expect(result.stableContents).toHaveLength(1);
  });

  it('detecta inline_data (snake_case) como part estável', () => {
    const req: GeminiRequest = {
      contents: [
        { role: 'user', parts: [{ inline_data: { mime_type: 'image/png', data: 'B64' } }] },
        { role: 'user', parts: [{ text: 'q?' }] },
      ],
    };
    const result = splitStableFromVolatile(req);
    expect(result.stableContents).toHaveLength(1);
  });

  // v1.43.01: padrão dominante no Sentencify — análise é UMA mensagem com
  // contexto + pergunta. Antes, tudo caía como volátil.
  describe('single-shot (1 user message com vários parts)', () => {
    it('splita a nível de PART: docs estáveis vão pro cache, prompt fica volátil', () => {
      const req: GeminiRequest = {
        contents: [{
          role: 'user',
          parts: [
            { inlineData: { mimeType: 'application/pdf', data: 'PDF_GRANDE_BASE64' } },
            { text: 'PROVA: contexto extenso com ' + 'x'.repeat(3000) },
            { text: 'Analise esta petição e extraia os tópicos.' },
          ],
        }],
      };
      const result = splitStableFromVolatile(req);
      expect(result.stableContents).toHaveLength(1);
      const stable = result.stableContents[0] as { parts: unknown[] };
      expect(stable.parts).toHaveLength(2); // PDF + texto longo
      expect(result.volatileContents).toHaveLength(1);
      const volatile = result.volatileContents[0] as { parts: unknown[] };
      expect(volatile.parts).toHaveLength(1);
      expect(volatile.parts[0]).toEqual({ text: 'Analise esta petição e extraia os tópicos.' });
    });

    it('detecta marker [CONTESTAÇÃO em texto curto', () => {
      const req: GeminiRequest = {
        contents: [{
          role: 'user',
          parts: [
            { text: '[CONTESTAÇÃO da empresa]\n\nA reclamada nega...' },
            { text: 'O vínculo foi reconhecido?' },
          ],
        }],
      };
      const result = splitStableFromVolatile(req);
      expect(result.stableContents).toHaveLength(1);
      const stable = result.stableContents[0] as { parts: unknown[] };
      expect(stable.parts).toHaveLength(1);
    });

    it('NÃO splita se não há nenhum part estável (mantém tudo volátil)', () => {
      const req: GeminiRequest = {
        contents: [{
          role: 'user',
          parts: [
            { text: 'oi' },
            { text: 'tudo bem?' },
          ],
        }],
      };
      const result = splitStableFromVolatile(req);
      expect(result.stableContents).toHaveLength(0);
      expect(result.volatileContents).toHaveLength(1);
      const volatile = result.volatileContents[0] as { parts: unknown[] };
      expect(volatile.parts).toHaveLength(2); // ambos os parts pequenos
    });

    it('mensagem única com 1 só part (sem prompt separado) cai em volátil (sem split)', () => {
      const req: GeminiRequest = {
        contents: [{
          role: 'user',
          parts: [{ text: 'a'.repeat(10000) }],
        }],
      };
      const result = splitStableFromVolatile(req);
      // 1 part só → não tem como splitar (volátil = pergunta atual)
      expect(result.stableContents).toHaveLength(0);
      expect(result.volatileContents).toHaveLength(1);
    });
  });

  it('classifica mensagem com texto > 2000 chars como estável', () => {
    const req: GeminiRequest = {
      contents: [
        { role: 'user', parts: [{ text: 'x'.repeat(2001) }] },
        { role: 'user', parts: [{ text: 'q?' }] },
      ],
    };
    const result = splitStableFromVolatile(req);
    expect(result.stableContents).toHaveLength(1);
    expect(result.volatileContents).toHaveLength(1);
  });

  it('texto exatamente em 2000 chars NÃO é estável (boundary)', () => {
    const req: GeminiRequest = {
      contents: [
        { role: 'user', parts: [{ text: 'x'.repeat(2000) }] },
        { role: 'user', parts: [{ text: 'q?' }] },
      ],
    };
    const result = splitStableFromVolatile(req);
    expect(result.stableContents).toHaveLength(0);
    expect(result.volatileContents).toHaveLength(2);
  });

  it.each([
    '[CONTESTAÇÃO',
    '[INICIAL',
    '[PROVA:',
    '[PROVAS]',
    '[DOCUMENTO',
    '[PETIÇÃO',
    '[EMENDA',
  ])('detecta marcador "%s" como conteúdo estável mesmo em texto curto', (marker) => {
    const req: GeminiRequest = {
      contents: [
        { role: 'user', parts: [{ text: `${marker} corpo do documento]` }] },
        { role: 'user', parts: [{ text: 'q?' }] },
      ],
    };
    const result = splitStableFromVolatile(req);
    expect(result.stableContents).toHaveLength(1);
  });

  it('preserva systemInstruction no resultado', () => {
    const req: GeminiRequest = {
      contents: [{ role: 'user', parts: [{ text: 'q?' }] }],
      systemInstruction: { parts: [{ text: 'você é um juiz...' }] },
    };
    const result = splitStableFromVolatile(req);
    expect(result.systemInstruction).toEqual({ parts: [{ text: 'você é um juiz...' }] });
  });

  it('stableTokens soma estimativa de stable + system', () => {
    const longText = 'a'.repeat(8000); // ~2000 tokens
    const sys = 'b'.repeat(4000);      // ~1000 tokens
    const req: GeminiRequest = {
      contents: [
        { role: 'user', parts: [{ text: longText }] },
        { role: 'user', parts: [{ text: 'q?' }] },
      ],
      systemInstruction: { parts: [{ text: sys }] },
    };
    const result = splitStableFromVolatile(req);
    // estimateTokens é aproximado mas determinístico — verificamos que cresce
    expect(result.stableTokens).toBeGreaterThan(2000);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// shouldCacheRequest
// ═══════════════════════════════════════════════════════════════════════════

describe('shouldCacheRequest', () => {
  it('retorna false quando não há nada estável', () => {
    const split = {
      stableContents: [],
      volatileContents: [{ role: 'user', parts: [{ text: 'q' }] }],
      systemInstruction: undefined,
      stableTokens: 0,
    };
    expect(shouldCacheRequest(split)).toBe(false);
  });

  it('retorna false quando só tem systemInstruction sem stableContents (Gemini API exige docs)', () => {
    const split = {
      stableContents: [],
      volatileContents: [{ role: 'user', parts: [{ text: 'q' }] }],
      systemInstruction: { parts: [{ text: 'a'.repeat(50000) }] },
      stableTokens: 50000,
    };
    expect(shouldCacheRequest(split)).toBe(false);
  });

  it('retorna false quando estável existe mas tokens < threshold', () => {
    const split = {
      stableContents: [{ role: 'user', parts: [{ text: 'a' }] }],
      volatileContents: [],
      systemInstruction: undefined,
      stableTokens: GEMINI_CACHE_MIN_TOKENS - 1,
    };
    expect(shouldCacheRequest(split)).toBe(false);
  });

  it('retorna true quando estável >= threshold', () => {
    const split = {
      stableContents: [{ role: 'user', parts: [{ text: 'a' }] }],
      volatileContents: [],
      systemInstruction: undefined,
      stableTokens: GEMINI_CACHE_MIN_TOKENS,
    };
    expect(shouldCacheRequest(split)).toBe(true);
  });

  it('threshold é 4000', () => {
    expect(GEMINI_CACHE_MIN_TOKENS).toBe(4000);
  });

  it('TTL default é 3600s (1h)', () => {
    expect(GEMINI_CACHE_DEFAULT_TTL).toBe(3600);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// isCacheInvalidError
// ═══════════════════════════════════════════════════════════════════════════

describe('isCacheInvalidError', () => {
  it('detecta status 404', () => {
    expect(isCacheInvalidError({ status: 404, message: 'whatever' })).toBe(true);
  });

  it('detecta mensagem com "cache" + "not found"', () => {
    expect(isCacheInvalidError({ message: 'CachedContent not found' })).toBe(true);
  });

  it('detecta mensagem com "cache" + "expired"', () => {
    expect(isCacheInvalidError({ message: 'cache expired' })).toBe(true);
  });

  it('detecta mensagem com "cache" + "inválid"', () => {
    expect(isCacheInvalidError({ message: 'cache inválido' })).toBe(true);
  });

  it('retorna false para erros genéricos', () => {
    expect(isCacheInvalidError({ status: 500, message: 'server crashed' })).toBe(false);
    expect(isCacheInvalidError({ message: 'rate limited' })).toBe(false);
  });

  it('retorna false para null/undefined', () => {
    expect(isCacheInvalidError(null)).toBe(false);
    expect(isCacheInvalidError(undefined)).toBe(false);
  });

  it('não confunde "cache" sozinho como erro de cache', () => {
    expect(isCacheInvalidError({ message: 'cache hit' })).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// localHashKey
// ═══════════════════════════════════════════════════════════════════════════

describe('localHashKey', () => {
  it('é determinístico (mesmo input → mesmo hash)', async () => {
    const a = await localHashKey('gemini-3-pro', 'sys', [{ role: 'user', parts: [{ text: 'a' }] }]);
    const b = await localHashKey('gemini-3-pro', 'sys', [{ role: 'user', parts: [{ text: 'a' }] }]);
    expect(a).toBe(b);
  });

  it('produz hash diferente para modelos diferentes', async () => {
    const a = await localHashKey('gemini-3-flash', 'sys', []);
    const b = await localHashKey('gemini-3-pro', 'sys', []);
    expect(a).not.toBe(b);
  });

  it('produz hash diferente para system diferentes', async () => {
    const a = await localHashKey('gemini-3-pro', 'sys-A', []);
    const b = await localHashKey('gemini-3-pro', 'sys-B', []);
    expect(a).not.toBe(b);
  });

  it('produz hash diferente para stableContents diferentes', async () => {
    const a = await localHashKey('gemini-3-pro', 'sys', [{ role: 'user', parts: [{ text: 'a' }] }]);
    const b = await localHashKey('gemini-3-pro', 'sys', [{ role: 'user', parts: [{ text: 'b' }] }]);
    expect(a).not.toBe(b);
  });

  it('aceita system como objeto', async () => {
    const a = await localHashKey('m', { parts: [{ text: 'x' }] }, []);
    const b = await localHashKey('m', { parts: [{ text: 'x' }] }, []);
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it('retorna SHA-256 (64 chars hex)', async () => {
    const h = await localHashKey('m', 'sys', []);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it('null/undefined no system produzem o mesmo hash', async () => {
    const a = await localHashKey('m', null, []);
    const b = await localHashKey('m', undefined, []);
    expect(a).toBe(b);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// ensureGeminiCache (mocking fetch)
// ═══════════════════════════════════════════════════════════════════════════

describe('ensureGeminiCache', () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('chama POST /api/gemini/cache com body correto', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        cacheId: 'abc',
        cacheName: 'cachedContents/xyz',
        expiresAt: 123,
        tokenCount: 5000,
        hit: false,
      }),
    } as Response);

    const result = await ensureGeminiCache({
      model: 'gemini-3-pro',
      systemInstruction: 'sys',
      stableContents: [{ role: 'user', parts: [{ text: 'a' }] }],
      apiKey: 'KEY',
      authToken: 'TOKEN',
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toMatch(/\/api\/gemini\/cache$/);
    const reqInit = init as RequestInit & { body: string };
    expect(reqInit.method).toBe('POST');
    const headers = reqInit.headers as Record<string, string>;
    expect(headers['x-api-key']).toBe('KEY');
    expect(headers['Authorization']).toBe('Bearer TOKEN');
    const parsed = JSON.parse(reqInit.body);
    expect(parsed).toMatchObject({
      model: 'gemini-3-pro',
      systemInstruction: 'sys',
      stableContents: [{ role: 'user', parts: [{ text: 'a' }] }],
      ttlSeconds: GEMINI_CACHE_DEFAULT_TTL,
    });
    expect(result.hit).toBe(false);
    expect(result.cacheName).toBe('cachedContents/xyz');
  });

  it('omite Authorization quando authToken é null', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ cacheId: 'a', cacheName: 'cachedContents/a', expiresAt: 1, tokenCount: 0, hit: true }),
    } as Response);

    await ensureGeminiCache({
      model: 'm', stableContents: [{}], apiKey: 'K', authToken: null,
    });
    const headers = fetchSpy.mock.calls[0][1].headers as Record<string, string>;
    expect(headers['Authorization']).toBeUndefined();
  });

  it('lança erro com mensagem do servidor quando !ok', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: { message: 'API key inválida' } }),
    } as Response);

    await expect(ensureGeminiCache({
      model: 'm', stableContents: [{}], apiKey: '', authToken: null,
    })).rejects.toThrow(/API key inválida/);
  });

  it('lança erro com HTTP status quando body não tem mensagem', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({}),
    } as Response);

    await expect(ensureGeminiCache({
      model: 'm', stableContents: [{}], apiKey: 'k', authToken: null,
    })).rejects.toThrow(/HTTP 500/);
  });

  it('usa ttlSeconds custom quando fornecido', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ cacheId: 'a', cacheName: 'b', expiresAt: 1, tokenCount: 0, hit: false }),
    } as Response);

    await ensureGeminiCache({
      model: 'm',
      stableContents: [{}],
      apiKey: 'K',
      ttlSeconds: 7200,
    });
    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body.ttlSeconds).toBe(7200);
  });

  it('hit=true do servidor é refletido no resultado', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ cacheId: 'a', cacheName: 'b', expiresAt: 1, tokenCount: 9999, hit: true }),
    } as Response);

    const result = await ensureGeminiCache({
      model: 'm', stableContents: [{}], apiKey: 'K',
    });
    expect(result.hit).toBe(true);
    expect(result.tokenCount).toBe(9999);
  });
});

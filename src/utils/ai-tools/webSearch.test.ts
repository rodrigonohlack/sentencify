/**
 * @file webSearch.test.ts
 * @description Testes do registry provider-agnostic de web search.
 */

import { describe, it, expect } from 'vitest';
import {
  providerSupportsWebSearch,
  applyWebSearchTool,
  extractGrounding,
  WEB_SEARCH_REGISTRY,
} from './webSearch';

describe('providerSupportsWebSearch', () => {
  it('retorna true para gemini no v1', () => {
    expect(providerSupportsWebSearch('gemini')).toBe(true);
  });

  it('retorna false para claude/openai/grok no v1 (no-op)', () => {
    expect(providerSupportsWebSearch('claude')).toBe(false);
    expect(providerSupportsWebSearch('openai')).toBe(false);
    expect(providerSupportsWebSearch('grok')).toBe(false);
  });
});

describe('applyWebSearchTool — Gemini', () => {
  it('injeta tools: [{ google_search: {} }] quando enabled', () => {
    const req = { contents: [], generationConfig: {} };
    const result = applyWebSearchTool('gemini', req, { enabled: true });
    expect(result).toMatchObject({
      contents: [],
      generationConfig: {},
      tools: [{ google_search: {} }],
    });
  });

  it('preserva tools existentes e adiciona google_search', () => {
    const req = { tools: [{ outra_tool: {} }] };
    const result = applyWebSearchTool('gemini', req, { enabled: true }) as { tools: unknown[] };
    expect(result.tools).toEqual([{ outra_tool: {} }, { google_search: {} }]);
  });

  it('não muta o request original (imutabilidade)', () => {
    const req = { contents: [], tools: [{ existing: {} }] };
    applyWebSearchTool('gemini', req, { enabled: true });
    expect(req.tools).toEqual([{ existing: {} }]);
  });
});

describe('applyWebSearchTool — camadas de defesa', () => {
  it('não aplica se enabled=false', () => {
    const req = { x: 1 };
    expect(applyWebSearchTool('gemini', req, { enabled: false })).toBe(req);
  });

  it('não aplica se anonimização ativa (mesmo com enabled=true)', () => {
    const req = { x: 1 };
    const result = applyWebSearchTool('gemini', req, {
      enabled: true,
      anonymizationEnabled: true,
    });
    expect(result).toBe(req);
    expect((result as { tools?: unknown }).tools).toBeUndefined();
  });

  it('não aplica em providers sem supportsWebSearch (claude/openai/grok)', () => {
    const req = { x: 1 };
    expect(applyWebSearchTool('claude', req, { enabled: true })).toBe(req);
    expect(applyWebSearchTool('openai', req, { enabled: true })).toBe(req);
    expect(applyWebSearchTool('grok', req, { enabled: true })).toBe(req);
  });
});

describe('extractGrounding — Gemini', () => {
  it('extrai chunks e queries de resposta válida', () => {
    const geminiResp = {
      candidates: [
        {
          content: { parts: [{ text: 'resposta' }] },
          groundingMetadata: {
            webSearchQueries: ['Súmula 347 TST 2026'],
            groundingChunks: [
              { web: { uri: 'https://tst.jus.br/sumula-347', title: 'Súmula 347 - TST' } },
              { web: { uri: 'https://jusbrasil.com.br/art', title: 'Análise JusBrasil' } },
            ],
          },
        },
      ],
    };
    const result = extractGrounding('gemini', geminiResp);
    expect(result).toEqual({
      webSearchQueries: ['Súmula 347 TST 2026'],
      groundingChunks: [
        { web: { uri: 'https://tst.jus.br/sumula-347', title: 'Súmula 347 - TST' } },
        { web: { uri: 'https://jusbrasil.com.br/art', title: 'Análise JusBrasil' } },
      ],
    });
  });

  it('retorna null quando resposta não tem groundingMetadata', () => {
    expect(extractGrounding('gemini', { candidates: [{ content: {} }] })).toBe(null);
  });

  it('retorna null quando candidates está vazio', () => {
    expect(extractGrounding('gemini', { candidates: [] })).toBe(null);
    expect(extractGrounding('gemini', {})).toBe(null);
    expect(extractGrounding('gemini', null)).toBe(null);
  });

  it('filtra chunks sem web.uri ou web.title', () => {
    const resp = {
      candidates: [
        {
          groundingMetadata: {
            groundingChunks: [
              { web: { uri: 'https://ok.com', title: 'Válido' } },
              { web: { uri: '' } as unknown } as unknown, // malformed
              { other: 'invalid chunk' } as unknown,
            ],
          },
        },
      ],
    };
    const result = extractGrounding('gemini', resp);
    expect(result?.groundingChunks).toHaveLength(1);
    expect(result?.groundingChunks?.[0]).toEqual({
      web: { uri: 'https://ok.com', title: 'Válido' },
    });
  });

  it('retorna null se após filtro nada sobra e não há queries', () => {
    const resp = {
      candidates: [
        {
          groundingMetadata: {
            groundingChunks: [{ other: 'lixo' }],
          },
        },
      ],
    };
    expect(extractGrounding('gemini', resp)).toBe(null);
  });
});

describe('extractGrounding — providers não-suportados', () => {
  it('claude/openai/grok retornam null sempre (no-op)', () => {
    const fakeResp = { candidates: [{ groundingMetadata: { webSearchQueries: ['x'] } }] };
    expect(extractGrounding('claude', fakeResp)).toBe(null);
    expect(extractGrounding('openai', fakeResp)).toBe(null);
    expect(extractGrounding('grok', fakeResp)).toBe(null);
  });
});

describe('WEB_SEARCH_REGISTRY — shape', () => {
  it('tem entrada para todos os providers suportados', () => {
    expect(WEB_SEARCH_REGISTRY).toHaveProperty('gemini');
    expect(WEB_SEARCH_REGISTRY).toHaveProperty('claude');
    expect(WEB_SEARCH_REGISTRY).toHaveProperty('openai');
    expect(WEB_SEARCH_REGISTRY).toHaveProperty('grok');
  });

  it('cada adapter implementa a interface completa', () => {
    for (const provider of ['gemini', 'claude', 'openai', 'grok'] as const) {
      const a = WEB_SEARCH_REGISTRY[provider];
      expect(typeof a.supportsWebSearch).toBe('boolean');
      expect(typeof a.applyToRequest).toBe('function');
      expect(typeof a.extractGrounding).toBe('function');
    }
  });
});

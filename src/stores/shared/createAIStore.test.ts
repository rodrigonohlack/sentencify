/**
 * @file createAIStore.test.ts
 * @description Testes da factory createAIStore e do módulo aiKeyPersistence.
 *              Importa o código de produção (não duplica lógica).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createAIStore } from './createAIStore';
import { loadApiKeysFromStorage, resolveApiKeys } from './aiKeyPersistence';

// Mock crypto: "encriptação" é prefixar com 'encrypted:', decriptação tira o prefixo.
vi.mock('../../utils/crypto', () => ({
  encryptApiKeys: vi.fn(async (keys: Record<string, string>) => {
    const out: Record<string, string> = {};
    for (const [p, k] of Object.entries(keys)) out[p] = k ? `encrypted:${k}` : '';
    return out;
  }),
  decryptApiKeys: vi.fn(async (keys: Record<string, string>) => {
    const out: Record<string, string> = {};
    for (const [p, v] of Object.entries(keys)) {
      out[p] = v?.startsWith('encrypted:') ? v.slice('encrypted:'.length) : v || '';
    }
    return out;
  }),
  isEncrypted: vi.fn((v: string) => v?.startsWith('encrypted:'))
}));

beforeEach(() => {
  localStorage.clear();
});

describe('createAIStore — setters básicos', () => {
  const makeStore = () =>
    createAIStore({
      persistName: 'test-ai-store',
      apiKeyStorageKey: 'test-api-keys'
    });

  it('retorna provider default "claude"', () => {
    const { useStore } = makeStore();
    expect(useStore.getState().aiSettings.provider).toBe('claude');
  });

  it('setProvider atualiza o provider', () => {
    const { useStore } = makeStore();
    useStore.getState().setProvider('gemini');
    expect(useStore.getState().aiSettings.provider).toBe('gemini');
  });

  it('setModel respeita o provider passado', () => {
    const { useStore } = makeStore();
    useStore.getState().setModel('openai', 'gpt-5.2');
    expect(useStore.getState().aiSettings.openaiModel).toBe('gpt-5.2');
  });

  it('setApiKey grava apenas a key do provider informado', () => {
    const { useStore } = makeStore();
    useStore.getState().setApiKey('claude', 'sk-abc');
    const keys = useStore.getState().aiSettings.apiKeys;
    expect(keys.claude).toBe('sk-abc');
    expect(keys.gemini).toBe('');
  });

  it('setThinkingBudget, setUseExtendedThinking e níveis de reasoning persistem', () => {
    const { useStore } = makeStore();
    const s = useStore.getState();
    s.setThinkingBudget('20000');
    s.setUseExtendedThinking(true);
    s.setGeminiThinkingLevel('low');
    s.setOpenAIReasoningLevel('high');

    const st = useStore.getState().aiSettings;
    expect(st.thinkingBudget).toBe('20000');
    expect(st.useExtendedThinking).toBe(true);
    expect(st.geminiThinkingLevel).toBe('low');
    expect(st.openaiReasoningLevel).toBe('high');
  });
});

describe('createAIStore — token metrics', () => {
  it('addTokenUsage acumula totais e incrementa requestCount', () => {
    const { useStore } = createAIStore({
      persistName: 'test-ai-tokens',
      apiKeyStorageKey: 'test-ai-tokens-keys'
    });

    useStore.getState().addTokenUsage({ input: 100, output: 50 });
    useStore.getState().addTokenUsage({ input: 200, output: 30, cacheRead: 10, cacheCreation: 5 });

    const m = useStore.getState().tokenMetrics;
    expect(m.totalInput).toBe(300);
    expect(m.totalOutput).toBe(80);
    expect(m.totalCacheRead).toBe(10);
    expect(m.totalCacheCreation).toBe(5);
    expect(m.requestCount).toBe(2);
    expect(m.lastUpdated).not.toBeNull();
  });

  it('resetTokenMetrics zera sem afetar aiSettings', () => {
    const { useStore } = createAIStore({
      persistName: 'test-ai-reset-tokens',
      apiKeyStorageKey: 'test-ai-reset-tokens-keys'
    });

    useStore.getState().setProvider('grok');
    useStore.getState().addTokenUsage({ input: 123 });
    useStore.getState().resetTokenMetrics();

    expect(useStore.getState().tokenMetrics.totalInput).toBe(0);
    expect(useStore.getState().tokenMetrics.requestCount).toBe(0);
    expect(useStore.getState().aiSettings.provider).toBe('grok');
  });

  it('resetSettings zera settings e metrics', () => {
    const { useStore } = createAIStore({
      persistName: 'test-ai-reset-all',
      apiKeyStorageKey: 'test-ai-reset-all-keys'
    });

    useStore.getState().setProvider('gemini');
    useStore.getState().addTokenUsage({ input: 10 });
    useStore.getState().resetSettings();

    expect(useStore.getState().aiSettings.provider).toBe('claude');
    expect(useStore.getState().tokenMetrics.totalInput).toBe(0);
  });
});

describe('createAIStore — partialize (segurança)', () => {
  it('apiKeys são zeradas no valor persistido', () => {
    const { useStore, persistKeys } = createAIStore({
      persistName: 'test-ai-partialize',
      apiKeyStorageKey: 'test-ai-partialize-keys'
    });

    useStore.getState().setApiKey('claude', 'sk-secret');
    persistKeys(useStore.getState().aiSettings.apiKeys);

    const persisted = localStorage.getItem('test-ai-partialize');
    expect(persisted).toBeTruthy();
    const parsed = JSON.parse(persisted!);
    const keys = parsed.state?.aiSettings?.apiKeys ?? {};
    expect(keys.claude).toBe('');
    expect(keys.gemini).toBe('');
  });
});

describe('aiKeyPersistence — loadApiKeysFromStorage', () => {
  it('retorna null se nenhuma chave tem dados', () => {
    const result = loadApiKeysFromStorage('missing-key', ['other-missing']);
    expect(result).toBeNull();
  });

  it('lê formato plano da chave primária', () => {
    localStorage.setItem(
      'primary',
      JSON.stringify({ claude: 'encrypted:abc', gemini: '', openai: '', grok: '' })
    );

    const result = loadApiKeysFromStorage('primary');
    expect(result?.claude).toBe('encrypted:abc');
  });

  it('ignora chave primária vazia e usa fallback', () => {
    localStorage.setItem(
      'primary',
      JSON.stringify({ claude: '', gemini: '', openai: '', grok: '' })
    );
    localStorage.setItem(
      'fallback',
      JSON.stringify({ claude: 'encrypted:xyz', gemini: '', openai: '', grok: '' })
    );

    const result = loadApiKeysFromStorage('primary', ['fallback']);
    expect(result?.claude).toBe('encrypted:xyz');
  });

  it('lê formato aninhado via fallback (estilo sentencify-ai-settings)', () => {
    localStorage.setItem(
      'sentencify-settings',
      JSON.stringify({
        otherStuff: 'foo',
        apiKeys: { claude: 'encrypted:core', gemini: '', openai: '', grok: '' }
      })
    );

    const result = loadApiKeysFromStorage('missing', ['sentencify-settings']);
    expect(result?.claude).toBe('encrypted:core');
  });

  it('chain de múltiplos níveis — retorna o primeiro com dados', () => {
    localStorage.setItem('level-1', JSON.stringify({ claude: '', gemini: '', openai: '', grok: '' }));
    localStorage.setItem(
      'level-2',
      JSON.stringify({ claude: 'encrypted:level2', gemini: '', openai: '', grok: '' })
    );
    localStorage.setItem(
      'level-3',
      JSON.stringify({ claude: 'encrypted:level3', gemini: '', openai: '', grok: '' })
    );

    const result = loadApiKeysFromStorage('level-1', ['level-2', 'level-3']);
    expect(result?.claude).toBe('encrypted:level2');
  });

  it('ignora JSON malformado silenciosamente', () => {
    localStorage.setItem('bad', '{not-json');
    localStorage.setItem(
      'good',
      JSON.stringify({ claude: 'encrypted:x', gemini: '', openai: '', grok: '' })
    );

    const result = loadApiKeysFromStorage('bad', ['good']);
    expect(result?.claude).toBe('encrypted:x');
  });
});

describe('aiKeyPersistence — resolveApiKeys', () => {
  it('decripta keys encriptadas', async () => {
    const resolved = await resolveApiKeys({
      claude: 'encrypted:sk-claude',
      gemini: 'encrypted:sk-gemini',
      openai: '',
      grok: ''
    });

    expect(resolved.claude).toBe('sk-claude');
    expect(resolved.gemini).toBe('sk-gemini');
    expect(resolved.openai).toBe('');
  });

  it('retorna keys brutas se decriptação não aplicar (texto plano)', async () => {
    const resolved = await resolveApiKeys({
      claude: 'plain-key-no-prefix',
      gemini: '',
      openai: '',
      grok: ''
    });

    expect(resolved.claude).toBe('plain-key-no-prefix');
  });
});

describe('createAIStore — persistKeys (fire-and-forget)', () => {
  it('grava em localStorage com chave encriptada', async () => {
    const { persistKeys } = createAIStore({
      persistName: 'test-ai-persist',
      apiKeyStorageKey: 'test-ai-persist-keys'
    });

    persistKeys({ claude: 'sk-new', gemini: '', openai: '', grok: '' });

    // encryption é async — aguarda próxima microtask
    await new Promise((r) => setTimeout(r, 10));

    const raw = localStorage.getItem('test-ai-persist-keys');
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.claude).toBe('encrypted:sk-new');
    expect(parsed.gemini).toBe('');
  });
});

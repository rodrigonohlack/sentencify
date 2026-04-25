/**
 * @file createAIStore.ts
 * @description Factory Zustand que gera stores de IA para os apps (analisador,
 *              noticias, prova-oral). Substitui os 3 stores quase idênticos
 *              que existiam antes. Core (src/stores/useAIStore.ts) tem versão
 *              extendida com features próprias e não usa esta factory.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AIProvider,
  AISettings,
  APIKeys,
  GeminiThinkingLevel,
  OpenAIReasoningLevel,
  TokenMetrics
} from '../../types/ai';
import { loadApiKeysFromStorage, persistApiKeys, resolveApiKeys } from './aiKeyPersistence';

export interface AIStoreConfig {
  /** Nome do persist do Zustand (ex: 'analisador-prepauta-ai-store'). */
  persistName: string;
  /** Chave de localStorage usada para gravar apiKeys encriptadas. */
  apiKeyStorageKey: string;
  /** Chaves de fallback lidas em ordem se a primária estiver vazia. */
  apiKeyFallbackKeys?: string[];
  /** Override opcional do estado inicial do AISettings. */
  initialSettings?: Partial<AISettings>;
}

export interface AIStoreBase {
  aiSettings: AISettings;
  tokenMetrics: TokenMetrics;
  setAiSettings: (settings: AISettings | ((prev: AISettings) => AISettings)) => void;
  setProvider: (provider: AIProvider) => void;
  setModel: (provider: AIProvider, model: string) => void;
  setApiKey: (provider: AIProvider, key: string) => void;
  setThinkingBudget: (budget: string) => void;
  setUseExtendedThinking: (enabled: boolean) => void;
  setGeminiThinkingLevel: (level: GeminiThinkingLevel) => void;
  setOpenAIReasoningLevel: (level: OpenAIReasoningLevel) => void;
  addTokenUsage: (usage: { input?: number; output?: number; cacheRead?: number; cacheCreation?: number }) => void;
  resetTokenMetrics: () => void;
  resetSettings: () => void;
}

const DEFAULT_AI_SETTINGS: AISettings = {
  provider: 'claude',
  claudeModel: 'claude-sonnet-4-20250514',
  geminiModel: 'gemini-3-flash-preview',
  openaiModel: 'gpt-5.2-chat-latest',
  openaiReasoningLevel: 'medium',
  grokModel: 'grok-4-1-fast-reasoning',
  deepseekModel: '',
  deepseekThinking: true,
  deepseekReasoningEffort: 'high',
  apiKeys: { claude: '', gemini: '', openai: '', grok: '', deepseek: '' },
  useExtendedThinking: false,
  thinkingBudget: '10000',
  geminiThinkingLevel: 'high'
};

const DEFAULT_TOKEN_METRICS: TokenMetrics = {
  totalInput: 0,
  totalOutput: 0,
  totalCacheRead: 0,
  totalCacheCreation: 0,
  requestCount: 0,
  lastUpdated: null
};

/** Retorna as apiKeys zeradas (usado no partialize para não gravar keys no persist do Zustand). */
const emptyApiKeys = (): APIKeys => ({ claude: '', gemini: '', openai: '', grok: '', deepseek: '' });

/**
 * Cria um store de IA parametrizado. Devolve o hook e utilitários auxiliares.
 *
 * @example
 * export const useAIStore = createAIStore({
 *   persistName: 'analisador-prepauta-ai-store',
 *   apiKeyStorageKey: 'analisador-prepauta-api-keys',
 *   apiKeyFallbackKeys: ['sentencify-ai-settings']
 * });
 */
export function createAIStore(config: AIStoreConfig) {
  const initialAISettings: AISettings = {
    ...DEFAULT_AI_SETTINGS,
    ...(config.initialSettings ?? {}),
    apiKeys: { ...DEFAULT_AI_SETTINGS.apiKeys, ...(config.initialSettings?.apiKeys ?? {}) }
  };

  const useStore = create<AIStoreBase>()(
    persist(
      (set) => ({
        aiSettings: initialAISettings,
        tokenMetrics: DEFAULT_TOKEN_METRICS,

        setAiSettings: (settingsOrUpdater) =>
          set((state) => ({
            aiSettings:
              typeof settingsOrUpdater === 'function'
                ? settingsOrUpdater(state.aiSettings)
                : settingsOrUpdater
          })),

        setProvider: (provider) =>
          set((state) => ({ aiSettings: { ...state.aiSettings, provider } })),

        setModel: (provider, model) =>
          set((state) => {
            const key = `${provider}Model` as keyof AISettings;
            return { aiSettings: { ...state.aiSettings, [key]: model } };
          }),

        setApiKey: (provider, key) =>
          set((state) => ({
            aiSettings: {
              ...state.aiSettings,
              apiKeys: { ...state.aiSettings.apiKeys, [provider]: key }
            }
          })),

        setThinkingBudget: (budget) =>
          set((state) => ({ aiSettings: { ...state.aiSettings, thinkingBudget: budget } })),

        setUseExtendedThinking: (enabled) =>
          set((state) => ({ aiSettings: { ...state.aiSettings, useExtendedThinking: enabled } })),

        setGeminiThinkingLevel: (level) =>
          set((state) => ({ aiSettings: { ...state.aiSettings, geminiThinkingLevel: level } })),

        setOpenAIReasoningLevel: (level) =>
          set((state) => ({ aiSettings: { ...state.aiSettings, openaiReasoningLevel: level } })),

        addTokenUsage: (usage) =>
          set((state) => ({
            tokenMetrics: {
              totalInput: state.tokenMetrics.totalInput + (usage.input || 0),
              totalOutput: state.tokenMetrics.totalOutput + (usage.output || 0),
              totalCacheRead: state.tokenMetrics.totalCacheRead + (usage.cacheRead || 0),
              totalCacheCreation: state.tokenMetrics.totalCacheCreation + (usage.cacheCreation || 0),
              requestCount: state.tokenMetrics.requestCount + 1,
              lastUpdated: new Date().toISOString()
            }
          })),

        resetTokenMetrics: () => set({ tokenMetrics: DEFAULT_TOKEN_METRICS }),

        resetSettings: () =>
          set({
            aiSettings: initialAISettings,
            tokenMetrics: DEFAULT_TOKEN_METRICS
          })
      }),
      {
        name: config.persistName,
        partialize: (state) => ({
          aiSettings: { ...state.aiSettings, apiKeys: emptyApiKeys() },
          tokenMetrics: state.tokenMetrics
        }),
        onRehydrateStorage: () => (state) => {
          if (!state) return;
          try {
            const rawKeys = loadApiKeysFromStorage(
              config.apiKeyStorageKey,
              config.apiKeyFallbackKeys ?? []
            );
            if (!rawKeys) return;

            resolveApiKeys(rawKeys).then((resolved) => {
              useStore.setState((s) => ({
                ...s,
                aiSettings: { ...s.aiSettings, apiKeys: resolved }
              }));
            });
          } catch (err) {
            console.warn(`[createAIStore/${config.persistName}] Erro ao restaurar apiKeys:`, err);
          }
        }
      }
    )
  );

  /** Persiste as apiKeys atuais do store na chave primária (encriptadas). */
  const persistKeys = (apiKeys: APIKeys): void => {
    persistApiKeys(config.apiKeyStorageKey, apiKeys);
  };

  return { useStore, persistKeys };
}

// ═══════════════════════════════════════════════════════════════════════════
// SELECTORS (compartilhados — funcionam com qualquer store gerado pela factory)
// ═══════════════════════════════════════════════════════════════════════════

export const selectProvider = (state: AIStoreBase): AIProvider => state.aiSettings.provider;

export const selectCurrentModel = (state: AIStoreBase): string => {
  const { provider, claudeModel, geminiModel, openaiModel, grokModel, deepseekModel } = state.aiSettings;
  switch (provider) {
    case 'claude':
      return claudeModel;
    case 'gemini':
      return geminiModel;
    case 'openai':
      return openaiModel;
    case 'grok':
      return grokModel;
    case 'deepseek':
      return deepseekModel;
    default:
      return claudeModel;
  }
};

export const selectCurrentApiKey = (state: AIStoreBase): string =>
  state.aiSettings.apiKeys[state.aiSettings.provider] || '';

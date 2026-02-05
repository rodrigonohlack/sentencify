// ═══════════════════════════════════════════════════════════════════════════
// STORE - Configurações de IA
// v1.41.0 - Store Zustand para configurações de IA do app de notícias
// (Compartilha keys do Analisador/Sentencify)
// ═══════════════════════════════════════════════════════════════════════════

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { encryptApiKeys, decryptApiKeys } from '../../../utils/crypto';
import type { AIProvider, AISettings, TokenMetrics, GeminiThinkingLevel, OpenAIReasoningLevel } from '../types';

interface AIStoreState {
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

const initialAISettings: AISettings = {
  provider: 'claude',
  claudeModel: 'claude-sonnet-4-20250514',
  geminiModel: 'gemini-3-flash-preview',
  openaiModel: 'gpt-5.2-chat-latest',
  openaiReasoningLevel: 'medium',
  grokModel: 'grok-4-1-fast-reasoning',
  apiKeys: {
    claude: '',
    gemini: '',
    openai: '',
    grok: ''
  },
  useExtendedThinking: false,
  thinkingBudget: '10000',
  geminiThinkingLevel: 'high'
};

const initialTokenMetrics: TokenMetrics = {
  totalInput: 0,
  totalOutput: 0,
  totalCacheRead: 0,
  totalCacheCreation: 0,
  requestCount: 0,
  lastUpdated: null
};

export const useAIStore = create<AIStoreState>()(
  persist(
    (set) => ({
      aiSettings: initialAISettings,
      tokenMetrics: initialTokenMetrics,

      setAiSettings: (settingsOrUpdater) =>
        set((state) => ({
          aiSettings: typeof settingsOrUpdater === 'function'
            ? settingsOrUpdater(state.aiSettings)
            : settingsOrUpdater
        })),

      setProvider: (provider) =>
        set((state) => ({
          aiSettings: { ...state.aiSettings, provider }
        })),

      setModel: (provider, model) =>
        set((state) => {
          const key = `${provider}Model` as keyof AISettings;
          return {
            aiSettings: { ...state.aiSettings, [key]: model }
          };
        }),

      setApiKey: (provider, key) =>
        set((state) => ({
          aiSettings: {
            ...state.aiSettings,
            apiKeys: { ...state.aiSettings.apiKeys, [provider]: key }
          }
        })),

      setThinkingBudget: (budget) =>
        set((state) => ({
          aiSettings: { ...state.aiSettings, thinkingBudget: budget }
        })),

      setUseExtendedThinking: (enabled) =>
        set((state) => ({
          aiSettings: { ...state.aiSettings, useExtendedThinking: enabled }
        })),

      setGeminiThinkingLevel: (level) =>
        set((state) => ({
          aiSettings: { ...state.aiSettings, geminiThinkingLevel: level }
        })),

      setOpenAIReasoningLevel: (level) =>
        set((state) => ({
          aiSettings: { ...state.aiSettings, openaiReasoningLevel: level }
        })),

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

      resetTokenMetrics: () =>
        set({ tokenMetrics: initialTokenMetrics }),

      resetSettings: () =>
        set({
          aiSettings: initialAISettings,
          tokenMetrics: initialTokenMetrics
        })
    }),
    {
      name: 'noticias-juridicas-ai-store',
      partialize: (state) => ({
        aiSettings: {
          ...state.aiSettings,
          // Não persistir API keys aqui (compartilhadas do Analisador)
          apiKeys: { claude: '', gemini: '', openai: '', grok: '' }
        },
        tokenMetrics: state.tokenMetrics
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          try {
            // 1. Tentar ler keys do Analisador
            let rawKeys: Record<string, string> | null = null;
            const analisadorKeys = localStorage.getItem('analisador-prepauta-api-keys');
            if (analisadorKeys) {
              rawKeys = JSON.parse(analisadorKeys);
            }

            // 2. Fallback: ler do Sentencify
            if (!rawKeys || !Object.values(rawKeys).some(k => k)) {
              const sentencifySettings = localStorage.getItem('sentencify-ai-settings');
              if (sentencifySettings) {
                const parsed = JSON.parse(sentencifySettings);
                if (parsed.apiKeys) {
                  rawKeys = parsed.apiKeys;
                }
              }
            }

            if (rawKeys) {
              const keysToDecrypt = rawKeys;
              decryptApiKeys(keysToDecrypt).then(decrypted => {
                const finalKeys: Record<string, string> = {};
                for (const [provider, value] of Object.entries(keysToDecrypt)) {
                  finalKeys[provider] = decrypted[provider] || value;
                }
                state.aiSettings.apiKeys = finalKeys as unknown as typeof state.aiSettings.apiKeys;
              }).catch(() => {
                state.aiSettings.apiKeys = keysToDecrypt as unknown as typeof state.aiSettings.apiKeys;
              });
            }
          } catch (err) {
            console.warn('[AIStore/Noticias] Erro ao restaurar apiKeys:', err);
          }
        }
      }
    }
  )
);

export const selectProvider = (state: AIStoreState) => state.aiSettings.provider;
export const selectCurrentModel = (state: AIStoreState) => {
  const { provider, claudeModel, geminiModel, openaiModel, grokModel } = state.aiSettings;
  switch (provider) {
    case 'claude': return claudeModel;
    case 'gemini': return geminiModel;
    case 'openai': return openaiModel;
    case 'grok': return grokModel;
    default: return claudeModel;
  }
};
export const selectCurrentApiKey = (state: AIStoreState) =>
  state.aiSettings.apiKeys[state.aiSettings.provider] || '';

/**
 * Persiste API keys de forma segura (encriptadas)
 * Salva no mesmo local que o Analisador para compartilhamento
 */
export const persistApiKeys = (apiKeys: AISettings['apiKeys']) => {
  encryptApiKeys(apiKeys as unknown as Record<string, string>).then(encrypted => {
    try {
      // Salvar no local compartilhado com Analisador
      localStorage.setItem('analisador-prepauta-api-keys', JSON.stringify(encrypted));
    } catch (err) {
      console.warn('[AIStore/Noticias] Erro ao salvar apiKeys:', err);
    }
  }).catch(err => {
    console.warn('[AIStore/Noticias] Erro ao encriptar apiKeys:', err);
  });
};

export default useAIStore;

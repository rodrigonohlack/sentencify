/**
 * @file useAIStore.ts
 * @description Store Zustand para configurações de IA (providers, modelos, tokens)
 * @version 1.37.60
 *
 * Este store centraliza o estado de configuração de IA que antes estava
 * no hook useAIIntegration.
 *
 * @replaces useAIIntegration (parcialmente - apenas configuração)
 * @usedBy App.tsx, ConfigModal, todos os componentes que usam IA
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type {
  AISettings,
  AIProvider,
  TokenMetrics,
  QuickPrompt,
  AnonymizationSettings,
  DoubleCheckSettings,
  VoiceImprovementSettings,
  TopicoComplementar,
  OCREngine,
  GeminiThinkingLevel,
  OpenAIReasoningLevel
} from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// SEÇÃO 1: DEFAULTS E CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════

/** Quick prompts padrão */
const DEFAULT_QUICK_PROMPTS: QuickPrompt[] = [
  {
    id: 'qp-1',
    label: 'Avaliar Decisão',
    prompt: 'Avalie criticamente a qualidade da decisão/fundamentação que redigi. IMPORTANTE: Não me bajule nem seja condescendente - quero uma avaliação genuinamente crítica que me ajude a melhorar efetivamente. Seja direto ao apontar problemas. Considere: (1) coerência com os fatos narrados nos documentos, (2) adequação jurídica aos pedidos, (3) clareza e objetividade da redação, (4) possíveis lacunas ou inconsistências. Priorize apontar o que precisa melhorar, não o que está bom.'
  },
  {
    id: 'qp-2',
    label: 'Sugerir Melhorias',
    prompt: 'Sugira melhorias específicas para o texto da decisão que redigi, mantendo o mesmo entendimento jurídico mas aprimorando a redação, clareza e fundamentação.'
  },
  {
    id: 'qp-3',
    label: 'Verificar Omissões',
    prompt: 'Verifique se há pedidos, argumentos ou provas relevantes nos documentos que não foram adequadamente abordados na minha decisão. Liste qualquer omissão encontrada.'
  },
  {
    id: 'qp-4',
    label: 'Análise de Prova Oral',
    prompt: '**INSTRUÇÃO CRÍTICA**: Analise a prova oral EXCLUSIVAMENTE sobre "{TOPICO}".\n\nREGRAS OBRIGATÓRIAS:\n1. IGNORE 100% de qualquer trecho que NÃO trate de "{TOPICO}"\n2. NÃO mencione outros assuntos discutidos nos depoimentos\n3. Se um depoente falou sobre múltiplos temas, extraia APENAS o que se refere a "{TOPICO}"\n4. Se não houver NENHUMA menção a "{TOPICO}", responda: "Não há menção a {TOPICO} nesta prova oral."\n\nProduza um resumo estruturado APENAS com trechos relevantes a "{TOPICO}", com minutagem quando disponível:\n\nAUTOR: [afirmação sobre {TOPICO}] (mm:ss);\nPREPOSTO: [afirmação sobre {TOPICO}] (mm:ss);\nTestemunha [nome]: [afirmação sobre {TOPICO}] (mm:ss);\n\n⚠️ LEMBRE-SE: Analise SOMENTE "{TOPICO}". Outros assuntos devem ser COMPLETAMENTE ignorados.'
  }
];

/** Tópicos complementares padrão */
const DEFAULT_TOPICOS_COMPLEMENTARES: TopicoComplementar[] = [
  { id: 1, title: 'HONORÁRIOS ADVOCATÍCIOS', category: 'MÉRITO', enabled: true, ordem: 1 },
  { id: 2, title: 'HONORÁRIOS PERICIAIS', category: 'MÉRITO', enabled: true, ordem: 2 },
  { id: 3, title: 'JUROS E CORREÇÃO MONETÁRIA', category: 'MÉRITO', enabled: true, ordem: 3 },
  { id: 4, title: 'DEDUÇÕES DE NATUREZA PREVIDENCIÁRIA E FISCAL', category: 'MÉRITO', enabled: true, ordem: 4 },
  { id: 5, title: 'COMPENSAÇÃO/DEDUÇÃO/ABATIMENTO', category: 'MÉRITO', enabled: true, ordem: 5 }
];

/** Configurações de anonimização padrão */
const DEFAULT_ANONYMIZATION: AnonymizationSettings = {
  enabled: false,
  cpf: true,
  rg: true,
  pis: true,
  ctps: true,
  telefone: true,
  email: true,
  contaBancaria: true,
  valores: false,
  nomes: true,
  processo: true,
  nomesUsuario: []
};

/** Configurações de Double Check padrão */
// v1.37.65: Adicionado proofAnalysis e quickPrompt
const DEFAULT_DOUBLE_CHECK: DoubleCheckSettings = {
  enabled: false,
  provider: 'claude',
  model: 'claude-sonnet-4-20250514',
  operations: {
    topicExtraction: false,
    dispositivo: false,
    sentenceReview: false,
    factsComparison: false,
    proofAnalysis: false,
    quickPrompt: false
  }
};

/** Configurações de melhoria de voz padrão (v1.37.88) */
const DEFAULT_VOICE_IMPROVEMENT: VoiceImprovementSettings = {
  enabled: false,
  model: 'haiku'
};

// ═══════════════════════════════════════════════════════════════════════════
// SEÇÃO 1.1: TIPOS AUXILIARES (v1.37.49)
// ═══════════════════════════════════════════════════════════════════════════

/** Status de teste de API */
export type ApiTestStatus = 'testing' | 'ok' | 'error' | null;

/** Estado de testes de API para todos os providers */
export interface ApiTestStatuses {
  claude: ApiTestStatus;
  gemini: ApiTestStatus;
  openai: ApiTestStatus;
  grok: ApiTestStatus;
}

/** Estado inicial dos testes de API */
const initialApiTestStatuses: ApiTestStatuses = {
  claude: null,
  gemini: null,
  openai: null,
  grok: null,
};

/** Estado inicial do AISettings */
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
  geminiThinkingLevel: 'high',
  model: 'claude-sonnet-4-20250514',
  customPrompt: '',
  modeloRelatorio: '',
  modeloDispositivo: '',
  modeloTopicoRelatorio: '',
  topicosComplementares: DEFAULT_TOPICOS_COMPLEMENTARES,
  ocrEngine: 'pdfjs',
  ocrLanguage: 'por',
  detailedMiniReports: false,
  topicsPerRequest: 1,
  parallelRequests: 5,
  anonymization: DEFAULT_ANONYMIZATION,
  semanticSearchEnabled: false,
  semanticThreshold: 50,
  jurisSemanticEnabled: false,
  jurisSemanticThreshold: 50,
  modelSemanticEnabled: false,
  modelSemanticThreshold: 40,
  useLocalAIForSuggestions: false,
  useLocalAIForJuris: false,
  quickPrompts: DEFAULT_QUICK_PROMPTS,
  logThinking: false,
  doubleCheck: DEFAULT_DOUBLE_CHECK,
  voiceImprovement: DEFAULT_VOICE_IMPROVEMENT
};

/** Estado inicial do TokenMetrics */
const initialTokenMetrics: TokenMetrics = {
  totalInput: 0,
  totalOutput: 0,
  totalCacheRead: 0,
  totalCacheCreation: 0,
  requestCount: 0,
  lastUpdated: null
};

// ═══════════════════════════════════════════════════════════════════════════
// SEÇÃO 2: TIPOS DO STORE
// ═══════════════════════════════════════════════════════════════════════════

/** Interface do estado do store */
interface AIStoreState {
  // Estado
  aiSettings: AISettings;
  tokenMetrics: TokenMetrics;

  // Estado - API Test (v1.37.49)
  apiTestStatuses: ApiTestStatuses;

  // Actions - Settings
  setAiSettings: (settings: AISettings | ((prev: AISettings) => AISettings)) => void;
  setProvider: (provider: AIProvider) => void;
  setClaudeModel: (model: string) => void;
  setGeminiModel: (model: string) => void;
  setOpenAIModel: (model: 'gpt-5.2' | 'gpt-5.2-chat-latest') => void;
  setGrokModel: (model: 'grok-4-1-fast-reasoning' | 'grok-4-1-fast-non-reasoning') => void;
  setApiKey: (provider: AIProvider, key: string) => void;
  setThinkingBudget: (budget: string) => void;
  setUseExtendedThinking: (enabled: boolean) => void;
  setGeminiThinkingLevel: (level: GeminiThinkingLevel) => void;
  setOpenAIReasoningLevel: (level: OpenAIReasoningLevel) => void;
  setCustomPrompt: (prompt: string) => void;
  setOCREngine: (engine: OCREngine) => void;
  setParallelRequests: (count: number) => void;
  setAnonymization: (settings: AnonymizationSettings) => void;
  setDoubleCheck: (settings: DoubleCheckSettings) => void;
  setVoiceImprovement: (settings: VoiceImprovementSettings) => void;
  setQuickPrompts: (prompts: QuickPrompt[]) => void;

  // Actions - Token Metrics
  setTokenMetrics: (metrics: TokenMetrics | ((prev: TokenMetrics) => TokenMetrics)) => void;
  addTokenUsage: (usage: { input?: number; output?: number; cacheRead?: number; cacheCreation?: number }) => void;
  resetTokenMetrics: () => void;

  // Actions - Reset
  resetSettings: () => void;

  // Actions - API Test (v1.37.49)
  setApiTestStatus: (provider: AIProvider, status: ApiTestStatus) => void;
  resetApiTestStatuses: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// SEÇÃO 3: STORE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Store de IA - Gerencia configurações e métricas
 *
 * @example
 * // Uso básico
 * const { aiSettings, setProvider } = useAIStore();
 * setProvider('gemini');
 *
 * @example
 * // Com selector para evitar re-renders
 * const provider = useAIStore((s) => s.aiSettings.provider);
 * const claudeModel = useAIStore((s) => s.aiSettings.claudeModel);
 */
export const useAIStore = create<AIStoreState>()(
  devtools(
    persist(
      immer((set) => ({
        // Estado inicial
        aiSettings: initialAISettings,
        tokenMetrics: initialTokenMetrics,

        // Estado - API Test (v1.37.49)
        apiTestStatuses: initialApiTestStatuses,

        // ─────────────────────────────────────────────────────────────────────
        // Actions - Settings Completo
        // ─────────────────────────────────────────────────────────────────────

        setAiSettings: (settingsOrUpdater) =>
          set(
            (state) => {
              if (typeof settingsOrUpdater === 'function') {
                state.aiSettings = settingsOrUpdater(state.aiSettings);
              } else {
                state.aiSettings = settingsOrUpdater;
              }
            },
            false,
            'setAiSettings'
          ),

        // ─────────────────────────────────────────────────────────────────────
        // Actions - Provider & Models
        // ─────────────────────────────────────────────────────────────────────

        setProvider: (provider) =>
          set(
            (state) => {
              state.aiSettings.provider = provider;
            },
            false,
            `setProvider/${provider}`
          ),

        setClaudeModel: (model) =>
          set(
            (state) => {
              state.aiSettings.claudeModel = model;
              // Manter compatibilidade com campo 'model' legado
              if (state.aiSettings.provider === 'claude') {
                state.aiSettings.model = model;
              }
            },
            false,
            `setClaudeModel/${model}`
          ),

        setGeminiModel: (model) =>
          set(
            (state) => {
              state.aiSettings.geminiModel = model;
            },
            false,
            `setGeminiModel/${model}`
          ),

        setOpenAIModel: (model) =>
          set(
            (state) => {
              state.aiSettings.openaiModel = model;
            },
            false,
            `setOpenAIModel/${model}`
          ),

        setGrokModel: (model) =>
          set(
            (state) => {
              state.aiSettings.grokModel = model;
            },
            false,
            `setGrokModel/${model}`
          ),

        setApiKey: (provider, key) =>
          set(
            (state) => {
              state.aiSettings.apiKeys[provider] = key;

              // Persistir apiKeys separadamente (não vai no Zustand persist por segurança)
              // Fix v1.37.59: apiKeys não eram persistidas para usuários novos
              try {
                const currentSettings = localStorage.getItem('sentencify-ai-settings');
                const parsed = currentSettings ? JSON.parse(currentSettings) : {};
                const updatedApiKeys = {
                  ...(parsed.apiKeys || {}),
                  [provider]: key
                };
                localStorage.setItem('sentencify-ai-settings', JSON.stringify({
                  ...parsed,
                  apiKeys: updatedApiKeys
                }));
              } catch (err) {
                console.warn('[AIStore] Erro ao persistir apiKey:', err);
              }
            },
            false,
            `setApiKey/${provider}`
          ),

        // ─────────────────────────────────────────────────────────────────────
        // Actions - Thinking/Reasoning
        // ─────────────────────────────────────────────────────────────────────

        setThinkingBudget: (budget) =>
          set(
            (state) => {
              state.aiSettings.thinkingBudget = budget;
            },
            false,
            'setThinkingBudget'
          ),

        setUseExtendedThinking: (enabled) =>
          set(
            (state) => {
              state.aiSettings.useExtendedThinking = enabled;
            },
            false,
            `setUseExtendedThinking/${enabled}`
          ),

        setGeminiThinkingLevel: (level) =>
          set(
            (state) => {
              state.aiSettings.geminiThinkingLevel = level;
            },
            false,
            `setGeminiThinkingLevel/${level}`
          ),

        setOpenAIReasoningLevel: (level) =>
          set(
            (state) => {
              state.aiSettings.openaiReasoningLevel = level;
            },
            false,
            `setOpenAIReasoningLevel/${level}`
          ),

        // ─────────────────────────────────────────────────────────────────────
        // Actions - Prompts & Templates
        // ─────────────────────────────────────────────────────────────────────

        setCustomPrompt: (prompt) =>
          set(
            (state) => {
              state.aiSettings.customPrompt = prompt;
            },
            false,
            'setCustomPrompt'
          ),

        setQuickPrompts: (prompts) =>
          set(
            (state) => {
              state.aiSettings.quickPrompts = prompts;
            },
            false,
            'setQuickPrompts'
          ),

        // ─────────────────────────────────────────────────────────────────────
        // Actions - OCR & Processing
        // ─────────────────────────────────────────────────────────────────────

        setOCREngine: (engine) =>
          set(
            (state) => {
              state.aiSettings.ocrEngine = engine;
            },
            false,
            `setOCREngine/${engine}`
          ),

        setParallelRequests: (count) =>
          set(
            (state) => {
              state.aiSettings.parallelRequests = count;
            },
            false,
            `setParallelRequests/${count}`
          ),

        // ─────────────────────────────────────────────────────────────────────
        // Actions - Anonymization & Double Check
        // ─────────────────────────────────────────────────────────────────────

        setAnonymization: (settings) =>
          set(
            (state) => {
              state.aiSettings.anonymization = settings;
            },
            false,
            'setAnonymization'
          ),

        setDoubleCheck: (settings) =>
          set(
            (state) => {
              state.aiSettings.doubleCheck = settings;
            },
            false,
            'setDoubleCheck'
          ),

        setVoiceImprovement: (settings) =>
          set(
            (state) => {
              state.aiSettings.voiceImprovement = settings;
            },
            false,
            'setVoiceImprovement'
          ),

        // ─────────────────────────────────────────────────────────────────────
        // Actions - Token Metrics
        // ─────────────────────────────────────────────────────────────────────

        setTokenMetrics: (metricsOrUpdater) =>
          set(
            (state) => {
              if (typeof metricsOrUpdater === 'function') {
                state.tokenMetrics = metricsOrUpdater(state.tokenMetrics);
              } else {
                state.tokenMetrics = metricsOrUpdater;
              }
            },
            false,
            'setTokenMetrics'
          ),

        addTokenUsage: (usage) =>
          set(
            (state) => {
              state.tokenMetrics.totalInput = (state.tokenMetrics.totalInput || 0) + (usage.input || 0);
              state.tokenMetrics.totalOutput = (state.tokenMetrics.totalOutput || 0) + (usage.output || 0);
              state.tokenMetrics.totalCacheRead = (state.tokenMetrics.totalCacheRead || 0) + (usage.cacheRead || 0);
              state.tokenMetrics.totalCacheCreation = (state.tokenMetrics.totalCacheCreation || 0) + (usage.cacheCreation || 0);
              state.tokenMetrics.requestCount = (state.tokenMetrics.requestCount || 0) + 1;
              state.tokenMetrics.lastUpdated = new Date().toISOString();
            },
            false,
            'addTokenUsage'
          ),

        resetTokenMetrics: () =>
          set(
            (state) => {
              state.tokenMetrics = initialTokenMetrics;
            },
            false,
            'resetTokenMetrics'
          ),

        // ─────────────────────────────────────────────────────────────────────
        // Actions - Reset
        // ─────────────────────────────────────────────────────────────────────

        resetSettings: () =>
          set(
            (state) => {
              state.aiSettings = initialAISettings;
              state.tokenMetrics = initialTokenMetrics;
            },
            false,
            'resetSettings'
          ),

        // ─────────────────────────────────────────────────────────────────────
        // Actions - API Test (v1.37.49)
        // ─────────────────────────────────────────────────────────────────────

        setApiTestStatus: (provider, status) =>
          set(
            (state) => {
              state.apiTestStatuses[provider] = status;
            },
            false,
            `setApiTestStatus/${provider}/${status}`
          ),

        resetApiTestStatuses: () =>
          set(
            (state) => {
              state.apiTestStatuses = initialApiTestStatuses;
            },
            false,
            'resetApiTestStatuses'
          ),
      })),
      {
        name: 'sentencify-ai-store',
        // Não persistir apiKeys por segurança (serão carregadas do localStorage antigo)
        partialize: (state) => ({
          aiSettings: {
            ...state.aiSettings,
            // Remover apiKeys da persistência por segurança
            apiKeys: { claude: '', gemini: '', openai: '', grok: '' }
          },
          tokenMetrics: state.tokenMetrics
        }),
        // Migração de dados antigos do localStorage
        onRehydrateStorage: () => (state) => {
          if (state) {
            // Restaurar apiKeys do localStorage antigo (por segurança, não ficam no Zustand persist)
            try {
              const oldSettings = localStorage.getItem('sentencify-ai-settings');
              if (oldSettings) {
                const parsed = JSON.parse(oldSettings);
                if (parsed.apiKeys) {
                  state.aiSettings.apiKeys = parsed.apiKeys;
                }
              }
            } catch (err) {
              console.warn('[AIStore] Erro ao restaurar apiKeys:', err);
            }
          }
        }
      }
    ),
    { name: 'AIStore' }
  )
);

// ═══════════════════════════════════════════════════════════════════════════
// SEÇÃO 4: SELECTORS
// ═══════════════════════════════════════════════════════════════════════════

/** Selector: Retorna provider atual */
export const selectProvider = (state: AIStoreState): AIProvider =>
  state.aiSettings.provider;

/** Selector: Retorna modelo atual baseado no provider */
export const selectCurrentModel = (state: AIStoreState): string => {
  const { provider, claudeModel, geminiModel, openaiModel, grokModel } = state.aiSettings;
  switch (provider) {
    case 'claude': return claudeModel;
    case 'gemini': return geminiModel;
    case 'openai': return openaiModel;
    case 'grok': return grokModel;
    default: return claudeModel;
  }
};

/** Selector: Retorna se extended thinking está habilitado */
export const selectIsThinkingEnabled = (state: AIStoreState): boolean =>
  state.aiSettings.useExtendedThinking;

/** Selector: Retorna token metrics */
export const selectTokenMetrics = (state: AIStoreState): TokenMetrics =>
  state.tokenMetrics;

/** Selector: Retorna apiKey do provider atual */
export const selectCurrentApiKey = (state: AIStoreState): string =>
  state.aiSettings.apiKeys[state.aiSettings.provider] || '';

/** Selector: Retorna configurações de anonimização */
export const selectAnonymization = (state: AIStoreState): AnonymizationSettings =>
  state.aiSettings.anonymization;

/** Selector: Retorna configurações de Double Check */
export const selectDoubleCheck = (state: AIStoreState): DoubleCheckSettings | undefined =>
  state.aiSettings.doubleCheck;

/** Selector: Retorna status de teste de API (v1.37.49) */
export const selectApiTestStatuses = (state: AIStoreState): ApiTestStatuses =>
  state.apiTestStatuses;

/** Selector: Retorna status de teste de um provider específico (v1.37.49) */
export const selectApiTestStatus = (provider: AIProvider) => (state: AIStoreState): ApiTestStatus =>
  state.apiTestStatuses[provider];

// ═══════════════════════════════════════════════════════════════════════════
// SEÇÃO 5: HOOKS DE COMPATIBILIDADE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook de compatibilidade para acesso às configurações de IA
 *
 * @deprecated Use useAIStore diretamente após migração completa
 *
 * @example
 * // Substituir:
 * const { aiSettings, setAiSettings } = useAIIntegration();
 *
 * // Por:
 * const { aiSettings, setAiSettings } = useAISettingsCompat();
 *
 * // Ou melhor ainda, use o store diretamente:
 * const provider = useAIStore((s) => s.aiSettings.provider);
 */
export function useAISettingsCompat() {
  const aiSettings = useAIStore((s) => s.aiSettings);
  const setAiSettings = useAIStore((s) => s.setAiSettings);
  const tokenMetrics = useAIStore((s) => s.tokenMetrics);
  const setTokenMetrics = useAIStore((s) => s.setTokenMetrics);
  const addTokenUsage = useAIStore((s) => s.addTokenUsage);

  return {
    aiSettings,
    setAiSettings,
    tokenMetrics,
    setTokenMetrics,
    addTokenUsage
  };
}

export default useAIStore;

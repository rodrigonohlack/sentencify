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
import { encryptApiKeys, decryptApiKeys } from '../utils/crypto';
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
    icon: '🎯',
    prompt: 'Avalie criticamente a qualidade da decisão/fundamentação que redigi. IMPORTANTE: Não me bajule nem seja condescendente - quero uma avaliação genuinamente crítica que me ajude a melhorar efetivamente. Seja direto ao apontar problemas. Considere: (1) coerência com os fatos narrados nos documentos, (2) adequação jurídica aos pedidos, (3) clareza e objetividade da redação, (4) possíveis lacunas ou inconsistências. Priorize apontar o que precisa melhorar, não o que está bom.',
    isDefault: true
  },
  {
    id: 'qp-2',
    label: 'Sugerir Melhorias',
    icon: '💡',
    prompt: 'Sugira melhorias específicas para o texto da decisão que redigi, mantendo o mesmo entendimento jurídico mas aprimorando a redação, clareza e fundamentação.',
    isDefault: true
  },
  {
    id: 'qp-3',
    label: 'Verificar Omissões',
    icon: '🔍',
    prompt: 'Verifique se há pedidos, argumentos ou provas relevantes nos documentos que não foram adequadamente abordados na minha decisão. Liste qualquer omissão encontrada.',
    isDefault: true
  },
  {
    id: 'qp-4',
    label: 'Análise de Prova Oral',
    icon: '🎤',
    prompt: '**INSTRUÇÃO CRÍTICA**: Analise a prova oral EXCLUSIVAMENTE sobre "{TOPICO}".\n\nREGRAS OBRIGATÓRIAS:\n1. IGNORE 100% de qualquer trecho que NÃO trate de "{TOPICO}"\n2. NÃO mencione outros assuntos discutidos nos depoimentos\n3. Se um depoente falou sobre múltiplos temas, extraia APENAS o que se refere a "{TOPICO}"\n4. Se não houver NENHUMA menção a "{TOPICO}", responda: "Não há menção a {TOPICO} nesta prova oral."\n\nProduza um resumo estruturado APENAS com trechos relevantes a "{TOPICO}", com minutagem quando disponível:\n\nAUTOR: [afirmação sobre {TOPICO}] (mm:ss);\nPREPOSTO: [afirmação sobre {TOPICO}] (mm:ss);\nTestemunha [nome]: [afirmação sobre {TOPICO}] (mm:ss);\n\n⚠️ LEMBRE-SE: Analise SOMENTE "{TOPICO}". Outros assuntos devem ser COMPLETAMENTE ignorados.',
    proofFilter: 'oral',  // v1.38.12: Filtrar apenas provas orais vinculadas
    isDefault: true
  },
  // v1.40.XX: Quickprompt com sub-opções para decisão baseada em provas
  {
    id: 'qp-5',
    label: 'Decidir com Provas',
    icon: '⚖️',
    prompt: '',
    specialHandler: 'proof-decision',
    subOptions: [
      {
        id: 'proof-all',
        label: 'Análises e conclusões',
        icon: '🔍',
        proofDataMode: 'all'
      },
      {
        id: 'proof-conclusions',
        label: 'Apenas conclusões',
        icon: '📝',
        proofDataMode: 'conclusions_only'
      }
    ],
    isDefault: true
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

/** Tipos de operação para streaming (v1.39.09) */
export type StreamingOperationType =
  | 'report'
  | 'proof'
  | 'dispositivo'
  | 'chat'
  | 'prova-oral'
  | 'generic';

/** Estado de streaming (v1.39.09) */
export interface StreamingState {
  isStreaming: boolean;
  streamingText: string;
  showModal: boolean;
  operationType: StreamingOperationType;
}

/** Estado inicial do streaming */
const initialStreamingState: StreamingState = {
  isStreaming: false,
  streamingText: '',
  showModal: false,
  operationType: 'generic'
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

  // Estado - Streaming (v1.39.09)
  streamingState: StreamingState;

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
  /** v1.37.91: Aceita model/provider para tracking por modelo */
  addTokenUsage: (usage: {
    input?: number;
    output?: number;
    cacheRead?: number;
    cacheCreation?: number;
    model?: string;
    provider?: 'claude' | 'gemini' | 'openai' | 'grok';
  }) => void;
  resetTokenMetrics: () => void;

  // Actions - Reset
  resetSettings: () => void;

  // Actions - API Test (v1.37.49)
  setApiTestStatus: (provider: AIProvider, status: ApiTestStatus) => void;
  resetApiTestStatuses: () => void;

  // Actions - Streaming (v1.39.09)
  startStreaming: (operationType: StreamingOperationType) => void;
  updateStreamingText: (text: string) => void;
  stopStreaming: () => void;
  setShowStreamingModal: (show: boolean) => void;
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

        // Estado - Streaming (v1.39.09)
        streamingState: initialStreamingState,

        // ─────────────────────────────────────────────────────────────────────
        // Actions - Settings Completo
        // ─────────────────────────────────────────────────────────────────────

        setAiSettings: (settingsOrUpdater) =>
          set(
            (state) => {
              const prevApiKeys = state.aiSettings.apiKeys;

              if (typeof settingsOrUpdater === 'function') {
                state.aiSettings = settingsOrUpdater(state.aiSettings);
              } else {
                state.aiSettings = settingsOrUpdater;
              }

              // Persistir apiKeys se mudaram (não vão no Zustand persist por segurança)
              const newApiKeys = state.aiSettings.apiKeys;
              if (newApiKeys && JSON.stringify(newApiKeys) !== JSON.stringify(prevApiKeys)) {
                const apiKeysCopy = { ...newApiKeys };
                encryptApiKeys(apiKeysCopy).then(encrypted => {
                  try {
                    const currentSettings = localStorage.getItem('sentencify-ai-settings');
                    const parsed = currentSettings ? JSON.parse(currentSettings) : {};
                    localStorage.setItem('sentencify-ai-settings', JSON.stringify({
                      ...parsed,
                      apiKeys: encrypted
                    }));
                  } catch (err) {
                    console.warn('[AIStore] Erro ao persistir apiKeys:', err);
                  }
                }).catch(err => {
                  // Fallback: persistir sem encriptação para não perder as keys
                  console.warn('[AIStore] Encriptação falhou, persistindo keys em texto:', err);
                  try {
                    const currentSettings = localStorage.getItem('sentencify-ai-settings');
                    const parsed = currentSettings ? JSON.parse(currentSettings) : {};
                    localStorage.setItem('sentencify-ai-settings', JSON.stringify({
                      ...parsed,
                      apiKeys: apiKeysCopy
                    }));
                  } catch { /* noop */ }
                });
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

              // Persistir apiKeys encriptadas
              const allKeys = { ...state.aiSettings.apiKeys, [provider]: key };
              encryptApiKeys(allKeys).then(encrypted => {
                try {
                  const currentSettings = localStorage.getItem('sentencify-ai-settings');
                  const parsed = currentSettings ? JSON.parse(currentSettings) : {};
                  localStorage.setItem('sentencify-ai-settings', JSON.stringify({
                    ...parsed,
                    apiKeys: encrypted
                  }));
                } catch (err) {
                  console.warn('[AIStore] Erro ao persistir apiKey:', err);
                }
              }).catch(err => {
                // Fallback: persistir sem encriptação para não perder as keys
                console.warn('[AIStore] Encriptação falhou, persistindo keys em texto:', err);
                try {
                  const currentSettings = localStorage.getItem('sentencify-ai-settings');
                  const parsed = currentSettings ? JSON.parse(currentSettings) : {};
                  localStorage.setItem('sentencify-ai-settings', JSON.stringify({
                    ...parsed,
                    apiKeys: allKeys
                  }));
                } catch { /* noop */ }
              });
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
              // Agregado global (backward compatible)
              state.tokenMetrics.totalInput = (state.tokenMetrics.totalInput || 0) + (usage.input || 0);
              state.tokenMetrics.totalOutput = (state.tokenMetrics.totalOutput || 0) + (usage.output || 0);
              state.tokenMetrics.totalCacheRead = (state.tokenMetrics.totalCacheRead || 0) + (usage.cacheRead || 0);
              state.tokenMetrics.totalCacheCreation = (state.tokenMetrics.totalCacheCreation || 0) + (usage.cacheCreation || 0);
              state.tokenMetrics.requestCount = (state.tokenMetrics.requestCount || 0) + 1;
              state.tokenMetrics.lastUpdated = new Date().toISOString();

              // v1.37.91: Tracking por modelo
              if (usage.model && usage.provider) {
                if (!state.tokenMetrics.byModel) {
                  state.tokenMetrics.byModel = {};
                }
                const existing = state.tokenMetrics.byModel[usage.model];
                state.tokenMetrics.byModel[usage.model] = {
                  provider: usage.provider,
                  input: (existing?.input || 0) + (usage.input || 0),
                  output: (existing?.output || 0) + (usage.output || 0),
                  cacheRead: (existing?.cacheRead || 0) + (usage.cacheRead || 0),
                  cacheCreation: (existing?.cacheCreation || 0) + (usage.cacheCreation || 0),
                  requestCount: (existing?.requestCount || 0) + 1
                };
              }
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

        // ─────────────────────────────────────────────────────────────────────
        // Actions - Streaming (v1.39.09)
        // ─────────────────────────────────────────────────────────────────────

        startStreaming: (operationType) =>
          set(
            (state) => {
              state.streamingState.isStreaming = true;
              state.streamingState.streamingText = '';
              state.streamingState.showModal = true;
              state.streamingState.operationType = operationType;
            },
            false,
            `startStreaming/${operationType}`
          ),

        updateStreamingText: (text) =>
          set(
            (state) => {
              state.streamingState.streamingText = text;
            },
            false,
            'updateStreamingText'
          ),

        stopStreaming: () =>
          set(
            (state) => {
              state.streamingState.isStreaming = false;
            },
            false,
            'stopStreaming'
          ),

        setShowStreamingModal: (show) =>
          set(
            (state) => {
              state.streamingState.showModal = show;
              // Se fechando o modal, resetar estado
              if (!show) {
                state.streamingState.isStreaming = false;
                state.streamingState.streamingText = '';
              }
            },
            false,
            `setShowStreamingModal/${show}`
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
            // Restaurar apiKeys do localStorage (decriptar se necessario)
            try {
              const oldSettings = localStorage.getItem('sentencify-ai-settings');
              if (oldSettings) {
                const parsed = JSON.parse(oldSettings);
                if (parsed.apiKeys) {
                  // Decriptar keys (async) e usar setState para notificar subscribers
                  decryptApiKeys(parsed.apiKeys).then(decrypted => {
                    const finalKeys: Record<string, string> = {};
                    for (const [provider, value] of Object.entries(parsed.apiKeys)) {
                      finalKeys[provider] = decrypted[provider] || (value as string);
                    }
                    useAIStore.setState((s) => ({
                      ...s,
                      aiSettings: { ...s.aiSettings, apiKeys: finalKeys as typeof s.aiSettings.apiKeys }
                    }));
                  }).catch(() => {
                    // Fallback: usar keys como estao (migracao gradual)
                    useAIStore.setState((s) => ({
                      ...s,
                      aiSettings: { ...s.aiSettings, apiKeys: parsed.apiKeys }
                    }));
                  });
                }
              }
            } catch (err) {
              console.warn('[AIStore] Erro ao restaurar apiKeys:', err);
            }

            // ═══════════════════════════════════════════════════════════════
            // MIGRAÇÕES DE QUICKPROMPTS
            // Todas as migrações são feitas primeiro, depois persistência única
            // ═══════════════════════════════════════════════════════════════
            let needsMigration = false;

            // Garantir que quickPrompts sempre tenha os defaults se vazio/undefined
            if (!state.aiSettings?.quickPrompts || state.aiSettings.quickPrompts.length === 0) {
              state.aiSettings.quickPrompts = DEFAULT_QUICK_PROMPTS;
              needsMigration = true;
            }

            // Migração v1.38.14: Adicionar proofFilter ao qp-4
            if (state.aiSettings?.quickPrompts) {
              const qp4 = state.aiSettings.quickPrompts.find((qp: QuickPrompt) => qp.id === 'qp-4');
              if (qp4 && !qp4.proofFilter) {
                state.aiSettings.quickPrompts = state.aiSettings.quickPrompts.map((qp: QuickPrompt) => {
                  if (qp.id === 'qp-4') {
                    return { ...qp, proofFilter: 'oral' as const };
                  }
                  return qp;
                });
                needsMigration = true;
              }
            }

            // Migração v1.40.XX: Adicionar qp-5 "Decidir com Provas"
            if (state.aiSettings?.quickPrompts) {
              const hasQp5 = state.aiSettings.quickPrompts.some((qp: QuickPrompt) => qp.id === 'qp-5');
              if (!hasQp5) {
                const proofDecisionQP = DEFAULT_QUICK_PROMPTS.find(qp => qp.id === 'qp-5');
                if (proofDecisionQP) {
                  state.aiSettings.quickPrompts = [...state.aiSettings.quickPrompts, proofDecisionQP];
                  needsMigration = true;
                }
              }
            }

            // Migração v1.40.XX: Marcar quickprompts padrão com isDefault
            if (state.aiSettings?.quickPrompts) {
              const defaultIds = ['qp-1', 'qp-2', 'qp-3', 'qp-4', 'qp-5'];
              const needsIsDefault = state.aiSettings.quickPrompts.some(
                (qp: QuickPrompt) => defaultIds.includes(qp.id) && qp.isDefault === undefined
              );
              if (needsIsDefault) {
                state.aiSettings.quickPrompts = state.aiSettings.quickPrompts.map((qp: QuickPrompt) => {
                  if (defaultIds.includes(qp.id) && qp.isDefault === undefined) {
                    return { ...qp, isDefault: true };
                  }
                  return qp;
                });
                needsMigration = true;
              }
            }

            // Migração v1.40.21: Sincronizar ícones e subOptions dos quickprompts padrão
            if (state.aiSettings?.quickPrompts) {
              const defaultIds = ['qp-1', 'qp-2', 'qp-3', 'qp-4', 'qp-5'];
              let needsSync = false;

              const syncedPrompts = state.aiSettings.quickPrompts.map((qp: QuickPrompt) => {
                if (defaultIds.includes(qp.id)) {
                  const defaultQp = DEFAULT_QUICK_PROMPTS.find(d => d.id === qp.id);
                  if (defaultQp) {
                    const iconMismatch = defaultQp.icon && qp.icon !== defaultQp.icon;
                    const subOptionsMismatch = defaultQp.subOptions &&
                      JSON.stringify(qp.subOptions) !== JSON.stringify(defaultQp.subOptions);

                    if (iconMismatch || subOptionsMismatch) {
                      needsSync = true;
                      return {
                        ...qp,
                        icon: defaultQp.icon,
                        subOptions: defaultQp.subOptions
                      };
                    }
                  }
                }
                return qp;
              });

              if (needsSync) {
                state.aiSettings.quickPrompts = syncedPrompts;
                needsMigration = true;
              }
            }

            // Persistência única após todas as migrações
            if (needsMigration) {
              const migratedQuickPrompts = [...state.aiSettings.quickPrompts];
              setTimeout(() => {
                useAIStore.setState((s) => ({
                  ...s,
                  aiSettings: {
                    ...s.aiSettings,
                    quickPrompts: migratedQuickPrompts
                  }
                }));
              }, 100);
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

/** Selector: Retorna estado de streaming (v1.39.09) */
export const selectStreamingState = (state: AIStoreState): StreamingState =>
  state.streamingState;

export default useAIStore;

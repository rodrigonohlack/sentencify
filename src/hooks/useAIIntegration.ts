/**
 * 🎣 CUSTOM HOOK: useAIIntegration - Integração com IA
 * Versão simplificada extraída do App.jsx para testes
 *
 * @version 1.35.76 - Migrado para TypeScript
 */
import { useState, useCallback, useReducer, useEffect } from 'react';
import type { AIProvider, OCREngine, GeminiThinkingLevel, AnonymizationSettings } from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════

export const AI_SETTINGS_KEY = 'sentencify-ai-settings';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

/** Contextos de geração de IA */
export type AIGenerationContext = 'generic' | 'model' | 'relatorio' | 'dispositivo' | 'keywords' | 'title';

/** Estado de um contexto de geração */
export interface AIContextState {
  instruction?: string;
  text?: string;
  generating?: boolean;
  regenerating?: boolean;
}

/** Estado completo de geração de IA */
export interface AIGenerationState {
  generic: { instruction: string; text: string; generating: boolean };
  model: { instruction: string; text: string; generating: boolean };
  relatorio: { instruction: string; regenerating: boolean };
  dispositivo: { instruction: string; text: string; generating: boolean; regenerating: boolean };
  keywords: { generating: boolean };
  title: { generating: boolean };
}

/** Actions do reducer de geração */
export type AIGenerationAction =
  | { type: 'SET_INSTRUCTION'; context: AIGenerationContext; value: string }
  | { type: 'SET_TEXT'; context: AIGenerationContext; value: string }
  | { type: 'SET_GENERATING'; context: AIGenerationContext; value: boolean }
  | { type: 'SET_REGENERATING'; context: AIGenerationContext; value: boolean }
  | { type: 'RESET_CONTEXT'; context: AIGenerationContext }
  | { type: 'RESET_ALL' };

/** Configurações de IA (versão local do hook) */
export interface AISettingsLocal {
  provider: AIProvider;
  claudeModel: string;
  geminiModel: string;
  apiKeys: { claude: string; gemini: string };
  geminiThinkingLevel: GeminiThinkingLevel;
  model: string;
  useExtendedThinking: boolean;
  thinkingBudget: string;
  customPrompt: string;
  ocrEngine: OCREngine;
  parallelRequests: number;
  anonymization: AnonymizationSettings;
  // Campos adicionais podem existir
  [key: string]: unknown;
}

/** Métricas de tokens */
export interface TokenMetricsLocal {
  totalInput: number;
  totalOutput: number;
  totalCacheRead: number;
  totalCacheCreation: number;
  requestCount: number;
  lastUpdated: Date | null;
}

/** Usage retornado pela API */
export interface TokenUsage {
  input_tokens?: number;
  output_tokens?: number;
  cache_read_input_tokens?: number;
  cache_creation_input_tokens?: number;
}

/** Retorno do hook useAIIntegration */
export interface UseAIIntegrationReturn {
  // Settings
  aiSettings: AISettingsLocal;
  setAiSettings: (newSettingsOrUpdater: AISettingsLocal | ((prev: AISettingsLocal) => AISettingsLocal)) => void;
  // Token metrics
  tokenMetrics: TokenMetricsLocal;
  updateTokenMetrics: (usage: TokenUsage) => void;
  resetTokenMetrics: () => void;
  // Geração - genérico
  aiInstruction: string;
  setAiInstruction: (value: string) => void;
  aiGeneratedText: string;
  setAiGeneratedText: (value: string) => void;
  generatingAi: boolean;
  setGeneratingAi: (value: boolean) => void;
  // Dispatch direto (para casos avançados)
  dispatchAI: React.Dispatch<AIGenerationAction>;
  aiGeneration: AIGenerationState;
  resetAIGeneration: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// ESTADO INICIAL E REDUCER
// ═══════════════════════════════════════════════════════════════════════════

/** Estado inicial do reducer de geração */
export const aiGenerationInitialState: AIGenerationState = {
  generic: { instruction: '', text: '', generating: false },
  model: { instruction: '', text: '', generating: false },
  relatorio: { instruction: '', regenerating: false },
  dispositivo: { instruction: '', text: '', generating: false, regenerating: false },
  keywords: { generating: false },
  title: { generating: false }
};

/** Reducer para estados de geração de IA */
export const aiGenerationReducer = (
  state: AIGenerationState,
  action: AIGenerationAction
): AIGenerationState => {
  if (action.type === 'RESET_ALL') {
    return aiGenerationInitialState;
  }

  const ctx = action.context;
  const base = (state[ctx] || aiGenerationInitialState[ctx] || {}) as AIContextState;

  switch (action.type) {
    case 'SET_INSTRUCTION':
      return { ...state, [ctx]: { ...base, instruction: action.value } };
    case 'SET_TEXT':
      return { ...state, [ctx]: { ...base, text: action.value } };
    case 'SET_GENERATING':
      return { ...state, [ctx]: { ...base, generating: action.value } };
    case 'SET_REGENERATING':
      return { ...state, [ctx]: { ...base, regenerating: action.value } };
    case 'RESET_CONTEXT':
      return { ...state, [ctx]: aiGenerationInitialState[ctx] };
    default:
      return state;
  }
};

/** Configurações padrão de IA */
export const defaultAiSettings: AISettingsLocal = {
  provider: 'claude',
  claudeModel: 'claude-sonnet-4-20250514',
  geminiModel: 'gemini-3-flash-preview',
  apiKeys: {
    claude: '',
    gemini: ''
  },
  geminiThinkingLevel: 'high',
  model: 'claude-sonnet-4-20250514',
  useExtendedThinking: false,
  thinkingBudget: '10000',
  customPrompt: '',
  ocrEngine: 'pdfjs',
  parallelRequests: 5,
  anonymization: {
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
    nomesUsuario: []
  }
};

/** Token metrics inicial */
export const defaultTokenMetrics: TokenMetricsLocal = {
  totalInput: 0,
  totalOutput: 0,
  totalCacheRead: 0,
  totalCacheCreation: 0,
  requestCount: 0,
  lastUpdated: null
};

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

const useAIIntegration = (): UseAIIntegrationReturn => {
  const [aiSettings, setAiSettingsState] = useState<AISettingsLocal>(defaultAiSettings);
  const [tokenMetrics, setTokenMetrics] = useState<TokenMetricsLocal>(defaultTokenMetrics);
  const [aiGeneration, dispatchAI] = useReducer(aiGenerationReducer, aiGenerationInitialState);

  // Factory para criar setters de contexto
  const createSetter = useCallback(
    (type: 'SET_INSTRUCTION' | 'SET_TEXT' | 'SET_GENERATING' | 'SET_REGENERATING', context: AIGenerationContext) =>
      (value: string | boolean) =>
        dispatchAI({ type, context, value } as AIGenerationAction),
    []
  );

  // Getters e setters para contexto 'generic'
  const aiInstruction = aiGeneration.generic.instruction;
  const setAiInstruction = createSetter('SET_INSTRUCTION', 'generic') as (value: string) => void;
  const aiGeneratedText = aiGeneration.generic.text;
  const setAiGeneratedText = createSetter('SET_TEXT', 'generic') as (value: string) => void;
  const generatingAi = aiGeneration.generic.generating;
  const setGeneratingAi = createSetter('SET_GENERATING', 'generic') as (value: boolean) => void;

  // Carregar settings do localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(AI_SETTINGS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<AISettingsLocal>;
        // Migração: garantir defaults
        if (!parsed.provider) parsed.provider = 'claude';
        if (!parsed.apiKeys) parsed.apiKeys = { claude: '', gemini: '' };
        setAiSettingsState((prev) => ({ ...prev, ...parsed }));
      }
    } catch (err) {
      console.warn('[useAIIntegration] Erro ao carregar settings:', err);
    }
  }, []);

  // Salvar settings
  const setAiSettings = useCallback(
    (newSettingsOrUpdater: AISettingsLocal | ((prev: AISettingsLocal) => AISettingsLocal)): void => {
      if (typeof newSettingsOrUpdater === 'function') {
        setAiSettingsState((prev) => {
          const newSettings = newSettingsOrUpdater(prev);
          try {
            localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(newSettings));
          } catch {
            // Ignora erro de quota
          }
          return newSettings;
        });
      } else {
        setAiSettingsState(newSettingsOrUpdater);
        try {
          localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(newSettingsOrUpdater));
        } catch {
          // Ignora erro de quota
        }
      }
    },
    []
  );

  // Atualizar métricas de tokens
  const updateTokenMetrics = useCallback((usage: TokenUsage): void => {
    setTokenMetrics((prev) => ({
      totalInput: prev.totalInput + (usage.input_tokens || 0),
      totalOutput: prev.totalOutput + (usage.output_tokens || 0),
      totalCacheRead: prev.totalCacheRead + (usage.cache_read_input_tokens || 0),
      totalCacheCreation: prev.totalCacheCreation + (usage.cache_creation_input_tokens || 0),
      requestCount: prev.requestCount + 1,
      lastUpdated: new Date()
    }));
  }, []);

  // Reset métricas
  const resetTokenMetrics = useCallback((): void => {
    setTokenMetrics(defaultTokenMetrics);
  }, []);

  // Reset geração
  const resetAIGeneration = useCallback((): void => {
    dispatchAI({ type: 'RESET_ALL' });
  }, []);

  return {
    // Settings
    aiSettings,
    setAiSettings,
    // Token metrics
    tokenMetrics,
    updateTokenMetrics,
    resetTokenMetrics,
    // Geração - genérico
    aiInstruction,
    setAiInstruction,
    aiGeneratedText,
    setAiGeneratedText,
    generatingAi,
    setGeneratingAi,
    // Dispatch direto (para casos avançados)
    dispatchAI,
    aiGeneration,
    resetAIGeneration
  };
};

export default useAIIntegration;

// 🎣 CUSTOM HOOK: useAIIntegration - Integração com IA
// Versão simplificada extraída do App.jsx para testes
import React from 'react';

// Constantes
export const AI_SETTINGS_KEY = 'sentencify-ai-settings';

// Estado inicial do reducer de geração
export const aiGenerationInitialState = {
  generic: { instruction: '', text: '', generating: false },
  model: { instruction: '', text: '', generating: false },
  relatorio: { instruction: '', regenerating: false },
  dispositivo: { instruction: '', text: '', generating: false, regenerating: false },
  keywords: { generating: false },
  title: { generating: false }
};

// Reducer para estados de geração de IA
export const aiGenerationReducer = (state, action) => {
  const ctx = action.context;
  const base = state[ctx] || aiGenerationInitialState[ctx] || {};
  
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
    case 'RESET_ALL':
      return aiGenerationInitialState;
    default:
      return state;
  }
};

// Configurações padrão de IA
export const defaultAiSettings = {
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

// Token metrics inicial
export const defaultTokenMetrics = {
  totalInput: 0,
  totalOutput: 0,
  totalCacheRead: 0,
  totalCacheCreation: 0,
  requestCount: 0,
  lastUpdated: null
};

const useAIIntegration = () => {
  const [aiSettings, setAiSettingsState] = React.useState(defaultAiSettings);
  const [tokenMetrics, setTokenMetrics] = React.useState(defaultTokenMetrics);
  const [aiGeneration, dispatchAI] = React.useReducer(aiGenerationReducer, aiGenerationInitialState);

  // Factory para criar setters de contexto
  const createSetter = React.useCallback((type, context) => 
    (value) => dispatchAI({ type, context, value }), []);

  // Getters e setters para contexto 'generic'
  const aiInstruction = aiGeneration.generic.instruction;
  const setAiInstruction = createSetter('SET_INSTRUCTION', 'generic');
  const aiGeneratedText = aiGeneration.generic.text;
  const setAiGeneratedText = createSetter('SET_TEXT', 'generic');
  const generatingAi = aiGeneration.generic.generating;
  const setGeneratingAi = createSetter('SET_GENERATING', 'generic');

  // Carregar settings do localStorage
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem(AI_SETTINGS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Migração: garantir defaults
        if (!parsed.provider) parsed.provider = 'claude';
        if (!parsed.apiKeys) parsed.apiKeys = { claude: '', gemini: '' };
        setAiSettingsState(prev => ({ ...prev, ...parsed }));
      }
    } catch (err) {
      console.warn('[useAIIntegration] Erro ao carregar settings:', err);
    }
  }, []);

  // Salvar settings
  const setAiSettings = React.useCallback((newSettingsOrUpdater) => {
    if (typeof newSettingsOrUpdater === 'function') {
      setAiSettingsState(prev => {
        const newSettings = newSettingsOrUpdater(prev);
        try {
          localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(newSettings));
        } catch {}
        return newSettings;
      });
    } else {
      setAiSettingsState(newSettingsOrUpdater);
      try {
        localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(newSettingsOrUpdater));
      } catch {}
    }
  }, []);

  // Atualizar métricas de tokens
  const updateTokenMetrics = React.useCallback((usage) => {
    setTokenMetrics(prev => ({
      totalInput: prev.totalInput + (usage.input_tokens || 0),
      totalOutput: prev.totalOutput + (usage.output_tokens || 0),
      totalCacheRead: prev.totalCacheRead + (usage.cache_read_input_tokens || 0),
      totalCacheCreation: prev.totalCacheCreation + (usage.cache_creation_input_tokens || 0),
      requestCount: prev.requestCount + 1,
      lastUpdated: new Date()
    }));
  }, []);

  // Reset métricas
  const resetTokenMetrics = React.useCallback(() => {
    setTokenMetrics(defaultTokenMetrics);
  }, []);

  // Reset geração
  const resetAIGeneration = React.useCallback(() => {
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
    resetAIGeneration,
  };
};

export default useAIIntegration;

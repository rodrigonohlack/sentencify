// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES - Modelos de IA
// v1.41.0 - Modelos de IA disponíveis por provedor
// ═══════════════════════════════════════════════════════════════════════════

import type { AIProvider } from '../types';

export interface ModelInfo {
  id: string;
  name: string;
  recommended?: boolean;
  description?: string;
}

export interface ProviderInfo {
  name: string;
  models: ModelInfo[];
  icon: string;
}

export const AI_PROVIDERS: Record<AIProvider, ProviderInfo> = {
  claude: {
    name: 'Claude (Anthropic)',
    icon: 'brain',
    models: [
      {
        id: 'claude-sonnet-4-20250514',
        name: 'Claude 4 Sonnet',
        recommended: true,
        description: 'Excelente equilíbrio entre velocidade e qualidade'
      },
      {
        id: 'claude-opus-4-5-20251101',
        name: 'Claude 4.5 Opus',
        description: 'Máxima qualidade e raciocínio avançado'
      }
    ]
  },
  gemini: {
    name: 'Gemini (Google)',
    icon: 'sparkles',
    models: [
      {
        id: 'gemini-3-flash-preview',
        name: 'Gemini 3 Flash',
        recommended: true,
        description: '$0.50/$3.00 por 1M tokens'
      },
      {
        id: 'gemini-3-pro-preview',
        name: 'Gemini 3 Pro',
        description: '$2.00/$12 por 1M tokens'
      }
    ]
  },
  openai: {
    name: 'ChatGPT (OpenAI)',
    icon: 'message-circle',
    models: [
      {
        id: 'gpt-5.2-chat-latest',
        name: 'GPT-5.2 Instant',
        recommended: true,
        description: '$1.75/$14 por 1M tokens'
      },
      {
        id: 'gpt-5.2',
        name: 'GPT-5.2 Thinking',
        description: 'Com Reasoning - $1.75/$14 por 1M'
      }
    ]
  },
  grok: {
    name: 'Grok (xAI)',
    icon: 'zap',
    models: [
      {
        id: 'grok-4-1-fast-reasoning',
        name: 'Grok 4.1 Fast',
        recommended: true,
        description: '$0.20/$0.50 por 1M - 2M contexto'
      },
      {
        id: 'grok-4-1-fast-non-reasoning',
        name: 'Grok 4.1 Instant',
        description: 'Sem thinking - $0.20/$0.50 por 1M'
      }
    ]
  }
};

export const getDefaultModel = (provider: AIProvider): string => {
  const providerInfo = AI_PROVIDERS[provider];
  const recommended = providerInfo.models.find(m => m.recommended);
  return recommended?.id || providerInfo.models[0].id;
};

export const getModelName = (provider: AIProvider, modelId: string): string => {
  const model = AI_PROVIDERS[provider].models.find(m => m.id === modelId);
  return model?.name || modelId;
};

export const getProviderName = (provider: AIProvider): string => {
  return AI_PROVIDERS[provider].name;
};

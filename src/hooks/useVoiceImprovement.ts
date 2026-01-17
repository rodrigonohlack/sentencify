/**
 * @file useVoiceImprovement.ts
 * @description Hook para melhorar texto ditado por voz usando LLM
 * @version 1.37.88
 *
 * Usa modelos rápidos/baratos para corrigir e tornar fluido o texto
 * capturado pelo reconhecimento de voz.
 */

import React from 'react';
import type { VoiceImprovementModel } from '../types';
import { API_BASE } from '../constants/api';
import { buildVoiceImprovementPrompt } from '../prompts/voice-improvement-prompt';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS E CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════

/** Configuração de modelo por provider */
interface ModelConfig {
  provider: 'claude' | 'gemini' | 'openai' | 'grok';
  model: string;
  displayName: string;
}

/** Mapeamento de modelo para configuração de API */
export const VOICE_MODEL_CONFIG: Record<VoiceImprovementModel, ModelConfig> = {
  'haiku': {
    provider: 'claude',
    model: 'claude-3-5-haiku-20241022',
    displayName: 'Claude Haiku'
  },
  'flash': {
    provider: 'gemini',
    model: 'gemini-2.0-flash',
    displayName: 'Gemini Flash'
  },
  'gpt-4o-mini': {
    provider: 'openai',
    model: 'gpt-4o-mini',
    displayName: 'GPT-4o Mini'
  },
  'grok-instant': {
    provider: 'grok',
    model: 'grok-4-1-fast-non-reasoning',
    displayName: 'Grok Instant'
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════

interface UseVoiceImprovementProps {
  apiKeys: {
    claude: string;
    gemini: string;
    openai: string;
    grok: string;
  };
}

interface UseVoiceImprovementReturn {
  improveText: (rawText: string, model: VoiceImprovementModel) => Promise<string>;
  isImproving: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook para melhorar texto ditado por voz usando LLM
 *
 * @example
 * const { improveText, isImproving } = useVoiceImprovement({ apiKeys });
 * const improved = await improveText('texto ditado', 'haiku');
 */
export function useVoiceImprovement({ apiKeys }: UseVoiceImprovementProps): UseVoiceImprovementReturn {
  const [isImproving, setIsImproving] = React.useState(false);

  /**
   * Melhora o texto usando o modelo especificado
   * @param rawText - Texto bruto do reconhecimento de voz
   * @param model - Modelo a usar (haiku, flash, gpt-4o-mini, grok-instant)
   * @returns Texto melhorado ou original se falhar
   */
  const improveText = React.useCallback(async (
    rawText: string,
    model: VoiceImprovementModel
  ): Promise<string> => {
    // Texto muito curto não precisa de melhoria
    if (rawText.trim().length < 10) {
      return rawText;
    }

    const config = VOICE_MODEL_CONFIG[model];
    const apiKey = apiKeys[config.provider];

    // Sem API key configurada, retorna texto original
    if (!apiKey) {
      console.warn(`[VoiceImprovement] API key não configurada para ${config.provider}`);
      return rawText;
    }

    setIsImproving(true);

    try {
      const prompt = buildVoiceImprovementPrompt(rawText);

      // Chamar API baseado no provider
      let improvedText: string;

      if (config.provider === 'claude') {
        improvedText = await callClaudeAPI(prompt, config.model, apiKey);
      } else if (config.provider === 'gemini') {
        improvedText = await callGeminiAPI(prompt, config.model, apiKey);
      } else if (config.provider === 'openai') {
        improvedText = await callOpenAIAPI(prompt, config.model, apiKey);
      } else if (config.provider === 'grok') {
        improvedText = await callGrokAPI(prompt, config.model, apiKey);
      } else {
        return rawText;
      }

      return improvedText.trim() || rawText;
    } catch (error) {
      console.error('[VoiceImprovement] Erro ao melhorar texto:', error);
      return rawText;
    } finally {
      setIsImproving(false);
    }
  }, [apiKeys]);

  return { improveText, isImproving };
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNÇÕES DE API
// ═══════════════════════════════════════════════════════════════════════════

async function callClaudeAPI(prompt: string, model: string, apiKey: string): Promise<string> {
  const response = await fetch(`${API_BASE}/api/claude`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey
    },
    body: JSON.stringify({
      model,
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status}`);
  }

  const data = await response.json();
  return data.content?.[0]?.text || '';
}

async function callGeminiAPI(prompt: string, model: string, apiKey: string): Promise<string> {
  const response = await fetch(`${API_BASE}/api/gemini`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey
    },
    body: JSON.stringify({
      model,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: 1000,
        temperature: 0.3
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

async function callOpenAIAPI(prompt: string, model: string, apiKey: string): Promise<string> {
  const response = await fetch(`${API_BASE}/api/openai`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey
    },
    body: JSON.stringify({
      model,
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

async function callGrokAPI(prompt: string, model: string, apiKey: string): Promise<string> {
  const response = await fetch(`${API_BASE}/api/grok`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey
    },
    body: JSON.stringify({
      model,
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!response.ok) {
    throw new Error(`Grok API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

export default useVoiceImprovement;

/**
 * @file useVoiceImprovement.ts
 * @description Hook para melhorar texto ditado por voz usando LLM
 * @version 1.37.90
 *
 * Usa modelos rápidos/baratos para corrigir e tornar fluido o texto
 * capturado pelo reconhecimento de voz.
 *
 * v1.37.90: Refatorado para usar callAI do useAIIntegration
 * - Reutiliza infraestrutura existente ao invés de duplicar código
 * - Tracking automático de tokens via callAI
 */

import React from 'react';
import type { VoiceImprovementModel, CallAIFunction } from '../types';
import { buildVoiceImprovementPrompt } from '../prompts/voice-improvement-prompt';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS E CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════

/** Configuração de modelo por provider */
interface ModelConfig {
  provider: 'claude' | 'gemini' | 'openai' | 'grok' | 'deepseek' | 'claude-cli' | 'codex-cli';
  model: string;
  displayName: string;
}

/** Mapeamento de modelo para configuração de API */
export const VOICE_MODEL_CONFIG: Record<VoiceImprovementModel, ModelConfig> = {
  'haiku': {
    provider: 'claude',
    model: 'claude-haiku-4-5-20251001',
    displayName: 'Claude Haiku 4.5'
  },
  'flash': {
    provider: 'gemini',
    model: 'gemini-3-flash-preview',
    displayName: 'Gemini 3 Flash'
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
  },
  // v1.43.06: DeepSeek V4-Flash — opção mais barata ($0.14/$0.28 por 1M)
  // disableThinking: true é aplicado pelo callAI, então usa modo non-thinking
  // (texto ditado é simples rewrite — DeepSeek sem thinking dá conta sem lazy)
  'deepseek-flash': {
    provider: 'deepseek',
    model: 'deepseek-v4-flash',
    displayName: 'DeepSeek V4 Flash'
  },
  // v1.50.52: Providers CLI locais (daemon llm-bridge · assinatura · sem API key).
  // disableThinking: true é aplicado pelo callAI (provider !== 'gemini'), então rodam non-thinking.
  'claude-local': {
    provider: 'claude-cli',
    model: 'claude-sonnet-4-6',
    displayName: 'Claude Local (Sonnet 4.6 · assinatura)'
  },
  'codex-local': {
    provider: 'codex-cli',
    model: 'gpt-5.5',
    displayName: 'Codex Local (GPT-5.5 · assinatura)'
  }
};

/**
 * v1.50.52: Decide se um modelo rápido está disponível para uso.
 * Providers CLI locais (claude-cli/codex-cli) não usam API key — dependem do daemon
 * llm-bridge — então estão sempre listados. Os demais exigem API key configurada.
 */
export function isFastModelAvailable(
  config: ModelConfig,
  apiKeys: Partial<Record<string, string>> | undefined
): boolean {
  if (config.provider === 'claude-cli' || config.provider === 'codex-cli') return true;
  const key = apiKeys?.[config.provider];
  return !!(key && key.trim().length > 0);
}

// ═══════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════

interface UseVoiceImprovementProps {
  /** Função callAI do useAIIntegration - reutiliza infraestrutura existente */
  callAI: CallAIFunction;
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
 * const { callAI } = useAIIntegration();
 * const { improveText, isImproving } = useVoiceImprovement({ callAI });
 * const improved = await improveText('texto ditado', 'haiku');
 */
export function useVoiceImprovement({ callAI }: UseVoiceImprovementProps): UseVoiceImprovementReturn {
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

    let config = VOICE_MODEL_CONFIG[model];
    if (!config) {
      console.warn(`[VoiceImprovement] Modelo '${model}' não encontrado no config, usando haiku como fallback`);
      config = VOICE_MODEL_CONFIG['haiku'];
    }

    setIsImproving(true);

    try {
      const prompt = buildVoiceImprovementPrompt(rawText);

      // Chamar API usando callAI com provider/model específicos
      // v1.37.90: Reutiliza infraestrutura do useAIIntegration
      // - Tracking automático de tokens
      // - Retry logic
      // - Error handling consistente
      const improvedText = await callAI(
        [{ role: 'user', content: prompt }],
        {
          provider: config.provider,
          model: config.model,
          maxTokens: 1000,
          temperature: 0.3,
          disableThinking: config.provider !== 'gemini',  // Gemini 3 não pode desativar totalmente
          geminiThinkingLevel: config.provider === 'gemini' ? 'minimal' : undefined,
          logMetrics: true        // Garantir tracking de tokens
        }
      );

      return improvedText.trim() || rawText;
    } catch (error) {
      console.error('[VoiceImprovement] Erro ao melhorar texto:', error);
      return rawText;
    } finally {
      setIsImproving(false);
    }
  }, [callAI]);

  return { improveText, isImproving };
}

export default useVoiceImprovement;

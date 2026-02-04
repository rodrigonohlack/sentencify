/**
 * @file useSynthesis.ts
 * @description Hook para geração de síntese do processo
 */

import { useState, useCallback } from 'react';
import { useAIIntegration } from './useAIIntegration';
import { useResultStore } from '../stores';
import { SYNTHESIS_SYSTEM_PROMPT, buildSynthesisPrompt } from '../prompts/synthesis';
import type { PedidoAnalise } from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook para geração de síntese resumida dos pedidos do processo
 * @returns Estado e funções para gerar síntese
 */
export const useSynthesis = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { callAI } = useAIIntegration();
  const setSintese = useResultStore((s) => s.setSintese);
  const sintese = useResultStore((s) => s.sintese);

  /**
   * Gera uma síntese resumida dos pedidos do processo
   * @param pedidos - Lista de pedidos para sintetizar
   * @returns Síntese gerada ou null se falhou
   */
  const generateSynthesis = useCallback(
    async (pedidos: PedidoAnalise[]): Promise<string | null> => {
      if (pedidos.length === 0) {
        setError('Não há pedidos para sintetizar');
        return null;
      }

      setIsGenerating(true);
      setError(null);

      try {
        const userPrompt = buildSynthesisPrompt(
          pedidos.map((p) => ({ tema: p.tema, descricao: p.descricao }))
        );

        const response = await callAI(
          [{ role: 'user', content: userPrompt }],
          {
            systemPrompt: SYNTHESIS_SYSTEM_PROMPT,
            maxTokens: 200,
            disableThinking: true
          }
        );

        // Limpa aspas que o modelo pode adicionar
        const cleanedSynthesis = response.trim().replace(/^["']|["']$/g, '');
        setSintese(cleanedSynthesis);
        return cleanedSynthesis;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao gerar síntese';
        setError(message);
        return null;
      } finally {
        setIsGenerating(false);
      }
    },
    [callAI, setSintese]
  );

  return {
    sintese,
    isGenerating,
    error,
    generateSynthesis
  };
};

export default useSynthesis;

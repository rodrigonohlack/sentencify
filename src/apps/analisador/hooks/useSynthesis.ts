/**
 * @file useSynthesis.ts
 * @description Hook para geração de síntese do processo
 */

import { useState, useCallback } from 'react';
import { useAIIntegration } from './useAIIntegration';
import { useAnalysesAPI } from './useAnalysesAPI';
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
  const { updateAnalysis } = useAnalysesAPI();
  const setSintese = useResultStore((s) => s.setSintese);
  const sintese = useResultStore((s) => s.sintese);
  const savedAnalysisId = useResultStore((s) => s.savedAnalysisId);

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
          pedidos.map((p) => ({ tema: p.tema }))
        );

        const response = await callAI(
          [{ role: 'user', content: userPrompt }],
          {
            systemPrompt: SYNTHESIS_SYSTEM_PROMPT,
            maxTokens: 2000,
            disableThinking: true
          }
        );

        // Limpa aspas que o modelo pode adicionar e valida resposta vazia
        const cleanedSynthesis = response?.trim().replace(/^["']|["']$/g, '') || '';

        if (!cleanedSynthesis) {
          setError('A IA não retornou uma síntese. Tente novamente.');
          return null;
        }

        setSintese(cleanedSynthesis);

        // Salva na API se tiver análise salva
        if (savedAnalysisId) {
          updateAnalysis(savedAnalysisId, { sintese: cleanedSynthesis });
        }

        return cleanedSynthesis;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao gerar síntese';
        setError(message);
        return null;
      } finally {
        setIsGenerating(false);
      }
    },
    [callAI, setSintese, savedAnalysisId, updateAnalysis]
  );

  return {
    sintese,
    isGenerating,
    error,
    generateSynthesis
  };
};

export default useSynthesis;

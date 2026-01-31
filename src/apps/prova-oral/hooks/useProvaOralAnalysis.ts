/**
 * @file useProvaOralAnalysis.ts
 * @description Hook para análise de prova oral usando IA
 * v1.39.08: Streaming para evitar timeout do Render
 */

import { useCallback } from 'react';
import { useAIIntegration } from './useAIIntegration';
import { useProvaOralStore } from '../stores';
import { PROVA_ORAL_SYSTEM_PROMPT } from '../prompts';
import { getMaxOutputTokens } from '../constants';
import type { ProvaOralResult } from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Extrai JSON de uma string que pode conter markdown ou texto adicional
 */
function extractJSON(text: string): string {
  // Remove blocos de código markdown
  let cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '');

  // Tenta encontrar o início e fim do JSON
  const jsonStart = cleaned.indexOf('{');
  const jsonEnd = cleaned.lastIndexOf('}');

  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
  }

  return cleaned.trim();
}

/**
 * Valida e normaliza o resultado da análise
 */
function normalizeResult(data: unknown): ProvaOralResult {
  const result = data as ProvaOralResult;

  // Garantir estrutura mínima
  return {
    processo: result.processo || {},
    depoentes: Array.isArray(result.depoentes) ? result.depoentes : [],
    sinteses: Array.isArray(result.sinteses) ? result.sinteses : [],
    sintesesCondensadas: Array.isArray(result.sintesesCondensadas) ? result.sintesesCondensadas : [],
    sintesesPorTema: Array.isArray(result.sintesesPorTema) ? result.sintesesPorTema : [],
    analises: Array.isArray(result.analises) ? result.analises : [],
    contradicoes: Array.isArray(result.contradicoes) ? result.contradicoes : [],
    confissoes: Array.isArray(result.confissoes) ? result.confissoes : [],
    credibilidade: Array.isArray(result.credibilidade) ? result.credibilidade : [],
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

export interface UseProvaOralAnalysisReturn {
  analyze: (transcricao: string, sinteseProcesso: string) => Promise<ProvaOralResult | null>;
  isAnalyzing: boolean;
  progress: number;
  progressMessage: string;
  error: string | null;
  isStreaming: boolean;
  streamingText: string;
  showStreamingModal: boolean;
  closeStreamingModal: () => void;
}

export function useProvaOralAnalysis(): UseProvaOralAnalysisReturn {
  const { callAIStream, aiSettings } = useAIIntegration();
  const {
    isAnalyzing,
    progress,
    progressMessage,
    error,
    isStreaming,
    streamingText,
    showStreamingModal,
    setIsAnalyzing,
    setProgress,
    setError,
    setResult,
    startStreaming,
    stopStreaming,
    setStreamingText,
    setShowStreamingModal,
  } = useProvaOralStore();

  const closeStreamingModal = useCallback(() => {
    setShowStreamingModal(false);
  }, [setShowStreamingModal]);

  const analyze = useCallback(
    async (transcricao: string, sinteseProcesso: string): Promise<ProvaOralResult | null> => {
      if (!transcricao.trim()) {
        setError('A transcrição é obrigatória');
        return null;
      }

      setIsAnalyzing(true);
      setProgress(10, 'Preparando análise...');
      startStreaming(); // Abre o modal de streaming

      try {
        // Montar o prompt do usuário
        const userPrompt = `## TRANSCRIÇÃO DA AUDIÊNCIA

${transcricao}

## SÍNTESE DO PROCESSO

${sinteseProcesso || 'Não fornecida. Analise a transcrição identificando os temas/pedidos mencionados.'}

---

Analise a transcrição e a síntese acima. Retorne APENAS o JSON estruturado conforme especificado.`;

        setProgress(30, 'Conectando ao provedor...');

        // Determinar modelo atual baseado no provedor
        const currentModel =
          aiSettings.provider === 'claude' ? aiSettings.claudeModel :
          aiSettings.provider === 'gemini' ? aiSettings.geminiModel :
          aiSettings.provider === 'openai' ? aiSettings.openaiModel :
          aiSettings.grokModel;

        // Chamar a IA com streaming e callback para atualizar UI
        const maxTokens = getMaxOutputTokens(currentModel);
        console.log('[ProvaOralAnalysis] Iniciando streaming:', { provider: aiSettings.provider, model: currentModel, maxTokens });

        const response = await callAIStream(
          [{ role: 'user', content: userPrompt }],
          {
            systemPrompt: PROVA_ORAL_SYSTEM_PROMPT,
            maxTokens,
            onChunk: (fullText) => {
              // Atualiza o texto no modal em tempo real
              setStreamingText(fullText);
            }
          }
        );

        stopStreaming(); // Marca streaming como completo
        console.log('[ProvaOralAnalysis] Streaming completo, tamanho:', response?.length || 0);

        setProgress(70, 'Processando resultado...');

        // Extrair e parsear o JSON
        const jsonStr = extractJSON(response);
        console.log('[ProvaOralAnalysis] JSON extraído, tamanho:', jsonStr?.length || 0);

        let parsed: unknown;

        try {
          parsed = JSON.parse(jsonStr);
        } catch (parseError) {
          console.error('[ProvaOralAnalysis] Erro ao parsear JSON:', parseError);
          console.error('[ProvaOralAnalysis] Resposta completa da IA:', response);
          console.error('[ProvaOralAnalysis] JSON extraído:', jsonStr);
          throw new Error('Erro ao processar resposta da IA. Tente novamente.');
        }

        // Normalizar e validar
        const result = normalizeResult(parsed);

        setProgress(100, 'Concluído!');
        setResult(result);
        setIsAnalyzing(false);

        return result;

      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro desconhecido';
        stopStreaming();
        setShowStreamingModal(false);
        setError(message);
        return null;
      }
    },
    [callAIStream, aiSettings, setIsAnalyzing, setProgress, setError, setResult, startStreaming, stopStreaming, setStreamingText, setShowStreamingModal]
  );

  return {
    analyze,
    isAnalyzing,
    progress,
    progressMessage,
    error,
    isStreaming,
    streamingText,
    showStreamingModal,
    closeStreamingModal,
  };
}

export default useProvaOralAnalysis;

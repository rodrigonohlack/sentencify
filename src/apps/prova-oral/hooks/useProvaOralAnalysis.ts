/**
 * @file useProvaOralAnalysis.ts
 * @description Hook para análise de prova oral usando IA
 * v1.40.15: Arquitetura de duas fases (Transcrição + Análise Jurídica)
 */

import { useCallback } from 'react';
import { useAIIntegration } from './useAIIntegration';
import { useProvaOralStore } from '../stores';
import { PROVA_ORAL_TRANSCRIPTION_PROMPT, PROVA_ORAL_JURIDICAL_ANALYSIS_PROMPT } from '../prompts';
import { getMaxOutputTokens } from '../constants';
import type { ProvaOralResult } from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface Depoente {
  id: string;
  nome: string;
  qualificacao: string;
}

interface SinteseConteudo {
  texto: string;
  timestamp: string;
}

interface Sintese {
  deponenteId: string;
  conteudo: SinteseConteudo[];
}

interface SinteseCondensada {
  deponente: string;
  qualificacao: string;
  textoCorrente: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Gera sintesesCondensadas programaticamente a partir de sinteses
 * Garante consistência entre as abas "Detalhada" e "Por Depoente"
 */
function generateSintesesCondensadas(
  sinteses: Sintese[],
  depoentes: Depoente[]
): SinteseCondensada[] {
  return sinteses.map(s => {
    const dep = depoentes.find(d => d.id === s.deponenteId);
    const qualificacao = dep?.qualificacao || 'desconhecido';

    // Formatar nome no padrão esperado (ex: "AUTOR FULANO", "PREPOSTO SICRANO")
    const qualLabel = qualificacao === 'autor' ? 'AUTOR' :
                      qualificacao === 'preposto' ? 'PREPOSTO' :
                      qualificacao === 'testemunha-autor' ? 'TESTEMUNHA DO AUTOR' :
                      qualificacao === 'testemunha-re' ? 'TESTEMUNHA DA RÉ' : 'DEPOENTE';
    const nomeFormatado = dep?.nome ? `${qualLabel} ${dep.nome.toUpperCase()}` : qualLabel;

    // Concatenar todos os conteúdos em texto corrido
    const textoCorrente = s.conteudo
      .map(c => `${c.texto} (${c.timestamp})`)
      .join('; ');

    return {
      deponente: nomeFormatado,
      qualificacao,
      textoCorrente
    };
  });
}

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
  analyze: (transcricao: string, sinteseProcesso: string, instrucoesExtras?: string) => Promise<ProvaOralResult | null>;
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
    async (transcricao: string, sinteseProcesso: string, instrucoesExtras?: string): Promise<ProvaOralResult | null> => {
      if (!transcricao.trim()) {
        setError('A transcrição é obrigatória');
        return null;
      }

      setIsAnalyzing(true);
      setProgress(5, 'Preparando análise em duas fases...');
      startStreaming(); // Abre o modal de streaming

      try {
        // Montar seção de instruções extras (usado em ambas as fases)
        const instrucoesSection = instrucoesExtras?.trim()
          ? `## INSTRUÇÕES ESPECÍFICAS DO USUÁRIO

${instrucoesExtras}

IMPORTANTE: Siga as instruções acima ao realizar a análise.

`
          : '';

        // Determinar modelo atual baseado no provedor
        const currentModel =
          aiSettings.provider === 'claude' ? aiSettings.claudeModel :
          aiSettings.provider === 'gemini' ? aiSettings.geminiModel :
          aiSettings.provider === 'openai' ? aiSettings.openaiModel :
          aiSettings.grokModel;

        const maxTokens = getMaxOutputTokens(currentModel);
        console.log('[ProvaOralAnalysis] Iniciando análise em duas fases:', { provider: aiSettings.provider, model: currentModel, maxTokens });

        // ═══════════════════════════════════════════════════════════════
        // FASE 1: TRANSCRIÇÃO EXAUSTIVA
        // ═══════════════════════════════════════════════════════════════
        setProgress(10, 'Fase 1: Transcrevendo depoimentos...');
        console.log('[ProvaOralAnalysis] Iniciando Fase 1 (Transcrição)');

        const userPromptPhase1 = `## TRANSCRIÇÃO DA AUDIÊNCIA

${transcricao}

## SÍNTESE DO PROCESSO

${sinteseProcesso || 'Não fornecida.'}

${instrucoesSection}---

## INSTRUÇÕES FINAIS (FASE 1 - TRANSCRIÇÃO)

Sua ÚNICA tarefa nesta fase é TRANSCREVER os depoimentos. NÃO analise juridicamente ainda.

⚠️ ATENÇÃO: Sua resposta será avaliada pela EXTENSÃO e COMPLETUDE. Uma resposta curta é considerada FALHA.

CHECKLIST OBRIGATÓRIO:
□ depoentes[] contém TODOS os depoentes identificados na transcrição?
□ sinteses[] tem exatamente um item para CADA depoente?
□ Cada timestamp da transcrição virou um item separado em sinteses[].conteudo?
□ sinteses[].conteudo tem TODAS as declarações (8+ por depoente)?

Se algum item acima não foi cumprido, REFAÇA antes de responder.`;

        const phase1Response = await callAIStream(
          [{ role: 'user', content: userPromptPhase1 }],
          {
            systemPrompt: PROVA_ORAL_TRANSCRIPTION_PROMPT,
            maxTokens,
            onChunk: (fullText) => setStreamingText(fullText)
          }
        );

        console.log('[ProvaOralAnalysis] Fase 1 completa, tamanho:', phase1Response?.length || 0);
        setProgress(45, 'Fase 1 concluída. Processando transcrição...');

        const phase1Json = extractJSON(phase1Response);
        let phase1Result: Record<string, unknown>;
        try {
          phase1Result = JSON.parse(phase1Json);
        } catch (parseError) {
          console.error('[ProvaOralAnalysis] Erro ao parsear Fase 1:', parseError);
          console.error('[ProvaOralAnalysis] Resposta Fase 1:', phase1Response);
          console.error('[ProvaOralAnalysis] JSON extraído Fase 1:', phase1Json);
          throw new Error('Erro ao processar transcrição. Tente novamente.');
        }

        // ═══════════════════════════════════════════════════════════════
        // FASE 2: ANÁLISE JURÍDICA
        // ═══════════════════════════════════════════════════════════════
        setProgress(50, 'Fase 2: Analisando juridicamente...');
        console.log('[ProvaOralAnalysis] Iniciando Fase 2 (Análise Jurídica)');

        // Limpar texto de streaming para mostrar resposta da Fase 2
        setStreamingText('');

        // Extrair lista de depoentes do resultado da Fase 1
        const deponentesPhase1 = (phase1Result.depoentes as Depoente[]) || [];
        const deponentesList = deponentesPhase1
          .map(d => `- ${d.nome || d.id} (${d.qualificacao})`)
          .join('\n');

        const totalDepoentes = deponentesPhase1.length;
        console.log('[ProvaOralAnalysis] Fase 2 - Total de depoentes:', totalDepoentes);

        const userPromptPhase2 = `## TRANSCRIÇÃO ESTRUTURADA (Resultado da Fase 1)

${JSON.stringify(phase1Result, null, 2)}

## ⚠️ LISTA COMPLETA DE DEPOENTES - TODOS DEVEM SER CONSIDERADOS

Total: ${totalDepoentes} depoentes

${deponentesList}

ATENÇÃO: Para CADA tema, verifique se CADA depoente acima falou algo. Se falou, DEVE aparecer em sintesesPorTema E em analises[].provaOral.

## SÍNTESE DO PROCESSO

${sinteseProcesso || 'Não fornecida.'}

${instrucoesSection}---

## INSTRUÇÕES FINAIS (FASE 2 - ANÁLISE JURÍDICA)

Com base na transcrição estruturada acima, produza a ANÁLISE JURÍDICA completa.

⚠️ REGRA CRÍTICA DE COMPLETUDE:
1. Conte quantos depoentes existem na lista acima: ${totalDepoentes}
2. Para cada tema, verifique se cada depoente disse algo relevante
3. Se disse → INCLUA (mesmo negações ou "não sei")
4. Só omita se literalmente não há declaração sobre o tema

CHECKLIST OBRIGATÓRIO:
□ sintesesPorTema.declaracoes inclui TODOS os depoentes que falaram sobre o tema?
□ analises[].provaOral tem EXATAMENTE os mesmos depoentes de sintesesPorTema.declaracoes?
□ Análise de credibilidade usa apenas critérios LEGÍTIMOS?`;

        const phase2Response = await callAIStream(
          [{ role: 'user', content: userPromptPhase2 }],
          {
            systemPrompt: PROVA_ORAL_JURIDICAL_ANALYSIS_PROMPT,
            maxTokens,
            onChunk: (fullText) => setStreamingText(fullText)
          }
        );

        console.log('[ProvaOralAnalysis] Fase 2 completa, tamanho:', phase2Response?.length || 0);

        const phase2Json = extractJSON(phase2Response);
        let phase2Result: Record<string, unknown>;
        try {
          phase2Result = JSON.parse(phase2Json);
        } catch (parseError) {
          console.error('[ProvaOralAnalysis] Erro ao parsear Fase 2:', parseError);
          console.error('[ProvaOralAnalysis] Resposta Fase 2:', phase2Response);
          console.error('[ProvaOralAnalysis] JSON extraído Fase 2:', phase2Json);
          throw new Error('Erro ao processar análise jurídica. Tente novamente.');
        }

        // ═══════════════════════════════════════════════════════════════
        // MERGE: Combinar resultados das duas fases
        // ═══════════════════════════════════════════════════════════════
        setProgress(90, 'Combinando resultados...');

        // Gerar sintesesCondensadas programaticamente a partir de sinteses
        // Isso garante consistência entre as abas "Detalhada" e "Por Depoente"
        const sintesesCondensadas = generateSintesesCondensadas(
          (phase1Result.sinteses as Sintese[]) || [],
          (phase1Result.depoentes as Depoente[]) || []
        );

        const mergedResult = {
          ...phase1Result,
          ...phase2Result,
          sintesesCondensadas // Sobrescreve qualquer versão gerada pela IA
        };

        console.log('[ProvaOralAnalysis] Merge completo. Total keys:', Object.keys(mergedResult).length);

        stopStreaming(); // Marca streaming como completo

        // Normalizar e validar
        const result = normalizeResult(mergedResult);

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

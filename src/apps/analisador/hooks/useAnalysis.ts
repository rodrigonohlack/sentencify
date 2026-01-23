/**
 * @file useAnalysis.ts
 * @description Hook para análise de prepauta
 */

import { useCallback } from 'react';
import { useDocumentStore, useResultStore } from '../stores';
import { useAIIntegration } from './useAIIntegration';
import { ANALYSIS_SYSTEM_PROMPT, buildAnalysisPrompt } from '../prompts';
import type { AnalysisResult, AIMessage } from '../types';
import { parseAIResponse, extractJSON, AnalysisResponseSchema } from '../../../schemas/ai-responses';

export const useAnalysis = () => {
  const { peticao, contestacao } = useDocumentStore();
  const { setResult, setIsAnalyzing, setProgress, setError, reset } = useResultStore();
  const { callAI } = useAIIntegration();

  const parseAnalysisResult = (response: string): AnalysisResult => {
    // Try to extract JSON from the response
    let jsonStr = response;

    // Remove markdown code blocks if present
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    // Try to find JSON object
    const objectMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      jsonStr = objectMatch[0];
    }

    try {
      // Tentar validar com Zod primeiro
      const validated = parseAIResponse(jsonStr, AnalysisResponseSchema);
      if (validated.success) {
        const data = validated.data;
        return {
          identificacao: data.identificacao || { reclamantes: [], reclamadas: [] },
          contrato: data.contrato || { dadosInicial: {}, controversias: [] },
          tutelasProvisoras: data.tutelasProvisoras || [],
          preliminares: data.preliminares || [],
          prejudiciais: data.prejudiciais || {},
          pedidos: data.pedidos || [],
          reconvencao: data.reconvencao,
          defesasAutonomas: data.defesasAutonomas || [],
          impugnacoes: data.impugnacoes || { documentos: [], documentosNaoImpugnados: [] },
          provas: data.provas || {
            reclamante: { testemunhal: false, documental: false, pericial: false, depoimentoPessoal: false },
            reclamada: { testemunhal: false, documental: false, pericial: false, depoimentoPessoal: false }
          },
          valorCausa: data.valorCausa || { valorTotal: 0, somaPedidos: 0, inconsistencia: false },
          alertas: data.alertas || [],
          tabelaSintetica: data.tabelaSintetica || []
        } as unknown as AnalysisResult;
      }

      // Fallback: parse direto se Zod falhar (compatibilidade)
      console.warn('[Analisador] Validação Zod falhou, usando fallback:', validated.error);
      const parsed = JSON.parse(extractJSON(jsonStr) || jsonStr);

      // Validate required fields
      if (!parsed.identificacao) {
        throw new Error('Resultado incompleto: falta identificacao');
      }

      // Ensure arrays are present
      return {
        identificacao: parsed.identificacao || { reclamantes: [], reclamadas: [] },
        contrato: parsed.contrato || { dadosInicial: {}, controversias: [] },
        tutelasProvisoras: parsed.tutelasProvisoras || [],
        preliminares: parsed.preliminares || [],
        prejudiciais: parsed.prejudiciais || {},
        pedidos: parsed.pedidos || [],
        reconvencao: parsed.reconvencao,
        defesasAutonomas: parsed.defesasAutonomas || [],
        impugnacoes: parsed.impugnacoes || { documentos: [], documentosNaoImpugnados: [] },
        provas: parsed.provas || {
          reclamante: { testemunhal: false, documental: false, pericial: false, depoimentoPessoal: false },
          reclamada: { testemunhal: false, documental: false, pericial: false, depoimentoPessoal: false }
        },
        valorCausa: parsed.valorCausa || { valorTotal: 0, somaPedidos: 0, inconsistencia: false },
        alertas: parsed.alertas || [],
        tabelaSintetica: parsed.tabelaSintetica || []
      };
    } catch (error) {
      console.error('Erro ao parsear resultado:', error);
      throw new Error('Não foi possível interpretar a resposta da IA. Tente novamente.');
    }
  };

  const analyze = useCallback(async () => {
    if (!peticao || peticao.status !== 'ready') {
      setError('É necessário fazer upload da petição inicial');
      return;
    }

    reset();
    setIsAnalyzing(true);
    setProgress(10, 'Preparando documentos...');

    try {
      // Build the prompt
      const userPrompt = buildAnalysisPrompt(
        peticao.text,
        contestacao?.text
      );

      setProgress(30, 'Enviando para análise...');

      // Call AI
      const messages: AIMessage[] = [
        { role: 'user', content: userPrompt }
      ];

      setProgress(50, 'Analisando documentos...');

      const response = await callAI(messages, {
        maxTokens: 16000,
        systemPrompt: ANALYSIS_SYSTEM_PROMPT
      });

      setProgress(80, 'Processando resultado...');

      // Parse the result
      const result = parseAnalysisResult(response);

      setProgress(100, 'Análise concluída!');
      setResult(result);

    } catch (error) {
      console.error('Erro na análise:', error);
      setError(error instanceof Error ? error.message : 'Erro ao realizar análise');
    }
  }, [peticao, contestacao, callAI, setResult, setIsAnalyzing, setProgress, setError, reset]);

  /**
   * Analisa textos de petição e contestação diretamente (sem usar o store)
   * Usado pelo BatchMode para processar múltiplos arquivos
   */
  const analyzeWithAI = useCallback(
    async (peticaoText: string, contestacaoText: string | null): Promise<AnalysisResult | null> => {
      try {
        const userPrompt = buildAnalysisPrompt(peticaoText, contestacaoText || undefined);

        const messages: AIMessage[] = [{ role: 'user', content: userPrompt }];

        const response = await callAI(messages, {
          maxTokens: 16000,
          systemPrompt: ANALYSIS_SYSTEM_PROMPT,
        });

        return parseAnalysisResult(response);
      } catch (error) {
        console.error('Erro na análise com IA:', error);
        return null;
      }
    },
    [callAI]
  );

  return {
    analyze,
    analyzeWithAI,
    canAnalyze: peticao?.status === 'ready',
    hasContestacao: contestacao?.status === 'ready'
  };
};

export default useAnalysis;

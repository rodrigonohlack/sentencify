/**
 * @file useAnalysis.ts
 * @description Hook para análise de prepauta
 */

import { useCallback } from 'react';
import { useDocumentStore, useResultStore } from '../stores';
import { useAIIntegration } from './useAIIntegration';
import { ANALYSIS_SYSTEM_PROMPT, buildAnalysisPrompt } from '../prompts';
import type { AnalysisResult, AIMessage } from '../types';

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
      const parsed = JSON.parse(jsonStr);

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

  return {
    analyze,
    canAnalyze: peticao?.status === 'ready',
    hasContestacao: contestacao?.status === 'ready'
  };
};

export default useAnalysis;

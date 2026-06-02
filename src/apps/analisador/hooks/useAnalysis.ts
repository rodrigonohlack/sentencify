/**
 * @file useAnalysis.ts
 * @description Hook para análise de prepauta
 * Suporta múltiplas emendas à petição inicial e múltiplas contestações
 */

import { useCallback } from 'react';
import { useDocumentStore, useResultStore, useAIStore } from '../stores';
import { useAIIntegration } from './useAIIntegration';
import { ANALYSIS_SYSTEM_PROMPT, buildAnalysisPrompt } from '../prompts';
import { providerSupportsPdfBinary } from '../constants';
import type { AnalysisResult, AIMessage, AIMessageContent, DocumentFile, PedidoAnalise } from '../types';
import { parseAIResponse, extractJSON, sanitizeJsonControlChars, AnalysisResponseSchema } from '../../../schemas/ai-responses';
import { generateTabelaSintetica } from '../utils/tabela';

// Re-export para consumidores que importavam de useAnalysis (compat).
export { generateTabelaSintetica };

/**
 * Constrói um content block de documento PDF base64.
 * O shape é idêntico ao protocolo Claude; o adapter de Gemini converte para inline_data.
 */
const buildDocumentBlock = (base64: string): AIMessageContent => ({
  type: 'document',
  source: { type: 'base64', media_type: 'application/pdf', data: base64 }
});

/** Considera doc binário efetivamente enviável só se provider compatível E base64 disponível. */
const isEffectiveBinary = (doc: DocumentFile | null | undefined, providerCanBinary: boolean): boolean =>
  !!doc && doc.status === 'ready' && !!doc.useBinary && providerCanBinary && !!doc.base64;

/**
 * Converte qualquer valor para string de forma segura
 * Evita React Error #300 quando LLM retorna objetos ao invés de strings
 */
const ensureString = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

export const useAnalysis = () => {
  const { peticao, emendas, contestacoes, getAllDocumentsText, canAnalyze } = useDocumentStore();
  const { setResult, setIsAnalyzing, setProgress, setError, reset } = useResultStore();
  const { callAIStream } = useAIIntegration();

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
          // Gera tabelaSintetica a partir dos pedidos para garantir consistência
          tabelaSintetica: generateTabelaSintetica((data.pedidos || []) as PedidoAnalise[])
        } as unknown as AnalysisResult;
      }

      // Fallback: parse direto se Zod falhar (compatibilidade)
      console.warn('[Analisador] Validação Zod falhou, usando fallback:', validated.error);
      const parsed = JSON.parse(sanitizeJsonControlChars(extractJSON(jsonStr) || jsonStr));

      // Validate required fields
      if (!parsed.identificacao) {
        throw new Error('Resultado incompleto: falta identificacao');
      }

      // Coerce string fields in pedidos to avoid React Error #300
      const processedPedidos = (parsed.pedidos || []).map((p: Record<string, unknown>) => ({
        ...p,
        fatosReclamante: ensureString(p.fatosReclamante),
        defesaReclamada: ensureString(p.defesaReclamada),
        teseJuridica: ensureString(p.teseJuridica),
        confissaoFicta: p.confissaoFicta ? ensureString(p.confissaoFicta) : null,
      })) as PedidoAnalise[];

      // Ensure arrays are present and string fields are coerced
      return {
        identificacao: parsed.identificacao || { reclamantes: [], reclamadas: [] },
        contrato: parsed.contrato || { dadosInicial: {}, controversias: [] },
        tutelasProvisoras: parsed.tutelasProvisoras || [],
        preliminares: parsed.preliminares || [],
        prejudiciais: parsed.prejudiciais || {},
        pedidos: processedPedidos,
        reconvencao: parsed.reconvencao,
        defesasAutonomas: parsed.defesasAutonomas || [],
        impugnacoes: parsed.impugnacoes || { documentos: [], documentosNaoImpugnados: [] },
        provas: parsed.provas || {
          reclamante: { testemunhal: false, documental: false, pericial: false, depoimentoPessoal: false },
          reclamada: { testemunhal: false, documental: false, pericial: false, depoimentoPessoal: false }
        },
        valorCausa: parsed.valorCausa || { valorTotal: 0, somaPedidos: 0, inconsistencia: false },
        alertas: parsed.alertas || [],
        // Gera tabelaSintetica a partir dos pedidos para garantir consistência
        tabelaSintetica: generateTabelaSintetica(processedPedidos)
      };
    } catch (error) {
      console.error('Erro ao parsear resultado:', error);
      throw new Error('Não foi possível interpretar a resposta da IA. Tente novamente.');
    }
  };

  const analyze = useCallback(async () => {
    if (!canAnalyze()) {
      setError('É necessário fazer upload da petição inicial');
      return;
    }

    reset();
    setIsAnalyzing(true);
    setProgress(10, 'Preparando documentos...');

    try {
      const { peticao: peticaoText, emendas: emendasTexts, contestacoes: contestacoesTexts } =
        getAllDocumentsText();

      const state = useDocumentStore.getState();
      const nomeArquivoPeticao = state.peticao?.name;
      const nomesArquivosEmendas = state.emendas.map(e => e.name);
      const nomesArquivosContestacoes = state.contestacoes.map(c => c.name);

      // Determina quais documentos serão enviados como anexo binário (PDF base64).
      // Docs com useBinary=true mas provider incompatível caem silenciosamente para texto.
      const provider = useAIStore.getState().aiSettings.provider;
      const providerCanBinary = providerSupportsPdfBinary(provider);
      const readyEmendas = state.emendas.filter(e => e.status === 'ready').sort((a, b) => a.order - b.order);
      const readyContestacoes = state.contestacoes.filter(c => c.status === 'ready').sort((a, b) => a.order - b.order);

      const binaryFlags = {
        peticao: isEffectiveBinary(state.peticao, providerCanBinary),
        emendas: readyEmendas.map(e => isEffectiveBinary(e, providerCanBinary)),
        contestacoes: readyContestacoes.map(c => isEffectiveBinary(c, providerCanBinary))
      };

      const userPrompt = buildAnalysisPrompt(
        peticaoText,
        emendasTexts,
        contestacoesTexts,
        nomeArquivoPeticao,
        nomesArquivosEmendas,
        nomesArquivosContestacoes,
        binaryFlags
      );

      // Monta lista de blocks de documento na MESMA ordem em que aparecem no prompt
      // (petição → emendas → contestações) para o LLM associar anexo↔referência.
      const documentBlocks: AIMessageContent[] = [];
      if (binaryFlags.peticao && state.peticao?.base64) {
        documentBlocks.push(buildDocumentBlock(state.peticao.base64));
      }
      readyEmendas.forEach((e, i) => {
        if (binaryFlags.emendas[i] && e.base64) documentBlocks.push(buildDocumentBlock(e.base64));
      });
      readyContestacoes.forEach((c, i) => {
        if (binaryFlags.contestacoes[i] && c.base64) documentBlocks.push(buildDocumentBlock(c.base64));
      });

      setProgress(30, 'Enviando para análise...');

      const content: string | AIMessageContent[] = documentBlocks.length > 0
        ? [...documentBlocks, { type: 'text', text: userPrompt }]
        : userPrompt;

      const messages: AIMessage[] = [{ role: 'user', content }];

      setProgress(50, 'Analisando documentos...');

      const response = await callAIStream(messages, {
        maxTokens: 32000,
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
  }, [canAnalyze, getAllDocumentsText, callAIStream, setResult, setIsAnalyzing, setProgress, setError, reset]);

  /**
   * Analisa textos de petição, emendas e contestações diretamente (sem usar o store).
   * Usado pelo BatchMode para processar múltiplos arquivos.
   *
   * Aceita `contestacao` como string única (string|null, compat) OU array de strings (novo).
   * binaryDocs (opcional) anexa arquivos como PDF binário em vez de texto — silenciosamente
   * ignorado quando o provider atual não suporta PDF binário.
   */
  const analyzeWithAI = useCallback(
    async (
      peticaoText: string,
      contestacao: string | string[] | null,
      emendasTexts: string[] = [],
      binaryDocs?: {
        peticao?: { base64: string; name: string } | null;
        emendas?: ({ base64: string; name: string } | null)[];
        contestacoes?: ({ base64: string; name: string } | null)[];
        nomeArquivoPeticao?: string;
        nomesArquivosEmendas?: string[];
        nomesArquivosContestacoes?: string[];
      }
    ): Promise<AnalysisResult | null> => {
      const MAX_PARSE_RETRIES = 2;
      const contestacoesArray: string[] = Array.isArray(contestacao)
        ? contestacao
        : (contestacao ? [contestacao] : []);

      const provider = useAIStore.getState().aiSettings.provider;
      const providerCanBinary = providerSupportsPdfBinary(provider);

      const peticaoBinary = providerCanBinary ? binaryDocs?.peticao : null;
      const emendasBinary = providerCanBinary
        ? (binaryDocs?.emendas || []).map(e => e || null)
        : [];
      const contestacoesBinary = providerCanBinary
        ? (binaryDocs?.contestacoes || []).map(c => c || null)
        : [];

      const binaryFlags = {
        peticao: !!peticaoBinary,
        emendas: emendasBinary.map(e => !!e),
        contestacoes: contestacoesBinary.map(c => !!c)
      };

      const userPrompt = buildAnalysisPrompt(
        peticaoText,
        emendasTexts,
        contestacoesArray,
        binaryDocs?.nomeArquivoPeticao,
        binaryDocs?.nomesArquivosEmendas,
        binaryDocs?.nomesArquivosContestacoes,
        binaryFlags
      );

      const documentBlocks: AIMessageContent[] = [];
      if (peticaoBinary?.base64) documentBlocks.push(buildDocumentBlock(peticaoBinary.base64));
      emendasBinary.forEach(e => {
        if (e?.base64) documentBlocks.push(buildDocumentBlock(e.base64));
      });
      contestacoesBinary.forEach(c => {
        if (c?.base64) documentBlocks.push(buildDocumentBlock(c.base64));
      });

      const content: string | AIMessageContent[] = documentBlocks.length > 0
        ? [...documentBlocks, { type: 'text', text: userPrompt }]
        : userPrompt;

      const messages: AIMessage[] = [{ role: 'user', content }];

      for (let attempt = 0; attempt <= MAX_PARSE_RETRIES; attempt++) {
        try {
          const response = await callAIStream(messages, {
            maxTokens: 32000,
            systemPrompt: ANALYSIS_SYSTEM_PROMPT
          });
          return parseAnalysisResult(response);
        } catch (error) {
          if (attempt < MAX_PARSE_RETRIES) {
            console.warn(`[Analisador] Tentativa ${attempt + 1} falhou, retentando...`);
            await new Promise((r) => setTimeout(r, 2000));
            continue;
          }
          console.error('Erro na análise com IA:', error);
          return null;
        }
      }
      return null;
    },
    [callAIStream]
  );

  return {
    analyze,
    analyzeWithAI,
    canAnalyze: canAnalyze(),
    hasDocuments: peticao !== null,
    hasEmendas: emendas.length > 0,
    hasContestacoes: contestacoes.length > 0
  };
};

export default useAnalysis;

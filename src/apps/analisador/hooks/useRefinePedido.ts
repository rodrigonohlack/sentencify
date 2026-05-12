/**
 * @file useRefinePedido.ts
 * @description Hook para reanalisar UM ÚNICO pedido com instruções customizadas.
 * Reusa a infraestrutura de `useAnalysis.analyzeWithAI` (provider switch, binary blocks),
 * mas com prompt e schema dedicados — saída é um único `PedidoAnalise`.
 */

import { useCallback } from 'react';
import { useAIStore, useDocumentStore } from '../stores';
import { useAIIntegration } from './useAIIntegration';
import { providerSupportsPdfBinary } from '../constants';
import {
  REFINE_PEDIDO_SYSTEM_PROMPT,
  buildRefinePedidoPrompt,
  type RefinePedidoContext,
} from '../prompts';
import type {
  AnalysisResult,
  PedidoAnalise,
  AIMessage,
  AIMessageContent,
  DocumentFile,
} from '../types';
import { AnalysisPedidoSchema, parseAIResponse } from '../../../schemas/ai-responses';

/** Doc override usado quando o modal precisa de re-upload (análise do histórico). */
export interface RefineOverrideDoc {
  text: string;
  base64?: string;
  useBinary?: boolean;
  name: string;
}

export interface RefineOverrideDocs {
  peticao?: RefineOverrideDoc | null;
  emendas?: RefineOverrideDoc[];
  contestacoes?: RefineOverrideDoc[];
}

const buildDocumentBlock = (base64: string): AIMessageContent => ({
  type: 'document',
  source: { type: 'base64', media_type: 'application/pdf', data: base64 },
});

const isEffectiveBinary = (
  doc: DocumentFile | null | undefined,
  providerCanBinary: boolean
): boolean =>
  !!doc && doc.status === 'ready' && !!doc.useBinary && providerCanBinary && !!doc.base64;

const MAX_PARSE_RETRIES = 1;

export const useRefinePedido = () => {
  const { callAIStream } = useAIIntegration();

  const refinePedido = useCallback(
    async (
      pedido: PedidoAnalise,
      instrucao: string,
      resultadoAtual: AnalysisResult,
      overrideDocs?: RefineOverrideDocs
    ): Promise<PedidoAnalise> => {
      if (!instrucao || instrucao.trim().length < 10) {
        throw new Error('Instrução muito curta — descreva o que precisa ser refinado.');
      }

      const provider = useAIStore.getState().aiSettings.provider;
      const providerCanBinary = providerSupportsPdfBinary(provider);

      // Resolução de docs: override do modal (re-upload) tem precedência sobre documentStore.
      const docStore = useDocumentStore.getState();
      const useOverride = !!overrideDocs?.peticao;

      let peticaoText: string;
      let peticaoName: string | undefined;
      let peticaoBinaryBase64: string | undefined;
      let peticaoBinary: boolean;

      const emendasTexts: string[] = [];
      const emendasNames: string[] = [];
      const emendasBinaryBase64: (string | undefined)[] = [];
      const emendasBinary: boolean[] = [];

      const contestacoesTexts: string[] = [];
      const contestacoesNames: string[] = [];
      const contestacoesBinaryBase64: (string | undefined)[] = [];
      const contestacoesBinary: boolean[] = [];

      if (useOverride) {
        const p = overrideDocs!.peticao!;
        peticaoText = p.text;
        peticaoName = p.name;
        peticaoBinary = !!p.useBinary && providerCanBinary && !!p.base64;
        peticaoBinaryBase64 = peticaoBinary ? p.base64 : undefined;

        (overrideDocs?.emendas || []).forEach(e => {
          emendasTexts.push(e.text);
          emendasNames.push(e.name);
          const bin = !!e.useBinary && providerCanBinary && !!e.base64;
          emendasBinary.push(bin);
          emendasBinaryBase64.push(bin ? e.base64 : undefined);
        });

        (overrideDocs?.contestacoes || []).forEach(c => {
          contestacoesTexts.push(c.text);
          contestacoesNames.push(c.name);
          const bin = !!c.useBinary && providerCanBinary && !!c.base64;
          contestacoesBinary.push(bin);
          contestacoesBinaryBase64.push(bin ? c.base64 : undefined);
        });
      } else {
        const docs = docStore.getAllDocumentsText();
        peticaoText = docs.peticao;
        peticaoName = docStore.peticao?.name;
        peticaoBinary = isEffectiveBinary(docStore.peticao, providerCanBinary);
        peticaoBinaryBase64 = peticaoBinary ? docStore.peticao?.base64 : undefined;

        const readyEmendas = docStore.emendas
          .filter(e => e.status === 'ready')
          .sort((a, b) => a.order - b.order);
        readyEmendas.forEach((e, i) => {
          emendasTexts.push(docs.emendas[i] ?? e.text);
          emendasNames.push(e.name);
          const bin = isEffectiveBinary(e, providerCanBinary);
          emendasBinary.push(bin);
          emendasBinaryBase64.push(bin ? e.base64 : undefined);
        });

        const readyContestacoes = docStore.contestacoes
          .filter(c => c.status === 'ready')
          .sort((a, b) => a.order - b.order);
        readyContestacoes.forEach((c, i) => {
          contestacoesTexts.push(docs.contestacoes[i] ?? c.text);
          contestacoesNames.push(c.name);
          const bin = isEffectiveBinary(c, providerCanBinary);
          contestacoesBinary.push(bin);
          contestacoesBinaryBase64.push(bin ? c.base64 : undefined);
        });
      }

      if (!peticaoText && !peticaoBinary) {
        throw new Error('Petição inicial não disponível — faça upload no painel.');
      }

      const ctx: RefinePedidoContext = {
        pedidoAtual: pedido,
        resultadoCompleto: resultadoAtual,
        instrucao,
        peticaoText,
        emendasTexts,
        contestacoesTexts,
        nomes: {
          peticao: peticaoName,
          emendas: emendasNames,
          contestacoes: contestacoesNames,
        },
        binaryFlags: {
          peticao: peticaoBinary,
          emendas: emendasBinary,
          contestacoes: contestacoesBinary,
        },
      };

      const userPrompt = buildRefinePedidoPrompt(ctx);

      // Monta document blocks na MESMA ordem do prompt (petição → emendas → contestações)
      const documentBlocks: AIMessageContent[] = [];
      if (peticaoBinary && peticaoBinaryBase64) {
        documentBlocks.push(buildDocumentBlock(peticaoBinaryBase64));
      }
      emendasBinaryBase64.forEach(b64 => {
        if (b64) documentBlocks.push(buildDocumentBlock(b64));
      });
      contestacoesBinaryBase64.forEach(b64 => {
        if (b64) documentBlocks.push(buildDocumentBlock(b64));
      });

      const content: string | AIMessageContent[] = documentBlocks.length > 0
        ? [...documentBlocks, { type: 'text', text: userPrompt }]
        : userPrompt;

      const messages: AIMessage[] = [{ role: 'user', content }];

      let lastError: Error | null = null;
      for (let attempt = 0; attempt <= MAX_PARSE_RETRIES; attempt++) {
        try {
          const response = await callAIStream(messages, {
            maxTokens: 8000,
            systemPrompt: REFINE_PEDIDO_SYSTEM_PROMPT,
          });

          const validated = parseAIResponse(response, AnalysisPedidoSchema);
          if (!validated.success) {
            throw new Error(`Resposta da IA inválida: ${validated.error}`);
          }

          const parsed = validated.data as Partial<PedidoAnalise>;

          // Merge defensivo: preserva campos não retornados; força numero original.
          const refined: PedidoAnalise = {
            ...pedido,
            ...parsed,
            numero: pedido.numero,
            // Garante arrays/objetos defaults coerentes com PedidoAnalise.
            pontosEsclarecer: Array.isArray(parsed.pontosEsclarecer)
              ? parsed.pontosEsclarecer
              : pedido.pontosEsclarecer || [],
          };

          return refined;
        } catch (err) {
          lastError = err as Error;
          if (attempt < MAX_PARSE_RETRIES) {
            console.warn(`[useRefinePedido] Tentativa ${attempt + 1} falhou, retentando...`, err);
            await new Promise(r => setTimeout(r, 1500));
            continue;
          }
        }
      }

      throw lastError || new Error('Falha ao refinar pedido');
    },
    [callAIStream]
  );

  return { refinePedido };
};

export default useRefinePedido;

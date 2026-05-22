/**
 * @file useSynthesisAnalysis.ts
 * @description Orquestra a 1ª chamada à IA: monta payload, chama stream,
 *              valida JSON via Zod, hidrata useSynthesisStore.
 */

import { useCallback } from 'react';
import {
  useDocumentStore,
  useSynthesisStore,
  useAIStore
} from '../stores';
import { useAIIntegration } from './useAIIntegration';
import { SYNTHESIS_SYSTEM_PROMPT, buildSynthesisPrompt } from '../prompts';
import { providerSupportsPdfBinary } from '../constants';
import { SynthesisResponseSchema } from '../../../schemas/ai-responses';
import type {
  DocumentFile,
  DocumentSlot,
  SynthesisResult
} from '../types';
import type { AIMessage, AIMessageContent } from '../../../types/ai';

const MAX_PARSE_RETRIES = 2;

const buildDocumentBlock = (base64: string): AIMessageContent => ({
  type: 'document',
  source: { type: 'base64', media_type: 'application/pdf', data: base64 }
});

const isBinaryEffective = (doc: DocumentFile | null, providerCanBinary: boolean) =>
  !!doc && doc.status === 'ready' && doc.useBinary && providerCanBinary && !!doc.base64;

function extractJSON(response: string): string {
  const fence = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const body = fence ? fence[1] : response;
  const objMatch = body.match(/\{[\s\S]*\}/);
  return objMatch ? objMatch[0] : body;
}

const SLOT_ORDER: DocumentSlot[] = ['decisaoEmbargada', 'embargos', 'contrarrazoes', 'inicial', 'contestacao'];

export function useSynthesisAnalysis() {
  const { callAIStream } = useAIIntegration();

  const analyze = useCallback(async (): Promise<SynthesisResult | null> => {
    const docs = useDocumentStore.getState();
    const synth = useSynthesisStore.getState();

    if (!docs.canAnalyze()) {
      synth.setError('Decisão embargada e embargos são obrigatórios.');
      return null;
    }

    synth.setError(null);
    synth.setIsAnalyzing(true);
    synth.setProgress(10, 'Preparando documentos…');

    try {
      const provider = useAIStore.getState().aiSettings.provider;
      const providerCanBinary = providerSupportsPdfBinary(provider);

      const slotsPayload = SLOT_ORDER
        .map(slot => docs[slot])
        .filter((d): d is DocumentFile => d !== null && d.status === 'ready')
        .map(d => ({
          slot: d.slot,
          name: d.name,
          text: isBinaryEffective(d, providerCanBinary) ? undefined : d.text,
          binaryAttached: isBinaryEffective(d, providerCanBinary)
        }));

      const userPrompt = buildSynthesisPrompt(slotsPayload);

      const documentBlocks: AIMessageContent[] = [];
      for (const slot of SLOT_ORDER) {
        const d = docs[slot];
        if (d && isBinaryEffective(d, providerCanBinary) && d.base64) {
          documentBlocks.push(buildDocumentBlock(d.base64));
        }
      }

      const content: string | AIMessageContent[] = documentBlocks.length > 0
        ? [...documentBlocks, { type: 'text', text: userPrompt }]
        : userPrompt;

      const messages: AIMessage[] = [{ role: 'user', content }];

      synth.setProgress(40, 'Analisando documentos…');

      for (let attempt = 0; attempt <= MAX_PARSE_RETRIES; attempt++) {
        try {
          const response = await callAIStream(messages, {
            maxTokens: 32000,
            systemPrompt: SYNTHESIS_SYSTEM_PROMPT
          });

          synth.setProgress(80, 'Estruturando síntese…');

          const json = JSON.parse(extractJSON(response));
          const parsed = SynthesisResponseSchema.parse(json);

          // Hidrata IDs estáveis nos pontos
          const pontos = parsed.pontos.map(p => ({
            ...p,
            id: p.id ?? crypto.randomUUID()
          }));

          const result: SynthesisResult = {
            identificacao: parsed.identificacao,
            resumoSentenca: parsed.resumoSentenca,
            resumoEmbargos: parsed.resumoEmbargos,
            resumoContrarrazoes: parsed.resumoContrarrazoes,
            intimacaoContrariaStatus: parsed.intimacaoContrariaStatus,
            pontos
          };

          synth.setSynthesis(result);
          synth.setProgress(100, 'Concluído.');
          synth.setIsAnalyzing(false);
          return result;
        } catch (err) {
          if (attempt < MAX_PARSE_RETRIES) {
            console.warn(`[embargos] Tentativa ${attempt + 1} falhou:`, err);
            continue;
          }
          throw err;
        }
      }
      return null;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao analisar embargos';
      synth.setError(msg);
      synth.setIsAnalyzing(false);
      return null;
    }
  }, [callAIStream]);

  return { analyze };
}

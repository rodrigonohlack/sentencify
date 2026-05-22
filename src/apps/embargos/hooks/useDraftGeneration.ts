/**
 * @file useDraftGeneration.ts
 * @description Orquestra a 2ª chamada: monta prompt com síntese consolidada,
 *              chama IA, valida JSON da minuta, hidrata useDraftStore.
 */

import { useCallback } from 'react';
import {
  useSynthesisStore,
  useDraftStore,
  emptySection
} from '../stores';
import { useAIIntegration } from './useAIIntegration';
import { DRAFT_SYSTEM_PROMPT, buildDraftPrompt } from '../prompts';
import { DraftResponseSchema } from '../../../schemas/ai-responses';
import type { Draft } from '../types';
import type { AIMessage } from '../../../types/ai';

const MAX_PARSE_RETRIES = 2;

function extractJSON(response: string): string {
  const fence = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const body = fence ? fence[1] : response;
  const objMatch = body.match(/\{[\s\S]*\}/);
  return objMatch ? objMatch[0] : body;
}

export function useDraftGeneration() {
  const { callAIStream } = useAIIntegration();

  const generate = useCallback(async (): Promise<Draft | null> => {
    const synth = useSynthesisStore.getState();
    const draft = useDraftStore.getState();

    if (!synth.synthesis) {
      draft.setError('Síntese não disponível.');
      return null;
    }

    draft.setError(null);
    draft.setIsGenerating(true);
    draft.setProgress(10, 'Montando minuta…');

    try {
      const userPrompt = buildDraftPrompt(synth.synthesis);
      const messages: AIMessage[] = [{ role: 'user', content: userPrompt }];

      draft.setProgress(40, 'Redigindo…');

      for (let attempt = 0; attempt <= MAX_PARSE_RETRIES; attempt++) {
        try {
          const response = await callAIStream(messages, {
            maxTokens: 32000,
            systemPrompt: DRAFT_SYSTEM_PROMPT
          });

          draft.setProgress(80, 'Processando minuta…');

          const json = JSON.parse(extractJSON(response));
          const parsed = DraftResponseSchema.parse(json);

          const newDraft: Draft = {
            relatorio: { ...emptySection(), text: parsed.relatorio },
            fundamentacao: { ...emptySection(), text: parsed.fundamentacao },
            dispositivo: { ...emptySection(), text: parsed.dispositivo }
          };

          draft.setDraft(newDraft);
          draft.setProgress(100, 'Concluído.');
          draft.setIsGenerating(false);
          return newDraft;
        } catch (err) {
          if (attempt < MAX_PARSE_RETRIES) {
            console.warn(`[embargos] Geração tentativa ${attempt + 1} falhou:`, err);
            continue;
          }
          throw err;
        }
      }
      return null;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao gerar minuta';
      draft.setError(msg);
      draft.setIsGenerating(false);
      return null;
    }
  }, [callAIStream]);

  return { generate };
}

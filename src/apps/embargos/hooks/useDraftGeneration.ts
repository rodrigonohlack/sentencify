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
import { DraftResponseSchema, extractJSON } from '../../../schemas/ai-responses';
import type { Draft } from '../types';
import type { AIMessage } from '../../../types/ai';

const MAX_PARSE_RETRIES = 2;

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

      const response = await callAIStream(messages, {
        maxTokens: 32000,
        systemPrompt: DRAFT_SYSTEM_PROMPT
      });

      draft.setProgress(80, 'Processando minuta…');

      let parsed: ReturnType<typeof DraftResponseSchema.parse> | undefined;
      let parseError: unknown = null;
      for (let attempt = 0; attempt <= MAX_PARSE_RETRIES; attempt++) {
        try {
          const extracted = extractJSON(response);
          if (!extracted) throw new Error('Não foi possível extrair JSON da resposta');
          const json = JSON.parse(extracted);
          parsed = DraftResponseSchema.parse(json);
          parseError = null;
          break;
        } catch (err) {
          parseError = err;
          if (attempt < MAX_PARSE_RETRIES) {
            console.warn(`[embargos] Geração tentativa ${attempt + 1} falhou:`, err);
            continue;
          }
        }
      }
      if (!parsed) throw parseError;

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
      const msg = err instanceof Error ? err.message : 'Erro ao gerar minuta';
      draft.setError(msg);
      draft.setIsGenerating(false);
      return null;
    }
  }, [callAIStream]);

  return { generate };
}

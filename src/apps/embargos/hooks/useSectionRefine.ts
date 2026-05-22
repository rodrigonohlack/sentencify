/**
 * @file useSectionRefine.ts
 * @description Gerencia chat de refino de uma seção específica da minuta.
 */

import { useCallback } from 'react';
import { useDraftStore, useSynthesisStore } from '../stores';
import { useAIIntegration } from './useAIIntegration';
import { REFINE_SYSTEM_PROMPT, buildRefinePrompt } from '../prompts';
import { RefineResponseSchema, extractJSON } from '../../../schemas/ai-responses';
import type { DraftSectionKey } from '../types';
import type { AIMessage } from '../../../types/ai';

export function useSectionRefine(section: DraftSectionKey) {
  const { callAIStream } = useAIIntegration();
  const appendChatMessage = useDraftStore(s => s.appendChatMessage);
  const acceptRefineResult = useDraftStore(s => s.acceptRefineResult);
  const setRefining = useDraftStore(s => s.setRefining);

  // Keep reactive draft for acceptLastSuggestion
  const draft = useDraftStore(s => s.draft);

  const sendMessage = useCallback(async (instruction: string): Promise<string | null> => {
    const initialDraft = useDraftStore.getState().draft;
    const currentSynthesis = useSynthesisStore.getState().synthesis;
    if (!initialDraft || !currentSynthesis) return null;
    if (!instruction.trim()) return null;

    appendChatMessage(section, { role: 'user', content: instruction, timestamp: Date.now() });
    setRefining(section);

    try {
      const freshDraft = useDraftStore.getState().draft;
      if (!freshDraft) {
        setRefining(null);
        return null;
      }

      const userPrompt = buildRefinePrompt(
        section,
        freshDraft,
        currentSynthesis,
        freshDraft[section].chatHistory,
        instruction
      );

      const messages: AIMessage[] = [{ role: 'user', content: userPrompt }];

      const response = await callAIStream(messages, {
        maxTokens: 16000,
        systemPrompt: REFINE_SYSTEM_PROMPT
      });

      const extracted = extractJSON(response);
      if (!extracted) throw new Error('Não foi possível extrair JSON da resposta');
      const json = JSON.parse(extracted);
      const parsed = RefineResponseSchema.parse(json);

      appendChatMessage(section, { role: 'assistant', content: parsed.text, timestamp: Date.now() });
      setRefining(null);
      return parsed.text;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro no refino';
      appendChatMessage(section, { role: 'assistant', content: `[Erro: ${msg}]`, timestamp: Date.now() });
      setRefining(null);
      return null;
    }
  }, [section, appendChatMessage, setRefining, callAIStream]);

  const acceptLastSuggestion = useCallback(() => {
    if (!draft) return;
    const last = draft[section].chatHistory.filter(m => m.role === 'assistant').pop();
    if (last && !last.content.startsWith('[Erro:')) {
      acceptRefineResult(section, last.content);
    }
  }, [draft, section, acceptRefineResult]);

  return { sendMessage, acceptLastSuggestion };
}

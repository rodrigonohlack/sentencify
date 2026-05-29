/**
 * @file usePromptConfigStore.ts
 * @description Store isolado do subapp Embargos para o prompt-base da minuta e o
 *              guia de estilo, ambos editáveis pelo usuário em Configurações.
 *
 * Valores nullable: `null` significa "usar o padrão atual do código"
 * (DEFAULT_DRAFT_BASE_PROMPT / STYLE_GUIDE). Assim, quem nunca personalizou
 * recebe automaticamente futuras melhorias do padrão, e "Restaurar padrão"
 * apenas volta o campo para `null`. Persistido isoladamente, sem tocar no
 * AISettings compartilhado entre os subapps.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_DRAFT_BASE_PROMPT, STYLE_GUIDE } from '../prompts';

interface PromptConfigState {
  /** Prompt-base da minuta. `null` = usar DEFAULT_DRAFT_BASE_PROMPT. */
  draftBasePrompt: string | null;
  /** Guia de estilo. `null` = usar STYLE_GUIDE. */
  styleGuide: string | null;

  setDraftBasePrompt: (value: string | null) => void;
  setStyleGuide: (value: string | null) => void;
  resetDraftBasePrompt: () => void;
  resetStyleGuide: () => void;
}

export const usePromptConfigStore = create<PromptConfigState>()(
  persist(
    (set) => ({
      draftBasePrompt: null,
      styleGuide: null,

      setDraftBasePrompt: (value) => set({ draftBasePrompt: value }),
      setStyleGuide: (value) => set({ styleGuide: value }),
      resetDraftBasePrompt: () => set({ draftBasePrompt: null }),
      resetStyleGuide: () => set({ styleGuide: null })
    }),
    { name: 'embargos-prompt-config' }
  )
);

/** Prompt-base efetivo (personalizado ou padrão). */
export const effectiveDraftBasePrompt = (s: PromptConfigState): string =>
  s.draftBasePrompt ?? DEFAULT_DRAFT_BASE_PROMPT;

/** Guia de estilo efetivo (personalizado ou padrão). */
export const effectiveStyleGuide = (s: PromptConfigState): string =>
  s.styleGuide ?? STYLE_GUIDE;

export default usePromptConfigStore;

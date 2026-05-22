/**
 * @file useDraftStore.ts
 * @description Store da minuta (3 seções) com refino por chat.
 */

import { create } from 'zustand';
import type { Draft, DraftSection, DraftSectionKey, ChatMessage } from '../types';

interface DraftStoreState {
  draft: Draft | null;
  isGenerating: boolean;
  refiningSection: DraftSectionKey | null;
  progress: { value: number; label: string };
  error: string | null;

  setDraft: (d: Draft) => void;
  updateSection: (key: DraftSectionKey, text: string) => void;
  appendChatMessage: (key: DraftSectionKey, msg: ChatMessage) => void;
  acceptRefineResult: (key: DraftSectionKey, newText: string) => void;
  setRefining: (section: DraftSectionKey | null) => void;
  setIsGenerating: (v: boolean) => void;
  setProgress: (value: number, label: string) => void;
  setError: (msg: string | null) => void;
  reset: () => void;
}

export const emptySection = (): DraftSection => ({ text: '', chatHistory: [] });

const INITIAL_STATE = {
  draft: null,
  isGenerating: false,
  refiningSection: null,
  progress: { value: 0, label: '' },
  error: null
} as const;

export const useDraftStore = create<DraftStoreState>((set, get) => ({
  ...INITIAL_STATE,

  setDraft: (d) => set({ draft: d, error: null }),

  updateSection: (key, text) => {
    const current = get().draft;
    if (!current) return;
    set({ draft: { ...current, [key]: { ...current[key], text } } });
  },

  appendChatMessage: (key, msg) => {
    const current = get().draft;
    if (!current) return;
    set({
      draft: {
        ...current,
        [key]: { ...current[key], chatHistory: [...current[key].chatHistory, msg] }
      }
    });
  },

  acceptRefineResult: (key, newText) => {
    const current = get().draft;
    if (!current) return;
    set({ draft: { ...current, [key]: { ...current[key], text: newText } } });
  },

  setRefining: (section) => set({ refiningSection: section }),

  setIsGenerating: (v) => set({ isGenerating: v }),
  setProgress: (value, label) => set({ progress: { value, label } }),
  setError: (msg) => set({ error: msg }),

  reset: () => set(INITIAL_STATE)
}));

export default useDraftStore;

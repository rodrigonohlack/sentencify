/**
 * @file useDocumentStore.ts
 * @description Store Zustand para documentos carregados
 */

import { create } from 'zustand';
import type { DocumentFile, DocumentType } from '../types';

interface DocumentStoreState {
  peticao: DocumentFile | null;
  contestacao: DocumentFile | null;
  setPeticao: (doc: DocumentFile | null) => void;
  setContestacao: (doc: DocumentFile | null) => void;
  updateDocument: (type: DocumentType, updates: Partial<DocumentFile>) => void;
  clearAll: () => void;
  hasDocuments: () => boolean;
  canAnalyze: () => boolean;
}

export const useDocumentStore = create<DocumentStoreState>((set, get) => ({
  peticao: null,
  contestacao: null,

  setPeticao: (doc) => set({ peticao: doc }),
  setContestacao: (doc) => set({ contestacao: doc }),

  updateDocument: (type, updates) =>
    set((state) => {
      const doc = state[type];
      if (!doc) return state;
      return { [type]: { ...doc, ...updates } };
    }),

  clearAll: () => set({ peticao: null, contestacao: null }),

  hasDocuments: () => {
    const state = get();
    return state.peticao !== null || state.contestacao !== null;
  },

  canAnalyze: () => {
    const state = get();
    return state.peticao !== null && state.peticao.status === 'ready';
  }
}));

export default useDocumentStore;

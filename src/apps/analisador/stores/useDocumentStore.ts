/**
 * @file useDocumentStore.ts
 * @description Store Zustand para documentos carregados
 * Suporta petição inicial, múltiplas emendas e múltiplas contestações
 */

import { create } from 'zustand';
import type { DocumentFile, DocumentType } from '../types';

interface DocumentStoreState {
  // Documentos
  peticao: DocumentFile | null;
  emendas: DocumentFile[];
  contestacoes: DocumentFile[];

  // Petição (único, obrigatório)
  setPeticao: (doc: DocumentFile | null) => void;

  // Emendas (múltiplas, opcional)
  addEmenda: (doc: DocumentFile) => void;
  removeEmenda: (id: string) => void;
  updateEmenda: (id: string, updates: Partial<DocumentFile>) => void;
  reorderEmendas: (ids: string[]) => void;

  // Contestações (múltiplas, opcional)
  addContestacao: (doc: DocumentFile) => void;
  removeContestacao: (id: string) => void;
  updateContestacao: (id: string, updates: Partial<DocumentFile>) => void;
  reorderContestacoes: (ids: string[]) => void;

  // Utilitários
  updateDocument: (type: DocumentType, updates: Partial<DocumentFile>, id?: string) => void;
  clearAll: () => void;
  hasDocuments: () => boolean;
  canAnalyze: () => boolean;
  getAllDocumentsText: () => {
    peticao: string;
    emendas: string[];
    contestacoes: string[];
  };
}

export const useDocumentStore = create<DocumentStoreState>((set, get) => ({
  peticao: null,
  emendas: [],
  contestacoes: [],

  // ═══════════════════════════════════════════════════════════════════════════
  // PETIÇÃO INICIAL
  // ═══════════════════════════════════════════════════════════════════════════

  setPeticao: (doc) => set({ peticao: doc }),

  // ═══════════════════════════════════════════════════════════════════════════
  // EMENDAS
  // ═══════════════════════════════════════════════════════════════════════════

  addEmenda: (doc) =>
    set((state) => ({
      emendas: [...state.emendas, { ...doc, order: state.emendas.length }]
    })),

  removeEmenda: (id) =>
    set((state) => ({
      emendas: state.emendas
        .filter((e) => e.id !== id)
        .map((e, idx) => ({ ...e, order: idx }))
    })),

  updateEmenda: (id, updates) =>
    set((state) => ({
      emendas: state.emendas.map((e) =>
        e.id === id ? { ...e, ...updates } : e
      )
    })),

  reorderEmendas: (ids) =>
    set((state) => {
      const emendaMap = new Map(state.emendas.map((e) => [e.id, e]));
      const reordered = ids
        .map((id) => emendaMap.get(id))
        .filter((e): e is DocumentFile => e !== undefined)
        .map((e, idx) => ({ ...e, order: idx }));
      return { emendas: reordered };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // CONTESTAÇÕES
  // ═══════════════════════════════════════════════════════════════════════════

  addContestacao: (doc) =>
    set((state) => ({
      contestacoes: [...state.contestacoes, { ...doc, order: state.contestacoes.length }]
    })),

  removeContestacao: (id) =>
    set((state) => ({
      contestacoes: state.contestacoes
        .filter((c) => c.id !== id)
        .map((c, idx) => ({ ...c, order: idx }))
    })),

  updateContestacao: (id, updates) =>
    set((state) => ({
      contestacoes: state.contestacoes.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      )
    })),

  reorderContestacoes: (ids) =>
    set((state) => {
      const contestacaoMap = new Map(state.contestacoes.map((c) => [c.id, c]));
      const reordered = ids
        .map((id) => contestacaoMap.get(id))
        .filter((c): c is DocumentFile => c !== undefined)
        .map((c, idx) => ({ ...c, order: idx }));
      return { contestacoes: reordered };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILITÁRIOS
  // ═══════════════════════════════════════════════════════════════════════════

  updateDocument: (type, updates, id) =>
    set((state) => {
      if (type === 'peticao') {
        const doc = state.peticao;
        if (!doc) return state;
        return { peticao: { ...doc, ...updates } };
      }
      if (type === 'emenda' && id) {
        return {
          emendas: state.emendas.map((e) =>
            e.id === id ? { ...e, ...updates } : e
          )
        };
      }
      if (type === 'contestacao' && id) {
        return {
          contestacoes: state.contestacoes.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          )
        };
      }
      return state;
    }),

  clearAll: () => set({ peticao: null, emendas: [], contestacoes: [] }),

  hasDocuments: () => {
    const state = get();
    return (
      state.peticao !== null ||
      state.emendas.length > 0 ||
      state.contestacoes.length > 0
    );
  },

  canAnalyze: () => {
    const state = get();
    return state.peticao !== null && state.peticao.status === 'ready';
  },

  getAllDocumentsText: () => {
    const state = get();
    return {
      peticao: state.peticao?.status === 'ready' ? state.peticao.text : '',
      emendas: state.emendas
        .filter((e) => e.status === 'ready')
        .sort((a, b) => a.order - b.order)
        .map((e) => e.text),
      contestacoes: state.contestacoes
        .filter((c) => c.status === 'ready')
        .sort((a, b) => a.order - b.order)
        .map((c) => c.text)
    };
  }
}));

export default useDocumentStore;

/**
 * @file useDocumentStore.ts
 * @description Store dos slots de PDF do subapp Embargos.
 */

import { create } from 'zustand';
import type { DocumentFile, DocumentSlot } from '../types';
import { REQUIRED_SLOTS } from '../types';

interface DocumentStoreState {
  decisaoEmbargada: DocumentFile | null;
  embargos: DocumentFile | null;
  contrarrazoes: DocumentFile | null;
  inicial: DocumentFile | null;
  contestacao: DocumentFile | null;

  setSlot: (slot: DocumentSlot, file: DocumentFile | null) => void;
  updateSlotStatus: (slot: DocumentSlot, status: DocumentFile['status'], errorMessage?: string) => void;
  reset: () => void;
  canAnalyze: () => boolean;
}

const INITIAL_STATE = {
  decisaoEmbargada: null,
  embargos: null,
  contrarrazoes: null,
  inicial: null,
  contestacao: null
} as const;

export const useDocumentStore = create<DocumentStoreState>((set, get) => ({
  ...INITIAL_STATE,

  setSlot: (slot, file) => set({ [slot]: file } as Partial<DocumentStoreState>),

  updateSlotStatus: (slot, status, errorMessage) => {
    const current = get()[slot];
    if (!current) return;
    set({ [slot]: { ...current, status, errorMessage } } as Partial<DocumentStoreState>);
  },

  reset: () => set(INITIAL_STATE),

  canAnalyze: () => {
    const state = get();
    return REQUIRED_SLOTS.every(slot => state[slot]?.status === 'ready');
  }
}));

export default useDocumentStore;

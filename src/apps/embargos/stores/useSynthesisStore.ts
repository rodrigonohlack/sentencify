/**
 * @file useSynthesisStore.ts
 * @description Store da síntese estruturada (1ª chamada) com edições do usuário.
 */

import { create } from 'zustand';
import type {
  SynthesisResult,
  PontoSuscitado,
  Identificacao
} from '../types';

type ResumoKey = 'resumoSentenca' | 'resumoEmbargos' | 'resumoContrarrazoes';

interface SynthesisStoreState {
  synthesis: SynthesisResult | null;
  isAnalyzing: boolean;
  progress: { value: number; label: string };
  error: string | null;
  savedId: string | null;

  setSynthesis: (s: SynthesisResult) => void;
  updatePonto: (id: string, patch: Partial<PontoSuscitado>) => void;
  updateResumo: (key: ResumoKey, text: string) => void;
  updateIdentificacao: (patch: Partial<Identificacao>) => void;
  setDiretrizesGerais: (text: string) => void;
  setIsAnalyzing: (v: boolean) => void;
  setProgress: (value: number, label: string) => void;
  setError: (msg: string | null) => void;
  setSavedId: (id: string | null) => void;
  reset: () => void;
}

const INITIAL_STATE = {
  synthesis: null,
  isAnalyzing: false,
  progress: { value: 0, label: '' },
  error: null,
  savedId: null
} as const;

export const useSynthesisStore = create<SynthesisStoreState>((set, get) => ({
  ...INITIAL_STATE,

  setSynthesis: (s) => set({ synthesis: s, error: null }),

  updatePonto: (id, patch) => {
    const current = get().synthesis;
    if (!current) return;
    const pontos = current.pontos.map(p => (p.id === id ? { ...p, ...patch } : p));
    set({ synthesis: { ...current, pontos } });
  },

  updateResumo: (key, text) => {
    const current = get().synthesis;
    if (!current) return;
    set({ synthesis: { ...current, [key]: text } });
  },

  updateIdentificacao: (patch) => {
    const current = get().synthesis;
    if (!current) return;
    set({ synthesis: { ...current, identificacao: { ...current.identificacao, ...patch } } });
  },

  setDiretrizesGerais: (text) => {
    const current = get().synthesis;
    if (!current) return;
    set({ synthesis: { ...current, diretrizesGeraisUsuario: text } });
  },

  setIsAnalyzing: (v) => set({ isAnalyzing: v }),
  setProgress: (value, label) => set({ progress: { value, label } }),
  setError: (msg) => set({ error: msg }),
  setSavedId: (id) => set({ savedId: id }),

  reset: () => set(INITIAL_STATE)
}));

export default useSynthesisStore;

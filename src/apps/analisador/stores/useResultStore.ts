/**
 * @file useResultStore.ts
 * @description Store Zustand para resultados da análise
 */

import { create } from 'zustand';
import type { AnalysisResult, AnalysisState } from '../types';

interface ResultStoreState extends AnalysisState {
  // Contexto da audiência (preenchido ao abrir análise do histórico)
  dataPauta: string | null;
  horarioAudiencia: string | null;

  // Actions
  setResult: (result: AnalysisResult | null) => void;
  setIsAnalyzing: (analyzing: boolean) => void;
  setProgress: (progress: number, message?: string) => void;
  setError: (error: string | null) => void;
  setAnalysisContext: (dataPauta: string | null, horarioAudiencia: string | null) => void;
  clearAnalysisContext: () => void;
  reset: () => void;
}

const initialState: AnalysisState & { dataPauta: string | null; horarioAudiencia: string | null } = {
  result: null,
  isAnalyzing: false,
  progress: 0,
  progressMessage: '',
  error: null,
  dataPauta: null,
  horarioAudiencia: null
};

export const useResultStore = create<ResultStoreState>((set) => ({
  ...initialState,

  setResult: (result) => set({ result, isAnalyzing: false, progress: 100, error: null }),

  setIsAnalyzing: (isAnalyzing) => set({
    isAnalyzing,
    progress: isAnalyzing ? 0 : 100,
    error: isAnalyzing ? null : undefined
  }),

  setProgress: (progress, message) => set((state) => ({
    progress,
    progressMessage: message ?? state.progressMessage
  })),

  setError: (error) => set({ error, isAnalyzing: false }),

  setAnalysisContext: (dataPauta, horarioAudiencia) => set({ dataPauta, horarioAudiencia }),

  clearAnalysisContext: () => set({ dataPauta: null, horarioAudiencia: null }),

  reset: () => set(initialState)
}));

export default useResultStore;

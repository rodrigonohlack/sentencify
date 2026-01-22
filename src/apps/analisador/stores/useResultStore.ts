/**
 * @file useResultStore.ts
 * @description Store Zustand para resultados da análise
 */

import { create } from 'zustand';
import type { AnalysisResult, AnalysisState } from '../types';

interface ResultStoreState extends AnalysisState {
  setResult: (result: AnalysisResult | null) => void;
  setIsAnalyzing: (analyzing: boolean) => void;
  setProgress: (progress: number, message?: string) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState: AnalysisState = {
  result: null,
  isAnalyzing: false,
  progress: 0,
  progressMessage: '',
  error: null
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

  reset: () => set(initialState)
}));

export default useResultStore;

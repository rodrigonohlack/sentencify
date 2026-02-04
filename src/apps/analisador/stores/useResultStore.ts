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

  // Origem da análise (para reanálise)
  savedAnalysisId: string | null;
  nomeArquivoPeticao: string | null;
  nomesArquivosEmendas: string[];
  nomesArquivosContestacoes: string[];

  // Síntese do processo
  sintese: string | null;

  // Actions
  setResult: (result: AnalysisResult | null) => void;
  setIsAnalyzing: (analyzing: boolean) => void;
  setProgress: (progress: number, message?: string) => void;
  setError: (error: string | null) => void;
  setAnalysisContext: (dataPauta: string | null, horarioAudiencia: string | null) => void;
  setSavedAnalysisId: (id: string | null) => void;
  setFileNames: (
    nomeArquivoPeticao: string | null,
    nomesArquivosEmendas: string[],
    nomesArquivosContestacoes: string[]
  ) => void;
  setSintese: (sintese: string | null) => void;
  clearAnalysisContext: () => void;
  reset: () => void;
}

const initialState: AnalysisState & {
  dataPauta: string | null;
  horarioAudiencia: string | null;
  savedAnalysisId: string | null;
  nomeArquivoPeticao: string | null;
  nomesArquivosEmendas: string[];
  nomesArquivosContestacoes: string[];
  sintese: string | null;
} = {
  result: null,
  isAnalyzing: false,
  progress: 0,
  progressMessage: '',
  error: null,
  dataPauta: null,
  horarioAudiencia: null,
  savedAnalysisId: null,
  nomeArquivoPeticao: null,
  nomesArquivosEmendas: [],
  nomesArquivosContestacoes: [],
  sintese: null
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

  setSavedAnalysisId: (savedAnalysisId) => set({ savedAnalysisId }),

  setFileNames: (nomeArquivoPeticao, nomesArquivosEmendas, nomesArquivosContestacoes) =>
    set({ nomeArquivoPeticao, nomesArquivosEmendas, nomesArquivosContestacoes }),

  setSintese: (sintese) => set({ sintese }),

  clearAnalysisContext: () => set({
    dataPauta: null,
    horarioAudiencia: null,
    savedAnalysisId: null,
    nomeArquivoPeticao: null,
    nomesArquivosEmendas: [],
    nomesArquivosContestacoes: [],
    sintese: null
  }),

  reset: () => set(initialState)
}));

export default useResultStore;

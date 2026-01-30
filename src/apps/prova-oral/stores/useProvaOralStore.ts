/**
 * @file useProvaOralStore.ts
 * @description Store Zustand para estado atual da análise de prova oral
 */

import { create } from 'zustand';
import type { ProvaOralResult, ResultTabId } from '../types';

interface ProvaOralStoreState {
  // Inputs
  transcricao: string;
  sinteseProcesso: string;

  // Estado da análise
  result: ProvaOralResult | null;
  isAnalyzing: boolean;
  progress: number;
  progressMessage: string;
  error: string | null;

  // UI
  activeTab: ResultTabId;
  isSettingsOpen: boolean;
  isHistoricoOpen: boolean;

  // Análise carregada do histórico
  loadedAnalysisId: string | null;

  // Actions - Inputs
  setTranscricao: (text: string) => void;
  setSinteseProcesso: (text: string) => void;
  clearInputs: () => void;

  // Actions - Análise
  setResult: (result: ProvaOralResult | null) => void;
  setIsAnalyzing: (analyzing: boolean) => void;
  setProgress: (progress: number, message?: string) => void;
  setError: (error: string | null) => void;
  clearResult: () => void;

  // Actions - UI
  setActiveTab: (tab: ResultTabId) => void;
  openSettings: () => void;
  closeSettings: () => void;
  openHistorico: () => void;
  closeHistorico: () => void;

  // Actions - Histórico
  setLoadedAnalysisId: (id: string | null) => void;
  loadAnalysis: (id: string, transcricao: string, sintese: string, result: ProvaOralResult) => void;

  // Actions - Reset
  resetAll: () => void;
}

const initialState = {
  transcricao: '',
  sinteseProcesso: '',
  result: null,
  isAnalyzing: false,
  progress: 0,
  progressMessage: '',
  error: null,
  activeTab: 'depoentes' as ResultTabId,
  isSettingsOpen: false,
  isHistoricoOpen: false,
  loadedAnalysisId: null,
};

export const useProvaOralStore = create<ProvaOralStoreState>((set) => ({
  ...initialState,

  // ═══════════════════════════════════════════════════════════════════════════
  // INPUTS
  // ═══════════════════════════════════════════════════════════════════════════

  setTranscricao: (text) => set({ transcricao: text }),

  setSinteseProcesso: (text) => set({ sinteseProcesso: text }),

  clearInputs: () => set({
    transcricao: '',
    sinteseProcesso: '',
    loadedAnalysisId: null
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // ANÁLISE
  // ═══════════════════════════════════════════════════════════════════════════

  setResult: (result) => set({ result }),

  setIsAnalyzing: (analyzing) => set({
    isAnalyzing: analyzing,
    ...(analyzing ? { error: null, progress: 0, progressMessage: '' } : {})
  }),

  setProgress: (progress, message) => set({
    progress,
    ...(message !== undefined ? { progressMessage: message } : {})
  }),

  setError: (error) => set({
    error,
    isAnalyzing: false,
    progress: 0,
    progressMessage: ''
  }),

  clearResult: () => set({
    result: null,
    error: null,
    progress: 0,
    progressMessage: '',
    loadedAnalysisId: null
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // UI
  // ═══════════════════════════════════════════════════════════════════════════

  setActiveTab: (tab) => set({ activeTab: tab }),

  openSettings: () => set({ isSettingsOpen: true }),

  closeSettings: () => set({ isSettingsOpen: false }),

  openHistorico: () => set({ isHistoricoOpen: true }),

  closeHistorico: () => set({ isHistoricoOpen: false }),

  // ═══════════════════════════════════════════════════════════════════════════
  // HISTÓRICO
  // ═══════════════════════════════════════════════════════════════════════════

  setLoadedAnalysisId: (id) => set({ loadedAnalysisId: id }),

  loadAnalysis: (id, transcricao, sintese, result) => set({
    loadedAnalysisId: id,
    transcricao,
    sinteseProcesso: sintese,
    result,
    error: null,
    isHistoricoOpen: false,
    activeTab: 'depoentes'
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // RESET
  // ═══════════════════════════════════════════════════════════════════════════

  resetAll: () => set(initialState),
}));

export default useProvaOralStore;

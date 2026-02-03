/**
 * @file useProvaOralStore.ts
 * @description Store Zustand para estado atual da análise de prova oral
 */

import { create } from 'zustand';
import type { ProvaOralResult, ResultTabId, TextHighlight } from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES - Estado de cada fase da análise
// ═══════════════════════════════════════════════════════════════════════════

export type PhaseStatus = 'pending' | 'connecting' | 'streaming' | 'completed' | 'error';

export interface PhaseState {
  status: PhaseStatus;
  charCount: number;
  errorMessage?: string;
}

export type PhaseId = 'phase1' | 'phase2' | 'phase3';

const initialPhaseState: PhaseState = {
  status: 'pending',
  charCount: 0,
  errorMessage: undefined,
};

interface ProvaOralStoreState {
  // Inputs
  transcricao: string;
  sinteseProcesso: string;
  instrucoesExtras: string;

  // Estado da análise
  result: ProvaOralResult | null;
  isAnalyzing: boolean;
  progress: number;
  progressMessage: string;
  error: string | null;

  // Streaming
  isStreaming: boolean;
  streamingText: string;
  showStreamingModal: boolean;

  // Estado por fase (visual do modal)
  phases: {
    phase1: PhaseState;
    phase2: PhaseState;
    phase3: PhaseState;
  };
  analysisStartTime: number | null;

  // UI
  activeTab: ResultTabId;
  isSettingsOpen: boolean;
  isHistoricoOpen: boolean;

  // Análise carregada do histórico
  loadedAnalysisId: string | null;

  // Highlights (marcações coloridas nas sínteses)
  highlights: TextHighlight[];

  // Actions - Inputs
  setTranscricao: (text: string) => void;
  setSinteseProcesso: (text: string) => void;
  setInstrucoesExtras: (text: string) => void;
  clearInputs: () => void;

  // Actions - Análise
  setResult: (result: ProvaOralResult | null) => void;
  setIsAnalyzing: (analyzing: boolean) => void;
  setProgress: (progress: number, message?: string) => void;
  setError: (error: string | null) => void;
  clearResult: () => void;

  // Actions - Streaming
  setIsStreaming: (streaming: boolean) => void;
  setStreamingText: (text: string) => void;
  setShowStreamingModal: (show: boolean) => void;
  startStreaming: () => void;
  stopStreaming: () => void;

  // Actions - Fases
  setPhaseStatus: (phase: PhaseId, status: PhaseStatus, errorMessage?: string) => void;
  setPhaseCharCount: (phase: PhaseId, count: number) => void;
  resetPhases: () => void;

  // Actions - UI
  setActiveTab: (tab: ResultTabId) => void;
  openSettings: () => void;
  closeSettings: () => void;
  openHistorico: () => void;
  closeHistorico: () => void;

  // Actions - Histórico
  setLoadedAnalysisId: (id: string | null) => void;
  loadAnalysis: (id: string, transcricao: string, sintese: string, result: ProvaOralResult) => void;

  // Actions - Highlights
  addHighlight: (highlight: Omit<TextHighlight, 'id' | 'createdAt'>) => void;
  updateHighlight: (id: string, updates: Partial<TextHighlight>) => void;
  removeHighlight: (id: string) => void;
  clearHighlights: () => void;

  // Actions - Reset
  resetAll: () => void;
}

const initialState = {
  transcricao: '',
  sinteseProcesso: '',
  instrucoesExtras: '',
  result: null,
  isAnalyzing: false,
  progress: 0,
  progressMessage: '',
  error: null,
  isStreaming: false,
  streamingText: '',
  showStreamingModal: false,
  phases: {
    phase1: { ...initialPhaseState },
    phase2: { ...initialPhaseState },
    phase3: { ...initialPhaseState },
  },
  analysisStartTime: null,
  activeTab: 'depoentes' as ResultTabId,
  isSettingsOpen: false,
  isHistoricoOpen: false,
  loadedAnalysisId: null,
  highlights: [],
};

export const useProvaOralStore = create<ProvaOralStoreState>((set) => ({
  ...initialState,

  // ═══════════════════════════════════════════════════════════════════════════
  // INPUTS
  // ═══════════════════════════════════════════════════════════════════════════

  setTranscricao: (text) => set({ transcricao: text }),

  setSinteseProcesso: (text) => set({ sinteseProcesso: text }),

  setInstrucoesExtras: (text) => set({ instrucoesExtras: text }),

  clearInputs: () => set({
    transcricao: '',
    sinteseProcesso: '',
    instrucoesExtras: '',
    loadedAnalysisId: null
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // ANÁLISE
  // ═══════════════════════════════════════════════════════════════════════════

  setResult: (result) => set({
    result,
    highlights: result?.highlights || []
  }),

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
    loadedAnalysisId: null,
    highlights: []
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // STREAMING
  // ═══════════════════════════════════════════════════════════════════════════

  setIsStreaming: (streaming) => set({ isStreaming: streaming }),

  setStreamingText: (text) => set({ streamingText: text }),

  setShowStreamingModal: (show) => set({ showStreamingModal: show }),

  startStreaming: () => set({
    isStreaming: true,
    streamingText: '',
    showStreamingModal: true,
    error: null,
    analysisStartTime: Date.now(),
    phases: {
      phase1: { status: 'pending', charCount: 0 },
      phase2: { status: 'pending', charCount: 0 },
      phase3: { status: 'pending', charCount: 0 },
    }
  }),

  stopStreaming: () => set({
    isStreaming: false
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // FASES
  // ═══════════════════════════════════════════════════════════════════════════

  setPhaseStatus: (phase, status, errorMessage) => set((state) => ({
    phases: {
      ...state.phases,
      [phase]: {
        ...state.phases[phase],
        status,
        ...(errorMessage !== undefined ? { errorMessage } : {})
      }
    }
  })),

  setPhaseCharCount: (phase, count) => set((state) => ({
    phases: {
      ...state.phases,
      [phase]: {
        ...state.phases[phase],
        charCount: count
      }
    }
  })),

  resetPhases: () => set({
    phases: {
      phase1: { ...initialPhaseState },
      phase2: { ...initialPhaseState },
      phase3: { ...initialPhaseState },
    },
    analysisStartTime: null
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
    highlights: result.highlights || [],
    error: null,
    isHistoricoOpen: false,
    activeTab: 'depoentes'
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // HIGHLIGHTS
  // ═══════════════════════════════════════════════════════════════════════════

  addHighlight: (highlight) => set((state) => {
    const newHighlight: TextHighlight = {
      ...highlight,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    const newHighlights = [...state.highlights, newHighlight];
    // Atualiza também o result se existir
    const updatedResult = state.result ? {
      ...state.result,
      highlights: newHighlights
    } : null;
    return {
      highlights: newHighlights,
      result: updatedResult
    };
  }),

  updateHighlight: (id, updates) => set((state) => {
    const newHighlights = state.highlights.map(h =>
      h.id === id ? { ...h, ...updates } : h
    );
    const updatedResult = state.result ? {
      ...state.result,
      highlights: newHighlights
    } : null;
    return {
      highlights: newHighlights,
      result: updatedResult
    };
  }),

  removeHighlight: (id) => set((state) => {
    const newHighlights = state.highlights.filter(h => h.id !== id);
    const updatedResult = state.result ? {
      ...state.result,
      highlights: newHighlights
    } : null;
    return {
      highlights: newHighlights,
      result: updatedResult
    };
  }),

  clearHighlights: () => set((state) => {
    const updatedResult = state.result ? {
      ...state.result,
      highlights: []
    } : null;
    return {
      highlights: [],
      result: updatedResult
    };
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // RESET
  // ═══════════════════════════════════════════════════════════════════════════

  resetAll: () => set(initialState),
}));

export default useProvaOralStore;

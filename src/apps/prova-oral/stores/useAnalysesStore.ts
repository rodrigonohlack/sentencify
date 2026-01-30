/**
 * @file useAnalysesStore.ts
 * @description Store Zustand para gerenciamento de análises de prova oral salvas
 */

import { create } from 'zustand';
import type { SavedProvaOralAnalysis } from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

interface HistoricoFilters {
  search: string;
}

interface AnalysesState {
  // Análises salvas
  analyses: SavedProvaOralAnalysis[];
  selectedAnalysis: SavedProvaOralAnalysis | null;
  isLoading: boolean;
  error: string | null;

  // Filtros do histórico
  filters: HistoricoFilters;
}

interface AnalysesActions {
  // Análises
  setAnalyses: (analyses: SavedProvaOralAnalysis[]) => void;
  addAnalysis: (analysis: SavedProvaOralAnalysis) => void;
  updateAnalysis: (id: string, updates: Partial<SavedProvaOralAnalysis>) => void;
  removeAnalysis: (id: string) => void;
  setSelectedAnalysis: (analysis: SavedProvaOralAnalysis | null) => void;
  clearAnalyses: () => void;

  // Loading/Error
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Filtros
  setFilters: (filters: Partial<HistoricoFilters>) => void;
  clearFilters: () => void;

  // Computed
  getFilteredAnalyses: () => SavedProvaOralAnalysis[];
}

// ═══════════════════════════════════════════════════════════════════════════
// ESTADO INICIAL
// ═══════════════════════════════════════════════════════════════════════════

const initialFilters: HistoricoFilters = {
  search: '',
};

// ═══════════════════════════════════════════════════════════════════════════
// STORE
// ═══════════════════════════════════════════════════════════════════════════

export const useAnalysesStore = create<AnalysesState & AnalysesActions>((set, get) => ({
  // Estado inicial
  analyses: [],
  selectedAnalysis: null,
  isLoading: false,
  error: null,
  filters: initialFilters,

  // ═══════════════════════════════════════════════════════════════════════════
  // AÇÕES - ANÁLISES
  // ═══════════════════════════════════════════════════════════════════════════

  setAnalyses: (analyses) => set({ analyses }),

  addAnalysis: (analysis) =>
    set((state) => ({
      analyses: [analysis, ...state.analyses],
    })),

  updateAnalysis: (id, updates) =>
    set((state) => ({
      analyses: state.analyses.map((a) =>
        a.id === id ? { ...a, ...updates, updatedAt: new Date().toISOString() } : a
      ),
      selectedAnalysis:
        state.selectedAnalysis?.id === id
          ? { ...state.selectedAnalysis, ...updates, updatedAt: new Date().toISOString() }
          : state.selectedAnalysis,
    })),

  removeAnalysis: (id) =>
    set((state) => ({
      analyses: state.analyses.filter((a) => a.id !== id),
      selectedAnalysis: state.selectedAnalysis?.id === id ? null : state.selectedAnalysis,
    })),

  setSelectedAnalysis: (analysis) => set({ selectedAnalysis: analysis }),

  clearAnalyses: () =>
    set({
      analyses: [],
      selectedAnalysis: null,
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // AÇÕES - LOADING/ERROR
  // ═══════════════════════════════════════════════════════════════════════════

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error }),

  // ═══════════════════════════════════════════════════════════════════════════
  // AÇÕES - FILTROS
  // ═══════════════════════════════════════════════════════════════════════════

  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
    })),

  clearFilters: () => set({ filters: initialFilters }),

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPUTED - FILTROS
  // ═══════════════════════════════════════════════════════════════════════════

  getFilteredAnalyses: () => {
    const { analyses, filters } = get();
    let filtered = [...analyses];

    // Filtro por busca (número do processo ou reclamante)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.numeroProcesso?.toLowerCase().includes(searchLower) ||
          a.reclamante?.toLowerCase().includes(searchLower) ||
          a.reclamada?.toLowerCase().includes(searchLower)
      );
    }

    // Ordenar por data de criação (mais recente primeiro)
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return filtered;
  },
}));

export default useAnalysesStore;

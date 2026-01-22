/**
 * @file useAnalysesStore.ts
 * @description Zustand store para gerenciamento de análises de prepauta
 * @version 1.39.0
 */

import { create } from 'zustand';
import type {
  SavedAnalysis,
  HistoricoFilters,
  BatchState,
  BatchFile,
  ResultadoAudiencia,
  PautaGroup,
} from '../types/analysis.types';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════

/** Número máximo de arquivos processados em paralelo */
export const BATCH_CONCURRENCY_LIMIT = 3;

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS DO STORE
// ═══════════════════════════════════════════════════════════════════════════

interface AnalysesState {
  // Análises salvas
  analyses: SavedAnalysis[];
  selectedAnalysis: SavedAnalysis | null;
  selectedIds: Set<string>;
  isLoading: boolean;
  error: string | null;

  // Filtros do histórico
  filters: HistoricoFilters;

  // Batch processing
  batch: BatchState;

  // Histórico modal
  isHistoricoOpen: boolean;
}

interface AnalysesActions {
  // Análises
  setAnalyses: (analyses: SavedAnalysis[]) => void;
  addAnalysis: (analysis: SavedAnalysis) => void;
  updateAnalysis: (id: string, updates: Partial<SavedAnalysis>) => void;
  removeAnalysis: (id: string) => void;
  removeAnalyses: (ids: string[]) => void;
  setSelectedAnalysis: (analysis: SavedAnalysis | null) => void;
  clearAnalyses: () => void;

  // Seleção
  toggleSelection: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  setSelectedIds: (ids: Set<string>) => void;

  // Loading/Error
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Filtros
  setFilters: (filters: Partial<HistoricoFilters>) => void;
  clearFilters: () => void;

  // Batch
  setBatchFiles: (files: BatchFile[]) => void;
  addBatchFiles: (files: BatchFile[]) => void;
  updateBatchFile: (id: string, updates: Partial<BatchFile>) => void;
  removeBatchFile: (id: string) => void;
  clearBatchFiles: () => void;
  setBatchProcessing: (processing: boolean) => void;
  setBatchProgress: (current: number, total: number, processed: number, errors: number) => void;
  resetBatch: () => void;

  // Modal
  openHistorico: () => void;
  closeHistorico: () => void;

  // Computed
  getFilteredAnalyses: () => SavedAnalysis[];
  getGroupedByPauta: () => PautaGroup[];
}

// ═══════════════════════════════════════════════════════════════════════════
// ESTADO INICIAL
// ═══════════════════════════════════════════════════════════════════════════

const initialFilters: HistoricoFilters = {
  search: '',
  resultado: 'todos',
  dataPauta: null,
};

const initialBatchState: BatchState = {
  files: [],
  isProcessing: false,
  currentIndex: 0,
  totalFiles: 0,
  processedCount: 0,
  errorCount: 0,
};

// ═══════════════════════════════════════════════════════════════════════════
// STORE
// ═══════════════════════════════════════════════════════════════════════════

export const useAnalysesStore = create<AnalysesState & AnalysesActions>((set, get) => ({
  // Estado inicial
  analyses: [],
  selectedAnalysis: null,
  selectedIds: new Set(),
  isLoading: false,
  error: null,
  filters: initialFilters,
  batch: initialBatchState,
  isHistoricoOpen: false,

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
      selectedIds: new Set([...state.selectedIds].filter((i) => i !== id)),
    })),

  removeAnalyses: (ids) =>
    set((state) => ({
      analyses: state.analyses.filter((a) => !ids.includes(a.id)),
      selectedAnalysis:
        state.selectedAnalysis && ids.includes(state.selectedAnalysis.id)
          ? null
          : state.selectedAnalysis,
      selectedIds: new Set([...state.selectedIds].filter((i) => !ids.includes(i))),
    })),

  setSelectedAnalysis: (analysis) => set({ selectedAnalysis: analysis }),

  clearAnalyses: () =>
    set({
      analyses: [],
      selectedAnalysis: null,
      selectedIds: new Set(),
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // AÇÕES - SELEÇÃO
  // ═══════════════════════════════════════════════════════════════════════════

  toggleSelection: (id) =>
    set((state) => {
      const newSelection = new Set(state.selectedIds);
      if (newSelection.has(id)) {
        newSelection.delete(id);
      } else {
        newSelection.add(id);
      }
      return { selectedIds: newSelection };
    }),

  selectAll: () =>
    set((state) => ({
      selectedIds: new Set(get().getFilteredAnalyses().map((a) => a.id)),
    })),

  clearSelection: () => set({ selectedIds: new Set() }),

  setSelectedIds: (ids) => set({ selectedIds: ids }),

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
  // AÇÕES - BATCH
  // ═══════════════════════════════════════════════════════════════════════════

  setBatchFiles: (files) =>
    set((state) => ({
      batch: { ...state.batch, files, totalFiles: files.length },
    })),

  addBatchFiles: (files) =>
    set((state) => ({
      batch: {
        ...state.batch,
        files: [...state.batch.files, ...files],
        totalFiles: state.batch.files.length + files.length,
      },
    })),

  updateBatchFile: (id, updates) =>
    set((state) => ({
      batch: {
        ...state.batch,
        files: state.batch.files.map((f) => (f.id === id ? { ...f, ...updates } : f)),
      },
    })),

  removeBatchFile: (id) =>
    set((state) => ({
      batch: {
        ...state.batch,
        files: state.batch.files.filter((f) => f.id !== id),
        totalFiles: state.batch.files.length - 1,
      },
    })),

  clearBatchFiles: () =>
    set((state) => ({
      batch: { ...state.batch, files: [], totalFiles: 0 },
    })),

  setBatchProcessing: (processing) =>
    set((state) => ({
      batch: { ...state.batch, isProcessing: processing },
    })),

  setBatchProgress: (current, total, processed, errors) =>
    set((state) => ({
      batch: {
        ...state.batch,
        currentIndex: current,
        totalFiles: total,
        processedCount: processed,
        errorCount: errors,
      },
    })),

  resetBatch: () => set({ batch: initialBatchState }),

  // ═══════════════════════════════════════════════════════════════════════════
  // AÇÕES - MODAL
  // ═══════════════════════════════════════════════════════════════════════════

  openHistorico: () => set({ isHistoricoOpen: true }),

  closeHistorico: () => set({ isHistoricoOpen: false }),

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPUTED - FILTROS E AGRUPAMENTO
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
          a.reclamante?.toLowerCase().includes(searchLower)
      );
    }

    // Filtro por resultado da audiência
    if (filters.resultado !== 'todos') {
      filtered = filtered.filter((a) => a.resultadoAudiencia === filters.resultado);
    }

    // Filtro por data da pauta
    if (filters.dataPauta) {
      filtered = filtered.filter((a) => a.dataPauta === filters.dataPauta);
    }

    return filtered;
  },

  getGroupedByPauta: () => {
    const filtered = get().getFilteredAnalyses();
    const groups: Map<string, SavedAnalysis[]> = new Map();

    // Separar análises com e sem data de pauta
    const withPauta: SavedAnalysis[] = [];
    const withoutPauta: SavedAnalysis[] = [];

    filtered.forEach((a) => {
      if (a.dataPauta) {
        withPauta.push(a);
      } else {
        withoutPauta.push(a);
      }
    });

    // Agrupar por data de pauta
    withPauta.forEach((a) => {
      const existing = groups.get(a.dataPauta!);
      if (existing) {
        existing.push(a);
      } else {
        groups.set(a.dataPauta!, [a]);
      }
    });

    // Ordenar grupos por data (mais recente primeiro)
    const sortedGroups: PautaGroup[] = Array.from(groups.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([dataPauta, analyses]) => ({
        dataPauta,
        analyses: analyses.sort((a, b) => {
          // Ordenar por horário dentro do grupo
          if (a.horarioAudiencia && b.horarioAudiencia) {
            return a.horarioAudiencia.localeCompare(b.horarioAudiencia);
          }
          return 0;
        }),
      }));

    // Adicionar grupo "Sem data" se houver análises sem data de pauta
    if (withoutPauta.length > 0) {
      sortedGroups.push({
        dataPauta: '',
        analyses: withoutPauta.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
      });
    }

    return sortedGroups;
  },
}));

export default useAnalysesStore;

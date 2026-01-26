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
  PautaGroup,
} from '../types/analysis.types';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS DE SETTINGS
// ═══════════════════════════════════════════════════════════════════════════

interface AnalysesSettings {
  /** Número máximo de processos processados em paralelo (1-10) */
  concurrencyLimit: number;
}

const DEFAULT_SETTINGS: AnalysesSettings = {
  concurrencyLimit: 3,
};

const SETTINGS_STORAGE_KEY = 'analisador-settings';
const EXPANDED_GROUPS_STORAGE_KEY = 'analisador-expanded-groups';

/**
 * Normaliza análises do formato antigo para o novo formato
 * Converte nomeArquivoContestacao (string) para nomesArquivosContestacoes (array)
 */
function normalizeAnalysis(analysis: SavedAnalysis): SavedAnalysis {
  // Se já tem os novos campos, retorna sem modificação
  if (analysis.nomesArquivosEmendas !== undefined && analysis.nomesArquivosContestacoes !== undefined) {
    return analysis;
  }

  return {
    ...analysis,
    nomesArquivosEmendas: analysis.nomesArquivosEmendas ?? [],
    nomesArquivosContestacoes: analysis.nomesArquivosContestacoes
      ?? (analysis.nomeArquivoContestacao ? [analysis.nomeArquivoContestacao] : []),
  };
}

/** Carrega settings do localStorage com fallback para DEFAULT_SETTINGS */
function loadSettings(): AnalysesSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        concurrencyLimit: Math.max(1, Math.min(10, parsed.concurrencyLimit ?? DEFAULT_SETTINGS.concurrencyLimit)),
      };
    }
  } catch {
    // Fallback silencioso em caso de erro de parsing
  }
  return DEFAULT_SETTINGS;
}

/** Carrega estado expanded dos grupos de pauta do localStorage */
function loadExpandedGroups(): Record<string, boolean> {
  try {
    const stored = localStorage.getItem(EXPANDED_GROUPS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Fallback silencioso em caso de erro de parsing
  }
  return {};
}

/** Salva estado expanded dos grupos de pauta no localStorage */
function saveExpandedGroups(groups: Record<string, boolean>): void {
  try {
    localStorage.setItem(EXPANDED_GROUPS_STORAGE_KEY, JSON.stringify(groups));
  } catch {
    // Falha silenciosa se localStorage não disponível
  }
}

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

  // Settings
  settings: AnalysesSettings;

  // Histórico modal
  isHistoricoOpen: boolean;

  // Estado expanded/collapsed dos grupos de pauta (chave = dataPauta, valor = isExpanded)
  expandedPautaGroups: Record<string, boolean>;
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

  // Settings
  setConcurrencyLimit: (limit: number) => void;

  // Modal
  openHistorico: () => void;
  closeHistorico: () => void;

  // Pauta groups expanded state
  togglePautaGroupExpanded: (dataPauta: string) => void;
  isPautaGroupExpanded: (dataPauta: string) => boolean;

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
  settings: loadSettings(),
  isHistoricoOpen: false,
  expandedPautaGroups: loadExpandedGroups(),

  // ═══════════════════════════════════════════════════════════════════════════
  // AÇÕES - ANÁLISES
  // ═══════════════════════════════════════════════════════════════════════════

  setAnalyses: (analyses) => set({ analyses: analyses.map(normalizeAnalysis) }),

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
    set((_state) => ({
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
  // AÇÕES - SETTINGS
  // ═══════════════════════════════════════════════════════════════════════════

  setConcurrencyLimit: (limit) => {
    const clamped = Math.max(1, Math.min(10, limit));
    set((state) => ({
      settings: { ...state.settings, concurrencyLimit: clamped },
    }));
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ concurrencyLimit: clamped }));
    } catch {
      // Falha silenciosa se localStorage não disponível
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // AÇÕES - MODAL
  // ═══════════════════════════════════════════════════════════════════════════

  openHistorico: () => set({ isHistoricoOpen: true }),

  closeHistorico: () => set({ isHistoricoOpen: false }),

  // ═══════════════════════════════════════════════════════════════════════════
  // AÇÕES - PAUTA GROUPS EXPANDED STATE
  // ═══════════════════════════════════════════════════════════════════════════

  togglePautaGroupExpanded: (dataPauta) => {
    const { expandedPautaGroups } = get();
    // Se não existe no registro, assume expandido (true) - toggle vai colapsar
    const currentState = expandedPautaGroups[dataPauta] ?? true;
    const newState = !currentState;
    const newGroups = { ...expandedPautaGroups, [dataPauta]: newState };
    set({ expandedPautaGroups: newGroups });
    saveExpandedGroups(newGroups);
  },

  isPautaGroupExpanded: (dataPauta) => {
    const { expandedPautaGroups } = get();
    // Default: expandido (true)
    return expandedPautaGroups[dataPauta] ?? true;
  },

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

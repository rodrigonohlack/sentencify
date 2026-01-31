/**
 * @file useSearchStore.ts
 * @description Store Zustand para estado de Busca Semântica (modelo E5)
 * @version 1.40.09 - Migrado de useState para Zustand (fix estado compartilhado)
 *
 * PROBLEMA RESOLVIDO:
 * Antes, useSemanticSearchManagement usava useState local. Quando dois componentes
 * chamavam o hook (App.tsx e ConfigModal.tsx), cada um tinha estados independentes.
 * Quando o ConfigModal inicializava o modelo, o App.tsx não era notificado.
 *
 * SOLUÇÃO:
 * Zustand store garante estado único compartilhado entre todos os componentes.
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import AIModelService from '../services/AIModelService';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

interface SearchState {
  // Estados
  searchFilesStored: string[];
  searchModelReady: boolean;
  searchInitializing: boolean;
  searchDownloadProgress: number;
  searchEnabled: boolean;
}

interface SearchActions {
  // Setters
  setSearchFilesStored: (files: string[]) => void;
  setSearchModelReady: (ready: boolean) => void;
  setSearchInitializing: (initializing: boolean) => void;
  setSearchDownloadProgress: (progress: number) => void;
  setSearchEnabled: (enabled: boolean) => void;

  // Actions
  initSearchModel: () => Promise<void>;
}

type SearchStore = SearchState & SearchActions;

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════

const STORAGE_KEYS = {
  SEARCH_ENABLED: 'searchEnabled',
  SEMANTIC_SEARCH_ENABLED: 'semanticSearchEnabled', // Legado para migração
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

const getInitialSearchEnabled = (): boolean => {
  try {
    // Migração: se searchEnabled não existe, usa semanticSearchEnabled como fallback
    const stored = localStorage.getItem(STORAGE_KEYS.SEARCH_ENABLED);
    if (stored !== null) return JSON.parse(stored);
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.SEMANTIC_SEARCH_ENABLED) || 'false');
  } catch {
    return false;
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// STORE
// ═══════════════════════════════════════════════════════════════════════════

export const useSearchStore = create<SearchStore>()(
  devtools(
    (set, get) => ({
      // Estado inicial
      searchFilesStored: [],
      searchModelReady: false,
      searchInitializing: false,
      searchDownloadProgress: 0,
      searchEnabled: getInitialSearchEnabled(),

      // Setters
      setSearchFilesStored: (files) => set({ searchFilesStored: files }),
      setSearchModelReady: (ready) => set({ searchModelReady: ready }),
      setSearchInitializing: (initializing) => set({ searchInitializing: initializing }),
      setSearchDownloadProgress: (progress) => set({ searchDownloadProgress: progress }),

      setSearchEnabled: (enabled) => {
        set({ searchEnabled: enabled });
        try {
          localStorage.setItem(STORAGE_KEYS.SEARCH_ENABLED, JSON.stringify(enabled));
        } catch (err) {
          console.warn('[SearchStore] Erro ao salvar searchEnabled:', err);
        }

        // Auto-inicializar se habilitado e modelo não está pronto
        if (enabled && !get().searchModelReady && !get().searchInitializing) {
          get().initSearchModel();
        }
      },

      // Action para inicializar o modelo
      initSearchModel: async () => {
        const { searchModelReady, searchInitializing } = get();
        if (searchModelReady || searchInitializing) return;

        if (import.meta.env.DEV) console.log('[SearchStore] Inicializando modelo E5...');

        set({ searchInitializing: true, searchDownloadProgress: 0 });

        const unsubscribe = AIModelService.subscribe((_status, progress) => {
          if (progress.search !== undefined) {
            set({ searchDownloadProgress: Math.round(progress.search) });
          }
        });

        try {
          await AIModelService.init('search');
          set({ searchModelReady: true });
          if (import.meta.env.DEV) console.log('[SearchStore] Modelo E5 pronto!');
        } catch (err) {
          console.error('[SearchStore] Erro ao inicializar:', err);
        } finally {
          set({ searchInitializing: false });
          unsubscribe();
        }
      },
    }),
    { name: 'search-store' }
  )
);

// ═══════════════════════════════════════════════════════════════════════════
// SELECTORS (para otimização de re-renders)
// ═══════════════════════════════════════════════════════════════════════════

export const selectSearchEnabled = (state: SearchStore) => state.searchEnabled;
export const selectSearchModelReady = (state: SearchStore) => state.searchModelReady;
export const selectSearchInitializing = (state: SearchStore) => state.searchInitializing;
export const selectSearchDownloadProgress = (state: SearchStore) => state.searchDownloadProgress;

export default useSearchStore;

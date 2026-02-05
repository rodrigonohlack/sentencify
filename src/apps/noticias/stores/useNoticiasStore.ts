// ═══════════════════════════════════════════════════════════════════════════
// STORE - Estado Principal do App de Notícias
// v1.41.0 - Store Zustand para gerenciamento de notícias jurídicas
// ═══════════════════════════════════════════════════════════════════════════

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_SOURCES, DEFAULT_FILTERS, STORAGE_KEYS } from '../constants/sources';
import type { NewsItem, NewsSource, NewsFilters, NoticiasTab, NoticiasLoadingState } from '../types';

interface NoticiasStoreState {
  // ═══════════════════════════════════════════════════════════════════════════
  // DADOS
  // ═══════════════════════════════════════════════════════════════════════════
  news: NewsItem[];
  sources: NewsSource[];
  totalCount: number;
  hasMore: boolean;

  // ═══════════════════════════════════════════════════════════════════════════
  // UI STATE
  // ═══════════════════════════════════════════════════════════════════════════
  filters: NewsFilters;
  activeTab: NoticiasTab;
  selectedNews: NewsItem | null;
  isSettingsOpen: boolean;
  loading: NoticiasLoadingState;
  error: string | null;
  lastRefresh: string | null;

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTIONS - DADOS
  // ═══════════════════════════════════════════════════════════════════════════
  setNews: (news: NewsItem[]) => void;
  appendNews: (news: NewsItem[]) => void;
  updateNewsItem: (id: string, updates: Partial<NewsItem>) => void;
  clearNews: () => void;

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTIONS - FONTES
  // ═══════════════════════════════════════════════════════════════════════════
  setSources: (sources: NewsSource[]) => void;
  toggleSource: (sourceId: string) => void;
  enableAllSources: () => void;
  disableAllSources: () => void;

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTIONS - FILTROS
  // ═══════════════════════════════════════════════════════════════════════════
  setFilters: (filters: Partial<NewsFilters>) => void;
  resetFilters: () => void;

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTIONS - UI
  // ═══════════════════════════════════════════════════════════════════════════
  setActiveTab: (tab: NoticiasTab) => void;
  setSelectedNews: (news: NewsItem | null) => void;
  setSettingsOpen: (open: boolean) => void;
  setLoading: (loading: Partial<NoticiasLoadingState>) => void;
  setError: (error: string | null) => void;
  setTotalCount: (count: number) => void;
  setHasMore: (hasMore: boolean) => void;
  setLastRefresh: (timestamp: string | null) => void;
}

const initialLoadingState: NoticiasLoadingState = {
  feed: false,
  summary: null,
  favorite: null,
  refresh: false
};

export const useNoticiasStore = create<NoticiasStoreState>()(
  persist(
    (set) => ({
      // ═══════════════════════════════════════════════════════════════════════════
      // ESTADO INICIAL
      // ═══════════════════════════════════════════════════════════════════════════
      news: [],
      sources: [...DEFAULT_SOURCES],
      totalCount: 0,
      hasMore: false,
      filters: { ...DEFAULT_FILTERS },
      activeTab: 'feed',
      selectedNews: null,
      isSettingsOpen: false,
      loading: initialLoadingState,
      error: null,
      lastRefresh: null,

      // ═══════════════════════════════════════════════════════════════════════════
      // ACTIONS - DADOS
      // ═══════════════════════════════════════════════════════════════════════════
      setNews: (news) => set({ news, error: null }),

      appendNews: (newNews) => set((state) => {
        // Evitar duplicatas por ID
        const existingIds = new Set(state.news.map(n => n.id));
        const uniqueNew = newNews.filter(n => !existingIds.has(n.id));
        return { news: [...state.news, ...uniqueNew] };
      }),

      updateNewsItem: (id, updates) => set((state) => ({
        news: state.news.map(n =>
          n.id === id ? { ...n, ...updates } : n
        ),
        // Atualizar também selectedNews se for o mesmo
        selectedNews: state.selectedNews?.id === id
          ? { ...state.selectedNews, ...updates }
          : state.selectedNews
      })),

      clearNews: () => set({ news: [], totalCount: 0, hasMore: false }),

      // ═══════════════════════════════════════════════════════════════════════════
      // ACTIONS - FONTES
      // ═══════════════════════════════════════════════════════════════════════════
      setSources: (sources) => set({ sources }),

      toggleSource: (sourceId) => set((state) => ({
        sources: state.sources.map(s =>
          s.id === sourceId ? { ...s, enabled: !s.enabled } : s
        )
      })),

      enableAllSources: () => set((state) => ({
        sources: state.sources.map(s => ({ ...s, enabled: true }))
      })),

      disableAllSources: () => set((state) => ({
        sources: state.sources.map(s => ({ ...s, enabled: false }))
      })),

      // ═══════════════════════════════════════════════════════════════════════════
      // ACTIONS - FILTROS
      // ═══════════════════════════════════════════════════════════════════════════
      setFilters: (filters) => set((state) => ({
        filters: { ...state.filters, ...filters }
      })),

      resetFilters: () => set({ filters: { ...DEFAULT_FILTERS } }),

      // ═══════════════════════════════════════════════════════════════════════════
      // ACTIONS - UI
      // ═══════════════════════════════════════════════════════════════════════════
      setActiveTab: (activeTab) => set({ activeTab }),

      setSelectedNews: (selectedNews) => set({ selectedNews }),

      setSettingsOpen: (isSettingsOpen) => set({ isSettingsOpen }),

      setLoading: (loading) => set((state) => ({
        loading: { ...state.loading, ...loading }
      })),

      setError: (error) => set({ error }),

      setTotalCount: (totalCount) => set({ totalCount }),

      setHasMore: (hasMore) => set({ hasMore }),

      setLastRefresh: (lastRefresh) => set({ lastRefresh })
    }),
    {
      name: STORAGE_KEYS.FILTERS,
      partialize: (state) => ({
        // Persistir apenas filtros, fontes e configurações
        filters: state.filters,
        sources: state.sources,
        lastRefresh: state.lastRefresh
      })
    }
  )
);

// ═══════════════════════════════════════════════════════════════════════════
// SELECTORS
// ═══════════════════════════════════════════════════════════════════════════

export const selectEnabledSources = (state: NoticiasStoreState) =>
  state.sources.filter(s => s.enabled);

export const selectSourcesByType = (state: NoticiasStoreState, type: 'tribunal' | 'portal') =>
  state.sources.filter(s => s.type === type);

export const selectFavoriteNews = (state: NoticiasStoreState) =>
  state.news.filter(n => n.isFavorite);

export const selectUnreadNews = (state: NoticiasStoreState) =>
  state.news.filter(n => !n.isRead);

export const selectNewsWithSummary = (state: NoticiasStoreState) =>
  state.news.filter(n => n.aiSummary);

export const selectIsAnyLoading = (state: NoticiasStoreState) =>
  state.loading.feed || state.loading.refresh || !!state.loading.summary || !!state.loading.favorite;

export default useNoticiasStore;

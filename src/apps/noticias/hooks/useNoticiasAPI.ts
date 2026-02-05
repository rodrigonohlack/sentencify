// ═══════════════════════════════════════════════════════════════════════════
// HOOK - API de Notícias Jurídicas
// v1.41.0 - Hook para comunicação com backend de notícias
// ═══════════════════════════════════════════════════════════════════════════

import { useCallback } from 'react';
import { useAuthMagicLink } from '../../../hooks/useAuthMagicLink';
import { API_BASE } from '../constants';
import type { NewsItem, NewsFilters, NewsListResponse, NewsItemCreate, NewsStats } from '../types';

/**
 * Hook para API de notícias jurídicas
 * Segue padrão de useAnalysesAPI e useProvaOralAPI
 */
export const useNoticiasAPI = () => {
  const { authFetch, isAuthenticated } = useAuthMagicLink();

  /**
   * Busca notícias com filtros e paginação
   * @param filters - Filtros a aplicar
   * @param pagination - Configuração de paginação
   * @returns Lista de notícias com metadados
   */
  const fetchNoticias = useCallback(async (
    filters: Partial<NewsFilters> = {},
    pagination: { limit?: number; offset?: number } = {}
  ): Promise<NewsListResponse> => {
    const params = new URLSearchParams();

    if (filters.sources && filters.sources.length > 0) {
      params.set('sources', filters.sources.join(','));
    }
    if (filters.period && filters.period !== 'all') {
      params.set('period', filters.period);
    }
    if (filters.searchQuery) {
      params.set('searchQuery', filters.searchQuery);
    }
    if (filters.onlyFavorites) {
      params.set('onlyFavorites', 'true');
    }
    if (filters.onlyUnread) {
      params.set('onlyUnread', 'true');
    }

    params.set('limit', String(pagination.limit || 50));
    params.set('offset', String(pagination.offset || 0));

    const res = await authFetch(`${API_BASE}/api/noticias?${params.toString()}`);
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Erro ao buscar notícias');
    }
    return res.json();
  }, [authFetch]);

  /**
   * Busca favoritos do usuário
   * @param pagination - Configuração de paginação
   * @returns Lista de notícias favoritas
   */
  const fetchFavorites = useCallback(async (
    pagination: { limit?: number; offset?: number } = {}
  ): Promise<{ news: NewsItem[]; count: number }> => {
    const params = new URLSearchParams();
    params.set('limit', String(pagination.limit || 50));
    params.set('offset', String(pagination.offset || 0));

    const res = await authFetch(`${API_BASE}/api/noticias/favorites?${params.toString()}`);
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Erro ao buscar favoritos');
    }
    return res.json();
  }, [authFetch]);

  /**
   * Cria uma nova notícia (importação manual)
   * @param news - Dados da notícia
   * @returns ID da notícia criada
   */
  const createNoticia = useCallback(async (
    news: NewsItemCreate
  ): Promise<{ id: string; alreadyExists?: boolean }> => {
    const res = await authFetch(`${API_BASE}/api/noticias`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(news)
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Erro ao criar notícia');
    }
    return res.json();
  }, [authFetch]);

  /**
   * Cria notícias em lote (RSS fetch)
   * @param news - Array de notícias
   * @returns Contagem de inserções e duplicatas
   */
  const createNoticiasBatch = useCallback(async (
    news: NewsItemCreate[]
  ): Promise<{ inserted: number; skipped: number }> => {
    const res = await authFetch(`${API_BASE}/api/noticias/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ news })
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Erro ao criar notícias em lote');
    }
    return res.json();
  }, [authFetch]);

  /**
   * Salva resumo IA (compartilhado com todos)
   * @param noticiaId - ID da notícia
   * @param summary - Texto do resumo
   */
  const saveSummary = useCallback(async (
    noticiaId: string,
    summary: string
  ): Promise<{ aiSummaryGeneratedAt: string }> => {
    const res = await authFetch(`${API_BASE}/api/noticias/${noticiaId}/summary`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ summary })
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Erro ao salvar resumo');
    }
    return res.json();
  }, [authFetch]);

  /**
   * Adiciona notícia aos favoritos
   * @param noticiaId - ID da notícia
   */
  const addFavorite = useCallback(async (
    noticiaId: string
  ): Promise<{ success: boolean }> => {
    const res = await authFetch(`${API_BASE}/api/noticias/${noticiaId}/favorite`, {
      method: 'POST'
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Erro ao adicionar favorito');
    }
    return res.json();
  }, [authFetch]);

  /**
   * Remove notícia dos favoritos
   * @param noticiaId - ID da notícia
   */
  const removeFavorite = useCallback(async (
    noticiaId: string
  ): Promise<{ success: boolean }> => {
    const res = await authFetch(`${API_BASE}/api/noticias/${noticiaId}/favorite`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Erro ao remover favorito');
    }
    return res.json();
  }, [authFetch]);

  /**
   * Toggle favorito (adiciona se não for, remove se for)
   * @param noticiaId - ID da notícia
   * @param isFavorite - Estado atual
   */
  const toggleFavorite = useCallback(async (
    noticiaId: string,
    isFavorite: boolean
  ): Promise<{ success: boolean }> => {
    if (isFavorite) {
      return removeFavorite(noticiaId);
    }
    return addFavorite(noticiaId);
  }, [addFavorite, removeFavorite]);

  /**
   * Marca notícia como lida
   * @param noticiaId - ID da notícia
   */
  const markAsRead = useCallback(async (
    noticiaId: string
  ): Promise<{ success: boolean }> => {
    const res = await authFetch(`${API_BASE}/api/noticias/${noticiaId}/read`, {
      method: 'POST'
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Erro ao marcar como lida');
    }
    return res.json();
  }, [authFetch]);

  /**
   * Busca estatísticas de notícias
   * @returns Estatísticas agregadas
   */
  const fetchStats = useCallback(async (): Promise<NewsStats> => {
    const res = await authFetch(`${API_BASE}/api/noticias/stats`);
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Erro ao buscar estatísticas');
    }
    return res.json();
  }, [authFetch]);

  return {
    fetchNoticias,
    fetchFavorites,
    createNoticia,
    createNoticiasBatch,
    saveSummary,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    markAsRead,
    fetchStats,
    isAuthenticated
  };
};

export default useNoticiasAPI;

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE - Feed de Notícias
// v1.41.0 - Lista principal de notícias com scroll infinito
// ═══════════════════════════════════════════════════════════════════════════

import React, { useCallback, useEffect, useRef } from 'react';
import { Loader2, RefreshCw, Newspaper, AlertCircle } from 'lucide-react';
import { NewsCard } from './NewsCard';
import type { NewsItem, NoticiasLoadingState } from '../../types';

interface NewsFeedProps {
  news: NewsItem[];
  loading: NoticiasLoadingState;
  error: string | null;
  hasMore: boolean;
  totalCount: number;
  onLoadMore: () => void;
  onRefresh: () => void;
  onToggleFavorite: (id: string) => void;
  onGenerateSummary: (id: string) => void;
  onSelectNews: (news: NewsItem) => void;
  onMarkAsRead: (id: string) => void;
  summaryGeneratingId: string | null;
  favoriteLoadingId: string | null;
}

/**
 * Feed principal de notícias jurídicas
 */
export const NewsFeed: React.FC<NewsFeedProps> = ({
  news,
  loading,
  error,
  hasMore,
  totalCount,
  onLoadMore,
  onRefresh,
  onToggleFavorite,
  onGenerateSummary,
  onSelectNews,
  onMarkAsRead,
  summaryGeneratingId,
  favoriteLoadingId
}) => {
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Observer para scroll infinito
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading.feed) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loading.feed, onLoadMore]);

  // Handler para toggle de favorito
  const handleToggleFavorite = useCallback((id: string) => {
    onToggleFavorite(id);
  }, [onToggleFavorite]);

  // Handler para gerar resumo
  const handleGenerateSummary = useCallback((id: string) => {
    onGenerateSummary(id);
  }, [onGenerateSummary]);

  // Handler para selecionar notícia
  const handleSelectNews = useCallback((news: NewsItem) => {
    onSelectNews(news);
  }, [onSelectNews]);

  // Handler para marcar como lida
  const handleMarkAsRead = useCallback((id: string) => {
    onMarkAsRead(id);
  }, [onMarkAsRead]);

  // ═══════════════════════════════════════════════════════════════════════════
  // ESTADOS DE LOADING E ERRO
  // ═══════════════════════════════════════════════════════════════════════════

  if (loading.feed && news.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin mb-4" />
        <p className="theme-text-secondary">Carregando notícias...</p>
      </div>
    );
  }

  if (error && news.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
        <p className="theme-text-primary font-medium mb-2">Erro ao carregar notícias</p>
        <p className="theme-text-secondary text-sm mb-4">{error}</p>
        <button
          onClick={onRefresh}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Tentar novamente
        </button>
      </div>
    );
  }

  if (news.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Newspaper className="w-12 h-12 theme-text-muted mb-4" />
        <p className="theme-text-primary font-medium mb-2">Nenhuma notícia encontrada</p>
        <p className="theme-text-secondary text-sm mb-4">
          Ajuste os filtros ou aguarde novas publicações
        </p>
        <button
          onClick={onRefresh}
          disabled={loading.refresh}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          {loading.refresh ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          Buscar notícias
        </button>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LISTA DE NOTÍCIAS
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-4">
      {/* Header com contagem e refresh */}
      <div className="flex items-center justify-between">
        <p className="text-sm theme-text-muted">
          {totalCount > 0 ? (
            <>Mostrando {news.length} de {totalCount} notícias</>
          ) : (
            <>{news.length} notícias</>
          )}
        </p>
        <button
          onClick={onRefresh}
          disabled={loading.refresh}
          className="p-2 rounded-lg theme-bg-secondary hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
          title="Atualizar feed"
        >
          {loading.refresh ? (
            <Loader2 className="w-4 h-4 animate-spin theme-text-secondary" />
          ) : (
            <RefreshCw className="w-4 h-4 theme-text-secondary" />
          )}
        </button>
      </div>

      {/* Lista de cards */}
      <div className="space-y-3">
        {news.map((item) => (
          <NewsCard
            key={item.id}
            news={item}
            onToggleFavorite={handleToggleFavorite}
            onGenerateSummary={handleGenerateSummary}
            onSelect={handleSelectNews}
            onMarkAsRead={handleMarkAsRead}
            isGeneratingSummary={summaryGeneratingId === item.id}
            isFavoriteLoading={favoriteLoadingId === item.id}
          />
        ))}
      </div>

      {/* Trigger para scroll infinito */}
      <div ref={loadMoreRef} className="h-10 flex items-center justify-center">
        {loading.feed && news.length > 0 && (
          <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
        )}
        {!hasMore && news.length > 0 && (
          <p className="text-xs theme-text-muted">Fim das notícias</p>
        )}
      </div>
    </div>
  );
};

export default NewsFeed;

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE - Card de Notícia
// v1.41.0 - Card individual para exibição de notícia jurídica
// ═══════════════════════════════════════════════════════════════════════════

import React from 'react';
import { Star, BookOpen, ExternalLink, Loader2 } from 'lucide-react';
import { formatRelativeTime } from '../../utils/date-utils';
import { stripHtml } from '../../utils/html-utils';
import type { NewsItem } from '../../types';

interface NewsCardProps {
  news: NewsItem;
  onToggleFavorite: (id: string) => void;
  onGenerateSummary: (id: string) => void;
  onSelect: (news: NewsItem) => void;
  onMarkAsRead: (id: string) => void;
  isGeneratingSummary?: boolean;
  isFavoriteLoading?: boolean;
}

/**
 * Card de notícia individual
 * Usa React.memo para evitar re-renders desnecessários
 */
export const NewsCard = React.memo<NewsCardProps>(({
  news,
  onToggleFavorite,
  onGenerateSummary,
  onSelect,
  onMarkAsRead,
  isGeneratingSummary = false,
  isFavoriteLoading = false
}) => {
  const handleClick = () => {
    if (!news.isRead) {
      onMarkAsRead(news.id);
    }
    onSelect(news);
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite(news.id);
  };

  const handleSummaryClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!news.aiSummary && !isGeneratingSummary) {
      onGenerateSummary(news.id);
    }
  };

  const handleLinkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      onClick={handleClick}
      className="theme-card p-4 rounded-xl border theme-border-secondary hover:theme-border-primary transition-all cursor-pointer group"
    >
      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* HEADER: Título + Ações */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="flex justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            {/* Indicador de não lida */}
            {!news.isRead && (
              <span
                className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-2"
                title="Não lida"
              />
            )}
            <h3 className="font-semibold theme-text-primary line-clamp-2 group-hover:text-blue-400 transition-colors">
              {news.title}
            </h3>
          </div>
          <p className="text-sm theme-text-secondary mt-1 line-clamp-2">
            {stripHtml(news.description)}
          </p>
          <div className="flex items-center gap-2 mt-2 text-xs theme-text-muted flex-wrap">
            <span className="px-2 py-0.5 rounded theme-bg-secondary">
              {news.sourceName}
            </span>
            <span>{formatRelativeTime(news.publishedAt)}</span>
          </div>
        </div>

        {/* Botões de ação */}
        <div className="flex flex-col gap-2 flex-shrink-0">
          <button
            onClick={handleFavoriteClick}
            disabled={isFavoriteLoading}
            className="p-2 rounded-lg theme-bg-secondary theme-hover-bg transition-colors disabled:opacity-50"
            title={news.isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          >
            {isFavoriteLoading ? (
              <Loader2 className="w-4 h-4 animate-spin theme-text-secondary" />
            ) : (
              <Star
                className={`w-4 h-4 ${
                  news.isFavorite
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'theme-text-secondary'
                }`}
              />
            )}
          </button>
          <button
            onClick={handleSummaryClick}
            disabled={isGeneratingSummary || !!news.aiSummary}
            className={`p-2 rounded-lg transition-all ${
              news.aiSummary
                ? 'bg-green-600/20 text-green-400 cursor-default'
                : 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white disabled:opacity-50'
            }`}
            title={news.aiSummary ? 'Resumo já gerado' : 'Gerar resumo com IA'}
          >
            {isGeneratingSummary ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <BookOpen className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* RESUMO IA (se existir) */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {news.aiSummary && (
        <div className="mt-4 p-3 theme-info-box rounded-lg">
          <h4 className="font-medium text-blue-400 text-sm flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Resumo IA
          </h4>
          <div className="text-sm theme-text-primary mt-2 whitespace-pre-wrap line-clamp-6">
            {news.aiSummary}
          </div>
        </div>
      )}

      {/* Link externo */}
      <a
        href={news.link}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleLinkClick}
        className="mt-3 inline-flex items-center gap-1 text-xs text-blue-400 hover:underline"
      >
        <ExternalLink className="w-3 h-3" />
        Ler notícia completa
      </a>
    </div>
  );
});

NewsCard.displayName = 'NewsCard';

export default NewsCard;

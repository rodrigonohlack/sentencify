// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE - Detalhe de Notícia
// v1.41.0 - Visualização completa de notícia com resumo IA
// ═══════════════════════════════════════════════════════════════════════════

import React from 'react';
import {
  X, Star, BookOpen, ExternalLink, Loader2, Calendar, Building2, ArrowLeft
} from 'lucide-react';
import { formatFullDate, formatRelativeTime } from '../../utils/date-utils';
import { stripHtml } from '../../utils/html-utils';
import type { NewsItem } from '../../types';

interface NewsDetailProps {
  news: NewsItem;
  onClose: () => void;
  onToggleFavorite: (id: string) => void;
  onGenerateSummary: (id: string) => void;
  isGeneratingSummary: boolean;
  isFavoriteLoading: boolean;
  /** Quando true, renderiza apenas as seções de conteúdo (para uso dentro de BaseModal) */
  hideHeader?: boolean;
}

/**
 * Visualização detalhada de uma notícia
 */
export const NewsDetail: React.FC<NewsDetailProps> = ({
  news,
  onClose,
  onToggleFavorite,
  onGenerateSummary,
  isGeneratingSummary,
  isFavoriteLoading,
  hideHeader = false
}) => {
  // ═══════════════════════════════════════════════════════════════════════════
  // SEÇÕES DE CONTEÚDO (compartilhadas entre modo standalone e modal)
  // ═══════════════════════════════════════════════════════════════════════════

  const contentSections = (
    <>
      {/* Resumo IA */}
      <div className="theme-info-box rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-blue-400 flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Resumo IA
          </h2>
          {!news.aiSummary && (
            <button
              onClick={() => onGenerateSummary(news.id)}
              disabled={isGeneratingSummary}
              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-sm font-medium hover:from-blue-500 hover:to-cyan-500 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {isGeneratingSummary ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <BookOpen className="w-4 h-4" />
                  Gerar resumo
                </>
              )}
            </button>
          )}
        </div>

        {news.aiSummary ? (
          <div className="theme-text-primary whitespace-pre-wrap text-sm leading-relaxed">
            {news.aiSummary}
          </div>
        ) : (
          <p className="theme-text-muted text-sm italic">
            {isGeneratingSummary
              ? 'Gerando resumo com IA...'
              : 'Clique em "Gerar resumo" para criar um resumo desta notícia com IA.'}
          </p>
        )}

        {news.aiSummaryGeneratedAt && (
          <p className="text-xs theme-text-muted mt-3">
            Resumo gerado em {formatFullDate(news.aiSummaryGeneratedAt)}
          </p>
        )}
      </div>

      {/* Descrição original */}
      <div>
        <h2 className="font-semibold theme-text-primary mb-3">Descrição</h2>
        <p className="theme-text-secondary text-sm leading-relaxed">
          {stripHtml(news.description)}
        </p>
      </div>

      {/* Conteúdo completo (se disponível) */}
      {news.content && news.content !== news.description && (
        <div>
          <h2 className="font-semibold theme-text-primary mb-3">Conteúdo</h2>
          <div className="theme-text-secondary text-sm leading-relaxed whitespace-pre-wrap">
            {stripHtml(news.content)}
          </div>
        </div>
      )}

      {/* Temas/Tags */}
      {news.themes && news.themes.length > 0 && (
        <div>
          <h2 className="font-semibold theme-text-primary mb-3">Temas</h2>
          <div className="flex flex-wrap gap-2">
            {news.themes.map((theme, idx) => (
              <span
                key={idx}
                className="px-2 py-1 text-xs rounded-lg theme-bg-secondary theme-text-secondary"
              >
                {theme}
              </span>
            ))}
          </div>
        </div>
      )}
    </>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // MODO MODAL (hideHeader=true): apenas conteúdo, sem header/footer/wrapper
  // ═══════════════════════════════════════════════════════════════════════════

  if (hideHeader) {
    return <div className="space-y-6">{contentSections}</div>;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MODO STANDALONE (padrão): layout completo com header + footer
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="h-full flex flex-col theme-bg-primary">
      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* HEADER */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="p-4 border-b theme-border-secondary flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-sm theme-text-secondary hover:theme-text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleFavorite(news.id)}
              disabled={isFavoriteLoading}
              className="p-2 rounded-lg theme-bg-secondary hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
              title={news.isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
            >
              {isFavoriteLoading ? (
                <Loader2 className="w-5 h-5 animate-spin theme-text-secondary" />
              ) : (
                <Star
                  className={`w-5 h-5 ${
                    news.isFavorite
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'theme-text-secondary'
                  }`}
                />
              )}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg theme-bg-secondary hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
            >
              <X className="w-5 h-5 theme-text-secondary" />
            </button>
          </div>
        </div>

        <h1 className="text-xl font-bold theme-text-primary mb-2">
          {stripHtml(news.title)}
        </h1>

        <div className="flex flex-wrap items-center gap-3 text-sm theme-text-muted">
          <span className="flex items-center gap-1">
            <Building2 className="w-4 h-4" />
            {news.sourceName}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            {formatFullDate(news.publishedAt)}
          </span>
          <span className="text-xs">
            ({formatRelativeTime(news.publishedAt)})
          </span>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* CONTEÚDO */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {contentSections}
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* FOOTER */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="p-4 border-t theme-border-secondary flex-shrink-0">
        <a
          href={news.link}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-medium hover:from-blue-500 hover:to-cyan-500 transition-all"
        >
          <ExternalLink className="w-5 h-5" />
          Ler notícia completa no site original
        </a>
      </div>
    </div>
  );
};

export default NewsDetail;

/**
 * @file SuggestionCard.tsx
 * @description Card de sugestão de modelo com ranking e preview
 * @version 1.36.82
 */

import React from 'react';
import { Star, Tag } from 'lucide-react';
import type { SuggestionCardProps } from '../../types';

// Labels de Ranking
const rankingLabels: Record<number, string> = {
  5: 'Mais relevante',
  4: '2º lugar',
  3: '3º lugar',
  2: '4º lugar',
  1: '5º lugar',
};

export const SuggestionCard = React.memo(({
  model,
  index = 0,
  totalSuggestions = 5,
  onPreview,
  onInsert,
  sanitizeHTML,
  showRanking = true,
  similarity, // v1.33.18: % similaridade (opcional, vem de busca semântica)
}: SuggestionCardProps) => {
  // Validação de Props
  if (!model) {
    return null;
  }

  // Cálculo de Estrelas (5 para 1º, 4 para 2º, etc.)
  const stars = showRanking ? Math.max(1, totalSuggestions - index) : 0;

  // Preview Sanitizado (Memoizado para Performance)
  const sanitizedPreview = React.useMemo(
    () => sanitizeHTML ? sanitizeHTML(model.content?.substring(0, 300) || '') : (model.content?.substring(0, 300) || ''),
    [model.content, sanitizeHTML]
  );

  // v1.4.8: Hovers otimizados (sem state, manipulação direta do DOM)
  // Removidos states previewHover/insertHover para evitar re-renders

  return (
    <div className="theme-bg-secondary-50 p-4 rounded-lg border theme-border-input hover-theme-border transition-all card-hover-lift">

      {/* ─── Header: Título + Categoria + Favorito ─────────────────────────── */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h5 className="theme-text-primary font-semibold text-sm mb-1">
            {model.title}
          </h5>

          {/* Ranking com Estrelas */}
          {showRanking && stars > 0 && (
            <div className="flex items-center gap-2 mb-1">
              <span
                className="flex items-center gap-0.5 text-yellow-400"
                role="img"
                aria-label={`${stars} de 5 estrelas`}
              >
                {Array.from({ length: stars }).map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5" fill="currentColor" aria-hidden="true" />
                ))}
              </span>
              <span className="text-yellow-400/80 text-xs">
                ({rankingLabels[stars]})
              </span>
            </div>
          )}
          {/* v1.33.20: Badge de similaridade (independente do ranking) */}
          {similarity && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-green-600 text-white inline-block mb-1 animate-badge">
              {Math.round(similarity * 100)}% similar
            </span>
          )}
        </div>

        {/* Badge de Categoria */}
        {model.category && (
          <span className="px-2 py-1 theme-bg-purple-accent theme-text-purple rounded text-xs ml-2 max-w-[120px] truncate" title={model.category}>
            {model.category}
          </span>
        )}

        {/* Ícone de Favorito */}
        {model.favorite && (
          <span className="text-yellow-400 ml-1" title="Modelo favorito">
            <Star className="w-4 h-4 inline" fill="currentColor" aria-label="favorito" />
          </span>
        )}
      </div>

      {/* ─── Keywords ────────────────────────────────────────────────────────  */}
      {model.keywords && (
        <div className="theme-text-muted text-xs mb-2 flex items-center gap-1">
          <Tag className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
          {model.keywords}
        </div>
      )}

      {/* ─── Preview do Conteúdo (3 linhas) ─────────────────────────────────  */}
      <div
        className="theme-text-muted text-xs mb-3 line-clamp-3"
        dangerouslySetInnerHTML={{ __html: sanitizedPreview }}
      />

      {/* ─── Botões de Ação ──────────────────────────────────────────────────  */}
      <div className="flex gap-2">

        {/* Botão Visualizar */}
        <button
          onClick={() => onPreview(model)}
          className="flex-1 py-2 border border-blue-500 text-blue-400 rounded text-sm font-medium flex items-center justify-center gap-2 hover-blue-alpha-10-from-transparent"
          aria-label={`Visualizar modelo ${model.title}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          Visualizar
        </button>

        {/* Botão Inserir */}
        <button
          onClick={() => onInsert(model.content)}
          className="hover-suggestion-insert flex-1 py-2 text-white rounded text-sm font-medium"
          aria-label={`Inserir modelo ${model.title} no editor`}
        >
          Inserir
        </button>
      </div>
    </div>
  );
});

SuggestionCard.displayName = 'SuggestionCard';

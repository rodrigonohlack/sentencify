/**
 * @file ModelSearchPanel.tsx
 * @description Painel de busca de modelos em split view
 * @version 1.36.87
 *
 * Extraido do App.tsx como parte da FASE 3 de refatoracao.
 * v1.9.23: Busca de modelos com filtro por categoria
 */

import React from 'react';
import { BookOpen, Search, Plus, X } from 'lucide-react';
import type { ModelSearchPanelProps, Model } from '../../types';

export const ModelSearchPanel = React.memo(({
  models,
  onInsert,
  onPreview,
  sanitizeHTML
}: ModelSearchPanelProps) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState('all');

  const filteredModels = React.useMemo(() => {
    return (models || []).filter((m: Model) => {
      const matchesSearch = !searchTerm ||
        (m.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (Array.isArray(m.keywords) ? m.keywords.join(' ') : (m.keywords || '')).toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || m.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [models, searchTerm, selectedCategory]);

  const categories = React.useMemo(() => {
    const cats = new Set((models || []).map((m: Model) => m.category).filter(Boolean));
    return ['all', ...Array.from(cats)];
  }, [models]);

  return (
    <div className="model-search-panel">
      {/* Header */}
      <div className="p-3 border-b theme-border-primary">
        <h3 className="text-sm font-semibold theme-text-primary mb-2 flex items-center gap-2">
          <BookOpen className="w-4 h-4" />
          Biblioteca de Modelos
        </h3>

        {/* Campo de busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 theme-text-muted" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && setSearchTerm('')}
            placeholder="Buscar por titulo ou palavras-chave..."
            className="w-full pl-9 pr-8 py-2 text-sm rounded theme-bg-secondary theme-border-input border theme-text-primary"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 theme-text-muted hover-text-primary" title="Limpar (Esc)">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filtro de categoria */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="w-full mt-2 px-3 py-2 text-sm rounded theme-bg-secondary theme-border-input border theme-text-primary"
        >
          {categories.map(cat => (
            <option key={cat} value={cat}>
              {cat === 'all' ? 'Todas as categorias' : cat}
            </option>
          ))}
        </select>
      </div>

      {/* Lista de modelos */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredModels.length === 0 ? (
          <p className="text-sm theme-text-muted text-center py-4">
            Nenhum modelo encontrado
          </p>
        ) : (
          filteredModels.map((model: Model) => (
            <div
              key={model.id}
              className="p-3 rounded border theme-border-primary theme-bg-secondary"
            >
              <h4 className="text-sm font-medium theme-text-primary truncate">
                {model.title}
              </h4>
              {model.keywords && (
                <p className="text-xs theme-text-muted mt-1 truncate">
                  {model.keywords}
                </p>
              )}
              <div
                className="text-xs theme-text-secondary mt-2 line-clamp-2"
                dangerouslySetInnerHTML={{ __html: sanitizeHTML ? sanitizeHTML(model.content || '').substring(0, 150) + '...' : '' }}
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => onPreview && onPreview(model)}
                  className="flex-1 px-2 py-1.5 text-xs rounded theme-bg-tertiary theme-text-primary hover-slate-600 flex items-center justify-center gap-1"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Ver
                </button>
                <button
                  onClick={() => onInsert && onInsert(model.content)}
                  className="flex-1 px-2 py-1.5 text-xs rounded bg-blue-600 text-white hover-blue-700 flex items-center justify-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Inserir
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer com contagem */}
      <div className="p-2 border-t theme-border-primary text-xs theme-text-muted text-center">
        {filteredModels.length} modelo(s) encontrado(s)
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.models === nextProps.models &&
    prevProps.onInsert === nextProps.onInsert &&
    prevProps.onPreview === nextProps.onPreview &&
    prevProps.sanitizeHTML === nextProps.sanitizeHTML
  );
});

ModelSearchPanel.displayName = 'ModelSearchPanel';

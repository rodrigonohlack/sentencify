/**
 * @file SlashCommandMenu.tsx
 * @description Menu de comandos slash para acesso rapido a modelos
 * @version 1.36.93
 *
 * Extraido do App.tsx como parte da FASE 3 de refatoracao.
 * v1.33.8: Viewport-aware positioning, tooltip preview, toggle busca semantica
 */

import React from 'react';
import type { Model, SlashCommandMenuProps } from '../../types';

export const SlashCommandMenu: React.FC<SlashCommandMenuProps> = ({
  isOpen,
  position,
  models,
  searchTerm,
  selectedIndex,
  onSelect,
  onClose,
  onSearchChange,
  onNavigate,
  semanticAvailable,
  searchModelsBySimilarity
}) => {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const listRef = React.useRef<HTMLDivElement | null>(null);
  const menuRef = React.useRef<HTMLDivElement | null>(null);

  // v1.33.8: Estado para toggle busca semantica
  const [useSemanticSearch, setUseSemanticSearch] = React.useState(false);
  const [semanticResults, setSemanticResults] = React.useState<Model[] | null>(null);
  const [isSearching, setIsSearching] = React.useState(false);

  // v1.33.8: Ajustar posicao para ficar dentro da viewport
  const adjustedPosition = React.useMemo(() => {
    const menuHeight = 360;
    const menuWidth = 320;
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;

    let top = position.top;
    let left = position.left;

    if (top + menuHeight > viewportHeight - 20) {
      top = Math.max(20, viewportHeight - menuHeight - 20);
    }

    if (left + menuWidth > viewportWidth - 20) {
      left = Math.max(20, viewportWidth - menuWidth - 20);
    }

    return { top, left };
  }, [position]);

  // v1.33.8: Busca semantica com debounce
  React.useEffect(() => {
    if (!useSemanticSearch || !searchModelsBySimilarity || !searchTerm || searchTerm.trim().length < 2) {
      setSemanticResults(null);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchModelsBySimilarity(models, searchTerm.toLowerCase(), { threshold: 0.3, limit: 10 });
        setSemanticResults(results as Model[]);
      } catch (error) {
        console.error('[SlashCommand] Erro na busca semantica:', error);
        setSemanticResults(null);
      }
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, useSemanticSearch, models, searchModelsBySimilarity]);

  // Filtrar modelos pelo termo de busca (textual)
  const filteredModels = React.useMemo(() => {
    if (useSemanticSearch && semanticResults) {
      return semanticResults;
    }
    if (!models || models.length === 0) return [];
    const term = (searchTerm || '').toLowerCase().trim();
    if (!term) return models.slice(0, 10);
    return models.filter((m: Model) =>
      m.title.toLowerCase().includes(term) ||
      (m.keywords && (Array.isArray(m.keywords) ? m.keywords.join(' ') : m.keywords).toLowerCase().includes(term))
    ).slice(0, 10);
  }, [models, searchTerm, useSemanticSearch, semanticResults]);

  // Auto-focus no input quando abre
  React.useEffect(() => {
    if (isOpen && inputRef.current) {
      const timeoutId = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timeoutId);
    }
  }, [isOpen]);

  // Scroll para item selecionado
  React.useEffect(() => {
    if (listRef.current && filteredModels.length > 0) {
      const selectedEl = listRef.current.children[selectedIndex];
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex, filteredModels.length]);

  // Handler de teclado
  const handleKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        onNavigate?.('down', filteredModels.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        onNavigate?.('up', filteredModels.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredModels[selectedIndex]) {
          onSelect?.(filteredModels[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose?.();
        break;
      case 'Tab':
        e.preventDefault();
        onClose?.();
        break;
    }
  }, [filteredModels, selectedIndex, onSelect, onClose, onNavigate]);

  if (!isOpen) return null;

  // v1.33.8: Helper para extrair texto puro do HTML (para tooltip)
  const getPreviewText = (content: string) => {
    if (!content) return 'Sem conteudo';
    return content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  };

  return (
    <div
      ref={menuRef}
      className="slash-command-menu fixed z-[100] theme-bg-secondary border theme-border-input rounded-lg shadow-xl w-80"
      style={{ top: adjustedPosition.top, left: adjustedPosition.left, maxHeight: '360px' }}
    >
      <div className="p-2 border-b theme-border-input flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange?.(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={useSemanticSearch ? "Busca semantica..." : "Buscar modelo..."}
          className="flex-1 px-2 py-1.5 theme-bg-primary theme-text-primary border theme-border-input rounded text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
        />
        {/* v1.33.8: Toggle busca semantica */}
        {semanticAvailable && (
          <button
            onClick={() => {
              setUseSemanticSearch((prev: boolean) => !prev);
              setSemanticResults(null);
            }}
            className={`p-1.5 rounded text-sm transition-colors ${
              useSemanticSearch
                ? 'bg-purple-600 text-white hover:bg-purple-700'
                : 'theme-bg-tertiary theme-text-secondary hover-slate-600'
            }`}
            title={useSemanticSearch ? 'Busca semantica (por significado)' : 'Busca textual (por palavras)'}
          >
            {useSemanticSearch ? '🧠' : '🔤'}
          </button>
        )}
        <button
          onClick={onClose}
          className="p-1 rounded hover-slate-600 theme-text-muted"
          title="Fechar (Esc)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div ref={listRef} className="overflow-y-auto" style={{ maxHeight: '280px' }}>
        {isSearching ? (
          <div className="px-3 py-4 text-sm theme-text-muted text-center">
            <span className="animate-pulse">Buscando...</span>
          </div>
        ) : filteredModels.length === 0 ? (
          <div className="px-3 py-4 text-sm theme-text-muted text-center">
            Nenhum modelo encontrado
          </div>
        ) : (
          filteredModels.map((model: Model, idx: number) => (
            <div
              key={model.id}
              onClick={() => onSelect?.(model)}
              className={`px-3 py-2 cursor-pointer border-l-2 ${
                idx === selectedIndex
                  ? 'bg-purple-600/30 border-purple-500'
                  : 'border-transparent hover-slate-700'
              }`}
              title={getPreviewText(model.content)}
            >
              <div className="flex items-center gap-2">
                <div className="text-sm font-medium theme-text-primary truncate flex-1">{model.title}</div>
                {/* v1.33.8: Badge de similaridade (busca semantica) */}
                {/* v1.33.9: Fix contraste tema claro */}
                {model.similarity !== undefined && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                    model.similarity >= 0.7 ? 'bg-green-500/20 text-green-700 dark:text-green-400' :
                    model.similarity >= 0.5 ? 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400' :
                    'bg-gray-500/20 text-gray-700 dark:text-gray-400'
                  }`}>
                    {Math.round(model.similarity * 100)}%
                  </span>
                )}
              </div>
              <div className="text-xs theme-text-muted truncate">{model.category}</div>
            </div>
          ))
        )}
      </div>
      <div className="px-3 py-1.5 border-t theme-border-input text-xs theme-text-muted flex items-center gap-2">
        <span>↑↓</span> navegar
        <span className="mx-1">·</span>
        <span>Enter</span> inserir
        <span className="mx-1">·</span>
        <span>Esc</span> fechar
        {useSemanticSearch && <span className="ml-auto text-purple-400">🧠</span>}
      </div>
    </div>
  );
};

SlashCommandMenu.displayName = 'SlashCommandMenu';

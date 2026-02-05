// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE - Filtros de Notícias
// v1.41.0 - Painel de filtros para o feed de notícias
// ═══════════════════════════════════════════════════════════════════════════

import React, { useCallback, useMemo } from 'react';
import { Search, Filter, Star, Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react';
import { PERIOD_OPTIONS } from '../../constants/sources';
import type { NewsSource, NewsFilters as NewsFiltersType, NewsPeriod } from '../../types';

interface NewsFiltersProps {
  filters: NewsFiltersType;
  sources: NewsSource[];
  onFiltersChange: (filters: Partial<NewsFiltersType>) => void;
  onResetFilters: () => void;
}

/**
 * Painel de filtros para notícias jurídicas
 */
export const NewsFilters: React.FC<NewsFiltersProps> = ({
  filters,
  sources,
  onFiltersChange,
  onResetFilters
}) => {
  const [isSourcesExpanded, setIsSourcesExpanded] = React.useState(false);

  // Separar fontes por tipo
  const tribunais = useMemo(
    () => sources.filter(s => s.type === 'tribunal'),
    [sources]
  );
  const portais = useMemo(
    () => sources.filter(s => s.type === 'portal'),
    [sources]
  );

  // Handler para busca com debounce
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({ searchQuery: e.target.value });
  }, [onFiltersChange]);

  // Handler para período
  const handlePeriodChange = useCallback((period: NewsPeriod) => {
    onFiltersChange({ period });
  }, [onFiltersChange]);

  // Handler para toggle de fonte no filtro
  const handleSourceToggle = useCallback((sourceId: string) => {
    const currentSources = filters.sources;
    const newSources = currentSources.includes(sourceId)
      ? currentSources.filter(id => id !== sourceId)
      : [...currentSources, sourceId];
    onFiltersChange({ sources: newSources });
  }, [filters.sources, onFiltersChange]);

  // Selecionar/desmarcar todas as fontes
  const handleSelectAllSources = useCallback((type: 'tribunal' | 'portal') => {
    const typeSourceIds = sources
      .filter(s => s.type === type)
      .map(s => s.id);

    const allSelected = typeSourceIds.every(id => filters.sources.includes(id));

    if (allSelected) {
      // Desmarcar todas do tipo
      onFiltersChange({
        sources: filters.sources.filter(id => !typeSourceIds.includes(id))
      });
    } else {
      // Selecionar todas do tipo
      const newSources = [...new Set([...filters.sources, ...typeSourceIds])];
      onFiltersChange({ sources: newSources });
    }
  }, [sources, filters.sources, onFiltersChange]);

  // Verificar se há filtros ativos
  const hasActiveFilters = useMemo(() => (
    filters.sources.length > 0 ||
    filters.searchQuery ||
    filters.period !== 'week' ||
    filters.onlyFavorites ||
    filters.onlyUnread
  ), [filters]);

  return (
    <div className="space-y-4">
      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* BUSCA */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 theme-text-muted" />
        <input
          type="text"
          placeholder="Buscar notícias..."
          value={filters.searchQuery}
          onChange={handleSearchChange}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl theme-bg-secondary border theme-border-modal theme-text-primary placeholder:theme-text-disabled focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        />
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* PERÍODO */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div>
        <label className="block text-xs font-medium theme-text-muted mb-2">
          Período
        </label>
        <div className="flex flex-wrap gap-1">
          {PERIOD_OPTIONS.map(option => (
            <button
              key={option.value}
              onClick={() => handlePeriodChange(option.value)}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                filters.period === option.value
                  ? 'bg-blue-600 text-white'
                  : 'theme-bg-secondary theme-text-secondary hover:theme-bg-tertiary'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* TOGGLES RÁPIDOS */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="flex gap-2">
        <button
          onClick={() => onFiltersChange({ onlyFavorites: !filters.onlyFavorites })}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${
            filters.onlyFavorites
              ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
              : 'theme-bg-secondary theme-text-secondary hover:theme-bg-tertiary'
          }`}
        >
          <Star className={`w-4 h-4 ${filters.onlyFavorites ? 'fill-yellow-400' : ''}`} />
          Favoritos
        </button>
        <button
          onClick={() => onFiltersChange({ onlyUnread: !filters.onlyUnread })}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${
            filters.onlyUnread
              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
              : 'theme-bg-secondary theme-text-secondary hover:theme-bg-tertiary'
          }`}
        >
          {filters.onlyUnread ? (
            <EyeOff className="w-4 h-4" />
          ) : (
            <Eye className="w-4 h-4" />
          )}
          Não lidas
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* FONTES (colapsável) */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div>
        <button
          onClick={() => setIsSourcesExpanded(!isSourcesExpanded)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg theme-bg-secondary hover:theme-bg-tertiary transition-colors"
        >
          <span className="flex items-center gap-2 text-sm theme-text-secondary">
            <Filter className="w-4 h-4" />
            Fontes
            {filters.sources.length > 0 && (
              <span className="px-1.5 py-0.5 text-xs rounded bg-blue-600 text-white">
                {filters.sources.length}
              </span>
            )}
          </span>
          {isSourcesExpanded ? (
            <ChevronUp className="w-4 h-4 theme-text-muted" />
          ) : (
            <ChevronDown className="w-4 h-4 theme-text-muted" />
          )}
        </button>

        {isSourcesExpanded && (
          <div className="mt-2 space-y-3 pl-2">
            {/* Portais */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium theme-text-muted">
                  Portais Jurídicos
                </span>
                <button
                  onClick={() => handleSelectAllSources('portal')}
                  className="text-xs text-blue-400 hover:underline"
                >
                  {portais.every(p => filters.sources.includes(p.id))
                    ? 'Desmarcar'
                    : 'Selecionar'}
                </button>
              </div>
              <div className="space-y-1">
                {portais.map(source => (
                  <label
                    key={source.id}
                    className="flex items-center gap-2 p-1.5 rounded hover:theme-bg-secondary cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={filters.sources.includes(source.id)}
                      onChange={() => handleSourceToggle(source.id)}
                      className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs theme-text-secondary">
                      {source.name}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Tribunais */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium theme-text-muted">
                  Tribunais ({tribunais.length})
                </span>
                <button
                  onClick={() => handleSelectAllSources('tribunal')}
                  className="text-xs text-blue-400 hover:underline"
                >
                  {tribunais.every(t => filters.sources.includes(t.id))
                    ? 'Desmarcar'
                    : 'Selecionar'}
                </button>
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1 pr-2">
                {tribunais.map(source => (
                  <label
                    key={source.id}
                    className="flex items-center gap-2 p-1.5 rounded hover:theme-bg-secondary cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={filters.sources.includes(source.id)}
                      onChange={() => handleSourceToggle(source.id)}
                      className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs theme-text-secondary truncate">
                      {source.name}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* LIMPAR FILTROS */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {hasActiveFilters && (
        <button
          onClick={onResetFilters}
          className="w-full px-3 py-2 text-xs rounded-lg theme-bg-secondary text-red-400 hover:bg-red-500/10 transition-colors"
        >
          Limpar filtros
        </button>
      )}
    </div>
  );
};

export default NewsFilters;

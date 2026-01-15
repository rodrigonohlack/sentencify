/**
 * @file FullscreenModelPanel.tsx
 * @description Painel de sugestoes de modelos em split view
 * @version 1.36.87
 *
 * Extraido do App.tsx como parte da FASE 3 de refatoracao.
 * v1.9.32: Sugestoes de modelos com IA
 */

import React from 'react';
import { BookOpen, Search, Sparkles, X } from 'lucide-react';
import { SuggestionCard } from '../cards';
import type { FullscreenModelPanelProps, Model, TopicCategory } from '../../types';

export const FullscreenModelPanel = React.memo(({
  models,
  topicTitle = '',
  topicCategory = '',
  topicRelatorio = '',
  onInsert,
  onPreview,
  sanitizeHTML,
  onFindSuggestions
}: FullscreenModelPanelProps) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [searchResults, setSearchResults] = React.useState<Model[]>([]);
  const [suggestions, setSuggestions] = React.useState<Model[]>([]);
  const [suggestionsSource, setSuggestionsSource] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  // Stopwords para scoring local (fallback se IA nao disponivel)
  const STOPWORDS = React.useMemo(() => new Set([
    'de', 'da', 'do', 'das', 'dos', 'em', 'na', 'no', 'nas', 'nos', 'para', 'por', 'com', 'sem',
    'o', 'a', 'os', 'as', 'e', 'ou', 'mas', 'que', 'qual', 'quando', 'onde', 'como'
  ]), []);

  // Funcao de scoring local (fallback)
  const scoreModelLocal = React.useCallback((model: Model) => {
    if (!topicTitle) return 0;
    let score = 0;

    const titleLower = topicTitle.toLowerCase();
    const modelTitleLower = (model.title || '').toLowerCase();

    const titleWords = titleLower.split(/\s+/).filter((w: string) => w.length > 2 && !STOPWORDS.has(w));
    const modelWords = modelTitleLower.split(/\s+/).filter((w: string) => w.length > 2 && !STOPWORDS.has(w));

    titleWords.forEach((titleWord: string) => {
      if (modelWords.includes(titleWord)) score += 10;
    });

    titleWords.forEach((titleWord: string) => {
      modelWords.forEach((modelWord: string) => {
        if (titleWord !== modelWord && (titleWord.includes(modelWord) || modelWord.includes(titleWord))) {
          score += 5;
        }
      });
    });

    if (model.category && topicCategory && model.category.toUpperCase() === topicCategory.toUpperCase()) {
      score += 8;
    }

    if (model.keywords) {
      const keywordsStr = Array.isArray(model.keywords) ? model.keywords.join(',') : model.keywords;
      const keywords = keywordsStr.toLowerCase().split(',').map((k: string) => k.trim()).filter((k: string) => k.length > 0);
      keywords.forEach((keyword: string) => {
        if (titleLower.includes(keyword) || keyword.includes(titleLower.replace(/\s+/g, ''))) {
          score += 12;
        }
      });
    }

    return score;
  }, [topicTitle, topicCategory, STOPWORDS]);

  React.useEffect(() => {
    if (!models || models.length === 0 || !topicTitle) {
      setSuggestions([]);
      return;
    }

    // Se temos funcao de IA, usar ela
    if (onFindSuggestions) {
      setLoading(true);
      // Yield para UI nao travar + async para aguardar
      (async () => {
        await new Promise(r => setTimeout(r, 0));
        try {
          const result = await onFindSuggestions({
            title: topicTitle,
            category: (topicCategory || 'MÉRITO') as TopicCategory,
            relatorio: topicRelatorio || ''
          });
          // Suporta novo formato { suggestions, source }
          if (result?.suggestions) {
            setSuggestions(result.suggestions);
            setSuggestionsSource(result.source);
          } else if (Array.isArray(result)) {
            setSuggestions(result);
            setSuggestionsSource(null);
          } else {
            setSuggestions([]);
            setSuggestionsSource(null);
          }
        } catch (err) {
          // Fallback para scoring local em caso de erro
          type ScoredModel = Model & { score: number };
          const scoredModels = models
            .map((m: Model): ScoredModel => ({ ...m, score: scoreModelLocal(m) }))
            .filter((m: ScoredModel) => m.score > 0)
            .sort((a: ScoredModel, b: ScoredModel) => b.score - a.score)
            .slice(0, 5);
          setSuggestions(scoredModels);
          setSuggestionsSource(null);
        } finally {
          setLoading(false);
        }
      })();
    } else {
      // Fallback: scoring local
      type ScoredModel = Model & { score: number };
      const scoredModels = models
        .map((m: Model): ScoredModel => ({ ...m, score: scoreModelLocal(m) }))
        .filter((m: ScoredModel) => m.score > 0)
        .sort((a: ScoredModel, b: ScoredModel) => b.score - a.score)
        .slice(0, 5);
      setSuggestions(scoredModels);
    }
  }, [models, topicTitle, topicCategory, topicRelatorio, onFindSuggestions, scoreModelLocal]);

  // Busca manual com debounce
  const searchTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);

    // Debounce 300ms
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      if (!term.trim()) {
        setSearchResults([]);
        return;
      }

      const termLower = term.toLowerCase();
      const results = (models || [])
        .filter((m: Model) => {
          const titleMatch = (m.title || '').toLowerCase().includes(termLower);
          const kwStr = Array.isArray(m.keywords) ? m.keywords.join(' ') : (m.keywords || '');
          const keywordsMatch = kwStr.toLowerCase().includes(termLower);
          const contentMatch = (m.content || '').toLowerCase().includes(termLower);
          return titleMatch || keywordsMatch || contentMatch;
        })
        .slice(0, 10); // Max 10 resultados

      setSearchResults(results);
    }, 300);
  }, [models]);

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="model-search-panel">
      {/* Header */}
      <div className="p-3 border-b theme-border-primary">
        <h3 className="text-sm font-semibold theme-text-primary mb-2 flex items-center gap-2">
          <BookOpen className="w-4 h-4" />
          Modelos Sugeridos
        </h3>

        {/* Campo de busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 theme-text-muted" />
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            onKeyDown={(e) => e.key === 'Escape' && handleSearchChange({ target: { value: '' } } as React.ChangeEvent<HTMLInputElement>)}
            placeholder="Buscar modelos..."
            className="w-full pl-9 pr-8 py-2 text-sm rounded theme-bg-secondary theme-border-input border theme-text-primary"
          />
          {searchTerm && (
            <button onClick={() => handleSearchChange({ target: { value: '' } } as React.ChangeEvent<HTMLInputElement>)} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 theme-text-muted hover-text-primary" title="Limpar (Esc)">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Conteudo scrollavel */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">

        {/* Resultados da busca manual (se houver) */}
        {searchResults.length > 0 && (
          <div>
            <h4 className="text-xs font-medium theme-text-muted mb-2 flex items-center gap-1">
              <Search className="w-3 h-3" />
              Resultados da Busca ({searchResults.length})
            </h4>
            <div className="space-y-2">
              {searchResults.map((model: Model) => (
                <SuggestionCard
                  key={`search-${model.id}`}
                  model={model}
                  similarity={model.similarity}
                  onPreview={onPreview}
                  onInsert={onInsert}
                  sanitizeHTML={sanitizeHTML}
                  showRanking={false}
                />
              ))}
            </div>
          </div>
        )}

        {/* Separador se houver busca e sugestoes */}
        {searchResults.length > 0 && suggestions.length > 0 && (
          <div className="border-t theme-border-primary my-3" />
        )}

        {/* Loading da IA */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-sm theme-text-muted">Analisando modelos com IA...</p>
          </div>
        ) : suggestions.length > 0 ? (
          <div>
            <h4 className="text-xs font-medium theme-text-muted mb-2 flex items-center gap-2">
              <Sparkles className="w-3 h-3" />
              Sugestoes para "{topicTitle}" ({suggestions.length})
              {suggestionsSource === 'local' && <span className="bg-purple-600 text-white px-1.5 py-0.5 rounded text-[10px]">IA Local</span>}
            </h4>
            <div className="space-y-2">
              {suggestions.map((model, idx) => (
                <SuggestionCard
                  key={`suggestion-${model.id}`}
                  model={model}
                  similarity={model.similarity}
                  index={idx}
                  totalSuggestions={suggestions.length}
                  onPreview={onPreview}
                  onInsert={onInsert}
                  sanitizeHTML={sanitizeHTML}
                  showRanking={true}
                />
              ))}
            </div>
          </div>
        ) : !searchResults.length && (
          <p className="text-sm theme-text-muted text-center py-4">
            {topicTitle
              ? 'Nenhuma sugestão encontrada para este tópico'
              : 'Selecione um tópico para ver sugestões'}
          </p>
        )}
      </div>

      {/* Footer com contagem */}
      <div className="p-2 border-t theme-border-primary text-xs theme-text-muted text-center">
        {searchResults.length > 0
          ? `${searchResults.length} resultado(s) da busca`
          : `${suggestions.length} sugestao(oes) automatica(s)`}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.models === nextProps.models &&
    prevProps.topicTitle === nextProps.topicTitle &&
    prevProps.topicCategory === nextProps.topicCategory &&
    prevProps.topicRelatorio === nextProps.topicRelatorio &&
    prevProps.onInsert === nextProps.onInsert &&
    prevProps.onPreview === nextProps.onPreview &&
    prevProps.sanitizeHTML === nextProps.sanitizeHTML &&
    prevProps.onFindSuggestions === nextProps.onFindSuggestions
  );
});

FullscreenModelPanel.displayName = 'FullscreenModelPanel';

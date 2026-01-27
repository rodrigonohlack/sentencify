/**
 * @file ContextScopeSelector.tsx
 * @description Componente unificado para seleção de escopo de contexto no Assistente IA
 * @version 1.38.16 - Toggle bloqueado quando chat tem histórico
 *
 * Unifica o código duplicado entre AIAssistantModal e AIAssistantGlobalModal.
 * Oferece 3 opções de escopo:
 * - 'current': Apenas o tópico atual
 * - 'selected': Tópicos selecionados pelo usuário
 * - 'all': Toda a decisão (RELATÓRIO + todos os tópicos)
 *
 * Também inclui toggle para incluir/excluir petições e contestações.
 * v1.38.16: Toggle bloqueado quando chat tem histórico (para manter consistência do contexto)
 */

import * as React from 'react';
import { ChevronDown, ChevronUp, Check } from 'lucide-react';
import type { Topic, ContextScope } from '../../types';
import { CSS } from '../../constants/styles';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

export interface ContextScopeSelectorProps {
  /** Escopo atual selecionado */
  contextScope: ContextScope;
  /** Callback para alterar o escopo */
  setContextScope: (scope: ContextScope) => void;
  /** Lista de todos os tópicos disponíveis */
  allTopics: Topic[];
  /** Título do tópico sendo editado atualmente */
  currentTopicTitle: string;
  /** Lista de títulos dos tópicos selecionados (para escopo 'selected') */
  selectedContextTopics: string[];
  /** Callback para alterar os tópicos selecionados */
  setSelectedContextTopics: (topics: string[]) => void;
  /** Se deve incluir petições e contestações no contexto */
  includeMainDocs: boolean;
  /** Callback para alterar o toggle de documentos */
  setIncludeMainDocs: (include: boolean) => void;
  /** v1.39.06: Se deve incluir documentos complementares no contexto */
  includeComplementaryDocs: boolean;
  /** v1.39.06: Callback para alterar o toggle de documentos complementares */
  setIncludeComplementaryDocs: (include: boolean) => void;
  /** v1.38.16: Tamanho do histórico de chat (0 = limpo, >0 = tem histórico) */
  chatHistoryLength?: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

export const ContextScopeSelector: React.FC<ContextScopeSelectorProps> = ({
  contextScope,
  setContextScope,
  allTopics,
  currentTopicTitle,
  selectedContextTopics,
  setSelectedContextTopics,
  includeMainDocs,
  setIncludeMainDocs,
  includeComplementaryDocs,  // v1.39.06
  setIncludeComplementaryDocs,  // v1.39.06
  chatHistoryLength = 0  // v1.38.16
}) => {
  // v1.38.16: Toggle bloqueado quando chat tem histórico
  const isToggleLocked = chatHistoryLength > 0;
  const [showTopicDropdown, setShowTopicDropdown] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Fechar dropdown ao clicar fora
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowTopicDropdown(false);
      }
    };
    if (showTopicDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showTopicDropdown]);

  // Filtrar tópicos especiais (RELATÓRIO e DISPOSITIVO não devem aparecer na lista)
  const selectableTopics = React.useMemo(() => {
    return allTopics.filter(t => {
      const titleUpper = t.title.toUpperCase();
      return titleUpper !== 'RELATÓRIO' && titleUpper !== 'DISPOSITIVO';
    });
  }, [allTopics]);

  // Toggle de tópico na seleção
  const toggleTopic = React.useCallback((topicTitle: string) => {
    if (selectedContextTopics.includes(topicTitle)) {
      setSelectedContextTopics(selectedContextTopics.filter(t => t !== topicTitle));
    } else {
      setSelectedContextTopics([...selectedContextTopics, topicTitle]);
    }
  }, [selectedContextTopics, setSelectedContextTopics]);

  // Selecionar todos
  const selectAll = React.useCallback(() => {
    setSelectedContextTopics(selectableTopics.map(t => t.title));
  }, [selectableTopics, setSelectedContextTopics]);

  // Desselecionar todos
  const deselectAll = React.useCallback(() => {
    setSelectedContextTopics([]);
  }, [setSelectedContextTopics]);

  return (
    <div className="space-y-3">
      {/* Label */}
      <label className={CSS.label}>Escopo do Contexto</label>

      {/* Radio buttons - 3 opções */}
      <div className="flex flex-wrap gap-2">
        {/* Apenas este tópico */}
        <label className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${
          contextScope === 'current'
            ? 'border-purple-500 bg-purple-500/10'
            : 'theme-border-input theme-bg-secondary-30 hover:border-purple-500/50'
        }`}>
          <input
            type="radio"
            name="contextScope"
            value="current"
            checked={contextScope === 'current'}
            onChange={() => setContextScope('current')}
            className="w-4 h-4 text-purple-600"
          />
          <div>
            <span className="text-sm font-medium theme-text-primary">Apenas este tópico</span>
            <p className="text-xs theme-text-muted">Mini-relatório + decisão do tópico atual</p>
          </div>
        </label>

        {/* Tópicos selecionados */}
        <label className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${
          contextScope === 'selected'
            ? 'border-purple-500 bg-purple-500/10'
            : 'theme-border-input theme-bg-secondary-30 hover:border-purple-500/50'
        }`}>
          <input
            type="radio"
            name="contextScope"
            value="selected"
            checked={contextScope === 'selected'}
            onChange={() => setContextScope('selected')}
            className="w-4 h-4 text-purple-600"
          />
          <div>
            <span className="text-sm font-medium theme-text-primary">Tópicos selecionados</span>
            <p className="text-xs theme-text-muted">Escolha quais tópicos incluir</p>
          </div>
        </label>

        {/* Toda a decisão */}
        <label className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${
          contextScope === 'all'
            ? 'border-purple-500 bg-purple-500/10'
            : 'theme-border-input theme-bg-secondary-30 hover:border-purple-500/50'
        }`}>
          <input
            type="radio"
            name="contextScope"
            value="all"
            checked={contextScope === 'all'}
            onChange={() => setContextScope('all')}
            className="w-4 h-4 text-purple-600"
          />
          <div>
            <span className="text-sm font-medium theme-text-primary">Toda a decisão</span>
            <p className="text-xs theme-text-muted">RELATÓRIO + todos os tópicos</p>
          </div>
        </label>
      </div>

      {/* Dropdown de seleção de tópicos (apenas quando scope='selected') */}
      {contextScope === 'selected' && (
        <div ref={dropdownRef} className="relative">
          {/* Botão do dropdown */}
          <button
            type="button"
            onClick={() => setShowTopicDropdown(!showTopicDropdown)}
            className="w-full flex items-center justify-between p-3 rounded-lg border theme-border-input theme-bg-secondary hover:border-purple-500/50 transition-all"
          >
            <span className="text-sm theme-text-primary">
              {selectedContextTopics.length === 0
                ? 'Selecione os tópicos...'
                : `${selectedContextTopics.length} tópico(s) selecionado(s)`}
            </span>
            {showTopicDropdown ? (
              <ChevronUp className="w-4 h-4 theme-text-muted" />
            ) : (
              <ChevronDown className="w-4 h-4 theme-text-muted" />
            )}
          </button>

          {/* Lista de tópicos */}
          {showTopicDropdown && (
            <div className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-lg border theme-border-input theme-bg-secondary shadow-lg">
              {/* Ações em massa */}
              <div className="flex gap-2 p-2 border-b theme-border-input">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-xs text-purple-500 hover:text-purple-400 transition-colors"
                >
                  Selecionar todos
                </button>
                <span className="text-xs theme-text-muted">|</span>
                <button
                  type="button"
                  onClick={deselectAll}
                  className="text-xs text-purple-500 hover:text-purple-400 transition-colors"
                >
                  Limpar seleção
                </button>
              </div>

              {/* Lista de tópicos */}
              {selectableTopics.map((topic) => {
                const isSelected = selectedContextTopics.includes(topic.title);
                const isCurrent = topic.title === currentTopicTitle;
                return (
                  <button
                    key={topic.title}
                    type="button"
                    onClick={() => toggleTopic(topic.title)}
                    className={`w-full flex items-center gap-2 p-2.5 text-left hover:bg-purple-500/10 transition-colors ${
                      isSelected ? 'bg-purple-500/5' : ''
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                      isSelected
                        ? 'bg-purple-500 border-purple-500'
                        : 'border-gray-400 dark:border-gray-600'
                    }`}>
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={`text-sm truncate ${isCurrent ? 'font-semibold text-purple-400' : 'theme-text-primary'}`}>
                        {topic.title}
                      </span>
                      {isCurrent && (
                        <span className="ml-2 text-xs text-purple-400">(atual)</span>
                      )}
                    </div>
                    <span className="text-xs theme-text-muted">{topic.category}</span>
                  </button>
                );
              })}

              {selectableTopics.length === 0 && (
                <div className="p-4 text-center text-sm theme-text-muted">
                  Nenhum tópico disponível
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Toggle de documentos principais */}
      {/* v1.38.16: Bloqueado quando chat tem histórico */}
      <label className={`flex items-center gap-3 mt-3 p-3 rounded-lg border theme-border-input transition-all ${
        isToggleLocked
          ? 'opacity-60 cursor-not-allowed'
          : 'cursor-pointer hover:border-purple-500/50'
      }`}>
        <input
          type="checkbox"
          checked={includeMainDocs}
          onChange={(e) => !isToggleLocked && setIncludeMainDocs(e.target.checked)}
          disabled={isToggleLocked}
          className="w-4 h-4 text-purple-600 rounded border-gray-400 focus:ring-purple-500 focus:ring-offset-0 disabled:opacity-50"
        />
        <div>
          <span className="text-sm font-medium theme-text-primary">Incluir petições e contestações</span>
          {isToggleLocked ? (
            <p className="text-xs text-amber-500">Limpe o chat para alterar esta opção</p>
          ) : (
            <p className="text-xs theme-text-muted">Desative para economizar tokens</p>
          )}
        </div>
      </label>

      {/* v1.39.06: Toggle de documentos complementares */}
      <label className={`flex items-center gap-3 mt-2 p-3 rounded-lg border theme-border-input transition-all ${
        isToggleLocked
          ? 'opacity-60 cursor-not-allowed'
          : 'cursor-pointer hover:border-purple-500/50'
      }`}>
        <input
          type="checkbox"
          checked={includeComplementaryDocs}
          onChange={(e) => !isToggleLocked && setIncludeComplementaryDocs(e.target.checked)}
          disabled={isToggleLocked}
          className="w-4 h-4 text-purple-600 rounded border-gray-400 focus:ring-purple-500 focus:ring-offset-0 disabled:opacity-50"
        />
        <div>
          <span className="text-sm font-medium theme-text-primary">Incluir documentos complementares</span>
          {isToggleLocked ? (
            <p className="text-xs text-amber-500">Limpe o chat para alterar esta opção</p>
          ) : (
            <p className="text-xs theme-text-muted">Ative para enviar docs complementares no contexto</p>
          )}
        </div>
      </label>
    </div>
  );
};

export default ContextScopeSelector;

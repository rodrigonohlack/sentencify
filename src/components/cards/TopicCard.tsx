/**
 * @file TopicCard.tsx
 * @description Card de tópico com drag-and-drop e wrapper sortable
 * @version 1.36.86
 *
 * Extraído do App.tsx como parte da FASE 3 de refatoração.
 * v1.33.58: TopicCard refatorado para dnd-kit
 */

import React from 'react';
import { GripVertical, ChevronUp, ChevronDown, Edit2, Split, Merge } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS as DndCSS } from '@dnd-kit/utilities';
import { isSpecialTopic, isDispositivo, isRelatorio } from '../../utils/text';
import type { TopicCardProps, SortableTopicCardProps, Topic, TopicCategory, TopicResultado } from '../../types';

// Estilos de resultado (cores por tipo de decisão)
const RESULTADO_STYLES = {
  PROCEDENTE: { borderColor: '#10b981', color: 'var(--result-green)' },
  IMPROCEDENTE: { borderColor: '#ef4444', color: 'var(--result-red)' },
  'PARCIALMENTE PROCEDENTE': { borderColor: '#f59e0b', color: 'var(--result-amber)' },
  ACOLHIDO: { borderColor: '#10b981', color: 'var(--result-green)' },
  REJEITADO: { borderColor: '#ef4444', color: 'var(--result-red)' },
  'SEM RESULTADO': { borderColor: '#64748b', color: 'var(--result-muted)' },
  default: { borderColor: '#64748b', color: 'var(--result-muted)' }
};

const getResultadoStyle = (r: string | null | undefined) =>
  RESULTADO_STYLES[r as keyof typeof RESULTADO_STYLES] || RESULTADO_STYLES.default;

// TopicCard - Card de tópico com drag-and-drop
export const TopicCard = React.memo(({
  topic,
  selectedIdx,
  topicRefs,
  lastEditedTopicTitle,
  isDragging,
  isOver,
  selectedTopics,
  extractedTopics,
  topicsToMerge,
  toggleTopicSelection,
  moveTopicUp,
  moveTopicDown,
  moveTopicToPosition,
  setSelectedTopics,
  setExtractedTopics,
  startEditing,
  setTopicToRename,
  setNewTopicName,
  openModal,
  setTopicToSplit,
  setTopicsToMerge
}: TopicCardProps) => {
  const isRelatorioOrDispositivo = isSpecialTopic(topic);

  // Helper para verificar se o tópico está decidido
  const isDecidido = () => {
    // DISPOSITIVO usa editedContent
    if (isDispositivo(topic)) {
      return topic.editedContent && topic.editedContent.trim() !== '';
    }
    if (isRelatorio(topic)) {
      return (topic.editedRelatorio && topic.editedRelatorio.trim() !== '') ||
             (topic.relatorio && topic.relatorio.trim() !== '');
    }
    // Tópicos normais precisam de conteúdo E resultado selecionado
    const temConteudo = topic.editedFundamentacao && topic.editedFundamentacao.trim() !== '';
    const temResultado = topic.resultado && topic.resultado.trim() !== '';
    return temConteudo && temResultado;
  };

  return (
    <div
      key={topic.title}
      ref={(el) => { topicRefs.current[topic.title] = el; }}
      className={`hover-topic-drag-area rounded-lg p-3 border-2 transition-all duration-300 ${
        isRelatorioOrDispositivo ? 'cursor-default' : 'cursor-move'
      } ${
        lastEditedTopicTitle === topic.title
          ? 'border-green-500 shadow-lg shadow-green-500/20'
          : isDragging
            ? 'border-blue-500 shadow-2xl shadow-blue-500/40'
            : isOver
              ? 'border-purple-500 shadow-xl shadow-purple-500/30'
              : 'border-blue-500 card-hover-lift'
      }`}
      style={{ backgroundColor: 'rgba(37, 99, 235, 0.1)' }}
    >
      <div className="flex items-center gap-3">
        {/* Checkbox para desselecionar - não mostrar para RELATÓRIO e DISPOSITIVO */}
        {!isRelatorioOrDispositivo && (
          <input
            type="checkbox"
            checked={true}
            onChange={(e) => {
              e.stopPropagation();
              toggleTopicSelection(topic);
            }}
            className="w-5 h-5 rounded flex-shrink-0 cursor-pointer"
            title="Desmarcar tópico"
          />
        )}

        {/* Ícone de arrastar - não mostrar para RELATÓRIO e DISPOSITIVO */}
        {!isRelatorioOrDispositivo && (
          <div className="flex-shrink-0 cursor-grab active:cursor-grabbing">
            <GripVertical className={`w-5 h-5 transition-colors ${
              isDragging ? 'text-blue-400' : 'theme-text-muted hover-theme-text-secondary'
            }`} />
          </div>
        )}

        {/* Controles de posição - não mostrar para RELATÓRIO e DISPOSITIVO */}
        {!isRelatorioOrDispositivo && (
          <div className="flex flex-col gap-1">
            <button
              onClick={() => moveTopicUp(selectedIdx)}
              disabled={selectedIdx === 0}
              className="p-1 rounded disabled:opacity-40 disabled:cursor-not-allowed hover-slate-600 bg-transparent transition-all duration-200"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <input
              type="number"
              min="1"
              max={selectedTopics.length}
              value={selectedIdx + 1}
              className="w-12 theme-bg-primary border theme-border-input rounded text-center text-xs py-1 theme-text-primary"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const newPos = parseInt((e.target as HTMLInputElement).value);
                  moveTopicToPosition(selectedIdx, newPos);
                }
              }}
              onChange={(e) => {
                const newPos = parseInt(e.target.value);
                if (!isNaN(newPos)) {
                  moveTopicToPosition(selectedIdx, newPos);
                }
              }}
            />
            <button
              onClick={() => moveTopicDown(selectedIdx)}
              disabled={selectedIdx === selectedTopics.length - 1}
              className="p-1 rounded disabled:opacity-40 disabled:cursor-not-allowed hover-slate-600 bg-transparent transition-all duration-200"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Badge de posição fixa para RELATÓRIO e DISPOSITIVO */}
        {isRelatorioOrDispositivo && (
          <div className="flex items-center gap-2 px-3 py-2 theme-bg-purple-accent border border-purple-500/30 rounded-lg">
            <span className="text-xs theme-text-purple font-medium">
              Posição Fixa
            </span>
          </div>
        )}

        {/* Conteúdo do tópico */}
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Seletor de categoria - editável (não mostrar para RELATÓRIO e DISPOSITIVO) */}
              {!isRelatorioOrDispositivo && (
                <select
                  value={topic.category || 'MERITO'}
                  onChange={(e) => {
                    const newTopics = [...selectedTopics];
                    newTopics[selectedIdx] = { ...topic, category: e.target.value as TopicCategory };
                    setSelectedTopics(newTopics);

                    // Atualizar também em extractedTopics se existir
                    const extractedIndex = extractedTopics.findIndex((t: Topic) => t.title === topic.title);
                    if (extractedIndex !== -1) {
                      const newExtracted = [...extractedTopics];
                      newExtracted[extractedIndex] = { ...newExtracted[extractedIndex], category: e.target.value as TopicCategory };
                      setExtractedTopics(newExtracted);
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs px-2 py-1 rounded cursor-pointer font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 border-2 border-blue-500 hover-blue-700 bg-blue-600 text-white transition-colors duration-200"
                  title="Clique para alterar a categoria"
                >
                  <option value="PRELIMINAR">Preliminar</option>
                  <option value="PREJUDICIAL">Prejudicial</option>
                  <option value="MERITO">Mérito</option>
                  <option value="PROCESSUAL">Processual</option>
                </select>
              )}

              <h4 className="font-semibold theme-text-primary">{topic.title.toUpperCase()}</h4>
              <span className="text-xs theme-bg-blue-accent theme-text-blue px-2 py-1 rounded">
                #{selectedIdx + 1}
              </span>

              {/* Seletor de resultado do julgamento - não mostrar para RELATÓRIO e DISPOSITIVO */}
              {topic.title.toUpperCase() !== 'RELATORIO' && topic.title.toUpperCase() !== 'DISPOSITIVO' && (
                <select
                  value={topic.resultado || ''}
                  onChange={(e) => {
                    const newTopics = [...selectedTopics];
                    // Marcar como escolha manual se usuário selecionar algo (não vazio)
                    const resultadoManual = e.target.value !== '';
                    newTopics[selectedIdx] = {
                      ...topic,
                      resultado: (e.target.value || undefined) as TopicResultado | undefined,
                      resultadoManual
                    };
                    setSelectedTopics(newTopics);

                    // Atualizar também em extractedTopics se existir
                    const extractedIndex = extractedTopics.findIndex((t: Topic) => t.title === topic.title);
                    if (extractedIndex !== -1) {
                      const newExtracted = [...extractedTopics];
                      newExtracted[extractedIndex] = {
                        ...newExtracted[extractedIndex],
                        resultado: (e.target.value || undefined) as TopicResultado | undefined,
                        resultadoManual
                      };
                      setExtractedTopics(newExtracted);
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs px-3 py-1 rounded border-2 theme-bg-secondary cursor-pointer font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={getResultadoStyle(topic.resultado)}
                >
                  <option value="">Selecione o resultado...</option>
                  <option value="PROCEDENTE">Procedente</option>
                  <option value="IMPROCEDENTE">Improcedente</option>
                  <option value="PARCIALMENTE PROCEDENTE">Parcialmente Procedente</option>
                  <option value="ACOLHIDO">Acolhido/Reconhecido</option>
                  <option value="REJEITADO">Rejeitado/Indeferido</option>
                  <option value="SEM RESULTADO">Sem Resultado</option>
                </select>
              )}

              {/* Indicador de resultado auto-detectado */}
              {topic.resultado && !topic.resultadoManual && topic.title.toUpperCase() !== 'RELATORIO' && topic.title.toUpperCase() !== 'DISPOSITIVO' && (
                <span className="text-xs text-purple-400 flex items-center gap-1" title="Resultado detectado automaticamente pela IA">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                  </svg>
                  Auto
                </span>
              )}

              {/* Indicador de status de decisão - não mostrar para RELATÓRIO e DISPOSITIVO */}
              {topic.title.toUpperCase() !== 'RELATORIO' && topic.title.toUpperCase() !== 'DISPOSITIVO' && (
                isDecidido() ? (
                  <span className="flex items-center gap-1 text-xs theme-bg-green-accent theme-text-green px-2 py-1 rounded border border-green-500/30">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    Decidido
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs theme-bg-amber-accent theme-text-amber px-2 py-1 rounded border border-amber-500/30">
                    <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                    Pendente
                  </span>
                )
              )}
            </div>
          </div>

          {/* Botões de ação */}
          <div className="flex flex-wrap gap-2 mt-3">
            <button
              onClick={() => startEditing(topic)}
              className="px-4 py-2 rounded text-sm hover-blue-700 bg-blue-600 text-white transition-colors duration-300"
            >
              Editar
            </button>

            {/* Botões adicionais apenas para tópicos que não sejam RELATÓRIO ou DISPOSITIVO */}
            {topic.title.toUpperCase() !== 'RELATORIO' && topic.title.toUpperCase() !== 'DISPOSITIVO' && (
              <>
                <button
                  onClick={() => {
                    setTopicToRename(topic);
                    setNewTopicName(topic.title);
                    openModal('rename');
                  }}
                  className="px-3 py-2 rounded text-sm flex items-center gap-1 hover-purple-700 bg-purple-600 text-white transition-colors duration-300"
                >
                  <Edit2 className="w-3 h-3" />
                  Renomear
                </button>
                <button
                  onClick={() => {
                    setTopicToSplit(topic);
                    openModal('split');
                  }}
                  className="px-3 py-2 rounded text-sm flex items-center gap-1 hover-orange-700 bg-orange-600 text-white transition-colors duration-300"
                >
                  <Split className="w-3 h-3" />
                  Separar
                </button>
                <button
                  onClick={() => {
                    if (topicsToMerge.find((t: Topic) => t.title === topic.title)) {
                      setTopicsToMerge(topicsToMerge.filter((t: Topic) => t.title !== topic.title));
                    } else {
                      setTopicsToMerge([...topicsToMerge, topic]);
                    }
                  }}
                  className="px-3 py-2 rounded text-sm flex items-center gap-1 text-white"
                  style={{
                    backgroundColor: topicsToMerge.find((t: Topic) => t.title === topic.title) ? '#059669' : '#475569',
                    transition: 'background-color 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    const isSelected = topicsToMerge.find((t: Topic) => t.title === topic.title);
                    e.currentTarget.style.backgroundColor = isSelected ? '#047857' : '#334155';
                  }}
                  onMouseLeave={(e) => {
                    const isSelected = topicsToMerge.find((t: Topic) => t.title === topic.title);
                    e.currentTarget.style.backgroundColor = isSelected ? '#059669' : '#475569';
                  }}
                >
                  <Merge className="w-3 h-3" />
                  {topicsToMerge.find((t: Topic) => t.title === topic.title) ? 'Selecionado' : 'Unir'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

TopicCard.displayName = 'TopicCard';

// SortableTopicCard - wrapper para dnd-kit com suporte a wheel scroll
export const SortableTopicCard = React.memo(({ topic, id, ...props }: SortableTopicCardProps) => {
  const isSpecial = isSpecialTopic(topic);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver
  } = useSortable({
    id,
    disabled: isSpecial
  });

  const style = {
    transform: DndCSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto' as const
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TopicCard
        topic={topic}
        isDragging={isDragging}
        isOver={isOver}
        {...props}
      />
    </div>
  );
});

SortableTopicCard.displayName = 'SortableTopicCard';

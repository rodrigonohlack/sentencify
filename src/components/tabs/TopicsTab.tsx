/**
 * @file TopicsTab.tsx
 * @description Aba de Gestão de Tópicos extraída do App.tsx
 * @version 1.37.55
 *
 * Seções:
 * 1. Header com botões de ação (Unir, Novo, Edição Global, Revisar, Dispositivo, Exportar)
 * 2. Contadores de status (Decididos/Pendentes)
 * 3. Aviso CNJ sobre mini-relatórios
 * 4. Lista DND de tópicos selecionados (SortableTopicCard)
 * 5. Lista de tópicos não selecionados
 */

import React from 'react';
import {
  FileText,
  GripVertical,
  Merge,
  PlusCircle,
  Edit,
  Scale,
  Sparkles,
  Download,
  Trash2
} from 'lucide-react';
import { DndContext } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableTopicCard } from '../cards';
import { useUIStore } from '../../stores/useUIStore';
import { useTopicsStore } from '../../stores/useTopicsStore';
import type { TopicsTabProps, Topic, TopicCategory } from '../../types';

export const TopicsTab: React.FC<TopicsTabProps> = ({
  topicRefs,
  dndSensors,
  customCollisionDetection,
  handleDndDragEnd,
  regenerating,
  generatingDispositivo,
  generatingReview,
  canGenerateDispositivo,
  toggleTopicSelection,
  moveTopicUp,
  moveTopicDown,
  moveTopicToPosition,
  startEditing,
  deleteTopic,
  generateDispositivo,
  exportDecision,
  isTopicDecidido,
  isSpecialTopic,
  CSS
}) => {
  // ═══════════════════════════════════════════════════════════════════════════
  // STORE ACCESS (substituindo props)
  // ═══════════════════════════════════════════════════════════════════════════

  const openModal = useUIStore((s) => s.openModal);
  const extractedTopics = useTopicsStore((s) => s.extractedTopics);
  const setExtractedTopics = useTopicsStore((s) => s.setExtractedTopics);
  const selectedTopics = useTopicsStore((s) => s.selectedTopics);
  const setSelectedTopics = useTopicsStore((s) => s.setSelectedTopics);
  const topicsToMerge = useTopicsStore((s) => s.topicsToMerge);
  const setTopicsToMerge = useTopicsStore((s) => s.setTopicsToMerge);
  const lastEditedTopicTitle = useTopicsStore((s) => s.lastEditedTopicTitle);
  const setTopicToRename = useTopicsStore((s) => s.setTopicToRename);
  const setNewTopicName = useTopicsStore((s) => s.setNewTopicName);
  const setTopicToSplit = useTopicsStore((s) => s.setTopicToSplit);

  // Computed values (derivados do store)
  const unselectedTopics = React.useMemo(() =>
    extractedTopics.filter(t => !selectedTopics.some(s => s.title === t.title)),
    [extractedTopics, selectedTopics]
  );
  const topicsDecididos = React.useMemo(() =>
    selectedTopics.filter(t => isTopicDecidido(t)).length,
    [selectedTopics, isTopicDecidido]
  );
  const topicsPendentes = React.useMemo(() =>
    selectedTopics.length - topicsDecididos,
    [selectedTopics.length, topicsDecididos]
  );
  return (
    <div className="space-y-6">
      {extractedTopics.length === 0 ? (
        <div className="text-center py-12 theme-text-muted">
          <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>Nenhum tópico extraído ainda. Faça upload e análise dos documentos.</p>
        </div>
      ) : (
        <>
          <div>
            <div className="mb-4 space-y-3">
              {/* Linha 1: Título e Botões */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-blue-400">
                    Gerenciar Tópicos {selectedTopics.length > 0 && `(${selectedTopics.length} selecionados)`}
                  </h3>
                  <p className="text-xs theme-text-muted mt-1 flex items-center gap-2">
                    Clique para selecionar • <GripVertical className="w-3 h-3" /> Arraste para reordenar • Use setas e números
                  </p>
                </div>
                <div className="flex gap-2 flex-nowrap overflow-x-auto">
                  {topicsToMerge.length >= 2 && (
                    <button
                      onClick={() => openModal('merge')}
                      disabled={regenerating}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm disabled:opacity-50 hover-amber-700-from-600 bg-amber-600 text-white transition-colors duration-300"
                    >
                      <Merge className="w-4 h-4" />
                      Unir {topicsToMerge.length} Selecionados
                    </button>
                  )}
                  <button
                    onClick={() => openModal('newTopic')}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover-green-700-from-600 bg-emerald-600 text-white transition-colors duration-300"
                  >
                    <PlusCircle className="w-4 h-4" />
                    Novo Tópico
                  </button>
                  {/* Botão de Edição Global */}
                  {selectedTopics.length > 0 && (
                    <button
                      onClick={() => openModal('globalEditor')}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover-cyan-700-from-600 bg-cyan-600 text-white transition-colors duration-300"
                    >
                      <Edit className="w-4 h-4" />
                      Edição Global
                    </button>
                  )}
                  {selectedTopics.length > 0 && (
                    <>
                      {/* Botão Revisar Sentença */}
                      <div className="relative group">
                        <button
                          onClick={() => openModal('sentenceReview')}
                          disabled={!canGenerateDispositivo.enabled || generatingReview}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-white transition-all ${
                            !canGenerateDispositivo.enabled || generatingReview
                              ? 'opacity-50 cursor-not-allowed'
                              : 'hover-amber-700-from-600'
                          }`}
                          style={{
                            backgroundColor: canGenerateDispositivo.enabled && !generatingReview ? '#d97706' : '#6b7280',
                            transition: 'background-color 0.3s ease'
                          }}
                        >
                          {generatingReview ? (
                            <>
                              <div className={CSS.spinner}></div>
                              <span>Revisando...</span>
                            </>
                          ) : (
                            <>
                              <Scale className="w-4 h-4" />
                              Revisar Sentença
                            </>
                          )}
                        </button>
                        {/* Tooltip quando desabilitado */}
                        {!canGenerateDispositivo.enabled && !generatingReview && (
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 theme-bg-primary text-white text-xs rounded-lg shadow-lg border border-amber-500/50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 max-w-xs">
                            <div className="flex items-start gap-2">
                              <span className="text-xl flex-shrink-0">⚠️</span>
                              <span>{canGenerateDispositivo.reason}</span>
                            </div>
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-amber-500/50"></div>
                          </div>
                        )}
                      </div>
                      {/* Botão Gerar Dispositivo */}
                      <div className="relative group">
                        <button
                          onClick={generateDispositivo}
                          disabled={!canGenerateDispositivo.enabled || generatingDispositivo}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-white transition-all ${
                            !canGenerateDispositivo.enabled || generatingDispositivo
                              ? 'opacity-50 cursor-not-allowed'
                              : 'hover-purple-700-from-600'
                          }`}
                          style={{
                            backgroundColor: canGenerateDispositivo.enabled && !generatingDispositivo ? '#9333ea' : '#6b7280',
                            transition: 'background-color 0.3s ease'
                          }}
                        >
                          {generatingDispositivo ? (
                            <>
                              <div className={CSS.spinner}></div>
                              <span>Gerando...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4" />
                              Gerar Dispositivo
                            </>
                          )}
                        </button>

                        {/* Tooltip explicativo quando desabilitado */}
                        {!canGenerateDispositivo.enabled && !generatingDispositivo && (
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 theme-bg-primary text-white text-xs rounded-lg shadow-lg border border-amber-500/50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 max-w-xs">
                            <div className="flex items-start gap-2">
                              <span className="text-xl flex-shrink-0">⚠️</span>
                              <span>{canGenerateDispositivo.reason}</span>
                            </div>
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-amber-500/50"></div>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={exportDecision}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm hover-blue-700-from-600 bg-blue-600 text-white transition-colors duration-300"
                      >
                        <Download className="w-4 h-4" />
                        Exportar Minuta Completa
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Linha 2: Contadores de Status */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 px-3 py-1.5 theme-bg-green-accent rounded-lg border border-green-500/30">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span className="text-xs theme-text-green font-medium">
                    {topicsDecididos} Decididos
                  </span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 theme-bg-amber-accent rounded-lg border border-amber-500/30">
                  <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                  <span className="text-xs theme-text-amber font-medium">
                    {topicsPendentes} Pendentes
                  </span>
                </div>
              </div>
            </div>

            {/* Aviso sobre mini-relatórios gerados por IA */}
            <div className="mb-4 p-3 theme-bg-blue-accent border border-blue-500/30 rounded-lg">
              <div className="flex items-start gap-2">
                <span className="theme-text-blue text-sm">ℹ️</span>
                <div className="text-xs theme-text-blue-muted">
                  <p>Os mini-relatórios foram gerados automaticamente por IA. Revise-os e complemente com informações relevantes antes de decidir.</p>
                  <p className="mt-1 theme-text-blue-muted">Sua revisão é fundamental, na forma estabelecida pela <span className="font-semibold">Resolução 615/2025 do CNJ</span>.</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {/* DndContext com collision detection customizado (ignora RELATÓRIO/DISPOSITIVO) */}
              <DndContext
                sensors={dndSensors}
                collisionDetection={customCollisionDetection}
                onDragEnd={handleDndDragEnd}
              >
                <SortableContext
                  items={selectedTopics.map(t => t.id || t.title)}
                  strategy={verticalListSortingStrategy}
                >
                  {/* Renderizar tópicos selecionados primeiro (na ordem correta) */}
                  {selectedTopics.map((topic, selectedIdx) => (
                    <SortableTopicCard
                      key={topic.id || topic.title}
                      id={String(topic.id || topic.title)}
                      topic={topic}
                      selectedIdx={selectedIdx}
                      topicRefs={topicRefs}
                      lastEditedTopicTitle={lastEditedTopicTitle}
                      selectedTopics={selectedTopics}
                      extractedTopics={extractedTopics}
                      topicsToMerge={topicsToMerge}
                      toggleTopicSelection={toggleTopicSelection}
                      moveTopicUp={moveTopicUp}
                      moveTopicDown={moveTopicDown}
                      moveTopicToPosition={moveTopicToPosition}
                      setSelectedTopics={setSelectedTopics}
                      setExtractedTopics={setExtractedTopics}
                      startEditing={startEditing}
                      setTopicToRename={setTopicToRename}
                      setNewTopicName={setNewTopicName}
                      openModal={openModal}
                      setTopicToSplit={setTopicToSplit}
                      setTopicsToMerge={setTopicsToMerge}
                    />
                  ))}
                </SortableContext>
              </DndContext>

              {/* Renderizar tópicos NÃO selecionados por último */}
              {unselectedTopics.map((topic) => {
                const isRelatorioOrDispositivo = isSpecialTopic(topic);

                return (
                  <div
                    key={topic.title}
                    className="p-4 rounded-lg border-2 transition-all theme-bg-secondary-30 theme-border-input hover-theme-border hover-slate-700/50"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          {/* Seletor de categoria - editável (não mostrar para RELATÓRIO e DISPOSITIVO) */}
                          {!isRelatorioOrDispositivo && (
                            <select
                              value={topic.category || 'MÉRITO'}
                              onChange={(e) => {
                                e.stopPropagation();
                                const newExtracted = [...extractedTopics];
                                const extractedIndex = extractedTopics.findIndex((t: Topic) => t.title === topic.title);
                                if (extractedIndex !== -1) {
                                  newExtracted[extractedIndex] = { ...newExtracted[extractedIndex], category: e.target.value as TopicCategory };
                                  setExtractedTopics(newExtracted);
                                }
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs px-2 py-1 rounded cursor-pointer font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 border-2 theme-border theme-text-secondary hover-category-select"
                              title="Clique para alterar a categoria"
                            >
                              <option value="PRELIMINAR">📋 Preliminar</option>
                              <option value="PREJUDICIAL">⚠️ Prejudicial</option>
                              <option value="MÉRITO">⚖️ Mérito</option>
                              <option value="PROCESSUAL">📝 Processual</option>
                            </select>
                          )}

                          <h4
                            className="font-semibold theme-text-primary cursor-pointer"
                            onClick={() => toggleTopicSelection(topic)}
                          >
                            {topic.title.toUpperCase()}
                          </h4>
                          {/* Indicador de status de decisão - não mostrar para RELATÓRIO e DISPOSITIVO */}
                          {topic.title.toUpperCase() !== 'RELATÓRIO' && topic.title.toUpperCase() !== 'DISPOSITIVO' && (
                            isTopicDecidido(topic) ? (
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
                      <div className={CSS.flexGap2}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteTopic(topic);
                          }}
                          className="p-2 rounded hover-delete-topic"
                          title="Excluir tópico"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-xs theme-text-disabled">Clique para selecionar</span>
                          <input
                            type="checkbox"
                            checked={false}
                            onChange={(e) => {
                              e.stopPropagation();
                              toggleTopicSelection(topic);
                            }}
                            className="w-5 h-5 rounded cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default TopicsTab;

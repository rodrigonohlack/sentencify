/**
 * @file EditorTabContent.tsx
 * @description Aba de Editor extraída do App.tsx
 * @version 1.38.52
 *
 * Seções:
 * 1. Estado vazio (nenhum tópico selecionado)
 * 2. DecisionEditorContainer (editor principal)
 * 3. Painel de provas vinculadas
 * 4. Painel de sugestões de modelos (busca manual + automáticas)
 */

import React from 'react';
import {
  FileText, Scale, ChevronUp, ChevronDown, Edit, Sparkles
} from 'lucide-react';
import { CSS } from '../../constants/styles';
import { DecisionEditorContainer } from '../';
import { SuggestionCard } from '../';
import { useModelsStore } from '../../stores/useModelsStore';
import { isRelatorio } from '../../utils/text';
import type { Topic, Model, Proof, QuillInstance } from '../../types';
import type { UseFieldVersioningReturn, TopicEditorConfig } from '../../hooks';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface ModelLibraryForEditor {
  models: Model[];
  suggestions: Model[];
  manualSearchTerm: string;
  manualSearchResults: Model[];
  loadingSuggestions: boolean;
  suggestionsSource: string | null;
  extractingModelFromDecision: boolean;
  showExtractModelButton: boolean;
  setManualSearchTerm: (term: string) => void;
  setManualSearchResults: (results: Model[]) => void;
  debouncedManualSearch: (term: string) => void;
  setSuggestions: (suggestions: Model[]) => void;
}

interface ProofManagerForEditor {
  showProofPanel: boolean;
  setShowProofPanel: (show: boolean) => void;
  proofUsePdfMode: Record<string, boolean>;
  proofAnalysisResults: Record<string, Array<{ id: string; type: string; result: string }>>;
  proofConclusions: Record<string, string>;
}

interface AIIntegrationForEditor {
  regeneratingRelatorio: boolean | undefined;
  relatorioInstruction: string | undefined;
  setRelatorioInstruction: (instruction: string) => void;
  dispositivoInstruction: string | undefined;
  setDispositivoInstruction: (instruction: string) => void;
  regeneratingDispositivo: boolean | undefined;
}

interface ModelPreviewForEditor {
  openPreview: (model: Model) => void;
}

export interface EditorTabContentProps {
  // Refs
  editorContainerRef: React.RefObject<HTMLDivElement | null>;
  editorRef: React.RefObject<QuillInstance | null>;
  relatorioRef: React.RefObject<QuillInstance | null>;

  // Topic state
  editingTopic: Topic | null;
  selectedTopics: Topic[];
  extractedTopics: Topic[];
  setSelectedTopics: React.Dispatch<React.SetStateAction<Topic[]>>;
  setExtractedTopics: (topics: Topic[]) => void;
  setEditingTopic: (topic: Topic | null) => void;
  setLastEditedTopicTitle: (title: string | null) => void;
  setActiveTab: (tab: string) => void;

  // Linked proofs
  linkedProofs: Proof[];

  // Model library
  modelLibrary: ModelLibraryForEditor;
  modelPreview: ModelPreviewForEditor;

  // Proof manager
  proofManager: ProofManagerForEditor;

  // AI integration
  aiIntegration: AIIntegrationForEditor;

  // Topic editing callbacks
  saveTopicEdit: () => Promise<void>;
  saveTopicEditWithoutClosing: () => Promise<void>;
  savingTopic: boolean;

  // Editor callbacks
  handleCategoryChange: (category: string) => void;
  handleFundamentacaoChange: (html: string) => void;
  handleRelatorioChange: (html: string) => void;
  regenerateRelatorioWithInstruction: () => Promise<void>;
  regenerateRelatorioProcessual: () => Promise<void>;
  regenerateDispositivoWithInstruction: () => Promise<void>;

  // Model callbacks
  confirmExtractModel: () => void;
  saveAsModel: () => void;
  insertModelContent: (content: string) => void;
  findSuggestions: (topic: Topic) => Promise<{ suggestions: Model[]; source: string | null }>;

  // Editor config
  getTopicEditorConfig: (topicTitle: string) => TopicEditorConfig;
  quillReady: boolean;
  quillError: Error | null;
  editorTheme: 'dark' | 'light' | undefined;
  toggleEditorTheme: () => void;

  // Versioning
  isIndividualDirty: boolean;
  fieldVersioning: UseFieldVersioningReturn;

  // Facts comparison
  handleOpenFactsComparisonIndividual: (() => void) | null;

  // Slash menu
  openSlashMenu: (data: { position: { top: number; left: number }; quillInstance: QuillInstance | null; triggerPosition: number }) => void;

  // Modal
  openModal: (modal: string) => void;

  // Sanitization
  sanitizeHTML: (html: string) => string;

  // Semantic search
  searchModelReady: boolean;
  useSemanticManualSearch: boolean;
  setUseSemanticManualSearch: (value: boolean) => void;
  semanticManualSearching: boolean;
  setSemanticManualSearchResults: (results: Model[] | null) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export const EditorTabContent: React.FC<EditorTabContentProps> = ({
  editorContainerRef,
  editorRef,
  relatorioRef,
  editingTopic,
  selectedTopics,
  extractedTopics,
  setSelectedTopics,
  setExtractedTopics,
  setEditingTopic,
  setLastEditedTopicTitle,
  setActiveTab,
  linkedProofs,
  modelLibrary,
  modelPreview,
  proofManager,
  aiIntegration,
  saveTopicEdit,
  saveTopicEditWithoutClosing,
  savingTopic,
  handleCategoryChange,
  handleFundamentacaoChange,
  handleRelatorioChange,
  regenerateRelatorioWithInstruction,
  regenerateRelatorioProcessual,
  regenerateDispositivoWithInstruction,
  confirmExtractModel,
  saveAsModel,
  insertModelContent,
  findSuggestions,
  getTopicEditorConfig,
  quillReady,
  quillError,
  editorTheme,
  toggleEditorTheme,
  isIndividualDirty,
  fieldVersioning,
  handleOpenFactsComparisonIndividual,
  openSlashMenu,
  openModal,
  sanitizeHTML,
  searchModelReady,
  useSemanticManualSearch,
  setUseSemanticManualSearch,
  semanticManualSearching,
  setSemanticManualSearchResults,
}) => {
  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  const handleCancel = () => {
    if (editingTopic) {
      setLastEditedTopicTitle(editingTopic.title);
    }
    setEditingTopic(null);
    modelLibrary.setSuggestions([]);
    setActiveTab('topics');
  };

  const handleClearSearch = () => {
    modelLibrary.setManualSearchTerm('');
    modelLibrary.setManualSearchResults([]);
    setSemanticManualSearchResults(null);
  };

  const handleToggleSemanticSearch = () => {
    const current = useModelsStore.getState().useSemanticManualSearch;
    setUseSemanticManualSearch(!current);
    modelLibrary.setManualSearchResults([]);
    setSemanticManualSearchResults(null);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    modelLibrary.setManualSearchTerm(e.target.value);
    if (!useSemanticManualSearch) {
      modelLibrary.debouncedManualSearch(e.target.value);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div ref={editorContainerRef} className="space-y-6">
      {!editingTopic ? (
        <div className="text-center py-12 theme-text-muted">
          <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>Selecione um tópico na aba "Tópicos" para editar</p>
        </div>
      ) : (
        <div className="relative grid lg:grid-cols-3 gap-6">
          {/* Editor Principal */}
          <div className="lg:col-span-2">
            <DecisionEditorContainer
              ref={editorContainerRef}
              editorRef={editorRef}
              relatorioRef={relatorioRef}
              topic={editingTopic}
              onSave={saveTopicEdit}
              onCancel={handleCancel}
              onSaveWithoutClosing={saveTopicEditWithoutClosing}
              onCategoryChange={handleCategoryChange}
              onFundamentacaoChange={handleFundamentacaoChange}
              onRelatorioChange={handleRelatorioChange}
              onOpenAIAssistant={() => openModal('aiAssistant')}
              onOpenJurisModal={() => openModal('jurisIndividual')}
              onExtractModel={confirmExtractModel}
              onSaveAsModel={saveAsModel}
              onRegenerateRelatorio={
                isRelatorio(editingTopic)
                  ? regenerateRelatorioProcessual
                  : regenerateRelatorioWithInstruction
              }
              savingTopic={savingTopic}
              extractingModel={modelLibrary.extractingModelFromDecision}
              showExtractButton={modelLibrary.showExtractModelButton}
              regeneratingRelatorio={aiIntegration.regeneratingRelatorio}
              relatorioInstruction={aiIntegration.relatorioInstruction}
              onInstructionChange={aiIntegration.setRelatorioInstruction}
              sanitizeHTML={sanitizeHTML}
              selectedTopics={selectedTopics}
              setSelectedTopics={setSelectedTopics}
              extractedTopics={extractedTopics}
              setExtractedTopics={setExtractedTopics}
              getTopicEditorConfig={getTopicEditorConfig}
              quillReady={quillReady}
              quillError={quillError}
              onRegenerateDispositivo={regenerateDispositivoWithInstruction}
              dispositivoInstruction={aiIntegration.dispositivoInstruction}
              onDispositivoInstructionChange={aiIntegration.setDispositivoInstruction}
              regeneratingDispositivo={aiIntegration.regeneratingDispositivo}
              editorTheme={editorTheme}
              toggleEditorTheme={toggleEditorTheme}
              models={modelLibrary.models}
              onInsertModel={insertModelContent}
              onPreviewModel={modelPreview.openPreview}
              findSuggestions={findSuggestions}
              onSlashCommand={openSlashMenu}
              isDirty={isIndividualDirty}
              versioning={fieldVersioning}
              onOpenFactsComparison={
                editingTopic?.title?.toUpperCase() !== 'DISPOSITIVO' &&
                editingTopic?.title?.toUpperCase() !== 'RELATÓRIO'
                  ? handleOpenFactsComparisonIndividual
                  : null
              }
            />
          </div>

          {/* Painel Lateral */}
          <div className="space-y-4">
            {/* Painel de Provas Vinculadas */}
            {linkedProofs.length > 0 && (
              <div className="theme-bg-green-accent rounded-lg border border-green-500/30 overflow-hidden">
                <div
                  className="p-4 border-b border-green-500/30 flex items-center justify-between cursor-pointer hover-proof-panel"
                  onClick={() => proofManager.setShowProofPanel(!proofManager.showProofPanel)}
                >
                  <div className={CSS.flexGap2}>
                    <Scale className="w-5 h-5 theme-text-green" />
                    <h4 className="font-bold theme-text-green">
                      Provas Vinculadas ({linkedProofs.length})
                    </h4>
                  </div>
                  <button className="theme-text-green hover-text-green-300">
                    {proofManager.showProofPanel ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>
                </div>

                {proofManager.showProofPanel && (
                  <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                    {linkedProofs.map((proof: Proof) => (
                      <div
                        key={proof.id}
                        className="theme-bg-secondary-50 rounded-lg p-3 border theme-border-input"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="w-4 h-4 text-blue-400 flex-shrink-0" />
                          <h5 className="font-medium theme-text-secondary text-sm flex-1 truncate">{proof.name}</h5>
                          <span className={`px-2 py-0.5 text-xs rounded ${
                            (proof.isPdf && proofManager.proofUsePdfMode[proof.id] !== false)
                              ? 'theme-bg-red-accent theme-text-red'
                              : 'theme-bg-blue-accent theme-text-blue'
                          }`}>
                            {(proof.isPdf && proofManager.proofUsePdfMode[proof.id] !== false) ? 'PDF' : 'TEXTO'}
                          </span>
                        </div>

                        {/* Análises IA */}
                        {proofManager?.proofAnalysisResults?.[proof.id]?.length > 0 && (
                          <div className="mb-2 space-y-1">
                            {proofManager?.proofAnalysisResults?.[proof.id]?.map((analysis, idx) => (
                              <div key={analysis.id} className="p-2 theme-bg-blue-accent border border-blue-500/30 rounded text-xs">
                                <div className="flex items-center gap-1 mb-1">
                                  <Sparkles className="w-3 h-3 theme-text-blue" />
                                  <span className="font-medium theme-text-blue">
                                    #{idx + 1} {analysis.type === 'livre' ? 'Análise Livre' : 'Análise Contextual'}
                                  </span>
                                </div>
                                <div className="max-h-32 overflow-y-auto">
                                  <p className="theme-text-tertiary whitespace-pre-wrap">
                                    {analysis.result}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Conclusões Manuais */}
                        {proofManager.proofConclusions[proof.id] && (
                          <div className="p-2 theme-bg-green-accent border border-green-500/30 rounded text-xs">
                            <div className="flex items-center gap-1 mb-1">
                              <Edit className="w-3 h-3 theme-text-green" />
                              <span className="font-medium theme-text-green">Minhas Conclusões</span>
                            </div>
                            <div className="max-h-24 overflow-y-auto">
                              <p className="theme-text-tertiary whitespace-pre-wrap">
                                {proofManager.proofConclusions[proof.id]}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <h4 className="font-bold text-purple-400">💡 Sugestões de Modelos</h4>

            {/* Campo de busca manual */}
            <div className="theme-bg-secondary-30 rounded-lg p-3 border theme-border-input">
              <label className={CSS.label}>
                🔍 Busca Manual
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={modelLibrary.manualSearchTerm}
                  onChange={handleSearchChange}
                  placeholder={useSemanticManualSearch ? "Busca por significado..." : "Digite para buscar modelos por título, palavras-chave ou conteúdo..."}
                  className="flex-1 px-3 py-2 theme-bg-primary border theme-border-input rounded-lg theme-text-primary text-sm theme-placeholder focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-all"
                />
                {modelLibrary.manualSearchTerm && (
                  <button
                    onClick={handleClearSearch}
                    className="px-3 py-2 theme-bg-tertiary rounded-lg hover-slate-700 transition-colors text-sm"
                    title="Limpar busca"
                  >
                    ✕
                  </button>
                )}
                {searchModelReady && (
                  <button
                    onClick={handleToggleSemanticSearch}
                    className={`px-2 py-1 rounded text-sm transition-colors ${
                      useSemanticManualSearch
                        ? 'bg-purple-600 text-white hover:bg-purple-700'
                        : 'theme-bg-tertiary theme-text-secondary hover:bg-slate-600'
                    }`}
                    title={useSemanticManualSearch ? 'Busca semântica (por significado)' : 'Busca textual (por palavras)'}
                  >
                    {useSemanticManualSearch ? '🧠' : '🔤'}
                  </button>
                )}
              </div>
              {semanticManualSearching && (
                <p className="text-xs text-purple-400 mt-2 flex items-center gap-1">
                  <span className="animate-spin inline-block w-3 h-3 border border-purple-400 border-t-transparent rounded-full"></span>
                  Buscando por significado...
                </p>
              )}
              {!semanticManualSearching && modelLibrary.manualSearchTerm && modelLibrary.manualSearchResults.length > 0 && (
                <p className="text-xs theme-text-muted mt-2">
                  {modelLibrary.manualSearchResults.length} modelo{modelLibrary.manualSearchResults.length > 1 ? 's' : ''} encontrado{modelLibrary.manualSearchResults.length > 1 ? 's' : ''}
                  {useSemanticManualSearch && <span className="ml-1 text-purple-400">(semântica)</span>}
                </p>
              )}
            </div>

            {/* Resultados da busca manual */}
            {modelLibrary.manualSearchResults.length > 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-blue-400 font-medium">Resultados da Busca:</p>
                {modelLibrary.manualSearchResults.map((model, idx) => (
                  <SuggestionCard
                    key={model.id || `manual-${idx}`}
                    model={model}
                    similarity={model.similarity}
                    index={idx}
                    totalSuggestions={modelLibrary.manualSearchResults.length}
                    onPreview={modelPreview.openPreview}
                    onInsert={insertModelContent}
                    sanitizeHTML={sanitizeHTML}
                    showRanking={false}
                  />
                ))}
              </div>
            ) : modelLibrary.manualSearchTerm && modelLibrary.manualSearchResults.length === 0 ? (
              <p className="theme-text-muted text-sm">Nenhum modelo encontrado para "{modelLibrary.manualSearchTerm}"</p>
            ) : (
              <>
                {/* Sugestões automáticas */}
                <div className="border-t theme-border-input pt-4">
                  <p className="text-sm theme-text-muted font-medium mb-3 flex items-center gap-2">
                    Sugestões Automáticas:
                    {modelLibrary.suggestionsSource === 'local' && (
                      <span className="bg-purple-600 text-white px-1.5 py-0.5 rounded text-[10px]">🤖 IA Local</span>
                    )}
                  </p>
                  {modelLibrary.loadingSuggestions ? (
                    <div className="flex flex-col items-center justify-center py-8 space-y-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
                      <p className="theme-text-muted text-sm text-center">
                        Analisando modelos relevantes com IA...
                      </p>
                    </div>
                  ) : modelLibrary.suggestions.length === 0 ? (
                    <p className="theme-text-muted text-sm">Nenhum modelo sugerido automaticamente</p>
                  ) : (
                    <div className="space-y-3">
                      {modelLibrary.suggestions.map((model, idx) => (
                        <SuggestionCard
                          key={model.id || idx}
                          model={model}
                          similarity={model.similarity}
                          index={idx}
                          totalSuggestions={modelLibrary.suggestions.length}
                          onPreview={modelPreview.openPreview}
                          onInsert={insertModelContent}
                          sanitizeHTML={sanitizeHTML}
                          showRanking={true}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EditorTabContent;

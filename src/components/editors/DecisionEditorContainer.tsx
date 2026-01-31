/**
 * @file DecisionEditorContainer.tsx
 * @description Container para editor de decisão individual
 * @version 1.40.05
 *
 * Refatorado para usar Zustand stores ao invés de prop drilling.
 * Props reduzidas de ~54 para ~6.
 *
 * @usedBy GlobalEditorModal
 */

import React from 'react';
import { QuillDecisionEditor, QuillMiniRelatorioEditor } from './QuillEditors';
import { CSS } from '../../constants/styles';
import { useEditorStore } from '../../stores/useEditorStore';
import { useRegenerationStore } from '../../stores/useRegenerationStore';
import { useTopicsStore } from '../../stores/useTopicsStore';
import { useModelsStore } from '../../stores/useModelsStore';
import type {
  DecisionEditorContainerProps,
  DecisionEditorContainerPropsLegacy,
  Topic,
  TopicCategory,
  OnSlashCommandCallback
} from '../../types';

// ═══════════════════════════════════════════════════════════════════════════
// TIPO COMBINADO (suporta props novas e legadas)
// ═══════════════════════════════════════════════════════════════════════════

type CombinedProps = DecisionEditorContainerProps | DecisionEditorContainerPropsLegacy;

/**
 * Type guard para verificar se as props são do novo formato
 */
const isNewProps = (props: CombinedProps): props is DecisionEditorContainerProps => {
  return 'callbacks' in props;
};

/**
 * DecisionEditorContainer - Container para edição de tópico individual
 *
 * Renderiza editores de mini-relatório e decisão/fundamentação
 * baseado na configuração do tópico.
 *
 * @version 1.40.05 - Refatorado para usar Zustand stores
 */
const DecisionEditorContainer = React.memo(React.forwardRef<HTMLDivElement, CombinedProps>((props, containerRef) => {
  // ─────────────────────────────────────────────────────────────────────────
  // STORES
  // ─────────────────────────────────────────────────────────────────────────
  const {
    editorTheme,
    toggleEditorTheme,
    quillReady: storeQuillReady,
    quillError: storeQuillError,
    isDirty: storeIsDirty
  } = useEditorStore();

  const {
    relatorioInstruction: storeRelatorioInstruction,
    setRelatorioInstruction,
    regeneratingRelatorio: storeRegeneratingRelatorio,
    dispositivoInstruction: storeDispositivoInstruction,
    setDispositivoInstruction,
    regeneratingDispositivo: storeRegeneratingDispositivo
  } = useRegenerationStore();

  const {
    selectedTopics: storeSelectedTopics,
    setSelectedTopics: storeSetSelectedTopics,
    extractedTopics: storeExtractedTopics,
    setExtractedTopics: storeSetExtractedTopics,
    savingTopic: storeSavingTopic
  } = useTopicsStore();

  const {
    models: storeModels,
    setPreviewingModel,
    contextualInsertFn
  } = useModelsStore();

  // ─────────────────────────────────────────────────────────────────────────
  // EXTRAIR PROPS (compatibilidade com formato novo e legado)
  // ─────────────────────────────────────────────────────────────────────────
  const {
    editorRef,
    relatorioRef,
    topic,
    getTopicEditorConfig,
    sanitizeHTML,
    versioning = null
  } = props;

  // Callbacks: usar do objeto agrupado ou das props individuais
  let callbacks: {
    onSave: () => void;
    onCancel: () => void;
    onSaveWithoutClosing?: () => void;
    onFundamentacaoChange: (html: string) => void;
    onRelatorioChange: (html: string) => void;
    onCategoryChange: (category: string) => void;
    onOpenAIAssistant?: () => void;
    onOpenJurisModal?: () => void;
    onExtractModel?: () => void;
    onSaveAsModel?: () => void;
    onOpenFactsComparison?: () => void;
    onRegenerateRelatorio?: () => void;
    onRegenerateDispositivo?: () => void;
    onTextSelection?: (text: string) => void;
    onSlashCommand?: OnSlashCommandCallback;
  };

  if (isNewProps(props)) {
    callbacks = props.callbacks;
  } else {
    // Props legadas - construir objeto de callbacks
    callbacks = {
      onSave: props.onSave,
      onCancel: props.onCancel,
      onSaveWithoutClosing: props.onSaveWithoutClosing,
      onFundamentacaoChange: props.onFundamentacaoChange,
      onRelatorioChange: props.onRelatorioChange,
      onCategoryChange: props.onCategoryChange,
      onOpenAIAssistant: props.onOpenAIAssistant,
      onOpenJurisModal: props.onOpenJurisModal,
      onExtractModel: props.onExtractModel,
      onSaveAsModel: props.onSaveAsModel,
      onOpenFactsComparison: props.onOpenFactsComparison ?? undefined,
      onRegenerateRelatorio: props.onRegenerateRelatorio,
      onRegenerateDispositivo: props.onRegenerateDispositivo,
      onTextSelection: props.onTextSelection,
      onSlashCommand: props.onSlashCommand
    };
  }

  // Valores que podem vir das props legadas ou das stores
  const savingTopic = isNewProps(props) ? (props.savingTopic ?? storeSavingTopic) : (props.savingTopic ?? storeSavingTopic);
  const extractingModel = isNewProps(props) ? props.extractingModel : props.extractingModel;
  const showExtractButton = isNewProps(props) ? props.showExtractButton : props.showExtractButton;
  const findSuggestions = isNewProps(props) ? props.findSuggestions : props.findSuggestions;

  // Valores das stores (com fallback para props legadas)
  const quillReady = isNewProps(props)
    ? storeQuillReady
    : (props.quillReady ?? storeQuillReady);
  const quillError = isNewProps(props)
    ? storeQuillError
    : (props.quillError ?? storeQuillError);
  const relatorioInstruction = isNewProps(props)
    ? storeRelatorioInstruction
    : (props.relatorioInstruction ?? storeRelatorioInstruction);
  const regeneratingRelatorio = isNewProps(props)
    ? storeRegeneratingRelatorio
    : (props.regeneratingRelatorio ?? storeRegeneratingRelatorio);
  const dispositivoInstruction = isNewProps(props)
    ? storeDispositivoInstruction
    : (props.dispositivoInstruction ?? storeDispositivoInstruction);
  const regeneratingDispositivo = isNewProps(props)
    ? storeRegeneratingDispositivo
    : (props.regeneratingDispositivo ?? storeRegeneratingDispositivo);
  const models = isNewProps(props)
    ? storeModels
    : (props.models ?? storeModels);
  const isDirty = isNewProps(props)
    ? storeIsDirty
    : (props.isDirty ?? storeIsDirty);

  // Handlers de instrução (usar store ou props legadas)
  const onInstructionChange = isNewProps(props)
    ? setRelatorioInstruction
    : (props.onInstructionChange ?? setRelatorioInstruction);
  const onDispositivoInstructionChange = isNewProps(props)
    ? setDispositivoInstruction
    : (props.onDispositivoInstructionChange ?? setDispositivoInstruction);

  // Handlers de modelo (usar store)
  const onInsertModel = isNewProps(props)
    ? contextualInsertFn ?? undefined
    : (props.onInsertModel ?? contextualInsertFn ?? undefined);
  const onPreviewModel = isNewProps(props)
    ? setPreviewingModel
    : (props.onPreviewModel ?? setPreviewingModel);

  // Topics: usar props legadas se disponíveis, senão store
  const selectedTopics = isNewProps(props)
    ? storeSelectedTopics
    : (props.selectedTopics ?? storeSelectedTopics);
  const setSelectedTopics = isNewProps(props)
    ? storeSetSelectedTopics
    : (props.setSelectedTopics ?? storeSetSelectedTopics);
  const extractedTopics = isNewProps(props)
    ? storeExtractedTopics
    : (props.extractedTopics ?? storeExtractedTopics);
  const setExtractedTopics = isNewProps(props)
    ? storeSetExtractedTopics
    : (props.setExtractedTopics ?? storeSetExtractedTopics);

  // ─────────────────────────────────────────────────────────────────────────
  // CONFIG DO EDITOR
  // ─────────────────────────────────────────────────────────────────────────
  const editorConfig = getTopicEditorConfig(topic.title);

  // ─────────────────────────────────────────────────────────────────────────
  // HANDLER DE CATEGORIA (MEMOIZADO)
  // ─────────────────────────────────────────────────────────────────────────
  const handleCategoryChange = React.useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCategory = e.target.value as TopicCategory;

    // Chamar callback do pai
    callbacks.onCategoryChange(newCategory);

    // Atualizar em selectedTopics
    const selectedIndex = selectedTopics.findIndex((t: Topic) => t.title === topic.title);
    if (selectedIndex !== -1) {
      const newSelected = [...selectedTopics];
      newSelected[selectedIndex] = { ...newSelected[selectedIndex], category: newCategory };
      setSelectedTopics(newSelected);
    }

    // Atualizar em extractedTopics
    const extractedIndex = extractedTopics.findIndex((t: Topic) => t.title === topic.title);
    if (extractedIndex !== -1) {
      const newExtracted = [...extractedTopics];
      newExtracted[extractedIndex] = { ...newExtracted[extractedIndex], category: newCategory };
      setExtractedTopics(newExtracted);
    }
  }, [callbacks, topic.title, selectedTopics, extractedTopics, setSelectedTopics, setExtractedTopics]);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div ref={containerRef} className="space-y-4">
      {/* Header com título e categoria */}
      <div className="flex items-center gap-3 flex-wrap">
        <h3 className="text-xl font-bold text-blue-400">{topic.title.toUpperCase()}</h3>

        {/* Seletor de categoria - condicional baseado em config */}
        {editorConfig.showCategory && (
          <select
            value={topic.category || 'MÉRITO'}
            onChange={handleCategoryChange}
            className="text-xs px-3 py-2 rounded cursor-pointer font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 border-2 theme-border theme-text-secondary theme-bg-tertiary hover-slate-500"
            title="Clique para alterar a categoria"
          >
            <option value="PRELIMINAR">Preliminar</option>
            <option value="PREJUDICIAL">Prejudicial</option>
            <option value="MÉRITO">Mérito</option>
            <option value="PROCESSUAL">Processual</option>
          </select>
        )}
      </div>

      {/* Mini-Relatório */}
      {editorConfig.showMiniRelatorio && (
        <QuillMiniRelatorioEditor
          ref={relatorioRef}
          content={topic.editedRelatorio || topic.relatorio || ''}
          topicTitle={topic.title}
          onChange={callbacks.onRelatorioChange}
          onRegenerate={callbacks.onRegenerateRelatorio}
          onSaveWithoutClosing={callbacks.onSaveWithoutClosing}
          customInstruction={relatorioInstruction}
          onInstructionChange={onInstructionChange}
          regenerating={regeneratingRelatorio}
          quillReady={quillReady}
          quillError={quillError}
          editorTheme={editorTheme}
          toggleEditorTheme={toggleEditorTheme}
          onSlashCommand={callbacks.onSlashCommand}
          {...editorConfig.relatorioConfig}
        />
      )}

      {/* Editor de Decisão */}
      {editorConfig.showDecisionEditor && (
        <QuillDecisionEditor
          ref={editorRef}
          content={
            topic.title.toUpperCase() === 'DISPOSITIVO'
              ? (topic.editedContent || '')
              : (topic.fundamentacao || topic.editedFundamentacao || '')
          }
          topicTitle={topic.title}
          topicCategory={topic.category}
          onChange={callbacks.onFundamentacaoChange}
          onSaveWithoutClosing={callbacks.onSaveWithoutClosing}
          onOpenAIAssistant={callbacks.onOpenAIAssistant}
          onOpenJurisModal={callbacks.onOpenJurisModal}
          onExtractModel={callbacks.onExtractModel}
          onSaveAsModel={callbacks.onSaveAsModel}
          extractingModel={extractingModel}
          showExtractButton={showExtractButton}
          quillReady={typeof window !== 'undefined' && (window as unknown as { Quill?: unknown }).Quill !== undefined}
          quillError={null}
          onRegenerate={topic.title.toUpperCase() === 'DISPOSITIVO' ? callbacks.onRegenerateDispositivo : undefined}
          customInstruction={topic.title.toUpperCase() === 'DISPOSITIVO' ? dispositivoInstruction : ''}
          onInstructionChange={topic.title.toUpperCase() === 'DISPOSITIVO' ? onDispositivoInstructionChange : undefined}
          regenerating={topic.title.toUpperCase() === 'DISPOSITIVO' ? regeneratingDispositivo : false}
          showRegenerateSection={topic.title.toUpperCase() === 'DISPOSITIVO'}
          editorTheme={editorTheme}
          toggleEditorTheme={toggleEditorTheme}
          models={models}
          onInsertModel={onInsertModel}
          onPreviewModel={onPreviewModel}
          sanitizeHTML={sanitizeHTML}
          topicRelatorio={topic.relatorio || topic.editedRelatorio || ''}
          onFindSuggestions={findSuggestions}
          onSlashCommand={callbacks.onSlashCommand}
          isDirty={isDirty}
          versioning={versioning}
          onBlur={(html: string) => versioning?.saveVersion(topic.title, html)}
          onOpenFactsComparison={topic.title.toUpperCase() !== 'DISPOSITIVO' ? callbacks.onOpenFactsComparison : null}
          {...editorConfig.editorConfig}
        />
      )}

      {/* Footer com botões */}
      <div className="flex gap-3">
        <button
          onClick={callbacks.onCancel}
          disabled={savingTopic}
          className="flex-1 py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed theme-bg-secondary hover-slate-600-from-700 transition-all duration-300"
        >
          Cancelar
        </button>
        <button
          onClick={callbacks.onSave}
          disabled={savingTopic}
          className="flex-1 py-3 rounded-lg font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover-gradient-blue-purple transition-all duration-300"
        >
          {savingTopic ? (
            <>
              <div className={CSS.spinner}></div>
              <span>Salvando...</span>
            </>
          ) : (
            'Salvar e Fechar'
          )}
        </button>
      </div>
    </div>
  );
}));

DecisionEditorContainer.displayName = 'DecisionEditorContainer';

export default DecisionEditorContainer;
export { DecisionEditorContainer };

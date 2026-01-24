/**
 * @file DecisionEditorContainer.tsx
 * @description Container para editor de decisão individual
 * @version 1.36.97
 *
 * Extraído de App.tsx para modularização.
 * Usado no GlobalEditorModal quando editando tópico individual.
 *
 * @usedBy GlobalEditorModal
 */

import React from 'react';
import { QuillDecisionEditor, QuillMiniRelatorioEditor } from './QuillEditors';
import { CSS } from '../../constants/styles';
import type { DecisionEditorContainerProps, Topic, TopicCategory } from '../../types';

/**
 * DecisionEditorContainer - Container para edição de tópico individual
 *
 * Renderiza editores de mini-relatório e decisão/fundamentação
 * baseado na configuração do tópico.
 */
const DecisionEditorContainer = React.memo(React.forwardRef<HTMLDivElement, DecisionEditorContainerProps>(({
  editorRef,
  relatorioRef,
  toolbarRef: _toolbarRef,
  topic,
  onSave,
  onCancel,
  onSaveWithoutClosing,
  onCategoryChange,
  onFundamentacaoChange,
  onRelatorioChange,
  onOpenAIAssistant,
  onOpenJurisModal,
  onExtractModel,
  onSaveAsModel,
  onRegenerateRelatorio,
  savingTopic,
  extractingModel,
  showExtractButton,
  regeneratingRelatorio,
  relatorioInstruction,
  onInstructionChange,
  sanitizeHTML,
  onTextSelection: _onTextSelection,
  // Para atualização de categoria
  selectedTopics,
  setSelectedTopics,
  extractedTopics,
  setExtractedTopics,
  getTopicEditorConfig,
  quillReady,
  quillError,
  onRegenerateDispositivo,
  dispositivoInstruction,
  onDispositivoInstructionChange,
  regeneratingDispositivo,
  editorTheme,
  toggleEditorTheme,
  models,
  onInsertModel,
  onPreviewModel,
  findSuggestions,
  onSlashCommand,
  isDirty = false,
  versioning = null,
  onOpenFactsComparison = null // v1.36.21: Confronto de Fatos
}, containerRef) => {

  const editorConfig = getTopicEditorConfig(topic.title);

  // v1.8.3: Handler para mudança de categoria (MEMOIZADO)
  const handleCategoryChange = React.useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCategory = e.target.value as TopicCategory;

    // Chamar callback do pai
    onCategoryChange(newCategory);

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
  }, [onCategoryChange, topic.title, selectedTopics, extractedTopics, setSelectedTopics, setExtractedTopics]);

  return (
    <div ref={containerRef} className="space-y-4">
      {/* Header com título e categoria */}
      <div className="flex items-center gap-3 flex-wrap">
        <h3 className="text-xl font-bold text-blue-400">{topic.title.toUpperCase()}</h3>

        {/* v1.4.7: Seletor de categoria - condicional baseado em config */}
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

      {/* v1.5.1: Mini-Relatório - migrado para Quill.js (ETAPA 4) */}
      {editorConfig.showMiniRelatorio && (
      <QuillMiniRelatorioEditor
        ref={relatorioRef}
        content={topic.editedRelatorio || topic.relatorio || ''}
        topicTitle={topic.title}
        onChange={onRelatorioChange}
        onRegenerate={onRegenerateRelatorio}
        onSaveWithoutClosing={onSaveWithoutClosing}
        customInstruction={relatorioInstruction}
        onInstructionChange={onInstructionChange}
        regenerating={regeneratingRelatorio}
        quillReady={quillReady}
        quillError={quillError}
        editorTheme={editorTheme}
        toggleEditorTheme={toggleEditorTheme}
        onSlashCommand={onSlashCommand}
        {...editorConfig.relatorioConfig}
      />
      )}

      {/* v1.5.0: Editor de Decisão migrado para Quill.js (ETAPA 3) */}
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
        onChange={onFundamentacaoChange}
        onSaveWithoutClosing={onSaveWithoutClosing}
        onOpenAIAssistant={onOpenAIAssistant}
        onOpenJurisModal={onOpenJurisModal}
        onExtractModel={onExtractModel}
        onSaveAsModel={onSaveAsModel}
        extractingModel={extractingModel}
        showExtractButton={showExtractButton}
        quillReady={typeof window !== 'undefined' && (window as unknown as { Quill?: unknown }).Quill !== undefined}
        quillError={null}
        onRegenerate={topic.title.toUpperCase() === 'DISPOSITIVO' ? onRegenerateDispositivo : undefined}
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
        onSlashCommand={onSlashCommand}
        isDirty={isDirty}
        versioning={versioning}
        onBlur={(html: string) => versioning?.saveVersion(topic.title, html)}
        onOpenFactsComparison={topic.title.toUpperCase() !== 'DISPOSITIVO' ? onOpenFactsComparison : null}
        {...editorConfig.editorConfig}
      />
      )}

      {/* Footer com botões */}
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          disabled={savingTopic}
          className="flex-1 py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed theme-bg-secondary hover-slate-600-from-700 transition-all duration-300"
        >
          Cancelar
        </button>
        <button
          onClick={onSave}
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

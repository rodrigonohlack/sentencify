/**
 * @file ModelForms.tsx
 * @description Componentes de formulario para modelos
 * @version 1.36.94
 *
 * Extraido do App.tsx como parte da FASE 3 de refatoracao.
 * Inclui: ModelFormFields, ModelFormModal
 */

import React from 'react';
import { CSS } from '../modals/BaseModal';
import { QuillModelEditor } from '../editors';
import type { Model, ModelFormModalProps, LocalModelForm } from '../../types';

// ═══════════════════════════════════════════════════════════════════════════════
// MODEL FORM FIELDS
// ═══════════════════════════════════════════════════════════════════════════════

export interface ModelFormFieldsProps {
  formData: { title: string; category: string; keywords: string; content: string };
  onChange: (field: string, value: string) => void;
  categories: string[];
  onGenerateKeywords: () => void;
  generatingKeywords?: boolean;
  onGenerateTitle: () => void;
  generatingTitle?: boolean;
}

export const ModelFormFields = React.memo(({
  formData,
  onChange,
  categories,
  onGenerateKeywords,
  generatingKeywords,
  onGenerateTitle,
  generatingTitle
}: ModelFormFieldsProps) => {

  const handleFieldChange = React.useCallback((field: string, value: string) => {
    onChange(field, value);
  }, [onChange]);

  return (
    <div className="space-y-4">
      {/* Campo Titulo com botao de geracao IA */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium theme-text-tertiary">Titulo</label>
          <button
            onClick={onGenerateTitle}
            disabled={generatingTitle || !formData.content}
            className="flex items-center gap-1 px-3 py-1 text-xs text-white bg-purple-600 disabled:theme-bg-tertiary disabled:cursor-not-allowed rounded hover-purple-700-from-600 transition-colors"
            title="Gerar titulo com IA baseado no conteudo"
          >
            {generatingTitle ? (
              <>
                <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Gerando...
              </>
            ) : (
              <>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Gerar com IA
              </>
            )}
          </button>
        </div>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => handleFieldChange('title', e.target.value)}
          className="w-full theme-bg-primary border theme-border-input rounded-lg p-3 theme-text-primary focus:border-blue-500 focus:outline-none transition-colors"
          placeholder="Ex: HORAS EXTRAS - SOBREJORNADA - PROCEDENTE"
        />
      </div>

      {/* Campo Categoria com autocomplete */}
      <div>
        <label className={CSS.label}>Categoria</label>
        <input
          type="text"
          value={formData.category}
          onChange={(e) => handleFieldChange('category', e.target.value)}
          className="w-full theme-bg-primary border theme-border-input rounded-lg p-3 theme-text-primary focus:border-blue-500 focus:outline-none transition-colors"
          placeholder="Ex: Verbas Rescisorias, Jornada de Trabalho, Preliminares"
          list="categories-list"
        />
        <datalist id="categories-list">
          {categories.map((cat: string, idx: number) => (
            <option key={idx} value={cat} />
          ))}
        </datalist>
      </div>

      {/* Campo Keywords com botao de geracao IA */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium theme-text-tertiary">Palavras-chave</label>
          <button
            onClick={onGenerateKeywords}
            disabled={generatingKeywords || (!formData.title && !formData.content)}
            className="flex items-center gap-1 px-3 py-1 text-xs text-white bg-purple-600 disabled:theme-bg-tertiary disabled:cursor-not-allowed rounded hover-purple-700-from-600 transition-colors"
            title="Gerar palavras-chave com IA"
          >
            {generatingKeywords ? (
              <>
                <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Gerando...
              </>
            ) : (
              <>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Gerar com IA
              </>
            )}
          </button>
        </div>
        <input
          type="text"
          value={formData.keywords}
          onChange={(e) => handleFieldChange('keywords', e.target.value)}
          className="w-full theme-bg-primary border theme-border-input rounded-lg p-3 theme-text-primary focus:border-blue-500 focus:outline-none transition-colors"
          placeholder="horas extras, sobrejornada, adicional"
        />
      </div>
    </div>
  );
});

ModelFormFields.displayName = 'ModelFormFields';

// ═══════════════════════════════════════════════════════════════════════════════
// MODEL FORM MODAL
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Container para edição de modelos
 * v1.35.10: Estado local bufferizado para evitar re-render
 * v1.35.92: Tipagem correta com ModelFormModalProps
 */
export const ModelFormModal = React.forwardRef<HTMLDivElement, ModelFormModalProps>(({
  isOpen,
  editingModel,
  newModel,
  setNewModel,
  models,
  onSave,
  onCancel,
  onGenerateKeywords,
  generatingKeywords,
  onGenerateTitle,
  generatingTitle,
  onSaveWithoutClosing,
  onOpenAIAssistant,
  sanitizeHTML: _sanitizeHTML,
  modelEditorRef,
  quillReady = false,
  quillError = null,
  editorTheme,
  toggleEditorTheme,
  modelSaved = false,
  savingModel = false
}, containerRef) => {

  // v1.35.10: Estado LOCAL para campos do formulario
  const [localModel, setLocalModel] = React.useState<LocalModelForm>({ title: '', content: '', keywords: '', category: '' });

  // v1.35.10: Sincronizar estado local quando modal abre ou editingModel muda
  React.useEffect(() => {
    if (isOpen) {
      setLocalModel({
        title: newModel.title || '',
        content: newModel.content || '',
        keywords: Array.isArray(newModel.keywords) ? newModel.keywords.join(', ') : (newModel.keywords || ''),
        category: newModel.category || ''
      });
    }
  }, [isOpen, editingModel]);

  // v1.37.11: Sincronizar localModel quando IA gera título
  React.useEffect(() => {
    if (isOpen && newModel.title && newModel.title !== localModel.title) {
      setLocalModel(prev => ({ ...prev, title: newModel.title }));
    }
  }, [isOpen, newModel.title]);

  // v1.37.11: Sincronizar localModel quando IA gera keywords
  React.useEffect(() => {
    if (isOpen && newModel.keywords) {
      const keywords = Array.isArray(newModel.keywords)
        ? newModel.keywords.join(', ')
        : (newModel.keywords || '');
      if (keywords !== localModel.keywords) {
        setLocalModel(prev => ({ ...prev, keywords }));
      }
    }
  }, [isOpen, newModel.keywords]);

  // v1.35.3: Memoizar categorias para evitar recalculo a cada keystroke
  const categories = React.useMemo(() => {
    return [...new Set(models.map((m: Model) => m.category).filter((c: string | undefined | null): c is string => !!c && c.trim() !== ''))].sort();
  }, [models]);

  // v1.35.10: Handler para mudancas nos campos - atualiza estado LOCAL
  const handleFieldChange = React.useCallback((field: string, value: string) => {
    setLocalModel((prev: LocalModelForm) => ({ ...prev, [field]: value }));
  }, []);

  // v1.35.10: Handler para mudancas no editor rico - atualiza estado LOCAL
  const handleContentChange = React.useCallback((html: string) => {
    setLocalModel(prev => ({ ...prev, content: html }));
  }, []);

  // v1.36.1: Passa localModel diretamente para evitar race condition
  const handleSave = React.useCallback(() => {
    setNewModel(localModel);
    onSave(localModel);
  }, [localModel, setNewModel, onSave]);

  // v1.36.1: Passa localModel diretamente para evitar race condition
  const handleSaveWithoutClosing = React.useCallback(() => {
    setNewModel(localModel);
    onSaveWithoutClosing(localModel);
  }, [localModel, setNewModel, onSaveWithoutClosing]);

  // v1.35.5: Return condicional APOS todos os hooks
  if (!isOpen) return null;

  return (
    <div ref={containerRef} className="theme-bg-secondary-30 p-6 rounded-lg border theme-border-input space-y-4">
      {/* Header dinamico */}
      <h4 className="text-lg font-bold theme-text-primary">
        {editingModel ? 'Editar Modelo' : 'Novo Modelo'}
      </h4>

      {/* Campos simples (titulo, categoria, keywords) - usam estado LOCAL */}
      <ModelFormFields
        formData={localModel}
        onChange={handleFieldChange}
        categories={categories}
        onGenerateKeywords={onGenerateKeywords}
        generatingKeywords={generatingKeywords}
        onGenerateTitle={onGenerateTitle}
        generatingTitle={generatingTitle}
      />

      {/* Editor rico de conteudo - usa estado LOCAL */}
      <QuillModelEditor
        ref={modelEditorRef}
        content={localModel.content || ''}
        onChange={handleContentChange}
        onSaveWithoutClosing={handleSaveWithoutClosing}
        onOpenAIAssistant={onOpenAIAssistant}
        quillReady={quillReady}
        quillError={quillError}
        editorTheme={editorTheme}
        toggleEditorTheme={toggleEditorTheme}
      />

      {/* Botoes de acao */}
      <div className="flex gap-3 pt-4">
        <button
          onClick={onCancel}
          className="px-6 py-3 rounded-lg theme-bg-tertiary hover-slate-500"
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={modelSaved || savingModel}
          style={{
            backgroundImage: (modelSaved || savingModel) ? 'none' : 'linear-gradient(to right, #2563eb, #9333ea)',
            backgroundColor: modelSaved ? '#16a34a' : (savingModel ? '#6b7280' : 'transparent'),
            transition: 'all 0.3s ease'
          }}
          className={`flex-1 px-6 py-3 rounded-lg font-medium text-white ${(modelSaved || savingModel) ? '' : 'hover-gradient-blue-purple'}`}
        >
          {modelSaved ? '✓ Alterações Salvas' : (savingModel ? 'Salvando...' : (editingModel ? 'Salvar Alterações' : 'Salvar Modelo'))}
        </button>
      </div>
    </div>
  );
});

ModelFormModal.displayName = 'ModelFormModal';

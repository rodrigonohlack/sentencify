/**
 * @file ModelForms.tsx
 * @description Componentes de formulario para modelos
 * @version 1.36.93
 *
 * Extraido do App.tsx como parte da FASE 3 de refatoracao.
 * Inclui: ModelFormFields
 *
 * Nota: ModelFormModal permanece em App.tsx pois depende de QuillModelEditor
 */

import React from 'react';
import { CSS } from '../modals/BaseModal';

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

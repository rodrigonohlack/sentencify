/**
 * @file PreviewModals.tsx
 * @description Modal de preview de modelo
 * @version 1.36.94
 *
 * Extraído do App.tsx v1.36.93
 */

import React from 'react';
import { X, Copy } from 'lucide-react';
import { CSS } from './BaseModal';
import { VoiceButton } from '../VoiceButton';
import { QuillEditorBase, getQuillToolbarConfig } from '../editors';
import type { QuillInstance, ModelPreviewModalProps, Model } from '../../types';

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER: extractPlainText
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Extrai texto puro de HTML
 */
const extractPlainText = (html: string): string => {
  if (!html) return '';
  const temp = document.createElement('div');
  temp.innerHTML = html;
  return temp.textContent || temp.innerText || '';
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE: ModelPreviewModal
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Preview de modelo
 * v1.35.92: Tipagem correta com ModelPreviewModalProps
 */
export const ModelPreviewModal: React.FC<ModelPreviewModalProps> = ({
  isOpen,
  model,
  onInsert,
  onClose,
  sanitizeHTML,
  showToast,
  // Props para modo de edição (Quick Edit)
  isEditing = false,
  editedContent = '',
  onStartEditing,
  onCancelEditing,
  onSaveEdit,
  onContentChange,
  quillReady = false,
  quillError = null,
  // Props para configurações globais de editor
  fontSize = 'normal',
  spacing = 'normal',
  editorTheme = 'dark',
  // Prop para exclusão de modelo
  onDelete,
  // Prop para favoritar modelo
  onToggleFavorite,
  // v1.15.3: Prop para "Salvar como Novo Modelo"
  onOpenSaveAsNew,
}) => {
  // Ref para o editor Quill em modo edição
  const quickEditRef = React.useRef<QuillInstance | null>(null);

  // Conteúdo Sanitizado (Memoizado para Performance)
  const sanitizedContent = React.useMemo(
    () => model ? sanitizeHTML(model.content || '<p class="theme-text-muted">Conteúdo não disponível</p>') : '',
    [model?.content, sanitizeHTML]
  );

  // Handler de Inserção (Insere + Fecha)
  const handleInsert = React.useCallback(() => {
    if (model) {
      onInsert(model.content);
      onClose();
    }
  }, [model?.content, onInsert, onClose]);

  // Handler de Copiar (Copia para Clipboard)
  const handleCopy = React.useCallback(() => {
    if (!model) return;
    const plainText = extractPlainText(model.content);

    navigator.clipboard.writeText(plainText)
      .then(() => {
        showToast?.('✅ Modelo copiado para área de transferência', 'success');
      })
      .catch(err => {
        showToast?.('❌ Erro ao copiar modelo', 'error');
      });
  }, [model?.content, showToast]);

  // v1.35.61: Handler para Voice-to-Text no modo Quick Edit
  const handleVoiceTranscript = React.useCallback((text: string) => {
    const quill = quickEditRef.current;
    if (quill) {
      requestAnimationFrame(() => {
        const range = quill.getSelection() || { index: quill.getLength() - 1 };
        quill.insertText(range.index, text + ' ');
        quill.setSelection(range.index + text.length + 1);
      });
    }
  }, []);

  // v1.35.67: ESC handler
  React.useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // v1.35.67: Scroll lock
  React.useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = originalOverflow; };
    }
  }, [isOpen]);

  // Early Return se Modal Fechado
  if (!isOpen) {
    return null;
  }

  // Error State se Modelo Inválido
  if (!model) {
    return (
      <div className={CSS.modalOverlay} onClick={onClose}>
        <div className={`${CSS.modalContainer} theme-border-modal theme-modal-glow animate-modal p-6`} onClick={e => e.stopPropagation()}>
          <p className="text-red-400 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Erro: Modelo não encontrado
          </p>
          <button
            onClick={onClose}
            className="w-full px-4 py-3 rounded-lg font-medium text-white theme-bg-tertiary hover-slate-500"
          >
            Fechar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={CSS.modalOverlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-modal-title"
      onClick={onClose}
    >

      {/* Modal Container */}
      <div
        className={`${CSS.modalContainer} theme-border-modal theme-modal-glow animate-modal flex flex-col`}
        style={{
          width: '90%',
          maxWidth: '1000px',
          height: '85vh',
          maxHeight: '85vh',
          contain: 'content'
        }}
        onClick={e => e.stopPropagation()}
      >

        {/* Header */}
        <div className="p-4 sm:p-6 border-b theme-border-input flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 pr-4">
              <div className="flex items-center gap-2 mb-2">
                <h3 id="preview-modal-title" className="text-xl font-bold theme-text-primary">
                  {model.title}
                </h3>
                {onToggleFavorite && (
                  <button
                    onClick={() => onToggleFavorite(model.id)}
                    className="text-xl hover:scale-110 transition-transform"
                    title={model.favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                  >
                    {model.favorite ? '⭐' : '☆'}
                  </button>
                )}
              </div>

              {/* Metadata: Categoria + Keywords */}
              <div className="flex items-center gap-3 flex-wrap">
                {model.category && (
                  <span className="px-2 py-1 theme-bg-purple-accent theme-text-purple rounded text-sm border border-purple-500/30">
                    {model.category}
                  </span>
                )}
                {model.keywords && (
                  <span className="theme-text-muted text-sm flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                    {model.keywords}
                  </span>
                )}
              </div>
            </div>

            {/* Botão Fechar (X) */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl theme-bg-secondary-50 theme-hover-bg transition-colors"
              aria-label="Fechar modal"
              title="Fechar"
            >
              <X className="w-5 h-5 theme-text-tertiary" />
            </button>
          </div>
        </div>

        {/* Body: Conteúdo Scrollável ou Editor */}
        <div
          className="flex-1 p-4 sm:p-6 overflow-y-auto"
          style={{
            minHeight: 0,
            overflowY: 'auto',
            transition: 'none'
          }}
        >
          {isEditing ? (
            // Modo Edição: Quill Editor
            <div className="space-y-2">
              <div className="flex justify-end">
                <VoiceButton
                  onTranscript={handleVoiceTranscript}
                  size="md"
                  idleText="Ditar"
                  onError={(err: unknown) => console.warn('[VoiceToText]', err)}
                />
              </div>
              <div
                className={`quick-edit-wrapper fontsize-${fontSize} spacing-${spacing} ${editorTheme === 'light' ? 'quill-light-theme bg-white' : 'theme-bg-primary'} border theme-border-input rounded-lg`}
                style={{
                  maxHeight: 'calc(55vh + 4px)',
                  overflow: 'hidden'
                }}
              >
                <QuillEditorBase
                  ref={quickEditRef}
                  content={editedContent}
                  onChange={(html: string) => onContentChange?.(html)}
                  toolbarConfig={getQuillToolbarConfig('simple')}
                  placeholder="Edite o conteúdo do modelo..."
                  className="flex-1"
                  quillReady={quillReady}
                  quillError={quillError}
                />
              </div>
            </div>
          ) : (
            // Modo Visualização: HTML renderizado
            <div
              className={`model-preview-content ${editorTheme === 'light' ? 'light-theme-content' : ''}`}
              dangerouslySetInnerHTML={{ __html: sanitizedContent }}
            />
          )}
        </div>

        {/* Footer: Botões de Ação */}
        <div className="p-4 sm:p-6 border-t theme-border-input flex gap-3 justify-end flex-shrink-0">
          {isEditing ? (
            // Botões modo edição
            <>
              <button
                onClick={onCancelEditing}
                className="px-4 py-3 rounded-lg font-medium text-white theme-bg-tertiary hover-slate-500"
              >
                Cancelar
              </button>
              <button
                onClick={() => onSaveEdit?.(quickEditRef)}
                className="hover-green-500 px-4 py-2 text-white rounded-lg font-semibold flex items-center gap-2 bg-green-600"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Atualizar Modelo
              </button>
              {onOpenSaveAsNew && (
                <button
                  onClick={() => {
                    const content = quickEditRef.current?.root?.innerHTML || editedContent;
                    onOpenSaveAsNew(content, model);
                  }}
                  className="hover-purple-700 px-4 py-2 text-white rounded-lg font-semibold flex items-center gap-2 bg-purple-600"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  Salvar como Novo
                </button>
              )}
            </>
          ) : (
            // Botões modo visualização
            <>
              <button
                onClick={onClose}
                className="px-4 py-3 rounded-lg font-medium text-white theme-bg-tertiary hover-slate-500"
              >
                Fechar
              </button>
              <button
                onClick={handleCopy}
                className="hover-green-700 px-4 py-2 text-white rounded-lg font-semibold flex items-center gap-2 bg-green-600"
              >
                <Copy className="w-4 h-4" />
                Copiar
              </button>
              <button
                onClick={onStartEditing}
                className="hover-yellow-alpha px-4 py-2 rounded-lg font-semibold flex items-center gap-2 border border-yellow-500 text-yellow-400"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
                Editar
              </button>
              <button
                onClick={handleInsert}
                className="hover-blue-700 px-4 py-2 text-white rounded-lg font-semibold flex items-center gap-2 bg-blue-600"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                </svg>
                Inserir no Editor
              </button>
              {onDelete && model && (
                <button
                  onClick={() => { onDelete(model); onClose(); }}
                  className="hover-red-700-from-600 px-4 py-2 text-white rounded-lg font-semibold flex items-center gap-2 bg-red-600"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Excluir
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

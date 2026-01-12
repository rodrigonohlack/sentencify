/**
 * @file ModelExtractionModals.tsx
 * @description Modais relacionados à extração e criação de modelos
 * @version 1.36.88
 *
 * Extraído do App.tsx como parte da FASE 3 de refatoração.
 * - ExtractModelConfirmModal: confirmação antes de criar modelo genérico
 * - ExtractedModelPreviewModal: preview e edição do modelo extraído
 * - SimilarityWarningModal: aviso de modelo similar encontrado
 */

import React from 'react';
import { Zap, X, Edit, Save, AlertTriangle } from 'lucide-react';
import { CSS } from './BaseModal';
import type { ExtractModelConfirmModalProps, ExtractedModelPreviewModalProps, SimilarityWarningModalProps } from '../../types';

// Modal: Confirmar Extração de Modelo
export const ExtractModelConfirmModal = React.memo(({
  isOpen,
  onClose,
  editingTopic,
  editorRef,
  onConfirmExtract
}: ExtractModelConfirmModalProps) => {
  // ESC handler
  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className={CSS.modalOverlay}>
      <div className={`${CSS.modalContainer} theme-border-modal theme-modal-glow animate-modal max-w-lg w-full`}>
        <div className={CSS.modalHeader}>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-purple-500/20">
                <Zap className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold theme-text-primary">Criar Modelo Genérico</h3>
                <p className="text-sm theme-text-muted">Confirme a criação do modelo reutilizável</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl theme-bg-secondary-50 theme-hover-bg transition-colors"
              title="Fechar"
            >
              <X className="w-5 h-5 theme-text-tertiary" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4 mb-4">
            <p className="theme-text-tertiary text-sm mb-3">
              A IA irá analisar seu texto e criar um <strong>modelo genérico reutilizável</strong> que:
            </p>
            <ul className="text-xs theme-text-muted space-y-2 ml-4 list-disc">
              <li>Remove nomes específicos de pessoas e empresas</li>
              <li>Remove valores monetários e datas</li>
              <li>Mantém a fundamentação jurídica intacta</li>
              <li>Gera palavras-chave automaticamente</li>
              <li>Salva na biblioteca de modelos</li>
            </ul>
          </div>

          {/* v1.9.37: Cores corrigidas para tema claro */}
          <div className="bg-amber-500/10 border border-amber-500/40 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <span className="text-amber-500 text-lg">⚠️</span>
              <div>
                <p className="text-xs text-amber-700 dark:text-amber-200 font-semibold mb-1">Atenção:</p>
                <p className="text-xs text-amber-600 dark:text-amber-100">
                  O texto atual será enviado para a API da Anthropic para processamento.
                  Certifique-se de que não há informações sensíveis que não devem ser compartilhadas.
                </p>
              </div>
            </div>
          </div>

          <div className="theme-bg-secondary-50 rounded-lg p-3 mb-4">
            <p className="text-xs theme-text-muted mb-1">
              <strong className="theme-text-tertiary">Tópico:</strong> {editingTopic?.title}
            </p>
            <p className={CSS.textMuted}>
              <strong className="theme-text-tertiary">Tamanho do texto:</strong> {editorRef?.current?.root?.innerText?.length || 0} caracteres
            </p>
          </div>
        </div>

        <div className={CSS.modalFooter}>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-lg font-medium hover-slate-700-from-600"
          >
            ❌ Cancelar
          </button>
          <button
            onClick={onConfirmExtract}
            className="flex-1 px-4 py-3 rounded-lg font-medium shadow-lg hover-gradient-purple-pink bg-gradient-to-r from-purple-600 to-pink-500 text-white transition-all duration-300"
          >
            ✨ Criar Modelo
          </button>
        </div>
      </div>
    </div>
  );
});

ExtractModelConfirmModal.displayName = 'ExtractModelConfirmModal';

// Modal: Preview de Modelo Extraído
export const ExtractedModelPreviewModal = React.memo(({
  isOpen,
  onClose,
  extractedModel,
  setExtractedModel,
  onSave,
  onCancel,
  sanitizeHTML = (html: string) => html || ''
}: ExtractedModelPreviewModalProps) => {
  // ESC handler
  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen || !extractedModel) return null;

  return (
    <div className={`${CSS.modalOverlay} overflow-y-auto`} style={{ alignItems: 'flex-start', paddingTop: '2rem' }}>
      <div className={`${CSS.modalContainer} theme-border-modal theme-modal-glow animate-modal max-w-4xl w-full my-8`}>
        {/* Header */}
        <div className={CSS.modalHeader}>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-purple-500/20">
                <Edit className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold theme-text-primary">Revisar e Editar Modelo Gerado</h3>
                <p className="text-sm theme-text-muted">Revise o modelo extraído antes de salvá-lo na biblioteca</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl theme-bg-secondary-50 theme-hover-bg transition-colors"
              title="Fechar"
            >
              <X className="w-5 h-5 theme-text-tertiary" />
            </button>
          </div>
        </div>

        {/* Conteúdo editável */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Título */}
          <div>
            <label className="block text-sm font-semibold theme-text-tertiary mb-2">
              Título do Modelo
            </label>
            <input
              type="text"
              value={extractedModel.title}
              onChange={(e) => setExtractedModel({ ...extractedModel, title: e.target.value })}
              className="w-full px-4 py-3 theme-bg-secondary border theme-border-input rounded-lg theme-text theme-placeholder focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-all"
              placeholder="Ex: Adicional de Periculosidade - Modelo"
            />
          </div>

          {/* Categoria */}
          <div>
            <label className="block text-sm font-semibold theme-text-tertiary mb-2">
              📂 Categoria
            </label>
            <select
              value={extractedModel.category || ''}
              onChange={(e) => setExtractedModel({ ...extractedModel, category: e.target.value })}
              className="w-full px-4 py-3 theme-bg-secondary border theme-border-input rounded-lg theme-text focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-all"
            >
              <option value="Preliminar">Preliminar</option>
              <option value="Mérito">Mérito</option>
              <option value="Pedidos">Pedidos</option>
              <option value="Outros">Outros</option>
            </select>
          </div>

          {/* Palavras-chave */}
          <div>
            <label className="block text-sm font-semibold theme-text-tertiary mb-2">
              🏷️ Palavras-chave
            </label>
            <input
              type="text"
              value={extractedModel.keywords || ''}
              onChange={(e) => setExtractedModel({ ...extractedModel, keywords: e.target.value })}
              className="w-full px-4 py-3 theme-bg-secondary border theme-border-input rounded-lg theme-text theme-placeholder focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-all"
              placeholder="palavras, separadas, por vírgulas"
            />
            <p className="text-xs theme-text-muted mt-1">Separe as palavras-chave com vírgulas</p>
          </div>

          {/* Preview do Conteúdo */}
          <div>
            <label className="block text-sm font-semibold theme-text-tertiary mb-2">
              Preview do Conteúdo
            </label>
            <div
              className="w-full px-4 py-3 theme-bg-secondary border theme-border-input rounded-lg min-h-[200px] max-h-[300px] overflow-y-auto theme-text"
              dangerouslySetInnerHTML={{ __html: sanitizeHTML(extractedModel.content || '') }}
            />
            <p className="text-xs theme-text-muted mt-1">
              Conteúdo editado no modal anterior
            </p>
          </div>
        </div>

        {/* Footer com ações */}
        <div className={CSS.modalFooter}>
          <button
            onClick={onCancel}
            className="flex-1 px-6 py-3 rounded-lg font-medium flex items-center justify-center gap-2 hover-slate-700-from-600"
          >
            <span>❌</span>
            Cancelar
          </button>
          <button
            onClick={onSave}
            disabled={!(extractedModel.title ?? '').trim() || !(extractedModel.content ?? '').trim()}
            className="flex-1 px-6 py-3 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed rounded-lg font-medium shadow-lg flex items-center justify-center gap-2 hover-gradient-purple-pink-darker transition-all duration-300"
          >
            <Save className="w-5 h-5" />
            Salvar Modelo
          </button>
        </div>
      </div>
    </div>
  );
});

ExtractedModelPreviewModal.displayName = 'ExtractedModelPreviewModal';

// Modal: Aviso de Modelo Similar
export const SimilarityWarningModal = React.memo(({
  warning,
  saving,
  onCancel,
  onSaveNew,
  onReplace,
  sanitizeHTML = (html: string) => html || ''
}: SimilarityWarningModalProps) => {
  // ESC handler
  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape' && !saving) onCancel(); };
    if (warning) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [warning, saving, onCancel]);

  if (!warning) return null;
  const { newModel, similarModel, similarity } = warning;
  const pct = Math.round(similarity * 100);

  return (
    <div className={CSS.modalOverlay} style={{zIndex:60}}>
      <div className={`${CSS.modalContainer} theme-border-modal theme-modal-glow animate-modal max-w-5xl w-full`}>
        <div className={CSS.modalHeader}>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-amber-500/20">
                <AlertTriangle className="w-6 h-6 text-amber-400" />
              </div>
              <h3 className="text-lg font-semibold theme-text-primary">Modelo Similar Encontrado ({pct}%)</h3>
            </div>
            <button
              onClick={onCancel}
              disabled={saving}
              className="p-2 rounded-xl theme-bg-secondary-50 theme-hover-bg transition-colors disabled:opacity-50"
              title="Fechar"
            >
              <X className="w-5 h-5 theme-text-tertiary" />
            </button>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="theme-card p-4 flex flex-col">
              <div className="flex-shrink-0 mb-2">
                <p className="text-xs theme-text-muted mb-1">NOVO MODELO</p>
                <p className="font-semibold theme-text-secondary text-sm" style={{wordBreak:'break-word'}}>{newModel.title}</p>
              </div>
              <div className="flex-1 overflow-y-auto text-sm theme-text-secondary border theme-border-input rounded p-3 theme-bg-tertiary" style={{maxHeight:'300px'}} dangerouslySetInnerHTML={{__html: sanitizeHTML(newModel.content || '')}} />
            </div>
            <div className="theme-card p-4 flex flex-col border-yellow-500/50">
              <div className="flex-shrink-0 mb-2">
                <p className="text-xs theme-text-muted mb-1">MODELO EXISTENTE</p>
                <p className="font-semibold theme-text-yellow text-sm" style={{wordBreak:'break-word'}}>{similarModel.title}</p>
              </div>
              <div className="flex-1 overflow-y-auto text-sm theme-text-secondary border theme-border-input rounded p-3 theme-bg-tertiary" style={{maxHeight:'300px'}} dangerouslySetInnerHTML={{__html: sanitizeHTML(similarModel.content || '')}} />
            </div>
          </div>
          <p className="text-sm theme-text-muted text-center">{saving ? 'Salvando modelo...' : 'O que deseja fazer?'}</p>
        </div>
        <div className="px-6 pb-6 flex gap-3 justify-center">
          <button onClick={onCancel} className={CSS.btnSecondary} disabled={saving}>Cancelar</button>
          <button onClick={onSaveNew} className={CSS.btnSuccess} disabled={saving}>{saving ? 'Salvando...' : 'Salvar Mesmo Assim'}</button>
          <button onClick={onReplace} className="px-4 py-2 rounded-lg font-medium bg-amber-600 text-white hover-amber-700-from-600 disabled:opacity-50" disabled={saving}>{saving ? 'Salvando...' : 'Substituir Existente'}</button>
        </div>
      </div>
    </div>
  );
});

SimilarityWarningModal.displayName = 'SimilarityWarningModal';

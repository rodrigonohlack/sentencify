/**
 * @file useModelPreview.ts
 * @description Hook para preview e edição de modelos de texto
 * @tier 0 (sem dependências de outros hooks)
 * @extractedFrom App.tsx linhas 4372-4477
 * @usedBy GlobalEditorModal, ModelCard, ModelPreviewModal
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { Model } from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

export interface SaveAsNewData {
  title: string;
  content: string;
  keywords?: string;
  category?: string;
}

export interface UseModelPreviewReturn {
  /** Modelo sendo visualizado */
  previewingModel: Model | null;
  /** Se o modal de preview está aberto */
  isPreviewOpen: boolean;
  /** Se está em modo de edição */
  isEditing: boolean;
  /** Conteúdo editado */
  editedContent: string;
  /** Abre o preview de um modelo */
  openPreview: (model: Model) => void;
  /** Fecha o preview */
  closePreview: () => void;
  /** Inicia modo de edição */
  startEditing: () => void;
  /** Cancela a edição */
  cancelEditing: () => void;
  /** Atualiza o conteúdo editado */
  setEditedContent: React.Dispatch<React.SetStateAction<string>>;
  /** Ref para função de inserção contextual (GlobalEditorModal) */
  contextualInsertFnRef: React.MutableRefObject<((content: string) => void) | null>;
  /** Define função de inserção contextual */
  setContextualInsertFn: (fn: ((content: string) => void) | null) => void;
  /** Dados para "Salvar como Novo Modelo" */
  saveAsNewData: SaveAsNewData | null;
  /** Define dados para "Salvar como Novo Modelo" */
  setSaveAsNewData: React.Dispatch<React.SetStateAction<SaveAsNewData | null>>;
  /** Abre modal "Salvar como Novo" */
  openSaveAsNew: (content: string, originalModel: Model | null) => void;
  /** Fecha modal "Salvar como Novo" */
  closeSaveAsNew: () => void;
  /** Ref para callback de modelo atualizado */
  onModelUpdatedRef: React.MutableRefObject<((model: Model) => void) | null>;
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook para preview e edição de modelos de texto
 * Gerencia estado do modal de preview, modo de edição e "Salvar como Novo"
 */
export function useModelPreview(): UseModelPreviewReturn {
  const [previewingModel, setPreviewingModel] = useState<Model | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');

  // v1.15.2: Função de inserção contextual (para GlobalEditorModal)
  // v1.33.25: Usar ref em vez de state para não causar recriação do objeto modelPreview
  const contextualInsertFnRef = useRef<((content: string) => void) | null>(null);
  const setContextualInsertFn = useCallback((fn: ((content: string) => void) | null) => {
    contextualInsertFnRef.current = fn;
  }, []);

  // v1.15.3: Estado para "Salvar como Novo Modelo"
  const [saveAsNewData, setSaveAsNewData] = useState<SaveAsNewData | null>(null);

  // v1.19.2: Callback para notificar quando modelo é atualizado (sincroniza sugestões do GlobalEditor)
  const onModelUpdatedRef = useRef<((model: Model) => void) | null>(null);

  const openPreview = useCallback((model: Model) => {
    if (!model || !model.content) {
      return;
    }
    setPreviewingModel(model);
    setIsPreviewOpen(true);
  }, []);

  const closePreview = useCallback(() => {
    setIsPreviewOpen(false);
    setIsEditing(false);
    setEditedContent('');
    // Delay para animação de saída
    setTimeout(() => setPreviewingModel(null), 200);
  }, []);

  const startEditing = useCallback(() => {
    if (previewingModel) {
      setEditedContent(previewingModel.content);
      setIsEditing(true);
    }
  }, [previewingModel]);

  const cancelEditing = useCallback(() => {
    setIsEditing(false);
    setEditedContent('');
  }, []);

  // v1.15.3: Funções para "Salvar como Novo Modelo"
  const openSaveAsNew = useCallback((content: string, originalModel: Model | null) => {
    const keywords = originalModel?.keywords;
    setSaveAsNewData({
      title: '',
      content: content,
      keywords: Array.isArray(keywords) ? keywords.join(', ') : (keywords || ''),
      category: originalModel?.category || 'Mérito'
    });
  }, []);

  const closeSaveAsNew = useCallback(() => {
    setSaveAsNewData(null);
  }, []);

  // Atalho Esc para fechar/cancelar edição
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isPreviewOpen) {
        if (isEditing) {
          // Em modo edição: cancelar edição (volta para visualização)
          cancelEditing();
        } else {
          // Em modo visualização: fechar modal
          closePreview();
        }
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isPreviewOpen, isEditing, cancelEditing, closePreview]);

  // v1.33.22: useMemo para evitar novo objeto a cada render (causa infinite loop em GlobalEditorModal)
  return useMemo(() => ({
    previewingModel,
    isPreviewOpen,
    isEditing,
    editedContent,
    openPreview,
    closePreview,
    startEditing,
    cancelEditing,
    setEditedContent,
    // v1.15.2: Função de inserção contextual
    contextualInsertFnRef,
    setContextualInsertFn,
    // v1.15.3: Salvar como Novo Modelo
    saveAsNewData,
    setSaveAsNewData,
    openSaveAsNew,
    closeSaveAsNew,
    // v1.19.2: Callback para sincronizar sugestões do GlobalEditor
    onModelUpdatedRef,
  }), [
    previewingModel, isPreviewOpen, isEditing, editedContent,
    openPreview, closePreview, startEditing, cancelEditing,
    setContextualInsertFn, saveAsNewData, openSaveAsNew, closeSaveAsNew
  ]);
}

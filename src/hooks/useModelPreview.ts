/**
 * 🎣 CUSTOM HOOK: useModelPreview - Preview de modelos de texto
 * Extraído do App.jsx para facilitar testes unitários
 *
 * @version 1.35.76 - Migrado para TypeScript
 */
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import type { Model } from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

/** Dados para "Salvar como Novo Modelo" */
export interface SaveAsNewData {
  title: string;
  content: string;
  keywords: string | string[];
  category: string;
}

/** Função de inserção contextual (para GlobalEditorModal) */
export type ContextualInsertFn = ((content: string) => void) | null;

/** Função callback quando modelo é atualizado */
export type OnModelUpdatedFn = ((model: Model) => void) | null;

/** Retorno do hook useModelPreview */
export interface UseModelPreviewReturn {
  previewingModel: Model | null;
  isPreviewOpen: boolean;
  isEditing: boolean;
  editedContent: string;
  openPreview: (model: Model) => void;
  closePreview: () => void;
  startEditing: () => void;
  cancelEditing: () => void;
  setEditedContent: React.Dispatch<React.SetStateAction<string>>;
  contextualInsertFnRef: React.MutableRefObject<ContextualInsertFn>;
  setContextualInsertFn: (fn: ContextualInsertFn) => void;
  saveAsNewData: SaveAsNewData | null;
  setSaveAsNewData: React.Dispatch<React.SetStateAction<SaveAsNewData | null>>;
  openSaveAsNew: (content: string, originalModel?: Model | null) => void;
  closeSaveAsNew: () => void;
  onModelUpdatedRef: React.MutableRefObject<OnModelUpdatedFn>;
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

const useModelPreview = (): UseModelPreviewReturn => {
  const [previewingModel, setPreviewingModel] = useState<Model | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editedContent, setEditedContent] = useState<string>('');

  // v1.15.2: Função de inserção contextual (para GlobalEditorModal)
  // v1.33.25: Usar ref em vez de state para não causar recriação do objeto modelPreview
  const contextualInsertFnRef = useRef<ContextualInsertFn>(null);
  const setContextualInsertFn = useCallback((fn: ContextualInsertFn): void => {
    contextualInsertFnRef.current = fn;
  }, []);

  // v1.15.3: Estado para "Salvar como Novo Modelo"
  const [saveAsNewData, setSaveAsNewData] = useState<SaveAsNewData | null>(null);

  // v1.19.2: Callback para notificar quando modelo é atualizado
  const onModelUpdatedRef = useRef<OnModelUpdatedFn>(null);

  const openPreview = useCallback((model: Model): void => {
    if (!model || !model.content) {
      return;
    }
    setPreviewingModel(model);
    setIsPreviewOpen(true);
  }, []);

  const closePreview = useCallback((): void => {
    setIsPreviewOpen(false);
    setIsEditing(false);
    setEditedContent('');
    setTimeout(() => setPreviewingModel(null), 200);
  }, []);

  const startEditing = useCallback((): void => {
    if (previewingModel) {
      setEditedContent(previewingModel.content);
      setIsEditing(true);
    }
  }, [previewingModel]);

  const cancelEditing = useCallback((): void => {
    setIsEditing(false);
    setEditedContent('');
  }, []);

  const openSaveAsNew = useCallback((content: string, originalModel?: Model | null): void => {
    setSaveAsNewData({
      title: '',
      content: content,
      keywords: originalModel?.keywords || '',
      category: originalModel?.category || 'Mérito'
    });
  }, []);

  const closeSaveAsNew = useCallback((): void => {
    setSaveAsNewData(null);
  }, []);

  // Atalho Esc para fechar/cancelar edição
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && isPreviewOpen) {
        if (isEditing) {
          cancelEditing();
        } else {
          closePreview();
        }
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isPreviewOpen, isEditing, cancelEditing, closePreview]);

  // v1.33.22: useMemo para evitar novo objeto a cada render
  return useMemo(
    () => ({
      previewingModel,
      isPreviewOpen,
      isEditing,
      editedContent,
      openPreview,
      closePreview,
      startEditing,
      cancelEditing,
      setEditedContent,
      contextualInsertFnRef,
      setContextualInsertFn,
      saveAsNewData,
      setSaveAsNewData,
      openSaveAsNew,
      closeSaveAsNew,
      onModelUpdatedRef
    }),
    [
      previewingModel,
      isPreviewOpen,
      isEditing,
      editedContent,
      openPreview,
      closePreview,
      startEditing,
      cancelEditing,
      saveAsNewData,
      openSaveAsNew,
      closeSaveAsNew
    ]
  );
};

export default useModelPreview;

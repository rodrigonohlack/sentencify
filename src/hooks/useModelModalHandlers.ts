/**
 * @file useModelModalHandlers.ts
 * @description Handlers simples para modais de modelos
 * @version 1.37.73
 *
 * Este hook fornece callbacks simples para modais de modelos que
 * funcionam apenas com Zustand, sem dependências externas.
 *
 * @usedBy ModalRoot, ModelModals
 */

import { useCallback } from 'react';
import { useModelsStore } from '../stores/useModelsStore';
import { useUIStore } from '../stores/useUIStore';
import type { Model } from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

export interface UseModelModalHandlersReturn {
  // Handlers de exclusão
  confirmDeleteModel: () => void;
  cancelDeleteModel: () => void;

  // Handlers de exclusão em massa
  confirmDeleteAllModels: () => void;
  cancelDeleteAllModels: () => void;

  // Handlers de similaridade
  cancelSimilarityWarning: () => void;

  // Handlers de extração
  cancelExtractedModelPreview: () => void;

  // Handlers de bulk
  cancelBulkUpload: () => void;
  cancelBulkReview: () => void;

  // Handlers de preparação (abre modais)
  openDeleteModelModal: (model: Model) => void;
  openDeleteAllModelsModal: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook com handlers simples para modais de modelos
 *
 * @description Fornece callbacks que funcionam apenas com Zustand:
 * - Confirmar/cancelar exclusão de modelo
 * - Confirmar/cancelar exclusão em massa
 * - Cancelar aviso de similaridade
 * - Cancelar preview de modelo extraído
 *
 * @returns Handlers para operações simples de modelos
 */
export function useModelModalHandlers(): UseModelModalHandlersReturn {
  // ═══════════════════════════════════════════════════════════════════════
  // ESTADO DOS STORES
  // ═══════════════════════════════════════════════════════════════════════

  const closeModal = useUIStore((s) => s.closeModal);
  const openModal = useUIStore((s) => s.openModal);

  const modelToDelete = useModelsStore((s) => s.modelToDelete);
  const setModelToDelete = useModelsStore((s) => s.setModelToDelete);
  const models = useModelsStore((s) => s.models);
  const setModels = useModelsStore((s) => s.setModels);
  const setSimilarityWarning = useModelsStore((s) => s.setSimilarityWarning);
  const setExtractedModelPreview = useModelsStore((s) => s.setExtractedModelPreview);

  // ═══════════════════════════════════════════════════════════════════════
  // HANDLERS: EXCLUSÃO DE MODELO
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Confirma exclusão do modelo selecionado
   * Remove o modelo da lista de modelos
   */
  const confirmDeleteModel = useCallback(() => {
    if (!modelToDelete) return;

    // Remove o modelo da lista
    setModels((prev: Model[]) => prev.filter((m) => m.id !== modelToDelete.id));

    // Limpa estado e fecha modal
    setModelToDelete(null);
    closeModal('deleteModel');
  }, [modelToDelete, setModels, setModelToDelete, closeModal]);

  const cancelDeleteModel = useCallback(() => {
    setModelToDelete(null);
    closeModal('deleteModel');
  }, [setModelToDelete, closeModal]);

  // ═══════════════════════════════════════════════════════════════════════
  // HANDLERS: EXCLUSÃO EM MASSA
  // ═══════════════════════════════════════════════════════════════════════

  const confirmDeleteAllModels = useCallback(() => {
    // Limpa todos os modelos (apenas locais, não compartilhados)
    setModels((prev: Model[]) => prev.filter((m) => m.isShared));
    closeModal('deleteAllModels');
  }, [setModels, closeModal]);

  const cancelDeleteAllModels = useCallback(() => {
    closeModal('deleteAllModels');
  }, [closeModal]);

  // ═══════════════════════════════════════════════════════════════════════
  // HANDLERS: SIMILARIDADE
  // ═══════════════════════════════════════════════════════════════════════

  const cancelSimilarityWarning = useCallback(() => {
    setSimilarityWarning(null);
  }, [setSimilarityWarning]);

  // ═══════════════════════════════════════════════════════════════════════
  // HANDLERS: EXTRAÇÃO
  // ═══════════════════════════════════════════════════════════════════════

  const cancelExtractedModelPreview = useCallback(() => {
    setExtractedModelPreview(null);
    closeModal('extractedModelPreview');
  }, [setExtractedModelPreview, closeModal]);

  // ═══════════════════════════════════════════════════════════════════════
  // HANDLERS: BULK
  // ═══════════════════════════════════════════════════════════════════════

  const cancelBulkUpload = useCallback(() => {
    // Nota: resetBulkState está no modelLibrary hook, não no store
    // O modal de bulk deve chamar modelLibrary.resetBulkState()
    closeModal('bulkModal');
  }, [closeModal]);

  const cancelBulkReview = useCallback(() => {
    closeModal('bulkReview');
  }, [closeModal]);

  // ═══════════════════════════════════════════════════════════════════════
  // HANDLERS: ABRIR MODAIS
  // ═══════════════════════════════════════════════════════════════════════

  const openDeleteModelModal = useCallback((model: Model) => {
    setModelToDelete(model);
    openModal('deleteModel');
  }, [setModelToDelete, openModal]);

  const openDeleteAllModelsModal = useCallback(() => {
    openModal('deleteAllModels');
  }, [openModal]);

  // ═══════════════════════════════════════════════════════════════════════
  // RETORNO
  // ═══════════════════════════════════════════════════════════════════════

  return {
    // Exclusão
    confirmDeleteModel,
    cancelDeleteModel,

    // Exclusão em massa
    confirmDeleteAllModels,
    cancelDeleteAllModels,

    // Similaridade
    cancelSimilarityWarning,

    // Extração
    cancelExtractedModelPreview,

    // Bulk
    cancelBulkUpload,
    cancelBulkReview,

    // Abrir modais
    openDeleteModelModal,
    openDeleteAllModelsModal,
  };
}

export default useModelModalHandlers;

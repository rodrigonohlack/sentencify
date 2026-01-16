/**
 * @file ModalRoot.tsx
 * @description Componente centralizado para renderizar todos os modais da aplicação
 * @version 1.37.73
 *
 * Este componente lê estado diretamente dos stores Zustand, eliminando
 * a necessidade de prop drilling do App.tsx para a maioria dos modais.
 *
 * MODAIS SIMPLES (100% Zustand):
 * - DeleteTopicModal
 * - DeleteModelModal
 * - DeleteAllModelsModal
 * - DeleteProofModal
 * - BulkDiscardConfirmModal
 *
 * MODAIS COMPLEXOS (precisam de props):
 * - RenameTopicModal, MergeTopicsModal, SplitTopicModal, NewTopicModal (precisam de AI regeneration)
 * - ConfigModal (precisa de NER/embeddings/handlers)
 * - GlobalEditorModal (precisa de muitas dependências)
 * - DriveFilesModal (precisa de googleDrive hook)
 *
 * @usedBy App.tsx
 */

import React from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// STORES ZUSTAND
// ═══════════════════════════════════════════════════════════════════════════

import { useUIStore } from '../../stores/useUIStore';
import { useTopicsStore } from '../../stores/useTopicsStore';
import { useModelsStore } from '../../stores/useModelsStore';
import { useProofsStore } from '../../stores/useProofsStore';

// ═══════════════════════════════════════════════════════════════════════════
// HOOKS DE HANDLERS
// ═══════════════════════════════════════════════════════════════════════════

import { useTopicModalHandlers } from '../../hooks/useTopicModalHandlers';
import { useModelModalHandlers } from '../../hooks/useModelModalHandlers';
import { useProofModalHandlers } from '../../hooks/useProofModalHandlers';

// ═══════════════════════════════════════════════════════════════════════════
// MODAIS
// ═══════════════════════════════════════════════════════════════════════════

import {
  DeleteTopicModal,
  DeleteModelModal,
  DeleteAllModelsModal,
  DeleteProofModal,
  BulkDiscardConfirmModal,
  ExportModal,
  RestoreSessionModal,
  ClearProjectModal,
  LogoutConfirmModal,
  AddProofTextModal,
  LinkProofModal,
  ExtractedModelPreviewModal,
  SimilarityWarningModal
} from './index';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

export interface ModalRootProps {
  // Callbacks para operações que precisam de dependências externas
  onLogout?: () => void;

  // Callbacks para sessão
  onRestoreSession?: () => void;
  onStartNew?: () => void;
  onConfirmClear?: () => void;
  sessionLastSaved?: string | number | null;

  // Export modal
  exportedText?: string;
  exportedHtml?: string;

  // Bulk
  onBulkDiscard?: () => void;
  bulkReviewModelsCount?: number;

  // Similarity (precisa de handlers complexos)
  onSimilarityCancel?: () => void;
  onSimilaritySaveNew?: () => void;
  onSimilarityReplace?: () => void;
  savingFromSimilarity?: boolean;
  sanitizeHTML?: (html: string) => string;

  // Extracted Model Preview
  onSaveExtractedModel?: () => void;
  onCancelExtractedModel?: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * ModalRoot - Renderiza modais simples que funcionam 100% com Zustand
 *
 * Este componente gerencia modais que não precisam de dependências
 * externas como AI, Google Drive, etc. Modais complexos continuam
 * sendo renderizados diretamente no App.tsx.
 *
 * @example
 * // No App.tsx
 * <ModalRoot
 *   onLogout={handleLogout}
 *   sessionLastSaved={storage.sessionLastSaved}
 *   onRestoreSession={handleRestoreSession}
 *   onStartNew={handleStartNew}
 *   onConfirmClear={handleClearProject}
 * />
 */
export const ModalRoot: React.FC<ModalRootProps> = ({
  onLogout,
  onRestoreSession,
  onStartNew,
  onConfirmClear,
  sessionLastSaved,
  exportedText = '',
  exportedHtml = '',
  onBulkDiscard,
  bulkReviewModelsCount = 0,
  onSimilarityCancel,
  onSimilaritySaveNew,
  onSimilarityReplace,
  savingFromSimilarity = false,
  sanitizeHTML = (html) => html,
  onSaveExtractedModel,
  onCancelExtractedModel
}) => {
  // ═══════════════════════════════════════════════════════════════════════════
  // ESTADO DOS STORES
  // ═══════════════════════════════════════════════════════════════════════════

  // UI Store
  const modals = useUIStore((s) => s.modals);
  const closeModal = useUIStore((s) => s.closeModal);
  const openModal = useUIStore((s) => s.openModal);
  const copySuccess = useUIStore((s) => s.copySuccess);
  const setCopySuccess = useUIStore((s) => s.setCopySuccess);
  const setError = useUIStore((s) => s.setError);

  // Topics Store
  const topicToDelete = useTopicsStore((s) => s.topicToDelete);
  const setTopicToDelete = useTopicsStore((s) => s.setTopicToDelete);

  // Models Store
  const modelToDelete = useModelsStore((s) => s.modelToDelete);
  const setModelToDelete = useModelsStore((s) => s.setModelToDelete);
  const models = useModelsStore((s) => s.models);
  const deleteAllConfirmText = useModelsStore((s) => s.deleteAllConfirmText);
  const setDeleteAllConfirmText = useModelsStore((s) => s.setDeleteAllConfirmText);
  const similarityWarning = useModelsStore((s) => s.similarityWarning);
  const extractedModelPreview = useModelsStore((s) => s.extractedModelPreview);
  const setExtractedModelPreview = useModelsStore((s) => s.setExtractedModelPreview);

  // Proofs Store
  const proofToDelete = useProofsStore((s) => s.proofToDelete);

  // ═══════════════════════════════════════════════════════════════════════════
  // HOOKS DE HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  const topicHandlers = useTopicModalHandlers();
  const modelHandlers = useModelModalHandlers();
  const proofHandlers = useProofModalHandlers();

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODAIS DE TÓPICOS */}
      {/* ═══════════════════════════════════════════════════════════════════ */}

      <DeleteTopicModal
        isOpen={modals.deleteTopic}
        onClose={() => closeModal('deleteTopic')}
        topicToDelete={topicToDelete}
        setTopicToDelete={setTopicToDelete}
        onConfirmDelete={topicHandlers.confirmDeleteTopic}
      />

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODAIS DE MODELOS */}
      {/* ═══════════════════════════════════════════════════════════════════ */}

      <DeleteModelModal
        isOpen={modals.deleteModel}
        onClose={() => closeModal('deleteModel')}
        modelToDelete={modelToDelete}
        setModelToDelete={setModelToDelete}
        onConfirmDelete={modelHandlers.confirmDeleteModel}
      />

      <DeleteAllModelsModal
        isOpen={modals.deleteAllModels}
        onClose={() => closeModal('deleteAllModels')}
        totalModels={models.filter((m) => !m.isShared).length}
        confirmText={deleteAllConfirmText}
        setConfirmText={setDeleteAllConfirmText}
        onConfirmDelete={modelHandlers.confirmDeleteAllModels}
      />

      {/* SimilarityWarningModal - precisa de callbacks do App.tsx */}
      {onSimilarityCancel && onSimilaritySaveNew && onSimilarityReplace && (
        <SimilarityWarningModal
          warning={similarityWarning}
          saving={savingFromSimilarity}
          onCancel={onSimilarityCancel}
          onSaveNew={onSimilaritySaveNew}
          onReplace={onSimilarityReplace}
          sanitizeHTML={sanitizeHTML}
        />
      )}

      {/* ExtractedModelPreviewModal - precisa de callbacks do App.tsx */}
      {onSaveExtractedModel && onCancelExtractedModel && (
        <ExtractedModelPreviewModal
          isOpen={modals.extractedModelPreview}
          onClose={() => closeModal('extractedModelPreview')}
          extractedModel={extractedModelPreview}
          setExtractedModel={setExtractedModelPreview}
          onSave={onSaveExtractedModel}
          onCancel={onCancelExtractedModel}
          sanitizeHTML={sanitizeHTML}
        />
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODAIS DE PROVAS */}
      {/* ═══════════════════════════════════════════════════════════════════ */}

      {/* DeleteProofModal permanece no App.tsx devido a lógica complexa de IndexedDB cleanup */}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODAIS DE EXPORTAÇÃO */}
      {/* ═══════════════════════════════════════════════════════════════════ */}

      <ExportModal
        isOpen={modals.export}
        onClose={() => closeModal('export')}
        exportedText={exportedText}
        exportedHtml={exportedHtml}
        copySuccess={copySuccess}
        setCopySuccess={setCopySuccess}
        setError={setError}
      />

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODAIS DE SESSÃO */}
      {/* ═══════════════════════════════════════════════════════════════════ */}

      {onRestoreSession && onStartNew && (
        <RestoreSessionModal
          isOpen={modals.restoreSession}
          onClose={() => closeModal('restoreSession')}
          sessionLastSaved={sessionLastSaved ?? null}
          onRestoreSession={onRestoreSession}
          onStartNew={onStartNew}
        />
      )}

      {onConfirmClear && (
        <ClearProjectModal
          isOpen={modals.clearProject}
          onClose={() => {
            closeModal('clearProject');
            openModal('restoreSession');
          }}
          onConfirmClear={onConfirmClear}
        />
      )}

      {onLogout && (
        <LogoutConfirmModal
          isOpen={modals.logout}
          onClose={() => closeModal('logout')}
          onConfirm={() => {
            closeModal('logout');
            onLogout();
            window.location.reload();
          }}
        />
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODAIS DE BULK */}
      {/* ═══════════════════════════════════════════════════════════════════ */}

      {onBulkDiscard && (
        <BulkDiscardConfirmModal
          isOpen={modals.bulkDiscardConfirm}
          onClose={() => {
            closeModal('bulkDiscardConfirm');
            openModal('bulkReview');
          }}
          totalModels={bulkReviewModelsCount}
          onConfirm={onBulkDiscard}
        />
      )}
    </>
  );
};

ModalRoot.displayName = 'ModalRoot';

export default ModalRoot;

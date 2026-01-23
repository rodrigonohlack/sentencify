/**
 * @file ModalRoot.tsx
 * @description Componente centralizado para renderizar todos os modais da aplicação
 * @version 1.37.74
 *
 * Este componente lê estado diretamente dos stores Zustand, eliminando
 * a necessidade de prop drilling do App.tsx para a maioria dos modais.
 *
 * MODAIS 100% ZUSTAND (sem props):
 * - DeleteTopicModal
 * - DeleteModelModal
 * - DeleteAllModelsModal
 * - ExportModal
 * - RestoreSessionModal, ClearProjectModal, LogoutConfirmModal
 * - BulkDiscardConfirmModal
 *
 * MODAIS COM HANDLERS (props mínimas):
 * - RenameTopicModal, MergeTopicsModal, SplitTopicModal, NewTopicModal (handlers de AI)
 * - SimilarityWarningModal, ExtractedModelPreviewModal (handlers de save)
 *
 * MODAIS COMPLEXOS (permanecem no App.tsx):
 * - ConfigModal (precisa de NER/embeddings/handlers complexos)
 * - GlobalEditorModal (precisa de muitas dependências)
 * - DriveFilesModal (precisa de googleDrive hook)
 * - AIAssistantModal (precisa de chatAssistant hook)
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
import { useProofUIStore } from '../../stores/useProofUIStore';

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
  RenameTopicModal,
  MergeTopicsModal,
  SplitTopicModal,
  NewTopicModal,
  DeleteModelModal,
  DeleteAllModelsModal,
  BulkDiscardConfirmModal,
  ExportModal,
  ExtractedModelPreviewModal,
  SimilarityWarningModal
} from './index';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

export interface ModalRootProps {
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

  // ═══════════════════════════════════════════════════════════════════════════
  // TOPIC MODALS (v1.37.74)
  // ═══════════════════════════════════════════════════════════════════════════

  /** Handler para renomear tópico (com ou sem regeneração) */
  handleRenameTopic?: (regenerate: boolean) => void;

  /** Handler para unir tópicos selecionados */
  handleMergeTopics?: () => void;

  /** Handler para separar tópico em subtópicos */
  handleSplitTopic?: () => void;

  /** Handler para criar novo tópico */
  handleCreateNewTopic?: () => void;

  /** Indica se a IA está regenerando (desabilita botões) */
  isRegenerating?: boolean;

  /** Indica se há documentos para regenerar mini-relatórios */
  hasDocuments?: boolean;

  // ═══════════════════════════════════════════════════════════════════════════
  // SYNC (v1.37.77)
  // ═══════════════════════════════════════════════════════════════════════════

  /** Callback para rastrear mudanças para sync na nuvem */
  trackChange?: (operation: 'create' | 'update' | 'delete', model: { id: string; updatedAt?: string }) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * ModalRoot - Renderiza modais centralizados com Zustand
 *
 * Este componente gerencia modais que lêem estado do Zustand,
 * com handlers passados como props para operações complexas.
 *
 * v1.37.74: Adicionados modais de tópicos (Rename, Merge, Split, New)
 *
 * @example
 * // No App.tsx
 * <ModalRoot
 *   exportedText={exportedText}
 *   exportedHtml={exportedHtml}
 *   handleRenameTopic={handleRenameTopic}
 *   handleMergeTopics={handleMergeTopics}
 *   handleSplitTopic={handleSplitTopic}
 *   handleCreateNewTopic={handleCreateNewTopic}
 *   isRegenerating={aiIntegration.regenerating}
 *   hasDocuments={hasDocuments}
 * />
 */
export const ModalRoot: React.FC<ModalRootProps> = ({
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
  onCancelExtractedModel,
  // Topic modals (v1.37.74)
  handleRenameTopic,
  handleMergeTopics,
  handleSplitTopic,
  handleCreateNewTopic,
  isRegenerating = false,
  hasDocuments = false,
  // Sync (v1.37.77)
  trackChange
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
  // v1.37.74: Estados para modais de tópicos
  const topicToRename = useTopicsStore((s) => s.topicToRename);
  const setTopicToRename = useTopicsStore((s) => s.setTopicToRename);
  const newTopicName = useTopicsStore((s) => s.newTopicName);
  const setNewTopicName = useTopicsStore((s) => s.setNewTopicName);
  const topicsToMerge = useTopicsStore((s) => s.topicsToMerge);
  const topicToSplit = useTopicsStore((s) => s.topicToSplit);
  const setTopicToSplit = useTopicsStore((s) => s.setTopicToSplit);
  const splitNames = useTopicsStore((s) => s.splitNames);
  const setSplitNames = useTopicsStore((s) => s.setSplitNames);
  const newTopicData = useTopicsStore((s) => s.newTopicData);
  const setNewTopicData = useTopicsStore((s) => s.setNewTopicData);

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
  const proofToDelete = useProofUIStore((s) => s.proofToDelete);

  // ═══════════════════════════════════════════════════════════════════════════
  // HOOKS DE HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  const topicHandlers = useTopicModalHandlers();
  // v1.37.77: Passar trackChange para rastrear deletes para sync
  const modelHandlers = useModelModalHandlers({ trackChange });
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

      {/* v1.37.74: Modais de tópicos com regeneração AI */}
      {handleRenameTopic && (
        <RenameTopicModal
          isOpen={modals.rename}
          onClose={() => closeModal('rename')}
          topicToRename={topicToRename}
          setTopicToRename={setTopicToRename}
          newTopicName={newTopicName}
          setNewTopicName={setNewTopicName}
          handleRenameTopic={handleRenameTopic}
          isRegenerating={isRegenerating}
          hasDocuments={hasDocuments}
        />
      )}

      {handleMergeTopics && (
        <MergeTopicsModal
          isOpen={modals.merge}
          onClose={() => closeModal('merge')}
          topicsToMerge={topicsToMerge}
          onConfirmMerge={handleMergeTopics}
          isRegenerating={isRegenerating}
          hasDocuments={hasDocuments}
        />
      )}

      {handleSplitTopic && (
        <SplitTopicModal
          isOpen={modals.split}
          onClose={() => closeModal('split')}
          topicToSplit={topicToSplit}
          setTopicToSplit={setTopicToSplit}
          splitNames={splitNames}
          setSplitNames={setSplitNames}
          onConfirmSplit={handleSplitTopic}
          isRegenerating={isRegenerating}
          hasDocuments={hasDocuments}
        />
      )}

      {handleCreateNewTopic && (
        <NewTopicModal
          isOpen={modals.newTopic}
          onClose={() => closeModal('newTopic')}
          newTopicData={newTopicData}
          setNewTopicData={setNewTopicData}
          onConfirmCreate={handleCreateNewTopic}
          isRegenerating={isRegenerating}
          hasDocuments={hasDocuments}
        />
      )}

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
      {/* MODAIS DE SESSÃO - permanecem no App.tsx (callbacks complexos) */}
      {/* RestoreSessionModal, ClearProjectModal, LogoutConfirmModal */}
      {/* ═══════════════════════════════════════════════════════════════════ */}

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

/**
 * @file index.ts
 * @description Barrel export para todas as stores Zustand
 * @version 1.40.05
 *
 * Centraliza exports de todas as stores para facilitar importação.
 *
 * @example
 * import { useUIStore, useModelsStore, useEditorStore } from '../stores';
 */

// ═══════════════════════════════════════════════════════════════════════════
// STORES EXISTENTES
// ═══════════════════════════════════════════════════════════════════════════

export { useUIStore } from './useUIStore';
export type { DownloadStatus } from './useUIStore';
export {
  selectIsAnyModalOpen,
  selectModal,
  selectTextPreview,
  selectIsTextPreviewOpen,
  selectToast,
  selectIsToastVisible,
  selectDoubleCheckReview,
  selectIsDoubleCheckReviewOpen,
  selectDoubleCheckResult
} from './useUIStore';

export { useAIStore } from './useAIStore';

export { useModelsStore } from './useModelsStore';
export type { OwnershipFilter, ModelViewMode, SharedLibraryInfo } from './useModelsStore';
export {
  selectModelsByCategory,
  selectFavoriteModels,
  selectModelsCount,
  selectCategories,
  selectModelById,
  selectIsEditing,
  selectUseSemanticManualSearch,
  selectReceivedModels,
  selectActiveSharedLibraries,
  selectPreviewingModel,
  selectHasPreviewingModel,
  selectContextualInsertFn
} from './useModelsStore';

export { useTopicsStore } from './useTopicsStore';

export { useProofsStore } from './useProofsStore';

export { useDocumentsStore } from './useDocumentsStore';

export { useProofUIStore } from './useProofUIStore';

export { useReviewStore } from './useReviewStore';

// ═══════════════════════════════════════════════════════════════════════════
// NOVAS STORES (v1.40.05)
// ═══════════════════════════════════════════════════════════════════════════

export { useEditorStore } from './useEditorStore';
export type { EditorFontSize, EditorSpacing, EditorTheme } from './useEditorStore';
export {
  selectEditorTheme,
  selectFontSize,
  selectSpacing,
  selectQuillReady,
  selectQuillError,
  selectIsDirty
} from './useEditorStore';

export { useRegenerationStore } from './useRegenerationStore';
export {
  selectRelatorioInstruction,
  selectRegeneratingRelatorio,
  selectDispositivoInstruction,
  selectRegeneratingDispositivo,
  selectIsRegenerating,
  selectProgressMessage
} from './useRegenerationStore';

// ═══════════════════════════════════════════════════════════════════════════
// SEARCH STORE (v1.40.09)
// ═══════════════════════════════════════════════════════════════════════════

export { useSearchStore } from './useSearchStore';
export {
  selectSearchEnabled,
  selectSearchModelReady,
  selectSearchInitializing,
  selectSearchDownloadProgress
} from './useSearchStore';

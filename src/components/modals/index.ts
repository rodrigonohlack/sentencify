/**
 * @file index.ts
 * @description Barrel export para todos os modais simples
 * @version 1.36.99
 */

// BaseModal + helpers
export { BaseModal, ModalFooter, ModalWarningBox, ModalInfoBox, ModalAmberBox, ModalContentPreview, CSS } from './BaseModal';

// GlobalEditorModal (v1.36.99)
export { GlobalEditorModal, AUTO_SAVE_DEBOUNCE_MS } from './GlobalEditorModal';

// Topic Modals
export { RenameTopicModal, DeleteTopicModal, MergeTopicsModal, SplitTopicModal, NewTopicModal } from './TopicModals';

// Model Modals
export { DeleteModelModal, DeleteAllModelsModal, DeleteAllPrecedentesModal } from './ModelModals';

// Model Extraction Modals
export { ExtractModelConfirmModal, ExtractedModelPreviewModal, SimilarityWarningModal } from './ModelExtractionModals';

// Proof Modals
export { AddProofTextModal, DeleteProofModal, ProofAnalysisModal, LinkProofModal } from './ProofModals';

// Session Modals
export { RestoreSessionModal, ClearProjectModal, LogoutConfirmModal } from './SessionModals';

// Bulk Modals
export { BulkDiscardConfirmModal, ConfirmBulkCancelModal } from './BulkModals';

// Misc Modals (TIER 1)
export { AnalysisModal, ExportModal, AnonymizationNamesModal, LinkedProofsModal } from './MiscModals';

// Advanced Modals (TIER 2)
export { ShareLibraryModal, AcceptSharePage, DispositivoModal, BulkReviewModal, BulkUploadModal } from './AdvancedModals';

// Jurisprudencia Modal
export { JurisprudenciaModal } from './JurisprudenciaModal';

// Other Modals
export { TextPreviewModal } from './TextPreviewModal';

// Preview Modals (TIER 3)
export { ModelPreviewModal } from './PreviewModals';

// Config Modal (v1.37.30)
export { ConfigModal } from './ConfigModal';

// Double Check Review Modal (v1.37.58)
export { DoubleCheckReviewModal } from './DoubleCheckReviewModal';

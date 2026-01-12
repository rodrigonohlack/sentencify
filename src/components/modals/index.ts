/**
 * @file index.ts
 * @description Barrel export para todos os modais simples
 * @version 1.36.88
 */

// BaseModal + helpers
export { BaseModal, ModalFooter, ModalWarningBox, ModalInfoBox, ModalAmberBox, ModalContentPreview, CSS } from './BaseModal';

// Topic Modals
export { RenameTopicModal, DeleteTopicModal, MergeTopicsModal, SplitTopicModal, NewTopicModal } from './TopicModals';

// Model Modals
export { DeleteModelModal, DeleteAllModelsModal, DeleteAllPrecedentesModal } from './ModelModals';

// Model Extraction Modals
export { ExtractModelConfirmModal, ExtractedModelPreviewModal, SimilarityWarningModal } from './ModelExtractionModals';

// Proof Modals
export { AddProofTextModal, DeleteProofModal } from './ProofModals';

// Session Modals
export { RestoreSessionModal, ClearProjectModal, LogoutConfirmModal } from './SessionModals';

// Bulk Modals
export { BulkDiscardConfirmModal, ConfirmBulkCancelModal } from './BulkModals';

// Other Modals
export { TextPreviewModal } from './TextPreviewModal';

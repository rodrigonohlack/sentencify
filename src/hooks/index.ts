/**
 * @file index.ts
 * @description Barrel export para hooks extraídos do App.tsx
 */

// TIER 0 hooks (sem dependências)
export { useFullscreen } from './useFullscreen';
export type { UseFullscreenReturn } from './useFullscreen';

export { useSpacingControl } from './useSpacingControl';
export type { UseSpacingControlReturn } from './useSpacingControl';

export { useFontSizeControl } from './useFontSizeControl';
export type { UseFontSizeControlReturn } from './useFontSizeControl';

export { useFeatureFlags } from './useFeatureFlags';
export type { UseFeatureFlagsReturn } from './useFeatureFlags';

export { useThrottledBroadcast } from './useThrottledBroadcast';
export type { BroadcastFunction } from './useThrottledBroadcast';

export { useAPICache } from './useAPICache';
export type { UseAPICacheReturn } from './useAPICache';

export { usePrimaryTabLock } from './usePrimaryTabLock';
export type { UsePrimaryTabLockReturn } from './usePrimaryTabLock';

export { useFieldVersioning } from './useFieldVersioning';
export type { UseFieldVersioningReturn } from './useFieldVersioning';

export { useThemeManagement } from './useThemeManagement';
export type { UseThemeManagementReturn, AppTheme } from './useThemeManagement';

export { useTabbedInterface, TABS, READONLY_TABS } from './useTabbedInterface';
export type { UseTabbedInterfaceReturn, TabId, TabDefinition } from './useTabbedInterface';

export { useNERManagement } from './useNERManagement';
export type { UseNERManagementReturn } from './useNERManagement';

export { useChangeDetectionHashes } from './useChangeDetectionHashes';
export type { UseChangeDetectionHashesReturn, ProofManagerData } from './useChangeDetectionHashes';

export { useSemanticSearchManagement } from './useSemanticSearchManagement';
export type { UseSemanticSearchManagementReturn } from './useSemanticSearchManagement';

export { useQuillInitialization } from './useQuillInitialization';
export type { UseQuillInitializationReturn } from './useQuillInitialization';

export { useTopicValidation } from './useTopicValidation';
export type { UseTopicValidationReturn, CanGenerateDispositivoResult } from './useTopicValidation';

export { useKeyboardShortcuts } from './useKeyboardShortcuts';
export type { UseKeyboardShortcutsProps, UseKeyboardShortcutsReturn } from './useKeyboardShortcuts';

export { useEditorHandlers } from './useEditorHandlers';
export type { UseEditorHandlersProps, UseEditorHandlersReturn, TopicEditorConfig } from './useEditorHandlers';

export { useReviewSentence } from './useReviewSentence';
export type { UseReviewSentenceProps, UseReviewSentenceReturn, ReviewScope, AIIntegrationForReview } from './useReviewSentence';

export { useSemanticSearchHandlers } from './useSemanticSearchHandlers';
export type { UseSemanticSearchHandlersProps, UseSemanticSearchHandlersReturn } from './useSemanticSearchHandlers';

export { useModelSuggestions } from './useModelSuggestions';
export type { UseModelSuggestionsProps, UseModelSuggestionsReturn, AIIntegrationForSuggestions, APICacheForSuggestions, SuggestionsResult } from './useModelSuggestions';

export { useMultiTabSync } from './useMultiTabSync';
export type { UseMultiTabSyncProps, UseMultiTabSyncReturn } from './useMultiTabSync';

// TIER 1 hooks (dependem de TIER 0)
export { useIndexedDB, validateModel, sanitizeModel } from './useIndexedDB';
export type { UseIndexedDBReturn, SyncCallbackParams } from './useIndexedDB';

// Legislação hook (TIER 0 - sem dependências)
export {
  useLegislacao,
  LEIS_METADATA,
  getLeiFromId,
  saveArtigosToIndexedDB,
  loadArtigosFromIndexedDB,
  clearArtigosFromIndexedDB,
  sortArtigosNatural
} from './useLegislacao';
export type { UseLegislacaoReturn } from './useLegislacao';

// Jurisprudência hook (TIER 0 - sem dependências)
export {
  useJurisprudencia,
  IRR_TYPES,
  isIRRType,
  JURIS_TIPOS_DISPONIVEIS,
  JURIS_TRIBUNAIS_DISPONIVEIS,
  savePrecedentesToIndexedDB,
  loadPrecedentesFromIndexedDB,
  clearPrecedentesFromIndexedDB
} from './useJurisprudencia';
export type { UseJurisprudenciaReturn } from './useJurisprudencia';

// Chat Assistant hook (TIER 0 - sem dependências)
export { useChatAssistant, MAX_CHAT_HISTORY_MESSAGES } from './useChatAssistant';
export type { UseChatAssistantReturn, ChatCacheOptions } from './useChatAssistant';

// Model Preview hook (TIER 0 - sem dependências)
export { useModelPreview } from './useModelPreview';
export type { UseModelPreviewReturn, SaveAsNewData } from './useModelPreview';

// PDF Storage hook (TIER 0 - sem dependências, extraído de useLocalStorage v1.38.52)
export {
  savePdfToIndexedDB,
  getPdfFromIndexedDB,
  removePdfFromIndexedDB,
  clearAllPdfsFromIndexedDB,
  getAttachmentIndexedDBKey,
  saveAttachmentToIndexedDB,
  getAttachmentFromIndexedDB,
  removeAttachmentFromIndexedDB,
  removeAllAttachmentsFromIndexedDB,
} from './usePdfStorage';

// LocalStorage hook (TIER 0 - dependências: useFactsComparisonCache, useSentenceReviewCache, usePdfStorage)
export { useLocalStorage } from './useLocalStorage';
export type { UseLocalStorageReturn } from './useLocalStorage';

// Cloud/Auth hooks (production - not test versions)
export { useGoogleDrive } from './useGoogleDrive';
export { useAuthMagicLink } from './useAuthMagicLink';
export { useSyncManager } from './useSyncManager';
export { useCloudSync } from './useCloudSync';

// Voice/Cache hooks
export { useVoiceToText } from './useVoiceToText';
export { useVoiceImprovement, VOICE_MODEL_CONFIG } from './useVoiceImprovement';
export { default as useFactsComparisonCache } from './useFactsComparisonCache';
export { default as useSentenceReviewCache } from './useSentenceReviewCache';
export { default as useChatHistoryCache, openChatDB, CHAT_DB_NAME, CHAT_STORE_NAME } from './useChatHistoryCache';
export type { UseChatHistoryCacheReturn } from './useChatHistoryCache';

// Facts Comparison hook (v1.37.21)
export { useFactsComparison } from './useFactsComparison';
export type { UseFactsComparisonProps, UseFactsComparisonReturn, AIIntegrationForFactsComparison } from './useFactsComparison';

// Proof Manager hook (TIER 1 - dependências: useLocalStorage, Zustand stores)
export { useProofManager } from './useProofManager';
export type { UseProofManagerReturn } from './useProofManager';

// Document Manager hook (TIER 1 - dependências: useLocalStorage)
export { useDocumentManager } from './useDocumentManager';
export type { UseDocumentManagerReturn } from './useDocumentManager';

// Topic Manager hook (TIER 1 - dependências: Zustand stores)
export { useTopicManager } from './useTopicManager';
export type { UseTopicManagerReturn } from './useTopicManager';

// Modal Manager hook (TIER 1 - dependências: Zustand stores)
export { useModalManager } from './useModalManager';
export type { UseModalManagerReturn } from './useModalManager';

// Model Library hook (TIER 1 - dependências: Zustand stores)
export {
  useModelLibrary,
  searchModelsInLibrary,
  removeAccents,
  SEARCH_STOPWORDS,
  SINONIMOS_JURIDICOS
} from './useModelLibrary';
export type { UseModelLibraryReturn } from './useModelLibrary';

// Quill Editor hook (TIER 0 - sem dependências externas)
export { useQuillEditor, sanitizeQuillHTML } from './useQuillEditor';
export type { UseQuillEditorOptions, UseQuillEditorReturn } from './useQuillEditor';

// Document Services hook (TIER 1 - dependências: useAIIntegration)
export { useDocumentServices } from './useDocumentServices';
export type { UseDocumentServicesReturn, AIIntegrationForDocuments } from './useDocumentServices';

// AI Integration hook (TIER 1 - dependências: Zustand stores, prompts)
export { useAIIntegration } from './useAIIntegration';
export type { UseAIIntegrationReturn } from './useAIIntegration';

// Document Analysis hook (TIER 2 - dependências: useAIIntegration, useDocumentServices, useUIStore)
export { useDocumentAnalysis } from './useDocumentAnalysis';
export type {
  UseDocumentAnalysisProps,
  UseDocumentAnalysisReturn,
  CurationData,
  DocumentServicesForAnalysis,
  StorageForAnalysis,
  AIIntegrationForAnalysis
} from './useDocumentAnalysis';

// Report Generation hook (TIER 2 - dependências: useAIIntegration)
export { useReportGeneration } from './useReportGeneration';
export type {
  UseReportGenerationProps,
  UseReportGenerationReturn,
  GenerateMiniReportOptions,
  MultipleReportsOptions,
  BatchOptions,
  BatchResult,
  AIIntegrationForReports
} from './useReportGeneration';

// Proof Analysis hook (TIER 2 - dependências: useAIIntegration, useProofManager)
export { useProofAnalysis } from './useProofAnalysis';
export type {
  UseProofAnalysisProps,
  UseProofAnalysisReturn,
  AIIntegrationForProofs,
  ProofManagerForAnalysis,
  DocumentServicesForProofs,
  StorageForProofs
} from './useProofAnalysis';

// Topic Ordering hook (TIER 2 - dependências: useAIIntegration)
export { useTopicOrdering } from './useTopicOrdering';
export type {
  UseTopicOrderingProps,
  UseTopicOrderingReturn,
  AIIntegrationForOrdering
} from './useTopicOrdering';

// Drag Drop Topics hook (TIER 2 - dependências: Zustand stores)
export { useDragDropTopics } from './useDragDropTopics';
export type {
  UseDragDropTopicsProps,
  UseDragDropTopicsReturn,
  AISettingsForDragDrop,
  AIIntegrationForDragDrop
} from './useDragDropTopics';

// Topic Operations hook (TIER 2 - dependências: useReportGeneration, topicManager)
export { useTopicOperations } from './useTopicOperations';
export type {
  UseTopicOperationsProps,
  UseTopicOperationsReturn,
  TopicManagerForOperations,
  AIIntegrationForOperations,
  NewTopicData
} from './useTopicOperations';

// Model Generation hook (TIER 2 - dependências: useAIIntegration, useModelLibrary)
export { useModelGeneration } from './useModelGeneration';
export type {
  UseModelGenerationProps,
  UseModelGenerationReturn,
  AIIntegrationForModelGen,
  ModelLibraryForModelGen
} from './useModelGeneration';

// Embeddings Management hook (TIER 2 - dependências: services, legislacao, jurisprudencia)
export { useEmbeddingsManagement } from './useEmbeddingsManagement';
export type {
  UseEmbeddingsManagementProps,
  UseEmbeddingsManagementReturn,
  LegislacaoForEmbeddings,
  JurisprudenciaForEmbeddings,
  ModelLibraryForEmbeddings,
  IndexedDBForEmbeddings
} from './useEmbeddingsManagement';

// Model Save hook (TIER 1 - dependências: modelLibrary, cloudSync, apiCache, services)
export { useModelSave } from './useModelSave';
export type {
  UseModelSaveProps,
  UseModelSaveReturn,
  ModelLibraryForSave,
  CloudSyncForSave,
  APICacheForSave,
  ModelPreviewForSave
} from './useModelSave';

// Dispositivo Generation hook (TIER 2 - dependências: aiIntegration, topics)
export { useDispositivoGeneration } from './useDispositivoGeneration';
export type {
  UseDispositivoGenerationProps,
  UseDispositivoGenerationReturn,
  AIIntegrationForDispositivo
} from './useDispositivoGeneration';

// Decision Text Generation hook (TIER 2 - dependências: aiIntegration, editor, chat)
export { useDecisionTextGeneration } from './useDecisionTextGeneration';
export type {
  UseDecisionTextGenerationProps,
  UseDecisionTextGenerationReturn,
  AIIntegrationForDecisionText,
  ProofManagerForDecisionText,
  ChatAssistantForDecisionText,
  ModelLibraryForDecisionText,
  AnalyzedDocuments
} from './useDecisionTextGeneration';

// Model Extraction hook (TIER 2 - dependências: aiIntegration, modelLibrary, apiCache)
export { useModelExtraction } from './useModelExtraction';
export type {
  UseModelExtractionProps,
  UseModelExtractionReturn,
  AIIntegrationForModelExtraction,
  ModelLibraryForModelExtraction,
  APICacheForModelExtraction
} from './useModelExtraction';

// Detect Entities hook (TIER 2 - dependências: AIModelService, documentServices)
export { useDetectEntities } from './useDetectEntities';
export type {
  UseDetectEntitiesProps,
  UseDetectEntitiesReturn,
  DocumentServicesForNER,
  ExtractedTextsForNER
} from './useDetectEntities';

// Export/Import hook (TIER 2 - dependências: modelLibrary, aiIntegration, cloudSync, AIModelService)
export { useExportImport } from './useExportImport';
export type {
  UseExportImportProps,
  UseExportImportReturn,
  ModelLibraryForExportImport,
  AIIntegrationForExportImport,
  CloudSyncForExportImport
} from './useExportImport';

// Decision Export hook (TIER 1 - dependências: html-conversion utils, export-styles)
export { useDecisionExport } from './useDecisionExport';
export type {
  UseDecisionExportProps,
  UseDecisionExportReturn
} from './useDecisionExport';

// Slash Menu hook (TIER 0 - gerencia estado interno do slash menu)
export { useSlashMenu } from './useSlashMenu';
export type {
  UseSlashMenuProps,
  UseSlashMenuReturn
} from './useSlashMenu';

// File Handling hook (TIER 2 - dependências: modelLibrary, aiIntegration, apiCache, documentServices)
export { useFileHandling } from './useFileHandling';
export type {
  UseFileHandlingProps,
  UseFileHandlingReturn,
  ModelLibraryForFileHandling,
  AIIntegrationForFileHandling,
  APICacheForFileHandling,
  DocumentServicesForFileHandling,
  CloudSyncForFileHandling,
  ModelPreviewForFileHandling
} from './useFileHandling';

// ═══════════════════════════════════════════════════════════════════════════
// MODAL HANDLERS (v1.37.73: ModalRoot)
// ═══════════════════════════════════════════════════════════════════════════

// Topic Modal Handlers (TIER 0 - apenas Zustand)
export { useTopicModalHandlers } from './useTopicModalHandlers';
export type { UseTopicModalHandlersReturn } from './useTopicModalHandlers';

// Model Modal Handlers (TIER 0 - apenas Zustand)
export { useModelModalHandlers } from './useModelModalHandlers';
export type { UseModelModalHandlersReturn } from './useModelModalHandlers';

// Proof Modal Handlers (TIER 0 - apenas Zustand)
export { useProofModalHandlers } from './useProofModalHandlers';
export type { UseProofModalHandlersReturn } from './useProofModalHandlers';

// Drive File Handlers (v1.38.51 - Google Drive callbacks)
export { useDriveFileHandlers } from './useDriveFileHandlers';
export type { UseDriveFileHandlersProps } from './useDriveFileHandlers';

// Session Callbacks (v1.38.52 - RestoreSession, ClearProject, Logout)
export { useSessionCallbacks } from './useSessionCallbacks';
export type { UseSessionCallbacksProps } from './useSessionCallbacks';

// Topic Editing (v1.38.52 - toggleTopicSelection, deleteTopic, saveTopicEdit)
export { useTopicEditing } from './useTopicEditing';
export type { UseTopicEditingProps, UseTopicEditingReturn } from './useTopicEditing';

// Model Editing (v1.38.52 - saveQuickEdit, confirmSaveAsNew, startEditingModel, duplicateModel)
export { useModelEditing } from './useModelEditing';
export type { UseModelEditingProps, UseModelEditingReturn } from './useModelEditing';

// Google Drive Actions (v1.38.52 - onSave, onSaveLocal, onLoadClick, onLoadLocal)
export { useGoogleDriveActions } from './useGoogleDriveActions';
export type { UseGoogleDriveActionsProps, UseGoogleDriveActionsReturn } from './useGoogleDriveActions';

// Proof Modal Callbacks (v1.38.52 - AddProofTextModal, AnonymizationNamesModal, ProofAnalysisModal, DeleteProofModal)
export { useProofModalCallbacks } from './useProofModalCallbacks';
export type { UseProofModalCallbacksProps, UseProofModalCallbacksReturn } from './useProofModalCallbacks';

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
export type { UseChatAssistantReturn } from './useChatAssistant';

// Model Preview hook (TIER 0 - sem dependências)
export { useModelPreview } from './useModelPreview';
export type { UseModelPreviewReturn, SaveAsNewData } from './useModelPreview';

// LocalStorage hook (TIER 0 - dependências: useFactsComparisonCache, useSentenceReviewCache)
export {
  useLocalStorage,
  savePdfToIndexedDB,
  getPdfFromIndexedDB,
  removePdfFromIndexedDB,
  clearAllPdfsFromIndexedDB
} from './useLocalStorage';
export type { UseLocalStorageReturn } from './useLocalStorage';

// Cloud/Auth hooks (production - not test versions)
export { useGoogleDrive } from './useGoogleDrive';
export { useAuthMagicLink } from './useAuthMagicLink';
export { useSyncManager } from './useSyncManager';
export { useCloudSync } from './useCloudSync';

// Voice/Cache hooks
export { useVoiceToText } from './useVoiceToText';
export { default as useFactsComparisonCache } from './useFactsComparisonCache';
export { default as useSentenceReviewCache } from './useSentenceReviewCache';

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

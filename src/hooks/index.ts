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

// Cloud/Auth hooks (production - not test versions)
export { useGoogleDrive } from './useGoogleDrive';
export { useAuthMagicLink } from './useAuthMagicLink';
export { useSyncManager } from './useSyncManager';
export { useCloudSync } from './useCloudSync';

// Voice/Cache hooks
export { useVoiceToText } from './useVoiceToText';
export { default as useFactsComparisonCache } from './useFactsComparisonCache';
export { default as useSentenceReviewCache } from './useSentenceReviewCache';

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

// Cloud/Auth hooks (production - not test versions)
export { useGoogleDrive } from './useGoogleDrive';
export { useAuthMagicLink } from './useAuthMagicLink';
export { useSyncManager } from './useSyncManager';
export { useCloudSync } from './useCloudSync';

// Voice/Cache hooks
export { useVoiceToText } from './useVoiceToText';
export { default as useFactsComparisonCache } from './useFactsComparisonCache';
export { default as useSentenceReviewCache } from './useSentenceReviewCache';

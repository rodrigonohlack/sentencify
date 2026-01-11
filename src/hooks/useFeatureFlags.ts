/**
 * @file useFeatureFlags.ts
 * @description Hook para gerenciamento de feature flags
 * @tier 0 (sem dependências)
 * @extractedFrom App.tsx linhas 2682-2728
 * @usedBy App (feature toggles)
 */

import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'sentencify-feature-flags';

// Default flags (conservative: new features disabled by default)
const DEFAULT_FLAGS: Record<string, boolean> = {
  useIndexedDB: true,
  syncEnabled: true,
};

export interface UseFeatureFlagsReturn {
  flags: Record<string, boolean>;
  setFlag: (flagName: string, value: boolean) => void;
  isEnabled: (flagName: string) => boolean;
  resetFlags: () => void;
  getAllFlags: () => Record<string, boolean>;
}

export function useFeatureFlags(): UseFeatureFlagsReturn {
  // Estado de Feature Flags
  const [flags, setFlags] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with defaults para garantir que novas flags existam
        return { ...DEFAULT_FLAGS, ...parsed };
      }
    } catch (err) {
      // Ignore localStorage/JSON errors
    }
    return DEFAULT_FLAGS;
  });

  // Persistir Flags no LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(flags));
    } catch (err) {
      // Ignore localStorage errors
    }
  }, [flags]);

  const setFlag = useCallback((flagName: string, value: boolean) => {
    setFlags((prev: Record<string, boolean>) => ({ ...prev, [flagName]: value }));
  }, []);

  const isEnabled = useCallback((flagName: string) => flags[flagName] === true, [flags]);

  const resetFlags = useCallback(() => setFlags(DEFAULT_FLAGS), []);

  const getAllFlags = useCallback(() => ({ ...flags }), [flags]);

  return {
    flags,
    setFlag,
    isEnabled,
    resetFlags,
    getAllFlags
  };
}

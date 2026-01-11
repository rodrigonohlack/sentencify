/**
 * @file useFontSizeControl.ts
 * @description Hook para controle de tamanho de fonte dos editores
 * @tier 0 (sem dependências)
 * @extractedFrom App.tsx linhas 2625-2679
 * @usedBy FontSizeDropdown, LegalDecisionEditor
 */

import { useState, useCallback, useEffect } from 'react';
import { FONTSIZE_PRESETS, FontSizePreset } from '../constants/presets';

const STORAGE_KEY = 'sentencify-editor-fontsize';

export interface UseFontSizeControlReturn {
  fontSize: string;
  setFontSize: (newFontSize: string) => void;
  currentPreset: FontSizePreset;
}

export function useFontSizeControl(): UseFontSizeControlReturn {
  const [fontSize, setFontSizeState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && FONTSIZE_PRESETS[saved]) {
        return saved;
      }
    } catch (err) {
      // Ignore localStorage errors
    }
    return 'normal';
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, fontSize);
    } catch (err) {
      // Ignore localStorage errors
    }
  }, [fontSize]);

  useEffect(() => {
    const handleFontSizeChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ fontSize: string }>;
      if (customEvent.detail.fontSize !== fontSize) {
        setFontSizeState(customEvent.detail.fontSize);
      }
    };

    window.addEventListener('fontsize-changed', handleFontSizeChange);
    return () => window.removeEventListener('fontsize-changed', handleFontSizeChange);
  }, [fontSize]);

  const setFontSize = useCallback((newFontSize: string) => {
    if (FONTSIZE_PRESETS[newFontSize]) {
      setFontSizeState(newFontSize);
      window.dispatchEvent(new CustomEvent('fontsize-changed', {
        detail: { fontSize: newFontSize }
      }));
    } else {
      setFontSizeState('normal');
      window.dispatchEvent(new CustomEvent('fontsize-changed', {
        detail: { fontSize: 'normal' }
      }));
    }
  }, []);

  const currentPreset = FONTSIZE_PRESETS[fontSize];

  return {
    fontSize,
    setFontSize,
    currentPreset
  };
}

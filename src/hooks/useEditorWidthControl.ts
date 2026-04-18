/**
 * @file useEditorWidthControl.ts
 * @description Hook para controle de largura do editor em tela cheia
 * @tier 0 (sem dependências)
 */

import { useState, useCallback, useEffect } from 'react';
import { EDITOR_WIDTH_PRESETS, EditorWidthPreset } from '../constants/presets';

const STORAGE_KEY = 'sentencify-editor-width';

export interface UseEditorWidthControlReturn {
  editorWidth: string;
  setEditorWidth: (newWidth: string) => void;
  currentPreset: EditorWidthPreset;
}

export function useEditorWidthControl(): UseEditorWidthControlReturn {
  const [editorWidth, setEditorWidthState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && EDITOR_WIDTH_PRESETS[saved]) {
        return saved;
      }
    } catch (err) {
      // Ignore localStorage errors
    }
    return 'normal';
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, editorWidth);
    } catch (err) {
      // Ignore localStorage errors
    }
  }, [editorWidth]);

  useEffect(() => {
    const handleWidthChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ editorWidth: string }>;
      if (customEvent.detail.editorWidth !== editorWidth) {
        setEditorWidthState(customEvent.detail.editorWidth);
      }
    };

    window.addEventListener('editorwidth-changed', handleWidthChange);
    return () => window.removeEventListener('editorwidth-changed', handleWidthChange);
  }, [editorWidth]);

  const setEditorWidth = useCallback((newWidth: string) => {
    const key = EDITOR_WIDTH_PRESETS[newWidth] ? newWidth : 'normal';
    setEditorWidthState(key);
    window.dispatchEvent(new CustomEvent('editorwidth-changed', {
      detail: { editorWidth: key }
    }));
  }, []);

  const currentPreset = EDITOR_WIDTH_PRESETS[editorWidth];

  return {
    editorWidth,
    setEditorWidth,
    currentPreset
  };
}

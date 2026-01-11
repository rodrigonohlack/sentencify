/**
 * @file useSpacingControl.ts
 * @description Hook para controle de espaçamento entre linhas e parágrafos
 * @tier 0 (sem dependências)
 * @extractedFrom App.tsx linhas 2563-2622
 * @usedBy SpacingDropdown, LegalDecisionEditor
 */

import { useState, useCallback, useEffect } from 'react';
import { SPACING_PRESETS, SpacingPreset } from '../constants/presets';

const STORAGE_KEY = 'sentencify-paragraph-spacing';

export interface UseSpacingControlReturn {
  spacing: string;
  setSpacing: (newSpacing: string) => void;
  currentPreset: SpacingPreset;
}

export function useSpacingControl(): UseSpacingControlReturn {
  // Estado com lazy initialization do localStorage
  const [spacing, setSpacingState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && SPACING_PRESETS[saved]) {
        return saved;
      }
    } catch (err) {
      // Ignore localStorage errors
    }
    return 'normal'; // Fallback para preset padrão
  });

  // Persistir no localStorage quando mudar
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, spacing);
    } catch (err) {
      // Ignore localStorage errors
    }
  }, [spacing]);

  useEffect(() => {
    const handleSpacingChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ spacing: string }>;
      // Evitar loop infinito: só atualizar se for diferente
      if (customEvent.detail.spacing !== spacing) {
        setSpacingState(customEvent.detail.spacing);
      }
    };

    window.addEventListener('spacing-changed', handleSpacingChange);
    return () => window.removeEventListener('spacing-changed', handleSpacingChange);
  }, [spacing]);

  // Função de controle com validação
  const setSpacing = useCallback((newSpacing: string) => {
    if (SPACING_PRESETS[newSpacing]) {
      setSpacingState(newSpacing);
      window.dispatchEvent(new CustomEvent('spacing-changed', {
        detail: { spacing: newSpacing }
      }));
    } else {
      setSpacingState('normal');
      window.dispatchEvent(new CustomEvent('spacing-changed', {
        detail: { spacing: 'normal' }
      }));
    }
  }, []);

  // Retornar API
  const currentPreset = SPACING_PRESETS[spacing];

  return {
    spacing,
    setSpacing,
    currentPreset
  };
}

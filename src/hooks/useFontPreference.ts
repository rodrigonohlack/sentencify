/**
 * @file useFontPreference.ts
 * @description Hook para a fonte da aplicação selecionável pelo usuário (Aparência).
 * @version 1.50.46 - Seletor de fonte configurável
 *
 * Espelha o padrão de useThemeManagement: persiste a escolha no localStorage e a
 * aplica no document.documentElement. Aqui, a aplicação é via a variável CSS
 * `--app-font` (consumida por src/index.css e tailwind.config.js) + injeção
 * dinâmica do <link> do Google Fonts da fonte escolhida.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  FONT_CATALOG,
  FONT_STORAGE_KEY,
  DEFAULT_FONT_ID,
  getFontOption,
  type FontOption,
} from '../constants/fonts';

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════════

export interface UseFontPreferenceReturn {
  /** Id da fonte atualmente selecionada. */
  fontId: string;
  /** Define a fonte ativa (id deve existir no catálogo; ignora valores inválidos). */
  setFontId: (id: string) => void;
  /** Catálogo de fontes disponíveis. */
  fonts: readonly FontOption[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER - injeção dinâmica do <link> do Google Fonts
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Garante que a folha de estilo da fonte esteja carregada. Idempotente: usa um id
 * estável por fonte para não injetar o mesmo <link> duas vezes. Fontes já carregadas
 * estaticamente (googleFontsHref === null) são no-op.
 */
function ensureFontLoaded(font: FontOption): void {
  if (!font.googleFontsHref) return;
  const linkId = `dynamic-font-${font.id}`;
  if (document.getElementById(linkId)) return;

  const link = document.createElement('link');
  link.id = linkId;
  link.rel = 'stylesheet';
  link.href = font.googleFontsHref;
  document.head.appendChild(link);
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Hook de preferência de fonte da aplicação.
 *
 * @example
 * const { fontId, setFontId, fonts } = useFontPreference();
 */
export function useFontPreference(): UseFontPreferenceReturn {
  const [fontId, setFontIdState] = useState<string>(() => {
    const stored = localStorage.getItem(FONT_STORAGE_KEY);
    return FONT_CATALOG.some((f) => f.id === stored) ? (stored as string) : DEFAULT_FONT_ID;
  });

  useEffect(() => {
    const font = getFontOption(fontId);
    ensureFontLoaded(font);
    document.documentElement.style.setProperty('--app-font', font.stack);
    localStorage.setItem(FONT_STORAGE_KEY, font.id);
  }, [fontId]);

  const setFontId = useCallback((id: string) => {
    if (FONT_CATALOG.some((f) => f.id === id)) {
      setFontIdState(id);
    }
  }, []);

  return { fontId, setFontId, fonts: FONT_CATALOG };
}

export default useFontPreference;

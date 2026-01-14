/**
 * @file useThemeManagement.ts
 * @description Hook para gerenciamento de tema (claro/escuro)
 * @version 1.37.37 - Extraído do App.tsx (FASE 35)
 */

import { useState, useEffect, useCallback } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════════

export type AppTheme = 'dark' | 'light';

export interface UseThemeManagementReturn {
  /** Tema atual ('dark' ou 'light') */
  appTheme: AppTheme;
  /** Atalho: true se tema escuro */
  isDarkMode: boolean;
  /** Alias para compatibilidade com editores */
  editorTheme: AppTheme;
  /** Alterna entre tema claro e escuro */
  toggleAppTheme: () => void;
  /** Alias para toggleAppTheme (compatibilidade) */
  toggleEditorTheme: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════════

const THEME_STORAGE_KEY = 'sentencify-app-theme';
const DEFAULT_THEME: AppTheme = 'dark';

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Hook para gerenciamento de tema da aplicação
 *
 * Funcionalidades:
 * - Persiste tema no localStorage
 * - Aplica data-theme no document.documentElement para CSS Variables
 * - Fornece helpers isDarkMode e toggles
 *
 * @example
 * const { appTheme, isDarkMode, toggleAppTheme } = useThemeManagement();
 */
export function useThemeManagement(): UseThemeManagementReturn {
  // Estado inicializado do localStorage ou default
  const [appTheme, setAppTheme] = useState<AppTheme>(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return (stored === 'light' || stored === 'dark') ? stored : DEFAULT_THEME;
  });

  // Persistir tema e aplicar no DOM
  useEffect(() => {
    // Aplicar data-theme no HTML root para CSS Variables
    document.documentElement.setAttribute('data-theme', appTheme);
    // Persistir no localStorage
    localStorage.setItem(THEME_STORAGE_KEY, appTheme);
  }, [appTheme]);

  // Toggle entre temas
  const toggleAppTheme = useCallback(() => {
    setAppTheme(prev => prev === 'dark' ? 'light' : 'dark');
  }, []);

  return {
    appTheme,
    isDarkMode: appTheme === 'dark',
    editorTheme: appTheme,
    toggleAppTheme,
    toggleEditorTheme: toggleAppTheme,
  };
}

export default useThemeManagement;

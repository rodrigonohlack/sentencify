/**
 * @file useSemanticSearchManagement.ts
 * @description Hook wrapper para useSearchStore (compatibilidade com API existente)
 * @version 1.40.09 - Agora usa Zustand store internamente (fix estado compartilhado)
 *
 * MUDANÇA:
 * - Antes: useState local → cada componente tinha estado isolado
 * - Agora: Zustand store → estado único compartilhado globalmente
 *
 * A API do hook permanece idêntica para compatibilidade com código existente.
 * Componentes que usam este hook continuarão funcionando sem modificações.
 */

import { useEffect } from 'react';
import { useSearchStore } from '../stores/useSearchStore';

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════════

export interface UseSemanticSearchManagementReturn {
  // Estados
  searchFilesStored: string[];
  searchModelReady: boolean;
  searchInitializing: boolean;
  searchDownloadProgress: number;
  searchEnabled: boolean;

  // Setters
  setSearchFilesStored: (files: string[]) => void;
  setSearchModelReady: (ready: boolean) => void;
  setSearchInitializing: (initializing: boolean) => void;
  setSearchDownloadProgress: (progress: number) => void;
  setSearchEnabled: (value: boolean) => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export function useSemanticSearchManagement(): UseSemanticSearchManagementReturn {
  const store = useSearchStore();

  // Auto-inicializar na montagem se habilitado
  // Delay de 1s para não bloquear render inicial
  useEffect(() => {
    if (store.searchEnabled && !store.searchModelReady && !store.searchInitializing) {
      const timer = setTimeout(() => {
        store.initSearchModel();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []); // Apenas na montagem inicial

  return {
    // Estados (lidos do store Zustand)
    searchFilesStored: store.searchFilesStored,
    searchModelReady: store.searchModelReady,
    searchInitializing: store.searchInitializing,
    searchDownloadProgress: store.searchDownloadProgress,
    searchEnabled: store.searchEnabled,

    // Setters (delegam para o store Zustand)
    setSearchFilesStored: store.setSearchFilesStored,
    setSearchModelReady: store.setSearchModelReady,
    setSearchInitializing: store.setSearchInitializing,
    setSearchDownloadProgress: store.setSearchDownloadProgress,
    setSearchEnabled: store.setSearchEnabled,
  };
}

export default useSemanticSearchManagement;

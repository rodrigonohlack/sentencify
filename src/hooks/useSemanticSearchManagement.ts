/**
 * @file useSemanticSearchManagement.ts
 * @description Hook para gerenciamento de estados de Busca Semântica (E5-base)
 *
 * FASE 42: Extraído do App.tsx para consolidar estados relacionados ao
 * modelo de embeddings E5 usado para busca semântica de modelos.
 *
 * Estados gerenciados:
 * - searchFilesStored: Legado, lista de arquivos armazenados
 * - searchModelReady: Se o modelo E5 está carregado e pronto
 * - searchInitializing: Se está em processo de inicialização
 * - searchDownloadProgress: Progresso do download (0-100)
 * - searchEnabled: Toggle master para habilitar busca semântica (persistido)
 */

import { useState, useCallback } from 'react';

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
  setSearchFilesStored: React.Dispatch<React.SetStateAction<string[]>>;
  setSearchModelReady: React.Dispatch<React.SetStateAction<boolean>>;
  setSearchInitializing: React.Dispatch<React.SetStateAction<boolean>>;
  setSearchDownloadProgress: React.Dispatch<React.SetStateAction<number>>;
  setSearchEnabled: (value: boolean) => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════════

const STORAGE_KEYS = {
  SEARCH_ENABLED: 'searchEnabled',
  SEMANTIC_SEARCH_ENABLED: 'semanticSearchEnabled', // Legado para migração
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export function useSemanticSearchManagement(): UseSemanticSearchManagementReturn {
  // Estados do modelo E5 (busca semântica)
  const [searchFilesStored, setSearchFilesStored] = useState<string[]>([]);
  const [searchModelReady, setSearchModelReady] = useState(false);
  const [searchInitializing, setSearchInitializing] = useState(false);
  const [searchDownloadProgress, setSearchDownloadProgress] = useState(0);

  // Toggle master para busca semântica (persistido em localStorage)
  // v1.28.00: Controla carregamento do modelo E5
  const [searchEnabled, setSearchEnabledState] = useState(() => {
    try {
      // Migração: se searchEnabled não existe, usa semanticSearchEnabled como fallback
      const stored = localStorage.getItem(STORAGE_KEYS.SEARCH_ENABLED);
      if (stored !== null) return JSON.parse(stored);
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.SEMANTIC_SEARCH_ENABLED) || 'false');
    } catch {
      return false;
    }
  });

  // Setter com persistência para searchEnabled
  const setSearchEnabled = useCallback((value: boolean) => {
    setSearchEnabledState(value);
    try {
      localStorage.setItem(STORAGE_KEYS.SEARCH_ENABLED, JSON.stringify(value));
    } catch (err) {
      console.warn('[SemanticSearch] Erro ao salvar searchEnabled:', err);
    }
  }, []);

  return {
    // Estados
    searchFilesStored,
    searchModelReady,
    searchInitializing,
    searchDownloadProgress,
    searchEnabled,

    // Setters
    setSearchFilesStored,
    setSearchModelReady,
    setSearchInitializing,
    setSearchDownloadProgress,
    setSearchEnabled,
  };
}

export default useSemanticSearchManagement;

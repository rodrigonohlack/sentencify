/**
 * @file useNERManagement.ts
 * @description Hook para gerenciamento de estados NER (Named Entity Recognition)
 *
 * FASE 40: Extraído do App.tsx para consolidar estados relacionados à detecção
 * de nomes usando IA local (Xenova/Transformers).
 *
 * Estados gerenciados:
 * - nerFilesStored: Legado, não mais usado
 * - nerModelReady: Se o modelo NER está carregado e pronto
 * - nerInitializing: Se está em processo de inicialização
 * - nerDownloadProgress: Progresso do download (0-100)
 * - detectingNames: Se está detectando nomes ativamente
 * - nerEnabled: Toggle master para habilitar NER
 * - nerIncludeOrg: Se deve incluir organizações na detecção
 */

import { useState, useCallback, useEffect } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════════

export interface UseNERManagementReturn {
  // Estados
  nerFilesStored: string[];
  nerModelReady: boolean;
  nerInitializing: boolean;
  nerDownloadProgress: number;
  detectingNames: boolean;
  nerEnabled: boolean;
  nerIncludeOrg: boolean;

  // Setters
  setNerFilesStored: React.Dispatch<React.SetStateAction<string[]>>;
  setNerModelReady: React.Dispatch<React.SetStateAction<boolean>>;
  setNerInitializing: React.Dispatch<React.SetStateAction<boolean>>;
  setNerDownloadProgress: React.Dispatch<React.SetStateAction<number>>;
  setDetectingNames: React.Dispatch<React.SetStateAction<boolean>>;
  setNerEnabled: (value: boolean) => void;
  setNerIncludeOrg: (value: boolean) => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════════

const STORAGE_KEYS = {
  NER_ENABLED: 'nerEnabled',
  NER_INCLUDE_ORG: 'nerIncludeOrg',
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export function useNERManagement(): UseNERManagementReturn {
  // Estados do modelo NER
  const [nerFilesStored, setNerFilesStored] = useState<string[]>([]); // Legado - não mais usado
  const [nerModelReady, setNerModelReady] = useState(false);
  const [nerInitializing, setNerInitializing] = useState(false);
  const [nerDownloadProgress, setNerDownloadProgress] = useState(0);
  const [detectingNames, setDetectingNames] = useState(false);

  // Toggle master para NER (persistido em localStorage)
  const [nerEnabled, setNerEnabledState] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.NER_ENABLED) || 'false');
    } catch {
      return false;
    }
  });

  // Incluir organizações na detecção (persistido em localStorage)
  const [nerIncludeOrg, setNerIncludeOrgState] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.NER_INCLUDE_ORG) || 'false');
    } catch {
      return false;
    }
  });

  // Setter com persistência para nerEnabled
  const setNerEnabled = useCallback((value: boolean) => {
    setNerEnabledState(value);
    try {
      localStorage.setItem(STORAGE_KEYS.NER_ENABLED, JSON.stringify(value));
    } catch (err) {
      console.warn('[NER] Erro ao salvar nerEnabled:', err);
    }
  }, []);

  // Setter com persistência para nerIncludeOrg
  const setNerIncludeOrg = useCallback((value: boolean) => {
    setNerIncludeOrgState(value);
    try {
      localStorage.setItem(STORAGE_KEYS.NER_INCLUDE_ORG, JSON.stringify(value));
    } catch (err) {
      console.warn('[NER] Erro ao salvar nerIncludeOrg:', err);
    }
  }, []);

  return {
    // Estados
    nerFilesStored,
    nerModelReady,
    nerInitializing,
    nerDownloadProgress,
    detectingNames,
    nerEnabled,
    nerIncludeOrg,

    // Setters
    setNerFilesStored,
    setNerModelReady,
    setNerInitializing,
    setNerDownloadProgress,
    setDetectingNames,
    setNerEnabled,
    setNerIncludeOrg,
  };
}

export default useNERManagement;

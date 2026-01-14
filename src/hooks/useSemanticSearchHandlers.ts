/**
 * @file useSemanticSearchHandlers.ts
 * @description Hook para busca semântica de modelos
 * @version 1.37.44
 *
 * FASE 52: Extraído do App.tsx para consolidar lógica de busca semântica.
 *
 * Responsabilidades:
 * - Gerenciar estados de busca semântica manual
 * - Gerenciar estados de busca semântica de modelos
 * - Executar busca com debounce
 * - Verificar disponibilidade de busca semântica
 *
 * 🔑 ESTRATÉGIA ZUSTAND: Acessa models via useModelsStore.getState()
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useModelsStore } from '../stores/useModelsStore';
import { searchModelsBySimilarity } from '../utils/models';
import type { Model, AISettings } from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════════

export interface UseSemanticSearchHandlersProps {
  /** Configurações de IA (para threshold e toggle global) */
  aiSettings: AISettings;
  /** Se o modelo de busca semântica está pronto */
  searchModelReady: boolean;
  /** Número de modelos com embeddings */
  modelEmbeddingsCount: number;
}

export interface UseSemanticSearchHandlersReturn {
  // Estados de busca manual
  semanticManualSearchResults: Model[] | null;
  setSemanticManualSearchResults: React.Dispatch<React.SetStateAction<Model[] | null>>;
  semanticManualSearching: boolean;
  setSemanticManualSearching: React.Dispatch<React.SetStateAction<boolean>>;

  // Estados de busca de modelos
  useModelSemanticSearch: boolean | undefined;
  setUseModelSemanticSearch: React.Dispatch<React.SetStateAction<boolean | undefined>>;
  modelSemanticResults: Model[] | null;
  setModelSemanticResults: React.Dispatch<React.SetStateAction<Model[] | null>>;
  searchingModelSemantics: boolean | undefined;

  // Computed
  modelSemanticAvailable: boolean | undefined;

  // Handler
  performModelSemanticSearch: (query: string) => Promise<void>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Hook para busca semântica de modelos
 *
 * @param props - Dependências necessárias
 */
export function useSemanticSearchHandlers({
  aiSettings,
  searchModelReady,
  modelEmbeddingsCount,
}: UseSemanticSearchHandlersProps): UseSemanticSearchHandlersReturn {
  // ═══════════════════════════════════════════════════════════════════════════════
  // ESTADOS DE BUSCA MANUAL
  // ═══════════════════════════════════════════════════════════════════════════════

  const [semanticManualSearchResults, setSemanticManualSearchResults] = useState<Model[] | null>(null);
  const [semanticManualSearching, setSemanticManualSearching] = useState(false);

  // ═══════════════════════════════════════════════════════════════════════════════
  // ESTADOS DE BUSCA DE MODELOS
  // ═══════════════════════════════════════════════════════════════════════════════

  // v1.35.74: Usa aiSettings unificado
  const [useModelSemanticSearch, setUseModelSemanticSearch] = useState<boolean | undefined>(() => {
    try {
      const stored = localStorage.getItem('modelSemanticMode');
      if (stored !== null) return stored === 'true';
      return aiSettings.modelSemanticEnabled; // Usa toggle global como fallback
    } catch {
      return false;
    }
  });
  const [modelSemanticResults, setModelSemanticResults] = useState<Model[] | null>(null);
  const [searchingModelSemantics, setSearchingModelSemantics] = useState<boolean | undefined>(false);

  // ═══════════════════════════════════════════════════════════════════════════════
  // COMPUTED
  // ═══════════════════════════════════════════════════════════════════════════════

  // Busca semântica de modelos disponível se: toggle global ativo + modelo pronto + modelos com embedding
  const modelSemanticAvailable = useMemo(() => {
    return aiSettings.modelSemanticEnabled && searchModelReady && modelEmbeddingsCount > 0;
  }, [aiSettings.modelSemanticEnabled, searchModelReady, modelEmbeddingsCount]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // HANDLER DE BUSCA
  // ═══════════════════════════════════════════════════════════════════════════════

  // 🔑 ZUSTAND: Acessa models diretamente do store
  const performModelSemanticSearch = useCallback(async (query: string) => {
    if (!query || query.length < 3 || !modelSemanticAvailable) {
      setModelSemanticResults(null);
      return;
    }
    setSearchingModelSemantics(true);
    try {
      // 🔑 ZUSTAND: Acessa models diretamente do store em vez de receber como prop
      const { models } = useModelsStore.getState();
      const threshold = (aiSettings.modelSemanticThreshold ?? 75) / 100;
      const results = await searchModelsBySimilarity(models, query, { threshold, limit: 30 });
      setModelSemanticResults(results);
    } catch (err) {
      console.error('[Model Semantic] Erro na busca:', err);
      setModelSemanticResults(null);
    } finally {
      setSearchingModelSemantics(false);
    }
  }, [modelSemanticAvailable, aiSettings.modelSemanticThreshold]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // DEBOUNCE EFFECT
  // ═══════════════════════════════════════════════════════════════════════════════

  const modelSemanticSearchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 🔑 ZUSTAND: Acessa searchTerm diretamente do store
  const searchTerm = useModelsStore((s) => s.searchTerm);

  useEffect(() => {
    if (useModelSemanticSearch && modelSemanticAvailable && searchTerm) {
      if (modelSemanticSearchTimeoutRef.current) {
        clearTimeout(modelSemanticSearchTimeoutRef.current);
      }
      modelSemanticSearchTimeoutRef.current = setTimeout(() => {
        performModelSemanticSearch(searchTerm);
      }, 500);
    } else {
      setModelSemanticResults(null);
    }
    return () => {
      if (modelSemanticSearchTimeoutRef.current) {
        clearTimeout(modelSemanticSearchTimeoutRef.current);
      }
    };
  }, [searchTerm, useModelSemanticSearch, modelSemanticAvailable, performModelSemanticSearch]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // RETORNO
  // ═══════════════════════════════════════════════════════════════════════════════

  return {
    // Estados de busca manual
    semanticManualSearchResults,
    setSemanticManualSearchResults,
    semanticManualSearching,
    setSemanticManualSearching,

    // Estados de busca de modelos
    useModelSemanticSearch,
    setUseModelSemanticSearch,
    modelSemanticResults,
    setModelSemanticResults,
    searchingModelSemantics,

    // Computed
    modelSemanticAvailable,

    // Handler
    performModelSemanticSearch,
  };
}

export default useSemanticSearchHandlers;

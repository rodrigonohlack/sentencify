/**
 * Hook: useFactsComparisonCache - Cache de confronto de fatos
 * Armazena resultados de análise comparativa em IndexedDB com TTL infinito
 *
 * @version 1.36.12
 */
import { useCallback, useMemo } from 'react';
import type { FactsComparisonResult, FactsComparisonSource, FactsComparisonCacheEntry } from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════

export const FACTS_DB_NAME = 'sentencify-facts-comparison';
export const FACTS_STORE_NAME = 'comparisons';
export const FACTS_DB_VERSION = 1;

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

/** Retorno do hook useFactsComparisonCache */
export interface UseFactsComparisonCacheReturn {
  saveComparison: (topicTitle: string, source: FactsComparisonSource, result: FactsComparisonResult) => Promise<void>;
  getComparison: (topicTitle: string, source: FactsComparisonSource) => Promise<FactsComparisonResult | null>;
  getAllComparisons: () => Promise<FactsComparisonCacheEntry[]>;
  deleteComparison: (topicTitle: string, source?: FactsComparisonSource) => Promise<void>;
  clearAllComparisons: () => Promise<void>;
  exportAll: () => Promise<Record<string, FactsComparisonResult>>;
  importAll: (data: Record<string, FactsComparisonResult>) => Promise<void>;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER: Abrir IndexedDB
// ═══════════════════════════════════════════════════════════════════════════

export const openFactsDB = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open(FACTS_DB_NAME, FACTS_DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(FACTS_STORE_NAME)) {
        const store = db.createObjectStore(FACTS_STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('topicTitle', 'topicTitle', { unique: false });
        // Índice composto para busca por topicTitle + source
        store.createIndex('topicSource', ['topicTitle', 'source'], { unique: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

const useFactsComparisonCache = (): UseFactsComparisonCacheReturn => {
  /**
   * Salva uma comparação no cache (substitui se já existir)
   */
  const saveComparison = useCallback(async (
    topicTitle: string,
    source: FactsComparisonSource,
    result: FactsComparisonResult
  ): Promise<void> => {
    if (!topicTitle || !result) return;
    try {
      const db = await openFactsDB();
      const tx = db.transaction(FACTS_STORE_NAME, 'readwrite');
      const store = tx.objectStore(FACTS_STORE_NAME);
      const index = store.index('topicSource');

      // Verificar se já existe entrada para este tópico+source
      const existing = await new Promise<FactsComparisonCacheEntry | undefined>((resolve) => {
        const req = index.get([topicTitle, source]);
        req.onsuccess = () => resolve(req.result as FactsComparisonCacheEntry | undefined);
        req.onerror = () => resolve(undefined);
      });

      const entry: FactsComparisonCacheEntry = {
        topicTitle,
        source,
        result,
        createdAt: Date.now()
      };

      if (existing?.id) {
        // Atualizar existente
        entry.id = existing.id;
        store.put(entry);
      } else {
        // Criar novo
        store.add(entry);
      }

      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });

      db.close();
    } catch (e) {
      console.warn('[FactsComparisonCache] Erro ao salvar:', e);
    }
  }, []);

  /**
   * Recupera uma comparação do cache
   */
  const getComparison = useCallback(async (
    topicTitle: string,
    source: FactsComparisonSource
  ): Promise<FactsComparisonResult | null> => {
    if (!topicTitle) return null;
    try {
      const db = await openFactsDB();
      const store = db.transaction(FACTS_STORE_NAME).objectStore(FACTS_STORE_NAME);
      const index = store.index('topicSource');

      const entry = await new Promise<FactsComparisonCacheEntry | undefined>((resolve) => {
        const req = index.get([topicTitle, source]);
        req.onsuccess = () => resolve(req.result as FactsComparisonCacheEntry | undefined);
        req.onerror = () => resolve(undefined);
      });

      db.close();
      return entry?.result || null;
    } catch (e) {
      console.warn('[FactsComparisonCache] Erro ao recuperar:', e);
      return null;
    }
  }, []);

  /**
   * Recupera todas as comparações do cache
   */
  const getAllComparisons = useCallback(async (): Promise<FactsComparisonCacheEntry[]> => {
    try {
      const db = await openFactsDB();
      const store = db.transaction(FACTS_STORE_NAME).objectStore(FACTS_STORE_NAME);

      const entries = await new Promise<FactsComparisonCacheEntry[]>((resolve) => {
        const req = store.getAll();
        req.onsuccess = () => resolve((req.result as FactsComparisonCacheEntry[]) || []);
        req.onerror = () => resolve([]);
      });

      db.close();
      return entries;
    } catch (e) {
      console.warn('[FactsComparisonCache] Erro ao listar:', e);
      return [];
    }
  }, []);

  /**
   * Deleta comparações de um tópico (opcionalmente filtrando por source)
   */
  const deleteComparison = useCallback(async (
    topicTitle: string,
    source?: FactsComparisonSource
  ): Promise<void> => {
    if (!topicTitle) return;
    try {
      const db = await openFactsDB();
      const tx = db.transaction(FACTS_STORE_NAME, 'readwrite');
      const store = tx.objectStore(FACTS_STORE_NAME);
      const index = store.index('topicTitle');

      const entries = await new Promise<FactsComparisonCacheEntry[]>((resolve) => {
        const req = index.getAll(topicTitle);
        req.onsuccess = () => resolve((req.result as FactsComparisonCacheEntry[]) || []);
        req.onerror = () => resolve([]);
      });

      for (const entry of entries) {
        if (entry.id !== undefined && (!source || entry.source === source)) {
          store.delete(entry.id);
        }
      }

      await new Promise<void>((resolve) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });

      db.close();
    } catch (e) {
      console.warn('[FactsComparisonCache] Erro ao deletar:', e);
    }
  }, []);

  /**
   * Limpa todo o cache
   */
  const clearAllComparisons = useCallback(async (): Promise<void> => {
    try {
      const db = await openFactsDB();
      const tx = db.transaction(FACTS_STORE_NAME, 'readwrite');
      tx.objectStore(FACTS_STORE_NAME).clear();

      await new Promise<void>((resolve) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });

      db.close();
    } catch (e) {
      console.warn('[FactsComparisonCache] Erro ao limpar:', e);
    }
  }, []);

  /**
   * Exporta todas as comparações para inclusão no projeto JSON
   */
  const exportAll = useCallback(async (): Promise<Record<string, FactsComparisonResult>> => {
    try {
      const entries = await getAllComparisons();
      const result: Record<string, FactsComparisonResult> = {};

      for (const entry of entries) {
        // Chave: topicTitle_source (ex: "HORAS EXTRAS_mini-relatorio")
        const key = `${entry.topicTitle}_${entry.source}`;
        result[key] = entry.result;
      }

      return result;
    } catch (e) {
      console.warn('[FactsComparisonCache] Erro ao exportar:', e);
      return {};
    }
  }, [getAllComparisons]);

  /**
   * Importa comparações de um projeto JSON
   */
  const importAll = useCallback(async (
    data: Record<string, FactsComparisonResult>
  ): Promise<void> => {
    if (!data || typeof data !== 'object') return;
    try {
      for (const [key, result] of Object.entries(data)) {
        // Extrair topicTitle e source da chave
        const lastUnderscore = key.lastIndexOf('_');
        if (lastUnderscore === -1) continue;

        const topicTitle = key.substring(0, lastUnderscore);
        const source = key.substring(lastUnderscore + 1) as FactsComparisonSource;

        if (topicTitle && (source === 'mini-relatorio' || source === 'documentos-completos')) {
          await saveComparison(topicTitle, source, result);
        }
      }
    } catch (e) {
      console.warn('[FactsComparisonCache] Erro ao importar:', e);
    }
  }, [saveComparison]);

  return useMemo(() => ({
    saveComparison,
    getComparison,
    getAllComparisons,
    deleteComparison,
    clearAllComparisons,
    exportAll,
    importAll
  }), [saveComparison, getComparison, getAllComparisons, deleteComparison, clearAllComparisons, exportAll, importAll]);
};

export default useFactsComparisonCache;

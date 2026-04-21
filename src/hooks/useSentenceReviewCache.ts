/**
 * Hook: useSentenceReviewCache - Cache de revisão de sentença
 * Armazena resultados de revisão/análise crítica em IndexedDB com TTL infinito
 *
 * @version 1.42.04
 *
 * v1.42.04: Suporte a chave composta scope + excludeNoResult via sufixo `:noEmpty`.
 * Caches antigos (sem sufixo) seguem válidos como "flag desligada".
 */
import { useCallback, useMemo } from 'react';
import type { ReviewScope, SentenceReviewCacheEntry } from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════

export const REVIEW_DB_NAME = 'sentencify-sentence-review';
export const REVIEW_STORE_NAME = 'reviews';
export const REVIEW_DB_VERSION = 1;

/** Sufixo aplicado à chave do cache quando o filtro de tópicos sem resultado está ligado */
export const CACHE_SUFFIX_NO_EMPTY = ':noEmpty';

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Constrói a chave persistida no IndexedDB combinando scope + flag.
 * Quando excludeNoResult=false, retorna o scope puro (compat com caches antigos).
 */
export const buildCacheKey = (scope: ReviewScope, excludeNoResult?: boolean): string =>
  excludeNoResult ? `${scope}${CACHE_SUFFIX_NO_EMPTY}` : scope;

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

/** Retorno do hook useSentenceReviewCache */
export interface UseSentenceReviewCacheReturn {
  saveReview: (scope: ReviewScope, result: string, excludeNoResult?: boolean) => Promise<void>;
  getReview: (scope: ReviewScope, excludeNoResult?: boolean) => Promise<string | null>;
  getAllReviews: () => Promise<SentenceReviewCacheEntry[]>;
  deleteReview: (scope?: ReviewScope, excludeNoResult?: boolean) => Promise<void>;
  clearAllReviews: () => Promise<void>;
  exportAll: () => Promise<Record<string, string>>;
  importAll: (data: Record<string, string>) => Promise<void>;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER: Abrir IndexedDB
// ═══════════════════════════════════════════════════════════════════════════

export const openReviewDB = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open(REVIEW_DB_NAME, REVIEW_DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(REVIEW_STORE_NAME)) {
        const store = db.createObjectStore(REVIEW_STORE_NAME, { keyPath: 'id', autoIncrement: true });
        // Índice único por scope (só pode haver uma revisão por escopo)
        store.createIndex('scope', 'scope', { unique: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

const useSentenceReviewCache = (): UseSentenceReviewCacheReturn => {
  /**
   * Salva uma revisão no cache (substitui se já existir para a mesma chave)
   */
  const saveReview = useCallback(async (
    scope: ReviewScope,
    result: string,
    excludeNoResult?: boolean
  ): Promise<void> => {
    if (!scope || !result) return;
    const key = buildCacheKey(scope, excludeNoResult);
    try {
      const db = await openReviewDB();
      const tx = db.transaction(REVIEW_STORE_NAME, 'readwrite');
      const store = tx.objectStore(REVIEW_STORE_NAME);
      const index = store.index('scope');

      // Verificar se já existe entrada para esta chave
      const existing = await new Promise<SentenceReviewCacheEntry | undefined>((resolve) => {
        const req = index.get(key);
        req.onsuccess = () => resolve(req.result as SentenceReviewCacheEntry | undefined);
        req.onerror = () => resolve(undefined);
      });

      const entry: SentenceReviewCacheEntry = {
        scope: key as ReviewScope,
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
      console.warn('[SentenceReviewCache] Erro ao salvar:', e);
    }
  }, []);

  /**
   * Recupera uma revisão do cache
   */
  const getReview = useCallback(async (
    scope: ReviewScope,
    excludeNoResult?: boolean
  ): Promise<string | null> => {
    if (!scope) return null;
    const key = buildCacheKey(scope, excludeNoResult);
    try {
      const db = await openReviewDB();
      const store = db.transaction(REVIEW_STORE_NAME).objectStore(REVIEW_STORE_NAME);
      const index = store.index('scope');

      const entry = await new Promise<SentenceReviewCacheEntry | undefined>((resolve) => {
        const req = index.get(key);
        req.onsuccess = () => resolve(req.result as SentenceReviewCacheEntry | undefined);
        req.onerror = () => resolve(undefined);
      });

      db.close();
      return entry?.result || null;
    } catch (e) {
      console.warn('[SentenceReviewCache] Erro ao recuperar:', e);
      return null;
    }
  }, []);

  /**
   * Recupera todas as revisões do cache
   */
  const getAllReviews = useCallback(async (): Promise<SentenceReviewCacheEntry[]> => {
    try {
      const db = await openReviewDB();
      const store = db.transaction(REVIEW_STORE_NAME).objectStore(REVIEW_STORE_NAME);

      const entries = await new Promise<SentenceReviewCacheEntry[]>((resolve) => {
        const req = store.getAll();
        req.onsuccess = () => resolve((req.result as SentenceReviewCacheEntry[]) || []);
        req.onerror = () => resolve([]);
      });

      db.close();
      return entries;
    } catch (e) {
      console.warn('[SentenceReviewCache] Erro ao listar:', e);
      return [];
    }
  }, []);

  /**
   * Deleta revisão (opcionalmente filtrando por scope + flag)
   */
  const deleteReview = useCallback(async (
    scope?: ReviewScope,
    excludeNoResult?: boolean
  ): Promise<void> => {
    try {
      const db = await openReviewDB();
      const tx = db.transaction(REVIEW_STORE_NAME, 'readwrite');
      const store = tx.objectStore(REVIEW_STORE_NAME);

      if (scope) {
        // Deletar apenas a chave específica
        const key = buildCacheKey(scope, excludeNoResult);
        const index = store.index('scope');
        const entry = await new Promise<SentenceReviewCacheEntry | undefined>((resolve) => {
          const req = index.get(key);
          req.onsuccess = () => resolve(req.result as SentenceReviewCacheEntry | undefined);
          req.onerror = () => resolve(undefined);
        });
        if (entry?.id !== undefined) {
          store.delete(entry.id);
        }
      } else {
        // Deletar tudo
        store.clear();
      }

      await new Promise<void>((resolve) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });

      db.close();
    } catch (e) {
      console.warn('[SentenceReviewCache] Erro ao deletar:', e);
    }
  }, []);

  /**
   * Limpa todo o cache
   */
  const clearAllReviews = useCallback(async (): Promise<void> => {
    try {
      const db = await openReviewDB();
      const tx = db.transaction(REVIEW_STORE_NAME, 'readwrite');
      tx.objectStore(REVIEW_STORE_NAME).clear();

      await new Promise<void>((resolve) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });

      db.close();
    } catch (e) {
      console.warn('[SentenceReviewCache] Erro ao limpar:', e);
    }
  }, []);

  /**
   * Exporta todas as revisões para inclusão no projeto JSON
   */
  const exportAll = useCallback(async (): Promise<Record<string, string>> => {
    try {
      const entries = await getAllReviews();
      const result: Record<string, string> = {};

      for (const entry of entries) {
        // Chave: scope (ex: "decisionOnly" ou "decisionWithDocs")
        result[entry.scope] = entry.result;
      }

      return result;
    } catch (e) {
      console.warn('[SentenceReviewCache] Erro ao exportar:', e);
      return {};
    }
  }, [getAllReviews]);

  /**
   * Importa revisões de um projeto JSON.
   * Aceita chaves no formato `<scope>` (compat) e `<scope>:noEmpty` (com filtro ligado).
   */
  const importAll = useCallback(async (
    data: Record<string, string>
  ): Promise<void> => {
    if (!data || typeof data !== 'object') return;
    try {
      for (const [key, result] of Object.entries(data)) {
        const excludeNoResult = key.endsWith(CACHE_SUFFIX_NO_EMPTY);
        const scope = excludeNoResult ? key.slice(0, -CACHE_SUFFIX_NO_EMPTY.length) : key;
        if (scope === 'decisionOnly' || scope === 'decisionWithDocs') {
          await saveReview(scope as ReviewScope, result, excludeNoResult);
        }
      }
    } catch (e) {
      console.warn('[SentenceReviewCache] Erro ao importar:', e);
    }
  }, [saveReview]);

  return useMemo(() => ({
    saveReview,
    getReview,
    getAllReviews,
    deleteReview,
    clearAllReviews,
    exportAll,
    importAll
  }), [saveReview, getReview, getAllReviews, deleteReview, clearAllReviews, exportAll, importAll]);
};

export default useSentenceReviewCache;

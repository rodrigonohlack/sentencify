/**
 * @file useIndexedDB.ts
 * @description Hook para persistencia de modelos no IndexedDB com retry, cache e multi-tab sync
 * @version v1.39.03
 * @tier 1 (depende de useThrottledBroadcast)
 * @extractedFrom App.tsx linhas 2447-2861, 5062-5173
 * @usedBy useModelLibrary
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { useThrottledBroadcast } from './useThrottledBroadcast';
import { withStorageRetry } from '../utils/retry';
import type { Model } from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════

const DB_NAME = 'SentencifyAI';
const DB_VERSION = 1;
const STORE_NAME = 'models';
const BROADCAST_CHANNEL_NAME = 'sentencify-models-sync';

// ═══════════════════════════════════════════════════════════════════════════
// VALIDAÇÃO E SANITIZAÇÃO DE MODELOS
// ═══════════════════════════════════════════════════════════════════════════

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export const validateModel = (model: Model): ValidationResult => {
  const errors: string[] = [];

  // Required fields
  if (!model || typeof model !== 'object') {
    return { valid: false, errors: ['Modelo inválido ou ausente'] };
  }

  if (!model.title || typeof model.title !== 'string' || model.title.trim().length === 0) {
    errors.push('Título é obrigatório');
  }

  if (!model.content || typeof model.content !== 'string' || model.content.trim().length === 0) {
    errors.push('Conteúdo é obrigatório');
  }

  if (model.id && typeof model.id !== 'string') {
    errors.push('ID deve ser uma string');
  }

  // Optional fields type checking (v1.34.9: aceitar null como valor válido)
  if (model.category != null && typeof model.category !== 'string') {
    errors.push('Categoria deve ser uma string');
  }

  if (model.keywords != null && typeof model.keywords !== 'string') {
    errors.push('Keywords devem ser uma string');
  }

  if (model.createdAt !== undefined) {
    const date = new Date(model.createdAt);
    if (isNaN(date.getTime())) {
      errors.push('createdAt deve ser uma data ISO válida');
    }
  }

  if (model.updatedAt !== undefined) {
    const date = new Date(model.updatedAt);
    if (isNaN(date.getTime())) {
      errors.push('updatedAt deve ser uma data ISO válida');
    }
  }

  // Length limits
  if (model.title && model.title.length > 500) {
    errors.push('Título muito longo (máximo 500 caracteres)');
  }

  if (model.content && model.content.length > 500000) {
    errors.push('Conteúdo muito longo (máximo 500.000 caracteres)');
  }

  if (model.keywords && model.keywords.length > 1000) {
    errors.push('Keywords muito longas (máximo 1000 caracteres)');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

export const sanitizeModel = (model: Model): Model => {
  if (!model || typeof model !== 'object') {
    throw new Error('Modelo inválido para sanitização');
  }

  // Handle keywords that can be string or string[]
  const normalizeKeywords = (kw: string | string[] | undefined): string => {
    if (!kw) return '';
    if (Array.isArray(kw)) return kw.join(', ').trim();
    return kw.trim();
  };

  // Extract and trim required fields
  const sanitized: Partial<Model> = {
    title: (model.title || '').trim(),
    content: (model.content || '').trim(),
    category: (model.category || '').trim(),
    keywords: normalizeKeywords(model.keywords)
  };

  // Optional fields - only include if present and valid
  if (model.id && typeof model.id === 'string') {
    sanitized.id = model.id;
  }

  if (model.createdAt) {
    const date = new Date(model.createdAt);
    if (!isNaN(date.getTime())) {
      sanitized.createdAt = date.toISOString();
    }
  }

  if (model.updatedAt) {
    const date = new Date(model.updatedAt);
    if (!isNaN(date.getTime())) {
      sanitized.updatedAt = date.toISOString();
    }
  }

  // Preserve any extra metadata fields that might be useful
  // (future-proof for new fields without breaking)
  const knownFields = ['id', 'title', 'content', 'category', 'keywords', 'createdAt', 'updatedAt'];
  Object.keys(model).forEach(key => {
    if (!knownFields.includes(key) && (model as unknown as Record<string, unknown>)[key] !== undefined) {
      (sanitized as unknown as Record<string, unknown>)[key] = (model as unknown as Record<string, unknown>)[key];
    }
  });

  return sanitized as Model;
};

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

export interface SyncCallbackParams {
  action: string;
  timestamp: number;
}

export interface UseIndexedDBReturn {
  // Estado
  isLoading: boolean;
  error: string | null;
  isAvailable: boolean;
  lastSyncTime: string | null;

  // Operações
  loadModels: () => Promise<Model[]>;
  saveModels: (models: Model[]) => Promise<void>;
  deleteModel: (modelId: string) => Promise<void>;
  clearAll: () => Promise<void>;
  invalidateCache: () => void;

  // Multi-tab Sync
  setSyncCallback: (callback: ((params: SyncCallbackParams) => void) | null) => void;
  isSupported: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook para persistência de modelos no IndexedDB com:
 * - Retry com exponential backoff
 * - Cache de modelos em memória
 * - Sincronização multi-tab via BroadcastChannel
 */
export function useIndexedDB(): UseIndexedDBReturn {
  // Estados
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dbInstance, setDbInstance] = useState<IDBDatabase | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  // Refs
  const modelsCacheRef = useRef<Model[] | null>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const tabIdRef = useRef<string>(`tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const lastBroadcastTimestampRef = useRef<number | null>(null);
  const syncCallbackRef = useRef<((params: SyncCallbackParams) => void) | null>(null);

  // Throttled broadcast via hook
  const notifyOtherTabs = useThrottledBroadcast(broadcastChannelRef, 1000);

  // Open Database
  const openDB = useCallback((): Promise<IDBDatabase> => {
    return new Promise<IDBDatabase>((resolve, reject) => {
      try {
        if (!window.indexedDB) {
          reject(new Error('IndexedDB não disponível neste navegador'));
          return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
          reject(request.error);
        };

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;

          // Create models store
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            store.createIndex('byCategory', 'category', { unique: false });
            store.createIndex('byCreatedAt', 'createdAt', { unique: false });
          }
        };
      } catch (err) {
        reject(err);
      }
    });
  }, []);

  // Initialize Database + BroadcastChannel
  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        const db = await withStorageRetry(openDB);
        if (isMounted) {
          setDbInstance(db);
          setIsAvailable(true);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setIsAvailable(false);
          setError((err as Error).message);
        }
      }
    };

    // Multi-tab sync: Initialize BroadcastChannel
    const initBroadcastChannel = () => {
      if (typeof BroadcastChannel === 'undefined') {
        return;
      }

      try {
        const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        broadcastChannelRef.current = channel;

        // Listener: Receive messages from other tabs
        channel.onmessage = (event) => {
          const { type, tabId, timestamp, action } = event.data;

          // Ignore messages from own tab (prevent infinite loop)
          if (tabId === tabIdRef.current) {
            return;
          }

          // Ignore duplicate messages (deduplication)
          if (lastBroadcastTimestampRef.current === timestamp) {
            return;
          }

          // Process message based on type
          if (type === 'models-updated') {
            // Invalidate local cache to force reload from IndexedDB
            modelsCacheRef.current = null;

            // Notify parent component to update React state
            if (syncCallbackRef.current) {
              syncCallbackRef.current({ action: action || 'models-updated', timestamp });
            }

            // Update timestamp for deduplication
            lastBroadcastTimestampRef.current = timestamp;
          }
        };

        channel.onerror = () => {
          // Silently handle errors
        };

      } catch (err) {
        // Silently handle errors
      }
    };

    init();
    initBroadcastChannel();

    return () => {
      isMounted = false;

      // Cleanup: Close database
      if (dbInstance) {
        dbInstance.close();
      }

      // Cleanup: Close BroadcastChannel
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close();
      }
    };
  }, [openDB]);

  // Load Models
  const loadModels = useCallback(async () => {
    if (!isAvailable || !dbInstance) {
      throw new Error('IndexedDB não disponível');
    }

    // Return cache if available
    if (modelsCacheRef.current) {
      return modelsCacheRef.current;
    }

    setIsLoading(true);
    setError(null);

    try {
      const models = await withStorageRetry(async () => {
        return new Promise((resolve, reject) => {
          const transaction = dbInstance.transaction([STORE_NAME], 'readonly');
          const store = transaction.objectStore(STORE_NAME);
          const request = store.getAll();

          request.onsuccess = () => {
            resolve(request.result);
          };

          request.onerror = () => reject(request.error);
        });
      }) as Model[];

      // Update cache
      modelsCacheRef.current = models;
      setLastSyncTime(new Date().toISOString());
      setIsLoading(false);
      return models;
    } catch (err) {
      setError((err as Error).message);
      setIsLoading(false);
      throw err;
    }
  }, [isAvailable, dbInstance]);

  // Save Models (Diff-based) + Multi-tab Sync
  const saveModels = useCallback(async (newModels: Model[]) => {
    if (!isAvailable || !dbInstance) {
      throw new Error('IndexedDB não disponível');
    }

    setIsLoading(true);
    setError(null);

    try {
      // Validate before transaction to update cache correctly
      const validatedModels: Model[] = [];
      const rejectedModels: Array<{ id: string; title: string; errors: string[] }> = [];
      for (const model of newModels) {
        const validation = validateModel(model);
        if (!validation.valid) {
          rejectedModels.push({ id: model.id, title: model.title, errors: validation.errors });
          continue;
        }
        const sanitized = sanitizeModel(model);
        validatedModels.push(sanitized);
      }

      // Log rejected models for debug
      if (rejectedModels.length > 0) {
        console.warn(`[IndexedDB] ${rejectedModels.length} modelos rejeitados pela validação:`, rejectedModels);
      }

      await withStorageRetry(async () => {
        return new Promise<void>((resolve, reject) => {
          const transaction = dbInstance.transaction([STORE_NAME], 'readwrite');
          const store = transaction.objectStore(STORE_NAME);

          // Clear store first to ensure total synchronization
          store.clear();

          // Save all validated models
          validatedModels.forEach(model => {
            store.put(model);
          });

          transaction.oncomplete = () => {
            resolve();
          };

          transaction.onerror = () => reject(transaction.error);
        });
      });

      // Update cache with validated models
      modelsCacheRef.current = validatedModels;
      setLastSyncTime(new Date().toISOString());
      setIsLoading(false);

      // Multi-tab sync: Broadcast to other tabs
      if (broadcastChannelRef.current) {
        try {
          const timestamp = Date.now();
          const message = {
            type: 'models-updated',
            action: 'save',
            tabId: tabIdRef.current,
            timestamp,
            modelsCount: validatedModels.length
          };

          notifyOtherTabs(message);
        } catch (broadcastErr) {
          // Don't fail save if broadcast fails (graceful degradation)
        }
      }
    } catch (err) {
      setError((err as Error).message);
      setIsLoading(false);
      throw err;
    }
  }, [isAvailable, dbInstance, withStorageRetry, notifyOtherTabs]);

  // Delete Model + Multi-tab Sync
  const deleteModel = useCallback(async (modelId: string) => {
    if (!isAvailable || !dbInstance) {
      throw new Error('IndexedDB não disponível');
    }

    setIsLoading(true);
    setError(null);

    try {
      await withStorageRetry(async () => {
        return new Promise<void>((resolve, reject) => {
          const transaction = dbInstance.transaction([STORE_NAME], 'readwrite');
          const store = transaction.objectStore(STORE_NAME);
          const request = store.delete(modelId);

          request.onsuccess = () => {
            resolve();
          };

          request.onerror = () => reject(request.error);
        });
      });

      // Invalidate cache
      modelsCacheRef.current = null;
      setIsLoading(false);

      // Multi-tab sync: Broadcast to other tabs
      if (broadcastChannelRef.current) {
        try {
          const timestamp = Date.now();
          const message = {
            type: 'models-updated',
            action: 'delete',
            tabId: tabIdRef.current,
            timestamp,
            modelId
          };

          notifyOtherTabs(message);
        } catch (broadcastErr) {
          // Don't fail if broadcast fails (graceful degradation)
        }
      }
    } catch (err) {
      setError((err as Error).message);
      setIsLoading(false);
      throw err;
    }
  }, [isAvailable, dbInstance, withStorageRetry, notifyOtherTabs]);

  // Clear All + Multi-tab Sync
  const clearAll = useCallback(async () => {
    if (!isAvailable || !dbInstance) {
      throw new Error('IndexedDB não disponível');
    }

    setIsLoading(true);
    setError(null);

    try {
      await withStorageRetry(async () => {
        return new Promise<void>((resolve, reject) => {
          const transaction = dbInstance.transaction([STORE_NAME], 'readwrite');
          const store = transaction.objectStore(STORE_NAME);
          const request = store.clear();

          request.onsuccess = () => {
            resolve();
          };

          request.onerror = () => reject(request.error);
        });
      });

      // Clear cache
      modelsCacheRef.current = null;
      setIsLoading(false);

      // Multi-tab sync: Broadcast to other tabs
      if (broadcastChannelRef.current) {
        try {
          const timestamp = Date.now();
          const message = {
            type: 'models-updated',
            action: 'clear',
            tabId: tabIdRef.current,
            timestamp
          };

          notifyOtherTabs(message);
        } catch (broadcastErr) {
          // Don't fail if broadcast fails (graceful degradation)
        }
      }
    } catch (err) {
      setError((err as Error).message);
      setIsLoading(false);
      throw err;
    }
  }, [isAvailable, dbInstance, withStorageRetry, notifyOtherTabs]);

  // Invalidate Cache (for external updates)
  const invalidateCache = useCallback(() => {
    modelsCacheRef.current = null;
  }, []);

  // Set Sync Callback
  const setSyncCallback = useCallback((callback: ((params: SyncCallbackParams) => void) | null) => {
    syncCallbackRef.current = callback;
  }, []);

  return {
    // Estado
    isLoading,
    error,
    isAvailable,
    lastSyncTime,

    // Operações
    loadModels,
    saveModels,
    deleteModel,
    clearAll,
    invalidateCache,

    // Multi-tab Sync
    setSyncCallback,
    isSupported: typeof BroadcastChannel !== 'undefined'
  };
}

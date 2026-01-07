/**
 * src/hooks/useSyncManager.ts - Sincronização Bidirecional
 * v1.34.0 - Orquestração de sync entre IndexedDB e SQLite
 *
 * @version 1.35.76 - Migrado para TypeScript
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import type { Model } from '../types';
import type { AuthFetchOptions } from './useAuthMagicLink';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════

const LAST_SYNC_KEY = 'sentencify-last-sync';
const PENDING_CHANGES_KEY = 'sentencify-pending-changes';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

/** Status de sincronização */
export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

/** Operação de mudança pendente */
export type SyncOperation = 'create' | 'update' | 'delete';

/** Mudança pendente */
export interface PendingChange {
  operation: SyncOperation;
  model: Partial<Model> & { id: string; updatedAt?: string };
}

/** Conflito de sincronização */
export interface SyncConflict {
  id: string;
  reason: string;
}

/** Resultado de push/pull */
export interface SyncOperationResult {
  success: boolean;
  count?: number;
  results?: {
    created: string[];
    updated: string[];
    deleted: string[];
    conflicts: SyncConflict[];
  };
  error?: string;
}

/** Props do hook useSyncManager */
export interface UseSyncManagerProps {
  authFetch: (url: string, options?: AuthFetchOptions) => Promise<Response>;
  isAuthenticated: boolean;
  models: Model[];
  setModels: React.Dispatch<React.SetStateAction<Model[]>>;
  addModel: (model: Partial<Model>) => Model;
  updateModel: (id: string, updates: Partial<Model>) => Model | null;
  deleteModel: (id: string) => boolean;
}

/** Retorno do hook useSyncManager */
export interface UseSyncManagerReturn {
  syncStatus: SyncStatus;
  lastSyncAt: string | null;
  pendingCount: number;
  syncError: string | null;
  sync: () => Promise<SyncOperationResult>;
  pull: () => Promise<SyncOperationResult>;
  push: () => Promise<SyncOperationResult>;
  trackChange: (operation: SyncOperation, model: Partial<Model> & { id: string }) => void;
  addModelWithSync: (model: Partial<Model>) => Model;
  updateModelWithSync: (id: string, updates: Partial<Model>) => Model | null;
  deleteModelWithSync: (id: string) => boolean;
}

/** Resposta da API de pull */
interface PullApiResponse {
  models: Model[];
  serverTime: string;
  count: number;
  error?: string;
}

/** Resposta da API de push */
interface PushApiResponse {
  results: {
    created: string[];
    updated: string[];
    deleted: string[];
    conflicts: SyncConflict[];
  };
  serverTime: string;
  error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

export function useSyncManager({
  authFetch,
  isAuthenticated,
  models,
  setModels,
  addModel,
  updateModel,
  deleteModel
}: UseSyncManagerProps): UseSyncManagerReturn {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([]);
  const [syncError, setSyncError] = useState<string | null>(null);
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isSyncingRef = useRef<boolean>(false);

  // Carregar estado persistido
  useEffect(() => {
    const storedLastSync = localStorage.getItem(LAST_SYNC_KEY);
    if (storedLastSync) setLastSyncAt(storedLastSync);

    const storedPending = localStorage.getItem(PENDING_CHANGES_KEY);
    if (storedPending) {
      try {
        setPendingChanges(JSON.parse(storedPending) as PendingChange[]);
      } catch {
        localStorage.removeItem(PENDING_CHANGES_KEY);
      }
    }
  }, []);

  // Persistir pendingChanges
  useEffect(() => {
    if (pendingChanges.length > 0) {
      localStorage.setItem(PENDING_CHANGES_KEY, JSON.stringify(pendingChanges));
    } else {
      localStorage.removeItem(PENDING_CHANGES_KEY);
    }
  }, [pendingChanges]);

  // Detectar online/offline
  useEffect(() => {
    const handleOnline = (): void => {
      if (syncStatus === 'offline') {
        setSyncStatus('idle');
      }
    };

    const handleOffline = (): void => {
      setSyncStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check inicial
    if (!navigator.onLine) {
      setSyncStatus('offline');
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncStatus]);

  // Pull: baixar mudanças do servidor
  const pull = useCallback(async (): Promise<SyncOperationResult> => {
    if (!isAuthenticated || !navigator.onLine) return { success: false };
    if (isSyncingRef.current) return { success: false };

    try {
      isSyncingRef.current = true;
      setSyncStatus('syncing');
      setSyncError(null);

      const res = await authFetch('/api/sync/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lastSyncAt })
      });

      if (!res.ok) {
        const error = (await res.json()) as { error?: string };
        throw new Error(error.error || 'Erro ao sincronizar');
      }

      const { models: serverModels, serverTime, count } = (await res.json()) as PullApiResponse;

      if (count > 0) {
        // Merge com modelos locais
        setModels((prev) => {
          const merged = new Map(prev.map((m) => [m.id, m]));

          for (const serverModel of serverModels) {
            const local = merged.get(serverModel.id);

            if (serverModel.deletedAt) {
              // Deletado no servidor - remover localmente
              merged.delete(serverModel.id);
            } else if (!local) {
              // Novo modelo do servidor
              merged.set(serverModel.id, {
                ...serverModel,
                syncStatus: 'synced'
              });
            } else if (new Date(serverModel.updatedAt || '') > new Date(local.updatedAt || '')) {
              // Servidor é mais recente
              merged.set(serverModel.id, {
                ...serverModel,
                syncStatus: 'synced'
              });
            }
            // Se local é mais recente, manter local (será enviado no push)
          }

          return Array.from(merged.values());
        });
      }

      setLastSyncAt(serverTime);
      localStorage.setItem(LAST_SYNC_KEY, serverTime);
      setSyncStatus('idle');

      return { success: true, count };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error('[Sync] Pull error:', err);
      setSyncError(message);
      setSyncStatus(navigator.onLine ? 'error' : 'offline');
      return { success: false, error: message };
    } finally {
      isSyncingRef.current = false;
    }
  }, [authFetch, isAuthenticated, lastSyncAt, setModels]);

  // Push: enviar mudanças locais
  const push = useCallback(async (): Promise<SyncOperationResult> => {
    if (!isAuthenticated || !navigator.onLine || pendingChanges.length === 0) {
      return { success: true, count: 0 };
    }
    if (isSyncingRef.current) return { success: false };

    try {
      isSyncingRef.current = true;
      setSyncStatus('syncing');
      setSyncError(null);

      const res = await authFetch('/api/sync/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changes: pendingChanges })
      });

      if (!res.ok) {
        const error = (await res.json()) as { error?: string };
        throw new Error(error.error || 'Erro ao sincronizar');
      }

      const { results, serverTime } = (await res.json()) as PushApiResponse;

      // Marcar modelos como sincronizados
      const syncedIds = [...results.created, ...results.updated, ...results.deleted];
      if (syncedIds.length > 0) {
        setModels((prev) =>
          prev.map((m) => {
            if (syncedIds.includes(m.id)) {
              return { ...m, syncStatus: 'synced', syncVersion: (m.syncVersion || 0) + 1 };
            }
            return m;
          })
        );
      }

      // Limpar pending changes que foram processados
      setPendingChanges((prev) => {
        const processedIds = new Set(syncedIds);
        return prev.filter((c) => !processedIds.has(c.model.id));
      });

      setLastSyncAt(serverTime);
      localStorage.setItem(LAST_SYNC_KEY, serverTime);

      // Tratar conflitos - fazer pull para resolver
      if (results.conflicts.length > 0) {
        console.warn('[Sync] Conflicts detected:', results.conflicts);
        // Pull para obter versão do servidor
        await pull();
      }

      setSyncStatus('idle');
      return { success: true, results };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error('[Sync] Push error:', err);
      setSyncError(message);
      setSyncStatus(navigator.onLine ? 'error' : 'offline');
      return { success: false, error: message };
    } finally {
      isSyncingRef.current = false;
    }
  }, [authFetch, isAuthenticated, pendingChanges, pull, setModels]);

  // Sync completo (push + pull)
  const sync = useCallback(async (): Promise<SyncOperationResult> => {
    if (!isAuthenticated || !navigator.onLine) return { success: false };

    const pushResult = await push();
    if (!pushResult.success && pushResult.error) {
      return pushResult;
    }

    const pullResult = await pull();
    return pullResult;
  }, [isAuthenticated, push, pull]);

  // Adicionar mudança pendente
  const trackChange = useCallback(
    (operation: SyncOperation, model: Partial<Model> & { id: string }): void => {
      // Marcar modelo como pending
      setModels((prev) => prev.map((m) => (m.id === model.id ? { ...m, syncStatus: 'pending' } : m)));

      setPendingChanges((prev) => {
        // Remover operações anteriores para o mesmo modelo
        const filtered = prev.filter((c) => c.model.id !== model.id);

        // Se já existe uma operação 'create' e agora é 'update', manter como 'create'
        const existingCreate = prev.find((c) => c.model.id === model.id && c.operation === 'create');
        if (existingCreate && operation === 'update') {
          return [...filtered, { operation: 'create', model }];
        }

        // Se já existe qualquer operação e agora é 'delete', usar 'delete'
        // (a menos que seja um create que nunca foi synced - nesse caso só remover)
        if (operation === 'delete') {
          if (existingCreate) {
            // Modelo nunca foi synced - só remover do pending
            return filtered;
          }
          return [...filtered, { operation: 'delete', model }];
        }

        return [...filtered, { operation, model }];
      });
    },
    [setModels]
  );

  // Wrapper para addModel que rastreia mudanças
  const addModelWithSync = useCallback(
    (model: Partial<Model>): Model => {
      const newModel = addModel(model);
      if (isAuthenticated) {
        trackChange('create', newModel);
      }
      return newModel;
    },
    [addModel, isAuthenticated, trackChange]
  );

  // Wrapper para updateModel que rastreia mudanças
  const updateModelWithSync = useCallback(
    (id: string, updates: Partial<Model>): Model | null => {
      const updated = updateModel(id, updates);
      if (isAuthenticated && updated) {
        trackChange('update', updated);
      }
      return updated;
    },
    [updateModel, isAuthenticated, trackChange]
  );

  // Wrapper para deleteModel que rastreia mudanças
  const deleteModelWithSync = useCallback(
    (id: string): boolean => {
      const model = models.find((m) => m.id === id);
      if (model && isAuthenticated) {
        trackChange('delete', { ...model, updatedAt: new Date().toISOString() });
      }
      return deleteModel(id);
    },
    [deleteModel, models, isAuthenticated, trackChange]
  );

  // Auto-sync a cada 30 segundos quando online e autenticado
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      if (navigator.onLine && pendingChanges.length > 0 && !isSyncingRef.current) {
        sync();
      }
    }, 30000);

    syncIntervalRef.current = interval;
    return () => clearInterval(interval);
  }, [isAuthenticated, pendingChanges.length, sync]);

  // Sync imediato quando voltar online
  useEffect(() => {
    const handleOnline = (): void => {
      if (isAuthenticated && pendingChanges.length > 0) {
        sync();
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [isAuthenticated, pendingChanges.length, sync]);

  // Sync inicial ao autenticar
  useEffect(() => {
    if (isAuthenticated && navigator.onLine) {
      pull();
    }
  }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  // Forçar sync antes de fechar a página
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent): void => {
      if (pendingChanges.length > 0) {
        // Tentar sync síncrono via sendBeacon (não garantido)
        const token = localStorage.getItem('sentencify-auth-token');
        if (token && navigator.sendBeacon) {
          navigator.sendBeacon(
            '/api/sync/push',
            new Blob([JSON.stringify({ changes: pendingChanges })], { type: 'application/json' })
          );
        }
        // Aviso para o usuário
        e.preventDefault();
        e.returnValue = 'Existem alterações não sincronizadas. Deseja sair?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [pendingChanges]);

  return {
    syncStatus,
    lastSyncAt,
    pendingCount: pendingChanges.length,
    syncError,
    sync,
    pull,
    push,
    trackChange,
    // Wrappers com sync
    addModelWithSync,
    updateModelWithSync,
    deleteModelWithSync
  };
}

export default useSyncManager;

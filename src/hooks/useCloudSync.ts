/**
 * src/hooks/useCloudSync.ts - Integração Simplificada de Sync
 * v1.35.9 - Memoizar retorno para evitar re-renders desnecessários
 *
 * @version 1.35.76 - Migrado para TypeScript
 */
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { Model, User } from '../types';
import { useModelsStore } from '../stores/useModelsStore';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════

const AUTH_KEY = 'sentencify-auth-token';
const REFRESH_KEY = 'sentencify-refresh-token';
const USER_KEY = 'sentencify-user';
const LAST_SYNC_KEY = 'sentencify-last-sync';
const PENDING_KEY = 'sentencify-pending-changes';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

/** Status de sincronização */
export type CloudSyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

/** Operação de sync */
export type CloudSyncOperation = 'create' | 'update' | 'delete';

/** Mudança pendente */
export interface CloudPendingChange {
  operation: CloudSyncOperation;
  model: Partial<Model> & { id: string; updatedAt?: string };
  retryCount?: number;
}

/** Biblioteca compartilhada ativa */
export interface SharedLibrary {
  id: string;
  ownerId: string;
  ownerEmail: string;
}

/** Conflito de sync */
export interface CloudSyncConflict {
  id: string;
  reason: 'version_mismatch' | 'model_deleted' | 'no_permission';
}

/** Resultado de push */
export interface CloudPushResult {
  success: boolean;
  count?: number;
  reason?: string;
  results?: {
    created: string[];
    updated: string[];
    deleted: string[];
    conflicts: CloudSyncConflict[];
  };
  conflicts?: CloudSyncConflict[];
  error?: string;
}

/** Resultado de magic link request */
export interface MagicLinkResult {
  success: boolean;
  message?: string;
  error?: string;
}

/** Resultado de verify token */
export interface VerifyResult {
  success: boolean;
  error?: string;
}

/** Props do hook useCloudSync */
export interface UseCloudSyncProps {
  onModelsReceived?: (models: Model[], sharedLibraries: SharedLibrary[]) => void;
  /** v1.37.78: Indica se modelos foram carregados do IndexedDB (evita sync antes de carregar) */
  modelsLoaded?: boolean;
}

/** Retorno do hook useCloudSync */
export interface UseCloudSyncReturn {
  // Auth
  user: User | null;
  isAuthenticated: boolean;
  authLoading: boolean;
  authError: string | null;
  devLink: string | null;
  requestMagicLink: (email: string) => Promise<MagicLinkResult>;
  verifyToken: (token: string) => Promise<VerifyResult>;
  logout: () => Promise<void>;

  // Sync
  syncStatus: CloudSyncStatus;
  lastSyncAt: string | null;
  pendingCount: number;
  syncError: string | null;
  sync: () => Promise<CloudPushResult | Model[] | null>;
  pull: () => Promise<Model[] | null>;
  push: () => Promise<CloudPushResult>;
  trackChange: (operation: CloudSyncOperation, model: Partial<Model> & { id: string }) => void;
  trackChangeBatch: (changes: Array<{ operation: CloudSyncOperation; model: Partial<Model> & { id: string } }>) => void;
  pushAllModels: (models: Model[]) => Promise<CloudPushResult>;
}

/** Resposta da API de status */
interface StatusApiResponse {
  activeModels: number;
}

/** Resposta da API de pull */
interface PullApiResponse {
  models: Model[];
  serverTime: string;
  count: number;
  total: number;
  hasMore: boolean;
  sharedLibraries?: SharedLibrary[];
  error?: string;
}

/** Resposta da API de push */
interface PushApiResponse {
  serverTime: string;
  results: {
    created: string[];
    updated: string[];
    deleted: string[];
    conflicts: CloudSyncConflict[];
  };
  error?: string;
}

/** Resposta da API de refresh */
interface RefreshApiResponse {
  accessToken: string;
  refreshToken: string;
}

/** Resposta da API de verify */
interface VerifyApiResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
  error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook simplificado para autenticação Magic Link e sincronização de modelos.
 *
 * Uso:
 * const cloudSync = useCloudSync({ onModelsReceived: (models) => { ... } });
 *
 * // Após modificar modelos localmente:
 * cloudSync.trackChange('create', model);
 * cloudSync.trackChange('update', model);
 * cloudSync.trackChange('delete', model);
 *
 * // Sync manual:
 * await cloudSync.sync();
 */
export function useCloudSync({ onModelsReceived, modelsLoaded = false }: UseCloudSyncProps = {}): UseCloudSyncReturn {
  // ============================================
  // ESTADO DE AUTENTICAÇÃO
  // ============================================
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [devLink, setDevLink] = useState<string | null>(null);

  // ============================================
  // ESTADO DE SINCRONIZAÇÃO
  // ============================================
  const [syncStatus, setSyncStatus] = useState<CloudSyncStatus>('idle');
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [pendingChanges, setPendingChanges] = useState<CloudPendingChange[]>([]);
  const [syncError, setSyncError] = useState<string | null>(null);

  const isSyncingRef = useRef<boolean>(false);
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // v1.37.76: Ref para sempre ter valor mais recente de pendingChanges (evita stale closure)
  const pendingChangesRef = useRef<CloudPendingChange[]>([]);

  // ============================================
  // INICIALIZAÇÃO
  // ============================================
  useEffect(() => {
    // Carregar usuário
    const storedUser = localStorage.getItem(USER_KEY);
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser) as User);
      } catch {
        localStorage.removeItem(USER_KEY);
      }
    }

    // Carregar último sync
    const storedSync = localStorage.getItem(LAST_SYNC_KEY);
    if (storedSync) setLastSyncAt(storedSync);

    // Carregar pendentes
    const storedPending = localStorage.getItem(PENDING_KEY);
    if (storedPending) {
      try {
        setPendingChanges(JSON.parse(storedPending) as CloudPendingChange[]);
      } catch {
        localStorage.removeItem(PENDING_KEY);
      }
    }

    setAuthLoading(false);
  }, []);

  // Persistir pendentes
  // v1.35.2: try-catch para evitar crash se localStorage cheio
  useEffect(() => {
    try {
      if (pendingChanges.length > 0) {
        localStorage.setItem(PENDING_KEY, JSON.stringify(pendingChanges));
      } else {
        localStorage.removeItem(PENDING_KEY);
      }
    } catch (err) {
      // QuotaExceededError - localStorage cheio
      console.error('[CloudSync] Erro ao persistir pendingChanges:', err instanceof Error ? err.message : err);
      // Limpar pendentes antigos para evitar loop de erro
      localStorage.removeItem(PENDING_KEY);
    }
  }, [pendingChanges]);

  // v1.37.76: Manter ref sincronizada com state (para evitar stale closure em callbacks)
  useEffect(() => {
    pendingChangesRef.current = pendingChanges;
  }, [pendingChanges]);

  // Detectar offline
  useEffect(() => {
    const handleOnline = (): void => {
      if (syncStatus === 'offline') setSyncStatus('idle');
    };
    const handleOffline = (): void => setSyncStatus('offline');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (!navigator.onLine) setSyncStatus('offline');

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncStatus]);

  // ============================================
  // AUTH FETCH (com refresh automático)
  // ============================================
  // logout declarado antes para poder ser usado em authFetch
  const logoutInternal = useCallback(async (): Promise<void> => {
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    const accessToken = localStorage.getItem(AUTH_KEY);

    if (accessToken) {
      try {
        await fetch('/api/auth/magic/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`
          },
          body: JSON.stringify({ refreshToken })
        });
      } catch {
        /* ignore */
      }
    }

    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
    setPendingChanges([]);
  }, []);

  const authFetch = useCallback(
    async (url: string, options: RequestInit = {}): Promise<Response> => {
      let token = localStorage.getItem(AUTH_KEY);
      if (!token) throw new Error('Não autenticado');

      const doFetch = (t: string): Promise<Response> =>
        fetch(url, {
          ...options,
          headers: { ...(options.headers as Record<string, string>), Authorization: `Bearer ${t}` }
        });

      let res = await doFetch(token);

      if (res.status === 401) {
        const data = (await res.json()) as { code?: string };
        if (data.code === 'TOKEN_EXPIRED') {
          // Tentar refresh
          const refreshToken = localStorage.getItem(REFRESH_KEY);
          if (refreshToken) {
            const refreshRes = await fetch('/api/auth/magic/refresh', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refreshToken })
            });

            if (refreshRes.ok) {
              const refreshData = (await refreshRes.json()) as RefreshApiResponse;
              localStorage.setItem(AUTH_KEY, refreshData.accessToken);
              localStorage.setItem(REFRESH_KEY, refreshData.refreshToken);
              token = refreshData.accessToken;
              res = await doFetch(token);
            } else {
              // Refresh falhou - logout
              logoutInternal();
              throw new Error('Sessão expirada');
            }
          }
        }
      }

      return res;
    },
    [logoutInternal]
  );

  // ============================================
  // AUTENTICAÇÃO
  // ============================================
  const requestMagicLink = useCallback(async (email: string): Promise<MagicLinkResult> => {
    // NÃO usar setAuthLoading aqui! Isso desmonta o modal e reseta o estado.
    // O loading é gerenciado internamente pelo LoginMagicModal
    setAuthError(null);
    setDevLink(null);

    try {
      const res = await fetch('/api/auth/magic/request-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = (await res.json()) as { error?: string; message?: string; devLink?: string };
      if (!res.ok) throw new Error(data.error || 'Erro ao solicitar link');

      if (data.devLink) setDevLink(data.devLink);
      return { success: true, message: data.message };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      setAuthError(message);
      return { success: false, error: message };
    }
  }, []);

  const verifyToken = useCallback(async (token: string): Promise<VerifyResult> => {
    setAuthLoading(true);
    setAuthError(null);

    try {
      const res = await fetch(`/api/auth/magic/verify/${token}`);
      const data = (await res.json()) as VerifyApiResponse;
      if (!res.ok) throw new Error(data.error || 'Token inválido');

      localStorage.setItem(AUTH_KEY, data.accessToken);
      localStorage.setItem(REFRESH_KEY, data.refreshToken);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      setUser(data.user);

      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      setAuthError(message);
      return { success: false, error: message };
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    await logoutInternal();
  }, [logoutInternal]);

  // ============================================
  // SINCRONIZAÇÃO
  // ============================================
  // v1.37.76: pull() recebe pendingChanges para considerar deletes na comparação
  const pull = useCallback(async (currentPendingChanges?: CloudPendingChange[]): Promise<Model[] | null> => {
    if (!user || !navigator.onLine || isSyncingRef.current) return null;

    try {
      isSyncingRef.current = true;
      setSyncStatus('syncing');
      setSyncError(null);

      // v1.34.6: Sempre verificar total do servidor primeiro
      // Se local tiver menos que servidor, forçar full sync
      const statusRes = await authFetch('/api/sync/status');
      if (!statusRes.ok) throw new Error('Erro ao verificar status');
      const serverStatus = (await statusRes.json()) as StatusApiResponse;

      // v1.37.75: Usar estado real do Zustand (fix bug modelo ressuscita após exclusão)
      // Antes: contagem de localStorage ficava desatualizada após exclusões locais
      const zustandModels = useModelsStore.getState().models;
      const localModelsCount = zustandModels.filter(m => !m.isShared).length;

      // v1.37.76: Considerar pending deletes na comparação
      // Se há deletes pendentes, o servidor ainda não sabe - ajustar expectativa
      // Ex: local=455, servidor=456, pendingDeletes=1 → esperado=455 → match!
      const pendingDeletes = (currentPendingChanges || []).filter(c => c.operation === 'delete').length;
      const expectedServerCount = serverStatus.activeModels - pendingDeletes;

      // v1.34.2: Pull paginado para evitar crash de memória
      // v1.34.6: Forçar full sync se local != servidor
      const hasFlag = localStorage.getItem('sentencify-initial-push-done');
      const localMatchesServer = localModelsCount >= expectedServerCount;
      const needsFullSync = !hasFlag || !localMatchesServer;
      const effectiveLastSyncAt = needsFullSync ? null : lastSyncAt;

      let allModels: Model[] = [];
      let offset = 0;
      const limit = 50;
      let hasMore = true;
      let serverTime: string | null = null;
      let activeSharedLibraries: SharedLibrary[] = []; // v1.35.24: Lista de bibliotecas compartilhadas ativas

      if (needsFullSync) {
        console.log(
          `[CloudSync] Forçando full sync (local=${localModelsCount}, servidor=${serverStatus.activeModels}, pendingDeletes=${pendingDeletes})`
        );
      } else {
        console.log(
          `[CloudSync] Sync incremental (local=${localModelsCount} >= esperado=${expectedServerCount} [servidor=${serverStatus.activeModels} - deletes=${pendingDeletes}])`
        );
      }

      while (hasMore) {
        const res = await authFetch('/api/sync/pull', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lastSyncAt: effectiveLastSyncAt, limit, offset })
        });

        if (!res.ok) {
          const errorData = (await res.json()) as { error?: string };
          throw new Error(errorData.error || 'Erro ao sincronizar');
        }

        const data = (await res.json()) as PullApiResponse;
        allModels = [...allModels, ...data.models];
        hasMore = data.hasMore;
        serverTime = data.serverTime;
        offset += limit;
        // v1.35.24: Capturar sharedLibraries (vem em todas as páginas, usar última)
        if (data.sharedLibraries) {
          activeSharedLibraries = data.sharedLibraries;
        }

        console.log(`[CloudSync] Pull página: ${data.count} modelos (total acumulado: ${allModels.length}/${data.total})`);
      }

      if (serverTime) {
        setLastSyncAt(serverTime);
        localStorage.setItem(LAST_SYNC_KEY, serverTime);
      }
      setSyncStatus('idle');

      // v1.35.1: SEMPRE chamar callback para merge, mesmo se 0 modelos
      // Isso garante que modelos compartilhados deletados pelo proprietário sejam removidos
      // v1.35.24: Passar sharedLibraries para filtrar modelos de owners revogados
      if (onModelsReceived) {
        console.log(
          `[CloudSync] Pull completo: ${allModels.length} modelos, ${activeSharedLibraries.length} bibliotecas compartilhadas ativas`
        );
        onModelsReceived(allModels, activeSharedLibraries);
        // v1.34.3: Marcar como sincronizado após receber modelos
        localStorage.setItem('sentencify-initial-push-done', 'true');
      }

      return allModels;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error('[CloudSync] Pull error:', err);
      setSyncError(message);
      setSyncStatus(navigator.onLine ? 'error' : 'offline');
      return null;
    } finally {
      isSyncingRef.current = false;
    }
  }, [authFetch, lastSyncAt, user, onModelsReceived]);

  const push = useCallback(async (): Promise<CloudPushResult> => {
    // v1.37.76: Usar ref para sempre ter valor mais recente (evita stale closure)
    const currentPending = pendingChangesRef.current;
    if (!user || !navigator.onLine || currentPending.length === 0 || isSyncingRef.current) {
      return { success: true, count: 0 };
    }

    try {
      isSyncingRef.current = true;
      setSyncStatus('syncing');
      setSyncError(null);

      console.log(`[CloudSync] Push iniciando: ${currentPending.length} mudanças pendentes`);
      const res = await authFetch('/api/sync/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changes: currentPending })
      });

      if (!res.ok) {
        const errorData = (await res.json()) as { error?: string };
        throw new Error(errorData.error || 'Erro ao sincronizar');
      }

      const data = (await res.json()) as PushApiResponse;

      // v1.35.11: Tratar conflitos de versão com retry limit
      const successIds = new Set([...data.results.created, ...data.results.updated, ...data.results.deleted]);

      // v1.35.22: Separar tipos de conflito
      // - version_mismatch: retry após pull (modelo atualizado no servidor)
      // - model_deleted/no_permission: remover imediatamente (sem retry)
      const versionConflictIds = new Set(
        (data.results.conflicts || []).filter((c) => c.reason === 'version_mismatch').map((c) => c.id)
      );
      const fatalConflictIds = new Set(
        (data.results.conflicts || [])
          .filter((c) => c.reason === 'model_deleted' || c.reason === 'no_permission')
          .map((c) => c.id)
      );

      const MAX_RETRIES = 3;
      setPendingChanges((prev) => {
        return prev
          .map((change) => {
            const id = change.model.id;

            // Sucesso: remover do pending
            if (successIds.has(id)) {
              return null;
            }

            // v1.35.22: Conflitos fatais (modelo deletado ou sem permissão): remover imediatamente
            if (fatalConflictIds.has(id)) {
              const conflict = data.results.conflicts.find((c) => c.id === id);
              console.warn(`[CloudSync] Removendo ${id} do pending: ${conflict?.reason}`);
              return null;
            }

            // Conflito de versão: incrementar retry count
            if (versionConflictIds.has(id)) {
              const retryCount = (change.retryCount || 0) + 1;
              if (retryCount >= MAX_RETRIES) {
                console.warn(`[CloudSync] Abandonando modelo ${id} após ${MAX_RETRIES} tentativas`);
                return null; // Desistir após MAX_RETRIES
              }
              console.log(`[CloudSync] Conflito de versão em ${id}, tentativa ${retryCount}/${MAX_RETRIES}`);
              return { ...change, retryCount };
            }

            // Outros (erros ou não processados): manter para retry
            return change;
          })
          .filter((c): c is CloudPendingChange => c !== null);
      });

      // Log de conflitos para diagnóstico
      if (data.results.conflicts?.length > 0) {
        console.warn(`[CloudSync] ${data.results.conflicts.length} conflitos:`, data.results.conflicts);

        // v1.35.22: Se houve conflito de versão, fazer pull para obter versões atualizadas
        // Isso evita loop infinito de retry com syncVersion obsoleta
        const hasVersionConflict = data.results.conflicts.some((c) => c.reason === 'version_mismatch');
        if (hasVersionConflict) {
          console.log('[CloudSync] Conflitos de versão detectados - fazendo pull para atualizar');
          // Pull assíncrono para não bloquear retorno do push
          // Os modelos serão atualizados e o próximo sync terá versões corretas
          setTimeout(() => pull(), 100);
        }
      }

      setLastSyncAt(data.serverTime);
      localStorage.setItem(LAST_SYNC_KEY, data.serverTime);
      setSyncStatus('idle');

      return { success: true, results: data.results, conflicts: data.results.conflicts || [] };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error('[CloudSync] Push error:', err);
      setSyncError(message);
      setSyncStatus(navigator.onLine ? 'error' : 'offline');
      return { success: false, error: message };
    } finally {
      isSyncingRef.current = false;
    }
  }, [authFetch, user, pull]); // v1.37.76: Removido pendingChanges (usando ref)

  // v1.35.11: PULL PRIMEIRO para obter versões atualizadas antes de push
  // Antes: push-then-pull causava conflitos desnecessários ao enviar com syncVersion obsoleta
  // v1.37.76: Usar ref para sempre ter valor mais recente de pendingChanges
  const sync = useCallback(async (): Promise<CloudPushResult | Model[] | null> => {
    // Usar ref para evitar stale closure
    const currentPending = pendingChangesRef.current;
    const pullResult = await pull(currentPending);

    if (!pullResult && navigator.onLine) {
      // Pull falhou mas online - tentar push para não perder dados locais
      console.warn('[CloudSync] Pull falhou - tentando push para preservar dados');
      return await push();
    }

    if (!pullResult) {
      return null; // Offline ou erro fatal
    }

    // Push com versões atualizadas pelo pull
    return await push();
  }, [pull, push]); // v1.37.76: Removido pendingChanges (usando ref)

  // Rastrear mudança para sync
  const trackChange = useCallback(
    (operation: CloudSyncOperation, model: Partial<Model> & { id: string }): void => {
      // v1.37.78: Log de diagnóstico
      console.log(`[CloudSync] trackChange: ${operation} ${model.id}, user=${user?.email || 'null'}`);

      if (!user) {
        console.warn('[CloudSync] trackChange IGNORADO - usuário não autenticado');
        return;
      }

      setPendingChanges((prev) => {
        const filtered = prev.filter((c) => c.model.id !== model.id);

        // Se era create e agora é update, manter create
        const existingCreate = prev.find((c) => c.model.id === model.id && c.operation === 'create');
        if (existingCreate && operation === 'update') {
          return [...filtered, { operation: 'create', model }];
        }

        // Se é delete de algo que nunca foi synced, só remover do pending
        if (operation === 'delete' && existingCreate) {
          return filtered;
        }

        // v1.35.2: Para delete, salvar apenas id e updatedAt (evita QuotaExceededError no localStorage)
        // O servidor só precisa do model.id para marcar como deletado
        const modelToStore =
          operation === 'delete' ? { id: model.id, updatedAt: model.updatedAt } : model;

        return [...filtered, { operation, model: modelToStore }];
      });
    },
    [user]
  );

  // v1.35.23: Batch tracking para importação em lote (evita múltiplos localStorage.setItem)
  const trackChangeBatch = useCallback(
    (changes: Array<{ operation: CloudSyncOperation; model: Partial<Model> & { id: string } }>): void => {
      if (!user || !changes?.length) return;

      setPendingChanges((prev) => {
        let result = [...prev];

        for (const { operation, model } of changes) {
          // Remover existente com mesmo id
          result = result.filter((c) => c.model.id !== model.id);

          // Se era create e agora é update, manter create
          const existingCreate = prev.find((c) => c.model.id === model.id && c.operation === 'create');
          if (existingCreate && operation === 'update') {
            result.push({ operation: 'create', model });
            continue;
          }

          // Se é delete de algo que nunca foi synced, só remover (já filtrado acima)
          if (operation === 'delete' && existingCreate) {
            continue;
          }

          // Para delete, salvar apenas id e updatedAt
          const modelToStore =
            operation === 'delete' ? { id: model.id, updatedAt: model.updatedAt } : model;

          result.push({ operation, model: modelToStore });
        }

        console.log(`[CloudSync] Batch tracked: ${changes.length} changes`);
        return result;
      });
    },
    [user]
  );

  // Auto-sync a cada 30s
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      if (navigator.onLine && pendingChanges.length > 0 && !isSyncingRef.current) {
        sync();
      }
    }, 30000);

    syncIntervalRef.current = interval;
    return () => clearInterval(interval);
  }, [user, pendingChanges.length, sync]);

  // Sync inicial ao autenticar (v1.37.78: aguardar modelos carregados)
  useEffect(() => {
    if (user && navigator.onLine && modelsLoaded) {
      console.log('[CloudSync] Sync inicial - user autenticado E modelos carregados, chamando pull()');
      pull();
    }
  }, [user, modelsLoaded]); // eslint-disable-line

  // Push inicial de todos os modelos (para primeira sincronização)
  const pushAllModels = useCallback(
    async (models: Model[]): Promise<CloudPushResult> => {
      if (!user || !navigator.onLine || !models || models.length === 0) {
        return { success: false, reason: 'no-models' };
      }

      if (isSyncingRef.current) {
        return { success: false, reason: 'already-syncing' };
      }

      try {
        isSyncingRef.current = true;
        setSyncStatus('syncing');
        setSyncError(null);

        // Converter todos os modelos em operações 'create'
        const changes = models.map((m) => ({ operation: 'create' as const, model: m }));

        const res = await authFetch('/api/sync/push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ changes })
        });

        if (!res.ok) {
          const data = (await res.json()) as { error?: string };
          throw new Error(data.error || 'Erro ao sincronizar');
        }

        const data = (await res.json()) as { serverTime: string };
        setLastSyncAt(data.serverTime);
        localStorage.setItem(LAST_SYNC_KEY, data.serverTime);
        setSyncStatus('idle');

        console.log(`[CloudSync] Push inicial: ${models.length} modelos enviados`);
        return { success: true, count: models.length };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro desconhecido';
        console.error('[CloudSync] Push inicial error:', err);
        setSyncError(message);
        setSyncStatus('error');
        return { success: false, error: message };
      } finally {
        isSyncingRef.current = false;
      }
    },
    [authFetch, user]
  );

  // v1.35.9: Memoizar retorno para evitar re-renders desnecessários
  // Antes: objeto literal era recriado a cada render, quebrando React.memo de componentes filhos
  return useMemo(
    () => ({
      // Auth
      user,
      isAuthenticated: !!user,
      authLoading,
      authError,
      devLink,
      requestMagicLink,
      verifyToken,
      logout,

      // Sync
      syncStatus,
      lastSyncAt,
      pendingCount: pendingChanges.length,
      syncError,
      sync,
      pull,
      push,
      trackChange,
      trackChangeBatch, // v1.35.23: Batch tracking para importações
      pushAllModels
    }),
    [
      user,
      authLoading,
      authError,
      devLink,
      requestMagicLink,
      verifyToken,
      logout,
      syncStatus,
      lastSyncAt,
      pendingChanges.length,
      syncError,
      sync,
      pull,
      push,
      trackChange,
      trackChangeBatch,
      pushAllModels
    ]
  );
}

export default useCloudSync;

// src/hooks/useCloudSync.js - Integração Simplificada de Sync
// v1.35.9 - Memoizar retorno para evitar re-renders desnecessários

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

const AUTH_KEY = 'sentencify-auth-token';
const REFRESH_KEY = 'sentencify-refresh-token';
const USER_KEY = 'sentencify-user';
const LAST_SYNC_KEY = 'sentencify-last-sync';
const PENDING_KEY = 'sentencify-pending-changes';

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
export function useCloudSync({ onModelsReceived } = {}) {
  // ============================================
  // ESTADO DE AUTENTICAÇÃO
  // ============================================
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [devLink, setDevLink] = useState(null);

  // ============================================
  // ESTADO DE SINCRONIZAÇÃO
  // ============================================
  const [syncStatus, setSyncStatus] = useState('idle'); // idle | syncing | error | offline
  const [lastSyncAt, setLastSyncAt] = useState(null);
  const [pendingChanges, setPendingChanges] = useState([]);
  const [syncError, setSyncError] = useState(null);

  const isSyncingRef = useRef(false);
  const syncIntervalRef = useRef(null);

  // ============================================
  // INICIALIZAÇÃO
  // ============================================
  useEffect(() => {
    // Carregar usuário
    const storedUser = localStorage.getItem(USER_KEY);
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
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
        setPendingChanges(JSON.parse(storedPending));
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
      console.error('[CloudSync] Erro ao persistir pendingChanges:', err.message);
      // Limpar pendentes antigos para evitar loop de erro
      localStorage.removeItem(PENDING_KEY);
    }
  }, [pendingChanges]);

  // Detectar offline
  useEffect(() => {
    const handleOnline = () => {
      if (syncStatus === 'offline') setSyncStatus('idle');
    };
    const handleOffline = () => setSyncStatus('offline');

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
  const authFetch = useCallback(async (url, options = {}) => {
    let token = localStorage.getItem(AUTH_KEY);
    if (!token) throw new Error('Não autenticado');

    const doFetch = (t) => fetch(url, {
      ...options,
      headers: { ...options.headers, 'Authorization': `Bearer ${t}` },
    });

    let res = await doFetch(token);

    if (res.status === 401) {
      const data = await res.json();
      if (data.code === 'TOKEN_EXPIRED') {
        // Tentar refresh
        const refreshToken = localStorage.getItem(REFRESH_KEY);
        if (refreshToken) {
          const refreshRes = await fetch('/api/auth/magic/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });

          if (refreshRes.ok) {
            const refreshData = await refreshRes.json();
            localStorage.setItem(AUTH_KEY, refreshData.accessToken);
            localStorage.setItem(REFRESH_KEY, refreshData.refreshToken);
            token = refreshData.accessToken;
            res = await doFetch(token);
          } else {
            // Refresh falhou - logout
            logout();
            throw new Error('Sessão expirada');
          }
        }
      }
    }

    return res;
  }, []);

  // ============================================
  // AUTENTICAÇÃO
  // ============================================
  const requestMagicLink = useCallback(async (email) => {
    // NÃO usar setAuthLoading aqui! Isso desmonta o modal e reseta o estado.
    // O loading é gerenciado internamente pelo LoginMagicModal
    setAuthError(null);
    setDevLink(null);

    try {
      const res = await fetch('/api/auth/magic/request-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (data.devLink) setDevLink(data.devLink);
      return { success: true, message: data.message };
    } catch (err) {
      setAuthError(err.message);
      return { success: false, error: err.message };
    }
  }, []);

  const verifyToken = useCallback(async (token) => {
    setAuthLoading(true);
    setAuthError(null);

    try {
      const res = await fetch(`/api/auth/magic/verify/${token}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      localStorage.setItem(AUTH_KEY, data.accessToken);
      localStorage.setItem(REFRESH_KEY, data.refreshToken);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      setUser(data.user);

      return { success: true };
    } catch (err) {
      setAuthError(err.message);
      return { success: false, error: err.message };
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    const accessToken = localStorage.getItem(AUTH_KEY);

    if (accessToken) {
      try {
        await fetch('/api/auth/magic/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ refreshToken }),
        });
      } catch { /* ignore */ }
    }

    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
    setPendingChanges([]);
  }, []);

  // ============================================
  // SINCRONIZAÇÃO
  // ============================================
  const pull = useCallback(async () => {
    if (!user || !navigator.onLine || isSyncingRef.current) return null;

    try {
      isSyncingRef.current = true;
      setSyncStatus('syncing');
      setSyncError(null);

      // v1.34.6: Sempre verificar total do servidor primeiro
      // Se local tiver menos que servidor, forçar full sync
      const statusRes = await authFetch('/api/sync/status');
      if (!statusRes.ok) throw new Error('Erro ao verificar status');
      const serverStatus = await statusRes.json();

      // Contar modelos locais no IndexedDB
      const localModelsCount = parseInt(localStorage.getItem('sentencify-models-count') || '0', 10);

      // v1.34.2: Pull paginado para evitar crash de memória
      // v1.34.6: Forçar full sync se local != servidor
      const hasFlag = localStorage.getItem('sentencify-initial-push-done');
      const localMatchesServer = localModelsCount >= serverStatus.activeModels;
      const needsFullSync = !hasFlag || !localMatchesServer;
      const effectiveLastSyncAt = needsFullSync ? null : lastSyncAt;

      let allModels = [];
      let offset = 0;
      const limit = 50;
      let hasMore = true;
      let serverTime = null;

      if (needsFullSync) {
        console.log(`[CloudSync] Forçando full sync (local=${localModelsCount}, servidor=${serverStatus.activeModels})`);
      } else {
        console.log(`[CloudSync] Sync incremental (local=${localModelsCount} >= servidor=${serverStatus.activeModels})`);
      }

      while (hasMore) {
        const res = await authFetch('/api/sync/pull', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lastSyncAt: effectiveLastSyncAt, limit, offset }),
        });

        if (!res.ok) throw new Error((await res.json()).error);

        const data = await res.json();
        allModels = [...allModels, ...data.models];
        hasMore = data.hasMore;
        serverTime = data.serverTime;
        offset += limit;

        console.log(`[CloudSync] Pull página: ${data.count} modelos (total acumulado: ${allModels.length}/${data.total})`);
      }

      setLastSyncAt(serverTime);
      localStorage.setItem(LAST_SYNC_KEY, serverTime);
      setSyncStatus('idle');

      // v1.35.1: SEMPRE chamar callback para merge, mesmo se 0 modelos
      // Isso garante que modelos compartilhados deletados pelo proprietário sejam removidos
      if (onModelsReceived) {
        console.log(`[CloudSync] Pull completo: ${allModels.length} modelos recebidos do servidor`);
        onModelsReceived(allModels);
        // v1.34.3: Marcar como sincronizado após receber modelos
        localStorage.setItem('sentencify-initial-push-done', 'true');
      }

      return allModels;
    } catch (err) {
      console.error('[CloudSync] Pull error:', err);
      setSyncError(err.message);
      setSyncStatus(navigator.onLine ? 'error' : 'offline');
      return null;
    } finally {
      isSyncingRef.current = false;
    }
  }, [authFetch, lastSyncAt, user, onModelsReceived]);

  const push = useCallback(async () => {
    if (!user || !navigator.onLine || pendingChanges.length === 0 || isSyncingRef.current) {
      return { success: true, count: 0 };
    }

    try {
      isSyncingRef.current = true;
      setSyncStatus('syncing');
      setSyncError(null);

      const res = await authFetch('/api/sync/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changes: pendingChanges }),
      });

      if (!res.ok) throw new Error((await res.json()).error);

      const data = await res.json();

      // v1.35.11: Tratar conflitos de versão com retry limit
      const successIds = new Set([
        ...data.results.created,
        ...data.results.updated,
        ...data.results.deleted
      ]);

      // Conflitos de versão permanecem para retry após próximo pull
      const conflictIds = new Set(
        (data.results.conflicts || [])
          .filter(c => c.reason === 'version_mismatch')
          .map(c => c.id)
      );

      const MAX_RETRIES = 3;
      setPendingChanges(prev => {
        return prev.map(change => {
          const id = change.model.id;

          // Sucesso: remover do pending
          if (successIds.has(id)) {
            return null;
          }

          // Conflito: incrementar retry count
          if (conflictIds.has(id)) {
            const retryCount = (change.retryCount || 0) + 1;
            if (retryCount >= MAX_RETRIES) {
              console.warn(`[CloudSync] Abandonando modelo ${id} após ${MAX_RETRIES} tentativas`);
              return null; // Desistir após MAX_RETRIES
            }
            console.log(`[CloudSync] Conflito em ${id}, tentativa ${retryCount}/${MAX_RETRIES}`);
            return { ...change, retryCount };
          }

          // Outros (erros ou não processados): manter para retry
          return change;
        }).filter(Boolean);
      });

      // Log de conflitos para diagnóstico
      if (data.results.conflicts?.length > 0) {
        console.warn(`[CloudSync] ${data.results.conflicts.length} conflitos:`, data.results.conflicts);
      }

      setLastSyncAt(data.serverTime);
      localStorage.setItem(LAST_SYNC_KEY, data.serverTime);
      setSyncStatus('idle');

      return { success: true, results: data.results, conflicts: data.results.conflicts || [] };
    } catch (err) {
      console.error('[CloudSync] Push error:', err);
      setSyncError(err.message);
      setSyncStatus(navigator.onLine ? 'error' : 'offline');
      return { success: false, error: err.message };
    } finally {
      isSyncingRef.current = false;
    }
  }, [authFetch, pendingChanges, user]);

  // v1.35.11: PULL PRIMEIRO para obter versões atualizadas antes de push
  // Antes: push-then-pull causava conflitos desnecessários ao enviar com syncVersion obsoleta
  const sync = useCallback(async () => {
    const pullResult = await pull();

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
  }, [pull, push]);

  // Rastrear mudança para sync
  const trackChange = useCallback((operation, model) => {
    if (!user) return; // Não trackear se não está autenticado

    setPendingChanges(prev => {
      const filtered = prev.filter(c => c.model.id !== model.id);

      // Se era create e agora é update, manter create
      const existingCreate = prev.find(c => c.model.id === model.id && c.operation === 'create');
      if (existingCreate && operation === 'update') {
        return [...filtered, { operation: 'create', model }];
      }

      // Se é delete de algo que nunca foi synced, só remover do pending
      if (operation === 'delete' && existingCreate) {
        return filtered;
      }

      // v1.35.2: Para delete, salvar apenas id e updatedAt (evita QuotaExceededError no localStorage)
      // O servidor só precisa do model.id para marcar como deletado
      const modelToStore = operation === 'delete'
        ? { id: model.id, updatedAt: model.updatedAt }
        : model;

      return [...filtered, { operation, model: modelToStore }];
    });
  }, [user]);

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

  // Sync inicial ao autenticar
  useEffect(() => {
    if (user && navigator.onLine) {
      console.log('[CloudSync] Sync inicial - user autenticado, chamando pull()');
      pull();
    }
  }, [user]); // eslint-disable-line

  // Push inicial de todos os modelos (para primeira sincronização)
  const pushAllModels = useCallback(async (models) => {
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
      const changes = models.map(m => ({ operation: 'create', model: m }));

      const res = await authFetch('/api/sync/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changes }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao sincronizar');
      }

      const data = await res.json();
      setLastSyncAt(data.serverTime);
      localStorage.setItem(LAST_SYNC_KEY, data.serverTime);
      setSyncStatus('idle');

      console.log(`[CloudSync] Push inicial: ${models.length} modelos enviados`);
      return { success: true, count: models.length };
    } catch (err) {
      console.error('[CloudSync] Push inicial error:', err);
      setSyncError(err.message);
      setSyncStatus('error');
      return { success: false, error: err.message };
    } finally {
      isSyncingRef.current = false;
    }
  }, [authFetch, user]);

  // v1.35.9: Memoizar retorno para evitar re-renders desnecessários
  // Antes: objeto literal era recriado a cada render, quebrando React.memo de componentes filhos
  return useMemo(() => ({
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
    pushAllModels,
  }), [
    user, authLoading, authError, devLink,
    requestMagicLink, verifyToken, logout,
    syncStatus, lastSyncAt, pendingChanges.length, syncError,
    sync, pull, push, trackChange, pushAllModels
  ]);
}

export default useCloudSync;

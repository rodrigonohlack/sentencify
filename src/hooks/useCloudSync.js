// src/hooks/useCloudSync.js - Integração Simplificada de Sync
// v1.34.3 - Full sync automático para navegador novo

import { useState, useEffect, useCallback, useRef } from 'react';

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
  useEffect(() => {
    if (pendingChanges.length > 0) {
      localStorage.setItem(PENDING_KEY, JSON.stringify(pendingChanges));
    } else {
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

      // v1.34.2: Pull paginado para evitar crash de memória
      // v1.34.3: Detectar se precisa forçar full sync (navegador novo sem modelos)
      const needsFullSync = !localStorage.getItem('sentencify-initial-push-done');
      const effectiveLastSyncAt = needsFullSync ? null : lastSyncAt;

      let allModels = [];
      let offset = 0;
      const limit = 50;
      let hasMore = true;
      let serverTime = null;

      if (needsFullSync) {
        console.log('[CloudSync] Forçando full sync (navegador novo)');
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

      // v1.34.1: Chamar callback para merge dos modelos recebidos
      if (allModels.length > 0 && onModelsReceived) {
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

      // Limpar pendentes processados
      const processedIds = new Set([...data.results.created, ...data.results.updated, ...data.results.deleted]);
      setPendingChanges(prev => prev.filter(c => !processedIds.has(c.model.id)));

      setLastSyncAt(data.serverTime);
      localStorage.setItem(LAST_SYNC_KEY, data.serverTime);
      setSyncStatus('idle');

      return { success: true, results: data.results };
    } catch (err) {
      console.error('[CloudSync] Push error:', err);
      setSyncError(err.message);
      setSyncStatus(navigator.onLine ? 'error' : 'offline');
      return { success: false, error: err.message };
    } finally {
      isSyncingRef.current = false;
    }
  }, [authFetch, pendingChanges, user]);

  const sync = useCallback(async () => {
    await push();
    return await pull();
  }, [push, pull]);

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

      return [...filtered, { operation, model }];
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

  return {
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
  };
}

export default useCloudSync;

// src/hooks/useAuthMagicLink.js - Hook de Autenticação Magic Link
// v1.34.0 - Autenticação passwordless via email

import { useState, useEffect, useCallback } from 'react';

const AUTH_KEY = 'sentencify-auth-token';
const REFRESH_KEY = 'sentencify-refresh-token';
const USER_KEY = 'sentencify-user';

export function useAuthMagicLink() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Inicializar do localStorage
  useEffect(() => {
    const stored = localStorage.getItem(USER_KEY);
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        // Dados corrompidos - limpar
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem(AUTH_KEY);
        localStorage.removeItem(REFRESH_KEY);
      }
    }
    setLoading(false);
  }, []);

  // Solicitar magic link
  const requestMagicLink = useCallback(async (email) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/magic/request-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      return { success: true, message: data.message, devLink: data.devLink };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Verificar token do magic link
  const verifyToken = useCallback(async (token) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/auth/magic/verify/${token}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      localStorage.setItem(AUTH_KEY, data.accessToken);
      localStorage.setItem(REFRESH_KEY, data.refreshToken);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));

      setUser(data.user);
      return { success: true, user: data.user };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Renovar access token
  const refreshAccessToken = useCallback(async () => {
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    if (!refreshToken) return false;

    try {
      const res = await fetch('/api/auth/magic/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) throw new Error('Refresh failed');

      const data = await res.json();
      localStorage.setItem(AUTH_KEY, data.accessToken);
      localStorage.setItem(REFRESH_KEY, data.refreshToken);

      return true;
    } catch {
      // Refresh falhou - fazer logout
      localStorage.removeItem(AUTH_KEY);
      localStorage.removeItem(REFRESH_KEY);
      localStorage.removeItem(USER_KEY);
      setUser(null);
      return false;
    }
  }, []);

  // Logout
  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    const accessToken = localStorage.getItem(AUTH_KEY);

    // Tentar revogar no servidor (fire and forget)
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
      } catch {
        // Ignorar erros - logout local é suficiente
      }
    }

    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  // Obter token atual
  const getAccessToken = useCallback(() => {
    return localStorage.getItem(AUTH_KEY);
  }, []);

  // Fetch autenticado com refresh automático
  const authFetch = useCallback(async (url, options = {}) => {
    let token = localStorage.getItem(AUTH_KEY);

    if (!token) {
      throw new Error('Não autenticado');
    }

    const doFetch = async (t) => {
      return fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${t}`,
        },
      });
    };

    let res = await doFetch(token);

    // Se 401, tentar refresh
    if (res.status === 401) {
      const data = await res.json();

      // Se token expirado, tentar renovar
      if (data.code === 'TOKEN_EXPIRED') {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          token = localStorage.getItem(AUTH_KEY);
          res = await doFetch(token);
        } else {
          throw new Error('Sessão expirada. Faça login novamente.');
        }
      } else {
        throw new Error(data.error || 'Não autorizado');
      }
    }

    return res;
  }, [refreshAccessToken]);

  // Obter informações do usuário do servidor
  const fetchUserInfo = useCallback(async () => {
    try {
      const res = await authFetch('/api/auth/magic/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        return data.user;
      }
    } catch {
      // Ignorar erros - usar dados locais
    }
    return user;
  }, [authFetch, user]);

  return {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    requestMagicLink,
    verifyToken,
    refreshAccessToken,
    logout,
    authFetch,
    getAccessToken,
    fetchUserInfo,
  };
}

export default useAuthMagicLink;

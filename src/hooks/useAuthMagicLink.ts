/**
 * src/hooks/useAuthMagicLink.ts - Hook de Autenticação Magic Link
 * v1.34.0 - Autenticação passwordless via email
 *
 * @version 1.35.76 - Migrado para TypeScript
 */
import { useState, useEffect, useCallback } from 'react';
import type { User } from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════

const AUTH_KEY = 'sentencify-auth-token';
const REFRESH_KEY = 'sentencify-refresh-token';
const USER_KEY = 'sentencify-user';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

/** Resposta de sucesso ao solicitar magic link */
export interface MagicLinkRequestSuccess {
  success: true;
  message: string;
  devLink?: string;
}

/** Resposta de erro ao solicitar magic link */
export interface MagicLinkRequestError {
  success: false;
  error: string;
}

/** Resposta ao solicitar magic link */
export type MagicLinkRequestResult = MagicLinkRequestSuccess | MagicLinkRequestError;

/** Resposta de sucesso ao verificar token */
export interface VerifyTokenSuccess {
  success: true;
  user: User;
}

/** Resposta de erro ao verificar token */
export interface VerifyTokenError {
  success: false;
  error: string;
}

/** Resposta ao verificar token */
export type VerifyTokenResult = VerifyTokenSuccess | VerifyTokenError;

/** Resposta da API de verificação */
interface VerifyApiResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
  error?: string;
}

/** Resposta da API de refresh */
interface RefreshApiResponse {
  accessToken: string;
  refreshToken: string;
}

/** Resposta de erro da API */
interface ApiErrorResponse {
  error?: string;
  code?: string;
}

/** Opções do fetch */
export interface AuthFetchOptions extends RequestInit {
  headers?: Record<string, string>;
}

/** Retorno do hook useAuthMagicLink */
export interface UseAuthMagicLinkReturn {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  requestMagicLink: (email: string) => Promise<MagicLinkRequestResult>;
  verifyToken: (token: string) => Promise<VerifyTokenResult>;
  refreshAccessToken: () => Promise<boolean>;
  logout: () => Promise<void>;
  authFetch: (url: string, options?: AuthFetchOptions) => Promise<Response>;
  getAccessToken: () => string | null;
  fetchUserInfo: () => Promise<User | null>;
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

export function useAuthMagicLink(): UseAuthMagicLinkReturn {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Inicializar do localStorage
  useEffect(() => {
    const stored = localStorage.getItem(USER_KEY);
    if (stored) {
      try {
        setUser(JSON.parse(stored) as User);
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
  const requestMagicLink = useCallback(async (email: string): Promise<MagicLinkRequestResult> => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/magic/request-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = (await res.json()) as { error?: string; message?: string; devLink?: string };

      if (!res.ok) throw new Error(data.error || 'Erro ao solicitar link');

      return { success: true, message: data.message || '', devLink: data.devLink };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Verificar token do magic link
  const verifyToken = useCallback(async (token: string): Promise<VerifyTokenResult> => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/auth/magic/verify/${token}`);
      const data = (await res.json()) as VerifyApiResponse;

      if (!res.ok) throw new Error(data.error || 'Token inválido');

      localStorage.setItem(AUTH_KEY, data.accessToken);
      localStorage.setItem(REFRESH_KEY, data.refreshToken);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));

      setUser(data.user);
      return { success: true, user: data.user };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Renovar access token
  const refreshAccessToken = useCallback(async (): Promise<boolean> => {
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    if (!refreshToken) return false;

    try {
      const res = await fetch('/api/auth/magic/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });

      if (!res.ok) throw new Error('Refresh failed');

      const data = (await res.json()) as RefreshApiResponse;
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
  const logout = useCallback(async (): Promise<void> => {
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    const accessToken = localStorage.getItem(AUTH_KEY);

    // Tentar revogar no servidor (fire and forget)
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
        // Ignorar erros - logout local é suficiente
      }
    }

    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  // Obter token atual
  const getAccessToken = useCallback((): string | null => {
    return localStorage.getItem(AUTH_KEY);
  }, []);

  // Fetch autenticado com refresh automático
  const authFetch = useCallback(
    async (url: string, options: AuthFetchOptions = {}): Promise<Response> => {
      let token = localStorage.getItem(AUTH_KEY);

      if (!token) {
        throw new Error('Não autenticado');
      }

      const doFetch = async (t: string): Promise<Response> => {
        return fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            Authorization: `Bearer ${t}`
          }
        });
      };

      let res = await doFetch(token);

      // Se 401, tentar refresh
      if (res.status === 401) {
        const data = (await res.json()) as ApiErrorResponse;

        // Se token expirado, tentar renovar
        if (data.code === 'TOKEN_EXPIRED') {
          const refreshed = await refreshAccessToken();
          if (refreshed) {
            token = localStorage.getItem(AUTH_KEY);
            if (token) {
              res = await doFetch(token);
            }
          } else {
            throw new Error('Sessão expirada. Faça login novamente.');
          }
        } else {
          throw new Error(data.error || 'Não autorizado');
        }
      }

      return res;
    },
    [refreshAccessToken]
  );

  // Obter informações do usuário do servidor
  const fetchUserInfo = useCallback(async (): Promise<User | null> => {
    try {
      const res = await authFetch('/api/auth/magic/me');
      if (res.ok) {
        const data = (await res.json()) as { user: User };
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
    fetchUserInfo
  };
}

export default useAuthMagicLink;

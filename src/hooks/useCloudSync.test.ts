/**
 * @file useCloudSync.test.ts
 * @description Testes automatizados para o hook useCloudSync
 *
 * Cobertura completa:
 * 1. Inicializacao e gerenciamento de estado
 * 2. Autenticacao (requestMagicLink, verifyToken, logout)
 * 3. Push (upload local models to cloud)
 * 4. Pull (download cloud models to local)
 * 5. Sync (pull + push combinado)
 * 6. Resolucao de conflitos (version_mismatch, model_deleted, no_permission)
 * 7. Tratamento de erros (rede, auth, servidor)
 * 8. Retry logic (version_mismatch retry com MAX_RETRIES=3)
 * 9. Batch operations (trackChangeBatch)
 * 10. pushAllModels (primeira sincronizacao)
 * 11. Token refresh automático
 * 12. Auto-sync interval
 * 13. Offline behavior
 * 14. Persistencia localStorage
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCloudSync } from './useCloudSync';
import { useModelsStore } from '../stores/useModelsStore';
import type { Model } from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// MOCKS
// ═══════════════════════════════════════════════════════════════════════════

vi.mock('../stores/useModelsStore', () => ({
  useModelsStore: {
    getState: vi.fn()
  }
}));

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

const createMockModel = (id: string, isShared = false): Model => ({
  id,
  title: `Model ${id}`,
  content: '<p>Test content</p>',
  keywords: 'test',
  category: 'MERITO',
  isShared,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
});

const createModels = (count: number, isShared = false): Model[] => {
  return Array(count).fill(null).map((_, i) => createMockModel(`model-${i}`, isShared));
};

const setupAuthentication = () => {
  localStorage.setItem('sentencify-user', JSON.stringify({ id: 'user1', email: 'test@test.com' }));
  localStorage.setItem('sentencify-auth-token', 'mock-token');
  localStorage.setItem('sentencify-refresh-token', 'mock-refresh-token');
  localStorage.setItem('sentencify-initial-push-done', 'true');
};

const createFetchMock = (serverActiveModels: number, pullModels: Partial<Model>[] = []) => {
  return vi.fn((url: string | URL | Request, options?: RequestInit): Promise<Response> => {
    const urlStr = typeof url === 'string' ? url : url.toString();
    if (urlStr.includes('/api/sync/status')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ activeModels: serverActiveModels })
      } as Response);
    }
    if (urlStr.includes('/api/sync/pull')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          models: pullModels,
          hasMore: false,
          serverTime: '2026-01-20T10:00:00Z',
          count: pullModels.length,
          total: pullModels.length,
          sharedLibraries: []
        })
      } as Response);
    }
    if (urlStr.includes('/api/sync/push')) {
      const body = options?.body ? JSON.parse(options.body as string) : { changes: [] };
      const changes = body.changes || [];
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          results: {
            created: changes.filter((c: any) => c.operation === 'create').map((c: any) => c.model.id),
            updated: changes.filter((c: any) => c.operation === 'update').map((c: any) => c.model.id),
            deleted: changes.filter((c: any) => c.operation === 'delete').map((c: any) => c.model.id),
            conflicts: []
          },
          serverTime: '2026-01-20T10:00:00Z'
        })
      } as Response);
    }
    return Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'Not found' }) } as Response);
  });
};

// ═══════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('useCloudSync', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    originalFetch = global.fetch;
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    // Default: online
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
      configurable: true
    });

    // Default store mock
    (useModelsStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({ models: [] });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION: Initialization and State Management
  // ═══════════════════════════════════════════════════════════════════════

  describe('initialization and state management', () => {
    it('should initialize with default state when no stored data', () => {
      const { result } = renderHook(() => useCloudSync({}));

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.authLoading).toBe(false);
      expect(result.current.authError).toBeNull();
      expect(result.current.devLink).toBeNull();
      expect(result.current.syncStatus).toBe('idle');
      expect(result.current.lastSyncAt).toBeNull();
      expect(result.current.pendingCount).toBe(0);
      expect(result.current.syncError).toBeNull();
    });

    it('should restore user from localStorage on mount', async () => {
      localStorage.setItem('sentencify-user', JSON.stringify({ id: 'u1', email: 'user@test.com' }));

      const { result } = renderHook(() => useCloudSync({}));

      // Wait for useEffect to run
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      expect(result.current.user).toEqual({ id: 'u1', email: 'user@test.com' });
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should restore lastSyncAt from localStorage on mount', async () => {
      localStorage.setItem('sentencify-last-sync', '2026-01-15T10:00:00Z');

      const { result } = renderHook(() => useCloudSync({}));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      expect(result.current.lastSyncAt).toBe('2026-01-15T10:00:00Z');
    });

    it('should restore pending changes from localStorage on mount', async () => {
      localStorage.setItem('sentencify-user', JSON.stringify({ id: 'u1', email: 'user@test.com' }));
      localStorage.setItem('sentencify-pending-changes', JSON.stringify([
        { operation: 'create', model: { id: 'pending-1', title: 'Pending' } }
      ]));

      const { result } = renderHook(() => useCloudSync({}));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      expect(result.current.pendingCount).toBe(1);
    });

    it('should handle corrupt user JSON in localStorage gracefully', async () => {
      localStorage.setItem('sentencify-user', 'not-valid-json');

      const { result } = renderHook(() => useCloudSync({}));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      expect(result.current.user).toBeNull();
      expect(localStorage.getItem('sentencify-user')).toBeNull();
    });

    it('should handle corrupt pending changes JSON gracefully', async () => {
      localStorage.setItem('sentencify-pending-changes', '{invalid json}');

      const { result } = renderHook(() => useCloudSync({}));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      expect(result.current.pendingCount).toBe(0);
      expect(localStorage.getItem('sentencify-pending-changes')).toBeNull();
    });

    it('should set syncStatus to offline when navigator.onLine is false', async () => {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
        configurable: true
      });

      const { result } = renderHook(() => useCloudSync({}));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      expect(result.current.syncStatus).toBe('offline');
    });

    it('should persist pending changes to localStorage', async () => {
      setupAuthentication();
      const { result } = renderHook(() => useCloudSync({}));

      await act(async () => {
        result.current.trackChange('create', { id: 'test-persist', title: 'Test' } as any);
      });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      const stored = JSON.parse(localStorage.getItem('sentencify-pending-changes') || '[]');
      expect(stored).toHaveLength(1);
      expect(stored[0].model.id).toBe('test-persist');
    });

    it('should remove pending changes key when array is empty', async () => {
      setupAuthentication();
      const mockFetch = createFetchMock(0, []);
      global.fetch = mockFetch;

      const { result } = renderHook(() => useCloudSync({}));

      await act(async () => {
        result.current.trackChange('create', { id: 'temp-model', title: 'Temp' } as any);
      });

      // Now push to clear them
      await act(async () => {
        await result.current.push();
      });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      expect(localStorage.getItem('sentencify-pending-changes')).toBeNull();
    });

    it('should handle QuotaExceededError when persisting pending changes', async () => {
      setupAuthentication();

      // Mock localStorage.setItem to throw QuotaExceededError for pending changes
      const originalSetItem = localStorage.setItem.bind(localStorage);
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key: string, value: string) => {
        if (key === 'sentencify-pending-changes') {
          throw new DOMException('QuotaExceededError', 'QuotaExceededError');
        }
        originalSetItem(key, value);
      });

      const { result } = renderHook(() => useCloudSync({}));

      await act(async () => {
        result.current.trackChange('create', { id: 'quota-model', title: 'Quota' } as any);
      });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      // Should not crash, error is handled gracefully
      expect(result.current.pendingCount).toBe(1);

      setItemSpy.mockRestore();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION: Authentication - requestMagicLink
  // ═══════════════════════════════════════════════════════════════════════

  describe('requestMagicLink', () => {
    it('should send email and return success', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ message: 'Link enviado com sucesso' })
      } as any);
      global.fetch = mockFetch;

      const { result } = renderHook(() => useCloudSync({}));

      let response: any;
      await act(async () => {
        response = await result.current.requestMagicLink('user@test.com');
      });

      expect(response.success).toBe(true);
      expect(response.message).toBe('Link enviado com sucesso');
      expect(mockFetch).toHaveBeenCalledWith('/api/auth/magic/request-link', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'user@test.com' })
      }));
    });

    it('should set devLink when returned in response', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ message: 'Link enviado', devLink: 'http://dev.link/token123' })
      } as any);
      global.fetch = mockFetch;

      const { result } = renderHook(() => useCloudSync({}));

      await act(async () => {
        await result.current.requestMagicLink('dev@test.com');
      });

      expect(result.current.devLink).toBe('http://dev.link/token123');
    });

    it('should return error when API returns non-ok response', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Email invalido' })
      } as any);
      global.fetch = mockFetch;

      const { result } = renderHook(() => useCloudSync({}));

      let response: any;
      await act(async () => {
        response = await result.current.requestMagicLink('bad-email');
      });

      expect(response.success).toBe(false);
      expect(response.error).toBe('Email invalido');
      expect(result.current.authError).toBe('Email invalido');
    });

    it('should handle network error gracefully', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
      global.fetch = mockFetch;

      const { result } = renderHook(() => useCloudSync({}));

      let response: any;
      await act(async () => {
        response = await result.current.requestMagicLink('user@test.com');
      });

      expect(response.success).toBe(false);
      expect(response.error).toBe('Network error');
      expect(result.current.authError).toBe('Network error');
    });

    it('should handle non-Error exceptions', async () => {
      const mockFetch = vi.fn().mockRejectedValue('string-error');
      global.fetch = mockFetch;

      const { result } = renderHook(() => useCloudSync({}));

      let response: any;
      await act(async () => {
        response = await result.current.requestMagicLink('user@test.com');
      });

      expect(response.success).toBe(false);
      expect(response.error).toBe('Erro desconhecido');
    });

    it('should clear authError and devLink before request', async () => {
      const mockFetch = vi.fn()
        .mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ error: 'First error' })
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ message: 'Success' })
        } as any);
      global.fetch = mockFetch;

      const { result } = renderHook(() => useCloudSync({}));

      await act(async () => {
        await result.current.requestMagicLink('user@test.com');
      });

      expect(result.current.authError).toBe('First error');

      await act(async () => {
        await result.current.requestMagicLink('user@test.com');
      });

      expect(result.current.authError).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION: Authentication - verifyToken
  // ═══════════════════════════════════════════════════════════════════════

  describe('verifyToken', () => {
    it('should verify token and set user on success', async () => {
      const mockUser = { id: 'u1', email: 'verified@test.com' };
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
          user: mockUser
        })
      } as any);
      global.fetch = mockFetch;

      const { result } = renderHook(() => useCloudSync({}));

      let response: any;
      await act(async () => {
        response = await result.current.verifyToken('valid-token-123');
      });

      expect(response.success).toBe(true);
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(localStorage.getItem('sentencify-auth-token')).toBe('new-access-token');
      expect(localStorage.getItem('sentencify-refresh-token')).toBe('new-refresh-token');
      expect(JSON.parse(localStorage.getItem('sentencify-user') || '{}')).toEqual(mockUser);
    });

    it('should call fetch with correct token URL', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          accessToken: 'at',
          refreshToken: 'rt',
          user: { id: 'u1', email: 't@t.com' }
        })
      } as any);
      global.fetch = mockFetch;

      const { result } = renderHook(() => useCloudSync({}));

      await act(async () => {
        await result.current.verifyToken('my-token-abc');
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/magic/verify/my-token-abc');
    });

    it('should return error when token is invalid', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Token expirado' })
      } as any);
      global.fetch = mockFetch;

      const { result } = renderHook(() => useCloudSync({}));

      let response: any;
      await act(async () => {
        response = await result.current.verifyToken('expired-token');
      });

      expect(response.success).toBe(false);
      expect(response.error).toBe('Token expirado');
      expect(result.current.authError).toBe('Token expirado');
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should handle network failure during verification', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Connection refused'));
      global.fetch = mockFetch;

      const { result } = renderHook(() => useCloudSync({}));

      let response: any;
      await act(async () => {
        response = await result.current.verifyToken('token');
      });

      expect(response.success).toBe(false);
      expect(response.error).toBe('Connection refused');
    });

    it('should set authLoading during verification and clear after', async () => {
      let resolvePromise: Function;
      const mockFetch = vi.fn().mockReturnValue(new Promise(resolve => {
        resolvePromise = resolve;
      }));
      global.fetch = mockFetch;

      const { result } = renderHook(() => useCloudSync({}));

      // Start verification
      let verifyPromise: Promise<any>;
      act(() => {
        verifyPromise = result.current.verifyToken('token');
      });

      // authLoading should be true during verification
      expect(result.current.authLoading).toBe(true);

      // Resolve the promise
      await act(async () => {
        resolvePromise!({
          ok: true,
          json: () => Promise.resolve({
            accessToken: 'at',
            refreshToken: 'rt',
            user: { id: 'u1', email: 'test@test.com' }
          })
        });
        await verifyPromise!;
      });

      expect(result.current.authLoading).toBe(false);
    });

    it('should handle non-Error exceptions in verifyToken', async () => {
      const mockFetch = vi.fn().mockRejectedValue(42);
      global.fetch = mockFetch;

      const { result } = renderHook(() => useCloudSync({}));

      let response: any;
      await act(async () => {
        response = await result.current.verifyToken('token');
      });

      expect(response.success).toBe(false);
      expect(response.error).toBe('Erro desconhecido');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION: Authentication - logout
  // ═══════════════════════════════════════════════════════════════════════

  describe('logout', () => {
    it('should clear all auth data from localStorage and state', async () => {
      setupAuthentication();
      const mockFetch = vi.fn().mockResolvedValue({ ok: true } as any);
      global.fetch = mockFetch;

      const { result } = renderHook(() => useCloudSync({}));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      expect(result.current.isAuthenticated).toBe(true);

      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(localStorage.getItem('sentencify-auth-token')).toBeNull();
      expect(localStorage.getItem('sentencify-refresh-token')).toBeNull();
      expect(localStorage.getItem('sentencify-user')).toBeNull();
    });

    it('should call logout API with access and refresh tokens', async () => {
      setupAuthentication();
      const mockFetch = vi.fn().mockResolvedValue({ ok: true } as any);
      global.fetch = mockFetch;

      const { result } = renderHook(() => useCloudSync({}));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      await act(async () => {
        await result.current.logout();
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/magic/logout', expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer mock-token'
        }),
        body: JSON.stringify({ refreshToken: 'mock-refresh-token' })
      }));
    });

    it('should clear pending changes on logout', async () => {
      setupAuthentication();
      const mockFetch = vi.fn().mockResolvedValue({ ok: true } as any);
      global.fetch = mockFetch;

      const { result } = renderHook(() => useCloudSync({}));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      await act(async () => {
        result.current.trackChange('create', { id: 'pending-model', title: 'Pending' } as any);
      });

      expect(result.current.pendingCount).toBe(1);

      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.pendingCount).toBe(0);
    });

    it('should handle logout API failure gracefully (still clears local state)', async () => {
      setupAuthentication();
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network failure'));
      global.fetch = mockFetch;

      const { result } = renderHook(() => useCloudSync({}));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      await act(async () => {
        await result.current.logout();
      });

      // Local state should still be cleared even if API fails
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should not call API when no access token exists', async () => {
      localStorage.setItem('sentencify-user', JSON.stringify({ id: 'u1', email: 'test@test.com' }));
      // No auth token set
      const mockFetch = vi.fn().mockResolvedValue({ ok: true } as any);
      global.fetch = mockFetch;

      const { result } = renderHook(() => useCloudSync({}));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      await act(async () => {
        await result.current.logout();
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION: Token Refresh (authFetch 401 handling)
  // ═══════════════════════════════════════════════════════════════════════

  describe('token refresh (authFetch)', () => {
    it('should refresh token when receiving TOKEN_EXPIRED and retry request', async () => {
      setupAuthentication();
      (useModelsStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({ models: createModels(5) });

      let callCount = 0;
      const mockFetch = vi.fn((url: string | URL, _options?: RequestInit) => {
        const urlStr = typeof url === 'string' ? url : url.toString();

        if (urlStr.includes('/api/auth/magic/refresh')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              accessToken: 'new-access-token',
              refreshToken: 'new-refresh-token'
            })
          } as Response);
        }

        if (urlStr.includes('/api/sync/status')) {
          callCount++;
          if (callCount === 1) {
            // First call returns 401 TOKEN_EXPIRED
            return Promise.resolve({
              ok: false,
              status: 401,
              json: () => Promise.resolve({ code: 'TOKEN_EXPIRED' })
            } as Response);
          }
          // After refresh, return success
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ activeModels: 5 })
          } as Response);
        }

        if (urlStr.includes('/api/sync/pull')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              models: [],
              hasMore: false,
              serverTime: '2026-01-20T10:00:00Z',
              count: 0,
              total: 0,
              sharedLibraries: []
            })
          } as Response);
        }

        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
      }) as any;
      global.fetch = mockFetch;

      const { result: _result } = renderHook(() => useCloudSync({ modelsLoaded: true }));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Should have stored the new tokens
      expect(localStorage.getItem('sentencify-auth-token')).toBe('new-access-token');
      expect(localStorage.getItem('sentencify-refresh-token')).toBe('new-refresh-token');
    });

    it('should logout when refresh token fails', async () => {
      setupAuthentication();
      (useModelsStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({ models: createModels(5) });

      const mockFetch = vi.fn((url: string | URL) => {
        const urlStr = typeof url === 'string' ? url : url.toString();

        if (urlStr.includes('/api/auth/magic/refresh')) {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ error: 'Refresh token expired' })
          } as Response);
        }

        if (urlStr.includes('/api/sync/status')) {
          return Promise.resolve({
            ok: false,
            status: 401,
            json: () => Promise.resolve({ code: 'TOKEN_EXPIRED' })
          } as Response);
        }

        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
      }) as any;
      global.fetch = mockFetch;

      const { result } = renderHook(() => useCloudSync({ modelsLoaded: true }));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Should have logged out
      expect(result.current.user).toBeNull();
      expect(localStorage.getItem('sentencify-auth-token')).toBeNull();
    });

    it('should throw error when no auth token exists', async () => {
      // No token in localStorage
      (useModelsStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({ models: [] });
      localStorage.setItem('sentencify-user', JSON.stringify({ id: 'u1', email: 'test@test.com' }));
      // No auth token!

      const mockFetch = vi.fn().mockResolvedValue({ ok: true } as any);
      global.fetch = mockFetch;

      const { result } = renderHook(() => useCloudSync({ modelsLoaded: true }));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      // Pull should fail because no auth token
      expect(result.current.syncError).toBeTruthy();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION: Pull Operation
  // ═══════════════════════════════════════════════════════════════════════

  describe('pull', () => {
    it('should return null when user is not authenticated', async () => {
      const { result } = renderHook(() => useCloudSync({}));

      let pullResult: any;
      await act(async () => {
        pullResult = await result.current.pull();
      });

      expect(pullResult).toBeNull();
    });

    it('should return null when offline', async () => {
      setupAuthentication();
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
        configurable: true
      });

      const { result } = renderHook(() => useCloudSync({}));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      let pullResult: any;
      await act(async () => {
        pullResult = await result.current.pull();
      });

      expect(pullResult).toBeNull();
    });

    it('should call onModelsReceived callback with pulled models', async () => {
      setupAuthentication();
      const serverModels = createModels(3);
      (useModelsStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({ models: createModels(3) });

      const mockFetch = createFetchMock(3, serverModels);
      global.fetch = mockFetch;

      const onModelsReceived = vi.fn();
      const { result } = renderHook(() => useCloudSync({ onModelsReceived }));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      await act(async () => {
        await result.current.pull();
      });

      expect(onModelsReceived).toHaveBeenCalledWith(serverModels, []);
    });

    it('should do full sync when no initial-push-done flag', async () => {
      localStorage.setItem('sentencify-user', JSON.stringify({ id: 'user1', email: 'test@test.com' }));
      localStorage.setItem('sentencify-auth-token', 'mock-token');
      // NOT setting 'sentencify-initial-push-done'!

      (useModelsStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({ models: createModels(10) });

      const mockFetch = createFetchMock(10, []);
      global.fetch = mockFetch;

      const { result } = renderHook(() => useCloudSync({}));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      await act(async () => {
        await result.current.pull();
      });

      // Verify that pull was called with lastSyncAt=null (full sync)
      const pullCalls = mockFetch.mock.calls.filter((call: any[]) =>
        typeof call[0] === 'string' && call[0].includes('/api/sync/pull')
      );
      expect(pullCalls.length).toBeGreaterThan(0);
      const pullBody = JSON.parse((pullCalls[0][1] as RequestInit).body as string);
      expect(pullBody.lastSyncAt).toBeNull();
    });

    it('should do incremental sync when local matches server', async () => {
      setupAuthentication();
      localStorage.setItem('sentencify-last-sync', '2026-01-15T10:00:00Z');

      (useModelsStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({ models: createModels(10) });

      const mockFetch = createFetchMock(10, []);
      global.fetch = mockFetch;

      const { result } = renderHook(() => useCloudSync({}));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      await act(async () => {
        await result.current.pull();
      });

      // Verify pull was called with lastSyncAt set (incremental)
      const pullCalls = mockFetch.mock.calls.filter((call: any[]) =>
        typeof call[0] === 'string' && call[0].includes('/api/sync/pull')
      );
      expect(pullCalls.length).toBeGreaterThan(0);
      const pullBody = JSON.parse((pullCalls[0][1] as RequestInit).body as string);
      expect(pullBody.lastSyncAt).toBe('2026-01-15T10:00:00Z');
    });

    it('should handle paginated pull (hasMore=true)', async () => {
      setupAuthentication();
      (useModelsStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({ models: createModels(5) });

      let pullCallCount = 0;
      const mockFetch = vi.fn((url: string | URL, _options?: RequestInit) => {
        const urlStr = typeof url === 'string' ? url : url.toString();
        if (urlStr.includes('/api/sync/status')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ activeModels: 100 })
          } as Response);
        }
        if (urlStr.includes('/api/sync/pull')) {
          pullCallCount++;
          const models = pullCallCount === 1
            ? createModels(50).map((m, i) => ({ ...m, id: `page1-${i}` }))
            : createModels(30).map((m, i) => ({ ...m, id: `page2-${i}` }));
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              models,
              hasMore: pullCallCount === 1,
              serverTime: '2026-01-20T10:00:00Z',
              count: models.length,
              total: 80,
              sharedLibraries: pullCallCount === 2 ? [{ id: 'lib1', ownerId: 'o1', ownerEmail: 'owner@t.com' }] : []
            })
          } as Response);
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
      }) as any;
      global.fetch = mockFetch;

      const onModelsReceived = vi.fn();
      const { result } = renderHook(() => useCloudSync({ onModelsReceived }));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      await act(async () => {
        await result.current.pull();
      });

      // Should have made 2 pull calls
      expect(pullCallCount).toBe(2);
      // onModelsReceived should have been called with all 80 models
      expect(onModelsReceived).toHaveBeenCalled();
      const receivedModels = onModelsReceived.mock.calls[onModelsReceived.mock.calls.length - 1][0];
      expect(receivedModels).toHaveLength(80);
      // Should have passed shared libraries from last page
      const receivedLibraries = onModelsReceived.mock.calls[onModelsReceived.mock.calls.length - 1][1];
      expect(receivedLibraries).toHaveLength(1);
      expect(receivedLibraries[0].id).toBe('lib1');
    });

    it('should handle status check failure', async () => {
      setupAuthentication();
      (useModelsStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({ models: [] });

      const mockFetch = vi.fn((url: string | URL) => {
        const urlStr = typeof url === 'string' ? url : url.toString();
        if (urlStr.includes('/api/sync/status')) {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ error: 'Server error' })
          } as Response);
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
      }) as any;
      global.fetch = mockFetch;

      const { result } = renderHook(() => useCloudSync({}));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      let pullResult: any;
      await act(async () => {
        pullResult = await result.current.pull();
      });

      expect(pullResult).toBeNull();
      expect(result.current.syncError).toBeTruthy();
      expect(result.current.syncStatus).toBe('error');
    });

    it('should handle pull API failure', async () => {
      setupAuthentication();
      (useModelsStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({ models: [] });

      const mockFetch = vi.fn((url: string | URL) => {
        const urlStr = typeof url === 'string' ? url : url.toString();
        if (urlStr.includes('/api/sync/status')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ activeModels: 5 })
          } as Response);
        }
        if (urlStr.includes('/api/sync/pull')) {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ error: 'Pull failed' })
          } as Response);
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
      }) as any;
      global.fetch = mockFetch;

      const { result } = renderHook(() => useCloudSync({}));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      let pullResult: any;
      await act(async () => {
        pullResult = await result.current.pull();
      });

      expect(pullResult).toBeNull();
      expect(result.current.syncError).toBe('Pull failed');
    });

    it('should set syncStatus to offline on error when offline', async () => {
      setupAuthentication();
      (useModelsStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({ models: [] });

      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
      global.fetch = mockFetch;

      const { result } = renderHook(() => useCloudSync({}));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      // Go offline before pull
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
        configurable: true
      });

      // The pull should return null when offline
      let pullResult: any;
      await act(async () => {
        pullResult = await result.current.pull();
      });

      expect(pullResult).toBeNull();
    });

    it('should update lastSyncAt after successful pull', async () => {
      setupAuthentication();
      (useModelsStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({ models: createModels(5) });

      const mockFetch = createFetchMock(5, []);
      global.fetch = mockFetch;

      const { result } = renderHook(() => useCloudSync({}));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      await act(async () => {
        await result.current.pull();
      });

      expect(result.current.lastSyncAt).toBe('2026-01-20T10:00:00Z');
      expect(localStorage.getItem('sentencify-last-sync')).toBe('2026-01-20T10:00:00Z');
    });

    it('should set initial-push-done flag after successful pull with callback', async () => {
      localStorage.setItem('sentencify-user', JSON.stringify({ id: 'user1', email: 'test@test.com' }));
      localStorage.setItem('sentencify-auth-token', 'mock-token');
      // No initial-push-done flag
      (useModelsStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({ models: [] });

      const mockFetch = createFetchMock(0, []);
      global.fetch = mockFetch;

      const onModelsReceived = vi.fn();
      const { result } = renderHook(() => useCloudSync({ onModelsReceived }));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      await act(async () => {
        await result.current.pull();
      });

      expect(localStorage.getItem('sentencify-initial-push-done')).toBe('true');
    });

    it('should only count non-shared models for local count', async () => {
      setupAuthentication();
      const localModels = [
        ...createModels(5, false), // 5 own models
        ...createModels(3, true)   // 3 shared models
      ];
      (useModelsStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({ models: localModels });

      const consoleLogSpy = vi.spyOn(console, 'log');
      const mockFetch = createFetchMock(5, []); // Server has 5 (matching own models)
      global.fetch = mockFetch;

      const { result } = renderHook(() => useCloudSync({}));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      await act(async () => {
        await result.current.pull();
      });

      // Should do incremental sync since own models (5) match server (5)
      const logCalls = consoleLogSpy.mock.calls.map((call: any[]) => call[0]);
      const hasIncrementalLog = logCalls.some((log: unknown) =>
        typeof log === 'string' && log.includes('Sync incremental')
      );
      expect(hasIncrementalLog).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION: Push Operation
  // ═══════════════════════════════════════════════════════════════════════

  describe('push', () => {
    it('should return success with count 0 when no pending changes', async () => {
      setupAuthentication();
      const { result } = renderHook(() => useCloudSync({}));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      let pushResult: any;
      await act(async () => {
        pushResult = await result.current.push();
      });

      expect(pushResult).toEqual({ success: true, count: 0 });
    });

    it('should return success with count 0 when not authenticated', async () => {
      const { result } = renderHook(() => useCloudSync({}));

      let pushResult: any;
      await act(async () => {
        pushResult = await result.current.push();
      });

      expect(pushResult).toEqual({ success: true, count: 0 });
    });

    it('should return success with count 0 when offline', async () => {
      setupAuthentication();
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
        configurable: true
      });

      const { result } = renderHook(() => useCloudSync({}));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      await act(async () => {
        result.current.trackChange('create', { id: 'model1', title: 'Test' } as any);
      });

      let pushResult: any;
      await act(async () => {
        pushResult = await result.current.push();
      });

      expect(pushResult).toEqual({ success: true, count: 0 });
    });

    it('should send pending changes to server', async () => {
      setupAuthentication();
      (useModelsStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({ models: createModels(10) });

      const mockFetch = createFetchMock(10, []);
      global.fetch = mockFetch;

      const { result } = renderHook(() => useCloudSync({}));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      await act(async () => {
        result.current.trackChange('create', { id: 'new-model', title: 'New Model' } as any);
      });

      await act(async () => {
        await result.current.push();
      });

      const pushCalls = mockFetch.mock.calls.filter((call: any[]) =>
        typeof call[0] === 'string' && call[0].includes('/api/sync/push')
      );
      expect(pushCalls.length).toBeGreaterThan(0);
      const pushBody = JSON.parse((pushCalls[0][1] as RequestInit).body as string);
      expect(pushBody.changes).toHaveLength(1);
      expect(pushBody.changes[0].operation).toBe('create');
    });

    it('should clear pending after successful push', async () => {
      setupAuthentication();
      (useModelsStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({ models: createModels(10) });

      const mockFetch = createFetchMock(10, []);
      global.fetch = mockFetch;

      const { result } = renderHook(() => useCloudSync({}));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      await act(async () => {
        result.current.trackChange('create', { id: 'new-model', title: 'New Model' } as any);
      });

      expect(result.current.pendingCount).toBe(1);

      await act(async () => {
        await result.current.push();
      });

      expect(result.current.pendingCount).toBe(0);
    });

    it('should return error on push API failure', async () => {
      setupAuthentication();
      (useModelsStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({ models: [] });

      const mockFetch = vi.fn((url: string | URL) => {
        const urlStr = typeof url === 'string' ? url : url.toString();
        if (urlStr.includes('/api/sync/push')) {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ error: 'Push failed on server' })
          } as Response);
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
      }) as any;
      global.fetch = mockFetch;

      const { result } = renderHook(() => useCloudSync({}));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      await act(async () => {
        result.current.trackChange('create', { id: 'model1', title: 'Test' } as any);
      });

      let pushResult: any;
      await act(async () => {
        pushResult = await result.current.push();
      });

      expect(pushResult.success).toBe(false);
      expect(pushResult.error).toBe('Push failed on server');
      expect(result.current.syncError).toBe('Push failed on server');
      expect(result.current.syncStatus).toBe('error');
    });

    it('should handle network error during push', async () => {
      setupAuthentication();
      (useModelsStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({ models: [] });

      const mockFetch = vi.fn((url: string | URL) => {
        const urlStr = typeof url === 'string' ? url : url.toString();
        if (urlStr.includes('/api/sync/push')) {
          return Promise.reject(new Error('Connection timeout'));
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
      }) as any;
      global.fetch = mockFetch;

      const { result } = renderHook(() => useCloudSync({}));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      await act(async () => {
        result.current.trackChange('update', { id: 'model1', title: 'Updated' } as any);
      });

      let pushResult: any;
      await act(async () => {
        pushResult = await result.current.push();
      });

      expect(pushResult.success).toBe(false);
      expect(pushResult.error).toBe('Connection timeout');
    });

    it('should update lastSyncAt after successful push', async () => {
      setupAuthentication();
      (useModelsStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({ models: [] });

      const mockFetch = createFetchMock(0, []);
      global.fetch = mockFetch;

      const { result } = renderHook(() => useCloudSync({}));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      await act(async () => {
        result.current.trackChange('create', { id: 'model1', title: 'Test' } as any);
      });

      await act(async () => {
        await result.current.push();
      });

      expect(result.current.lastSyncAt).toBe('2026-01-20T10:00:00Z');
    });

    it('should set syncStatus to offline on error when navigator.onLine is false', async () => {
      setupAuthentication();
      (useModelsStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({ models: [] });

      const mockFetch = vi.fn((url: string | URL) => {
        const urlStr = typeof url === 'string' ? url : url.toString();
        if (urlStr.includes('/api/sync/push')) {
          // Simulate going offline during request
          Object.defineProperty(navigator, 'onLine', {
            value: false,
            writable: true,
            configurable: true
          });
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
      }) as any;
      global.fetch = mockFetch;

      const { result } = renderHook(() => useCloudSync({}));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      await act(async () => {
        result.current.trackChange('create', { id: 'model1', title: 'Test' } as any);
      });

      await act(async () => {
        await result.current.push();
      });

      expect(result.current.syncStatus).toBe('offline');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION: Conflict Resolution
  // ═══════════════════════════════════════════════════════════════════════

  describe('conflict resolution', () => {
    it('should remove model_deleted conflicts from pending immediately', async () => {
      setupAuthentication();
      (useModelsStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({ models: [] });

      const mockFetch = vi.fn((url: string | URL) => {
        const urlStr = typeof url === 'string' ? url : url.toString();
        if (urlStr.includes('/api/sync/push')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              results: {
                created: [],
                updated: [],
                deleted: [],
                conflicts: [{ id: 'deleted-model', reason: 'model_deleted' }]
              },
              serverTime: '2026-01-20T10:00:00Z'
            })
          } as Response);
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
      }) as any;
      global.fetch = mockFetch;

      const { result } = renderHook(() => useCloudSync({}));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      await act(async () => {
        result.current.trackChange('update', { id: 'deleted-model', title: 'Updated' } as any);
      });

      expect(result.current.pendingCount).toBe(1);

      await act(async () => {
        await result.current.push();
      });

      // Should be removed from pending (fatal conflict)
      expect(result.current.pendingCount).toBe(0);
    });

    it('should remove no_permission conflicts from pending immediately', async () => {
      setupAuthentication();
      (useModelsStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({ models: [] });

      const mockFetch = vi.fn((url: string | URL) => {
        const urlStr = typeof url === 'string' ? url : url.toString();
        if (urlStr.includes('/api/sync/push')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              results: {
                created: [],
                updated: [],
                deleted: [],
                conflicts: [{ id: 'no-perm-model', reason: 'no_permission' }]
              },
              serverTime: '2026-01-20T10:00:00Z'
            })
          } as Response);
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
      }) as any;
      global.fetch = mockFetch;

      const { result } = renderHook(() => useCloudSync({}));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      await act(async () => {
        result.current.trackChange('update', { id: 'no-perm-model', title: 'Updated' } as any);
      });

      await act(async () => {
        await result.current.push();
      });

      expect(result.current.pendingCount).toBe(0);
    });

    it('should increment retryCount for version_mismatch conflicts', async () => {
      setupAuthentication();
      (useModelsStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({ models: [] });

      const mockFetch = vi.fn((url: string | URL) => {
        const urlStr = typeof url === 'string' ? url : url.toString();
        if (urlStr.includes('/api/sync/push')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              results: {
                created: [],
                updated: [],
                deleted: [],
                conflicts: [{ id: 'conflict-model', reason: 'version_mismatch' }]
              },
              serverTime: '2026-01-20T10:00:00Z'
            })
          } as Response);
        }
        // For the auto-pull triggered by version_mismatch
        if (urlStr.includes('/api/sync/status')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ activeModels: 0 })
          } as Response);
        }
        if (urlStr.includes('/api/sync/pull')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              models: [], hasMore: false, serverTime: '2026-01-20T10:00:00Z',
              count: 0, total: 0, sharedLibraries: []
            })
          } as Response);
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
      }) as any;
      global.fetch = mockFetch;

      const { result } = renderHook(() => useCloudSync({}));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      await act(async () => {
        result.current.trackChange('update', { id: 'conflict-model', title: 'Updated' } as any);
      });

      await act(async () => {
        await result.current.push();
      });

      // Should still be in pending with incremented retryCount
      expect(result.current.pendingCount).toBe(1);
    });

    it('should abandon model after MAX_RETRIES (3) version_mismatch conflicts', async () => {
      setupAuthentication();
      (useModelsStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({ models: [] });

      // Pre-load pending changes with retryCount=2 (next will be 3 = abandoned)
      localStorage.setItem('sentencify-pending-changes', JSON.stringify([
        { operation: 'update', model: { id: 'retry-model', title: 'Updated' }, retryCount: 2 }
      ]));

      const mockFetch = vi.fn((url: string | URL) => {
        const urlStr = typeof url === 'string' ? url : url.toString();
        if (urlStr.includes('/api/sync/push')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              results: {
                created: [],
                updated: [],
                deleted: [],
                conflicts: [{ id: 'retry-model', reason: 'version_mismatch' }]
              },
              serverTime: '2026-01-20T10:00:00Z'
            })
          } as Response);
        }
        if (urlStr.includes('/api/sync/status')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ activeModels: 0 })
          } as Response);
        }
        if (urlStr.includes('/api/sync/pull')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              models: [], hasMore: false, serverTime: '2026-01-20T10:00:00Z',
              count: 0, total: 0, sharedLibraries: []
            })
          } as Response);
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
      }) as any;
      global.fetch = mockFetch;

      const { result } = renderHook(() => useCloudSync({}));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      expect(result.current.pendingCount).toBe(1);

      await act(async () => {
        await result.current.push();
      });

      // After 3rd retry, should be abandoned (removed from pending)
      expect(result.current.pendingCount).toBe(0);
    });

    it('should trigger pull after version_mismatch conflict', async () => {
      setupAuthentication();
      (useModelsStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({ models: [] });

      vi.useFakeTimers();

      const mockFetch = vi.fn((url: string | URL) => {
        const urlStr = typeof url === 'string' ? url : url.toString();
        if (urlStr.includes('/api/sync/push')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              results: {
                created: [],
                updated: [],
                deleted: [],
                conflicts: [{ id: 'vm-model', reason: 'version_mismatch' }]
              },
              serverTime: '2026-01-20T10:00:00Z'
            })
          } as Response);
        }
        if (urlStr.includes('/api/sync/status')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ activeModels: 0 })
          } as Response);
        }
        if (urlStr.includes('/api/sync/pull')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              models: [], hasMore: false, serverTime: '2026-01-20T10:00:00Z',
              count: 0, total: 0, sharedLibraries: []
            })
          } as Response);
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
      }) as any;
      global.fetch = mockFetch;

      const { result } = renderHook(() => useCloudSync({}));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(10);
      });

      await act(async () => {
        result.current.trackChange('update', { id: 'vm-model', title: 'Updated' } as any);
      });

      await act(async () => {
        await result.current.push();
      });

      // Advance timer to trigger the setTimeout(() => pull(), 100)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(200);
      });

      // Verify pull was called (status endpoint is called by pull)
      const statusCalls = mockFetch.mock.calls.filter((call: any[]) =>
        typeof call[0] === 'string' && call[0].includes('/api/sync/status')
      );
      expect(statusCalls.length).toBeGreaterThan(0);

      vi.useRealTimers();
    });

    it('should keep unprocessed changes in pending', async () => {
      setupAuthentication();
      (useModelsStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({ models: [] });

      const mockFetch = vi.fn((url: string | URL) => {
        const urlStr = typeof url === 'string' ? url : url.toString();
        if (urlStr.includes('/api/sync/push')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              results: {
                created: ['model-1'], // Only model-1 succeeded
                updated: [],
                deleted: [],
                conflicts: [] // model-2 not in any list (server didn't process it)
              },
              serverTime: '2026-01-20T10:00:00Z'
            })
          } as Response);
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
      }) as any;
      global.fetch = mockFetch;

      const { result } = renderHook(() => useCloudSync({}));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      await act(async () => {
        result.current.trackChange('create', { id: 'model-1', title: 'Model 1' } as any);
        result.current.trackChange('create', { id: 'model-2', title: 'Model 2' } as any);
      });

      expect(result.current.pendingCount).toBe(2);

      await act(async () => {
        await result.current.push();
      });

      // model-2 should still be pending (not in any result list)
      expect(result.current.pendingCount).toBe(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION: Sync Operation (pull + push combined)
  // ═══════════════════════════════════════════════════════════════════════

  describe('sync', () => {
    it('should do pull first then push', async () => {
      setupAuthentication();
      (useModelsStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({ models: createModels(5) });

      const callOrder: string[] = [];
      const mockFetch = vi.fn((url: string | URL, options?: RequestInit) => {
        const urlStr = typeof url === 'string' ? url : url.toString();
        if (urlStr.includes('/api/sync/status')) {
          callOrder.push('status');
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ activeModels: 5 })
          } as Response);
        }
        if (urlStr.includes('/api/sync/pull')) {
          callOrder.push('pull');
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              models: [], hasMore: false, serverTime: '2026-01-20T10:00:00Z',
              count: 0, total: 0, sharedLibraries: []
            })
          } as Response);
        }
        if (urlStr.includes('/api/sync/push')) {
          callOrder.push('push');
          const body = options?.body ? JSON.parse(options.body as string) : { changes: [] };
          const changes = body.changes || [];
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              results: {
                created: changes.map((c: any) => c.model.id),
                updated: [], deleted: [], conflicts: []
              },
              serverTime: '2026-01-20T10:00:00Z'
            })
          } as Response);
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
      }) as any;
      global.fetch = mockFetch;

      const { result } = renderHook(() => useCloudSync({}));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      await act(async () => {
        result.current.trackChange('create', { id: 'new-model', title: 'New' } as any);
      });

      callOrder.length = 0; // Reset

      await act(async () => {
        await result.current.sync();
      });

      // Pull (status + pull) should come before push
      expect(callOrder.indexOf('status')).toBeLessThan(callOrder.indexOf('push'));
      expect(callOrder.indexOf('pull')).toBeLessThan(callOrder.indexOf('push'));
    });

    it('should attempt push when pull fails but online', async () => {
      setupAuthentication();
      (useModelsStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({ models: [] });

      let pushCalled = false;
      const mockFetch = vi.fn((url: string | URL, options?: RequestInit) => {
        const urlStr = typeof url === 'string' ? url : url.toString();
        if (urlStr.includes('/api/sync/status')) {
          return Promise.reject(new Error('Status failed'));
        }
        if (urlStr.includes('/api/sync/push')) {
          pushCalled = true;
          const body = options?.body ? JSON.parse(options.body as string) : { changes: [] };
          const changes = body.changes || [];
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              results: {
                created: changes.map((c: any) => c.model.id),
                updated: [], deleted: [], conflicts: []
              },
              serverTime: '2026-01-20T10:00:00Z'
            })
          } as Response);
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
      }) as any;
      global.fetch = mockFetch;

      const { result } = renderHook(() => useCloudSync({}));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      await act(async () => {
        result.current.trackChange('create', { id: 'model-1', title: 'Test' } as any);
      });

      await act(async () => {
        await result.current.sync();
      });

      // Push should have been attempted even though pull failed
      expect(pushCalled).toBe(true);
    });

    it('should return null when pull fails and offline', async () => {
      setupAuthentication();
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
        configurable: true
      });

      const { result } = renderHook(() => useCloudSync({}));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      let syncResult: any;
      await act(async () => {
        syncResult = await result.current.sync();
      });

      expect(syncResult).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION: trackChange
  // ═══════════════════════════════════════════════════════════════════════

  describe('trackChange', () => {
    it('should add pending change when authenticated', async () => {
      setupAuthentication();
      const { result } = renderHook(() => useCloudSync({}));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      await act(async () => {
        result.current.trackChange('create', { id: 'new-model', title: 'New' } as any);
      });

      expect(result.current.pendingCount).toBe(1);
    });

    it('should not track when not authenticated', async () => {
      const { result } = renderHook(() => useCloudSync({}));

      await act(async () => {
        result.current.trackChange('create', { id: 'new-model', title: 'New' } as any);
      });

      expect(result.current.pendingCount).toBe(0);
    });

    it('should keep create operation when updating a pending create', async () => {
      setupAuthentication();
      const { result } = renderHook(() => useCloudSync({}));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      await act(async () => {
        result.current.trackChange('create', { id: 'model-1', title: 'Original' } as any);
      });

      await act(async () => {
        result.current.trackChange('update', { id: 'model-1', title: 'Updated' } as any);
      });

      // Should still be 1 pending change (create with updated model data)
      expect(result.current.pendingCount).toBe(1);
    });

    it('should remove from pending when deleting a never-synced model (pending create)', async () => {
      setupAuthentication();
      const { result } = renderHook(() => useCloudSync({}));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      await act(async () => {
        result.current.trackChange('create', { id: 'model-1', title: 'New' } as any);
      });

      expect(result.current.pendingCount).toBe(1);

      await act(async () => {
        result.current.trackChange('delete', { id: 'model-1' } as any);
      });

      // Should be removed entirely (create + delete = nothing)
      expect(result.current.pendingCount).toBe(0);
    });

    it('should store only id and updatedAt for delete operations', async () => {
      setupAuthentication();
      const { result } = renderHook(() => useCloudSync({}));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      const now = new Date().toISOString();
      await act(async () => {
        result.current.trackChange('delete', {
          id: 'model-1',
          title: 'Full title',
          content: '<p>Large content</p>',
          updatedAt: now
        } as any);
      });

      const stored = JSON.parse(localStorage.getItem('sentencify-pending-changes') || '[]');
      expect(stored[0].model.id).toBe('model-1');
      expect(stored[0].model.updatedAt).toBe(now);
      expect(stored[0].model.title).toBeUndefined();
      expect(stored[0].model.content).toBeUndefined();
    });

    it('should replace existing pending change for same model id', async () => {
      setupAuthentication();
      const { result } = renderHook(() => useCloudSync({}));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      await act(async () => {
        result.current.trackChange('update', { id: 'model-1', title: 'V1' } as any);
      });

      await act(async () => {
        result.current.trackChange('update', { id: 'model-1', title: 'V2' } as any);
      });

      expect(result.current.pendingCount).toBe(1);
      const stored = JSON.parse(localStorage.getItem('sentencify-pending-changes') || '[]');
      expect(stored[0].model.title).toBe('V2');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION: trackChangeBatch
  // ═══════════════════════════════════════════════════════════════════════

  describe('trackChangeBatch', () => {
    it('should add multiple changes in a single batch', async () => {
      setupAuthentication();
      const { result } = renderHook(() => useCloudSync({}));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      await act(async () => {
        result.current.trackChangeBatch([
          { operation: 'create', model: { id: 'batch-1', title: 'Batch 1' } as any },
          { operation: 'create', model: { id: 'batch-2', title: 'Batch 2' } as any },
          { operation: 'create', model: { id: 'batch-3', title: 'Batch 3' } as any }
        ]);
      });

      expect(result.current.pendingCount).toBe(3);
    });

    it('should not track when not authenticated', async () => {
      const { result } = renderHook(() => useCloudSync({}));

      await act(async () => {
        result.current.trackChangeBatch([
          { operation: 'create', model: { id: 'batch-1', title: 'Batch 1' } as any }
        ]);
      });

      expect(result.current.pendingCount).toBe(0);
    });

    it('should not track when changes array is empty', async () => {
      setupAuthentication();
      const { result } = renderHook(() => useCloudSync({}));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      await act(async () => {
        result.current.trackChangeBatch([]);
      });

      expect(result.current.pendingCount).toBe(0);
    });

    it('should handle create-then-update within batch (keep as create)', async () => {
      setupAuthentication();
      const { result } = renderHook(() => useCloudSync({}));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      // First track a create
      await act(async () => {
        result.current.trackChange('create', { id: 'model-1', title: 'Original' } as any);
      });

      // Then batch update same model
      await act(async () => {
        result.current.trackChangeBatch([
          { operation: 'update', model: { id: 'model-1', title: 'Batch Updated' } as any }
        ]);
      });

      expect(result.current.pendingCount).toBe(1);
      const stored = JSON.parse(localStorage.getItem('sentencify-pending-changes') || '[]');
      expect(stored[0].operation).toBe('create');
    });

    it('should handle delete of pending create within batch (remove both)', async () => {
      setupAuthentication();
      const { result } = renderHook(() => useCloudSync({}));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      // First track a create
      await act(async () => {
        result.current.trackChange('create', { id: 'model-1', title: 'New' } as any);
      });

      // Then batch delete same model
      await act(async () => {
        result.current.trackChangeBatch([
          { operation: 'delete', model: { id: 'model-1' } as any }
        ]);
      });

      expect(result.current.pendingCount).toBe(0);
    });

    it('should store only id and updatedAt for delete operations in batch', async () => {
      setupAuthentication();
      const { result } = renderHook(() => useCloudSync({}));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      const now = new Date().toISOString();
      await act(async () => {
        result.current.trackChangeBatch([
          { operation: 'delete', model: { id: 'del-1', title: 'Title', content: 'Content', updatedAt: now } as any }
        ]);
      });

      const stored = JSON.parse(localStorage.getItem('sentencify-pending-changes') || '[]');
      expect(stored[0].model.id).toBe('del-1');
      expect(stored[0].model.updatedAt).toBe(now);
      expect(stored[0].model.title).toBeUndefined();
      expect(stored[0].model.content).toBeUndefined();
    });

    it('should deduplicate models within batch (last operation wins)', async () => {
      setupAuthentication();
      const { result } = renderHook(() => useCloudSync({}));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      await act(async () => {
        result.current.trackChangeBatch([
          { operation: 'create', model: { id: 'model-1', title: 'V1' } as any },
          { operation: 'update', model: { id: 'model-1', title: 'V2' } as any },
          { operation: 'update', model: { id: 'model-1', title: 'V3' } as any }
        ]);
      });

      // Should only have 1 pending change for model-1
      expect(result.current.pendingCount).toBe(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION: pushAllModels (Initial Push)
  // ═══════════════════════════════════════════════════════════════════════

  describe('pushAllModels', () => {
    it('should push all models as create operations', async () => {
      setupAuthentication();
      (useModelsStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({ models: [] });

      const mockFetch = vi.fn((url: string | URL) => {
        const urlStr = typeof url === 'string' ? url : url.toString();
        if (urlStr.includes('/api/sync/push')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ serverTime: '2026-01-20T10:00:00Z' })
          } as Response);
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
      }) as any;
      global.fetch = mockFetch;

      const { result } = renderHook(() => useCloudSync({}));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      const models = createModels(5);
      let pushResult: any;
      await act(async () => {
        pushResult = await result.current.pushAllModels(models);
      });

      expect(pushResult.success).toBe(true);
      expect(pushResult.count).toBe(5);

      // Verify the request body
      const pushCalls = mockFetch.mock.calls.filter((call: any[]) =>
        typeof call[0] === 'string' && call[0].includes('/api/sync/push')
      );
      expect(pushCalls.length).toBe(1);
      const body = JSON.parse((pushCalls[0][1] as RequestInit).body as string);
      expect(body.changes).toHaveLength(5);
      expect(body.changes.every((c: any) => c.operation === 'create')).toBe(true);
    });

    it('should return failure when no user is authenticated', async () => {
      const { result } = renderHook(() => useCloudSync({}));

      const models = createModels(5);
      let pushResult: any;
      await act(async () => {
        pushResult = await result.current.pushAllModels(models);
      });

      expect(pushResult.success).toBe(false);
      expect(pushResult.reason).toBe('no-models');
    });

    it('should return failure when models array is empty', async () => {
      setupAuthentication();
      const { result } = renderHook(() => useCloudSync({}));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      let pushResult: any;
      await act(async () => {
        pushResult = await result.current.pushAllModels([]);
      });

      expect(pushResult.success).toBe(false);
      expect(pushResult.reason).toBe('no-models');
    });

    it('should return failure when offline', async () => {
      setupAuthentication();
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
        configurable: true
      });

      const { result } = renderHook(() => useCloudSync({}));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      const models = createModels(5);
      let pushResult: any;
      await act(async () => {
        pushResult = await result.current.pushAllModels(models);
      });

      expect(pushResult.success).toBe(false);
      expect(pushResult.reason).toBe('no-models');
    });

    it('should handle API error during pushAllModels', async () => {
      setupAuthentication();
      (useModelsStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({ models: [] });

      const mockFetch = vi.fn((url: string | URL) => {
        const urlStr = typeof url === 'string' ? url : url.toString();
        if (urlStr.includes('/api/sync/push')) {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ error: 'Quota exceeded' })
          } as Response);
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
      }) as any;
      global.fetch = mockFetch;

      const { result } = renderHook(() => useCloudSync({}));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      const models = createModels(5);
      let pushResult: any;
      await act(async () => {
        pushResult = await result.current.pushAllModels(models);
      });

      expect(pushResult.success).toBe(false);
      expect(pushResult.error).toBe('Quota exceeded');
      expect(result.current.syncError).toBe('Quota exceeded');
      expect(result.current.syncStatus).toBe('error');
    });

    it('should handle network error during pushAllModels', async () => {
      setupAuthentication();
      (useModelsStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({ models: [] });

      const mockFetch = vi.fn((url: string | URL) => {
        const urlStr = typeof url === 'string' ? url : url.toString();
        if (urlStr.includes('/api/sync/push')) {
          return Promise.reject(new Error('Network failure'));
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
      }) as any;
      global.fetch = mockFetch;

      const { result } = renderHook(() => useCloudSync({}));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      const models = createModels(5);
      let pushResult: any;
      await act(async () => {
        pushResult = await result.current.pushAllModels(models);
      });

      expect(pushResult.success).toBe(false);
      expect(pushResult.error).toBe('Network failure');
    });

    it('should update lastSyncAt after successful pushAllModels', async () => {
      setupAuthentication();
      (useModelsStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({ models: [] });

      const mockFetch = vi.fn((url: string | URL) => {
        const urlStr = typeof url === 'string' ? url : url.toString();
        if (urlStr.includes('/api/sync/push')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ serverTime: '2026-01-20T12:00:00Z' })
          } as Response);
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
      }) as any;
      global.fetch = mockFetch;

      const { result } = renderHook(() => useCloudSync({}));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      await act(async () => {
        await result.current.pushAllModels(createModels(3));
      });

      expect(result.current.lastSyncAt).toBe('2026-01-20T12:00:00Z');
      expect(localStorage.getItem('sentencify-last-sync')).toBe('2026-01-20T12:00:00Z');
    });

    it('should return already-syncing when sync is in progress', async () => {
      setupAuthentication();
      (useModelsStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({ models: createModels(5) });

      // Create a fetch that takes a long time to resolve for pull
      let resolvePull: Function;
      const mockFetch = vi.fn((url: string | URL) => {
        const urlStr = typeof url === 'string' ? url : url.toString();
        if (urlStr.includes('/api/sync/status')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ activeModels: 5 })
          } as Response);
        }
        if (urlStr.includes('/api/sync/pull')) {
          return new Promise(resolve => { resolvePull = resolve; });
        }
        if (urlStr.includes('/api/sync/push')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ serverTime: '2026-01-20T10:00:00Z' })
          } as Response);
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
      }) as any;
      global.fetch = mockFetch;

      const { result } = renderHook(() => useCloudSync({ modelsLoaded: true }));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      // Start a pull (which will block)
      let pullPromise: Promise<any>;
      act(() => {
        pullPromise = result.current.pull();
      });

      // Try pushAllModels while pull is in progress
      let pushResult: any;
      await act(async () => {
        pushResult = await result.current.pushAllModels(createModels(3));
      });

      expect(pushResult.success).toBe(false);
      expect(pushResult.reason).toBe('already-syncing');

      // Cleanup: resolve the pending pull
      await act(async () => {
        resolvePull!({
          ok: true,
          json: () => Promise.resolve({
            models: [], hasMore: false, serverTime: '2026-01-20T10:00:00Z',
            count: 0, total: 0, sharedLibraries: []
          })
        });
        await pullPromise!;
      });
    });

    it('should handle non-Error exceptions in pushAllModels', async () => {
      setupAuthentication();
      (useModelsStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({ models: [] });

      const mockFetch = vi.fn((url: string | URL) => {
        const urlStr = typeof url === 'string' ? url : url.toString();
        if (urlStr.includes('/api/sync/push')) {
          return Promise.reject('string-error');
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
      }) as any;
      global.fetch = mockFetch;

      const { result } = renderHook(() => useCloudSync({}));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      let pushResult: any;
      await act(async () => {
        pushResult = await result.current.pushAllModels(createModels(2));
      });

      expect(pushResult.success).toBe(false);
      expect(pushResult.error).toBe('Erro desconhecido');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION: Offline behavior and online/offline events
  // ═══════════════════════════════════════════════════════════════════════

  describe('offline behavior', () => {
    it('should not sync when offline', async () => {
      setupAuthentication();
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
        configurable: true
      });

      const mockFetch = createFetchMock(10, []);
      global.fetch = mockFetch;

      const { result } = renderHook(() => useCloudSync({}));

      await act(async () => {
        await result.current.sync();
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should set status to offline when navigator.onLine is false initially', async () => {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
        configurable: true
      });

      const { result } = renderHook(() => useCloudSync({}));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      expect(result.current.syncStatus).toBe('offline');
    });

    it('should update status on online event when previously offline', async () => {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
        configurable: true
      });

      const { result } = renderHook(() => useCloudSync({}));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      expect(result.current.syncStatus).toBe('offline');

      // Simulate going online
      await act(async () => {
        Object.defineProperty(navigator, 'onLine', {
          value: true,
          writable: true,
          configurable: true
        });
        window.dispatchEvent(new Event('online'));
      });

      expect(result.current.syncStatus).toBe('idle');
    });

    it('should update status on offline event', async () => {
      const { result } = renderHook(() => useCloudSync({}));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      expect(result.current.syncStatus).toBe('idle');

      await act(async () => {
        window.dispatchEvent(new Event('offline'));
      });

      expect(result.current.syncStatus).toBe('offline');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION: Auto-sync interval
  // ═══════════════════════════════════════════════════════════════════════

  describe('auto-sync interval', () => {
    it('should auto-sync when user is authenticated and has pending changes', async () => {
      vi.useFakeTimers();
      setupAuthentication();
      (useModelsStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({ models: createModels(5) });

      const mockFetch = createFetchMock(5, []);
      global.fetch = mockFetch;

      const { result } = renderHook(() => useCloudSync({}));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(10);
      });

      await act(async () => {
        result.current.trackChange('create', { id: 'auto-sync-model', title: 'Auto' } as any);
      });

      // Clear previous fetch calls
      mockFetch.mockClear();

      // Advance 30 seconds (auto-sync interval)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(30000);
      });

      // Should have triggered sync (status + pull + push calls)
      expect(mockFetch).toHaveBeenCalled();

      vi.useRealTimers();
    });

    it('should not auto-sync when no pending changes', async () => {
      vi.useFakeTimers();
      setupAuthentication();

      const mockFetch = createFetchMock(0, []);
      global.fetch = mockFetch;

      renderHook(() => useCloudSync({}));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(10);
      });

      mockFetch.mockClear();

      // Advance 30 seconds
      await act(async () => {
        await vi.advanceTimersByTimeAsync(30000);
      });

      // Should NOT have called sync endpoints (no pending changes)
      const syncCalls = mockFetch.mock.calls.filter((call: any[]) =>
        typeof call[0] === 'string' && (
          call[0].includes('/api/sync/push') ||
          call[0].includes('/api/sync/status')
        )
      );
      expect(syncCalls).toHaveLength(0);

      vi.useRealTimers();
    });

    it('should not auto-sync when no user is authenticated', async () => {
      vi.useFakeTimers();
      // No authentication set up

      const mockFetch = createFetchMock(0, []);
      global.fetch = mockFetch;

      renderHook(() => useCloudSync({}));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(30000);
      });

      expect(mockFetch).not.toHaveBeenCalled();

      vi.useRealTimers();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION: Initial sync on authentication
  // ═══════════════════════════════════════════════════════════════════════

  describe('initial sync on authentication', () => {
    it('should trigger pull when user is authenticated and modelsLoaded is true', async () => {
      setupAuthentication();
      (useModelsStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({ models: [] });

      const mockFetch = createFetchMock(0, []);
      global.fetch = mockFetch;

      renderHook(() => useCloudSync({ modelsLoaded: true }));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      // Should have called status (part of pull)
      const statusCalls = mockFetch.mock.calls.filter((call: any[]) =>
        typeof call[0] === 'string' && call[0].includes('/api/sync/status')
      );
      expect(statusCalls.length).toBeGreaterThan(0);
    });

    it('should NOT trigger pull when modelsLoaded is false', async () => {
      setupAuthentication();
      (useModelsStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({ models: [] });

      const mockFetch = createFetchMock(0, []);
      global.fetch = mockFetch;

      renderHook(() => useCloudSync({ modelsLoaded: false }));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      // Should NOT have called any sync endpoints
      const statusCalls = mockFetch.mock.calls.filter((call: any[]) =>
        typeof call[0] === 'string' && call[0].includes('/api/sync/status')
      );
      expect(statusCalls).toHaveLength(0);
    });

    it('should NOT trigger pull when user is not authenticated', async () => {
      (useModelsStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({ models: [] });

      const mockFetch = createFetchMock(0, []);
      global.fetch = mockFetch;

      renderHook(() => useCloudSync({ modelsLoaded: true }));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION: Pending deletes calculation (v1.37.76)
  // ═══════════════════════════════════════════════════════════════════════

  describe('pending deletes calculation (v1.37.76)', () => {
    it('should do incremental sync when local=455, server=456, pendingDeletes=1', async () => {
      const models = createModels(455);
      (useModelsStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({ models });
      setupAuthentication();

      const mockFetch = createFetchMock(456, []);
      global.fetch = mockFetch;

      const consoleLogSpy = vi.spyOn(console, 'log');
      const { result } = renderHook(() => useCloudSync({}));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      consoleLogSpy.mockClear();

      await act(async () => {
        result.current.trackChange('delete', { id: 'deleted-model', updatedAt: new Date().toISOString() } as any);
      });

      await act(async () => {
        await result.current.sync();
      });

      const logCalls = consoleLogSpy.mock.calls.map((call: any[]) => call[0]);
      const hasIncrementalLog = logCalls.some((log: unknown) =>
        typeof log === 'string' && log.includes('Sync incremental')
      );
      expect(hasIncrementalLog).toBe(true);
    });

    it('should force full sync when local < expectedServer', async () => {
      const models = createModels(454);
      (useModelsStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({ models });
      setupAuthentication();

      const mockFetch = createFetchMock(456, []);
      global.fetch = mockFetch;

      const consoleLogSpy = vi.spyOn(console, 'log');
      const { result } = renderHook(() => useCloudSync({}));

      await act(async () => {
        result.current.trackChange('delete', { id: 'deleted-model', updatedAt: new Date().toISOString() } as any);
      });

      await act(async () => {
        await result.current.sync();
      });

      const logCalls = consoleLogSpy.mock.calls.map((call: any[]) => call[0]);
      const hasFullSyncLog = logCalls.some((log: unknown) =>
        typeof log === 'string' && log.includes('Forçando full sync')
      );
      expect(hasFullSyncLog).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION: Model resurrection bug fix (v1.37.76)
  // ═══════════════════════════════════════════════════════════════════════

  describe('bug fix: model resurrection (v1.37.76)', () => {
    it('should NOT trigger full sync when deleting a model', async () => {
      const models = createModels(455);
      (useModelsStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({ models });
      setupAuthentication();

      const mockFetch = createFetchMock(456, []);
      global.fetch = mockFetch;

      const consoleLogSpy = vi.spyOn(console, 'log');
      const { result } = renderHook(() => useCloudSync({}));

      await act(async () => {
        result.current.trackChange('delete', {
          id: 'model-to-delete',
          updatedAt: new Date().toISOString()
        } as any);
      });

      expect(result.current.pendingCount).toBe(1);

      await act(async () => {
        await result.current.sync();
      });

      const pushCalls = mockFetch.mock.calls.filter((call: any[]) =>
        typeof call[0] === 'string' && call[0].includes('/api/sync/push')
      );
      expect(pushCalls.length).toBeGreaterThan(0);

      const logCalls = consoleLogSpy.mock.calls.map((call: any[]) => call[0]);
      const hasIncrementalLog = logCalls.some((log: unknown) =>
        typeof log === 'string' && log.includes('Sync incremental')
      );
      expect(hasIncrementalLog).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION: Memoized return value
  // ═══════════════════════════════════════════════════════════════════════

  describe('memoized return value', () => {
    it('should return the same object reference when no state changes', async () => {
      const { result, rerender } = renderHook(() => useCloudSync({}));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      const firstRef = result.current;
      rerender();
      const secondRef = result.current;

      // useMemo should return same reference
      expect(firstRef).toBe(secondRef);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION: Edge cases
  // ═══════════════════════════════════════════════════════════════════════

  describe('edge cases', () => {
    it('should handle null models in pushAllModels', async () => {
      setupAuthentication();
      const { result } = renderHook(() => useCloudSync({}));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      let pushResult: any;
      await act(async () => {
        pushResult = await result.current.pushAllModels(null as any);
      });

      expect(pushResult.success).toBe(false);
      expect(pushResult.reason).toBe('no-models');
    });

    it('should handle undefined models in pushAllModels', async () => {
      setupAuthentication();
      const { result } = renderHook(() => useCloudSync({}));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      let pushResult: any;
      await act(async () => {
        pushResult = await result.current.pushAllModels(undefined as any);
      });

      expect(pushResult.success).toBe(false);
      expect(pushResult.reason).toBe('no-models');
    });

    it('should handle pull error with non-Error exception', async () => {
      setupAuthentication();
      (useModelsStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({ models: [] });

      const mockFetch = vi.fn().mockRejectedValue('non-error-object');
      global.fetch = mockFetch;

      const { result } = renderHook(() => useCloudSync({}));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      let pullResult: any;
      await act(async () => {
        pullResult = await result.current.pull();
      });

      expect(pullResult).toBeNull();
      expect(result.current.syncError).toBe('Erro desconhecido');
    });

    it('should handle push error with non-Error exception', async () => {
      setupAuthentication();
      (useModelsStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({ models: [] });

      const mockFetch = vi.fn((url: string | URL) => {
        const urlStr = typeof url === 'string' ? url : url.toString();
        if (urlStr.includes('/api/sync/push')) {
          return Promise.reject(42);
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
      }) as any;
      global.fetch = mockFetch;

      const { result } = renderHook(() => useCloudSync({}));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      await act(async () => {
        result.current.trackChange('create', { id: 'model-1', title: 'Test' } as any);
      });

      let pushResult: any;
      await act(async () => {
        pushResult = await result.current.push();
      });

      expect(pushResult.success).toBe(false);
      expect(pushResult.error).toBe('Erro desconhecido');
    });

    it('should handle default props (no arguments)', async () => {
      const { result } = renderHook(() => useCloudSync());

      expect(result.current.user).toBeNull();
      expect(result.current.syncStatus).toBe('idle');
    });

    it('should handle requestMagicLink API error without error field', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({})
      } as any);
      global.fetch = mockFetch;

      const { result } = renderHook(() => useCloudSync({}));

      let response: any;
      await act(async () => {
        response = await result.current.requestMagicLink('test@test.com');
      });

      expect(response.success).toBe(false);
      expect(response.error).toBe('Erro ao solicitar link');
    });

    it('should handle verifyToken API error without error field', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({})
      } as any);
      global.fetch = mockFetch;

      const { result } = renderHook(() => useCloudSync({}));

      let response: any;
      await act(async () => {
        response = await result.current.verifyToken('token');
      });

      expect(response.success).toBe(false);
      expect(response.error).toBe('Token inválido');
    });

    it('should handle pull API error without error field', async () => {
      setupAuthentication();
      (useModelsStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({ models: [] });

      const mockFetch = vi.fn((url: string | URL) => {
        const urlStr = typeof url === 'string' ? url : url.toString();
        if (urlStr.includes('/api/sync/status')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ activeModels: 0 })
          } as Response);
        }
        if (urlStr.includes('/api/sync/pull')) {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({})
          } as Response);
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
      }) as any;
      global.fetch = mockFetch;

      const { result } = renderHook(() => useCloudSync({}));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      await act(async () => {
        await result.current.pull();
      });

      expect(result.current.syncError).toBe('Erro ao sincronizar');
    });

    it('should handle push API error without error field', async () => {
      setupAuthentication();
      (useModelsStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({ models: [] });

      const mockFetch = vi.fn((url: string | URL) => {
        const urlStr = typeof url === 'string' ? url : url.toString();
        if (urlStr.includes('/api/sync/push')) {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({})
          } as Response);
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
      }) as any;
      global.fetch = mockFetch;

      const { result } = renderHook(() => useCloudSync({}));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      await act(async () => {
        result.current.trackChange('create', { id: 'model-1', title: 'Test' } as any);
      });

      let pushResult: any;
      await act(async () => {
        pushResult = await result.current.push();
      });

      expect(pushResult.error).toBe('Erro ao sincronizar');
    });

    it('should handle pushAllModels API error without error field', async () => {
      setupAuthentication();
      (useModelsStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({ models: [] });

      const mockFetch = vi.fn((url: string | URL) => {
        const urlStr = typeof url === 'string' ? url : url.toString();
        if (urlStr.includes('/api/sync/push')) {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({})
          } as Response);
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
      }) as any;
      global.fetch = mockFetch;

      const { result } = renderHook(() => useCloudSync({}));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      let pushResult: any;
      await act(async () => {
        pushResult = await result.current.pushAllModels(createModels(2));
      });

      expect(pushResult.error).toBe('Erro ao sincronizar');
    });
  });
});

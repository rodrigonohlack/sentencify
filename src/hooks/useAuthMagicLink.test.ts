import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuthMagicLink } from './useAuthMagicLink';

const mockFetch = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = mockFetch;
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

describe('useAuthMagicLink', () => {
  describe('initial state', () => {
    it('should start with no user and loading=true', () => {
      const { result } = renderHook(() => useAuthMagicLink());
      // After useEffect, loading becomes false
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should restore user from localStorage', () => {
      const storedUser = { id: '1', email: 'test@test.com', name: 'Test' };
      localStorage.setItem('sentencify-user', JSON.stringify(storedUser));

      const { result } = renderHook(() => useAuthMagicLink());
      expect(result.current.user).toEqual(storedUser);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should handle corrupted localStorage data', () => {
      localStorage.setItem('sentencify-user', 'invalid-json{');

      const { result } = renderHook(() => useAuthMagicLink());
      expect(result.current.user).toBeNull();
      expect(localStorage.getItem('sentencify-user')).toBeNull();
    });
  });

  describe('requestMagicLink', () => {
    it('should call the correct endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ message: 'Link enviado!' }),
      });

      const { result } = renderHook(() => useAuthMagicLink());
      let response: unknown;
      await act(async () => {
        response = await result.current.requestMagicLink('user@example.com');
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/magic/request-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'user@example.com' }),
      });
      expect(response).toEqual({ success: true, message: 'Link enviado!' });
    });

    it('should return error on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Email inválido' }),
      });

      const { result } = renderHook(() => useAuthMagicLink());
      let response: unknown;
      await act(async () => {
        response = await result.current.requestMagicLink('bad@');
      });

      expect(response).toEqual({ success: false, error: 'Email inválido' });
      expect(result.current.error).toBe('Email inválido');
    });

    it('should handle network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useAuthMagicLink());
      let response: unknown;
      await act(async () => {
        response = await result.current.requestMagicLink('user@test.com');
      });

      expect(response).toEqual({ success: false, error: 'Network error' });
    });
  });

  describe('verifyToken', () => {
    it('should verify token and store credentials', async () => {
      const mockUser = { id: '1', email: 'user@test.com', name: 'User' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          accessToken: 'access-123',
          refreshToken: 'refresh-456',
          user: mockUser,
        }),
      });

      const { result } = renderHook(() => useAuthMagicLink());
      let response: unknown;
      await act(async () => {
        response = await result.current.verifyToken('magic-token-xyz');
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/magic/verify/magic-token-xyz');
      expect(response).toEqual({ success: true, user: mockUser });
      expect(result.current.user).toEqual(mockUser);
      expect(localStorage.getItem('sentencify-auth-token')).toBe('access-123');
      expect(localStorage.getItem('sentencify-refresh-token')).toBe('refresh-456');
    });

    it('should return error for invalid token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Token expirado' }),
      });

      const { result } = renderHook(() => useAuthMagicLink());
      let response: unknown;
      await act(async () => {
        response = await result.current.verifyToken('expired-token');
      });

      expect(response).toEqual({ success: false, error: 'Token expirado' });
    });
  });

  describe('refreshAccessToken', () => {
    it('should return false when no refresh token exists', async () => {
      const { result } = renderHook(() => useAuthMagicLink());
      let success: boolean = true;
      await act(async () => {
        success = await result.current.refreshAccessToken();
      });

      expect(success).toBe(false);
    });

    it('should refresh tokens successfully', async () => {
      localStorage.setItem('sentencify-refresh-token', 'old-refresh');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          accessToken: 'new-access',
          refreshToken: 'new-refresh',
        }),
      });

      const { result } = renderHook(() => useAuthMagicLink());
      let success: boolean = false;
      await act(async () => {
        success = await result.current.refreshAccessToken();
      });

      expect(success).toBe(true);
      expect(localStorage.getItem('sentencify-auth-token')).toBe('new-access');
      expect(localStorage.getItem('sentencify-refresh-token')).toBe('new-refresh');
    });

    it('should clear tokens and user on refresh failure', async () => {
      localStorage.setItem('sentencify-auth-token', 'old-access');
      localStorage.setItem('sentencify-refresh-token', 'old-refresh');
      localStorage.setItem('sentencify-user', '{"id":"1"}');

      mockFetch.mockResolvedValueOnce({ ok: false });

      const { result } = renderHook(() => useAuthMagicLink());
      await act(async () => {
        await result.current.refreshAccessToken();
      });

      expect(localStorage.getItem('sentencify-auth-token')).toBeNull();
      expect(localStorage.getItem('sentencify-refresh-token')).toBeNull();
      expect(localStorage.getItem('sentencify-user')).toBeNull();
      expect(result.current.user).toBeNull();
    });
  });

  describe('logout', () => {
    it('should clear all auth data from localStorage', async () => {
      localStorage.setItem('sentencify-auth-token', 'token');
      localStorage.setItem('sentencify-refresh-token', 'refresh');
      localStorage.setItem('sentencify-user', '{"id":"1"}');

      mockFetch.mockResolvedValueOnce({ ok: true });

      const { result } = renderHook(() => useAuthMagicLink());
      await act(async () => {
        await result.current.logout();
      });

      expect(localStorage.getItem('sentencify-auth-token')).toBeNull();
      expect(localStorage.getItem('sentencify-refresh-token')).toBeNull();
      expect(localStorage.getItem('sentencify-user')).toBeNull();
      expect(result.current.user).toBeNull();
    });

    it('should call logout endpoint with bearer token', async () => {
      localStorage.setItem('sentencify-auth-token', 'my-token');
      localStorage.setItem('sentencify-refresh-token', 'my-refresh');

      mockFetch.mockResolvedValueOnce({ ok: true });

      const { result } = renderHook(() => useAuthMagicLink());
      await act(async () => {
        await result.current.logout();
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/magic/logout', expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer my-token',
        }),
      }));
    });
  });

  describe('getAccessToken', () => {
    it('should return null when no token stored', () => {
      const { result } = renderHook(() => useAuthMagicLink());
      expect(result.current.getAccessToken()).toBeNull();
    });

    it('should return stored access token', () => {
      localStorage.setItem('sentencify-auth-token', 'stored-token');
      const { result } = renderHook(() => useAuthMagicLink());
      expect(result.current.getAccessToken()).toBe('stored-token');
    });
  });

  describe('authFetch', () => {
    it('should throw when not authenticated', async () => {
      const { result } = renderHook(() => useAuthMagicLink());
      await expect(
        act(async () => {
          await result.current.authFetch('/api/data');
        })
      ).rejects.toThrow('Não autenticado');
    });

    it('should add Authorization header to requests', async () => {
      localStorage.setItem('sentencify-auth-token', 'my-access');
      mockFetch.mockResolvedValueOnce({ status: 200, ok: true });

      const { result } = renderHook(() => useAuthMagicLink());
      await act(async () => {
        await result.current.authFetch('/api/data', { headers: { 'X-Custom': 'val' } });
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/data', expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer my-access',
          'X-Custom': 'val',
        }),
      }));
    });
  });
});

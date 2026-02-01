/**
 * @file useProvaOralAPI.test.ts
 * @description Testes para funções de sharing na API de Prova Oral
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useProvaOralAPI } from './useProvaOralAPI';

// ═══════════════════════════════════════════════════════════════════════════
// MOCKS
// ═══════════════════════════════════════════════════════════════════════════

// Mock do useAuthMagicLink
const mockAuthFetch = vi.fn();
vi.mock('../../../hooks', () => ({
  useAuthMagicLink: () => ({
    authFetch: mockAuthFetch,
    isAuthenticated: true,
  }),
}));

// Mock do store
vi.mock('../stores', () => ({
  useAnalysesStore: () => ({
    setAnalyses: vi.fn(),
    addAnalysis: vi.fn(),
    removeAnalysis: vi.fn(),
    setLoading: vi.fn(),
    setError: vi.fn(),
    isLoading: false,
    error: null,
  }),
}));

describe('useProvaOralAPI - Sharing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FETCH USERS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('fetchUsers', () => {
    it('should fetch and return list of users', async () => {
      const mockUsers = [
        { id: 'user-1', email: 'user1@test.com' },
        { id: 'user-2', email: 'user2@test.com' },
      ];

      mockAuthFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ users: mockUsers }),
      });

      const { result } = renderHook(() => useProvaOralAPI());

      let users: { id: string; email: string }[] = [];
      await act(async () => {
        users = await result.current.fetchUsers();
      });

      expect(mockAuthFetch).toHaveBeenCalledWith('/api/users');
      expect(users).toEqual(mockUsers);
    });

    it('should return empty array on API error', async () => {
      mockAuthFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Server error' }),
      });

      const { result } = renderHook(() => useProvaOralAPI());

      let users: { id: string; email: string }[] = [];
      await act(async () => {
        users = await result.current.fetchUsers();
      });

      expect(users).toEqual([]);
    });

    it('should handle network errors gracefully', async () => {
      mockAuthFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useProvaOralAPI());

      let users: { id: string; email: string }[] = [];
      await act(async () => {
        users = await result.current.fetchUsers();
      });

      expect(users).toEqual([]);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FETCH SHARING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('fetchSharing', () => {
    it('should fetch current sharing recipients', async () => {
      const mockRecipients = [
        { id: 'user-1', email: 'shared@test.com' },
      ];

      mockAuthFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ recipients: mockRecipients }),
      });

      const { result } = renderHook(() => useProvaOralAPI());

      let recipients: { id: string; email: string }[] = [];
      await act(async () => {
        recipients = await result.current.fetchSharing();
      });

      expect(mockAuthFetch).toHaveBeenCalledWith('/api/prova-oral/sharing');
      expect(recipients).toEqual(mockRecipients);
    });

    it('should return empty array on API error', async () => {
      mockAuthFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Server error' }),
      });

      const { result } = renderHook(() => useProvaOralAPI());

      let recipients: { id: string; email: string }[] = [];
      await act(async () => {
        recipients = await result.current.fetchSharing();
      });

      expect(recipients).toEqual([]);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // UPDATE SHARING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('updateSharing', () => {
    it('should update sharing list successfully', async () => {
      mockAuthFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, count: 2 }),
      });

      const { result } = renderHook(() => useProvaOralAPI());

      let success = false;
      await act(async () => {
        success = await result.current.updateSharing(['user-1', 'user-2']);
      });

      expect(mockAuthFetch).toHaveBeenCalledWith('/api/prova-oral/sharing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientIds: ['user-1', 'user-2'] }),
      });
      expect(success).toBe(true);
    });

    it('should handle empty recipientIds array', async () => {
      mockAuthFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, count: 0 }),
      });

      const { result } = renderHook(() => useProvaOralAPI());

      let success = false;
      await act(async () => {
        success = await result.current.updateSharing([]);
      });

      expect(mockAuthFetch).toHaveBeenCalledWith('/api/prova-oral/sharing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientIds: [] }),
      });
      expect(success).toBe(true);
    });

    it('should return false on API error', async () => {
      mockAuthFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Server error' }),
      });

      const { result } = renderHook(() => useProvaOralAPI());

      let success = false;
      await act(async () => {
        success = await result.current.updateSharing(['user-1']);
      });

      expect(success).toBe(false);
    });

    it('should handle network errors gracefully', async () => {
      mockAuthFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useProvaOralAPI());

      let success = false;
      await act(async () => {
        success = await result.current.updateSharing(['user-1']);
      });

      expect(success).toBe(false);
    });
  });
});


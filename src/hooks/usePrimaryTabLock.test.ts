/**
 * @file usePrimaryTabLock.test.ts
 * @description Testes REAIS para usePrimaryTabLock - importa e executa o hook de produção
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePrimaryTabLock } from './usePrimaryTabLock';

const LOCK_KEY = 'sentencify-primary-tab-lock';
const TAKEOVER_KEY = 'sentencify-tab-takeover';

// Helper para aguardar microtasks
const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));

describe('usePrimaryTabLock', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.useRealTimers();
  });

  describe('Initialization', () => {
    it('should return isPrimaryTab boolean', () => {
      const { result } = renderHook(() => usePrimaryTabLock());

      expect(typeof result.current.isPrimaryTab).toBe('boolean');
    });

    it('should return tabId string', () => {
      const { result } = renderHook(() => usePrimaryTabLock());

      expect(typeof result.current.tabId).toBe('string');
      expect(result.current.tabId).toMatch(/^tab-\d+-[a-z0-9]+$/);
    });

    it('should generate unique tabId', () => {
      const { result: result1 } = renderHook(() => usePrimaryTabLock());
      const { result: result2 } = renderHook(() => usePrimaryTabLock());

      expect(result1.current.tabId).not.toBe(result2.current.tabId);
    });
  });

  describe('Primary tab claim', () => {
    it('should become primary when no lock exists', async () => {
      const { result } = renderHook(() => usePrimaryTabLock());

      // Wait for useEffect to run
      await act(async () => {
        await flushPromises();
      });

      expect(result.current.isPrimaryTab).toBe(true);
    });

    it('should create lock in localStorage when becoming primary', async () => {
      const { result } = renderHook(() => usePrimaryTabLock());

      await act(async () => {
        await flushPromises();
      });

      expect(result.current.isPrimaryTab).toBe(true);

      const lockStr = localStorage.getItem(LOCK_KEY);
      expect(lockStr).not.toBeNull();

      const lock = JSON.parse(lockStr!);
      expect(lock.tabId).toBe(result.current.tabId);
      expect(lock.timestamp).toBeDefined();
    });

    it('should not become primary when another tab holds lock', async () => {
      // Simulate another tab holding the lock
      const otherTabLock = {
        tabId: 'other-tab-123',
        timestamp: Date.now()
      };
      localStorage.setItem(LOCK_KEY, JSON.stringify(otherTabLock));

      const { result } = renderHook(() => usePrimaryTabLock());

      await act(async () => {
        await flushPromises();
      });

      // Should remain secondary
      expect(result.current.isPrimaryTab).toBe(false);
    });
  });

  describe('Lock expiration', () => {
    it('should claim primary when existing lock is expired (>30s)', async () => {
      // Simulate expired lock from another tab
      const expiredLock = {
        tabId: 'expired-tab',
        timestamp: Date.now() - 35000 // 35 seconds ago
      };
      localStorage.setItem(LOCK_KEY, JSON.stringify(expiredLock));

      const { result } = renderHook(() => usePrimaryTabLock());

      await act(async () => {
        await flushPromises();
      });

      expect(result.current.isPrimaryTab).toBe(true);
    });
  });

  describe('Heartbeat', () => {
    it('should update lock timestamp periodically when primary', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });

      const { result } = renderHook(() => usePrimaryTabLock());

      // Wait for initial effects (uses real setTimeout due to shouldAdvanceTime)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(50);
      });

      expect(result.current.isPrimaryTab).toBe(true);

      const initialLock = JSON.parse(localStorage.getItem(LOCK_KEY)!);
      const initialTimestamp = initialLock.timestamp;

      // Advance time by 10+ seconds (heartbeat interval)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(11000);
      });

      const updatedLock = JSON.parse(localStorage.getItem(LOCK_KEY)!);
      expect(updatedLock.timestamp).toBeGreaterThan(initialTimestamp);
    });
  });

  describe('Lock release', () => {
    it('should release lock on unmount', async () => {
      const { result, unmount } = renderHook(() => usePrimaryTabLock());

      await act(async () => {
        await flushPromises();
      });

      expect(result.current.isPrimaryTab).toBe(true);

      const tabId = result.current.tabId;

      // Verify lock exists
      expect(localStorage.getItem(LOCK_KEY)).not.toBeNull();

      // Unmount
      unmount();

      // Lock should be released
      const lockAfter = localStorage.getItem(LOCK_KEY);
      if (lockAfter) {
        const parsed = JSON.parse(lockAfter);
        // Either lock is removed or it belongs to someone else
        expect(parsed.tabId).not.toBe(tabId);
      }
    });
  });

  describe('Takeover support', () => {
    it('should use saved tabId from sessionStorage if present', () => {
      const savedTabId = 'saved-tab-123';
      sessionStorage.setItem(TAKEOVER_KEY, savedTabId);

      const { result } = renderHook(() => usePrimaryTabLock());

      expect(result.current.tabId).toBe(savedTabId);
    });

    it('should clear takeover key after reading', () => {
      sessionStorage.setItem(TAKEOVER_KEY, 'takeover-tab');

      renderHook(() => usePrimaryTabLock());

      expect(sessionStorage.getItem(TAKEOVER_KEY)).toBeNull();
    });
  });

  describe('Storage event handling', () => {
    it('should respond to lock removal by other tab', async () => {
      // Start as secondary (another tab is primary)
      const otherTabLock = {
        tabId: 'other-tab',
        timestamp: Date.now()
      };
      localStorage.setItem(LOCK_KEY, JSON.stringify(otherTabLock));

      const { result } = renderHook(() => usePrimaryTabLock());

      await act(async () => {
        await flushPromises();
      });

      expect(result.current.isPrimaryTab).toBe(false);

      // Simulate other tab releasing lock
      await act(async () => {
        localStorage.removeItem(LOCK_KEY);
        window.dispatchEvent(new StorageEvent('storage', {
          key: LOCK_KEY,
          newValue: null,
          oldValue: JSON.stringify(otherTabLock)
        }));
        await flushPromises();
      });

      // Should try to claim
      expect(result.current.isPrimaryTab).toBe(true);
    });
  });

  describe('Return stability', () => {
    it('should maintain stable tabId across renders', () => {
      const { result, rerender } = renderHook(() => usePrimaryTabLock());

      const initialTabId = result.current.tabId;

      rerender();

      expect(result.current.tabId).toBe(initialTabId);
    });
  });
});

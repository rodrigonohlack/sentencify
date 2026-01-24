import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSyncManager } from './useSyncManager';
import type { Model } from '../types';

const mockAuthFetch = vi.fn();
const mockSetModels = vi.fn();
const mockAddModel = vi.fn();
const mockUpdateModel = vi.fn();
const mockDeleteModel = vi.fn();

const defaultProps = {
  authFetch: mockAuthFetch,
  isAuthenticated: false, // Start unauthenticated to avoid auto-pull on mount
  models: [] as Model[],
  setModels: mockSetModels,
  addModel: mockAddModel,
  updateModel: mockUpdateModel,
  deleteModel: mockDeleteModel,
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  // Mock navigator.onLine
  Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });
});

afterEach(() => {
  localStorage.clear();
});

describe('useSyncManager', () => {
  describe('initial state', () => {
    it('should start with idle status and no error', () => {
      const { result } = renderHook(() => useSyncManager(defaultProps));
      expect(result.current.syncStatus).toBe('idle');
      expect(result.current.syncError).toBeNull();
      expect(result.current.pendingCount).toBe(0);
    });

    it('should restore lastSyncAt from localStorage', () => {
      localStorage.setItem('sentencify-last-sync', '2024-01-01T00:00:00Z');
      const { result } = renderHook(() => useSyncManager(defaultProps));
      expect(result.current.lastSyncAt).toBe('2024-01-01T00:00:00Z');
    });

    it('should restore pending changes from localStorage', () => {
      const changes = [{ operation: 'create', model: { id: 'model-1', title: 'Test' } }];
      localStorage.setItem('sentencify-pending-changes', JSON.stringify(changes));
      const { result } = renderHook(() => useSyncManager(defaultProps));
      expect(result.current.pendingCount).toBe(1);
    });

    it('should handle corrupted pending changes data', () => {
      localStorage.setItem('sentencify-pending-changes', 'invalid-json');
      const { result } = renderHook(() => useSyncManager(defaultProps));
      expect(result.current.pendingCount).toBe(0);
      expect(localStorage.getItem('sentencify-pending-changes')).toBeNull();
    });

    it('should auto-pull when authenticated', async () => {
      mockAuthFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ models: [], serverTime: '2024-01-01T00:00:00Z', count: 0 }),
      });

      renderHook(() =>
        useSyncManager({ ...defaultProps, isAuthenticated: true })
      );

      // Wait for the initial pull to complete
      await act(async () => {
        await new Promise(r => setTimeout(r, 50));
      });

      expect(mockAuthFetch).toHaveBeenCalledWith('/api/sync/pull', expect.anything());
    });
  });

  describe('pull', () => {
    it('should return failure when not authenticated', async () => {
      const { result } = renderHook(() => useSyncManager(defaultProps));

      let pullResult: unknown;
      await act(async () => {
        pullResult = await result.current.pull();
      });

      expect(pullResult).toEqual({ success: false });
    });

    it('should call authFetch with correct endpoint', async () => {
      mockAuthFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ models: [], serverTime: '2024-01-01T00:00:00Z', count: 0 }),
      });

      renderHook(() =>
        useSyncManager({ ...defaultProps, isAuthenticated: true })
      );

      // Wait for initial pull triggered by useEffect
      await act(async () => {
        await new Promise(r => setTimeout(r, 50));
      });

      expect(mockAuthFetch).toHaveBeenCalledWith('/api/sync/pull', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }));
    });

    it('should update lastSyncAt on successful pull', async () => {
      mockAuthFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ models: [], serverTime: '2024-06-15T12:00:00Z', count: 0 }),
      });

      const { result } = renderHook(() =>
        useSyncManager({ ...defaultProps, isAuthenticated: true })
      );

      await act(async () => {
        await new Promise(r => setTimeout(r, 50));
      });

      expect(result.current.lastSyncAt).toBe('2024-06-15T12:00:00Z');
      expect(localStorage.getItem('sentencify-last-sync')).toBe('2024-06-15T12:00:00Z');
    });

    it('should handle pull error', async () => {
      mockAuthFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Server error' }),
      });

      const { result } = renderHook(() =>
        useSyncManager({ ...defaultProps, isAuthenticated: true })
      );

      await act(async () => {
        await new Promise(r => setTimeout(r, 50));
      });

      expect(result.current.syncError).toBe('Server error');
    });
  });

  describe('push', () => {
    it('should return success with count 0 when no pending changes', async () => {
      const { result } = renderHook(() => useSyncManager(defaultProps));

      let pushResult: unknown;
      await act(async () => {
        pushResult = await result.current.push();
      });

      expect(pushResult).toEqual({ success: true, count: 0 });
    });

    it('should not push when not authenticated', async () => {
      const { result } = renderHook(() => useSyncManager(defaultProps));

      let pushResult: unknown;
      await act(async () => {
        pushResult = await result.current.push();
      });

      expect(pushResult).toEqual({ success: true, count: 0 });
    });
  });

  describe('trackChange', () => {
    it('should track create operation', () => {
      const { result } = renderHook(() => useSyncManager(defaultProps));
      const model = { id: 'new-model', title: 'Test Model' };

      act(() => {
        result.current.trackChange('create', model);
      });

      expect(result.current.pendingCount).toBe(1);
    });

    it('should replace previous operation for same model (create then update stays create)', () => {
      const { result } = renderHook(() => useSyncManager(defaultProps));
      const model = { id: 'model-1', title: 'Test' };

      act(() => {
        result.current.trackChange('create', model);
      });

      act(() => {
        result.current.trackChange('update', { ...model, title: 'Updated' });
      });

      // create + update = still create (model was never synced)
      expect(result.current.pendingCount).toBe(1);
    });

    it('should remove pending create when delete is tracked', () => {
      const { result } = renderHook(() => useSyncManager(defaultProps));
      const model = { id: 'model-1', title: 'Test' };

      act(() => {
        result.current.trackChange('create', model);
      });

      act(() => {
        result.current.trackChange('delete', model);
      });

      // Model was created then deleted before sync - no pending change needed
      expect(result.current.pendingCount).toBe(0);
    });
  });

  describe('addModelWithSync', () => {
    it('should call addModel and track create when authenticated', async () => {
      const newModel = { id: 'new-1', title: 'New', content: 'Content' } as Model;
      mockAddModel.mockReturnValue(newModel);
      // Mock the initial pull
      mockAuthFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ models: [], serverTime: 'now', count: 0 }),
      });

      const { result } = renderHook(() =>
        useSyncManager({ ...defaultProps, isAuthenticated: true })
      );

      await act(async () => {
        await new Promise(r => setTimeout(r, 50));
      });

      act(() => {
        result.current.addModelWithSync({ title: 'New', content: 'Content' });
      });

      expect(mockAddModel).toHaveBeenCalled();
      expect(result.current.pendingCount).toBe(1);
    });

    it('should not track when not authenticated', () => {
      const newModel = { id: 'new-1', title: 'New' } as Model;
      mockAddModel.mockReturnValue(newModel);

      const { result } = renderHook(() => useSyncManager(defaultProps));

      act(() => {
        result.current.addModelWithSync({ title: 'New' });
      });

      expect(result.current.pendingCount).toBe(0);
    });
  });

  describe('updateModelWithSync', () => {
    it('should call updateModel and track update when authenticated', async () => {
      const updated = { id: 'model-1', title: 'Updated' } as Model;
      mockUpdateModel.mockReturnValue(updated);
      mockAuthFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ models: [], serverTime: 'now', count: 0 }),
      });

      const { result } = renderHook(() =>
        useSyncManager({ ...defaultProps, isAuthenticated: true })
      );

      await act(async () => {
        await new Promise(r => setTimeout(r, 50));
      });

      act(() => {
        result.current.updateModelWithSync('model-1', { title: 'Updated' });
      });

      expect(mockUpdateModel).toHaveBeenCalledWith('model-1', { title: 'Updated' });
      expect(result.current.pendingCount).toBe(1);
    });

    it('should not track when update returns null', () => {
      mockUpdateModel.mockReturnValue(null);

      const { result } = renderHook(() => useSyncManager(defaultProps));

      act(() => {
        result.current.updateModelWithSync('nonexistent', { title: 'X' });
      });

      expect(result.current.pendingCount).toBe(0);
    });
  });

  describe('deleteModelWithSync', () => {
    it('should call deleteModel and track delete when authenticated', async () => {
      mockDeleteModel.mockReturnValue(true);
      const models = [{ id: 'model-1', title: 'To Delete' }] as Model[];
      mockAuthFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ models: [], serverTime: 'now', count: 0 }),
      });

      const { result } = renderHook(() =>
        useSyncManager({ ...defaultProps, isAuthenticated: true, models })
      );

      await act(async () => {
        await new Promise(r => setTimeout(r, 50));
      });

      act(() => {
        result.current.deleteModelWithSync('model-1');
      });

      expect(mockDeleteModel).toHaveBeenCalledWith('model-1');
      expect(result.current.pendingCount).toBe(1);
    });

    it('should not track when not authenticated', () => {
      mockDeleteModel.mockReturnValue(true);
      const models = [{ id: 'model-1', title: 'To Delete' }] as Model[];

      const { result } = renderHook(() =>
        useSyncManager({ ...defaultProps, models })
      );

      act(() => {
        result.current.deleteModelWithSync('model-1');
      });

      expect(mockDeleteModel).toHaveBeenCalledWith('model-1');
      expect(result.current.pendingCount).toBe(0);
    });
  });

  describe('sync (full)', () => {
    it('should return failure when not authenticated', async () => {
      const { result } = renderHook(() =>
        useSyncManager({ ...defaultProps, isAuthenticated: false })
      );

      let syncResult: unknown;
      await act(async () => {
        syncResult = await result.current.sync();
      });

      expect(syncResult).toEqual({ success: false });
    });
  });
});

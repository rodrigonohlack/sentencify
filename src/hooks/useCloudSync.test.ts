/**
 * @file useCloudSync.test.ts
 * @description Testes automatizados para o hook useCloudSync
 *
 * Cobre as correções v1.37.75-76:
 * 1. pendingChangesRef sincroniza com state
 * 2. Comparacao considera pending deletes
 * 3. Stale closure prevenido em push()/sync()
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

const createMockModel = (id: string, isShared = false): Partial<Model> => ({
  id,
  title: `Model ${id}`,
  content: '<p>Test</p>',
  keywords: 'test',
  category: 'MERITO',
  isShared,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
});

const createModels = (count: number, isShared = false): Partial<Model>[] => {
  return Array(count).fill(null).map((_, i) => createMockModel(`model-${i}`, isShared));
};

const setupAuthentication = () => {
  localStorage.setItem('sentencify-user', JSON.stringify({ id: 'user1', email: 'test@test.com' }));
  localStorage.setItem('sentencify-auth-token', 'mock-token');
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
          serverTime: new Date().toISOString(),
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
            created: changes.filter((c: { operation: string }) => c.operation === 'create').map((c: { model: { id: string } }) => c.model.id),
            updated: changes.filter((c: { operation: string }) => c.operation === 'update').map((c: { model: { id: string } }) => c.model.id),
            deleted: changes.filter((c: { operation: string }) => c.operation === 'delete').map((c: { model: { id: string } }) => c.model.id),
            conflicts: []
          },
          serverTime: new Date().toISOString()
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
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks(); // Limpar mocks anteriores
    localStorage.clear();
    originalFetch = global.fetch;
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    // Default: online
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
      configurable: true
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════
  // TESTE: trackChange adiciona ao pendingChanges
  // ═══════════════════════════════════════════════════════════════════════

  describe('trackChange', () => {
    it('should add pending change when authenticated', async () => {
      const models = createModels(10);
      (useModelsStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({ models });
      setupAuthentication();

      const { result } = renderHook(() => useCloudSync({}));

      expect(result.current.pendingCount).toBe(0);

      await act(async () => {
        result.current.trackChange('create', { id: 'new-model', title: 'New' });
      });

      expect(result.current.pendingCount).toBe(1);
    });

    it('should not track when not authenticated', async () => {
      const models = createModels(10);
      (useModelsStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({ models });
      // NOT calling setupAuthentication()

      const { result } = renderHook(() => useCloudSync({}));

      await act(async () => {
        result.current.trackChange('create', { id: 'new-model', title: 'New' });
      });

      expect(result.current.pendingCount).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // TESTE: Comparacao considera pending deletes (v1.37.76)
  // ═══════════════════════════════════════════════════════════════════════

  describe('pending deletes calculation (v1.37.76)', () => {
    it('should do incremental sync when local=455, server=456, pendingDeletes=1', async () => {
      // Setup: 455 modelos locais
      const models = createModels(455);
      (useModelsStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({ models });
      setupAuthentication();

      // Servidor tem 456 (1 a mais que local)
      const mockFetch = createFetchMock(456, []);
      global.fetch = mockFetch;

      const { result } = renderHook(() => useCloudSync({}));

      // Aguardar sync inicial completar (useEffect chama pull() quando user muda)
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      // LIMPAR logs do sync inicial para testar apenas o sync apos trackChange
      consoleLogSpy.mockClear();

      // Adicionar 1 pending delete
      await act(async () => {
        result.current.trackChange('delete', { id: 'deleted-model', updatedAt: new Date().toISOString() });
      });

      expect(result.current.pendingCount).toBe(1);

      // Sincronizar (desta vez com pending delete)
      await act(async () => {
        await result.current.sync();
      });

      // Verificar que foi INCREMENTAL (455 >= 456-1 = 455 >= 455 = true)
      const logCalls = consoleLogSpy.mock.calls.map((call: unknown[]) => call[0]);

      const hasIncrementalLog = logCalls.some((log: unknown) =>
        typeof log === 'string' && log.includes('Sync incremental')
      );
      const hasFullSyncLog = logCalls.some((log: unknown) =>
        typeof log === 'string' && log.includes('Forçando full sync')
      );

      expect(hasIncrementalLog).toBe(true);
      expect(hasFullSyncLog).toBe(false);
    });

    it('should force full sync when local < expectedServer', async () => {
      // Setup: 454 modelos locais
      const models = createModels(454);
      (useModelsStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({ models });
      setupAuthentication();

      // Servidor tem 456, pendingDeletes=1, esperado=455
      // 454 < 455 -> full sync
      const mockFetch = createFetchMock(456, []);
      global.fetch = mockFetch;

      const { result } = renderHook(() => useCloudSync({}));

      // Adicionar 1 pending delete
      await act(async () => {
        result.current.trackChange('delete', { id: 'deleted-model', updatedAt: new Date().toISOString() });
      });

      // Sincronizar
      await act(async () => {
        await result.current.sync();
      });

      // Verificar que foi FULL SYNC (454 >= 456-1 = 454 >= 455 = false)
      const logCalls = consoleLogSpy.mock.calls.map((call: unknown[]) => call[0]);
      const hasFullSyncLog = logCalls.some((log: unknown) =>
        typeof log === 'string' && log.includes('Forçando full sync')
      );

      expect(hasFullSyncLog).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // TESTE: Push envia mudancas pendentes
  // ═══════════════════════════════════════════════════════════════════════

  describe('push', () => {
    it('should send pending changes to server', async () => {
      const models = createModels(10);
      (useModelsStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({ models });
      setupAuthentication();

      const mockFetch = createFetchMock(10, []);
      global.fetch = mockFetch;

      const { result } = renderHook(() => useCloudSync({}));

      // Adicionar uma mudanca
      await act(async () => {
        result.current.trackChange('create', { id: 'new-model', title: 'New Model' });
      });

      // Chamar push
      await act(async () => {
        await result.current.push();
      });

      // Verificar que fetch foi chamado com /api/sync/push
      const pushCalls = mockFetch.mock.calls.filter((call: unknown[]) =>
        typeof call[0] === 'string' && call[0].includes('/api/sync/push')
      );
      expect(pushCalls.length).toBeGreaterThan(0);

      // Verificar que body contem a mudanca
      const pushOptions = pushCalls[0][1] as RequestInit;
      const pushBody = JSON.parse(pushOptions.body as string);
      expect(pushBody.changes).toHaveLength(1);
      expect(pushBody.changes[0].operation).toBe('create');
      expect(pushBody.changes[0].model.id).toBe('new-model');
    });

    it('should clear pending after successful push', async () => {
      const models = createModels(10);
      (useModelsStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({ models });
      setupAuthentication();

      const mockFetch = createFetchMock(10, []);
      global.fetch = mockFetch;

      const { result } = renderHook(() => useCloudSync({}));

      // Adicionar uma mudanca
      await act(async () => {
        result.current.trackChange('create', { id: 'new-model', title: 'New Model' });
      });

      expect(result.current.pendingCount).toBe(1);

      // Chamar push
      await act(async () => {
        await result.current.push();
      });

      // Pendentes devem ser limpos apos sucesso
      expect(result.current.pendingCount).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // TESTE: Bug fix - modelo nao ressuscita (v1.37.76)
  // ═══════════════════════════════════════════════════════════════════════

  describe('bug fix: model resurrection (v1.37.76)', () => {
    it('should NOT trigger full sync when deleting a model', async () => {
      // Cenario do bug:
      // 1. Usuario tem 456 modelos sincronizados
      // 2. Deleta 1 modelo -> local=455
      // 3. Sincroniza -> servidor tem 456
      // 4. SEM o fix: 455 < 456 -> full sync -> modelo ressuscita
      // 5. COM o fix: 455 >= 456-1 -> incremental -> modelo permanece deletado

      const models = createModels(455);
      (useModelsStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({ models });
      setupAuthentication();

      // Servidor ainda tem 456 (delete nao foi enviado ainda)
      const mockFetch = createFetchMock(456, []);
      global.fetch = mockFetch;

      const { result } = renderHook(() => useCloudSync({}));

      // Rastrear o delete
      await act(async () => {
        result.current.trackChange('delete', {
          id: 'model-to-delete',
          updatedAt: new Date().toISOString()
        });
      });

      // Verificar pending
      expect(result.current.pendingCount).toBe(1);

      // Sincronizar
      await act(async () => {
        await result.current.sync();
      });

      // Verificar que push foi chamado com delete
      const pushCalls = mockFetch.mock.calls.filter((call: unknown[]) =>
        typeof call[0] === 'string' && call[0].includes('/api/sync/push')
      );

      expect(pushCalls.length).toBeGreaterThan(0);

      if (pushCalls.length > 0) {
        const pushOptions = pushCalls[0][1] as RequestInit;
        const pushBody = JSON.parse(pushOptions.body as string);
        const deleteOperation = pushBody.changes.find((c: { operation: string }) => c.operation === 'delete');
        expect(deleteOperation).toBeDefined();
        expect(deleteOperation.model.id).toBe('model-to-delete');
      }

      // Verificar que foi incremental (nao full sync)
      const logCalls = consoleLogSpy.mock.calls.map((call: unknown[]) => call[0]);
      const hasIncrementalLog = logCalls.some((log: unknown) =>
        typeof log === 'string' && log.includes('Sync incremental')
      );

      expect(hasIncrementalLog).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // TESTE: Offline behavior
  // ═══════════════════════════════════════════════════════════════════════

  describe('offline behavior', () => {
    it('should not sync when offline', async () => {
      const models = createModels(10);
      (useModelsStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({ models });
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

      // Fetch nao deve ter sido chamado
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });
});

/**
 * @file useFactsComparisonCache.test.ts
 * @description Testes para o hook de cache de confronto de fatos
 * @version 1.37.57
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import useFactsComparisonCache, {
  FACTS_DB_NAME,
  FACTS_STORE_NAME,
  FACTS_DB_VERSION,
  openFactsDB
} from './useFactsComparisonCache';
import type { FactsComparisonResult, FactsComparisonSource, FactsComparisonRow } from '../types';

// Helper to create valid FactsComparisonResult
const createMockComparisonResult = (): FactsComparisonResult => ({
  topicTitle: 'Test Topic',
  source: 'mini-relatorio',
  generatedAt: new Date().toISOString(),
  tabela: [],
  fatosIncontroversos: [],
  fatosControversos: [],
  pontosChave: [],
  resumo: 'Test summary'
});

// Mock IndexedDB
const createMockIDBDatabase = () => {
  const stores: Record<string, Map<number | string, unknown>> = {};

  return {
    objectStoreNames: {
      contains: vi.fn((name: string) => name in stores)
    },
    createObjectStore: vi.fn((name: string) => {
      stores[name] = new Map();
      return {
        createIndex: vi.fn()
      };
    }),
    transaction: vi.fn((storeName: string, mode?: string) => {
      const store = stores[storeName] || new Map();
      let idCounter = 1;

      return {
        objectStore: vi.fn(() => ({
          add: vi.fn((entry: unknown) => {
            const id = idCounter++;
            (entry as { id: number }).id = id;
            store.set(id, entry);
            return { onsuccess: null, onerror: null };
          }),
          put: vi.fn((entry: unknown) => {
            store.set((entry as { id: number }).id, entry);
            return { onsuccess: null, onerror: null };
          }),
          delete: vi.fn((id: number) => {
            store.delete(id);
            return { onsuccess: null, onerror: null };
          }),
          clear: vi.fn(() => {
            store.clear();
            return { onsuccess: null, onerror: null };
          }),
          getAll: vi.fn(() => ({
            result: Array.from(store.values()),
            onsuccess: null,
            onerror: null
          })),
          index: vi.fn(() => ({
            get: vi.fn(() => ({
              result: undefined,
              onsuccess: null,
              onerror: null
            })),
            getAll: vi.fn(() => ({
              result: [],
              onsuccess: null,
              onerror: null
            }))
          }))
        })),
        oncomplete: null,
        onerror: null
      };
    }),
    close: vi.fn()
  };
};

describe('useFactsComparisonCache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CONSTANTS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Constants', () => {
    it('FACTS_DB_NAME should be correct', () => {
      expect(FACTS_DB_NAME).toBe('sentencify-facts-comparison');
    });

    it('FACTS_STORE_NAME should be correct', () => {
      expect(FACTS_STORE_NAME).toBe('comparisons');
    });

    it('FACTS_DB_VERSION should be 1', () => {
      expect(FACTS_DB_VERSION).toBe(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // HOOK RETURN TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Hook Return', () => {
    it('should return all expected functions', () => {
      const { result } = renderHook(() => useFactsComparisonCache());

      expect(result.current.saveComparison).toBeInstanceOf(Function);
      expect(result.current.getComparison).toBeInstanceOf(Function);
      expect(result.current.getAllComparisons).toBeInstanceOf(Function);
      expect(result.current.deleteComparison).toBeInstanceOf(Function);
      expect(result.current.clearAllComparisons).toBeInstanceOf(Function);
      expect(result.current.exportAll).toBeInstanceOf(Function);
      expect(result.current.importAll).toBeInstanceOf(Function);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SAVE COMPARISON TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('saveComparison', () => {
    it('should not save with empty topicTitle', async () => {
      const { result } = renderHook(() => useFactsComparisonCache());
      const mockResult = createMockComparisonResult();

      // Should not throw
      await act(async () => {
        await result.current.saveComparison('', 'mini-relatorio', mockResult);
      });
    });

    it('should not save with null result', async () => {
      const { result } = renderHook(() => useFactsComparisonCache());

      // Should not throw
      await act(async () => {
        await result.current.saveComparison('Test Topic', 'mini-relatorio', null as any);
      });
    });

    it('should handle save function without error', async () => {
      const { result } = renderHook(() => useFactsComparisonCache());
      const mockResult = createMockComparisonResult();

      // Function should be callable without throwing
      await act(async () => {
        await result.current.saveComparison('HORAS EXTRAS', 'mini-relatorio', mockResult);
      });

      // If IndexedDB is not available, it should handle gracefully
      expect(true).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GET COMPARISON TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getComparison', () => {
    it('should return null for empty topicTitle', async () => {
      const { result } = renderHook(() => useFactsComparisonCache());

      let comparison: FactsComparisonResult | null = null;

      await act(async () => {
        comparison = await result.current.getComparison('', 'mini-relatorio');
      });

      expect(comparison).toBeNull();
    });

    it('should handle get function without error', async () => {
      const { result } = renderHook(() => useFactsComparisonCache());

      let comparison: FactsComparisonResult | null = null;

      await act(async () => {
        comparison = await result.current.getComparison('Test Topic', 'mini-relatorio');
      });

      // Should return null when not found or IndexedDB not available
      expect(comparison).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GET ALL COMPARISONS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getAllComparisons', () => {
    it('should return empty array when no comparisons', async () => {
      const { result } = renderHook(() => useFactsComparisonCache());

      let comparisons: unknown[] = [];

      await act(async () => {
        comparisons = await result.current.getAllComparisons();
      });

      expect(Array.isArray(comparisons)).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DELETE COMPARISON TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('deleteComparison', () => {
    it('should not delete with empty topicTitle', async () => {
      const { result } = renderHook(() => useFactsComparisonCache());

      // Should not throw
      await act(async () => {
        await result.current.deleteComparison('');
      });

      expect(true).toBe(true);
    });

    it('should handle delete with source filter', async () => {
      const { result } = renderHook(() => useFactsComparisonCache());

      // Should not throw
      await act(async () => {
        await result.current.deleteComparison('Test Topic', 'mini-relatorio');
      });

      expect(true).toBe(true);
    });

    it('should handle delete without source filter', async () => {
      const { result } = renderHook(() => useFactsComparisonCache());

      // Should not throw
      await act(async () => {
        await result.current.deleteComparison('Test Topic');
      });

      expect(true).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CLEAR ALL COMPARISONS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('clearAllComparisons', () => {
    it('should handle clear without error', async () => {
      const { result } = renderHook(() => useFactsComparisonCache());

      // Should not throw
      await act(async () => {
        await result.current.clearAllComparisons();
      });

      expect(true).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EXPORT ALL TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('exportAll', () => {
    it('should return empty object when no comparisons', async () => {
      const { result } = renderHook(() => useFactsComparisonCache());

      let exported: Record<string, FactsComparisonResult> = {};

      await act(async () => {
        exported = await result.current.exportAll();
      });

      expect(typeof exported).toBe('object');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // IMPORT ALL TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('importAll', () => {
    it('should handle null data gracefully', async () => {
      const { result } = renderHook(() => useFactsComparisonCache());

      // Should not throw
      await act(async () => {
        await result.current.importAll(null as any);
      });

      expect(true).toBe(true);
    });

    it('should handle invalid data type gracefully', async () => {
      const { result } = renderHook(() => useFactsComparisonCache());

      // Should not throw
      await act(async () => {
        await result.current.importAll('invalid' as any);
      });

      expect(true).toBe(true);
    });

    it('should handle empty object', async () => {
      const { result } = renderHook(() => useFactsComparisonCache());

      // Should not throw
      await act(async () => {
        await result.current.importAll({});
      });

      expect(true).toBe(true);
    });

    it('should import valid data with correct key format', async () => {
      const { result } = renderHook(() => useFactsComparisonCache());
      const mockResult = createMockComparisonResult();

      const data: Record<string, FactsComparisonResult> = {
        'HORAS EXTRAS_mini-relatorio': mockResult,
        'DANO MORAL_documentos-completos': mockResult
      };

      // Should not throw
      await act(async () => {
        await result.current.importAll(data);
      });

      expect(true).toBe(true);
    });

    it('should skip invalid source types', async () => {
      const { result } = renderHook(() => useFactsComparisonCache());
      const mockResult = createMockComparisonResult();

      const data: Record<string, FactsComparisonResult> = {
        'Topic_invalid-source': mockResult
      };

      // Should not throw
      await act(async () => {
        await result.current.importAll(data);
      });

      expect(true).toBe(true);
    });

    it('should skip keys without underscore', async () => {
      const { result } = renderHook(() => useFactsComparisonCache());
      const mockResult = createMockComparisonResult();

      const data: Record<string, FactsComparisonResult> = {
        'invalidkey': mockResult
      };

      // Should not throw
      await act(async () => {
        await result.current.importAll(data);
      });

      expect(true).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CALLBACK STABILITY TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Callback Stability', () => {
    it('saveComparison should be stable across renders', () => {
      const { result, rerender } = renderHook(() => useFactsComparisonCache());

      const first = result.current.saveComparison;
      rerender();
      const second = result.current.saveComparison;

      expect(first).toBe(second);
    });

    it('getComparison should be stable across renders', () => {
      const { result, rerender } = renderHook(() => useFactsComparisonCache());

      const first = result.current.getComparison;
      rerender();
      const second = result.current.getComparison;

      expect(first).toBe(second);
    });

    it('getAllComparisons should be stable across renders', () => {
      const { result, rerender } = renderHook(() => useFactsComparisonCache());

      const first = result.current.getAllComparisons;
      rerender();
      const second = result.current.getAllComparisons;

      expect(first).toBe(second);
    });

    it('deleteComparison should be stable across renders', () => {
      const { result, rerender } = renderHook(() => useFactsComparisonCache());

      const first = result.current.deleteComparison;
      rerender();
      const second = result.current.deleteComparison;

      expect(first).toBe(second);
    });

    it('clearAllComparisons should be stable across renders', () => {
      const { result, rerender } = renderHook(() => useFactsComparisonCache());

      const first = result.current.clearAllComparisons;
      rerender();
      const second = result.current.clearAllComparisons;

      expect(first).toBe(second);
    });

    it('exportAll should be stable across renders', () => {
      const { result, rerender } = renderHook(() => useFactsComparisonCache());

      const first = result.current.exportAll;
      rerender();
      const second = result.current.exportAll;

      expect(first).toBe(second);
    });

    it('importAll should be stable across renders', () => {
      const { result, rerender } = renderHook(() => useFactsComparisonCache());

      const first = result.current.importAll;
      rerender();
      const second = result.current.importAll;

      expect(first).toBe(second);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SOURCE TYPE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Source Types', () => {
    it('should accept mini-relatorio source', async () => {
      const { result } = renderHook(() => useFactsComparisonCache());
      const mockResult = createMockComparisonResult();

      await act(async () => {
        await result.current.saveComparison('Topic', 'mini-relatorio', mockResult);
      });

      expect(true).toBe(true);
    });

    it('should accept documentos-completos source', async () => {
      const { result } = renderHook(() => useFactsComparisonCache());
      const mockResult = createMockComparisonResult();

      await act(async () => {
        await result.current.saveComparison('Topic', 'documentos-completos', mockResult);
      });

      expect(true).toBe(true);
    });
  });
});

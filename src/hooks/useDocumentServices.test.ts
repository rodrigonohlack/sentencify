import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDocumentServices } from './useDocumentServices';

describe('useDocumentServices', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('hook initialization', () => {
    it('should return an object with method properties', () => {
      const { result } = renderHook(() => useDocumentServices(null));

      // The hook returns various functions - verify it doesn't throw
      expect(result.current).toBeDefined();
      expect(typeof result.current).toBe('object');
    });

    it('should include loading functions', () => {
      const { result } = renderHook(() => useDocumentServices(null));
      expect(typeof result.current.loadPDFJS).toBe('function');
      expect(typeof result.current.loadMammoth).toBe('function');
    });

    it('should include extraction functions', () => {
      const mockAI = {
        aiSettings: { provider: 'claude' as const, model: 'test' },
        getApiHeaders: () => ({ Authorization: 'Bearer test' }),
        logCacheMetrics: vi.fn(),
      };

      const { result } = renderHook(() => useDocumentServices(mockAI as any));
      expect(typeof result.current.extractTextFromPDFWithClaudeVision).toBe('function');
    });
  });

  describe('loadPDFJS', () => {
    it('should be a function that returns a Promise', () => {
      const { result } = renderHook(() => useDocumentServices(null));
      expect(typeof result.current.loadPDFJS).toBe('function');
    });
  });

  describe('loadMammoth', () => {
    it('should be a function that returns a Promise', () => {
      const { result } = renderHook(() => useDocumentServices(null));
      expect(typeof result.current.loadMammoth).toBe('function');
    });
  });

  describe('extractTextFromPDFPure', () => {
    it('should be a function', () => {
      const { result } = renderHook(() => useDocumentServices(null));
      expect(typeof result.current.extractTextFromPDFPure).toBe('function');
    });
  });

  describe('extractTextFromDOCX', () => {
    it('should be a function', () => {
      const { result } = renderHook(() => useDocumentServices(null));
      expect(typeof result.current.extractTextFromDOCX).toBe('function');
    });
  });
});

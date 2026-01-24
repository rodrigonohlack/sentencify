import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSemanticSearchManagement } from './useSemanticSearchManagement';

describe('useSemanticSearchManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('initial state', () => {
    it('should start with empty searchFilesStored', () => {
      const { result } = renderHook(() => useSemanticSearchManagement());
      expect(result.current.searchFilesStored).toEqual([]);
    });

    it('should start with searchModelReady=false', () => {
      const { result } = renderHook(() => useSemanticSearchManagement());
      expect(result.current.searchModelReady).toBe(false);
    });

    it('should start with searchInitializing=false', () => {
      const { result } = renderHook(() => useSemanticSearchManagement());
      expect(result.current.searchInitializing).toBe(false);
    });

    it('should start with searchDownloadProgress=0', () => {
      const { result } = renderHook(() => useSemanticSearchManagement());
      expect(result.current.searchDownloadProgress).toBe(0);
    });

    it('should start with searchEnabled=false by default', () => {
      const { result } = renderHook(() => useSemanticSearchManagement());
      expect(result.current.searchEnabled).toBe(false);
    });
  });

  describe('localStorage persistence', () => {
    it('should read searchEnabled from localStorage', () => {
      localStorage.setItem('searchEnabled', 'true');
      const { result } = renderHook(() => useSemanticSearchManagement());
      expect(result.current.searchEnabled).toBe(true);
    });

    it('should fallback to legacy semanticSearchEnabled key', () => {
      localStorage.setItem('semanticSearchEnabled', 'true');
      const { result } = renderHook(() => useSemanticSearchManagement());
      expect(result.current.searchEnabled).toBe(true);
    });

    it('should prefer searchEnabled over legacy key', () => {
      localStorage.setItem('searchEnabled', 'false');
      localStorage.setItem('semanticSearchEnabled', 'true');
      const { result } = renderHook(() => useSemanticSearchManagement());
      expect(result.current.searchEnabled).toBe(false);
    });

    it('should handle invalid JSON gracefully', () => {
      localStorage.setItem('searchEnabled', '{invalid');
      const { result } = renderHook(() => useSemanticSearchManagement());
      expect(result.current.searchEnabled).toBe(false);
    });
  });

  describe('state setters', () => {
    it('should set searchFilesStored', () => {
      const { result } = renderHook(() => useSemanticSearchManagement());
      act(() => { result.current.setSearchFilesStored(['model.onnx']); });
      expect(result.current.searchFilesStored).toEqual(['model.onnx']);
    });

    it('should set searchModelReady', () => {
      const { result } = renderHook(() => useSemanticSearchManagement());
      act(() => { result.current.setSearchModelReady(true); });
      expect(result.current.searchModelReady).toBe(true);
    });

    it('should set searchInitializing', () => {
      const { result } = renderHook(() => useSemanticSearchManagement());
      act(() => { result.current.setSearchInitializing(true); });
      expect(result.current.searchInitializing).toBe(true);
    });

    it('should set searchDownloadProgress', () => {
      const { result } = renderHook(() => useSemanticSearchManagement());
      act(() => { result.current.setSearchDownloadProgress(50); });
      expect(result.current.searchDownloadProgress).toBe(50);
    });
  });

  describe('setSearchEnabled (with persistence)', () => {
    it('should update state and persist to localStorage', () => {
      const { result } = renderHook(() => useSemanticSearchManagement());

      act(() => { result.current.setSearchEnabled(true); });
      expect(result.current.searchEnabled).toBe(true);
      expect(localStorage.getItem('searchEnabled')).toBe('true');
    });

    it('should persist false value', () => {
      localStorage.setItem('searchEnabled', 'true');
      const { result } = renderHook(() => useSemanticSearchManagement());

      act(() => { result.current.setSearchEnabled(false); });
      expect(result.current.searchEnabled).toBe(false);
      expect(localStorage.getItem('searchEnabled')).toBe('false');
    });
  });
});

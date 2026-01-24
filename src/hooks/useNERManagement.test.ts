import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNERManagement } from './useNERManagement';

describe('useNERManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('initial state', () => {
    it('should start with empty nerFilesStored', () => {
      const { result } = renderHook(() => useNERManagement());
      expect(result.current.nerFilesStored).toEqual([]);
    });

    it('should start with nerModelReady=false', () => {
      const { result } = renderHook(() => useNERManagement());
      expect(result.current.nerModelReady).toBe(false);
    });

    it('should start with nerInitializing=false', () => {
      const { result } = renderHook(() => useNERManagement());
      expect(result.current.nerInitializing).toBe(false);
    });

    it('should start with nerDownloadProgress=0', () => {
      const { result } = renderHook(() => useNERManagement());
      expect(result.current.nerDownloadProgress).toBe(0);
    });

    it('should start with detectingNames=false', () => {
      const { result } = renderHook(() => useNERManagement());
      expect(result.current.detectingNames).toBe(false);
    });

    it('should start with nerEnabled=false by default', () => {
      const { result } = renderHook(() => useNERManagement());
      expect(result.current.nerEnabled).toBe(false);
    });

    it('should start with nerIncludeOrg=false by default', () => {
      const { result } = renderHook(() => useNERManagement());
      expect(result.current.nerIncludeOrg).toBe(false);
    });
  });

  describe('localStorage persistence', () => {
    it('should read nerEnabled from localStorage', () => {
      localStorage.setItem('nerEnabled', 'true');
      const { result } = renderHook(() => useNERManagement());
      expect(result.current.nerEnabled).toBe(true);
    });

    it('should read nerIncludeOrg from localStorage', () => {
      localStorage.setItem('nerIncludeOrg', 'true');
      const { result } = renderHook(() => useNERManagement());
      expect(result.current.nerIncludeOrg).toBe(true);
    });

    it('should handle invalid JSON in localStorage gracefully', () => {
      localStorage.setItem('nerEnabled', 'not-json{');
      const { result } = renderHook(() => useNERManagement());
      expect(result.current.nerEnabled).toBe(false);
    });
  });

  describe('state setters', () => {
    it('should set nerFilesStored', () => {
      const { result } = renderHook(() => useNERManagement());
      act(() => { result.current.setNerFilesStored(['file1.bin', 'file2.bin']); });
      expect(result.current.nerFilesStored).toEqual(['file1.bin', 'file2.bin']);
    });

    it('should set nerModelReady', () => {
      const { result } = renderHook(() => useNERManagement());
      act(() => { result.current.setNerModelReady(true); });
      expect(result.current.nerModelReady).toBe(true);
    });

    it('should set nerInitializing', () => {
      const { result } = renderHook(() => useNERManagement());
      act(() => { result.current.setNerInitializing(true); });
      expect(result.current.nerInitializing).toBe(true);
    });

    it('should set nerDownloadProgress', () => {
      const { result } = renderHook(() => useNERManagement());
      act(() => { result.current.setNerDownloadProgress(75); });
      expect(result.current.nerDownloadProgress).toBe(75);
    });

    it('should set detectingNames', () => {
      const { result } = renderHook(() => useNERManagement());
      act(() => { result.current.setDetectingNames(true); });
      expect(result.current.detectingNames).toBe(true);
    });
  });

  describe('setNerEnabled (with persistence)', () => {
    it('should update state and persist to localStorage', () => {
      const { result } = renderHook(() => useNERManagement());

      act(() => { result.current.setNerEnabled(true); });
      expect(result.current.nerEnabled).toBe(true);
      expect(localStorage.getItem('nerEnabled')).toBe('true');
    });

    it('should persist false value', () => {
      localStorage.setItem('nerEnabled', 'true');
      const { result } = renderHook(() => useNERManagement());

      act(() => { result.current.setNerEnabled(false); });
      expect(result.current.nerEnabled).toBe(false);
      expect(localStorage.getItem('nerEnabled')).toBe('false');
    });
  });

  describe('setNerIncludeOrg (with persistence)', () => {
    it('should update state and persist to localStorage', () => {
      const { result } = renderHook(() => useNERManagement());

      act(() => { result.current.setNerIncludeOrg(true); });
      expect(result.current.nerIncludeOrg).toBe(true);
      expect(localStorage.getItem('nerIncludeOrg')).toBe('true');
    });

    it('should persist false value', () => {
      localStorage.setItem('nerIncludeOrg', 'true');
      const { result } = renderHook(() => useNERManagement());

      act(() => { result.current.setNerIncludeOrg(false); });
      expect(result.current.nerIncludeOrg).toBe(false);
      expect(localStorage.getItem('nerIncludeOrg')).toBe('false');
    });
  });
});

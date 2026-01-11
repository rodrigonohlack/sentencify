/**
 * @file useFeatureFlags.test.ts
 * @description Testes REAIS para useFeatureFlags - importa e executa o hook de produção
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFeatureFlags } from './useFeatureFlags';

const STORAGE_KEY = 'sentencify-feature-flags';

describe('useFeatureFlags', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Initialization', () => {
    it('should initialize with default flags when localStorage is empty', () => {
      const { result } = renderHook(() => useFeatureFlags());

      expect(result.current.flags).toHaveProperty('useIndexedDB');
      expect(result.current.flags).toHaveProperty('syncEnabled');
      expect(result.current.flags.useIndexedDB).toBe(true);
      expect(result.current.flags.syncEnabled).toBe(true);
    });

    it('should restore flags from localStorage on mount', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        useIndexedDB: false,
        customFlag: true
      }));

      const { result } = renderHook(() => useFeatureFlags());

      expect(result.current.flags.useIndexedDB).toBe(false);
      expect(result.current.flags.customFlag).toBe(true);
      // Default flags should still be present
      expect(result.current.flags.syncEnabled).toBe(true);
    });

    it('should handle invalid JSON in localStorage gracefully', () => {
      localStorage.setItem(STORAGE_KEY, 'invalid-json{{{');

      const { result } = renderHook(() => useFeatureFlags());

      // Should fall back to defaults
      expect(result.current.flags.useIndexedDB).toBe(true);
    });
  });

  describe('setFlag', () => {
    it('should update a flag value', () => {
      const { result } = renderHook(() => useFeatureFlags());

      act(() => {
        result.current.setFlag('useIndexedDB', false);
      });

      expect(result.current.flags.useIndexedDB).toBe(false);
    });

    it('should create a new flag if it does not exist', () => {
      const { result } = renderHook(() => useFeatureFlags());

      act(() => {
        result.current.setFlag('newFeature', true);
      });

      expect(result.current.flags.newFeature).toBe(true);
    });

    it('should persist changes to localStorage', () => {
      const { result } = renderHook(() => useFeatureFlags());

      act(() => {
        result.current.setFlag('testFlag', true);
      });

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      expect(stored.testFlag).toBe(true);
    });
  });

  describe('isEnabled', () => {
    it('should return true for enabled flags', () => {
      const { result } = renderHook(() => useFeatureFlags());

      expect(result.current.isEnabled('useIndexedDB')).toBe(true);
    });

    it('should return false for disabled flags', () => {
      const { result } = renderHook(() => useFeatureFlags());

      act(() => {
        result.current.setFlag('useIndexedDB', false);
      });

      expect(result.current.isEnabled('useIndexedDB')).toBe(false);
    });

    it('should return false for non-existent flags', () => {
      const { result } = renderHook(() => useFeatureFlags());

      expect(result.current.isEnabled('nonExistentFlag')).toBe(false);
    });
  });

  describe('resetFlags', () => {
    it('should reset all flags to defaults', () => {
      const { result } = renderHook(() => useFeatureFlags());

      // Modify some flags
      act(() => {
        result.current.setFlag('useIndexedDB', false);
        result.current.setFlag('customFlag', true);
      });

      // Reset
      act(() => {
        result.current.resetFlags();
      });

      expect(result.current.flags.useIndexedDB).toBe(true);
      expect(result.current.flags.customFlag).toBeUndefined();
    });
  });

  describe('getAllFlags', () => {
    it('should return a copy of all flags', () => {
      const { result } = renderHook(() => useFeatureFlags());

      const allFlags = result.current.getAllFlags();

      expect(allFlags).toEqual(result.current.flags);
      // Should be a copy, not the same reference
      expect(allFlags).not.toBe(result.current.flags);
    });
  });
});

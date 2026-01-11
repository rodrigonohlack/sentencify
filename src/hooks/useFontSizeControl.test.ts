/**
 * @file useFontSizeControl.test.ts
 * @description Testes REAIS para useFontSizeControl - importa e executa o hook de produção
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFontSizeControl } from './useFontSizeControl';

const STORAGE_KEY = 'sentencify-editor-fontsize';

describe('useFontSizeControl', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Initialization', () => {
    it('should initialize with "normal" fontSize by default', () => {
      const { result } = renderHook(() => useFontSizeControl());

      expect(result.current.fontSize).toBe('normal');
    });

    it('should restore fontSize from localStorage', () => {
      localStorage.setItem(STORAGE_KEY, 'larger');

      const { result } = renderHook(() => useFontSizeControl());

      expect(result.current.fontSize).toBe('larger');
    });

    it('should fall back to "normal" for invalid localStorage value', () => {
      localStorage.setItem(STORAGE_KEY, 'invalid-size');

      const { result } = renderHook(() => useFontSizeControl());

      expect(result.current.fontSize).toBe('normal');
    });

    it('should provide currentPreset matching fontSize', () => {
      const { result } = renderHook(() => useFontSizeControl());

      expect(result.current.currentPreset).toBeDefined();
      expect(result.current.currentPreset).toHaveProperty('fontSize');
      expect(result.current.currentPreset).toHaveProperty('label');
    });
  });

  describe('setFontSize', () => {
    it('should update fontSize to valid preset', () => {
      const { result } = renderHook(() => useFontSizeControl());

      act(() => {
        result.current.setFontSize('larger');
      });

      expect(result.current.fontSize).toBe('larger');
    });

    it('should fall back to "normal" for invalid preset', () => {
      const { result } = renderHook(() => useFontSizeControl());

      act(() => {
        result.current.setFontSize('invalid');
      });

      expect(result.current.fontSize).toBe('normal');
    });

    it('should persist fontSize to localStorage', () => {
      const { result } = renderHook(() => useFontSizeControl());

      act(() => {
        result.current.setFontSize('largest');
      });

      expect(localStorage.getItem(STORAGE_KEY)).toBe('largest');
    });

    it('should dispatch fontsize-changed event', () => {
      const { result } = renderHook(() => useFontSizeControl());
      const eventHandler = vi.fn();

      window.addEventListener('fontsize-changed', eventHandler);

      act(() => {
        result.current.setFontSize('larger');
      });

      expect(eventHandler).toHaveBeenCalled();

      window.removeEventListener('fontsize-changed', eventHandler);
    });
  });

  describe('Cross-component sync', () => {
    it('should respond to fontsize-changed events from other components', () => {
      const { result } = renderHook(() => useFontSizeControl());

      act(() => {
        window.dispatchEvent(new CustomEvent('fontsize-changed', {
          detail: { fontSize: 'largest' }
        }));
      });

      expect(result.current.fontSize).toBe('largest');
    });
  });

  describe('Preset values', () => {
    it('should have fontSize in currentPreset', () => {
      const { result } = renderHook(() => useFontSizeControl());

      expect(typeof result.current.currentPreset.fontSize).toBe('string');
    });

    it('should have label in currentPreset', () => {
      const { result } = renderHook(() => useFontSizeControl());

      expect(typeof result.current.currentPreset.label).toBe('string');
    });
  });
});

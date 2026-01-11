/**
 * @file useSpacingControl.test.ts
 * @description Testes REAIS para useSpacingControl - importa e executa o hook de produção
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSpacingControl } from './useSpacingControl';

const STORAGE_KEY = 'sentencify-paragraph-spacing';

describe('useSpacingControl', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Initialization', () => {
    it('should initialize with "normal" spacing by default', () => {
      const { result } = renderHook(() => useSpacingControl());

      expect(result.current.spacing).toBe('normal');
    });

    it('should restore spacing from localStorage', () => {
      localStorage.setItem(STORAGE_KEY, 'compact');

      const { result } = renderHook(() => useSpacingControl());

      expect(result.current.spacing).toBe('compact');
    });

    it('should fall back to "normal" for invalid localStorage value', () => {
      localStorage.setItem(STORAGE_KEY, 'invalid-spacing');

      const { result } = renderHook(() => useSpacingControl());

      expect(result.current.spacing).toBe('normal');
    });

    it('should provide currentPreset matching spacing', () => {
      const { result } = renderHook(() => useSpacingControl());

      expect(result.current.currentPreset).toBeDefined();
      expect(result.current.currentPreset).toHaveProperty('lineHeight');
      expect(result.current.currentPreset).toHaveProperty('paragraphMargin');
    });
  });

  describe('setSpacing', () => {
    it('should update spacing to valid preset', () => {
      const { result } = renderHook(() => useSpacingControl());

      act(() => {
        result.current.setSpacing('comfortable');
      });

      expect(result.current.spacing).toBe('comfortable');
    });

    it('should fall back to "normal" for invalid preset', () => {
      const { result } = renderHook(() => useSpacingControl());

      act(() => {
        result.current.setSpacing('invalid');
      });

      expect(result.current.spacing).toBe('normal');
    });

    it('should persist spacing to localStorage', () => {
      const { result } = renderHook(() => useSpacingControl());

      act(() => {
        result.current.setSpacing('wide');
      });

      expect(localStorage.getItem(STORAGE_KEY)).toBe('wide');
    });

    it('should dispatch spacing-changed event', () => {
      const { result } = renderHook(() => useSpacingControl());
      const eventHandler = vi.fn();

      window.addEventListener('spacing-changed', eventHandler);

      act(() => {
        result.current.setSpacing('compact');
      });

      expect(eventHandler).toHaveBeenCalled();

      window.removeEventListener('spacing-changed', eventHandler);
    });
  });

  describe('Cross-component sync', () => {
    it('should respond to spacing-changed events from other components', () => {
      const { result } = renderHook(() => useSpacingControl());

      act(() => {
        window.dispatchEvent(new CustomEvent('spacing-changed', {
          detail: { spacing: 'comfortable' }
        }));
      });

      expect(result.current.spacing).toBe('comfortable');
    });
  });

  describe('Preset values', () => {
    it('should have lineHeight in currentPreset', () => {
      const { result } = renderHook(() => useSpacingControl());

      expect(typeof result.current.currentPreset.lineHeight).toBe('string');
    });

    it('should have paragraphMargin in currentPreset', () => {
      const { result } = renderHook(() => useSpacingControl());

      expect(typeof result.current.currentPreset.paragraphMargin).toBe('string');
    });
  });
});

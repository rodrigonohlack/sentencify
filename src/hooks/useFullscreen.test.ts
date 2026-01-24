/**
 * @file useFullscreen.test.ts
 * @description Testes REAIS para useFullscreen - importa e executa o hook de produção
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFullscreen } from './useFullscreen';

describe('useFullscreen', () => {
  beforeEach(() => {
    document.body.style.overflow = '';
  });

  afterEach(() => {
    document.body.style.overflow = '';
  });

  describe('Initialization', () => {
    it('should initialize with fullscreen disabled', () => {
      const { result } = renderHook(() => useFullscreen());

      expect(result.current.isFullscreen).toBe(false);
    });

    it('should initialize with split mode disabled', () => {
      const { result } = renderHook(() => useFullscreen());

      expect(result.current.isSplitMode).toBe(false);
    });

    it('should initialize split position at 70%', () => {
      const { result } = renderHook(() => useFullscreen());

      expect(result.current.splitPosition).toBe(70);
    });

    it('should provide a container ref', () => {
      const { result } = renderHook(() => useFullscreen());

      expect(result.current.containerRef).toBeDefined();
      expect(result.current.containerRef.current).toBeNull();
    });
  });

  describe('toggleFullscreen', () => {
    it('should enable fullscreen when toggled', () => {
      const { result } = renderHook(() => useFullscreen());

      act(() => {
        result.current.toggleFullscreen();
      });

      expect(result.current.isFullscreen).toBe(true);
    });

    it('should disable fullscreen when toggled again', () => {
      const { result } = renderHook(() => useFullscreen());

      act(() => {
        result.current.toggleFullscreen();
      });

      act(() => {
        result.current.toggleFullscreen();
      });

      expect(result.current.isFullscreen).toBe(false);
    });

    it('should close split mode when exiting fullscreen', () => {
      const { result } = renderHook(() => useFullscreen());

      // Enter fullscreen and enable split
      act(() => {
        result.current.toggleFullscreen();
      });
      act(() => {
        result.current.toggleSplitMode();
      });

      expect(result.current.isSplitMode).toBe(true);

      // Exit fullscreen - should also close split
      act(() => {
        result.current.toggleFullscreen();
      });

      expect(result.current.isSplitMode).toBe(false);
    });

    it('should set body overflow hidden when fullscreen', () => {
      const { result } = renderHook(() => useFullscreen());

      act(() => {
        result.current.toggleFullscreen();
      });

      expect(document.body.style.overflow).toBe('hidden');
    });

    it('should restore body overflow when exiting fullscreen', () => {
      const { result } = renderHook(() => useFullscreen());

      act(() => {
        result.current.toggleFullscreen();
      });
      act(() => {
        result.current.toggleFullscreen();
      });

      expect(document.body.style.overflow).toBe('');
    });
  });

  describe('toggleSplitMode', () => {
    it('should enable split mode when toggled', () => {
      const { result } = renderHook(() => useFullscreen());

      act(() => {
        result.current.toggleSplitMode();
      });

      expect(result.current.isSplitMode).toBe(true);
    });

    it('should disable split mode when toggled again', () => {
      const { result } = renderHook(() => useFullscreen());

      act(() => {
        result.current.toggleSplitMode();
      });
      act(() => {
        result.current.toggleSplitMode();
      });

      expect(result.current.isSplitMode).toBe(false);
    });
  });

  describe('handleSplitDrag', () => {
    it('should be a function', () => {
      const { result } = renderHook(() => useFullscreen());

      expect(typeof result.current.handleSplitDrag).toBe('function');
    });

    it('should not throw when containerRef is null', () => {
      const { result } = renderHook(() => useFullscreen());
      const event = new MouseEvent('mousemove', { clientX: 500 });
      expect(() => result.current.handleSplitDrag(event)).not.toThrow();
    });

    it('should update splitPosition based on mouse position', () => {
      const { result } = renderHook(() => useFullscreen());

      const mockElement = document.createElement('div');
      Object.defineProperty(mockElement, 'getBoundingClientRect', {
        value: () => ({ left: 0, width: 1000, top: 0, right: 1000, bottom: 500, height: 500 }),
      });
      (result.current.containerRef as any).current = mockElement;

      const event = new MouseEvent('mousemove', { clientX: 500 });
      act(() => { result.current.handleSplitDrag(event); });
      expect(result.current.splitPosition).toBe(50);
    });

    it('should clamp position to minimum 20%', () => {
      const { result } = renderHook(() => useFullscreen());

      const mockElement = document.createElement('div');
      Object.defineProperty(mockElement, 'getBoundingClientRect', {
        value: () => ({ left: 0, width: 1000, top: 0, right: 1000, bottom: 500, height: 500 }),
      });
      (result.current.containerRef as any).current = mockElement;

      const event = new MouseEvent('mousemove', { clientX: 50 });
      act(() => { result.current.handleSplitDrag(event); });
      expect(result.current.splitPosition).toBe(20);
    });

    it('should clamp position to maximum 80%', () => {
      const { result } = renderHook(() => useFullscreen());

      const mockElement = document.createElement('div');
      Object.defineProperty(mockElement, 'getBoundingClientRect', {
        value: () => ({ left: 0, width: 1000, top: 0, right: 1000, bottom: 500, height: 500 }),
      });
      (result.current.containerRef as any).current = mockElement;

      const event = new MouseEvent('mousemove', { clientX: 950 });
      act(() => { result.current.handleSplitDrag(event); });
      expect(result.current.splitPosition).toBe(80);
    });
  });

  describe('keyboard shortcuts', () => {
    it('should exit split mode on Escape when split is active', () => {
      const { result } = renderHook(() => useFullscreen());

      act(() => { result.current.toggleFullscreen(); });
      act(() => { result.current.toggleSplitMode(); });

      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      });

      expect(result.current.isSplitMode).toBe(false);
      expect(result.current.isFullscreen).toBe(true);
    });

    it('should exit fullscreen on Escape when not in split mode', () => {
      const { result } = renderHook(() => useFullscreen());

      act(() => { result.current.toggleFullscreen(); });

      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      });

      expect(result.current.isFullscreen).toBe(false);
    });

    it('should toggle split with Ctrl+M when fullscreen', () => {
      const { result } = renderHook(() => useFullscreen());

      act(() => { result.current.toggleFullscreen(); });

      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'm', ctrlKey: true, bubbles: true }));
      });

      expect(result.current.isSplitMode).toBe(true);
    });

    it('should not toggle split with Ctrl+M when not fullscreen', () => {
      const { result } = renderHook(() => useFullscreen());

      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'm', ctrlKey: true, bubbles: true }));
      });

      expect(result.current.isSplitMode).toBe(false);
    });
  });

  describe('Return type stability', () => {
    it('should return all expected properties', () => {
      const { result } = renderHook(() => useFullscreen());

      expect(result.current).toHaveProperty('isFullscreen');
      expect(result.current).toHaveProperty('toggleFullscreen');
      expect(result.current).toHaveProperty('isSplitMode');
      expect(result.current).toHaveProperty('toggleSplitMode');
      expect(result.current).toHaveProperty('splitPosition');
      expect(result.current).toHaveProperty('handleSplitDrag');
      expect(result.current).toHaveProperty('containerRef');
    });
  });
});

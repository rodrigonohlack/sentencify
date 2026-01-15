/**
 * @file useThemeManagement.test.ts
 * @description Testes para o hook de gerenciamento de tema
 * @version 1.37.57
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useThemeManagement } from './useThemeManagement';

describe('useThemeManagement', () => {
  // Mock localStorage and document
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIAL STATE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Initial State', () => {
    it('should start with dark theme by default', () => {
      const { result } = renderHook(() => useThemeManagement());

      expect(result.current.appTheme).toBe('dark');
      expect(result.current.isDarkMode).toBe(true);
    });

    it('should restore dark theme from localStorage', () => {
      localStorage.setItem('sentencify-app-theme', 'dark');

      const { result } = renderHook(() => useThemeManagement());

      expect(result.current.appTheme).toBe('dark');
      expect(result.current.isDarkMode).toBe(true);
    });

    it('should restore light theme from localStorage', () => {
      localStorage.setItem('sentencify-app-theme', 'light');

      const { result } = renderHook(() => useThemeManagement());

      expect(result.current.appTheme).toBe('light');
      expect(result.current.isDarkMode).toBe(false);
    });

    it('should fallback to dark for invalid localStorage value', () => {
      localStorage.setItem('sentencify-app-theme', 'invalid');

      const { result } = renderHook(() => useThemeManagement());

      expect(result.current.appTheme).toBe('dark');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TOGGLE THEME TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('toggleAppTheme', () => {
    it('should toggle from dark to light', () => {
      const { result } = renderHook(() => useThemeManagement());

      expect(result.current.appTheme).toBe('dark');

      act(() => {
        result.current.toggleAppTheme();
      });

      expect(result.current.appTheme).toBe('light');
      expect(result.current.isDarkMode).toBe(false);
    });

    it('should toggle from light to dark', () => {
      localStorage.setItem('sentencify-app-theme', 'light');

      const { result } = renderHook(() => useThemeManagement());

      expect(result.current.appTheme).toBe('light');

      act(() => {
        result.current.toggleAppTheme();
      });

      expect(result.current.appTheme).toBe('dark');
      expect(result.current.isDarkMode).toBe(true);
    });

    it('should toggle multiple times', () => {
      const { result } = renderHook(() => useThemeManagement());

      expect(result.current.appTheme).toBe('dark');

      act(() => {
        result.current.toggleAppTheme();
      });
      expect(result.current.appTheme).toBe('light');

      act(() => {
        result.current.toggleAppTheme();
      });
      expect(result.current.appTheme).toBe('dark');

      act(() => {
        result.current.toggleAppTheme();
      });
      expect(result.current.appTheme).toBe('light');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TOGGLE EDITOR THEME (ALIAS) TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('toggleEditorTheme (alias)', () => {
    it('should work the same as toggleAppTheme', () => {
      const { result } = renderHook(() => useThemeManagement());

      expect(result.current.appTheme).toBe('dark');

      act(() => {
        result.current.toggleEditorTheme();
      });

      expect(result.current.appTheme).toBe('light');
      expect(result.current.editorTheme).toBe('light');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DERIVED STATE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Derived State', () => {
    it('isDarkMode should be true when theme is dark', () => {
      const { result } = renderHook(() => useThemeManagement());

      expect(result.current.isDarkMode).toBe(true);
    });

    it('isDarkMode should be false when theme is light', () => {
      localStorage.setItem('sentencify-app-theme', 'light');

      const { result } = renderHook(() => useThemeManagement());

      expect(result.current.isDarkMode).toBe(false);
    });

    it('editorTheme should mirror appTheme', () => {
      const { result } = renderHook(() => useThemeManagement());

      expect(result.current.editorTheme).toBe(result.current.appTheme);

      act(() => {
        result.current.toggleAppTheme();
      });

      expect(result.current.editorTheme).toBe(result.current.appTheme);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PERSISTENCE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Persistence', () => {
    it('should persist theme to localStorage on toggle', () => {
      const { result } = renderHook(() => useThemeManagement());

      act(() => {
        result.current.toggleAppTheme();
      });

      expect(localStorage.getItem('sentencify-app-theme')).toBe('light');
    });

    it('should persist initial theme to localStorage', () => {
      renderHook(() => useThemeManagement());

      expect(localStorage.getItem('sentencify-app-theme')).toBe('dark');
    });

    it('should update localStorage on each toggle', () => {
      const { result } = renderHook(() => useThemeManagement());

      act(() => {
        result.current.toggleAppTheme();
      });
      expect(localStorage.getItem('sentencify-app-theme')).toBe('light');

      act(() => {
        result.current.toggleAppTheme();
      });
      expect(localStorage.getItem('sentencify-app-theme')).toBe('dark');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DOM ATTRIBUTE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('DOM Attribute', () => {
    it('should set data-theme attribute on document element', () => {
      renderHook(() => useThemeManagement());

      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('should update data-theme attribute on toggle', () => {
      const { result } = renderHook(() => useThemeManagement());

      act(() => {
        result.current.toggleAppTheme();
      });

      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });

    it('should set data-theme for light when restored from localStorage', () => {
      localStorage.setItem('sentencify-app-theme', 'light');

      renderHook(() => useThemeManagement());

      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CALLBACK STABILITY TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Callback Stability', () => {
    it('toggleAppTheme should be stable across renders', () => {
      const { result, rerender } = renderHook(() => useThemeManagement());

      const firstToggle = result.current.toggleAppTheme;
      rerender();
      const secondToggle = result.current.toggleAppTheme;

      expect(firstToggle).toBe(secondToggle);
    });

    it('toggleEditorTheme should be stable and same as toggleAppTheme', () => {
      const { result } = renderHook(() => useThemeManagement());

      expect(result.current.toggleEditorTheme).toBe(result.current.toggleAppTheme);
    });
  });
});

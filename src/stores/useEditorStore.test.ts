/**
 * @file useEditorStore.test.ts
 * @description Testes completos para o store de configurações do editor
 * @version 1.40.05
 *
 * Cobre: tema, fontSize, spacing, quillReady, quillError, isDirty,
 * actions e selectors.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  useEditorStore,
  selectEditorTheme,
  selectFontSize,
  selectSpacing,
  selectQuillReady,
  selectQuillError,
  selectIsDirty,
} from './useEditorStore';
import type { EditorTheme, EditorFontSize, EditorSpacing } from './useEditorStore';

describe('useEditorStore', () => {
  // Reset store before each test
  beforeEach(() => {
    const store = useEditorStore.getState();
    store.setEditorTheme('dark');
    store.setFontSize('normal');
    store.setSpacing('normal');
    store.setQuillReady(false);
    store.setQuillError(null);
    store.setIsDirty(false);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIAL STATE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Initial State', () => {
    it('should have correct initial values after reset', () => {
      const state = useEditorStore.getState();

      expect(state.editorTheme).toBe('dark');
      expect(state.fontSize).toBe('normal');
      expect(state.spacing).toBe('normal');
      expect(state.quillReady).toBe(false);
      expect(state.quillError).toBeNull();
      expect(state.isDirty).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // THEME TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Editor Theme', () => {
    it('should set editor theme to light', () => {
      useEditorStore.getState().setEditorTheme('light');

      expect(useEditorStore.getState().editorTheme).toBe('light');
    });

    it('should set editor theme to dark', () => {
      useEditorStore.getState().setEditorTheme('light');
      useEditorStore.getState().setEditorTheme('dark');

      expect(useEditorStore.getState().editorTheme).toBe('dark');
    });

    it('should toggle editor theme from dark to light', () => {
      useEditorStore.getState().setEditorTheme('dark');
      useEditorStore.getState().toggleEditorTheme();

      expect(useEditorStore.getState().editorTheme).toBe('light');
    });

    it('should toggle editor theme from light to dark', () => {
      useEditorStore.getState().setEditorTheme('light');
      useEditorStore.getState().toggleEditorTheme();

      expect(useEditorStore.getState().editorTheme).toBe('dark');
    });

    it('should toggle multiple times correctly', () => {
      useEditorStore.getState().setEditorTheme('dark');

      useEditorStore.getState().toggleEditorTheme();
      expect(useEditorStore.getState().editorTheme).toBe('light');

      useEditorStore.getState().toggleEditorTheme();
      expect(useEditorStore.getState().editorTheme).toBe('dark');

      useEditorStore.getState().toggleEditorTheme();
      expect(useEditorStore.getState().editorTheme).toBe('light');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FONT SIZE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Font Size', () => {
    it('should set font size to small', () => {
      useEditorStore.getState().setFontSize('small');

      expect(useEditorStore.getState().fontSize).toBe('small');
    });

    it('should set font size to normal', () => {
      useEditorStore.getState().setFontSize('small');
      useEditorStore.getState().setFontSize('normal');

      expect(useEditorStore.getState().fontSize).toBe('normal');
    });

    it('should set font size to large', () => {
      useEditorStore.getState().setFontSize('large');

      expect(useEditorStore.getState().fontSize).toBe('large');
    });

    it('should allow cycling through all font sizes', () => {
      const sizes: EditorFontSize[] = ['small', 'normal', 'large'];

      sizes.forEach((size) => {
        useEditorStore.getState().setFontSize(size);
        expect(useEditorStore.getState().fontSize).toBe(size);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SPACING TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Spacing', () => {
    it('should set spacing to compact', () => {
      useEditorStore.getState().setSpacing('compact');

      expect(useEditorStore.getState().spacing).toBe('compact');
    });

    it('should set spacing to normal', () => {
      useEditorStore.getState().setSpacing('compact');
      useEditorStore.getState().setSpacing('normal');

      expect(useEditorStore.getState().spacing).toBe('normal');
    });

    it('should set spacing to wide', () => {
      useEditorStore.getState().setSpacing('wide');

      expect(useEditorStore.getState().spacing).toBe('wide');
    });

    it('should allow cycling through all spacing options', () => {
      const spacings: EditorSpacing[] = ['compact', 'normal', 'wide'];

      spacings.forEach((spacing) => {
        useEditorStore.getState().setSpacing(spacing);
        expect(useEditorStore.getState().spacing).toBe(spacing);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // QUILL READY STATE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Quill Ready State', () => {
    it('should set quillReady to true', () => {
      useEditorStore.getState().setQuillReady(true);

      expect(useEditorStore.getState().quillReady).toBe(true);
    });

    it('should set quillReady to false', () => {
      useEditorStore.getState().setQuillReady(true);
      useEditorStore.getState().setQuillReady(false);

      expect(useEditorStore.getState().quillReady).toBe(false);
    });

    it('should set quillError with Error object', () => {
      const error = new Error('Quill initialization failed');
      useEditorStore.getState().setQuillError(error);

      expect(useEditorStore.getState().quillError).toBe(error);
    });

    it('should set quillError with string', () => {
      useEditorStore.getState().setQuillError('Failed to load Quill');

      expect(useEditorStore.getState().quillError).toBe('Failed to load Quill');
    });

    it('should clear quillError by setting to null', () => {
      useEditorStore.getState().setQuillError('Some error');
      useEditorStore.getState().setQuillError(null);

      expect(useEditorStore.getState().quillError).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DIRTY STATE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Dirty State', () => {
    it('should set isDirty to true', () => {
      useEditorStore.getState().setIsDirty(true);

      expect(useEditorStore.getState().isDirty).toBe(true);
    });

    it('should set isDirty to false', () => {
      useEditorStore.getState().setIsDirty(true);
      useEditorStore.getState().setIsDirty(false);

      expect(useEditorStore.getState().isDirty).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RESET EPHEMERAL STATE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Reset Ephemeral State', () => {
    it('should reset quillReady, quillError, and isDirty', () => {
      useEditorStore.getState().setQuillReady(true);
      useEditorStore.getState().setQuillError('Some error');
      useEditorStore.getState().setIsDirty(true);

      useEditorStore.getState().resetEphemeralState();

      const state = useEditorStore.getState();
      expect(state.quillReady).toBe(false);
      expect(state.quillError).toBeNull();
      expect(state.isDirty).toBe(false);
    });

    it('should NOT reset theme, fontSize, or spacing', () => {
      useEditorStore.getState().setEditorTheme('light');
      useEditorStore.getState().setFontSize('large');
      useEditorStore.getState().setSpacing('wide');
      useEditorStore.getState().setQuillReady(true);

      useEditorStore.getState().resetEphemeralState();

      const state = useEditorStore.getState();
      expect(state.editorTheme).toBe('light');
      expect(state.fontSize).toBe('large');
      expect(state.spacing).toBe('wide');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SELECTOR TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Selectors', () => {
    it('selectEditorTheme should return correct theme', () => {
      useEditorStore.getState().setEditorTheme('light');

      const theme = selectEditorTheme(useEditorStore.getState());
      expect(theme).toBe('light');
    });

    it('selectFontSize should return correct font size', () => {
      useEditorStore.getState().setFontSize('large');

      const fontSize = selectFontSize(useEditorStore.getState());
      expect(fontSize).toBe('large');
    });

    it('selectSpacing should return correct spacing', () => {
      useEditorStore.getState().setSpacing('compact');

      const spacing = selectSpacing(useEditorStore.getState());
      expect(spacing).toBe('compact');
    });

    it('selectQuillReady should return correct ready state', () => {
      useEditorStore.getState().setQuillReady(true);

      const ready = selectQuillReady(useEditorStore.getState());
      expect(ready).toBe(true);
    });

    it('selectQuillError should return correct error', () => {
      const error = new Error('Test error');
      useEditorStore.getState().setQuillError(error);

      const quillError = selectQuillError(useEditorStore.getState());
      expect(quillError).toBe(error);
    });

    it('selectIsDirty should return correct dirty state', () => {
      useEditorStore.getState().setIsDirty(true);

      const dirty = selectIsDirty(useEditorStore.getState());
      expect(dirty).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // COMBINED STATE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Combined State', () => {
    it('should handle multiple state changes in sequence', () => {
      const store = useEditorStore.getState();

      store.setEditorTheme('light');
      store.setFontSize('small');
      store.setSpacing('wide');
      store.setQuillReady(true);
      store.setIsDirty(true);

      const state = useEditorStore.getState();
      expect(state.editorTheme).toBe('light');
      expect(state.fontSize).toBe('small');
      expect(state.spacing).toBe('wide');
      expect(state.quillReady).toBe(true);
      expect(state.isDirty).toBe(true);
    });

    it('should maintain state independence', () => {
      const store = useEditorStore.getState();

      // Change one property
      store.setEditorTheme('light');

      // Verify others are unchanged
      const state = useEditorStore.getState();
      expect(state.editorTheme).toBe('light');
      expect(state.fontSize).toBe('normal');
      expect(state.spacing).toBe('normal');
      expect(state.quillReady).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TYPE SAFETY TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Type Safety', () => {
    it('should accept valid EditorTheme values', () => {
      const themes: EditorTheme[] = ['dark', 'light'];

      themes.forEach((theme) => {
        useEditorStore.getState().setEditorTheme(theme);
        expect(useEditorStore.getState().editorTheme).toBe(theme);
      });
    });

    it('should accept valid EditorFontSize values', () => {
      const sizes: EditorFontSize[] = ['small', 'normal', 'large'];

      sizes.forEach((size) => {
        useEditorStore.getState().setFontSize(size);
        expect(useEditorStore.getState().fontSize).toBe(size);
      });
    });

    it('should accept valid EditorSpacing values', () => {
      const spacings: EditorSpacing[] = ['compact', 'normal', 'wide'];

      spacings.forEach((spacing) => {
        useEditorStore.getState().setSpacing(spacing);
        expect(useEditorStore.getState().spacing).toBe(spacing);
      });
    });
  });
});

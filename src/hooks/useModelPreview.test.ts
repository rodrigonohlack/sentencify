/**
 * @file useModelPreview.test.ts
 * @description Testes para o hook de preview e edição de modelos
 * @version 1.37.57
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useModelPreview } from './useModelPreview';
import type { Model } from '../types';

describe('useModelPreview', () => {
  // Mock model for testing
  const createMockModel = (overrides: Partial<Model> = {}): Model => ({
    id: `model-${Date.now()}-${Math.random()}`,
    title: 'Test Model',
    content: '<p>Test content</p>',
    keywords: ['test', 'mock'],
    category: 'Mérito',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIAL STATE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Initial State', () => {
    it('should start with null previewingModel', () => {
      const { result } = renderHook(() => useModelPreview());

      expect(result.current.previewingModel).toBeNull();
    });

    it('should start with isPreviewOpen as false', () => {
      const { result } = renderHook(() => useModelPreview());

      expect(result.current.isPreviewOpen).toBe(false);
    });

    it('should start with isEditing as false', () => {
      const { result } = renderHook(() => useModelPreview());

      expect(result.current.isEditing).toBe(false);
    });

    it('should start with empty editedContent', () => {
      const { result } = renderHook(() => useModelPreview());

      expect(result.current.editedContent).toBe('');
    });

    it('should start with null saveAsNewData', () => {
      const { result } = renderHook(() => useModelPreview());

      expect(result.current.saveAsNewData).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // OPEN PREVIEW TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('openPreview', () => {
    it('should open preview for a valid model', () => {
      const { result } = renderHook(() => useModelPreview());
      const model = createMockModel();

      act(() => {
        result.current.openPreview(model);
      });

      expect(result.current.previewingModel).toEqual(model);
      expect(result.current.isPreviewOpen).toBe(true);
    });

    it('should not open preview for model without content', () => {
      const { result } = renderHook(() => useModelPreview());
      const model = createMockModel({ content: '' });

      act(() => {
        result.current.openPreview(model);
      });

      expect(result.current.previewingModel).toBeNull();
      expect(result.current.isPreviewOpen).toBe(false);
    });

    it('should not open preview for null model', () => {
      const { result } = renderHook(() => useModelPreview());

      act(() => {
        result.current.openPreview(null as any);
      });

      expect(result.current.previewingModel).toBeNull();
      expect(result.current.isPreviewOpen).toBe(false);
    });

    it('should replace previous model when opening new one', () => {
      const { result } = renderHook(() => useModelPreview());
      const model1 = createMockModel({ title: 'Model 1' });
      const model2 = createMockModel({ title: 'Model 2' });

      act(() => {
        result.current.openPreview(model1);
      });

      expect(result.current.previewingModel?.title).toBe('Model 1');

      act(() => {
        result.current.openPreview(model2);
      });

      expect(result.current.previewingModel?.title).toBe('Model 2');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CLOSE PREVIEW TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('closePreview', () => {
    it('should close preview and reset state', () => {
      vi.useFakeTimers();
      const { result } = renderHook(() => useModelPreview());
      const model = createMockModel();

      act(() => {
        result.current.openPreview(model);
      });

      expect(result.current.isPreviewOpen).toBe(true);

      act(() => {
        result.current.closePreview();
      });

      expect(result.current.isPreviewOpen).toBe(false);
      expect(result.current.isEditing).toBe(false);
      expect(result.current.editedContent).toBe('');

      // Model is cleared after timeout
      act(() => {
        vi.advanceTimersByTime(200);
      });

      expect(result.current.previewingModel).toBeNull();

      vi.useRealTimers();
    });

    it('should reset editing state when closing', () => {
      vi.useFakeTimers();
      const { result } = renderHook(() => useModelPreview());
      const model = createMockModel();

      // Open preview first
      act(() => {
        result.current.openPreview(model);
      });

      // Then start editing (separate act to allow state update)
      act(() => {
        result.current.startEditing();
      });

      expect(result.current.isEditing).toBe(true);

      act(() => {
        result.current.closePreview();
      });

      expect(result.current.isEditing).toBe(false);

      vi.useRealTimers();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EDITING TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('startEditing', () => {
    it('should start editing mode with model content', () => {
      const { result } = renderHook(() => useModelPreview());
      const model = createMockModel({ content: '<p>Original content</p>' });

      act(() => {
        result.current.openPreview(model);
      });

      act(() => {
        result.current.startEditing();
      });

      expect(result.current.isEditing).toBe(true);
      expect(result.current.editedContent).toBe('<p>Original content</p>');
    });

    it('should not start editing without a previewing model', () => {
      const { result } = renderHook(() => useModelPreview());

      act(() => {
        result.current.startEditing();
      });

      expect(result.current.isEditing).toBe(false);
      expect(result.current.editedContent).toBe('');
    });
  });

  describe('cancelEditing', () => {
    it('should cancel editing and reset state', () => {
      const { result } = renderHook(() => useModelPreview());
      const model = createMockModel();

      // Open preview first
      act(() => {
        result.current.openPreview(model);
      });

      // Then start editing (separate act to allow state update)
      act(() => {
        result.current.startEditing();
      });

      expect(result.current.isEditing).toBe(true);

      act(() => {
        result.current.cancelEditing();
      });

      expect(result.current.isEditing).toBe(false);
      expect(result.current.editedContent).toBe('');
    });
  });

  describe('setEditedContent', () => {
    it('should update edited content', () => {
      const { result } = renderHook(() => useModelPreview());
      const model = createMockModel();

      // Open preview first
      act(() => {
        result.current.openPreview(model);
      });

      // Start editing (separate act)
      act(() => {
        result.current.startEditing();
      });

      act(() => {
        result.current.setEditedContent('<p>New content</p>');
      });

      expect(result.current.editedContent).toBe('<p>New content</p>');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SAVE AS NEW TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('openSaveAsNew', () => {
    it('should open save as new with content and model data', () => {
      const { result } = renderHook(() => useModelPreview());
      const model = createMockModel({
        keywords: ['keyword1', 'keyword2'],
        category: 'Preliminar'
      });

      act(() => {
        result.current.openSaveAsNew('<p>New content</p>', model);
      });

      expect(result.current.saveAsNewData).toEqual({
        title: '',
        content: '<p>New content</p>',
        keywords: 'keyword1, keyword2',
        category: 'Preliminar'
      });
    });

    it('should open save as new with null model (defaults)', () => {
      const { result } = renderHook(() => useModelPreview());

      act(() => {
        result.current.openSaveAsNew('<p>Content</p>', null);
      });

      expect(result.current.saveAsNewData).toEqual({
        title: '',
        content: '<p>Content</p>',
        keywords: '',
        category: 'Mérito'
      });
    });

    it('should handle string keywords', () => {
      const { result } = renderHook(() => useModelPreview());
      const model = createMockModel({
        keywords: 'single keyword' as any
      });

      act(() => {
        result.current.openSaveAsNew('<p>Content</p>', model);
      });

      expect(result.current.saveAsNewData?.keywords).toBe('single keyword');
    });
  });

  describe('closeSaveAsNew', () => {
    it('should close save as new and reset data', () => {
      const { result } = renderHook(() => useModelPreview());
      const model = createMockModel();

      act(() => {
        result.current.openSaveAsNew('<p>Content</p>', model);
      });

      expect(result.current.saveAsNewData).not.toBeNull();

      act(() => {
        result.current.closeSaveAsNew();
      });

      expect(result.current.saveAsNewData).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CONTEXTUAL INSERT TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('contextualInsertFn', () => {
    it('should have null contextualInsertFnRef by default', () => {
      const { result } = renderHook(() => useModelPreview());

      expect(result.current.contextualInsertFnRef.current).toBeNull();
    });

    it('should set contextual insert function', () => {
      const { result } = renderHook(() => useModelPreview());
      const insertFn = vi.fn();

      act(() => {
        result.current.setContextualInsertFn(insertFn);
      });

      expect(result.current.contextualInsertFnRef.current).toBe(insertFn);
    });

    it('should clear contextual insert function', () => {
      const { result } = renderHook(() => useModelPreview());
      const insertFn = vi.fn();

      act(() => {
        result.current.setContextualInsertFn(insertFn);
      });

      act(() => {
        result.current.setContextualInsertFn(null);
      });

      expect(result.current.contextualInsertFnRef.current).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CALLBACK STABILITY TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Callback Stability', () => {
    it('openPreview should be stable across renders', () => {
      const { result, rerender } = renderHook(() => useModelPreview());

      const first = result.current.openPreview;
      rerender();
      const second = result.current.openPreview;

      expect(first).toBe(second);
    });

    it('closePreview should be stable across renders', () => {
      const { result, rerender } = renderHook(() => useModelPreview());

      const first = result.current.closePreview;
      rerender();
      const second = result.current.closePreview;

      expect(first).toBe(second);
    });

    it('startEditing should be stable when previewingModel unchanged', () => {
      const { result, rerender } = renderHook(() => useModelPreview());

      const first = result.current.startEditing;
      rerender();
      const second = result.current.startEditing;

      expect(first).toBe(second);
    });

    it('cancelEditing should be stable across renders', () => {
      const { result, rerender } = renderHook(() => useModelPreview());

      const first = result.current.cancelEditing;
      rerender();
      const second = result.current.cancelEditing;

      expect(first).toBe(second);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // REFS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Refs', () => {
    it('should have onModelUpdatedRef available', () => {
      const { result } = renderHook(() => useModelPreview());

      expect(result.current.onModelUpdatedRef).toBeDefined();
      expect(result.current.onModelUpdatedRef.current).toBeNull();
    });

    it('should allow setting onModelUpdatedRef callback', () => {
      const { result } = renderHook(() => useModelPreview());
      const callback = vi.fn();

      act(() => {
        result.current.onModelUpdatedRef.current = callback;
      });

      expect(result.current.onModelUpdatedRef.current).toBe(callback);
    });
  });
});

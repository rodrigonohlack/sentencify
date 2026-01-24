/**
 * @file useKeyboardShortcuts.test.ts
 * @description Testes para o hook de atalhos de teclado
 * @version 1.37.57
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';

describe('useKeyboardShortcuts', () => {
  // Mock callbacks
  const mockSaveTopicEditWithoutClosing = vi.fn();
  const mockSaveModelWithoutClosing = vi.fn();
  const mockCloseSettingsModal = vi.fn();

  const defaultProps = {
    editingTopic: null,
    isModelFormOpen: false,
    isSettingsOpen: false,
    isModelGeneratorOpen: false,
    saveTopicEditWithoutClosing: mockSaveTopicEditWithoutClosing,
    saveModelWithoutClosing: mockSaveModelWithoutClosing,
    closeSettingsModal: mockCloseSettingsModal
  };

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.style.overflow = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.style.overflow = '';
  });

  // Helper to dispatch keyboard events
  const dispatchKeyEvent = (
    key: string,
    options: { ctrlKey?: boolean; metaKey?: boolean } = {}
  ) => {
    const event = new KeyboardEvent('keydown', {
      key,
      ctrlKey: options.ctrlKey || false,
      metaKey: options.metaKey || false,
      bubbles: true,
      cancelable: true
    });
    document.dispatchEvent(event);
    return event;
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // CTRL+S TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Ctrl+S Shortcut', () => {
    it('should call saveTopicEditWithoutClosing when editing topic', () => {
      renderHook(() =>
        useKeyboardShortcuts({
          ...defaultProps,
          editingTopic: { id: '1', title: 'Test' }
        })
      );

      dispatchKeyEvent('s', { ctrlKey: true });

      expect(mockSaveTopicEditWithoutClosing).toHaveBeenCalled();
      expect(mockSaveModelWithoutClosing).not.toHaveBeenCalled();
    });

    it('should call saveModelWithoutClosing when model form open', () => {
      renderHook(() =>
        useKeyboardShortcuts({
          ...defaultProps,
          isModelFormOpen: true
        })
      );

      dispatchKeyEvent('s', { ctrlKey: true });

      expect(mockSaveModelWithoutClosing).toHaveBeenCalled();
      expect(mockSaveTopicEditWithoutClosing).not.toHaveBeenCalled();
    });

    it('should prioritize topic save over model save', () => {
      renderHook(() =>
        useKeyboardShortcuts({
          ...defaultProps,
          editingTopic: { id: '1', title: 'Test' },
          isModelFormOpen: true
        })
      );

      dispatchKeyEvent('s', { ctrlKey: true });

      expect(mockSaveTopicEditWithoutClosing).toHaveBeenCalled();
      expect(mockSaveModelWithoutClosing).not.toHaveBeenCalled();
    });

    it('should work with metaKey (Mac)', () => {
      renderHook(() =>
        useKeyboardShortcuts({
          ...defaultProps,
          editingTopic: { id: '1', title: 'Test' }
        })
      );

      dispatchKeyEvent('s', { metaKey: true });

      expect(mockSaveTopicEditWithoutClosing).toHaveBeenCalled();
    });

    it('should not trigger on S key without ctrl/meta', () => {
      renderHook(() =>
        useKeyboardShortcuts({
          ...defaultProps,
          editingTopic: { id: '1', title: 'Test' }
        })
      );

      dispatchKeyEvent('s');

      expect(mockSaveTopicEditWithoutClosing).not.toHaveBeenCalled();
    });

    it('should not trigger on Ctrl+other key', () => {
      renderHook(() =>
        useKeyboardShortcuts({
          ...defaultProps,
          editingTopic: { id: '1', title: 'Test' }
        })
      );

      dispatchKeyEvent('a', { ctrlKey: true });

      expect(mockSaveTopicEditWithoutClosing).not.toHaveBeenCalled();
    });

    it('should not trigger when nothing is being edited', () => {
      renderHook(() =>
        useKeyboardShortcuts(defaultProps)
      );

      dispatchKeyEvent('s', { ctrlKey: true });

      expect(mockSaveTopicEditWithoutClosing).not.toHaveBeenCalled();
      expect(mockSaveModelWithoutClosing).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ESC TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Escape Key', () => {
    it('should call closeSettingsModal when settings open', () => {
      renderHook(() =>
        useKeyboardShortcuts({
          ...defaultProps,
          isSettingsOpen: true
        })
      );

      dispatchKeyEvent('Escape');

      expect(mockCloseSettingsModal).toHaveBeenCalled();
    });

    it('should NOT call closeSettingsModal when settings closed', () => {
      renderHook(() =>
        useKeyboardShortcuts({
          ...defaultProps,
          isSettingsOpen: false
        })
      );

      dispatchKeyEvent('Escape');

      expect(mockCloseSettingsModal).not.toHaveBeenCalled();
    });

    it('should NOT close settings when model generator is open', () => {
      renderHook(() =>
        useKeyboardShortcuts({
          ...defaultProps,
          isSettingsOpen: true,
          isModelGeneratorOpen: true
        })
      );

      dispatchKeyEvent('Escape');

      expect(mockCloseSettingsModal).not.toHaveBeenCalled();
    });

    it('should close settings after model generator closes', () => {
      const { rerender } = renderHook(
        (props) => useKeyboardShortcuts(props),
        { initialProps: { ...defaultProps, isSettingsOpen: true, isModelGeneratorOpen: true } }
      );

      // With model generator open - should not close
      dispatchKeyEvent('Escape');
      expect(mockCloseSettingsModal).not.toHaveBeenCalled();

      // Close model generator
      rerender({ ...defaultProps, isSettingsOpen: true, isModelGeneratorOpen: false });

      // Now ESC should work
      dispatchKeyEvent('Escape');
      expect(mockCloseSettingsModal).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // BODY SCROLL LOCK TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Body Scroll Lock', () => {
    it('should lock body scroll when settings open', () => {
      renderHook(() =>
        useKeyboardShortcuts({
          ...defaultProps,
          isSettingsOpen: true
        })
      );

      expect(document.body.style.overflow).toBe('hidden');
    });

    it('should not lock scroll when settings closed', () => {
      renderHook(() =>
        useKeyboardShortcuts({
          ...defaultProps,
          isSettingsOpen: false
        })
      );

      expect(document.body.style.overflow).toBe('');
    });

    it('should restore scroll when settings closes', () => {
      const { rerender } = renderHook(
        (props) => useKeyboardShortcuts(props),
        { initialProps: { ...defaultProps, isSettingsOpen: true } }
      );

      expect(document.body.style.overflow).toBe('hidden');

      rerender({ ...defaultProps, isSettingsOpen: false });

      expect(document.body.style.overflow).toBe('');
    });

    it('should restore original overflow value', () => {
      document.body.style.overflow = 'auto';

      const { unmount } = renderHook(() =>
        useKeyboardShortcuts({
          ...defaultProps,
          isSettingsOpen: true
        })
      );

      expect(document.body.style.overflow).toBe('hidden');

      unmount();

      expect(document.body.style.overflow).toBe('auto');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CLEANUP TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Cleanup', () => {
    it('should remove event listeners on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

      const { unmount } = renderHook(() =>
        useKeyboardShortcuts({
          ...defaultProps,
          editingTopic: { id: '1', title: 'Test' }
        })
      );

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    });

    it('should remove window event listener for ESC on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = renderHook(() =>
        useKeyboardShortcuts({
          ...defaultProps,
          isSettingsOpen: true
        })
      );

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // HOOK RETURN TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Hook Return', () => {
    it('should return empty object', () => {
      const { result } = renderHook(() =>
        useKeyboardShortcuts(defaultProps)
      );

      expect(result.current).toEqual({});
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DEPENDENCY UPDATES TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Dependency Updates', () => {
    it('should update Ctrl+S handler when editingTopic changes', () => {
      const { rerender } = renderHook(
        (props) => useKeyboardShortcuts(props as any),
        { initialProps: defaultProps }
      );

      // Initially nothing to save
      dispatchKeyEvent('s', { ctrlKey: true });
      expect(mockSaveTopicEditWithoutClosing).not.toHaveBeenCalled();

      // Start editing topic
      rerender({ ...defaultProps, editingTopic: { id: '1', title: 'Test' } } as any);

      dispatchKeyEvent('s', { ctrlKey: true });
      expect(mockSaveTopicEditWithoutClosing).toHaveBeenCalled();
    });

    it('should update Ctrl+S handler when isModelFormOpen changes', () => {
      const { rerender } = renderHook(
        (props) => useKeyboardShortcuts(props),
        { initialProps: defaultProps }
      );

      // Initially nothing to save
      dispatchKeyEvent('s', { ctrlKey: true });
      expect(mockSaveModelWithoutClosing).not.toHaveBeenCalled();

      // Open model form
      rerender({ ...defaultProps, isModelFormOpen: true });

      dispatchKeyEvent('s', { ctrlKey: true });
      expect(mockSaveModelWithoutClosing).toHaveBeenCalled();
    });
  });
});

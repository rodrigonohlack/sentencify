/**
 * @file useUIStore.test.ts
 * @description Testes para o store de UI (Modal Registry Pattern v1.37.56)
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useUIStore, selectIsAnyModalOpen, selectModal, selectIsToastVisible } from './useUIStore';
import type { ModalKey } from '../types';

describe('useUIStore', () => {
  // Reset store before each test
  beforeEach(() => {
    const store = useUIStore.getState();
    store.closeAllModals();
    store.clearToast();
    store.setError(null);
    store.setTextPreview({ isOpen: false, title: '', text: '' });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // MODAL REGISTRY - SYNC TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Modal Registry Sync', () => {
    it('should keep openModals array and modals object in sync on open', () => {
      const store = useUIStore.getState();

      store.openModal('settings');

      const state = useUIStore.getState();
      expect(state.openModals).toContain('settings');
      expect(state.modals.settings).toBe(true);
    });

    it('should keep openModals array and modals object in sync on close', () => {
      const store = useUIStore.getState();

      store.openModal('settings');
      store.closeModal('settings');

      const state = useUIStore.getState();
      expect(state.openModals).not.toContain('settings');
      expect(state.modals.settings).toBe(false);
    });

    it('should handle opening multiple modals', () => {
      const store = useUIStore.getState();

      store.openModal('settings');
      store.openModal('export');
      store.openModal('analysis');

      const state = useUIStore.getState();
      expect(state.openModals).toHaveLength(3);
      expect(state.openModals).toContain('settings');
      expect(state.openModals).toContain('export');
      expect(state.openModals).toContain('analysis');
      expect(state.modals.settings).toBe(true);
      expect(state.modals.export).toBe(true);
      expect(state.modals.analysis).toBe(true);
    });

    it('should handle closing multiple modals', () => {
      const store = useUIStore.getState();

      store.openModal('settings');
      store.openModal('export');
      store.openModal('analysis');
      store.closeModal('export');
      store.closeModal('settings');

      const state = useUIStore.getState();
      expect(state.openModals).toHaveLength(1);
      expect(state.openModals).toContain('analysis');
      expect(state.modals.settings).toBe(false);
      expect(state.modals.export).toBe(false);
      expect(state.modals.analysis).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DUPLICATE PREVENTION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Duplicate Prevention', () => {
    it('should not add duplicate modals to array', () => {
      const store = useUIStore.getState();

      store.openModal('settings');
      store.openModal('settings');
      store.openModal('settings');

      const state = useUIStore.getState();
      expect(state.openModals.filter(m => m === 'settings')).toHaveLength(1);
    });

    it('should handle closing non-existent modal gracefully', () => {
      const store = useUIStore.getState();

      // Should not throw
      expect(() => store.closeModal('settings')).not.toThrow();

      const state = useUIStore.getState();
      expect(state.openModals).toHaveLength(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CLOSE ALL MODALS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('closeAllModals', () => {
    it('should close all modals and reset array', () => {
      const store = useUIStore.getState();

      store.openModal('settings');
      store.openModal('export');
      store.openModal('analysis');
      store.closeAllModals();

      const state = useUIStore.getState();
      expect(state.openModals).toHaveLength(0);
    });

    it('should set all modals object values to false', () => {
      const store = useUIStore.getState();

      store.openModal('settings');
      store.openModal('export');
      store.closeAllModals();

      const state = useUIStore.getState();
      expect(state.modals.settings).toBe(false);
      expect(state.modals.export).toBe(false);
      // Check a few more to ensure all are false
      expect(state.modals.analysis).toBe(false);
      expect(state.modals.modelForm).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TOGGLE MODAL
  // ═══════════════════════════════════════════════════════════════════════════

  describe('toggleModal', () => {
    it('should open modal if closed', () => {
      const store = useUIStore.getState();

      store.toggleModal('settings');

      const state = useUIStore.getState();
      expect(state.openModals).toContain('settings');
      expect(state.modals.settings).toBe(true);
    });

    it('should close modal if open', () => {
      const store = useUIStore.getState();

      store.openModal('settings');
      store.toggleModal('settings');

      const state = useUIStore.getState();
      expect(state.openModals).not.toContain('settings');
      expect(state.modals.settings).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // IS MODAL OPEN
  // ═══════════════════════════════════════════════════════════════════════════

  describe('isModalOpen', () => {
    it('should return true for open modal', () => {
      const store = useUIStore.getState();

      store.openModal('settings');

      expect(store.isModalOpen('settings')).toBe(true);
    });

    it('should return false for closed modal', () => {
      const store = useUIStore.getState();

      expect(store.isModalOpen('settings')).toBe(false);
    });

    it('should return false after modal is closed', () => {
      const store = useUIStore.getState();

      store.openModal('settings');
      store.closeModal('settings');

      expect(store.isModalOpen('settings')).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TOAST
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Toast', () => {
    it('should show toast with message', () => {
      vi.useFakeTimers();
      const store = useUIStore.getState();

      store.showToast('Test message');

      const state = useUIStore.getState();
      expect(state.toast.show).toBe(true);
      expect(state.toast.message).toBe('Test message');
      expect(state.toast.type).toBe('success'); // default type
    });

    it('should show toast with custom type', () => {
      vi.useFakeTimers();
      const store = useUIStore.getState();

      store.showToast('Error occurred', 'error');

      const state = useUIStore.getState();
      expect(state.toast.show).toBe(true);
      expect(state.toast.type).toBe('error');
    });

    it('should auto-hide toast after 4 seconds', () => {
      vi.useFakeTimers();
      const store = useUIStore.getState();

      store.showToast('Test message');
      expect(useUIStore.getState().toast.show).toBe(true);

      vi.advanceTimersByTime(3999);
      expect(useUIStore.getState().toast.show).toBe(true);

      vi.advanceTimersByTime(1);
      expect(useUIStore.getState().toast.show).toBe(false);
    });

    it('should clear toast on clearToast', () => {
      vi.useFakeTimers();
      const store = useUIStore.getState();

      store.showToast('Test message');
      store.clearToast();

      const state = useUIStore.getState();
      expect(state.toast.show).toBe(false);
      expect(state.toast.message).toBe('');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SELECTORS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Selectors', () => {
    it('selectIsAnyModalOpen should return true when modals are open', () => {
      const store = useUIStore.getState();

      expect(selectIsAnyModalOpen(useUIStore.getState())).toBe(false);

      store.openModal('settings');
      expect(selectIsAnyModalOpen(useUIStore.getState())).toBe(true);
    });

    it('selectIsAnyModalOpen should return false when no modals are open', () => {
      const store = useUIStore.getState();

      store.openModal('settings');
      store.closeModal('settings');

      expect(selectIsAnyModalOpen(useUIStore.getState())).toBe(false);
    });

    it('selectModal should return correct state for specific modal', () => {
      const store = useUIStore.getState();

      expect(selectModal('settings')(useUIStore.getState())).toBe(false);

      store.openModal('settings');
      expect(selectModal('settings')(useUIStore.getState())).toBe(true);
      expect(selectModal('export')(useUIStore.getState())).toBe(false);
    });

    it('selectIsToastVisible should return correct visibility', () => {
      vi.useFakeTimers();
      const store = useUIStore.getState();

      expect(selectIsToastVisible(useUIStore.getState())).toBe(false);

      store.showToast('Test');
      expect(selectIsToastVisible(useUIStore.getState())).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEXT PREVIEW
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Text Preview', () => {
    it('should open text preview with title and text', () => {
      const store = useUIStore.getState();

      store.openTextPreview('Test Title', 'Test content');

      const state = useUIStore.getState();
      expect(state.textPreview.isOpen).toBe(true);
      expect(state.textPreview.title).toBe('Test Title');
      expect(state.textPreview.text).toBe('Test content');
    });

    it('should close text preview and reset state', () => {
      const store = useUIStore.getState();

      store.openTextPreview('Test Title', 'Test content');
      store.closeTextPreview();

      const state = useUIStore.getState();
      expect(state.textPreview.isOpen).toBe(false);
      expect(state.textPreview.title).toBe('');
      expect(state.textPreview.text).toBe('');
    });
  });
});

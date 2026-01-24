import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

vi.mock('../stores/useUIStore', () => {
  const mockState = {
    modals: {},
    openModal: vi.fn(),
    closeModal: vi.fn(),
    closeAllModals: vi.fn(),
    textPreview: null,
    setTextPreview: vi.fn(),
    toast: null,
    showToast: vi.fn(),
    clearToast: vi.fn(),
  };

  return {
    useUIStore: vi.fn((selector) => selector(mockState)),
    selectIsAnyModalOpen: () => false,
  };
});

import { useModalManager } from './useModalManager';

describe('useModalManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('hook initialization', () => {
    it('should return all expected properties', () => {
      const { result } = renderHook(() => useModalManager());

      expect(result.current.modals).toBeDefined();
      expect(typeof result.current.openModal).toBe('function');
      expect(typeof result.current.closeModal).toBe('function');
      expect(typeof result.current.closeAllModals).toBe('function');
      expect(typeof result.current.isAnyModalOpen).toBe('boolean');
      expect(typeof result.current.setTextPreview).toBe('function');
      expect(typeof result.current.showToast).toBe('function');
      expect(typeof result.current.clearToast).toBe('function');
    });
  });

  describe('modal controls', () => {
    it('should expose openModal from store', () => {
      const { result } = renderHook(() => useModalManager());
      expect(typeof result.current.openModal).toBe('function');
    });

    it('should expose closeModal from store', () => {
      const { result } = renderHook(() => useModalManager());
      expect(typeof result.current.closeModal).toBe('function');
    });

    it('should expose closeAllModals from store', () => {
      const { result } = renderHook(() => useModalManager());
      expect(typeof result.current.closeAllModals).toBe('function');
    });

    it('should start with isAnyModalOpen=false', () => {
      const { result } = renderHook(() => useModalManager());
      expect(result.current.isAnyModalOpen).toBe(false);
    });

    it('should start with empty modals object', () => {
      const { result } = renderHook(() => useModalManager());
      expect(result.current.modals).toEqual({});
    });
  });

  describe('text preview', () => {
    it('should start with null textPreview', () => {
      const { result } = renderHook(() => useModalManager());
      expect(result.current.textPreview).toBeNull();
    });

    it('should expose setTextPreview function', () => {
      const { result } = renderHook(() => useModalManager());
      expect(typeof result.current.setTextPreview).toBe('function');
    });
  });

  describe('toast', () => {
    it('should start with null toast', () => {
      const { result } = renderHook(() => useModalManager());
      expect(result.current.toast).toBeNull();
    });

    it('should expose showToast function', () => {
      const { result } = renderHook(() => useModalManager());
      expect(typeof result.current.showToast).toBe('function');
    });

    it('should expose clearToast function', () => {
      const { result } = renderHook(() => useModalManager());
      expect(typeof result.current.clearToast).toBe('function');
    });
  });
});

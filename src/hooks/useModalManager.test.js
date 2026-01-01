// Testes para useModalManager
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useModalManager, { MODAL_NAMES } from './useModalManager';

describe('useModalManager', () => {
  describe('Estado inicial', () => {
    it('todos os modais devem iniciar fechados', () => {
      const { result } = renderHook(() => useModalManager());
      
      Object.values(result.current.modals).forEach(isOpen => {
        expect(isOpen).toBe(false);
      });
    });

    it('isAnyModalOpen deve ser false inicialmente', () => {
      const { result } = renderHook(() => useModalManager());
      
      expect(result.current.isAnyModalOpen).toBe(false);
    });

    it('deve ter todos os modais definidos em MODAL_NAMES', () => {
      const { result } = renderHook(() => useModalManager());
      
      MODAL_NAMES.forEach(modalName => {
        expect(result.current.modals).toHaveProperty(modalName);
      });
    });

    it('textPreview deve iniciar fechado', () => {
      const { result } = renderHook(() => useModalManager());
      
      expect(result.current.textPreview.isOpen).toBe(false);
      expect(result.current.textPreview.title).toBe('');
      expect(result.current.textPreview.text).toBe('');
    });
  });

  describe('openModal', () => {
    it('deve abrir um modal específico', () => {
      const { result } = renderHook(() => useModalManager());

      act(() => {
        result.current.openModal('settings');
      });

      expect(result.current.modals.settings).toBe(true);
    });

    it('deve manter outros modais fechados ao abrir um', () => {
      const { result } = renderHook(() => useModalManager());

      act(() => {
        result.current.openModal('export');
      });

      expect(result.current.modals.export).toBe(true);
      expect(result.current.modals.import).toBe(false);
      expect(result.current.modals.settings).toBe(false);
    });

    it('isAnyModalOpen deve ser true quando modal aberto', () => {
      const { result } = renderHook(() => useModalManager());

      act(() => {
        result.current.openModal('globalEditor');
      });

      expect(result.current.isAnyModalOpen).toBe(true);
    });

    it('deve permitir múltiplos modais abertos', () => {
      const { result } = renderHook(() => useModalManager());

      act(() => {
        result.current.openModal('settings');
        result.current.openModal('export');
      });

      expect(result.current.modals.settings).toBe(true);
      expect(result.current.modals.export).toBe(true);
    });
  });

  describe('closeModal', () => {
    it('deve fechar um modal específico', () => {
      const { result } = renderHook(() => useModalManager());

      act(() => {
        result.current.openModal('settings');
      });
      
      act(() => {
        result.current.closeModal('settings');
      });

      expect(result.current.modals.settings).toBe(false);
    });

    it('deve manter outros modais abertos ao fechar um', () => {
      const { result } = renderHook(() => useModalManager());

      act(() => {
        result.current.openModal('settings');
        result.current.openModal('export');
      });
      
      act(() => {
        result.current.closeModal('settings');
      });

      expect(result.current.modals.settings).toBe(false);
      expect(result.current.modals.export).toBe(true);
    });

    it('isAnyModalOpen deve ser false quando todos fechados', () => {
      const { result } = renderHook(() => useModalManager());

      act(() => {
        result.current.openModal('settings');
        result.current.closeModal('settings');
      });

      expect(result.current.isAnyModalOpen).toBe(false);
    });
  });

  describe('closeAllModals', () => {
    it('deve fechar todos os modais abertos', () => {
      const { result } = renderHook(() => useModalManager());

      act(() => {
        result.current.openModal('settings');
        result.current.openModal('export');
        result.current.openModal('globalEditor');
      });
      
      act(() => {
        result.current.closeAllModals();
      });

      Object.values(result.current.modals).forEach(isOpen => {
        expect(isOpen).toBe(false);
      });
    });

    it('isAnyModalOpen deve ser false após closeAllModals', () => {
      const { result } = renderHook(() => useModalManager());

      act(() => {
        result.current.openModal('aiAssistant');
        result.current.closeAllModals();
      });

      expect(result.current.isAnyModalOpen).toBe(false);
    });
  });

  describe('textPreview', () => {
    it('deve atualizar textPreview via setTextPreview', () => {
      const { result } = renderHook(() => useModalManager());
      const previewData = { isOpen: true, title: 'Título', text: 'Conteúdo' };

      act(() => {
        result.current.setTextPreview(previewData);
      });

      expect(result.current.textPreview).toEqual(previewData);
    });
  });

  describe('MODAL_NAMES', () => {
    it('deve incluir modais críticos', () => {
      expect(MODAL_NAMES).toContain('globalEditor');
      expect(MODAL_NAMES).toContain('settings');
      expect(MODAL_NAMES).toContain('aiAssistant');
      expect(MODAL_NAMES).toContain('export');
    });

    it('deve ter pelo menos 30 modais', () => {
      expect(MODAL_NAMES.length).toBeGreaterThanOrEqual(30);
    });
  });
});

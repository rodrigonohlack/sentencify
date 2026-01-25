/**
 * @file LockedTabOverlay.test.tsx
 * @description Testes para o componente LockedTabOverlay
 * @version 1.38.49
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LockedTabOverlay } from './LockedTabOverlay';

describe('LockedTabOverlay', () => {
  const mockSetActiveTab = vi.fn();

  const defaultProps = {
    isPrimaryTab: false,
    activeTab: 'editor',
    setActiveTab: mockSetActiveTab,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // VISIBILITY TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Visibility', () => {
    it('should render overlay when not primary tab and on non-readonly tab', () => {
      render(<LockedTabOverlay {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should not render when isPrimaryTab is true', () => {
      render(<LockedTabOverlay {...defaultProps} isPrimaryTab={true} />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should not render when activeTab is models (readonly allowed)', () => {
      render(<LockedTabOverlay {...defaultProps} activeTab="models" />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should not render when activeTab is jurisprudencia (readonly allowed)', () => {
      render(<LockedTabOverlay {...defaultProps} activeTab="jurisprudencia" />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should not render when activeTab is legislacao (readonly allowed)', () => {
      render(<LockedTabOverlay {...defaultProps} activeTab="legislacao" />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should render when activeTab is editor (not readonly)', () => {
      render(<LockedTabOverlay {...defaultProps} activeTab="editor" />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CONTENT TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Content', () => {
    it('should display the title "Aba Bloqueada"', () => {
      render(<LockedTabOverlay {...defaultProps} />);

      expect(screen.getByText('Aba Bloqueada')).toBeInTheDocument();
    });

    it('should display explanation text about tab locking', () => {
      render(<LockedTabOverlay {...defaultProps} />);

      expect(screen.getByText(/Outra aba está atualmente editando este projeto/)).toBeInTheDocument();
    });

    it('should mention Biblioteca de Modelos availability in text', () => {
      render(<LockedTabOverlay {...defaultProps} />);

      expect(screen.getByText(/continua funcionando normalmente/)).toBeInTheDocument();
    });

    it('should display instruction to click Assumir Controle', () => {
      render(<LockedTabOverlay {...defaultProps} />);

      expect(screen.getByText(/página será recarregada automaticamente/)).toBeInTheDocument();
    });

    it('should have aria-modal attribute', () => {
      render(<LockedTabOverlay {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog.getAttribute('aria-modal')).toBe('true');
    });

    it('should have aria-labelledby pointing to title', () => {
      render(<LockedTabOverlay {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog.getAttribute('aria-labelledby')).toBe('locked-tab-title');
    });

    it('should display footer note about automatic blocking', () => {
      render(<LockedTabOverlay {...defaultProps} />);

      expect(screen.getByText(/a outra aba será bloqueada automaticamente/)).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // BUTTONS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Buttons', () => {
    it('should render "Assumir Controle" button', () => {
      render(<LockedTabOverlay {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      const controlButton = buttons.find(b => b.textContent?.includes('Assumir Controle'));
      expect(controlButton).toBeInTheDocument();
    });

    it('should render "Ir para Biblioteca de Modelos" button', () => {
      render(<LockedTabOverlay {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      const modelsButton = buttons.find(b => b.textContent?.includes('Biblioteca de Modelos'));
      expect(modelsButton).toBeInTheDocument();
    });

    it('should call setActiveTab with models when clicking "Ir para Biblioteca de Modelos"', () => {
      render(<LockedTabOverlay {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      const modelsButton = buttons.find(b => b.textContent?.includes('Biblioteca de Modelos'));
      fireEvent.click(modelsButton!);

      expect(mockSetActiveTab).toHaveBeenCalledWith('models');
    });

    it('should call window.location.reload when clicking "Assumir Controle"', () => {
      // Mock window.location.reload
      const reloadMock = vi.fn();
      Object.defineProperty(window, 'location', {
        value: { reload: reloadMock },
        writable: true,
      });

      render(<LockedTabOverlay {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      const controlButton = buttons.find(b => b.textContent?.includes('Assumir Controle'));
      fireEvent.click(controlButton!);

      expect(reloadMock).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // STYLING TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Styling', () => {
    it('should have z-index 9999 on overlay', () => {
      render(<LockedTabOverlay {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog.style.zIndex).toBe('9999');
    });

    it('should have fixed positioning', () => {
      render(<LockedTabOverlay {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog.style.position).toBe('fixed');
    });

    it('should cover full viewport', () => {
      render(<LockedTabOverlay {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog.style.top).toBe('0px');
      expect(dialog.style.left).toBe('0px');
      expect(dialog.style.right).toBe('0px');
      expect(dialog.style.bottom).toBe('0px');
    });

    it('should have backdrop filter blur', () => {
      render(<LockedTabOverlay {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog.style.backdropFilter).toBe('blur(8px)');
    });

    it('should have flex centering', () => {
      render(<LockedTabOverlay {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog.style.display).toBe('flex');
      expect(dialog.style.alignItems).toBe('center');
      expect(dialog.style.justifyContent).toBe('center');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // LOCALSTORAGE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Storage Interaction', () => {
    it('should write to localStorage and sessionStorage when taking control', () => {
      const reloadMock = vi.fn();
      Object.defineProperty(window, 'location', {
        value: { reload: reloadMock },
        writable: true,
      });

      // Clear storage before test
      localStorage.clear();
      sessionStorage.clear();

      render(<LockedTabOverlay {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      const controlButton = buttons.find(b => b.textContent?.includes('Assumir Controle'));
      fireEvent.click(controlButton!);

      // Verify localStorage has the lock key
      const lockValue = localStorage.getItem('sentencify-primary-tab-lock');
      expect(lockValue).not.toBeNull();
      const parsed = JSON.parse(lockValue!);
      expect(parsed.takeover).toBe(true);
      expect(parsed.tabId).toBeDefined();
      expect(parsed.timestamp).toBeDefined();
    });

    it('should set sessionStorage takeover key when taking control', () => {
      const reloadMock = vi.fn();
      Object.defineProperty(window, 'location', {
        value: { reload: reloadMock },
        writable: true,
      });

      // Clear storage before test
      sessionStorage.clear();

      render(<LockedTabOverlay {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      const controlButton = buttons.find(b => b.textContent?.includes('Assumir Controle'));
      fireEvent.click(controlButton!);

      // Verify sessionStorage has the takeover key
      const takeoverValue = sessionStorage.getItem('sentencify-tab-takeover');
      expect(takeoverValue).not.toBeNull();
      expect(takeoverValue).toContain('tab-');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DISPLAY NAME TEST
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Component Metadata', () => {
    it('should have displayName set', () => {
      expect(LockedTabOverlay.displayName).toBe('LockedTabOverlay');
    });
  });
});

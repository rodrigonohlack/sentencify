/**
 * @file TextPreviewModal.test.tsx
 * @description Testes para o componente TextPreviewModal
 * @version 1.38.52
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TextPreviewModal } from './TextPreviewModal';

describe('TextPreviewModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    title: 'Test Document',
    text: 'This is the test content for the preview modal.',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Cleanup body overflow
    document.body.style.overflow = '';
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Rendering', () => {
    it('should render when isOpen is true', () => {
      render(<TextPreviewModal {...defaultProps} />);
      expect(screen.getByText(/Preview:/)).toBeInTheDocument();
    });

    it('should return null when isOpen is false', () => {
      const { container } = render(<TextPreviewModal {...defaultProps} isOpen={false} />);
      expect(container.firstChild).toBeNull();
    });

    it('should display the title', () => {
      render(<TextPreviewModal {...defaultProps} />);
      expect(screen.getByText(/Test Document/)).toBeInTheDocument();
    });

    it('should display the text content', () => {
      render(<TextPreviewModal {...defaultProps} />);
      expect(screen.getByText(defaultProps.text)).toBeInTheDocument();
    });

    it('should display "Sem conteúdo" when text is empty', () => {
      render(<TextPreviewModal {...defaultProps} text="" />);
      expect(screen.getByText('Sem conteúdo')).toBeInTheDocument();
    });

    it('should display "Sem conteúdo" when text is undefined', () => {
      render(<TextPreviewModal {...defaultProps} text={undefined as unknown as string} />);
      expect(screen.getByText('Sem conteúdo')).toBeInTheDocument();
    });

    it('should display character count', () => {
      render(<TextPreviewModal {...defaultProps} />);
      // Text has 47 characters
      expect(screen.getByText(/47 caracteres/)).toBeInTheDocument();
    });

    it('should format large character counts with locale', () => {
      const longText = 'a'.repeat(1500);
      render(<TextPreviewModal {...defaultProps} text={longText} />);
      // Should show 1.500 (pt-BR) or 1,500 (en-US) depending on locale
      expect(screen.getByText(/1[.,]500 caracteres/)).toBeInTheDocument();
    });

    it('should render Eye icon', () => {
      const { container } = render(<TextPreviewModal {...defaultProps} />);
      // Eye icon should be present (lucide-react)
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('should render close button', () => {
      render(<TextPreviewModal {...defaultProps} />);
      const closeButton = screen.getByTitle('Fechar');
      expect(closeButton).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INTERACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Interactions', () => {
    it('should call onClose when close button is clicked', () => {
      render(<TextPreviewModal {...defaultProps} />);
      const closeButton = screen.getByTitle('Fechar');
      fireEvent.click(closeButton);
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when backdrop is clicked', () => {
      const { container } = render(<TextPreviewModal {...defaultProps} />);
      // The backdrop is the outer div with overflow-y-auto
      const backdrop = container.firstChild as HTMLElement;
      fireEvent.click(backdrop);
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('should NOT call onClose when modal content is clicked', () => {
      render(<TextPreviewModal {...defaultProps} />);
      const preElement = screen.getByText(defaultProps.text);
      fireEvent.click(preElement);
      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });

    it('should call onClose when ESC key is pressed', () => {
      render(<TextPreviewModal {...defaultProps} />);
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('should not add ESC listener when modal is closed', () => {
      render(<TextPreviewModal {...defaultProps} isOpen={false} />);
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SCROLL LOCK
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Scroll Lock', () => {
    it('should set body overflow to hidden when open', () => {
      render(<TextPreviewModal {...defaultProps} />);
      expect(document.body.style.overflow).toBe('hidden');
    });

    it('should restore body overflow when closed', () => {
      const { unmount } = render(<TextPreviewModal {...defaultProps} />);
      unmount();
      // Should restore to original (empty string)
      expect(document.body.style.overflow).toBe('');
    });

    it('should not set overflow when isOpen is false', () => {
      document.body.style.overflow = 'auto';
      render(<TextPreviewModal {...defaultProps} isOpen={false} />);
      expect(document.body.style.overflow).toBe('auto');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // STYLING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Styling', () => {
    it('should have max-w-4xl for large content', () => {
      const { container } = render(<TextPreviewModal {...defaultProps} />);
      const modalContainer = container.querySelector('.max-w-4xl');
      expect(modalContainer).toBeInTheDocument();
    });

    it('should render pre element with monospace font', () => {
      render(<TextPreviewModal {...defaultProps} />);
      const preElement = screen.getByText(defaultProps.text);
      expect(preElement.tagName).toBe('PRE');
      expect(preElement.className).toContain('font-mono');
    });

    it('should have whitespace-pre-wrap for text formatting', () => {
      render(<TextPreviewModal {...defaultProps} />);
      const preElement = screen.getByText(defaultProps.text);
      expect(preElement.className).toContain('whitespace-pre-wrap');
    });
  });
});

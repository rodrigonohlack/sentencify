/**
 * @file VersionCompareModal.test.tsx
 * @description Testes para o componente VersionCompareModal
 * @version 1.38.49
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VersionCompareModal } from './VersionCompareModal';
import type { VersionCompareModalProps } from './VersionCompareModal';

describe('VersionCompareModal', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  const createDefaultProps = (overrides: Partial<VersionCompareModalProps> = {}): VersionCompareModalProps => ({
    oldContent: '<p>Old content text</p>',
    newContent: '<p>New content text</p>',
    timestamp: Date.now() - 5 * 60 * 1000, // 5 minutes ago
    onRestore: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERING TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Rendering', () => {
    it('should render the modal title', () => {
      render(<VersionCompareModal {...createDefaultProps()} />);
      expect(screen.getByText('Comparar Versões')).toBeInTheDocument();
    });

    it('should render close button', () => {
      const props = createDefaultProps();
      render(<VersionCompareModal {...props} />);
      // The X button
      const closeBtn = screen.getByText('×');
      expect(closeBtn).toBeInTheDocument();
    });

    it('should render legend labels', () => {
      render(<VersionCompareModal {...createDefaultProps()} />);
      expect(screen.getByText('Removido')).toBeInTheDocument();
      expect(screen.getByText('Adicionado')).toBeInTheDocument();
    });

    it('should render Cancelar button', () => {
      render(<VersionCompareModal {...createDefaultProps()} />);
      expect(screen.getByText('Cancelar')).toBeInTheDocument();
    });

    it('should render Restaurar button', () => {
      render(<VersionCompareModal {...createDefaultProps()} />);
      expect(screen.getByText('Restaurar Versão Anterior')).toBeInTheDocument();
    });

    it('should have fixed positioning with z-100', () => {
      const { container } = render(<VersionCompareModal {...createDefaultProps()} />);
      const overlay = container.firstElementChild;
      expect(overlay).toHaveClass('fixed');
      expect(overlay).toHaveClass('z-[100]');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TIME AGO FORMAT
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Time Ago', () => {
    it('should show minutes ago', () => {
      const timestamp = Date.now() - 10 * 60 * 1000; // 10 minutes ago
      render(<VersionCompareModal {...createDefaultProps({ timestamp })} />);
      expect(screen.getByText(/10 minutos/)).toBeInTheDocument();
    });

    it('should show singular minute', () => {
      const timestamp = Date.now() - 1 * 60 * 1000; // 1 minute ago
      render(<VersionCompareModal {...createDefaultProps({ timestamp })} />);
      expect(screen.getByText(/1 minuto/)).toBeInTheDocument();
    });

    it('should show hours ago', () => {
      const timestamp = Date.now() - 3 * 60 * 60 * 1000; // 3 hours ago
      render(<VersionCompareModal {...createDefaultProps({ timestamp })} />);
      expect(screen.getByText(/3 horas/)).toBeInTheDocument();
    });

    it('should show singular hour', () => {
      const timestamp = Date.now() - 1 * 60 * 60 * 1000; // 1 hour ago
      render(<VersionCompareModal {...createDefaultProps({ timestamp })} />);
      expect(screen.getByText(/1 hora/)).toBeInTheDocument();
    });

    it('should show days ago', () => {
      const timestamp = Date.now() - 2 * 24 * 60 * 60 * 1000; // 2 days ago
      render(<VersionCompareModal {...createDefaultProps({ timestamp })} />);
      expect(screen.getByText(/2 dias/)).toBeInTheDocument();
    });

    it('should show singular day', () => {
      const timestamp = Date.now() - 1 * 24 * 60 * 60 * 1000; // 1 day ago
      render(<VersionCompareModal {...createDefaultProps({ timestamp })} />);
      expect(screen.getByText(/1 dia/)).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DIFF COMPUTATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Diff', () => {
    it('should display same text without styling for identical content', () => {
      const props = createDefaultProps({
        oldContent: 'Same text',
        newContent: 'Same text',
      });
      render(<VersionCompareModal {...props} />);
      expect(screen.getByText('Same')).toBeInTheDocument();
      expect(screen.getByText('text')).toBeInTheDocument();
    });

    it('should highlight removed text with red styling', () => {
      const props = createDefaultProps({
        oldContent: 'Hello World',
        newContent: 'Hello',
      });
      const { container } = render(<VersionCompareModal {...props} />);
      const removedSpans = container.querySelectorAll('.bg-red-200');
      expect(removedSpans.length).toBeGreaterThan(0);
    });

    it('should highlight added text with green styling', () => {
      const props = createDefaultProps({
        oldContent: 'Hello',
        newContent: 'Hello World',
      });
      const { container } = render(<VersionCompareModal {...props} />);
      const addedSpans = container.querySelectorAll('.bg-green-200');
      expect(addedSpans.length).toBeGreaterThan(0);
    });

    it('should strip HTML tags before computing diff', () => {
      const props = createDefaultProps({
        oldContent: '<p>Text with <b>bold</b></p>',
        newContent: '<div>Text with bold</div>',
      });
      render(<VersionCompareModal {...props} />);
      // Should not display raw HTML tags
      expect(screen.queryByText('<p>')).not.toBeInTheDocument();
      expect(screen.queryByText('<b>')).not.toBeInTheDocument();
    });

    it('should handle empty old content', () => {
      const props = createDefaultProps({
        oldContent: '',
        newContent: 'New content',
      });
      const { container } = render(<VersionCompareModal {...props} />);
      const addedSpans = container.querySelectorAll('.bg-green-200');
      expect(addedSpans.length).toBeGreaterThan(0);
    });

    it('should handle empty new content', () => {
      const props = createDefaultProps({
        oldContent: 'Old content',
        newContent: '',
      });
      const { container } = render(<VersionCompareModal {...props} />);
      const removedSpans = container.querySelectorAll('.bg-red-200');
      expect(removedSpans.length).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INTERACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Interactions', () => {
    it('should call onClose when Cancelar is clicked', () => {
      const props = createDefaultProps();
      render(<VersionCompareModal {...props} />);
      fireEvent.click(screen.getByText('Cancelar'));
      expect(props.onClose).toHaveBeenCalled();
    });

    it('should call onClose when X button is clicked', () => {
      const props = createDefaultProps();
      render(<VersionCompareModal {...props} />);
      fireEvent.click(screen.getByText('×'));
      expect(props.onClose).toHaveBeenCalled();
    });

    it('should call onRestore when Restaurar button is clicked', () => {
      const props = createDefaultProps();
      render(<VersionCompareModal {...props} />);
      fireEvent.click(screen.getByText('Restaurar Versão Anterior'));
      expect(props.onRestore).toHaveBeenCalled();
    });
  });
});

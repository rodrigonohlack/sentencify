/**
 * @file BaseModal.test.tsx
 * @description Testes para o componente BaseModal
 * @version 1.37.57
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BaseModal, ModalFooter, ModalWarningBox, ModalInfoBox, ModalAmberBox, ModalContentPreview, CSS } from './BaseModal';
import { Settings } from 'lucide-react';

describe('BaseModal', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.style.overflow = '';
  });

  afterEach(() => {
    document.body.style.overflow = '';
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      render(
        <BaseModal isOpen={false} onClose={mockOnClose} title="Test Modal">
          <div>Content</div>
        </BaseModal>
      );

      expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(
        <BaseModal isOpen={true} onClose={mockOnClose} title="Test Modal">
          <div>Content</div>
        </BaseModal>
      );

      expect(screen.getByText('Test Modal')).toBeInTheDocument();
      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('should render subtitle when provided', () => {
      render(
        <BaseModal isOpen={true} onClose={mockOnClose} title="Test Modal" subtitle="Subtitle text">
          <div>Content</div>
        </BaseModal>
      );

      expect(screen.getByText('Subtitle text')).toBeInTheDocument();
    });

    it('should render icon when provided', () => {
      render(
        <BaseModal isOpen={true} onClose={mockOnClose} title="Test Modal" icon={<Settings data-testid="icon" />}>
          <div>Content</div>
        </BaseModal>
      );

      expect(screen.getByTestId('icon')).toBeInTheDocument();
    });

    it('should render footer when provided', () => {
      render(
        <BaseModal isOpen={true} onClose={mockOnClose} title="Test Modal" footer={<button>Footer Button</button>}>
          <div>Content</div>
        </BaseModal>
      );

      expect(screen.getByText('Footer Button')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CLOSE BEHAVIOR TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Close Behavior', () => {
    it('should call onClose when X button clicked', () => {
      render(
        <BaseModal isOpen={true} onClose={mockOnClose} title="Test Modal">
          <div>Content</div>
        </BaseModal>
      );

      const closeButton = screen.getByRole('button');
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when ESC key pressed', () => {
      render(
        <BaseModal isOpen={true} onClose={mockOnClose} title="Test Modal">
          <div>Content</div>
        </BaseModal>
      );

      fireEvent.keyDown(window, { key: 'Escape' });

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when overlay clicked', () => {
      render(
        <BaseModal isOpen={true} onClose={mockOnClose} title="Test Modal">
          <div>Content</div>
        </BaseModal>
      );

      // Click on overlay (the outermost div)
      const overlay = screen.getByText('Test Modal').closest('div[class*="fixed inset-0"]');
      if (overlay) {
        fireEvent.click(overlay);
        expect(mockOnClose).toHaveBeenCalled();
      }
    });

    it('should not close when modal content clicked', () => {
      render(
        <BaseModal isOpen={true} onClose={mockOnClose} title="Test Modal">
          <div>Content</div>
        </BaseModal>
      );

      fireEvent.click(screen.getByText('Content'));

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PREVENT CLOSE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Prevent Close', () => {
    it('should not show X button when preventClose is true', () => {
      render(
        <BaseModal isOpen={true} onClose={mockOnClose} title="Test Modal" preventClose={true}>
          <div>Content</div>
        </BaseModal>
      );

      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('should not close on ESC when preventClose is true', () => {
      render(
        <BaseModal isOpen={true} onClose={mockOnClose} title="Test Modal" preventClose={true}>
          <div>Content</div>
        </BaseModal>
      );

      fireEvent.keyDown(window, { key: 'Escape' });

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should not close on overlay click when preventClose is true', () => {
      render(
        <BaseModal isOpen={true} onClose={mockOnClose} title="Test Modal" preventClose={true}>
          <div>Content</div>
        </BaseModal>
      );

      const overlay = screen.getByText('Test Modal').closest('div[class*="fixed inset-0"]');
      if (overlay) {
        fireEvent.click(overlay);
        expect(mockOnClose).not.toHaveBeenCalled();
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SIZE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Sizes', () => {
    it('should apply correct size class for sm', () => {
      const { container } = render(
        <BaseModal isOpen={true} onClose={mockOnClose} title="Test" size="sm">
          <div>Content</div>
        </BaseModal>
      );

      expect(container.innerHTML).toContain('max-w-md');
    });

    it('should apply correct size class for lg', () => {
      const { container } = render(
        <BaseModal isOpen={true} onClose={mockOnClose} title="Test" size="lg">
          <div>Content</div>
        </BaseModal>
      );

      expect(container.innerHTML).toContain('max-w-2xl');
    });

    it('should apply correct size class for xl', () => {
      const { container } = render(
        <BaseModal isOpen={true} onClose={mockOnClose} title="Test" size="xl">
          <div>Content</div>
        </BaseModal>
      );

      expect(container.innerHTML).toContain('max-w-4xl');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ICON COLOR TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Icon Colors', () => {
    it('should apply blue gradient for blue iconColor', () => {
      const { container } = render(
        <BaseModal isOpen={true} onClose={mockOnClose} title="Test" icon={<Settings />} iconColor="blue">
          <div>Content</div>
        </BaseModal>
      );

      expect(container.innerHTML).toContain('from-blue-500');
    });

    it('should apply red gradient for red iconColor', () => {
      const { container } = render(
        <BaseModal isOpen={true} onClose={mockOnClose} title="Test" icon={<Settings />} iconColor="red">
          <div>Content</div>
        </BaseModal>
      );

      expect(container.innerHTML).toContain('from-red-500');
    });

    it('should apply green gradient for green iconColor', () => {
      const { container } = render(
        <BaseModal isOpen={true} onClose={mockOnClose} title="Test" icon={<Settings />} iconColor="green">
          <div>Content</div>
        </BaseModal>
      );

      expect(container.innerHTML).toContain('from-green-500');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SCROLL LOCK TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Scroll Lock', () => {
    it('should lock body scroll when opened', () => {
      render(
        <BaseModal isOpen={true} onClose={mockOnClose} title="Test">
          <div>Content</div>
        </BaseModal>
      );

      expect(document.body.style.overflow).toBe('hidden');
    });

    it('should restore scroll when closed', () => {
      const { rerender } = render(
        <BaseModal isOpen={true} onClose={mockOnClose} title="Test">
          <div>Content</div>
        </BaseModal>
      );

      expect(document.body.style.overflow).toBe('hidden');

      rerender(
        <BaseModal isOpen={false} onClose={mockOnClose} title="Test">
          <div>Content</div>
        </BaseModal>
      );

      expect(document.body.style.overflow).toBe('');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// MODAL FOOTER TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('ModalFooter', () => {
  const mockOnClose = vi.fn();
  const mockOnConfirm = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Standard', () => {
    it('should render Cancel and Confirm buttons', () => {
      render(<ModalFooter.Standard onClose={mockOnClose} onConfirm={mockOnConfirm} />);

      expect(screen.getByText('Cancelar')).toBeInTheDocument();
      expect(screen.getByText('Confirmar')).toBeInTheDocument();
    });

    it('should call onClose when Cancel clicked', () => {
      render(<ModalFooter.Standard onClose={mockOnClose} onConfirm={mockOnConfirm} />);

      fireEvent.click(screen.getByText('Cancelar'));
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onConfirm when Confirm clicked', () => {
      render(<ModalFooter.Standard onClose={mockOnClose} onConfirm={mockOnConfirm} />);

      fireEvent.click(screen.getByText('Confirmar'));
      expect(mockOnConfirm).toHaveBeenCalled();
    });

    it('should show custom confirm text', () => {
      render(<ModalFooter.Standard onClose={mockOnClose} onConfirm={mockOnConfirm} confirmText="Save" />);

      expect(screen.getByText('Save')).toBeInTheDocument();
    });

    it('should disable confirm when disabled prop is true', () => {
      render(<ModalFooter.Standard onClose={mockOnClose} onConfirm={mockOnConfirm} disabled={true} />);

      expect(screen.getByText('Confirmar')).toBeDisabled();
    });

    it('should show loading state', () => {
      render(<ModalFooter.Standard onClose={mockOnClose} onConfirm={mockOnConfirm} loading={true} />);

      expect(screen.getByText('Processando...')).toBeInTheDocument();
    });
  });

  describe('CloseOnly', () => {
    it('should render only Close button', () => {
      render(<ModalFooter.CloseOnly onClose={mockOnClose} />);

      expect(screen.getByText('Fechar')).toBeInTheDocument();
    });

    it('should call onClose when clicked', () => {
      render(<ModalFooter.CloseOnly onClose={mockOnClose} />);

      fireEvent.click(screen.getByText('Fechar'));
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should show custom text', () => {
      render(<ModalFooter.CloseOnly onClose={mockOnClose} text="Done" />);

      expect(screen.getByText('Done')).toBeInTheDocument();
    });
  });

  describe('Destructive', () => {
    it('should render Cancel and Delete buttons', () => {
      render(<ModalFooter.Destructive onClose={mockOnClose} onConfirm={mockOnConfirm} />);

      expect(screen.getByText('Cancelar')).toBeInTheDocument();
      expect(screen.getByText('Deletar')).toBeInTheDocument();
    });

    it('should call onConfirm when Delete clicked', () => {
      render(<ModalFooter.Destructive onClose={mockOnClose} onConfirm={mockOnConfirm} />);

      fireEvent.click(screen.getByText('Deletar'));
      expect(mockOnConfirm).toHaveBeenCalled();
    });
  });

  describe('Success', () => {
    it('should render Cancel and Confirm buttons', () => {
      render(<ModalFooter.Success onClose={mockOnClose} onConfirm={mockOnConfirm} />);

      expect(screen.getByText('Cancelar')).toBeInTheDocument();
      expect(screen.getByText('Confirmar')).toBeInTheDocument();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// MODAL BOX COMPONENT TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('Modal Box Components', () => {
  describe('ModalWarningBox', () => {
    it('should render children', () => {
      render(<ModalWarningBox>Warning message</ModalWarningBox>);

      expect(screen.getByText('Warning message')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(<ModalWarningBox className="custom-class">Warning</ModalWarningBox>);

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('ModalInfoBox', () => {
    it('should render children', () => {
      render(<ModalInfoBox>Info message</ModalInfoBox>);

      expect(screen.getByText('Info message')).toBeInTheDocument();
    });
  });

  describe('ModalAmberBox', () => {
    it('should render children', () => {
      render(<ModalAmberBox>Amber warning</ModalAmberBox>);

      expect(screen.getByText('Amber warning')).toBeInTheDocument();
    });
  });

  describe('ModalContentPreview', () => {
    it('should render title', () => {
      render(<ModalContentPreview title="Preview Title" />);

      expect(screen.getByText('Preview Title')).toBeInTheDocument();
    });

    it('should render subtitle', () => {
      render(<ModalContentPreview title="Title" subtitle="Subtitle" />);

      expect(screen.getByText('Subtitle')).toBeInTheDocument();
    });

    it('should render badge', () => {
      render(<ModalContentPreview title="Title" badge="Badge Text" />);

      expect(screen.getByText('Badge Text')).toBeInTheDocument();
    });

    it('should render children', () => {
      render(<ModalContentPreview title="Title"><div>Child content</div></ModalContentPreview>);

      expect(screen.getByText('Child content')).toBeInTheDocument();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// CSS EXPORT TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('CSS Export', () => {
  it('should export CSS object with expected keys', () => {
    expect(CSS.modalOverlay).toBeDefined();
    expect(CSS.modalContainer).toBeDefined();
    expect(CSS.modalHeader).toBeDefined();
    expect(CSS.modalFooter).toBeDefined();
    expect(CSS.btnSecondary).toBeDefined();
    expect(CSS.btnBlue).toBeDefined();
    expect(CSS.btnRed).toBeDefined();
    expect(CSS.btnGreen).toBeDefined();
    expect(CSS.input).toBeDefined();
  });
});

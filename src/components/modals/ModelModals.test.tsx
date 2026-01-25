/**
 * @file ModelModals.test.tsx
 * @description Testes para os modais de modelo (DeleteModel, DeleteAllModels, DeleteAllPrecedentes)
 * @version 1.38.52
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DeleteModelModal, DeleteAllModelsModal, DeleteAllPrecedentesModal } from './ModelModals';

// Mock BaseModal and its components
vi.mock('./BaseModal', () => ({
  BaseModal: ({ isOpen, children, title, footer }: { isOpen: boolean; children: React.ReactNode; title: string; footer?: React.ReactNode }) => {
    if (!isOpen) return null;
    return (
      <div data-testid="base-modal">
        <h2>{title}</h2>
        <div data-testid="modal-content">{children}</div>
        <div data-testid="modal-footer">{footer}</div>
      </div>
    );
  },
  ModalFooter: {
    Destructive: ({ onClose, onConfirm, confirmText }: { onClose: () => void; onConfirm: () => void; confirmText: string }) => (
      <>
        <button onClick={onClose} data-testid="cancel-button">Cancelar</button>
        <button onClick={onConfirm} data-testid="confirm-button">{confirmText}</button>
      </>
    ),
  },
  ModalWarningBox: ({ children }: { children: React.ReactNode }) => <div data-testid="warning-box">{children}</div>,
  ModalContentPreview: ({ title, badge, children }: { title: string; badge: string; children?: React.ReactNode }) => (
    <div data-testid="content-preview">
      <span>{title}</span>
      <span>{badge}</span>
      {children}
    </div>
  ),
  CSS: {
    btnSecondary: 'btn-secondary',
    label: 'label',
  },
}));

describe('DeleteModelModal', () => {
  const mockModel = {
    id: 'model-1',
    title: 'Test Model',
    category: 'Mérito',
    content: '<p>Content</p>',
    keywords: 'test',
    favorite: false,
  };

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    modelToDelete: mockModel,
    setModelToDelete: vi.fn(),
    onConfirmDelete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render when isOpen is true and model exists', () => {
      render(<DeleteModelModal {...defaultProps} />);
      expect(screen.getByText('Excluir Modelo')).toBeInTheDocument();
    });

    it('should return null when modelToDelete is null', () => {
      const { container } = render(<DeleteModelModal {...defaultProps} modelToDelete={null} />);
      expect(container.firstChild).toBeNull();
    });

    it('should display model title', () => {
      render(<DeleteModelModal {...defaultProps} />);
      expect(screen.getByText('Test Model')).toBeInTheDocument();
    });

    it('should display model category', () => {
      render(<DeleteModelModal {...defaultProps} />);
      expect(screen.getByText('Mérito')).toBeInTheDocument();
    });

    it('should show favorite star when model is favorite', () => {
      const favoriteModel = { ...mockModel, favorite: true };
      render(<DeleteModelModal {...defaultProps} modelToDelete={favoriteModel} />);
      expect(screen.getByText('⭐')).toBeInTheDocument();
    });

    it('should display warning message', () => {
      render(<DeleteModelModal {...defaultProps} />);
      expect(screen.getByTestId('warning-box')).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should call onClose and setModelToDelete when close is clicked', () => {
      render(<DeleteModelModal {...defaultProps} />);
      fireEvent.click(screen.getByTestId('cancel-button'));

      expect(defaultProps.onClose).toHaveBeenCalled();
      expect(defaultProps.setModelToDelete).toHaveBeenCalledWith(null);
    });

    it('should call onConfirmDelete when confirm is clicked', () => {
      render(<DeleteModelModal {...defaultProps} />);
      fireEvent.click(screen.getByTestId('confirm-button'));

      expect(defaultProps.onConfirmDelete).toHaveBeenCalled();
    });
  });
});

describe('DeleteAllModelsModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    totalModels: 15,
    confirmText: '',
    setConfirmText: vi.fn(),
    onConfirmDelete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render when isOpen is true', () => {
      render(<DeleteAllModelsModal {...defaultProps} />);
      expect(screen.getByText(/ATENÇÃO: Exclusão em Massa/)).toBeInTheDocument();
    });

    it('should display total models count', () => {
      render(<DeleteAllModelsModal {...defaultProps} />);
      expect(screen.getByText(/15 modelo\(s\)/)).toBeInTheDocument();
    });

    it('should display warning box with consequences', () => {
      render(<DeleteAllModelsModal {...defaultProps} />);
      expect(screen.getByText(/Todos os 15 modelos serão excluídos/)).toBeInTheDocument();
    });

    it('should display confirmation input', () => {
      render(<DeleteAllModelsModal {...defaultProps} />);
      expect(screen.getByPlaceholderText('Digite EXCLUIR')).toBeInTheDocument();
    });

    it('should show error message when text is wrong', () => {
      render(<DeleteAllModelsModal {...defaultProps} confirmText="wrong" />);
      expect(screen.getByText(/Digite exatamente "EXCLUIR"/)).toBeInTheDocument();
    });

    it('should not show error message when text is empty', () => {
      render(<DeleteAllModelsModal {...defaultProps} confirmText="" />);
      expect(screen.queryByText(/Digite exatamente/)).not.toBeInTheDocument();
    });

    it('should not show error message when text is correct', () => {
      render(<DeleteAllModelsModal {...defaultProps} confirmText="EXCLUIR" />);
      expect(screen.queryByText(/Digite exatamente/)).not.toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should call setConfirmText when typing', () => {
      render(<DeleteAllModelsModal {...defaultProps} />);
      const input = screen.getByPlaceholderText('Digite EXCLUIR');

      fireEvent.change(input, { target: { value: 'EXC' } });
      expect(defaultProps.setConfirmText).toHaveBeenCalledWith('EXC');
    });

    it('should call onClose and clear text when cancel is clicked', () => {
      render(<DeleteAllModelsModal {...defaultProps} />);
      fireEvent.click(screen.getByText('Cancelar'));

      expect(defaultProps.onClose).toHaveBeenCalled();
      expect(defaultProps.setConfirmText).toHaveBeenCalledWith('');
    });

    it('should have disabled delete button when text is wrong', () => {
      render(<DeleteAllModelsModal {...defaultProps} confirmText="wrong" />);
      const deleteBtn = screen.getByText(/Excluir Tudo/);
      expect(deleteBtn).toBeDisabled();
    });

    it('should have enabled delete button when text is correct', () => {
      render(<DeleteAllModelsModal {...defaultProps} confirmText="EXCLUIR" />);
      const deleteBtn = screen.getByText(/Excluir Tudo/);
      expect(deleteBtn).not.toBeDisabled();
    });

    it('should call onConfirmDelete when clicking delete with correct text', () => {
      render(<DeleteAllModelsModal {...defaultProps} confirmText="EXCLUIR" />);
      fireEvent.click(screen.getByText(/Excluir Tudo/));

      expect(defaultProps.onConfirmDelete).toHaveBeenCalled();
    });
  });
});

describe('DeleteAllPrecedentesModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    totalPrecedentes: 25,
    confirmText: '',
    setConfirmText: vi.fn(),
    onConfirmDelete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render when isOpen is true', () => {
      render(<DeleteAllPrecedentesModal {...defaultProps} />);
      expect(screen.getByText(/ATENÇÃO: Exclusão em Massa/)).toBeInTheDocument();
    });

    it('should display total precedentes count', () => {
      render(<DeleteAllPrecedentesModal {...defaultProps} />);
      expect(screen.getByText(/25 precedente\(s\)/)).toBeInTheDocument();
    });

    it('should display warning box', () => {
      render(<DeleteAllPrecedentesModal {...defaultProps} />);
      expect(screen.getByTestId('warning-box')).toBeInTheDocument();
    });

    it('should display confirmation input', () => {
      render(<DeleteAllPrecedentesModal {...defaultProps} />);
      expect(screen.getByPlaceholderText('Digite EXCLUIR')).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should have disabled delete button when text is wrong', () => {
      render(<DeleteAllPrecedentesModal {...defaultProps} confirmText="abc" />);
      const deleteBtn = screen.getByText(/Excluir Tudo/);
      expect(deleteBtn).toBeDisabled();
    });

    it('should have enabled delete button when text is correct', () => {
      render(<DeleteAllPrecedentesModal {...defaultProps} confirmText="EXCLUIR" />);
      const deleteBtn = screen.getByText(/Excluir Tudo/);
      expect(deleteBtn).not.toBeDisabled();
    });

    it('should call onConfirmDelete when delete is clicked', () => {
      render(<DeleteAllPrecedentesModal {...defaultProps} confirmText="EXCLUIR" />);
      fireEvent.click(screen.getByText(/Excluir Tudo/));

      expect(defaultProps.onConfirmDelete).toHaveBeenCalled();
    });
  });
});

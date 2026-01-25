/**
 * @file SessionModals.test.tsx
 * @description Testes para os modais de sessão (RestoreSession, ClearProject, LogoutConfirm)
 * @version 1.38.52
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RestoreSessionModal, ClearProjectModal, LogoutConfirmModal } from './SessionModals';

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
  ModalInfoBox: ({ children }: { children: React.ReactNode }) => <div data-testid="info-box">{children}</div>,
  ModalAmberBox: ({ children }: { children: React.ReactNode }) => <div data-testid="amber-box">{children}</div>,
  CSS: {
    btnGreen: 'btn-green',
    btnRed: 'btn-red',
  },
}));

describe('RestoreSessionModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    sessionLastSaved: '2025-01-20T10:30:00Z',
    onRestoreSession: vi.fn(),
    onStartNew: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render when isOpen is true', () => {
      render(<RestoreSessionModal {...defaultProps} />);
      expect(screen.getByText('Sessão Anterior Encontrada')).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      const { container } = render(<RestoreSessionModal {...defaultProps} isOpen={false} />);
      expect(container.firstChild).toBeNull();
    });

    it('should display formatted last saved date', () => {
      render(<RestoreSessionModal {...defaultProps} />);
      expect(screen.getByText(/Última atualização:/)).toBeInTheDocument();
    });

    it('should display session description', () => {
      render(<RestoreSessionModal {...defaultProps} />);
      expect(screen.getByText(/Encontramos uma sessão salva/)).toBeInTheDocument();
    });

    it('should display tip info box', () => {
      render(<RestoreSessionModal {...defaultProps} />);
      expect(screen.getByTestId('info-box')).toBeInTheDocument();
    });

    it('should render Continue and Start New buttons', () => {
      render(<RestoreSessionModal {...defaultProps} />);
      expect(screen.getByText(/Continuar Sessão/)).toBeInTheDocument();
      expect(screen.getByText(/Começar do Zero/)).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should call onRestoreSession when Continue button clicked', () => {
      render(<RestoreSessionModal {...defaultProps} />);
      fireEvent.click(screen.getByText(/Continuar Sessão/));
      expect(defaultProps.onRestoreSession).toHaveBeenCalledTimes(1);
    });

    it('should call onStartNew when Start New button clicked', () => {
      render(<RestoreSessionModal {...defaultProps} />);
      fireEvent.click(screen.getByText(/Começar do Zero/));
      expect(defaultProps.onStartNew).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty sessionLastSaved', () => {
      render(<RestoreSessionModal {...defaultProps} sessionLastSaved="" />);
      expect(screen.getByText(/Última atualização:/)).toBeInTheDocument();
    });
  });
});

describe('ClearProjectModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirmClear: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render when isOpen is true', () => {
      render(<ClearProjectModal {...defaultProps} />);
      expect(screen.getByText('Limpar Projeto')).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      const { container } = render(<ClearProjectModal {...defaultProps} isOpen={false} />);
      expect(container.firstChild).toBeNull();
    });

    it('should display warning message', () => {
      render(<ClearProjectModal {...defaultProps} />);
      expect(screen.getByText(/limpar todos os dados/)).toBeInTheDocument();
    });

    it('should display amber warning box with items to be deleted', () => {
      render(<ClearProjectModal {...defaultProps} />);
      const amberBox = screen.getByTestId('amber-box');
      expect(amberBox).toBeInTheDocument();
      expect(screen.getByText(/Todos os documentos/)).toBeInTheDocument();
    });

    it('should display tip info box', () => {
      render(<ClearProjectModal {...defaultProps} />);
      expect(screen.getByTestId('info-box')).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should call onClose when Cancel button clicked', () => {
      render(<ClearProjectModal {...defaultProps} />);
      fireEvent.click(screen.getByTestId('cancel-button'));
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onConfirmClear when Confirm button clicked', () => {
      render(<ClearProjectModal {...defaultProps} />);
      fireEvent.click(screen.getByTestId('confirm-button'));
      expect(defaultProps.onConfirmClear).toHaveBeenCalledTimes(1);
    });
  });
});

describe('LogoutConfirmModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render when isOpen is true', () => {
      render(<LogoutConfirmModal {...defaultProps} />);
      expect(screen.getByText('Sair do Sistema')).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      const { container } = render(<LogoutConfirmModal {...defaultProps} isOpen={false} />);
      expect(container.firstChild).toBeNull();
    });

    it('should display logout confirmation message', () => {
      render(<LogoutConfirmModal {...defaultProps} />);
      expect(screen.getByText(/Deseja realmente sair/)).toBeInTheDocument();
    });

    it('should display data persistence info', () => {
      render(<LogoutConfirmModal {...defaultProps} />);
      expect(screen.getByText(/permanecerão salvos localmente/)).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should call onClose when Cancel button clicked', () => {
      render(<LogoutConfirmModal {...defaultProps} />);
      fireEvent.click(screen.getByTestId('cancel-button'));
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onConfirm when Confirm button clicked', () => {
      render(<LogoutConfirmModal {...defaultProps} />);
      fireEvent.click(screen.getByTestId('confirm-button'));
      expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
    });
  });
});

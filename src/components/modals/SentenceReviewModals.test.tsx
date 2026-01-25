/**
 * @file SentenceReviewModals.test.tsx
 * @description Testes para os modais de revisão de sentença
 * @version 1.38.52
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SentenceReviewOptionsModal, SentenceReviewResultModal } from './SentenceReviewModals';
import type { AnalyzedDocuments } from '../../types';

// Mock useModalManager
const mockCloseModal = vi.fn();
const mockOpenModal = vi.fn();
vi.mock('../../hooks/useModalManager', () => ({
  useModalManager: () => ({
    modals: {
      sentenceReview: true,
      sentenceReviewResult: true,
    },
    closeModal: mockCloseModal,
    openModal: mockOpenModal,
  }),
}));

// Mock BaseModal
vi.mock('./BaseModal', () => ({
  BaseModal: ({ isOpen, children, title, subtitle, footer, onClose }: {
    isOpen: boolean;
    children: React.ReactNode;
    title: string;
    subtitle?: React.ReactNode;
    footer?: React.ReactNode;
    onClose: () => void;
  }) => {
    if (!isOpen) return null;
    return (
      <div data-testid="base-modal">
        <h2>{title}</h2>
        {subtitle && <div data-testid="modal-subtitle">{subtitle}</div>}
        <button onClick={onClose} data-testid="close-button">Close</button>
        <div data-testid="modal-content">{children}</div>
        <div data-testid="modal-footer">{footer}</div>
      </div>
    );
  },
  CSS: {
    btnSecondary: 'btn-secondary',
    spinner: 'spinner',
  },
}));

// Mock extractPlainText
vi.mock('../', () => ({
  extractPlainText: (html: string) => html.replace(/<[^>]*>/g, ''),
}));

describe('SentenceReviewOptionsModal', () => {
  const createAnalyzedDocuments = (hasPeticoes = true, hasContestacoes = true): AnalyzedDocuments => ({
    peticoes: hasPeticoes ? ['peticao.pdf'] : [],
    peticoesText: hasPeticoes ? [{ id: '1', text: 'Petição inicial...', name: 'Petição 1' }] : [],
    contestacoes: hasContestacoes ? ['contestacao.pdf'] : [],
    contestacoesText: hasContestacoes ? [{ id: '2', text: 'Contestação...', name: 'Contestação 1' }] : [],
    complementares: [],
    complementaresText: [],
  });

  const defaultProps = {
    reviewScope: 'decisionOnly' as const,
    setReviewScope: vi.fn(),
    analyzedDocuments: createAnalyzedDocuments(),
    generatingReview: false,
    reviewSentence: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Rendering', () => {
    it('should render modal title', () => {
      render(<SentenceReviewOptionsModal {...defaultProps} />);
      expect(screen.getByText('Revisar Sentença')).toBeInTheDocument();
    });

    it('should render description text', () => {
      render(<SentenceReviewOptionsModal {...defaultProps} />);
      expect(screen.getByText(/embargos de declaração/)).toBeInTheDocument();
    });

    it('should render decision only option', () => {
      render(<SentenceReviewOptionsModal {...defaultProps} />);
      expect(screen.getByText('Apenas a decisão completa')).toBeInTheDocument();
    });

    it('should render decision with docs option', () => {
      render(<SentenceReviewOptionsModal {...defaultProps} />);
      expect(screen.getByText('Decisão + peças processuais')).toBeInTheDocument();
    });

    it('should render cancel button', () => {
      render(<SentenceReviewOptionsModal {...defaultProps} />);
      expect(screen.getByText('Cancelar')).toBeInTheDocument();
    });

    it('should render start review button', () => {
      render(<SentenceReviewOptionsModal {...defaultProps} />);
      expect(screen.getByText('Iniciar Revisão')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SCOPE SELECTION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Scope Selection', () => {
    it('should have decisionOnly checked when selected', () => {
      render(<SentenceReviewOptionsModal {...defaultProps} reviewScope="decisionOnly" />);
      const radios = screen.getAllByRole('radio');
      expect(radios[0]).toBeChecked();
    });

    it('should have decisionWithDocs checked when selected', () => {
      render(<SentenceReviewOptionsModal {...defaultProps} reviewScope="decisionWithDocs" />);
      const radios = screen.getAllByRole('radio');
      expect(radios[1]).toBeChecked();
    });

    it('should call setReviewScope when option changes', () => {
      render(<SentenceReviewOptionsModal {...defaultProps} />);
      const radios = screen.getAllByRole('radio');
      fireEvent.click(radios[1]);
      expect(defaultProps.setReviewScope).toHaveBeenCalledWith('decisionWithDocs');
    });

    it('should disable decisionWithDocs when no documents', () => {
      const propsNoDocuments = {
        ...defaultProps,
        analyzedDocuments: createAnalyzedDocuments(false, false),
      };
      render(<SentenceReviewOptionsModal {...propsNoDocuments} />);
      const radios = screen.getAllByRole('radio');
      expect(radios[1]).toBeDisabled();
    });

    it('should show warning when no documents available', () => {
      const propsNoDocuments = {
        ...defaultProps,
        analyzedDocuments: createAnalyzedDocuments(false, false),
      };
      render(<SentenceReviewOptionsModal {...propsNoDocuments} />);
      expect(screen.getByText('Nenhum documento extraído disponível')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INTERACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Interactions', () => {
    it('should call reviewSentence when Iniciar Revisão clicked', () => {
      render(<SentenceReviewOptionsModal {...defaultProps} />);
      fireEvent.click(screen.getByText('Iniciar Revisão'));
      expect(defaultProps.reviewSentence).toHaveBeenCalled();
    });

    it('should call closeModal when Cancelar clicked', () => {
      render(<SentenceReviewOptionsModal {...defaultProps} />);
      fireEvent.click(screen.getByText('Cancelar'));
      expect(mockCloseModal).toHaveBeenCalledWith('sentenceReview');
    });

    it('should disable buttons when generating', () => {
      render(<SentenceReviewOptionsModal {...defaultProps} generatingReview={true} />);
      expect(screen.getByText('Cancelar')).toBeDisabled();
      expect(screen.getByText('Analisando...')).toBeInTheDocument();
    });
  });
});

describe('SentenceReviewResultModal', () => {
  const defaultProps = {
    reviewResult: '<p>Revisão detalhada da sentença</p>',
    reviewFromCache: false,
    sanitizeHTML: (html: string) => html,
    clearReviewCache: vi.fn().mockResolvedValue(undefined),
    setError: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Rendering', () => {
    it('should render modal title', () => {
      render(<SentenceReviewResultModal {...defaultProps} />);
      expect(screen.getByText('Revisão Crítica da Sentença')).toBeInTheDocument();
    });

    it('should return null when no reviewResult', () => {
      const { container } = render(<SentenceReviewResultModal {...defaultProps} reviewResult={null} />);
      expect(container.firstChild).toBeNull();
    });

    it('should render warning about AI review', () => {
      render(<SentenceReviewResultModal {...defaultProps} />);
      expect(screen.getByText('REVISÃO POR IA - AVALIE CRITICAMENTE')).toBeInTheDocument();
    });

    it('should render cache badge when reviewFromCache', () => {
      render(<SentenceReviewResultModal {...defaultProps} reviewFromCache={true} />);
      expect(screen.getByText('Cache')).toBeInTheDocument();
    });

    it('should not render cache badge when not from cache', () => {
      render(<SentenceReviewResultModal {...defaultProps} reviewFromCache={false} />);
      expect(screen.queryByText('Cache')).not.toBeInTheDocument();
    });

    it('should render review content', () => {
      render(<SentenceReviewResultModal {...defaultProps} />);
      expect(screen.getByText('Revisão detalhada da sentença')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FOOTER BUTTONS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Footer Buttons', () => {
    it('should render copy button', () => {
      render(<SentenceReviewResultModal {...defaultProps} />);
      expect(screen.getByText('Copiar Texto')).toBeInTheDocument();
    });

    it('should render regenerate button', () => {
      render(<SentenceReviewResultModal {...defaultProps} />);
      expect(screen.getByText('Regenerar')).toBeInTheDocument();
    });

    it('should render close button', () => {
      render(<SentenceReviewResultModal {...defaultProps} />);
      expect(screen.getByText('Fechar')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // COPY FUNCTIONALITY
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Copy Functionality', () => {
    it('should copy text to clipboard when copy clicked', async () => {
      render(<SentenceReviewResultModal {...defaultProps} />);
      fireEvent.click(screen.getByText('Copiar Texto'));
      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalled();
      });
    });

    it('should show success message after copying', async () => {
      render(<SentenceReviewResultModal {...defaultProps} />);
      fireEvent.click(screen.getByText('Copiar Texto'));
      await waitFor(() => {
        expect(screen.getByText('Copiado!')).toBeInTheDocument();
      });
    });

    it('should call setError when copy fails', async () => {
      const clipboardError = new Error('Copy failed');
      vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValueOnce(clipboardError);

      render(<SentenceReviewResultModal {...defaultProps} />);
      fireEvent.click(screen.getByText('Copiar Texto'));

      await waitFor(() => {
        expect(defaultProps.setError).toHaveBeenCalledWith(expect.stringContaining('Copy failed'));
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // REGENERATE FUNCTIONALITY
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Regenerate Functionality', () => {
    it('should call clearReviewCache when regenerate clicked', async () => {
      render(<SentenceReviewResultModal {...defaultProps} />);
      fireEvent.click(screen.getByText('Regenerar'));
      await waitFor(() => {
        expect(defaultProps.clearReviewCache).toHaveBeenCalled();
      });
    });

    it('should close result modal and open options modal', async () => {
      render(<SentenceReviewResultModal {...defaultProps} />);
      fireEvent.click(screen.getByText('Regenerar'));
      await waitFor(() => {
        expect(mockCloseModal).toHaveBeenCalledWith('sentenceReviewResult');
        expect(mockOpenModal).toHaveBeenCalledWith('sentenceReview');
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CLOSE FUNCTIONALITY
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Close Functionality', () => {
    it('should call closeModal when Fechar clicked', () => {
      render(<SentenceReviewResultModal {...defaultProps} />);
      fireEvent.click(screen.getByText('Fechar'));
      expect(mockCloseModal).toHaveBeenCalledWith('sentenceReviewResult');
    });
  });
});

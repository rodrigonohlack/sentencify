/**
 * @file DownloadModals.test.tsx
 * @description Testes para os modais de download (DataDownload, EmbeddingsDownload)
 * @version 1.38.52
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DataDownloadModal, EmbeddingsDownloadModal } from './DownloadModals';

// Mock BaseModal
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
}));

describe('DataDownloadModal', () => {
  const createDefaultStatus = () => ({
    legislacao: { needed: true, downloading: false, progress: 0, completed: false, error: null },
    jurisprudencia: { needed: true, downloading: false, progress: 0, completed: false, error: null },
  });

  const defaultProps = {
    isOpen: true,
    onDismiss: vi.fn(),
    onStartDownload: vi.fn(),
    status: createDefaultStatus(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Rendering', () => {
    it('should render when isOpen is true', () => {
      render(<DataDownloadModal {...defaultProps} />);
      expect(screen.getByText('Baixar Base de Dados')).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      const { container } = render(<DataDownloadModal {...defaultProps} isOpen={false} />);
      expect(container.firstChild).toBeNull();
    });

    it('should display description text', () => {
      render(<DataDownloadModal {...defaultProps} />);
      expect(screen.getByText(/necessário baixar a base de dados/)).toBeInTheDocument();
    });

    it('should display legislacao item when needed', () => {
      render(<DataDownloadModal {...defaultProps} />);
      expect(screen.getByText(/Legislação/)).toBeInTheDocument();
    });

    it('should display jurisprudencia item when needed', () => {
      render(<DataDownloadModal {...defaultProps} />);
      expect(screen.getByText(/Jurisprudência/)).toBeInTheDocument();
    });

    it('should not display items when not needed', () => {
      const status = {
        legislacao: { needed: false, downloading: false, progress: 0 },
        jurisprudencia: { needed: false, downloading: false, progress: 0 },
      };
      render(<DataDownloadModal {...defaultProps} status={status} />);

      // The items shouldn't render
      const content = screen.getByTestId('modal-content');
      expect(content.textContent).not.toContain('📜');
    });

    it('should show success message when nothing needed', () => {
      const status = {
        legislacao: { needed: false, downloading: false, progress: 0 },
        jurisprudencia: { needed: false, downloading: false, progress: 0 },
      };
      render(<DataDownloadModal {...defaultProps} status={status} />);
      expect(screen.getByText(/Base de dados instalada/)).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DOWNLOAD PROGRESS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Download Progress', () => {
    it('should show progress percentage when downloading', () => {
      const status = {
        legislacao: { needed: true, downloading: true, progress: 0.5 },
        jurisprudencia: { needed: true, downloading: false, progress: 0 },
      };
      render(<DataDownloadModal {...defaultProps} status={status} />);
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('should show completed status', () => {
      const status = {
        legislacao: { needed: true, downloading: false, progress: 1, completed: true },
        jurisprudencia: { needed: true, downloading: false, progress: 0 },
      };
      render(<DataDownloadModal {...defaultProps} status={status} />);
      expect(screen.getByText(/Concluído/)).toBeInTheDocument();
    });

    it('should show error message', () => {
      const status = {
        legislacao: { needed: true, downloading: false, progress: 0, error: 'Download failed' },
        jurisprudencia: { needed: true, downloading: false, progress: 0 },
      };
      render(<DataDownloadModal {...defaultProps} status={status} />);
      expect(screen.getByText('Download failed')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INTERACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Interactions', () => {
    it('should call onDismiss when Depois button clicked', () => {
      render(<DataDownloadModal {...defaultProps} />);
      fireEvent.click(screen.getByText('Depois'));
      expect(defaultProps.onDismiss).toHaveBeenCalled();
    });

    it('should call onStartDownload when Baixar Agora button clicked', () => {
      render(<DataDownloadModal {...defaultProps} />);
      fireEvent.click(screen.getByText('Baixar Agora'));
      expect(defaultProps.onStartDownload).toHaveBeenCalled();
    });

    it('should disable buttons when downloading', () => {
      const status = {
        legislacao: { needed: true, downloading: true, progress: 0.3 },
        jurisprudencia: { needed: true, downloading: false, progress: 0 },
      };
      render(<DataDownloadModal {...defaultProps} status={status} />);

      expect(screen.getByText('Depois')).toBeDisabled();
      expect(screen.getByText('Baixando...')).toBeInTheDocument();
    });

    it('should disable download button when nothing needed', () => {
      const status = {
        legislacao: { needed: false, downloading: false, progress: 0 },
        jurisprudencia: { needed: false, downloading: false, progress: 0 },
      };
      render(<DataDownloadModal {...defaultProps} status={status} />);

      const downloadBtn = screen.getByText('Baixar Agora');
      expect(downloadBtn).toBeDisabled();
    });
  });
});

describe('EmbeddingsDownloadModal', () => {
  const createDefaultStatus = () => ({
    legislacao: { needed: true, downloading: false, progress: 0, completed: false, error: null },
    jurisprudencia: { needed: true, downloading: false, progress: 0, completed: false, error: null },
  });

  const defaultProps = {
    isOpen: true,
    onDismiss: vi.fn(),
    onStartDownload: vi.fn(),
    status: createDefaultStatus(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Rendering', () => {
    it('should render when isOpen is true', () => {
      render(<EmbeddingsDownloadModal {...defaultProps} />);
      expect(screen.getByText('Baixar Dados para Busca Semântica')).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      const { container } = render(<EmbeddingsDownloadModal {...defaultProps} isOpen={false} />);
      expect(container.firstChild).toBeNull();
    });

    it('should display embeddings description', () => {
      render(<EmbeddingsDownloadModal {...defaultProps} />);
      expect(screen.getByText(/busca semântica/)).toBeInTheDocument();
    });

    it('should show larger size for legislacao embeddings', () => {
      render(<EmbeddingsDownloadModal {...defaultProps} />);
      expect(screen.getByText(/211 MB/)).toBeInTheDocument();
    });

    it('should show size for jurisprudencia embeddings', () => {
      render(<EmbeddingsDownloadModal {...defaultProps} />);
      expect(screen.getByText(/38 MB/)).toBeInTheDocument();
    });

    it('should show success message when all embeddings installed', () => {
      const status = {
        legislacao: { needed: false, downloading: false, progress: 0 },
        jurisprudencia: { needed: false, downloading: false, progress: 0 },
      };
      render(<EmbeddingsDownloadModal {...defaultProps} status={status} />);
      expect(screen.getByText(/embeddings já estão instalados/)).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DOWNLOAD PROGRESS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Download Progress', () => {
    it('should show progress for both items when downloading', () => {
      const status = {
        legislacao: { needed: true, downloading: true, progress: 0.75 },
        jurisprudencia: { needed: true, downloading: true, progress: 0.25 },
      };
      render(<EmbeddingsDownloadModal {...defaultProps} status={status} />);

      expect(screen.getByText('75%')).toBeInTheDocument();
      expect(screen.getByText('25%')).toBeInTheDocument();
    });

    it('should show completed status for both items', () => {
      const status = {
        legislacao: { needed: true, downloading: false, progress: 1, completed: true },
        jurisprudencia: { needed: true, downloading: false, progress: 1, completed: true },
      };
      render(<EmbeddingsDownloadModal {...defaultProps} status={status} />);

      const completedElements = screen.getAllByText(/Concluído/);
      expect(completedElements).toHaveLength(2);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INTERACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Interactions', () => {
    it('should call onDismiss when Depois clicked', () => {
      render(<EmbeddingsDownloadModal {...defaultProps} />);
      fireEvent.click(screen.getByText('Depois'));
      expect(defaultProps.onDismiss).toHaveBeenCalled();
    });

    it('should call onStartDownload when Baixar Agora clicked', () => {
      render(<EmbeddingsDownloadModal {...defaultProps} />);
      fireEvent.click(screen.getByText('Baixar Agora'));
      expect(defaultProps.onStartDownload).toHaveBeenCalled();
    });

    it('should show loading state during download', () => {
      const status = {
        legislacao: { needed: true, downloading: true, progress: 0.5 },
        jurisprudencia: { needed: true, downloading: false, progress: 0 },
      };
      render(<EmbeddingsDownloadModal {...defaultProps} status={status} />);
      expect(screen.getByText('Baixando...')).toBeInTheDocument();
    });
  });
});

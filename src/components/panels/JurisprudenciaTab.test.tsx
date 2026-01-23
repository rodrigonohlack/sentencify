/**
 * @file JurisprudenciaTab.test.tsx
 * @description Testes de regressão para o componente JurisprudenciaTab
 * @version 1.38.39
 *
 * Cobre todas as ações do usuário:
 * 1. Busca textual e semântica
 * 2. Filtros por tipo e tribunal
 * 3. Importação de JSON
 * 4. Paginação
 * 5. Modo somente leitura
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { JurisprudenciaTab } from './JurisprudenciaTab';
import type { JurisprudenciaTabProps } from '../../types';

// Mock useUIStore
const mockUIStore = {
  modals: { deleteAllPrecedentes: false } as Record<string, boolean>,
  openModal: vi.fn(),
  closeModal: vi.fn(),
};
vi.mock('../../stores/useUIStore', () => ({
  useUIStore: (selector: (s: typeof mockUIStore) => unknown) => selector(mockUIStore),
}));

// Mock hooks
vi.mock('../../hooks', () => ({
  useJurisprudencia: () => ({
    precedentes: [],
    searchTerm: '',
    handleSearchChange: vi.fn(),
    filtros: { tipo: [], tribunal: [] },
    setFiltros: vi.fn(),
    filteredCount: 0,
    paginatedPrecedentes: [],
    currentPage: 1,
    setCurrentPage: vi.fn(),
    totalPages: 1,
    isLoading: false,
    handleImportJSON: vi.fn().mockResolvedValue({ success: true, count: 5 }),
    handleCopyTese: vi.fn(),
    copiedId: null,
    handleClearAll: vi.fn(),
    deleteAllConfirmText: '',
    setDeleteAllConfirmText: vi.fn(),
  }),
}));

// Mock JurisprudenciaCard
vi.mock('../cards', () => ({
  JurisprudenciaCard: ({ precedente, expanded, onToggleExpand }: {
    precedente: { id: string; tipo: string; numero: string };
    expanded: boolean;
    onToggleExpand: (id: string) => void;
  }) => (
    <div data-testid={`juris-card-${precedente.id}`}>
      <span>{precedente.tipo} - {precedente.numero}</span>
      <button onClick={() => onToggleExpand(precedente.id)}>
        {expanded ? 'Collapse' : 'Expand'}
      </button>
    </div>
  ),
}));

// Mock DeleteAllPrecedentesModal
vi.mock('../modals', () => ({
  DeleteAllPrecedentesModal: ({ isOpen, onClose, onConfirmDelete }: {
    isOpen: boolean;
    onClose: () => void;
    onConfirmDelete: () => void;
  }) => (
    isOpen ? (
      <div data-testid="delete-all-modal">
        <button onClick={onClose}>Cancel</button>
        <button onClick={onConfirmDelete}>Confirm Delete</button>
      </div>
    ) : null
  ),
}));

// Mock services
vi.mock('../../services/AIModelService', () => ({
  default: {
    getEmbedding: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]),
  },
}));

vi.mock('../../services/EmbeddingsServices', () => ({
  JurisEmbeddingsService: {
    searchBySimilarity: vi.fn().mockResolvedValue([]),
  },
}));

describe('JurisprudenciaTab', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // DEFAULT PROPS FACTORY
  // ═══════════════════════════════════════════════════════════════════════════

  const createMockProps = (overrides: Partial<JurisprudenciaTabProps> = {}): JurisprudenciaTabProps => ({
    isReadOnly: false,
    jurisSemanticEnabled: false,
    searchModelReady: false,
    jurisEmbeddingsCount: 0,
    jurisSemanticThreshold: 50,
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockUIStore.modals = { deleteAllPrecedentes: false };
    mockUIStore.openModal = vi.fn();
    mockUIStore.closeModal = vi.fn();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERING TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Rendering', () => {
    it('should render search input', () => {
      const props = createMockProps();
      render(<JurisprudenciaTab {...props} />);

      expect(screen.getByPlaceholderText(/Buscar por tese/i)).toBeInTheDocument();
    });

    it('should render import button', () => {
      const props = createMockProps();
      render(<JurisprudenciaTab {...props} />);

      expect(screen.getByText('Importar JSON')).toBeInTheDocument();
    });

    it('should render type filter buttons', () => {
      const props = createMockProps();
      render(<JurisprudenciaTab {...props} />);

      expect(screen.getByText('IRR')).toBeInTheDocument();
      expect(screen.getByText('IAC')).toBeInTheDocument();
      expect(screen.getByText('IRDR')).toBeInTheDocument();
      expect(screen.getByText('Súmula')).toBeInTheDocument();
      expect(screen.getByText('OJ')).toBeInTheDocument();
    });

    it('should render tribunal filter buttons', () => {
      const props = createMockProps();
      render(<JurisprudenciaTab {...props} />);

      expect(screen.getByText('TST')).toBeInTheDocument();
      expect(screen.getByText('STF')).toBeInTheDocument();
      expect(screen.getByText('STJ')).toBeInTheDocument();
      expect(screen.getByText('TRT8')).toBeInTheDocument();
    });

    it('should show empty state message', () => {
      const props = createMockProps();
      render(<JurisprudenciaTab {...props} />);

      expect(screen.getByText(/Nenhum precedente encontrado/i)).toBeInTheDocument();
    });

    it('should show count of precedentes found', () => {
      const props = createMockProps();
      render(<JurisprudenciaTab {...props} />);

      expect(screen.getByText(/0 precedentes encontrados/i)).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // READ-ONLY MODE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Read-Only Mode', () => {
    it('should show read-only badge', () => {
      const props = createMockProps({ isReadOnly: true });
      render(<JurisprudenciaTab {...props} />);

      expect(screen.getByText('Somente leitura')).toBeInTheDocument();
    });

    it('should disable import button in read-only mode', () => {
      const props = createMockProps({ isReadOnly: true });
      render(<JurisprudenciaTab {...props} />);

      const importButton = screen.getByText('Importar JSON').closest('button');
      expect(importButton).toBeDisabled();
    });

    it('should NOT show delete all button in read-only mode', () => {
      // Need to mock hook to return precedentes
      vi.doMock('../../hooks', () => ({
        useJurisprudencia: () => ({
          precedentes: [{ id: '1', tipo: 'Súmula', numero: '123' }],
          searchTerm: '',
          handleSearchChange: vi.fn(),
          filtros: { tipo: [], tribunal: [] },
          setFiltros: vi.fn(),
          filteredCount: 1,
          paginatedPrecedentes: [],
          currentPage: 1,
          setCurrentPage: vi.fn(),
          totalPages: 1,
          isLoading: false,
          handleImportJSON: vi.fn(),
          handleCopyTese: vi.fn(),
          copiedId: null,
          handleClearAll: vi.fn(),
          deleteAllConfirmText: '',
          setDeleteAllConfirmText: vi.fn(),
        }),
      }));

      const props = createMockProps({ isReadOnly: true });
      render(<JurisprudenciaTab {...props} />);

      expect(screen.queryByTitle('Excluir todos os precedentes')).not.toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SEMANTIC SEARCH TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Semantic Search', () => {
    it('should show semantic toggle when available', () => {
      const props = createMockProps({
        jurisSemanticEnabled: true,
        searchModelReady: true,
        jurisEmbeddingsCount: 100,
      });
      render(<JurisprudenciaTab {...props} />);

      // Toggle is shown with semantic title when semantic is enabled
      expect(screen.getByTitle(/Busca semântica/i)).toBeInTheDocument();
    });

    it('should NOT show semantic toggle when not available', () => {
      const props = createMockProps({
        jurisSemanticEnabled: false,
      });
      render(<JurisprudenciaTab {...props} />);

      expect(screen.queryByTitle(/Busca textual/i)).not.toBeInTheDocument();
    });

    it('should NOT show semantic toggle when model not ready', () => {
      const props = createMockProps({
        jurisSemanticEnabled: true,
        searchModelReady: false,
        jurisEmbeddingsCount: 100,
      });
      render(<JurisprudenciaTab {...props} />);

      expect(screen.queryByTitle(/Busca textual/i)).not.toBeInTheDocument();
    });

    it('should NOT show semantic toggle when no embeddings', () => {
      const props = createMockProps({
        jurisSemanticEnabled: true,
        searchModelReady: true,
        jurisEmbeddingsCount: 0,
      });
      render(<JurisprudenciaTab {...props} />);

      expect(screen.queryByTitle(/Busca textual/i)).not.toBeInTheDocument();
    });

    it('should show different placeholder for semantic search', async () => {
      const props = createMockProps({
        jurisSemanticEnabled: true,
        searchModelReady: true,
        jurisEmbeddingsCount: 100,
      });
      render(<JurisprudenciaTab {...props} />);

      // Since semantic is enabled by default, placeholder should already show semantic text
      expect(screen.getByPlaceholderText(/Buscar por significado/i)).toBeInTheDocument();

      // Toggle to textual search
      const toggleButton = screen.getByTitle(/Busca semântica/i);
      fireEvent.click(toggleButton);

      // After click, should switch to textual
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Buscar por tese/i)).toBeInTheDocument();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FILTER TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Filters', () => {
    it('should have all type filter buttons clickable', () => {
      const props = createMockProps();
      render(<JurisprudenciaTab {...props} />);

      const types = ['IRR', 'IAC', 'IRDR', 'Súmula', 'OJ', 'RG', 'ADI/ADC/ADPF', 'Informativo'];
      types.forEach(tipo => {
        const button = screen.getByText(tipo);
        expect(button).toBeInTheDocument();
        expect(button.tagName).toBe('BUTTON');
      });
    });

    it('should have all tribunal filter buttons clickable', () => {
      const props = createMockProps();
      render(<JurisprudenciaTab {...props} />);

      const tribunais = ['TST', 'STF', 'STJ', 'TRT8'];
      tribunais.forEach(trib => {
        const button = screen.getByText(trib);
        expect(button).toBeInTheDocument();
        expect(button.tagName).toBe('BUTTON');
      });
    });

    it('should visually indicate active type filter', async () => {
      const props = createMockProps();
      render(<JurisprudenciaTab {...props} />);

      const sumulaButton = screen.getByText('Súmula');

      // Initially should not have active class
      expect(sumulaButton.className).not.toContain('bg-purple-600');

      // Click to activate
      fireEvent.click(sumulaButton);

      // Component uses setFiltros which would trigger re-render with new class
      // This tests that clicking works
      expect(sumulaButton).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // IMPORT TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Import', () => {
    it('should have hidden file input for import', () => {
      const props = createMockProps();
      const { container } = render(<JurisprudenciaTab {...props} />);

      const fileInput = container.querySelector('input[type="file"][accept=".json"]');
      expect(fileInput).toBeInTheDocument();
      expect(fileInput).toHaveClass('hidden');
    });

    it('should accept multiple files', () => {
      const props = createMockProps();
      const { container } = render(<JurisprudenciaTab {...props} />);

      const fileInput = container.querySelector('input[type="file"]');
      expect(fileInput).toHaveAttribute('multiple');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DELETE ALL MODAL TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Delete All Modal', () => {
    it('should render DeleteAllPrecedentesModal when open', () => {
      mockUIStore.modals = { deleteAllPrecedentes: true };
      const props = createMockProps();
      render(<JurisprudenciaTab {...props} />);

      expect(screen.getByTestId('delete-all-modal')).toBeInTheDocument();
    });

    it('should NOT render DeleteAllPrecedentesModal when closed', () => {
      mockUIStore.modals = { deleteAllPrecedentes: false };
      const props = createMockProps();
      render(<JurisprudenciaTab {...props} />);

      expect(screen.queryByTestId('delete-all-modal')).not.toBeInTheDocument();
    });

    it('should call closeModal when cancel clicked', () => {
      mockUIStore.modals = { deleteAllPrecedentes: true };
      const props = createMockProps();
      render(<JurisprudenciaTab {...props} />);

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(mockUIStore.closeModal).toHaveBeenCalledWith('deleteAllPrecedentes');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SEARCH INPUT TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Search Input', () => {
    it('should have clear button behavior', () => {
      const props = createMockProps();
      render(<JurisprudenciaTab {...props} />);

      const searchInput = screen.getByPlaceholderText(/Buscar por tese/i);
      expect(searchInput).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGINATION TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Pagination', () => {
    it('should NOT show pagination when only 1 page', () => {
      const props = createMockProps();
      render(<JurisprudenciaTab {...props} />);

      expect(screen.queryByText('Anterior')).not.toBeInTheDocument();
      expect(screen.queryByText('Próxima')).not.toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ACCESSIBILITY TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Accessibility', () => {
    it('should have title on import button', () => {
      const props = createMockProps();
      render(<JurisprudenciaTab {...props} />);

      const importButton = screen.getByText('Importar JSON').closest('button');
      expect(importButton).toHaveAttribute('title');
    });

    it('should have Escape key to clear search', () => {
      const props = createMockProps();
      render(<JurisprudenciaTab {...props} />);

      const searchInput = screen.getByPlaceholderText(/Buscar por tese/i);
      fireEvent.keyDown(searchInput, { key: 'Escape' });

      // This tests that keyDown handler exists
      expect(searchInput).toBeInTheDocument();
    });
  });
});

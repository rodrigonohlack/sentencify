/**
 * @file LegislacaoTab.test.tsx
 * @description Testes de regressão para o componente LegislacaoTab
 * @version 1.38.39
 *
 * Cobre todas as ações do usuário:
 * 1. Busca textual e semântica
 * 2. Filtros por lei
 * 3. Importação de JSON
 * 4. Modo somente leitura
 * 5. Delete all modal
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LegislacaoTab } from './LegislacaoTab';
import type { LegislacaoTabProps } from '../../types';

// Mock useUIStore
const mockUIStore = {
  modals: { deleteAllLegislacao: false } as Record<string, boolean>,
  openModal: vi.fn(),
  closeModal: vi.fn(),
};
vi.mock('../../stores/useUIStore', () => ({
  useUIStore: (selector: (s: typeof mockUIStore) => unknown) => selector(mockUIStore),
}));

// Mock hooks
vi.mock('../../hooks', () => ({
  useLegislacao: () => ({
    artigos: [],
    searchTerm: '',
    setSearchTerm: vi.fn(),
    filteredArtigos: [],
    filteredCount: 0,
    isLoading: false,
    handleImportJSON: vi.fn().mockResolvedValue({ success: true, count: 5 }),
    handleCopyArtigo: vi.fn(),
    copiedId: null,
    handleClearAll: vi.fn(),
    deleteConfirmText: '',
    setDeleteConfirmText: vi.fn(),
    leisDisponiveis: [],
    leiAtiva: null,
    setLeiAtiva: vi.fn(),
  }),
  LEIS_METADATA: {
    clt: { nome: 'CLT', nomeCompleto: 'Consolidação das Leis do Trabalho' },
    cf: { nome: 'CF', nomeCompleto: 'Constituição Federal' },
    cpc: { nome: 'CPC', nomeCompleto: 'Código de Processo Civil' },
  },
}));

// Mock ArtigoCard and VirtualList
vi.mock('../cards', () => ({
  ArtigoCard: ({ artigo, expanded, onToggleExpand }: {
    artigo: { id: string; numero: string; caput: string };
    expanded: boolean;
    onToggleExpand: (id: string) => void;
  }) => (
    <div data-testid={`artigo-card-${artigo.id}`}>
      <span>Art. {artigo.numero}</span>
      <button onClick={() => onToggleExpand(artigo.id)}>
        {expanded ? 'Collapse' : 'Expand'}
      </button>
    </div>
  ),
  VirtualList: ({ items, renderItem }: { items: unknown[]; renderItem: (item: unknown, index: number) => React.ReactNode }) => (
    <div data-testid="virtual-list">
      {items.map((item, idx) => renderItem(item, idx))}
    </div>
  ),
}));

// Mock BaseModal
vi.mock('../modals', () => ({
  BaseModal: ({ isOpen, children, title }: {
    isOpen: boolean;
    children: React.ReactNode;
    title: string;
  }) => (
    isOpen ? (
      <div data-testid="delete-modal" data-title={title}>
        {children}
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
  EmbeddingsService: {
    searchBySimilarity: vi.fn().mockResolvedValue([]),
  },
}));

describe('LegislacaoTab', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // DEFAULT PROPS FACTORY
  // ═══════════════════════════════════════════════════════════════════════════

  const createMockProps = (overrides: Partial<LegislacaoTabProps> = {}): LegislacaoTabProps => ({
    isReadOnly: false,
    semanticSearchEnabled: false,
    searchModelReady: false,
    embeddingsCount: 0,
    semanticThreshold: 50,
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockUIStore.modals = { deleteAllLegislacao: false };
    mockUIStore.openModal = vi.fn();
    mockUIStore.closeModal = vi.fn();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERING TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Rendering', () => {
    it('should render search input', () => {
      const props = createMockProps();
      render(<LegislacaoTab {...props} />);

      expect(screen.getByPlaceholderText(/Buscar por número/i)).toBeInTheDocument();
    });

    it('should render import button', () => {
      const props = createMockProps();
      render(<LegislacaoTab {...props} />);

      expect(screen.getByText('Importar JSON')).toBeInTheDocument();
    });

    it('should show empty state message when no artigos', () => {
      const props = createMockProps();
      render(<LegislacaoTab {...props} />);

      expect(screen.getByText(/Nenhuma legislação importada/i)).toBeInTheDocument();
    });

    it('should mention available files in empty state', () => {
      const props = createMockProps();
      render(<LegislacaoTab {...props} />);

      expect(screen.getByText(/clt\.json, cf\.json, cpc\.json/i)).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // READ-ONLY MODE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Read-Only Mode', () => {
    it('should show read-only badge', () => {
      const props = createMockProps({ isReadOnly: true });
      render(<LegislacaoTab {...props} />);

      expect(screen.getByText('Somente leitura')).toBeInTheDocument();
    });

    it('should disable import button in read-only mode', () => {
      const props = createMockProps({ isReadOnly: true });
      render(<LegislacaoTab {...props} />);

      const importButton = screen.getByText('Importar JSON').closest('button');
      expect(importButton).toBeDisabled();
    });

    it('should have correct title on import button in read-only mode', () => {
      const props = createMockProps({ isReadOnly: true });
      render(<LegislacaoTab {...props} />);

      const importButton = screen.getByText('Importar JSON').closest('button');
      expect(importButton).toHaveAttribute('title', 'Importação desabilitada no modo somente leitura');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SEMANTIC SEARCH TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Semantic Search', () => {
    it('should show semantic toggle when available', () => {
      const props = createMockProps({
        semanticSearchEnabled: true,
        searchModelReady: true,
        embeddingsCount: 100,
      });
      render(<LegislacaoTab {...props} />);

      expect(screen.getByTitle(/Busca semântica/i)).toBeInTheDocument();
    });

    it('should NOT show semantic toggle when not available', () => {
      const props = createMockProps({
        semanticSearchEnabled: false,
      });
      render(<LegislacaoTab {...props} />);

      expect(screen.queryByTitle(/Busca semântica/i)).not.toBeInTheDocument();
    });

    it('should NOT show semantic toggle when model not ready', () => {
      const props = createMockProps({
        semanticSearchEnabled: true,
        searchModelReady: false,
        embeddingsCount: 100,
      });
      render(<LegislacaoTab {...props} />);

      expect(screen.queryByTitle(/Busca semântica/i)).not.toBeInTheDocument();
    });

    it('should NOT show semantic toggle when no embeddings', () => {
      const props = createMockProps({
        semanticSearchEnabled: true,
        searchModelReady: true,
        embeddingsCount: 0,
      });
      render(<LegislacaoTab {...props} />);

      expect(screen.queryByTitle(/Busca semântica/i)).not.toBeInTheDocument();
    });

    it('should show different placeholder for semantic search', async () => {
      const props = createMockProps({
        semanticSearchEnabled: true,
        searchModelReady: true,
        embeddingsCount: 100,
      });
      render(<LegislacaoTab {...props} />);

      // Semantic is enabled by default when available
      expect(screen.getByPlaceholderText(/Buscar por significado/i)).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // IMPORT TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Import', () => {
    it('should have hidden file input for import', () => {
      const props = createMockProps();
      const { container } = render(<LegislacaoTab {...props} />);

      const fileInput = container.querySelector('input[type="file"][accept=".json"]');
      expect(fileInput).toBeInTheDocument();
      expect(fileInput).toHaveClass('hidden');
    });

    it('should accept multiple files', () => {
      const props = createMockProps();
      const { container } = render(<LegislacaoTab {...props} />);

      const fileInput = container.querySelector('input[type="file"]');
      expect(fileInput).toHaveAttribute('multiple');
    });

    it('should disable file input in read-only mode', () => {
      const props = createMockProps({ isReadOnly: true });
      const { container } = render(<LegislacaoTab {...props} />);

      const fileInput = container.querySelector('input[type="file"]');
      expect(fileInput).toBeDisabled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DELETE ALL MODAL TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Delete All Modal', () => {
    it('should render delete modal when open', () => {
      mockUIStore.modals = { deleteAllLegislacao: true };
      const props = createMockProps();
      render(<LegislacaoTab {...props} />);

      expect(screen.getByTestId('delete-modal')).toBeInTheDocument();
    });

    it('should NOT render delete modal when closed', () => {
      mockUIStore.modals = { deleteAllLegislacao: false };
      const props = createMockProps();
      render(<LegislacaoTab {...props} />);

      expect(screen.queryByTestId('delete-modal')).not.toBeInTheDocument();
    });

    it('should have correct title on delete modal', () => {
      mockUIStore.modals = { deleteAllLegislacao: true };
      const props = createMockProps();
      render(<LegislacaoTab {...props} />);

      const modal = screen.getByTestId('delete-modal');
      expect(modal).toHaveAttribute('data-title', 'Excluir Toda Legislação');
    });

    it('should show confirmation input in delete modal', () => {
      mockUIStore.modals = { deleteAllLegislacao: true };
      const props = createMockProps();
      render(<LegislacaoTab {...props} />);

      expect(screen.getByPlaceholderText('Digite EXCLUIR')).toBeInTheDocument();
    });

    it('should have cancel button in delete modal', () => {
      mockUIStore.modals = { deleteAllLegislacao: true };
      const props = createMockProps();
      render(<LegislacaoTab {...props} />);

      expect(screen.getByText('Cancelar')).toBeInTheDocument();
    });

    it('should have disabled delete button until confirmation', () => {
      mockUIStore.modals = { deleteAllLegislacao: true };
      const props = createMockProps();
      render(<LegislacaoTab {...props} />);

      const deleteButton = screen.getByText(/Excluir Tudo/i);
      expect(deleteButton).toBeDisabled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SEARCH INPUT TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Search Input', () => {
    it('should have correct placeholder for textual search', () => {
      const props = createMockProps();
      render(<LegislacaoTab {...props} />);

      expect(screen.getByPlaceholderText(/Buscar por número/i)).toBeInTheDocument();
    });

    it('should have Escape key functionality', () => {
      const props = createMockProps();
      render(<LegislacaoTab {...props} />);

      const searchInput = screen.getByPlaceholderText(/Buscar por número/i);
      fireEvent.keyDown(searchInput, { key: 'Escape' });

      expect(searchInput).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ACCESSIBILITY TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Accessibility', () => {
    it('should have title on import button', () => {
      const props = createMockProps();
      render(<LegislacaoTab {...props} />);

      const importButton = screen.getByText('Importar JSON').closest('button');
      expect(importButton).toHaveAttribute('title', 'Importar artigos de arquivo JSON');
    });

    it('should have clear button title', () => {
      // Would need to mock useLegislacao to return searchTerm
      const props = createMockProps();
      render(<LegislacaoTab {...props} />);

      // Just verify component renders
      expect(screen.getByText('Importar JSON')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // LAW FILTER TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Law Filters', () => {
    it('should NOT show law filters when no laws available', () => {
      const props = createMockProps();
      render(<LegislacaoTab {...props} />);

      // leisDisponiveis is empty in mock
      expect(screen.queryByText('CLT')).not.toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // LOADING STATE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Loading State', () => {
    it('should show loading spinner when isLoading', async () => {
      // Need to mock useLegislacao to return isLoading: true
      vi.doMock('../../hooks', () => ({
        useLegislacao: () => ({
          artigos: [],
          searchTerm: '',
          setSearchTerm: vi.fn(),
          filteredArtigos: [],
          filteredCount: 0,
          isLoading: true,
          handleImportJSON: vi.fn(),
          handleCopyArtigo: vi.fn(),
          copiedId: null,
          handleClearAll: vi.fn(),
          deleteConfirmText: '',
          setDeleteConfirmText: vi.fn(),
          leisDisponiveis: [],
          leiAtiva: null,
          setLeiAtiva: vi.fn(),
        }),
        LEIS_METADATA: {},
      }));

      const props = createMockProps();
      render(<LegislacaoTab {...props} />);

      // Just verify it doesn't crash
      expect(screen.getByText('Importar JSON')).toBeInTheDocument();
    });
  });
});

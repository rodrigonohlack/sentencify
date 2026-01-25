/**
 * @file LegislacaoTab.test.tsx
 * @description Testes de cobertura para o componente LegislacaoTab
 * @version 1.38.49
 *
 * Cobre todas as ações do usuário e paths de renderização:
 * 1. Busca textual e semântica
 * 2. Filtros por lei (tabs de leis)
 * 3. Importação de JSON (sucesso e erro)
 * 4. Modo somente leitura
 * 5. Delete all modal com confirmação
 * 6. Resultados semânticos (com similarity, paragrafos, incisos, alineas)
 * 7. Estados vazios e loading
 * 8. VirtualList rendering
 * 9. Footer com contagem
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { LegislacaoTab } from './LegislacaoTab';
import type { LegislacaoTabProps } from '../../types';

// ═══════════════════════════════════════════════════════════════════════════
// MOCKS
// ═══════════════════════════════════════════════════════════════════════════

const mockUIStore = {
  modals: { deleteAllLegislacao: false } as Record<string, boolean>,
  openModal: vi.fn(),
  closeModal: vi.fn(),
};
vi.mock('../../stores/useUIStore', () => ({
  useUIStore: (selector: (s: typeof mockUIStore) => unknown) => selector(mockUIStore),
}));

// Configurable mock for useLegislacao
let mockLegislacaoData: ReturnType<typeof createDefaultLegisData>;

function createDefaultLegisData() {
  return {
    artigos: [] as Array<{
      id: string; numero: string; caput: string; lei?: string;
      paragrafos?: Array<{ numero: string; texto: string }>;
      incisos?: Array<{ numero: string; texto: string }>;
      alineas?: Array<{ letra: string; texto: string }>;
    }>,
    searchTerm: '',
    setSearchTerm: vi.fn(),
    filteredArtigos: [] as Array<{
      id: string; numero: string; caput: string; lei?: string;
      paragrafos?: Array<{ numero: string; texto: string }>;
      incisos?: Array<{ numero: string; texto: string }>;
      alineas?: Array<{ letra: string; texto: string }>;
    }>,
    filteredCount: 0,
    isLoading: false,
    handleImportJSON: vi.fn().mockResolvedValue({ success: true, count: 5 }),
    handleCopyArtigo: vi.fn(),
    copiedId: null as string | null,
    handleClearAll: vi.fn(),
    deleteConfirmText: '',
    setDeleteConfirmText: vi.fn(),
    leisDisponiveis: [] as string[],
    leiAtiva: null as string | null,
    setLeiAtiva: vi.fn(),
  };
}

vi.mock('../../hooks', () => ({
  useLegislacao: () => mockLegislacaoData,
  LEIS_METADATA: {
    clt: { nome: 'CLT', nomeCompleto: 'Consolidacao das Leis do Trabalho' },
    cf: { nome: 'CF', nomeCompleto: 'Constituicao Federal' },
    cpc: { nome: 'CPC', nomeCompleto: 'Codigo de Processo Civil' },
  } as Record<string, { nome: string; nomeCompleto?: string }>,
}));

vi.mock('../cards', () => ({
  ArtigoCard: ({ artigo, expanded, onToggleExpand, onCopy, copiedId }: {
    artigo: { id: string; numero: string; caput: string };
    expanded: boolean;
    onToggleExpand: (id: string) => void;
    onCopy: (a: unknown) => void;
    copiedId: string | null;
  }) => (
    <div data-testid={`artigo-card-${artigo.id}`}>
      <span>Art. {artigo.numero} - {artigo.caput}</span>
      <button onClick={() => onToggleExpand(artigo.id)} data-testid={`expand-${artigo.id}`}>
        {expanded ? 'Collapse' : 'Expand'}
      </button>
      <button onClick={() => onCopy(artigo)} data-testid={`copy-${artigo.id}`}>
        {copiedId === artigo.id ? 'Copied' : 'Copy'}
      </button>
    </div>
  ),
  VirtualList: ({ items, renderItem, className }: {
    items: unknown[];
    renderItem: (item: unknown, index: number) => React.ReactNode;
    className?: string;
    itemHeight?: number;
    overscan?: number;
    expandedIds?: Set<string>;
  }) => (
    <div data-testid="virtual-list" className={className}>
      {items.map((item, idx) => (
        <div key={idx}>{renderItem(item, idx)}</div>
      ))}
    </div>
  ),
}));

vi.mock('../modals', () => ({
  BaseModal: ({ isOpen, children, title, onClose }: {
    isOpen: boolean;
    children: React.ReactNode;
    title: string;
    onClose: () => void;
    icon?: React.ReactNode;
    iconColor?: string;
    size?: string;
  }) => (
    isOpen ? (
      <div data-testid="delete-modal" data-title={title}>
        <button data-testid="modal-close-btn" onClick={onClose}>X</button>
        {children}
      </div>
    ) : null
  ),
}));

const mockGetEmbedding = vi.fn().mockResolvedValue([0.1, 0.2, 0.3]);
vi.mock('../../services/AIModelService', () => ({
  default: {
    getEmbedding: (...args: unknown[]) => mockGetEmbedding(...args),
  },
}));

const mockSearchBySimilarity = vi.fn().mockResolvedValue([]);
vi.mock('../../services/EmbeddingsServices', () => ({
  EmbeddingsService: {
    searchBySimilarity: (...args: unknown[]) => mockSearchBySimilarity(...args),
  },
}));

// ═══════════════════════════════════════════════════════════════════════════
// TEST SUITE
// ═══════════════════════════════════════════════════════════════════════════

describe('LegislacaoTab', () => {
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
    vi.useFakeTimers();
    localStorage.clear();
    mockUIStore.modals = { deleteAllLegislacao: false };
    mockUIStore.openModal = vi.fn();
    mockUIStore.closeModal = vi.fn();
    mockLegislacaoData = createDefaultLegisData();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // BASIC RENDERING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Basic Rendering', () => {
    it('should render search input with textual placeholder', () => {
      render(<LegislacaoTab {...createMockProps()} />);
      expect(screen.getByPlaceholderText(/Buscar por número.*ou texto/i)).toBeInTheDocument();
    });

    it('should render import button', () => {
      render(<LegislacaoTab {...createMockProps()} />);
      expect(screen.getByText('Importar JSON')).toBeInTheDocument();
    });

    it('should show empty state when no artigos', () => {
      render(<LegislacaoTab {...createMockProps()} />);
      expect(screen.getByText(/Nenhuma legislação importada/i)).toBeInTheDocument();
    });

    it('should show available files info in empty state', () => {
      render(<LegislacaoTab {...createMockProps()} />);
      expect(screen.getByText(/clt\.json, cf\.json, cpc\.json/i)).toBeInTheDocument();
    });

    it('should render artigos via VirtualList when filteredArtigos has items', () => {
      mockLegislacaoData.artigos = [
        { id: 'clt-1', numero: '1', caput: 'Texto do artigo 1', lei: 'clt' },
      ];
      mockLegislacaoData.filteredArtigos = [
        { id: 'clt-1', numero: '1', caput: 'Texto do artigo 1', lei: 'clt' },
      ];
      render(<LegislacaoTab {...createMockProps()} />);
      expect(screen.getByTestId('virtual-list')).toBeInTheDocument();
      expect(screen.getByTestId('artigo-card-clt-1')).toBeInTheDocument();
    });

    it('should show "Nenhum artigo encontrado" when search yields no results', () => {
      mockLegislacaoData.artigos = [
        { id: 'clt-1', numero: '1', caput: 'Texto', lei: 'clt' },
      ];
      mockLegislacaoData.filteredArtigos = [];
      mockLegislacaoData.searchTerm = 'xyz';
      render(<LegislacaoTab {...createMockProps()} />);
      expect(screen.getByText(/Nenhum artigo encontrado para "xyz"/)).toBeInTheDocument();
    });

    it('should show loading spinner when isLoading', () => {
      mockLegislacaoData.isLoading = true;
      const { container } = render(<LegislacaoTab {...createMockProps()} />);
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should show footer with filteredCount when artigos shown', () => {
      mockLegislacaoData.filteredArtigos = [
        { id: 'clt-1', numero: '1', caput: 'texto', lei: 'clt' },
      ];
      mockLegislacaoData.filteredCount = 5;
      render(<LegislacaoTab {...createMockProps()} />);
      expect(screen.getByText(/5 artigo\(s\)/)).toBeInTheDocument();
      expect(screen.getByText(/Scroll virtual ativo/)).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // READ-ONLY MODE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Read-Only Mode', () => {
    it('should show read-only badge', () => {
      render(<LegislacaoTab {...createMockProps({ isReadOnly: true })} />);
      expect(screen.getByText('Somente leitura')).toBeInTheDocument();
    });

    it('should disable import button', () => {
      render(<LegislacaoTab {...createMockProps({ isReadOnly: true })} />);
      const importButton = screen.getByText('Importar JSON').closest('button');
      expect(importButton).toBeDisabled();
    });

    it('should have read-only tooltip on import button', () => {
      render(<LegislacaoTab {...createMockProps({ isReadOnly: true })} />);
      const importButton = screen.getByText('Importar JSON').closest('button');
      expect(importButton).toHaveAttribute('title', 'Importação desabilitada no modo somente leitura');
    });

    it('should NOT show delete button even with artigos', () => {
      mockLegislacaoData.artigos = [{ id: '1', numero: '1', caput: 'txt', lei: 'clt' }];
      render(<LegislacaoTab {...createMockProps({ isReadOnly: true })} />);
      expect(screen.queryByTitle('Excluir toda legislação')).not.toBeInTheDocument();
    });

    it('should disable the hidden file input', () => {
      const { container } = render(<LegislacaoTab {...createMockProps({ isReadOnly: true })} />);
      const fileInput = container.querySelector('input[type="file"]');
      expect(fileInput).toBeDisabled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SEARCH INPUT
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Search Input', () => {
    it('should call setSearchTerm on input change', () => {
      render(<LegislacaoTab {...createMockProps()} />);
      const input = screen.getByPlaceholderText(/Buscar por número/i);
      fireEvent.change(input, { target: { value: 'ferias' } });
      expect(mockLegislacaoData.setSearchTerm).toHaveBeenCalledWith('ferias');
    });

    it('should call setSearchTerm with empty on Escape', () => {
      render(<LegislacaoTab {...createMockProps()} />);
      const input = screen.getByPlaceholderText(/Buscar por número/i);
      fireEvent.keyDown(input, { key: 'Escape' });
      expect(mockLegislacaoData.setSearchTerm).toHaveBeenCalledWith('');
    });

    it('should show clear button when searchTerm is non-empty', () => {
      mockLegislacaoData.searchTerm = 'something';
      render(<LegislacaoTab {...createMockProps()} />);
      expect(screen.getByTitle('Limpar (Esc)')).toBeInTheDocument();
    });

    it('should NOT show clear button when searchTerm is empty', () => {
      mockLegislacaoData.searchTerm = '';
      render(<LegislacaoTab {...createMockProps()} />);
      expect(screen.queryByTitle('Limpar (Esc)')).not.toBeInTheDocument();
    });

    it('should call setSearchTerm with empty when clear button clicked', () => {
      mockLegislacaoData.searchTerm = 'something';
      render(<LegislacaoTab {...createMockProps()} />);
      fireEvent.click(screen.getByTitle('Limpar (Esc)'));
      expect(mockLegislacaoData.setSearchTerm).toHaveBeenCalledWith('');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // LAW FILTER TABS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Law Filter Tabs', () => {
    it('should NOT show law tabs when no laws available', () => {
      mockLegislacaoData.leisDisponiveis = [];
      render(<LegislacaoTab {...createMockProps()} />);
      expect(screen.queryByText('Todas')).not.toBeInTheDocument();
    });

    it('should show "Todas" button with count when laws available', () => {
      mockLegislacaoData.leisDisponiveis = ['clt', 'cf'];
      mockLegislacaoData.artigos = [
        { id: 'clt-1', numero: '1', caput: 'a', lei: 'clt' },
        { id: 'cf-1', numero: '1', caput: 'b', lei: 'cf' },
      ];
      render(<LegislacaoTab {...createMockProps()} />);
      expect(screen.getByText(/Todas \(2\)/)).toBeInTheDocument();
    });

    it('should show individual law buttons with counts', () => {
      mockLegislacaoData.leisDisponiveis = ['clt'];
      mockLegislacaoData.artigos = [
        { id: 'clt-1', numero: '1', caput: 'a', lei: 'clt' },
        { id: 'clt-2', numero: '2', caput: 'b', lei: 'clt' },
      ];
      render(<LegislacaoTab {...createMockProps()} />);
      expect(screen.getByText(/CLT \(2\)/)).toBeInTheDocument();
    });

    it('should call setLeiAtiva(null) when "Todas" clicked', () => {
      mockLegislacaoData.leisDisponiveis = ['clt'];
      mockLegislacaoData.artigos = [{ id: 'clt-1', numero: '1', caput: 'a', lei: 'clt' }];
      render(<LegislacaoTab {...createMockProps()} />);
      fireEvent.click(screen.getByText(/Todas/));
      expect(mockLegislacaoData.setLeiAtiva).toHaveBeenCalledWith(null);
    });

    it('should call setLeiAtiva with lei key when lei button clicked', () => {
      mockLegislacaoData.leisDisponiveis = ['clt'];
      mockLegislacaoData.artigos = [{ id: 'clt-1', numero: '1', caput: 'a', lei: 'clt' }];
      render(<LegislacaoTab {...createMockProps()} />);
      fireEvent.click(screen.getByText(/CLT/));
      expect(mockLegislacaoData.setLeiAtiva).toHaveBeenCalledWith('clt');
    });

    it('should toggle lei off if already active', () => {
      mockLegislacaoData.leisDisponiveis = ['clt'];
      mockLegislacaoData.leiAtiva = 'clt';
      mockLegislacaoData.artigos = [{ id: 'clt-1', numero: '1', caput: 'a', lei: 'clt' }];
      render(<LegislacaoTab {...createMockProps()} />);
      fireEvent.click(screen.getByText(/CLT/));
      expect(mockLegislacaoData.setLeiAtiva).toHaveBeenCalledWith(null);
    });

    it('should highlight active "Todas" button', () => {
      mockLegislacaoData.leisDisponiveis = ['clt'];
      mockLegislacaoData.leiAtiva = null;
      mockLegislacaoData.artigos = [{ id: 'clt-1', numero: '1', caput: 'a', lei: 'clt' }];
      render(<LegislacaoTab {...createMockProps()} />);
      const todasBtn = screen.getByText(/Todas/);
      expect(todasBtn.className).toContain('bg-blue-600');
    });

    it('should highlight active lei button', () => {
      mockLegislacaoData.leisDisponiveis = ['clt'];
      mockLegislacaoData.leiAtiva = 'clt';
      mockLegislacaoData.artigos = [{ id: 'clt-1', numero: '1', caput: 'a', lei: 'clt' }];
      render(<LegislacaoTab {...createMockProps()} />);
      const cltBtn = screen.getByText(/CLT/);
      expect(cltBtn.className).toContain('bg-blue-600');
    });

    it('should show lei.toUpperCase() when no metadata exists', () => {
      mockLegislacaoData.leisDisponiveis = ['unknownlaw'];
      mockLegislacaoData.artigos = [{ id: 'unknownlaw-1', numero: '1', caput: 'a', lei: 'unknownlaw' }];
      render(<LegislacaoTab {...createMockProps()} />);
      expect(screen.getByText(/UNKNOWNLAW \(1\)/)).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // IMPORT
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Import', () => {
    it('should have hidden file input accepting .json', () => {
      const { container } = render(<LegislacaoTab {...createMockProps()} />);
      const fileInput = container.querySelector('input[type="file"][accept=".json"]');
      expect(fileInput).toBeInTheDocument();
      expect(fileInput).toHaveClass('hidden');
    });

    it('should accept multiple files', () => {
      const { container } = render(<LegislacaoTab {...createMockProps()} />);
      const fileInput = container.querySelector('input[type="file"]');
      expect(fileInput).toHaveAttribute('multiple');
    });

    it('should show success status after import', async () => {
      vi.useRealTimers();
      mockLegislacaoData.handleImportJSON = vi.fn().mockResolvedValue({ success: true, count: 15 });
      const { container } = render(<LegislacaoTab {...createMockProps()} />);
      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

      const file = new File(['{}'], 'clt.json', { type: 'application/json' });
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file] } });
      });

      await waitFor(() => {
        expect(screen.getByText(/15 artigos importados de 1 arquivo/)).toBeInTheDocument();
      });
    });

    it('should show error status after failed import', async () => {
      vi.useRealTimers();
      mockLegislacaoData.handleImportJSON = vi.fn().mockResolvedValue({ success: false, error: 'formato invalido' });
      const { container } = render(<LegislacaoTab {...createMockProps()} />);
      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

      const file = new File(['{}'], 'bad.json', { type: 'application/json' });
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file] } });
      });

      await waitFor(() => {
        expect(screen.getByText(/bad\.json: formato invalido/)).toBeInTheDocument();
      });
    });

    it('should do nothing when no files selected', async () => {
      vi.useRealTimers();
      const { container } = render(<LegislacaoTab {...createMockProps()} />);
      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [] } });
      });

      expect(mockLegislacaoData.handleImportJSON).not.toHaveBeenCalled();
    });

    it('should handle multiple files import', async () => {
      vi.useRealTimers();
      mockLegislacaoData.handleImportJSON = vi.fn()
        .mockResolvedValueOnce({ success: true, count: 10 })
        .mockResolvedValueOnce({ success: true, count: 5 });
      const { container } = render(<LegislacaoTab {...createMockProps()} />);
      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

      const file1 = new File(['{}'], 'clt.json', { type: 'application/json' });
      const file2 = new File(['{}'], 'cf.json', { type: 'application/json' });
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file1, file2] } });
      });

      await waitFor(() => {
        expect(screen.getByText(/15 artigos importados de 2 arquivo/)).toBeInTheDocument();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DELETE ALL MODAL
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Delete All Modal', () => {
    it('should show delete button when artigos exist and not read-only', () => {
      mockLegislacaoData.artigos = [{ id: '1', numero: '1', caput: 'txt', lei: 'clt' }];
      render(<LegislacaoTab {...createMockProps()} />);
      expect(screen.getByTitle('Excluir toda legislação')).toBeInTheDocument();
    });

    it('should call openModal when delete button clicked', () => {
      mockLegislacaoData.artigos = [{ id: '1', numero: '1', caput: 'txt', lei: 'clt' }];
      render(<LegislacaoTab {...createMockProps()} />);
      fireEvent.click(screen.getByTitle('Excluir toda legislação'));
      expect(mockUIStore.openModal).toHaveBeenCalledWith('deleteAllLegislacao');
    });

    it('should render delete modal when open', () => {
      mockUIStore.modals = { deleteAllLegislacao: true };
      render(<LegislacaoTab {...createMockProps()} />);
      expect(screen.getByTestId('delete-modal')).toBeInTheDocument();
    });

    it('should have correct title on delete modal', () => {
      mockUIStore.modals = { deleteAllLegislacao: true };
      render(<LegislacaoTab {...createMockProps()} />);
      const modal = screen.getByTestId('delete-modal');
      expect(modal).toHaveAttribute('data-title', 'Excluir Toda Legislação');
    });

    it('should NOT render modal when closed', () => {
      mockUIStore.modals = { deleteAllLegislacao: false };
      render(<LegislacaoTab {...createMockProps()} />);
      expect(screen.queryByTestId('delete-modal')).not.toBeInTheDocument();
    });

    it('should show confirmation input', () => {
      mockUIStore.modals = { deleteAllLegislacao: true };
      render(<LegislacaoTab {...createMockProps()} />);
      expect(screen.getByPlaceholderText('Digite EXCLUIR')).toBeInTheDocument();
    });

    it('should show cancel and delete buttons', () => {
      mockUIStore.modals = { deleteAllLegislacao: true };
      render(<LegislacaoTab {...createMockProps()} />);
      expect(screen.getByText('Cancelar')).toBeInTheDocument();
      expect(screen.getByText(/Excluir Tudo/)).toBeInTheDocument();
    });

    it('should disable delete button when confirmation text wrong', () => {
      mockUIStore.modals = { deleteAllLegislacao: true };
      mockLegislacaoData.deleteConfirmText = 'wrong';
      render(<LegislacaoTab {...createMockProps()} />);
      const deleteBtn = screen.getByText(/Excluir Tudo/);
      expect(deleteBtn).toBeDisabled();
    });

    it('should enable delete button when confirmation text is EXCLUIR', () => {
      mockUIStore.modals = { deleteAllLegislacao: true };
      mockLegislacaoData.deleteConfirmText = 'EXCLUIR';
      render(<LegislacaoTab {...createMockProps()} />);
      const deleteBtn = screen.getByText(/Excluir Tudo/);
      expect(deleteBtn).not.toBeDisabled();
    });

    it('should call handleClearAll and closeModal on delete confirm', async () => {
      vi.useRealTimers();
      mockUIStore.modals = { deleteAllLegislacao: true };
      mockLegislacaoData.deleteConfirmText = 'EXCLUIR';
      mockLegislacaoData.handleClearAll = vi.fn().mockResolvedValue(undefined);
      render(<LegislacaoTab {...createMockProps()} />);

      await act(async () => {
        fireEvent.click(screen.getByText(/Excluir Tudo/));
      });

      expect(mockLegislacaoData.handleClearAll).toHaveBeenCalled();
      expect(mockUIStore.closeModal).toHaveBeenCalledWith('deleteAllLegislacao');
    });

    it('should NOT call handleClearAll when text is not EXCLUIR', async () => {
      vi.useRealTimers();
      mockUIStore.modals = { deleteAllLegislacao: true };
      mockLegislacaoData.deleteConfirmText = 'wrong';
      render(<LegislacaoTab {...createMockProps()} />);

      await act(async () => {
        fireEvent.click(screen.getByText(/Excluir Tudo/));
      });

      expect(mockLegislacaoData.handleClearAll).not.toHaveBeenCalled();
    });

    it('should call closeModal and reset text on cancel', () => {
      mockUIStore.modals = { deleteAllLegislacao: true };
      render(<LegislacaoTab {...createMockProps()} />);
      fireEvent.click(screen.getByText('Cancelar'));
      expect(mockUIStore.closeModal).toHaveBeenCalledWith('deleteAllLegislacao');
      expect(mockLegislacaoData.setDeleteConfirmText).toHaveBeenCalledWith('');
    });

    it('should call closeModal and reset text on modal close (X)', () => {
      mockUIStore.modals = { deleteAllLegislacao: true };
      render(<LegislacaoTab {...createMockProps()} />);
      fireEvent.click(screen.getByTestId('modal-close-btn'));
      expect(mockUIStore.closeModal).toHaveBeenCalledWith('deleteAllLegislacao');
      expect(mockLegislacaoData.setDeleteConfirmText).toHaveBeenCalledWith('');
    });

    it('should show artigos count in modal text', () => {
      mockUIStore.modals = { deleteAllLegislacao: true };
      mockLegislacaoData.artigos = [
        { id: '1', numero: '1', caput: 'a' },
        { id: '2', numero: '2', caput: 'b' },
        { id: '3', numero: '3', caput: 'c' },
      ];
      render(<LegislacaoTab {...createMockProps()} />);
      expect(screen.getByText(/TODOS os 3 artigo\(s\)/)).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SEMANTIC SEARCH
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Semantic Search', () => {
    const semanticProps: Partial<LegislacaoTabProps> = {
      semanticSearchEnabled: true,
      searchModelReady: true,
      embeddingsCount: 100,
      semanticThreshold: 50,
    };

    it('should show semantic toggle when available', () => {
      render(<LegislacaoTab {...createMockProps(semanticProps)} />);
      expect(screen.getByTitle(/Busca semântica/i)).toBeInTheDocument();
    });

    it('should NOT show toggle when semanticSearchEnabled is false', () => {
      render(<LegislacaoTab {...createMockProps({ semanticSearchEnabled: false })} />);
      expect(screen.queryByTitle(/Busca semântica/i)).not.toBeInTheDocument();
    });

    it('should NOT show toggle when model not ready', () => {
      render(<LegislacaoTab {...createMockProps({ ...semanticProps, searchModelReady: false })} />);
      expect(screen.queryByTitle(/Busca semântica/i)).not.toBeInTheDocument();
    });

    it('should NOT show toggle when no embeddings', () => {
      render(<LegislacaoTab {...createMockProps({ ...semanticProps, embeddingsCount: 0 })} />);
      expect(screen.queryByTitle(/Busca semântica/i)).not.toBeInTheDocument();
    });

    it('should use semanticSearchEnabled as default when no localStorage', () => {
      render(<LegislacaoTab {...createMockProps(semanticProps)} />);
      expect(screen.getByPlaceholderText(/Buscar por significado/i)).toBeInTheDocument();
    });

    it('should read initial mode from localStorage', () => {
      localStorage.setItem('legislacaoSemanticMode', 'false');
      render(<LegislacaoTab {...createMockProps(semanticProps)} />);
      expect(screen.getByPlaceholderText(/Buscar por número/i)).toBeInTheDocument();
    });

    it('should toggle between semantic and textual modes', () => {
      render(<LegislacaoTab {...createMockProps(semanticProps)} />);
      const toggle = screen.getByTitle(/Busca semântica/i);
      fireEvent.click(toggle);
      expect(screen.getByPlaceholderText(/Buscar por número/i)).toBeInTheDocument();
    });

    it('should show spinning icon during semantic search', () => {
      mockLegislacaoData.searchTerm = 'demissao sem justa causa';
      mockGetEmbedding.mockImplementation(() => new Promise(() => {})); // Never resolves
      const { container } = render(<LegislacaoTab {...createMockProps(semanticProps)} />);

      act(() => {
        vi.advanceTimersByTime(600);
      });

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should show semantic results with similarity badge', async () => {
      vi.useRealTimers();
      mockLegislacaoData.searchTerm = 'ferias';
      mockLegislacaoData.artigos = [
        { id: 'clt-129', numero: '129', caput: 'Todo empregado tera direito a ferias', lei: 'clt' },
      ];
      mockGetEmbedding.mockResolvedValue([0.1, 0.2]);
      mockSearchBySimilarity.mockResolvedValue([
        { id: 'emb-1', artigoId: 'clt-129', lei: 'clt', type: 'caput', text: 'Todo empregado tera direito a ferias', similarity: 0.85 },
      ]);

      render(<LegislacaoTab {...createMockProps(semanticProps)} />);

      await waitFor(() => {
        expect(screen.getByText(/85% similar/)).toBeInTheDocument();
        expect(screen.getByText('Art. 129')).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should highlight caput when type is caput', async () => {
      vi.useRealTimers();
      mockLegislacaoData.searchTerm = 'ferias';
      mockLegislacaoData.artigos = [
        { id: 'clt-129', numero: '129', caput: 'Texto do caput', lei: 'clt' },
      ];
      mockGetEmbedding.mockResolvedValue([0.1]);
      mockSearchBySimilarity.mockResolvedValue([
        { id: 'emb-1', artigoId: 'clt-129', lei: 'clt', type: 'caput', text: 'Texto do caput', similarity: 0.7 },
      ]);

      render(<LegislacaoTab {...createMockProps(semanticProps)} />);

      await waitFor(() => {
        const caputP = screen.getByText('Texto do caput');
        expect(caputP.className).toContain('font-semibold');
      }, { timeout: 2000 });
    });

    it('should show paragrafos in semantic results', async () => {
      vi.useRealTimers();
      mockLegislacaoData.searchTerm = 'ferias';
      mockLegislacaoData.artigos = [
        {
          id: 'clt-129', numero: '129', caput: 'Texto do caput', lei: 'clt',
          paragrafos: [{ numero: '1', texto: 'Paragrafo primeiro' }],
        },
      ];
      mockGetEmbedding.mockResolvedValue([0.1]);
      mockSearchBySimilarity.mockResolvedValue([
        { id: 'emb-1', artigoId: 'clt-129', lei: 'clt', type: 'paragrafo', text: 'Paragrafo primeiro e mais contexto aqui para o slice funcionar corretamente', similarity: 0.7 },
      ]);

      render(<LegislacaoTab {...createMockProps(semanticProps)} />);

      await waitFor(() => {
        expect(screen.getByText(/Paragrafo primeiro/)).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should show incisos in semantic results', async () => {
      vi.useRealTimers();
      mockLegislacaoData.searchTerm = 'ferias';
      mockLegislacaoData.artigos = [
        {
          id: 'clt-129', numero: '129', caput: 'Texto caput', lei: 'clt',
          incisos: [{ numero: 'I', texto: 'Inciso primeiro texto longo para o match funcionar correto' }],
        },
      ];
      mockGetEmbedding.mockResolvedValue([0.1]);
      mockSearchBySimilarity.mockResolvedValue([
        { id: 'emb-1', artigoId: 'clt-129', lei: 'clt', type: 'inciso', text: 'Inciso primeiro texto longo para o match funcionar correto', similarity: 0.6 },
      ]);

      render(<LegislacaoTab {...createMockProps(semanticProps)} />);

      await waitFor(() => {
        expect(screen.getByText('I')).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should show alineas in semantic results', async () => {
      vi.useRealTimers();
      mockLegislacaoData.searchTerm = 'ferias';
      mockLegislacaoData.artigos = [
        {
          id: 'clt-129', numero: '129', caput: 'Texto caput', lei: 'clt',
          alineas: [{ letra: 'a', texto: 'Alinea a texto longo aqui para o match funcionar corretamente ok' }],
        },
      ];
      mockGetEmbedding.mockResolvedValue([0.1]);
      mockSearchBySimilarity.mockResolvedValue([
        { id: 'emb-1', artigoId: 'clt-129', lei: 'clt', type: 'alinea', text: 'Alinea a texto longo aqui para o match funcionar corretamente ok', similarity: 0.6 },
      ]);

      render(<LegislacaoTab {...createMockProps(semanticProps)} />);

      await waitFor(() => {
        expect(screen.getByText('a)')).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should show "Nenhum resultado semantico" for empty semantic search', async () => {
      vi.useRealTimers();
      mockLegislacaoData.searchTerm = 'xyz inexistente';
      mockGetEmbedding.mockResolvedValue([0.1]);
      mockSearchBySimilarity.mockResolvedValue([]);

      render(<LegislacaoTab {...createMockProps(semanticProps)} />);

      await waitFor(() => {
        expect(screen.getByText(/Nenhum resultado semântico/)).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should show semantic footer with count', async () => {
      vi.useRealTimers();
      mockLegislacaoData.searchTerm = 'ferias';
      mockLegislacaoData.artigos = [
        { id: 'clt-129', numero: '129', caput: 'texto', lei: 'clt' },
      ];
      mockGetEmbedding.mockResolvedValue([0.1]);
      mockSearchBySimilarity.mockResolvedValue([
        { id: 'emb-1', artigoId: 'clt-129', lei: 'clt', type: 'caput', text: 'texto', similarity: 0.7 },
      ]);

      render(<LegislacaoTab {...createMockProps(semanticProps)} />);

      await waitFor(() => {
        expect(screen.getByText(/1 resultado\(s\) semântico\(s\)/)).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should filter semantic results by leiAtiva', async () => {
      vi.useRealTimers();
      mockLegislacaoData.searchTerm = 'ferias';
      mockLegislacaoData.leiAtiva = 'cf'; // Filter to CF only
      mockLegislacaoData.artigos = [
        { id: 'clt-129', numero: '129', caput: 'texto clt', lei: 'clt' },
        { id: 'cf-5', numero: '5', caput: 'texto cf', lei: 'cf' },
      ];
      mockGetEmbedding.mockResolvedValue([0.1]);
      mockSearchBySimilarity.mockResolvedValue([
        { id: 'emb-1', artigoId: 'clt-129', lei: 'clt', type: 'caput', text: 'texto clt', similarity: 0.8 },
        { id: 'emb-2', artigoId: 'cf-5', lei: 'cf', type: 'caput', text: 'texto cf', similarity: 0.7 },
      ]);

      render(<LegislacaoTab {...createMockProps(semanticProps)} />);

      await waitFor(() => {
        // Only CF result should show (filtered by leiAtiva)
        expect(screen.getByText('Art. 5')).toBeInTheDocument();
        expect(screen.queryByText('Art. 129')).not.toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should handle copy button in semantic results', async () => {
      vi.useRealTimers();
      mockLegislacaoData.searchTerm = 'ferias';
      mockLegislacaoData.artigos = [
        { id: 'clt-129', numero: '129', caput: 'texto', lei: 'clt' },
      ];
      mockGetEmbedding.mockResolvedValue([0.1]);
      mockSearchBySimilarity.mockResolvedValue([
        { id: 'emb-1', artigoId: 'clt-129', lei: 'clt', type: 'caput', text: 'texto', similarity: 0.7 },
      ]);

      render(<LegislacaoTab {...createMockProps(semanticProps)} />);

      await waitFor(() => {
        const copyBtn = screen.getByTitle('Copiar artigo completo');
        fireEvent.click(copyBtn);
        expect(mockLegislacaoData.handleCopyArtigo).toHaveBeenCalled();
      }, { timeout: 2000 });
    });

    it('should handle semantic search error gracefully', async () => {
      vi.useRealTimers();
      mockLegislacaoData.searchTerm = 'error test';
      mockGetEmbedding.mockRejectedValue(new Error('Network error'));

      render(<LegislacaoTab {...createMockProps(semanticProps)} />);

      // After error, semanticResults is null. With searchTerm non-empty and
      // searchingSemantics=false, it shows the "no results" text
      await waitFor(() => {
        expect(screen.getByText(/Nenhum resultado semântico para/)).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should not search with query < 3 chars', () => {
      mockLegislacaoData.searchTerm = 'ab';
      render(<LegislacaoTab {...createMockProps(semanticProps)} />);

      act(() => {
        vi.advanceTimersByTime(600);
      });

      expect(mockGetEmbedding).not.toHaveBeenCalled();
    });

    it('should skip results where artigo not found', async () => {
      vi.useRealTimers();
      mockLegislacaoData.searchTerm = 'busca';
      mockLegislacaoData.artigos = []; // No artigos at all
      mockGetEmbedding.mockResolvedValue([0.1]);
      mockSearchBySimilarity.mockResolvedValue([
        { id: 'emb-1', artigoId: 'nonexistent-id', lei: 'clt', type: 'caput', text: 'text', similarity: 0.7 },
      ]);

      render(<LegislacaoTab {...createMockProps(semanticProps)} />);

      // Should not crash, and should not show any artigo card
      await waitFor(() => {
        expect(screen.queryByText('Art.')).not.toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EXPAND/COLLAPSE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Toggle Expand', () => {
    it('should toggle card expansion on click', () => {
      mockLegislacaoData.filteredArtigos = [
        { id: 'clt-1', numero: '1', caput: 'Texto', lei: 'clt' },
      ];
      render(<LegislacaoTab {...createMockProps()} />);

      const expandBtn = screen.getByTestId('expand-clt-1');
      expect(expandBtn).toHaveTextContent('Expand');

      fireEvent.click(expandBtn);
      expect(expandBtn).toHaveTextContent('Collapse');

      fireEvent.click(expandBtn);
      expect(expandBtn).toHaveTextContent('Expand');
    });
  });
});

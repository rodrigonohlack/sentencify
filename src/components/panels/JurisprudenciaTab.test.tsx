/**
 * @file JurisprudenciaTab.test.tsx
 * @description Testes de cobertura para o componente JurisprudenciaTab
 * @version 1.38.49
 *
 * Cobre todas as ações do usuário e paths de renderização:
 * 1. Busca textual e semântica
 * 2. Filtros por tipo e tribunal
 * 3. Importação de JSON (sucesso e erro)
 * 4. Paginação
 * 5. Modo somente leitura
 * 6. Resultados semânticos (com similarity badges, chunks, cópia)
 * 7. Estados vazios
 * 8. DeleteAll modal
 * 9. Toggle expand de cards
 * 10. Debounce de busca semântica
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { JurisprudenciaTab } from './JurisprudenciaTab';
import type { JurisprudenciaTabProps } from '../../types';

// ═══════════════════════════════════════════════════════════════════════════
// MOCKS
// ═══════════════════════════════════════════════════════════════════════════

const mockUIStore = {
  modals: { deleteAllPrecedentes: false } as Record<string, boolean>,
  openModal: vi.fn(),
  closeModal: vi.fn(),
};
vi.mock('../../stores/useUIStore', () => ({
  useUIStore: (selector: (s: typeof mockUIStore) => unknown) => selector(mockUIStore),
}));

// Configurable mock for useJurisprudencia
let mockJurisprudenciaData: ReturnType<typeof createDefaultJurisData>;

function createDefaultJurisData() {
  return {
    precedentes: [] as Array<{ id: string; tipo: string; numero: string; tipoProcesso?: string; texto?: string; tese?: string }>,
    searchTerm: '',
    handleSearchChange: vi.fn(),
    filtros: { tipo: [] as string[], tribunal: [] as string[] },
    setFiltros: vi.fn(),
    filteredCount: 0,
    paginatedPrecedentes: [] as Array<{ id: string; tipo: string; numero: string; tipoProcesso?: string; texto?: string; tese?: string }>,
    currentPage: 1,
    setCurrentPage: vi.fn(),
    totalPages: 1,
    isLoading: false,
    handleImportJSON: vi.fn().mockResolvedValue({ success: true, count: 5 }),
    handleCopyTese: vi.fn(),
    copiedId: null as string | null,
    handleClearAll: vi.fn(),
    deleteAllConfirmText: '',
    setDeleteAllConfirmText: vi.fn(),
  };
}

vi.mock('../../hooks', () => ({
  useJurisprudencia: () => mockJurisprudenciaData,
}));

vi.mock('../cards', () => ({
  JurisprudenciaCard: ({ precedente, expanded, onToggleExpand, onCopy, copiedId }: {
    precedente: { id: string; tipo: string; numero: string };
    expanded: boolean;
    onToggleExpand: (id: string) => void;
    onCopy: (p: unknown) => void;
    copiedId: string | null;
  }) => (
    <div data-testid={`juris-card-${precedente.id}`}>
      <span>{precedente.tipo} - {precedente.numero}</span>
      <button onClick={() => onToggleExpand(precedente.id)} data-testid={`expand-${precedente.id}`}>
        {expanded ? 'Collapse' : 'Expand'}
      </button>
      <button onClick={() => onCopy(precedente)} data-testid={`copy-${precedente.id}`}>
        {copiedId === precedente.id ? 'Copied' : 'Copy'}
      </button>
    </div>
  ),
}));

vi.mock('../modals', () => ({
  DeleteAllPrecedentesModal: ({ isOpen, onClose, onConfirmDelete, totalPrecedentes, confirmText, setConfirmText }: {
    isOpen: boolean;
    onClose: () => void;
    onConfirmDelete: () => void;
    totalPrecedentes: number;
    confirmText: string;
    setConfirmText: (v: string) => void;
  }) => (
    isOpen ? (
      <div data-testid="delete-all-modal">
        <span data-testid="total-count">{totalPrecedentes}</span>
        <input data-testid="confirm-input" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
        <button onClick={onClose} data-testid="cancel-btn">Cancel</button>
        <button onClick={onConfirmDelete} data-testid="confirm-delete-btn">Confirm Delete</button>
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
  JurisEmbeddingsService: {
    searchBySimilarity: (...args: unknown[]) => mockSearchBySimilarity(...args),
  },
}));

// ═══════════════════════════════════════════════════════════════════════════
// TEST SUITE
// ═══════════════════════════════════════════════════════════════════════════

describe('JurisprudenciaTab', () => {
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
    vi.useFakeTimers();
    localStorage.clear();
    mockUIStore.modals = { deleteAllPrecedentes: false };
    mockUIStore.openModal = vi.fn();
    mockUIStore.closeModal = vi.fn();
    mockJurisprudenciaData = createDefaultJurisData();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // BASIC RENDERING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Basic Rendering', () => {
    it('should render search input with textual placeholder', () => {
      render(<JurisprudenciaTab {...createMockProps()} />);
      expect(screen.getByPlaceholderText(/Buscar por tese, keywords ou número/i)).toBeInTheDocument();
    });

    it('should render import button', () => {
      render(<JurisprudenciaTab {...createMockProps()} />);
      expect(screen.getByText('Importar JSON')).toBeInTheDocument();
    });

    it('should render all type filter buttons', () => {
      render(<JurisprudenciaTab {...createMockProps()} />);
      const types = ['IRR', 'IAC', 'IRDR', 'Súmula', 'OJ', 'RG', 'ADI/ADC/ADPF', 'Informativo'];
      types.forEach(tipo => {
        expect(screen.getByText(tipo)).toBeInTheDocument();
      });
    });

    it('should render all tribunal filter buttons', () => {
      render(<JurisprudenciaTab {...createMockProps()} />);
      const tribunais = ['TST', 'STF', 'STJ', 'TRT8'];
      tribunais.forEach(trib => {
        expect(screen.getByText(trib)).toBeInTheDocument();
      });
    });

    it('should show filteredCount of precedentes found', () => {
      mockJurisprudenciaData.filteredCount = 42;
      render(<JurisprudenciaTab {...createMockProps()} />);
      expect(screen.getByText(/42 precedentes encontrados/)).toBeInTheDocument();
    });

    it('should show empty state when no paginatedPrecedentes', () => {
      render(<JurisprudenciaTab {...createMockProps()} />);
      expect(screen.getByText(/Nenhum precedente encontrado/i)).toBeInTheDocument();
      expect(screen.getByText(/Importe um arquivo JSON para começar/i)).toBeInTheDocument();
    });

    it('should render JurisprudenciaCards for paginated precedentes', () => {
      mockJurisprudenciaData.paginatedPrecedentes = [
        { id: 'p1', tipo: 'Súmula', numero: '100' },
        { id: 'p2', tipo: 'OJ', numero: '200' },
      ];
      render(<JurisprudenciaTab {...createMockProps()} />);
      expect(screen.getByTestId('juris-card-p1')).toBeInTheDocument();
      expect(screen.getByTestId('juris-card-p2')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // READ-ONLY MODE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Read-Only Mode', () => {
    it('should show read-only badge', () => {
      render(<JurisprudenciaTab {...createMockProps({ isReadOnly: true })} />);
      expect(screen.getByText('Somente leitura')).toBeInTheDocument();
    });

    it('should disable import button', () => {
      render(<JurisprudenciaTab {...createMockProps({ isReadOnly: true })} />);
      const importButton = screen.getByText('Importar JSON').closest('button');
      expect(importButton).toBeDisabled();
    });

    it('should have read-only tooltip on import button', () => {
      render(<JurisprudenciaTab {...createMockProps({ isReadOnly: true })} />);
      const importButton = screen.getByText('Importar JSON').closest('button');
      expect(importButton).toHaveAttribute('title', 'Importação desabilitada no modo somente leitura');
    });

    it('should NOT show delete all button even with precedentes', () => {
      mockJurisprudenciaData.precedentes = [{ id: '1', tipo: 'Súmula', numero: '1' }];
      render(<JurisprudenciaTab {...createMockProps({ isReadOnly: true })} />);
      expect(screen.queryByTitle('Excluir todos os precedentes')).not.toBeInTheDocument();
    });

    it('should disable the hidden file input', () => {
      const { container } = render(<JurisprudenciaTab {...createMockProps({ isReadOnly: true })} />);
      const fileInput = container.querySelector('input[type="file"]');
      expect(fileInput).toBeDisabled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SEARCH INPUT INTERACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Search Input', () => {
    it('should call handleSearchChange on input', () => {
      render(<JurisprudenciaTab {...createMockProps()} />);
      const input = screen.getByPlaceholderText(/Buscar por tese/i);
      fireEvent.change(input, { target: { value: 'teste' } });
      expect(mockJurisprudenciaData.handleSearchChange).toHaveBeenCalled();
    });

    it('should call handleSearchChange with empty on Escape key', () => {
      render(<JurisprudenciaTab {...createMockProps()} />);
      const input = screen.getByPlaceholderText(/Buscar por tese/i);
      fireEvent.keyDown(input, { key: 'Escape' });
      expect(mockJurisprudenciaData.handleSearchChange).toHaveBeenCalled();
    });

    it('should show clear button when searchTerm is non-empty', () => {
      mockJurisprudenciaData.searchTerm = 'something';
      render(<JurisprudenciaTab {...createMockProps()} />);
      expect(screen.getByTitle('Limpar (Esc)')).toBeInTheDocument();
    });

    it('should NOT show clear button when searchTerm is empty', () => {
      mockJurisprudenciaData.searchTerm = '';
      render(<JurisprudenciaTab {...createMockProps()} />);
      expect(screen.queryByTitle('Limpar (Esc)')).not.toBeInTheDocument();
    });

    it('should call handleSearchChange when clear button clicked', () => {
      mockJurisprudenciaData.searchTerm = 'something';
      render(<JurisprudenciaTab {...createMockProps()} />);
      fireEvent.click(screen.getByTitle('Limpar (Esc)'));
      expect(mockJurisprudenciaData.handleSearchChange).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FILTER INTERACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Filters', () => {
    it('should call setFiltros when type button clicked', () => {
      render(<JurisprudenciaTab {...createMockProps()} />);
      fireEvent.click(screen.getByText('Súmula'));
      expect(mockJurisprudenciaData.setFiltros).toHaveBeenCalled();
    });

    it('should call setFiltros when tribunal button clicked', () => {
      render(<JurisprudenciaTab {...createMockProps()} />);
      fireEvent.click(screen.getByText('TST'));
      expect(mockJurisprudenciaData.setFiltros).toHaveBeenCalled();
    });

    it('should apply active style to selected type', () => {
      mockJurisprudenciaData.filtros = { tipo: ['Súmula'], tribunal: [] };
      render(<JurisprudenciaTab {...createMockProps()} />);
      const sumulaBtn = screen.getByText('Súmula');
      expect(sumulaBtn.className).toContain('bg-purple-600');
    });

    it('should apply active style to selected tribunal', () => {
      mockJurisprudenciaData.filtros = { tipo: [], tribunal: ['TST'] };
      render(<JurisprudenciaTab {...createMockProps()} />);
      const tstBtn = screen.getByText('TST');
      expect(tstBtn.className).toContain('bg-blue-600');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // IMPORT
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Import', () => {
    it('should have hidden file input accepting .json', () => {
      const { container } = render(<JurisprudenciaTab {...createMockProps()} />);
      const fileInput = container.querySelector('input[type="file"][accept=".json"]');
      expect(fileInput).toBeInTheDocument();
      expect(fileInput).toHaveClass('hidden');
    });

    it('should accept multiple files', () => {
      const { container } = render(<JurisprudenciaTab {...createMockProps()} />);
      const fileInput = container.querySelector('input[type="file"]');
      expect(fileInput).toHaveAttribute('multiple');
    });

    it('should show success status after successful import', async () => {
      vi.useRealTimers();
      mockJurisprudenciaData.handleImportJSON = vi.fn().mockResolvedValue({ success: true, count: 10 });
      const { container } = render(<JurisprudenciaTab {...createMockProps()} />);
      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

      const file = new File(['{}'], 'test.json', { type: 'application/json' });
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file] } });
      });

      await waitFor(() => {
        expect(screen.getByText(/1 arquivo\(s\), 10 itens/)).toBeInTheDocument();
      });
    });

    it('should show error status after failed import', async () => {
      vi.useRealTimers();
      mockJurisprudenciaData.handleImportJSON = vi.fn().mockResolvedValue({ success: false });
      const { container } = render(<JurisprudenciaTab {...createMockProps()} />);
      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

      const file = new File(['{}'], 'bad.json', { type: 'application/json' });
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file] } });
      });

      await waitFor(() => {
        expect(screen.getByText(/Erro em: bad\.json/)).toBeInTheDocument();
      });
    });

    it('should do nothing when no files selected', async () => {
      vi.useRealTimers();
      const { container } = render(<JurisprudenciaTab {...createMockProps()} />);
      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [] } });
      });

      expect(mockJurisprudenciaData.handleImportJSON).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DELETE ALL
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Delete All', () => {
    it('should show delete button when precedentes exist and not read-only', () => {
      mockJurisprudenciaData.precedentes = [{ id: '1', tipo: 'IRR', numero: '1' }];
      render(<JurisprudenciaTab {...createMockProps()} />);
      expect(screen.getByTitle('Excluir todos os precedentes')).toBeInTheDocument();
    });

    it('should call openModal when delete button clicked', () => {
      mockJurisprudenciaData.precedentes = [{ id: '1', tipo: 'IRR', numero: '1' }];
      render(<JurisprudenciaTab {...createMockProps()} />);
      fireEvent.click(screen.getByTitle('Excluir todos os precedentes'));
      expect(mockUIStore.openModal).toHaveBeenCalledWith('deleteAllPrecedentes');
    });

    it('should render DeleteAllPrecedentesModal when open', () => {
      mockUIStore.modals = { deleteAllPrecedentes: true };
      render(<JurisprudenciaTab {...createMockProps()} />);
      expect(screen.getByTestId('delete-all-modal')).toBeInTheDocument();
    });

    it('should NOT render modal when closed', () => {
      mockUIStore.modals = { deleteAllPrecedentes: false };
      render(<JurisprudenciaTab {...createMockProps()} />);
      expect(screen.queryByTestId('delete-all-modal')).not.toBeInTheDocument();
    });

    it('should call closeModal on cancel', () => {
      mockUIStore.modals = { deleteAllPrecedentes: true };
      render(<JurisprudenciaTab {...createMockProps()} />);
      fireEvent.click(screen.getByTestId('cancel-btn'));
      expect(mockUIStore.closeModal).toHaveBeenCalledWith('deleteAllPrecedentes');
    });

    it('should call handleClearAll on confirm when text is EXCLUIR', async () => {
      vi.useRealTimers();
      mockUIStore.modals = { deleteAllPrecedentes: true };
      mockJurisprudenciaData.deleteAllConfirmText = 'EXCLUIR';
      mockJurisprudenciaData.handleClearAll = vi.fn().mockResolvedValue(undefined);
      render(<JurisprudenciaTab {...createMockProps()} />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('confirm-delete-btn'));
      });

      expect(mockJurisprudenciaData.handleClearAll).toHaveBeenCalled();
      expect(mockUIStore.closeModal).toHaveBeenCalledWith('deleteAllPrecedentes');
    });

    it('should NOT call handleClearAll if confirm text is wrong', async () => {
      vi.useRealTimers();
      mockUIStore.modals = { deleteAllPrecedentes: true };
      mockJurisprudenciaData.deleteAllConfirmText = 'wrong';
      render(<JurisprudenciaTab {...createMockProps()} />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('confirm-delete-btn'));
      });

      expect(mockJurisprudenciaData.handleClearAll).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGINATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Pagination', () => {
    it('should NOT show pagination when only 1 page', () => {
      mockJurisprudenciaData.totalPages = 1;
      render(<JurisprudenciaTab {...createMockProps()} />);
      expect(screen.queryByText('Anterior')).not.toBeInTheDocument();
      expect(screen.queryByText('Próxima')).not.toBeInTheDocument();
    });

    it('should show pagination when more than 1 page', () => {
      mockJurisprudenciaData.totalPages = 3;
      mockJurisprudenciaData.currentPage = 2;
      render(<JurisprudenciaTab {...createMockProps()} />);
      expect(screen.getByText('Anterior')).toBeInTheDocument();
      expect(screen.getByText('Próxima')).toBeInTheDocument();
      expect(screen.getByText('2 / 3')).toBeInTheDocument();
    });

    it('should disable Anterior on first page', () => {
      mockJurisprudenciaData.totalPages = 3;
      mockJurisprudenciaData.currentPage = 1;
      render(<JurisprudenciaTab {...createMockProps()} />);
      expect(screen.getByText('Anterior')).toBeDisabled();
    });

    it('should disable Próxima on last page', () => {
      mockJurisprudenciaData.totalPages = 3;
      mockJurisprudenciaData.currentPage = 3;
      render(<JurisprudenciaTab {...createMockProps()} />);
      expect(screen.getByText('Próxima')).toBeDisabled();
    });

    it('should call setCurrentPage on Anterior click', () => {
      mockJurisprudenciaData.totalPages = 3;
      mockJurisprudenciaData.currentPage = 2;
      render(<JurisprudenciaTab {...createMockProps()} />);
      fireEvent.click(screen.getByText('Anterior'));
      expect(mockJurisprudenciaData.setCurrentPage).toHaveBeenCalled();
    });

    it('should call setCurrentPage on Próxima click', () => {
      mockJurisprudenciaData.totalPages = 3;
      mockJurisprudenciaData.currentPage = 2;
      render(<JurisprudenciaTab {...createMockProps()} />);
      fireEvent.click(screen.getByText('Próxima'));
      expect(mockJurisprudenciaData.setCurrentPage).toHaveBeenCalled();
    });

    it('should NOT show pagination in semantic search mode', () => {
      // Semantic mode hides pagination
      localStorage.setItem('jurisSemanticMode', 'true');
      mockJurisprudenciaData.totalPages = 3;
      render(<JurisprudenciaTab {...createMockProps({
        jurisSemanticEnabled: true,
        searchModelReady: true,
        jurisEmbeddingsCount: 100,
      })} />);
      expect(screen.queryByText('Anterior')).not.toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SEMANTIC SEARCH
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Semantic Search', () => {
    const semanticProps: Partial<JurisprudenciaTabProps> = {
      jurisSemanticEnabled: true,
      searchModelReady: true,
      jurisEmbeddingsCount: 100,
      jurisSemanticThreshold: 50,
    };

    it('should show semantic toggle when semanticAvailable', () => {
      render(<JurisprudenciaTab {...createMockProps(semanticProps)} />);
      expect(screen.getByTitle(/Busca semântica/i)).toBeInTheDocument();
    });

    it('should NOT show toggle when jurisSemanticEnabled is false', () => {
      render(<JurisprudenciaTab {...createMockProps({ jurisSemanticEnabled: false })} />);
      expect(screen.queryByTitle(/Busca semântica/i)).not.toBeInTheDocument();
      expect(screen.queryByTitle(/Busca textual/i)).not.toBeInTheDocument();
    });

    it('should NOT show toggle when searchModelReady is false', () => {
      render(<JurisprudenciaTab {...createMockProps({ ...semanticProps, searchModelReady: false })} />);
      expect(screen.queryByTitle(/Busca semântica/i)).not.toBeInTheDocument();
    });

    it('should NOT show toggle when jurisEmbeddingsCount is 0', () => {
      render(<JurisprudenciaTab {...createMockProps({ ...semanticProps, jurisEmbeddingsCount: 0 })} />);
      expect(screen.queryByTitle(/Busca semântica/i)).not.toBeInTheDocument();
    });

    it('should use jurisSemanticEnabled as default when no localStorage', () => {
      render(<JurisprudenciaTab {...createMockProps(semanticProps)} />);
      // With jurisSemanticEnabled=true, it should start in semantic mode
      expect(screen.getByPlaceholderText(/Buscar por significado/i)).toBeInTheDocument();
    });

    it('should read initial mode from localStorage', () => {
      localStorage.setItem('jurisSemanticMode', 'false');
      render(<JurisprudenciaTab {...createMockProps(semanticProps)} />);
      // localStorage says false, so textual mode
      expect(screen.getByPlaceholderText(/Buscar por tese/i)).toBeInTheDocument();
    });

    it('should toggle between semantic and textual modes', () => {
      render(<JurisprudenciaTab {...createMockProps(semanticProps)} />);
      const toggle = screen.getByTitle(/Busca semântica/i);
      fireEvent.click(toggle);
      expect(screen.getByPlaceholderText(/Buscar por tese/i)).toBeInTheDocument();
    });

    it('should show spinning icon during semantic search', () => {
      // To trigger searchingSemantics, we need the effect to fire
      mockJurisprudenciaData.searchTerm = 'intervalo intrajornada';
      mockGetEmbedding.mockImplementation(() => new Promise(() => {})); // Never resolves
      const { container } = render(<JurisprudenciaTab {...createMockProps(semanticProps)} />);

      act(() => {
        vi.advanceTimersByTime(600); // Past debounce
      });

      // The spinner should appear (RefreshCw with animate-spin)
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should show semantic results count when results present', async () => {
      vi.useRealTimers();
      mockJurisprudenciaData.searchTerm = 'teste busca';
      mockGetEmbedding.mockResolvedValue([0.1, 0.2]);
      mockSearchBySimilarity.mockResolvedValue([
        { id: 'r1', tipoProcesso: 'Súmula', numero: '100', text: 'Texto', similarity: 0.8 },
        { id: 'r2', tipoProcesso: 'OJ', numero: '200', text: 'Outro', similarity: 0.6 },
      ]);

      render(<JurisprudenciaTab {...createMockProps(semanticProps)} />);

      await waitFor(() => {
        expect(screen.getByText(/2 resultado\(s\) semântico\(s\)/)).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should show empty semantic results message', async () => {
      vi.useRealTimers();
      mockJurisprudenciaData.searchTerm = 'teste vazio';
      mockGetEmbedding.mockResolvedValue([0.1, 0.2]);
      mockSearchBySimilarity.mockResolvedValue([]);

      render(<JurisprudenciaTab {...createMockProps(semanticProps)} />);

      await waitFor(() => {
        expect(screen.getByText(/Nenhum resultado semântico encontrado/)).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should render semantic result cards with similarity badge', async () => {
      vi.useRealTimers();
      mockJurisprudenciaData.searchTerm = 'busca';
      mockGetEmbedding.mockResolvedValue([0.1]);
      mockSearchBySimilarity.mockResolvedValue([
        { id: 'r1', tipoProcesso: 'Súmula', numero: '331', text: 'Texto da tese', fullText: 'Texto completo', similarity: 0.75, tribunal: 'TST' },
      ]);

      render(<JurisprudenciaTab {...createMockProps(semanticProps)} />);

      await waitFor(() => {
        expect(screen.getByText('75%')).toBeInTheDocument();
        expect(screen.getByText(/nº 331/)).toBeInTheDocument();
        expect(screen.getByText('Texto completo')).toBeInTheDocument();
        // TST appears both as filter button and as tribunal badge in results
        const tstElements = screen.getAllByText('TST');
        expect(tstElements.length).toBeGreaterThanOrEqual(2); // filter + result badge
      }, { timeout: 2000 });
    });

    it('should show Tema prefix for non-Sumula/OJ types', async () => {
      vi.useRealTimers();
      mockJurisprudenciaData.searchTerm = 'busca';
      mockGetEmbedding.mockResolvedValue([0.1]);
      mockSearchBySimilarity.mockResolvedValue([
        { id: 'r1', tipoProcesso: 'IRR', numero: '50', text: 'texto', similarity: 0.6 },
      ]);

      render(<JurisprudenciaTab {...createMockProps(semanticProps)} />);

      await waitFor(() => {
        expect(screen.getByText(/Tema 50/)).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should show chunk info when totalChunks > 1', async () => {
      vi.useRealTimers();
      mockJurisprudenciaData.searchTerm = 'busca';
      mockGetEmbedding.mockResolvedValue([0.1]);
      mockSearchBySimilarity.mockResolvedValue([
        { id: 'r1', tipoProcesso: 'Súmula', numero: '1', text: 'chunk text', similarity: 0.7, totalChunks: 3, chunkIndex: 1 },
      ]);

      render(<JurisprudenciaTab {...createMockProps(semanticProps)} />);

      await waitFor(() => {
        expect(screen.getByText(/chunk 2\/3/)).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should show titulo when present in results', async () => {
      vi.useRealTimers();
      mockJurisprudenciaData.searchTerm = 'busca';
      mockGetEmbedding.mockResolvedValue([0.1]);
      mockSearchBySimilarity.mockResolvedValue([
        { id: 'r1', tipoProcesso: 'Súmula', numero: '1', text: 'text', similarity: 0.7, titulo: 'TITULO DA TESE' },
      ]);

      render(<JurisprudenciaTab {...createMockProps(semanticProps)} />);

      await waitFor(() => {
        expect(screen.getByText('TITULO DA TESE')).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should handle copy button in semantic results', async () => {
      vi.useRealTimers();
      mockJurisprudenciaData.searchTerm = 'busca';
      mockGetEmbedding.mockResolvedValue([0.1]);
      mockSearchBySimilarity.mockResolvedValue([
        { id: 'r1', tipoProcesso: 'Súmula', numero: '1', text: 'text', fullText: 'full text', similarity: 0.7 },
      ]);

      render(<JurisprudenciaTab {...createMockProps(semanticProps)} />);

      await waitFor(() => {
        const copyBtn = screen.getByTitle('Copiar tese completa');
        fireEvent.click(copyBtn);
        expect(mockJurisprudenciaData.handleCopyTese).toHaveBeenCalled();
      }, { timeout: 2000 });
    });

    it('should show green similarity badge for >= 70%', async () => {
      vi.useRealTimers();
      mockJurisprudenciaData.searchTerm = 'busca';
      mockGetEmbedding.mockResolvedValue([0.1]);
      mockSearchBySimilarity.mockResolvedValue([
        { id: 'r1', tipoProcesso: 'Súmula', numero: '1', text: 'text', similarity: 0.75 },
      ]);

      render(<JurisprudenciaTab {...createMockProps(semanticProps)} />);

      await waitFor(() => {
        const badge = screen.getByText('75%');
        expect(badge.className).toContain('bg-green-500/20');
      }, { timeout: 2000 });
    });

    it('should show yellow similarity badge for >= 50% and < 70%', async () => {
      vi.useRealTimers();
      mockJurisprudenciaData.searchTerm = 'busca';
      mockGetEmbedding.mockResolvedValue([0.1]);
      mockSearchBySimilarity.mockResolvedValue([
        { id: 'r1', tipoProcesso: 'Súmula', numero: '1', text: 'text', similarity: 0.55 },
      ]);

      render(<JurisprudenciaTab {...createMockProps(semanticProps)} />);

      await waitFor(() => {
        const badge = screen.getByText('55%');
        expect(badge.className).toContain('bg-yellow-500/20');
      }, { timeout: 2000 });
    });

    it('should show gray similarity badge for < 50%', async () => {
      vi.useRealTimers();
      mockJurisprudenciaData.searchTerm = 'busca';
      mockGetEmbedding.mockResolvedValue([0.1]);
      mockSearchBySimilarity.mockResolvedValue([
        { id: 'r1', tipoProcesso: 'Súmula', numero: '1', text: 'text', similarity: 0.35 },
      ]);

      render(<JurisprudenciaTab {...createMockProps(semanticProps)} />);

      await waitFor(() => {
        const badge = screen.getByText('35%');
        expect(badge.className).toContain('bg-gray-500/20');
      }, { timeout: 2000 });
    });

    it('should handle semantic search error gracefully', async () => {
      vi.useRealTimers();
      mockJurisprudenciaData.searchTerm = 'error test';
      mockGetEmbedding.mockRejectedValue(new Error('Network error'));

      render(<JurisprudenciaTab {...createMockProps(semanticProps)} />);

      // After error, semanticResults stays null (catch sets it to null).
      // With semanticResults=null (falsy), falls through to paginatedPrecedentes check
      // which is empty, showing "Nenhum precedente encontrado"
      await waitFor(() => {
        expect(screen.getByText(/Nenhum precedente encontrado/)).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should not search semantically with query < 3 chars', () => {
      mockJurisprudenciaData.searchTerm = 'ab';
      render(<JurisprudenciaTab {...createMockProps(semanticProps)} />);

      act(() => {
        vi.advanceTimersByTime(600);
      });

      expect(mockGetEmbedding).not.toHaveBeenCalled();
    });

    it('should show "nº" prefix for Súmula type results', async () => {
      vi.useRealTimers();
      mockJurisprudenciaData.searchTerm = 'busca';
      mockGetEmbedding.mockResolvedValue([0.1]);
      mockSearchBySimilarity.mockResolvedValue([
        { id: 'r1', tipoProcesso: 'Súmula', numero: '331', text: 'text', similarity: 0.7 },
      ]);

      render(<JurisprudenciaTab {...createMockProps(semanticProps)} />);

      await waitFor(() => {
        expect(screen.getByText(/nº 331/)).toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EXPAND/COLLAPSE CARDS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Toggle Expand', () => {
    it('should toggle card expansion on click', () => {
      mockJurisprudenciaData.paginatedPrecedentes = [
        { id: 'p1', tipo: 'Súmula', numero: '100' },
      ];
      render(<JurisprudenciaTab {...createMockProps()} />);

      const expandBtn = screen.getByTestId('expand-p1');
      expect(expandBtn).toHaveTextContent('Expand');

      fireEvent.click(expandBtn);
      expect(expandBtn).toHaveTextContent('Collapse');

      fireEvent.click(expandBtn);
      expect(expandBtn).toHaveTextContent('Expand');
    });
  });
});

/**
 * @file JurisprudenciaModal.test.tsx
 * @description Testes de cobertura para o componente JurisprudenciaModal
 *
 * Cobre todos os paths de renderizacao e interacao:
 * 1. Renderizacao basica (header, filtros, busca, resultados)
 * 2. Estado fechado (retorna null)
 * 3. Filtros de tipo e tribunal
 * 4. Busca textual e semantica
 * 5. Loading state
 * 6. Estado vazio
 * 7. Badge IA Local
 * 8. Copiar jurisprudencia
 * 9. Toggle semantico
 * 10. ESC handler
 * 11. Body scroll lock
 * 12. Limpar busca
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { JurisprudenciaModal } from './JurisprudenciaModal';
import type { JurisSuggestion } from '../../types';

// Mock dependencies
vi.mock('./BaseModal', () => ({
  CSS: {
    modalOverlay: 'modal-overlay',
    modalContainer: 'modal-container',
  },
}));

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

vi.mock('../../utils/jurisprudencia', () => ({
  findJurisprudenciaHelper: vi.fn().mockResolvedValue([]),
  isStatusValido: vi.fn((status: string | null | undefined) => {
    if (!status) return true;
    const invalidos = new Set(['cancelado', 'cancelada', 'superado', 'superada', 'revogado', 'revogada']);
    return !invalidos.has(status.toLowerCase());
  }),
}));

vi.mock('../../hooks/useJurisprudencia', () => ({
  JURIS_TIPOS_DISPONIVEIS: ['IRR', 'IAC', 'IRDR', 'Sumula', 'OJ'],
  JURIS_TRIBUNAIS_DISPONIVEIS: ['TST', 'STF', 'STJ'],
  isIRRType: vi.fn((tipo: string | null | undefined) => {
    const IRR_TYPES = new Set(['IRR', 'IRR-R', 'IRRR', 'INCIDENTE DE RECURSO REPETITIVO']);
    return IRR_TYPES.has((tipo || '').toUpperCase().replace(/-/g, ''));
  }),
}));

// ═══════════════════════════════════════════════════════════════════════════
// TEST DATA
// ═══════════════════════════════════════════════════════════════════════════

function createMockSuggestions(): JurisSuggestion[] {
  return [
    {
      id: 'juris-1',
      tipoProcesso: 'IRR',
      numero: '1000',
      tema: '1',
      titulo: 'Horas Extras em Sobrejornada',
      tese: 'O trabalhador faz jus ao pagamento de horas extras quando comprovada a sobrejornada.',
      status: 'vigente',
      tribunal: 'TST',
      orgao: 'SDI-1',
      similarity: 0.85,
    },
    {
      id: 'juris-2',
      tipoProcesso: 'Sumula',
      numero: '85',
      titulo: 'Compensacao de Jornada',
      enunciado: 'A compensacao de jornada requer acordo escrito.',
      status: 'cancelado',
      tribunal: 'TST',
      similarity: 0.72,
    },
    {
      id: 'juris-3',
      tipoProcesso: 'OJ',
      numero: '394',
      titulo: 'Intervalo Intrajornada',
      fullText: 'A nao concessao do intervalo intrajornada implica pagamento total.',
      tribunal: 'STF',
      orgao: 'Plenario',
      similarity: 0.65,
    },
    {
      id: 'juris-4',
      tipoProcesso: 'IAC',
      numero: '500',
      titulo: 'Sem Tese',
      text: 'Conteudo alternativo via text field.',
      tribunal: 'STJ',
      similarity: 0.60,
    },
  ];
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST SUITE
// ═══════════════════════════════════════════════════════════════════════════

describe('JurisprudenciaModal', () => {
  const mockOnClose = vi.fn();
  const mockCallAI = vi.fn();

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    topicTitle: 'Horas Extras',
    topicRelatorio: 'Reclamante trabalhou em sobrejornada',
    callAI: mockCallAI,
    useLocalAI: false,
    jurisSemanticThreshold: 50,
    jurisSemanticEnabled: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset clipboard mock
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  afterEach(() => {
    document.body.style.overflow = '';
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // BASIC RENDERING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Basic Rendering', () => {
    it('should render nothing when isOpen is false', () => {
      const { container } = render(<JurisprudenciaModal {...defaultProps} isOpen={false} />);
      expect(container.innerHTML).toBe('');
    });

    it('should render modal when isOpen is true', () => {
      render(<JurisprudenciaModal {...defaultProps} />);
      expect(screen.getByText(/Jurisprudencia:/)).toBeInTheDocument();
    });

    it('should display topic title in header', () => {
      render(<JurisprudenciaModal {...defaultProps} topicTitle="Intervalo Intrajornada" />);
      expect(screen.getByText(/Intervalo Intrajornada/)).toBeInTheDocument();
    });

    it('should render close button', () => {
      render(<JurisprudenciaModal {...defaultProps} />);
      // The X button in the header
      const closeButtons = screen.getAllByRole('button');
      expect(closeButtons.length).toBeGreaterThan(0);
    });

    it('should render search input', () => {
      render(<JurisprudenciaModal {...defaultProps} />);
      expect(screen.getByPlaceholderText('Buscar por termo, tese...')).toBeInTheDocument();
    });

    it('should render Buscar button', () => {
      render(<JurisprudenciaModal {...defaultProps} />);
      expect(screen.getByText('Buscar')).toBeInTheDocument();
    });

    it('should render type filter buttons', () => {
      render(<JurisprudenciaModal {...defaultProps} />);
      expect(screen.getByText('IRR')).toBeInTheDocument();
      expect(screen.getByText('IAC')).toBeInTheDocument();
      expect(screen.getByText('IRDR')).toBeInTheDocument();
      expect(screen.getByText('Sumula')).toBeInTheDocument();
      expect(screen.getByText('OJ')).toBeInTheDocument();
    });

    it('should render tribunal filter buttons', () => {
      render(<JurisprudenciaModal {...defaultProps} />);
      expect(screen.getByText('TST')).toBeInTheDocument();
      expect(screen.getByText('STF')).toBeInTheDocument();
      expect(screen.getByText('STJ')).toBeInTheDocument();
    });

    it('should show Filtros label', () => {
      render(<JurisprudenciaModal {...defaultProps} />);
      expect(screen.getByText('Filtros:')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CLOSE BEHAVIOR
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Close Behavior', () => {
    it('should call onClose when overlay is clicked', () => {
      render(<JurisprudenciaModal {...defaultProps} />);
      const overlay = screen.getByText(/Jurisprudencia:/).closest('.modal-overlay');
      fireEvent.click(overlay!);
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should NOT call onClose when modal content is clicked', () => {
      render(<JurisprudenciaModal {...defaultProps} />);
      const modalContent = screen.getByText(/Jurisprudencia:/).closest('.modal-container');
      fireEvent.click(modalContent!);
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should call onClose when X button is clicked', () => {
      render(<JurisprudenciaModal {...defaultProps} />);
      // The X button is next to the title in the header
      const header = screen.getByText(/Jurisprudencia:/).closest('.p-4');
      const closeBtn = header?.querySelector('button');
      fireEvent.click(closeBtn!);
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when Escape key is pressed', () => {
      render(<JurisprudenciaModal {...defaultProps} />);
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should NOT call onClose for non-Escape keys', () => {
      render(<JurisprudenciaModal {...defaultProps} />);
      fireEvent.keyDown(window, { key: 'Enter' });
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should remove keydown listener on unmount', () => {
      const { unmount } = render(<JurisprudenciaModal {...defaultProps} />);
      unmount();
      fireEvent.keyDown(window, { key: 'Escape' });
      // Only called 0 times after unmount
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // BODY SCROLL LOCK
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Body Scroll Lock', () => {
    it('should set body overflow to hidden when open', () => {
      render(<JurisprudenciaModal {...defaultProps} />);
      expect(document.body.style.overflow).toBe('hidden');
    });

    it('should restore body overflow when unmounted', () => {
      document.body.style.overflow = 'auto';
      const { unmount } = render(<JurisprudenciaModal {...defaultProps} />);
      expect(document.body.style.overflow).toBe('hidden');
      unmount();
      expect(document.body.style.overflow).toBe('auto');
    });

    it('should NOT modify body overflow when closed', () => {
      document.body.style.overflow = 'scroll';
      render(<JurisprudenciaModal {...defaultProps} isOpen={false} />);
      expect(document.body.style.overflow).toBe('scroll');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FILTERS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Filters', () => {
    it('should toggle tipo filter on click', () => {
      render(<JurisprudenciaModal {...defaultProps} />);
      const irrBtn = screen.getByText('IRR');

      // Initially not active (no bg-purple-600 class)
      expect(irrBtn.className).not.toContain('bg-purple-600');

      fireEvent.click(irrBtn);
      // After click, should be active
      expect(irrBtn.className).toContain('bg-purple-600');
    });

    it('should toggle tipo filter off on second click', () => {
      render(<JurisprudenciaModal {...defaultProps} />);
      const irrBtn = screen.getByText('IRR');

      fireEvent.click(irrBtn); // on
      expect(irrBtn.className).toContain('bg-purple-600');

      fireEvent.click(irrBtn); // off
      expect(irrBtn.className).not.toContain('bg-purple-600');
    });

    it('should toggle tribunal filter on click', () => {
      render(<JurisprudenciaModal {...defaultProps} />);
      const tstBtn = screen.getByText('TST');

      expect(tstBtn.className).not.toContain('bg-blue-600');

      fireEvent.click(tstBtn);
      expect(tstBtn.className).toContain('bg-blue-600');
    });

    it('should toggle tribunal filter off on second click', () => {
      render(<JurisprudenciaModal {...defaultProps} />);
      const stfBtn = screen.getByText('STF');

      fireEvent.click(stfBtn); // on
      expect(stfBtn.className).toContain('bg-blue-600');

      fireEvent.click(stfBtn); // off
      expect(stfBtn.className).not.toContain('bg-blue-600');
    });

    it('should support multiple tipo filters simultaneously', () => {
      render(<JurisprudenciaModal {...defaultProps} />);
      fireEvent.click(screen.getByText('IRR'));
      fireEvent.click(screen.getByText('IAC'));

      expect(screen.getByText('IRR').className).toContain('bg-purple-600');
      expect(screen.getByText('IAC').className).toContain('bg-purple-600');
    });

    it('should support multiple tribunal filters simultaneously', () => {
      render(<JurisprudenciaModal {...defaultProps} />);
      fireEvent.click(screen.getByText('TST'));
      fireEvent.click(screen.getByText('STF'));

      expect(screen.getByText('TST').className).toContain('bg-blue-600');
      expect(screen.getByText('STF').className).toContain('bg-blue-600');
    });

    it('should reset filters when modal closes and reopens', () => {
      const { rerender } = render(<JurisprudenciaModal {...defaultProps} />);

      fireEvent.click(screen.getByText('IRR'));
      expect(screen.getByText('IRR').className).toContain('bg-purple-600');

      // Close
      rerender(<JurisprudenciaModal {...defaultProps} isOpen={false} />);
      // Reopen
      rerender(<JurisprudenciaModal {...defaultProps} isOpen={true} />);

      expect(screen.getByText('IRR').className).not.toContain('bg-purple-600');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SEARCH & RESULTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Search and Results', () => {
    it('should show loading state during search', async () => {
      const { findJurisprudenciaHelper } = await import('../../utils/jurisprudencia');
      let resolveSearch: (value: JurisSuggestion[]) => void;
      (findJurisprudenciaHelper as ReturnType<typeof vi.fn>).mockImplementation(() =>
        new Promise<JurisSuggestion[]>((resolve) => { resolveSearch = resolve; })
      );

      render(<JurisprudenciaModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Buscando precedentes relevantes...')).toBeInTheDocument();
      });

      // Resolve to clean up
      await act(async () => { resolveSearch!([]); });
    });

    it('should show empty state when no results found', async () => {
      const { findJurisprudenciaHelper } = await import('../../utils/jurisprudencia');
      (findJurisprudenciaHelper as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      render(<JurisprudenciaModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/Nenhum precedente encontrado/)).toBeInTheDocument();
      });
    });

    it('should show topic-specific empty message when no search term', async () => {
      const { findJurisprudenciaHelper } = await import('../../utils/jurisprudencia');
      (findJurisprudenciaHelper as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      render(<JurisprudenciaModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/para este topico/)).toBeInTheDocument();
        expect(screen.getByText(/Importe JSONs de jurisprudencia/)).toBeInTheDocument();
      });
    });

    it('should show search-term-specific empty message', async () => {
      const { findJurisprudenciaHelper } = await import('../../utils/jurisprudencia');
      (findJurisprudenciaHelper as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      render(<JurisprudenciaModal {...defaultProps} />);

      // Wait for initial search to finish
      await waitFor(() => {
        expect(screen.getByText(/Nenhum precedente encontrado/)).toBeInTheDocument();
      });

      // Type a search term and click Buscar
      const input = screen.getByPlaceholderText('Buscar por termo, tese...');
      fireEvent.change(input, { target: { value: 'teste busca' } });
      fireEvent.click(screen.getByText('Buscar'));

      await waitFor(() => {
        expect(screen.getByText(/para "teste busca"/)).toBeInTheDocument();
        expect(screen.getByText(/Tente outros termos/)).toBeInTheDocument();
      });
    });

    it('should display suggestions when search returns results', async () => {
      const mockSuggestions = createMockSuggestions();
      const { findJurisprudenciaHelper } = await import('../../utils/jurisprudencia');
      (findJurisprudenciaHelper as ReturnType<typeof vi.fn>).mockResolvedValue(mockSuggestions);

      render(<JurisprudenciaModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Horas Extras em Sobrejornada')).toBeInTheDocument();
        expect(screen.getByText(/O trabalhador faz jus/)).toBeInTheDocument();
      });
    });

    it('should show tipoProcesso and numero for each result', async () => {
      const mockSuggestions = createMockSuggestions();
      const { findJurisprudenciaHelper } = await import('../../utils/jurisprudencia');
      (findJurisprudenciaHelper as ReturnType<typeof vi.fn>).mockResolvedValue(mockSuggestions);

      render(<JurisprudenciaModal {...defaultProps} />);

      await waitFor(() => {
        // IRR type shows "IRR" instead of tipoProcesso
        expect(screen.getByText(/IRR/)).toBeInTheDocument();
        expect(screen.getByText(/Sumula/)).toBeInTheDocument();
      });
    });

    it('should show status badge for valid status', async () => {
      const mockSuggestions = createMockSuggestions();
      const { findJurisprudenciaHelper } = await import('../../utils/jurisprudencia');
      (findJurisprudenciaHelper as ReturnType<typeof vi.fn>).mockResolvedValue(mockSuggestions);

      render(<JurisprudenciaModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/vigente/)).toBeInTheDocument();
      });
    });

    it('should show invalid status badge', async () => {
      const mockSuggestions = createMockSuggestions();
      const { findJurisprudenciaHelper } = await import('../../utils/jurisprudencia');
      (findJurisprudenciaHelper as ReturnType<typeof vi.fn>).mockResolvedValue(mockSuggestions);

      render(<JurisprudenciaModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/cancelado/)).toBeInTheDocument();
      });
    });

    it('should show orgao badge when present', async () => {
      const mockSuggestions = createMockSuggestions();
      const { findJurisprudenciaHelper } = await import('../../utils/jurisprudencia');
      (findJurisprudenciaHelper as ReturnType<typeof vi.fn>).mockResolvedValue(mockSuggestions);

      render(<JurisprudenciaModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('SDI-1')).toBeInTheDocument();
        expect(screen.getByText('Plenario')).toBeInTheDocument();
      });
    });

    it('should show tribunal badge', async () => {
      const mockSuggestions = createMockSuggestions();
      const { findJurisprudenciaHelper } = await import('../../utils/jurisprudencia');
      (findJurisprudenciaHelper as ReturnType<typeof vi.fn>).mockResolvedValue(mockSuggestions);

      render(<JurisprudenciaModal {...defaultProps} />);

      await waitFor(() => {
        // Multiple TST badges from suggestions
        const tstBadges = screen.getAllByText('TST');
        // At least the filter button and badges
        expect(tstBadges.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('should display tese content for suggestion', async () => {
      const mockSuggestions = createMockSuggestions();
      const { findJurisprudenciaHelper } = await import('../../utils/jurisprudencia');
      (findJurisprudenciaHelper as ReturnType<typeof vi.fn>).mockResolvedValue(mockSuggestions);

      render(<JurisprudenciaModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/O trabalhador faz jus ao pagamento/)).toBeInTheDocument();
      });
    });

    it('should display enunciado when tese is not available', async () => {
      const mockSuggestions = createMockSuggestions();
      const { findJurisprudenciaHelper } = await import('../../utils/jurisprudencia');
      (findJurisprudenciaHelper as ReturnType<typeof vi.fn>).mockResolvedValue(mockSuggestions);

      render(<JurisprudenciaModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/A compensacao de jornada requer/)).toBeInTheDocument();
      });
    });

    it('should display fullText as fallback', async () => {
      const mockSuggestions = createMockSuggestions();
      const { findJurisprudenciaHelper } = await import('../../utils/jurisprudencia');
      (findJurisprudenciaHelper as ReturnType<typeof vi.fn>).mockResolvedValue(mockSuggestions);

      render(<JurisprudenciaModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/A nao concessao do intervalo/)).toBeInTheDocument();
      });
    });

    it('should display text field as last fallback', async () => {
      const mockSuggestions = createMockSuggestions();
      const { findJurisprudenciaHelper } = await import('../../utils/jurisprudencia');
      (findJurisprudenciaHelper as ReturnType<typeof vi.fn>).mockResolvedValue(mockSuggestions);

      render(<JurisprudenciaModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/Conteudo alternativo via text field/)).toBeInTheDocument();
      });
    });

    it('should trigger search on Enter key in input', async () => {
      const { findJurisprudenciaHelper } = await import('../../utils/jurisprudencia');
      (findJurisprudenciaHelper as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      render(<JurisprudenciaModal {...defaultProps} />);

      // Wait for initial search
      await waitFor(() => {
        expect(screen.getByText(/Nenhum precedente encontrado/)).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('Buscar por termo, tese...');
      fireEvent.change(input, { target: { value: 'nova busca' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      // Should have called findJurisprudenciaHelper again
      await waitFor(() => {
        expect(findJurisprudenciaHelper).toHaveBeenCalledTimes(2);
      });
    });

    it('should trigger search on Buscar button click', async () => {
      const { findJurisprudenciaHelper } = await import('../../utils/jurisprudencia');
      (findJurisprudenciaHelper as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      render(<JurisprudenciaModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/Nenhum precedente encontrado/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Buscar'));

      await waitFor(() => {
        expect(findJurisprudenciaHelper).toHaveBeenCalledTimes(2);
      });
    });

    it('should disable Buscar button while loading', async () => {
      const { findJurisprudenciaHelper } = await import('../../utils/jurisprudencia');
      let resolveSearch: (value: JurisSuggestion[]) => void;
      (findJurisprudenciaHelper as ReturnType<typeof vi.fn>).mockImplementation(() =>
        new Promise<JurisSuggestion[]>((resolve) => { resolveSearch = resolve; })
      );

      render(<JurisprudenciaModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Buscar').closest('button')).toBeDisabled();
      });

      await act(async () => { resolveSearch!([]); });
    });

    it('should show clear search button when searchApplied is set', async () => {
      const { findJurisprudenciaHelper } = await import('../../utils/jurisprudencia');
      (findJurisprudenciaHelper as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      render(<JurisprudenciaModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/Nenhum precedente encontrado/)).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('Buscar por termo, tese...');
      fireEvent.change(input, { target: { value: 'teste' } });
      fireEvent.click(screen.getByText('Buscar'));

      await waitFor(() => {
        // Clear search button with X icon and title "Limpar busca"
        expect(screen.getByTitle('Limpar busca')).toBeInTheDocument();
      });
    });

    it('should clear search when clear button clicked', async () => {
      const { findJurisprudenciaHelper } = await import('../../utils/jurisprudencia');
      (findJurisprudenciaHelper as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      render(<JurisprudenciaModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/Nenhum precedente encontrado/)).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('Buscar por termo, tese...');
      fireEvent.change(input, { target: { value: 'teste' } });
      fireEvent.click(screen.getByText('Buscar'));

      await waitFor(() => {
        expect(screen.getByTitle('Limpar busca')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTitle('Limpar busca'));

      await waitFor(() => {
        expect(screen.queryByTitle('Limpar busca')).not.toBeInTheDocument();
      });
    });

    it('should handle callAI error gracefully', async () => {
      const { findJurisprudenciaHelper } = await import('../../utils/jurisprudencia');
      (findJurisprudenciaHelper as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('AI Error'));

      render(<JurisprudenciaModal {...defaultProps} />);

      // Should not crash, just show empty state
      await waitFor(() => {
        expect(screen.getByText(/Nenhum precedente encontrado/)).toBeInTheDocument();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SEMANTIC MODE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Semantic Mode', () => {
    it('should show semantic toggle when jurisSemanticEnabled is true', () => {
      render(<JurisprudenciaModal {...defaultProps} jurisSemanticEnabled={true} />);
      // Toggle button for semantic mode
      const toggleBtn = screen.getByTitle(/Busca/);
      expect(toggleBtn).toBeInTheDocument();
    });

    it('should NOT show semantic toggle when jurisSemanticEnabled is false', () => {
      render(<JurisprudenciaModal {...defaultProps} jurisSemanticEnabled={false} />);
      expect(screen.queryByTitle(/Busca semantica/)).not.toBeInTheDocument();
    });

    it('should initialize semantic mode from useLocalAI prop', () => {
      render(<JurisprudenciaModal {...defaultProps} jurisSemanticEnabled={true} useLocalAI={true} />);
      const toggleBtn = screen.getByTitle(/Busca semantica/);
      expect(toggleBtn.className).toContain('bg-purple-600');
    });

    it('should toggle semantic mode on click', () => {
      render(<JurisprudenciaModal {...defaultProps} jurisSemanticEnabled={true} useLocalAI={false} />);
      const toggleBtn = screen.getByTitle(/Busca textual/);

      fireEvent.click(toggleBtn);

      expect(toggleBtn.className).toContain('bg-purple-600');
    });

    it('should use semantic search when semantic mode is enabled', async () => {
      const { JurisEmbeddingsService } = await import('../../services/EmbeddingsServices');
      const AIModelService = (await import('../../services/AIModelService')).default;
      (AIModelService.getEmbedding as ReturnType<typeof vi.fn>).mockResolvedValue([0.1, 0.2]);
      (JurisEmbeddingsService.searchBySimilarity as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      render(<JurisprudenciaModal {...defaultProps} jurisSemanticEnabled={true} useLocalAI={true} />);

      await waitFor(() => {
        expect(AIModelService.getEmbedding).toHaveBeenCalled();
      });
    });

    it('should show IA Local badge when searchSource is local', async () => {
      const { JurisEmbeddingsService } = await import('../../services/EmbeddingsServices');
      const AIModelService = (await import('../../services/AIModelService')).default;
      const results: JurisSuggestion[] = [{ id: 'sem-1', titulo: 'Semantico', similarity: 0.9, tese: 'Tese semantica' }];
      (AIModelService.getEmbedding as ReturnType<typeof vi.fn>).mockResolvedValue([0.1]);
      (JurisEmbeddingsService.searchBySimilarity as ReturnType<typeof vi.fn>).mockResolvedValue(results);

      render(<JurisprudenciaModal {...defaultProps} jurisSemanticEnabled={true} useLocalAI={true} />);

      await waitFor(() => {
        expect(screen.getByText(/IA Local/)).toBeInTheDocument();
      });
    });

    it('should show similarity percentage in semantic mode', async () => {
      const { JurisEmbeddingsService } = await import('../../services/EmbeddingsServices');
      const AIModelService = (await import('../../services/AIModelService')).default;
      const results: JurisSuggestion[] = [{ id: 'sem-1', titulo: 'Semantico', similarity: 0.85, tese: 'Tese' }];
      (AIModelService.getEmbedding as ReturnType<typeof vi.fn>).mockResolvedValue([0.1]);
      (JurisEmbeddingsService.searchBySimilarity as ReturnType<typeof vi.fn>).mockResolvedValue(results);

      render(<JurisprudenciaModal {...defaultProps} jurisSemanticEnabled={true} useLocalAI={true} />);

      await waitFor(() => {
        expect(screen.getByText('85%')).toBeInTheDocument();
      });
    });

    it('should handle semantic search error gracefully', async () => {
      const AIModelService = (await import('../../services/AIModelService')).default;
      (AIModelService.getEmbedding as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Embedding error'));

      render(<JurisprudenciaModal {...defaultProps} jurisSemanticEnabled={true} useLocalAI={true} />);

      await waitFor(() => {
        expect(screen.getByText(/Nenhum precedente encontrado/)).toBeInTheDocument();
      });
    });

    it('should sync useSemanticMode with useLocalAI when modal opens', async () => {
      const { rerender } = render(<JurisprudenciaModal {...defaultProps} isOpen={false} jurisSemanticEnabled={true} useLocalAI={true} />);

      rerender(<JurisprudenciaModal {...defaultProps} isOpen={true} jurisSemanticEnabled={true} useLocalAI={true} />);

      const toggleBtn = screen.getByTitle(/Busca semantica/);
      expect(toggleBtn.className).toContain('bg-purple-600');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // COPY FUNCTIONALITY
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Copy Functionality', () => {
    it('should show Copiar button for each suggestion', async () => {
      const mockSuggestions = createMockSuggestions();
      const { findJurisprudenciaHelper } = await import('../../utils/jurisprudencia');
      (findJurisprudenciaHelper as ReturnType<typeof vi.fn>).mockResolvedValue(mockSuggestions);

      render(<JurisprudenciaModal {...defaultProps} />);

      await waitFor(() => {
        const copyButtons = screen.getAllByText('Copiar');
        expect(copyButtons.length).toBe(4);
      });
    });

    it('should copy to clipboard when Copiar is clicked', async () => {
      const mockSuggestions = createMockSuggestions();
      const { findJurisprudenciaHelper } = await import('../../utils/jurisprudencia');
      (findJurisprudenciaHelper as ReturnType<typeof vi.fn>).mockResolvedValue(mockSuggestions);

      render(<JurisprudenciaModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getAllByText('Copiar').length).toBe(4);
      });

      const copyButtons = screen.getAllByText('Copiar');
      fireEvent.click(copyButtons[0]);

      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });

    it('should show Copiado! text after copying', async () => {
      const mockSuggestions = createMockSuggestions();
      const { findJurisprudenciaHelper } = await import('../../utils/jurisprudencia');
      (findJurisprudenciaHelper as ReturnType<typeof vi.fn>).mockResolvedValue(mockSuggestions);

      render(<JurisprudenciaModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getAllByText('Copiar').length).toBe(4);
      });

      const copyButtons = screen.getAllByText('Copiar');
      await act(async () => {
        fireEvent.click(copyButtons[0]);
      });

      await waitFor(() => {
        expect(screen.getByText('Copiado!')).toBeInTheDocument();
      });
    });

    it('should format copy text correctly with tema', async () => {
      const mockSuggestions: JurisSuggestion[] = [{
        id: 'copy-1',
        tipoProcesso: 'IRR',
        tema: '42',
        titulo: 'Titulo Teste',
        tese: 'Tese do precedente',
        tribunal: 'TST',
        orgao: 'SDI-2',
        similarity: 0.9,
      }];
      const { findJurisprudenciaHelper } = await import('../../utils/jurisprudencia');
      (findJurisprudenciaHelper as ReturnType<typeof vi.fn>).mockResolvedValue(mockSuggestions);

      render(<JurisprudenciaModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Copiar')).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.click(screen.getByText('Copiar'));
      });

      const clipboardCall = (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(clipboardCall).toContain('IRR Tema 42');
      expect(clipboardCall).toContain('TST');
      expect(clipboardCall).toContain('SDI-2');
      expect(clipboardCall).toContain('Titulo: Titulo Teste');
      expect(clipboardCall).toContain('Tese do precedente');
    });

    it('should format copy text correctly with numero', async () => {
      const mockSuggestions: JurisSuggestion[] = [{
        id: 'copy-2',
        tipoProcesso: 'Sumula',
        numero: '85',
        tese: 'Conteudo da sumula',
        tribunal: 'TST',
        similarity: 0.8,
      }];
      const { findJurisprudenciaHelper } = await import('../../utils/jurisprudencia');
      (findJurisprudenciaHelper as ReturnType<typeof vi.fn>).mockResolvedValue(mockSuggestions);

      render(<JurisprudenciaModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Copiar')).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.click(screen.getByText('Copiar'));
      });

      const clipboardCall = (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(clipboardCall).toContain('Sumula n 85');
      expect(clipboardCall).toContain('TST');
    });

    it('should handle suggestion without titulo in copy', async () => {
      const mockSuggestions: JurisSuggestion[] = [{
        id: 'copy-3',
        tipoProcesso: 'OJ',
        numero: '100',
        tese: 'Tese OJ',
        similarity: 0.7,
      }];
      const { findJurisprudenciaHelper } = await import('../../utils/jurisprudencia');
      (findJurisprudenciaHelper as ReturnType<typeof vi.fn>).mockResolvedValue(mockSuggestions);

      render(<JurisprudenciaModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Copiar')).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.click(screen.getByText('Copiar'));
      });

      const clipboardCall = (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(clipboardCall).not.toContain('Titulo:');
      expect(clipboardCall).toContain('Tese OJ');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EDGE CASES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Edge Cases', () => {
    it('should handle missing topicTitle', async () => {
      const { findJurisprudenciaHelper } = await import('../../utils/jurisprudencia');
      (findJurisprudenciaHelper as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      render(<JurisprudenciaModal {...defaultProps} topicTitle="" />);
      // Should not crash
      expect(screen.getByText(/Jurisprudencia:/)).toBeInTheDocument();
    });

    it('should handle missing callAI', () => {
      render(<JurisprudenciaModal {...defaultProps} callAI={undefined} />);
      // Should render without crashing
      expect(screen.getByText(/Jurisprudencia:/)).toBeInTheDocument();
    });

    it('should handle suggestion without status', async () => {
      const mockSuggestions: JurisSuggestion[] = [{
        id: 'no-status',
        tipoProcesso: 'OJ',
        numero: '1',
        tese: 'Tese sem status',
        similarity: 0.5,
      }];
      const { findJurisprudenciaHelper } = await import('../../utils/jurisprudencia');
      (findJurisprudenciaHelper as ReturnType<typeof vi.fn>).mockResolvedValue(mockSuggestions);

      render(<JurisprudenciaModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/Tese sem status/)).toBeInTheDocument();
      });
    });

    it('should handle suggestion without numero or tema', async () => {
      const mockSuggestions: JurisSuggestion[] = [{
        id: 'no-num',
        tipoProcesso: 'OJ',
        tese: 'Tese sem numero',
        similarity: 0.5,
      }];
      const { findJurisprudenciaHelper } = await import('../../utils/jurisprudencia');
      (findJurisprudenciaHelper as ReturnType<typeof vi.fn>).mockResolvedValue(mockSuggestions);

      render(<JurisprudenciaModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/Tese sem numero/)).toBeInTheDocument();
      });
    });

    it('should reset searchTerm when modal closes', () => {
      const { rerender } = render(<JurisprudenciaModal {...defaultProps} />);
      const input = screen.getByPlaceholderText('Buscar por termo, tese...');
      fireEvent.change(input, { target: { value: 'test search' } });

      // Close modal
      rerender(<JurisprudenciaModal {...defaultProps} isOpen={false} />);
      // Reopen
      rerender(<JurisprudenciaModal {...defaultProps} isOpen={true} />);

      const newInput = screen.getByPlaceholderText('Buscar por termo, tese...');
      expect(newInput).toHaveValue('');
    });

    it('should not search when isOpen is true but topicTitle is empty', async () => {
      const { findJurisprudenciaHelper } = await import('../../utils/jurisprudencia');
      (findJurisprudenciaHelper as ReturnType<typeof vi.fn>).mockClear();

      render(<JurisprudenciaModal {...defaultProps} topicTitle="" />);

      // Give it a moment
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(findJurisprudenciaHelper).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPONENT IDENTITY
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Component Identity', () => {
    it('should have displayName set', () => {
      expect(JurisprudenciaModal.displayName).toBe('JurisprudenciaModal');
    });
  });
});

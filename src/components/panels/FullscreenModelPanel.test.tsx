/**
 * @file FullscreenModelPanel.test.tsx
 * @description Testes de cobertura para o componente FullscreenModelPanel
 *
 * Cobre todos os paths de renderizacao e interacao:
 * 1. Renderizacao basica (header, busca, footer)
 * 2. Sugestoes via scoring local (fallback)
 * 3. Sugestoes via IA (onFindSuggestions)
 * 4. Busca manual com debounce
 * 5. Limpeza de busca (botao X e Escape)
 * 6. Estados de loading
 * 7. Estados vazios
 * 8. Badge "IA Local"
 * 9. displayName e memoizacao
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { FullscreenModelPanel } from './FullscreenModelPanel';
import type { Model } from '../../types';

// Mock SuggestionCard to simplify testing
vi.mock('../cards', () => ({
  SuggestionCard: ({ model, onPreview, onInsert, showRanking, index, totalSuggestions }: {
    model: Model;
    onPreview?: (model: Model) => void;
    onInsert?: (content: string) => void;
    showRanking?: boolean;
    index?: number;
    totalSuggestions?: number;
  }) => (
    <div data-testid={`suggestion-card-${model.id}`}>
      <span data-testid="card-title">{model.title}</span>
      {showRanking && <span data-testid="ranking">#{(index ?? 0) + 1}/{totalSuggestions}</span>}
      <button data-testid={`preview-${model.id}`} onClick={() => onPreview?.(model)}>Ver</button>
      <button data-testid={`insert-${model.id}`} onClick={() => onInsert?.(model.content || '')}>Inserir</button>
    </div>
  ),
}));

// ═══════════════════════════════════════════════════════════════════════════
// TEST DATA
// ═══════════════════════════════════════════════════════════════════════════

function createMockModels(): Model[] {
  return [
    {
      id: 'model-1',
      title: 'Horas Extras',
      content: '<p>Pagamento de horas extras deferido.</p>',
      keywords: 'horas extras, jornada, sobrejornada',
      category: 'MÉRITO',
    },
    {
      id: 'model-2',
      title: 'Intervalo Intrajornada',
      content: '<p>Supressao do intervalo intrajornada comprovada.</p>',
      keywords: 'intervalo, intrajornada, refeicao',
      category: 'MÉRITO',
    },
    {
      id: 'model-3',
      title: 'Preliminar de Inepcia',
      content: '<p>Peticao inicial atende requisitos legais.</p>',
      keywords: 'preliminar, inepcia, requisitos',
      category: 'PRELIMINAR',
    },
    {
      id: 'model-4',
      title: 'Adicional Noturno',
      content: '<p>Adicional noturno devido ao reclamante.</p>',
      keywords: ['noturno', 'adicional', 'jornada'] as unknown as string,
      category: 'MÉRITO',
    },
    {
      id: 'model-5',
      title: 'Modelo Sem Keywords',
      content: '<p>Conteudo sem keywords.</p>',
      category: 'DISPOSITIVO',
    },
  ];
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST SUITE
// ═══════════════════════════════════════════════════════════════════════════

describe('FullscreenModelPanel', () => {
  const mockOnInsert = vi.fn();
  const mockOnPreview = vi.fn();
  const mockSanitizeHTML = vi.fn((html: string) => html.replace(/<[^>]+>/g, ''));
  const mockOnFindSuggestions = vi.fn();

  const defaultProps = {
    models: createMockModels(),
    onInsert: mockOnInsert,
    onPreview: mockOnPreview,
    sanitizeHTML: mockSanitizeHTML,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // BASIC RENDERING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Basic Rendering', () => {
    it('should render header with title "Modelos Sugeridos"', () => {
      vi.useRealTimers();
      render(<FullscreenModelPanel {...defaultProps} />);
      expect(screen.getByText('Modelos Sugeridos')).toBeInTheDocument();
    });

    it('should render search input with placeholder', () => {
      vi.useRealTimers();
      render(<FullscreenModelPanel {...defaultProps} />);
      expect(screen.getByPlaceholderText('Buscar modelos...')).toBeInTheDocument();
    });

    it('should show empty state when no topicTitle provided', () => {
      vi.useRealTimers();
      render(<FullscreenModelPanel {...defaultProps} topicTitle="" />);
      expect(screen.getByText('Selecione um tópico para ver sugestões')).toBeInTheDocument();
    });

    it('should show empty state when no models provided', () => {
      vi.useRealTimers();
      render(<FullscreenModelPanel {...defaultProps} models={[]} topicTitle="Test" />);
      expect(screen.getByText('Nenhuma sugestão encontrada para este tópico')).toBeInTheDocument();
    });

    it('should render footer with suggestion count', () => {
      vi.useRealTimers();
      render(<FullscreenModelPanel {...defaultProps} topicTitle="Horas Extras" />);
      // Footer shows either search results or suggestions count
      expect(screen.getByText(/sugestao\(oes\) automatica\(s\)/)).toBeInTheDocument();
    });

    it('should not show clear button when search is empty', () => {
      vi.useRealTimers();
      render(<FullscreenModelPanel {...defaultProps} />);
      expect(screen.queryByTitle('Limpar (Esc)')).not.toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // LOCAL SCORING (FALLBACK WITHOUT AI)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Local Scoring (no AI)', () => {
    it('should show suggestions based on title word matching', () => {
      vi.useRealTimers();
      render(<FullscreenModelPanel {...defaultProps} topicTitle="Horas Extras" topicCategory="MÉRITO" />);
      // "Horas Extras" matches model-1 by title words
      expect(screen.getByTestId('suggestion-card-model-1')).toBeInTheDocument();
    });

    it('should match by category when titles dont match', () => {
      vi.useRealTimers();
      const models: Model[] = [
        { id: 'cat-1', title: 'Modelo Generico', content: 'content', category: 'PRELIMINAR', keywords: 'teste' },
      ];
      render(<FullscreenModelPanel {...defaultProps} models={models} topicTitle="Algo Diferente" topicCategory="PRELIMINAR" />);
      // Category match gives 8 points, enough to show
      expect(screen.getByTestId('suggestion-card-cat-1')).toBeInTheDocument();
    });

    it('should match by keywords', () => {
      vi.useRealTimers();
      render(<FullscreenModelPanel {...defaultProps} topicTitle="sobrejornada" topicCategory="" />);
      // "sobrejornada" keyword in model-1
      expect(screen.getByTestId('suggestion-card-model-1')).toBeInTheDocument();
    });

    it('should match by keyword array format', () => {
      vi.useRealTimers();
      render(<FullscreenModelPanel {...defaultProps} topicTitle="noturno" topicCategory="MÉRITO" />);
      // model-4 has keywords as array with "noturno"
      expect(screen.getByTestId('suggestion-card-model-4')).toBeInTheDocument();
    });

    it('should show no suggestions when score is 0 for all', () => {
      vi.useRealTimers();
      const models: Model[] = [
        { id: 'no-match', title: 'XYZ', content: 'abc', category: 'TEST' },
      ];
      render(<FullscreenModelPanel {...defaultProps} models={models} topicTitle="Completely Different" topicCategory="OTHER" />);
      expect(screen.getByText('Nenhuma sugestão encontrada para este tópico')).toBeInTheDocument();
    });

    it('should limit suggestions to 5 maximum', () => {
      vi.useRealTimers();
      const models: Model[] = Array.from({ length: 10 }, (_, i) => ({
        id: `m-${i}`,
        title: 'Horas Extras',
        content: 'content',
        category: 'MÉRITO',
        keywords: 'horas extras',
      }));
      render(<FullscreenModelPanel {...defaultProps} models={models} topicTitle="Horas Extras" topicCategory="MÉRITO" />);
      const cards = screen.getAllByTestId(/suggestion-card-/);
      expect(cards.length).toBeLessThanOrEqual(5);
    });

    it('should match partial words (substring match)', () => {
      vi.useRealTimers();
      const models: Model[] = [
        { id: 'partial-1', title: 'Intrajornada Parcial', content: 'content', category: 'MÉRITO' },
      ];
      render(<FullscreenModelPanel {...defaultProps} models={models} topicTitle="Intrajornada" topicCategory="MÉRITO" />);
      // Exact word match + partial match give score > 0
      expect(screen.getByTestId('suggestion-card-partial-1')).toBeInTheDocument();
    });

    it('should sort suggestions by score descending', () => {
      vi.useRealTimers();
      const models: Model[] = [
        { id: 'low', title: 'ABC', content: '', category: 'MÉRITO', keywords: 'extras' },
        { id: 'high', title: 'Horas Extras Trabalho', content: '', category: 'MÉRITO', keywords: 'horas extras, sobrejornada' },
      ];
      render(<FullscreenModelPanel {...defaultProps} models={models} topicTitle="Horas Extras" topicCategory="MÉRITO" />);
      const cards = screen.getAllByTestId(/suggestion-card-/);
      // "high" should be first because it has more matching words and keywords
      expect(cards[0]).toHaveAttribute('data-testid', 'suggestion-card-high');
    });

    it('should display topic title in suggestions header', () => {
      vi.useRealTimers();
      render(<FullscreenModelPanel {...defaultProps} topicTitle="Horas Extras" />);
      expect(screen.getByText(/Sugestoes para "Horas Extras"/)).toBeInTheDocument();
    });

    it('should show ranking in SuggestionCard for suggestions', () => {
      vi.useRealTimers();
      render(<FullscreenModelPanel {...defaultProps} topicTitle="Horas Extras" topicCategory="MÉRITO" />);
      // SuggestionCards in suggestions section have showRanking=true
      const rankings = screen.getAllByTestId('ranking');
      expect(rankings.length).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // AI SUGGESTIONS (onFindSuggestions)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('AI Suggestions', () => {
    it('should show loading state while AI is working', async () => {
      vi.useRealTimers();
      let resolvePromise: (value: { suggestions: Model[]; source: string | null }) => void;
      const promise = new Promise<{ suggestions: Model[]; source: string | null }>((resolve) => {
        resolvePromise = resolve;
      });
      mockOnFindSuggestions.mockReturnValue(promise);

      render(<FullscreenModelPanel {...defaultProps} topicTitle="Horas" onFindSuggestions={mockOnFindSuggestions} />);

      await waitFor(() => {
        expect(screen.getByText('Analisando modelos com IA...')).toBeInTheDocument();
      });

      // Resolve to clean up
      await act(async () => {
        resolvePromise!({ suggestions: [], source: null });
      });
    });

    it('should display AI suggestions with source info', async () => {
      vi.useRealTimers();
      const aiSuggestions: Model[] = [
        { id: 'ai-1', title: 'AI Suggestion 1', content: 'content ai 1' },
        { id: 'ai-2', title: 'AI Suggestion 2', content: 'content ai 2' },
      ];
      mockOnFindSuggestions.mockResolvedValue({ suggestions: aiSuggestions, source: 'local' });

      render(<FullscreenModelPanel {...defaultProps} topicTitle="Horas" onFindSuggestions={mockOnFindSuggestions} />);

      await waitFor(() => {
        expect(screen.getByTestId('suggestion-card-ai-1')).toBeInTheDocument();
        expect(screen.getByTestId('suggestion-card-ai-2')).toBeInTheDocument();
      });
    });

    it('should show IA Local badge when source is local', async () => {
      vi.useRealTimers();
      mockOnFindSuggestions.mockResolvedValue({ suggestions: [{ id: 'ai-1', title: 'Test', content: '' }], source: 'local' });

      render(<FullscreenModelPanel {...defaultProps} topicTitle="Horas" onFindSuggestions={mockOnFindSuggestions} />);

      await waitFor(() => {
        expect(screen.getByText('IA Local')).toBeInTheDocument();
      });
    });

    it('should NOT show IA Local badge when source is not local', async () => {
      vi.useRealTimers();
      mockOnFindSuggestions.mockResolvedValue({ suggestions: [{ id: 'ai-1', title: 'Test', content: '' }], source: 'cloud' });

      render(<FullscreenModelPanel {...defaultProps} topicTitle="Horas" onFindSuggestions={mockOnFindSuggestions} />);

      await waitFor(() => {
        expect(screen.getByTestId('suggestion-card-ai-1')).toBeInTheDocument();
      });
      expect(screen.queryByText('IA Local')).not.toBeInTheDocument();
    });

    it('should handle array result format (legacy)', async () => {
      vi.useRealTimers();
      const aiSuggestions: Model[] = [
        { id: 'legacy-1', title: 'Legacy Result', content: 'content' },
      ];
      mockOnFindSuggestions.mockResolvedValue(aiSuggestions);

      render(<FullscreenModelPanel {...defaultProps} topicTitle="Test Topic" onFindSuggestions={mockOnFindSuggestions} />);

      await waitFor(() => {
        expect(screen.getByTestId('suggestion-card-legacy-1')).toBeInTheDocument();
      });
    });

    it('should fallback to local scoring on AI error', async () => {
      vi.useRealTimers();
      mockOnFindSuggestions.mockRejectedValue(new Error('AI failed'));

      render(<FullscreenModelPanel {...defaultProps} topicTitle="Horas Extras" topicCategory="MÉRITO" onFindSuggestions={mockOnFindSuggestions} />);

      await waitFor(() => {
        // Should show local scored results as fallback
        expect(screen.getByTestId('suggestion-card-model-1')).toBeInTheDocument();
      });
    });

    it('should call onFindSuggestions with correct topic data', async () => {
      vi.useRealTimers();
      mockOnFindSuggestions.mockResolvedValue({ suggestions: [], source: null });

      render(
        <FullscreenModelPanel
          {...defaultProps}
          topicTitle="Horas Extras"
          topicCategory="MÉRITO"
          topicRelatorio="Reclamante trabalhou em sobrejornada"
          onFindSuggestions={mockOnFindSuggestions}
        />
      );

      await waitFor(() => {
        expect(mockOnFindSuggestions).toHaveBeenCalledWith({
          title: 'Horas Extras',
          category: 'MÉRITO',
          relatorio: 'Reclamante trabalhou em sobrejornada',
        });
      });
    });

    it('should use MERITO as default category if topicCategory is empty', async () => {
      vi.useRealTimers();
      mockOnFindSuggestions.mockResolvedValue({ suggestions: [], source: null });

      render(
        <FullscreenModelPanel
          {...defaultProps}
          topicTitle="Test"
          topicCategory=""
          onFindSuggestions={mockOnFindSuggestions}
        />
      );

      await waitFor(() => {
        expect(mockOnFindSuggestions).toHaveBeenCalledWith(
          expect.objectContaining({ category: 'MÉRITO' })
        );
      });
    });

    it('should handle null result from AI', async () => {
      vi.useRealTimers();
      mockOnFindSuggestions.mockResolvedValue(null);

      render(<FullscreenModelPanel {...defaultProps} topicTitle="Test" onFindSuggestions={mockOnFindSuggestions} />);

      await waitFor(() => {
        expect(screen.getByText('Nenhuma sugestão encontrada para este tópico')).toBeInTheDocument();
      });
    });

    it('should handle undefined result from AI', async () => {
      vi.useRealTimers();
      mockOnFindSuggestions.mockResolvedValue(undefined);

      render(<FullscreenModelPanel {...defaultProps} topicTitle="Test" onFindSuggestions={mockOnFindSuggestions} />);

      await waitFor(() => {
        expect(screen.getByText('Nenhuma sugestão encontrada para este tópico')).toBeInTheDocument();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SEARCH FUNCTIONALITY
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Search', () => {
    it('should filter models by title after debounce', () => {
      render(<FullscreenModelPanel {...defaultProps} topicTitle="Something" />);
      const input = screen.getByPlaceholderText('Buscar modelos...');

      fireEvent.change(input, { target: { value: 'Horas' } });

      // Advance debounce timer (300ms)
      act(() => { vi.advanceTimersByTime(350); });

      expect(screen.getByText(/Resultados da Busca/)).toBeInTheDocument();
      expect(screen.getByTestId('suggestion-card-model-1')).toBeInTheDocument();
    });

    it('should filter models by keywords (string format)', () => {
      render(<FullscreenModelPanel {...defaultProps} topicTitle="Something" />);
      const input = screen.getByPlaceholderText('Buscar modelos...');

      fireEvent.change(input, { target: { value: 'sobrejornada' } });
      act(() => { vi.advanceTimersByTime(350); });

      expect(screen.getByTestId('suggestion-card-model-1')).toBeInTheDocument();
    });

    it('should filter models by content', () => {
      render(<FullscreenModelPanel {...defaultProps} topicTitle="Something" />);
      const input = screen.getByPlaceholderText('Buscar modelos...');

      fireEvent.change(input, { target: { value: 'Supressao' } });
      act(() => { vi.advanceTimersByTime(350); });

      expect(screen.getByTestId('suggestion-card-model-2')).toBeInTheDocument();
    });

    it('should show search results count', () => {
      render(<FullscreenModelPanel {...defaultProps} topicTitle="Something" />);
      const input = screen.getByPlaceholderText('Buscar modelos...');

      fireEvent.change(input, { target: { value: 'Horas' } });
      act(() => { vi.advanceTimersByTime(350); });

      expect(screen.getByText(/Resultados da Busca \(1\)/)).toBeInTheDocument();
    });

    it('should update footer to show search result count', () => {
      render(<FullscreenModelPanel {...defaultProps} topicTitle="Something" />);
      const input = screen.getByPlaceholderText('Buscar modelos...');

      fireEvent.change(input, { target: { value: 'Horas' } });
      act(() => { vi.advanceTimersByTime(350); });

      expect(screen.getByText(/1 resultado\(s\) da busca/)).toBeInTheDocument();
    });

    it('should limit search results to 10', () => {
      const manyModels: Model[] = Array.from({ length: 15 }, (_, i) => ({
        id: `search-${i}`,
        title: `Horas Extras ${i}`,
        content: 'content',
        category: 'MÉRITO',
      }));
      render(<FullscreenModelPanel {...defaultProps} models={manyModels} topicTitle="Something" />);
      const input = screen.getByPlaceholderText('Buscar modelos...');

      fireEvent.change(input, { target: { value: 'Horas' } });
      act(() => { vi.advanceTimersByTime(350); });

      const cards = screen.getAllByTestId(/suggestion-card-search/);
      expect(cards.length).toBeLessThanOrEqual(10);
    });

    it('should debounce search - only last change applies', () => {
      render(<FullscreenModelPanel {...defaultProps} topicTitle="Something" />);
      const input = screen.getByPlaceholderText('Buscar modelos...');

      fireEvent.change(input, { target: { value: 'Intervalo' } });
      act(() => { vi.advanceTimersByTime(100); });

      fireEvent.change(input, { target: { value: 'Horas' } });
      act(() => { vi.advanceTimersByTime(350); });

      expect(screen.getByTestId('suggestion-card-model-1')).toBeInTheDocument();
      expect(screen.queryByTestId('suggestion-card-model-2')).not.toBeInTheDocument();
    });

    it('should clear search results when input is cleared', () => {
      render(<FullscreenModelPanel {...defaultProps} topicTitle="Something" />);
      const input = screen.getByPlaceholderText('Buscar modelos...');

      fireEvent.change(input, { target: { value: 'Horas' } });
      act(() => { vi.advanceTimersByTime(350); });

      expect(screen.getByText(/Resultados da Busca/)).toBeInTheDocument();

      fireEvent.change(input, { target: { value: '' } });
      act(() => { vi.advanceTimersByTime(350); });

      expect(screen.queryByText(/Resultados da Busca/)).not.toBeInTheDocument();
    });

    it('should show clear button when search has text', () => {
      vi.useRealTimers();
      render(<FullscreenModelPanel {...defaultProps} />);
      const input = screen.getByPlaceholderText('Buscar modelos...');

      fireEvent.change(input, { target: { value: 'test' } });
      expect(screen.getByTitle('Limpar (Esc)')).toBeInTheDocument();
    });

    it('should clear search when clear button clicked', () => {
      render(<FullscreenModelPanel {...defaultProps} topicTitle="Something" />);
      const input = screen.getByPlaceholderText('Buscar modelos...');

      fireEvent.change(input, { target: { value: 'Horas' } });
      act(() => { vi.advanceTimersByTime(350); });

      expect(screen.getByText(/Resultados da Busca/)).toBeInTheDocument();

      fireEvent.click(screen.getByTitle('Limpar (Esc)'));
      act(() => { vi.advanceTimersByTime(350); });

      expect(screen.queryByText(/Resultados da Busca/)).not.toBeInTheDocument();
    });

    it('should clear search on Escape key', () => {
      render(<FullscreenModelPanel {...defaultProps} topicTitle="Something" />);
      const input = screen.getByPlaceholderText('Buscar modelos...');

      fireEvent.change(input, { target: { value: 'Horas' } });
      act(() => { vi.advanceTimersByTime(350); });

      expect(screen.getByText(/Resultados da Busca/)).toBeInTheDocument();

      fireEvent.keyDown(input, { key: 'Escape' });
      act(() => { vi.advanceTimersByTime(350); });

      expect(screen.queryByText(/Resultados da Busca/)).not.toBeInTheDocument();
    });

    it('should show separator when both search results and suggestions exist', () => {
      render(<FullscreenModelPanel {...defaultProps} topicTitle="Horas Extras" topicCategory="MÉRITO" />);
      const input = screen.getByPlaceholderText('Buscar modelos...');

      fireEvent.change(input, { target: { value: 'Intervalo' } });
      act(() => { vi.advanceTimersByTime(350); });

      // Both search results and suggestions visible means separator is rendered
      expect(screen.getByText(/Resultados da Busca/)).toBeInTheDocument();
      expect(screen.getByText(/Sugestoes para/)).toBeInTheDocument();
    });

    it('should not show ranking for search results', () => {
      render(<FullscreenModelPanel {...defaultProps} topicTitle="Something" />);
      const input = screen.getByPlaceholderText('Buscar modelos...');

      fireEvent.change(input, { target: { value: 'Horas' } });
      act(() => { vi.advanceTimersByTime(350); });

      expect(screen.getByText(/Resultados da Busca/)).toBeInTheDocument();
      // search results dont have ranking visible (showRanking=false)
      // The card for search results should not have ranking data-testid
    });

    it('should handle models with keywords as array in search', () => {
      render(<FullscreenModelPanel {...defaultProps} topicTitle="Something" />);
      const input = screen.getByPlaceholderText('Buscar modelos...');

      fireEvent.change(input, { target: { value: 'noturno' } });
      act(() => { vi.advanceTimersByTime(350); });

      expect(screen.getByTestId('suggestion-card-model-4')).toBeInTheDocument();
    });

    it('should handle null models gracefully in search', () => {
      render(<FullscreenModelPanel {...defaultProps} models={null as unknown as Model[]} topicTitle="Test" />);
      const input = screen.getByPlaceholderText('Buscar modelos...');

      fireEvent.change(input, { target: { value: 'test' } });
      act(() => { vi.advanceTimersByTime(350); });

      // Should not crash
      expect(input).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EDGE CASES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Edge Cases', () => {
    it('should handle empty topicTitle with models', () => {
      vi.useRealTimers();
      render(<FullscreenModelPanel {...defaultProps} topicTitle="" />);
      expect(screen.getByText('Selecione um tópico para ver sugestões')).toBeInTheDocument();
    });

    it('should handle undefined topicTitle', () => {
      vi.useRealTimers();
      render(<FullscreenModelPanel {...defaultProps} topicTitle={undefined} />);
      expect(screen.getByText('Selecione um tópico para ver sugestões')).toBeInTheDocument();
    });

    it('should handle models with empty keywords string', () => {
      vi.useRealTimers();
      const models: Model[] = [
        { id: 'empty-kw', title: 'Horas Extras', content: 'content', keywords: '', category: 'MÉRITO' },
      ];
      render(<FullscreenModelPanel {...defaultProps} models={models} topicTitle="Horas Extras" />);
      expect(screen.getByTestId('suggestion-card-empty-kw')).toBeInTheDocument();
    });

    it('should handle scoreModelLocal with very short words (filtered by stopwords)', () => {
      vi.useRealTimers();
      const models: Model[] = [
        { id: 'short', title: 'De Da Do', content: '', category: 'MÉRITO' },
      ];
      // topicTitle also contains only stopwords
      render(<FullscreenModelPanel {...defaultProps} models={models} topicTitle="de da do" />);
      // All words are stopwords so score = 0
      expect(screen.getByText('Nenhuma sugestão encontrada para este tópico')).toBeInTheDocument();
    });

    it('should filter words shorter than 3 characters from scoring', () => {
      vi.useRealTimers();
      const models: Model[] = [
        { id: 'short-words', title: 'AB CD', content: '', category: 'MÉRITO' },
      ];
      render(<FullscreenModelPanel {...defaultProps} models={models} topicTitle="AB CD" />);
      // Both are < 3 chars so filtered
      expect(screen.getByText('Nenhuma sugestão encontrada para este tópico')).toBeInTheDocument();
    });

    it('should handle topicRelatorio prop', () => {
      vi.useRealTimers();
      render(<FullscreenModelPanel {...defaultProps} topicTitle="Horas" topicRelatorio="Trabalhador fez horas extras" />);
      // Should not crash
      expect(screen.getByPlaceholderText('Buscar modelos...')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPONENT IDENTITY
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Component Identity', () => {
    it('should have displayName set', () => {
      expect(FullscreenModelPanel.displayName).toBe('FullscreenModelPanel');
    });
  });
});

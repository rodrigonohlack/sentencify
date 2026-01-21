/**
 * @file useFactsComparison.test.ts
 * @description Testes para o hook useFactsComparison
 * @version 1.38.39
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useFactsComparison } from './useFactsComparison';
import type { Topic, FactsComparisonResult } from '../types';

// Mock useFactsComparisonCache
vi.mock('./useFactsComparisonCache', () => ({
  default: () => ({
    getComparison: vi.fn().mockResolvedValue(null),
    saveComparison: vi.fn().mockResolvedValue(undefined),
    clearComparison: vi.fn().mockResolvedValue(undefined),
    clearAllComparisons: vi.fn().mockResolvedValue(undefined),
  }),
}));

// Mock useUIStore
vi.mock('../stores/useUIStore', () => ({
  useUIStore: vi.fn((selector) => {
    const state = {
      openDoubleCheckReview: vi.fn(),
      doubleCheckResult: null,
      setDoubleCheckResult: vi.fn(),
    };
    return selector(state);
  }),
}));

describe('useFactsComparison', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // MOCK FACTORIES
  // ═══════════════════════════════════════════════════════════════════════════

  const createMockTopic = (title: string): Topic => ({
    id: `topic-${title.toLowerCase().replace(/\s/g, '-')}`,
    title,
    category: 'MÉRITO',
    relatorio: 'Relatório do tópico com informações importantes',
    editedRelatorio: 'Relatório editado do tópico',
    fundamentacao: '',
  });

  const createMockAiIntegration = (response: string = '{"tabela": [], "fatosIncontroversos": [], "fatosControversos": [], "pontosChave": [], "resumo": ""}') => ({
    callAI: vi.fn().mockResolvedValue(response),
    aiSettings: {
      doubleCheck: {
        enabled: false,
        operations: {
          factsComparison: false,
        },
      },
    },
    performDoubleCheck: vi.fn().mockResolvedValue({
      verified: response,
      corrections: [],
      summary: '',
      confidence: 0.95,
    }),
  });

  const createMockAnalyzedDocuments = () => ({
    peticoes: [],
    peticoesText: [{ id: '1', name: 'Petição', text: 'Texto da petição inicial' }],
    contestacoes: [],
    contestacoesText: [{ id: '2', name: 'Contestação', text: 'Texto da contestação' }],
    complementares: [],
    complementaresText: [],
  });

  const createMockProps = (overrides = {}) => ({
    editingTopic: createMockTopic('Horas Extras'),
    aiIntegration: createMockAiIntegration(),
    analyzedDocuments: createMockAnalyzedDocuments(),
    openModal: vi.fn(),
    showToast: vi.fn(),
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIAL STATE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Initial State', () => {
    it('should initialize with correct default states', () => {
      const props = createMockProps();
      const { result } = renderHook(() => useFactsComparison(props));

      expect(result.current.generatingFactsComparison).toBe(false);
      expect(result.current.factsComparisonResult).toBeNull();
      expect(result.current.factsComparisonError).toBeNull();
    });

    it('should return all required handlers', () => {
      const props = createMockProps();
      const { result } = renderHook(() => useFactsComparison(props));

      expect(result.current.handleOpenFactsComparison).toBeDefined();
      expect(result.current.handleGenerateFactsComparison).toBeDefined();
      expect(result.current.setFactsComparisonResult).toBeDefined();
      expect(result.current.setFactsComparisonError).toBeDefined();
      expect(result.current.factsComparisonCache).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // OPEN MODAL TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('handleOpenFactsComparison', () => {
    it('should open modal when called', async () => {
      const props = createMockProps();
      const { result } = renderHook(() => useFactsComparison(props));

      await act(async () => {
        await result.current.handleOpenFactsComparison();
      });

      expect(props.openModal).toHaveBeenCalledWith('factsComparisonIndividual');
    });

    it('should clear error when opening', async () => {
      const props = createMockProps();
      const { result } = renderHook(() => useFactsComparison(props));

      // Set an error first
      act(() => {
        result.current.setFactsComparisonError('Some error');
      });

      await act(async () => {
        await result.current.handleOpenFactsComparison();
      });

      expect(result.current.factsComparisonError).toBeNull();
    });

    it('should NOT open modal when editingTopic is null', async () => {
      const props = createMockProps({ editingTopic: null });
      const { result } = renderHook(() => useFactsComparison(props));

      await act(async () => {
        await result.current.handleOpenFactsComparison();
      });

      expect(props.openModal).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GENERATE COMPARISON TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('handleGenerateFactsComparison', () => {
    it('should set generating state during generation', async () => {
      const props = createMockProps();
      const { result } = renderHook(() => useFactsComparison(props));

      const promise = act(async () => {
        await result.current.handleGenerateFactsComparison('mini-relatorio');
      });

      // Should be generating during the call
      await promise;
      expect(result.current.generatingFactsComparison).toBe(false);
    });

    it('should generate comparison from mini-relatorio', async () => {
      const mockResponse = JSON.stringify({
        tabela: [{ tema: 'Horas Extras', reclamante: 'Alega trabalho extra', reclamada: 'Nega' }],
        fatosIncontroversos: ['Vínculo empregatício'],
        fatosControversos: ['Quantidade de horas extras'],
        pontosChave: ['Análise de jornada'],
        resumo: 'Resumo da comparação',
      });
      const props = createMockProps({
        aiIntegration: createMockAiIntegration(mockResponse),
      });
      const { result } = renderHook(() => useFactsComparison(props));

      await act(async () => {
        await result.current.handleGenerateFactsComparison('mini-relatorio');
      });

      expect(result.current.factsComparisonResult).not.toBeNull();
      expect(result.current.factsComparisonResult?.source).toBe('mini-relatorio');
    });

    it('should generate comparison from documentos-completos', async () => {
      const mockResponse = JSON.stringify({
        tabela: [],
        fatosIncontroversos: [],
        fatosControversos: [],
        pontosChave: [],
        resumo: '',
      });
      const props = createMockProps({
        aiIntegration: createMockAiIntegration(mockResponse),
      });
      const { result } = renderHook(() => useFactsComparison(props));

      await act(async () => {
        await result.current.handleGenerateFactsComparison('documentos-completos');
      });

      expect(result.current.factsComparisonResult).not.toBeNull();
      expect(result.current.factsComparisonResult?.source).toBe('documentos-completos');
    });

    it('should call AI with correct parameters', async () => {
      const props = createMockProps();
      const { result } = renderHook(() => useFactsComparison(props));

      await act(async () => {
        await result.current.handleGenerateFactsComparison('mini-relatorio');
      });

      expect(props.aiIntegration.callAI).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: expect.any(Array),
          }),
        ]),
        expect.objectContaining({
          maxTokens: 8000,
          temperature: 0.3,
        })
      );
    });

    it('should handle JSON in markdown code block', async () => {
      const mockResponse = '```json\n{"tabela": [], "fatosIncontroversos": [], "fatosControversos": [], "pontosChave": [], "resumo": "test"}\n```';
      const props = createMockProps({
        aiIntegration: createMockAiIntegration(mockResponse),
      });
      const { result } = renderHook(() => useFactsComparison(props));

      await act(async () => {
        await result.current.handleGenerateFactsComparison('mini-relatorio');
      });

      expect(result.current.factsComparisonResult?.resumo).toBe('test');
    });

    it('should NOT generate when aiIntegration is null', async () => {
      const props = createMockProps({ aiIntegration: null });
      const { result } = renderHook(() => useFactsComparison(props));

      await act(async () => {
        await result.current.handleGenerateFactsComparison('mini-relatorio');
      });

      expect(result.current.factsComparisonResult).toBeNull();
    });

    it('should NOT generate when editingTopic is null', async () => {
      const props = createMockProps({ editingTopic: null });
      const { result } = renderHook(() => useFactsComparison(props));

      await act(async () => {
        await result.current.handleGenerateFactsComparison('mini-relatorio');
      });

      expect(result.current.factsComparisonResult).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ERROR HANDLING TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Error Handling', () => {
    it('should set error when mini-relatorio is empty', async () => {
      const topic = createMockTopic('Test');
      topic.relatorio = '';
      topic.editedRelatorio = '';
      const props = createMockProps({ editingTopic: topic });
      const { result } = renderHook(() => useFactsComparison(props));

      await act(async () => {
        await result.current.handleGenerateFactsComparison('mini-relatorio');
      });

      expect(result.current.factsComparisonError).toContain('Mini-relatório não disponível');
    });

    it('should set error when no documents available', async () => {
      const props = createMockProps({
        analyzedDocuments: {
          peticoes: [],
          peticoesText: [],
          contestacoes: [],
          contestacoesText: [],
          complementares: [],
          complementaresText: [],
        },
      });
      const { result } = renderHook(() => useFactsComparison(props));

      await act(async () => {
        await result.current.handleGenerateFactsComparison('documentos-completos');
      });

      expect(result.current.factsComparisonError).toContain('Nenhum documento disponível');
    });

    it('should set error on API failure', async () => {
      const aiIntegration = createMockAiIntegration();
      aiIntegration.callAI.mockRejectedValue(new Error('API Error'));
      const props = createMockProps({ aiIntegration });
      const { result } = renderHook(() => useFactsComparison(props));

      await act(async () => {
        await result.current.handleGenerateFactsComparison('mini-relatorio');
      });

      expect(result.current.factsComparisonError).not.toBeNull();
    });

    it('should set error on invalid JSON', async () => {
      const props = createMockProps({
        aiIntegration: createMockAiIntegration('invalid json response'),
      });
      const { result } = renderHook(() => useFactsComparison(props));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await act(async () => {
        await result.current.handleGenerateFactsComparison('mini-relatorio');
      });

      expect(result.current.factsComparisonError).not.toBeNull();
      consoleSpy.mockRestore();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TOPIC CHANGE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Topic Change', () => {
    it('should clear result when topic changes', async () => {
      const props = createMockProps();
      const { result, rerender } = renderHook(
        (p) => useFactsComparison(p),
        { initialProps: props }
      );

      // Set a result
      act(() => {
        result.current.setFactsComparisonResult({
          topicTitle: 'Test',
          source: 'mini-relatorio',
          generatedAt: new Date().toISOString(),
          tabela: [],
          fatosIncontroversos: [],
          fatosControversos: [],
          pontosChave: [],
          resumo: '',
        });
      });

      expect(result.current.factsComparisonResult).not.toBeNull();

      // Change topic
      const newProps = {
        ...props,
        editingTopic: createMockTopic('Different Topic'),
      };
      rerender(newProps);

      expect(result.current.factsComparisonResult).toBeNull();
    });

    it('should clear error when topic changes', async () => {
      const props = createMockProps();
      const { result, rerender } = renderHook(
        (p) => useFactsComparison(p),
        { initialProps: props }
      );

      // Set an error
      act(() => {
        result.current.setFactsComparisonError('Some error');
      });

      expect(result.current.factsComparisonError).not.toBeNull();

      // Change topic
      const newProps = {
        ...props,
        editingTopic: createMockTopic('Different Topic'),
      };
      rerender(newProps);

      expect(result.current.factsComparisonError).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PDF FALLBACK TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('PDF Fallback', () => {
    it('should use PDF fallback when text not available', async () => {
      const mockResponse = JSON.stringify({
        tabela: [],
        fatosIncontroversos: [],
        fatosControversos: [],
        pontosChave: [],
        resumo: 'PDF analysis',
      });
      const props = createMockProps({
        aiIntegration: createMockAiIntegration(mockResponse),
        analyzedDocuments: {
          peticoes: ['base64pdfdata'],
          peticoesText: [],
          contestacoes: ['base64contestacao'],
          contestacoesText: [],
          complementares: [],
          complementaresText: [],
        },
      });
      const { result } = renderHook(() => useFactsComparison(props));

      await act(async () => {
        await result.current.handleGenerateFactsComparison('documentos-completos');
      });

      // Should have called AI with document content
      expect(props.aiIntegration.callAI).toHaveBeenCalled();
      const callContent = props.aiIntegration.callAI.mock.calls[0][0][0].content;
      expect(callContent.some((c: { type: string }) => c.type === 'document')).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SETTERS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Setters', () => {
    it('should allow setting factsComparisonResult', () => {
      const props = createMockProps();
      const { result } = renderHook(() => useFactsComparison(props));

      const mockResult: FactsComparisonResult = {
        topicTitle: 'Test',
        source: 'mini-relatorio',
        generatedAt: new Date().toISOString(),
        tabela: [],
        fatosIncontroversos: ['Fato 1'],
        fatosControversos: ['Fato 2'],
        pontosChave: ['Ponto 1'],
        resumo: 'Resumo teste',
      };

      act(() => {
        result.current.setFactsComparisonResult(mockResult);
      });

      expect(result.current.factsComparisonResult).toEqual(mockResult);
    });

    it('should allow setting factsComparisonError', () => {
      const props = createMockProps();
      const { result } = renderHook(() => useFactsComparison(props));

      act(() => {
        result.current.setFactsComparisonError('Test error message');
      });

      expect(result.current.factsComparisonError).toBe('Test error message');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CACHE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Cache', () => {
    it('should expose factsComparisonCache', () => {
      const props = createMockProps();
      const { result } = renderHook(() => useFactsComparison(props));

      expect(result.current.factsComparisonCache).toBeDefined();
      expect(result.current.factsComparisonCache.getComparison).toBeDefined();
      expect(result.current.factsComparisonCache.saveComparison).toBeDefined();
    });
  });
});

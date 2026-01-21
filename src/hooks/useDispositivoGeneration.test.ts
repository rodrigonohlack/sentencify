/**
 * @file useDispositivoGeneration.test.ts
 * @description Testes para o hook useDispositivoGeneration
 * @version 1.38.39
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDispositivoGeneration } from './useDispositivoGeneration';
import type { Topic } from '../types';

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

describe('useDispositivoGeneration', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // MOCK FACTORIES
  // ═══════════════════════════════════════════════════════════════════════════

  const createMockTopic = (title: string, options: Partial<Topic> = {}): Topic => ({
    id: `topic-${title.toLowerCase().replace(/\s/g, '-')}`,
    title,
    category: 'MÉRITO',
    relatorio: 'Mini relatório do tópico',
    fundamentacao: 'Fundamentação do tópico',
    editedFundamentacao: 'Decisão escrita',
    resultado: 'PROCEDENTE',
    ...options,
  });

  const createMockAiIntegration = (response: string = '<p>Dispositivo gerado</p>') => ({
    callAI: vi.fn().mockResolvedValue(response),
    aiSettings: {
      modeloDispositivo: '',
      doubleCheck: {
        enabled: false,
        operations: {
          dispositivo: false,
        },
      },
    },
    dispositivoInstruction: '',
    setGeneratingDispositivo: vi.fn(),
    setRegeneratingDispositivo: vi.fn(),
    setDispositivoText: vi.fn(),
    setDispositivoInstruction: vi.fn(),
    performDoubleCheck: vi.fn().mockResolvedValue({
      verified: response,
      corrections: [],
      summary: '',
      confidence: 0.9,
    }),
  });

  const createMockEditorRef = () => ({
    current: {
      root: document.createElement('div'),
      getText: vi.fn().mockReturnValue(''),
      getContents: vi.fn(),
      setContents: vi.fn(),
      clipboard: { dangerouslyPasteHTML: vi.fn() },
    },
  });

  const createMockProps = (overrides = {}) => {
    const relatorioTopic = createMockTopic('RELATÓRIO', {
      category: 'RELATÓRIO',
      relatorio: 'FULANO DE TAL ajuizou ação contra EMPRESA X...',
      editedRelatorio: 'FULANO DE TAL ajuizou ação contra EMPRESA X...',
      resultado: undefined,
    });

    const dispositivoTopic = createMockTopic('DISPOSITIVO', {
      category: 'DISPOSITIVO',
      editedContent: '',
      resultado: undefined,
    });

    const selectedTopics = [
      relatorioTopic,
      createMockTopic('Horas Extras'),
      createMockTopic('Adicional Noturno'),
      dispositivoTopic,
    ];

    return {
      selectedTopics,
      setSelectedTopics: vi.fn(),
      extractedTopics: [...selectedTopics],
      setExtractedTopics: vi.fn(),
      editingTopic: dispositivoTopic,
      setEditingTopic: vi.fn(),
      topicsParaDispositivo: selectedTopics.filter(t =>
        t.title !== 'RELATÓRIO' && t.title !== 'DISPOSITIVO'
      ),
      aiIntegration: createMockAiIntegration(),
      editorRef: createMockEditorRef(),
      setError: vi.fn(),
      setAnalysisProgress: vi.fn(),
      openModal: vi.fn(),
      showToast: vi.fn(),
      sanitizeHTML: vi.fn((html: string) => html),
      isTopicDecidido: vi.fn((t: Topic) => !!t.editedFundamentacao),
      htmlToFormattedText: vi.fn((html: string) => html.replace(/<[^>]*>/g, '')),
      ...overrides,
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // BASIC FUNCTIONALITY TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Basic Functionality', () => {
    it('should return generateDispositivo function', () => {
      const props = createMockProps();
      const { result } = renderHook(() => useDispositivoGeneration(props));

      expect(result.current.generateDispositivo).toBeDefined();
      expect(typeof result.current.generateDispositivo).toBe('function');
    });

    it('should return regenerateDispositivoWithInstruction function', () => {
      const props = createMockProps();
      const { result } = renderHook(() => useDispositivoGeneration(props));

      expect(result.current.regenerateDispositivoWithInstruction).toBeDefined();
      expect(typeof result.current.regenerateDispositivoWithInstruction).toBe('function');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GENERATE DISPOSITIVO TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('generateDispositivo', () => {
    it('should generate dispositivo successfully', async () => {
      const props = createMockProps();
      const { result } = renderHook(() => useDispositivoGeneration(props));

      await act(async () => {
        await result.current.generateDispositivo();
      });

      expect(props.aiIntegration.setGeneratingDispositivo).toHaveBeenCalledWith(true);
      expect(props.aiIntegration.callAI).toHaveBeenCalled();
      expect(props.aiIntegration.setDispositivoText).toHaveBeenCalled();
      expect(props.openModal).toHaveBeenCalledWith('dispositivo');
      expect(props.aiIntegration.setGeneratingDispositivo).toHaveBeenCalledWith(false);
    });

    it('should set error when no topics selected', async () => {
      const props = createMockProps({ selectedTopics: [] });
      const { result } = renderHook(() => useDispositivoGeneration(props));

      await act(async () => {
        await result.current.generateDispositivo();
      });

      expect(props.setError).toHaveBeenCalledWith(
        expect.stringContaining('Nenhum tópico selecionado')
      );
      expect(props.aiIntegration.callAI).not.toHaveBeenCalled();
    });

    it('should set error when topics without resultado', async () => {
      const topicWithoutResultado = createMockTopic('Horas Extras', { resultado: undefined });
      const props = createMockProps({
        selectedTopics: [
          createMockTopic('RELATÓRIO', { resultado: undefined }),
          topicWithoutResultado,
          createMockTopic('DISPOSITIVO', { resultado: undefined }),
        ],
        isTopicDecidido: vi.fn(() => true),
      });
      const { result } = renderHook(() => useDispositivoGeneration(props));

      await act(async () => {
        await result.current.generateDispositivo();
      });

      expect(props.setError).toHaveBeenCalledWith(
        expect.stringContaining('sem resultado selecionado')
      );
    });

    it('should call AI with correct prompt structure', async () => {
      const props = createMockProps();
      const { result } = renderHook(() => useDispositivoGeneration(props));

      await act(async () => {
        await result.current.generateDispositivo();
      });

      const callArgs = props.aiIntegration.callAI.mock.calls[0];
      expect(callArgs[0][0].role).toBe('user');
      expect(callArgs[0][0].content[0].text).toContain('DISPOSITIVO');
      expect(callArgs[1].maxTokens).toBe(8000);
      expect(callArgs[1].temperature).toBe(0.3);
    });

    it('should include modelo personalizado when configured', async () => {
      const aiIntegration = createMockAiIntegration();
      aiIntegration.aiSettings.modeloDispositivo = 'Modelo customizado do usuário';
      const props = createMockProps({ aiIntegration });
      const { result } = renderHook(() => useDispositivoGeneration(props));

      await act(async () => {
        await result.current.generateDispositivo();
      });

      const promptText = props.aiIntegration.callAI.mock.calls[0][0][0].content[0].text;
      expect(promptText).toContain('MODELO PERSONALIZADO DO USUÁRIO');
      expect(promptText).toContain('Modelo customizado do usuário');
    });

    it('should handle API error', async () => {
      const aiIntegration = createMockAiIntegration();
      aiIntegration.callAI.mockRejectedValue(new Error('API Error'));
      const props = createMockProps({ aiIntegration });
      const { result } = renderHook(() => useDispositivoGeneration(props));

      await act(async () => {
        await result.current.generateDispositivo();
      });

      expect(props.setError).toHaveBeenCalledWith(
        expect.stringContaining('Erro ao gerar dispositivo')
      );
      expect(props.aiIntegration.setGeneratingDispositivo).toHaveBeenCalledWith(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // REGENERATE DISPOSITIVO TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('regenerateDispositivoWithInstruction', () => {
    it('should regenerate dispositivo with custom instruction', async () => {
      const aiIntegration = createMockAiIntegration();
      aiIntegration.dispositivoInstruction = 'Adicionar item sobre férias';
      const props = createMockProps({ aiIntegration });
      const { result } = renderHook(() => useDispositivoGeneration(props));

      await act(async () => {
        await result.current.regenerateDispositivoWithInstruction();
      });

      expect(props.aiIntegration.setRegeneratingDispositivo).toHaveBeenCalledWith(true);
      expect(props.aiIntegration.callAI).toHaveBeenCalled();
      expect(props.setEditingTopic).toHaveBeenCalled();
      expect(props.showToast).toHaveBeenCalledWith(
        expect.stringContaining('DISPOSITIVO regenerado'),
        'success'
      );
    });

    it('should set error when not editing DISPOSITIVO topic', async () => {
      const props = createMockProps({
        editingTopic: createMockTopic('Horas Extras'),
      });
      const { result } = renderHook(() => useDispositivoGeneration(props));

      await act(async () => {
        await result.current.regenerateDispositivoWithInstruction();
      });

      expect(props.setError).toHaveBeenCalledWith(
        expect.stringContaining('só pode ser usada para o tópico DISPOSITIVO')
      );
    });

    it('should set error when editingTopic is null', async () => {
      const props = createMockProps({ editingTopic: null });
      const { result } = renderHook(() => useDispositivoGeneration(props));

      await act(async () => {
        await result.current.regenerateDispositivoWithInstruction();
      });

      expect(props.setError).toHaveBeenCalled();
    });

    it('should update editor content after regeneration', async () => {
      const props = createMockProps();
      const { result } = renderHook(() => useDispositivoGeneration(props));

      await act(async () => {
        await result.current.regenerateDispositivoWithInstruction();
      });

      expect(props.sanitizeHTML).toHaveBeenCalled();
      expect(props.setSelectedTopics).toHaveBeenCalled();
      expect(props.setExtractedTopics).toHaveBeenCalled();
    });

    it('should clear instruction after successful regeneration', async () => {
      const props = createMockProps();
      const { result } = renderHook(() => useDispositivoGeneration(props));

      await act(async () => {
        await result.current.regenerateDispositivoWithInstruction();
      });

      expect(props.aiIntegration.setDispositivoInstruction).toHaveBeenCalledWith('');
    });

    it('should handle empty response', async () => {
      const aiIntegration = createMockAiIntegration('');
      const props = createMockProps({ aiIntegration });
      const { result } = renderHook(() => useDispositivoGeneration(props));

      await act(async () => {
        await result.current.regenerateDispositivoWithInstruction();
      });

      expect(props.setError).toHaveBeenCalledWith(
        expect.stringContaining('Dispositivo gerado está vazio')
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // VALIDATION TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Validation', () => {
    it('should skip validation for RELATÓRIO topic', async () => {
      const relatorio = createMockTopic('RELATÓRIO', { resultado: undefined });
      const props = createMockProps({
        selectedTopics: [
          relatorio,
          createMockTopic('Horas Extras'),
          createMockTopic('DISPOSITIVO', { resultado: undefined }),
        ],
      });
      const { result } = renderHook(() => useDispositivoGeneration(props));

      await act(async () => {
        await result.current.generateDispositivo();
      });

      // Should not fail because RELATÓRIO is excluded from validation
      expect(props.aiIntegration.callAI).toHaveBeenCalled();
    });

    it('should skip validation for complementary topics', async () => {
      const complementar = createMockTopic('Tópico Complementar', {
        isComplementar: true,
        resultado: undefined,
      });
      const props = createMockProps({
        selectedTopics: [
          createMockTopic('RELATÓRIO', { resultado: undefined }),
          complementar,
          createMockTopic('Horas Extras'),
          createMockTopic('DISPOSITIVO', { resultado: undefined }),
        ],
        isTopicDecidido: (t: Topic) => t.title !== 'RELATÓRIO' && t.title !== 'DISPOSITIVO',
      });
      const { result } = renderHook(() => useDispositivoGeneration(props));

      await act(async () => {
        await result.current.generateDispositivo();
      });

      // Should proceed because complementar topics are excluded
      expect(props.aiIntegration.callAI).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RELATÓRIO EXTRACTION TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Relatório Extraction', () => {
    it('should warn when RELATÓRIO topic not found', async () => {
      const props = createMockProps({
        selectedTopics: [
          createMockTopic('Horas Extras'),
          createMockTopic('DISPOSITIVO', { resultado: undefined }),
        ],
      });
      const { result } = renderHook(() => useDispositivoGeneration(props));

      await act(async () => {
        await result.current.generateDispositivo();
      });

      expect(props.setError).toHaveBeenCalledWith(
        expect.stringContaining('RELATÓRIO não encontrado')
      );
    });

    it('should warn when primeiro parágrafo is empty', async () => {
      const relatorio = createMockTopic('RELATÓRIO', {
        relatorio: '',
        editedRelatorio: '',
        resultado: undefined,
      });
      const props = createMockProps({
        selectedTopics: [
          relatorio,
          createMockTopic('Horas Extras'),
          createMockTopic('DISPOSITIVO', { resultado: undefined }),
        ],
      });
      const { result } = renderHook(() => useDispositivoGeneration(props));

      await act(async () => {
        await result.current.generateDispositivo();
      });

      expect(props.setError).toHaveBeenCalledWith(
        expect.stringContaining('Primeiro parágrafo do RELATÓRIO está vazio')
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DOUBLE CHECK TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Double Check', () => {
    it('should NOT call performDoubleCheck when disabled', async () => {
      const props = createMockProps();
      const { result } = renderHook(() => useDispositivoGeneration(props));

      await act(async () => {
        await result.current.generateDispositivo();
      });

      expect(props.aiIntegration.performDoubleCheck).not.toHaveBeenCalled();
    });

    it('should call performDoubleCheck when enabled', async () => {
      const aiIntegration = createMockAiIntegration();
      aiIntegration.aiSettings.doubleCheck = {
        enabled: true,
        operations: { dispositivo: true },
      };
      const props = createMockProps({ aiIntegration });
      const { result } = renderHook(() => useDispositivoGeneration(props));

      await act(async () => {
        await result.current.generateDispositivo();
      });

      expect(props.aiIntegration.performDoubleCheck).toHaveBeenCalledWith(
        'dispositivo',
        expect.any(String),
        expect.any(Array)
      );
    });

    it('should continue on Double Check error', async () => {
      const aiIntegration = createMockAiIntegration();
      aiIntegration.aiSettings.doubleCheck = {
        enabled: true,
        operations: { dispositivo: true },
      };
      aiIntegration.performDoubleCheck.mockRejectedValue(new Error('DC Error'));
      const props = createMockProps({ aiIntegration });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const { result } = renderHook(() => useDispositivoGeneration(props));

      await act(async () => {
        await result.current.generateDispositivo();
      });

      // Should still complete
      expect(props.aiIntegration.setDispositivoText).toHaveBeenCalled();
      expect(props.openModal).toHaveBeenCalledWith('dispositivo');
      consoleSpy.mockRestore();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // AI CALL OPTIONS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('AI Call Options', () => {
    it('should use correct AI parameters for generation', async () => {
      const props = createMockProps();
      const { result } = renderHook(() => useDispositivoGeneration(props));

      await act(async () => {
        await result.current.generateDispositivo();
      });

      const options = props.aiIntegration.callAI.mock.calls[0][1];
      expect(options.maxTokens).toBe(8000);
      expect(options.useInstructions).toBe(true);
      expect(options.logMetrics).toBe(true);
      expect(options.temperature).toBe(0.3);
      expect(options.topP).toBe(0.9);
      expect(options.topK).toBe(50);
    });
  });
});

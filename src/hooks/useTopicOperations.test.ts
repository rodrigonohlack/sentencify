/**
 * @file useTopicOperations.test.ts
 * @description Testes de regressão para useTopicOperations hook
 * @version 1.38.39
 *
 * Cobre todas as operações de tópicos:
 * 1. handleRenameTopic - Renomear tópico
 * 2. handleMergeTopics - Unir múltiplos tópicos
 * 3. handleSplitTopic - Separar tópico em subtópicos
 * 4. handleCreateNewTopic - Criar novo tópico
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTopicOperations } from './useTopicOperations';
import type {
  UseTopicOperationsProps,
  TopicManagerForOperations,
  AIIntegrationForOperations,
} from './useTopicOperations';
import type { Topic, TopicCategory, AnalyzedDocuments } from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK FACTORIES
// ═══════════════════════════════════════════════════════════════════════════════

const createMockTopic = (overrides: Partial<Topic> = {}): Topic => ({
  title: 'TÓPICO TESTE',
  category: 'MÉRITO' as TopicCategory,
  relatorio: '<p>Mini-relatório do tópico</p>',
  editedContent: '',
  ...overrides,
});

const createMockTopicManager = (overrides: Partial<TopicManagerForOperations> = {}): TopicManagerForOperations => ({
  selectedTopics: [],
  extractedTopics: [],
  setSelectedTopics: vi.fn(),
  setExtractedTopics: vi.fn(),
  topicToRename: null,
  newTopicName: '',
  setTopicToRename: vi.fn(),
  setNewTopicName: vi.fn(),
  topicsToMerge: [],
  setTopicsToMerge: vi.fn(),
  topicToSplit: null,
  splitNames: ['', ''],
  setTopicToSplit: vi.fn(),
  setSplitNames: vi.fn(),
  newTopicData: null,
  setNewTopicData: vi.fn(),
  ...overrides,
});

const createMockAIIntegration = (overrides: Partial<AIIntegrationForOperations> = {}): AIIntegrationForOperations => ({
  setRegenerating: vi.fn(),
  aiSettings: {
    parallelRequests: 2,
  },
  ...overrides,
});

const createMockAnalyzedDocuments = (overrides: Partial<AnalyzedDocuments> = {}): AnalyzedDocuments => ({
  peticoes: [],
  peticoesText: [],
  contestacoes: [],
  contestacoesText: [],
  complementares: [],
  complementaresText: [],
  ...overrides,
});

const createMockProps = (overrides: Partial<UseTopicOperationsProps> = {}): UseTopicOperationsProps => ({
  aiIntegration: createMockAIIntegration(),
  topicManager: createMockTopicManager(),
  analyzedDocuments: createMockAnalyzedDocuments(),
  generateMiniReport: vi.fn().mockResolvedValue('<p>Novo mini-relatório gerado</p>'),
  generateMiniReportsBatch: vi.fn().mockResolvedValue({ results: [], errors: [] }),
  setError: vi.fn(),
  setAnalysisProgress: vi.fn(),
  closeModal: vi.fn(),
  ...overrides,
});

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('useTopicOperations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // HOOK INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Hook Initialization', () => {
    it('should return all operation handlers', () => {
      const props = createMockProps();
      const { result } = renderHook(() => useTopicOperations(props));

      expect(result.current.handleRenameTopic).toBeDefined();
      expect(result.current.handleMergeTopics).toBeDefined();
      expect(result.current.handleSplitTopic).toBeDefined();
      expect(result.current.handleCreateNewTopic).toBeDefined();
    });

    it('should return functions', () => {
      const props = createMockProps();
      const { result } = renderHook(() => useTopicOperations(props));

      expect(typeof result.current.handleRenameTopic).toBe('function');
      expect(typeof result.current.handleMergeTopics).toBe('function');
      expect(typeof result.current.handleSplitTopic).toBe('function');
      expect(typeof result.current.handleCreateNewTopic).toBe('function');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RENAME TOPIC
  // ═══════════════════════════════════════════════════════════════════════════

  describe('handleRenameTopic', () => {
    it('should do nothing if newTopicName is empty', async () => {
      const generateMiniReport = vi.fn();
      const props = createMockProps({
        topicManager: createMockTopicManager({
          newTopicName: '',
          topicToRename: createMockTopic(),
        }),
        generateMiniReport,
      });
      const { result } = renderHook(() => useTopicOperations(props));

      await act(async () => {
        await result.current.handleRenameTopic();
      });

      expect(generateMiniReport).not.toHaveBeenCalled();
    });

    it('should do nothing if topicToRename is null', async () => {
      const generateMiniReport = vi.fn();
      const props = createMockProps({
        topicManager: createMockTopicManager({
          newTopicName: 'Novo Nome',
          topicToRename: null,
        }),
        generateMiniReport,
      });
      const { result } = renderHook(() => useTopicOperations(props));

      await act(async () => {
        await result.current.handleRenameTopic();
      });

      expect(generateMiniReport).not.toHaveBeenCalled();
    });

    it('should convert topic name to uppercase', async () => {
      const setSelectedTopics = vi.fn();
      const setExtractedTopics = vi.fn();
      const topic = createMockTopic({ title: 'OLD TITLE' });
      const props = createMockProps({
        topicManager: createMockTopicManager({
          newTopicName: 'new name',
          topicToRename: topic,
          selectedTopics: [topic],
          extractedTopics: [topic],
          setSelectedTopics,
          setExtractedTopics,
        }),
      });
      const { result } = renderHook(() => useTopicOperations(props));

      await act(async () => {
        await result.current.handleRenameTopic(true);
      });

      // Verify setSelectedTopics was called with uppercase title
      expect(setSelectedTopics).toHaveBeenCalled();
      const callArg = setSelectedTopics.mock.calls[0][0];
      expect(callArg[0].title).toBe('NEW NAME');
    });

    it('should regenerate mini-report when shouldRegenerate=true', async () => {
      const generateMiniReport = vi.fn().mockResolvedValue('<p>Generated</p>');
      const topic = createMockTopic();
      const props = createMockProps({
        topicManager: createMockTopicManager({
          newTopicName: 'New Name',
          topicToRename: topic,
          selectedTopics: [topic],
          extractedTopics: [topic],
        }),
        generateMiniReport,
      });
      const { result } = renderHook(() => useTopicOperations(props));

      await act(async () => {
        await result.current.handleRenameTopic(true);
      });

      expect(generateMiniReport).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'NEW NAME',
          context: expect.stringContaining('CONTEXTO DE RENOMEAÇÃO'),
        })
      );
    });

    it('should NOT regenerate mini-report when shouldRegenerate=false', async () => {
      const generateMiniReport = vi.fn();
      const setSelectedTopics = vi.fn();
      const topic = createMockTopic({ relatorio: '<p>Original</p>' });
      const props = createMockProps({
        topicManager: createMockTopicManager({
          newTopicName: 'New Name',
          topicToRename: topic,
          selectedTopics: [topic],
          extractedTopics: [topic],
          setSelectedTopics,
        }),
        generateMiniReport,
      });
      const { result } = renderHook(() => useTopicOperations(props));

      await act(async () => {
        await result.current.handleRenameTopic(false);
      });

      expect(generateMiniReport).not.toHaveBeenCalled();
      // Should keep original relatorio
      const callArg = setSelectedTopics.mock.calls[0][0];
      expect(callArg[0].relatorio).toBe('<p>Original</p>');
    });

    it('should set regenerating state during operation', async () => {
      const setRegenerating = vi.fn();
      const topic = createMockTopic();
      const props = createMockProps({
        aiIntegration: createMockAIIntegration({ setRegenerating }),
        topicManager: createMockTopicManager({
          newTopicName: 'New Name',
          topicToRename: topic,
          selectedTopics: [topic],
          extractedTopics: [topic],
        }),
      });
      const { result } = renderHook(() => useTopicOperations(props));

      await act(async () => {
        await result.current.handleRenameTopic();
      });

      expect(setRegenerating).toHaveBeenCalledWith(true);
      expect(setRegenerating).toHaveBeenCalledWith(false);
    });

    it('should close modal and reset state after rename', async () => {
      const closeModal = vi.fn();
      const setTopicToRename = vi.fn();
      const setNewTopicName = vi.fn();
      const topic = createMockTopic();
      const props = createMockProps({
        topicManager: createMockTopicManager({
          newTopicName: 'New Name',
          topicToRename: topic,
          selectedTopics: [topic],
          extractedTopics: [topic],
          setTopicToRename,
          setNewTopicName,
        }),
        closeModal,
      });
      const { result } = renderHook(() => useTopicOperations(props));

      await act(async () => {
        await result.current.handleRenameTopic();
      });

      expect(closeModal).toHaveBeenCalledWith('rename');
      expect(setTopicToRename).toHaveBeenCalledWith(null);
      expect(setNewTopicName).toHaveBeenCalledWith('');
    });

    it('should set error if generateMiniReport returns null', async () => {
      const setError = vi.fn();
      const generateMiniReport = vi.fn().mockResolvedValue(null);
      const topic = createMockTopic();
      const props = createMockProps({
        topicManager: createMockTopicManager({
          newTopicName: 'New Name',
          topicToRename: topic,
          selectedTopics: [topic],
          extractedTopics: [topic],
        }),
        generateMiniReport,
        setError,
      });
      const { result } = renderHook(() => useTopicOperations(props));

      await act(async () => {
        await result.current.handleRenameTopic(true);
      });

      expect(setError).toHaveBeenCalledWith(expect.stringContaining('Não foi possível gerar'));
    });

    it('should handle errors gracefully', async () => {
      const setError = vi.fn();
      const generateMiniReport = vi.fn().mockRejectedValue(new Error('API Error'));
      const topic = createMockTopic();
      const props = createMockProps({
        topicManager: createMockTopicManager({
          newTopicName: 'New Name',
          topicToRename: topic,
          selectedTopics: [topic],
          extractedTopics: [topic],
        }),
        generateMiniReport,
        setError,
      });
      const { result } = renderHook(() => useTopicOperations(props));

      await act(async () => {
        await result.current.handleRenameTopic();
      });

      expect(setError).toHaveBeenCalledWith(expect.stringContaining('API Error'));
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // MERGE TOPICS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('handleMergeTopics', () => {
    it('should set error if less than 2 topics to merge', async () => {
      const setError = vi.fn();
      const props = createMockProps({
        topicManager: createMockTopicManager({
          topicsToMerge: [createMockTopic()], // Only 1 topic
        }),
        setError,
      });
      const { result } = renderHook(() => useTopicOperations(props));

      await act(async () => {
        await result.current.handleMergeTopics();
      });

      expect(setError).toHaveBeenCalledWith('Selecione pelo menos 2 tópicos para unir');
    });

    it('should merge 2 topics into 1', async () => {
      const setSelectedTopics = vi.fn();
      const setExtractedTopics = vi.fn();
      const topic1 = createMockTopic({ title: 'TOPIC A' });
      const topic2 = createMockTopic({ title: 'TOPIC B' });
      const props = createMockProps({
        topicManager: createMockTopicManager({
          topicsToMerge: [topic1, topic2],
          selectedTopics: [topic1, topic2],
          extractedTopics: [topic1, topic2],
          setSelectedTopics,
          setExtractedTopics,
        }),
      });
      const { result } = renderHook(() => useTopicOperations(props));

      await act(async () => {
        await result.current.handleMergeTopics();
      });

      expect(setSelectedTopics).toHaveBeenCalled();
      const mergedTopics = setSelectedTopics.mock.calls[0][0];
      expect(mergedTopics.length).toBe(1);
      expect(mergedTopics[0].title).toBe('TOPIC A e TOPIC B');
    });

    it('should generate unified mini-report', async () => {
      const generateMiniReport = vi.fn().mockResolvedValue('<p>Unified report</p>');
      const topic1 = createMockTopic({ title: 'TOPIC A' });
      const topic2 = createMockTopic({ title: 'TOPIC B' });
      const props = createMockProps({
        topicManager: createMockTopicManager({
          topicsToMerge: [topic1, topic2],
          selectedTopics: [topic1, topic2],
          extractedTopics: [topic1, topic2],
        }),
        generateMiniReport,
      });
      const { result } = renderHook(() => useTopicOperations(props));

      await act(async () => {
        await result.current.handleMergeTopics();
      });

      expect(generateMiniReport).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'TOPIC A e TOPIC B',
          context: expect.stringContaining('CONTEXTO DE UNIÃO DE TÓPICOS'),
        })
      );
    });

    it('should preserve category from first topic', async () => {
      const setSelectedTopics = vi.fn();
      const topic1 = createMockTopic({ title: 'A', category: 'PRELIMINAR' as TopicCategory });
      const topic2 = createMockTopic({ title: 'B', category: 'MÉRITO' as TopicCategory });
      const props = createMockProps({
        topicManager: createMockTopicManager({
          topicsToMerge: [topic1, topic2],
          selectedTopics: [topic1, topic2],
          extractedTopics: [topic1, topic2],
          setSelectedTopics,
        }),
      });
      const { result } = renderHook(() => useTopicOperations(props));

      await act(async () => {
        await result.current.handleMergeTopics();
      });

      const mergedTopic = setSelectedTopics.mock.calls[0][0][0];
      expect(mergedTopic.category).toBe('PRELIMINAR');
    });

    it('should close modal and reset state after merge', async () => {
      const closeModal = vi.fn();
      const setTopicsToMerge = vi.fn();
      const topic1 = createMockTopic({ title: 'A' });
      const topic2 = createMockTopic({ title: 'B' });
      const props = createMockProps({
        topicManager: createMockTopicManager({
          topicsToMerge: [topic1, topic2],
          selectedTopics: [topic1, topic2],
          extractedTopics: [topic1, topic2],
          setTopicsToMerge,
        }),
        closeModal,
      });
      const { result } = renderHook(() => useTopicOperations(props));

      await act(async () => {
        await result.current.handleMergeTopics();
      });

      expect(closeModal).toHaveBeenCalledWith('merge');
      expect(setTopicsToMerge).toHaveBeenCalledWith([]);
    });

    it('should set error if generateMiniReport returns null', async () => {
      const setError = vi.fn();
      const generateMiniReport = vi.fn().mockResolvedValue(null);
      const topic1 = createMockTopic({ title: 'A' });
      const topic2 = createMockTopic({ title: 'B' });
      const props = createMockProps({
        topicManager: createMockTopicManager({
          topicsToMerge: [topic1, topic2],
          selectedTopics: [topic1, topic2],
          extractedTopics: [topic1, topic2],
        }),
        generateMiniReport,
        setError,
      });
      const { result } = renderHook(() => useTopicOperations(props));

      await act(async () => {
        await result.current.handleMergeTopics();
      });

      expect(setError).toHaveBeenCalledWith(expect.stringContaining('Não foi possível gerar'));
    });

    it('should insert merged topic at correct position', async () => {
      const setSelectedTopics = vi.fn();
      const topic1 = createMockTopic({ title: 'KEEP 1' });
      const topic2 = createMockTopic({ title: 'MERGE A' });
      const topic3 = createMockTopic({ title: 'MERGE B' });
      const topic4 = createMockTopic({ title: 'KEEP 2' });
      const props = createMockProps({
        topicManager: createMockTopicManager({
          topicsToMerge: [topic2, topic3],
          selectedTopics: [topic1, topic2, topic3, topic4],
          extractedTopics: [topic1, topic2, topic3, topic4],
          setSelectedTopics,
        }),
      });
      const { result } = renderHook(() => useTopicOperations(props));

      await act(async () => {
        await result.current.handleMergeTopics();
      });

      const finalTopics = setSelectedTopics.mock.calls[0][0];
      expect(finalTopics.length).toBe(3); // 2 kept + 1 merged
      expect(finalTopics[0].title).toBe('KEEP 1');
      expect(finalTopics[1].title).toBe('MERGE A e MERGE B');
      expect(finalTopics[2].title).toBe('KEEP 2');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SPLIT TOPIC
  // ═══════════════════════════════════════════════════════════════════════════

  describe('handleSplitTopic', () => {
    it('should do nothing if topicToSplit is null', async () => {
      const generateMiniReportsBatch = vi.fn();
      const props = createMockProps({
        topicManager: createMockTopicManager({
          topicToSplit: null,
          splitNames: ['A', 'B'],
        }),
        generateMiniReportsBatch,
      });
      const { result } = renderHook(() => useTopicOperations(props));

      await act(async () => {
        await result.current.handleSplitTopic();
      });

      expect(generateMiniReportsBatch).not.toHaveBeenCalled();
    });

    it('should do nothing if less than 2 valid split names', async () => {
      const generateMiniReportsBatch = vi.fn();
      const props = createMockProps({
        topicManager: createMockTopicManager({
          topicToSplit: createMockTopic(),
          splitNames: ['Only One', ''],
        }),
        generateMiniReportsBatch,
      });
      const { result } = renderHook(() => useTopicOperations(props));

      await act(async () => {
        await result.current.handleSplitTopic();
      });

      expect(generateMiniReportsBatch).not.toHaveBeenCalled();
    });

    it('should split topic into subtopics', async () => {
      const setSelectedTopics = vi.fn();
      const topic = createMockTopic({ title: 'ORIGINAL' });
      const generateMiniReportsBatch = vi.fn().mockResolvedValue({
        results: [
          { title: 'SUBTOPIC A', relatorio: '<p>A</p>' },
          { title: 'SUBTOPIC B', relatorio: '<p>B</p>' },
        ],
        errors: [],
      });
      const props = createMockProps({
        topicManager: createMockTopicManager({
          topicToSplit: topic,
          splitNames: ['Subtopic A', 'Subtopic B'],
          selectedTopics: [topic],
          extractedTopics: [topic],
          setSelectedTopics,
        }),
        generateMiniReportsBatch,
      });
      const { result } = renderHook(() => useTopicOperations(props));

      await act(async () => {
        await result.current.handleSplitTopic();
      });

      expect(setSelectedTopics).toHaveBeenCalled();
      const newTopics = setSelectedTopics.mock.calls[0][0];
      expect(newTopics.length).toBe(2);
    });

    it('should convert split names to uppercase', async () => {
      const generateMiniReportsBatch = vi.fn().mockResolvedValue({
        results: [
          { title: 'SUBTOPIC A', relatorio: '<p>A</p>' },
          { title: 'SUBTOPIC B', relatorio: '<p>B</p>' },
        ],
        errors: [],
      });
      const topic = createMockTopic();
      const props = createMockProps({
        topicManager: createMockTopicManager({
          topicToSplit: topic,
          splitNames: ['subtopic a', 'subtopic b'],
          selectedTopics: [topic],
          extractedTopics: [topic],
        }),
        generateMiniReportsBatch,
      });
      const { result } = renderHook(() => useTopicOperations(props));

      await act(async () => {
        await result.current.handleSplitTopic();
      });

      const callArg = generateMiniReportsBatch.mock.calls[0][0];
      expect(callArg[0].title).toBe('SUBTOPIC A');
      expect(callArg[1].title).toBe('SUBTOPIC B');
    });

    it('should call generateMiniReportsBatch with proper options', async () => {
      const generateMiniReportsBatch = vi.fn().mockResolvedValue({
        results: [{ title: 'A', relatorio: '<p>A</p>' }],
        errors: [],
      });
      const topic = createMockTopic();
      const props = createMockProps({
        aiIntegration: createMockAIIntegration({ aiSettings: { parallelRequests: 3 } }),
        topicManager: createMockTopicManager({
          topicToSplit: topic,
          splitNames: ['A', 'B'],
          selectedTopics: [topic],
          extractedTopics: [topic],
        }),
        generateMiniReportsBatch,
      });
      const { result } = renderHook(() => useTopicOperations(props));

      await act(async () => {
        await result.current.handleSplitTopic();
      });

      expect(generateMiniReportsBatch).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({
          batchSize: 3,
          delayBetweenBatches: 1000,
          onProgress: expect.any(Function),
        })
      );
    });

    it('should set error if some subtopics fail', async () => {
      const setError = vi.fn();
      const generateMiniReportsBatch = vi.fn().mockResolvedValue({
        results: [{ title: 'A', relatorio: '<p>A</p>' }],
        errors: [{ title: 'B', error: 'Failed' }],
      });
      const topic = createMockTopic();
      const props = createMockProps({
        topicManager: createMockTopicManager({
          topicToSplit: topic,
          splitNames: ['A', 'B'],
          selectedTopics: [topic],
          extractedTopics: [topic],
        }),
        generateMiniReportsBatch,
        setError,
      });
      const { result } = renderHook(() => useTopicOperations(props));

      await act(async () => {
        await result.current.handleSplitTopic();
      });

      expect(setError).toHaveBeenCalledWith(expect.stringContaining('1 subtópico(s) falharam'));
    });

    it('should throw error if no subtopics generated', async () => {
      const setError = vi.fn();
      const generateMiniReportsBatch = vi.fn().mockResolvedValue({
        results: [],
        errors: [{ title: 'A', error: 'Failed' }, { title: 'B', error: 'Failed' }],
      });
      const topic = createMockTopic();
      const props = createMockProps({
        topicManager: createMockTopicManager({
          topicToSplit: topic,
          splitNames: ['A', 'B'],
          selectedTopics: [topic],
          extractedTopics: [topic],
        }),
        generateMiniReportsBatch,
        setError,
      });
      const { result } = renderHook(() => useTopicOperations(props));

      await act(async () => {
        await result.current.handleSplitTopic();
      });

      expect(setError).toHaveBeenCalledWith(expect.stringContaining('Nenhum subtópico foi gerado'));
    });

    it('should close modal and reset state after split', async () => {
      const closeModal = vi.fn();
      const setTopicToSplit = vi.fn();
      const setSplitNames = vi.fn();
      const topic = createMockTopic();
      const generateMiniReportsBatch = vi.fn().mockResolvedValue({
        results: [{ title: 'A', relatorio: '<p>A</p>' }],
        errors: [],
      });
      const props = createMockProps({
        topicManager: createMockTopicManager({
          topicToSplit: topic,
          splitNames: ['A', 'B'],
          selectedTopics: [topic],
          extractedTopics: [topic],
          setTopicToSplit,
          setSplitNames,
        }),
        generateMiniReportsBatch,
        closeModal,
      });
      const { result } = renderHook(() => useTopicOperations(props));

      await act(async () => {
        await result.current.handleSplitTopic();
      });

      expect(closeModal).toHaveBeenCalledWith('split');
      expect(setTopicToSplit).toHaveBeenCalledWith(null);
      expect(setSplitNames).toHaveBeenCalledWith(['', '']);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATE NEW TOPIC
  // ═══════════════════════════════════════════════════════════════════════════

  describe('handleCreateNewTopic', () => {
    it('should set error if title is empty', async () => {
      const setError = vi.fn();
      const props = createMockProps({
        topicManager: createMockTopicManager({
          newTopicData: { title: '', category: 'MÉRITO' as TopicCategory },
        }),
        setError,
      });
      const { result } = renderHook(() => useTopicOperations(props));

      await act(async () => {
        await result.current.handleCreateNewTopic();
      });

      expect(setError).toHaveBeenCalledWith('Digite um título para o tópico');
    });

    it('should set error if newTopicData is null', async () => {
      const setError = vi.fn();
      const props = createMockProps({
        topicManager: createMockTopicManager({
          newTopicData: null,
        }),
        setError,
      });
      const { result } = renderHook(() => useTopicOperations(props));

      await act(async () => {
        await result.current.handleCreateNewTopic();
      });

      expect(setError).toHaveBeenCalledWith('Digite um título para o tópico');
    });

    it('should convert title to uppercase', async () => {
      const setExtractedTopics = vi.fn();
      const props = createMockProps({
        topicManager: createMockTopicManager({
          newTopicData: { title: 'new topic', category: 'MÉRITO' as TopicCategory },
          extractedTopics: [],
          setExtractedTopics,
        }),
      });
      const { result } = renderHook(() => useTopicOperations(props));

      await act(async () => {
        await result.current.handleCreateNewTopic();
      });

      expect(setExtractedTopics).toHaveBeenCalled();
      const newTopics = setExtractedTopics.mock.calls[0][0];
      expect(newTopics[0].title).toBe('NEW TOPIC');
    });

    it('should use default category MÉRITO if not provided', async () => {
      const setExtractedTopics = vi.fn();
      const props = createMockProps({
        topicManager: createMockTopicManager({
          newTopicData: { title: 'Test' },
          extractedTopics: [],
          setExtractedTopics,
        }),
      });
      const { result } = renderHook(() => useTopicOperations(props));

      await act(async () => {
        await result.current.handleCreateNewTopic();
      });

      const newTopics = setExtractedTopics.mock.calls[0][0];
      expect(newTopics[0].category).toBe('MÉRITO');
    });

    it('should generate mini-report if documents exist and relatorio not provided', async () => {
      const generateMiniReport = vi.fn().mockResolvedValue('<p>Generated</p>');
      const setExtractedTopics = vi.fn();
      const props = createMockProps({
        topicManager: createMockTopicManager({
          newTopicData: { title: 'Test', category: 'MÉRITO' as TopicCategory },
          extractedTopics: [],
          setExtractedTopics,
        }),
        analyzedDocuments: createMockAnalyzedDocuments({
          peticoes: ['doc.pdf'],
        }),
        generateMiniReport,
      });
      const { result } = renderHook(() => useTopicOperations(props));

      await act(async () => {
        await result.current.handleCreateNewTopic();
      });

      expect(generateMiniReport).toHaveBeenCalled();
    });

    it('should use provided relatorio without calling AI', async () => {
      const generateMiniReport = vi.fn();
      const setExtractedTopics = vi.fn();
      const props = createMockProps({
        topicManager: createMockTopicManager({
          newTopicData: { title: 'Test', category: 'MÉRITO' as TopicCategory, relatorio: '<p>Manual</p>' },
          extractedTopics: [],
          setExtractedTopics,
        }),
        analyzedDocuments: createMockAnalyzedDocuments({
          peticoes: ['doc.pdf'],
        }),
        generateMiniReport,
      });
      const { result } = renderHook(() => useTopicOperations(props));

      await act(async () => {
        await result.current.handleCreateNewTopic();
      });

      expect(generateMiniReport).not.toHaveBeenCalled();
      const newTopics = setExtractedTopics.mock.calls[0][0];
      expect(newTopics[0].relatorio).toBe('<p>Manual</p>');
    });

    it('should add topic to extractedTopics', async () => {
      const setExtractedTopics = vi.fn();
      const existingTopic = createMockTopic({ title: 'EXISTING' });
      const props = createMockProps({
        topicManager: createMockTopicManager({
          newTopicData: { title: 'New', category: 'MÉRITO' as TopicCategory, relatorio: '<p>R</p>' },
          extractedTopics: [existingTopic],
          setExtractedTopics,
        }),
      });
      const { result } = renderHook(() => useTopicOperations(props));

      await act(async () => {
        await result.current.handleCreateNewTopic();
      });

      const newTopics = setExtractedTopics.mock.calls[0][0];
      expect(newTopics.length).toBe(2);
      expect(newTopics[0].title).toBe('EXISTING');
      expect(newTopics[1].title).toBe('NEW');
    });

    it('should close modal and reset state after creation', async () => {
      const closeModal = vi.fn();
      const setNewTopicData = vi.fn();
      const props = createMockProps({
        topicManager: createMockTopicManager({
          newTopicData: { title: 'Test', category: 'MÉRITO' as TopicCategory, relatorio: '<p>R</p>' },
          extractedTopics: [],
          setNewTopicData,
        }),
        closeModal,
      });
      const { result } = renderHook(() => useTopicOperations(props));

      await act(async () => {
        await result.current.handleCreateNewTopic();
      });

      expect(closeModal).toHaveBeenCalledWith('newTopic');
      expect(setNewTopicData).toHaveBeenCalledWith({ title: '', category: 'MÉRITO', relatorio: '' });
    });

    it('should create fallback relatorio if no documents and no relatorio provided', async () => {
      const setExtractedTopics = vi.fn();
      const props = createMockProps({
        topicManager: createMockTopicManager({
          newTopicData: { title: 'Test', category: 'MÉRITO' as TopicCategory },
          extractedTopics: [],
          setExtractedTopics,
        }),
        analyzedDocuments: createMockAnalyzedDocuments(), // No documents
      });
      const { result } = renderHook(() => useTopicOperations(props));

      await act(async () => {
        await result.current.handleCreateNewTopic();
      });

      const newTopics = setExtractedTopics.mock.calls[0][0];
      expect(newTopics[0].relatorio).toContain('criado manualmente');
    });

    it('should handle API error when generating mini-report', async () => {
      const setError = vi.fn();
      const setExtractedTopics = vi.fn();
      const generateMiniReport = vi.fn().mockRejectedValue(new Error('API Error'));
      const props = createMockProps({
        topicManager: createMockTopicManager({
          newTopicData: { title: 'Test', category: 'MÉRITO' as TopicCategory },
          extractedTopics: [],
          setExtractedTopics,
        }),
        analyzedDocuments: createMockAnalyzedDocuments({
          peticoes: ['doc.pdf'],
        }),
        generateMiniReport,
        setError,
      });
      const { result } = renderHook(() => useTopicOperations(props));

      await act(async () => {
        await result.current.handleCreateNewTopic();
      });

      // Should still create topic with fallback relatorio
      expect(setExtractedTopics).toHaveBeenCalled();
      expect(setError).toHaveBeenCalledWith(expect.stringContaining('API Error'));
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // REGENERATING STATE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Regenerating State Management', () => {
    it('should set regenerating=true at start and false at end for rename', async () => {
      const setRegenerating = vi.fn();
      const topic = createMockTopic();
      const props = createMockProps({
        aiIntegration: createMockAIIntegration({ setRegenerating }),
        topicManager: createMockTopicManager({
          newTopicName: 'New',
          topicToRename: topic,
          selectedTopics: [topic],
          extractedTopics: [topic],
        }),
      });
      const { result } = renderHook(() => useTopicOperations(props));

      await act(async () => {
        await result.current.handleRenameTopic();
      });

      const calls = setRegenerating.mock.calls;
      expect(calls[0][0]).toBe(true);
      expect(calls[calls.length - 1][0]).toBe(false);
    });

    it('should set regenerating=false even on error', async () => {
      const setRegenerating = vi.fn();
      const generateMiniReport = vi.fn().mockRejectedValue(new Error('Error'));
      const topic = createMockTopic();
      const props = createMockProps({
        aiIntegration: createMockAIIntegration({ setRegenerating }),
        topicManager: createMockTopicManager({
          newTopicName: 'New',
          topicToRename: topic,
          selectedTopics: [topic],
          extractedTopics: [topic],
        }),
        generateMiniReport,
      });
      const { result } = renderHook(() => useTopicOperations(props));

      await act(async () => {
        await result.current.handleRenameTopic();
      });

      const calls = setRegenerating.mock.calls;
      expect(calls[calls.length - 1][0]).toBe(false);
    });
  });
});

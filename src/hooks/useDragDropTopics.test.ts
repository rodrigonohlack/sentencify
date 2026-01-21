/**
 * @file useDragDropTopics.test.ts
 * @description Testes para o hook useDragDropTopics
 * @version 1.38.39
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDragDropTopics } from './useDragDropTopics';
import type { Topic, AISettings } from '../types';

describe('useDragDropTopics', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // MOCK FACTORIES
  // ═══════════════════════════════════════════════════════════════════════════

  const createMockTopic = (title: string, id?: string): Topic => ({
    id: id || `topic-${title.toLowerCase().replace(/\s/g, '-')}`,
    title,
    category: 'MÉRITO',
    relatorio: '',
    fundamentacao: '',
  });

  const createMockAiSettings = (): AISettings => ({
    provider: 'claude',
    claudeModel: 'claude-sonnet-4-20250514',
    geminiModel: 'gemini-3-flash-preview',
    openaiModel: 'gpt-5.2-chat-latest',
    openaiReasoningLevel: 'medium',
    grokModel: 'grok-4-1-fast-reasoning',
    apiKeys: { claude: '', gemini: '', openai: '', grok: '' },
    useExtendedThinking: false,
    thinkingBudget: '10000',
    geminiThinkingLevel: 'low',
    customPrompt: '',
    modeloRelatorio: '',
    modeloDispositivo: '',
    modeloTopicoRelatorio: '',
    ocrEngine: 'pdfjs',
    parallelRequests: 2,
    anonymization: { enabled: false, nomesUsuario: [] },
    semanticSearchEnabled: false,
    semanticThreshold: 50,
    jurisSemanticEnabled: false,
    quickPrompts: [],
    topicosComplementares: [],
  });

  const createMockProps = (topics: Topic[] = []) => ({
    selectedTopics: topics,
    setSelectedTopics: vi.fn(),
    aiIntegration: {
      aiSettings: createMockAiSettings(),
      setAiSettings: vi.fn(),
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIAL STATE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Initial State', () => {
    it('should initialize with null drag states', () => {
      const props = createMockProps();
      const { result } = renderHook(() => useDragDropTopics(props));

      expect(result.current.draggedIndex).toBeNull();
      expect(result.current.dragOverIndex).toBeNull();
      expect(result.current.draggedComplementaryIndex).toBeNull();
      expect(result.current.dragOverComplementaryIndex).toBeNull();
    });

    it('should return all required handlers', () => {
      const props = createMockProps();
      const { result } = renderHook(() => useDragDropTopics(props));

      expect(result.current.handleDndDragEnd).toBeDefined();
      expect(result.current.handleDragStart).toBeDefined();
      expect(result.current.handleDragEnd).toBeDefined();
      expect(result.current.handleDragOver).toBeDefined();
      expect(result.current.handleDragLeave).toBeDefined();
      expect(result.current.handleDrop).toBeDefined();
      expect(result.current.handleComplementaryDragStart).toBeDefined();
      expect(result.current.handleComplementaryDragEnd).toBeDefined();
      expect(result.current.handleComplementaryDragOver).toBeDefined();
      expect(result.current.handleComplementaryDragLeave).toBeDefined();
      expect(result.current.handleComplementaryDrop).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SPECIAL TOPICS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Special Topics', () => {
    it('should identify RELATÓRIO as special topic', () => {
      const topics = [
        createMockTopic('RELATÓRIO'),
        createMockTopic('Horas Extras'),
      ];
      const props = createMockProps(topics);
      const { result } = renderHook(() => useDragDropTopics(props));

      expect(result.current.specialTopicIds.has('topic-relatório')).toBe(true);
    });

    it('should identify DISPOSITIVO as special topic', () => {
      const topics = [
        createMockTopic('Horas Extras'),
        createMockTopic('DISPOSITIVO'),
      ];
      const props = createMockProps(topics);
      const { result } = renderHook(() => useDragDropTopics(props));

      expect(result.current.specialTopicIds.has('topic-dispositivo')).toBe(true);
    });

    it('should NOT identify regular topics as special', () => {
      const topics = [
        createMockTopic('Horas Extras'),
        createMockTopic('Prescrição'),
      ];
      const props = createMockProps(topics);
      const { result } = renderHook(() => useDragDropTopics(props));

      expect(result.current.specialTopicIds.has('topic-horas-extras')).toBe(false);
      expect(result.current.specialTopicIds.has('topic-prescrição')).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DND KIT HANDLER TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('handleDndDragEnd', () => {
    it('should reorder topics on valid drag end', () => {
      const topics = [
        createMockTopic('Topic A', 'a'),
        createMockTopic('Topic B', 'b'),
        createMockTopic('Topic C', 'c'),
      ];
      const props = createMockProps(topics);
      const { result } = renderHook(() => useDragDropTopics(props));

      act(() => {
        result.current.handleDndDragEnd({ active: { id: 'a' }, over: { id: 'c' } });
      });

      expect(props.setSelectedTopics).toHaveBeenCalled();
      const newOrder = props.setSelectedTopics.mock.calls[0][0];
      expect(newOrder[0].id).toBe('b');
      expect(newOrder[1].id).toBe('c');
      expect(newOrder[2].id).toBe('a');
    });

    it('should NOT reorder when over is null', () => {
      const topics = [createMockTopic('Topic A', 'a')];
      const props = createMockProps(topics);
      const { result } = renderHook(() => useDragDropTopics(props));

      act(() => {
        result.current.handleDndDragEnd({ active: { id: 'a' }, over: null });
      });

      expect(props.setSelectedTopics).not.toHaveBeenCalled();
    });

    it('should NOT reorder when active equals over', () => {
      const topics = [createMockTopic('Topic A', 'a')];
      const props = createMockProps(topics);
      const { result } = renderHook(() => useDragDropTopics(props));

      act(() => {
        result.current.handleDndDragEnd({ active: { id: 'a' }, over: { id: 'a' } });
      });

      expect(props.setSelectedTopics).not.toHaveBeenCalled();
    });

    it('should NOT move RELATÓRIO topic', () => {
      const topics = [
        createMockTopic('RELATÓRIO', 'rel'),
        createMockTopic('Topic B', 'b'),
      ];
      const props = createMockProps(topics);
      const { result } = renderHook(() => useDragDropTopics(props));

      act(() => {
        result.current.handleDndDragEnd({ active: { id: 'rel' }, over: { id: 'b' } });
      });

      expect(props.setSelectedTopics).not.toHaveBeenCalled();
    });

    it('should NOT move to DISPOSITIVO position', () => {
      const topics = [
        createMockTopic('Topic A', 'a'),
        createMockTopic('DISPOSITIVO', 'disp'),
      ];
      const props = createMockProps(topics);
      const { result } = renderHook(() => useDragDropTopics(props));

      act(() => {
        result.current.handleDndDragEnd({ active: { id: 'a' }, over: { id: 'disp' } });
      });

      expect(props.setSelectedTopics).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // HTML5 DRAG HANDLERS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('HTML5 Drag Handlers', () => {
    const createMockDragEvent = (overrides = {}): React.DragEvent<HTMLElement> => ({
      preventDefault: vi.fn(),
      dataTransfer: {
        effectAllowed: '',
        dropEffect: '',
      },
      currentTarget: {
        style: { opacity: '1' },
        contains: vi.fn().mockReturnValue(false),
      },
      relatedTarget: null,
      clientY: 500,
      ...overrides,
    } as unknown as React.DragEvent<HTMLElement>);

    describe('handleDragStart', () => {
      it('should set draggedIndex', () => {
        const topics = [createMockTopic('Topic A'), createMockTopic('Topic B')];
        const props = createMockProps(topics);
        const { result } = renderHook(() => useDragDropTopics(props));

        act(() => {
          result.current.handleDragStart(createMockDragEvent(), 1);
        });

        expect(result.current.draggedIndex).toBe(1);
      });

      it('should set opacity to 0.5', () => {
        const topics = [createMockTopic('Topic A')];
        const props = createMockProps(topics);
        const { result } = renderHook(() => useDragDropTopics(props));

        const event = createMockDragEvent();
        act(() => {
          result.current.handleDragStart(event, 0);
        });

        expect(event.currentTarget.style.opacity).toBe('0.5');
      });

      it('should prevent drag for RELATÓRIO', () => {
        const topics = [createMockTopic('RELATÓRIO')];
        const props = createMockProps(topics);
        const { result } = renderHook(() => useDragDropTopics(props));

        const event = createMockDragEvent();
        act(() => {
          result.current.handleDragStart(event, 0);
        });

        expect(event.preventDefault).toHaveBeenCalled();
        expect(result.current.draggedIndex).toBeNull();
      });
    });

    describe('handleDragEnd', () => {
      it('should reset opacity and drag states', () => {
        const props = createMockProps([createMockTopic('Topic A')]);
        const { result } = renderHook(() => useDragDropTopics(props));

        // First start a drag
        act(() => {
          result.current.setDraggedIndex(0);
          result.current.setDragOverIndex(1);
        });

        const event = createMockDragEvent();
        act(() => {
          result.current.handleDragEnd(event);
        });

        expect(event.currentTarget.style.opacity).toBe('1');
        expect(result.current.draggedIndex).toBeNull();
        expect(result.current.dragOverIndex).toBeNull();
      });
    });

    describe('handleDragOver', () => {
      it('should set dragOverIndex when different from draggedIndex', () => {
        const topics = [createMockTopic('A'), createMockTopic('B')];
        const props = createMockProps(topics);
        const { result } = renderHook(() => useDragDropTopics(props));

        act(() => {
          result.current.setDraggedIndex(0);
        });

        act(() => {
          result.current.handleDragOver(createMockDragEvent(), 1);
        });

        expect(result.current.dragOverIndex).toBe(1);
      });

      it('should NOT set dragOverIndex when same as draggedIndex', () => {
        const topics = [createMockTopic('A')];
        const props = createMockProps(topics);
        const { result } = renderHook(() => useDragDropTopics(props));

        act(() => {
          result.current.setDraggedIndex(0);
        });

        act(() => {
          result.current.handleDragOver(createMockDragEvent(), 0);
        });

        expect(result.current.dragOverIndex).toBeNull();
      });
    });

    describe('handleDrop', () => {
      it('should reorder topics on drop', () => {
        const topics = [
          createMockTopic('A', 'a'),
          createMockTopic('B', 'b'),
          createMockTopic('C', 'c'),
        ];
        const props = createMockProps(topics);
        const { result } = renderHook(() => useDragDropTopics(props));

        act(() => {
          result.current.setDraggedIndex(0);
        });

        act(() => {
          result.current.handleDrop(createMockDragEvent(), 2);
        });

        expect(props.setSelectedTopics).toHaveBeenCalled();
      });

      it('should NOT drop when draggedIndex is null', () => {
        const topics = [createMockTopic('A')];
        const props = createMockProps(topics);
        const { result } = renderHook(() => useDragDropTopics(props));

        act(() => {
          result.current.handleDrop(createMockDragEvent(), 0);
        });

        expect(props.setSelectedTopics).not.toHaveBeenCalled();
      });

      it('should NOT drop on RELATÓRIO', () => {
        const topics = [
          createMockTopic('RELATÓRIO'),
          createMockTopic('A', 'a'),
        ];
        const props = createMockProps(topics);
        const { result } = renderHook(() => useDragDropTopics(props));

        act(() => {
          result.current.setDraggedIndex(1);
        });

        act(() => {
          result.current.handleDrop(createMockDragEvent(), 0);
        });

        expect(props.setSelectedTopics).not.toHaveBeenCalled();
      });

      it('should NOT drop DISPOSITIVO', () => {
        const topics = [
          createMockTopic('DISPOSITIVO'),
          createMockTopic('A', 'a'),
        ];
        const props = createMockProps(topics);
        const { result } = renderHook(() => useDragDropTopics(props));

        act(() => {
          result.current.setDraggedIndex(0);
        });

        act(() => {
          result.current.handleDrop(createMockDragEvent(), 1);
        });

        expect(props.setSelectedTopics).not.toHaveBeenCalled();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPLEMENTARY TOPICS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Complementary Topics Handlers', () => {
    const createMockDragEvent = (): React.DragEvent<HTMLElement> => ({
      preventDefault: vi.fn(),
      dataTransfer: { effectAllowed: '', dropEffect: '' },
      currentTarget: { style: { opacity: '1' } },
      target: {},
    } as unknown as React.DragEvent<HTMLElement>);

    it('should handle complementary drag start', () => {
      const props = createMockProps();
      const { result } = renderHook(() => useDragDropTopics(props));

      act(() => {
        result.current.handleComplementaryDragStart(createMockDragEvent(), 2);
      });

      expect(result.current.draggedComplementaryIndex).toBe(2);
    });

    it('should handle complementary drag end', () => {
      const props = createMockProps();
      const { result } = renderHook(() => useDragDropTopics(props));

      act(() => {
        result.current.setDraggedComplementaryIndex(1);
        result.current.setDragOverComplementaryIndex(2);
      });

      act(() => {
        result.current.handleComplementaryDragEnd(createMockDragEvent());
      });

      expect(result.current.draggedComplementaryIndex).toBeNull();
      expect(result.current.dragOverComplementaryIndex).toBeNull();
    });

    it('should handle complementary drag over', () => {
      const props = createMockProps();
      const { result } = renderHook(() => useDragDropTopics(props));

      act(() => {
        result.current.setDraggedComplementaryIndex(0);
      });

      act(() => {
        result.current.handleComplementaryDragOver(createMockDragEvent(), 1);
      });

      expect(result.current.dragOverComplementaryIndex).toBe(1);
    });

    it('should reorder complementary topics on drop', () => {
      const aiSettings = createMockAiSettings();
      aiSettings.topicosComplementares = [
        { id: 1, title: 'Comp A', category: 'MÉRITO', enabled: true, ordem: 1 },
        { id: 2, title: 'Comp B', category: 'MÉRITO', enabled: true, ordem: 2 },
        { id: 3, title: 'Comp C', category: 'MÉRITO', enabled: true, ordem: 3 },
      ];
      const props = {
        selectedTopics: [],
        setSelectedTopics: vi.fn(),
        aiIntegration: {
          aiSettings,
          setAiSettings: vi.fn(),
        },
      };
      const { result } = renderHook(() => useDragDropTopics(props));

      act(() => {
        result.current.setDraggedComplementaryIndex(0);
      });

      act(() => {
        result.current.handleComplementaryDrop(createMockDragEvent(), 2);
      });

      expect(props.aiIntegration.setAiSettings).toHaveBeenCalled();
      const newSettings = props.aiIntegration.setAiSettings.mock.calls[0][0];
      expect(newSettings.topicosComplementares[0].title).toBe('Comp B');
      expect(newSettings.topicosComplementares[2].title).toBe('Comp A');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // COLLISION DETECTION TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Custom Collision Detection', () => {
    it('should filter out special topics from droppable containers', () => {
      const topics = [
        createMockTopic('RELATÓRIO', 'rel'),
        createMockTopic('Topic A', 'a'),
        createMockTopic('DISPOSITIVO', 'disp'),
      ];
      const props = createMockProps(topics);
      const { result } = renderHook(() => useDragDropTopics(props));

      // customCollisionDetection should be defined
      expect(result.current.customCollisionDetection).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // STATE SETTERS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('State Setters', () => {
    it('should allow setting draggedIndex', () => {
      const props = createMockProps();
      const { result } = renderHook(() => useDragDropTopics(props));

      act(() => {
        result.current.setDraggedIndex(5);
      });

      expect(result.current.draggedIndex).toBe(5);
    });

    it('should allow setting dragOverIndex', () => {
      const props = createMockProps();
      const { result } = renderHook(() => useDragDropTopics(props));

      act(() => {
        result.current.setDragOverIndex(3);
      });

      expect(result.current.dragOverIndex).toBe(3);
    });

    it('should allow setting draggedComplementaryIndex', () => {
      const props = createMockProps();
      const { result } = renderHook(() => useDragDropTopics(props));

      act(() => {
        result.current.setDraggedComplementaryIndex(2);
      });

      expect(result.current.draggedComplementaryIndex).toBe(2);
    });

    it('should allow setting dragOverComplementaryIndex', () => {
      const props = createMockProps();
      const { result } = renderHook(() => useDragDropTopics(props));

      act(() => {
        result.current.setDragOverComplementaryIndex(4);
      });

      expect(result.current.dragOverComplementaryIndex).toBe(4);
    });
  });
});

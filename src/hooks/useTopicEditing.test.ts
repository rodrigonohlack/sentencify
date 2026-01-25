/**
 * @file useTopicEditing.test.ts
 * @description Testes para o hook useTopicEditing
 * @version 1.38.52
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTopicEditing } from './useTopicEditing';
import type { Topic, QuillInstance } from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// MOCKS
// ═══════════════════════════════════════════════════════════════════════════

const mockSetSavingTopic = vi.fn();
const mockSetEditingTopic = vi.fn();
const mockSetSelectedTopics = vi.fn();
const mockSetExtractedTopics = vi.fn();
const mockSetLastEditedTopicTitle = vi.fn();
const mockSetTopicToDelete = vi.fn();
const mockSetSuggestions = vi.fn();
const mockCallAI = vi.fn();
const mockOpenModal = vi.fn();
const mockSetActiveTab = vi.fn();
const mockSanitizeHTML = vi.fn((html: string) => html);

// Mutable refs for testing (cast as any to allow assignment in tests)
const mockEditorRef: { current: QuillInstance | null } = { current: null };
const mockRelatorioRef: { current: QuillInstance | null } = { current: null };

// Mock html-conversion
vi.mock('../utils/html-conversion', () => ({
  htmlToPlainText: vi.fn((html: string) => html.replace(/<[^>]*>/g, '')),
}));

// Mock text utilities
vi.mock('../utils/text', () => ({
  isRelatorio: vi.fn((topic: Topic) => topic.title?.toUpperCase() === 'RELATÓRIO'),
  isDispositivo: vi.fn((topic: Topic) => topic.title?.toUpperCase() === 'DISPOSITIVO'),
}));

// Mock prompts
vi.mock('../prompts', () => ({
  AI_PROMPTS: {
    roles: {
      classificacao: 'You are a classification assistant.',
    },
  },
}));

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

const createMockTopic = (title: string, category: Topic['category'] = 'MÉRITO'): Topic => ({
  title,
  category,
  content: 'Topic content',
  relatorio: 'Report text',
});

const createDefaultProps = () => ({
  topicManager: {
    editingTopic: null as Topic | null,
    selectedTopics: [] as Topic[],
    extractedTopics: [] as Topic[],
    setSavingTopic: mockSetSavingTopic,
    setEditingTopic: mockSetEditingTopic,
    setSelectedTopics: mockSetSelectedTopics,
    setExtractedTopics: mockSetExtractedTopics,
    setLastEditedTopicTitle: mockSetLastEditedTopicTitle,
    setTopicToDelete: mockSetTopicToDelete,
  },
  aiIntegration: {
    callAI: mockCallAI,
  },
  modelLibrary: {
    setSuggestions: mockSetSuggestions,
  },
  openModal: mockOpenModal,
  setActiveTab: mockSetActiveTab,
  sanitizeHTML: mockSanitizeHTML,
  editorRef: mockEditorRef,
  relatorioRef: mockRelatorioRef,
});

// ═══════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('useTopicEditing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEditorRef.current = null;
    mockRelatorioRef.current = null;
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // BASIC FUNCTIONALITY
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Basic Functionality', () => {
    it('should return all expected handlers', () => {
      const { result } = renderHook(() => useTopicEditing(createDefaultProps()));

      expect(result.current.toggleTopicSelection).toBeDefined();
      expect(result.current.deleteTopic).toBeDefined();
      expect(result.current.saveTopicEdit).toBeDefined();
      expect(result.current.saveTopicEditWithoutClosing).toBeDefined();
      expect(result.current.detectResultadoAutomatico).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // toggleTopicSelection
  // ═══════════════════════════════════════════════════════════════════════════

  describe('toggleTopicSelection', () => {
    it('should add a new topic to selection', () => {
      const props = createDefaultProps();
      props.topicManager.selectedTopics = [];

      const { result } = renderHook(() => useTopicEditing(props));
      const topic = createMockTopic('Horas Extras');

      act(() => {
        result.current.toggleTopicSelection(topic);
      });

      expect(mockSetSelectedTopics).toHaveBeenCalled();
      const newTopics = mockSetSelectedTopics.mock.calls[0][0];
      expect(newTopics).toHaveLength(1);
      expect(newTopics[0].title).toBe('Horas Extras');
    });

    it('should remove topic if already selected', () => {
      const props = createDefaultProps();
      props.topicManager.selectedTopics = [createMockTopic('Horas Extras')];

      const { result } = renderHook(() => useTopicEditing(props));
      const topic = createMockTopic('Horas Extras');

      act(() => {
        result.current.toggleTopicSelection(topic);
      });

      expect(mockSetSelectedTopics).toHaveBeenCalled();
      const newTopics = mockSetSelectedTopics.mock.calls[0][0];
      expect(newTopics).toHaveLength(0);
    });

    it('should add RELATÓRIO at beginning', () => {
      const props = createDefaultProps();
      props.topicManager.selectedTopics = [createMockTopic('Horas Extras')];

      const { result } = renderHook(() => useTopicEditing(props));
      const relatorio = createMockTopic('RELATÓRIO');

      act(() => {
        result.current.toggleTopicSelection(relatorio);
      });

      const newTopics = mockSetSelectedTopics.mock.calls[0][0];
      expect(newTopics[0].title).toBe('RELATÓRIO');
    });

    it('should add DISPOSITIVO at end', () => {
      const props = createDefaultProps();
      props.topicManager.selectedTopics = [createMockTopic('Horas Extras')];

      const { result } = renderHook(() => useTopicEditing(props));
      const dispositivo = createMockTopic('DISPOSITIVO');

      act(() => {
        result.current.toggleTopicSelection(dispositivo);
      });

      const newTopics = mockSetSelectedTopics.mock.calls[0][0];
      expect(newTopics[newTopics.length - 1].title).toBe('DISPOSITIVO');
    });

    it('should insert regular topic before DISPOSITIVO', () => {
      const props = createDefaultProps();
      props.topicManager.selectedTopics = [
        createMockTopic('Horas Extras'),
        createMockTopic('DISPOSITIVO'),
      ];

      const { result } = renderHook(() => useTopicEditing(props));
      const newTopic = createMockTopic('Dano Moral');

      act(() => {
        result.current.toggleTopicSelection(newTopic);
      });

      const newTopics = mockSetSelectedTopics.mock.calls[0][0];
      expect(newTopics[1].title).toBe('Dano Moral');
      expect(newTopics[2].title).toBe('DISPOSITIVO');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // deleteTopic
  // ═══════════════════════════════════════════════════════════════════════════

  describe('deleteTopic', () => {
    it('should set topic to delete and open modal', () => {
      const { result } = renderHook(() => useTopicEditing(createDefaultProps()));
      const topic = createMockTopic('To Delete');

      act(() => {
        result.current.deleteTopic(topic);
      });

      expect(mockSetTopicToDelete).toHaveBeenCalledWith(topic);
      expect(mockOpenModal).toHaveBeenCalledWith('deleteTopic');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // detectResultadoAutomatico
  // ═══════════════════════════════════════════════════════════════════════════

  describe('detectResultadoAutomatico', () => {
    it('should return null for RELATÓRIO topic', async () => {
      const { result } = renderHook(() => useTopicEditing(createDefaultProps()));

      const resultado = await act(async () => {
        return await result.current.detectResultadoAutomatico('RELATÓRIO', 'Some text', 'Mérito');
      });

      expect(resultado).toBeNull();
      expect(mockCallAI).not.toHaveBeenCalled();
    });

    it('should return null for DISPOSITIVO topic', async () => {
      const { result } = renderHook(() => useTopicEditing(createDefaultProps()));

      const resultado = await act(async () => {
        return await result.current.detectResultadoAutomatico('DISPOSITIVO', 'Some text', 'Mérito');
      });

      expect(resultado).toBeNull();
      expect(mockCallAI).not.toHaveBeenCalled();
    });

    it('should return null for empty decision text', async () => {
      const { result } = renderHook(() => useTopicEditing(createDefaultProps()));

      const resultado = await act(async () => {
        return await result.current.detectResultadoAutomatico('Horas Extras', '', 'Mérito');
      });

      expect(resultado).toBeNull();
      expect(mockCallAI).not.toHaveBeenCalled();
    });

    it('should detect PROCEDENTE result', async () => {
      mockCallAI.mockResolvedValueOnce('PROCEDENTE');

      const { result } = renderHook(() => useTopicEditing(createDefaultProps()));

      const resultado = await act(async () => {
        return await result.current.detectResultadoAutomatico(
          'Horas Extras',
          '<p>Julgo procedente o pedido de horas extras.</p>',
          'Mérito'
        );
      });

      expect(resultado).toBe('PROCEDENTE');
      expect(mockCallAI).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
          }),
        ]),
        expect.objectContaining({
          maxTokens: 500,
          temperature: 0.0,
        })
      );
    });

    it('should detect IMPROCEDENTE result', async () => {
      mockCallAI.mockResolvedValueOnce('IMPROCEDENTE');

      const { result } = renderHook(() => useTopicEditing(createDefaultProps()));

      const resultado = await act(async () => {
        return await result.current.detectResultadoAutomatico(
          'Dano Moral',
          '<p>Julgo improcedente o pedido de dano moral.</p>',
          'Mérito'
        );
      });

      expect(resultado).toBe('IMPROCEDENTE');
    });

    it('should detect PARCIALMENTE PROCEDENTE result', async () => {
      mockCallAI.mockResolvedValueOnce('PARCIALMENTE PROCEDENTE');

      const { result } = renderHook(() => useTopicEditing(createDefaultProps()));

      const resultado = await act(async () => {
        return await result.current.detectResultadoAutomatico(
          'Verbas Rescisórias',
          '<p>Julgo parcialmente procedente.</p>',
          'Mérito'
        );
      });

      expect(resultado).toBe('PARCIALMENTE PROCEDENTE');
    });

    it('should return null for invalid result', async () => {
      mockCallAI.mockResolvedValueOnce('INVALID_RESULT');

      const { result } = renderHook(() => useTopicEditing(createDefaultProps()));

      const resultado = await act(async () => {
        return await result.current.detectResultadoAutomatico(
          'Topic',
          '<p>Decision</p>',
          'Mérito'
        );
      });

      expect(resultado).toBeNull();
    });

    it('should return null on AI error', async () => {
      mockCallAI.mockRejectedValueOnce(new Error('AI error'));

      const { result } = renderHook(() => useTopicEditing(createDefaultProps()));

      const resultado = await act(async () => {
        return await result.current.detectResultadoAutomatico(
          'Topic',
          '<p>Decision</p>',
          'Mérito'
        );
      });

      expect(resultado).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // saveTopicEdit
  // ═══════════════════════════════════════════════════════════════════════════

  describe('saveTopicEdit', () => {
    it('should do nothing if no editing topic', async () => {
      const props = createDefaultProps();
      props.topicManager.editingTopic = null;

      const { result } = renderHook(() => useTopicEditing(props));

      await act(async () => {
        await result.current.saveTopicEdit();
      });

      expect(mockSetSavingTopic).not.toHaveBeenCalled();
    });

    it('should save topic edit and close editor', async () => {
      const props = createDefaultProps();
      props.topicManager.editingTopic = createMockTopic('Horas Extras');
      props.topicManager.selectedTopics = [createMockTopic('Horas Extras')];

      mockEditorRef.current = { root: { innerHTML: '<p>Edited fundamentacao</p>' } } as QuillInstance;
      mockRelatorioRef.current = { root: { innerHTML: '<p>Edited relatorio</p>' } } as QuillInstance;
      mockCallAI.mockResolvedValueOnce('PROCEDENTE');

      const { result } = renderHook(() => useTopicEditing(props));

      await act(async () => {
        await result.current.saveTopicEdit();
      });

      expect(mockSetSavingTopic).toHaveBeenCalledWith(true);
      expect(mockSetSelectedTopics).toHaveBeenCalled();
      expect(mockSetEditingTopic).toHaveBeenCalledWith(null);
      expect(mockSetSuggestions).toHaveBeenCalledWith([]);
      expect(mockSetActiveTab).toHaveBeenCalledWith('topics');
      expect(mockSetSavingTopic).toHaveBeenCalledWith(false);
    });

    it('should skip result detection for RELATÓRIO', async () => {
      const props = createDefaultProps();
      props.topicManager.editingTopic = createMockTopic('RELATÓRIO');
      props.topicManager.selectedTopics = [createMockTopic('RELATÓRIO')];

      mockRelatorioRef.current = { root: { innerHTML: '<p>Relatorio</p>' } } as QuillInstance;

      const { result } = renderHook(() => useTopicEditing(props));

      await act(async () => {
        await result.current.saveTopicEdit();
      });

      expect(mockCallAI).not.toHaveBeenCalled();
    });

    it('should not detect result if resultadoManual is set', async () => {
      const props = createDefaultProps();
      const topic = { ...createMockTopic('Horas Extras'), resultadoManual: true };
      props.topicManager.editingTopic = topic;
      props.topicManager.selectedTopics = [topic];

      mockEditorRef.current = { root: { innerHTML: '<p>Content</p>' } } as QuillInstance;
      mockRelatorioRef.current = { root: { innerHTML: '<p>Report</p>' } } as QuillInstance;

      const { result } = renderHook(() => useTopicEditing(props));

      await act(async () => {
        await result.current.saveTopicEdit();
      });

      expect(mockCallAI).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // saveTopicEditWithoutClosing
  // ═══════════════════════════════════════════════════════════════════════════

  describe('saveTopicEditWithoutClosing', () => {
    it('should do nothing if no editing topic', async () => {
      const props = createDefaultProps();
      props.topicManager.editingTopic = null;

      const { result } = renderHook(() => useTopicEditing(props));

      await act(async () => {
        await result.current.saveTopicEditWithoutClosing();
      });

      expect(mockSetSavingTopic).not.toHaveBeenCalled();
    });

    it('should save but keep editor open', async () => {
      const props = createDefaultProps();
      const topic = createMockTopic('Horas Extras');
      props.topicManager.editingTopic = topic;
      props.topicManager.selectedTopics = [topic];

      mockEditorRef.current = { root: { innerHTML: '<p>Content</p>' } } as QuillInstance;
      mockRelatorioRef.current = { root: { innerHTML: '<p>Report</p>' } } as QuillInstance;

      const { result } = renderHook(() => useTopicEditing(props));

      await act(async () => {
        await result.current.saveTopicEditWithoutClosing();
      });

      expect(mockSetSavingTopic).toHaveBeenCalledWith(true);
      expect(mockSetSelectedTopics).toHaveBeenCalled();
      // Should update editing topic, not set to null
      expect(mockSetEditingTopic).toHaveBeenCalled();
      expect(mockSetEditingTopic).not.toHaveBeenCalledWith(null);
      expect(mockSetLastEditedTopicTitle).toHaveBeenCalledWith('Horas Extras');
      expect(mockSetSavingTopic).toHaveBeenCalledWith(false);
    });

    it('should not call AI for result detection', async () => {
      const props = createDefaultProps();
      props.topicManager.editingTopic = createMockTopic('Horas Extras');
      props.topicManager.selectedTopics = [createMockTopic('Horas Extras')];

      mockEditorRef.current = { root: { innerHTML: '<p>Content</p>' } } as QuillInstance;
      mockRelatorioRef.current = { root: { innerHTML: '<p>Report</p>' } } as QuillInstance;

      const { result } = renderHook(() => useTopicEditing(props));

      await act(async () => {
        await result.current.saveTopicEditWithoutClosing();
      });

      expect(mockCallAI).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EDGE CASES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Edge Cases', () => {
    it('should handle case-insensitive topic comparison', () => {
      const props = createDefaultProps();
      props.topicManager.selectedTopics = [createMockTopic('HORAS EXTRAS')];

      const { result } = renderHook(() => useTopicEditing(props));
      const topic = createMockTopic('horas extras');

      act(() => {
        result.current.toggleTopicSelection(topic);
      });

      // Should remove the topic (case-insensitive match)
      const newTopics = mockSetSelectedTopics.mock.calls[0][0];
      expect(newTopics).toHaveLength(0);
    });

    it('should handle trimmed topic titles', () => {
      const props = createDefaultProps();
      props.topicManager.selectedTopics = [createMockTopic('Horas Extras')];

      const { result } = renderHook(() => useTopicEditing(props));
      const topic = createMockTopic('  Horas Extras  ');

      act(() => {
        result.current.toggleTopicSelection(topic);
      });

      // Should remove due to trimmed match
      const newTopics = mockSetSelectedTopics.mock.calls[0][0];
      expect(newTopics).toHaveLength(0);
    });
  });
});

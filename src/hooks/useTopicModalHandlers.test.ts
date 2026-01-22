/**
 * @file useTopicModalHandlers.test.ts
 * @description Testes para o hook useTopicModalHandlers
 * @version 1.38.39
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTopicModalHandlers } from './useTopicModalHandlers';
import type { Topic } from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// MOCKS
// ═══════════════════════════════════════════════════════════════════════════

const mockCloseModal = vi.fn();
const mockOpenModal = vi.fn();
const mockSetTopicToDelete = vi.fn();
const mockSetTopicToRename = vi.fn();
const mockSetNewTopicName = vi.fn();
const mockSetTopicsToMerge = vi.fn();
const mockSetTopicToSplit = vi.fn();
const mockSetSplitNames = vi.fn();
const mockSetNewTopicData = vi.fn();
const mockSetExtractedTopics = vi.fn();
const mockSetSelectedTopics = vi.fn();

let mockTopicToDelete: Topic | null = null;
let mockExtractedTopics: Topic[] = [];
let mockSelectedTopics: Topic[] = [];
let mockTopicsToMerge: Topic[] = [];

vi.mock('../stores/useUIStore', () => ({
  useUIStore: vi.fn((selector) => {
    const state = {
      closeModal: mockCloseModal,
      openModal: mockOpenModal,
    };
    return selector(state);
  }),
}));

vi.mock('../stores/useTopicsStore', () => ({
  useTopicsStore: vi.fn((selector) => {
    const state = {
      topicToDelete: mockTopicToDelete,
      setTopicToDelete: mockSetTopicToDelete,
      setTopicToRename: mockSetTopicToRename,
      setNewTopicName: mockSetNewTopicName,
      setTopicsToMerge: mockSetTopicsToMerge,
      setTopicToSplit: mockSetTopicToSplit,
      setSplitNames: mockSetSplitNames,
      setNewTopicData: mockSetNewTopicData,
      extractedTopics: mockExtractedTopics,
      setExtractedTopics: mockSetExtractedTopics,
      selectedTopics: mockSelectedTopics,
      setSelectedTopics: mockSetSelectedTopics,
      topicsToMerge: mockTopicsToMerge,
    };
    return selector(state);
  }),
}));

describe('useTopicModalHandlers', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // MOCK FACTORIES
  // ═══════════════════════════════════════════════════════════════════════════

  const createMockTopic = (title: string, category: 'MÉRITO' | 'PRELIMINAR' = 'MÉRITO'): Topic => ({
    id: `topic-${title.toLowerCase().replace(/\s/g, '-')}`,
    title,
    category,
    relatorio: `Relatório de ${title}`,
    fundamentacao: '',
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockTopicToDelete = null;
    mockExtractedTopics = [];
    mockSelectedTopics = [];
    mockTopicsToMerge = [];
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // BASIC FUNCTIONALITY TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Basic Functionality', () => {
    it('should return all expected handlers', () => {
      const { result } = renderHook(() => useTopicModalHandlers());

      expect(result.current.confirmDeleteTopic).toBeDefined();
      expect(result.current.cancelDeleteTopic).toBeDefined();
      expect(result.current.cancelRenameTopic).toBeDefined();
      expect(result.current.cancelMergeTopics).toBeDefined();
      expect(result.current.cancelSplitTopic).toBeDefined();
      expect(result.current.cancelNewTopic).toBeDefined();
      expect(result.current.cancelAllTopicOperations).toBeDefined();
      expect(result.current.openDeleteTopicModal).toBeDefined();
      expect(result.current.openRenameTopicModal).toBeDefined();
      expect(result.current.openMergeTopicsModal).toBeDefined();
      expect(result.current.openSplitTopicModal).toBeDefined();
      expect(result.current.openNewTopicModal).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DELETE TOPIC TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Delete Topic', () => {
    it('should not delete when topicToDelete is null', () => {
      mockTopicToDelete = null;
      const { result } = renderHook(() => useTopicModalHandlers());

      act(() => {
        result.current.confirmDeleteTopic();
      });

      expect(mockSetExtractedTopics).not.toHaveBeenCalled();
      expect(mockSetSelectedTopics).not.toHaveBeenCalled();
    });

    it('should delete topic from all lists', () => {
      const topic = createMockTopic('Horas Extras');
      mockTopicToDelete = topic;
      mockExtractedTopics = [topic, createMockTopic('Férias')];
      mockSelectedTopics = [topic];
      mockTopicsToMerge = [topic];

      const { result } = renderHook(() => useTopicModalHandlers());

      act(() => {
        result.current.confirmDeleteTopic();
      });

      expect(mockSetExtractedTopics).toHaveBeenCalled();
      expect(mockSetSelectedTopics).toHaveBeenCalled();
      expect(mockSetTopicsToMerge).toHaveBeenCalled();
      expect(mockSetTopicToDelete).toHaveBeenCalledWith(null);
      expect(mockCloseModal).toHaveBeenCalledWith('deleteTopic');
    });

    it('should cancel delete and close modal', () => {
      const { result } = renderHook(() => useTopicModalHandlers());

      act(() => {
        result.current.cancelDeleteTopic();
      });

      expect(mockSetTopicToDelete).toHaveBeenCalledWith(null);
      expect(mockCloseModal).toHaveBeenCalledWith('deleteTopic');
    });

    it('should open delete modal with topic', () => {
      const topic = createMockTopic('Horas Extras');
      const { result } = renderHook(() => useTopicModalHandlers());

      act(() => {
        result.current.openDeleteTopicModal(topic);
      });

      expect(mockSetTopicToDelete).toHaveBeenCalledWith(topic);
      expect(mockOpenModal).toHaveBeenCalledWith('deleteTopic');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RENAME TOPIC TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Rename Topic', () => {
    it('should cancel rename and reset state', () => {
      const { result } = renderHook(() => useTopicModalHandlers());

      act(() => {
        result.current.cancelRenameTopic();
      });

      expect(mockSetTopicToRename).toHaveBeenCalledWith(null);
      expect(mockSetNewTopicName).toHaveBeenCalledWith('');
      expect(mockCloseModal).toHaveBeenCalledWith('rename');
    });

    it('should open rename modal with topic', () => {
      const topic = createMockTopic('Horas Extras');
      const { result } = renderHook(() => useTopicModalHandlers());

      act(() => {
        result.current.openRenameTopicModal(topic);
      });

      expect(mockSetTopicToRename).toHaveBeenCalledWith(topic);
      expect(mockSetNewTopicName).toHaveBeenCalledWith('Horas Extras');
      expect(mockOpenModal).toHaveBeenCalledWith('rename');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // MERGE TOPICS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Merge Topics', () => {
    it('should cancel merge and reset state', () => {
      const { result } = renderHook(() => useTopicModalHandlers());

      act(() => {
        result.current.cancelMergeTopics();
      });

      expect(mockSetTopicsToMerge).toHaveBeenCalledWith([]);
      expect(mockCloseModal).toHaveBeenCalledWith('merge');
    });

    it('should open merge modal with topics', () => {
      const topics = [createMockTopic('Topic A'), createMockTopic('Topic B')];
      const { result } = renderHook(() => useTopicModalHandlers());

      act(() => {
        result.current.openMergeTopicsModal(topics);
      });

      expect(mockSetTopicsToMerge).toHaveBeenCalledWith(topics);
      expect(mockOpenModal).toHaveBeenCalledWith('merge');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SPLIT TOPIC TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Split Topic', () => {
    it('should cancel split and reset state', () => {
      const { result } = renderHook(() => useTopicModalHandlers());

      act(() => {
        result.current.cancelSplitTopic();
      });

      expect(mockSetTopicToSplit).toHaveBeenCalledWith(null);
      expect(mockSetSplitNames).toHaveBeenCalledWith(['', '']);
      expect(mockCloseModal).toHaveBeenCalledWith('split');
    });

    it('should open split modal with topic', () => {
      const topic = createMockTopic('Horas Extras');
      const { result } = renderHook(() => useTopicModalHandlers());

      act(() => {
        result.current.openSplitTopicModal(topic);
      });

      expect(mockSetTopicToSplit).toHaveBeenCalledWith(topic);
      expect(mockSetSplitNames).toHaveBeenCalledWith(['', '']);
      expect(mockOpenModal).toHaveBeenCalledWith('split');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // NEW TOPIC TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('New Topic', () => {
    it('should cancel new topic and reset state', () => {
      const { result } = renderHook(() => useTopicModalHandlers());

      act(() => {
        result.current.cancelNewTopic();
      });

      expect(mockSetNewTopicData).toHaveBeenCalledWith(null);
      expect(mockCloseModal).toHaveBeenCalledWith('newTopic');
    });

    it('should open new topic modal with default category', () => {
      const { result } = renderHook(() => useTopicModalHandlers());

      act(() => {
        result.current.openNewTopicModal();
      });

      expect(mockSetNewTopicData).toHaveBeenCalledWith({
        title: '',
        category: 'MÉRITO',
        relatorio: '',
      });
      expect(mockOpenModal).toHaveBeenCalledWith('newTopic');
    });

    it('should open new topic modal with custom category', () => {
      const { result } = renderHook(() => useTopicModalHandlers());

      act(() => {
        result.current.openNewTopicModal('PRELIMINAR');
      });

      expect(mockSetNewTopicData).toHaveBeenCalledWith({
        title: '',
        category: 'PRELIMINAR',
        relatorio: '',
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CANCEL ALL OPERATIONS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Cancel All Operations', () => {
    it('should cancel all topic operations', () => {
      const { result } = renderHook(() => useTopicModalHandlers());

      act(() => {
        result.current.cancelAllTopicOperations();
      });

      // Delete
      expect(mockSetTopicToDelete).toHaveBeenCalledWith(null);
      expect(mockCloseModal).toHaveBeenCalledWith('deleteTopic');

      // Rename
      expect(mockSetTopicToRename).toHaveBeenCalledWith(null);
      expect(mockSetNewTopicName).toHaveBeenCalledWith('');
      expect(mockCloseModal).toHaveBeenCalledWith('rename');

      // Merge
      expect(mockSetTopicsToMerge).toHaveBeenCalledWith([]);
      expect(mockCloseModal).toHaveBeenCalledWith('merge');

      // Split
      expect(mockSetTopicToSplit).toHaveBeenCalledWith(null);
      expect(mockSetSplitNames).toHaveBeenCalledWith(['', '']);
      expect(mockCloseModal).toHaveBeenCalledWith('split');

      // New
      expect(mockSetNewTopicData).toHaveBeenCalledWith(null);
      expect(mockCloseModal).toHaveBeenCalledWith('newTopic');
    });
  });
});

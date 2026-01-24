import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

vi.mock('../stores/useTopicsStore', () => {
  const mockState = {
    extractedTopics: [],
    selectedTopics: [],
    editingTopic: null,
    lastEditedTopicTitle: null,
    topicContextScope: 'full',
    savingTopic: false,
    topicToDelete: null,
    topicToRename: null,
    newTopicName: '',
    topicsToMerge: null,
    topicToSplit: null,
    splitNames: ['', ''],
    newTopicData: null,
    setExtractedTopics: vi.fn(),
    setSelectedTopics: vi.fn(),
    setEditingTopic: vi.fn(),
    setLastEditedTopicTitle: vi.fn(),
    setTopicContextScope: vi.fn(),
    setSavingTopic: vi.fn(),
    setTopicToDelete: vi.fn(),
    setTopicToRename: vi.fn(),
    setNewTopicName: vi.fn(),
    setTopicsToMerge: vi.fn(),
    setTopicToSplit: vi.fn(),
    setSplitNames: vi.fn(),
    setNewTopicData: vi.fn(),
    prepareDeleteTopic: vi.fn(),
    prepareRenameTopic: vi.fn(),
    prepareMergeTopics: vi.fn(),
    prepareSplitTopic: vi.fn(),
    prepareNewTopic: vi.fn(),
    confirmDeleteTopic: vi.fn(),
    cancelOperation: vi.fn(),
    updateSelectedTopics: vi.fn(),
    serializeForPersistence: vi.fn(() => ({})),
    restoreFromPersistence: vi.fn(),
    clearAll: vi.fn(),
  };

  return {
    useTopicsStore: vi.fn((selector) => selector(mockState)),
  };
});

import { useTopicManager } from './useTopicManager';

describe('useTopicManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('hook initialization', () => {
    it('should return all topic states', () => {
      const { result } = renderHook(() => useTopicManager());

      expect(result.current.extractedTopics).toEqual([]);
      expect(result.current.selectedTopics).toEqual([]);
      expect(result.current.editingTopic).toBeNull();
      expect(result.current.lastEditedTopicTitle).toBeNull();
      expect(result.current.topicContextScope).toBe('full');
      expect(result.current.savingTopic).toBe(false);
    });

    it('should return manipulation states', () => {
      const { result } = renderHook(() => useTopicManager());

      expect(result.current.topicToDelete).toBeNull();
      expect(result.current.topicToRename).toBeNull();
      expect(result.current.newTopicName).toBe('');
      expect(result.current.topicsToMerge).toBeNull();
      expect(result.current.topicToSplit).toBeNull();
      expect(result.current.splitNames).toEqual(['', '']);
      expect(result.current.newTopicData).toBeNull();
    });
  });

  describe('topic setters', () => {
    it('should expose setExtractedTopics', () => {
      const { result } = renderHook(() => useTopicManager());
      expect(typeof result.current.setExtractedTopics).toBe('function');
    });

    it('should expose setSelectedTopics', () => {
      const { result } = renderHook(() => useTopicManager());
      expect(typeof result.current.setSelectedTopics).toBe('function');
    });

    it('should expose setEditingTopic', () => {
      const { result } = renderHook(() => useTopicManager());
      expect(typeof result.current.setEditingTopic).toBe('function');
    });

    it('should expose setSavingTopic', () => {
      const { result } = renderHook(() => useTopicManager());
      expect(typeof result.current.setSavingTopic).toBe('function');
    });

    it('should expose setLastEditedTopicTitle', () => {
      const { result } = renderHook(() => useTopicManager());
      expect(typeof result.current.setLastEditedTopicTitle).toBe('function');
    });

    it('should expose setTopicContextScope', () => {
      const { result } = renderHook(() => useTopicManager());
      expect(typeof result.current.setTopicContextScope).toBe('function');
    });
  });

  describe('manipulation setters', () => {
    it('should expose setTopicToDelete', () => {
      const { result } = renderHook(() => useTopicManager());
      expect(typeof result.current.setTopicToDelete).toBe('function');
    });

    it('should expose setTopicToRename', () => {
      const { result } = renderHook(() => useTopicManager());
      expect(typeof result.current.setTopicToRename).toBe('function');
    });

    it('should expose setNewTopicName', () => {
      const { result } = renderHook(() => useTopicManager());
      expect(typeof result.current.setNewTopicName).toBe('function');
    });

    it('should expose setTopicsToMerge', () => {
      const { result } = renderHook(() => useTopicManager());
      expect(typeof result.current.setTopicsToMerge).toBe('function');
    });

    it('should expose setTopicToSplit', () => {
      const { result } = renderHook(() => useTopicManager());
      expect(typeof result.current.setTopicToSplit).toBe('function');
    });

    it('should expose setSplitNames', () => {
      const { result } = renderHook(() => useTopicManager());
      expect(typeof result.current.setSplitNames).toBe('function');
    });

    it('should expose setNewTopicData', () => {
      const { result } = renderHook(() => useTopicManager());
      expect(typeof result.current.setNewTopicData).toBe('function');
    });
  });

  describe('handlers', () => {
    it('should expose prepareDeleteTopic', () => {
      const { result } = renderHook(() => useTopicManager());
      expect(typeof result.current.prepareDeleteTopic).toBe('function');
    });

    it('should expose prepareRenameTopic', () => {
      const { result } = renderHook(() => useTopicManager());
      expect(typeof result.current.prepareRenameTopic).toBe('function');
    });

    it('should expose prepareMergeTopics', () => {
      const { result } = renderHook(() => useTopicManager());
      expect(typeof result.current.prepareMergeTopics).toBe('function');
    });

    it('should expose prepareSplitTopic', () => {
      const { result } = renderHook(() => useTopicManager());
      expect(typeof result.current.prepareSplitTopic).toBe('function');
    });

    it('should expose prepareNewTopic', () => {
      const { result } = renderHook(() => useTopicManager());
      expect(typeof result.current.prepareNewTopic).toBe('function');
    });

    it('should expose confirmDeleteTopic', () => {
      const { result } = renderHook(() => useTopicManager());
      expect(typeof result.current.confirmDeleteTopic).toBe('function');
    });

    it('should expose cancelOperation', () => {
      const { result } = renderHook(() => useTopicManager());
      expect(typeof result.current.cancelOperation).toBe('function');
    });

    it('should expose updateSelectedTopics', () => {
      const { result } = renderHook(() => useTopicManager());
      expect(typeof result.current.updateSelectedTopics).toBe('function');
    });
  });

  describe('persistence', () => {
    it('should expose serializeForPersistence', () => {
      const { result } = renderHook(() => useTopicManager());
      expect(typeof result.current.serializeForPersistence).toBe('function');
    });

    it('should expose restoreFromPersistence', () => {
      const { result } = renderHook(() => useTopicManager());
      expect(typeof result.current.restoreFromPersistence).toBe('function');
    });

    it('should expose clearAll', () => {
      const { result } = renderHook(() => useTopicManager());
      expect(typeof result.current.clearAll).toBe('function');
    });
  });
});

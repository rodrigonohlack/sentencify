/**
 * @file useTopicsStore.test.ts
 * @description Testes para o store de tópicos (extração, seleção, edição)
 * @version 1.37.57
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  useTopicsStore,
  selectExtractedTopics,
  selectSelectedTopics,
  selectEditingTopic,
  selectManipulationState
} from './useTopicsStore';
import type { Topic, TopicCategory } from '../types';

describe('useTopicsStore', () => {
  // Reset store before each test
  beforeEach(() => {
    const store = useTopicsStore.getState();
    store.clearAll();
  });

  // Helper to create mock topics
  const createMockTopic = (overrides: Partial<Topic> = {}): Topic => ({
    id: `topic-${Date.now()}-${Math.random()}`,
    title: 'Test Topic',
    category: 'MÉRITO' as TopicCategory,
    relatorio: '',
    fundamentacao: '',
    dispositivo: '',
    ...overrides
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EXTRACTED TOPICS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Extracted Topics', () => {
    it('should set extracted topics', () => {
      const store = useTopicsStore.getState();
      const topics = [
        createMockTopic({ id: '1', title: 'Topic 1' }),
        createMockTopic({ id: '2', title: 'Topic 2' })
      ];

      store.setExtractedTopics(topics);

      expect(useTopicsStore.getState().extractedTopics).toHaveLength(2);
    });

    it('should set extracted topics with updater function', () => {
      const store = useTopicsStore.getState();
      store.setExtractedTopics([createMockTopic({ id: '1' })]);

      store.setExtractedTopics((prev) => [...prev, createMockTopic({ id: '2' })]);

      expect(useTopicsStore.getState().extractedTopics).toHaveLength(2);
    });

    it('should replace extracted topics', () => {
      const store = useTopicsStore.getState();
      store.setExtractedTopics([createMockTopic({ id: '1' }), createMockTopic({ id: '2' })]);

      store.setExtractedTopics([createMockTopic({ id: '3' })]);

      const state = useTopicsStore.getState();
      expect(state.extractedTopics).toHaveLength(1);
      expect(state.extractedTopics[0].id).toBe('3');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SELECTED TOPICS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Selected Topics', () => {
    it('should set selected topics', () => {
      const store = useTopicsStore.getState();
      const topics = [
        createMockTopic({ id: '1', title: 'Selected 1' }),
        createMockTopic({ id: '2', title: 'Selected 2' })
      ];

      store.setSelectedTopics(topics);

      expect(useTopicsStore.getState().selectedTopics).toHaveLength(2);
    });

    it('should set selected topics with updater function', () => {
      const store = useTopicsStore.getState();
      store.setSelectedTopics([createMockTopic({ id: '1' })]);

      store.setSelectedTopics((prev) => prev.filter((t) => t.id !== '1'));

      expect(useTopicsStore.getState().selectedTopics).toHaveLength(0);
    });

    it('should update selected topics', () => {
      const store = useTopicsStore.getState();
      const topics = [createMockTopic({ id: '1' })];

      store.updateSelectedTopics(topics);

      expect(useTopicsStore.getState().selectedTopics).toEqual(topics);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EDITING TOPIC TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Editing Topic', () => {
    it('should set editing topic', () => {
      const store = useTopicsStore.getState();
      const topic = createMockTopic({ id: 'edit-1', title: 'Editing' });

      store.setEditingTopic(topic);

      expect(useTopicsStore.getState().editingTopic).toEqual(topic);
    });

    it('should clear editing topic', () => {
      const store = useTopicsStore.getState();
      store.setEditingTopic(createMockTopic());

      store.setEditingTopic(null);

      expect(useTopicsStore.getState().editingTopic).toBeNull();
    });

    it('should set editing topic with updater function', () => {
      const store = useTopicsStore.getState();
      store.setEditingTopic(createMockTopic({ id: '1', relatorio: 'Initial' }));

      store.setEditingTopic((prev) =>
        prev ? { ...prev, relatorio: 'Updated' } : null
      );

      expect(useTopicsStore.getState().editingTopic?.relatorio).toBe('Updated');
    });

    it('should set last edited topic title', () => {
      const store = useTopicsStore.getState();

      store.setLastEditedTopicTitle('HORAS EXTRAS');

      expect(useTopicsStore.getState().lastEditedTopicTitle).toBe('HORAS EXTRAS');
    });

    it('should clear last edited topic title', () => {
      const store = useTopicsStore.getState();
      store.setLastEditedTopicTitle('Test');

      store.setLastEditedTopicTitle(null);

      expect(useTopicsStore.getState().lastEditedTopicTitle).toBeNull();
    });

    it('should set topic context scope', () => {
      const store = useTopicsStore.getState();

      store.setTopicContextScope('all');
      expect(useTopicsStore.getState().topicContextScope).toBe('all');

      store.setTopicContextScope('current');
      expect(useTopicsStore.getState().topicContextScope).toBe('current');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // UI STATE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('UI State', () => {
    it('should set saving topic state', () => {
      const store = useTopicsStore.getState();

      store.setSavingTopic(true);
      expect(useTopicsStore.getState().savingTopic).toBe(true);

      store.setSavingTopic(false);
      expect(useTopicsStore.getState().savingTopic).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DELETE TOPIC TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Delete Topic', () => {
    it('should prepare delete topic', () => {
      const store = useTopicsStore.getState();
      const topic = createMockTopic({ id: 'delete-1' });

      store.prepareDeleteTopic(topic);

      expect(useTopicsStore.getState().topicToDelete).toEqual(topic);
    });

    it('should set topic to delete directly', () => {
      const store = useTopicsStore.getState();
      const topic = createMockTopic();

      store.setTopicToDelete(topic);

      expect(useTopicsStore.getState().topicToDelete).toEqual(topic);
    });

    it('should confirm delete topic', () => {
      const store = useTopicsStore.getState();
      const topic1 = createMockTopic({ id: '1', title: 'Topic 1' });
      const topic2 = createMockTopic({ id: '2', title: 'Topic 2' });

      store.setSelectedTopics([topic1, topic2]);
      store.setTopicToDelete(topic1);

      store.confirmDeleteTopic();

      const state = useTopicsStore.getState();
      expect(state.selectedTopics).toHaveLength(1);
      expect(state.selectedTopics[0].title).toBe('Topic 2');
      expect(state.topicToDelete).toBeNull();
    });

    it('should not delete if topicToDelete is null', () => {
      const store = useTopicsStore.getState();
      store.setSelectedTopics([createMockTopic()]);

      store.confirmDeleteTopic();

      expect(useTopicsStore.getState().selectedTopics).toHaveLength(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RENAME TOPIC TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Rename Topic', () => {
    it('should prepare rename topic', () => {
      const store = useTopicsStore.getState();
      const topic = createMockTopic({ title: 'Original Name' });

      store.prepareRenameTopic(topic);

      const state = useTopicsStore.getState();
      expect(state.topicToRename).toEqual(topic);
      expect(state.newTopicName).toBe('Original Name');
    });

    it('should set topic to rename directly', () => {
      const store = useTopicsStore.getState();
      const topic = createMockTopic();

      store.setTopicToRename(topic);

      expect(useTopicsStore.getState().topicToRename).toEqual(topic);
    });

    it('should set new topic name', () => {
      const store = useTopicsStore.getState();

      store.setNewTopicName('New Name');

      expect(useTopicsStore.getState().newTopicName).toBe('New Name');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // MERGE TOPICS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Merge Topics', () => {
    it('should prepare merge topics', () => {
      const store = useTopicsStore.getState();
      const topics = [
        createMockTopic({ id: '1' }),
        createMockTopic({ id: '2' })
      ];

      store.prepareMergeTopics(topics);

      expect(useTopicsStore.getState().topicsToMerge).toHaveLength(2);
    });

    it('should set topics to merge directly', () => {
      const store = useTopicsStore.getState();
      const topics = [createMockTopic()];

      store.setTopicsToMerge(topics);

      expect(useTopicsStore.getState().topicsToMerge).toEqual(topics);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SPLIT TOPIC TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Split Topic', () => {
    it('should prepare split topic', () => {
      const store = useTopicsStore.getState();
      const topic = createMockTopic();

      store.prepareSplitTopic(topic);

      const state = useTopicsStore.getState();
      expect(state.topicToSplit).toEqual(topic);
      expect(state.splitNames).toEqual(['', '']);
    });

    it('should set topic to split directly', () => {
      const store = useTopicsStore.getState();
      const topic = createMockTopic();

      store.setTopicToSplit(topic);

      expect(useTopicsStore.getState().topicToSplit).toEqual(topic);
    });

    it('should set split names', () => {
      const store = useTopicsStore.getState();

      store.setSplitNames(['Part A', 'Part B']);

      expect(useTopicsStore.getState().splitNames).toEqual(['Part A', 'Part B']);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // NEW TOPIC TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('New Topic', () => {
    it('should prepare new topic with default category', () => {
      const store = useTopicsStore.getState();

      store.prepareNewTopic();

      const state = useTopicsStore.getState();
      expect(state.newTopicData).not.toBeNull();
      expect(state.newTopicData?.category).toBe('MÉRITO');
      expect(state.newTopicData?.title).toBe('');
    });

    it('should prepare new topic with custom category', () => {
      const store = useTopicsStore.getState();

      store.prepareNewTopic('PRELIMINAR');

      expect(useTopicsStore.getState().newTopicData?.category).toBe('PRELIMINAR');
    });

    it('should set new topic data directly', () => {
      const store = useTopicsStore.getState();
      const data = { title: 'New', category: 'MÉRITO' as TopicCategory };

      store.setNewTopicData(data);

      expect(useTopicsStore.getState().newTopicData).toEqual(data);
    });

    it('should set new topic data with updater function', () => {
      const store = useTopicsStore.getState();
      store.setNewTopicData({ title: 'Initial' });

      store.setNewTopicData((prev) => prev ? { ...prev, title: 'Updated' } : null);

      expect(useTopicsStore.getState().newTopicData?.title).toBe('Updated');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CANCEL OPERATION TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Cancel Operation', () => {
    it('should cancel all operations', () => {
      const store = useTopicsStore.getState();

      // Set up various pending operations
      store.setTopicToDelete(createMockTopic());
      store.setTopicToRename(createMockTopic());
      store.setNewTopicName('Some Name');
      store.setTopicsToMerge([createMockTopic()]);
      store.setTopicToSplit(createMockTopic());
      store.setSplitNames(['A', 'B']);
      store.setNewTopicData({ title: 'New' });

      store.cancelOperation();

      const state = useTopicsStore.getState();
      expect(state.topicToDelete).toBeNull();
      expect(state.topicToRename).toBeNull();
      expect(state.newTopicName).toBe('');
      expect(state.topicsToMerge).toHaveLength(0);
      expect(state.topicToSplit).toBeNull();
      expect(state.splitNames).toEqual(['', '']);
      expect(state.newTopicData).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PERSISTENCE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Persistence', () => {
    it('should serialize for persistence', () => {
      const store = useTopicsStore.getState();
      const extracted = [createMockTopic({ id: '1' })];
      const selected = [createMockTopic({ id: '2' })];
      const editing = createMockTopic({ id: '3' });

      store.setExtractedTopics(extracted);
      store.setSelectedTopics(selected);
      store.setEditingTopic(editing);
      store.setLastEditedTopicTitle('Test Title');

      const serialized = store.serializeForPersistence();

      expect(serialized.extractedTopics).toEqual(extracted);
      expect(serialized.selectedTopics).toEqual(selected);
      expect(serialized.editingTopic).toEqual(editing);
      expect(serialized.lastEditedTopicTitle).toBe('Test Title');
    });

    it('should restore from persistence', () => {
      const store = useTopicsStore.getState();
      const data = {
        extractedTopics: [createMockTopic({ id: 'restored-1' })],
        selectedTopics: [createMockTopic({ id: 'restored-2' })],
        editingTopic: createMockTopic({ id: 'restored-3' }),
        lastEditedTopicTitle: 'Restored Title'
      };

      store.restoreFromPersistence(data);

      const state = useTopicsStore.getState();
      expect(state.extractedTopics[0].id).toBe('restored-1');
      expect(state.selectedTopics[0].id).toBe('restored-2');
      expect(state.editingTopic?.id).toBe('restored-3');
      expect(state.lastEditedTopicTitle).toBe('Restored Title');
    });

    it('should handle null data in restore', () => {
      const store = useTopicsStore.getState();
      store.setExtractedTopics([createMockTopic()]);

      store.restoreFromPersistence(null);

      // Should not change anything
      expect(useTopicsStore.getState().extractedTopics).toHaveLength(1);
    });

    it('should handle partial data in restore', () => {
      const store = useTopicsStore.getState();
      store.setExtractedTopics([createMockTopic({ id: 'old' })]);
      store.setSelectedTopics([createMockTopic({ id: 'old-selected' })]);

      store.restoreFromPersistence({
        extractedTopics: [createMockTopic({ id: 'new' })]
        // selectedTopics not provided
      });

      const state = useTopicsStore.getState();
      expect(state.extractedTopics[0].id).toBe('new');
      expect(state.selectedTopics[0].id).toBe('old-selected'); // Unchanged
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CLEAR ALL TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Clear All', () => {
    it('should clear all state', () => {
      const store = useTopicsStore.getState();

      // Set up various state
      store.setExtractedTopics([createMockTopic()]);
      store.setSelectedTopics([createMockTopic()]);
      store.setEditingTopic(createMockTopic());
      store.setLastEditedTopicTitle('Test');
      store.setSavingTopic(true);
      store.setTopicToDelete(createMockTopic());
      store.setTopicToRename(createMockTopic());
      store.setNewTopicName('Name');
      store.setTopicsToMerge([createMockTopic()]);
      store.setTopicToSplit(createMockTopic());
      store.setSplitNames(['A', 'B']);
      store.setNewTopicData({ title: 'New' });

      store.clearAll();

      const state = useTopicsStore.getState();
      expect(state.extractedTopics).toHaveLength(0);
      expect(state.selectedTopics).toHaveLength(0);
      expect(state.editingTopic).toBeNull();
      expect(state.lastEditedTopicTitle).toBeNull();
      expect(state.savingTopic).toBe(false);
      expect(state.topicToDelete).toBeNull();
      expect(state.topicToRename).toBeNull();
      expect(state.newTopicName).toBe('');
      expect(state.topicsToMerge).toHaveLength(0);
      expect(state.topicToSplit).toBeNull();
      expect(state.splitNames).toEqual(['', '']);
      expect(state.newTopicData).toBeNull();
    });

    it('should preserve topicContextScope on clear', () => {
      const store = useTopicsStore.getState();
      store.setTopicContextScope('all');

      store.clearAll();

      expect(useTopicsStore.getState().topicContextScope).toBe('all');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SELECTORS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Selectors', () => {
    it('selectExtractedTopics should return extracted topics', () => {
      const store = useTopicsStore.getState();
      const topics = [createMockTopic({ id: '1' })];
      store.setExtractedTopics(topics);

      expect(selectExtractedTopics(useTopicsStore.getState())).toEqual(topics);
    });

    it('selectSelectedTopics should return selected topics', () => {
      const store = useTopicsStore.getState();
      const topics = [createMockTopic({ id: '1' })];
      store.setSelectedTopics(topics);

      expect(selectSelectedTopics(useTopicsStore.getState())).toEqual(topics);
    });

    it('selectEditingTopic should return editing topic', () => {
      const store = useTopicsStore.getState();
      const topic = createMockTopic();
      store.setEditingTopic(topic);

      expect(selectEditingTopic(useTopicsStore.getState())).toEqual(topic);
    });

    it('selectManipulationState should return manipulation state', () => {
      const store = useTopicsStore.getState();
      const deleteTopic = createMockTopic({ id: 'delete' });
      const renameTopic = createMockTopic({ id: 'rename' });

      store.setTopicToDelete(deleteTopic);
      store.setTopicToRename(renameTopic);
      store.setNewTopicName('New Name');
      store.setSplitNames(['A', 'B']);

      const manipulation = selectManipulationState(useTopicsStore.getState());

      expect(manipulation.topicToDelete).toEqual(deleteTopic);
      expect(manipulation.topicToRename).toEqual(renameTopic);
      expect(manipulation.newTopicName).toBe('New Name');
      expect(manipulation.splitNames).toEqual(['A', 'B']);
    });
  });

});

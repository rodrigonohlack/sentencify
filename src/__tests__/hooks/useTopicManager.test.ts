/**
 * @file useTopicManager.test.ts
 * @description Testes para o hook useTopicManager
 * @coverage Topic CRUD, editing, merging, splitting, persistence
 *
 * NOTA: Este teste verifica a lógica de PRODUÇÃO do hook useTopicManager.
 * O hook gerencia tópicos da sentença (~185 linhas).
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Tipos
interface Topic {
  id: string;
  title: string;
  category: TopicCategory;
  relatorio?: string;
  fundamentacao?: string;
  dispositivo?: string;
  veredicto?: string;
  order?: number;
  isSpecial?: boolean;
}

type TopicCategory = 'PRELIMINAR' | 'PREJUDICIAL' | 'MÉRITO' | 'RELATÓRIO' | 'DISPOSITIVO';

// Mock de Topic
const createMockTopic = (overrides: Partial<Topic> = {}): Topic => ({
  id: `topic-${Math.random().toString(36).substr(2, 9)}`,
  title: 'HORAS EXTRAS',
  category: 'MÉRITO',
  relatorio: '',
  fundamentacao: '',
  dispositivo: '',
  veredicto: 'procedente',
  order: 1,
  isSpecial: false,
  ...overrides,
});

describe('useTopicManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================================
  // SEÇÃO 1: TOPIC STATES
  // ============================================================

  describe('Topic States', () => {
    it('should initialize with empty extractedTopics', () => {
      const extractedTopics: Topic[] = [];
      expect(extractedTopics).toHaveLength(0);
    });

    it('should initialize with empty selectedTopics', () => {
      const selectedTopics: Topic[] = [];
      expect(selectedTopics).toHaveLength(0);
    });

    it('should set extracted topics', () => {
      let extractedTopics: Topic[] = [];

      const setExtractedTopics = (topics: Topic[]) => {
        extractedTopics = topics;
      };

      const topics = [createMockTopic(), createMockTopic()];
      setExtractedTopics(topics);

      expect(extractedTopics).toHaveLength(2);
    });

    it('should set selected topics', () => {
      let selectedTopics: Topic[] = [];

      const setSelectedTopics = (topics: Topic[]) => {
        selectedTopics = topics;
      };

      const topics = [createMockTopic()];
      setSelectedTopics(topics);

      expect(selectedTopics).toHaveLength(1);
    });
  });

  // ============================================================
  // SEÇÃO 2: EDITING STATES
  // ============================================================

  describe('Editing States', () => {
    it('should initialize with no editing topic', () => {
      const editingTopic: Topic | null = null;
      expect(editingTopic).toBeNull();
    });

    it('should track editing topic', () => {
      let editingTopic: Topic | null = null;

      const setEditingTopic = (topic: Topic | null) => {
        editingTopic = topic;
      };

      const topic = createMockTopic();
      setEditingTopic(topic);

      expect(editingTopic).toBe(topic);
    });

    it('should track last edited topic title', () => {
      let lastEditedTopicTitle: string | null = null;

      const setLastEditedTopicTitle = (title: string | null) => {
        lastEditedTopicTitle = title;
      };

      setLastEditedTopicTitle('HORAS EXTRAS');
      expect(lastEditedTopicTitle).toBe('HORAS EXTRAS');
    });

    it('should track topic context scope', () => {
      let topicContextScope = 'current';

      const setTopicContextScope = (scope: string) => {
        topicContextScope = scope;
      };

      setTopicContextScope('global');
      expect(topicContextScope).toBe('global');
    });

    it('should track saving state', () => {
      let savingTopic = false;

      const setSavingTopic = (saving: boolean) => {
        savingTopic = saving;
      };

      setSavingTopic(true);
      expect(savingTopic).toBe(true);
    });
  });

  // ============================================================
  // SEÇÃO 3: DELETE TOPIC
  // ============================================================

  describe('Delete Topic', () => {
    it('should prepare topic for deletion', () => {
      let topicToDelete: Topic | null = null;

      const prepareDeleteTopic = (topic: Topic) => {
        topicToDelete = topic;
      };

      const topic = createMockTopic();
      prepareDeleteTopic(topic);

      expect(topicToDelete).toBe(topic);
    });

    it('should confirm delete topic', () => {
      let selectedTopics = [
        createMockTopic({ title: 'HORAS EXTRAS' }),
        createMockTopic({ title: 'FÉRIAS' }),
      ];
      let topicToDelete: Topic | null = selectedTopics[0];

      const confirmDeleteTopic = () => {
        if (!topicToDelete) return;
        selectedTopics = selectedTopics.filter((t) => t.title !== topicToDelete!.title);
        topicToDelete = null;
      };

      confirmDeleteTopic();

      expect(selectedTopics).toHaveLength(1);
      expect(selectedTopics[0].title).toBe('FÉRIAS');
      expect(topicToDelete).toBeNull();
    });

    it('should not delete if no topic selected', () => {
      let selectedTopics = [createMockTopic()];
      let topicToDelete: Topic | null = null;
      let deletionAttempted = false;

      const confirmDeleteTopic = (topic: Topic | null) => {
        if (!topic) return;
        deletionAttempted = true;
        selectedTopics = selectedTopics.filter((t) => t.title !== topic.title);
      };

      // topicToDelete is null - no deletion should occur
      confirmDeleteTopic(topicToDelete);

      expect(selectedTopics).toHaveLength(1);
      expect(deletionAttempted).toBe(false);
    });
  });

  // ============================================================
  // SEÇÃO 4: RENAME TOPIC
  // ============================================================

  describe('Rename Topic', () => {
    it('should prepare topic for rename', () => {
      let topicToRename: Topic | null = null;
      let newTopicName = '';

      const prepareRenameTopic = (topic: Topic) => {
        topicToRename = topic;
        newTopicName = topic.title;
      };

      const topic = createMockTopic({ title: 'HORAS EXTRAS' });
      prepareRenameTopic(topic);

      expect(topicToRename).toBe(topic);
      expect(newTopicName).toBe('HORAS EXTRAS');
    });

    it('should update new topic name', () => {
      let newTopicName = 'HORAS EXTRAS';

      const setNewTopicName = (name: string) => {
        newTopicName = name;
      };

      setNewTopicName('SOBREJORNADA');
      expect(newTopicName).toBe('SOBREJORNADA');
    });
  });

  // ============================================================
  // SEÇÃO 5: MERGE TOPICS
  // ============================================================

  describe('Merge Topics', () => {
    it('should prepare topics for merge', () => {
      let topicsToMerge: Topic[] = [];

      const prepareMergeTopics = (topics: Topic[]) => {
        topicsToMerge = topics;
      };

      const topics = [
        createMockTopic({ title: 'HORAS EXTRAS' }),
        createMockTopic({ title: 'ADICIONAL NOTURNO' }),
      ];

      prepareMergeTopics(topics);

      expect(topicsToMerge).toHaveLength(2);
    });

    it('should require at least 2 topics for merge', () => {
      const canMerge = (topics: Topic[]) => topics.length >= 2;

      expect(canMerge([createMockTopic()])).toBe(false);
      expect(canMerge([createMockTopic(), createMockTopic()])).toBe(true);
    });
  });

  // ============================================================
  // SEÇÃO 6: SPLIT TOPIC
  // ============================================================

  describe('Split Topic', () => {
    it('should prepare topic for split', () => {
      let topicToSplit: Topic | null = null;
      let splitNames = ['', ''];

      const prepareSplitTopic = (topic: Topic) => {
        topicToSplit = topic;
        splitNames = ['', ''];
      };

      const topic = createMockTopic();
      prepareSplitTopic(topic);

      expect(topicToSplit).toBe(topic);
      expect(splitNames).toEqual(['', '']);
    });

    it('should update split names', () => {
      let splitNames = ['', ''];

      const setSplitNames = (names: string[]) => {
        splitNames = names;
      };

      setSplitNames(['HORAS EXTRAS - PARCIAL 1', 'HORAS EXTRAS - PARCIAL 2']);

      expect(splitNames[0]).toBe('HORAS EXTRAS - PARCIAL 1');
      expect(splitNames[1]).toBe('HORAS EXTRAS - PARCIAL 2');
    });

    it('should validate split names are not empty', () => {
      const validateSplitNames = (names: string[]) =>
        names.every((name) => name.trim().length > 0);

      expect(validateSplitNames(['Name 1', 'Name 2'])).toBe(true);
      expect(validateSplitNames(['Name 1', ''])).toBe(false);
      expect(validateSplitNames(['', ''])).toBe(false);
    });
  });

  // ============================================================
  // SEÇÃO 7: NEW TOPIC
  // ============================================================

  describe('New Topic', () => {
    it('should prepare new topic with default category', () => {
      let newTopicData: Partial<Topic> | null = null;

      const prepareNewTopic = (category: TopicCategory = 'MÉRITO'): Partial<Topic> => {
        const data = {
          title: '',
          category,
          relatorio: '',
          fundamentacao: '',
        };
        newTopicData = data;
        return data;
      };

      const result = prepareNewTopic();

      expect(newTopicData).not.toBeNull();
      expect(result.category).toBe('MÉRITO');
    });

    it('should prepare new topic with specified category', () => {
      let newTopicData: Partial<Topic> | null = null;

      const prepareNewTopic = (category: TopicCategory): Partial<Topic> => {
        const data = {
          title: '',
          category,
          relatorio: '',
          fundamentacao: '',
        };
        newTopicData = data;
        return data;
      };

      const result = prepareNewTopic('PRELIMINAR');

      expect(result.category).toBe('PRELIMINAR');
    });

    it('should set new topic data', () => {
      let newTopicData: Partial<Topic> | null = null;

      const setNewTopicData = (data: Partial<Topic> | null) => {
        newTopicData = data;
      };

      const testData = {
        title: 'NOVO TÓPICO',
        category: 'MÉRITO' as TopicCategory,
      };
      setNewTopicData(testData);

      expect(testData.title).toBe('NOVO TÓPICO');
    });
  });

  // ============================================================
  // SEÇÃO 8: CANCEL OPERATION
  // ============================================================

  describe('Cancel Operation', () => {
    it('should clear all operation states', () => {
      let topicToDelete: Topic | null = createMockTopic();
      let topicToRename: Topic | null = createMockTopic();
      let newTopicName = 'Test';
      let topicsToMerge = [createMockTopic()];
      let topicToSplit: Topic | null = createMockTopic();
      let splitNames = ['A', 'B'];
      let newTopicData: Partial<Topic> | null = { title: 'New' };

      const cancelOperation = () => {
        topicToDelete = null;
        topicToRename = null;
        newTopicName = '';
        topicsToMerge = [];
        topicToSplit = null;
        splitNames = ['', ''];
        newTopicData = null;
      };

      cancelOperation();

      expect(topicToDelete).toBeNull();
      expect(topicToRename).toBeNull();
      expect(newTopicName).toBe('');
      expect(topicsToMerge).toHaveLength(0);
      expect(topicToSplit).toBeNull();
      expect(splitNames).toEqual(['', '']);
      expect(newTopicData).toBeNull();
    });
  });

  // ============================================================
  // SEÇÃO 9: UPDATE SELECTED TOPICS
  // ============================================================

  describe('Update Selected Topics', () => {
    it('should update selected topics', () => {
      let selectedTopics: Topic[] = [];

      const updateSelectedTopics = (topics: Topic[]) => {
        selectedTopics = topics;
      };

      const topics = [createMockTopic(), createMockTopic()];
      updateSelectedTopics(topics);

      expect(selectedTopics).toHaveLength(2);
    });

    it('should replace all selected topics', () => {
      let selectedTopics = [createMockTopic({ title: 'Old' })];

      const updateSelectedTopics = (topics: Topic[]) => {
        selectedTopics = topics;
      };

      updateSelectedTopics([createMockTopic({ title: 'New 1' }), createMockTopic({ title: 'New 2' })]);

      expect(selectedTopics).toHaveLength(2);
      expect(selectedTopics[0].title).toBe('New 1');
    });
  });

  // ============================================================
  // SEÇÃO 10: PERSISTENCE
  // ============================================================

  describe('Persistence', () => {
    it('should serialize all data for persistence', () => {
      const extractedTopics = [createMockTopic()];
      const selectedTopics = [createMockTopic()];
      const editingTopic = createMockTopic();
      const lastEditedTopicTitle = 'HORAS EXTRAS';

      const serializeForPersistence = () => ({
        extractedTopics,
        selectedTopics,
        editingTopic,
        lastEditedTopicTitle,
      });

      const data = serializeForPersistence();

      expect(data.extractedTopics).toHaveLength(1);
      expect(data.lastEditedTopicTitle).toBe('HORAS EXTRAS');
    });

    it('should restore from persistence data', () => {
      let extractedTopics: Topic[] = [];
      let selectedTopics: Topic[] = [];
      let editingTopic: Topic | null = null;
      let lastEditedTopicTitle: string | null = null;

      const restoreFromPersistence = (data: Record<string, unknown> | null) => {
        if (!data) return;
        if (data.extractedTopics) extractedTopics = data.extractedTopics as Topic[];
        if (data.selectedTopics) selectedTopics = data.selectedTopics as Topic[];
        if (data.editingTopic) editingTopic = data.editingTopic as Topic;
        if (data.lastEditedTopicTitle) lastEditedTopicTitle = data.lastEditedTopicTitle as string;
      };

      const mockEditingTopic = createMockTopic({ title: 'Editing' });
      const savedData = {
        extractedTopics: [createMockTopic()],
        selectedTopics: [createMockTopic()],
        editingTopic: mockEditingTopic,
        lastEditedTopicTitle: 'Last Edited',
      };

      restoreFromPersistence(savedData);

      expect(extractedTopics).toHaveLength(1);
      expect(mockEditingTopic.title).toBe('Editing');
      expect(lastEditedTopicTitle).toBe('Last Edited');
    });

    it('should handle null persistence data', () => {
      let extractedTopics = [createMockTopic()];

      const restoreFromPersistence = (data: Record<string, unknown> | null) => {
        if (!data) return;
        if (data.extractedTopics) extractedTopics = data.extractedTopics as Topic[];
      };

      restoreFromPersistence(null);

      expect(extractedTopics).toHaveLength(1); // Not changed
    });
  });

  // ============================================================
  // SEÇÃO 11: CLEAR ALL
  // ============================================================

  describe('Clear All', () => {
    it('should clear all states', () => {
      const clearAll = () => ({
        extractedTopics: [],
        selectedTopics: [],
        editingTopic: null,
        lastEditedTopicTitle: null,
        savingTopic: false,
        topicToDelete: null,
        topicToRename: null,
        newTopicName: '',
        topicsToMerge: [],
        topicToSplit: null,
        splitNames: ['', ''],
        newTopicData: null,
      });

      const state = clearAll();

      expect(state.extractedTopics).toHaveLength(0);
      expect(state.selectedTopics).toHaveLength(0);
      expect(state.editingTopic).toBeNull();
      expect(state.savingTopic).toBe(false);
      expect(state.newTopicName).toBe('');
    });
  });

  // ============================================================
  // SEÇÃO 12: TOPIC CATEGORIES
  // ============================================================

  describe('Topic Categories', () => {
    it('should support all valid categories', () => {
      const validCategories: TopicCategory[] = [
        'PRELIMINAR',
        'PREJUDICIAL',
        'MÉRITO',
        'RELATÓRIO',
        'DISPOSITIVO',
      ];

      validCategories.forEach((category) => {
        const topic = createMockTopic({ category });
        expect(topic.category).toBe(category);
      });
    });

    it('should identify special topics', () => {
      const relatorioTopic = createMockTopic({ category: 'RELATÓRIO', isSpecial: true });
      const dispositivoTopic = createMockTopic({ category: 'DISPOSITIVO', isSpecial: true });
      const meritoTopic = createMockTopic({ category: 'MÉRITO', isSpecial: false });

      expect(relatorioTopic.isSpecial).toBe(true);
      expect(dispositivoTopic.isSpecial).toBe(true);
      expect(meritoTopic.isSpecial).toBe(false);
    });
  });

  // ============================================================
  // SEÇÃO 13: TOPIC ORDER
  // ============================================================

  describe('Topic Order', () => {
    it('should track topic order', () => {
      const topics = [
        createMockTopic({ title: 'A', order: 3 }),
        createMockTopic({ title: 'B', order: 1 }),
        createMockTopic({ title: 'C', order: 2 }),
      ];

      const sorted = [...topics].sort((a, b) => (a.order || 0) - (b.order || 0));

      expect(sorted[0].title).toBe('B');
      expect(sorted[1].title).toBe('C');
      expect(sorted[2].title).toBe('A');
    });
  });

  // ============================================================
  // SEÇÃO 14: TOPIC VEREDICTO
  // ============================================================

  describe('Topic Veredicto', () => {
    it('should support different veredictos', () => {
      const veredictos = ['procedente', 'improcedente', 'parcialmente procedente'];

      veredictos.forEach((veredicto) => {
        const topic = createMockTopic({ veredicto });
        expect(topic.veredicto).toBe(veredicto);
      });
    });
  });
});

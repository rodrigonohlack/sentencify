/**
 * 🎣 CUSTOM HOOK: useTopicManager - Gerenciador de Tópicos
 * Versão simplificada extraída do App.jsx para testes
 *
 * @version 1.35.76 - Migrado para TypeScript
 */
import { useState, useCallback } from 'react';
import type { Topic, TopicCategory } from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

/** Escopo de contexto para tópico */
export type TopicContextScope = 'current' | 'all' | 'none';

/** Dados para novo tópico */
export interface NewTopicData {
  title: string;
  category: TopicCategory | string;
  relatorio: string;
  fundamentacao: string;
}

/** Dados serializados para persistência */
export interface TopicPersistenceData {
  extractedTopics?: Topic[];
  selectedTopics?: Topic[];
  editingTopic?: Topic | null;
  lastEditedTopicTitle?: string | null;
}

/** Retorno do hook useTopicManager */
export interface UseTopicManagerReturn {
  // Estados Tópicos (2)
  extractedTopics: Topic[];
  selectedTopics: Topic[];

  // Estados Edição (3)
  editingTopic: Topic | null;
  lastEditedTopicTitle: string | null;
  topicContextScope: TopicContextScope;

  // Estados UI (1)
  savingTopic: boolean;

  // Estados Manipulação (7)
  topicToDelete: Topic | null;
  topicToRename: Topic | null;
  newTopicName: string;
  topicsToMerge: Topic[];
  topicToSplit: Topic | null;
  splitNames: [string, string];
  newTopicData: NewTopicData | null;

  // Setters Tópicos (2)
  setExtractedTopics: React.Dispatch<React.SetStateAction<Topic[]>>;
  setSelectedTopics: React.Dispatch<React.SetStateAction<Topic[]>>;

  // Setters Edição (3)
  setEditingTopic: React.Dispatch<React.SetStateAction<Topic | null>>;
  setLastEditedTopicTitle: React.Dispatch<React.SetStateAction<string | null>>;
  setTopicContextScope: React.Dispatch<React.SetStateAction<TopicContextScope>>;

  // Setters UI (1)
  setSavingTopic: React.Dispatch<React.SetStateAction<boolean>>;

  // Setters Manipulação (7)
  setTopicToDelete: React.Dispatch<React.SetStateAction<Topic | null>>;
  setTopicToRename: React.Dispatch<React.SetStateAction<Topic | null>>;
  setNewTopicName: React.Dispatch<React.SetStateAction<string>>;
  setTopicsToMerge: React.Dispatch<React.SetStateAction<Topic[]>>;
  setTopicToSplit: React.Dispatch<React.SetStateAction<Topic | null>>;
  setSplitNames: React.Dispatch<React.SetStateAction<[string, string]>>;
  setNewTopicData: React.Dispatch<React.SetStateAction<NewTopicData | null>>;

  // Handlers de UI/Preparação (5)
  prepareDeleteTopic: (topic: Topic) => void;
  prepareRenameTopic: (topic: Topic) => void;
  prepareMergeTopics: (topics: Topic[]) => void;
  prepareSplitTopic: (topic: Topic) => void;
  prepareNewTopic: (category?: TopicCategory | string) => void;

  // Handlers de Confirmação (6)
  confirmDeleteTopic: () => void;
  confirmRenameTopic: () => void;
  confirmMergeTopics: (mergedTitle: string) => void;
  confirmSplitTopic: () => void;
  confirmNewTopic: () => void;
  cancelOperation: () => void;

  // Handlers de Atualização (3)
  updateSelectedTopics: (topics: Topic[]) => void;
  reorderTopics: (fromIndex: number, toIndex: number) => void;
  updateTopicContent: (title: string, field: keyof Topic, value: string) => void;

  // Métodos de Persistência (3)
  serializeForPersistence: () => TopicPersistenceData;
  restoreFromPersistence: (data: TopicPersistenceData | null) => void;
  clearAll: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

const useTopicManager = (): UseTopicManagerReturn => {
  // 📊 ESTADOS (12)

  // Tópicos Principais (2)
  const [extractedTopics, setExtractedTopics] = useState<Topic[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<Topic[]>([]);

  // Estado de Edição (3)
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [lastEditedTopicTitle, setLastEditedTopicTitle] = useState<string | null>(null);
  const [topicContextScope, setTopicContextScope] = useState<TopicContextScope>('current');

  // Estados de UI/Progresso (1)
  const [savingTopic, setSavingTopic] = useState<boolean>(false);

  // Estados de Manipulação de Tópicos (7)
  // Deleção
  const [topicToDelete, setTopicToDelete] = useState<Topic | null>(null);

  // Renomeação
  const [topicToRename, setTopicToRename] = useState<Topic | null>(null);
  const [newTopicName, setNewTopicName] = useState<string>('');

  // Merge (mesclagem)
  const [topicsToMerge, setTopicsToMerge] = useState<Topic[]>([]);

  // Split (divisão)
  const [topicToSplit, setTopicToSplit] = useState<Topic | null>(null);
  const [splitNames, setSplitNames] = useState<[string, string]>(['', '']);

  // Novo tópico
  const [newTopicData, setNewTopicData] = useState<NewTopicData | null>(null);

  // 🛠️ HANDLERS DE UI E PREPARAÇÃO (5)

  const prepareDeleteTopic = useCallback((topic: Topic): void => {
    setTopicToDelete(topic);
  }, []);

  const prepareRenameTopic = useCallback((topic: Topic): void => {
    setTopicToRename(topic);
    setNewTopicName(topic.title);
  }, []);

  const prepareMergeTopics = useCallback((topics: Topic[]): void => {
    setTopicsToMerge(topics);
  }, []);

  const prepareSplitTopic = useCallback((topic: Topic): void => {
    setTopicToSplit(topic);
    setSplitNames(['', '']);
  }, []);

  const prepareNewTopic = useCallback((category: TopicCategory | string = 'MÉRITO'): void => {
    setNewTopicData({
      title: '',
      category: category,
      relatorio: '',
      fundamentacao: ''
    });
  }, []);

  // ✅ HANDLERS DE CONFIRMAÇÃO E OPERAÇÕES (3)

  const confirmDeleteTopic = useCallback((): void => {
    if (!topicToDelete) return;

    setSelectedTopics((prev) => prev.filter((t) => t.title !== topicToDelete.title));
    setTopicToDelete(null);
  }, [topicToDelete]);

  const confirmRenameTopic = useCallback((): void => {
    if (!topicToRename || !newTopicName.trim()) return;

    setSelectedTopics((prev) =>
      prev.map((t) => (t.title === topicToRename.title ? { ...t, title: newTopicName.trim() } : t))
    );
    setTopicToRename(null);
    setNewTopicName('');
  }, [topicToRename, newTopicName]);

  const confirmMergeTopics = useCallback(
    (mergedTitle: string): void => {
      if (topicsToMerge.length < 2 || !mergedTitle?.trim()) return;

      const titlesToMerge = topicsToMerge.map((t) => t.title);
      const mergedContent = topicsToMerge
        .map((t) => `[${t.title}]\n${t.relatorio || ''}\n${t.fundamentacao || ''}`)
        .join('\n\n---\n\n');

      setSelectedTopics((prev) => {
        // Remove os tópicos a serem mesclados
        const filtered = prev.filter((t) => !titlesToMerge.includes(t.title));
        // Adiciona o tópico mesclado
        return [
          ...filtered,
          {
            title: mergedTitle.trim(),
            category: topicsToMerge[0].category,
            relatorio: mergedContent,
            fundamentacao: ''
          }
        ];
      });

      setTopicsToMerge([]);
    },
    [topicsToMerge]
  );

  const confirmSplitTopic = useCallback((): void => {
    if (!topicToSplit || !splitNames[0]?.trim() || !splitNames[1]?.trim()) return;

    setSelectedTopics((prev) => {
      // Remove o tópico original
      const filtered = prev.filter((t) => t.title !== topicToSplit.title);
      // Adiciona os dois novos tópicos
      return [
        ...filtered,
        {
          title: splitNames[0].trim(),
          category: topicToSplit.category,
          relatorio: '',
          fundamentacao: ''
        },
        {
          title: splitNames[1].trim(),
          category: topicToSplit.category,
          relatorio: '',
          fundamentacao: ''
        }
      ];
    });

    setTopicToSplit(null);
    setSplitNames(['', '']);
  }, [topicToSplit, splitNames]);

  const confirmNewTopic = useCallback((): void => {
    if (!newTopicData || !newTopicData.title?.trim()) return;

    setSelectedTopics((prev) => [
      ...prev,
      {
        ...newTopicData,
        title: newTopicData.title.trim()
      } as Topic
    ]);

    setNewTopicData(null);
  }, [newTopicData]);

  const cancelOperation = useCallback((): void => {
    setTopicToDelete(null);
    setTopicToRename(null);
    setNewTopicName('');
    setTopicsToMerge([]);
    setTopicToSplit(null);
    setSplitNames(['', '']);
    setNewTopicData(null);
  }, []);

  const updateSelectedTopics = useCallback((topics: Topic[]): void => {
    setSelectedTopics(topics);
  }, []);

  // Reordenar tópicos
  const reorderTopics = useCallback((fromIndex: number, toIndex: number): void => {
    setSelectedTopics((prev) => {
      const result = [...prev];
      const [removed] = result.splice(fromIndex, 1);
      result.splice(toIndex, 0, removed);
      return result;
    });
  }, []);

  // Atualizar conteúdo de um tópico
  const updateTopicContent = useCallback(
    (title: string, field: keyof Topic, value: string): void => {
      setSelectedTopics((prev) =>
        prev.map((t) => (t.title === title ? { ...t, [field]: value } : t))
      );
    },
    []
  );

  // 💾 MÉTODOS DE PERSISTÊNCIA (3)

  const serializeForPersistence = useCallback((): TopicPersistenceData => {
    return {
      extractedTopics,
      selectedTopics,
      editingTopic,
      lastEditedTopicTitle
    };
  }, [extractedTopics, selectedTopics, editingTopic, lastEditedTopicTitle]);

  const restoreFromPersistence = useCallback((data: TopicPersistenceData | null): void => {
    if (!data) return;

    if (data.extractedTopics) setExtractedTopics(data.extractedTopics);
    if (data.selectedTopics) setSelectedTopics(data.selectedTopics);
    if (data.editingTopic) setEditingTopic(data.editingTopic);
    if (data.lastEditedTopicTitle) setLastEditedTopicTitle(data.lastEditedTopicTitle);
  }, []);

  const clearAll = useCallback((): void => {
    setExtractedTopics([]);
    setSelectedTopics([]);
    setEditingTopic(null);
    setLastEditedTopicTitle(null);
    setSavingTopic(false);
    setTopicToDelete(null);
    setTopicToRename(null);
    setNewTopicName('');
    setTopicsToMerge([]);
    setTopicToSplit(null);
    setSplitNames(['', '']);
    setNewTopicData(null);
  }, []);

  // 🎁 RETORNO DO HOOK
  return {
    // Estados Tópicos (2)
    extractedTopics,
    selectedTopics,

    // Estados Edição (3)
    editingTopic,
    lastEditedTopicTitle,
    topicContextScope,

    // Estados UI (1)
    savingTopic,

    // Estados Manipulação (7)
    topicToDelete,
    topicToRename,
    newTopicName,
    topicsToMerge,
    topicToSplit,
    splitNames,
    newTopicData,

    // Setters Tópicos (2)
    setExtractedTopics,
    setSelectedTopics,

    // Setters Edição (3)
    setEditingTopic,
    setLastEditedTopicTitle,
    setTopicContextScope,

    // Setters UI (1)
    setSavingTopic,

    // Setters Manipulação (7)
    setTopicToDelete,
    setTopicToRename,
    setNewTopicName,
    setTopicsToMerge,
    setTopicToSplit,
    setSplitNames,
    setNewTopicData,

    // Handlers de UI/Preparação (5)
    prepareDeleteTopic,
    prepareRenameTopic,
    prepareMergeTopics,
    prepareSplitTopic,
    prepareNewTopic,

    // Handlers de Confirmação (6)
    confirmDeleteTopic,
    confirmRenameTopic,
    confirmMergeTopics,
    confirmSplitTopic,
    confirmNewTopic,
    cancelOperation,

    // Handlers de Atualização (3)
    updateSelectedTopics,
    reorderTopics,
    updateTopicContent,

    // Métodos de Persistência (3)
    serializeForPersistence,
    restoreFromPersistence,
    clearAll
  };
};

export default useTopicManager;

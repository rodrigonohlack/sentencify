/**
 * @file useTopicManager.ts
 * @description Hook para gerenciamento de tópicos da sentença
 * @version 1.38.23
 *
 * v1.38.23: Migração completa para seletores diretos do Zustand
 * v1.36.77: Extraído do App.tsx
 * v1.36.64: Estado migrado para Zustand
 */

import { useTopicsStore } from '../stores/useTopicsStore';

/**
 * Hook para gerenciamento de tópicos
 * Usa seletores diretos do store Zustand
 *
 * @returns Estados, setters, handlers e métodos de persistência para tópicos
 */
const useTopicManager = () => {
  // Estados
  const extractedTopics = useTopicsStore((s) => s.extractedTopics);
  const selectedTopics = useTopicsStore((s) => s.selectedTopics);
  const editingTopic = useTopicsStore((s) => s.editingTopic);
  const lastEditedTopicTitle = useTopicsStore((s) => s.lastEditedTopicTitle);
  const topicContextScope = useTopicsStore((s) => s.topicContextScope);
  const savingTopic = useTopicsStore((s) => s.savingTopic);
  const topicToDelete = useTopicsStore((s) => s.topicToDelete);
  const topicToRename = useTopicsStore((s) => s.topicToRename);
  const newTopicName = useTopicsStore((s) => s.newTopicName);
  const topicsToMerge = useTopicsStore((s) => s.topicsToMerge);
  const topicToSplit = useTopicsStore((s) => s.topicToSplit);
  const splitNames = useTopicsStore((s) => s.splitNames);
  const newTopicData = useTopicsStore((s) => s.newTopicData);

  // Setters
  const setExtractedTopics = useTopicsStore((s) => s.setExtractedTopics);
  const setSelectedTopics = useTopicsStore((s) => s.setSelectedTopics);
  const setEditingTopic = useTopicsStore((s) => s.setEditingTopic);
  const setLastEditedTopicTitle = useTopicsStore((s) => s.setLastEditedTopicTitle);
  const setTopicContextScope = useTopicsStore((s) => s.setTopicContextScope);
  const setSavingTopic = useTopicsStore((s) => s.setSavingTopic);
  const setTopicToDelete = useTopicsStore((s) => s.setTopicToDelete);
  const setTopicToRename = useTopicsStore((s) => s.setTopicToRename);
  const setNewTopicName = useTopicsStore((s) => s.setNewTopicName);
  const setTopicsToMerge = useTopicsStore((s) => s.setTopicsToMerge);
  const setTopicToSplit = useTopicsStore((s) => s.setTopicToSplit);
  const setSplitNames = useTopicsStore((s) => s.setSplitNames);
  const setNewTopicData = useTopicsStore((s) => s.setNewTopicData);

  // Handlers
  const prepareDeleteTopic = useTopicsStore((s) => s.prepareDeleteTopic);
  const prepareRenameTopic = useTopicsStore((s) => s.prepareRenameTopic);
  const prepareMergeTopics = useTopicsStore((s) => s.prepareMergeTopics);
  const prepareSplitTopic = useTopicsStore((s) => s.prepareSplitTopic);
  const prepareNewTopic = useTopicsStore((s) => s.prepareNewTopic);
  const confirmDeleteTopic = useTopicsStore((s) => s.confirmDeleteTopic);
  const cancelOperation = useTopicsStore((s) => s.cancelOperation);
  const updateSelectedTopics = useTopicsStore((s) => s.updateSelectedTopics);

  // Persistência
  const serializeForPersistence = useTopicsStore((s) => s.serializeForPersistence);
  const restoreFromPersistence = useTopicsStore((s) => s.restoreFromPersistence);
  const clearAll = useTopicsStore((s) => s.clearAll);

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

    // Handlers de Confirmação (3)
    confirmDeleteTopic,
    cancelOperation,
    updateSelectedTopics,

    // Métodos de Persistência (3)
    serializeForPersistence,
    restoreFromPersistence,
    clearAll
  };
};

/**
 * Tipo de retorno do useTopicManager
 */
export type UseTopicManagerReturn = ReturnType<typeof useTopicManager>;

export { useTopicManager };

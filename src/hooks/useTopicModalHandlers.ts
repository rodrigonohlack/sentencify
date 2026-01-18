/**
 * @file useTopicModalHandlers.ts
 * @description Handlers simples para modais de tópicos
 * @version 1.37.99
 *
 * Este hook fornece callbacks simples para modais de tópicos que
 * funcionam apenas com Zustand, sem dependências externas como
 * IA ou geração de relatórios.
 *
 * Para operações complexas (renomear com regeneração, etc.),
 * use useTopicOperations que recebe as dependências necessárias.
 *
 * @usedBy ModalRoot, TopicModals
 */

import { useCallback } from 'react';
import { useTopicsStore } from '../stores/useTopicsStore';
import { useUIStore } from '../stores/useUIStore';
import type { Topic } from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

export interface UseTopicModalHandlersReturn {
  // Handlers de exclusão
  confirmDeleteTopic: () => void;

  // Handlers de cancelamento
  cancelRenameTopic: () => void;
  cancelMergeTopics: () => void;
  cancelSplitTopic: () => void;
  cancelNewTopic: () => void;
  cancelDeleteTopic: () => void;

  // Handler genérico de cancelamento
  cancelAllTopicOperations: () => void;

  // Handlers de preparação (abre modais)
  openDeleteTopicModal: (topic: Topic) => void;
  openRenameTopicModal: (topic: Topic) => void;
  openMergeTopicsModal: (topics: Topic[]) => void;
  openSplitTopicModal: (topic: Topic) => void;
  openNewTopicModal: (category?: string) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook com handlers simples para modais de tópicos
 *
 * @description Fornece callbacks que funcionam apenas com Zustand:
 * - Confirmar/cancelar exclusão
 * - Cancelar operações de rename/merge/split/new
 * - Abrir modais
 *
 * Para renomear/unir/separar/criar tópicos com regeneração de relatório,
 * use useTopicOperations do App.tsx que tem acesso às dependências de IA.
 *
 * @returns Handlers para operações simples de tópicos
 */
export function useTopicModalHandlers(): UseTopicModalHandlersReturn {
  // ═══════════════════════════════════════════════════════════════════════
  // ESTADO DOS STORES
  // ═══════════════════════════════════════════════════════════════════════

  const closeModal = useUIStore((s) => s.closeModal);
  const openModal = useUIStore((s) => s.openModal);

  const topicToDelete = useTopicsStore((s) => s.topicToDelete);
  const setTopicToDelete = useTopicsStore((s) => s.setTopicToDelete);
  const setTopicToRename = useTopicsStore((s) => s.setTopicToRename);
  const setNewTopicName = useTopicsStore((s) => s.setNewTopicName);
  const setTopicsToMerge = useTopicsStore((s) => s.setTopicsToMerge);
  const setTopicToSplit = useTopicsStore((s) => s.setTopicToSplit);
  const setSplitNames = useTopicsStore((s) => s.setSplitNames);
  const setNewTopicData = useTopicsStore((s) => s.setNewTopicData);
  const extractedTopics = useTopicsStore((s) => s.extractedTopics);
  const setExtractedTopics = useTopicsStore((s) => s.setExtractedTopics);
  const selectedTopics = useTopicsStore((s) => s.selectedTopics);
  const setSelectedTopics = useTopicsStore((s) => s.setSelectedTopics);
  const topicsToMerge = useTopicsStore((s) => s.topicsToMerge);

  // ═══════════════════════════════════════════════════════════════════════
  // HANDLER: CONFIRMAR EXCLUSÃO
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Confirma exclusão do tópico selecionado
   * Remove o tópico de TODAS as listas: extractedTopics, selectedTopics, topicsToMerge
   * v1.37.99: Fix bug - antes só removia de selectedTopics
   */
  const confirmDeleteTopic = useCallback(() => {
    if (!topicToDelete) return;

    // Remove o tópico de TODAS as listas
    setExtractedTopics(
      extractedTopics.filter((t) => t.title !== topicToDelete.title)
    );
    setSelectedTopics(
      selectedTopics.filter((t) => t.title !== topicToDelete.title)
    );
    setTopicsToMerge(
      topicsToMerge.filter((t) => t.title !== topicToDelete.title)
    );

    // Limpa estado e fecha modal
    setTopicToDelete(null);
    closeModal('deleteTopic');
  }, [
    topicToDelete,
    extractedTopics, setExtractedTopics,
    selectedTopics, setSelectedTopics,
    topicsToMerge, setTopicsToMerge,
    setTopicToDelete, closeModal
  ]);

  // ═══════════════════════════════════════════════════════════════════════
  // HANDLERS: CANCELAMENTO
  // ═══════════════════════════════════════════════════════════════════════

  const cancelDeleteTopic = useCallback(() => {
    setTopicToDelete(null);
    closeModal('deleteTopic');
  }, [setTopicToDelete, closeModal]);

  const cancelRenameTopic = useCallback(() => {
    setTopicToRename(null);
    setNewTopicName('');
    closeModal('rename');
  }, [setTopicToRename, setNewTopicName, closeModal]);

  const cancelMergeTopics = useCallback(() => {
    setTopicsToMerge([]);
    closeModal('merge');
  }, [setTopicsToMerge, closeModal]);

  const cancelSplitTopic = useCallback(() => {
    setTopicToSplit(null);
    setSplitNames(['', '']);
    closeModal('split');
  }, [setTopicToSplit, setSplitNames, closeModal]);

  const cancelNewTopic = useCallback(() => {
    setNewTopicData(null);
    closeModal('newTopic');
  }, [setNewTopicData, closeModal]);

  const cancelAllTopicOperations = useCallback(() => {
    cancelDeleteTopic();
    cancelRenameTopic();
    cancelMergeTopics();
    cancelSplitTopic();
    cancelNewTopic();
  }, [cancelDeleteTopic, cancelRenameTopic, cancelMergeTopics, cancelSplitTopic, cancelNewTopic]);

  // ═══════════════════════════════════════════════════════════════════════
  // HANDLERS: ABRIR MODAIS
  // ═══════════════════════════════════════════════════════════════════════

  const openDeleteTopicModal = useCallback((topic: Topic) => {
    setTopicToDelete(topic);
    openModal('deleteTopic');
  }, [setTopicToDelete, openModal]);

  const openRenameTopicModal = useCallback((topic: Topic) => {
    setTopicToRename(topic);
    setNewTopicName(topic.title);
    openModal('rename');
  }, [setTopicToRename, setNewTopicName, openModal]);

  const openMergeTopicsModal = useCallback((topics: Topic[]) => {
    setTopicsToMerge(topics);
    openModal('merge');
  }, [setTopicsToMerge, openModal]);

  const openSplitTopicModal = useCallback((topic: Topic) => {
    setTopicToSplit(topic);
    setSplitNames(['', '']);
    openModal('split');
  }, [setTopicToSplit, setSplitNames, openModal]);

  const openNewTopicModal = useCallback((category = 'MÉRITO') => {
    setNewTopicData({ title: '', category: category as 'MÉRITO' | 'PRELIMINAR', relatorio: '' });
    openModal('newTopic');
  }, [setNewTopicData, openModal]);

  // ═══════════════════════════════════════════════════════════════════════
  // RETORNO
  // ═══════════════════════════════════════════════════════════════════════

  return {
    // Confirmação
    confirmDeleteTopic,

    // Cancelamento
    cancelDeleteTopic,
    cancelRenameTopic,
    cancelMergeTopics,
    cancelSplitTopic,
    cancelNewTopic,
    cancelAllTopicOperations,

    // Abrir modais
    openDeleteTopicModal,
    openRenameTopicModal,
    openMergeTopicsModal,
    openSplitTopicModal,
    openNewTopicModal,
  };
}

export default useTopicModalHandlers;

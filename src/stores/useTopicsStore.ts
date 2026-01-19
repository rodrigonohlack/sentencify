/**
 * @file useTopicsStore.ts
 * @description Zustand store para gerenciamento de tópicos da sentença
 * @version 1.36.64
 * @replaces useTopicManager (parcialmente - estado migrado, lógica de negócio permanece no hook)
 *
 * FASE 2 Wave 3 - Zustand Migration:
 * - 13 useState migrados para store global
 * - Handlers de preparação/confirmação como actions
 * - Métodos de persistência (serialize/restore/clear)
 * - DevTools habilitado para debug
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { Topic, TopicCategory, ContextScope } from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════════

interface TopicsStoreState {
  // ═══════════════════════════════════════════════════════════════════════════
  // ESTADOS DE TÓPICOS (2)
  // ═══════════════════════════════════════════════════════════════════════════

  /** Lista de tópicos extraídos da petição/contestação */
  extractedTopics: Topic[];

  /** Lista de tópicos selecionados para a sentença */
  selectedTopics: Topic[];

  // ═══════════════════════════════════════════════════════════════════════════
  // ESTADOS DE EDIÇÃO (3)
  // ═══════════════════════════════════════════════════════════════════════════

  /** Tópico atualmente sendo editado no editor */
  editingTopic: Topic | null;

  /** Título do último tópico editado (para scroll automático) */
  lastEditedTopicTitle: string | null;

  /** Escopo do contexto do tópico (current | selected | all) - v1.38.12 */
  topicContextScope: ContextScope;

  // ═══════════════════════════════════════════════════════════════════════════
  // ESTADOS DE UI/PROGRESSO (1)
  // ═══════════════════════════════════════════════════════════════════════════

  /** Indica se está salvando um tópico */
  savingTopic: boolean;

  // ═══════════════════════════════════════════════════════════════════════════
  // ESTADOS DE MANIPULAÇÃO DE TÓPICOS (7)
  // ═══════════════════════════════════════════════════════════════════════════

  /** Tópico marcado para exclusão (modal de confirmação) */
  topicToDelete: Topic | null;

  /** Tópico marcado para renomeação */
  topicToRename: Topic | null;

  /** Novo nome para o tópico sendo renomeado */
  newTopicName: string;

  /** Tópicos selecionados para merge */
  topicsToMerge: Topic[];

  /** Tópico marcado para split */
  topicToSplit: Topic | null;

  /** Nomes para os tópicos resultantes do split */
  splitNames: string[];

  /** Dados do novo tópico sendo criado */
  newTopicData: Partial<Topic> | null;

  // ═══════════════════════════════════════════════════════════════════════════
  // ESTADO DE CURADORIA (v1.37.73: ModalRoot)
  // ═══════════════════════════════════════════════════════════════════════════

  /** Indica se modal de curadoria está aberto */
  showTopicCurationModal: boolean;

  /** Dados pendentes da curadoria */
  pendingCurationData: { topics: Topic[] } | null;

  // ═══════════════════════════════════════════════════════════════════════════
  // SETTERS DE TÓPICOS (2)
  // ═══════════════════════════════════════════════════════════════════════════

  setExtractedTopics: (topics: Topic[] | ((prev: Topic[]) => Topic[])) => void;
  setSelectedTopics: (topics: Topic[] | ((prev: Topic[]) => Topic[])) => void;

  // ═══════════════════════════════════════════════════════════════════════════
  // SETTERS DE EDIÇÃO (3)
  // ═══════════════════════════════════════════════════════════════════════════

  setEditingTopic: (topic: Topic | null | ((prev: Topic | null) => Topic | null)) => void;
  setLastEditedTopicTitle: (title: string | null) => void;
  setTopicContextScope: (scope: ContextScope) => void;

  // ═══════════════════════════════════════════════════════════════════════════
  // SETTERS DE UI (1)
  // ═══════════════════════════════════════════════════════════════════════════

  setSavingTopic: (saving: boolean) => void;

  // ═══════════════════════════════════════════════════════════════════════════
  // SETTERS DE MANIPULAÇÃO (7)
  // ═══════════════════════════════════════════════════════════════════════════

  setTopicToDelete: (topic: Topic | null) => void;
  setTopicToRename: (topic: Topic | null) => void;
  setNewTopicName: (name: string) => void;
  setTopicsToMerge: (topics: Topic[]) => void;
  setTopicToSplit: (topic: Topic | null) => void;
  setSplitNames: (names: string[]) => void;
  setNewTopicData: (data: Partial<Topic> | null | ((prev: Partial<Topic> | null) => Partial<Topic> | null)) => void;

  // ═══════════════════════════════════════════════════════════════════════════
  // SETTERS DE CURADORIA (v1.37.73: ModalRoot) (2)
  // ═══════════════════════════════════════════════════════════════════════════

  setShowTopicCurationModal: (show: boolean) => void;
  setPendingCurationData: (data: { topics: Topic[] } | null) => void;

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS DE PREPARAÇÃO (5)
  // ═══════════════════════════════════════════════════════════════════════════

  /** Prepara modal de exclusão de tópico */
  prepareDeleteTopic: (topic: Topic) => void;

  /** Prepara modal de renomeação de tópico */
  prepareRenameTopic: (topic: Topic) => void;

  /** Prepara modal de merge de tópicos */
  prepareMergeTopics: (topics: Topic[]) => void;

  /** Prepara modal de split de tópico */
  prepareSplitTopic: (topic: Topic) => void;

  /** Prepara modal de novo tópico */
  prepareNewTopic: (category?: TopicCategory) => void;

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS DE CONFIRMAÇÃO (3)
  // ═══════════════════════════════════════════════════════════════════════════

  /** Confirma exclusão do tópico */
  confirmDeleteTopic: () => void;

  /** Cancela operação atual (fecha modais de manipulação) */
  cancelOperation: () => void;

  /** Atualiza lista de tópicos selecionados */
  updateSelectedTopics: (topics: Topic[]) => void;

  // ═══════════════════════════════════════════════════════════════════════════
  // MÉTODOS DE PERSISTÊNCIA (3)
  // ═══════════════════════════════════════════════════════════════════════════

  /** Serializa estado para persistência em localStorage */
  serializeForPersistence: () => {
    extractedTopics: Topic[];
    selectedTopics: Topic[];
    editingTopic: Topic | null;
    lastEditedTopicTitle: string | null;
  };

  /** Restaura estado de dados persistidos */
  restoreFromPersistence: (data: Record<string, unknown> | null) => void;

  /** Limpa todo o estado (usado em Limpar Projeto) */
  clearAll: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STORE
// ═══════════════════════════════════════════════════════════════════════════════

export const useTopicsStore = create<TopicsStoreState>()(
  devtools(
    immer((set, get) => ({
      // ═══════════════════════════════════════════════════════════════════════
      // ESTADO INICIAL
      // ═══════════════════════════════════════════════════════════════════════

      // Tópicos (2)
      extractedTopics: [],
      selectedTopics: [],

      // Edição (3)
      editingTopic: null,
      lastEditedTopicTitle: null,
      topicContextScope: 'current',

      // UI (1)
      savingTopic: false,

      // Manipulação (7)
      topicToDelete: null,
      topicToRename: null,
      newTopicName: '',
      topicsToMerge: [],
      topicToSplit: null,
      splitNames: ['', ''],
      newTopicData: null,

      // Curadoria (v1.37.73: ModalRoot) (2)
      showTopicCurationModal: false,
      pendingCurationData: null,

      // ═══════════════════════════════════════════════════════════════════════
      // SETTERS DE TÓPICOS
      // ═══════════════════════════════════════════════════════════════════════

      setExtractedTopics: (topicsOrUpdater) =>
        set((state) => {
          if (typeof topicsOrUpdater === 'function') {
            state.extractedTopics = topicsOrUpdater(state.extractedTopics);
          } else {
            state.extractedTopics = topicsOrUpdater;
          }
        }, false, 'setExtractedTopics'),

      setSelectedTopics: (topicsOrUpdater) =>
        set((state) => {
          if (typeof topicsOrUpdater === 'function') {
            state.selectedTopics = topicsOrUpdater(state.selectedTopics);
          } else {
            state.selectedTopics = topicsOrUpdater;
          }
        }, false, 'setSelectedTopics'),

      // ═══════════════════════════════════════════════════════════════════════
      // SETTERS DE EDIÇÃO
      // ═══════════════════════════════════════════════════════════════════════

      setEditingTopic: (topicOrUpdater) =>
        set((state) => {
          if (typeof topicOrUpdater === 'function') {
            state.editingTopic = topicOrUpdater(state.editingTopic);
          } else {
            state.editingTopic = topicOrUpdater;
          }
        }, false, 'setEditingTopic'),

      setLastEditedTopicTitle: (title) =>
        set((state) => {
          state.lastEditedTopicTitle = title;
        }, false, 'setLastEditedTopicTitle'),

      setTopicContextScope: (scope) =>
        set((state) => {
          state.topicContextScope = scope;
        }, false, 'setTopicContextScope'),

      // ═══════════════════════════════════════════════════════════════════════
      // SETTERS DE UI
      // ═══════════════════════════════════════════════════════════════════════

      setSavingTopic: (saving) =>
        set((state) => {
          state.savingTopic = saving;
        }, false, 'setSavingTopic'),

      // ═══════════════════════════════════════════════════════════════════════
      // SETTERS DE MANIPULAÇÃO
      // ═══════════════════════════════════════════════════════════════════════

      setTopicToDelete: (topic) =>
        set((state) => {
          state.topicToDelete = topic;
        }, false, 'setTopicToDelete'),

      setTopicToRename: (topic) =>
        set((state) => {
          state.topicToRename = topic;
        }, false, 'setTopicToRename'),

      setNewTopicName: (name) =>
        set((state) => {
          state.newTopicName = name;
        }, false, 'setNewTopicName'),

      setTopicsToMerge: (topics) =>
        set((state) => {
          state.topicsToMerge = topics;
        }, false, 'setTopicsToMerge'),

      setTopicToSplit: (topic) =>
        set((state) => {
          state.topicToSplit = topic;
        }, false, 'setTopicToSplit'),

      setSplitNames: (names) =>
        set((state) => {
          state.splitNames = names;
        }, false, 'setSplitNames'),

      setNewTopicData: (dataOrUpdater) =>
        set((state) => {
          if (typeof dataOrUpdater === 'function') {
            state.newTopicData = dataOrUpdater(state.newTopicData);
          } else {
            state.newTopicData = dataOrUpdater;
          }
        }, false, 'setNewTopicData'),

      // ═══════════════════════════════════════════════════════════════════════
      // SETTERS DE CURADORIA (v1.37.73: ModalRoot)
      // ═══════════════════════════════════════════════════════════════════════

      setShowTopicCurationModal: (show) =>
        set((state) => {
          state.showTopicCurationModal = show;
        }, false, `setShowTopicCurationModal/${show}`),

      setPendingCurationData: (data) =>
        set((state) => {
          state.pendingCurationData = data;
        }, false, 'setPendingCurationData'),

      // ═══════════════════════════════════════════════════════════════════════
      // HANDLERS DE PREPARAÇÃO
      // ═══════════════════════════════════════════════════════════════════════

      prepareDeleteTopic: (topic) =>
        set((state) => {
          state.topicToDelete = topic;
        }, false, 'prepareDeleteTopic'),

      prepareRenameTopic: (topic) =>
        set((state) => {
          state.topicToRename = topic;
          state.newTopicName = topic.title;
        }, false, 'prepareRenameTopic'),

      prepareMergeTopics: (topics) =>
        set((state) => {
          state.topicsToMerge = topics;
        }, false, 'prepareMergeTopics'),

      prepareSplitTopic: (topic) =>
        set((state) => {
          state.topicToSplit = topic;
          state.splitNames = ['', ''];
        }, false, 'prepareSplitTopic'),

      prepareNewTopic: (category = 'MÉRITO') =>
        set((state) => {
          state.newTopicData = {
            title: '',
            category,
            relatorio: '',
            fundamentacao: ''
          };
        }, false, 'prepareNewTopic'),

      // ═══════════════════════════════════════════════════════════════════════
      // HANDLERS DE CONFIRMAÇÃO
      // ═══════════════════════════════════════════════════════════════════════

      confirmDeleteTopic: () =>
        set((state) => {
          if (!state.topicToDelete) return;

          state.selectedTopics = state.selectedTopics.filter(
            t => t.title !== state.topicToDelete!.title
          );
          state.topicToDelete = null;
        }, false, 'confirmDeleteTopic'),

      cancelOperation: () =>
        set((state) => {
          state.topicToDelete = null;
          state.topicToRename = null;
          state.newTopicName = '';
          state.topicsToMerge = [];
          state.topicToSplit = null;
          state.splitNames = ['', ''];
          state.newTopicData = null;
        }, false, 'cancelOperation'),

      updateSelectedTopics: (topics) =>
        set((state) => {
          state.selectedTopics = topics;
        }, false, 'updateSelectedTopics'),

      // ═══════════════════════════════════════════════════════════════════════
      // MÉTODOS DE PERSISTÊNCIA
      // ═══════════════════════════════════════════════════════════════════════

      serializeForPersistence: () => {
        const state = get();
        return {
          extractedTopics: state.extractedTopics,
          selectedTopics: state.selectedTopics,
          editingTopic: state.editingTopic,
          lastEditedTopicTitle: state.lastEditedTopicTitle
        };
      },

      restoreFromPersistence: (data) =>
        set((state) => {
          if (!data) return;

          if (data.extractedTopics) {
            state.extractedTopics = data.extractedTopics as Topic[];
          }
          if (data.selectedTopics) {
            state.selectedTopics = data.selectedTopics as Topic[];
          }
          if (data.editingTopic !== undefined) {
            state.editingTopic = data.editingTopic as Topic | null;
          }
          if (data.lastEditedTopicTitle !== undefined) {
            state.lastEditedTopicTitle = data.lastEditedTopicTitle as string | null;
          }
        }, false, 'restoreFromPersistence'),

      clearAll: () =>
        set((state) => {
          // Tópicos
          state.extractedTopics = [];
          state.selectedTopics = [];

          // Edição
          state.editingTopic = null;
          state.lastEditedTopicTitle = null;
          // topicContextScope mantém valor (é config, não dados)

          // UI
          state.savingTopic = false;

          // Manipulação
          state.topicToDelete = null;
          state.topicToRename = null;
          state.newTopicName = '';
          state.topicsToMerge = [];
          state.topicToSplit = null;
          state.splitNames = ['', ''];
          state.newTopicData = null;
        }, false, 'clearAll'),
    })),
    { name: 'TopicsStore' }
  )
);

// ═══════════════════════════════════════════════════════════════════════════════
// SELETORES OTIMIZADOS
// ═══════════════════════════════════════════════════════════════════════════════

/** Seleciona apenas os tópicos extraídos */
export const selectExtractedTopics = (state: TopicsStoreState) => state.extractedTopics;

/** Seleciona apenas os tópicos selecionados */
export const selectSelectedTopics = (state: TopicsStoreState) => state.selectedTopics;

/** Seleciona o tópico em edição */
export const selectEditingTopic = (state: TopicsStoreState) => state.editingTopic;

/** Seleciona estados de manipulação (modais) */
export const selectManipulationState = (state: TopicsStoreState) => ({
  topicToDelete: state.topicToDelete,
  topicToRename: state.topicToRename,
  newTopicName: state.newTopicName,
  topicsToMerge: state.topicsToMerge,
  topicToSplit: state.topicToSplit,
  splitNames: state.splitNames,
  newTopicData: state.newTopicData,
});

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK DE COMPATIBILIDADE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Hook de compatibilidade para transição gradual.
 * Retorna a mesma interface do useTopicManager original.
 *
 * @deprecated Use useTopicsStore diretamente após migração completa
 */
export function useTopicManagerCompat() {
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
}

/**
 * @file useModelsStore.ts
 * @description Store Zustand para biblioteca de modelos (CRUD, busca, filtros)
 * @version 1.37.49
 *
 * Este store centraliza o estado da biblioteca de modelos que antes estava
 * no hook useModelLibrary.
 *
 * @replaces useModelLibrary (parcialmente - core data, search, form)
 * @usedBy App.tsx, aba Modelos, ModelCard, ModelFormModal
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type {
  Model,
  NewModelData,
  SimilarityWarningState
} from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// SEÇÃO 1: TIPOS E DEFAULTS
// ═══════════════════════════════════════════════════════════════════════════

/** Filtro de propriedade dos modelos */
export type OwnershipFilter = 'all' | 'mine' | 'shared';

/** Modo de visualização dos modelos */
export type ModelViewMode = 'cards' | 'list';

/** Biblioteca compartilhada ativa (v1.37.49) */
export interface SharedLibraryInfo {
  ownerId: string;
  ownerEmail: string;
}

/** Estado inicial do formulário de modelo */
const initialNewModel: NewModelData = {
  title: '',
  content: '',
  keywords: '',
  category: ''
};

// ═══════════════════════════════════════════════════════════════════════════
// SEÇÃO 2: INTERFACE DO STORE
// ═══════════════════════════════════════════════════════════════════════════

interface ModelsStoreState {
  // ─────────────────────────────────────────────────────────────────────────
  // DADOS CORE
  // ─────────────────────────────────────────────────────────────────────────
  models: Model[];
  hasUnsavedChanges: boolean;
  isLoadingModels: boolean;
  persistenceError: string | null;

  // ─────────────────────────────────────────────────────────────────────────
  // BUSCA E FILTROS
  // ─────────────────────────────────────────────────────────────────────────
  searchTerm: string;
  selectedCategory: string;
  showFavoritesOnly: boolean;
  ownershipFilter: OwnershipFilter;
  currentModelPage: number;
  modelViewMode: ModelViewMode;
  modelsPerPage: number;

  // Busca manual
  manualSearchTerm: string;
  manualSearchResults: Model[];
  useSemanticManualSearch: boolean; // v1.37.49: Toggle de busca semântica manual

  // Modelos compartilhados (v1.37.49)
  receivedModels: Model[] | null;
  activeSharedLibraries: SharedLibraryInfo[] | null;

  // Sugestões
  suggestions: Model[];
  suggestionsSource: 'local' | 'api' | null;
  loadingSuggestions: boolean;

  // ─────────────────────────────────────────────────────────────────────────
  // FORMULÁRIO E EDIÇÃO
  // ─────────────────────────────────────────────────────────────────────────
  newModel: NewModelData;
  editingModel: Model | null;
  extractingModelFromDecision: boolean;
  showExtractModelButton: boolean;
  extractedModelPreview: NewModelData | null;
  exportedModelsText: string;
  modelToDelete: Model | null;
  similarityWarning: SimilarityWarningState | null;

  // ─────────────────────────────────────────────────────────────────────────
  // ACTIONS - DADOS CORE
  // ─────────────────────────────────────────────────────────────────────────
  setModels: (models: Model[] | ((prev: Model[]) => Model[])) => void;
  addModel: (model: Model) => void;
  updateModel: (id: string, updates: Partial<Model>) => void;
  deleteModel: (id: string) => void;
  toggleFavorite: (id: string) => void;
  setHasUnsavedChanges: (value: boolean) => void;
  setIsLoadingModels: (value: boolean) => void;
  setPersistenceError: (error: string | null) => void;

  // ─────────────────────────────────────────────────────────────────────────
  // ACTIONS - BUSCA E FILTROS
  // ─────────────────────────────────────────────────────────────────────────
  setSearchTerm: (term: string) => void;
  setSelectedCategory: (category: string) => void;
  setShowFavoritesOnly: (value: boolean) => void;
  setOwnershipFilter: (filter: OwnershipFilter) => void;
  setCurrentModelPage: (page: number | ((prev: number) => number)) => void;
  setModelViewMode: (mode: ModelViewMode) => void;
  setManualSearchTerm: (term: string) => void;
  setManualSearchResults: (results: Model[]) => void;
  setUseSemanticManualSearch: (value: boolean) => void; // v1.37.49

  // Actions - Modelos compartilhados (v1.37.49)
  setReceivedModels: (models: Model[] | null) => void;
  setActiveSharedLibraries: (libraries: SharedLibraryInfo[] | null) => void;

  setSuggestions: (suggestions: Model[]) => void;
  setSuggestionsSource: (source: 'local' | 'api' | null) => void;
  setLoadingSuggestions: (loading: boolean) => void;
  clearSearch: () => void;

  // ─────────────────────────────────────────────────────────────────────────
  // ACTIONS - FORMULÁRIO
  // ─────────────────────────────────────────────────────────────────────────
  setNewModel: (model: NewModelData | ((prev: NewModelData) => NewModelData)) => void;
  setEditingModel: (model: Model | null) => void;
  setExtractingModelFromDecision: (value: boolean) => void;
  setShowExtractModelButton: (value: boolean) => void;
  setExtractedModelPreview: (preview: NewModelData | null) => void;
  setExportedModelsText: (text: string) => void;
  setModelToDelete: (model: Model | null) => void;
  setSimilarityWarning: (warning: SimilarityWarningState | null) => void;

  // Form helpers
  resetForm: () => void;
  startEditingModel: (model: Model) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// SEÇÃO 3: STORE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Store de Modelos - Gerencia biblioteca e busca
 *
 * @example
 * // Uso básico
 * const { models, setModels, searchTerm, setSearchTerm } = useModelsStore();
 *
 * @example
 * // Com selector para evitar re-renders
 * const models = useModelsStore((s) => s.models);
 * const searchTerm = useModelsStore((s) => s.searchTerm);
 */
export const useModelsStore = create<ModelsStoreState>()(
  devtools(
    immer((set) => ({
      // ─────────────────────────────────────────────────────────────────────
      // ESTADO INICIAL - DADOS CORE
      // ─────────────────────────────────────────────────────────────────────
      models: [],
      hasUnsavedChanges: false,
      isLoadingModels: false,
      persistenceError: null,

      // ─────────────────────────────────────────────────────────────────────
      // ESTADO INICIAL - BUSCA E FILTROS
      // ─────────────────────────────────────────────────────────────────────
      searchTerm: '',
      selectedCategory: 'all',
      showFavoritesOnly: false,
      ownershipFilter: 'all',
      currentModelPage: 1,
      modelViewMode: 'cards',
      modelsPerPage: 5,
      manualSearchTerm: '',
      manualSearchResults: [],
      useSemanticManualSearch: false, // v1.37.49

      // Modelos compartilhados (v1.37.49)
      receivedModels: null,
      activeSharedLibraries: null,

      suggestions: [],
      suggestionsSource: null,
      loadingSuggestions: false,

      // ─────────────────────────────────────────────────────────────────────
      // ESTADO INICIAL - FORMULÁRIO
      // ─────────────────────────────────────────────────────────────────────
      newModel: initialNewModel,
      editingModel: null,
      extractingModelFromDecision: false,
      showExtractModelButton: true,
      extractedModelPreview: null,
      exportedModelsText: '',
      modelToDelete: null,
      similarityWarning: null,

      // ─────────────────────────────────────────────────────────────────────
      // ACTIONS - DADOS CORE
      // ─────────────────────────────────────────────────────────────────────

      setModels: (modelsOrUpdater) =>
        set(
          (state) => {
            if (typeof modelsOrUpdater === 'function') {
              state.models = modelsOrUpdater(state.models);
            } else {
              state.models = modelsOrUpdater;
            }
          },
          false,
          'setModels'
        ),

      addModel: (model) =>
        set(
          (state) => {
            state.models.push(model);
            state.hasUnsavedChanges = true;
          },
          false,
          `addModel/${model.id}`
        ),

      updateModel: (id, updates) =>
        set(
          (state) => {
            const index = state.models.findIndex((m) => m.id === id);
            if (index !== -1) {
              state.models[index] = { ...state.models[index], ...updates };
              state.hasUnsavedChanges = true;
            }
          },
          false,
          `updateModel/${id}`
        ),

      deleteModel: (id) =>
        set(
          (state) => {
            state.models = state.models.filter((m) => m.id !== id);
            state.hasUnsavedChanges = true;
          },
          false,
          `deleteModel/${id}`
        ),

      toggleFavorite: (id) =>
        set(
          (state) => {
            const model = state.models.find((m) => m.id === id);
            if (model) {
              model.favorite = !model.favorite;
              state.hasUnsavedChanges = true;
            }
          },
          false,
          `toggleFavorite/${id}`
        ),

      setHasUnsavedChanges: (value) =>
        set(
          (state) => {
            state.hasUnsavedChanges = value;
          },
          false,
          `setHasUnsavedChanges/${value}`
        ),

      setIsLoadingModels: (value) =>
        set(
          (state) => {
            state.isLoadingModels = value;
          },
          false,
          `setIsLoadingModels/${value}`
        ),

      setPersistenceError: (error) =>
        set(
          (state) => {
            state.persistenceError = error;
          },
          false,
          'setPersistenceError'
        ),

      // ─────────────────────────────────────────────────────────────────────
      // ACTIONS - BUSCA E FILTROS
      // ─────────────────────────────────────────────────────────────────────

      setSearchTerm: (term) =>
        set(
          (state) => {
            state.searchTerm = term;
            state.currentModelPage = 1; // Reset page on search
          },
          false,
          'setSearchTerm'
        ),

      setSelectedCategory: (category) =>
        set(
          (state) => {
            state.selectedCategory = category;
            state.currentModelPage = 1;
          },
          false,
          `setSelectedCategory/${category}`
        ),

      setShowFavoritesOnly: (value) =>
        set(
          (state) => {
            state.showFavoritesOnly = value;
            state.currentModelPage = 1;
          },
          false,
          `setShowFavoritesOnly/${value}`
        ),

      setOwnershipFilter: (filter) =>
        set(
          (state) => {
            state.ownershipFilter = filter;
            state.currentModelPage = 1;
          },
          false,
          `setOwnershipFilter/${filter}`
        ),

      setCurrentModelPage: (pageOrUpdater) =>
        set(
          (state) => {
            if (typeof pageOrUpdater === 'function') {
              state.currentModelPage = pageOrUpdater(state.currentModelPage);
            } else {
              state.currentModelPage = pageOrUpdater;
            }
          },
          false,
          'setCurrentModelPage'
        ),

      setModelViewMode: (mode) =>
        set(
          (state) => {
            state.modelViewMode = mode;
          },
          false,
          `setModelViewMode/${mode}`
        ),

      setManualSearchTerm: (term) =>
        set(
          (state) => {
            state.manualSearchTerm = term;
          },
          false,
          'setManualSearchTerm'
        ),

      setManualSearchResults: (results) =>
        set(
          (state) => {
            state.manualSearchResults = results;
          },
          false,
          'setManualSearchResults'
        ),

      setUseSemanticManualSearch: (value) =>
        set(
          (state) => {
            state.useSemanticManualSearch = value;
          },
          false,
          `setUseSemanticManualSearch/${value}`
        ),

      // ─────────────────────────────────────────────────────────────────────
      // ACTIONS - MODELOS COMPARTILHADOS (v1.37.49)
      // ─────────────────────────────────────────────────────────────────────

      setReceivedModels: (models) =>
        set(
          (state) => {
            state.receivedModels = models;
          },
          false,
          'setReceivedModels'
        ),

      setActiveSharedLibraries: (libraries) =>
        set(
          (state) => {
            state.activeSharedLibraries = libraries;
          },
          false,
          'setActiveSharedLibraries'
        ),

      setSuggestions: (suggestions) =>
        set(
          (state) => {
            state.suggestions = suggestions;
          },
          false,
          'setSuggestions'
        ),

      setSuggestionsSource: (source) =>
        set(
          (state) => {
            state.suggestionsSource = source;
          },
          false,
          `setSuggestionsSource/${source}`
        ),

      setLoadingSuggestions: (loading) =>
        set(
          (state) => {
            state.loadingSuggestions = loading;
          },
          false,
          `setLoadingSuggestions/${loading}`
        ),

      clearSearch: () =>
        set(
          (state) => {
            state.searchTerm = '';
            state.manualSearchTerm = '';
            state.manualSearchResults = [];
            state.currentModelPage = 1;
          },
          false,
          'clearSearch'
        ),

      // ─────────────────────────────────────────────────────────────────────
      // ACTIONS - FORMULÁRIO
      // ─────────────────────────────────────────────────────────────────────

      setNewModel: (modelOrUpdater) =>
        set(
          (state) => {
            if (typeof modelOrUpdater === 'function') {
              state.newModel = modelOrUpdater(state.newModel);
            } else {
              state.newModel = modelOrUpdater;
            }
          },
          false,
          'setNewModel'
        ),

      setEditingModel: (model) =>
        set(
          (state) => {
            state.editingModel = model;
          },
          false,
          model ? `setEditingModel/${model.id}` : 'setEditingModel/null'
        ),

      setExtractingModelFromDecision: (value) =>
        set(
          (state) => {
            state.extractingModelFromDecision = value;
          },
          false,
          `setExtractingModelFromDecision/${value}`
        ),

      setShowExtractModelButton: (value) =>
        set(
          (state) => {
            state.showExtractModelButton = value;
          },
          false,
          `setShowExtractModelButton/${value}`
        ),

      setExtractedModelPreview: (preview) =>
        set(
          (state) => {
            state.extractedModelPreview = preview;
          },
          false,
          'setExtractedModelPreview'
        ),

      setExportedModelsText: (text) =>
        set(
          (state) => {
            state.exportedModelsText = text;
          },
          false,
          'setExportedModelsText'
        ),

      setModelToDelete: (model) =>
        set(
          (state) => {
            state.modelToDelete = model;
          },
          false,
          model ? `setModelToDelete/${model.id}` : 'setModelToDelete/null'
        ),

      setSimilarityWarning: (warning) =>
        set(
          (state) => {
            state.similarityWarning = warning;
          },
          false,
          'setSimilarityWarning'
        ),

      resetForm: () =>
        set(
          (state) => {
            state.newModel = initialNewModel;
            state.editingModel = null;
            state.extractedModelPreview = null;
            state.similarityWarning = null;
          },
          false,
          'resetForm'
        ),

      startEditingModel: (model) =>
        set(
          (state) => {
            state.editingModel = model;
            state.newModel = {
              title: model.title || '',
              content: model.content || '',
              keywords: typeof model.keywords === 'string'
                ? model.keywords
                : (model.keywords || []).join(', '),
              category: model.category || ''
            };
          },
          false,
          `startEditingModel/${model.id}`
        ),
    })),
    { name: 'ModelsStore' }
  )
);

// ═══════════════════════════════════════════════════════════════════════════
// SEÇÃO 4: SELECTORS
// ═══════════════════════════════════════════════════════════════════════════

/** Selector: Retorna modelos filtrados por categoria */
export const selectModelsByCategory = (category: string) => (state: ModelsStoreState): Model[] =>
  category === 'all'
    ? state.models
    : state.models.filter((m) => m.category === category);

/** Selector: Retorna modelos favoritos */
export const selectFavoriteModels = (state: ModelsStoreState): Model[] =>
  state.models.filter((m) => m.favorite);

/** Selector: Retorna contagem de modelos */
export const selectModelsCount = (state: ModelsStoreState): number =>
  state.models.length;

/** Selector: Retorna categorias únicas */
export const selectCategories = (state: ModelsStoreState): string[] => {
  const categories = new Set<string>();
  state.models.forEach((m) => {
    if (m.category) categories.add(m.category);
  });
  return Array.from(categories).sort();
};

/** Selector: Retorna modelo por ID */
export const selectModelById = (id: string) => (state: ModelsStoreState): Model | undefined =>
  state.models.find((m) => m.id === id);

/** Selector: Verifica se está editando */
export const selectIsEditing = (state: ModelsStoreState): boolean =>
  state.editingModel !== null;

/** Selector: Retorna se busca semântica manual está ativa (v1.37.49) */
export const selectUseSemanticManualSearch = (state: ModelsStoreState): boolean =>
  state.useSemanticManualSearch;

/** Selector: Retorna modelos recebidos de bibliotecas compartilhadas (v1.37.49) */
export const selectReceivedModels = (state: ModelsStoreState): Model[] | null =>
  state.receivedModels;

/** Selector: Retorna bibliotecas compartilhadas ativas (v1.37.49) */
export const selectActiveSharedLibraries = (state: ModelsStoreState): SharedLibraryInfo[] | null =>
  state.activeSharedLibraries;

// ═══════════════════════════════════════════════════════════════════════════
// SEÇÃO 5: HOOKS DE COMPATIBILIDADE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook de compatibilidade com useModelLibrary antigo
 *
 * @deprecated Use useModelsStore diretamente após migração completa
 */
export function useModelLibraryCompat() {
  // Dados Core
  const models = useModelsStore((s) => s.models);
  const setModels = useModelsStore((s) => s.setModels);
  const hasUnsavedChanges = useModelsStore((s) => s.hasUnsavedChanges);
  const setHasUnsavedChanges = useModelsStore((s) => s.setHasUnsavedChanges);
  const isLoadingModels = useModelsStore((s) => s.isLoadingModels);
  const setIsLoadingModels = useModelsStore((s) => s.setIsLoadingModels);
  const persistenceError = useModelsStore((s) => s.persistenceError);
  const setPersistenceError = useModelsStore((s) => s.setPersistenceError);

  // Busca e Filtros
  const searchTerm = useModelsStore((s) => s.searchTerm);
  const setSearchTerm = useModelsStore((s) => s.setSearchTerm);
  const selectedCategory = useModelsStore((s) => s.selectedCategory);
  const setSelectedCategory = useModelsStore((s) => s.setSelectedCategory);
  const showFavoritesOnly = useModelsStore((s) => s.showFavoritesOnly);
  const setShowFavoritesOnly = useModelsStore((s) => s.setShowFavoritesOnly);
  const ownershipFilter = useModelsStore((s) => s.ownershipFilter);
  const setOwnershipFilter = useModelsStore((s) => s.setOwnershipFilter);
  const currentModelPage = useModelsStore((s) => s.currentModelPage);
  const setCurrentModelPage = useModelsStore((s) => s.setCurrentModelPage);
  const manualSearchTerm = useModelsStore((s) => s.manualSearchTerm);
  const setManualSearchTerm = useModelsStore((s) => s.setManualSearchTerm);
  const manualSearchResults = useModelsStore((s) => s.manualSearchResults);
  const setManualSearchResults = useModelsStore((s) => s.setManualSearchResults);
  const useSemanticManualSearch = useModelsStore((s) => s.useSemanticManualSearch);
  const setUseSemanticManualSearch = useModelsStore((s) => s.setUseSemanticManualSearch);

  // Modelos compartilhados (v1.37.49)
  const receivedModels = useModelsStore((s) => s.receivedModels);
  const setReceivedModels = useModelsStore((s) => s.setReceivedModels);
  const activeSharedLibraries = useModelsStore((s) => s.activeSharedLibraries);
  const setActiveSharedLibraries = useModelsStore((s) => s.setActiveSharedLibraries);

  const suggestions = useModelsStore((s) => s.suggestions);
  const setSuggestions = useModelsStore((s) => s.setSuggestions);
  const suggestionsSource = useModelsStore((s) => s.suggestionsSource);
  const setSuggestionsSource = useModelsStore((s) => s.setSuggestionsSource);
  const loadingSuggestions = useModelsStore((s) => s.loadingSuggestions);
  const setLoadingSuggestions = useModelsStore((s) => s.setLoadingSuggestions);
  const modelViewMode = useModelsStore((s) => s.modelViewMode);
  const setModelViewMode = useModelsStore((s) => s.setModelViewMode);
  const modelsPerPage = useModelsStore((s) => s.modelsPerPage);

  // Formulário
  const newModel = useModelsStore((s) => s.newModel);
  const setNewModel = useModelsStore((s) => s.setNewModel);
  const editingModel = useModelsStore((s) => s.editingModel);
  const setEditingModel = useModelsStore((s) => s.setEditingModel);
  const extractingModelFromDecision = useModelsStore((s) => s.extractingModelFromDecision);
  const setExtractingModelFromDecision = useModelsStore((s) => s.setExtractingModelFromDecision);
  const showExtractModelButton = useModelsStore((s) => s.showExtractModelButton);
  const setShowExtractModelButton = useModelsStore((s) => s.setShowExtractModelButton);
  const extractedModelPreview = useModelsStore((s) => s.extractedModelPreview);
  const setExtractedModelPreview = useModelsStore((s) => s.setExtractedModelPreview);
  const exportedModelsText = useModelsStore((s) => s.exportedModelsText);
  const setExportedModelsText = useModelsStore((s) => s.setExportedModelsText);
  const modelToDelete = useModelsStore((s) => s.modelToDelete);
  const setModelToDelete = useModelsStore((s) => s.setModelToDelete);
  const similarityWarning = useModelsStore((s) => s.similarityWarning);
  const setSimilarityWarning = useModelsStore((s) => s.setSimilarityWarning);
  const resetForm = useModelsStore((s) => s.resetForm);
  const startEditingModel = useModelsStore((s) => s.startEditingModel);

  return {
    // Dados Core
    models, setModels,
    hasUnsavedChanges, setHasUnsavedChanges,
    isLoadingModels, setIsLoadingModels,
    persistenceError, setPersistenceError,

    // Busca e Filtros
    searchTerm, setSearchTerm,
    selectedCategory, setSelectedCategory,
    showFavoritesOnly, setShowFavoritesOnly,
    ownershipFilter, setOwnershipFilter,
    currentModelPage, setCurrentModelPage,
    manualSearchTerm, setManualSearchTerm,
    manualSearchResults, setManualSearchResults,
    useSemanticManualSearch, setUseSemanticManualSearch,
    receivedModels, setReceivedModels,
    activeSharedLibraries, setActiveSharedLibraries,
    suggestions, setSuggestions,
    suggestionsSource, setSuggestionsSource,
    loadingSuggestions, setLoadingSuggestions,
    modelViewMode, setModelViewMode,
    modelsPerPage,

    // Formulário
    newModel, setNewModel,
    editingModel, setEditingModel,
    extractingModelFromDecision, setExtractingModelFromDecision,
    showExtractModelButton, setShowExtractModelButton,
    extractedModelPreview, setExtractedModelPreview,
    exportedModelsText, setExportedModelsText,
    modelToDelete, setModelToDelete,
    similarityWarning, setSimilarityWarning,
    resetForm, startEditingModel
  };
}

export default useModelsStore;

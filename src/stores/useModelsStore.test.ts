/**
 * @file useModelsStore.test.ts
 * @description Testes para o store de modelos (CRUD, busca, filtros)
 * @version 1.40.05
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  useModelsStore,
  selectModelsByCategory,
  selectFavoriteModels,
  selectModelsCount,
  selectCategories,
  selectModelById,
  selectIsEditing,
  selectUseSemanticManualSearch,
  selectReceivedModels,
  selectActiveSharedLibraries,
  // v1.40.05: Novos selectors para preview contextual
  selectPreviewingModel,
  selectHasPreviewingModel,
  selectContextualInsertFn
} from './useModelsStore';
import type { Model } from '../types';

describe('useModelsStore', () => {
  // Reset store before each test
  beforeEach(() => {
    const store = useModelsStore.getState();
    store.setModels([]);
    store.resetForm();
    store.clearSearch();
    store.setHasUnsavedChanges(false);
    store.setIsLoadingModels(false);
    store.setPersistenceError(null);
    store.setReceivedModels(null);
    store.setActiveSharedLibraries(null);
    store.setSuggestions([]);
    store.setSuggestionsSource(null);
    store.setLoadingSuggestions(false);
    store.setUseSemanticManualSearch(false);
    // v1.40.05: Reset contextual preview state
    store.clearContextualState();
  });

  // Helper to create mock models
  const createMockModel = (overrides: Partial<Model> = {}): Model => ({
    id: `model-${Date.now()}-${Math.random()}`,
    title: 'Test Model',
    content: 'Model content',
    keywords: ['test'],
    category: 'TRABALHISTA',
    favorite: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // MODELS CRUD TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Models CRUD', () => {
    it('should add a model', () => {
      const store = useModelsStore.getState();
      const model = createMockModel({ id: 'model-1', title: 'First Model' });

      store.addModel(model);

      const state = useModelsStore.getState();
      expect(state.models).toHaveLength(1);
      expect(state.models[0].title).toBe('First Model');
      expect(state.hasUnsavedChanges).toBe(true);
    });

    it('should set models array', () => {
      const store = useModelsStore.getState();
      const models = [
        createMockModel({ id: '1', title: 'Model 1' }),
        createMockModel({ id: '2', title: 'Model 2' })
      ];

      store.setModels(models);

      expect(useModelsStore.getState().models).toHaveLength(2);
    });

    it('should set models with updater function', () => {
      const store = useModelsStore.getState();
      store.setModels([createMockModel({ id: '1' })]);

      store.setModels((prev) => [...prev, createMockModel({ id: '2' })]);

      expect(useModelsStore.getState().models).toHaveLength(2);
    });

    it('should update a model', () => {
      const store = useModelsStore.getState();
      const model = createMockModel({ id: 'model-1', title: 'Original Title' });
      store.addModel(model);

      store.updateModel('model-1', { title: 'Updated Title' });

      const state = useModelsStore.getState();
      expect(state.models[0].title).toBe('Updated Title');
    });

    it('should not update non-existent model', () => {
      const store = useModelsStore.getState();
      store.addModel(createMockModel({ id: 'model-1' }));

      store.updateModel('non-existent', { title: 'New Title' });

      expect(useModelsStore.getState().models[0].title).toBe('Test Model');
    });

    it('should delete a model', () => {
      const store = useModelsStore.getState();
      store.addModel(createMockModel({ id: 'model-1' }));
      store.addModel(createMockModel({ id: 'model-2' }));

      store.deleteModel('model-1');

      const state = useModelsStore.getState();
      expect(state.models).toHaveLength(1);
      expect(state.models[0].id).toBe('model-2');
    });

    it('should toggle favorite', () => {
      const store = useModelsStore.getState();
      store.addModel(createMockModel({ id: 'model-1', favorite: false }));

      store.toggleFavorite('model-1');
      expect(useModelsStore.getState().models[0].favorite).toBe(true);

      store.toggleFavorite('model-1');
      expect(useModelsStore.getState().models[0].favorite).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SEARCH & FILTER TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Search & Filters', () => {
    it('should set search term and reset page', () => {
      const store = useModelsStore.getState();
      store.setCurrentModelPage(5);

      store.setSearchTerm('horas extras');

      const state = useModelsStore.getState();
      expect(state.searchTerm).toBe('horas extras');
      expect(state.currentModelPage).toBe(1);
    });

    it('should set selected category and reset page', () => {
      const store = useModelsStore.getState();
      store.setCurrentModelPage(3);

      store.setSelectedCategory('TRABALHISTA');

      const state = useModelsStore.getState();
      expect(state.selectedCategory).toBe('TRABALHISTA');
      expect(state.currentModelPage).toBe(1);
    });

    it('should set favorites only filter and reset page', () => {
      const store = useModelsStore.getState();
      store.setCurrentModelPage(2);

      store.setShowFavoritesOnly(true);

      const state = useModelsStore.getState();
      expect(state.showFavoritesOnly).toBe(true);
      expect(state.currentModelPage).toBe(1);
    });

    it('should set ownership filter and reset page', () => {
      const store = useModelsStore.getState();
      store.setCurrentModelPage(2);

      store.setOwnershipFilter('mine');

      const state = useModelsStore.getState();
      expect(state.ownershipFilter).toBe('mine');
      expect(state.currentModelPage).toBe(1);
    });

    it('should set model view mode', () => {
      const store = useModelsStore.getState();

      store.setModelViewMode('list');
      expect(useModelsStore.getState().modelViewMode).toBe('list');

      store.setModelViewMode('cards');
      expect(useModelsStore.getState().modelViewMode).toBe('cards');
    });

    it('should set current page', () => {
      const store = useModelsStore.getState();

      store.setCurrentModelPage(5);
      expect(useModelsStore.getState().currentModelPage).toBe(5);
    });

    it('should set current page with updater function', () => {
      const store = useModelsStore.getState();
      store.setCurrentModelPage(5);

      store.setCurrentModelPage((prev) => prev + 1);

      expect(useModelsStore.getState().currentModelPage).toBe(6);
    });

    it('should clear search', () => {
      const store = useModelsStore.getState();
      store.setSearchTerm('test');
      store.setManualSearchTerm('manual');
      store.setManualSearchResults([createMockModel()]);
      store.setCurrentModelPage(3);

      store.clearSearch();

      const state = useModelsStore.getState();
      expect(state.searchTerm).toBe('');
      expect(state.manualSearchTerm).toBe('');
      expect(state.manualSearchResults).toHaveLength(0);
      expect(state.currentModelPage).toBe(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // MANUAL SEARCH TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Manual Search', () => {
    it('should set manual search term', () => {
      const store = useModelsStore.getState();

      store.setManualSearchTerm('adicional noturno');

      expect(useModelsStore.getState().manualSearchTerm).toBe('adicional noturno');
    });

    it('should set manual search results', () => {
      const store = useModelsStore.getState();
      const results = [createMockModel({ id: '1' }), createMockModel({ id: '2' })];

      store.setManualSearchResults(results);

      expect(useModelsStore.getState().manualSearchResults).toHaveLength(2);
    });

    it('should toggle semantic manual search', () => {
      const store = useModelsStore.getState();

      expect(useModelsStore.getState().useSemanticManualSearch).toBe(false);

      store.setUseSemanticManualSearch(true);
      expect(useModelsStore.getState().useSemanticManualSearch).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SUGGESTIONS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Suggestions', () => {
    it('should set suggestions', () => {
      const store = useModelsStore.getState();
      const suggestions = [createMockModel()];

      store.setSuggestions(suggestions);

      expect(useModelsStore.getState().suggestions).toHaveLength(1);
    });

    it('should set suggestions source', () => {
      const store = useModelsStore.getState();

      store.setSuggestionsSource('local');
      expect(useModelsStore.getState().suggestionsSource).toBe('local');

      store.setSuggestionsSource('api');
      expect(useModelsStore.getState().suggestionsSource).toBe('api');
    });

    it('should set loading suggestions', () => {
      const store = useModelsStore.getState();

      store.setLoadingSuggestions(true);
      expect(useModelsStore.getState().loadingSuggestions).toBe(true);

      store.setLoadingSuggestions(false);
      expect(useModelsStore.getState().loadingSuggestions).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SHARED LIBRARIES TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Shared Libraries', () => {
    it('should set received models', () => {
      const store = useModelsStore.getState();
      const models = [createMockModel()];

      store.setReceivedModels(models);

      expect(useModelsStore.getState().receivedModels).toHaveLength(1);
    });

    it('should clear received models with null', () => {
      const store = useModelsStore.getState();
      store.setReceivedModels([createMockModel()]);

      store.setReceivedModels(null);

      expect(useModelsStore.getState().receivedModels).toBeNull();
    });

    it('should set active shared libraries', () => {
      const store = useModelsStore.getState();
      const libraries = [
        { ownerId: 'user-1', ownerEmail: 'user@example.com' }
      ];

      store.setActiveSharedLibraries(libraries);

      const state = useModelsStore.getState();
      expect(state.activeSharedLibraries).toHaveLength(1);
      expect(state.activeSharedLibraries![0].ownerEmail).toBe('user@example.com');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FORM TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Form Management', () => {
    it('should set new model data', () => {
      const store = useModelsStore.getState();

      store.setNewModel({
        title: 'New Model',
        content: 'Content',
        keywords: 'key1, key2',
        category: 'TRABALHISTA'
      });

      const state = useModelsStore.getState();
      expect(state.newModel.title).toBe('New Model');
      expect(state.newModel.content).toBe('Content');
    });

    it('should set new model with updater function', () => {
      const store = useModelsStore.getState();
      store.setNewModel({ title: 'Initial', content: '', keywords: '', category: '' });

      store.setNewModel((prev) => ({ ...prev, title: 'Updated' }));

      expect(useModelsStore.getState().newModel.title).toBe('Updated');
    });

    it('should set editing model', () => {
      const store = useModelsStore.getState();
      const model = createMockModel();

      store.setEditingModel(model);

      expect(useModelsStore.getState().editingModel).toEqual(model);
    });

    it('should clear editing model', () => {
      const store = useModelsStore.getState();
      store.setEditingModel(createMockModel());

      store.setEditingModel(null);

      expect(useModelsStore.getState().editingModel).toBeNull();
    });

    it('should start editing model and populate form', () => {
      const store = useModelsStore.getState();
      const model = createMockModel({
        id: 'edit-1',
        title: 'Edit Me',
        content: 'Edit content',
        keywords: ['kw1', 'kw2'],
        category: 'CIVIL'
      });

      store.startEditingModel(model);

      const state = useModelsStore.getState();
      expect(state.editingModel).toEqual(model);
      expect(state.newModel.title).toBe('Edit Me');
      expect(state.newModel.content).toBe('Edit content');
      expect(state.newModel.keywords).toBe('kw1, kw2');
      expect(state.newModel.category).toBe('CIVIL');
    });

    it('should reset form', () => {
      const store = useModelsStore.getState();
      store.setNewModel({ title: 'Test', content: 'Content', keywords: '', category: '' });
      store.setEditingModel(createMockModel());
      store.setExtractedModelPreview({ title: 'Extracted', content: '', keywords: '', category: '' });
      store.setSimilarityWarning({
        newModel: createMockModel(),
        similarModel: createMockModel(),
        similarity: 0.9,
        context: 'saveModel'
      });

      store.resetForm();

      const state = useModelsStore.getState();
      expect(state.newModel.title).toBe('');
      expect(state.editingModel).toBeNull();
      expect(state.extractedModelPreview).toBeNull();
      expect(state.similarityWarning).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EXTRACTION TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Model Extraction', () => {
    it('should set extracting model from decision', () => {
      const store = useModelsStore.getState();

      store.setExtractingModelFromDecision(true);
      expect(useModelsStore.getState().extractingModelFromDecision).toBe(true);

      store.setExtractingModelFromDecision(false);
      expect(useModelsStore.getState().extractingModelFromDecision).toBe(false);
    });

    it('should set show extract model button', () => {
      const store = useModelsStore.getState();

      store.setShowExtractModelButton(false);
      expect(useModelsStore.getState().showExtractModelButton).toBe(false);
    });

    it('should set extracted model preview', () => {
      const store = useModelsStore.getState();
      const preview = { title: 'Extracted', content: 'Content', keywords: '', category: '' };

      store.setExtractedModelPreview(preview);

      expect(useModelsStore.getState().extractedModelPreview).toEqual(preview);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DELETE & SIMILARITY TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Delete & Similarity Warning', () => {
    it('should set model to delete', () => {
      const store = useModelsStore.getState();
      const model = createMockModel();

      store.setModelToDelete(model);

      expect(useModelsStore.getState().modelToDelete).toEqual(model);
    });

    it('should clear model to delete', () => {
      const store = useModelsStore.getState();
      store.setModelToDelete(createMockModel());

      store.setModelToDelete(null);

      expect(useModelsStore.getState().modelToDelete).toBeNull();
    });

    it('should set similarity warning', () => {
      const store = useModelsStore.getState();
      const warning = {
        newModel: createMockModel(),
        similarModel: createMockModel(),
        similarity: 0.85,
        context: 'saveModel' as const
      };

      store.setSimilarityWarning(warning);

      const state = useModelsStore.getState();
      expect(state.similarityWarning?.similarity).toBe(0.85);
    });

    it('should set exported models text', () => {
      const store = useModelsStore.getState();

      store.setExportedModelsText('Exported data here');

      expect(useModelsStore.getState().exportedModelsText).toBe('Exported data here');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // LOADING & ERROR STATES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Loading & Error States', () => {
    it('should set loading models state', () => {
      const store = useModelsStore.getState();

      store.setIsLoadingModels(true);
      expect(useModelsStore.getState().isLoadingModels).toBe(true);

      store.setIsLoadingModels(false);
      expect(useModelsStore.getState().isLoadingModels).toBe(false);
    });

    it('should set persistence error', () => {
      const store = useModelsStore.getState();

      store.setPersistenceError('Failed to save models');

      expect(useModelsStore.getState().persistenceError).toBe('Failed to save models');
    });

    it('should clear persistence error', () => {
      const store = useModelsStore.getState();
      store.setPersistenceError('Error');

      store.setPersistenceError(null);

      expect(useModelsStore.getState().persistenceError).toBeNull();
    });

    it('should track unsaved changes', () => {
      const store = useModelsStore.getState();

      store.setHasUnsavedChanges(true);
      expect(useModelsStore.getState().hasUnsavedChanges).toBe(true);

      store.setHasUnsavedChanges(false);
      expect(useModelsStore.getState().hasUnsavedChanges).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SELECTORS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Selectors', () => {
    beforeEach(() => {
      const store = useModelsStore.getState();
      store.setModels([
        createMockModel({ id: '1', category: 'TRABALHISTA', favorite: true }),
        createMockModel({ id: '2', category: 'TRABALHISTA', favorite: false }),
        createMockModel({ id: '3', category: 'CIVIL', favorite: true }),
        createMockModel({ id: '4', category: 'PENAL', favorite: false })
      ]);
    });

    it('selectModelsByCategory should filter by category', () => {
      const state = useModelsStore.getState();

      const trabalhista = selectModelsByCategory('TRABALHISTA')(state);
      expect(trabalhista).toHaveLength(2);

      const civil = selectModelsByCategory('CIVIL')(state);
      expect(civil).toHaveLength(1);

      const all = selectModelsByCategory('all')(state);
      expect(all).toHaveLength(4);
    });

    it('selectFavoriteModels should return only favorites', () => {
      const favorites = selectFavoriteModels(useModelsStore.getState());
      expect(favorites).toHaveLength(2);
      expect(favorites.every((m) => m.favorite)).toBe(true);
    });

    it('selectModelsCount should return total count', () => {
      const count = selectModelsCount(useModelsStore.getState());
      expect(count).toBe(4);
    });

    it('selectCategories should return unique categories sorted', () => {
      const categories = selectCategories(useModelsStore.getState());
      expect(categories).toEqual(['CIVIL', 'PENAL', 'TRABALHISTA']);
    });

    it('selectModelById should find model by id', () => {
      const model = selectModelById('2')(useModelsStore.getState());
      expect(model?.id).toBe('2');
    });

    it('selectModelById should return undefined for non-existent id', () => {
      const model = selectModelById('non-existent')(useModelsStore.getState());
      expect(model).toBeUndefined();
    });

    it('selectIsEditing should return true when editing', () => {
      const store = useModelsStore.getState();

      expect(selectIsEditing(useModelsStore.getState())).toBe(false);

      store.setEditingModel(createMockModel());
      expect(selectIsEditing(useModelsStore.getState())).toBe(true);
    });

    it('selectUseSemanticManualSearch should return semantic search state', () => {
      const store = useModelsStore.getState();

      expect(selectUseSemanticManualSearch(useModelsStore.getState())).toBe(false);

      store.setUseSemanticManualSearch(true);
      expect(selectUseSemanticManualSearch(useModelsStore.getState())).toBe(true);
    });

    it('selectReceivedModels should return received models', () => {
      const store = useModelsStore.getState();
      const models = [createMockModel()];
      store.setReceivedModels(models);

      expect(selectReceivedModels(useModelsStore.getState())).toEqual(models);
    });

    it('selectActiveSharedLibraries should return shared libraries', () => {
      const store = useModelsStore.getState();
      const libraries = [{ ownerId: '1', ownerEmail: 'test@test.com' }];
      store.setActiveSharedLibraries(libraries);

      expect(selectActiveSharedLibraries(useModelsStore.getState())).toEqual(libraries);
    });

    // v1.40.05: Testes para preview contextual
    it('selectPreviewingModel should return previewing model', () => {
      const store = useModelsStore.getState();
      const model = createMockModel({ id: 'preview-1', title: 'Preview Model' });
      store.setPreviewingModel(model);

      expect(selectPreviewingModel(useModelsStore.getState())).toEqual(model);
    });

    it('selectHasPreviewingModel should return true when model is being previewed', () => {
      const store = useModelsStore.getState();

      expect(selectHasPreviewingModel(useModelsStore.getState())).toBe(false);

      store.setPreviewingModel(createMockModel());
      expect(selectHasPreviewingModel(useModelsStore.getState())).toBe(true);
    });

    it('selectContextualInsertFn should return insert function', () => {
      const store = useModelsStore.getState();
      const insertFn = vi.fn();
      store.setContextualInsertFn(insertFn);

      expect(selectContextualInsertFn(useModelsStore.getState())).toBe(insertFn);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CONTEXTUAL PREVIEW TESTS (v1.40.05)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Contextual Preview (v1.40.05)', () => {
    describe('setPreviewingModel', () => {
      it('should set previewing model', () => {
        const model = createMockModel({ id: 'model-1', title: 'Test Model' });
        useModelsStore.getState().setPreviewingModel(model);

        expect(useModelsStore.getState().previewingModel).toEqual(model);
      });

      it('should update previewing model', () => {
        const model1 = createMockModel({ id: 'model-1', title: 'Model 1' });
        const model2 = createMockModel({ id: 'model-2', title: 'Model 2' });

        useModelsStore.getState().setPreviewingModel(model1);
        expect(useModelsStore.getState().previewingModel?.title).toBe('Model 1');

        useModelsStore.getState().setPreviewingModel(model2);
        expect(useModelsStore.getState().previewingModel?.title).toBe('Model 2');
      });

      it('should clear previewing model by setting null', () => {
        const model = createMockModel();
        useModelsStore.getState().setPreviewingModel(model);
        useModelsStore.getState().setPreviewingModel(null);

        expect(useModelsStore.getState().previewingModel).toBeNull();
      });
    });

    describe('setContextualInsertFn', () => {
      it('should set contextual insert function', () => {
        const insertFn = vi.fn();
        useModelsStore.getState().setContextualInsertFn(insertFn);

        expect(useModelsStore.getState().contextualInsertFn).toBe(insertFn);
      });

      it('should update contextual insert function', () => {
        const insertFn1 = vi.fn();
        const insertFn2 = vi.fn();

        useModelsStore.getState().setContextualInsertFn(insertFn1);
        expect(useModelsStore.getState().contextualInsertFn).toBe(insertFn1);

        useModelsStore.getState().setContextualInsertFn(insertFn2);
        expect(useModelsStore.getState().contextualInsertFn).toBe(insertFn2);
      });

      it('should clear contextual insert function by setting null', () => {
        const insertFn = vi.fn();
        useModelsStore.getState().setContextualInsertFn(insertFn);
        useModelsStore.getState().setContextualInsertFn(null);

        expect(useModelsStore.getState().contextualInsertFn).toBeNull();
      });

      it('should allow calling the stored function', () => {
        const insertFn = vi.fn();
        useModelsStore.getState().setContextualInsertFn(insertFn);

        const storedFn = useModelsStore.getState().contextualInsertFn;
        storedFn?.('<p>Test content</p>');

        expect(insertFn).toHaveBeenCalledWith('<p>Test content</p>');
      });
    });

    describe('clearContextualState', () => {
      it('should clear both previewingModel and contextualInsertFn', () => {
        const model = createMockModel();
        const insertFn = vi.fn();

        useModelsStore.getState().setPreviewingModel(model);
        useModelsStore.getState().setContextualInsertFn(insertFn);

        expect(useModelsStore.getState().previewingModel).not.toBeNull();
        expect(useModelsStore.getState().contextualInsertFn).not.toBeNull();

        useModelsStore.getState().clearContextualState();

        expect(useModelsStore.getState().previewingModel).toBeNull();
        expect(useModelsStore.getState().contextualInsertFn).toBeNull();
      });

      it('should not affect other state', () => {
        const model = createMockModel({ id: 'lib-model' });
        const previewModel = createMockModel({ id: 'preview-model' });

        useModelsStore.getState().setModels([model]);
        useModelsStore.getState().setPreviewingModel(previewModel);
        useModelsStore.getState().clearContextualState();

        // Library models should not be affected
        expect(useModelsStore.getState().models).toHaveLength(1);
        expect(useModelsStore.getState().models[0].id).toBe('lib-model');
      });
    });

    describe('Combined Contextual Workflow', () => {
      it('should handle typical preview workflow', () => {
        const store = useModelsStore.getState();
        const model = createMockModel({ id: 'preview-1', content: '<p>Model content</p>' });
        const insertFn = vi.fn();

        // 1. Set insert function from active editor
        store.setContextualInsertFn(insertFn);
        expect(useModelsStore.getState().contextualInsertFn).toBe(insertFn);

        // 2. Open model preview
        store.setPreviewingModel(model);
        expect(useModelsStore.getState().previewingModel).toEqual(model);

        // 3. Insert content from preview
        const storedFn = useModelsStore.getState().contextualInsertFn;
        storedFn?.(model.content);
        expect(insertFn).toHaveBeenCalledWith('<p>Model content</p>');

        // 4. Close preview
        useModelsStore.getState().setPreviewingModel(null);
        expect(useModelsStore.getState().previewingModel).toBeNull();

        // 5. Editor closed - clear contextual state
        useModelsStore.getState().clearContextualState();
        expect(useModelsStore.getState().contextualInsertFn).toBeNull();
      });

      it('should handle switching between models in preview', () => {
        const model1 = createMockModel({ id: 'model-1', title: 'First Model' });
        const model2 = createMockModel({ id: 'model-2', title: 'Second Model' });

        useModelsStore.getState().setPreviewingModel(model1);
        expect(useModelsStore.getState().previewingModel?.id).toBe('model-1');

        useModelsStore.getState().setPreviewingModel(model2);
        expect(useModelsStore.getState().previewingModel?.id).toBe('model-2');

        // Previous model should be completely replaced
        expect(useModelsStore.getState().previewingModel?.title).toBe('Second Model');
      });
    });
  });

});

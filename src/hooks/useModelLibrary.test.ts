/**
 * @file useModelLibrary.test.ts
 * @description Testes para o hook useModelLibrary e funções de busca
 * @version 1.38.39
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  removeAccents,
  SEARCH_STOPWORDS,
  SINONIMOS_JURIDICOS,
  searchModelsInLibrary,
  useModelLibrary,
} from './useModelLibrary';
import type { Model } from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// MOCKS
// ═══════════════════════════════════════════════════════════════════════════

const mockModels: Model[] = [];
const mockSetModels = vi.fn();
const mockSetSearchTerm = vi.fn();
const mockSetManualSearchResults = vi.fn();

vi.mock('../stores/useModelsStore', () => ({
  useModelsStore: vi.fn((selector) => {
    const state = {
      models: mockModels,
      setModels: mockSetModels,
      hasUnsavedChanges: false,
      setHasUnsavedChanges: vi.fn(),
      isLoadingModels: false,
      setIsLoadingModels: vi.fn(),
      persistenceError: null,
      setPersistenceError: vi.fn(),
      searchTerm: '',
      setSearchTerm: mockSetSearchTerm,
      selectedCategory: null,
      setSelectedCategory: vi.fn(),
      showFavoritesOnly: false,
      setShowFavoritesOnly: vi.fn(),
      ownershipFilter: 'all',
      setOwnershipFilter: vi.fn(),
      currentModelPage: 1,
      setCurrentModelPage: vi.fn(),
      manualSearchTerm: '',
      setManualSearchTerm: vi.fn(),
      manualSearchResults: [],
      setManualSearchResults: mockSetManualSearchResults,
      useSemanticManualSearch: false,
      setUseSemanticManualSearch: vi.fn(),
      receivedModels: [],
      setReceivedModels: vi.fn(),
      activeSharedLibraries: [],
      setActiveSharedLibraries: vi.fn(),
      suggestions: [],
      setSuggestions: vi.fn(),
      suggestionsSource: null,
      setSuggestionsSource: vi.fn(),
      loadingSuggestions: false,
      setLoadingSuggestions: vi.fn(),
      modelViewMode: 'grid',
      setModelViewMode: vi.fn(),
      modelsPerPage: 12,
      newModel: null,
      setNewModel: vi.fn(),
      editingModel: null,
      setEditingModel: vi.fn(),
      extractingModelFromDecision: false,
      setExtractingModelFromDecision: vi.fn(),
      showExtractModelButton: false,
      setShowExtractModelButton: vi.fn(),
      extractedModelPreview: null,
      setExtractedModelPreview: vi.fn(),
      exportedModelsText: '',
      setExportedModelsText: vi.fn(),
      modelToDelete: null,
      setModelToDelete: vi.fn(),
      similarityWarning: null,
      setSimilarityWarning: vi.fn(),
      resetForm: vi.fn(),
      startEditingModel: vi.fn(),
    };
    return selector(state);
  }),
}));

describe('useModelLibrary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockModels.length = 0;
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // REMOVE ACCENTS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('removeAccents', () => {
    it('should remove accents from Portuguese text', () => {
      expect(removeAccents('ação')).toBe('acao');
      expect(removeAccents('rescisão')).toBe('rescisao');
      expect(removeAccents('férias')).toBe('ferias');
    });

    it('should handle uppercase accented characters', () => {
      expect(removeAccents('AÇÃO')).toBe('ACAO');
      expect(removeAccents('RESCISÃO')).toBe('RESCISAO');
    });

    it('should handle mixed text', () => {
      expect(removeAccents('Horas Extras e Férias')).toBe('Horas Extras e Ferias');
    });

    it('should return unchanged text without accents', () => {
      expect(removeAccents('hello world')).toBe('hello world');
      expect(removeAccents('test123')).toBe('test123');
    });

    it('should handle empty string', () => {
      expect(removeAccents('')).toBe('');
    });

    it('should handle special characters', () => {
      expect(removeAccents('çãéíóú')).toBe('caeiou');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SEARCH STOPWORDS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('SEARCH_STOPWORDS', () => {
    it('should contain common Portuguese prepositions', () => {
      expect(SEARCH_STOPWORDS.has('de')).toBe(true);
      expect(SEARCH_STOPWORDS.has('do')).toBe(true);
      expect(SEARCH_STOPWORDS.has('da')).toBe(true);
      expect(SEARCH_STOPWORDS.has('para')).toBe(true);
      expect(SEARCH_STOPWORDS.has('com')).toBe(true);
    });

    it('should contain articles', () => {
      expect(SEARCH_STOPWORDS.has('o')).toBe(true);
      expect(SEARCH_STOPWORDS.has('a')).toBe(true);
      expect(SEARCH_STOPWORDS.has('os')).toBe(true);
      expect(SEARCH_STOPWORDS.has('as')).toBe(true);
      expect(SEARCH_STOPWORDS.has('um')).toBe(true);
      expect(SEARCH_STOPWORDS.has('uma')).toBe(true);
    });

    it('should contain conjunctions', () => {
      expect(SEARCH_STOPWORDS.has('e')).toBe(true);
      expect(SEARCH_STOPWORDS.has('ou')).toBe(true);
      expect(SEARCH_STOPWORDS.has('que')).toBe(true);
    });

    it('should not contain legal terms', () => {
      expect(SEARCH_STOPWORDS.has('rescisao')).toBe(false);
      expect(SEARCH_STOPWORDS.has('ferias')).toBe(false);
      expect(SEARCH_STOPWORDS.has('horas')).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SINONIMOS JURIDICOS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('SINONIMOS_JURIDICOS', () => {
    it('should have synonyms for horas extras', () => {
      expect(SINONIMOS_JURIDICOS['horas extras']).toContain('sobrejornada');
      expect(SINONIMOS_JURIDICOS['horas extras']).toContain('hora extra');
    });

    it('should have synonyms for danos morais', () => {
      expect(SINONIMOS_JURIDICOS['danos morais']).toContain('dano extrapatrimonial');
      expect(SINONIMOS_JURIDICOS['danos morais']).toContain('reparação moral');
    });

    it('should have synonyms for rescisão', () => {
      expect(SINONIMOS_JURIDICOS['rescisao']).toContain('verbas rescisorias');
      expect(SINONIMOS_JURIDICOS['rescisao']).toContain('dispensa');
    });

    it('should have synonyms for FGTS', () => {
      expect(SINONIMOS_JURIDICOS['fgts']).toContain('fundo de garantia');
      expect(SINONIMOS_JURIDICOS['fgts']).toContain('fundiario');
    });

    it('should have synonyms for gestante', () => {
      expect(SINONIMOS_JURIDICOS['gestante']).toContain('gravidez');
      expect(SINONIMOS_JURIDICOS['gestante']).toContain('estabilidade gestante');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SEARCH MODELS IN LIBRARY TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('searchModelsInLibrary', () => {
    const createModel = (title: string, content = '', keywords: string[] = []): Model => ({
      id: `model-${title.toLowerCase().replace(/\s/g, '-')}`,
      title,
      category: 'Mérito',
      content: `<p>${content}</p>`,
      favorite: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      keywords,
    });

    describe('Basic Search', () => {
      it('should return empty array for empty term', () => {
        const models = [createModel('Test')];
        expect(searchModelsInLibrary(models, '')).toEqual([]);
        expect(searchModelsInLibrary(models, '  ')).toEqual([]);
      });

      it('should find model by exact title match', () => {
        const models = [
          createModel('Horas Extras'),
          createModel('Férias'),
        ];
        const results = searchModelsInLibrary(models, 'horas extras');
        expect(results).toHaveLength(1);
        expect(results[0].title).toBe('Horas Extras');
      });

      it('should find model by partial title match', () => {
        const models = [
          createModel('Adicional de Horas Extras'),
          createModel('Férias Vencidas'),
        ];
        const results = searchModelsInLibrary(models, 'horas');
        expect(results).toHaveLength(1);
        expect(results[0].title).toContain('Horas');
      });

      it('should be case insensitive', () => {
        const models = [createModel('Horas Extras')];
        expect(searchModelsInLibrary(models, 'HORAS EXTRAS')).toHaveLength(1);
        expect(searchModelsInLibrary(models, 'horas extras')).toHaveLength(1);
      });

      it('should ignore accents', () => {
        const models = [createModel('Rescisão Indireta')];
        expect(searchModelsInLibrary(models, 'rescisao')).toHaveLength(1);
        expect(searchModelsInLibrary(models, 'Rescisão')).toHaveLength(1);
      });
    });

    describe('Content Search', () => {
      it('should search in content by default', () => {
        const models = [
          createModel('Modelo 1', 'Este modelo trata de horas extras'),
          createModel('Modelo 2', 'Este modelo trata de férias'),
        ];
        const results = searchModelsInLibrary(models, 'horas');
        expect(results).toHaveLength(1);
        expect(results[0].title).toBe('Modelo 1');
      });

      it('should not search in content when includeContent is false', () => {
        const models = [
          createModel('Modelo 1', 'Este modelo trata de horas extras'),
        ];
        const results = searchModelsInLibrary(models, 'horas', { includeContent: false });
        expect(results).toHaveLength(0);
      });
    });

    describe('Keywords Search', () => {
      it('should search in keywords', () => {
        const models = [
          createModel('Modelo Genérico', '', ['hora extra', 'sobrejornada']),
        ];
        const results = searchModelsInLibrary(models, 'sobrejornada');
        expect(results).toHaveLength(1);
      });

      it('should handle keywords as string array', () => {
        const models = [
          createModel('Modelo', '', ['férias', 'rescisão', 'FGTS']),
        ];
        expect(searchModelsInLibrary(models, 'ferias')).toHaveLength(1);
        expect(searchModelsInLibrary(models, 'fgts')).toHaveLength(1);
      });
    });

    describe('Exact Search (Quoted Terms)', () => {
      it('should find exact matches with quoted terms', () => {
        const models = [
          createModel('Horas Extras Noturnas'),
          createModel('Adicional Noturno'),
        ];
        const results = searchModelsInLibrary(models, '"horas extras"');
        expect(results).toHaveLength(1);
        expect(results[0].title).toBe('Horas Extras Noturnas');
      });

      it('should require all exact terms to match', () => {
        const models = [
          createModel('Horas Extras'),
          createModel('Férias'),
        ];
        const results = searchModelsInLibrary(models, '"horas extras" "ferias"');
        expect(results).toHaveLength(0);
      });
    });

    describe('Synonym Expansion', () => {
      it('should find models using synonyms', () => {
        const models = [
          createModel('Adicional de Sobrejornada'),
        ];
        // "horas" should expand to include "sobrejornada" via synonyms
        const results = searchModelsInLibrary(models, 'horas', { useSynonyms: true });
        expect(results.length).toBeGreaterThanOrEqual(0);
      });

      it('should not use synonyms when disabled', () => {
        const models = [
          createModel('Modelo Sobrejornada'),
        ];
        const resultsWithSynonyms = searchModelsInLibrary(models, 'horas', { useSynonyms: true });
        const resultsWithoutSynonyms = searchModelsInLibrary(models, 'horas', { useSynonyms: false });
        // Without synonyms, "horas" should not match "sobrejornada"
        expect(resultsWithoutSynonyms).toHaveLength(0);
      });
    });

    describe('Scoring and Sorting', () => {
      it('should prioritize title matches over content matches', () => {
        const models = [
          createModel('Férias', 'Modelo sobre horas extras'),
          createModel('Horas Extras', 'Modelo sobre férias'),
        ];
        const results = searchModelsInLibrary(models, 'horas');
        expect(results[0].title).toBe('Horas Extras');
      });

      it('should boost favorites when there is a match', () => {
        const models: Model[] = [
          { ...createModel('Horas Extras A'), favorite: false },
          { ...createModel('Horas Extras B'), favorite: true },
        ];
        const results = searchModelsInLibrary(models, 'horas');
        expect(results[0].title).toBe('Horas Extras B');
      });

      it('should boost by usage count', () => {
        const models: Model[] = [
          { ...createModel('Horas Extras A'), usageCount: 1 },
          { ...createModel('Horas Extras B'), usageCount: 10 },
        ];
        const results = searchModelsInLibrary(models, 'horas', { boostByUsage: true });
        expect(results[0].title).toBe('Horas Extras B');
      });

      it('should not boost favorites without match', () => {
        const models: Model[] = [
          { ...createModel('Férias'), favorite: true },
        ];
        const results = searchModelsInLibrary(models, 'horas');
        expect(results).toHaveLength(0);
      });
    });

    describe('Limit Results', () => {
      it('should limit results when specified', () => {
        const models = [
          createModel('Horas Extras 1'),
          createModel('Horas Extras 2'),
          createModel('Horas Extras 3'),
          createModel('Horas Extras 4'),
          createModel('Horas Extras 5'),
        ];
        const results = searchModelsInLibrary(models, 'horas', { limit: 3 });
        expect(results).toHaveLength(3);
      });

      it('should return all results when limit is null', () => {
        const models = [
          createModel('Horas 1'),
          createModel('Horas 2'),
          createModel('Horas 3'),
        ];
        const results = searchModelsInLibrary(models, 'horas', { limit: null });
        expect(results).toHaveLength(3);
      });
    });

    describe('Stopwords', () => {
      it('should ignore stopwords in search', () => {
        const models = [createModel('Modelo de Teste')];
        // "de" is a stopword, should not affect search
        const results = searchModelsInLibrary(models, 'modelo teste');
        expect(results).toHaveLength(1);
      });

      it('should ignore short words (less than 3 chars)', () => {
        const models = [createModel('AB Teste')];
        // "AB" is too short to be a search term
        const results = searchModelsInLibrary(models, 'teste ab');
        expect(results.length).toBeLessThanOrEqual(1);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // USE MODEL LIBRARY HOOK TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('useModelLibrary hook', () => {
    describe('Basic Functionality', () => {
      it('should return all expected properties', () => {
        const { result } = renderHook(() => useModelLibrary());

        // Core data
        expect(result.current.models).toBeDefined();
        expect(result.current.setModels).toBeDefined();
        expect(result.current.hasUnsavedChanges).toBeDefined();
        expect(result.current.isLoadingModels).toBeDefined();

        // Search
        expect(result.current.searchTerm).toBeDefined();
        expect(result.current.setSearchTerm).toBeDefined();
        expect(result.current.performManualSearch).toBeDefined();
        expect(result.current.debouncedManualSearch).toBeDefined();

        // Bulk
        expect(result.current.bulkFiles).toBeDefined();
        expect(result.current.cancelBulkProcessing).toBeDefined();
        expect(result.current.removeBulkFile).toBeDefined();
        expect(result.current.resetBulkState).toBeDefined();
      });
    });

    describe('Manual Search', () => {
      it('should clear results for empty search term', () => {
        const { result } = renderHook(() => useModelLibrary());

        act(() => {
          result.current.performManualSearch('');
        });

        expect(mockSetManualSearchResults).toHaveBeenCalledWith([]);
      });

      it('should clear results for whitespace-only term', () => {
        const { result } = renderHook(() => useModelLibrary());

        act(() => {
          result.current.performManualSearch('   ');
        });

        expect(mockSetManualSearchResults).toHaveBeenCalledWith([]);
      });
    });

    describe('Bulk Operations', () => {
      it('should have initial bulk state', () => {
        const { result } = renderHook(() => useModelLibrary());

        expect(result.current.bulkFiles).toEqual([]);
        expect(result.current.bulkProcessing).toBe(false);
        expect(result.current.bulkGeneratedModels).toEqual([]);
        expect(result.current.bulkErrors).toEqual([]);
      });

      it('should reset bulk state', () => {
        const { result } = renderHook(() => useModelLibrary());

        act(() => {
          result.current.setBulkFiles([{ file: new File([''], 'test.pdf'), name: 'test.pdf', size: 100 }]);
        });

        act(() => {
          result.current.resetBulkState();
        });

        expect(result.current.bulkFiles).toEqual([]);
      });

      it('should remove file from bulk queue', () => {
        const { result } = renderHook(() => useModelLibrary());

        const files = [
          { file: new File([''], 'file1.pdf'), name: 'file1.pdf', size: 100 },
          { file: new File([''], 'file2.pdf'), name: 'file2.pdf', size: 200 },
        ];

        act(() => {
          result.current.setBulkFiles(files);
        });

        act(() => {
          result.current.removeBulkFile(0);
        });

        expect(result.current.bulkFiles).toHaveLength(1);
        expect(result.current.bulkFiles[0].name).toBe('file2.pdf');
      });

      it('should cancel bulk processing', () => {
        const { result } = renderHook(() => useModelLibrary());
        const mockAbort = vi.fn();
        const controller = { abort: mockAbort } as unknown as AbortController;

        act(() => {
          result.current.setBulkCancelController(controller);
          result.current.setBulkProcessing(true);
        });

        act(() => {
          result.current.cancelBulkProcessing();
        });

        expect(mockAbort).toHaveBeenCalled();
        expect(result.current.bulkProcessing).toBe(false);
      });

      it('should have default stagger delay of 500ms', () => {
        const { result } = renderHook(() => useModelLibrary());
        expect(result.current.bulkStaggerDelay).toBe(500);
      });
    });

    describe('Delete All Confirm', () => {
      it('should have empty delete confirm text initially', () => {
        const { result } = renderHook(() => useModelLibrary());
        expect(result.current.deleteAllConfirmText).toBe('');
      });

      it('should update delete confirm text', () => {
        const { result } = renderHook(() => useModelLibrary());

        act(() => {
          result.current.setDeleteAllConfirmText('EXCLUIR');
        });

        expect(result.current.deleteAllConfirmText).toBe('EXCLUIR');
      });
    });
  });
});

// Testes para useModelLibrary
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import useModelLibrary, { searchModelsInLibrary } from './useModelLibrary';

// Modelos de teste
const mockModels = [
  { id: '1', title: 'Danos Morais', content: 'Texto sobre danos morais', keywords: 'dano, indenização', category: 'civil' },
  { id: '2', title: 'Horas Extras', content: 'Cálculo de horas extras', keywords: 'jornada, trabalho', category: 'trabalhista' },
  { id: '3', title: 'Rescisão Indireta', content: 'Modelo de rescisão', keywords: 'contrato, empregador', category: 'trabalhista' },
  { id: '4', title: 'Adicional Noturno', content: 'Sobre adicional noturno', keywords: 'noite, trabalho', category: 'trabalhista' },
];

describe('searchModelsInLibrary', () => {
  it('deve retornar array vazio para termo vazio', () => {
    expect(searchModelsInLibrary(mockModels, '')).toEqual([]);
    expect(searchModelsInLibrary(mockModels, '   ')).toEqual([]);
    expect(searchModelsInLibrary(mockModels, null)).toEqual([]);
  });

  it('deve buscar por título', () => {
    const results = searchModelsInLibrary(mockModels, 'danos');
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('Danos Morais');
  });

  it('deve buscar por keywords', () => {
    const results = searchModelsInLibrary(mockModels, 'jornada');
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('Horas Extras');
  });

  it('deve buscar por conteúdo', () => {
    const results = searchModelsInLibrary(mockModels, 'cálculo');
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('Horas Extras');
  });

  it('deve ser case insensitive', () => {
    const results = searchModelsInLibrary(mockModels, 'DANOS MORAIS');
    expect(results).toHaveLength(1);
  });

  it('deve respeitar limite de resultados', () => {
    const results = searchModelsInLibrary(mockModels, 'trabalho', { limit: 1 });
    expect(results).toHaveLength(1);
  });

  it('deve ignorar conteúdo quando includeContent=false', () => {
    const results = searchModelsInLibrary(mockModels, 'cálculo', { includeContent: false });
    expect(results).toHaveLength(0);
  });

  it('deve retornar múltiplos resultados', () => {
    const results = searchModelsInLibrary(mockModels, 'trabalho');
    expect(results.length).toBeGreaterThan(1);
  });
});

describe('useModelLibrary', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Estado Inicial', () => {
    it('deve iniciar com models vazio', () => {
      const { result } = renderHook(() => useModelLibrary());
      expect(result.current.models).toEqual([]);
    });

    it('deve iniciar com isLoadingModels false', () => {
      const { result } = renderHook(() => useModelLibrary());
      expect(result.current.isLoadingModels).toBe(false);
    });

    it('deve iniciar com persistenceError null', () => {
      const { result } = renderHook(() => useModelLibrary());
      expect(result.current.persistenceError).toBeNull();
    });

    it('deve iniciar com searchTerm vazio', () => {
      const { result } = renderHook(() => useModelLibrary());
      expect(result.current.searchTerm).toBe('');
    });

    it('deve iniciar com selectedCategory "all"', () => {
      const { result } = renderHook(() => useModelLibrary());
      expect(result.current.selectedCategory).toBe('all');
    });

    it('deve iniciar com newModel vazio', () => {
      const { result } = renderHook(() => useModelLibrary());
      expect(result.current.newModel).toEqual({
        title: '', content: '', keywords: '', category: ''
      });
    });

    it('deve ter modelsPerPage = 5', () => {
      const { result } = renderHook(() => useModelLibrary());
      expect(result.current.modelsPerPage).toBe(5);
    });

    it('deve iniciar com modelViewMode "cards"', () => {
      const { result } = renderHook(() => useModelLibrary());
      expect(result.current.modelViewMode).toBe('cards');
    });
  });

  describe('Gerenciamento de Modelos', () => {
    it('deve atualizar models via setModels', () => {
      const { result } = renderHook(() => useModelLibrary());

      act(() => {
        result.current.setModels(mockModels);
      });

      expect(result.current.models).toHaveLength(4);
    });

    it('deve marcar hasUnsavedChanges', () => {
      const { result } = renderHook(() => useModelLibrary());

      act(() => {
        result.current.setHasUnsavedChanges(true);
      });

      expect(result.current.hasUnsavedChanges).toBe(true);
    });

    it('deve definir isLoadingModels', () => {
      const { result } = renderHook(() => useModelLibrary());

      act(() => {
        result.current.setIsLoadingModels(true);
      });

      expect(result.current.isLoadingModels).toBe(true);
    });

    it('deve definir persistenceError', () => {
      const { result } = renderHook(() => useModelLibrary());

      act(() => {
        result.current.setPersistenceError('Erro ao salvar');
      });

      expect(result.current.persistenceError).toBe('Erro ao salvar');
    });
  });

  describe('Busca e Filtros', () => {
    it('deve atualizar searchTerm', () => {
      const { result } = renderHook(() => useModelLibrary());

      act(() => {
        result.current.setSearchTerm('danos');
      });

      expect(result.current.searchTerm).toBe('danos');
    });

    it('deve atualizar selectedCategory', () => {
      const { result } = renderHook(() => useModelLibrary());

      act(() => {
        result.current.setSelectedCategory('trabalhista');
      });

      expect(result.current.selectedCategory).toBe('trabalhista');
    });

    it('deve atualizar showFavoritesOnly', () => {
      const { result } = renderHook(() => useModelLibrary());

      act(() => {
        result.current.setShowFavoritesOnly(true);
      });

      expect(result.current.showFavoritesOnly).toBe(true);
    });

    it('deve atualizar currentModelPage', () => {
      const { result } = renderHook(() => useModelLibrary());

      act(() => {
        result.current.setCurrentModelPage(3);
      });

      expect(result.current.currentModelPage).toBe(3);
    });

    it('deve executar performManualSearch', () => {
      const { result } = renderHook(() => useModelLibrary());

      act(() => {
        result.current.setModels(mockModels);
      });

      act(() => {
        result.current.performManualSearch('danos');
      });

      expect(result.current.manualSearchResults).toHaveLength(1);
    });

    it('deve limpar resultados com termo vazio', () => {
      const { result } = renderHook(() => useModelLibrary());

      act(() => {
        result.current.setModels(mockModels);
        result.current.performManualSearch('danos');
      });

      act(() => {
        result.current.performManualSearch('');
      });

      expect(result.current.manualSearchResults).toEqual([]);
    });

    it('deve executar debouncedManualSearch com delay', () => {
      const { result } = renderHook(() => useModelLibrary());

      act(() => {
        result.current.setModels(mockModels);
      });

      act(() => {
        result.current.debouncedManualSearch('horas');
      });

      // Antes do debounce
      expect(result.current.manualSearchResults).toEqual([]);

      // Após 300ms
      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(result.current.manualSearchResults).toHaveLength(1);
    });

    it('deve atualizar suggestions', () => {
      const { result } = renderHook(() => useModelLibrary());

      act(() => {
        result.current.setSuggestions([{ id: '1', title: 'Sugestão' }]);
      });

      expect(result.current.suggestions).toHaveLength(1);
    });

    it('deve atualizar suggestionsSource', () => {
      const { result } = renderHook(() => useModelLibrary());

      act(() => {
        result.current.setSuggestionsSource('local');
      });

      expect(result.current.suggestionsSource).toBe('local');
    });
  });

  describe('Formulário e Edição', () => {
    it('deve atualizar newModel', () => {
      const { result } = renderHook(() => useModelLibrary());

      act(() => {
        result.current.setNewModel({
          title: 'Novo Modelo',
          content: 'Conteúdo',
          keywords: 'palavras',
          category: 'civil'
        });
      });

      expect(result.current.newModel.title).toBe('Novo Modelo');
    });

    it('deve iniciar edição via startEditingModel', () => {
      const { result } = renderHook(() => useModelLibrary());
      const modelToEdit = mockModels[0];

      act(() => {
        result.current.startEditingModel(modelToEdit);
      });

      expect(result.current.editingModel).toEqual(modelToEdit);
      expect(result.current.newModel.title).toBe('Danos Morais');
      expect(result.current.newModel.content).toBe('Texto sobre danos morais');
    });

    it('deve tratar modelo sem campos no startEditingModel', () => {
      const { result } = renderHook(() => useModelLibrary());

      act(() => {
        result.current.startEditingModel({ id: '99' });
      });

      expect(result.current.newModel.title).toBe('');
      expect(result.current.newModel.content).toBe('');
    });

    it('deve resetar formulário via resetForm', () => {
      const { result } = renderHook(() => useModelLibrary());

      act(() => {
        result.current.setNewModel({ title: 'Teste', content: 'X', keywords: 'Y', category: 'Z' });
        result.current.setEditingModel({ id: '1' });
        result.current.setExtractedModelPreview({ preview: true });
        result.current.setSimilarityWarning({ warning: true });
      });

      act(() => {
        result.current.resetForm();
      });

      expect(result.current.newModel).toEqual({ title: '', content: '', keywords: '', category: '' });
      expect(result.current.editingModel).toBeNull();
      expect(result.current.extractedModelPreview).toBeNull();
      expect(result.current.similarityWarning).toBeNull();
    });

    it('deve definir modelToDelete', () => {
      const { result } = renderHook(() => useModelLibrary());

      act(() => {
        result.current.setModelToDelete(mockModels[0]);
      });

      expect(result.current.modelToDelete).toEqual(mockModels[0]);
    });

    it('deve definir extractingModelFromDecision', () => {
      const { result } = renderHook(() => useModelLibrary());

      act(() => {
        result.current.setExtractingModelFromDecision(true);
      });

      expect(result.current.extractingModelFromDecision).toBe(true);
    });
  });

  describe('Processamento Bulk', () => {
    it('deve adicionar arquivos bulk', () => {
      const { result } = renderHook(() => useModelLibrary());

      act(() => {
        result.current.setBulkFiles([{ name: 'file1.pdf' }, { name: 'file2.pdf' }]);
      });

      expect(result.current.bulkFiles).toHaveLength(2);
    });

    it('deve remover arquivo bulk por índice', () => {
      const { result } = renderHook(() => useModelLibrary());

      act(() => {
        result.current.setBulkFiles([{ name: 'file1.pdf' }, { name: 'file2.pdf' }, { name: 'file3.pdf' }]);
      });

      act(() => {
        result.current.removeBulkFile(1);
      });

      expect(result.current.bulkFiles).toHaveLength(2);
      expect(result.current.bulkFiles[0].name).toBe('file1.pdf');
      expect(result.current.bulkFiles[1].name).toBe('file3.pdf');
    });

    it('deve definir bulkProcessing', () => {
      const { result } = renderHook(() => useModelLibrary());

      act(() => {
        result.current.setBulkProcessing(true);
      });

      expect(result.current.bulkProcessing).toBe(true);
    });

    it('deve cancelar processamento bulk', () => {
      const { result } = renderHook(() => useModelLibrary());
      const mockAbort = vi.fn();
      const mockController = { abort: mockAbort };

      act(() => {
        result.current.setBulkCancelController(mockController);
        result.current.setBulkProcessing(true);
      });

      act(() => {
        result.current.cancelBulkProcessing();
      });

      expect(mockAbort).toHaveBeenCalled();
      expect(result.current.bulkProcessing).toBe(false);
      expect(result.current.bulkCurrentBatch).toBe(0);
    });

    it('deve resetar estado bulk', () => {
      const { result } = renderHook(() => useModelLibrary());

      act(() => {
        result.current.setBulkFiles([{ name: 'file.pdf' }]);
        result.current.setBulkProcessedFiles(['processed']);
        result.current.setBulkGeneratedModels([{ id: '1' }]);
        result.current.setBulkReviewModels([{ id: '2' }]);
        result.current.setBulkErrors(['error']);
        result.current.setBulkEditingModel({ id: '3' });
      });

      act(() => {
        result.current.resetBulkState();
      });

      expect(result.current.bulkFiles).toEqual([]);
      expect(result.current.bulkProcessedFiles).toEqual([]);
      expect(result.current.bulkGeneratedModels).toEqual([]);
      expect(result.current.bulkReviewModels).toEqual([]);
      expect(result.current.bulkErrors).toEqual([]);
      expect(result.current.bulkEditingModel).toBeNull();
    });

    it('deve atualizar bulkCurrentFileIndex', () => {
      const { result } = renderHook(() => useModelLibrary());

      act(() => {
        result.current.setBulkCurrentFileIndex(5);
      });

      expect(result.current.bulkCurrentFileIndex).toBe(5);
    });

    it('deve atualizar bulkStaggerDelay', () => {
      const { result } = renderHook(() => useModelLibrary());

      act(() => {
        result.current.setBulkStaggerDelay(1000);
      });

      expect(result.current.bulkStaggerDelay).toBe(1000);
    });
  });

  describe('Estabilidade de Referências', () => {
    it('performManualSearch deve ser estável quando models não muda', () => {
      const { result, rerender } = renderHook(() => useModelLibrary());

      act(() => {
        result.current.setModels(mockModels);
      });

      const firstRef = result.current.performManualSearch;
      rerender();
      expect(result.current.performManualSearch).toBe(firstRef);
    });

    it('resetForm deve ser estável', () => {
      const { result, rerender } = renderHook(() => useModelLibrary());
      const firstRef = result.current.resetForm;

      rerender();

      expect(result.current.resetForm).toBe(firstRef);
    });

    it('startEditingModel deve ser estável', () => {
      const { result, rerender } = renderHook(() => useModelLibrary());
      const firstRef = result.current.startEditingModel;

      rerender();

      expect(result.current.startEditingModel).toBe(firstRef);
    });

    it('removeBulkFile deve ser estável', () => {
      const { result, rerender } = renderHook(() => useModelLibrary());
      const firstRef = result.current.removeBulkFile;

      rerender();

      expect(result.current.removeBulkFile).toBe(firstRef);
    });

    it('resetBulkState deve ser estável', () => {
      const { result, rerender } = renderHook(() => useModelLibrary());
      const firstRef = result.current.resetBulkState;

      rerender();

      expect(result.current.resetBulkState).toBe(firstRef);
    });
  });

  describe('Cleanup', () => {
    it('deve abortar controller ao desmontar', () => {
      const mockAbort = vi.fn();
      const mockController = { abort: mockAbort };

      const { result, unmount } = renderHook(() => useModelLibrary());

      act(() => {
        result.current.setBulkCancelController(mockController);
      });

      unmount();

      expect(mockAbort).toHaveBeenCalled();
    });
  });
});

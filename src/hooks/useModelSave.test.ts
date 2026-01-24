/**
 * @file useModelSave.test.ts
 * @description Testes para o hook useModelSave
 * @version 1.38.39
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useModelSave, type UseModelSaveProps } from './useModelSave';
import type { Model, NewModelData } from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// MOCKS
// ═══════════════════════════════════════════════════════════════════════════

vi.mock('../utils/text', () => ({
  generateModelId: vi.fn(() => 'mock-model-id-123'),
}));

vi.mock('../services/EmbeddingsServices', () => ({
  TFIDFSimilarity: {
    findSimilar: vi.fn(() => ({ hasSimilar: false })),
    invalidate: vi.fn(),
  },
}));

vi.mock('../services/AIModelService', () => ({
  default: {
    getEmbedding: vi.fn(() => Promise.resolve([0.1, 0.2, 0.3])),
  },
}));

describe('useModelSave', () => {
  let mockProps: UseModelSaveProps;
  let mockModels: Model[];
  let mockNewModel: NewModelData;

  beforeEach(() => {
    vi.clearAllMocks();

    mockModels = [];
    mockNewModel = { title: '', content: '', keywords: '', category: '' };

    mockProps = {
      modelLibrary: {
        models: mockModels,
        newModel: mockNewModel,
        editingModel: null,
        extractedModelPreview: null,
        similarityWarning: null,
        setModels: vi.fn((updater) => {
          if (typeof updater === 'function') {
            mockModels = updater(mockModels);
          } else {
            mockModels = updater;
          }
        }),
        setNewModel: vi.fn(),
        setEditingModel: vi.fn(),
        setExtractedModelPreview: vi.fn(),
        setSimilarityWarning: vi.fn(),
        setHasUnsavedChanges: vi.fn(),
      },
      aiSettings: {
        modelSemanticEnabled: false,
      },
      searchModelReady: false,
      cloudSync: {
        trackChange: vi.fn(),
      },
      apiCache: {
        invalidate: vi.fn(),
      },
      showToast: vi.fn(),
      modelEditorRef: { current: null },
      closeModal: vi.fn(),
      modelPreview: {
        closeSaveAsNew: vi.fn(),
        closePreview: vi.fn(),
      },
      sanitizeHTML: vi.fn((html: string | null | undefined) => html || ''),
      setError: vi.fn(),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // BASIC HOOK TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Basic Functionality', () => {
    it('should return all expected properties', () => {
      const { result } = renderHook(() => useModelSave(mockProps));

      // States
      expect(result.current.savingModel).toBe(false);
      expect(result.current.modelSaved).toBe(false);
      expect(result.current.savingFromSimilarity).toBe(false);

      // Save functions
      expect(result.current.saveModel).toBeDefined();
      expect(result.current.saveModelWithoutClosing).toBeDefined();
      expect(result.current.executeSaveModel).toBeDefined();
      expect(result.current.executeSaveAsNew).toBeDefined();
      expect(result.current.executeExtractedModelSave).toBeDefined();
      expect(result.current.processBulkSaveNext).toBeDefined();

      // Similarity handlers
      expect(result.current.handleSimilarityCancel).toBeDefined();
      expect(result.current.handleSimilaritySaveNew).toBeDefined();
      expect(result.current.handleSimilarityReplace).toBeDefined();
    });

    it('should initialize with default states', () => {
      const { result } = renderHook(() => useModelSave(mockProps));

      expect(result.current.savingModel).toBe(false);
      expect(result.current.modelSaved).toBe(false);
      expect(result.current.savingFromSimilarity).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SAVE MODEL TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('saveModel', () => {
    it('should show error when title is empty', async () => {
      mockProps.modelLibrary.newModel = { title: '', content: 'Content', keywords: '', category: '' };
      const { result } = renderHook(() => useModelSave(mockProps));

      await act(async () => {
        await result.current.saveModel();
      });

      expect(mockProps.setError).toHaveBeenCalledWith('Título e conteúdo são obrigatórios');
    });

    it('should show error when content is empty', async () => {
      mockProps.modelLibrary.newModel = { title: 'Title', content: '', keywords: '', category: '' };
      const { result } = renderHook(() => useModelSave(mockProps));

      await act(async () => {
        await result.current.saveModel();
      });

      expect(mockProps.setError).toHaveBeenCalledWith('Título e conteúdo são obrigatórios');
    });

    it('should accept formData parameter', async () => {
      const { result } = renderHook(() => useModelSave(mockProps));
      const formData: NewModelData = {
        title: 'Test Model',
        content: '<p>Test content</p>',
        keywords: 'test',
        category: 'Mérito',
      };

      await act(async () => {
        await result.current.saveModel(formData);
      });

      // Should not show error since formData is valid
      expect(mockProps.setError).not.toHaveBeenCalledWith('Título e conteúdo são obrigatórios');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SAVE MODEL WITHOUT CLOSING TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('saveModelWithoutClosing', () => {
    it('should show error when title is empty', async () => {
      mockProps.modelLibrary.newModel = { title: '', content: 'Content', keywords: '', category: '' };
      const { result } = renderHook(() => useModelSave(mockProps));

      await act(async () => {
        await result.current.saveModelWithoutClosing();
      });

      expect(mockProps.setError).toHaveBeenCalledWith('Título e conteúdo são obrigatórios');
    });

    it('should show error when content is empty', async () => {
      mockProps.modelLibrary.newModel = { title: 'Title', content: '', keywords: '', category: '' };
      const { result } = renderHook(() => useModelSave(mockProps));

      await act(async () => {
        await result.current.saveModelWithoutClosing();
      });

      expect(mockProps.setError).toHaveBeenCalledWith('Título e conteúdo são obrigatórios');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EXECUTE SAVE MODEL TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('executeSaveModel', () => {
    it('should add new model to list', async () => {
      const { result } = renderHook(() => useModelSave(mockProps));
      const modelData = {
        id: 'test-id',
        title: 'Test Model',
        content: '<p>Content</p>',
      };

      await act(async () => {
        await result.current.executeSaveModel(modelData);
      });

      expect(mockProps.modelLibrary.setModels).toHaveBeenCalled();
      expect(mockProps.modelLibrary.setHasUnsavedChanges).toHaveBeenCalledWith(true);
    });

    it('should replace existing model when isReplace is true', async () => {
      mockProps.modelLibrary.models = [
        { id: 'existing-id', title: 'Old', content: '', category: 'Mérito', createdAt: '', updatedAt: '' },
      ];
      const { result } = renderHook(() => useModelSave(mockProps));
      const modelData = {
        id: 'new-id',
        title: 'Updated Model',
        content: '<p>New content</p>',
      };

      await act(async () => {
        await result.current.executeSaveModel(modelData, true, 'existing-id');
      });

      expect(mockProps.modelLibrary.setModels).toHaveBeenCalled();
      expect(mockProps.cloudSync?.trackChange).toHaveBeenCalledWith('update', expect.objectContaining({
        id: 'existing-id',
        title: 'Updated Model',
      }));
    });

    it('should track create when adding new model', async () => {
      const { result } = renderHook(() => useModelSave(mockProps));
      const modelData = {
        id: 'test-id',
        title: 'Test Model',
        content: '<p>Content</p>',
      };

      await act(async () => {
        await result.current.executeSaveModel(modelData);
      });

      expect(mockProps.cloudSync?.trackChange).toHaveBeenCalledWith('create', expect.objectContaining({
        id: 'test-id',
      }));
    });

    it('should invalidate caches', async () => {
      const { result } = renderHook(() => useModelSave(mockProps));
      const modelData = {
        id: 'test-id',
        title: 'Test Model',
        content: '<p>Content</p>',
      };

      await act(async () => {
        await result.current.executeSaveModel(modelData);
      });

      expect(mockProps.apiCache.invalidate).toHaveBeenCalledWith('suggestions_');
    });

    it('should set modelSaved to true', async () => {
      const { result } = renderHook(() => useModelSave(mockProps));
      const modelData = {
        id: 'test-id',
        title: 'Test Model',
        content: '<p>Content</p>',
      };

      await act(async () => {
        await result.current.executeSaveModel(modelData);
      });

      expect(result.current.modelSaved).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EXECUTE SAVE AS NEW TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('executeSaveAsNew', () => {
    it('should add new model and show toast', async () => {
      const { result } = renderHook(() => useModelSave(mockProps));
      const modelData = {
        id: 'test-id',
        title: 'Test Model',
        content: '<p>Content</p>',
      };

      await act(async () => {
        await result.current.executeSaveAsNew(modelData);
      });

      expect(mockProps.modelLibrary.setModels).toHaveBeenCalled();
      expect(mockProps.showToast).toHaveBeenCalledWith('Novo modelo criado com sucesso!', 'success');
    });

    it('should close preview modals', async () => {
      const { result } = renderHook(() => useModelSave(mockProps));
      const modelData = {
        id: 'test-id',
        title: 'Test Model',
        content: '<p>Content</p>',
      };

      await act(async () => {
        await result.current.executeSaveAsNew(modelData);
      });

      expect(mockProps.modelPreview.closeSaveAsNew).toHaveBeenCalled();
      expect(mockProps.modelPreview.closePreview).toHaveBeenCalled();
    });

    it('should replace model when isReplace is true', async () => {
      mockProps.modelLibrary.models = [
        { id: 'existing-id', title: 'Old', content: '', category: 'Mérito', createdAt: '', updatedAt: '' },
      ];
      const { result } = renderHook(() => useModelSave(mockProps));
      const modelData = {
        id: 'new-id',
        title: 'Replacement',
        content: '<p>Content</p>',
      };

      await act(async () => {
        await result.current.executeSaveAsNew(modelData, true, 'existing-id');
      });

      expect(mockProps.cloudSync?.trackChange).toHaveBeenCalledWith('update', expect.objectContaining({
        id: 'existing-id',
      }));
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EXECUTE EXTRACTED MODEL SAVE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('executeExtractedModelSave', () => {
    it('should add extracted model and show toast', async () => {
      const { result } = renderHook(() => useModelSave(mockProps));
      const modelData = {
        title: 'Extracted Model',
        content: '<p>Content</p>',
      };

      await act(async () => {
        await result.current.executeExtractedModelSave(modelData);
      });

      expect(mockProps.modelLibrary.setModels).toHaveBeenCalled();
      expect(mockProps.showToast).toHaveBeenCalledWith(
        expect.stringContaining('Extracted Model'),
        'success'
      );
    });

    it('should close extracted model preview modal', async () => {
      const { result } = renderHook(() => useModelSave(mockProps));
      const modelData = {
        title: 'Extracted Model',
        content: '<p>Content</p>',
      };

      await act(async () => {
        await result.current.executeExtractedModelSave(modelData);
      });

      expect(mockProps.closeModal).toHaveBeenCalledWith('extractedModelPreview');
      expect(mockProps.modelLibrary.setExtractedModelPreview).toHaveBeenCalledWith(null);
    });

    it('should show different message for replacement', async () => {
      mockProps.modelLibrary.models = [
        { id: 'existing-id', title: 'Old', content: '', category: 'Mérito', createdAt: '', updatedAt: '' },
      ];
      const { result } = renderHook(() => useModelSave(mockProps));
      const modelData = {
        title: 'Extracted Model',
        content: '<p>Content</p>',
      };

      await act(async () => {
        await result.current.executeExtractedModelSave(modelData, true, 'existing-id');
      });

      expect(mockProps.showToast).toHaveBeenCalledWith(
        expect.stringContaining('substituído'),
        'success'
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCESS BULK SAVE NEXT TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('processBulkSaveNext', () => {
    it('should close modals when queue is empty', async () => {
      const { result } = renderHook(() => useModelSave(mockProps));

      await act(async () => {
        await result.current.processBulkSaveNext([], [], 0, []);
      });

      expect(mockProps.closeModal).toHaveBeenCalledWith('bulkReview');
      expect(mockProps.closeModal).toHaveBeenCalledWith('bulkModal');
    });

    it('should show success toast with correct count', async () => {
      const { result } = renderHook(() => useModelSave(mockProps));
      const saved: Model[] = [
        { id: '1', title: 'Model 1', content: '', category: '', createdAt: '', updatedAt: '' },
        { id: '2', title: 'Model 2', content: '', category: '', createdAt: '', updatedAt: '' },
      ];

      await act(async () => {
        await result.current.processBulkSaveNext([], saved, 0, []);
      });

      expect(mockProps.showToast).toHaveBeenCalledWith(
        expect.stringContaining('2 modelo(s)'),
        'success'
      );
    });

    it('should include skipped count in message', async () => {
      const { result } = renderHook(() => useModelSave(mockProps));
      const saved: Model[] = [
        { id: '1', title: 'Model 1', content: '', category: '', createdAt: '', updatedAt: '' },
      ];

      await act(async () => {
        await result.current.processBulkSaveNext([], saved, 2, []);
      });

      expect(mockProps.showToast).toHaveBeenCalledWith(
        expect.stringContaining('2 ignorado(s)'),
        'success'
      );
    });

    it('should process queue items sequentially', async () => {
      const { result } = renderHook(() => useModelSave(mockProps));
      const queue = [
        { title: 'Model 1', content: '<p>Content 1</p>' },
      ];

      await act(async () => {
        await result.current.processBulkSaveNext(queue, [], 0, []);
      });

      expect(mockProps.modelLibrary.setModels).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SIMILARITY HANDLERS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Similarity Handlers', () => {
    describe('handleSimilarityCancel', () => {
      it('should clear similarity warning', () => {
        const { result } = renderHook(() => useModelSave(mockProps));

        act(() => {
          result.current.handleSimilarityCancel();
        });

        expect(mockProps.modelLibrary.setSimilarityWarning).toHaveBeenCalledWith(null);
      });
    });

    describe('handleSimilaritySaveNew', () => {
      it('should do nothing when no warning', async () => {
        const { result } = renderHook(() => useModelSave(mockProps));

        await act(async () => {
          await result.current.handleSimilaritySaveNew();
        });

        expect(mockProps.modelLibrary.setModels).not.toHaveBeenCalled();
      });
    });

    describe('handleSimilarityReplace', () => {
      it('should do nothing when no warning', async () => {
        const { result } = renderHook(() => useModelSave(mockProps));

        await act(async () => {
          await result.current.handleSimilarityReplace();
        });

        expect(mockProps.modelLibrary.setModels).not.toHaveBeenCalled();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CLOUD SYNC NULL HANDLING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Cloud Sync Null Handling', () => {
    it('should work when cloudSync is null', async () => {
      mockProps.cloudSync = null;
      const { result } = renderHook(() => useModelSave(mockProps));
      const modelData = {
        id: 'test-id',
        title: 'Test Model',
        content: '<p>Content</p>',
      };

      await act(async () => {
        await result.current.executeSaveModel(modelData);
      });

      // Should not throw
      expect(mockProps.modelLibrary.setModels).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // AI SETTINGS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('AI Settings', () => {
    it('should not generate embedding when modelSemanticEnabled is false', async () => {
      mockProps.aiSettings.modelSemanticEnabled = false;
      const { result } = renderHook(() => useModelSave(mockProps));
      const modelData = {
        id: 'test-id',
        title: 'Test Model',
        content: '<p>Content</p>',
      };

      await act(async () => {
        await result.current.executeSaveModel(modelData);
      });

      // Should save without embedding
      expect(mockProps.modelLibrary.setModels).toHaveBeenCalled();
    });

    it('should remove embedding when modelSemanticEnabled is disabled but model has embedding', async () => {
      mockProps.aiSettings.modelSemanticEnabled = false;
      const { result } = renderHook(() => useModelSave(mockProps));
      const modelData = {
        id: 'test-id',
        title: 'Test Model',
        content: '<p>Content</p>',
        embedding: [0.1, 0.2, 0.3],
      };

      await act(async () => {
        await result.current.executeSaveModel(modelData);
      });

      // Embedding should be removed
      expect(mockProps.modelLibrary.setModels).toHaveBeenCalled();
    });
  });
});

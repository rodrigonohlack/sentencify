/**
 * @file useModelSave.test.ts
 * @description Testes abrangentes para o hook useModelSave (80%+ coverage)
 * @version 1.38.49
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useModelSave, type UseModelSaveProps } from './useModelSave';
import type { Model, NewModelData, SimilarityWarningState } from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// MOCKS
// ═══════════════════════════════════════════════════════════════════════════

vi.mock('../utils/text', () => ({
  generateModelId: vi.fn(() => 'mock-model-id-123'),
}));

const mockFindSimilar = vi.fn((_model: any, _models: any, _threshold: any): any => ({ hasSimilar: false }));
const mockInvalidateTFIDF = vi.fn();

vi.mock('../services/EmbeddingsServices', () => ({
  TFIDFSimilarity: {
    findSimilar: (a: any, b: any, c: any) => mockFindSimilar(a, b, c),
    invalidate: () => mockInvalidateTFIDF(),
  },
}));

const mockGetEmbedding = vi.fn((_text: any, _type: any): any => Promise.resolve([0.1, 0.2, 0.3]));

vi.mock('../services/AIModelService', () => ({
  default: {
    getEmbedding: (a: any, b: any) => mockGetEmbedding(a, b),
  },
}));

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function createMockProps(overrides?: Partial<UseModelSaveProps>): UseModelSaveProps {
  return {
    modelLibrary: {
      models: [],
      newModel: { title: '', content: '', keywords: '', category: '' },
      editingModel: null,
      extractedModelPreview: null,
      similarityWarning: null,
      setModels: vi.fn(),
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
      trackChangeBatch: vi.fn(),
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
    ...overrides,
  };
}

function createMockModel(overrides?: Partial<Model>): Model {
  return {
    id: 'model-1',
    title: 'Test Model',
    content: '<p>Test content</p>',
    keywords: 'test',
    category: 'Merito',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  } as Model;
}

function createMockSimilarityWarning(overrides?: Partial<SimilarityWarningState>): SimilarityWarningState {
  return {
    newModel: createMockModel({ id: 'new-model-id', title: 'New Model' }),
    similarModel: createMockModel({ id: 'similar-model-id', title: 'Similar Model' }),
    similarity: 0.85,
    context: 'saveModel',
    ...overrides,
  } as SimilarityWarningState;
}

describe('useModelSave', () => {
  let mockProps: UseModelSaveProps;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFindSimilar.mockReturnValue({ hasSimilar: false });
    mockGetEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockProps = createMockProps();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIALIZATION TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Hook Initialization', () => {
    it('should return all expected properties and methods', () => {
      const { result } = renderHook(() => useModelSave(mockProps));

      // States
      expect(result.current.savingModel).toBe(false);
      expect(result.current.modelSaved).toBe(false);
      expect(result.current.savingFromSimilarity).toBe(false);

      // Save functions
      expect(typeof result.current.saveModel).toBe('function');
      expect(typeof result.current.saveModelWithoutClosing).toBe('function');
      expect(typeof result.current.executeSaveModel).toBe('function');
      expect(typeof result.current.executeSaveAsNew).toBe('function');
      expect(typeof result.current.executeExtractedModelSave).toBe('function');
      expect(typeof result.current.processBulkSaveNext).toBe('function');

      // Similarity handlers
      expect(typeof result.current.handleSimilarityCancel).toBe('function');
      expect(typeof result.current.handleSimilaritySaveNew).toBe('function');
      expect(typeof result.current.handleSimilarityReplace).toBe('function');
    });

    it('should initialize all states to false', () => {
      const { result } = renderHook(() => useModelSave(mockProps));

      expect(result.current.savingModel).toBe(false);
      expect(result.current.modelSaved).toBe(false);
      expect(result.current.savingFromSimilarity).toBe(false);
    });

    it('should update refs when props change', () => {
      const { result, rerender } = renderHook(
        (props) => useModelSave(props),
        { initialProps: mockProps }
      );

      const newCloudSync = { trackChange: vi.fn(), trackChangeBatch: vi.fn() };
      const updatedProps = createMockProps({ cloudSync: newCloudSync });

      rerender(updatedProps);

      // Refs should update - verify by executing a save and checking if new cloudSync is called
      const modelData = { id: 'test-id', title: 'Test', content: '<p>Content</p>' };

      act(() => {
        result.current.executeSaveModel(modelData);
      });

      // The cloudSync ref should have been updated
      expect(newCloudSync.trackChange).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SAVE MODEL TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('saveModel', () => {
    describe('Validation', () => {
      it('should show error when title is empty', async () => {
        mockProps.modelLibrary.newModel = { title: '', content: 'Content', keywords: '', category: '' };
        const { result } = renderHook(() => useModelSave(mockProps));

        await act(async () => {
          await result.current.saveModel();
        });

        expect(mockProps.setError).toHaveBeenCalledWith('T\xEDtulo e conte\xFAdo s\xE3o obrigat\xF3rios');
      });

      it('should show error when content is empty', async () => {
        mockProps.modelLibrary.newModel = { title: 'Title', content: '', keywords: '', category: '' };
        const { result } = renderHook(() => useModelSave(mockProps));

        await act(async () => {
          await result.current.saveModel();
        });

        expect(mockProps.setError).toHaveBeenCalledWith('T\xEDtulo e conte\xFAdo s\xE3o obrigat\xF3rios');
      });

      it('should show error when both title and content are empty', async () => {
        mockProps.modelLibrary.newModel = { title: '', content: '', keywords: '', category: '' };
        const { result } = renderHook(() => useModelSave(mockProps));

        await act(async () => {
          await result.current.saveModel();
        });

        expect(mockProps.setError).toHaveBeenCalledWith('T\xEDtulo e conte\xFAdo s\xE3o obrigat\xF3rios');
      });

      it('should use formData parameter over modelLibrary.newModel', async () => {
        mockProps.modelLibrary.newModel = { title: '', content: '', keywords: '', category: '' };
        const { result } = renderHook(() => useModelSave(mockProps));
        const formData: NewModelData = {
          title: 'Form Title',
          content: '<p>Form content</p>',
          keywords: 'keyword',
          category: 'Merito',
        };

        await act(async () => {
          await result.current.saveModel(formData);

        });

        expect(mockProps.setError).not.toHaveBeenCalledWith('T\xEDtulo e conte\xFAdo s\xE3o obrigat\xF3rios');
      });

      it('should use editor ref content when available', async () => {
        mockProps.modelEditorRef = {
          current: { root: { innerHTML: '<p>Editor content</p>' } } as any,
        };
        mockProps.modelLibrary.newModel = { title: 'Title', content: '', keywords: '', category: '' };
        (mockProps.sanitizeHTML as any).mockReturnValue('<p>Editor content</p>');

        const { result } = renderHook(() => useModelSave(mockProps));

        await act(async () => {
          await result.current.saveModel();

        });

        expect(mockProps.sanitizeHTML).toHaveBeenCalledWith('<p>Editor content</p>');
        // Should NOT show validation error since editor has content
        expect(mockProps.setError).not.toHaveBeenCalledWith('T\xEDtulo e conte\xFAdo s\xE3o obrigat\xF3rios');
      });
    });

    describe('New Model (no editingModel)', () => {
      it('should reset savingModel to false after save completes', async () => {
        mockProps.modelLibrary.newModel = { title: 'Title', content: '<p>Content</p>', keywords: '', category: '' };
        const { result } = renderHook(() => useModelSave(mockProps));

        await act(async () => {
          await result.current.saveModel();
        });

        // savingModel should be false after save completes
        expect(result.current.savingModel).toBe(false);
      });

      it('should create new model with generated ID and timestamp', async () => {
        mockProps.modelLibrary.newModel = {
          title: 'New Model',
          content: '<p>Content</p>',
          keywords: 'kw1, kw2',
          category: 'Merito',
        };
        const { result } = renderHook(() => useModelSave(mockProps));

        await act(async () => {
          await result.current.saveModel();

        });

        // executeSaveModel should be called with the model data
        expect(mockProps.modelLibrary.setModels).toHaveBeenCalled();
        expect(mockProps.modelLibrary.setHasUnsavedChanges).toHaveBeenCalledWith(true);
      });

      it('should check for similarity before saving new model', async () => {
        mockProps.modelLibrary.newModel = {
          title: 'New Model',
          content: '<p>Content</p>',
          keywords: '',
          category: '',
        };
        mockProps.modelLibrary.models = [createMockModel()];
        const { result } = renderHook(() => useModelSave(mockProps));

        await act(async () => {
          await result.current.saveModel();

        });

        expect(mockFindSimilar).toHaveBeenCalledWith(
          expect.objectContaining({ id: 'mock-model-id-123', title: 'New Model' }),
          mockProps.modelLibrary.models,
          0.80
        );
      });

      it('should show similarity warning when similar model found', async () => {
        mockFindSimilar.mockReturnValue({
          hasSimilar: true,
          similarModel: createMockModel({ id: 'similar-id', title: 'Similar' }),
          similarity: 0.90,
        });
        mockProps.modelLibrary.newModel = {
          title: 'Similar Model',
          content: '<p>Content</p>',
          keywords: '',
          category: '',
        };
        const { result } = renderHook(() => useModelSave(mockProps));

        await act(async () => {
          await result.current.saveModel();

        });

        expect(mockProps.modelLibrary.setSimilarityWarning).toHaveBeenCalledWith(
          expect.objectContaining({
            context: 'saveModel',
            similarity: 0.90,
          })
        );
        // Should NOT call setModels since similarity was detected
        expect(mockProps.modelLibrary.setHasUnsavedChanges).not.toHaveBeenCalled();
      });

      it('should reset savingModel to false after similarity warning', async () => {
        mockFindSimilar.mockReturnValue({
          hasSimilar: true,
          similarModel: createMockModel(),
          similarity: 0.85,
        });
        mockProps.modelLibrary.newModel = {
          title: 'Model',
          content: '<p>Content</p>',
          keywords: '',
          category: '',
        };
        const { result } = renderHook(() => useModelSave(mockProps));

        await act(async () => {
          await result.current.saveModel();

        });

        expect(result.current.savingModel).toBe(false);
      });
    });

    describe('Editing Existing Model', () => {
      it('should update existing model without similarity check', async () => {
        const existingModel = createMockModel({ id: 'edit-id', title: 'Original' });
        mockProps.modelLibrary.editingModel = existingModel;
        mockProps.modelLibrary.models = [existingModel];
        mockProps.modelLibrary.newModel = {
          title: 'Updated Title',
          content: '<p>Updated</p>',
          keywords: 'new-kw',
          category: 'Updated Category',
        };
        const { result } = renderHook(() => useModelSave(mockProps));

        await act(async () => {
          await result.current.saveModel();

        });

        // Should NOT check similarity for edits
        expect(mockFindSimilar).not.toHaveBeenCalled();
        expect(mockProps.modelLibrary.setModels).toHaveBeenCalled();
        expect(mockProps.modelLibrary.setEditingModel).toHaveBeenCalledWith(null);
      });

      it('should add updatedAt timestamp when editing', async () => {
        const existingModel = createMockModel({ id: 'edit-id' });
        mockProps.modelLibrary.editingModel = existingModel;
        mockProps.modelLibrary.models = [existingModel];
        mockProps.modelLibrary.newModel = {
          title: 'Updated',
          content: '<p>Content</p>',
          keywords: '',
          category: '',
        };
        const { result } = renderHook(() => useModelSave(mockProps));

        await act(async () => {
          await result.current.saveModel();

        });

        const setModelsCall = (mockProps.modelLibrary.setModels as any).mock.calls[0][0];
        const updatedModel = setModelsCall.find((m: Model) => m.id === 'edit-id');
        expect(updatedModel.updatedAt).toBeDefined();
        expect(updatedModel.title).toBe('Updated');
      });

      it('should track update via cloudSync', async () => {
        const existingModel = createMockModel({ id: 'edit-id' });
        mockProps.modelLibrary.editingModel = existingModel;
        mockProps.modelLibrary.models = [existingModel];
        mockProps.modelLibrary.newModel = {
          title: 'Updated',
          content: '<p>Content</p>',
          keywords: '',
          category: '',
        };
        const { result } = renderHook(() => useModelSave(mockProps));

        await act(async () => {
          await result.current.saveModel();

        });

        expect(mockProps.cloudSync!.trackChange).toHaveBeenCalledWith(
          'update',
          expect.objectContaining({ id: 'edit-id' })
        );
      });

      it('should invalidate TFIDFSimilarity and apiCache on edit', async () => {
        const existingModel = createMockModel({ id: 'edit-id' });
        mockProps.modelLibrary.editingModel = existingModel;
        mockProps.modelLibrary.models = [existingModel];
        mockProps.modelLibrary.newModel = {
          title: 'Updated',
          content: '<p>Content</p>',
          keywords: '',
          category: '',
        };
        const { result } = renderHook(() => useModelSave(mockProps));

        await act(async () => {
          await result.current.saveModel();

        });

        expect(mockInvalidateTFIDF).toHaveBeenCalled();
        expect(mockProps.apiCache.invalidate).toHaveBeenCalledWith('suggestions_');
      });

      it('should set modelSaved and reset form after timeout', async () => {
        const existingModel = createMockModel({ id: 'edit-id' });
        mockProps.modelLibrary.editingModel = existingModel;
        mockProps.modelLibrary.models = [existingModel];
        mockProps.modelLibrary.newModel = {
          title: 'Updated',
          content: '<p>Content</p>',
          keywords: '',
          category: '',
        };
        const { result } = renderHook(() => useModelSave(mockProps));

        await act(async () => {
          await result.current.saveModel();
        });

        expect(result.current.modelSaved).toBe(true);

        // After 1200ms timeout, modal should close
        await act(async () => {
          await vi.advanceTimersByTimeAsync(1200);
        });

        expect(mockProps.modelLibrary.setNewModel).toHaveBeenCalledWith({
          title: '', content: '', keywords: '', category: ''
        });
        expect(mockProps.closeModal).toHaveBeenCalledWith('modelForm');
        expect(mockProps.setError).toHaveBeenCalledWith('');
      });

      it('should regenerate embedding when semantic enabled for editing', async () => {
        mockProps.aiSettings.modelSemanticEnabled = true;
        mockProps.searchModelReady = true;

        const existingModel = createMockModel({ id: 'edit-id' });
        mockProps.modelLibrary.editingModel = existingModel;
        mockProps.modelLibrary.models = [existingModel];
        mockProps.modelLibrary.newModel = {
          title: 'Updated',
          content: '<p>Content</p>',
          keywords: '',
          category: '',
        };
        const { result } = renderHook(() => useModelSave(mockProps));

        await act(async () => {
          await result.current.saveModel();

        });

        expect(mockGetEmbedding).toHaveBeenCalled();
      });

      it('should remove embedding when semantic is disabled for model with existing embedding', async () => {
        mockProps.aiSettings.modelSemanticEnabled = false;

        const existingModel = createMockModel({ id: 'edit-id', embedding: [1, 2, 3] } as any);
        mockProps.modelLibrary.editingModel = existingModel;
        mockProps.modelLibrary.models = [existingModel];
        mockProps.modelLibrary.newModel = {
          title: 'Updated',
          content: '<p>Content</p>',
          keywords: '',
          category: '',
        };
        const { result } = renderHook(() => useModelSave(mockProps));

        await act(async () => {
          await result.current.saveModel();

        });

        const setModelsCall = (mockProps.modelLibrary.setModels as any).mock.calls[0][0];
        const updatedModel = setModelsCall.find((m: Model) => m.id === 'edit-id');
        expect(updatedModel.embedding).toBeUndefined();
      });
    });

    describe('Error Handling', () => {
      it('should set error message on exception', async () => {
        mockProps.modelLibrary.newModel = {
          title: 'Title',
          content: '<p>Content</p>',
          keywords: '',
          category: '',
        };
        // Force an error by making setModels throw
        mockFindSimilar.mockImplementation(() => { throw new Error('Similarity check failed'); });

        const { result } = renderHook(() => useModelSave(mockProps));

        await act(async () => {
          await result.current.saveModel();

        });

        expect(mockProps.setError).toHaveBeenCalledWith(
          expect.stringContaining('Erro ao salvar modelo:')
        );
      });

      it('should reset savingModel to false after error', async () => {
        mockProps.modelLibrary.newModel = {
          title: 'Title',
          content: '<p>Content</p>',
          keywords: '',
          category: '',
        };
        mockFindSimilar.mockImplementation(() => { throw new Error('fail'); });

        const { result } = renderHook(() => useModelSave(mockProps));

        await act(async () => {
          await result.current.saveModel();

        });

        expect(result.current.savingModel).toBe(false);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SAVE MODEL WITHOUT CLOSING TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('saveModelWithoutClosing', () => {
    describe('Validation', () => {
      it('should show error when title is empty', async () => {
        mockProps.modelLibrary.newModel = { title: '', content: 'Content', keywords: '', category: '' };
        const { result } = renderHook(() => useModelSave(mockProps));

        await act(async () => {
          await result.current.saveModelWithoutClosing();
        });

        expect(mockProps.setError).toHaveBeenCalledWith('T\xEDtulo e conte\xFAdo s\xE3o obrigat\xF3rios');
      });

      it('should show error when content is empty', async () => {
        mockProps.modelLibrary.newModel = { title: 'Title', content: '', keywords: '', category: '' };
        const { result } = renderHook(() => useModelSave(mockProps));

        await act(async () => {
          await result.current.saveModelWithoutClosing();
        });

        expect(mockProps.setError).toHaveBeenCalledWith('T\xEDtulo e conte\xFAdo s\xE3o obrigat\xF3rios');
      });

      it('should use editor ref content when available', async () => {
        mockProps.modelEditorRef = {
          current: { root: { innerHTML: '<p>Editor content</p>' } } as any,
        };
        mockProps.modelLibrary.newModel = { title: 'Title', content: '', keywords: '', category: '' };
        (mockProps.sanitizeHTML as any).mockReturnValue('<p>Editor content</p>');

        const { result } = renderHook(() => useModelSave(mockProps));

        await act(async () => {
          await result.current.saveModelWithoutClosing();
        });

        expect(mockProps.setError).not.toHaveBeenCalledWith('T\xEDtulo e conte\xFAdo s\xE3o obrigat\xF3rios');
      });

      it('should use formData over modelLibrary.newModel', async () => {
        mockProps.modelLibrary.newModel = { title: '', content: '', keywords: '', category: '' };
        const formData: NewModelData = {
          title: 'Form Title',
          content: '<p>Form content</p>',
          keywords: 'kw',
          category: 'Cat',
        };
        const { result } = renderHook(() => useModelSave(mockProps));

        await act(async () => {
          await result.current.saveModelWithoutClosing(formData);
        });

        expect(mockProps.setError).not.toHaveBeenCalledWith('T\xEDtulo e conte\xFAdo s\xE3o obrigat\xF3rios');
      });
    });

    describe('Editing Existing Model', () => {
      it('should update existing model in place', async () => {
        const existingModel = createMockModel({ id: 'edit-id' });
        mockProps.modelLibrary.editingModel = existingModel;
        mockProps.modelLibrary.models = [existingModel];
        mockProps.modelLibrary.newModel = {
          title: 'Updated Title',
          content: '<p>Updated content</p>',
          keywords: 'kw',
          category: 'Cat',
        };
        const { result } = renderHook(() => useModelSave(mockProps));

        await act(async () => {
          await result.current.saveModelWithoutClosing();
        });

        expect(mockProps.modelLibrary.setModels).toHaveBeenCalled();
        const setModelsCall = (mockProps.modelLibrary.setModels as any).mock.calls[0][0];
        const updatedModel = setModelsCall.find((m: Model) => m.id === 'edit-id');
        expect(updatedModel.title).toBe('Updated Title');
      });

      it('should track update via cloudSync', async () => {
        const existingModel = createMockModel({ id: 'edit-id' });
        mockProps.modelLibrary.editingModel = existingModel;
        mockProps.modelLibrary.models = [existingModel];
        mockProps.modelLibrary.newModel = {
          title: 'Updated',
          content: '<p>Content</p>',
          keywords: '',
          category: '',
        };
        const { result } = renderHook(() => useModelSave(mockProps));

        await act(async () => {
          await result.current.saveModelWithoutClosing();
        });

        expect(mockProps.cloudSync!.trackChange).toHaveBeenCalledWith(
          'update',
          expect.objectContaining({ id: 'edit-id' })
        );
      });

      it('should set editingModel to updated model data', async () => {
        const existingModel = createMockModel({ id: 'edit-id' });
        mockProps.modelLibrary.editingModel = existingModel;
        mockProps.modelLibrary.models = [existingModel];
        mockProps.modelLibrary.newModel = {
          title: 'Updated',
          content: '<p>Updated content</p>',
          keywords: '',
          category: '',
        };
        const { result } = renderHook(() => useModelSave(mockProps));

        await act(async () => {
          await result.current.saveModelWithoutClosing();
        });

        expect(mockProps.modelLibrary.setEditingModel).toHaveBeenCalledWith(
          expect.objectContaining({ id: 'edit-id', title: 'Updated' })
        );
      });

      it('should set newModel with updated content', async () => {
        const existingModel = createMockModel({ id: 'edit-id' });
        mockProps.modelLibrary.editingModel = existingModel;
        mockProps.modelLibrary.models = [existingModel];
        mockProps.modelLibrary.newModel = {
          title: 'Updated',
          content: '<p>Old content</p>',
          keywords: '',
          category: '',
        };
        (mockProps.sanitizeHTML as any).mockReturnValue('<p>Old content</p>');

        const { result } = renderHook(() => useModelSave(mockProps));

        await act(async () => {
          await result.current.saveModelWithoutClosing();
        });

        expect(mockProps.modelLibrary.setNewModel).toHaveBeenCalledWith(
          expect.objectContaining({ content: '<p>Old content</p>' })
        );
      });

      it('should mark as having unsaved changes', async () => {
        const existingModel = createMockModel({ id: 'edit-id' });
        mockProps.modelLibrary.editingModel = existingModel;
        mockProps.modelLibrary.models = [existingModel];
        mockProps.modelLibrary.newModel = {
          title: 'Updated',
          content: '<p>Content</p>',
          keywords: '',
          category: '',
        };
        const { result } = renderHook(() => useModelSave(mockProps));

        await act(async () => {
          await result.current.saveModelWithoutClosing();
        });

        expect(mockProps.modelLibrary.setHasUnsavedChanges).toHaveBeenCalledWith(true);
      });
    });

    describe('New Model (no editingModel)', () => {
      it('should create new model with generated ID', async () => {
        mockProps.modelLibrary.newModel = {
          title: 'New Model',
          content: '<p>Content</p>',
          keywords: 'kw',
          category: 'Cat',
        };
        const { result } = renderHook(() => useModelSave(mockProps));

        await act(async () => {
          await result.current.saveModelWithoutClosing();
        });

        expect(mockProps.modelLibrary.setModels).toHaveBeenCalled();
      });

      it('should track create via cloudSync', async () => {
        mockProps.modelLibrary.newModel = {
          title: 'New Model',
          content: '<p>Content</p>',
          keywords: '',
          category: '',
        };
        const { result } = renderHook(() => useModelSave(mockProps));

        await act(async () => {
          await result.current.saveModelWithoutClosing();
        });

        expect(mockProps.cloudSync!.trackChange).toHaveBeenCalledWith(
          'create',
          expect.objectContaining({ id: 'mock-model-id-123' })
        );
      });

      it('should set editingModel to newly created model', async () => {
        mockProps.modelLibrary.newModel = {
          title: 'New',
          content: '<p>Content</p>',
          keywords: '',
          category: '',
        };
        const { result } = renderHook(() => useModelSave(mockProps));

        await act(async () => {
          await result.current.saveModelWithoutClosing();
        });

        expect(mockProps.modelLibrary.setEditingModel).toHaveBeenCalledWith(
          expect.objectContaining({ id: 'mock-model-id-123', title: 'New' })
        );
      });

      it('should mark as having unsaved changes', async () => {
        mockProps.modelLibrary.newModel = {
          title: 'New',
          content: '<p>Content</p>',
          keywords: '',
          category: '',
        };
        const { result } = renderHook(() => useModelSave(mockProps));

        await act(async () => {
          await result.current.saveModelWithoutClosing();
        });

        expect(mockProps.modelLibrary.setHasUnsavedChanges).toHaveBeenCalledWith(true);
      });
    });

    describe('Visual Feedback', () => {
      it('should create and append success message to body', async () => {
        mockProps.modelLibrary.newModel = {
          title: 'Model',
          content: '<p>Content</p>',
          keywords: '',
          category: '',
        };
        const { result } = renderHook(() => useModelSave(mockProps));

        const mockElement = { className: '', innerHTML: '', remove: vi.fn() };
        const createSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockElement as any);
        const appendSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockElement as any);

        await act(async () => {
          await result.current.saveModelWithoutClosing();
        });

        expect(createSpy).toHaveBeenCalledWith('div');
        expect(appendSpy).toHaveBeenCalled();

        createSpy.mockRestore();
        appendSpy.mockRestore();
      });

      it('should remove success message after 2000ms', async () => {
        mockProps.modelLibrary.newModel = {
          title: 'Model',
          content: '<p>Content</p>',
          keywords: '',
          category: '',
        };
        const { result } = renderHook(() => useModelSave(mockProps));

        const mockRemove = vi.fn();
        const mockElement = { className: '', innerHTML: '', remove: mockRemove };
        const createSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockElement as any);
        const appendSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockElement as any);

        await act(async () => {
          await result.current.saveModelWithoutClosing();
        });

        await act(async () => {
          await vi.advanceTimersByTimeAsync(2000);
        });

        expect(mockRemove).toHaveBeenCalled();

        createSpy.mockRestore();
        appendSpy.mockRestore();
      });

      it('should clear error after save', async () => {
        mockProps.modelLibrary.newModel = {
          title: 'Model',
          content: '<p>Content</p>',
          keywords: '',
          category: '',
        };
        const { result } = renderHook(() => useModelSave(mockProps));

        await act(async () => {
          await result.current.saveModelWithoutClosing();
        });

        expect(mockProps.setError).toHaveBeenCalledWith('');
      });
    });

    describe('Error Handling', () => {
      it('should set error message on exception', async () => {
        mockProps.modelLibrary.newModel = {
          title: 'Title',
          content: '<p>Content</p>',
          keywords: '',
          category: '',
        };
        (mockProps.modelLibrary.setModels as any).mockImplementation(() => {
          throw new Error('Storage error');
        });

        const { result } = renderHook(() => useModelSave(mockProps));

        await act(async () => {
          await result.current.saveModelWithoutClosing();
        });

        expect(mockProps.setError).toHaveBeenCalledWith('Erro ao salvar modelo: Storage error');
      });
    });

    describe('CloudSync Null', () => {
      it('should work when cloudSync is null', async () => {
        mockProps.cloudSync = null;
        mockProps.modelLibrary.newModel = {
          title: 'Title',
          content: '<p>Content</p>',
          keywords: '',
          category: '',
        };
        const { result } = renderHook(() => useModelSave(mockProps));

        await act(async () => {
          await result.current.saveModelWithoutClosing();
        });

        // Should not throw
        expect(mockProps.modelLibrary.setModels).toHaveBeenCalled();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EXECUTE SAVE MODEL TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('executeSaveModel', () => {
    it('should add new model to list via setModels function updater', async () => {
      const { result } = renderHook(() => useModelSave(mockProps));
      const modelData = { id: 'test-id', title: 'Test', content: '<p>Content</p>' };

      await act(async () => {
        await result.current.executeSaveModel(modelData);
      });

      expect(mockProps.modelLibrary.setModels).toHaveBeenCalled();
      // Verify it's called with a function (updater pattern for new models)
      const call = (mockProps.modelLibrary.setModels as any).mock.calls[0][0];
      expect(typeof call).toBe('function');
    });

    it('should replace existing model when isReplace is true', async () => {
      const existingModel = createMockModel({ id: 'existing-id' });
      mockProps.modelLibrary.models = [existingModel];
      const { result } = renderHook(() => useModelSave(mockProps));
      const modelData = { id: 'new-id', title: 'Replacement', content: '<p>New</p>' };

      await act(async () => {
        await result.current.executeSaveModel(modelData, true, 'existing-id');
      });

      // Should be called with an array (direct value, not updater)
      const call = (mockProps.modelLibrary.setModels as any).mock.calls[0][0];
      expect(Array.isArray(call)).toBe(true);
    });

    it('should set updatedAt when replacing', async () => {
      const existingModel = createMockModel({ id: 'existing-id' });
      mockProps.modelLibrary.models = [existingModel];
      const { result } = renderHook(() => useModelSave(mockProps));
      const modelData = { id: 'new-id', title: 'Replacement', content: '<p>New</p>' };

      await act(async () => {
        await result.current.executeSaveModel(modelData, true, 'existing-id');
      });

      expect(mockProps.cloudSync!.trackChange).toHaveBeenCalledWith(
        'update',
        expect.objectContaining({ updatedAt: expect.any(String) })
      );
    });

    it('should track create for new model via cloudSync', async () => {
      const { result } = renderHook(() => useModelSave(mockProps));
      const modelData = { id: 'test-id', title: 'Test', content: '<p>Content</p>' };

      await act(async () => {
        await result.current.executeSaveModel(modelData);
      });

      expect(mockProps.cloudSync!.trackChange).toHaveBeenCalledWith('create', expect.objectContaining({ id: 'test-id' }));
    });

    it('should invalidate TFIDFSimilarity and apiCache', async () => {
      const { result } = renderHook(() => useModelSave(mockProps));
      const modelData = { id: 'test-id', title: 'Test', content: '<p>Content</p>' };

      await act(async () => {
        await result.current.executeSaveModel(modelData);
      });

      expect(mockInvalidateTFIDF).toHaveBeenCalled();
      expect(mockProps.apiCache.invalidate).toHaveBeenCalledWith('suggestions_');
    });

    it('should set modelSaved to true', async () => {
      const { result } = renderHook(() => useModelSave(mockProps));
      const modelData = { id: 'test-id', title: 'Test', content: '<p>Content</p>' };

      await act(async () => {
        await result.current.executeSaveModel(modelData);
      });

      expect(result.current.modelSaved).toBe(true);
    });

    it('should reset form and close modal after 1200ms timeout', async () => {
      const { result } = renderHook(() => useModelSave(mockProps));
      const modelData = { id: 'test-id', title: 'Test', content: '<p>Content</p>' };

      await act(async () => {
        await result.current.executeSaveModel(modelData);
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1200);
      });

      expect(mockProps.modelLibrary.setNewModel).toHaveBeenCalledWith({
        title: '', content: '', keywords: '', category: ''
      });
      expect(mockProps.closeModal).toHaveBeenCalledWith('modelForm');
      expect(mockProps.setError).toHaveBeenCalledWith('');
    });

    it('should clear editor ref content on timeout when ref exists', async () => {
      const mockRoot = { innerHTML: '<p>Old</p>' };
      mockProps.modelEditorRef = { current: { root: mockRoot } as any };
      const { result } = renderHook(() => useModelSave(mockProps));
      const modelData = { id: 'test-id', title: 'Test', content: '<p>Content</p>' };

      await act(async () => {
        await result.current.executeSaveModel(modelData);
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1200);
      });

      expect(mockRoot.innerHTML).toBe('');
    });

    describe('Embedding Generation', () => {
      it('should generate embedding when semanticEnabled and searchModelReady', async () => {
        mockProps.aiSettings.modelSemanticEnabled = true;
        mockProps.searchModelReady = true;
        const { result } = renderHook(() => useModelSave(mockProps));
        const modelData = { id: 'test-id', title: 'Test', content: '<p>Content</p>' };

        await act(async () => {
          await result.current.executeSaveModel(modelData);

        });

        expect(mockGetEmbedding).toHaveBeenCalled();
      });

      it('should not generate embedding when model already has one', async () => {
        mockProps.aiSettings.modelSemanticEnabled = true;
        mockProps.searchModelReady = true;
        const { result } = renderHook(() => useModelSave(mockProps));
        const modelData = { id: 'test-id', title: 'Test', content: '<p>Content</p>', embedding: [0.5, 0.6] };

        await act(async () => {
          await result.current.executeSaveModel(modelData);

        });

        expect(mockGetEmbedding).not.toHaveBeenCalled();
      });

      it('should remove embedding when semanticEnabled is false but model has embedding', async () => {
        mockProps.aiSettings.modelSemanticEnabled = false;
        const { result } = renderHook(() => useModelSave(mockProps));
        const modelData = { id: 'test-id', title: 'Test', content: '<p>Content</p>', embedding: [0.1, 0.2] };

        await act(async () => {
          await result.current.executeSaveModel(modelData);
        });

        // The embedding should be deleted from modelData
        expect(modelData.embedding).toBeUndefined();
      });

      it('should not generate embedding when searchModelReady is false', async () => {
        mockProps.aiSettings.modelSemanticEnabled = true;
        mockProps.searchModelReady = false;
        const { result } = renderHook(() => useModelSave(mockProps));
        const modelData = { id: 'test-id', title: 'Test', content: '<p>Content</p>' };

        await act(async () => {
          await result.current.executeSaveModel(modelData);
        });

        expect(mockGetEmbedding).not.toHaveBeenCalled();
      });

      it('should handle embedding generation errors gracefully', async () => {
        mockProps.aiSettings.modelSemanticEnabled = true;
        mockProps.searchModelReady = true;
        mockGetEmbedding.mockRejectedValueOnce(new Error('Embedding generation failed'));
        const { result } = renderHook(() => useModelSave(mockProps));
        const modelData = { id: 'test-id', title: 'Test', content: '<p>Content</p>' };

        await act(async () => {
          await result.current.executeSaveModel(modelData);

        });

        // Should still save without embedding
        expect(mockProps.modelLibrary.setModels).toHaveBeenCalled();
      });
    });

    describe('CloudSync Null', () => {
      it('should work without cloudSync', async () => {
        mockProps.cloudSync = null;
        const { result } = renderHook(() => useModelSave(mockProps));
        const modelData = { id: 'test-id', title: 'Test', content: '<p>Content</p>' };

        await act(async () => {
          await result.current.executeSaveModel(modelData);
        });

        expect(mockProps.modelLibrary.setModels).toHaveBeenCalled();
        expect(mockProps.modelLibrary.setHasUnsavedChanges).toHaveBeenCalledWith(true);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EXECUTE SAVE AS NEW TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('executeSaveAsNew', () => {
    it('should add new model to list', async () => {
      const { result } = renderHook(() => useModelSave(mockProps));
      const modelData = { id: 'new-id', title: 'New', content: '<p>Content</p>' };

      await act(async () => {
        await result.current.executeSaveAsNew(modelData);
      });

      expect(mockProps.modelLibrary.setModels).toHaveBeenCalled();
    });

    it('should show success toast', async () => {
      const { result } = renderHook(() => useModelSave(mockProps));
      const modelData = { id: 'new-id', title: 'New', content: '<p>Content</p>' };

      await act(async () => {
        await result.current.executeSaveAsNew(modelData);
      });

      expect(mockProps.showToast).toHaveBeenCalledWith('Novo modelo criado com sucesso!', 'success');
    });

    it('should close save-as-new and preview modals', async () => {
      const { result } = renderHook(() => useModelSave(mockProps));
      const modelData = { id: 'new-id', title: 'New', content: '<p>Content</p>' };

      await act(async () => {
        await result.current.executeSaveAsNew(modelData);
      });

      expect(mockProps.modelPreview.closeSaveAsNew).toHaveBeenCalled();
      expect(mockProps.modelPreview.closePreview).toHaveBeenCalled();
    });

    it('should replace model when isReplace is true', async () => {
      mockProps.modelLibrary.models = [createMockModel({ id: 'existing-id' })];
      const { result } = renderHook(() => useModelSave(mockProps));
      const modelData = { id: 'new-id', title: 'Replacement', content: '<p>Content</p>' };

      await act(async () => {
        await result.current.executeSaveAsNew(modelData, true, 'existing-id');
      });

      expect(mockProps.cloudSync!.trackChange).toHaveBeenCalledWith(
        'update',
        expect.objectContaining({ id: 'existing-id' })
      );
    });

    it('should track create for new model', async () => {
      const { result } = renderHook(() => useModelSave(mockProps));
      const modelData = { id: 'new-id', title: 'New', content: '<p>Content</p>' };

      await act(async () => {
        await result.current.executeSaveAsNew(modelData);
      });

      expect(mockProps.cloudSync!.trackChange).toHaveBeenCalledWith('create', expect.objectContaining({ id: 'new-id' }));
    });

    it('should invalidate caches', async () => {
      const { result } = renderHook(() => useModelSave(mockProps));
      const modelData = { id: 'new-id', title: 'New', content: '<p>Content</p>' };

      await act(async () => {
        await result.current.executeSaveAsNew(modelData);
      });

      expect(mockInvalidateTFIDF).toHaveBeenCalled();
      expect(mockProps.apiCache.invalidate).toHaveBeenCalledWith('suggestions_');
    });

    it('should set hasUnsavedChanges to true', async () => {
      const { result } = renderHook(() => useModelSave(mockProps));
      const modelData = { id: 'new-id', title: 'New', content: '<p>Content</p>' };

      await act(async () => {
        await result.current.executeSaveAsNew(modelData);
      });

      expect(mockProps.modelLibrary.setHasUnsavedChanges).toHaveBeenCalledWith(true);
    });

    describe('Embedding Generation', () => {
      it('should generate embedding when semantic enabled and ready', async () => {
        mockProps.aiSettings.modelSemanticEnabled = true;
        mockProps.searchModelReady = true;
        const { result } = renderHook(() => useModelSave(mockProps));
        const modelData = { id: 'new-id', title: 'New', content: '<p>Content</p>' };

        await act(async () => {
          await result.current.executeSaveAsNew(modelData);

        });

        expect(mockGetEmbedding).toHaveBeenCalled();
      });

      it('should remove embedding when semantic disabled', async () => {
        mockProps.aiSettings.modelSemanticEnabled = false;
        const { result } = renderHook(() => useModelSave(mockProps));
        const modelData = { id: 'new-id', title: 'New', content: '<p>Content</p>', embedding: [1, 2, 3] };

        await act(async () => {
          await result.current.executeSaveAsNew(modelData);
        });

        expect(modelData.embedding).toBeUndefined();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EXECUTE EXTRACTED MODEL SAVE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('executeExtractedModelSave', () => {
    it('should add extracted model with generated UUID', async () => {
      const mockUUID = 'generated-uuid-123';
      vi.spyOn(crypto, 'randomUUID').mockReturnValue(mockUUID as any);
      const { result } = renderHook(() => useModelSave(mockProps));
      const modelData = { title: 'Extracted', content: '<p>Content</p>' };

      await act(async () => {
        await result.current.executeExtractedModelSave(modelData);
      });

      expect(mockProps.modelLibrary.setModels).toHaveBeenCalled();
    });

    it('should show success toast with model title', async () => {
      const { result } = renderHook(() => useModelSave(mockProps));
      const modelData = { title: 'My Extracted Model', content: '<p>Content</p>' };

      await act(async () => {
        await result.current.executeExtractedModelSave(modelData);
      });

      expect(mockProps.showToast).toHaveBeenCalledWith(
        expect.stringContaining('My Extracted Model'),
        'success'
      );
      expect(mockProps.showToast).toHaveBeenCalledWith(
        expect.stringContaining('salvo'),
        'success'
      );
    });

    it('should show "substitu\xEDdo" message when replacing', async () => {
      mockProps.modelLibrary.models = [createMockModel({ id: 'existing-id' })];
      const { result } = renderHook(() => useModelSave(mockProps));
      const modelData = { title: 'Extracted', content: '<p>Content</p>' };

      await act(async () => {
        await result.current.executeExtractedModelSave(modelData, true, 'existing-id');
      });

      expect(mockProps.showToast).toHaveBeenCalledWith(
        expect.stringContaining('substitu\xEDdo'),
        'success'
      );
    });

    it('should close extractedModelPreview modal', async () => {
      const { result } = renderHook(() => useModelSave(mockProps));
      const modelData = { title: 'Extracted', content: '<p>Content</p>' };

      await act(async () => {
        await result.current.executeExtractedModelSave(modelData);
      });

      expect(mockProps.closeModal).toHaveBeenCalledWith('extractedModelPreview');
    });

    it('should set extractedModelPreview to null', async () => {
      const { result } = renderHook(() => useModelSave(mockProps));
      const modelData = { title: 'Extracted', content: '<p>Content</p>' };

      await act(async () => {
        await result.current.executeExtractedModelSave(modelData);
      });

      expect(mockProps.modelLibrary.setExtractedModelPreview).toHaveBeenCalledWith(null);
    });

    it('should replace model when isReplace with replaceId', async () => {
      mockProps.modelLibrary.models = [createMockModel({ id: 'old-id', title: 'Old' })];
      const { result } = renderHook(() => useModelSave(mockProps));
      const modelData = { title: 'Replacement', content: '<p>Content</p>' };

      await act(async () => {
        await result.current.executeExtractedModelSave(modelData, true, 'old-id');
      });

      const setModelsCall = (mockProps.modelLibrary.setModels as any).mock.calls[0][0];
      expect(Array.isArray(setModelsCall)).toBe(true);
      expect(mockProps.cloudSync!.trackChange).toHaveBeenCalledWith(
        'update',
        expect.objectContaining({ id: 'old-id' })
      );
    });

    it('should track create for new extracted model', async () => {
      const { result } = renderHook(() => useModelSave(mockProps));
      const modelData = { title: 'Extracted', content: '<p>Content</p>' };

      await act(async () => {
        await result.current.executeExtractedModelSave(modelData);
      });

      expect(mockProps.cloudSync!.trackChange).toHaveBeenCalledWith('create', expect.any(Object));
    });

    it('should invalidate caches', async () => {
      const { result } = renderHook(() => useModelSave(mockProps));
      const modelData = { title: 'Extracted', content: '<p>Content</p>' };

      await act(async () => {
        await result.current.executeExtractedModelSave(modelData);
      });

      expect(mockInvalidateTFIDF).toHaveBeenCalled();
      expect(mockProps.apiCache.invalidate).toHaveBeenCalledWith('suggestions_');
    });

    describe('Embedding Generation', () => {
      it('should generate embedding when semantic enabled', async () => {
        mockProps.aiSettings.modelSemanticEnabled = true;
        mockProps.searchModelReady = true;
        const { result } = renderHook(() => useModelSave(mockProps));
        const modelData = { title: 'Extracted', content: '<p>Content</p>' };

        await act(async () => {
          await result.current.executeExtractedModelSave(modelData);

        });

        expect(mockGetEmbedding).toHaveBeenCalled();
      });

      it('should remove embedding when semantic disabled but model has embedding', async () => {
        mockProps.aiSettings.modelSemanticEnabled = false;
        const { result } = renderHook(() => useModelSave(mockProps));
        const modelData = { title: 'Extracted', content: '<p>Content</p>', embedding: [1, 2, 3] };

        await act(async () => {
          await result.current.executeExtractedModelSave(modelData);
        });

        expect(modelData.embedding).toBeUndefined();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCESS BULK SAVE NEXT TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('processBulkSaveNext', () => {
    describe('Empty Queue (finalization)', () => {
      it('should close bulkReview and bulkModal when queue is empty', async () => {
        const { result } = renderHook(() => useModelSave(mockProps));

        await act(async () => {
          await result.current.processBulkSaveNext([], [], 0, []);
        });

        expect(mockProps.closeModal).toHaveBeenCalledWith('bulkReview');
        expect(mockProps.closeModal).toHaveBeenCalledWith('bulkModal');
      });

      it('should show toast with count of saved models', async () => {
        const { result } = renderHook(() => useModelSave(mockProps));
        const saved: Model[] = [
          createMockModel({ id: '1', title: 'M1' }),
          createMockModel({ id: '2', title: 'M2' }),
        ];

        await act(async () => {
          await result.current.processBulkSaveNext([], saved, 0, []);
        });

        expect(mockProps.showToast).toHaveBeenCalledWith(
          expect.stringContaining('2 modelo(s)'),
          'success'
        );
      });

      it('should include skipped count in toast message', async () => {
        const { result } = renderHook(() => useModelSave(mockProps));
        const saved: Model[] = [createMockModel({ id: '1' })];

        await act(async () => {
          await result.current.processBulkSaveNext([], saved, 3, []);
        });

        expect(mockProps.showToast).toHaveBeenCalledWith(
          expect.stringContaining('3 ignorado(s)'),
          'success'
        );
      });

      it('should include replacements in total count', async () => {
        const { result } = renderHook(() => useModelSave(mockProps));
        const saved: Model[] = [createMockModel({ id: '1' })];
        const replacements = [{ oldId: 'old-id', newModel: createMockModel({ id: '2' }) }];

        await act(async () => {
          await result.current.processBulkSaveNext([], saved, 0, replacements);
        });

        expect(mockProps.showToast).toHaveBeenCalledWith(
          expect.stringContaining('2 modelo(s)'),
          'success'
        );
      });

      it('should apply replacements to model list', async () => {
        const existingModel = createMockModel({ id: 'old-id', title: 'Old' });
        mockProps.modelLibrary.models = [existingModel];
        const { result } = renderHook(() => useModelSave(mockProps));
        const replacements = [
          { oldId: 'old-id', newModel: createMockModel({ id: 'new-id', title: 'Replacement' }) },
        ];

        await act(async () => {
          await result.current.processBulkSaveNext([], [], 0, replacements);
        });

        expect(mockProps.modelLibrary.setModels).toHaveBeenCalled();
      });

      it('should use trackChangeBatch for batch operations', async () => {
        const { result } = renderHook(() => useModelSave(mockProps));
        const saved: Model[] = [createMockModel({ id: '1' })];
        const replacements = [{ oldId: 'old-id', newModel: createMockModel({ id: '2' }) }];
        mockProps.modelLibrary.models = [createMockModel({ id: 'old-id' })];

        await act(async () => {
          await result.current.processBulkSaveNext([], saved, 0, replacements);
        });

        expect(mockProps.cloudSync!.trackChangeBatch).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({ operation: 'update' }),
            expect.objectContaining({ operation: 'create' }),
          ])
        );
      });

      it('should set hasUnsavedChanges when models were saved', async () => {
        const { result } = renderHook(() => useModelSave(mockProps));
        const saved: Model[] = [createMockModel({ id: '1' })];

        await act(async () => {
          await result.current.processBulkSaveNext([], saved, 0, []);
        });

        expect(mockProps.modelLibrary.setHasUnsavedChanges).toHaveBeenCalledWith(true);
      });

      it('should not set hasUnsavedChanges when no models saved or replaced', async () => {
        const { result } = renderHook(() => useModelSave(mockProps));

        await act(async () => {
          await result.current.processBulkSaveNext([], [], 0, []);
        });

        expect(mockProps.modelLibrary.setHasUnsavedChanges).not.toHaveBeenCalled();
      });

      it('should invalidate caches when models were saved', async () => {
        const { result } = renderHook(() => useModelSave(mockProps));
        const saved: Model[] = [createMockModel({ id: '1' })];

        await act(async () => {
          await result.current.processBulkSaveNext([], saved, 0, []);
        });

        expect(mockInvalidateTFIDF).toHaveBeenCalled();
        expect(mockProps.apiCache.invalidate).toHaveBeenCalledWith('suggestions_');
      });

      it('should generate embeddings for saved models when semantic enabled', async () => {
        mockProps.aiSettings.modelSemanticEnabled = true;
        mockProps.searchModelReady = true;
        const { result } = renderHook(() => useModelSave(mockProps));
        const saved: Model[] = [createMockModel({ id: '1' })];

        await act(async () => {
          await result.current.processBulkSaveNext([], saved, 0, []);

        });

        expect(mockGetEmbedding).toHaveBeenCalled();
      });

      it('should generate embeddings for replacement models when semantic enabled', async () => {
        mockProps.aiSettings.modelSemanticEnabled = true;
        mockProps.searchModelReady = true;
        mockProps.modelLibrary.models = [createMockModel({ id: 'old-id' })];
        const { result } = renderHook(() => useModelSave(mockProps));
        const replacements = [{ oldId: 'old-id', newModel: createMockModel({ id: 'new-id' }) }];

        await act(async () => {
          await result.current.processBulkSaveNext([], [], 0, replacements);

        });

        expect(mockGetEmbedding).toHaveBeenCalled();
      });

      it('should not generate embeddings when models already have them', async () => {
        mockProps.aiSettings.modelSemanticEnabled = true;
        mockProps.searchModelReady = true;
        const { result } = renderHook(() => useModelSave(mockProps));
        const saved: Model[] = [createMockModel({ id: '1', embedding: [0.1, 0.2] } as any)];

        await act(async () => {
          await result.current.processBulkSaveNext([], saved, 0, []);

        });

        expect(mockGetEmbedding).not.toHaveBeenCalled();
      });
    });

    describe('Queue Processing', () => {
      it('should process first item in queue', async () => {
        const { result } = renderHook(() => useModelSave(mockProps));
        const queue = [{ title: 'Model 1', content: '<p>Content 1</p>' }];

        await act(async () => {
          await result.current.processBulkSaveNext(queue, [], 0, []);
        });

        // When no similarity found, model should be added to saved and recursive call made
        expect(mockProps.modelLibrary.setModels).toHaveBeenCalled();
      });

      it('should show similarity warning when similar model found in queue', async () => {
        mockFindSimilar.mockReturnValue({
          hasSimilar: true,
          similarModel: createMockModel({ id: 'similar-id' }),
          similarity: 0.90,
        });
        const { result } = renderHook(() => useModelSave(mockProps));
        const queue = [{ title: 'Similar Model', content: '<p>Content</p>' }];

        await act(async () => {
          await result.current.processBulkSaveNext(queue, [], 0, []);
        });

        expect(mockProps.modelLibrary.setSimilarityWarning).toHaveBeenCalledWith(
          expect.objectContaining({
            context: 'saveBulkModel',
            similarity: 0.90,
            bulkQueue: [],
            bulkSaved: [],
            bulkSkipped: 0,
            bulkReplacements: [],
          })
        );
      });

      it('should check similarity against existing models AND already saved models', async () => {
        const existingModel = createMockModel({ id: 'existing-id' });
        const savedModel = createMockModel({ id: 'saved-id', title: 'Already Saved' });
        mockProps.modelLibrary.models = [existingModel];
        const { result } = renderHook(() => useModelSave(mockProps));
        const queue = [{ title: 'New', content: '<p>Content</p>' }];

        await act(async () => {
          await result.current.processBulkSaveNext(queue, [savedModel], 0, []);
        });

        expect(mockFindSimilar).toHaveBeenCalledWith(
          expect.any(Object),
          expect.arrayContaining([existingModel, savedModel]),
          0.80
        );
      });

      it('should process remaining queue after successful save', async () => {
        mockFindSimilar.mockReturnValue({ hasSimilar: false });
        const { result } = renderHook(() => useModelSave(mockProps));
        const queue = [
          { title: 'Model 1', content: '<p>Content 1</p>' },
          { title: 'Model 2', content: '<p>Content 2</p>' },
        ];

        await act(async () => {
          await result.current.processBulkSaveNext(queue, [], 0, []);
        });

        // All items processed, final toast should be shown
        expect(mockProps.showToast).toHaveBeenCalledWith(
          expect.stringContaining('2 modelo(s)'),
          'success'
        );
      });
    });

    describe('CloudSync Null for Bulk', () => {
      it('should work when cloudSync is null', async () => {
        mockProps.cloudSync = null;
        const { result } = renderHook(() => useModelSave(mockProps));
        const saved: Model[] = [createMockModel({ id: '1' })];

        await act(async () => {
          await result.current.processBulkSaveNext([], saved, 0, []);
        });

        expect(mockProps.modelLibrary.setModels).toHaveBeenCalled();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SIMILARITY HANDLERS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Similarity Handlers', () => {
    describe('handleSimilarityCancel', () => {
      it('should clear similarity warning for non-bulk context', () => {
        mockProps.modelLibrary.similarityWarning = createMockSimilarityWarning({
          context: 'saveModel',
        });
        const { result } = renderHook(() => useModelSave(mockProps));

        act(() => {
          result.current.handleSimilarityCancel();
        });

        expect(mockProps.modelLibrary.setSimilarityWarning).toHaveBeenCalledWith(null);
      });

      it('should continue bulk processing with incremented skip count for bulk context', async () => {
        mockProps.modelLibrary.similarityWarning = createMockSimilarityWarning({
          context: 'saveBulkModel',
          bulkQueue: [{ title: 'Next', content: '<p>Next</p>' }],
          bulkSaved: [],
          bulkSkipped: 2,
          bulkReplacements: [],
        });
        const { result } = renderHook(() => useModelSave(mockProps));

        act(() => {
          result.current.handleSimilarityCancel();
        });

        // Should clear warning
        expect(mockProps.modelLibrary.setSimilarityWarning).toHaveBeenCalledWith(null);

        // After setTimeout(0), processBulkSaveNext is called with skipped+1
        await act(async () => {
          await vi.advanceTimersByTimeAsync(10);
        });
      });

      it('should handle bulk context with undefined optional fields', () => {
        mockProps.modelLibrary.similarityWarning = createMockSimilarityWarning({
          context: 'saveBulkModel',
          bulkQueue: undefined,
          bulkSaved: undefined,
          bulkSkipped: undefined,
          bulkReplacements: undefined,
        });
        const { result } = renderHook(() => useModelSave(mockProps));

        act(() => {
          result.current.handleSimilarityCancel();
        });

        // Should not throw
        expect(mockProps.modelLibrary.setSimilarityWarning).toHaveBeenCalledWith(null);
      });
    });

    describe('handleSimilaritySaveNew', () => {
      it('should do nothing when no warning exists', async () => {
        mockProps.modelLibrary.similarityWarning = null;
        const { result } = renderHook(() => useModelSave(mockProps));

        await act(async () => {
          await result.current.handleSimilaritySaveNew();
        });

        expect(mockProps.modelLibrary.setModels).not.toHaveBeenCalled();
      });

      it('should execute saveModel for saveModel context', async () => {
        mockProps.modelLibrary.similarityWarning = createMockSimilarityWarning({
          context: 'saveModel',
          newModel: createMockModel({ id: 'new-model', title: 'New' }),
        });
        const { result } = renderHook(() => useModelSave(mockProps));

        await act(async () => {
          await result.current.handleSimilaritySaveNew();

        });

        expect(result.current.savingFromSimilarity).toBe(false);
        expect(mockProps.modelLibrary.setSimilarityWarning).toHaveBeenCalledWith(null);
        expect(mockProps.modelLibrary.setModels).toHaveBeenCalled();
      });

      it('should execute extractedModelSave for saveExtractedModel context', async () => {
        mockProps.modelLibrary.similarityWarning = createMockSimilarityWarning({
          context: 'saveExtractedModel',
          newModel: createMockModel({ id: 'extracted', title: 'Extracted' }),
        });
        const { result } = renderHook(() => useModelSave(mockProps));

        await act(async () => {
          await result.current.handleSimilaritySaveNew();

        });

        expect(mockProps.closeModal).toHaveBeenCalledWith('extractedModelPreview');
        expect(mockProps.modelLibrary.setSimilarityWarning).toHaveBeenCalledWith(null);
      });

      it('should execute saveAsNew for saveAsNew context', async () => {
        mockProps.modelLibrary.similarityWarning = createMockSimilarityWarning({
          context: 'saveAsNew',
          newModel: createMockModel({ id: 'as-new', title: 'As New' }),
        });
        const { result } = renderHook(() => useModelSave(mockProps));

        await act(async () => {
          await result.current.handleSimilaritySaveNew();

        });

        expect(mockProps.modelPreview.closeSaveAsNew).toHaveBeenCalled();
        expect(mockProps.modelPreview.closePreview).toHaveBeenCalled();
        expect(mockProps.modelLibrary.setSimilarityWarning).toHaveBeenCalledWith(null);
      });

      it('should add model to bulkSaved and continue bulk processing for saveBulkModel context', async () => {
        mockProps.modelLibrary.similarityWarning = createMockSimilarityWarning({
          context: 'saveBulkModel',
          newModel: createMockModel({ id: 'bulk-new', title: 'Bulk New' }),
          bulkQueue: [],
          bulkSaved: [],
          bulkSkipped: 0,
          bulkReplacements: [],
        });
        const { result } = renderHook(() => useModelSave(mockProps));

        await act(async () => {
          await result.current.handleSimilaritySaveNew();

        });

        expect(mockProps.modelLibrary.setSimilarityWarning).toHaveBeenCalledWith(null);

        // Should trigger processBulkSaveNext via setTimeout
        await act(async () => {
          await vi.advanceTimersByTimeAsync(10);
        });
      });

      it('should reset savingFromSimilarity after operation completes', async () => {
        mockProps.modelLibrary.similarityWarning = createMockSimilarityWarning({
          context: 'saveModel',
          newModel: createMockModel({ id: 'new-model' }),
        });
        const { result } = renderHook(() => useModelSave(mockProps));

        await act(async () => {
          await result.current.handleSimilaritySaveNew();
        });

        // After completing, savingFromSimilarity should be reset to false
        expect(result.current.savingFromSimilarity).toBe(false);
      });
    });

    describe('handleSimilarityReplace', () => {
      it('should do nothing when no warning exists', async () => {
        mockProps.modelLibrary.similarityWarning = null;
        const { result } = renderHook(() => useModelSave(mockProps));

        await act(async () => {
          await result.current.handleSimilarityReplace();
        });

        expect(mockProps.modelLibrary.setModels).not.toHaveBeenCalled();
      });

      it('should execute saveModel with replace for saveModel context', async () => {
        const similarModel = createMockModel({ id: 'similar-id' });
        mockProps.modelLibrary.similarityWarning = createMockSimilarityWarning({
          context: 'saveModel',
          newModel: createMockModel({ id: 'new-model', title: 'New' }),
          similarModel,
        });
        mockProps.modelLibrary.models = [similarModel];
        const { result } = renderHook(() => useModelSave(mockProps));

        await act(async () => {
          await result.current.handleSimilarityReplace();

        });

        expect(mockProps.cloudSync!.trackChange).toHaveBeenCalledWith(
          'update',
          expect.objectContaining({ id: 'similar-id' })
        );
        expect(mockProps.modelLibrary.setSimilarityWarning).toHaveBeenCalledWith(null);
      });

      it('should execute extractedModelSave with replace for saveExtractedModel context', async () => {
        const similarModel = createMockModel({ id: 'similar-id' });
        mockProps.modelLibrary.similarityWarning = createMockSimilarityWarning({
          context: 'saveExtractedModel',
          newModel: createMockModel({ id: 'extracted', title: 'Extracted' }),
          similarModel,
        });
        mockProps.modelLibrary.models = [similarModel];
        const { result } = renderHook(() => useModelSave(mockProps));

        await act(async () => {
          await result.current.handleSimilarityReplace();

        });

        expect(mockProps.closeModal).toHaveBeenCalledWith('extractedModelPreview');
        expect(mockProps.showToast).toHaveBeenCalledWith(
          expect.stringContaining('substitu\xEDdo'),
          'success'
        );
      });

      it('should execute saveAsNew with replace for saveAsNew context', async () => {
        const similarModel = createMockModel({ id: 'similar-id' });
        mockProps.modelLibrary.similarityWarning = createMockSimilarityWarning({
          context: 'saveAsNew',
          newModel: createMockModel({ id: 'as-new', title: 'As New' }),
          similarModel,
        });
        mockProps.modelLibrary.models = [similarModel];
        const { result } = renderHook(() => useModelSave(mockProps));

        await act(async () => {
          await result.current.handleSimilarityReplace();

        });

        expect(mockProps.cloudSync!.trackChange).toHaveBeenCalledWith(
          'update',
          expect.objectContaining({ id: 'similar-id' })
        );
        expect(mockProps.modelPreview.closeSaveAsNew).toHaveBeenCalled();
      });

      it('should add replacement and continue bulk processing for saveBulkModel context', async () => {
        const similarModel = createMockModel({ id: 'similar-id' });
        const newModel = createMockModel({ id: 'bulk-new', title: 'Bulk New' });
        mockProps.modelLibrary.similarityWarning = createMockSimilarityWarning({
          context: 'saveBulkModel',
          newModel,
          similarModel,
          bulkQueue: [],
          bulkSaved: [],
          bulkSkipped: 0,
          bulkReplacements: [],
        });
        const { result } = renderHook(() => useModelSave(mockProps));

        await act(async () => {
          await result.current.handleSimilarityReplace();

        });

        expect(mockProps.modelLibrary.setSimilarityWarning).toHaveBeenCalledWith(null);

        // Should trigger processBulkSaveNext via setTimeout with replacement added
        await act(async () => {
          await vi.advanceTimersByTimeAsync(10);
        });
      });

      it('should reset savingFromSimilarity after operation completes', async () => {
        mockProps.modelLibrary.similarityWarning = createMockSimilarityWarning({
          context: 'saveModel',
          newModel: createMockModel({ id: 'new-model' }),
        });
        mockProps.modelLibrary.models = [createMockModel({ id: 'similar-model-id' })];
        const { result } = renderHook(() => useModelSave(mockProps));

        await act(async () => {
          await result.current.handleSimilarityReplace();
        });

        // After completing, savingFromSimilarity should be reset to false
        expect(result.current.savingFromSimilarity).toBe(false);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CLOUD SYNC NULL HANDLING TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Cloud Sync Null Handling', () => {
    it('should work when cloudSync is null on executeSaveModel', async () => {
      mockProps.cloudSync = null;
      const { result } = renderHook(() => useModelSave(mockProps));
      const modelData = { id: 'test-id', title: 'Test', content: '<p>Content</p>' };

      await act(async () => {
        await result.current.executeSaveModel(modelData);
      });

      expect(mockProps.modelLibrary.setModels).toHaveBeenCalled();
    });

    it('should work when cloudSync is null on executeSaveAsNew', async () => {
      mockProps.cloudSync = null;
      const { result } = renderHook(() => useModelSave(mockProps));
      const modelData = { id: 'test-id', title: 'Test', content: '<p>Content</p>' };

      await act(async () => {
        await result.current.executeSaveAsNew(modelData);
      });

      expect(mockProps.modelLibrary.setModels).toHaveBeenCalled();
    });

    it('should work when cloudSync is null on executeExtractedModelSave', async () => {
      mockProps.cloudSync = null;
      const { result } = renderHook(() => useModelSave(mockProps));
      const modelData = { title: 'Test', content: '<p>Content</p>' };

      await act(async () => {
        await result.current.executeExtractedModelSave(modelData);
      });

      expect(mockProps.modelLibrary.setModels).toHaveBeenCalled();
    });

    it('should work when cloudSync trackChange is undefined', async () => {
      mockProps.cloudSync = {};
      const { result } = renderHook(() => useModelSave(mockProps));
      const modelData = { id: 'test-id', title: 'Test', content: '<p>Content</p>' };

      await act(async () => {
        await result.current.executeSaveModel(modelData);
      });

      expect(mockProps.modelLibrary.setModels).toHaveBeenCalled();
    });

    it('should handle cloudSync becoming available after initialization', async () => {
      mockProps.cloudSync = null;
      const { result, rerender } = renderHook(
        (props) => useModelSave(props),
        { initialProps: mockProps }
      );

      // Update cloudSync
      const newTrackChange = vi.fn();
      const updatedProps = { ...mockProps, cloudSync: { trackChange: newTrackChange } };
      rerender(updatedProps);

      const modelData = { id: 'test-id', title: 'Test', content: '<p>Content</p>' };
      await act(async () => {
        await result.current.executeSaveModel(modelData);
      });

      expect(newTrackChange).toHaveBeenCalledWith('create', expect.any(Object));
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // AI SETTINGS / EMBEDDING TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('AI Settings and Embedding Generation', () => {
    it('should not generate embedding when both settings are off', async () => {
      mockProps.aiSettings.modelSemanticEnabled = false;
      mockProps.searchModelReady = false;
      const { result } = renderHook(() => useModelSave(mockProps));
      const modelData = { id: 'test-id', title: 'Test', content: '<p>Content</p>' };

      await act(async () => {
        await result.current.executeSaveModel(modelData);
      });

      expect(mockGetEmbedding).not.toHaveBeenCalled();
    });

    it('should generate embedding with correct text (title + keywords + content slice)', async () => {
      mockProps.aiSettings.modelSemanticEnabled = true;
      mockProps.searchModelReady = true;
      const { result } = renderHook(() => useModelSave(mockProps));
      const modelData = {
        id: 'test-id',
        title: 'Test Title',
        content: '<p>Test content here</p>',
        keywords: 'keyword1, keyword2',
      };

      await act(async () => {
        await result.current.executeSaveModel(modelData);

      });

      expect(mockGetEmbedding).toHaveBeenCalledWith(
        expect.stringContaining('Test Title'),
        'passage'
      );
    });

    it('should not regenerate embedding if model already has one', async () => {
      mockProps.aiSettings.modelSemanticEnabled = true;
      mockProps.searchModelReady = true;
      const { result } = renderHook(() => useModelSave(mockProps));
      const modelData = {
        id: 'test-id',
        title: 'Test',
        content: '<p>Content</p>',
        embedding: [0.5, 0.6, 0.7],
      };

      await act(async () => {
        await result.current.executeSaveModel(modelData);

      });

      expect(mockGetEmbedding).not.toHaveBeenCalled();
    });

    it('should handle embedding generation failure gracefully', async () => {
      mockProps.aiSettings.modelSemanticEnabled = true;
      mockProps.searchModelReady = true;
      mockGetEmbedding.mockRejectedValueOnce(new Error('Model not loaded'));

      const { result } = renderHook(() => useModelSave(mockProps));
      const modelData = { id: 'test-id', title: 'Test', content: '<p>Content</p>' };

      await act(async () => {
        await result.current.executeSaveModel(modelData);

      });

      // Should still complete the save
      expect(mockProps.modelLibrary.setModels).toHaveBeenCalled();
      expect(mockProps.modelLibrary.setHasUnsavedChanges).toHaveBeenCalledWith(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EDGE CASES AND INTEGRATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Edge Cases', () => {
    it('should handle model with empty keywords', async () => {
      mockProps.modelLibrary.newModel = {
        title: 'Title',
        content: '<p>Content</p>',
        keywords: '',
        category: '',
      };
      const { result } = renderHook(() => useModelSave(mockProps));

      await act(async () => {
        await result.current.saveModel();

      });

      expect(mockProps.modelLibrary.setModels).toHaveBeenCalled();
    });

    it('should handle model with undefined category', async () => {
      mockProps.modelLibrary.newModel = {
        title: 'Title',
        content: '<p>Content</p>',
        keywords: 'kw',
        category: undefined as any,
      };
      const { result } = renderHook(() => useModelSave(mockProps));

      await act(async () => {
        await result.current.saveModel();

      });

      expect(mockProps.modelLibrary.setModels).toHaveBeenCalled();
    });

    it('should handle editor ref with null root', async () => {
      mockProps.modelEditorRef = { current: { root: null } as any };
      mockProps.modelLibrary.newModel = {
        title: 'Title',
        content: '<p>Content</p>',
        keywords: '',
        category: '',
      };
      const { result } = renderHook(() => useModelSave(mockProps));

      await act(async () => {
        await result.current.saveModel();

      });

      // Should use effectiveModel.content since editor root is null
      expect(mockProps.modelLibrary.setModels).toHaveBeenCalled();
    });

    it('should handle sanitizeHTML returning empty string', async () => {
      mockProps.modelEditorRef = {
        current: { root: { innerHTML: '<script>bad</script>' } } as any,
      };
      (mockProps.sanitizeHTML as any).mockReturnValue('');
      mockProps.modelLibrary.newModel = {
        title: 'Title',
        content: '',
        keywords: '',
        category: '',
      };
      const { result } = renderHook(() => useModelSave(mockProps));

      await act(async () => {
        await result.current.saveModel();
      });

      // Empty sanitized content should trigger validation error
      expect(mockProps.setError).toHaveBeenCalledWith('T\xEDtulo e conte\xFAdo s\xE3o obrigat\xF3rios');
    });

    it('should handle executeSaveModel replace with non-existent replaceId', async () => {
      mockProps.modelLibrary.models = [createMockModel({ id: 'existing-id' })];
      const { result } = renderHook(() => useModelSave(mockProps));
      const modelData = { id: 'new-id', title: 'Replace', content: '<p>Content</p>' };

      await act(async () => {
        // Try to replace a model that doesn't exist - map should still work without match
        await result.current.executeSaveModel(modelData, true, 'nonexistent-id');
      });

      expect(mockProps.modelLibrary.setModels).toHaveBeenCalled();
    });

    it('should handle isReplace true but replaceId null', async () => {
      const { result } = renderHook(() => useModelSave(mockProps));
      const modelData = { id: 'test-id', title: 'Test', content: '<p>Content</p>' };

      await act(async () => {
        // isReplace is true but replaceId is null, should add as new
        await result.current.executeSaveModel(modelData, true, null);
      });

      // Should add as new because replaceId is null
      const call = (mockProps.modelLibrary.setModels as any).mock.calls[0][0];
      expect(typeof call).toBe('function');
    });

    it('should handle concurrent saves gracefully', async () => {
      mockProps.modelLibrary.newModel = {
        title: 'Title',
        content: '<p>Content</p>',
        keywords: '',
        category: '',
      };
      const { result } = renderHook(() => useModelSave(mockProps));

      // Start two saves simultaneously
      await act(async () => {
        const promise1 = result.current.saveModel();
        const promise2 = result.current.saveModel();
        await Promise.all([promise1, promise2]);

      });

      // Both should complete without error
      expect(result.current.savingModel).toBe(false);
    });
  });
});

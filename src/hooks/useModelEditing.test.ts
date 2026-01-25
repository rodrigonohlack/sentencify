/**
 * @file useModelEditing.test.ts
 * @description Testes para o hook useModelEditing
 * @version 1.38.52
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useModelEditing } from './useModelEditing';
import type { Model } from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// MOCKS
// ═══════════════════════════════════════════════════════════════════════════

const mockSetModels = vi.fn();
const mockSetSuggestions = vi.fn();
const mockSetEditingModel = vi.fn();
const mockSetNewModel = vi.fn();
const mockSetHasUnsavedChanges = vi.fn();
const mockSetSimilarityWarning = vi.fn();
const mockOpenPreview = vi.fn();
const mockCancelEditing = vi.fn();
const mockCloseSaveAsNew = vi.fn();
const mockClosePreview = vi.fn();
const mockTrackChange = vi.fn();
const mockInvalidate = vi.fn();
const mockSanitizeHTML = vi.fn((html: string) => html);
const mockShowToast = vi.fn();
const mockSetError = vi.fn();
const mockOpenModal = vi.fn();
const mockFormRef = { current: null };
const mockEditorRef = { current: null };
const mockOnModelUpdatedRef = { current: null };

// Mock TFIDFSimilarity
vi.mock('../services/EmbeddingsServices', () => ({
  TFIDFSimilarity: {
    invalidate: vi.fn(),
    findSimilar: vi.fn().mockReturnValue({ hasSimilar: false }),
  },
}));

// Mock AIModelService
vi.mock('../services/AIModelService', () => ({
  default: {
    getEmbedding: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]),
  },
}));

// Mock generateModelId
vi.mock('../utils/text', () => ({
  generateModelId: vi.fn().mockReturnValue('mock-model-id-123'),
}));

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

const createMockModel = (id: string, title: string, content = '<p>Content</p>'): Model => ({
  id,
  title,
  content,
  category: 'Mérito',
  keywords: 'test, keywords',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const createDefaultProps = () => ({
  modelLibrary: {
    models: [createMockModel('model-1', 'Model 1'), createMockModel('model-2', 'Model 2')],
    suggestions: [] as Model[],
    setModels: mockSetModels,
    setSuggestions: mockSetSuggestions,
    setEditingModel: mockSetEditingModel,
    setNewModel: mockSetNewModel,
    setHasUnsavedChanges: mockSetHasUnsavedChanges,
    setSimilarityWarning: mockSetSimilarityWarning,
  },
  modelPreview: {
    previewingModel: null as Model | null,
    editedContent: null as string | null,
    saveAsNewData: null as { title: string; keywords?: string; category?: string; content: string } | null,
    onModelUpdatedRef: mockOnModelUpdatedRef,
    openPreview: mockOpenPreview,
    cancelEditing: mockCancelEditing,
    closeSaveAsNew: mockCloseSaveAsNew,
    closePreview: mockClosePreview,
  },
  aiIntegration: {
    aiSettings: { modelSemanticEnabled: false },
  },
  cloudSync: { trackChange: mockTrackChange } as { trackChange: typeof mockTrackChange } | null,
  apiCache: { invalidate: mockInvalidate },
  searchModelReady: false,
  sanitizeHTML: mockSanitizeHTML,
  showToast: mockShowToast,
  setError: mockSetError,
  openModal: mockOpenModal,
  modelFormRef: mockFormRef,
  modelEditorRef: mockEditorRef,
});

// ═══════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('useModelEditing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // BASIC FUNCTIONALITY
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Basic Functionality', () => {
    it('should return all expected handlers', () => {
      const { result } = renderHook(() => useModelEditing(createDefaultProps()));

      expect(result.current.saveQuickEdit).toBeDefined();
      expect(result.current.confirmSaveAsNew).toBeDefined();
      expect(result.current.startEditingModel).toBeDefined();
      expect(result.current.duplicateModel).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // saveQuickEdit
  // ═══════════════════════════════════════════════════════════════════════════

  describe('saveQuickEdit', () => {
    it('should show error if no model is being previewed', async () => {
      const props = createDefaultProps();
      props.modelPreview.previewingModel = null;

      const { result } = renderHook(() => useModelEditing(props));
      const editorRef = { current: { root: { innerHTML: '<p>New content</p>' } } };

      await act(async () => {
        await result.current.saveQuickEdit(editorRef as React.RefObject<{ root?: HTMLElement } | null>);
      });

      expect(mockShowToast).toHaveBeenCalledWith('Erro: nenhum modelo selecionado', 'error');
    });

    it('should show error if content is empty', async () => {
      const props = createDefaultProps();
      props.modelPreview.previewingModel = createMockModel('model-1', 'Test Model');

      const { result } = renderHook(() => useModelEditing(props));
      const editorRef = { current: { root: { innerHTML: '' } } };

      await act(async () => {
        await result.current.saveQuickEdit(editorRef as React.RefObject<{ root?: HTMLElement } | null>);
      });

      expect(mockShowToast).toHaveBeenCalledWith('Conteúdo não pode estar vazio', 'error');
    });

    it('should show error if model not found in library', async () => {
      const props = createDefaultProps();
      props.modelPreview.previewingModel = createMockModel('non-existent', 'Not Found');

      const { result } = renderHook(() => useModelEditing(props));
      const editorRef = { current: { root: { innerHTML: '<p>Content</p>' } } };

      await act(async () => {
        await result.current.saveQuickEdit(editorRef as React.RefObject<{ root?: HTMLElement } | null>);
      });

      expect(mockShowToast).toHaveBeenCalledWith('Modelo não encontrado na biblioteca', 'error');
    });

    it('should save quick edit successfully', async () => {
      const props = createDefaultProps();
      props.modelPreview.previewingModel = createMockModel('model-1', 'Test Model');

      const { result } = renderHook(() => useModelEditing(props));
      const editorRef = { current: { root: { innerHTML: '<p>Updated content</p>' } } };

      await act(async () => {
        await result.current.saveQuickEdit(editorRef as React.RefObject<{ root?: HTMLElement } | null>);
      });

      expect(mockSetModels).toHaveBeenCalled();
      expect(mockSetHasUnsavedChanges).toHaveBeenCalledWith(true);
      expect(mockTrackChange).toHaveBeenCalledWith('update', expect.objectContaining({ id: 'model-1' }));
      expect(mockInvalidate).toHaveBeenCalledWith('suggestions_');
      expect(mockOpenPreview).toHaveBeenCalled();
      expect(mockCancelEditing).toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledWith('Modelo salvo com sucesso!', 'success');
    });

    it('should use editedContent when editorRef root is not available', async () => {
      const props = createDefaultProps();
      props.modelPreview.previewingModel = createMockModel('model-1', 'Test Model');
      props.modelPreview.editedContent = '<p>Fallback content</p>';

      const { result } = renderHook(() => useModelEditing(props));
      const editorRef = { current: null };

      await act(async () => {
        await result.current.saveQuickEdit(editorRef);
      });

      expect(mockSetModels).toHaveBeenCalled();
    });

    it('should update suggestions if they exist', async () => {
      const props = createDefaultProps();
      props.modelPreview.previewingModel = createMockModel('model-1', 'Test Model');
      props.modelLibrary.suggestions = [createMockModel('model-1', 'Test Model')];

      const { result } = renderHook(() => useModelEditing(props));
      const editorRef = { current: { root: { innerHTML: '<p>Content</p>' } } };

      await act(async () => {
        await result.current.saveQuickEdit(editorRef as React.RefObject<{ root?: HTMLElement } | null>);
      });

      expect(mockSetSuggestions).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // confirmSaveAsNew
  // ═══════════════════════════════════════════════════════════════════════════

  describe('confirmSaveAsNew', () => {
    it('should show error if no save data', async () => {
      const props = createDefaultProps();
      props.modelPreview.saveAsNewData = null;

      const { result } = renderHook(() => useModelEditing(props));

      await act(async () => {
        await result.current.confirmSaveAsNew();
      });

      expect(mockShowToast).toHaveBeenCalledWith('Erro: nenhum modelo para salvar', 'error');
    });

    it('should show error if title is empty', async () => {
      const props = createDefaultProps();
      props.modelPreview.saveAsNewData = { title: '', content: '<p>Content</p>' };

      const { result } = renderHook(() => useModelEditing(props));

      await act(async () => {
        await result.current.confirmSaveAsNew();
      });

      expect(mockShowToast).toHaveBeenCalledWith('Título é obrigatório', 'error');
    });

    it('should show error if content is empty', async () => {
      const props = createDefaultProps();
      props.modelPreview.saveAsNewData = { title: 'Test', content: '' };

      const { result } = renderHook(() => useModelEditing(props));

      await act(async () => {
        await result.current.confirmSaveAsNew();
      });

      expect(mockShowToast).toHaveBeenCalledWith('Conteúdo não pode estar vazio', 'error');
    });

    it('should save new model successfully', async () => {
      const props = createDefaultProps();
      props.modelPreview.saveAsNewData = {
        title: 'New Model',
        keywords: 'key1, key2',
        category: 'Preliminar',
        content: '<p>New content</p>',
      };

      const { result } = renderHook(() => useModelEditing(props));

      await act(async () => {
        await result.current.confirmSaveAsNew();
      });

      expect(mockSetModels).toHaveBeenCalled();
      expect(mockTrackChange).toHaveBeenCalledWith('create', expect.objectContaining({
        id: 'mock-model-id-123',
        title: 'New Model',
        category: 'Preliminar',
      }));
      expect(mockSetHasUnsavedChanges).toHaveBeenCalledWith(true);
      expect(mockShowToast).toHaveBeenCalledWith('Novo modelo criado com sucesso!', 'success');
      expect(mockCloseSaveAsNew).toHaveBeenCalled();
      expect(mockClosePreview).toHaveBeenCalled();
    });

    it('should use default category if not provided', async () => {
      const props = createDefaultProps();
      props.modelPreview.saveAsNewData = {
        title: 'Test',
        content: '<p>Content</p>',
      };

      const { result } = renderHook(() => useModelEditing(props));

      await act(async () => {
        await result.current.confirmSaveAsNew();
      });

      expect(mockTrackChange).toHaveBeenCalledWith('create', expect.objectContaining({
        category: 'Mérito',
      }));
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // startEditingModel
  // ═══════════════════════════════════════════════════════════════════════════

  describe('startEditingModel', () => {
    it('should set editing model and open modal', () => {
      const { result } = renderHook(() => useModelEditing(createDefaultProps()));
      const model = createMockModel('model-1', 'Test Model');

      act(() => {
        result.current.startEditingModel(model);
      });

      expect(mockSetEditingModel).toHaveBeenCalledWith(model);
      expect(mockSetNewModel).toHaveBeenCalledWith({
        title: 'Test Model',
        content: '<p>Content</p>',
        keywords: 'test, keywords',
        category: 'Mérito',
      });
      expect(mockOpenModal).toHaveBeenCalledWith('modelForm');
    });

    it('should handle model with array keywords', () => {
      const { result } = renderHook(() => useModelEditing(createDefaultProps()));
      const model = {
        ...createMockModel('model-1', 'Test'),
        keywords: ['key1', 'key2', 'key3'] as unknown as string,
      };

      act(() => {
        result.current.startEditingModel(model as Model);
      });

      expect(mockSetNewModel).toHaveBeenCalledWith(
        expect.objectContaining({
          keywords: 'key1, key2, key3',
        })
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // duplicateModel
  // ═══════════════════════════════════════════════════════════════════════════

  describe('duplicateModel', () => {
    it('should duplicate model with new id and modified title', async () => {
      const { result } = renderHook(() => useModelEditing(createDefaultProps()));
      const model = createMockModel('model-1', 'Original Model');

      await act(async () => {
        await result.current.duplicateModel(model);
      });

      expect(mockShowToast).toHaveBeenCalledWith('⏳ Duplicando modelo...', 'info');
      expect(mockSetModels).toHaveBeenCalled();
      expect(mockTrackChange).toHaveBeenCalledWith('create', expect.objectContaining({
        id: 'mock-model-id-123',
        title: 'Original Model (Cópia)',
      }));
      expect(mockSetHasUnsavedChanges).toHaveBeenCalledWith(true);
      expect(mockShowToast).toHaveBeenCalledWith('✅ Modelo duplicado com sucesso!', 'success');
    });

    it('should not preserve shared status on duplicate', async () => {
      const { result } = renderHook(() => useModelEditing(createDefaultProps()));
      const model = {
        ...createMockModel('model-1', 'Shared Model'),
        isShared: true,
        ownerId: 'owner-123',
        ownerEmail: 'owner@example.com',
      };

      await act(async () => {
        await result.current.duplicateModel(model as Model);
      });

      expect(mockTrackChange).toHaveBeenCalledWith('create', expect.objectContaining({
        isShared: false,
        ownerId: undefined,
        ownerEmail: undefined,
      }));
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CLOUD SYNC HANDLING
  // ═══════════════════════════════════════════════════════════════

  describe('Cloud Sync Handling', () => {
    it('should work without cloudSync (null)', async () => {
      const props = createDefaultProps();
      props.cloudSync = null;
      props.modelPreview.previewingModel = createMockModel('model-1', 'Test');

      const { result } = renderHook(() => useModelEditing(props));
      const editorRef = { current: { root: { innerHTML: '<p>Content</p>' } } };

      await act(async () => {
        await result.current.saveQuickEdit(editorRef as React.RefObject<{ root?: HTMLElement } | null>);
      });

      expect(mockSetModels).toHaveBeenCalled();
      expect(mockTrackChange).not.toHaveBeenCalled();
    });
  });
});

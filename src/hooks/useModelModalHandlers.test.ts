/**
 * @file useModelModalHandlers.test.ts
 * @description Testes para o hook useModelModalHandlers
 * @version 1.38.39
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useModelModalHandlers } from './useModelModalHandlers';
import type { Model } from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// MOCKS
// ═══════════════════════════════════════════════════════════════════════════

const mockCloseModal = vi.fn();
const mockOpenModal = vi.fn();
const mockSetModelToDelete = vi.fn();
const mockSetModels = vi.fn();
const mockSetSimilarityWarning = vi.fn();
const mockSetExtractedModelPreview = vi.fn();

let mockModelToDelete: Model | null = null;
let mockModels: Model[] = [];

vi.mock('../stores/useUIStore', () => ({
  useUIStore: vi.fn((selector) => {
    const state = {
      closeModal: mockCloseModal,
      openModal: mockOpenModal,
    };
    return selector(state);
  }),
}));

vi.mock('../stores/useModelsStore', () => ({
  useModelsStore: vi.fn((selector) => {
    const state = {
      modelToDelete: mockModelToDelete,
      setModelToDelete: mockSetModelToDelete,
      models: mockModels,
      setModels: mockSetModels,
      setSimilarityWarning: mockSetSimilarityWarning,
      setExtractedModelPreview: mockSetExtractedModelPreview,
    };
    return selector(state);
  }),
}));

describe('useModelModalHandlers', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // MOCK FACTORIES
  // ═══════════════════════════════════════════════════════════════════════════

  const createMockModel = (id: string, title: string, isShared = false): Model => ({
    id,
    title,
    category: 'Mérito',
    content: `<p>Conteúdo do modelo ${title}</p>`,
    favorite: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isShared,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockModelToDelete = null;
    mockModels = [];
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // BASIC FUNCTIONALITY TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Basic Functionality', () => {
    it('should return all expected handlers', () => {
      const { result } = renderHook(() => useModelModalHandlers());

      expect(result.current.confirmDeleteModel).toBeDefined();
      expect(result.current.cancelDeleteModel).toBeDefined();
      expect(result.current.confirmDeleteAllModels).toBeDefined();
      expect(result.current.cancelDeleteAllModels).toBeDefined();
      expect(result.current.cancelSimilarityWarning).toBeDefined();
      expect(result.current.cancelExtractedModelPreview).toBeDefined();
      expect(result.current.cancelBulkUpload).toBeDefined();
      expect(result.current.cancelBulkReview).toBeDefined();
      expect(result.current.openDeleteModelModal).toBeDefined();
      expect(result.current.openDeleteAllModelsModal).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DELETE MODEL TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Delete Model', () => {
    it('should not delete when modelToDelete is null', () => {
      mockModelToDelete = null;
      const { result } = renderHook(() => useModelModalHandlers());

      act(() => {
        result.current.confirmDeleteModel();
      });

      expect(mockSetModels).not.toHaveBeenCalled();
    });

    it('should delete model from list', () => {
      const model = createMockModel('1', 'Modelo A');
      mockModelToDelete = model;
      mockModels = [model, createMockModel('2', 'Modelo B')];

      const { result } = renderHook(() => useModelModalHandlers());

      act(() => {
        result.current.confirmDeleteModel();
      });

      expect(mockSetModels).toHaveBeenCalled();
      expect(mockSetModelToDelete).toHaveBeenCalledWith(null);
      expect(mockCloseModal).toHaveBeenCalledWith('deleteModel');
    });

    it('should call trackChange when provided', () => {
      const model = createMockModel('1', 'Modelo A');
      mockModelToDelete = model;
      const trackChange = vi.fn();

      const { result } = renderHook(() => useModelModalHandlers({ trackChange }));

      act(() => {
        result.current.confirmDeleteModel();
      });

      expect(trackChange).toHaveBeenCalledWith('delete', expect.objectContaining({
        id: '1',
        title: 'Modelo A',
      }));
    });

    it('should cancel delete and close modal', () => {
      const { result } = renderHook(() => useModelModalHandlers());

      act(() => {
        result.current.cancelDeleteModel();
      });

      expect(mockSetModelToDelete).toHaveBeenCalledWith(null);
      expect(mockCloseModal).toHaveBeenCalledWith('deleteModel');
    });

    it('should open delete modal with model', () => {
      const model = createMockModel('1', 'Modelo');
      const { result } = renderHook(() => useModelModalHandlers());

      act(() => {
        result.current.openDeleteModelModal(model);
      });

      expect(mockSetModelToDelete).toHaveBeenCalledWith(model);
      expect(mockOpenModal).toHaveBeenCalledWith('deleteModel');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DELETE ALL MODELS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Delete All Models', () => {
    it('should delete all local models but keep shared', () => {
      mockModels = [
        createMockModel('1', 'Local A', false),
        createMockModel('2', 'Local B', false),
        createMockModel('3', 'Shared', true),
      ];

      const { result } = renderHook(() => useModelModalHandlers());

      act(() => {
        result.current.confirmDeleteAllModels();
      });

      expect(mockSetModels).toHaveBeenCalled();
      expect(mockCloseModal).toHaveBeenCalledWith('deleteAllModels');
    });

    it('should call trackChange for each local model', () => {
      mockModels = [
        createMockModel('1', 'Local A', false),
        createMockModel('2', 'Local B', false),
        createMockModel('3', 'Shared', true),
      ];
      const trackChange = vi.fn();

      const { result } = renderHook(() => useModelModalHandlers({ trackChange }));

      act(() => {
        result.current.confirmDeleteAllModels();
      });

      // Should track delete for local models only (not shared)
      expect(trackChange).toHaveBeenCalledTimes(2);
    });

    it('should cancel delete all and close modal', () => {
      const { result } = renderHook(() => useModelModalHandlers());

      act(() => {
        result.current.cancelDeleteAllModels();
      });

      expect(mockCloseModal).toHaveBeenCalledWith('deleteAllModels');
    });

    it('should open delete all modal', () => {
      const { result } = renderHook(() => useModelModalHandlers());

      act(() => {
        result.current.openDeleteAllModelsModal();
      });

      expect(mockOpenModal).toHaveBeenCalledWith('deleteAllModels');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SIMILARITY WARNING TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Similarity Warning', () => {
    it('should cancel similarity warning', () => {
      const { result } = renderHook(() => useModelModalHandlers());

      act(() => {
        result.current.cancelSimilarityWarning();
      });

      expect(mockSetSimilarityWarning).toHaveBeenCalledWith(null);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EXTRACTED MODEL PREVIEW TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Extracted Model Preview', () => {
    it('should cancel extracted model preview', () => {
      const { result } = renderHook(() => useModelModalHandlers());

      act(() => {
        result.current.cancelExtractedModelPreview();
      });

      expect(mockSetExtractedModelPreview).toHaveBeenCalledWith(null);
      expect(mockCloseModal).toHaveBeenCalledWith('extractedModelPreview');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // BULK OPERATIONS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Bulk Operations', () => {
    it('should cancel bulk upload', () => {
      const { result } = renderHook(() => useModelModalHandlers());

      act(() => {
        result.current.cancelBulkUpload();
      });

      expect(mockCloseModal).toHaveBeenCalledWith('bulkModal');
    });

    it('should cancel bulk review', () => {
      const { result } = renderHook(() => useModelModalHandlers());

      act(() => {
        result.current.cancelBulkReview();
      });

      expect(mockCloseModal).toHaveBeenCalledWith('bulkReview');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PROPS HANDLING TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Props Handling', () => {
    it('should work without trackChange prop', () => {
      const model = createMockModel('1', 'Modelo');
      mockModelToDelete = model;

      const { result } = renderHook(() => useModelModalHandlers());

      act(() => {
        result.current.confirmDeleteModel();
      });

      expect(mockSetModels).toHaveBeenCalled();
    });

    it('should work with empty props', () => {
      const { result } = renderHook(() => useModelModalHandlers({}));

      expect(result.current.confirmDeleteModel).toBeDefined();
    });
  });
});

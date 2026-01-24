import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

// Mock stores
vi.mock('../stores/useModelsStore', () => ({
  useModelsStore: vi.fn((selector) => {
    const state = {
      models: [],
      setModels: vi.fn(),
      hasUnsavedChanges: false,
      setHasUnsavedChanges: vi.fn(),
    };
    return selector(state);
  }),
}));

import { useFileHandling } from './useFileHandling';

const mockModelLibrary = {
  models: [],
  setModels: vi.fn(),
  bulkFiles: [],
  setBulkFiles: vi.fn(),
  bulkProcessing: false,
  setBulkProcessing: vi.fn(),
  bulkCurrentFileIndex: 0,
  setBulkCurrentFileIndex: vi.fn(),
  bulkProcessedFiles: [],
  setBulkProcessedFiles: vi.fn(),
  bulkGeneratedModels: [],
  setBulkGeneratedModels: vi.fn(),
  bulkErrors: [],
  setBulkErrors: vi.fn(),
  bulkReviewModels: [],
  setBulkReviewModels: vi.fn(),
  bulkEditingModel: null,
  setBulkEditingModel: vi.fn(),
  bulkCancelController: null,
  setBulkCancelController: vi.fn(),
  bulkStaggerDelay: 500,
  bulkCurrentBatch: 0,
  setBulkCurrentBatch: vi.fn(),
  hasUnsavedChanges: false,
  setHasUnsavedChanges: vi.fn(),
  similarityWarning: null,
  setSimilarityWarning: vi.fn(),
};

const mockAIIntegration = {
  callAI: vi.fn(),
  extractResponseText: vi.fn(),
  aiSettings: { provider: 'claude' as const, model: 'claude-sonnet-4-20250514' },
};

const mockDocumentServices = {
  extractTextFromPDFPure: vi.fn(),
  extractTextFromDOCX: vi.fn(),
};

const defaultProps = {
  modelLibrary: mockModelLibrary,
  aiIntegration: mockAIIntegration,
  apiCache: { getCached: vi.fn(), setCached: vi.fn() },
  documentServices: mockDocumentServices,
  modelPreview: { previewingModel: null, setPreviewingModel: vi.fn() },
  showToast: vi.fn(),
  setError: vi.fn(),
  openModal: vi.fn(),
  closeModal: vi.fn(),
  processBulkSaveNext: vi.fn(),
};

describe('useFileHandling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('hook initialization', () => {
    it('should return all expected methods', () => {
      const { result } = renderHook(() => useFileHandling(defaultProps as any));

      expect(typeof result.current.handleBulkFileUpload).toBe('function');
      expect(typeof result.current.processBulkFiles).toBe('function');
      expect(typeof result.current.saveBulkModels).toBe('function');
      expect(typeof result.current.removeBulkReviewModel).toBe('function');
      expect(typeof result.current.generateModelsFromFileContent).toBe('function');
      expect(typeof result.current.getBulkPendingFilesCount).toBe('function');
      expect(typeof result.current.handleConfirmBulkCancel).toBe('function');
    });
  });

  describe('getBulkPendingFilesCount', () => {
    it('should return 0 when no pending files', () => {
      const { result } = renderHook(() => useFileHandling(defaultProps as any));
      expect(result.current.getBulkPendingFilesCount()).toBe(0);
    });
  });

  describe('handleConfirmBulkCancel', () => {
    it('should be callable', () => {
      const { result } = renderHook(() => useFileHandling(defaultProps as any));
      expect(() => result.current.handleConfirmBulkCancel()).not.toThrow();
    });
  });

  describe('generateModelsFromFileContent', () => {
    it('should be a function', () => {
      const { result } = renderHook(() => useFileHandling(defaultProps as any));
      expect(typeof result.current.generateModelsFromFileContent).toBe('function');
    });
  });

  describe('toggleFavorite', () => {
    it('should be a function', () => {
      const { result } = renderHook(() => useFileHandling(defaultProps as any));
      expect(typeof result.current.toggleFavorite).toBe('function');
    });
  });
});

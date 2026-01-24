import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEmbeddingsManagement } from './useEmbeddingsManagement';

const defaultProps = {
  showToast: vi.fn(),
  modelLibrary: {
    models: [],
    setModels: vi.fn(),
  },
  legislacao: {
    reloadArtigos: vi.fn().mockResolvedValue(0),
  },
  jurisprudencia: {
    reloadPrecedentes: vi.fn().mockResolvedValue(0),
  },
  indexedDB: {
    saveModels: vi.fn().mockResolvedValue(undefined),
  },
  searchModelReady: false,
};

describe('useEmbeddingsManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('hook initialization', () => {
    it('should return all expected state', () => {
      const { result } = renderHook(() => useEmbeddingsManagement(defaultProps));

      expect(typeof result.current.embeddingsCount).toBe('number');
      expect(typeof result.current.jurisEmbeddingsCount).toBe('number');
      expect(typeof result.current.generatingModelEmbeddings).toBe('boolean');
      expect(typeof result.current.importingEmbeddings).toBe('boolean');
      expect(typeof result.current.importingJurisEmbeddings).toBe('boolean');
      expect(typeof result.current.showDataDownloadModal).toBe('boolean');
      expect(typeof result.current.showEmbeddingsDownloadModal).toBe('boolean');
    });

    it('should return all expected handlers', () => {
      const { result } = renderHook(() => useEmbeddingsManagement(defaultProps));

      expect(typeof result.current.handleImportEmbeddings).toBe('function');
      expect(typeof result.current.handleImportJurisEmbeddings).toBe('function');
      expect(typeof result.current.handleStartDataDownload).toBe('function');
      expect(typeof result.current.handleStartEmbeddingsDownload).toBe('function');
      expect(typeof result.current.handleDismissDataPrompt).toBe('function');
      expect(typeof result.current.handleDismissEmbeddingsPrompt).toBe('function');
      expect(typeof result.current.clearEmbeddings).toBe('function');
      expect(typeof result.current.clearJurisEmbeddings).toBe('function');
      expect(typeof result.current.clearModelEmbeddings).toBe('function');
      expect(typeof result.current.generateModelEmbeddings).toBe('function');
    });

    it('should start with zero counts', () => {
      const { result } = renderHook(() => useEmbeddingsManagement(defaultProps));
      expect(result.current.embeddingsCount).toBe(0);
      expect(result.current.jurisEmbeddingsCount).toBe(0);
    });

    it('should start with modals hidden', () => {
      const { result } = renderHook(() => useEmbeddingsManagement(defaultProps));
      expect(result.current.showDataDownloadModal).toBe(false);
      expect(result.current.showEmbeddingsDownloadModal).toBe(false);
    });

    it('should not be generating initially', () => {
      const { result } = renderHook(() => useEmbeddingsManagement(defaultProps));
      expect(result.current.generatingModelEmbeddings).toBe(false);
      expect(result.current.importingEmbeddings).toBe(false);
      expect(result.current.importingJurisEmbeddings).toBe(false);
    });
  });

  describe('modal controls', () => {
    it('should toggle data download modal', () => {
      const { result } = renderHook(() => useEmbeddingsManagement(defaultProps));

      act(() => {
        result.current.setShowDataDownloadModal(true);
      });
      expect(result.current.showDataDownloadModal).toBe(true);

      act(() => {
        result.current.setShowDataDownloadModal(false);
      });
      expect(result.current.showDataDownloadModal).toBe(false);
    });

    it('should toggle embeddings download modal', () => {
      const { result } = renderHook(() => useEmbeddingsManagement(defaultProps));

      act(() => {
        result.current.setShowEmbeddingsDownloadModal(true);
      });
      expect(result.current.showEmbeddingsDownloadModal).toBe(true);
    });
  });

  describe('dismiss prompts', () => {
    it('should dismiss data prompt', () => {
      const { result } = renderHook(() => useEmbeddingsManagement(defaultProps));

      act(() => {
        result.current.setShowDataDownloadModal(true);
      });

      act(() => {
        result.current.handleDismissDataPrompt();
      });

      expect(result.current.showDataDownloadModal).toBe(false);
    });

    it('should dismiss embeddings prompt', () => {
      const { result } = renderHook(() => useEmbeddingsManagement(defaultProps));

      act(() => {
        result.current.setShowEmbeddingsDownloadModal(true);
      });

      act(() => {
        result.current.handleDismissEmbeddingsPrompt();
      });

      expect(result.current.showEmbeddingsDownloadModal).toBe(false);
    });
  });

  describe('clear operations', () => {
    it('should clear embeddings without error', async () => {
      const { result } = renderHook(() => useEmbeddingsManagement(defaultProps));

      await act(async () => {
        await result.current.clearEmbeddings();
      });

      expect(result.current.embeddingsCount).toBe(0);
    });

    it('should clear juris embeddings without error', async () => {
      const { result } = renderHook(() => useEmbeddingsManagement(defaultProps));

      await act(async () => {
        await result.current.clearJurisEmbeddings();
      });

      expect(result.current.jurisEmbeddingsCount).toBe(0);
    });

    it('should clear model embeddings without error', async () => {
      const { result } = renderHook(() => useEmbeddingsManagement(defaultProps));

      await act(async () => {
        await result.current.clearModelEmbeddings();
      });
      // No error thrown
    });
  });

  describe('embeddingsFileInputRef', () => {
    it('should provide a ref object', () => {
      const { result } = renderHook(() => useEmbeddingsManagement(defaultProps));
      expect(result.current.embeddingsFileInputRef).toBeDefined();
      expect(result.current.embeddingsFileInputRef.current).toBeNull();
    });
  });
});

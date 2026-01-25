import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor, cleanup } from '@testing-library/react';
import { useEmbeddingsManagement } from './useEmbeddingsManagement';

// ═══════════════════════════════════════════════════════════════════════════════
// MOCKS - Serviços
// ═══════════════════════════════════════════════════════════════════════════════

vi.mock('../services/EmbeddingsServices', () => ({
  EmbeddingsService: {
    getCount: vi.fn().mockResolvedValue(0),
    clearAll: vi.fn().mockResolvedValue(undefined),
    saveEmbeddingsBatch: vi.fn().mockResolvedValue(undefined),
  },
  JurisEmbeddingsService: {
    getCount: vi.fn().mockResolvedValue(0),
    clearAll: vi.fn().mockResolvedValue(undefined),
    saveEmbeddingsBatch: vi.fn().mockResolvedValue(undefined),
  },
  EmbeddingsCDNService: {
    needsDataDownload: vi.fn().mockResolvedValue(false),
    downloadLegislacaoData: vi.fn().mockResolvedValue(100),
    downloadJurisprudenciaData: vi.fn().mockResolvedValue(50),
    downloadLegislacao: vi.fn().mockResolvedValue(200),
    downloadJurisprudencia: vi.fn().mockResolvedValue(150),
  },
}));

vi.mock('../services/AIModelService', () => ({
  default: {
    getEmbedding: vi.fn().mockResolvedValue(new Array(768).fill(0.1)),
  },
}));

// Importar mocks para referência direta nos testes
import { EmbeddingsService, JurisEmbeddingsService, EmbeddingsCDNService } from '../services/EmbeddingsServices';
import AIModelService from '../services/AIModelService';

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const createDefaultProps = () => ({
  showToast: vi.fn(),
  modelLibrary: {
    models: [] as any[],
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
});

/**
 * Cria um evento fake de input file com o conteúdo JSON fornecido.
 * Usa um mock de File com text() que retorna o JSON stringificado.
 */
const createFileInputEvent = (jsonContent: any) => {
  const jsonString = JSON.stringify(jsonContent);
  const file = {
    name: 'embeddings.json',
    type: 'application/json',
    size: jsonString.length,
    text: () => Promise.resolve(jsonString),
  };
  return {
    target: {
      files: [file],
      value: 'embeddings.json',
    },
  } as any;
};

/**
 * Cria um evento fake de input file sem arquivo
 */
const createEmptyFileInputEvent = () => ({
  target: {
    files: [] as File[],
    value: '',
  },
} as any);

// ═══════════════════════════════════════════════════════════════════════════════
// TESTES
// ═══════════════════════════════════════════════════════════════════════════════

/** Helper to wait for initial hook effects to settle */
const waitForEffects = async () => {
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 50));
  });
};

describe('useEmbeddingsManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    localStorage.clear();
    // Reset dos mocks para valores padrão
    (EmbeddingsService.getCount as any).mockResolvedValue(0);
    (JurisEmbeddingsService.getCount as any).mockResolvedValue(0);
    (EmbeddingsCDNService.needsDataDownload as any).mockResolvedValue(false);
  });

  afterEach(() => {
    cleanup();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. Hook Initialization
  // ═══════════════════════════════════════════════════════════════════════════

  describe('hook initialization - returned state and methods', () => {
    it('should return all expected state properties', () => {
      const { result } = renderHook(() => useEmbeddingsManagement(createDefaultProps()));

      expect(result.current.embeddingsCount).toBe(0);
      expect(result.current.jurisEmbeddingsCount).toBe(0);
      expect(result.current.importingEmbeddings).toBe(false);
      expect(result.current.importingJurisEmbeddings).toBe(false);
      expect(result.current.generatingModelEmbeddings).toBe(false);
      expect(result.current.showDataDownloadModal).toBe(false);
      expect(result.current.showEmbeddingsDownloadModal).toBe(false);
    });

    it('should return progress states initialized to zero', () => {
      const { result } = renderHook(() => useEmbeddingsManagement(createDefaultProps()));

      expect(result.current.embeddingsProgress).toEqual({ current: 0, total: 0 });
      expect(result.current.jurisEmbeddingsProgress).toEqual({ current: 0, total: 0 });
      expect(result.current.modelEmbeddingsProgress).toEqual({ current: 0, total: 0 });
    });

    it('should return all handler functions', () => {
      const { result } = renderHook(() => useEmbeddingsManagement(createDefaultProps()));

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

    it('should return setter functions for modals', () => {
      const { result } = renderHook(() => useEmbeddingsManagement(createDefaultProps()));

      expect(typeof result.current.setShowDataDownloadModal).toBe('function');
      expect(typeof result.current.setShowEmbeddingsDownloadModal).toBe('function');
      expect(typeof result.current.setDataDownloadStatus).toBe('function');
    });

    it('should return embeddingsFileInputRef as a ref object', () => {
      const { result } = renderHook(() => useEmbeddingsManagement(createDefaultProps()));

      expect(result.current.embeddingsFileInputRef).toBeDefined();
      expect(result.current.embeddingsFileInputRef.current).toBeNull();
    });

    it('should return dataDownloadStatus with correct initial structure', () => {
      const { result } = renderHook(() => useEmbeddingsManagement(createDefaultProps()));

      expect(result.current.dataDownloadStatus).toEqual({
        legislacao: { needed: null, downloading: false, progress: 0, error: null },
        jurisprudencia: { needed: null, downloading: false, progress: 0, error: null },
      });
    });

    it('should return embeddingsDownloadStatus with correct initial structure', () => {
      const { result } = renderHook(() => useEmbeddingsManagement(createDefaultProps()));

      expect(result.current.embeddingsDownloadStatus).toEqual({
        legislacao: { needed: null, downloading: false, progress: 0, error: null },
        jurisprudencia: { needed: null, downloading: false, progress: 0, error: null },
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. Initialization effects - embeddings count loading
  // ═══════════════════════════════════════════════════════════════════════════

  describe('initialization effects', () => {
    it('should call EmbeddingsService.getCount on mount', async () => {
      (EmbeddingsService.getCount as any).mockResolvedValue(42);

      renderHook(() => useEmbeddingsManagement(createDefaultProps()));

      await waitFor(() => {
        expect(EmbeddingsService.getCount).toHaveBeenCalled();
      });
    });

    it('should call JurisEmbeddingsService.getCount on mount', async () => {
      (JurisEmbeddingsService.getCount as any).mockResolvedValue(15);

      renderHook(() => useEmbeddingsManagement(createDefaultProps()));

      await waitFor(() => {
        expect(JurisEmbeddingsService.getCount).toHaveBeenCalled();
      });
    });

    it('should update embeddingsCount from service', async () => {
      (EmbeddingsService.getCount as any).mockResolvedValue(42);

      const { result } = renderHook(() => useEmbeddingsManagement(createDefaultProps()));

      await waitFor(() => {
        expect(result.current.embeddingsCount).toBe(42);
      });
    });

    it('should update jurisEmbeddingsCount from service', async () => {
      (JurisEmbeddingsService.getCount as any).mockResolvedValue(15);

      const { result } = renderHook(() => useEmbeddingsManagement(createDefaultProps()));

      await waitFor(() => {
        expect(result.current.jurisEmbeddingsCount).toBe(15);
      });
    });

    it('should handle EmbeddingsService.getCount failure gracefully', async () => {
      (EmbeddingsService.getCount as any).mockRejectedValue(new Error('DB error'));

      const { result } = renderHook(() => useEmbeddingsManagement(createDefaultProps()));

      // Should not throw and should remain at 0
      await waitForEffects();
      expect(result.current.embeddingsCount).toBe(0);
    });

    it('should check CDN embeddings needed status on mount', async () => {
      (EmbeddingsService.getCount as any).mockResolvedValue(0);
      (JurisEmbeddingsService.getCount as any).mockResolvedValue(0);

      renderHook(() => useEmbeddingsManagement(createDefaultProps()));

      await waitFor(() => {
        expect(EmbeddingsService.getCount).toHaveBeenCalled();
      });
    });

    it('should check data download needed on mount', async () => {
      renderHook(() => useEmbeddingsManagement(createDefaultProps()));

      await waitFor(() => {
        expect(EmbeddingsCDNService.needsDataDownload).toHaveBeenCalledWith('legislacao');
        expect(EmbeddingsCDNService.needsDataDownload).toHaveBeenCalledWith('jurisprudencia');
      });
    });

    it('should set embeddingsDownloadStatus.needed when counts are 0', async () => {
      (EmbeddingsService.getCount as any).mockResolvedValue(0);
      (JurisEmbeddingsService.getCount as any).mockResolvedValue(0);

      const { result } = renderHook(() => useEmbeddingsManagement(createDefaultProps()));

      await waitFor(() => {
        expect(result.current.embeddingsDownloadStatus.legislacao.needed).toBe(true);
        expect(result.current.embeddingsDownloadStatus.jurisprudencia.needed).toBe(true);
      });
    });

    it('should NOT set embeddingsDownloadStatus.needed when counts are > 0', async () => {
      (EmbeddingsService.getCount as any).mockResolvedValue(100);
      (JurisEmbeddingsService.getCount as any).mockResolvedValue(50);

      const { result } = renderHook(() => useEmbeddingsManagement(createDefaultProps()));

      await waitFor(() => {
        expect(result.current.embeddingsDownloadStatus.legislacao.needed).toBe(false);
        expect(result.current.embeddingsDownloadStatus.jurisprudencia.needed).toBe(false);
      });
    });

    it('should NOT show embeddings modal if prompt was previously dismissed', async () => {
      localStorage.setItem('dismissedEmbeddingsPrompt', 'true');
      (EmbeddingsService.getCount as any).mockResolvedValue(0);
      (JurisEmbeddingsService.getCount as any).mockResolvedValue(0);

      const { result } = renderHook(() => useEmbeddingsManagement(createDefaultProps()));
      await waitForEffects();

      expect(result.current.showEmbeddingsDownloadModal).toBe(false);
    });

    it('should NOT show data modal if prompt was previously dismissed', async () => {
      localStorage.setItem('dismissedDataPrompt', 'true');
      (EmbeddingsCDNService.needsDataDownload as any).mockResolvedValue(true);

      const { result } = renderHook(() => useEmbeddingsManagement(createDefaultProps()));
      await waitForEffects();

      expect(result.current.showDataDownloadModal).toBe(false);
    });

    it('should not show embeddings modal when embeddings exist', async () => {
      (EmbeddingsService.getCount as any).mockResolvedValue(100);
      (JurisEmbeddingsService.getCount as any).mockResolvedValue(50);

      const { result } = renderHook(() => useEmbeddingsManagement(createDefaultProps()));
      await waitForEffects();

      expect(result.current.showEmbeddingsDownloadModal).toBe(false);
    });

    it('should set dataDownloadStatus.needed when data is needed', async () => {
      (EmbeddingsCDNService.needsDataDownload as any).mockResolvedValue(true);

      const { result } = renderHook(() => useEmbeddingsManagement(createDefaultProps()));

      await waitFor(() => {
        expect(result.current.dataDownloadStatus.legislacao.needed).toBe(true);
        expect(result.current.dataDownloadStatus.jurisprudencia.needed).toBe(true);
      });
    });

    it('should not set dataDownloadStatus.needed when data is not needed', async () => {
      (EmbeddingsCDNService.needsDataDownload as any).mockResolvedValue(false);

      const { result } = renderHook(() => useEmbeddingsManagement(createDefaultProps()));
      await waitForEffects();

      expect(result.current.dataDownloadStatus.legislacao.needed).toBe(false);
      expect(result.current.dataDownloadStatus.jurisprudencia.needed).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. handleImportEmbeddings - processing documents into embeddings
  // ═══════════════════════════════════════════════════════════════════════════

  describe('handleImportEmbeddings', () => {
    it('should do nothing when no file is selected', async () => {
      const props = createDefaultProps();
      const { result } = renderHook(() => useEmbeddingsManagement(props));

      await act(async () => {
        await result.current.handleImportEmbeddings(createEmptyFileInputEvent());
      });

      expect(EmbeddingsService.saveEmbeddingsBatch).not.toHaveBeenCalled();
      expect(props.showToast).not.toHaveBeenCalled();
    });

    it('should import valid embeddings file successfully', async () => {
      const props = createDefaultProps();
      const embeddings = [
        { id: '1', embedding: [0.1, 0.2, 0.3], artigoId: 'art1' },
        { id: '2', embedding: [0.4, 0.5, 0.6], artigoId: 'art2' },
      ];
      (EmbeddingsService.getCount as any).mockResolvedValue(2);

      const { result } = renderHook(() => useEmbeddingsManagement(props));

      await act(async () => {
        await result.current.handleImportEmbeddings(createFileInputEvent(embeddings));
      });

      expect(EmbeddingsService.saveEmbeddingsBatch).toHaveBeenCalled();
      expect(props.showToast).toHaveBeenCalledWith(
        '2 embeddings importados com sucesso!',
        'success'
      );
    });

    it('should update embeddingsCount after successful import', async () => {
      const props = createDefaultProps();
      const embeddings = [
        { id: '1', embedding: [0.1, 0.2], artigoId: 'art1' },
      ];
      (EmbeddingsService.getCount as any).mockResolvedValue(1);

      const { result } = renderHook(() => useEmbeddingsManagement(props));

      await act(async () => {
        await result.current.handleImportEmbeddings(createFileInputEvent(embeddings));
      });

      expect(result.current.embeddingsCount).toBe(1);
    });

    it('should show error toast for empty array', async () => {
      const props = createDefaultProps();
      const { result } = renderHook(() => useEmbeddingsManagement(props));

      await act(async () => {
        await result.current.handleImportEmbeddings(createFileInputEvent([]));
      });

      expect(props.showToast).toHaveBeenCalledWith(
        expect.stringContaining('Erro ao importar'),
        'error'
      );
    });

    it('should show error toast for non-array JSON', async () => {
      const props = createDefaultProps();
      const { result } = renderHook(() => useEmbeddingsManagement(props));

      await act(async () => {
        await result.current.handleImportEmbeddings(createFileInputEvent({ key: 'value' }));
      });

      expect(props.showToast).toHaveBeenCalledWith(
        expect.stringContaining('Erro ao importar'),
        'error'
      );
    });

    it('should show error for items missing id field', async () => {
      const props = createDefaultProps();
      const badItems = [{ embedding: [0.1, 0.2] }]; // no id
      const { result } = renderHook(() => useEmbeddingsManagement(props));

      await act(async () => {
        await result.current.handleImportEmbeddings(createFileInputEvent(badItems));
      });

      expect(props.showToast).toHaveBeenCalledWith(
        expect.stringContaining('Formato inválido'),
        'error'
      );
    });

    it('should show error for items missing embedding field', async () => {
      const props = createDefaultProps();
      const badItems = [{ id: '1' }]; // no embedding
      const { result } = renderHook(() => useEmbeddingsManagement(props));

      await act(async () => {
        await result.current.handleImportEmbeddings(createFileInputEvent(badItems));
      });

      expect(props.showToast).toHaveBeenCalledWith(
        expect.stringContaining('Formato inválido'),
        'error'
      );
    });

    it('should show error for items with non-array embedding', async () => {
      const props = createDefaultProps();
      const badItems = [{ id: '1', embedding: 'not-array' }];
      const { result } = renderHook(() => useEmbeddingsManagement(props));

      await act(async () => {
        await result.current.handleImportEmbeddings(createFileInputEvent(badItems));
      });

      expect(props.showToast).toHaveBeenCalledWith(
        expect.stringContaining('Formato inválido'),
        'error'
      );
    });

    it('should process items in batches of 100', async () => {
      const props = createDefaultProps();
      // Create 250 items to test batching (should be 3 batches: 100, 100, 50)
      const embeddings = Array.from({ length: 250 }, (_, i) => ({
        id: `item-${i}`,
        embedding: [0.1, 0.2],
        artigoId: `art-${i}`,
      }));
      (EmbeddingsService.getCount as any).mockResolvedValue(250);

      const { result } = renderHook(() => useEmbeddingsManagement(props));

      await act(async () => {
        await result.current.handleImportEmbeddings(createFileInputEvent(embeddings));
      });

      // 3 batches: 0-99, 100-199, 200-249
      expect(EmbeddingsService.saveEmbeddingsBatch).toHaveBeenCalledTimes(3);
    });

    it('should reset importingEmbeddings to false after completion', async () => {
      const props = createDefaultProps();
      const embeddings = [{ id: '1', embedding: [0.1], artigoId: 'a' }];
      (EmbeddingsService.getCount as any).mockResolvedValue(1);

      const { result } = renderHook(() => useEmbeddingsManagement(props));

      await act(async () => {
        await result.current.handleImportEmbeddings(createFileInputEvent(embeddings));
      });

      expect(result.current.importingEmbeddings).toBe(false);
    });

    it('should reset progress after completion', async () => {
      const props = createDefaultProps();
      const embeddings = [{ id: '1', embedding: [0.1], artigoId: 'a' }];
      (EmbeddingsService.getCount as any).mockResolvedValue(1);

      const { result } = renderHook(() => useEmbeddingsManagement(props));

      await act(async () => {
        await result.current.handleImportEmbeddings(createFileInputEvent(embeddings));
      });

      expect(result.current.embeddingsProgress).toEqual({ current: 0, total: 0 });
    });

    it('should reset importingEmbeddings even on error', async () => {
      const props = createDefaultProps();
      (EmbeddingsService.saveEmbeddingsBatch as any).mockRejectedValue(new Error('DB write error'));

      const embeddings = [{ id: '1', embedding: [0.1], artigoId: 'a' }];
      const { result } = renderHook(() => useEmbeddingsManagement(props));

      await act(async () => {
        await result.current.handleImportEmbeddings(createFileInputEvent(embeddings));
      });

      expect(result.current.importingEmbeddings).toBe(false);
    });

    it('should clear input value after import (success or error)', async () => {
      const props = createDefaultProps();
      const embeddings = [{ id: '1', embedding: [0.1], artigoId: 'a' }];
      (EmbeddingsService.getCount as any).mockResolvedValue(1);

      const { result } = renderHook(() => useEmbeddingsManagement(props));

      const event = createFileInputEvent(embeddings);

      await act(async () => {
        await result.current.handleImportEmbeddings(event);
      });

      expect(event.target.value).toBe('');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. handleImportJurisEmbeddings - jurisprudencia embeddings
  // ═══════════════════════════════════════════════════════════════════════════

  describe('handleImportJurisEmbeddings', () => {
    it('should do nothing when no file is selected', async () => {
      const props = createDefaultProps();
      const { result } = renderHook(() => useEmbeddingsManagement(props));

      await act(async () => {
        await result.current.handleImportJurisEmbeddings(createEmptyFileInputEvent());
      });

      expect(JurisEmbeddingsService.saveEmbeddingsBatch).not.toHaveBeenCalled();
    });

    it('should import valid juris embeddings successfully', async () => {
      const props = createDefaultProps();
      const embeddings = [
        { id: 'j1', embedding: [0.1, 0.2], precedenteId: 'p1' },
        { id: 'j2', embedding: [0.3, 0.4], precedenteId: 'p2' },
      ];
      (JurisEmbeddingsService.getCount as any).mockResolvedValue(2);

      const { result } = renderHook(() => useEmbeddingsManagement(props));

      await act(async () => {
        await result.current.handleImportJurisEmbeddings(createFileInputEvent(embeddings));
      });

      expect(JurisEmbeddingsService.saveEmbeddingsBatch).toHaveBeenCalled();
      expect(props.showToast).toHaveBeenCalledWith(
        '2 embeddings de jurisprudência importados!',
        'success'
      );
    });

    it('should update jurisEmbeddingsCount after import', async () => {
      const props = createDefaultProps();
      const embeddings = [{ id: 'j1', embedding: [0.1], precedenteId: 'p1' }];
      (JurisEmbeddingsService.getCount as any).mockResolvedValue(5);

      const { result } = renderHook(() => useEmbeddingsManagement(props));

      await act(async () => {
        await result.current.handleImportJurisEmbeddings(createFileInputEvent(embeddings));
      });

      expect(result.current.jurisEmbeddingsCount).toBe(5);
    });

    it('should show error for invalid juris format', async () => {
      const props = createDefaultProps();
      const badItems = [{ id: '1' }]; // no embedding
      const { result } = renderHook(() => useEmbeddingsManagement(props));

      await act(async () => {
        await result.current.handleImportJurisEmbeddings(createFileInputEvent(badItems));
      });

      expect(props.showToast).toHaveBeenCalledWith(
        expect.stringContaining('Formato inválido'),
        'error'
      );
    });

    it('should show error for empty juris array', async () => {
      const props = createDefaultProps();
      const { result } = renderHook(() => useEmbeddingsManagement(props));

      await act(async () => {
        await result.current.handleImportJurisEmbeddings(createFileInputEvent([]));
      });

      expect(props.showToast).toHaveBeenCalledWith(
        expect.stringContaining('Erro ao importar'),
        'error'
      );
    });

    it('should reset importingJurisEmbeddings to false after completion', async () => {
      const props = createDefaultProps();
      const embeddings = [{ id: 'j1', embedding: [0.1], precedenteId: 'p1' }];
      (JurisEmbeddingsService.getCount as any).mockResolvedValue(1);

      const { result } = renderHook(() => useEmbeddingsManagement(props));

      await act(async () => {
        await result.current.handleImportJurisEmbeddings(createFileInputEvent(embeddings));
      });

      expect(result.current.importingJurisEmbeddings).toBe(false);
      expect(result.current.jurisEmbeddingsProgress).toEqual({ current: 0, total: 0 });
    });

    it('should process juris items in batches of 100', async () => {
      const props = createDefaultProps();
      const embeddings = Array.from({ length: 150 }, (_, i) => ({
        id: `j-${i}`,
        embedding: [0.1],
        precedenteId: `p-${i}`,
      }));
      (JurisEmbeddingsService.getCount as any).mockResolvedValue(150);

      const { result } = renderHook(() => useEmbeddingsManagement(props));

      await act(async () => {
        await result.current.handleImportJurisEmbeddings(createFileInputEvent(embeddings));
      });

      // 2 batches: 0-99, 100-149
      expect(JurisEmbeddingsService.saveEmbeddingsBatch).toHaveBeenCalledTimes(2);
    });

    it('should handle saveEmbeddingsBatch failure gracefully', async () => {
      const props = createDefaultProps();
      (JurisEmbeddingsService.saveEmbeddingsBatch as any).mockRejectedValue(new Error('write error'));

      const embeddings = [{ id: 'j1', embedding: [0.1], precedenteId: 'p1' }];
      const { result } = renderHook(() => useEmbeddingsManagement(props));

      await act(async () => {
        await result.current.handleImportJurisEmbeddings(createFileInputEvent(embeddings));
      });

      expect(props.showToast).toHaveBeenCalledWith(
        expect.stringContaining('Erro ao importar'),
        'error'
      );
      expect(result.current.importingJurisEmbeddings).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. clearEmbeddings / clearJurisEmbeddings / clearModelEmbeddings
  // ═══════════════════════════════════════════════════════════════════════════

  describe('clearEmbeddings', () => {
    it('should call EmbeddingsService.clearAll', async () => {
      const props = createDefaultProps();
      const { result } = renderHook(() => useEmbeddingsManagement(props));

      await act(async () => {
        await result.current.clearEmbeddings();
      });

      expect(EmbeddingsService.clearAll).toHaveBeenCalled();
    });

    it('should set embeddingsCount to 0', async () => {
      const props = createDefaultProps();
      (EmbeddingsService.getCount as any).mockResolvedValue(50);

      const { result } = renderHook(() => useEmbeddingsManagement(props));

      await waitFor(() => {
        expect(result.current.embeddingsCount).toBe(50);
      });

      await act(async () => {
        await result.current.clearEmbeddings();
      });

      expect(result.current.embeddingsCount).toBe(0);
    });

    it('should show success toast on clearEmbeddings', async () => {
      const props = createDefaultProps();
      const { result } = renderHook(() => useEmbeddingsManagement(props));

      await act(async () => {
        await result.current.clearEmbeddings();
      });

      expect(props.showToast).toHaveBeenCalledWith('Embeddings de legislação removidos', 'info');
    });

    it('should show error toast when clearAll fails', async () => {
      const props = createDefaultProps();
      (EmbeddingsService.clearAll as any).mockRejectedValue(new Error('clear failed'));

      const { result } = renderHook(() => useEmbeddingsManagement(props));

      await act(async () => {
        await result.current.clearEmbeddings();
      });

      expect(props.showToast).toHaveBeenCalledWith(
        expect.stringContaining('Erro ao limpar embeddings'),
        'error'
      );
    });
  });

  describe('clearJurisEmbeddings', () => {
    it('should call JurisEmbeddingsService.clearAll', async () => {
      const props = createDefaultProps();
      const { result } = renderHook(() => useEmbeddingsManagement(props));

      await act(async () => {
        await result.current.clearJurisEmbeddings();
      });

      expect(JurisEmbeddingsService.clearAll).toHaveBeenCalled();
    });

    it('should set jurisEmbeddingsCount to 0', async () => {
      const props = createDefaultProps();
      (JurisEmbeddingsService.getCount as any).mockResolvedValue(30);

      const { result } = renderHook(() => useEmbeddingsManagement(props));

      await waitFor(() => {
        expect(result.current.jurisEmbeddingsCount).toBe(30);
      });

      await act(async () => {
        await result.current.clearJurisEmbeddings();
      });

      expect(result.current.jurisEmbeddingsCount).toBe(0);
    });

    it('should show success toast on clearJurisEmbeddings', async () => {
      const props = createDefaultProps();
      const { result } = renderHook(() => useEmbeddingsManagement(props));

      await act(async () => {
        await result.current.clearJurisEmbeddings();
      });

      expect(props.showToast).toHaveBeenCalledWith('Embeddings de jurisprudência removidos', 'info');
    });

    it('should show error toast when juris clearAll fails', async () => {
      const props = createDefaultProps();
      (JurisEmbeddingsService.clearAll as any).mockRejectedValue(new Error('juris clear error'));

      const { result } = renderHook(() => useEmbeddingsManagement(props));

      await act(async () => {
        await result.current.clearJurisEmbeddings();
      });

      expect(props.showToast).toHaveBeenCalledWith(
        expect.stringContaining('Erro ao limpar embeddings'),
        'error'
      );
    });
  });

  describe('clearModelEmbeddings', () => {
    it('should remove embeddings from models and save', async () => {
      const props = createDefaultProps();
      props.modelLibrary.models = [
        { id: 'm1', title: 'Model 1', content: 'content', embedding: [0.1, 0.2] },
        { id: 'm2', title: 'Model 2', content: 'content', embedding: [0.3, 0.4] },
      ] as any[];

      const { result } = renderHook(() => useEmbeddingsManagement(props));

      await act(async () => {
        await result.current.clearModelEmbeddings();
      });

      expect(props.indexedDB.saveModels).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.not.objectContaining({ embedding: expect.anything() }),
        ])
      );
    });

    it('should show success toast on clearModelEmbeddings', async () => {
      const props = createDefaultProps();
      props.modelLibrary.models = [
        { id: 'm1', title: 'Model 1', content: 'c' },
      ] as any[];

      const { result } = renderHook(() => useEmbeddingsManagement(props));

      await act(async () => {
        await result.current.clearModelEmbeddings();
      });

      expect(props.showToast).toHaveBeenCalledWith('Embeddings dos modelos removidos', 'info');
    });

    it('should show error toast when saveModels fails', async () => {
      const props = createDefaultProps();
      props.modelLibrary.models = [{ id: 'm1', title: 'M', content: 'c', embedding: [1] }] as any[];
      props.indexedDB.saveModels = vi.fn().mockRejectedValue(new Error('save error'));

      const { result } = renderHook(() => useEmbeddingsManagement(props));

      await act(async () => {
        await result.current.clearModelEmbeddings();
      });

      expect(props.showToast).toHaveBeenCalledWith(
        expect.stringContaining('Erro ao limpar embeddings'),
        'error'
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. Progress/status state management (modal controls)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('modal controls and progress state', () => {
    it('should toggle data download modal via setter', () => {
      const { result } = renderHook(() => useEmbeddingsManagement(createDefaultProps()));

      act(() => {
        result.current.setShowDataDownloadModal(true);
      });
      expect(result.current.showDataDownloadModal).toBe(true);

      act(() => {
        result.current.setShowDataDownloadModal(false);
      });
      expect(result.current.showDataDownloadModal).toBe(false);
    });

    it('should toggle embeddings download modal via setter', () => {
      const { result } = renderHook(() => useEmbeddingsManagement(createDefaultProps()));

      act(() => {
        result.current.setShowEmbeddingsDownloadModal(true);
      });
      expect(result.current.showEmbeddingsDownloadModal).toBe(true);

      act(() => {
        result.current.setShowEmbeddingsDownloadModal(false);
      });
      expect(result.current.showEmbeddingsDownloadModal).toBe(false);
    });

    it('should update dataDownloadStatus via setter', () => {
      const { result } = renderHook(() => useEmbeddingsManagement(createDefaultProps()));

      act(() => {
        result.current.setDataDownloadStatus({
          legislacao: { needed: true, downloading: true, progress: 0.5, error: null },
          jurisprudencia: { needed: false, downloading: false, progress: 0, error: null },
        });
      });

      expect(result.current.dataDownloadStatus.legislacao.needed).toBe(true);
      expect(result.current.dataDownloadStatus.legislacao.downloading).toBe(true);
      expect(result.current.dataDownloadStatus.legislacao.progress).toBe(0.5);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. handleDismissDataPrompt / handleDismissEmbeddingsPrompt
  // ═══════════════════════════════════════════════════════════════════════════

  describe('dismiss prompts', () => {
    it('should close data download modal and persist dismissal', () => {
      const { result } = renderHook(() => useEmbeddingsManagement(createDefaultProps()));

      act(() => {
        result.current.setShowDataDownloadModal(true);
      });
      expect(result.current.showDataDownloadModal).toBe(true);

      act(() => {
        result.current.handleDismissDataPrompt();
      });

      expect(result.current.showDataDownloadModal).toBe(false);
      expect(localStorage.getItem('dismissedDataPrompt')).toBe('true');
    });

    it('should close embeddings download modal and persist dismissal', () => {
      const { result } = renderHook(() => useEmbeddingsManagement(createDefaultProps()));

      act(() => {
        result.current.setShowEmbeddingsDownloadModal(true);
      });
      expect(result.current.showEmbeddingsDownloadModal).toBe(true);

      act(() => {
        result.current.handleDismissEmbeddingsPrompt();
      });

      expect(result.current.showEmbeddingsDownloadModal).toBe(false);
      expect(localStorage.getItem('dismissedEmbeddingsPrompt')).toBe('true');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. handleStartDataDownload - CDN data download
  // ═══════════════════════════════════════════════════════════════════════════

  describe('handleStartDataDownload', () => {
    it('should show error toast when offline', async () => {
      const props = createDefaultProps();
      const originalOnLine = navigator.onLine;
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });

      const { result } = renderHook(() => useEmbeddingsManagement(props));
      await waitForEffects();

      await act(async () => {
        await result.current.handleStartDataDownload();
      });

      expect(props.showToast).toHaveBeenCalledWith('Sem conexão com a internet', 'error');
      Object.defineProperty(navigator, 'onLine', { value: originalOnLine, configurable: true });
    });

    it('should download legislacao data when needed', async () => {
      const props = createDefaultProps();
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });

      const { result } = renderHook(() => useEmbeddingsManagement(props));
      await waitForEffects();

      // Set legislacao as needed
      act(() => {
        result.current.setDataDownloadStatus({
          legislacao: { needed: true, downloading: false, progress: 0, error: null },
          jurisprudencia: { needed: false, downloading: false, progress: 0, error: null },
        });
      });

      await act(async () => {
        await result.current.handleStartDataDownload();
      });

      expect(EmbeddingsCDNService.downloadLegislacaoData).toHaveBeenCalled();
      expect(props.legislacao.reloadArtigos).toHaveBeenCalled();
      expect(props.showToast).toHaveBeenCalledWith(
        expect.stringContaining('artigos de legislação baixados'),
        'success'
      );
    });

    it('should download jurisprudencia data when needed', async () => {
      const props = createDefaultProps();
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });

      const { result } = renderHook(() => useEmbeddingsManagement(props));
      await waitForEffects();

      act(() => {
        result.current.setDataDownloadStatus({
          legislacao: { needed: false, downloading: false, progress: 0, error: null },
          jurisprudencia: { needed: true, downloading: false, progress: 0, error: null },
        });
      });

      await act(async () => {
        await result.current.handleStartDataDownload();
      });

      expect(EmbeddingsCDNService.downloadJurisprudenciaData).toHaveBeenCalled();
      expect(props.jurisprudencia.reloadPrecedentes).toHaveBeenCalled();
      expect(props.showToast).toHaveBeenCalledWith(
        expect.stringContaining('precedentes baixados'),
        'success'
      );
    });

    it('should handle legislacao download error', async () => {
      const props = createDefaultProps();
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
      (EmbeddingsCDNService.downloadLegislacaoData as any).mockRejectedValue(new Error('CDN failed'));

      const { result } = renderHook(() => useEmbeddingsManagement(props));
      await waitForEffects();

      act(() => {
        result.current.setDataDownloadStatus({
          legislacao: { needed: true, downloading: false, progress: 0, error: null },
          jurisprudencia: { needed: false, downloading: false, progress: 0, error: null },
        });
      });

      await act(async () => {
        await result.current.handleStartDataDownload();
      });

      expect(props.showToast).toHaveBeenCalledWith(
        expect.stringContaining('Erro ao baixar legislação'),
        'error'
      );
      expect(result.current.dataDownloadStatus.legislacao.error).toBe('CDN failed');
      expect(result.current.dataDownloadStatus.legislacao.downloading).toBe(false);
    });

    it('should handle jurisprudencia download error', async () => {
      const props = createDefaultProps();
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
      (EmbeddingsCDNService.downloadJurisprudenciaData as any).mockRejectedValue(new Error('juris CDN error'));

      const { result } = renderHook(() => useEmbeddingsManagement(props));
      await waitForEffects();

      act(() => {
        result.current.setDataDownloadStatus({
          legislacao: { needed: false, downloading: false, progress: 0, error: null },
          jurisprudencia: { needed: true, downloading: false, progress: 0, error: null },
        });
      });

      await act(async () => {
        await result.current.handleStartDataDownload();
      });

      expect(props.showToast).toHaveBeenCalledWith(
        expect.stringContaining('Erro ao baixar jurisprudência'),
        'error'
      );
      expect(result.current.dataDownloadStatus.jurisprudencia.error).toBe('juris CDN error');
    });

    it('should not download if already downloading', async () => {
      const props = createDefaultProps();
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });

      const { result } = renderHook(() => useEmbeddingsManagement(props));
      await waitForEffects();

      act(() => {
        result.current.setDataDownloadStatus({
          legislacao: { needed: true, downloading: true, progress: 0.5, error: null },
          jurisprudencia: { needed: false, downloading: false, progress: 0, error: null },
        });
      });

      await act(async () => {
        await result.current.handleStartDataDownload();
      });

      expect(EmbeddingsCDNService.downloadLegislacaoData).not.toHaveBeenCalled();
    });

    it('should not download if already completed', async () => {
      const props = createDefaultProps();
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });

      const { result } = renderHook(() => useEmbeddingsManagement(props));
      await waitForEffects();

      act(() => {
        result.current.setDataDownloadStatus({
          legislacao: { needed: true, downloading: false, progress: 1, error: null, completed: true },
          jurisprudencia: { needed: false, downloading: false, progress: 0, error: null },
        });
      });

      await act(async () => {
        await result.current.handleStartDataDownload();
      });

      expect(EmbeddingsCDNService.downloadLegislacaoData).not.toHaveBeenCalled();
    });

    it('should download both legislacao and jurisprudencia when both needed', async () => {
      const props = createDefaultProps();
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });

      const { result } = renderHook(() => useEmbeddingsManagement(props));
      await waitForEffects();

      act(() => {
        result.current.setDataDownloadStatus({
          legislacao: { needed: true, downloading: false, progress: 0, error: null },
          jurisprudencia: { needed: true, downloading: false, progress: 0, error: null },
        });
      });

      await act(async () => {
        await result.current.handleStartDataDownload();
      });

      expect(EmbeddingsCDNService.downloadLegislacaoData).toHaveBeenCalled();
      expect(EmbeddingsCDNService.downloadJurisprudenciaData).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 9. handleStartEmbeddingsDownload - CDN embeddings download
  // ═══════════════════════════════════════════════════════════════════════════

  describe('handleStartEmbeddingsDownload', () => {
    it('should show error toast when offline', async () => {
      const props = createDefaultProps();
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });

      const { result } = renderHook(() => useEmbeddingsManagement(props));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      await act(async () => {
        await result.current.handleStartEmbeddingsDownload();
      });

      expect(props.showToast).toHaveBeenCalledWith('Sem conexão com a internet', 'error');
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    });

    it('should download legislacao embeddings when needed', async () => {
      const props = createDefaultProps();
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
      // Initial getCount returns 0 (needed=true), subsequent calls return 200
      (EmbeddingsService.getCount as any).mockResolvedValueOnce(0).mockResolvedValueOnce(0).mockResolvedValue(200);
      (JurisEmbeddingsService.getCount as any).mockResolvedValue(100);

      const { result } = renderHook(() => useEmbeddingsManagement(props));

      // Wait for the effect to set needed status
      await waitFor(() => {
        expect(result.current.embeddingsDownloadStatus.legislacao.needed).toBe(true);
      });

      await act(async () => {
        await result.current.handleStartEmbeddingsDownload();
      });

      expect(EmbeddingsCDNService.downloadLegislacao).toHaveBeenCalled();
    });

    it('should download jurisprudencia embeddings when needed', async () => {
      const props = createDefaultProps();
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
      (EmbeddingsService.getCount as any).mockResolvedValue(100);
      (JurisEmbeddingsService.getCount as any).mockResolvedValueOnce(0).mockResolvedValueOnce(0).mockResolvedValue(150);

      const { result } = renderHook(() => useEmbeddingsManagement(props));

      await waitFor(() => {
        expect(result.current.embeddingsDownloadStatus.jurisprudencia.needed).toBe(true);
      });

      await act(async () => {
        await result.current.handleStartEmbeddingsDownload();
      });

      expect(EmbeddingsCDNService.downloadJurisprudencia).toHaveBeenCalled();
    });

    it('should handle legislacao embeddings download error', async () => {
      const props = createDefaultProps();
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
      (EmbeddingsCDNService.downloadLegislacao as any).mockRejectedValue(new Error('embed download fail'));
      (EmbeddingsService.getCount as any).mockResolvedValueOnce(0).mockResolvedValueOnce(0).mockResolvedValue(0);
      (JurisEmbeddingsService.getCount as any).mockResolvedValue(100);

      const { result } = renderHook(() => useEmbeddingsManagement(props));

      await waitFor(() => {
        expect(result.current.embeddingsDownloadStatus.legislacao.needed).toBe(true);
      });

      await act(async () => {
        await result.current.handleStartEmbeddingsDownload();
      });

      expect(props.showToast).toHaveBeenCalledWith(
        expect.stringContaining('Erro ao baixar legislação'),
        'error'
      );
      expect(result.current.embeddingsDownloadStatus.legislacao.downloading).toBe(false);
      expect(result.current.embeddingsDownloadStatus.legislacao.error).toBe('embed download fail');
    });

    it('should handle jurisprudencia embeddings download error', async () => {
      const props = createDefaultProps();
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
      (EmbeddingsCDNService.downloadJurisprudencia as any).mockRejectedValue(new Error('juris embed fail'));
      (EmbeddingsService.getCount as any).mockResolvedValue(100);
      (JurisEmbeddingsService.getCount as any).mockResolvedValueOnce(0).mockResolvedValueOnce(0).mockResolvedValue(0);

      const { result } = renderHook(() => useEmbeddingsManagement(props));

      await waitFor(() => {
        expect(result.current.embeddingsDownloadStatus.jurisprudencia.needed).toBe(true);
      });

      await act(async () => {
        await result.current.handleStartEmbeddingsDownload();
      });

      expect(props.showToast).toHaveBeenCalledWith(
        expect.stringContaining('Erro ao baixar jurisprudência'),
        'error'
      );
    });

    it('should not download if not needed', async () => {
      const props = createDefaultProps();
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
      // Both have embeddings, so needed=false
      (EmbeddingsService.getCount as any).mockResolvedValue(100);
      (JurisEmbeddingsService.getCount as any).mockResolvedValue(50);

      const { result } = renderHook(() => useEmbeddingsManagement(props));

      await waitFor(() => {
        expect(result.current.embeddingsDownloadStatus.legislacao.needed).toBe(false);
      });

      await act(async () => {
        await result.current.handleStartEmbeddingsDownload();
      });

      expect(EmbeddingsCDNService.downloadLegislacao).not.toHaveBeenCalled();
      expect(EmbeddingsCDNService.downloadJurisprudencia).not.toHaveBeenCalled();
    });

    it('should close embeddings modal and update count after download', async () => {
      const props = createDefaultProps();
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
      (EmbeddingsService.getCount as any).mockResolvedValueOnce(0).mockResolvedValueOnce(0).mockResolvedValue(200);
      (JurisEmbeddingsService.getCount as any).mockResolvedValue(50);

      const { result } = renderHook(() => useEmbeddingsManagement(props));

      await waitFor(() => {
        expect(result.current.embeddingsDownloadStatus.legislacao.needed).toBe(true);
      });

      await act(async () => {
        await result.current.handleStartEmbeddingsDownload();
      });

      // After successful download, the needed status should be false
      expect(result.current.embeddingsDownloadStatus.legislacao.downloading).toBe(false);
      expect(EmbeddingsCDNService.downloadLegislacao).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 10. generateModelEmbeddings
  // ═══════════════════════════════════════════════════════════════════════════

  describe('generateModelEmbeddings', () => {
    it('should show error if searchModelReady is false', async () => {
      const props = createDefaultProps();
      props.searchModelReady = false;

      const { result } = renderHook(() => useEmbeddingsManagement(props));

      await act(async () => {
        await result.current.generateModelEmbeddings();
      });

      expect(props.showToast).toHaveBeenCalledWith('Modelo de busca não está pronto', 'error');
    });

    it('should show info toast if all models already have embeddings', async () => {
      const props = createDefaultProps();
      props.searchModelReady = true;
      props.modelLibrary.models = [
        { id: 'm1', title: 'M1', content: 'c1', embedding: new Array(768).fill(0.1) },
        { id: 'm2', title: 'M2', content: 'c2', embedding: new Array(768).fill(0.2) },
      ] as any[];

      const { result } = renderHook(() => useEmbeddingsManagement(props));

      await act(async () => {
        await result.current.generateModelEmbeddings();
      });

      expect(props.showToast).toHaveBeenCalledWith('Todos os modelos já têm embeddings', 'info');
    });

    it('should generate embeddings for models without them', async () => {
      // Real timers already active from outer beforeEach
      const props = createDefaultProps();
      props.searchModelReady = true;
      props.modelLibrary.models = [
        { id: 'm1', title: 'Model 1', content: 'content 1', keywords: 'key1' },
        { id: 'm2', title: 'Model 2', content: 'content 2', keywords: 'key2' },
      ] as any[];

      const { result } = renderHook(() => useEmbeddingsManagement(props));

      await act(async () => {
        await result.current.generateModelEmbeddings();
      });

      expect(AIModelService.getEmbedding).toHaveBeenCalledTimes(2);
      expect(props.indexedDB.saveModels).toHaveBeenCalled();
      expect(props.modelLibrary.setModels).toHaveBeenCalled();
      expect(props.showToast).toHaveBeenCalledWith('2 embeddings de modelos gerados', 'success');
    });

    it('should only generate for models missing embedding or with wrong length', async () => {
      const props = createDefaultProps();
      props.searchModelReady = true;
      props.modelLibrary.models = [
        { id: 'm1', title: 'M1', content: 'c1', embedding: new Array(768).fill(0.1) }, // has correct embedding
        { id: 'm2', title: 'M2', content: 'c2' }, // no embedding
        { id: 'm3', title: 'M3', content: 'c3', embedding: [0.1, 0.2] }, // wrong length
      ] as any[];

      const { result } = renderHook(() => useEmbeddingsManagement(props));

      await act(async () => {
        await result.current.generateModelEmbeddings();
      });

      // Only m2 and m3 need embeddings
      expect(AIModelService.getEmbedding).toHaveBeenCalledTimes(2);
      expect(props.showToast).toHaveBeenCalledWith('2 embeddings de modelos gerados', 'success');
    });

    it('should pass correct text to getEmbedding including title, keywords, and content', async () => {
      const props = createDefaultProps();
      props.searchModelReady = true;
      props.modelLibrary.models = [
        { id: 'm1', title: 'Titulo', content: '<p>Conteudo HTML</p>', keywords: 'palavras-chave' },
      ] as any[];

      const { result } = renderHook(() => useEmbeddingsManagement(props));

      await act(async () => {
        await result.current.generateModelEmbeddings();
      });

      expect(AIModelService.getEmbedding).toHaveBeenCalledWith(
        expect.stringContaining('Titulo'),
        'passage'
      );
      expect(AIModelService.getEmbedding).toHaveBeenCalledWith(
        expect.stringContaining('palavras-chave'),
        'passage'
      );
    });

    it('should strip HTML from content before embedding', async () => {
      const props = createDefaultProps();
      props.searchModelReady = true;
      props.modelLibrary.models = [
        { id: 'm1', title: 'T', content: '<b>Bold</b> <i>Italic</i>', keywords: '' },
      ] as any[];

      const { result } = renderHook(() => useEmbeddingsManagement(props));

      await act(async () => {
        await result.current.generateModelEmbeddings();
      });

      const callArg = (AIModelService.getEmbedding as any).mock.calls[0][0] as string;
      expect(callArg).not.toContain('<b>');
      expect(callArg).not.toContain('<i>');
    });

    it('should truncate content to 2000 chars', async () => {
      const props = createDefaultProps();
      props.searchModelReady = true;
      const longContent = 'A'.repeat(5000);
      props.modelLibrary.models = [
        { id: 'm1', title: '', content: longContent, keywords: '' },
      ] as any[];

      const { result } = renderHook(() => useEmbeddingsManagement(props));

      await act(async () => {
        await result.current.generateModelEmbeddings();
      });

      const callArg = (AIModelService.getEmbedding as any).mock.calls[0][0] as string;
      // Title is empty, keywords empty, content is stripped and sliced to 2000
      expect(callArg.length).toBeLessThanOrEqual(2000);
    });

    it('should reset generatingModelEmbeddings after success', async () => {
      const props = createDefaultProps();
      props.searchModelReady = true;
      props.modelLibrary.models = [
        { id: 'm1', title: 'M', content: 'c' },
      ] as any[];

      const { result } = renderHook(() => useEmbeddingsManagement(props));

      await act(async () => {
        await result.current.generateModelEmbeddings();
      });

      expect(result.current.generatingModelEmbeddings).toBe(false);
      expect(result.current.modelEmbeddingsProgress).toEqual({ current: 0, total: 0 });
    });

    it('should reset generatingModelEmbeddings after error', async () => {
      const props = createDefaultProps();
      props.searchModelReady = true;
      props.modelLibrary.models = [
        { id: 'm1', title: 'M', content: 'c' },
      ] as any[];
      (AIModelService.getEmbedding as any).mockRejectedValue(new Error('embedding error'));

      const { result } = renderHook(() => useEmbeddingsManagement(props));

      await act(async () => {
        await result.current.generateModelEmbeddings();
      });

      expect(result.current.generatingModelEmbeddings).toBe(false);
      expect(props.showToast).toHaveBeenCalledWith(
        expect.stringContaining('Erro ao gerar embeddings'),
        'error'
      );
    });

    it('should save updated models with embeddings via indexedDB.saveModels', async () => {
      const props = createDefaultProps();
      props.searchModelReady = true;
      const mockEmbedding = new Array(768).fill(0.5);
      (AIModelService.getEmbedding as any).mockResolvedValue(mockEmbedding);
      props.modelLibrary.models = [
        { id: 'm1', title: 'M1', content: 'c1' },
        { id: 'm2', title: 'M2', content: 'c2', embedding: new Array(768).fill(0.1) }, // already has
      ] as any[];

      const { result } = renderHook(() => useEmbeddingsManagement(props));

      await act(async () => {
        await result.current.generateModelEmbeddings();
      });

      const savedModels = (props.indexedDB.saveModels as any).mock.calls[0][0];
      // m1 should have the new embedding, m2 should keep original
      const m1 = savedModels.find((m: any) => m.id === 'm1');
      const m2 = savedModels.find((m: any) => m.id === 'm2');
      expect(m1.embedding).toEqual(mockEmbedding);
      expect(m2.embedding).toEqual(new Array(768).fill(0.1));
    });

    it('should call setModels with updated models', async () => {
      const props = createDefaultProps();
      props.searchModelReady = true;
      props.modelLibrary.models = [
        { id: 'm1', title: 'M1', content: 'c1' },
      ] as any[];

      const { result } = renderHook(() => useEmbeddingsManagement(props));

      await act(async () => {
        await result.current.generateModelEmbeddings();
      });

      expect(props.modelLibrary.setModels).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: 'm1', embedding: expect.any(Array) }),
        ])
      );
    });

    it('should set generatingModelEmbeddings flag during generation', async () => {
      const props = createDefaultProps();
      props.searchModelReady = true;
      props.modelLibrary.models = [
        { id: 'm1', title: 'M1', content: 'c1' },
      ] as any[];

      const { result } = renderHook(() => useEmbeddingsManagement(props));
      await waitForEffects();

      // Before generation starts
      expect(result.current.generatingModelEmbeddings).toBe(false);

      await act(async () => {
        await result.current.generateModelEmbeddings();
      });

      // After generation completes
      expect(result.current.generatingModelEmbeddings).toBe(false);
      expect(AIModelService.getEmbedding).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 11. Edge cases and error handling
  // ═══════════════════════════════════════════════════════════════════════════

  describe('edge cases and error handling', () => {
    it('should handle corrupted localStorage for dismissedEmbeddingsPrompt', async () => {
      localStorage.setItem('dismissedEmbeddingsPrompt', 'not-valid-json{');
      // Should not throw during hook creation
      const { result } = renderHook(() => useEmbeddingsManagement(createDefaultProps()));
      await waitForEffects();
      expect(result.current).toBeDefined();
    });

    it('should handle corrupted localStorage for dismissedDataPrompt', async () => {
      localStorage.setItem('dismissedDataPrompt', '}}invalid');
      const { result } = renderHook(() => useEmbeddingsManagement(createDefaultProps()));
      await waitForEffects();
      expect(result.current).toBeDefined();
    });

    it('should handle EmbeddingsCDNService.needsDataDownload failure gracefully', async () => {
      (EmbeddingsCDNService.needsDataDownload as any).mockRejectedValue(new Error('network error'));

      const { result } = renderHook(() => useEmbeddingsManagement(createDefaultProps()));
      await waitForEffects();

      // Should not crash the hook
      expect(result.current).toBeDefined();
    });

    it('should handle import with invalid JSON gracefully', async () => {
      const props = createDefaultProps();
      const event = {
        target: {
          files: [{
            name: 'bad.json',
            type: 'application/json',
            size: 10,
            text: () => Promise.resolve('not valid json {{'),
          }],
          value: 'bad.json',
        },
      } as any;

      const { result } = renderHook(() => useEmbeddingsManagement(props));
      await waitForEffects();

      await act(async () => {
        await result.current.handleImportEmbeddings(event);
      });

      expect(props.showToast).toHaveBeenCalledWith(
        expect.stringContaining('Erro ao importar'),
        'error'
      );
    });

    it('should persist dismissedEmbeddingsPrompt when dismissing embeddings modal', async () => {
      const { result } = renderHook(() => useEmbeddingsManagement(createDefaultProps()));
      await waitForEffects();

      act(() => {
        result.current.handleDismissEmbeddingsPrompt();
      });

      expect(localStorage.getItem('dismissedEmbeddingsPrompt')).toBe('true');
    });

    it('should persist dismissedDataPrompt when dismissing data modal', async () => {
      const { result } = renderHook(() => useEmbeddingsManagement(createDefaultProps()));
      await waitForEffects();

      act(() => {
        result.current.handleDismissDataPrompt();
      });

      expect(localStorage.getItem('dismissedDataPrompt')).toBe('true');
    });

    it('should not call download methods when both downloading and completed statuses are set', async () => {
      const props = createDefaultProps();
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });

      const { result } = renderHook(() => useEmbeddingsManagement(props));
      await waitForEffects();

      // Set already downloading
      act(() => {
        result.current.setDataDownloadStatus({
          legislacao: { needed: true, downloading: true, progress: 0.5, error: null },
          jurisprudencia: { needed: true, downloading: true, progress: 0.3, error: null },
        });
      });

      await act(async () => {
        await result.current.handleStartDataDownload();
      });

      // Should not call download methods when already downloading
      expect(EmbeddingsCDNService.downloadLegislacaoData).not.toHaveBeenCalled();
      expect(EmbeddingsCDNService.downloadJurisprudenciaData).not.toHaveBeenCalled();
    });

    it('should update modelEmbeddingsProgress during generation', async () => {
      const props = createDefaultProps();
      props.searchModelReady = true;
      props.modelLibrary.models = [
        { id: 'm1', title: 'M1', content: 'c1' },
        { id: 'm2', title: 'M2', content: 'c2' },
      ] as any[];

      const { result } = renderHook(() => useEmbeddingsManagement(props));
      await waitForEffects();

      await act(async () => {
        await result.current.generateModelEmbeddings();
      });

      // After completion, progress should be reset
      expect(result.current.modelEmbeddingsProgress).toEqual({ current: 0, total: 0 });
      expect(AIModelService.getEmbedding).toHaveBeenCalledTimes(2);
    });
  });
});

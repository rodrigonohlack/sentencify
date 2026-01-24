/**
 * @file useDocumentManager.test.ts
 * @description Testes para o hook useDocumentManager
 * @version 1.38.39
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDocumentManager } from './useDocumentManager';
import { useDocumentsStore } from '../stores/useDocumentsStore';
import type { UploadedFile, PastedText, DocumentProcessingModes } from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// MOCKS
// ═══════════════════════════════════════════════════════════════════════════

const mockSavePdfToIndexedDB = vi.fn().mockResolvedValue(undefined);
const mockRemovePdfFromIndexedDB = vi.fn().mockResolvedValue(undefined);

vi.mock('./useLocalStorage', () => ({
  savePdfToIndexedDB: (...args: unknown[]) => mockSavePdfToIndexedDB(...args),
  removePdfFromIndexedDB: (...args: unknown[]) => mockRemovePdfFromIndexedDB(...args),
}));

// Mock crypto.randomUUID
let uuidCounter = 0;
const mockRandomUUID = vi.fn(() => `test-uuid-${++uuidCounter}`);
Object.defineProperty(globalThis, 'crypto', {
  value: { randomUUID: mockRandomUUID },
  writable: true,
});

describe('useDocumentManager', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  const createMockFile = (name: string = 'test.pdf'): File => {
    return new File(['test content'], name, { type: 'application/pdf' });
  };

  // @ts-expect-error -- helper available for future tests
  const _createMockUploadedFile = (overrides: Partial<UploadedFile> = {}): UploadedFile => ({
    file: createMockFile(),
    id: `file-${uuidCounter++}`,
    ...overrides,
  });

  const createMockPastedText = (overrides: Partial<PastedText> = {}): PastedText => ({
    id: `pasted-${Date.now()}`,
    text: 'Texto colado de teste.',
    name: 'Documento Teste',
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    uuidCounter = 0;
    // Reset Zustand singleton store state between tests
    useDocumentsStore.getState().clearAll();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // BASIC FUNCTIONALITY TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Basic Functionality', () => {
    it('should return all expected states and methods', () => {
      const { result } = renderHook(() => useDocumentManager());

      // Files
      expect(result.current.peticaoFiles).toBeDefined();
      expect(result.current.contestacaoFiles).toBeDefined();
      expect(result.current.complementaryFiles).toBeDefined();

      // Pasted texts
      expect(result.current.pastedPeticaoTexts).toBeDefined();
      expect(result.current.pastedContestacaoTexts).toBeDefined();
      expect(result.current.pastedComplementaryTexts).toBeDefined();

      // Metadata
      expect(result.current.analyzedDocuments).toBeDefined();

      // UI states
      expect(result.current.analyzing).toBe(false);
      expect(result.current.analysisProgress).toBe('');
      expect(result.current.extractingText).toBe(false);
      expect(result.current.showTextPreview).toBe(false);

      // Handlers
      expect(typeof result.current.handlePastedText).toBe('function');
      expect(typeof result.current.removePastedText).toBe('function');
      expect(typeof result.current.handleUploadPeticao).toBe('function');
      expect(typeof result.current.handleUploadContestacao).toBe('function');
      expect(typeof result.current.handleUploadComplementary).toBe('function');

      // Persistence
      expect(typeof result.current.serializeForPersistence).toBe('function');
      expect(typeof result.current.restoreFromPersistence).toBe('function');
      expect(typeof result.current.clearAll).toBe('function');
    });

    it('should initialize with empty arrays and default values', () => {
      const { result } = renderHook(() => useDocumentManager());

      expect(result.current.peticaoFiles).toEqual([]);
      expect(result.current.contestacaoFiles).toEqual([]);
      expect(result.current.complementaryFiles).toEqual([]);
      expect(result.current.pastedPeticaoTexts).toEqual([]);
      expect(result.current.pastedContestacaoTexts).toEqual([]);
      expect(result.current.pastedComplementaryTexts).toEqual([]);
      expect(result.current.analyzedDocuments).toEqual({
        peticoes: [],
        peticoesText: [],
        contestacoes: [],
        contestacoesText: [],
        complementares: [],
        complementaresText: [],
      });
      expect(result.current.documentProcessingModes).toEqual({
        peticoes: [],
        contestacoes: [],
        complementares: [],
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PASTED TEXT HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Pasted Text Handlers', () => {
    it('should add petição text', () => {
      const { result } = renderHook(() => useDocumentManager());

      act(() => {
        result.current.handlePastedText('Texto da petição inicial.', 'peticao');
      });

      expect(result.current.pastedPeticaoTexts).toHaveLength(1);
      expect(result.current.pastedPeticaoTexts[0].text).toBe('Texto da petição inicial.');
      expect(result.current.pastedPeticaoTexts[0].name).toBe('Petição Inicial');
    });

    it('should add emenda when petição already exists', () => {
      const { result } = renderHook(() => useDocumentManager());

      act(() => {
        result.current.handlePastedText('Texto da petição inicial.', 'peticao');
      });

      act(() => {
        result.current.handlePastedText('Texto da emenda.', 'peticao');
      });

      expect(result.current.pastedPeticaoTexts).toHaveLength(2);
      expect(result.current.pastedPeticaoTexts[1].name).toBe('Emenda/Doc Autor 2');
    });

    it('should add contestação text', () => {
      const { result } = renderHook(() => useDocumentManager());

      act(() => {
        result.current.handlePastedText('Texto da contestação.', 'contestacao');
      });

      expect(result.current.pastedContestacaoTexts).toHaveLength(1);
      expect(result.current.pastedContestacaoTexts[0].text).toBe('Texto da contestação.');
      expect(result.current.pastedContestacaoTexts[0].name).toBe('Contestação 1');
    });

    it('should add complementary text', () => {
      const { result } = renderHook(() => useDocumentManager());

      act(() => {
        result.current.handlePastedText('Texto complementar.', 'complementary');
      });

      expect(result.current.pastedComplementaryTexts).toHaveLength(1);
      expect(result.current.pastedComplementaryTexts[0].text).toBe('Texto complementar.');
      expect(result.current.pastedComplementaryTexts[0].name).toBe('Documento Complementar 1');
    });

    it('should call setError when text is empty', () => {
      const { result } = renderHook(() => useDocumentManager());
      const setError = vi.fn();

      act(() => {
        result.current.handlePastedText('', 'peticao', setError);
      });

      expect(setError).toHaveBeenCalledWith('O texto colado está vazio');
      expect(result.current.pastedPeticaoTexts).toHaveLength(0);
    });

    it('should call setError when text is only whitespace', () => {
      const { result } = renderHook(() => useDocumentManager());
      const setError = vi.fn();

      act(() => {
        result.current.handlePastedText('   \n\t  ', 'peticao', setError);
      });

      expect(setError).toHaveBeenCalledWith('O texto colado está vazio');
    });

    it('should clear error on successful paste', () => {
      const { result } = renderHook(() => useDocumentManager());
      const setError = vi.fn();

      act(() => {
        result.current.handlePastedText('Texto válido.', 'peticao', setError);
      });

      expect(setError).toHaveBeenCalledWith('');
    });

    it('should close paste area after pasting', () => {
      const { result } = renderHook(() => useDocumentManager());

      // Open paste area
      act(() => {
        result.current.setShowPasteArea({ peticao: true, contestacao: false, complementary: false });
      });

      expect(result.current.showPasteArea.peticao).toBe(true);

      // Paste text
      act(() => {
        result.current.handlePastedText('Texto.', 'peticao');
      });

      expect(result.current.showPasteArea.peticao).toBe(false);
    });

    it('should remove pasted petição text by index', () => {
      const { result } = renderHook(() => useDocumentManager());

      act(() => {
        result.current.handlePastedText('Texto 1.', 'peticao');
        result.current.handlePastedText('Texto 2.', 'peticao');
      });

      expect(result.current.pastedPeticaoTexts).toHaveLength(2);

      act(() => {
        result.current.removePastedText('peticao', 0);
      });

      expect(result.current.pastedPeticaoTexts).toHaveLength(1);
      expect(result.current.pastedPeticaoTexts[0].text).toBe('Texto 2.');
    });

    it('should remove pasted contestação text by index', () => {
      const { result } = renderHook(() => useDocumentManager());

      act(() => {
        result.current.handlePastedText('Contestação 1.', 'contestacao');
        result.current.handlePastedText('Contestação 2.', 'contestacao');
      });

      act(() => {
        result.current.removePastedText('contestacao', 1);
      });

      expect(result.current.pastedContestacaoTexts).toHaveLength(1);
      expect(result.current.pastedContestacaoTexts[0].text).toBe('Contestação 1.');
    });

    it('should remove pasted complementary text by index', () => {
      const { result } = renderHook(() => useDocumentManager());

      act(() => {
        result.current.handlePastedText('Complementar 1.', 'complementary');
      });

      act(() => {
        result.current.removePastedText('complementary', 0);
      });

      expect(result.current.pastedComplementaryTexts).toHaveLength(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FILE UPLOAD HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('File Upload Handlers', () => {
    it('should upload petição file', async () => {
      const { result } = renderHook(() => useDocumentManager());
      const file = createMockFile('peticao.pdf');

      await act(async () => {
        await result.current.handleUploadPeticao([file]);
      });

      expect(result.current.peticaoFiles).toHaveLength(1);
      expect(result.current.peticaoFiles[0].file.name).toBe('peticao.pdf');
      expect(mockSavePdfToIndexedDB).toHaveBeenCalled();
    });

    it('should upload multiple petição files', async () => {
      const { result } = renderHook(() => useDocumentManager());
      const files = [createMockFile('peticao1.pdf'), createMockFile('peticao2.pdf')];

      await act(async () => {
        await result.current.handleUploadPeticao(files);
      });

      expect(result.current.peticaoFiles).toHaveLength(2);
      expect(mockSavePdfToIndexedDB).toHaveBeenCalledTimes(2);
    });

    it('should filter non-PDF files on upload', async () => {
      const { result } = renderHook(() => useDocumentManager());
      const pdfFile = createMockFile('doc.pdf');
      const txtFile = new File(['text'], 'doc.txt', { type: 'text/plain' });

      await act(async () => {
        await result.current.handleUploadPeticao([pdfFile, txtFile]);
      });

      expect(result.current.peticaoFiles).toHaveLength(1);
      expect(result.current.peticaoFiles[0].file.type).toBe('application/pdf');
    });

    it('should not add files when no PDFs provided', async () => {
      const { result } = renderHook(() => useDocumentManager());
      const txtFile = new File(['text'], 'doc.txt', { type: 'text/plain' });

      await act(async () => {
        await result.current.handleUploadPeticao([txtFile]);
      });

      expect(result.current.peticaoFiles).toHaveLength(0);
      expect(mockSavePdfToIndexedDB).not.toHaveBeenCalled();
    });

    it('should upload contestação file', async () => {
      const { result } = renderHook(() => useDocumentManager());
      const file = createMockFile('contestacao.pdf');

      await act(async () => {
        await result.current.handleUploadContestacao([file]);
      });

      expect(result.current.contestacaoFiles).toHaveLength(1);
      expect(mockSavePdfToIndexedDB).toHaveBeenCalledWith(
        expect.stringContaining('upload-contestacao-'),
        file,
        'upload'
      );
    });

    it('should upload complementary file', async () => {
      const { result } = renderHook(() => useDocumentManager());
      const file = createMockFile('complementar.pdf');

      await act(async () => {
        await result.current.handleUploadComplementary([file]);
      });

      expect(result.current.complementaryFiles).toHaveLength(1);
      expect(mockSavePdfToIndexedDB).toHaveBeenCalledWith(
        expect.stringContaining('upload-complementar-'),
        file,
        'upload'
      );
    });

    it('should remove petição file and cleanup IndexedDB', async () => {
      const { result } = renderHook(() => useDocumentManager());
      const file = createMockFile('peticao.pdf');

      await act(async () => {
        await result.current.handleUploadPeticao([file]);
      });

      const fileId = result.current.peticaoFiles[0].id;

      await act(async () => {
        await result.current.removePeticaoFile(0);
      });

      expect(result.current.peticaoFiles).toHaveLength(0);
      expect(mockRemovePdfFromIndexedDB).toHaveBeenCalledWith(`upload-peticao-${fileId}`);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCESSING MODE SETTERS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Processing Mode Setters', () => {
    it('should set petição processing mode', () => {
      const { result } = renderHook(() => useDocumentManager());

      act(() => {
        result.current.setPeticaoMode(0, 'claude-vision');
      });

      expect(result.current.documentProcessingModes.peticoes[0]).toBe('claude-vision');
    });

    it('should set contestação processing mode', () => {
      const { result } = renderHook(() => useDocumentManager());

      act(() => {
        result.current.setContestacaoMode(0, 'pdfjs');
      });

      expect(result.current.documentProcessingModes.contestacoes[0]).toBe('pdfjs');
    });

    it('should set complementar processing mode', () => {
      const { result } = renderHook(() => useDocumentManager());

      act(() => {
        result.current.setComplementarMode(0, 'pdf-puro');
      });

      expect(result.current.documentProcessingModes.complementares[0]).toBe('pdf-puro');
    });

    it('should preserve other modes when setting one', () => {
      const { result } = renderHook(() => useDocumentManager());

      act(() => {
        result.current.setPeticaoMode(0, 'pdfjs');
        result.current.setPeticaoMode(1, 'claude-vision');
      });

      expect(result.current.documentProcessingModes.peticoes[0]).toBe('pdfjs');
      expect(result.current.documentProcessingModes.peticoes[1]).toBe('claude-vision');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PERSISTENCE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Persistence', () => {
    it('should serialize current state', async () => {
      const { result } = renderHook(() => useDocumentManager());

      await act(async () => {
        await result.current.handleUploadPeticao([createMockFile()]);
        result.current.handlePastedText('Texto colado.', 'contestacao');
      });

      const serialized = result.current.serializeForPersistence();

      expect(serialized.peticaoFiles).toEqual(result.current.peticaoFiles);
      expect(serialized.pastedContestacaoTexts).toEqual(result.current.pastedContestacaoTexts);
      expect(serialized.documentProcessingModes).toBeDefined();
    });

    it('should restore state from persistence data', () => {
      const { result } = renderHook(() => useDocumentManager());

      const mockData = {
        pastedPeticaoTexts: [createMockPastedText({ text: 'Petição restaurada.' })],
        pastedContestacaoTexts: [createMockPastedText({ text: 'Contestação restaurada.' })],
        showPasteArea: { peticao: true, contestacao: false, complementary: false },
        documentProcessingModes: { peticoes: ['pdfjs'], contestacoes: [], complementares: [] } as DocumentProcessingModes,
      };

      act(() => {
        result.current.restoreFromPersistence(mockData);
      });

      expect(result.current.pastedPeticaoTexts).toHaveLength(1);
      expect(result.current.pastedPeticaoTexts[0].text).toBe('Petição restaurada.');
      expect(result.current.pastedContestacaoTexts).toHaveLength(1);
      expect(result.current.showPasteArea.peticao).toBe(true);
      expect(result.current.documentProcessingModes.peticoes[0]).toBe('pdfjs');
    });

    it('should handle null persistence data', () => {
      const { result } = renderHook(() => useDocumentManager());

      act(() => {
        result.current.restoreFromPersistence(null);
      });

      // Should not throw and keep default values
      expect(result.current.peticaoFiles).toEqual([]);
    });

    it('should restore only provided fields', () => {
      const { result } = renderHook(() => useDocumentManager());

      const partialData = {
        pastedPeticaoTexts: [createMockPastedText()],
      };

      act(() => {
        result.current.restoreFromPersistence(partialData);
      });

      expect(result.current.pastedPeticaoTexts).toHaveLength(1);
      expect(result.current.pastedContestacaoTexts).toEqual([]);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CLEAR ALL TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Clear All', () => {
    it('should clear all states', async () => {
      const { result } = renderHook(() => useDocumentManager());

      // Add some data
      await act(async () => {
        await result.current.handleUploadPeticao([createMockFile()]);
        result.current.handlePastedText('Texto.', 'peticao');
        result.current.handlePastedText('Contestação.', 'contestacao');
        result.current.setAnalyzing(true);
        result.current.setAnalysisProgress('Progresso...');
      });

      expect(result.current.peticaoFiles).toHaveLength(1);
      expect(result.current.pastedPeticaoTexts).toHaveLength(1);
      expect(result.current.analyzing).toBe(true);

      // Clear all
      await act(async () => {
        await result.current.clearAll();
      });

      expect(result.current.peticaoFiles).toEqual([]);
      expect(result.current.contestacaoFiles).toEqual([]);
      expect(result.current.complementaryFiles).toEqual([]);
      expect(result.current.pastedPeticaoTexts).toEqual([]);
      expect(result.current.pastedContestacaoTexts).toEqual([]);
      expect(result.current.pastedComplementaryTexts).toEqual([]);
      expect(result.current.analyzing).toBe(false);
      expect(result.current.analysisProgress).toBe('');
      expect(result.current.extractingText).toBe(false);
      expect(result.current.showTextPreview).toBe(false);
    });

    it('should cleanup IndexedDB for all files', async () => {
      const { result } = renderHook(() => useDocumentManager());

      // Add files
      await act(async () => {
        await result.current.handleUploadPeticao([createMockFile()]);
        await result.current.handleUploadContestacao([createMockFile()]);
        await result.current.handleUploadComplementary([createMockFile()]);
      });

      vi.clearAllMocks();

      // Clear all
      await act(async () => {
        await result.current.clearAll();
      });

      expect(mockRemovePdfFromIndexedDB).toHaveBeenCalledTimes(3);
    });

    it('should call clearPdfCache if provided', async () => {
      const clearPdfCache = vi.fn();
      const { result } = renderHook(() => useDocumentManager(clearPdfCache));

      await act(async () => {
        await result.current.clearAll();
      });

      expect(clearPdfCache).toHaveBeenCalled();
    });

    it('should reset analyzed documents', async () => {
      const { result } = renderHook(() => useDocumentManager());

      act(() => {
        result.current.setAnalyzedDocuments({
          peticoes: ['base64-1'],
          peticoesText: [{ id: 'pet-1', text: 'Texto', name: 'Doc' }],
          contestacoes: [],
          contestacoesText: [],
          complementares: [],
          complementaresText: [],
        });
      });

      expect(result.current.analyzedDocuments.peticoes).toHaveLength(1);

      await act(async () => {
        await result.current.clearAll();
      });

      expect(result.current.analyzedDocuments).toEqual({
        peticoes: [],
        peticoesText: [],
        contestacoes: [],
        contestacoesText: [],
        complementares: [],
        complementaresText: [],
      });
    });

    it('should reset processing modes', async () => {
      const { result } = renderHook(() => useDocumentManager());

      act(() => {
        result.current.setPeticaoMode(0, 'claude-vision');
        result.current.setContestacaoMode(0, 'pdfjs');
      });

      expect(result.current.documentProcessingModes.peticoes[0]).toBe('claude-vision');

      await act(async () => {
        await result.current.clearAll();
      });

      expect(result.current.documentProcessingModes).toEqual({
        peticoes: [],
        contestacoes: [],
        complementares: [],
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // STATE SETTERS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('State Setters', () => {
    it('should update analyzing state', () => {
      const { result } = renderHook(() => useDocumentManager());

      act(() => {
        result.current.setAnalyzing(true);
      });

      expect(result.current.analyzing).toBe(true);
    });

    it('should update analysis progress', () => {
      const { result } = renderHook(() => useDocumentManager());

      act(() => {
        result.current.setAnalysisProgress('Extraindo texto...');
      });

      expect(result.current.analysisProgress).toBe('Extraindo texto...');
    });

    it('should update extracting text state', () => {
      const { result } = renderHook(() => useDocumentManager());

      act(() => {
        result.current.setExtractingText(true);
      });

      expect(result.current.extractingText).toBe(true);
    });

    it('should update show text preview', () => {
      const { result } = renderHook(() => useDocumentManager());

      act(() => {
        result.current.setShowTextPreview(true);
      });

      expect(result.current.showTextPreview).toBe(true);
    });

    it('should update extracted texts', () => {
      const { result } = renderHook(() => useDocumentManager());

      act(() => {
        result.current.setExtractedTexts({
          peticoes: [{ text: 'Texto extraído da petição.', name: 'Petição' }],
          contestacoes: [],
          complementares: [],
        });
      });

      expect(result.current.extractedTexts.peticoes[0].text).toBe('Texto extraído da petição.');
    });

    it('should update show paste area', () => {
      const { result } = renderHook(() => useDocumentManager());

      act(() => {
        result.current.setShowPasteArea({
          peticao: true,
          contestacao: true,
          complementary: false,
        });
      });

      expect(result.current.showPasteArea.peticao).toBe(true);
      expect(result.current.showPasteArea.contestacao).toBe(true);
      expect(result.current.showPasteArea.complementary).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EDGE CASES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Edge Cases', () => {
    it('should handle file removal on files without id', async () => {
      const { result } = renderHook(() => useDocumentManager());

      // Manually set a file without id
      act(() => {
        result.current.setPeticaoFiles([{ file: createMockFile() } as UploadedFile]);
      });

      await act(async () => {
        await result.current.removePeticaoFile(0);
      });

      expect(result.current.peticaoFiles).toHaveLength(0);
      // Should not call removePdfFromIndexedDB since no id
      expect(mockRemovePdfFromIndexedDB).not.toHaveBeenCalled();
    });

    it('should handle removePastedText with null index', () => {
      const { result } = renderHook(() => useDocumentManager());

      act(() => {
        result.current.handlePastedText('Texto.', 'peticao');
      });

      act(() => {
        result.current.removePastedText('peticao', null);
      });

      // Should not remove anything with null index
      expect(result.current.pastedPeticaoTexts).toHaveLength(1);
    });

    it('should generate unique IDs for pasted texts', () => {
      const { result } = renderHook(() => useDocumentManager());

      act(() => {
        result.current.handlePastedText('Texto 1.', 'peticao');
        result.current.handlePastedText('Texto 2.', 'peticao');
      });

      expect(result.current.pastedPeticaoTexts[0].id).not.toBe(
        result.current.pastedPeticaoTexts[1].id
      );
    });

    it('should remove processing mode when file is removed', async () => {
      const { result } = renderHook(() => useDocumentManager());

      await act(async () => {
        await result.current.handleUploadPeticao([createMockFile(), createMockFile()]);
      });

      act(() => {
        result.current.setPeticaoMode(0, 'pdfjs');
        result.current.setPeticaoMode(1, 'claude-vision');
      });

      expect(result.current.documentProcessingModes.peticoes).toHaveLength(2);

      await act(async () => {
        await result.current.removePeticaoFile(0);
      });

      expect(result.current.documentProcessingModes.peticoes).toHaveLength(1);
      expect(result.current.documentProcessingModes.peticoes[0]).toBe('claude-vision');
    });
  });
});

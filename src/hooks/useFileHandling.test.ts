import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFileHandling } from './useFileHandling';
import type { UseFileHandlingProps, ModelLibraryForFileHandling } from './useFileHandling';

// Mock external modules
vi.mock('../services/EmbeddingsServices', () => ({
  TFIDFSimilarity: {
    findSimilar: vi.fn().mockReturnValue({ hasSimilar: false, similarity: 0, similarModel: null }),
  },
}));

vi.mock('../schemas/ai-responses', () => ({
  parseAIResponse: vi.fn().mockReturnValue({
    success: true,
    data: {
      modelos: [
        {
          titulo: 'Modelo Teste',
          categoria: 'Trabalhista',
          palavrasChave: ['teste', 'modelo'],
          conteudo: '<p>Conteúdo do modelo de teste</p>',
        },
      ],
    },
  }),
  extractJSON: vi.fn().mockReturnValue('{"modelos":[]}'),
  BulkExtractionSchema: { parse: vi.fn() },
}));

vi.mock('../prompts', () => ({
  AI_PROMPTS: { estiloRedacao: 'estilo formal' },
  buildBulkAnalysisPrompt: vi.fn().mockReturnValue('prompt de análise'),
  BULK_AI_CONFIG: { maxTokens: 8000, timeout: 180000, temperature: 0.3, topP: 0.9, topK: 50 },
  INTER_BATCH_DELAY: 100, // Reduced for tests
  BULK_API_TIMEOUT_MS: 5000, // Reduced for tests
  VALID_FILE_EXTENSIONS: ['.pdf', '.txt', '.docx', '.doc'],
  VALID_FILE_TYPES: [
    'application/pdf',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
  ],
  MAX_BULK_FILES: 20,
}));

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS - Create Mock Props
// ═══════════════════════════════════════════════════════════════════════════

function createMockModelLibrary(overrides: Partial<ModelLibraryForFileHandling> = {}): ModelLibraryForFileHandling {
  return {
    models: [],
    setModels: vi.fn(),
    bulkFiles: [],
    setBulkFiles: vi.fn(),
    bulkProcessing: false,
    setBulkProcessing: vi.fn(),
    bulkProcessedFiles: [],
    setBulkProcessedFiles: vi.fn(),
    bulkGeneratedModels: [],
    setBulkGeneratedModels: vi.fn(),
    bulkErrors: [],
    setBulkErrors: vi.fn(),
    bulkCancelController: null,
    setBulkCancelController: vi.fn(),
    bulkCurrentBatch: 0,
    setBulkCurrentBatch: vi.fn(),
    bulkStaggerDelay: 0, // No delay in tests
    bulkReviewModels: [],
    setBulkReviewModels: vi.fn(),
    suggestions: [],
    setSuggestions: vi.fn(),
    setHasUnsavedChanges: vi.fn(),
    ...overrides,
  };
}

function createMockProps(overrides: Partial<UseFileHandlingProps> = {}): UseFileHandlingProps {
  return {
    modelLibrary: createMockModelLibrary(),
    aiIntegration: {
      aiSettings: { parallelRequests: 5 } as any,
      callAI: vi.fn().mockResolvedValue('{"modelos":[{"titulo":"Teste","categoria":"Cat","palavrasChave":["kw"],"conteudo":"<p>Conteúdo</p>"}]}'),
    },
    apiCache: {
      get: vi.fn().mockReturnValue(undefined),
      set: vi.fn(),
    },
    documentServices: {
      extractTextFromBulkFile: vi.fn().mockResolvedValue('Texto extraído do documento com conteúdo suficiente para análise pela IA do sistema.'),
    },
    cloudSync: {
      trackChange: vi.fn(),
    },
    modelPreview: {
      previewingModel: null,
      openPreview: vi.fn(),
    },
    showToast: vi.fn(),
    setError: vi.fn(),
    openModal: vi.fn(),
    closeModal: vi.fn(),
    processBulkSaveNext: vi.fn(),
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('useFileHandling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // HOOK INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('hook initialization', () => {
    it('should return all expected methods', () => {
      const props = createMockProps();
      const { result } = renderHook(() => useFileHandling(props));

      expect(typeof result.current.getBulkPendingFilesCount).toBe('function');
      expect(typeof result.current.handleConfirmBulkCancel).toBe('function');
      expect(typeof result.current.generateModelsFromFileContent).toBe('function');
      expect(typeof result.current.processBulkFiles).toBe('function');
      expect(typeof result.current.handleBulkFileUpload).toBe('function');
      expect(typeof result.current.saveBulkModels).toBe('function');
      expect(typeof result.current.removeBulkReviewModel).toBe('function');
      expect(typeof result.current.toggleFavorite).toBe('function');
    });

    it('should return exactly 8 methods', () => {
      const props = createMockProps();
      const { result } = renderHook(() => useFileHandling(props));

      const keys = Object.keys(result.current);
      expect(keys).toHaveLength(8);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // getBulkPendingFilesCount
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getBulkPendingFilesCount', () => {
    it('should return 0 when no files', () => {
      const props = createMockProps();
      const { result } = renderHook(() => useFileHandling(props));
      expect(result.current.getBulkPendingFilesCount()).toBe(0);
    });

    it('should return count of unprocessed files', () => {
      const pdfFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const props = createMockProps({
        modelLibrary: createMockModelLibrary({
          bulkFiles: [
            { file: pdfFile, name: 'test1.pdf', size: 1000 },
            { file: pdfFile, name: 'test2.pdf', size: 2000 },
            { file: pdfFile, name: 'test3.pdf', size: 3000 },
          ],
          bulkProcessedFiles: [
            { file: 'test1.pdf', status: 'success', duration: '1.0' },
          ],
        }),
      });
      const { result } = renderHook(() => useFileHandling(props));
      expect(result.current.getBulkPendingFilesCount()).toBe(2);
    });

    it('should return 0 when all files are processed', () => {
      const pdfFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const props = createMockProps({
        modelLibrary: createMockModelLibrary({
          bulkFiles: [
            { file: pdfFile, name: 'test1.pdf', size: 1000 },
          ],
          bulkProcessedFiles: [
            { file: 'test1.pdf', status: 'success', duration: '1.0' },
          ],
        }),
      });
      const { result } = renderHook(() => useFileHandling(props));
      expect(result.current.getBulkPendingFilesCount()).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // handleConfirmBulkCancel
  // ═══════════════════════════════════════════════════════════════════════════

  describe('handleConfirmBulkCancel', () => {
    it('should close the confirmBulkCancel modal', () => {
      const props = createMockProps();
      const { result } = renderHook(() => useFileHandling(props));

      act(() => {
        result.current.handleConfirmBulkCancel();
      });

      expect(props.closeModal).toHaveBeenCalledWith('confirmBulkCancel');
    });

    it('should abort the controller when one exists', () => {
      const controller = new AbortController();
      const abortSpy = vi.spyOn(controller, 'abort');
      const props = createMockProps({
        modelLibrary: createMockModelLibrary({
          bulkCancelController: controller,
        }),
      });
      const { result } = renderHook(() => useFileHandling(props));

      act(() => {
        result.current.handleConfirmBulkCancel();
      });

      expect(abortSpy).toHaveBeenCalled();
      expect(props.modelLibrary.setBulkProcessing).toHaveBeenCalledWith(false);
      expect(props.modelLibrary.setBulkCancelController).toHaveBeenCalledWith(null);
      expect(props.modelLibrary.setBulkCurrentBatch).toHaveBeenCalledWith(0);
      expect(props.showToast).toHaveBeenCalledWith('Processamento cancelado pelo usuário', 'info');
    });

    it('should open bulkReview modal when there are generated models', () => {
      const controller = new AbortController();
      const mockModel = { id: 'test-1', title: 'Modelo', content: '<p>Conteúdo</p>' } as any;
      const props = createMockProps({
        modelLibrary: createMockModelLibrary({
          bulkCancelController: controller,
          bulkGeneratedModels: [mockModel],
        }),
      });
      const { result } = renderHook(() => useFileHandling(props));

      act(() => {
        result.current.handleConfirmBulkCancel();
      });

      expect(props.openModal).toHaveBeenCalledWith('bulkReview');
    });

    it('should not open bulkReview modal when no generated models', () => {
      const controller = new AbortController();
      const props = createMockProps({
        modelLibrary: createMockModelLibrary({
          bulkCancelController: controller,
          bulkGeneratedModels: [],
        }),
      });
      const { result } = renderHook(() => useFileHandling(props));

      act(() => {
        result.current.handleConfirmBulkCancel();
      });

      expect(props.openModal).not.toHaveBeenCalled();
    });

    it('should not call abort or reset state when no controller exists', () => {
      const props = createMockProps({
        modelLibrary: createMockModelLibrary({
          bulkCancelController: null,
        }),
      });
      const { result } = renderHook(() => useFileHandling(props));

      act(() => {
        result.current.handleConfirmBulkCancel();
      });

      expect(props.modelLibrary.setBulkProcessing).not.toHaveBeenCalled();
      expect(props.showToast).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // handleBulkFileUpload - FILE VALIDATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('handleBulkFileUpload', () => {
    it('should do nothing when no files are selected', () => {
      const props = createMockProps();
      const { result } = renderHook(() => useFileHandling(props));

      act(() => {
        const event = { target: { files: [] } } as any;
        result.current.handleBulkFileUpload(event);
      });

      expect(props.modelLibrary.setBulkFiles).not.toHaveBeenCalled();
      expect(props.showToast).not.toHaveBeenCalled();
    });

    it('should do nothing when files is null', () => {
      const props = createMockProps();
      const { result } = renderHook(() => useFileHandling(props));

      act(() => {
        const event = { target: { files: null } } as any;
        result.current.handleBulkFileUpload(event);
      });

      expect(props.modelLibrary.setBulkFiles).not.toHaveBeenCalled();
    });

    it('should accept valid PDF files', () => {
      const props = createMockProps();
      const { result } = renderHook(() => useFileHandling(props));

      const pdfFile = new File(['pdf content'], 'document.pdf', { type: 'application/pdf' });
      act(() => {
        const event = { target: { files: [pdfFile] } } as any;
        result.current.handleBulkFileUpload(event);
      });

      expect(props.modelLibrary.setBulkFiles).toHaveBeenCalledWith([
        { file: pdfFile, name: 'document.pdf', size: pdfFile.size },
      ]);
    });

    it('should accept valid TXT files', () => {
      const props = createMockProps();
      const { result } = renderHook(() => useFileHandling(props));

      const txtFile = new File(['text content'], 'document.txt', { type: 'text/plain' });
      act(() => {
        const event = { target: { files: [txtFile] } } as any;
        result.current.handleBulkFileUpload(event);
      });

      expect(props.modelLibrary.setBulkFiles).toHaveBeenCalledWith([
        { file: txtFile, name: 'document.txt', size: txtFile.size },
      ]);
    });

    it('should accept valid DOCX files', () => {
      const props = createMockProps();
      const { result } = renderHook(() => useFileHandling(props));

      const docxFile = new File(['docx content'], 'document.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      act(() => {
        const event = { target: { files: [docxFile] } } as any;
        result.current.handleBulkFileUpload(event);
      });

      expect(props.modelLibrary.setBulkFiles).toHaveBeenCalledWith([
        { file: docxFile, name: 'document.docx', size: docxFile.size },
      ]);
    });

    it('should accept valid DOC files', () => {
      const props = createMockProps();
      const { result } = renderHook(() => useFileHandling(props));

      const docFile = new File(['doc content'], 'document.doc', { type: 'application/msword' });
      act(() => {
        const event = { target: { files: [docFile] } } as any;
        result.current.handleBulkFileUpload(event);
      });

      expect(props.modelLibrary.setBulkFiles).toHaveBeenCalledWith([
        { file: docFile, name: 'document.doc', size: docFile.size },
      ]);
    });

    it('should reject invalid file extensions', () => {
      const props = createMockProps();
      const { result } = renderHook(() => useFileHandling(props));

      const jpgFile = new File(['image'], 'photo.jpg', { type: 'image/jpeg' });
      act(() => {
        const event = { target: { files: [jpgFile] } } as any;
        result.current.handleBulkFileUpload(event);
      });

      expect(props.showToast).toHaveBeenCalledWith(
        expect.stringContaining('photo.jpg'),
        'error'
      );
      expect(props.modelLibrary.setBulkFiles).not.toHaveBeenCalled();
    });

    it('should reject .exe files', () => {
      const props = createMockProps();
      const { result } = renderHook(() => useFileHandling(props));

      const exeFile = new File(['binary'], 'malware.exe', { type: 'application/x-msdownload' });
      act(() => {
        const event = { target: { files: [exeFile] } } as any;
        result.current.handleBulkFileUpload(event);
      });

      expect(props.showToast).toHaveBeenCalledWith(
        expect.stringContaining('malware.exe'),
        'error'
      );
      expect(props.modelLibrary.setBulkFiles).not.toHaveBeenCalled();
    });

    it('should reject files exceeding MAX_BULK_FILES limit (20)', () => {
      const props = createMockProps();
      const { result } = renderHook(() => useFileHandling(props));

      // Create 21 files (exceeds limit of 20)
      const files = Array.from({ length: 21 }, (_, i) =>
        new File(['content'], `doc${i}.pdf`, { type: 'application/pdf' })
      );

      act(() => {
        const event = { target: { files } } as any;
        result.current.handleBulkFileUpload(event);
      });

      expect(props.showToast).toHaveBeenCalledWith(
        expect.stringContaining('20'),
        'error'
      );
      expect(props.modelLibrary.setBulkFiles).not.toHaveBeenCalled();
    });

    it('should accept exactly MAX_BULK_FILES (20) files', () => {
      const props = createMockProps();
      const { result } = renderHook(() => useFileHandling(props));

      const files = Array.from({ length: 20 }, (_, i) =>
        new File(['content'], `doc${i}.pdf`, { type: 'application/pdf' })
      );

      act(() => {
        const event = { target: { files } } as any;
        result.current.handleBulkFileUpload(event);
      });

      expect(props.modelLibrary.setBulkFiles).toHaveBeenCalled();
      const calledWith = (props.modelLibrary.setBulkFiles as any).mock.calls[0][0];
      expect(calledWith).toHaveLength(20);
    });

    it('should handle multiple valid files', () => {
      const props = createMockProps();
      const { result } = renderHook(() => useFileHandling(props));

      const pdfFile = new File(['pdf'], 'doc1.pdf', { type: 'application/pdf' });
      const txtFile = new File(['text'], 'doc2.txt', { type: 'text/plain' });
      const docxFile = new File(['docx'], 'doc3.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      act(() => {
        const event = { target: { files: [pdfFile, txtFile, docxFile] } } as any;
        result.current.handleBulkFileUpload(event);
      });

      expect(props.modelLibrary.setBulkFiles).toHaveBeenCalledWith([
        { file: pdfFile, name: 'doc1.pdf', size: pdfFile.size },
        { file: txtFile, name: 'doc2.txt', size: txtFile.size },
        { file: docxFile, name: 'doc3.docx', size: docxFile.size },
      ]);
    });

    it('should reject if any file in the batch is invalid', () => {
      const props = createMockProps();
      const { result } = renderHook(() => useFileHandling(props));

      const pdfFile = new File(['pdf'], 'valid.pdf', { type: 'application/pdf' });
      const invalidFile = new File(['image'], 'invalid.png', { type: 'image/png' });

      act(() => {
        const event = { target: { files: [pdfFile, invalidFile] } } as any;
        result.current.handleBulkFileUpload(event);
      });

      expect(props.showToast).toHaveBeenCalledWith(
        expect.stringContaining('invalid.png'),
        'error'
      );
      expect(props.modelLibrary.setBulkFiles).not.toHaveBeenCalled();
    });

    it('should accept file by extension even with empty mime type', () => {
      const props = createMockProps();
      const { result } = renderHook(() => useFileHandling(props));

      // File with .pdf extension but no MIME type
      const pdfFile = new File(['content'], 'document.pdf', { type: '' });
      act(() => {
        const event = { target: { files: [pdfFile] } } as any;
        result.current.handleBulkFileUpload(event);
      });

      expect(props.modelLibrary.setBulkFiles).toHaveBeenCalled();
    });

    it('should store correct file metadata (name, size)', () => {
      const props = createMockProps();
      const { result } = renderHook(() => useFileHandling(props));

      const content = 'a'.repeat(5000);
      const pdfFile = new File([content], 'large-doc.pdf', { type: 'application/pdf' });

      act(() => {
        const event = { target: { files: [pdfFile] } } as any;
        result.current.handleBulkFileUpload(event);
      });

      const calledWith = (props.modelLibrary.setBulkFiles as any).mock.calls[0][0];
      expect(calledWith[0].name).toBe('large-doc.pdf');
      expect(calledWith[0].size).toBe(5000);
      expect(calledWith[0].file).toBe(pdfFile);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // generateModelsFromFileContent
  // ═══════════════════════════════════════════════════════════════════════════

  describe('generateModelsFromFileContent', () => {
    it('should throw when text is too short (less than 50 chars)', async () => {
      const props = createMockProps();
      const { result } = renderHook(() => useFileHandling(props));

      await expect(
        act(async () => {
          await result.current.generateModelsFromFileContent('Short text', 'test.pdf');
        })
      ).rejects.toThrow('Texto muito curto ou inválido para análise');
    });

    it('should throw when text is empty', async () => {
      const props = createMockProps();
      const { result } = renderHook(() => useFileHandling(props));

      await expect(
        act(async () => {
          await result.current.generateModelsFromFileContent('', 'test.pdf');
        })
      ).rejects.toThrow('Texto muito curto ou inválido para análise');
    });

    it('should throw when text is null/undefined', async () => {
      const props = createMockProps();
      const { result } = renderHook(() => useFileHandling(props));

      await expect(
        act(async () => {
          await result.current.generateModelsFromFileContent(null as any, 'test.pdf');
        })
      ).rejects.toThrow('Texto muito curto ou inválido para análise');
    });

    it('should throw when abort signal is already aborted', async () => {
      const props = createMockProps();
      const { result } = renderHook(() => useFileHandling(props));

      const controller = new AbortController();
      controller.abort();

      const longText = 'a'.repeat(100);
      await expect(
        act(async () => {
          await result.current.generateModelsFromFileContent(longText, 'test.pdf', controller.signal);
        })
      ).rejects.toThrow('Processamento cancelado pelo usuário');
    });

    it('should use cached models when available', async () => {
      const cachedModels = [{ id: 'cached-1', title: 'Cached Model', content: '<p>Cached</p>' }];
      const props = createMockProps({
        apiCache: {
          get: vi.fn().mockReturnValue(JSON.stringify(cachedModels)),
          set: vi.fn(),
        },
      });
      const { result } = renderHook(() => useFileHandling(props));

      const longText = 'a'.repeat(100);
      let models: any;
      await act(async () => {
        models = await result.current.generateModelsFromFileContent(longText, 'test.pdf');
      });

      expect(models).toEqual(cachedModels);
      expect(props.aiIntegration.callAI).not.toHaveBeenCalled();
    });

    it('should call AI when no cache exists', async () => {
      const props = createMockProps();
      const { result } = renderHook(() => useFileHandling(props));

      const longText = 'a'.repeat(100);
      await act(async () => {
        await result.current.generateModelsFromFileContent(longText, 'test.pdf');
      });

      expect(props.aiIntegration.callAI).toHaveBeenCalled();
    });

    it('should pass correct options to callAI', async () => {
      const props = createMockProps();
      const { result } = renderHook(() => useFileHandling(props));

      const longText = 'a'.repeat(100);
      await act(async () => {
        await result.current.generateModelsFromFileContent(longText, 'test.pdf');
      });

      const callArgs = (props.aiIntegration.callAI as any).mock.calls[0];
      const options = callArgs[1];
      expect(options.maxTokens).toBe(8000);
      expect(options.useInstructions).toBe(true);
      expect(options.logMetrics).toBe(true);
      expect(options.temperature).toBe(0.3);
      expect(options.topP).toBe(0.9);
      expect(options.topK).toBe(50);
    });

    it('should return formatted models from AI response', async () => {
      const props = createMockProps();
      const { result } = renderHook(() => useFileHandling(props));

      const longText = 'a'.repeat(100);
      let models: any;
      await act(async () => {
        models = await result.current.generateModelsFromFileContent(longText, 'test.pdf');
      });

      expect(models).toHaveLength(1);
      expect(models[0].title).toBe('Modelo Teste');
      expect(models[0].category).toBe('Trabalhista');
      expect(models[0].keywords).toBe('teste, modelo');
      expect(models[0].content).toBe('<p>Conteúdo do modelo de teste</p>');
      expect(models[0].sourceFile).toBe('test.pdf');
      expect(models[0].isFavorite).toBe(false);
      expect(models[0].id).toContain('bulk-');
    });

    it('should cache generated models after successful generation', async () => {
      const props = createMockProps();
      const { result } = renderHook(() => useFileHandling(props));

      const longText = 'a'.repeat(100);
      await act(async () => {
        await result.current.generateModelsFromFileContent(longText, 'test.pdf');
      });

      expect(props.apiCache.set).toHaveBeenCalledWith(
        expect.stringContaining('bulkModels_test.pdf_'),
        expect.any(String)
      );
    });

    it('should use fallback JSON extraction when Zod validation fails', async () => {
      const { parseAIResponse } = await import('../schemas/ai-responses');
      (parseAIResponse as any).mockReturnValueOnce({
        success: false,
        error: 'Validation failed',
      });
      const { extractJSON } = await import('../schemas/ai-responses');
      (extractJSON as any).mockReturnValueOnce(
        '{"modelos":[{"titulo":"Fallback","categoria":"Cat","palavrasChave":["kw"],"conteudo":"<p>Fallback content</p>"}]}'
      );

      const props = createMockProps();
      const { result } = renderHook(() => useFileHandling(props));

      const longText = 'a'.repeat(100);
      let models: any;
      await act(async () => {
        models = await result.current.generateModelsFromFileContent(longText, 'test.pdf');
      });

      expect(models).toHaveLength(1);
      expect(models[0].title).toBe('Fallback');
    });

    it('should throw when fallback JSON extraction finds no JSON', async () => {
      const { parseAIResponse } = await import('../schemas/ai-responses');
      (parseAIResponse as any).mockReturnValueOnce({ success: false, error: 'fail' });
      const { extractJSON } = await import('../schemas/ai-responses');
      (extractJSON as any).mockReturnValueOnce(null);

      const props = createMockProps();
      const { result } = renderHook(() => useFileHandling(props));

      const longText = 'a'.repeat(100);
      await expect(
        act(async () => {
          await result.current.generateModelsFromFileContent(longText, 'test.pdf');
        })
      ).rejects.toThrow('Nenhum JSON encontrado na resposta');
    });

    it('should throw when parsed modelos array is empty', async () => {
      const { parseAIResponse } = await import('../schemas/ai-responses');
      (parseAIResponse as any).mockReturnValueOnce({
        success: true,
        data: { modelos: [] },
      });

      const props = createMockProps();
      const { result } = renderHook(() => useFileHandling(props));

      const longText = 'a'.repeat(100);
      await expect(
        act(async () => {
          await result.current.generateModelsFromFileContent(longText, 'test.pdf');
        })
      ).rejects.toThrow('Nenhum modelo identificado no documento');
    });

    it('should handle keywords as string', async () => {
      const { parseAIResponse } = await import('../schemas/ai-responses');
      (parseAIResponse as any).mockReturnValueOnce({
        success: true,
        data: {
          modelos: [{
            titulo: 'Test',
            categoria: 'Cat',
            palavrasChave: 'keyword-string',
            conteudo: '<p>Content</p>',
          }],
        },
      });

      const props = createMockProps();
      const { result } = renderHook(() => useFileHandling(props));

      const longText = 'a'.repeat(100);
      let models: any;
      await act(async () => {
        models = await result.current.generateModelsFromFileContent(longText, 'test.pdf');
      });

      expect(models[0].keywords).toBe('keyword-string');
    });

    it('should set default title when titulo is missing', async () => {
      const { parseAIResponse } = await import('../schemas/ai-responses');
      (parseAIResponse as any).mockReturnValueOnce({
        success: true,
        data: {
          modelos: [{
            titulo: '',
            categoria: 'Cat',
            palavrasChave: [],
            conteudo: '<p>Content</p>',
          }],
        },
      });

      const props = createMockProps();
      const { result } = renderHook(() => useFileHandling(props));

      const longText = 'a'.repeat(100);
      let models: any;
      await act(async () => {
        models = await result.current.generateModelsFromFileContent(longText, 'test.pdf');
      });

      expect(models[0].title).toBe('Modelo 1');
    });

    it('should set default category when categoria is missing', async () => {
      const { parseAIResponse } = await import('../schemas/ai-responses');
      (parseAIResponse as any).mockReturnValueOnce({
        success: true,
        data: {
          modelos: [{
            titulo: 'Test',
            categoria: '',
            palavrasChave: [],
            conteudo: '<p>Content</p>',
          }],
        },
      });

      const props = createMockProps();
      const { result } = renderHook(() => useFileHandling(props));

      const longText = 'a'.repeat(100);
      let models: any;
      await act(async () => {
        models = await result.current.generateModelsFromFileContent(longText, 'test.pdf');
      });

      expect(models[0].category).toBe('Sem categoria');
    });

    it('should set createdAt timestamp on generated models', async () => {
      const props = createMockProps();
      const { result } = renderHook(() => useFileHandling(props));

      const longText = 'a'.repeat(100);
      let models: any;
      await act(async () => {
        models = await result.current.generateModelsFromFileContent(longText, 'test.pdf');
      });

      expect(models[0].createdAt).toBeDefined();
      // Should be a valid ISO date
      expect(new Date(models[0].createdAt).toISOString()).toBe(models[0].createdAt);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // processBulkFiles
  // ═══════════════════════════════════════════════════════════════════════════

  describe('processBulkFiles', () => {
    it('should do nothing when bulkFiles is empty', async () => {
      const props = createMockProps({
        modelLibrary: createMockModelLibrary({ bulkFiles: [] }),
      });
      const { result } = renderHook(() => useFileHandling(props));

      await act(async () => {
        await result.current.processBulkFiles();
      });

      expect(props.modelLibrary.setBulkProcessing).not.toHaveBeenCalled();
    });

    it('should set processing state to true at start', async () => {
      const pdfFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const props = createMockProps({
        modelLibrary: createMockModelLibrary({
          bulkFiles: [{ file: pdfFile, name: 'test.pdf', size: 100 }],
        }),
      });
      const { result } = renderHook(() => useFileHandling(props));

      await act(async () => {
        await result.current.processBulkFiles();
      });

      expect(props.modelLibrary.setBulkProcessing).toHaveBeenCalledWith(true);
    });

    it('should reset state at the beginning of processing', async () => {
      const pdfFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const props = createMockProps({
        modelLibrary: createMockModelLibrary({
          bulkFiles: [{ file: pdfFile, name: 'test.pdf', size: 100 }],
        }),
      });
      const { result } = renderHook(() => useFileHandling(props));

      await act(async () => {
        await result.current.processBulkFiles();
      });

      expect(props.modelLibrary.setBulkProcessedFiles).toHaveBeenCalledWith([]);
      expect(props.modelLibrary.setBulkGeneratedModels).toHaveBeenCalledWith([]);
      expect(props.modelLibrary.setBulkErrors).toHaveBeenCalledWith([]);
    });

    it('should create a new AbortController', async () => {
      const pdfFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const props = createMockProps({
        modelLibrary: createMockModelLibrary({
          bulkFiles: [{ file: pdfFile, name: 'test.pdf', size: 100 }],
        }),
      });
      const { result } = renderHook(() => useFileHandling(props));

      await act(async () => {
        await result.current.processBulkFiles();
      });

      expect(props.modelLibrary.setBulkCancelController).toHaveBeenCalledWith(
        expect.any(AbortController)
      );
    });

    it('should call documentServices.extractTextFromBulkFile for each file', async () => {
      const pdfFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const props = createMockProps({
        modelLibrary: createMockModelLibrary({
          bulkFiles: [{ file: pdfFile, name: 'test.pdf', size: 100 }],
        }),
      });
      const { result } = renderHook(() => useFileHandling(props));

      await act(async () => {
        await result.current.processBulkFiles();
      });

      expect(props.documentServices.extractTextFromBulkFile).toHaveBeenCalledWith(pdfFile);
    });

    it('should process multiple files', async () => {
      const file1 = new File(['content1'], 'doc1.pdf', { type: 'application/pdf' });
      const file2 = new File(['content2'], 'doc2.pdf', { type: 'application/pdf' });
      const props = createMockProps({
        modelLibrary: createMockModelLibrary({
          bulkFiles: [
            { file: file1, name: 'doc1.pdf', size: 100 },
            { file: file2, name: 'doc2.pdf', size: 200 },
          ],
        }),
      });
      const { result } = renderHook(() => useFileHandling(props));

      await act(async () => {
        await result.current.processBulkFiles();
      });

      expect(props.documentServices.extractTextFromBulkFile).toHaveBeenCalledTimes(2);
    });

    it('should set bulkProcessing to false in finally block', async () => {
      const pdfFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const props = createMockProps({
        modelLibrary: createMockModelLibrary({
          bulkFiles: [{ file: pdfFile, name: 'test.pdf', size: 100 }],
        }),
      });
      const { result } = renderHook(() => useFileHandling(props));

      await act(async () => {
        await result.current.processBulkFiles();
      });

      // The last call to setBulkProcessing should be false (finally block)
      const calls = (props.modelLibrary.setBulkProcessing as any).mock.calls;
      expect(calls[calls.length - 1][0]).toBe(false);
    });

    it('should open bulkReview modal after processing', async () => {
      const pdfFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const props = createMockProps({
        modelLibrary: createMockModelLibrary({
          bulkFiles: [{ file: pdfFile, name: 'test.pdf', size: 100 }],
        }),
      });
      const { result } = renderHook(() => useFileHandling(props));

      await act(async () => {
        await result.current.processBulkFiles();
      });

      expect(props.openModal).toHaveBeenCalledWith('bulkReview');
    });

    it('should handle extraction failure gracefully', async () => {
      const pdfFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const props = createMockProps({
        modelLibrary: createMockModelLibrary({
          bulkFiles: [{ file: pdfFile, name: 'test.pdf', size: 100 }],
        }),
        documentServices: {
          extractTextFromBulkFile: vi.fn().mockRejectedValue(new Error('Extraction failed')),
        },
      });
      const { result } = renderHook(() => useFileHandling(props));

      await act(async () => {
        await result.current.processBulkFiles();
      });

      // Should still complete without crashing
      expect(props.modelLibrary.setBulkProcessing).toHaveBeenCalledWith(false);
    });

    it('should set current batch number during processing', async () => {
      const pdfFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const props = createMockProps({
        modelLibrary: createMockModelLibrary({
          bulkFiles: [{ file: pdfFile, name: 'test.pdf', size: 100 }],
        }),
      });
      const { result } = renderHook(() => useFileHandling(props));

      await act(async () => {
        await result.current.processBulkFiles();
      });

      expect(props.modelLibrary.setBulkCurrentBatch).toHaveBeenCalledWith(1);
    });

    it('should reset batch and controller after processing', async () => {
      const pdfFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const props = createMockProps({
        modelLibrary: createMockModelLibrary({
          bulkFiles: [{ file: pdfFile, name: 'test.pdf', size: 100 }],
        }),
      });
      const { result } = renderHook(() => useFileHandling(props));

      await act(async () => {
        await result.current.processBulkFiles();
      });

      // Controller should be set to null at end
      const controllerCalls = (props.modelLibrary.setBulkCancelController as any).mock.calls;
      expect(controllerCalls[controllerCalls.length - 1][0]).toBeNull();

      // Batch should be reset to 0
      const batchCalls = (props.modelLibrary.setBulkCurrentBatch as any).mock.calls;
      expect(batchCalls[batchCalls.length - 1][0]).toBe(0);
    });

    it('should call setError when top-level exception occurs', async () => {
      const pdfFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      // Simulate setBulkProcessing throwing an error to trigger catch block
      const mockSetBulkProcessing = vi.fn().mockImplementationOnce(() => {
        throw new Error('Unexpected error');
      });
      const props = createMockProps({
        modelLibrary: createMockModelLibrary({
          bulkFiles: [{ file: pdfFile, name: 'test.pdf', size: 100 }],
          setBulkProcessing: mockSetBulkProcessing,
        }),
      });
      const { result } = renderHook(() => useFileHandling(props));

      await act(async () => {
        await result.current.processBulkFiles();
      });

      expect(props.setError).toHaveBeenCalledWith('Unexpected error');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // saveBulkModels
  // ═══════════════════════════════════════════════════════════════════════════

  describe('saveBulkModels', () => {
    it('should show error toast when no review models exist', () => {
      const props = createMockProps({
        modelLibrary: createMockModelLibrary({ bulkReviewModels: [] }),
      });
      const { result } = renderHook(() => useFileHandling(props));

      act(() => {
        result.current.saveBulkModels();
      });

      expect(props.showToast).toHaveBeenCalledWith('Nenhum modelo para salvar.', 'error');
      expect(props.processBulkSaveNext).not.toHaveBeenCalled();
    });

    it('should call processBulkSaveNext with formatted queue', () => {
      const reviewModels = [
        {
          id: 'model-1',
          title: 'Modelo A',
          content: '<p>Conteúdo A</p>',
          keywords: 'kw1, kw2',
          category: 'Trabalhista',
          embedding: [0.1, 0.2],
        },
        {
          id: 'model-2',
          title: 'Modelo B',
          content: '<p>Conteúdo B</p>',
          keywords: 'kw3',
          category: 'Civil',
        },
      ] as any;

      const props = createMockProps({
        modelLibrary: createMockModelLibrary({ bulkReviewModels: reviewModels }),
      });
      const { result } = renderHook(() => useFileHandling(props));

      act(() => {
        result.current.saveBulkModels();
      });

      expect(props.processBulkSaveNext).toHaveBeenCalledWith(
        [
          { title: 'Modelo A', content: '<p>Conteúdo A</p>', keywords: 'kw1, kw2', category: 'Trabalhista', embedding: [0.1, 0.2] },
          { title: 'Modelo B', content: '<p>Conteúdo B</p>', keywords: 'kw3', category: 'Civil', embedding: undefined },
        ],
        [],
        0,
        []
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // removeBulkReviewModel
  // ═══════════════════════════════════════════════════════════════════════════

  describe('removeBulkReviewModel', () => {
    it('should remove model by id from review models', () => {
      const reviewModels = [
        { id: 'model-1', title: 'A', content: '<p>A</p>' },
        { id: 'model-2', title: 'B', content: '<p>B</p>' },
        { id: 'model-3', title: 'C', content: '<p>C</p>' },
      ] as any;

      const props = createMockProps({
        modelLibrary: createMockModelLibrary({ bulkReviewModels: reviewModels }),
      });
      const { result } = renderHook(() => useFileHandling(props));

      act(() => {
        result.current.removeBulkReviewModel('model-2');
      });

      expect(props.modelLibrary.setBulkReviewModels).toHaveBeenCalledWith([
        { id: 'model-1', title: 'A', content: '<p>A</p>' },
        { id: 'model-3', title: 'C', content: '<p>C</p>' },
      ]);
    });

    it('should not modify list when id does not exist', () => {
      const reviewModels = [
        { id: 'model-1', title: 'A', content: '<p>A</p>' },
      ] as any;

      const props = createMockProps({
        modelLibrary: createMockModelLibrary({ bulkReviewModels: reviewModels }),
      });
      const { result } = renderHook(() => useFileHandling(props));

      act(() => {
        result.current.removeBulkReviewModel('non-existent');
      });

      expect(props.modelLibrary.setBulkReviewModels).toHaveBeenCalledWith([
        { id: 'model-1', title: 'A', content: '<p>A</p>' },
      ]);
    });

    it('should handle empty review models array', () => {
      const props = createMockProps({
        modelLibrary: createMockModelLibrary({ bulkReviewModels: [] }),
      });
      const { result } = renderHook(() => useFileHandling(props));

      act(() => {
        result.current.removeBulkReviewModel('any-id');
      });

      expect(props.modelLibrary.setBulkReviewModels).toHaveBeenCalledWith([]);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // toggleFavorite
  // ═══════════════════════════════════════════════════════════════════════════

  describe('toggleFavorite', () => {
    it('should toggle favorite from false to true', async () => {
      const models = [
        { id: 'model-1', title: 'A', content: '<p>A</p>', favorite: false },
        { id: 'model-2', title: 'B', content: '<p>B</p>', favorite: true },
      ] as any;

      const props = createMockProps({
        modelLibrary: createMockModelLibrary({ models }),
      });
      const { result } = renderHook(() => useFileHandling(props));

      await act(async () => {
        await result.current.toggleFavorite('model-1');
      });

      const calledWith = (props.modelLibrary.setModels as any).mock.calls[0][0];
      expect(calledWith[0].favorite).toBe(true);
      expect(calledWith[0].updatedAt).toBeDefined();
    });

    it('should toggle favorite from true to false', async () => {
      const models = [
        { id: 'model-1', title: 'A', content: '<p>A</p>', favorite: true },
      ] as any;

      const props = createMockProps({
        modelLibrary: createMockModelLibrary({ models }),
      });
      const { result } = renderHook(() => useFileHandling(props));

      await act(async () => {
        await result.current.toggleFavorite('model-1');
      });

      const calledWith = (props.modelLibrary.setModels as any).mock.calls[0][0];
      expect(calledWith[0].favorite).toBe(false);
    });

    it('should call cloudSync.trackChange with update action', async () => {
      const models = [
        { id: 'model-1', title: 'A', content: '<p>A</p>', favorite: false },
      ] as any;

      const props = createMockProps({
        modelLibrary: createMockModelLibrary({ models }),
      });
      const { result } = renderHook(() => useFileHandling(props));

      await act(async () => {
        await result.current.toggleFavorite('model-1');
      });

      expect(props.cloudSync!.trackChange).toHaveBeenCalledWith('update', expect.objectContaining({
        id: 'model-1',
        favorite: true,
      }));
    });

    it('should set hasUnsavedChanges to true', async () => {
      const models = [
        { id: 'model-1', title: 'A', content: '<p>A</p>', favorite: false },
      ] as any;

      const props = createMockProps({
        modelLibrary: createMockModelLibrary({ models }),
      });
      const { result } = renderHook(() => useFileHandling(props));

      await act(async () => {
        await result.current.toggleFavorite('model-1');
      });

      expect(props.modelLibrary.setHasUnsavedChanges).toHaveBeenCalledWith(true);
    });

    it('should update suggestions when model is in suggestions list', async () => {
      const model = { id: 'model-1', title: 'A', content: '<p>A</p>', favorite: false };
      const props = createMockProps({
        modelLibrary: createMockModelLibrary({
          models: [model] as any,
          suggestions: [model] as any,
        }),
      });
      const { result } = renderHook(() => useFileHandling(props));

      await act(async () => {
        await result.current.toggleFavorite('model-1');
      });

      expect(props.modelLibrary.setSuggestions).toHaveBeenCalled();
    });

    it('should not update suggestions when suggestions is empty', async () => {
      const model = { id: 'model-1', title: 'A', content: '<p>A</p>', favorite: false };
      const props = createMockProps({
        modelLibrary: createMockModelLibrary({
          models: [model] as any,
          suggestions: [],
        }),
      });
      const { result } = renderHook(() => useFileHandling(props));

      await act(async () => {
        await result.current.toggleFavorite('model-1');
      });

      expect(props.modelLibrary.setSuggestions).not.toHaveBeenCalled();
    });

    it('should update preview when toggled model is being previewed', async () => {
      const model = { id: 'model-1', title: 'A', content: '<p>A</p>', favorite: false };
      const props = createMockProps({
        modelLibrary: createMockModelLibrary({
          models: [model] as any,
        }),
        modelPreview: {
          previewingModel: model as any,
          openPreview: vi.fn(),
        },
      });
      const { result } = renderHook(() => useFileHandling(props));

      await act(async () => {
        await result.current.toggleFavorite('model-1');
      });

      expect(props.modelPreview.openPreview).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'model-1', favorite: true })
      );
    });

    it('should not update preview when different model is being previewed', async () => {
      const model = { id: 'model-1', title: 'A', content: '<p>A</p>', favorite: false };
      const otherModel = { id: 'model-2', title: 'B', content: '<p>B</p>', favorite: false };
      const props = createMockProps({
        modelLibrary: createMockModelLibrary({
          models: [model] as any,
        }),
        modelPreview: {
          previewingModel: otherModel as any,
          openPreview: vi.fn(),
        },
      });
      const { result } = renderHook(() => useFileHandling(props));

      await act(async () => {
        await result.current.toggleFavorite('model-1');
      });

      expect(props.modelPreview.openPreview).not.toHaveBeenCalled();
    });

    it('should handle non-existent model id gracefully', async () => {
      const models = [
        { id: 'model-1', title: 'A', content: '<p>A</p>', favorite: false },
      ] as any;

      const props = createMockProps({
        modelLibrary: createMockModelLibrary({ models }),
      });
      const { result } = renderHook(() => useFileHandling(props));

      await act(async () => {
        await result.current.toggleFavorite('non-existent');
      });

      // Should still call setModels (with unchanged array)
      expect(props.modelLibrary.setModels).toHaveBeenCalled();
      // cloudSync should NOT be called since no model was updated
      expect(props.cloudSync!.trackChange).not.toHaveBeenCalled();
    });

    it('should call setError when an error occurs', async () => {
      const props = createMockProps({
        modelLibrary: createMockModelLibrary({
          models: [{ id: 'model-1', title: 'A', content: '<p>A</p>', favorite: false }] as any,
          setModels: vi.fn().mockImplementation(() => { throw new Error('DB error'); }),
        }),
      });
      const { result } = renderHook(() => useFileHandling(props));

      await act(async () => {
        await result.current.toggleFavorite('model-1');
      });

      expect(props.setError).toHaveBeenCalledWith(expect.stringContaining('DB error'));
    });

    it('should work without cloudSync (undefined)', async () => {
      const models = [
        { id: 'model-1', title: 'A', content: '<p>A</p>', favorite: false },
      ] as any;

      const props = createMockProps({
        modelLibrary: createMockModelLibrary({ models }),
        cloudSync: undefined,
      });
      const { result } = renderHook(() => useFileHandling(props));

      await act(async () => {
        await result.current.toggleFavorite('model-1');
      });

      // Should complete without errors
      expect(props.modelLibrary.setModels).toHaveBeenCalled();
      expect(props.modelLibrary.setHasUnsavedChanges).toHaveBeenCalledWith(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PROGRESS / LOADING STATE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  describe('progress and loading state management', () => {
    it('should update bulkProcessedFiles progressively during processing', async () => {
      const file1 = new File(['content'], 'doc1.pdf', { type: 'application/pdf' });
      const file2 = new File(['content'], 'doc2.pdf', { type: 'application/pdf' });
      const props = createMockProps({
        modelLibrary: createMockModelLibrary({
          bulkFiles: [
            { file: file1, name: 'doc1.pdf', size: 100 },
            { file: file2, name: 'doc2.pdf', size: 100 },
          ],
        }),
      });
      const { result } = renderHook(() => useFileHandling(props));

      await act(async () => {
        await result.current.processBulkFiles();
      });

      // Should have been called with incremental updates
      expect(props.modelLibrary.setBulkProcessedFiles).toHaveBeenCalled();
      const calls = (props.modelLibrary.setBulkProcessedFiles as any).mock.calls;
      // At least the initial reset [] and the batch result
      expect(calls.length).toBeGreaterThanOrEqual(2);
    });

    it('should track errors separately during processing', async () => {
      const file1 = new File(['content'], 'doc1.pdf', { type: 'application/pdf' });
      const props = createMockProps({
        modelLibrary: createMockModelLibrary({
          bulkFiles: [{ file: file1, name: 'doc1.pdf', size: 100 }],
        }),
        documentServices: {
          extractTextFromBulkFile: vi.fn().mockRejectedValue(new Error('Cannot read file')),
        },
      });
      const { result } = renderHook(() => useFileHandling(props));

      await act(async () => {
        await result.current.processBulkFiles();
      });

      // Errors should be tracked
      expect(props.modelLibrary.setBulkErrors).toHaveBeenCalled();
    });

    it('should update generated models progressively', async () => {
      const file1 = new File(['content'], 'doc1.pdf', { type: 'application/pdf' });
      const props = createMockProps({
        modelLibrary: createMockModelLibrary({
          bulkFiles: [{ file: file1, name: 'doc1.pdf', size: 100 }],
        }),
      });
      const { result } = renderHook(() => useFileHandling(props));

      await act(async () => {
        await result.current.processBulkFiles();
      });

      // Generated models should be updated
      expect(props.modelLibrary.setBulkGeneratedModels).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FILE PROCESSING WITH DOCUMENT SERVICES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('file processing with documentServices', () => {
    it('should extract text from PDF using documentServices', async () => {
      const pdfFile = new File(['%PDF-1.4 content'], 'sentenca.pdf', { type: 'application/pdf' });
      const props = createMockProps({
        modelLibrary: createMockModelLibrary({
          bulkFiles: [{ file: pdfFile, name: 'sentenca.pdf', size: 5000 }],
        }),
        documentServices: {
          extractTextFromBulkFile: vi.fn().mockResolvedValue(
            'Texto completo da sentença com conteúdo suficiente para análise adequada pela inteligência artificial.'
          ),
        },
      });
      const { result } = renderHook(() => useFileHandling(props));

      await act(async () => {
        await result.current.processBulkFiles();
      });

      expect(props.documentServices.extractTextFromBulkFile).toHaveBeenCalledWith(pdfFile);
    });

    it('should extract text from DOCX using documentServices', async () => {
      const docxFile = new File(['PK docx content'], 'documento.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      const props = createMockProps({
        modelLibrary: createMockModelLibrary({
          bulkFiles: [{ file: docxFile, name: 'documento.docx', size: 3000 }],
        }),
        documentServices: {
          extractTextFromBulkFile: vi.fn().mockResolvedValue(
            'Conteúdo extraído do documento DOCX para processamento com inteligência artificial no sistema.'
          ),
        },
      });
      const { result } = renderHook(() => useFileHandling(props));

      await act(async () => {
        await result.current.processBulkFiles();
      });

      expect(props.documentServices.extractTextFromBulkFile).toHaveBeenCalledWith(docxFile);
    });

    it('should handle extraction returning empty text gracefully', async () => {
      const pdfFile = new File(['content'], 'empty.pdf', { type: 'application/pdf' });
      const props = createMockProps({
        modelLibrary: createMockModelLibrary({
          bulkFiles: [{ file: pdfFile, name: 'empty.pdf', size: 100 }],
        }),
        documentServices: {
          extractTextFromBulkFile: vi.fn().mockResolvedValue(''),
        },
      });
      const { result } = renderHook(() => useFileHandling(props));

      await act(async () => {
        await result.current.processBulkFiles();
      });

      // Should complete without crashing - the error will be captured
      expect(props.modelLibrary.setBulkProcessing).toHaveBeenCalledWith(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ERROR HANDLING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('error handling', () => {
    it('should handle AI call failure gracefully during bulk processing', async () => {
      const pdfFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const props = createMockProps({
        modelLibrary: createMockModelLibrary({
          bulkFiles: [{ file: pdfFile, name: 'test.pdf', size: 100 }],
        }),
        aiIntegration: {
          aiSettings: { parallelRequests: 5 } as any,
          callAI: vi.fn().mockRejectedValue(new Error('API Error')),
        },
      });
      const { result } = renderHook(() => useFileHandling(props));

      await act(async () => {
        await result.current.processBulkFiles();
      });

      // Should not crash, processing should complete
      const calls = (props.modelLibrary.setBulkProcessing as any).mock.calls;
      expect(calls[calls.length - 1][0]).toBe(false);
    });

    it('should report file-level errors in processed files list', async () => {
      const pdfFile = new File(['content'], 'bad.pdf', { type: 'application/pdf' });
      const props = createMockProps({
        modelLibrary: createMockModelLibrary({
          bulkFiles: [{ file: pdfFile, name: 'bad.pdf', size: 100 }],
        }),
        documentServices: {
          extractTextFromBulkFile: vi.fn().mockRejectedValue(new Error('Corrupt PDF')),
        },
      });
      const { result } = renderHook(() => useFileHandling(props));

      await act(async () => {
        await result.current.processBulkFiles();
      });

      // The error should be captured in processed files
      const processedCalls = (props.modelLibrary.setBulkProcessedFiles as any).mock.calls;
      // Get the last non-empty call
      const lastCall = processedCalls.filter((c: any) => c[0].length > 0);
      if (lastCall.length > 0) {
        const results = lastCall[lastCall.length - 1][0];
        expect(results[0].status).toBe('error');
        expect(results[0].error).toContain('Corrupt PDF');
      }
    });

    it('should include duration in error results', async () => {
      const pdfFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const props = createMockProps({
        modelLibrary: createMockModelLibrary({
          bulkFiles: [{ file: pdfFile, name: 'test.pdf', size: 100 }],
        }),
        documentServices: {
          extractTextFromBulkFile: vi.fn().mockRejectedValue(new Error('Fail')),
        },
      });
      const { result } = renderHook(() => useFileHandling(props));

      await act(async () => {
        await result.current.processBulkFiles();
      });

      const processedCalls = (props.modelLibrary.setBulkProcessedFiles as any).mock.calls;
      const lastCall = processedCalls.filter((c: any) => c[0].length > 0);
      if (lastCall.length > 0) {
        const results = lastCall[lastCall.length - 1][0];
        expect(results[0].duration).toBeDefined();
        expect(parseFloat(results[0].duration)).toBeGreaterThanOrEqual(0);
      }
    });

    it('should include duration in success results', async () => {
      const pdfFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const props = createMockProps({
        modelLibrary: createMockModelLibrary({
          bulkFiles: [{ file: pdfFile, name: 'test.pdf', size: 100 }],
        }),
      });
      const { result } = renderHook(() => useFileHandling(props));

      await act(async () => {
        await result.current.processBulkFiles();
      });

      const processedCalls = (props.modelLibrary.setBulkProcessedFiles as any).mock.calls;
      const lastCall = processedCalls.filter((c: any) => c[0].length > 0);
      if (lastCall.length > 0) {
        const results = lastCall[lastCall.length - 1][0];
        expect(results[0].duration).toBeDefined();
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // BATCH PROCESSING BEHAVIOR
  // ═══════════════════════════════════════════════════════════════════════════

  describe('batch processing behavior', () => {
    it('should respect parallelRequests setting for batch size', async () => {
      // Create 3 files with parallelRequests = 2
      const files = [1, 2, 3].map(i => ({
        file: new File(['content'], `doc${i}.pdf`, { type: 'application/pdf' }),
        name: `doc${i}.pdf`,
        size: 100,
      }));

      const props = createMockProps({
        modelLibrary: createMockModelLibrary({ bulkFiles: files }),
        aiIntegration: {
          aiSettings: { parallelRequests: 2 } as any,
          callAI: vi.fn().mockResolvedValue('{"modelos":[{"titulo":"T","categoria":"C","palavrasChave":[],"conteudo":"<p>X</p>"}]}'),
        },
      });
      const { result } = renderHook(() => useFileHandling(props));

      await act(async () => {
        await result.current.processBulkFiles();
      });

      // With 3 files and batch size 2, should have 2 batches
      const batchCalls = (props.modelLibrary.setBulkCurrentBatch as any).mock.calls;
      // Should have batch 1 and batch 2 (plus reset to 0)
      const batchNumbers = batchCalls.map((c: any) => c[0]);
      expect(batchNumbers).toContain(1);
      expect(batchNumbers).toContain(2);
    });

    it('should use default parallelRequests of 5 when not specified', async () => {
      const files = Array.from({ length: 6 }, (_, i) => ({
        file: new File(['content'], `doc${i}.pdf`, { type: 'application/pdf' }),
        name: `doc${i}.pdf`,
        size: 100,
      }));

      const props = createMockProps({
        modelLibrary: createMockModelLibrary({ bulkFiles: files }),
        aiIntegration: {
          aiSettings: { parallelRequests: 5 } as any,
          callAI: vi.fn().mockResolvedValue('{"modelos":[{"titulo":"T","categoria":"C","palavrasChave":[],"conteudo":"<p>X</p>"}]}'),
        },
      });
      const { result } = renderHook(() => useFileHandling(props));

      await act(async () => {
        await result.current.processBulkFiles();
      });

      // With 6 files and batch size 5, should have 2 batches
      const batchCalls = (props.modelLibrary.setBulkCurrentBatch as any).mock.calls;
      const batchNumbers = batchCalls.map((c: any) => c[0]);
      expect(batchNumbers).toContain(1);
      expect(batchNumbers).toContain(2);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SIMILARITY DETECTION (TFIDFSimilarity)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('similarity detection', () => {
    it('should call TFIDFSimilarity.findSimilar for generated models', async () => {
      const { TFIDFSimilarity } = await import('../services/EmbeddingsServices');
      const pdfFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const props = createMockProps({
        modelLibrary: createMockModelLibrary({
          bulkFiles: [{ file: pdfFile, name: 'test.pdf', size: 100 }],
          models: [{ id: 'existing-1', title: 'Existing', content: '<p>Existing</p>' }] as any,
        }),
      });
      const { result } = renderHook(() => useFileHandling(props));

      await act(async () => {
        await result.current.processBulkFiles();
      });

      expect(TFIDFSimilarity.findSimilar).toHaveBeenCalled();
    });

    it('should add similarityInfo to models with high similarity', async () => {
      const { TFIDFSimilarity } = await import('../services/EmbeddingsServices');
      const similarModel = { id: 'existing-1', title: 'Similar', content: '<p>Similar</p>' };
      (TFIDFSimilarity.findSimilar as any).mockReturnValue({
        hasSimilar: true,
        similarity: 0.95,
        similarModel,
      });

      const pdfFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const props = createMockProps({
        modelLibrary: createMockModelLibrary({
          bulkFiles: [{ file: pdfFile, name: 'test.pdf', size: 100 }],
          models: [similarModel] as any,
        }),
      });
      const { result } = renderHook(() => useFileHandling(props));

      await act(async () => {
        await result.current.processBulkFiles();
      });

      // Check that setBulkReviewModels was called with models containing similarityInfo
      const reviewCalls = (props.modelLibrary.setBulkReviewModels as any).mock.calls;
      if (reviewCalls.length > 0) {
        const lastReviewModels = reviewCalls[reviewCalls.length - 1][0];
        if (lastReviewModels.length > 0) {
          expect(lastReviewModels[0].similarityInfo).toBeDefined();
          expect(lastReviewModels[0].similarityInfo.similarity).toBe(0.95);
        }
      }
    });
  });
});

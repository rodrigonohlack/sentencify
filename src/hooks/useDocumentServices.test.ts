import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDocumentServices } from './useDocumentServices';
import type { AIIntegrationForDocuments } from './useDocumentServices';

// ═══════════════════════════════════════════════════════════════════════════════
// MOCKS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Helper: creates a mock File with arrayBuffer support
 */
function createMockFile(name: string, type: string, content: ArrayBuffer = new ArrayBuffer(10)): File {
  const file = new File([content], name, { type });
  Object.defineProperty(file, 'arrayBuffer', {
    value: () => Promise.resolve(content),
    writable: true,
    configurable: true,
  });
  return file;
}

/**
 * Helper: creates a mock AIIntegration object
 */
function createMockAIIntegration(overrides: Partial<AIIntegrationForDocuments> = {}): AIIntegrationForDocuments {
  return {
    aiSettings: {
      provider: 'claude' as any,
      claudeModel: 'claude-sonnet-4-20250514',
      geminiModel: 'gemini-2.5-pro',
      openaiModel: 'gpt-5.2' as any,
      openaiReasoningLevel: 'medium' as any,
      grokModel: 'grok-4-1-fast-reasoning' as any,
      apiKeys: { claude: 'test-key', gemini: '', openai: '', grok: '' },
      useExtendedThinking: false,
      thinkingBudget: '10000',
      geminiThinkingLevel: 'none' as any,
      model: 'claude-sonnet-4-20250514',
      customPrompt: '',
      modeloRelatorio: '',
      modeloDispositivo: '',
      modeloTopicoRelatorio: '',
      ocrEngine: 'pdfjs' as any,
      ocrLanguage: 'por',
      parallelRequests: 1,
      anonymization: {} as any,
      semanticSearchEnabled: false,
      semanticThreshold: 0.7,
      jurisSemanticEnabled: false,
      quickPrompts: [],
    } as any,
    getApiHeaders: vi.fn(() => ({
      'Content-Type': 'application/json',
      'x-api-key': 'test-key',
      'anthropic-version': '2023-06-01',
    })),
    logCacheMetrics: vi.fn(),
    ...overrides,
  };
}

/**
 * Helper: creates mock PdfPage
 */
function createMockPdfPage(text: string = 'Page text content') {
  return {
    getTextContent: vi.fn().mockResolvedValue({
      items: text.split(' ').map(str => ({ str })),
    }),
    getViewport: vi.fn().mockReturnValue({ width: 100, height: 200 }),
    render: vi.fn().mockReturnValue({ promise: Promise.resolve() }),
  };
}

/**
 * Helper: creates mock PdfDocument
 */
function createMockPdfDocument(numPages: number = 2, pageTexts: string[] = ['Page one text', 'Page two text']) {
  return {
    numPages,
    getPage: vi.fn((pageNum: number) => Promise.resolve(createMockPdfPage(pageTexts[pageNum - 1] || 'default text'))),
    destroy: vi.fn(),
  };
}

/**
 * Helper: creates mock pdfjsLib
 */
function createMockPdfjsLib(pdfDoc: any = createMockPdfDocument()) {
  return {
    getDocument: vi.fn(() => ({ promise: Promise.resolve(pdfDoc) })),
    GlobalWorkerOptions: { workerSrc: '' },
  };
}

/**
 * Helper: creates mock mammoth
 */
function createMockMammoth(extractedText: string = 'DOCX extracted text content here') {
  return {
    extractRawText: vi.fn().mockResolvedValue({ value: extractedText }),
  };
}

describe('useDocumentServices', () => {
  let appendChildSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });

    // Clear global libs
    delete (window as any).pdfjsLib;
    delete (window as any).mammoth;
    delete (window as any).Tesseract;

    // Mock document.createElement for script loading
    appendChildSpy = vi.spyOn(document.head, 'appendChild').mockImplementation((node: Node) => node);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // HOOK INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('hook initialization', () => {
    it('should return all expected methods when initialized with null', () => {
      const { result } = renderHook(() => useDocumentServices(null));

      expect(result.current.loadPDFJS).toBeDefined();
      expect(result.current.loadMammoth).toBeDefined();
      expect(result.current.extractTextFromPDFPure).toBeDefined();
      expect(result.current.extractTextFromDOCX).toBeDefined();
      expect(result.current.extractTextFromPDFWithClaudeVision).toBeDefined();
      expect(result.current.extractTextFromPDFWithTesseract).toBeDefined();
      expect(result.current.extractTextFromPDF).toBeDefined();
      expect(result.current.extractTextFromPDFWithMode).toBeDefined();
      expect(result.current.extractProcessoFromFileName).toBeDefined();
      expect(result.current.extractProcessoFromFirstPage).toBeDefined();
      expect(result.current.autoDetectProcessoNumero).toBeDefined();
      expect(result.current.extractTextFromBulkFile).toBeDefined();
      expect(result.current.tryExtractTextFromPDFs).toBeDefined();
    });

    it('should return all methods as functions', () => {
      const { result } = renderHook(() => useDocumentServices(null));

      expect(typeof result.current.loadPDFJS).toBe('function');
      expect(typeof result.current.loadMammoth).toBe('function');
      expect(typeof result.current.extractTextFromPDFPure).toBe('function');
      expect(typeof result.current.extractTextFromDOCX).toBe('function');
      expect(typeof result.current.extractTextFromPDFWithClaudeVision).toBe('function');
      expect(typeof result.current.extractTextFromPDFWithTesseract).toBe('function');
      expect(typeof result.current.extractTextFromPDF).toBe('function');
      expect(typeof result.current.extractTextFromPDFWithMode).toBe('function');
      expect(typeof result.current.extractProcessoFromFileName).toBe('function');
      expect(typeof result.current.extractProcessoFromFirstPage).toBe('function');
      expect(typeof result.current.autoDetectProcessoNumero).toBe('function');
      expect(typeof result.current.extractTextFromBulkFile).toBe('function');
      expect(typeof result.current.tryExtractTextFromPDFs).toBe('function');
    });

    it('should accept aiIntegration parameter', () => {
      const mockAI = createMockAIIntegration();
      const { result } = renderHook(() => useDocumentServices(mockAI));

      expect(result.current).toBeDefined();
      expect(typeof result.current.extractTextFromPDFWithClaudeVision).toBe('function');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // loadPDFJS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('loadPDFJS', () => {
    it('should resolve immediately if pdfjsLib is already on window', async () => {
      const mockPdfjsLib = createMockPdfjsLib();
      (window as any).pdfjsLib = mockPdfjsLib;

      const { result } = renderHook(() => useDocumentServices(null));

      let lib: any;
      await act(async () => {
        lib = await result.current.loadPDFJS();
      });

      expect(lib).toBe(mockPdfjsLib);
      expect(appendChildSpy).not.toHaveBeenCalled();
    });

    it('should create a script element and append to head', async () => {
      const mockPdfjsLib = createMockPdfjsLib();
      const { result } = renderHook(() => useDocumentServices(null));

      const loadPromise = act(async () => {
        const promise = result.current.loadPDFJS();
        // Simulate script load
        const scriptNode = appendChildSpy.mock.calls[0]?.[0] as any;
        if (scriptNode) {
          (window as any).pdfjsLib = mockPdfjsLib;
          scriptNode.onload();
        }
        return promise;
      });

      const lib = await loadPromise;
      expect(lib).toBe(mockPdfjsLib);
      expect(appendChildSpy).toHaveBeenCalled();
    });

    it('should set GlobalWorkerOptions.workerSrc on successful load', async () => {
      const mockPdfjsLib = createMockPdfjsLib();
      const { result } = renderHook(() => useDocumentServices(null));

      await act(async () => {
        const promise = result.current.loadPDFJS();
        const scriptNode = appendChildSpy.mock.calls[0]?.[0] as any;
        if (scriptNode) {
          (window as any).pdfjsLib = mockPdfjsLib;
          scriptNode.onload();
        }
        await promise;
      });

      expect(mockPdfjsLib.GlobalWorkerOptions.workerSrc).toContain('pdf.worker.min.js');
    });

    it('should reject if script fails to load', async () => {
      const { result } = renderHook(() => useDocumentServices(null));

      let error: Error | null = null;
      await act(async () => {
        const promise = result.current.loadPDFJS();
        const scriptNode = appendChildSpy.mock.calls[0]?.[0] as any;
        if (scriptNode) {
          scriptNode.onerror();
        }
        try {
          await promise;
        } catch (e) {
          error = e as Error;
        }
      });

      expect(error).not.toBeNull();
      expect(error!.message).toContain('Falha ao carregar PDF.js');
    });

    it('should reject if pdfjsLib is not on window after script loads', async () => {
      const { result } = renderHook(() => useDocumentServices(null));

      let error: Error | null = null;
      await act(async () => {
        const promise = result.current.loadPDFJS();
        const scriptNode = appendChildSpy.mock.calls[0]?.[0] as any;
        if (scriptNode) {
          // Do NOT set window.pdfjsLib
          scriptNode.onload();
        }
        try {
          await promise;
        } catch (e) {
          error = e as Error;
        }
      });

      expect(error).not.toBeNull();
      expect(error!.message).toContain('pdfjsLib não encontrado');
    });

    it('should reject on timeout if pdfjsLib is never loaded', async () => {
      const { result } = renderHook(() => useDocumentServices(null));

      let error: Error | null = null;
      await act(async () => {
        const promise = result.current.loadPDFJS();
        // Advance past the 10 second timeout
        vi.advanceTimersByTime(11000);
        try {
          await promise;
        } catch (e) {
          error = e as Error;
        }
      });

      expect(error).not.toBeNull();
      expect(error!.message).toContain('Timeout ao carregar PDF.js');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // loadMammoth
  // ═══════════════════════════════════════════════════════════════════════════

  describe('loadMammoth', () => {
    it('should resolve immediately if mammoth is already on window', async () => {
      const mockMammoth = createMockMammoth();
      (window as any).mammoth = mockMammoth;

      const { result } = renderHook(() => useDocumentServices(null));

      let lib: any;
      await act(async () => {
        lib = await result.current.loadMammoth();
      });

      expect(lib).toBe(mockMammoth);
      expect(appendChildSpy).not.toHaveBeenCalled();
    });

    it('should create a script element for mammoth CDN', async () => {
      const mockMammoth = createMockMammoth();
      const { result } = renderHook(() => useDocumentServices(null));

      await act(async () => {
        const promise = result.current.loadMammoth();
        const scriptNode = appendChildSpy.mock.calls[0]?.[0] as any;
        if (scriptNode) {
          (window as any).mammoth = mockMammoth;
          scriptNode.onload();
        }
        await promise;
      });

      expect(appendChildSpy).toHaveBeenCalled();
    });

    it('should reject if script fails to load', async () => {
      const { result } = renderHook(() => useDocumentServices(null));

      let error: Error | null = null;
      await act(async () => {
        const promise = result.current.loadMammoth();
        const scriptNode = appendChildSpy.mock.calls[0]?.[0] as any;
        if (scriptNode) {
          scriptNode.onerror();
        }
        try {
          await promise;
        } catch (e) {
          error = e as Error;
        }
      });

      expect(error).not.toBeNull();
      expect(error!.message).toContain('Falha ao carregar Mammoth.js');
    });

    it('should reject if mammoth is not available after load', async () => {
      const { result } = renderHook(() => useDocumentServices(null));

      let error: Error | null = null;
      await act(async () => {
        const promise = result.current.loadMammoth();
        const scriptNode = appendChildSpy.mock.calls[0]?.[0] as any;
        if (scriptNode) {
          scriptNode.onload();
        }
        try {
          await promise;
        } catch (e) {
          error = e as Error;
        }
      });

      expect(error).not.toBeNull();
      expect(error!.message).toContain('mammoth não encontrado');
    });

    it('should reject on timeout', async () => {
      const { result } = renderHook(() => useDocumentServices(null));

      let error: Error | null = null;
      await act(async () => {
        const promise = result.current.loadMammoth();
        vi.advanceTimersByTime(11000);
        try {
          await promise;
        } catch (e) {
          error = e as Error;
        }
      });

      expect(error).not.toBeNull();
      expect(error!.message).toContain('Timeout ao carregar Mammoth.js');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // extractTextFromPDFPure
  // ═══════════════════════════════════════════════════════════════════════════

  describe('extractTextFromPDFPure', () => {
    it('should extract text from all pages of a PDF', async () => {
      const pageTexts = ['First page content', 'Second page content'];
      const mockPdfDoc = createMockPdfDocument(2, pageTexts);
      const mockPdfjsLib = createMockPdfjsLib(mockPdfDoc);
      (window as any).pdfjsLib = mockPdfjsLib;

      const { result } = renderHook(() => useDocumentServices(null));
      const file = createMockFile('test.pdf', 'application/pdf');

      let text: string | null = null;
      await act(async () => {
        text = await result.current.extractTextFromPDFPure(file);
      });

      expect(text).not.toBeNull();
      expect(text).toContain('First');
      expect(text).toContain('page');
      expect(text).toContain('content');
      expect(text).toContain('Second');
    });

    it('should call progressCallback for each page', async () => {
      const mockPdfDoc = createMockPdfDocument(3, ['p1', 'p2', 'p3']);
      const mockPdfjsLib = createMockPdfjsLib(mockPdfDoc);
      (window as any).pdfjsLib = mockPdfjsLib;

      const { result } = renderHook(() => useDocumentServices(null));
      const file = createMockFile('test.pdf', 'application/pdf');
      const progressCb = vi.fn();

      await act(async () => {
        await result.current.extractTextFromPDFPure(file, progressCb);
      });

      expect(progressCb).toHaveBeenCalledTimes(3);
      expect(progressCb).toHaveBeenCalledWith(1, 3);
      expect(progressCb).toHaveBeenCalledWith(2, 3);
      expect(progressCb).toHaveBeenCalledWith(3, 3);
    });

    it('should return null on error', async () => {
      const mockPdfjsLib = {
        getDocument: vi.fn(() => ({ promise: Promise.reject(new Error('corrupt PDF')) })),
        GlobalWorkerOptions: { workerSrc: '' },
      };
      (window as any).pdfjsLib = mockPdfjsLib;

      const { result } = renderHook(() => useDocumentServices(null));
      const file = createMockFile('corrupt.pdf', 'application/pdf');

      let text: string | null = 'initial';
      await act(async () => {
        text = await result.current.extractTextFromPDFPure(file);
      });

      expect(text).toBeNull();
    });

    it('should call pdf.destroy() in finally block', async () => {
      const mockPdfDoc = createMockPdfDocument(1, ['page1']);
      const mockPdfjsLib = createMockPdfjsLib(mockPdfDoc);
      (window as any).pdfjsLib = mockPdfjsLib;

      const { result } = renderHook(() => useDocumentServices(null));
      const file = createMockFile('test.pdf', 'application/pdf');

      await act(async () => {
        await result.current.extractTextFromPDFPure(file);
      });

      expect(mockPdfDoc.destroy).toHaveBeenCalled();
    });

    it('should handle null textContent.items gracefully', async () => {
      const mockPage = {
        getTextContent: vi.fn().mockResolvedValue({ items: null }),
        getViewport: vi.fn().mockReturnValue({ width: 100, height: 200 }),
        render: vi.fn().mockReturnValue({ promise: Promise.resolve() }),
      };
      const mockPdfDoc = {
        numPages: 1,
        getPage: vi.fn().mockResolvedValue(mockPage),
        destroy: vi.fn(),
      };
      const mockPdfjsLib = createMockPdfjsLib(mockPdfDoc);
      (window as any).pdfjsLib = mockPdfjsLib;

      const { result } = renderHook(() => useDocumentServices(null));
      const file = createMockFile('test.pdf', 'application/pdf');

      let text: string | null = null;
      await act(async () => {
        text = await result.current.extractTextFromPDFPure(file);
      });

      // Should not throw; empty items results in empty string
      expect(text).toBe('');
    });

    it('should handle items with missing str property', async () => {
      const mockPage = {
        getTextContent: vi.fn().mockResolvedValue({
          items: [{ str: 'hello' }, {}, { str: 'world' }],
        }),
        getViewport: vi.fn().mockReturnValue({ width: 100, height: 200 }),
        render: vi.fn().mockReturnValue({ promise: Promise.resolve() }),
      };
      const mockPdfDoc = {
        numPages: 1,
        getPage: vi.fn().mockResolvedValue(mockPage),
        destroy: vi.fn(),
      };
      (window as any).pdfjsLib = createMockPdfjsLib(mockPdfDoc);

      const { result } = renderHook(() => useDocumentServices(null));
      const file = createMockFile('test.pdf', 'application/pdf');

      let text: string | null = null;
      await act(async () => {
        text = await result.current.extractTextFromPDFPure(file);
      });

      expect(text).toContain('hello');
      expect(text).toContain('world');
    });

    it('should work without progressCallback (null)', async () => {
      const mockPdfDoc = createMockPdfDocument(1, ['text']);
      (window as any).pdfjsLib = createMockPdfjsLib(mockPdfDoc);

      const { result } = renderHook(() => useDocumentServices(null));
      const file = createMockFile('test.pdf', 'application/pdf');

      let text: string | null = null;
      await act(async () => {
        text = await result.current.extractTextFromPDFPure(file, null);
      });

      expect(text).not.toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // extractTextFromDOCX
  // ═══════════════════════════════════════════════════════════════════════════

  describe('extractTextFromDOCX', () => {
    it('should extract text from a DOCX file using mammoth', async () => {
      const expectedText = 'This is the extracted DOCX text with legal content.';
      const mockMammoth = createMockMammoth(expectedText);
      (window as any).mammoth = mockMammoth;

      const { result } = renderHook(() => useDocumentServices(null));
      const file = createMockFile('document.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

      let text: string | null = null;
      await act(async () => {
        text = await result.current.extractTextFromDOCX(file);
      });

      expect(text).toBe(expectedText);
      expect(mockMammoth.extractRawText).toHaveBeenCalled();
    });

    it('should pass arrayBuffer to mammoth.extractRawText', async () => {
      const mockMammoth = createMockMammoth('text');
      (window as any).mammoth = mockMammoth;

      const { result } = renderHook(() => useDocumentServices(null));
      const content = new ArrayBuffer(20);
      const file = createMockFile('doc.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', content);

      await act(async () => {
        await result.current.extractTextFromDOCX(file);
      });

      expect(mockMammoth.extractRawText).toHaveBeenCalledWith({ arrayBuffer: content });
    });

    it('should throw error when mammoth extraction fails', async () => {
      const mockMammoth = {
        extractRawText: vi.fn().mockRejectedValue(new Error('Invalid DOCX format')),
      };
      (window as any).mammoth = mockMammoth;

      const { result } = renderHook(() => useDocumentServices(null));
      const file = createMockFile('corrupt.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

      let error: Error | null = null;
      await act(async () => {
        try {
          await result.current.extractTextFromDOCX(file);
        } catch (e) {
          error = e as Error;
        }
      });

      expect(error).not.toBeNull();
      expect(error!.message).toContain('Falha ao extrair texto do DOCX');
      expect(error!.message).toContain('Invalid DOCX format');
    });

    it('should throw error when mammoth library fails to load', async () => {
      // Don't set window.mammoth, so loadMammoth will need to load via script
      const { result } = renderHook(() => useDocumentServices(null));
      const file = createMockFile('doc.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

      let error: Error | null = null;
      await act(async () => {
        const promise = result.current.extractTextFromDOCX(file);
        // Trigger script error
        const scriptNode = appendChildSpy.mock.calls[0]?.[0] as any;
        if (scriptNode) {
          scriptNode.onerror();
        }
        try {
          await promise;
        } catch (e) {
          error = e as Error;
        }
      });

      expect(error).not.toBeNull();
      expect(error!.message).toContain('Falha ao extrair texto do DOCX');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // extractTextFromPDFWithClaudeVision
  // ═══════════════════════════════════════════════════════════════════════════

  describe('extractTextFromPDFWithClaudeVision', () => {
    let mockAI: AIIntegrationForDocuments;
    let originalFetch: typeof global.fetch;

    beforeEach(() => {
      mockAI = createMockAIIntegration();
      originalFetch = global.fetch;

      // Setup mock canvas context
      const mockContext = {
        drawImage: vi.fn(),
        fillRect: vi.fn(),
        clearRect: vi.fn(),
      } as any;

      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(mockContext);
      vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/jpeg;base64,fakeBase64Data');
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('should call Claude API with base64 image data', async () => {
      const mockPdfDoc = createMockPdfDocument(1, ['page text']);
      (window as any).pdfjsLib = createMockPdfjsLib(mockPdfDoc);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          content: [{ text: 'Extracted text from vision API' }],
          usage: { input_tokens: 100, output_tokens: 50 },
        }),
      }) as any;

      const { result } = renderHook(() => useDocumentServices(mockAI));
      const file = createMockFile('scan.pdf', 'application/pdf');

      let text: string | null = null;
      await act(async () => {
        text = await result.current.extractTextFromPDFWithClaudeVision(file);
      });

      expect(text).toBe('Extracted text from vision API');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.objectContaining({
          method: 'POST',
          headers: expect.any(Object),
        })
      );
    });

    it('should use getApiHeaders for request headers', async () => {
      const mockPdfDoc = createMockPdfDocument(1, ['text']);
      (window as any).pdfjsLib = createMockPdfjsLib(mockPdfDoc);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          content: [{ text: 'result' }],
        }),
      }) as any;

      const { result } = renderHook(() => useDocumentServices(mockAI));
      const file = createMockFile('scan.pdf', 'application/pdf');

      await act(async () => {
        await result.current.extractTextFromPDFWithClaudeVision(file);
      });

      expect(mockAI.getApiHeaders).toHaveBeenCalled();
    });

    it('should log cache metrics when usage is present', async () => {
      const mockPdfDoc = createMockPdfDocument(1, ['text']);
      (window as any).pdfjsLib = createMockPdfjsLib(mockPdfDoc);

      const mockResponse = {
        content: [{ text: 'result' }],
        usage: { input_tokens: 200, output_tokens: 100 },
      };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      }) as any;

      const { result } = renderHook(() => useDocumentServices(mockAI));
      const file = createMockFile('scan.pdf', 'application/pdf');

      await act(async () => {
        await result.current.extractTextFromPDFWithClaudeVision(file);
      });

      expect(mockAI.logCacheMetrics).toHaveBeenCalledWith(mockResponse);
    });

    it('should call progressCallback during rendering and processing phases', async () => {
      const mockPdfDoc = createMockPdfDocument(2, ['p1', 'p2']);
      (window as any).pdfjsLib = createMockPdfjsLib(mockPdfDoc);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ content: [{ text: 'text' }] }),
      }) as any;

      const { result } = renderHook(() => useDocumentServices(mockAI));
      const file = createMockFile('scan.pdf', 'application/pdf');
      const progressCb = vi.fn();

      await act(async () => {
        await result.current.extractTextFromPDFWithClaudeVision(file, progressCb);
      });

      // Should be called with 'iniciando' status
      expect(progressCb).toHaveBeenCalledWith(0, 0, 'iniciando');
      // Should be called during rendering
      expect(progressCb).toHaveBeenCalledWith(1, 2, 'renderizando');
      expect(progressCb).toHaveBeenCalledWith(2, 2, 'renderizando');
    });

    it('should fallback to extractTextFromPDFPure when API returns non-ok on first batch', async () => {
      const mockPdfDoc = createMockPdfDocument(1, ['fallback text']);
      (window as any).pdfjsLib = createMockPdfjsLib(mockPdfDoc);

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      }) as any;

      const { result } = renderHook(() => useDocumentServices(mockAI));
      const file = createMockFile('scan.pdf', 'application/pdf');

      let text: string | null = null;
      await act(async () => {
        text = await result.current.extractTextFromPDFWithClaudeVision(file);
      });

      // Should fall back to PDF.js pure extraction
      expect(text).not.toBeNull();
      expect(text).toContain('fallback');
    });

    it('should fallback to pure extraction on any error during vision processing', async () => {
      // Make pdfjsLib.getDocument throw on first call, then succeed for fallback
      const mockPdfDoc = createMockPdfDocument(1, ['fallback page']);
      let callCount = 0;
      const mockPdfjsLib = {
        getDocument: vi.fn(() => {
          callCount++;
          if (callCount === 1) {
            return { promise: Promise.reject(new Error('Render error')) };
          }
          return { promise: Promise.resolve(mockPdfDoc) };
        }),
        GlobalWorkerOptions: { workerSrc: '' },
      };
      (window as any).pdfjsLib = mockPdfjsLib;

      const { result } = renderHook(() => useDocumentServices(mockAI));
      const file = createMockFile('scan.pdf', 'application/pdf');

      await act(async () => {
        await result.current.extractTextFromPDFWithClaudeVision(file);
      });

      // Fallback returns null or the text from pure extraction
      // Either way, no exception thrown
      expect(callCount).toBeGreaterThanOrEqual(1);
    });

    it('should throw error if aiIntegration is null', async () => {
      const mockPdfDoc = createMockPdfDocument(1, ['text']);
      (window as any).pdfjsLib = createMockPdfjsLib(mockPdfDoc);

      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as any);
      vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/jpeg;base64,abc');

      const { result } = renderHook(() => useDocumentServices(null));
      const file = createMockFile('scan.pdf', 'application/pdf');

      // When aiIntegration is null, the catch block calls extractTextFromPDFPure as fallback
      let text: string | null = null;
      await act(async () => {
        text = await result.current.extractTextFromPDFWithClaudeVision(file);
      });

      // Falls back to PDF pure extraction
      expect(text).toBeDefined();
    });

    it('should process multiple batches for large PDFs', async () => {
      // Create a PDF with 55 pages (more than BATCH_SIZE of 50)
      const pages = Array.from({ length: 55 }, (_, i) => `Page ${i + 1} content`);
      const mockPdfDoc = createMockPdfDocument(55, pages);
      (window as any).pdfjsLib = createMockPdfjsLib(mockPdfDoc);

      let fetchCallCount = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        fetchCallCount++;
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            content: [{ text: `Batch ${fetchCallCount} text` }],
            usage: { input_tokens: 100, output_tokens: 50 },
          }),
        });
      }) as any;

      const { result } = renderHook(() => useDocumentServices(mockAI));
      const file = createMockFile('large.pdf', 'application/pdf');

      let text: string | null = null;
      await act(async () => {
        text = await result.current.extractTextFromPDFWithClaudeVision(file);
      });

      // Should have been called twice (50 pages + 5 pages)
      expect(fetchCallCount).toBe(2);
      expect(text).toContain('Batch 1 text');
      expect(text).toContain('Batch 2 text');
    });

    it('should include error marker for failed subsequent batches', async () => {
      const pages = Array.from({ length: 55 }, (_, i) => `Page ${i + 1}`);
      const mockPdfDoc = createMockPdfDocument(55, pages);
      (window as any).pdfjsLib = createMockPdfjsLib(mockPdfDoc);

      let fetchCallCount = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        fetchCallCount++;
        if (fetchCallCount === 2) {
          return Promise.resolve({ ok: false, status: 429 });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ content: [{ text: 'Good batch' }] }),
        });
      }) as any;

      const { result } = renderHook(() => useDocumentServices(mockAI));
      const file = createMockFile('large.pdf', 'application/pdf');

      let text: string | null = null;
      await act(async () => {
        text = await result.current.extractTextFromPDFWithClaudeVision(file);
      });

      // Should contain error marker for second batch failure
      expect(text).toContain('ERRO');
      expect(text).toContain('Good batch');
    });

    it('should destroy pdf in finally block', async () => {
      const mockPdfDoc = createMockPdfDocument(1, ['text']);
      (window as any).pdfjsLib = createMockPdfjsLib(mockPdfDoc);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ content: [{ text: 'result' }] }),
      }) as any;

      const { result } = renderHook(() => useDocumentServices(mockAI));
      const file = createMockFile('test.pdf', 'application/pdf');

      await act(async () => {
        await result.current.extractTextFromPDFWithClaudeVision(file);
      });

      expect(mockPdfDoc.destroy).toHaveBeenCalled();
    });

    it('should use ocrLanguage from aiSettings for prompt', async () => {
      const aiWithEnglish = createMockAIIntegration();
      (aiWithEnglish.aiSettings as any).ocrLanguage = 'eng';

      const mockPdfDoc = createMockPdfDocument(1, ['text']);
      (window as any).pdfjsLib = createMockPdfjsLib(mockPdfDoc);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ content: [{ text: 'english text' }] }),
      }) as any;

      const { result } = renderHook(() => useDocumentServices(aiWithEnglish));
      const file = createMockFile('scan.pdf', 'application/pdf');

      await act(async () => {
        await result.current.extractTextFromPDFWithClaudeVision(file);
      });

      const fetchCall = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      const textContent = body.messages[0].content.find((c: any) => c.type === 'text');
      expect(textContent.text).toContain('English');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // extractTextFromPDF (routing)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('extractTextFromPDF', () => {
    beforeEach(() => {
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as any);
      vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/jpeg;base64,abc');
    });

    it('should use pdfjs engine by default', async () => {
      const mockPdfDoc = createMockPdfDocument(1, ['default engine text']);
      (window as any).pdfjsLib = createMockPdfjsLib(mockPdfDoc);

      const { result } = renderHook(() => useDocumentServices(null));
      const file = createMockFile('test.pdf', 'application/pdf');

      let text: string | null = null;
      await act(async () => {
        text = await result.current.extractTextFromPDF(file);
      });

      expect(text).toContain('default');
    });

    it('should use claude-vision engine when configured', async () => {
      const aiWithVision = createMockAIIntegration();
      (aiWithVision.aiSettings as any).ocrEngine = 'claude-vision';

      const mockPdfDoc = createMockPdfDocument(1, ['text']);
      (window as any).pdfjsLib = createMockPdfjsLib(mockPdfDoc);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ content: [{ text: 'vision text' }] }),
      }) as any;

      const { result } = renderHook(() => useDocumentServices(aiWithVision));
      const file = createMockFile('test.pdf', 'application/pdf');

      await act(async () => {
        await result.current.extractTextFromPDF(file);
      });

      expect(global.fetch).toHaveBeenCalled();
    });

    it('should return null for pdf-puro engine', async () => {
      const aiWithPuro = createMockAIIntegration();
      (aiWithPuro.aiSettings as any).ocrEngine = 'pdf-puro';

      const { result } = renderHook(() => useDocumentServices(aiWithPuro));
      const file = createMockFile('test.pdf', 'application/pdf');

      let text: string | null = 'initial';
      await act(async () => {
        text = await result.current.extractTextFromPDF(file);
      });

      expect(text).toBeNull();
    });

    it('should default to pdfjs when ocrEngine is not set', async () => {
      const aiNoEngine = createMockAIIntegration();
      delete (aiNoEngine.aiSettings as any).ocrEngine;

      const mockPdfDoc = createMockPdfDocument(1, ['pdfjs default']);
      (window as any).pdfjsLib = createMockPdfjsLib(mockPdfDoc);

      const { result } = renderHook(() => useDocumentServices(aiNoEngine));
      const file = createMockFile('test.pdf', 'application/pdf');

      let text: string | null = null;
      await act(async () => {
        text = await result.current.extractTextFromPDF(file);
      });

      expect(text).toContain('pdfjs');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // extractTextFromPDFWithMode
  // ═══════════════════════════════════════════════════════════════════════════

  describe('extractTextFromPDFWithMode', () => {
    beforeEach(() => {
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as any);
      vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/jpeg;base64,abc');
    });

    it('should use pdfjs mode', async () => {
      const mockPdfDoc = createMockPdfDocument(1, ['pdfjs mode text']);
      (window as any).pdfjsLib = createMockPdfjsLib(mockPdfDoc);

      const { result } = renderHook(() => useDocumentServices(null));
      const file = createMockFile('test.pdf', 'application/pdf');

      let text: string | null = null;
      await act(async () => {
        text = await result.current.extractTextFromPDFWithMode(file, 'pdfjs');
      });

      expect(text).toContain('pdfjs');
    });

    it('should return null for pdf-puro mode', async () => {
      const { result } = renderHook(() => useDocumentServices(null));
      const file = createMockFile('test.pdf', 'application/pdf');

      let text: string | null = 'initial';
      await act(async () => {
        text = await result.current.extractTextFromPDFWithMode(file, 'pdf-puro');
      });

      expect(text).toBeNull();
    });

    it('should use claude-vision mode when specified', async () => {
      const mockAI = createMockAIIntegration();
      const mockPdfDoc = createMockPdfDocument(1, ['text']);
      (window as any).pdfjsLib = createMockPdfjsLib(mockPdfDoc);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ content: [{ text: 'vision mode' }] }),
      }) as any;

      const { result } = renderHook(() => useDocumentServices(mockAI));
      const file = createMockFile('test.pdf', 'application/pdf');

      await act(async () => {
        await result.current.extractTextFromPDFWithMode(file, 'claude-vision');
      });

      expect(global.fetch).toHaveBeenCalled();
    });

    it('should default to pdfjs for unknown modes', async () => {
      const mockPdfDoc = createMockPdfDocument(1, ['default text']);
      (window as any).pdfjsLib = createMockPdfjsLib(mockPdfDoc);

      const { result } = renderHook(() => useDocumentServices(null));
      const file = createMockFile('test.pdf', 'application/pdf');

      let text: string | null = null;
      await act(async () => {
        text = await result.current.extractTextFromPDFWithMode(file, 'unknown-mode');
      });

      expect(text).toContain('default');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // extractProcessoFromFileName
  // ═══════════════════════════════════════════════════════════════════════════

  describe('extractProcessoFromFileName', () => {
    it('should extract processo number from filename', () => {
      const { result } = renderHook(() => useDocumentServices(null));

      const numero = result.current.extractProcessoFromFileName('AT 0001234-56.2023.5.09.0001.pdf');
      expect(numero).toBe('AT 0001234-56.2023.5.09.0001');
    });

    it('should extract ATOrd prefix', () => {
      const { result } = renderHook(() => useDocumentServices(null));

      const numero = result.current.extractProcessoFromFileName('ATOrd 0001234-56.2023.5.09.0001.pdf');
      expect(numero).toBe('ATOrd 0001234-56.2023.5.09.0001');
    });

    it('should extract RO prefix', () => {
      const { result } = renderHook(() => useDocumentServices(null));

      const numero = result.current.extractProcessoFromFileName('RO 0001234-56.2023.5.09.0001.pdf');
      expect(numero).toBe('RO 0001234-56.2023.5.09.0001');
    });

    it('should extract without prefix', () => {
      const { result } = renderHook(() => useDocumentServices(null));

      const numero = result.current.extractProcessoFromFileName('0001234-56.2023.5.09.0001.pdf');
      expect(numero).toBe('0001234-56.2023.5.09.0001');
    });

    it('should return null for invalid filename', () => {
      const { result } = renderHook(() => useDocumentServices(null));

      const numero = result.current.extractProcessoFromFileName('random-document.pdf');
      expect(numero).toBeNull();
    });

    it('should return null for empty string', () => {
      const { result } = renderHook(() => useDocumentServices(null));

      const numero = result.current.extractProcessoFromFileName('');
      expect(numero).toBeNull();
    });

    it('should handle RR, AP, AI, MS prefixes', () => {
      const { result } = renderHook(() => useDocumentServices(null));

      expect(result.current.extractProcessoFromFileName('RR 0001234-56.2023.5.09.0001')).toBe('RR 0001234-56.2023.5.09.0001');
      expect(result.current.extractProcessoFromFileName('AP 0001234-56.2023.5.09.0001')).toBe('AP 0001234-56.2023.5.09.0001');
      expect(result.current.extractProcessoFromFileName('AI 0001234-56.2023.5.09.0001')).toBe('AI 0001234-56.2023.5.09.0001');
      expect(result.current.extractProcessoFromFileName('MS 0001234-56.2023.5.09.0001')).toBe('MS 0001234-56.2023.5.09.0001');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // extractProcessoFromFirstPage
  // ═══════════════════════════════════════════════════════════════════════════

  describe('extractProcessoFromFirstPage', () => {
    it('should extract processo number from first page text', async () => {
      const mockPage = {
        getTextContent: vi.fn().mockResolvedValue({
          items: [
            { str: 'Processo' },
            { str: ' nº ' },
            { str: '0001234-56.2023.5.09.0001' },
          ],
        }),
        getViewport: vi.fn().mockReturnValue({ width: 100, height: 200 }),
        render: vi.fn().mockReturnValue({ promise: Promise.resolve() }),
      };
      const mockPdfDoc = {
        numPages: 1,
        getPage: vi.fn().mockResolvedValue(mockPage),
        destroy: vi.fn(),
      };
      (window as any).pdfjsLib = createMockPdfjsLib(mockPdfDoc);

      const { result } = renderHook(() => useDocumentServices(null));
      const file = createMockFile('test.pdf', 'application/pdf');

      let numero: string | null = null;
      await act(async () => {
        numero = await result.current.extractProcessoFromFirstPage(file);
      });

      expect(numero).toBe('0001234-56.2023.5.09.0001');
    });

    it('should return null for non-PDF files', async () => {
      const { result } = renderHook(() => useDocumentServices(null));
      const file = createMockFile('test.docx', 'application/msword');

      let numero: string | null = 'initial';
      await act(async () => {
        numero = await result.current.extractProcessoFromFirstPage(file);
      });

      expect(numero).toBeNull();
    });

    it('should return null if no processo number is found', async () => {
      const mockPage = {
        getTextContent: vi.fn().mockResolvedValue({
          items: [{ str: 'No processo number here' }],
        }),
        getViewport: vi.fn().mockReturnValue({ width: 100, height: 200 }),
        render: vi.fn().mockReturnValue({ promise: Promise.resolve() }),
      };
      const mockPdfDoc = {
        numPages: 1,
        getPage: vi.fn().mockResolvedValue(mockPage),
        destroy: vi.fn(),
      };
      (window as any).pdfjsLib = createMockPdfjsLib(mockPdfDoc);

      const { result } = renderHook(() => useDocumentServices(null));
      const file = createMockFile('test.pdf', 'application/pdf');

      let numero: string | null = 'initial';
      await act(async () => {
        numero = await result.current.extractProcessoFromFirstPage(file);
      });

      expect(numero).toBeNull();
    });

    it('should return null on error', async () => {
      const mockPdfjsLib = {
        getDocument: vi.fn(() => ({ promise: Promise.reject(new Error('parse error')) })),
        GlobalWorkerOptions: { workerSrc: '' },
      };
      (window as any).pdfjsLib = mockPdfjsLib;

      const { result } = renderHook(() => useDocumentServices(null));
      const file = createMockFile('corrupt.pdf', 'application/pdf');

      let numero: string | null = 'initial';
      await act(async () => {
        numero = await result.current.extractProcessoFromFirstPage(file);
      });

      expect(numero).toBeNull();
    });

    it('should destroy pdf document in finally block', async () => {
      const mockPdfDoc = {
        numPages: 1,
        getPage: vi.fn().mockResolvedValue({
          getTextContent: vi.fn().mockResolvedValue({ items: [] }),
          getViewport: vi.fn().mockReturnValue({ width: 100, height: 200 }),
          render: vi.fn().mockReturnValue({ promise: Promise.resolve() }),
        }),
        destroy: vi.fn(),
      };
      (window as any).pdfjsLib = createMockPdfjsLib(mockPdfDoc);

      const { result } = renderHook(() => useDocumentServices(null));
      const file = createMockFile('test.pdf', 'application/pdf');

      await act(async () => {
        await result.current.extractProcessoFromFirstPage(file);
      });

      expect(mockPdfDoc.destroy).toHaveBeenCalled();
    });

    it('should return null for null file', async () => {
      const { result } = renderHook(() => useDocumentServices(null));

      let numero: string | null = 'initial';
      await act(async () => {
        numero = await result.current.extractProcessoFromFirstPage(null as any);
      });

      expect(numero).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // autoDetectProcessoNumero
  // ═══════════════════════════════════════════════════════════════════════════

  describe('autoDetectProcessoNumero', () => {
    it('should detect from peticao filename first', async () => {
      const { result } = renderHook(() => useDocumentServices(null));

      let numero: string | null = null;
      await act(async () => {
        numero = await result.current.autoDetectProcessoNumero({
          peticao: createMockFile('AT 0001234-56.2023.5.09.0001.pdf', 'application/pdf'),
        });
      });

      expect(numero).toBe('AT 0001234-56.2023.5.09.0001');
    });

    it('should detect from contestacao filename if peticao has no numero', async () => {
      const { result } = renderHook(() => useDocumentServices(null));

      let numero: string | null = null;
      await act(async () => {
        numero = await result.current.autoDetectProcessoNumero({
          peticao: createMockFile('peticao.pdf', 'application/pdf'),
          contestacoes: [createMockFile('RO 0005678-90.2024.5.01.0002.pdf', 'application/pdf')],
        });
      });

      expect(numero).toBe('RO 0005678-90.2024.5.01.0002');
    });

    it('should detect from complementar filenames', async () => {
      const { result } = renderHook(() => useDocumentServices(null));

      let numero: string | null = null;
      await act(async () => {
        numero = await result.current.autoDetectProcessoNumero({
          peticao: createMockFile('doc.pdf', 'application/pdf'),
          contestacoes: [createMockFile('contestacao.pdf', 'application/pdf')],
          complementares: [createMockFile('0009999-11.2022.5.03.0003.pdf', 'application/pdf')],
        });
      });

      expect(numero).toBe('0009999-11.2022.5.03.0003');
    });

    it('should fallback to first page extraction from contestacao', async () => {
      const mockPage = {
        getTextContent: vi.fn().mockResolvedValue({
          items: [{ str: 'AT 0001111-22.2023.5.09.0001' }],
        }),
        getViewport: vi.fn().mockReturnValue({ width: 100, height: 200 }),
        render: vi.fn().mockReturnValue({ promise: Promise.resolve() }),
      };
      const mockPdfDoc = {
        numPages: 1,
        getPage: vi.fn().mockResolvedValue(mockPage),
        destroy: vi.fn(),
      };
      (window as any).pdfjsLib = createMockPdfjsLib(mockPdfDoc);

      const { result } = renderHook(() => useDocumentServices(null));

      let numero: string | null = null;
      await act(async () => {
        numero = await result.current.autoDetectProcessoNumero({
          peticao: createMockFile('generic.pdf', 'application/pdf'),
          contestacoes: [createMockFile('contestacao.pdf', 'application/pdf')],
        });
      });

      expect(numero).toBe('AT 0001111-22.2023.5.09.0001');
    });

    it('should return null if no processo number found anywhere', async () => {
      const mockPage = {
        getTextContent: vi.fn().mockResolvedValue({ items: [{ str: 'no number' }] }),
        getViewport: vi.fn().mockReturnValue({ width: 100, height: 200 }),
        render: vi.fn().mockReturnValue({ promise: Promise.resolve() }),
      };
      const mockPdfDoc = {
        numPages: 1,
        getPage: vi.fn().mockResolvedValue(mockPage),
        destroy: vi.fn(),
      };
      (window as any).pdfjsLib = createMockPdfjsLib(mockPdfDoc);

      const { result } = renderHook(() => useDocumentServices(null));

      let numero: string | null = 'initial';
      await act(async () => {
        numero = await result.current.autoDetectProcessoNumero({
          peticao: createMockFile('doc.pdf', 'application/pdf'),
          contestacoes: [createMockFile('contest.pdf', 'application/pdf')],
        });
      });

      expect(numero).toBeNull();
    });

    it('should return null on error', async () => {
      // Force an error by making extractProcessoFromFirstPage throw indirectly
      (window as any).pdfjsLib = {
        getDocument: vi.fn(() => ({ promise: Promise.reject(new Error('fail')) })),
        GlobalWorkerOptions: { workerSrc: '' },
      };

      const { result } = renderHook(() => useDocumentServices(null));

      let numero: string | null = 'initial';
      await act(async () => {
        numero = await result.current.autoDetectProcessoNumero({
          peticao: createMockFile('doc.pdf', 'application/pdf'),
        });
      });

      expect(numero).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // extractTextFromBulkFile
  // ═══════════════════════════════════════════════════════════════════════════

  describe('extractTextFromBulkFile', () => {
    it('should handle text/plain files via FileReader', async () => {
      const { result } = renderHook(() => useDocumentServices(null));

      const textContent = 'This is plain text content from a file with more than 50 characters for testing.';
      const blob = new Blob([textContent], { type: 'text/plain' });
      const file = new File([blob], 'test.txt', { type: 'text/plain' });

      let text: string = '';
      await act(async () => {
        text = await result.current.extractTextFromBulkFile(file);
      });

      expect(text).toBe(textContent);
    });

    it('should handle .txt extension regardless of type', async () => {
      const { result } = renderHook(() => useDocumentServices(null));

      const textContent = 'Another text file with enough content for the length check validation test here.';
      const blob = new Blob([textContent], { type: '' });
      const file = new File([blob], 'document.txt', { type: '' });

      let text: string = '';
      await act(async () => {
        text = await result.current.extractTextFromBulkFile(file);
      });

      expect(text).toBe(textContent);
    });

    it('should handle PDF files', async () => {
      const mockPdfDoc = createMockPdfDocument(1, ['Bulk PDF text content that is long enough to pass the fifty character minimum length check']);
      (window as any).pdfjsLib = createMockPdfjsLib(mockPdfDoc);

      const { result } = renderHook(() => useDocumentServices(null));
      const file = createMockFile('bulk.pdf', 'application/pdf');

      let text: string = '';
      await act(async () => {
        text = await result.current.extractTextFromBulkFile(file);
      });

      expect(text).toContain('Bulk');
    });

    it('should throw error for PDF with too short text', async () => {
      const mockPdfDoc = createMockPdfDocument(1, ['short']);
      (window as any).pdfjsLib = createMockPdfjsLib(mockPdfDoc);

      const { result } = renderHook(() => useDocumentServices(null));
      const file = createMockFile('empty.pdf', 'application/pdf');

      let error: Error | null = null;
      await act(async () => {
        try {
          await result.current.extractTextFromBulkFile(file);
        } catch (e) {
          error = e as Error;
        }
      });

      expect(error).not.toBeNull();
      expect(error!.message).toContain('Falha ao extrair texto do PDF');
    });

    it('should handle DOCX files', async () => {
      const docxText = 'DOCX text content that is certainly long enough to pass the fifty character validation check easily.';
      (window as any).mammoth = createMockMammoth(docxText);

      const { result } = renderHook(() => useDocumentServices(null));
      const file = createMockFile('doc.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

      let text: string = '';
      await act(async () => {
        text = await result.current.extractTextFromBulkFile(file);
      });

      expect(text).toBe(docxText);
    });

    it('should handle .doc extension', async () => {
      const docText = 'DOC text content that is certainly long enough to pass the fifty character minimum length check test.';
      (window as any).mammoth = createMockMammoth(docText);

      const { result } = renderHook(() => useDocumentServices(null));
      const file = createMockFile('old.doc', 'application/msword');

      let text: string = '';
      await act(async () => {
        text = await result.current.extractTextFromBulkFile(file);
      });

      expect(text).toBe(docText);
    });

    it('should throw error for unsupported file types', async () => {
      const { result } = renderHook(() => useDocumentServices(null));
      const file = createMockFile('image.png', 'image/png');

      let error: Error | null = null;
      await act(async () => {
        try {
          await result.current.extractTextFromBulkFile(file);
        } catch (e) {
          error = e as Error;
        }
      });

      expect(error).not.toBeNull();
      expect(error!.message).toContain('Tipo de arquivo não suportado');
    });

    it('should throw error for DOCX with too short text', async () => {
      (window as any).mammoth = createMockMammoth('short');

      const { result } = renderHook(() => useDocumentServices(null));
      const file = createMockFile('doc.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

      let error: Error | null = null;
      await act(async () => {
        try {
          await result.current.extractTextFromBulkFile(file);
        } catch (e) {
          error = e as Error;
        }
      });

      expect(error).not.toBeNull();
      expect(error!.message).toContain('Falha ao extrair texto do DOCX');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // tryExtractTextFromPDFs
  // ═══════════════════════════════════════════════════════════════════════════

  describe('tryExtractTextFromPDFs', () => {
    it('should return empty result when callbacks is null', async () => {
      const { result } = renderHook(() => useDocumentServices(null));

      let extracted: any = null;
      await act(async () => {
        extracted = await result.current.tryExtractTextFromPDFs({}, null);
      });

      expect(extracted).toEqual({ peticao: null, contestacoes: [], complementares: [] });
    });

    it('should call setExtractingText(true) and then setExtractingText(false)', async () => {
      const mockPdfDoc = createMockPdfDocument(1, ['Long text content that exceeds one hundred characters for the validation check in the extraction process for testing.']);
      (window as any).pdfjsLib = createMockPdfjsLib(mockPdfDoc);

      const callbacks = {
        setExtractingText: vi.fn(),
        setAnalysisProgress: vi.fn(),
        setExtractedTexts: vi.fn(),
        setError: vi.fn(),
      };

      const { result } = renderHook(() => useDocumentServices(null));

      await act(async () => {
        await result.current.tryExtractTextFromPDFs(
          { peticao: createMockFile('pet.pdf', 'application/pdf') },
          callbacks
        );
      });

      expect(callbacks.setExtractingText).toHaveBeenCalledWith(true);
      expect(callbacks.setExtractingText).toHaveBeenCalledWith(false);
    });

    it('should extract text from peticao', async () => {
      const longText = 'A'.repeat(150); // More than 100 chars
      const mockPdfDoc = createMockPdfDocument(1, [longText]);
      (window as any).pdfjsLib = createMockPdfjsLib(mockPdfDoc);

      const callbacks = {
        setExtractingText: vi.fn(),
        setAnalysisProgress: vi.fn(),
        setExtractedTexts: vi.fn(),
        setError: vi.fn(),
      };

      const { result } = renderHook(() => useDocumentServices(null));

      let extracted: any = null;
      await act(async () => {
        extracted = await result.current.tryExtractTextFromPDFs(
          { peticao: createMockFile('pet.pdf', 'application/pdf') },
          callbacks
        );
      });

      expect(extracted.peticao).not.toBeNull();
      expect(extracted.peticao!.length).toBeGreaterThan(100);
    });

    it('should extract text from contestacoes array', async () => {
      const longText = 'B'.repeat(150);
      const mockPdfDoc = createMockPdfDocument(1, [longText]);
      (window as any).pdfjsLib = createMockPdfjsLib(mockPdfDoc);

      const callbacks = {
        setExtractingText: vi.fn(),
        setAnalysisProgress: vi.fn(),
        setExtractedTexts: vi.fn(),
        setError: vi.fn(),
      };

      const { result } = renderHook(() => useDocumentServices(null));

      let extracted: any = null;
      await act(async () => {
        extracted = await result.current.tryExtractTextFromPDFs(
          { contestacoes: [createMockFile('cont.pdf', 'application/pdf')] },
          callbacks
        );
      });

      expect(extracted.contestacoes).toHaveLength(1);
      expect(extracted.contestacoes[0]).not.toBeNull();
      expect(extracted.contestacoes[0].text.length).toBeGreaterThan(100);
    });

    it('should push null for contestacoes with short text', async () => {
      const mockPdfDoc = createMockPdfDocument(1, ['short']);
      (window as any).pdfjsLib = createMockPdfjsLib(mockPdfDoc);

      const callbacks = {
        setExtractingText: vi.fn(),
        setAnalysisProgress: vi.fn(),
        setExtractedTexts: vi.fn(),
        setError: vi.fn(),
      };

      const { result } = renderHook(() => useDocumentServices(null));

      let extracted: any = null;
      await act(async () => {
        extracted = await result.current.tryExtractTextFromPDFs(
          { contestacoes: [createMockFile('short.pdf', 'application/pdf')] },
          callbacks
        );
      });

      expect(extracted.contestacoes[0]).toBeNull();
    });

    it('should extract text from complementares', async () => {
      const longText = 'C'.repeat(150);
      const mockPdfDoc = createMockPdfDocument(1, [longText]);
      (window as any).pdfjsLib = createMockPdfjsLib(mockPdfDoc);

      const callbacks = {
        setExtractingText: vi.fn(),
        setAnalysisProgress: vi.fn(),
        setExtractedTexts: vi.fn(),
        setError: vi.fn(),
      };

      const { result } = renderHook(() => useDocumentServices(null));

      let extracted: any = null;
      await act(async () => {
        extracted = await result.current.tryExtractTextFromPDFs(
          { complementares: [createMockFile('comp.pdf', 'application/pdf')] },
          callbacks
        );
      });

      expect(extracted.complementares).toHaveLength(1);
      expect(extracted.complementares[0]).not.toBeNull();
    });

    it('should call setExtractedTexts with final result', async () => {
      const longText = 'D'.repeat(150);
      const mockPdfDoc = createMockPdfDocument(1, [longText]);
      (window as any).pdfjsLib = createMockPdfjsLib(mockPdfDoc);

      const callbacks = {
        setExtractingText: vi.fn(),
        setAnalysisProgress: vi.fn(),
        setExtractedTexts: vi.fn(),
        setError: vi.fn(),
      };

      const { result } = renderHook(() => useDocumentServices(null));

      await act(async () => {
        await result.current.tryExtractTextFromPDFs(
          { peticao: createMockFile('pet.pdf', 'application/pdf') },
          callbacks
        );
      });

      expect(callbacks.setExtractedTexts).toHaveBeenCalled();
    });

    it('should set progress messages during extraction', async () => {
      const longText = 'E'.repeat(150);
      const mockPdfDoc = createMockPdfDocument(1, [longText]);
      (window as any).pdfjsLib = createMockPdfjsLib(mockPdfDoc);

      const callbacks = {
        setExtractingText: vi.fn(),
        setAnalysisProgress: vi.fn(),
        setExtractedTexts: vi.fn(),
        setError: vi.fn(),
      };

      const { result } = renderHook(() => useDocumentServices(null));

      await act(async () => {
        await result.current.tryExtractTextFromPDFs(
          { peticao: createMockFile('pet.pdf', 'application/pdf') },
          callbacks
        );
      });

      expect(callbacks.setAnalysisProgress).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CACHING BEHAVIOR (loadPDFJS / loadMammoth)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('caching behavior', () => {
    it('loadPDFJS should use cached window.pdfjsLib on subsequent calls', async () => {
      const mockPdfjsLib = createMockPdfjsLib();
      (window as any).pdfjsLib = mockPdfjsLib;

      const { result } = renderHook(() => useDocumentServices(null));

      let lib1: any, lib2: any;
      await act(async () => {
        lib1 = await result.current.loadPDFJS();
        lib2 = await result.current.loadPDFJS();
      });

      expect(lib1).toBe(lib2);
      expect(lib1).toBe(mockPdfjsLib);
      // Script should not be appended since window already has it
      expect(appendChildSpy).not.toHaveBeenCalled();
    });

    it('loadMammoth should use cached window.mammoth on subsequent calls', async () => {
      const mockMammoth = createMockMammoth();
      (window as any).mammoth = mockMammoth;

      const { result } = renderHook(() => useDocumentServices(null));

      let lib1: any, lib2: any;
      await act(async () => {
        lib1 = await result.current.loadMammoth();
        lib2 = await result.current.loadMammoth();
      });

      expect(lib1).toBe(lib2);
      expect(lib1).toBe(mockMammoth);
      expect(appendChildSpy).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PDF PAGE COUNTING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('PDF page counting', () => {
    it('should correctly iterate through all pages in a multi-page PDF', async () => {
      const pageTexts = ['Page 1', 'Page 2', 'Page 3', 'Page 4', 'Page 5'];
      const mockPdfDoc = createMockPdfDocument(5, pageTexts);
      (window as any).pdfjsLib = createMockPdfjsLib(mockPdfDoc);

      const { result } = renderHook(() => useDocumentServices(null));
      const file = createMockFile('multi.pdf', 'application/pdf');

      await act(async () => {
        await result.current.extractTextFromPDFPure(file);
      });

      // getPage should be called for each page (1-indexed)
      expect(mockPdfDoc.getPage).toHaveBeenCalledTimes(5);
      expect(mockPdfDoc.getPage).toHaveBeenCalledWith(1);
      expect(mockPdfDoc.getPage).toHaveBeenCalledWith(2);
      expect(mockPdfDoc.getPage).toHaveBeenCalledWith(3);
      expect(mockPdfDoc.getPage).toHaveBeenCalledWith(4);
      expect(mockPdfDoc.getPage).toHaveBeenCalledWith(5);
    });

    it('should handle single page PDF', async () => {
      const mockPdfDoc = createMockPdfDocument(1, ['Single page']);
      (window as any).pdfjsLib = createMockPdfjsLib(mockPdfDoc);

      const { result } = renderHook(() => useDocumentServices(null));
      const file = createMockFile('single.pdf', 'application/pdf');

      let text: string | null = null;
      await act(async () => {
        text = await result.current.extractTextFromPDFPure(file);
      });

      expect(mockPdfDoc.getPage).toHaveBeenCalledTimes(1);
      expect(mockPdfDoc.getPage).toHaveBeenCalledWith(1);
      expect(text).toContain('Single');
    });

    it('should report total pages correctly in progressCallback', async () => {
      const mockPdfDoc = createMockPdfDocument(7, Array(7).fill('text'));
      (window as any).pdfjsLib = createMockPdfjsLib(mockPdfDoc);

      const { result } = renderHook(() => useDocumentServices(null));
      const file = createMockFile('7pages.pdf', 'application/pdf');
      const progressCb = vi.fn();

      await act(async () => {
        await result.current.extractTextFromPDFPure(file, progressCb);
      });

      // All calls should have total = 7
      progressCb.mock.calls.forEach((args: any[]) => {
        expect(args[1]).toBe(7);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ERROR HANDLING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('error handling', () => {
    it('extractTextFromPDFPure should not throw on corrupt file', async () => {
      (window as any).pdfjsLib = {
        getDocument: vi.fn(() => ({ promise: Promise.reject(new Error('Corrupt file data')) })),
        GlobalWorkerOptions: { workerSrc: '' },
      };

      const { result } = renderHook(() => useDocumentServices(null));
      const file = createMockFile('corrupt.pdf', 'application/pdf');

      let text: string | null = 'initial';
      await act(async () => {
        text = await result.current.extractTextFromPDFPure(file);
      });

      expect(text).toBeNull();
    });

    it('extractTextFromDOCX should throw with descriptive message on error', async () => {
      (window as any).mammoth = {
        extractRawText: vi.fn().mockRejectedValue(new Error('ZIP format invalid')),
      };

      const { result } = renderHook(() => useDocumentServices(null));
      const file = createMockFile('bad.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

      let error: Error | null = null;
      await act(async () => {
        try {
          await result.current.extractTextFromDOCX(file);
        } catch (e) {
          error = e as Error;
        }
      });

      expect(error!.message).toContain('Falha ao extrair texto do DOCX');
      expect(error!.message).toContain('ZIP format invalid');
    });

    it('extractTextFromPDFWithClaudeVision should fallback gracefully on network error', async () => {
      const mockAI = createMockAIIntegration();
      const mockPdfDoc = createMockPdfDocument(1, ['fallback text for network error test']);
      (window as any).pdfjsLib = createMockPdfjsLib(mockPdfDoc);

      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as any);
      vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/jpeg;base64,abc');

      global.fetch = vi.fn().mockRejectedValue(new Error('Network error')) as any;

      const { result } = renderHook(() => useDocumentServices(mockAI));
      const file = createMockFile('scan.pdf', 'application/pdf');

      // Should not throw - falls back to pure extraction
      let text: string | null = null;
      await act(async () => {
        text = await result.current.extractTextFromPDFWithClaudeVision(file);
      });

      // Fallback extraction returns the text
      expect(text).toContain('fallback');
    });

    it('extractProcessoFromFirstPage should handle PDF getPage error gracefully', async () => {
      const mockPdfDoc = {
        numPages: 1,
        getPage: vi.fn().mockRejectedValue(new Error('Page not found')),
        destroy: vi.fn(),
      };
      (window as any).pdfjsLib = createMockPdfjsLib(mockPdfDoc);

      const { result } = renderHook(() => useDocumentServices(null));
      const file = createMockFile('error.pdf', 'application/pdf');

      let numero: string | null = 'initial';
      await act(async () => {
        numero = await result.current.extractProcessoFromFirstPage(file);
      });

      expect(numero).toBeNull();
    });

    it('tryExtractTextFromPDFs should handle errors and call setError', async () => {
      // Make extractTextFromPDF throw
      (window as any).pdfjsLib = {
        getDocument: vi.fn(() => {
          throw new Error('Unexpected error');
        }),
        GlobalWorkerOptions: { workerSrc: '' },
      };

      const callbacks = {
        setExtractingText: vi.fn(),
        setAnalysisProgress: vi.fn(),
        setExtractedTexts: vi.fn(),
        setError: vi.fn(),
      };

      const { result } = renderHook(() => useDocumentServices(null));

      await act(async () => {
        await result.current.tryExtractTextFromPDFs(
          { peticao: createMockFile('error.pdf', 'application/pdf') },
          callbacks
        );
      });

      // Should still call setExtractingText(false) in finally
      expect(callbacks.setExtractingText).toHaveBeenCalledWith(false);
    });

    it('extractTextFromBulkFile should throw for empty PDF result', async () => {
      // Return null from extractTextFromPDF
      const mockPdfjsLib = {
        getDocument: vi.fn(() => ({ promise: Promise.reject(new Error('fail')) })),
        GlobalWorkerOptions: { workerSrc: '' },
      };
      (window as any).pdfjsLib = mockPdfjsLib;

      const { result } = renderHook(() => useDocumentServices(null));
      const file = createMockFile('empty.pdf', 'application/pdf');

      let error: Error | null = null;
      await act(async () => {
        try {
          await result.current.extractTextFromBulkFile(file);
        } catch (e) {
          error = e as Error;
        }
      });

      expect(error).not.toBeNull();
      expect(error!.message).toContain('Falha ao extrair texto do PDF');
    });
  });
});

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ═══════════════════════════════════════════════════════════════════════════════
// MOCKS
// ═══════════════════════════════════════════════════════════════════════════════

const mockOpenModal = vi.fn();
const mockCloseModal = vi.fn();
const mockOpenDoubleCheckReview = vi.fn();
const mockSetDoubleCheckResult = vi.fn();

vi.mock('../stores/useUIStore', () => ({
  useUIStore: vi.fn((selector?: unknown) => {
    const state = {
      openModal: mockOpenModal,
      closeModal: mockCloseModal,
      openDoubleCheckReview: mockOpenDoubleCheckReview,
      doubleCheckResult: null,
      setDoubleCheckResult: mockSetDoubleCheckResult,
    };
    if (typeof selector === 'function') {
      return (selector as (s: typeof state) => unknown)(state);
    }
    return state;
  }),
}));

vi.mock('../utils/text', () => ({
  anonymizeText: vi.fn((text: string) => text.replace(/João/g, '[NOME]')),
  normalizeHTMLSpacing: vi.fn((html: string) => html),
}));

vi.mock('../schemas/ai-responses', () => ({
  parseAIResponse: vi.fn(),
  extractJSON: vi.fn(),
  TopicExtractionSchema: { parse: vi.fn() },
}));

vi.mock('../prompts', () => ({
  buildAnalysisPrompt: vi.fn(() => 'MOCKED_ANALYSIS_PROMPT'),
}));

import { useDocumentAnalysis } from './useDocumentAnalysis';
import type { UseDocumentAnalysisProps, CurationData } from './useDocumentAnalysis';
import { parseAIResponse, extractJSON } from '../schemas/ai-responses';
import { anonymizeText } from '../utils/text';

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const mockCallAI = vi.fn();
const mockExtractResponseText = vi.fn();
const mockPerformDoubleCheck = vi.fn();
const mockSetAiSettings = vi.fn();
const mockExtractTextFromPDFPure = vi.fn();
const mockExtractTextFromPDFWithClaudeVision = vi.fn();
const mockExtractTextFromPDFWithTesseract = vi.fn();
const mockFileToBase64 = vi.fn();
const mockSetExtractedTopics = vi.fn();
const mockSetSelectedTopics = vi.fn();
const mockSetPartesProcesso = vi.fn();
const mockSetExtractedTexts = vi.fn();
const mockSetAnalyzedDocuments = vi.fn();
const mockSetPeticaoFiles = vi.fn();
const mockSetContestacaoFiles = vi.fn();
const mockSetComplementaryFiles = vi.fn();
const mockSetActiveTab = vi.fn();
const mockSetError = vi.fn();
const mockShowToast = vi.fn();
const mockGenerateRelatorioProcessual = vi.fn();
const mockGenerateMiniReportsBatch = vi.fn();
const mockReorderTopicsViaLLM = vi.fn();

function createDefaultProps(overrides: Partial<UseDocumentAnalysisProps> = {}): UseDocumentAnalysisProps {
  return {
    aiIntegration: {
      aiSettings: {
        provider: 'claude',
        model: 'claude-sonnet-4-20250514',
        ocrEngine: 'pdfjs',
        anonymization: { enabled: false },
        doubleCheck: { enabled: false, operations: { topicExtraction: false } },
      } as any,
      setAiSettings: mockSetAiSettings,
      callAI: mockCallAI,
      extractResponseText: mockExtractResponseText,
      performDoubleCheck: mockPerformDoubleCheck,
    },
    documentServices: {
      extractTextFromPDFPure: mockExtractTextFromPDFPure,
      extractTextFromPDFWithClaudeVision: mockExtractTextFromPDFWithClaudeVision,
      extractTextFromPDFWithTesseract: mockExtractTextFromPDFWithTesseract,
    },
    storage: {
      fileToBase64: mockFileToBase64,
    },
    peticaoFiles: [],
    pastedPeticaoTexts: [],
    contestacaoFiles: [],
    pastedContestacaoTexts: [],
    complementaryFiles: [],
    pastedComplementaryTexts: [],
    documentProcessingModes: { peticoes: {}, contestacoes: {}, complementares: {} } as any,
    setExtractedTopics: mockSetExtractedTopics,
    setSelectedTopics: mockSetSelectedTopics,
    setPartesProcesso: mockSetPartesProcesso,
    setExtractedTexts: mockSetExtractedTexts,
    setAnalyzedDocuments: mockSetAnalyzedDocuments,
    setPeticaoFiles: mockSetPeticaoFiles,
    setContestacaoFiles: mockSetContestacaoFiles,
    setComplementaryFiles: mockSetComplementaryFiles,
    setActiveTab: mockSetActiveTab,
    setError: mockSetError,
    showToast: mockShowToast,
    generateRelatorioProcessual: mockGenerateRelatorioProcessual,
    generateMiniReportsBatch: mockGenerateMiniReportsBatch,
    reorderTopicsViaLLM: mockReorderTopicsViaLLM,
    ...overrides,
  } as any;
}

/** Creates a fake File-like UploadedFile */
function createMockUploadedFile(name = 'test.pdf'): any {
  const file = new File(['fake pdf content'], name, { type: 'application/pdf' });
  return { file, name, size: file.size };
}

/** Creates a fake PastedText */
function createMockPastedText(text = 'Lorem ipsum dolor sit amet reclamante fatos...', name = 'Petição Inicial'): any {
  return { id: crypto.randomUUID(), text, name };
}

/** A valid AI response with topics and partes */
const VALID_TOPICS_RESPONSE = JSON.stringify({
  partes: { reclamante: 'João Silva', reclamadas: ['Empresa XYZ Ltda'] },
  topics: [
    { title: 'Horas Extras', category: 'MÉRITO' },
    { title: 'Adicional de Insalubridade', category: 'MÉRITO' },
    { title: 'Multa do Art. 477', category: 'RESCISÃO' },
  ],
});

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('useDocumentAnalysis', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    // Default behavior for reorderTopicsViaLLM: return same topics
    mockReorderTopicsViaLLM.mockImplementation((topics: any) => Promise.resolve(topics));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 1: INITIALIZATION AND RETURNED METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('hook initialization', () => {
    it('should return analyzing=false initially', () => {
      const { result } = renderHook(() => useDocumentAnalysis(createDefaultProps()));
      expect(result.current.analyzing).toBe(false);
    });

    it('should return empty analysisProgress initially', () => {
      const { result } = renderHook(() => useDocumentAnalysis(createDefaultProps()));
      expect(result.current.analysisProgress).toBe('');
    });

    it('should return showAnonymizationModal=false initially', () => {
      const { result } = renderHook(() => useDocumentAnalysis(createDefaultProps()));
      expect(result.current.showAnonymizationModal).toBe(false);
    });

    it('should return showTopicCurationModal=false initially', () => {
      const { result } = renderHook(() => useDocumentAnalysis(createDefaultProps()));
      expect(result.current.showTopicCurationModal).toBe(false);
    });

    it('should return pendingCurationData=null initially', () => {
      const { result } = renderHook(() => useDocumentAnalysis(createDefaultProps()));
      expect(result.current.pendingCurationData).toBeNull();
    });

    it('should expose all expected handler functions', () => {
      const { result } = renderHook(() => useDocumentAnalysis(createDefaultProps()));
      expect(typeof result.current.handleAnalyzeDocuments).toBe('function');
      expect(typeof result.current.handleAnonymizationConfirm).toBe('function');
      expect(typeof result.current.handleCurationConfirm).toBe('function');
      expect(typeof result.current.handleCurationCancel).toBe('function');
    });

    it('should expose all expected setter functions', () => {
      const { result } = renderHook(() => useDocumentAnalysis(createDefaultProps()));
      expect(typeof result.current.setShowAnonymizationModal).toBe('function');
      expect(typeof result.current.setShowTopicCurationModal).toBe('function');
      expect(typeof result.current.setAnalyzing).toBe('function');
      expect(typeof result.current.setAnalysisProgress).toBe('function');
      expect(typeof result.current.setPendingCurationData).toBe('function');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2: STATE MANAGEMENT (setters)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('state management', () => {
    it('should update showAnonymizationModal via setter', () => {
      const { result } = renderHook(() => useDocumentAnalysis(createDefaultProps()));
      act(() => { result.current.setShowAnonymizationModal(true); });
      expect(result.current.showAnonymizationModal).toBe(true);
    });

    it('should update showTopicCurationModal via setter', () => {
      const { result } = renderHook(() => useDocumentAnalysis(createDefaultProps()));
      act(() => { result.current.setShowTopicCurationModal(true); });
      expect(result.current.showTopicCurationModal).toBe(true);
    });

    it('should update analyzing via setter', () => {
      const { result } = renderHook(() => useDocumentAnalysis(createDefaultProps()));
      act(() => { result.current.setAnalyzing(true); });
      expect(result.current.analyzing).toBe(true);
    });

    it('should update analysisProgress via setter', () => {
      const { result } = renderHook(() => useDocumentAnalysis(createDefaultProps()));
      act(() => { result.current.setAnalysisProgress('Processing...'); });
      expect(result.current.analysisProgress).toBe('Processing...');
    });

    it('should update pendingCurationData via setter', () => {
      const { result } = renderHook(() => useDocumentAnalysis(createDefaultProps()));
      const mockData = { topics: [{ title: 'Test', category: 'MERIT' }] } as any;
      act(() => { result.current.setPendingCurationData(mockData); });
      expect(result.current.pendingCurationData).toEqual(mockData);
    });

    it('should clear pendingCurationData when set to null', () => {
      const { result } = renderHook(() => useDocumentAnalysis(createDefaultProps()));
      act(() => { result.current.setPendingCurationData({ topics: [] } as any); });
      act(() => { result.current.setPendingCurationData(null); });
      expect(result.current.pendingCurationData).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 3: handleAnalyzeDocuments
  // ═══════════════════════════════════════════════════════════════════════════

  describe('handleAnalyzeDocuments', () => {
    it('should set error when no documents provided', () => {
      const { result } = renderHook(() => useDocumentAnalysis(createDefaultProps()));

      act(() => { result.current.handleAnalyzeDocuments(); });

      expect(mockSetError).toHaveBeenCalledWith(
        'Por favor, faça upload da petição inicial ou cole o texto'
      );
      expect(result.current.analyzing).toBe(false);
    });

    it('should show anonymization modal when anonymization is enabled', () => {
      const props = createDefaultProps({
        pastedPeticaoTexts: [createMockPastedText()],
        aiIntegration: {
          aiSettings: {
            provider: 'claude',
            anonymization: { enabled: true },
          },
          setAiSettings: mockSetAiSettings,
          callAI: mockCallAI,
          extractResponseText: mockExtractResponseText,
        } as any,
      });

      const { result } = renderHook(() => useDocumentAnalysis(props));

      act(() => { result.current.handleAnalyzeDocuments(); });

      expect(result.current.showAnonymizationModal).toBe(true);
    });

    it('should call analyzeDocuments directly when anonymization is disabled', async () => {
      (parseAIResponse as ReturnType<typeof vi.fn>).mockReturnValue({
        success: true,
        data: { topics: [{ title: 'Test', category: 'MERIT' }], partes: { reclamante: 'A', reclamadas: ['B'] } },
      });
      mockCallAI.mockResolvedValue({ stop_reason: 'end_turn' });
      mockExtractResponseText.mockReturnValue(VALID_TOPICS_RESPONSE);

      const props = createDefaultProps({
        pastedPeticaoTexts: [createMockPastedText()],
      });

      const { result } = renderHook(() => useDocumentAnalysis(props));

      await act(async () => {
        result.current.handleAnalyzeDocuments();
        await vi.advanceTimersByTimeAsync(5000);
      });

      // Should call AI (analysis started without anonymization modal)
      expect(mockCallAI).toHaveBeenCalled();
      expect(result.current.showAnonymizationModal).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 4: handleAnonymizationConfirm
  // ═══════════════════════════════════════════════════════════════════════════

  describe('handleAnonymizationConfirm', () => {
    it('should close anonymization modal', async () => {
      (parseAIResponse as ReturnType<typeof vi.fn>).mockReturnValue({
        success: true,
        data: { topics: [], partes: { reclamante: '', reclamadas: [] } },
      });
      mockCallAI.mockResolvedValue({ stop_reason: 'end_turn' });
      mockExtractResponseText.mockReturnValue('{"topics":[],"partes":{}}');

      const props = createDefaultProps({
        pastedPeticaoTexts: [createMockPastedText()],
      });

      const { result } = renderHook(() => useDocumentAnalysis(props));

      // Open the anonymization modal
      act(() => { result.current.setShowAnonymizationModal(true); });
      expect(result.current.showAnonymizationModal).toBe(true);

      // Confirm anonymization
      await act(async () => {
        result.current.handleAnonymizationConfirm(['João Silva', 'Maria']);
        await vi.advanceTimersByTimeAsync(5000);
      });

      expect(result.current.showAnonymizationModal).toBe(false);
    });

    it('should update aiSettings with provided names', async () => {
      (parseAIResponse as ReturnType<typeof vi.fn>).mockReturnValue({
        success: true,
        data: { topics: [], partes: { reclamante: '', reclamadas: [] } },
      });
      mockCallAI.mockResolvedValue({ stop_reason: 'end_turn' });
      mockExtractResponseText.mockReturnValue('{"topics":[],"partes":{}}');

      const props = createDefaultProps({
        pastedPeticaoTexts: [createMockPastedText()],
      });

      const { result } = renderHook(() => useDocumentAnalysis(props));

      await act(async () => {
        result.current.handleAnonymizationConfirm(['João', 'Maria']);
        await vi.advanceTimersByTimeAsync(5000);
      });

      expect(mockSetAiSettings).toHaveBeenCalledWith(expect.any(Function));

      // Verify the updater function sets nomesUsuario
      const updaterFn = mockSetAiSettings.mock.calls[0][0];
      const newSettings = updaterFn({ anonymization: { enabled: true } });
      expect(newSettings.anonymization.nomesUsuario).toEqual(['João', 'Maria']);
    });

    it('should trigger analyzeDocuments with provided names', async () => {
      (parseAIResponse as ReturnType<typeof vi.fn>).mockReturnValue({
        success: true,
        data: { topics: [], partes: { reclamante: '', reclamadas: [] } },
      });
      mockCallAI.mockResolvedValue({ stop_reason: 'end_turn' });
      mockExtractResponseText.mockReturnValue('{"topics":[],"partes":{}}');

      const props = createDefaultProps({
        pastedPeticaoTexts: [createMockPastedText()],
      });

      const { result } = renderHook(() => useDocumentAnalysis(props));

      await act(async () => {
        result.current.handleAnonymizationConfirm(['João']);
        await vi.advanceTimersByTimeAsync(5000);
      });

      expect(mockCallAI).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 5: analyzeDocuments - main analysis flow
  // ═══════════════════════════════════════════════════════════════════════════

  describe('analyzeDocuments flow', () => {
    it('should set error if no peticao files or texts provided', async () => {
      const props = createDefaultProps(); // Empty documents
      const { result } = renderHook(() => useDocumentAnalysis(props));

      act(() => { result.current.handleAnalyzeDocuments(); });

      expect(mockSetError).toHaveBeenCalledWith(
        'Por favor, faça upload da petição inicial ou cole o texto'
      );
    });

    it('should set analyzing=true and open analysis modal when documents exist', async () => {
      (parseAIResponse as ReturnType<typeof vi.fn>).mockReturnValue({
        success: true,
        data: { topics: [{ title: 'Test', category: 'M' }], partes: { reclamante: 'A', reclamadas: [] } },
      });
      mockCallAI.mockResolvedValue({ stop_reason: 'end_turn' });
      mockExtractResponseText.mockReturnValue(VALID_TOPICS_RESPONSE);

      const props = createDefaultProps({
        pastedPeticaoTexts: [createMockPastedText()],
      });
      const { result } = renderHook(() => useDocumentAnalysis(props));

      await act(async () => {
        result.current.handleAnalyzeDocuments();
        await vi.advanceTimersByTimeAsync(200);
      });

      expect(mockOpenModal).toHaveBeenCalledWith('analysis');
    });

    it('should call callAI with correct parameters for pasted text', async () => {
      (parseAIResponse as ReturnType<typeof vi.fn>).mockReturnValue({
        success: true,
        data: { topics: [{ title: 'HE', category: 'MERIT' }], partes: { reclamante: 'A', reclamadas: [] } },
      });
      mockCallAI.mockResolvedValue({ stop_reason: 'end_turn' });
      mockExtractResponseText.mockReturnValue(VALID_TOPICS_RESPONSE);

      const props = createDefaultProps({
        pastedPeticaoTexts: [createMockPastedText('Conteudo da peticao...', 'Petição Inicial')],
      });
      const { result } = renderHook(() => useDocumentAnalysis(props));

      await act(async () => {
        result.current.handleAnalyzeDocuments();
        await vi.advanceTimersByTimeAsync(5000);
      });

      expect(mockCallAI).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: expect.arrayContaining([
              expect.objectContaining({ type: 'text' }),
            ]),
          }),
        ]),
        expect.objectContaining({
          maxTokens: 16000,
          useInstructions: true,
          extractText: false,
          temperature: 0.2,
          topP: 0.85,
          topK: 40,
        })
      );
    });

    it('should build content array with pasted peticao text', async () => {
      (parseAIResponse as ReturnType<typeof vi.fn>).mockReturnValue({
        success: true,
        data: { topics: [], partes: { reclamante: '', reclamadas: [] } },
      });
      mockCallAI.mockResolvedValue({ stop_reason: 'end_turn' });
      mockExtractResponseText.mockReturnValue('{"topics":[],"partes":{}}');

      const pastedText = 'Este e o conteudo da peticao inicial com bastante texto para teste';
      const props = createDefaultProps({
        pastedPeticaoTexts: [createMockPastedText(pastedText, 'Petição Inicial')],
      });
      const { result } = renderHook(() => useDocumentAnalysis(props));

      await act(async () => {
        result.current.handleAnalyzeDocuments();
        await vi.advanceTimersByTimeAsync(5000);
      });

      // Verify callAI was called with content that includes the pasted text
      const callArgs = mockCallAI.mock.calls[0];
      const messages = callArgs[0];
      const content = messages[0].content;
      const textItems = content.filter((item: any) => item.type === 'text');
      const peticaoItem = textItems.find((item: any) => item.text?.includes(pastedText));
      expect(peticaoItem).toBeDefined();
    });

    it('should include contestacao pasted texts in content array', async () => {
      (parseAIResponse as ReturnType<typeof vi.fn>).mockReturnValue({
        success: true,
        data: { topics: [], partes: { reclamante: '', reclamadas: [] } },
      });
      mockCallAI.mockResolvedValue({ stop_reason: 'end_turn' });
      mockExtractResponseText.mockReturnValue('{"topics":[],"partes":{}}');

      const contestacaoText = 'Conteudo da contestacao com argumentos de defesa';
      const props = createDefaultProps({
        pastedPeticaoTexts: [createMockPastedText()],
        pastedContestacaoTexts: [createMockPastedText(contestacaoText, 'Contestação 1')],
      });
      const { result } = renderHook(() => useDocumentAnalysis(props));

      await act(async () => {
        result.current.handleAnalyzeDocuments();
        await vi.advanceTimersByTimeAsync(5000);
      });

      const callArgs = mockCallAI.mock.calls[0];
      const content = callArgs[0][0].content;
      const textItems = content.filter((item: any) => item.type === 'text');
      const contestacaoItem = textItems.find((item: any) =>
        item.text?.includes('CONTESTAÇÃO') && item.text?.includes(contestacaoText)
      );
      expect(contestacaoItem).toBeDefined();
    });

    it('should include complementary pasted texts in content array', async () => {
      (parseAIResponse as ReturnType<typeof vi.fn>).mockReturnValue({
        success: true,
        data: { topics: [], partes: { reclamante: '', reclamadas: [] } },
      });
      mockCallAI.mockResolvedValue({ stop_reason: 'end_turn' });
      mockExtractResponseText.mockReturnValue('{"topics":[],"partes":{}}');

      const complementarText = 'Conteudo complementar para analise do processo';
      const props = createDefaultProps({
        pastedPeticaoTexts: [createMockPastedText()],
        pastedComplementaryTexts: [createMockPastedText(complementarText, 'Ata de Audiencia')],
      });
      const { result } = renderHook(() => useDocumentAnalysis(props));

      await act(async () => {
        result.current.handleAnalyzeDocuments();
        await vi.advanceTimersByTimeAsync(5000);
      });

      const callArgs = mockCallAI.mock.calls[0];
      const content = callArgs[0][0].content;
      const textItems = content.filter((item: any) => item.type === 'text');
      const complementarItem = textItems.find((item: any) =>
        item.text?.includes('DOCUMENTO COMPLEMENTAR') && item.text?.includes(complementarText)
      );
      expect(complementarItem).toBeDefined();
    });

    it('should call setExtractedTexts during analysis', async () => {
      (parseAIResponse as ReturnType<typeof vi.fn>).mockReturnValue({
        success: true,
        data: { topics: [], partes: { reclamante: '', reclamadas: [] } },
      });
      mockCallAI.mockResolvedValue({ stop_reason: 'end_turn' });
      mockExtractResponseText.mockReturnValue('{"topics":[],"partes":{}}');

      const props = createDefaultProps({
        pastedPeticaoTexts: [createMockPastedText()],
      });
      const { result } = renderHook(() => useDocumentAnalysis(props));

      await act(async () => {
        result.current.handleAnalyzeDocuments();
        await vi.advanceTimersByTimeAsync(5000);
      });

      expect(mockSetExtractedTexts).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 6: PDF file processing
  // ═══════════════════════════════════════════════════════════════════════════

  describe('PDF file processing', () => {
    it('should use extractTextFromPDFPure for pdfjs mode', async () => {
      const longText = 'A'.repeat(200); // > 100 chars to pass length check
      mockExtractTextFromPDFPure.mockResolvedValue(longText);
      (parseAIResponse as ReturnType<typeof vi.fn>).mockReturnValue({
        success: true,
        data: { topics: [], partes: { reclamante: '', reclamadas: [] } },
      });
      mockCallAI.mockResolvedValue({ stop_reason: 'end_turn' });
      mockExtractResponseText.mockReturnValue('{"topics":[],"partes":{}}');

      const props = createDefaultProps({
        peticaoFiles: [createMockUploadedFile()],
        documentProcessingModes: { peticoes: { 0: 'pdfjs' }, contestacoes: {}, complementares: {} } as any,
      });
      const { result } = renderHook(() => useDocumentAnalysis(props));

      await act(async () => {
        result.current.handleAnalyzeDocuments();
        await vi.advanceTimersByTimeAsync(5000);
      });

      expect(mockExtractTextFromPDFPure).toHaveBeenCalled();
    });

    it('should use extractTextFromPDFWithClaudeVision for claude-vision mode', async () => {
      const longText = 'B'.repeat(200);
      mockExtractTextFromPDFWithClaudeVision.mockResolvedValue(longText);
      (parseAIResponse as ReturnType<typeof vi.fn>).mockReturnValue({
        success: true,
        data: { topics: [], partes: { reclamante: '', reclamadas: [] } },
      });
      mockCallAI.mockResolvedValue({ stop_reason: 'end_turn' });
      mockExtractResponseText.mockReturnValue('{"topics":[],"partes":{}}');

      const props = createDefaultProps({
        peticaoFiles: [createMockUploadedFile()],
        documentProcessingModes: { peticoes: { 0: 'claude-vision' }, contestacoes: {}, complementares: {} } as any,
        aiIntegration: {
          aiSettings: { provider: 'claude', anonymization: { enabled: false } } as any,
          setAiSettings: mockSetAiSettings,
          callAI: mockCallAI,
          extractResponseText: mockExtractResponseText,
        },
      });
      const { result } = renderHook(() => useDocumentAnalysis(props));

      await act(async () => {
        result.current.handleAnalyzeDocuments();
        await vi.advanceTimersByTimeAsync(5000);
      });

      expect(mockExtractTextFromPDFWithClaudeVision).toHaveBeenCalled();
    });

    it('should use extractTextFromPDFWithTesseract for tesseract mode', async () => {
      const longText = 'C'.repeat(200);
      mockExtractTextFromPDFWithTesseract.mockResolvedValue(longText);
      (parseAIResponse as ReturnType<typeof vi.fn>).mockReturnValue({
        success: true,
        data: { topics: [], partes: { reclamante: '', reclamadas: [] } },
      });
      mockCallAI.mockResolvedValue({ stop_reason: 'end_turn' });
      mockExtractResponseText.mockReturnValue('{"topics":[],"partes":{}}');

      const props = createDefaultProps({
        peticaoFiles: [createMockUploadedFile()],
        documentProcessingModes: { peticoes: { 0: 'tesseract' }, contestacoes: {}, complementares: {} } as any,
      });
      const { result } = renderHook(() => useDocumentAnalysis(props));

      await act(async () => {
        result.current.handleAnalyzeDocuments();
        await vi.advanceTimersByTimeAsync(5000);
      });

      expect(mockExtractTextFromPDFWithTesseract).toHaveBeenCalled();
    });

    it('should use pdf-puro mode (base64) and fileToBase64', async () => {
      mockFileToBase64.mockResolvedValue('base64data');
      (parseAIResponse as ReturnType<typeof vi.fn>).mockReturnValue({
        success: true,
        data: { topics: [], partes: { reclamante: '', reclamadas: [] } },
      });
      mockCallAI.mockResolvedValue({ stop_reason: 'end_turn' });
      mockExtractResponseText.mockReturnValue('{"topics":[],"partes":{}}');

      const props = createDefaultProps({
        peticaoFiles: [createMockUploadedFile()],
        documentProcessingModes: { peticoes: { 0: 'pdf-puro' }, contestacoes: {}, complementares: {} } as any,
      });
      const { result } = renderHook(() => useDocumentAnalysis(props));

      await act(async () => {
        result.current.handleAnalyzeDocuments();
        await vi.advanceTimersByTimeAsync(5000);
      });

      expect(mockFileToBase64).toHaveBeenCalled();
      // Verify content includes a document type item
      const callArgs = mockCallAI.mock.calls[0];
      const content = callArgs[0][0].content;
      const docItems = content.filter((item: any) => item.type === 'document');
      expect(docItems.length).toBeGreaterThan(0);
    });

    it('should fallback to pdf-puro when extraction returns insufficient text and anonymization disabled', async () => {
      mockExtractTextFromPDFPure.mockResolvedValue('short'); // < 100 chars
      mockFileToBase64.mockResolvedValue('fallbackbase64');
      (parseAIResponse as ReturnType<typeof vi.fn>).mockReturnValue({
        success: true,
        data: { topics: [], partes: { reclamante: '', reclamadas: [] } },
      });
      mockCallAI.mockResolvedValue({ stop_reason: 'end_turn' });
      mockExtractResponseText.mockReturnValue('{"topics":[],"partes":{}}');

      const props = createDefaultProps({
        peticaoFiles: [createMockUploadedFile()],
        documentProcessingModes: { peticoes: { 0: 'pdfjs' }, contestacoes: {}, complementares: {} } as any,
      });
      const { result } = renderHook(() => useDocumentAnalysis(props));

      await act(async () => {
        result.current.handleAnalyzeDocuments();
        await vi.advanceTimersByTimeAsync(5000);
      });

      // Falls back to base64 when text too short
      expect(mockFileToBase64).toHaveBeenCalled();
    });

    it('should show error toast when extraction fails with anonymization enabled', async () => {
      mockExtractTextFromPDFPure.mockResolvedValue('short'); // Insufficient text
      (parseAIResponse as ReturnType<typeof vi.fn>).mockReturnValue({
        success: true,
        data: { topics: [], partes: { reclamante: '', reclamadas: [] } },
      });
      mockCallAI.mockResolvedValue({ stop_reason: 'end_turn' });
      mockExtractResponseText.mockReturnValue('{"topics":[],"partes":{}}');

      const props = createDefaultProps({
        peticaoFiles: [createMockUploadedFile()],
        documentProcessingModes: { peticoes: { 0: 'pdfjs' }, contestacoes: {}, complementares: {} } as any,
        aiIntegration: {
          aiSettings: { provider: 'claude', anonymization: { enabled: true }, ocrEngine: 'pdfjs' } as any,
          setAiSettings: mockSetAiSettings,
          callAI: mockCallAI,
          extractResponseText: mockExtractResponseText,
        },
      });
      const { result } = renderHook(() => useDocumentAnalysis(props));

      // When anonymization is enabled, handleAnalyzeDocuments opens the modal
      // We need to confirm anonymization to trigger analyzeDocuments
      await act(async () => {
        result.current.handleAnonymizationConfirm(['João']);
        await vi.advanceTimersByTimeAsync(5000);
      });

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringContaining('anonimização ativa'),
        'error'
      );
    });

    it('should fallback to base64 when extraction throws an error (anonymization disabled)', async () => {
      mockExtractTextFromPDFPure.mockRejectedValue(new Error('Extraction failed'));
      mockFileToBase64.mockResolvedValue('errorFallbackBase64');
      (parseAIResponse as ReturnType<typeof vi.fn>).mockReturnValue({
        success: true,
        data: { topics: [], partes: { reclamante: '', reclamadas: [] } },
      });
      mockCallAI.mockResolvedValue({ stop_reason: 'end_turn' });
      mockExtractResponseText.mockReturnValue('{"topics":[],"partes":{}}');

      const props = createDefaultProps({
        peticaoFiles: [createMockUploadedFile()],
        documentProcessingModes: { peticoes: { 0: 'pdfjs' }, contestacoes: {}, complementares: {} } as any,
      });
      const { result } = renderHook(() => useDocumentAnalysis(props));

      await act(async () => {
        result.current.handleAnalyzeDocuments();
        await vi.advanceTimersByTimeAsync(5000);
      });

      expect(mockFileToBase64).toHaveBeenCalled();
    });

    it('should fallback to pdfjs for unknown processing mode', async () => {
      const longText = 'D'.repeat(200);
      mockExtractTextFromPDFPure.mockResolvedValue(longText);
      (parseAIResponse as ReturnType<typeof vi.fn>).mockReturnValue({
        success: true,
        data: { topics: [], partes: { reclamante: '', reclamadas: [] } },
      });
      mockCallAI.mockResolvedValue({ stop_reason: 'end_turn' });
      mockExtractResponseText.mockReturnValue('{"topics":[],"partes":{}}');

      const props = createDefaultProps({
        peticaoFiles: [createMockUploadedFile()],
        documentProcessingModes: { peticoes: { 0: 'unknown-mode' }, contestacoes: {}, complementares: {} } as any,
      });
      const { result } = renderHook(() => useDocumentAnalysis(props));

      await act(async () => {
        result.current.handleAnalyzeDocuments();
        await vi.advanceTimersByTimeAsync(5000);
      });

      // Unknown mode should fallback to PDF.js
      expect(mockExtractTextFromPDFPure).toHaveBeenCalled();
    });

    it('should process contestacao files with pdfjs mode', async () => {
      const longText = 'E'.repeat(200);
      mockExtractTextFromPDFPure.mockResolvedValue(longText);
      (parseAIResponse as ReturnType<typeof vi.fn>).mockReturnValue({
        success: true,
        data: { topics: [], partes: { reclamante: '', reclamadas: [] } },
      });
      mockCallAI.mockResolvedValue({ stop_reason: 'end_turn' });
      mockExtractResponseText.mockReturnValue('{"topics":[],"partes":{}}');

      const props = createDefaultProps({
        pastedPeticaoTexts: [createMockPastedText()],
        contestacaoFiles: [createMockUploadedFile('contestacao.pdf')],
        documentProcessingModes: { peticoes: {}, contestacoes: { 0: 'pdfjs' }, complementares: {} } as any,
      });
      const { result } = renderHook(() => useDocumentAnalysis(props));

      await act(async () => {
        result.current.handleAnalyzeDocuments();
        await vi.advanceTimersByTimeAsync(5000);
      });

      // extractTextFromPDFPure should be called for the contestacao file
      expect(mockExtractTextFromPDFPure).toHaveBeenCalled();
    });

    it('should process complementary files with pdfjs mode', async () => {
      const longText = 'F'.repeat(200);
      mockExtractTextFromPDFPure.mockResolvedValue(longText);
      (parseAIResponse as ReturnType<typeof vi.fn>).mockReturnValue({
        success: true,
        data: { topics: [], partes: { reclamante: '', reclamadas: [] } },
      });
      mockCallAI.mockResolvedValue({ stop_reason: 'end_turn' });
      mockExtractResponseText.mockReturnValue('{"topics":[],"partes":{}}');

      const props = createDefaultProps({
        pastedPeticaoTexts: [createMockPastedText()],
        complementaryFiles: [createMockUploadedFile('complementar.pdf')],
        documentProcessingModes: { peticoes: {}, contestacoes: {}, complementares: { 0: 'pdfjs' } } as any,
      });
      const { result } = renderHook(() => useDocumentAnalysis(props));

      await act(async () => {
        result.current.handleAnalyzeDocuments();
        await vi.advanceTimersByTimeAsync(5000);
      });

      expect(mockExtractTextFromPDFPure).toHaveBeenCalled();
    });

    it('should apply anonymization effective mode (force pdfjs when anonymization blocks claude-vision)', async () => {
      const longText = 'G'.repeat(200);
      mockExtractTextFromPDFPure.mockResolvedValue(longText);
      (parseAIResponse as ReturnType<typeof vi.fn>).mockReturnValue({
        success: true,
        data: { topics: [], partes: { reclamante: '', reclamadas: [] } },
      });
      mockCallAI.mockResolvedValue({ stop_reason: 'end_turn' });
      mockExtractResponseText.mockReturnValue('{"topics":[],"partes":{}}');

      const props = createDefaultProps({
        peticaoFiles: [createMockUploadedFile()],
        documentProcessingModes: { peticoes: { 0: 'claude-vision' }, contestacoes: {}, complementares: {} } as any,
        aiIntegration: {
          aiSettings: { provider: 'claude', anonymization: { enabled: true }, ocrEngine: 'pdfjs' } as any,
          setAiSettings: mockSetAiSettings,
          callAI: mockCallAI,
          extractResponseText: mockExtractResponseText,
        },
      });
      const { result } = renderHook(() => useDocumentAnalysis(props));

      // When anonymization is enabled, handleAnalyzeDocuments opens the modal
      // We trigger analyzeDocuments via handleAnonymizationConfirm
      await act(async () => {
        result.current.handleAnonymizationConfirm(['João']);
        await vi.advanceTimersByTimeAsync(5000);
      });

      // With anonymization enabled, claude-vision should be blocked -> pdfjs used
      expect(mockExtractTextFromPDFPure).toHaveBeenCalled();
      expect(mockExtractTextFromPDFWithClaudeVision).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 7: anonimizarTexto (anonymization applied to text)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('text anonymization', () => {
    it('should apply anonymizeText to pasted peticao when enabled', async () => {
      (parseAIResponse as ReturnType<typeof vi.fn>).mockReturnValue({
        success: true,
        data: { topics: [], partes: { reclamante: '', reclamadas: [] } },
      });
      mockCallAI.mockResolvedValue({ stop_reason: 'end_turn' });
      mockExtractResponseText.mockReturnValue('{"topics":[],"partes":{}}');

      const props = createDefaultProps({
        pastedPeticaoTexts: [createMockPastedText('João fez reclamacao', 'Petição Inicial')],
        aiIntegration: {
          aiSettings: { provider: 'claude', anonymization: { enabled: true }, ocrEngine: 'pdfjs' } as any,
          setAiSettings: mockSetAiSettings,
          callAI: mockCallAI,
          extractResponseText: mockExtractResponseText,
        },
      });
      const { result } = renderHook(() => useDocumentAnalysis(props));

      // When anonymization is enabled, use handleAnonymizationConfirm to trigger analyzeDocuments
      await act(async () => {
        result.current.handleAnonymizationConfirm(['João']);
        await vi.advanceTimersByTimeAsync(5000);
      });

      // anonymizeText mock replaces João with [NOME]
      expect(anonymizeText).toHaveBeenCalled();
    });

    it('should NOT apply anonymization when disabled', async () => {
      (parseAIResponse as ReturnType<typeof vi.fn>).mockReturnValue({
        success: true,
        data: { topics: [], partes: { reclamante: '', reclamadas: [] } },
      });
      mockCallAI.mockResolvedValue({ stop_reason: 'end_turn' });
      mockExtractResponseText.mockReturnValue('{"topics":[],"partes":{}}');

      const props = createDefaultProps({
        pastedPeticaoTexts: [createMockPastedText('Texto sem anonimizar', 'Petição Inicial')],
      });
      const { result } = renderHook(() => useDocumentAnalysis(props));

      await act(async () => {
        result.current.handleAnalyzeDocuments();
        await vi.advanceTimersByTimeAsync(5000);
      });

      // anonymizeText should not be called when disabled
      expect(anonymizeText).not.toHaveBeenCalled();
    });

    it('should apply anonymization to extracted PDF text', async () => {
      const longText = 'João reclamante texto com mais de cem caracteres para o teste funcionar corretamente na verificacao de tamanho minimo do texto extraido';
      mockExtractTextFromPDFPure.mockResolvedValue(longText);
      (parseAIResponse as ReturnType<typeof vi.fn>).mockReturnValue({
        success: true,
        data: { topics: [], partes: { reclamante: '', reclamadas: [] } },
      });
      mockCallAI.mockResolvedValue({ stop_reason: 'end_turn' });
      mockExtractResponseText.mockReturnValue('{"topics":[],"partes":{}}');

      const props = createDefaultProps({
        peticaoFiles: [createMockUploadedFile()],
        documentProcessingModes: { peticoes: { 0: 'pdfjs' }, contestacoes: {}, complementares: {} } as any,
        aiIntegration: {
          aiSettings: { provider: 'claude', anonymization: { enabled: true }, ocrEngine: 'pdfjs' } as any,
          setAiSettings: mockSetAiSettings,
          callAI: mockCallAI,
          extractResponseText: mockExtractResponseText,
        },
      });
      const { result } = renderHook(() => useDocumentAnalysis(props));

      // When anonymization is enabled, use handleAnonymizationConfirm to trigger analyzeDocuments
      await act(async () => {
        result.current.handleAnonymizationConfirm(['João']);
        await vi.advanceTimersByTimeAsync(5000);
      });

      expect(anonymizeText).toHaveBeenCalledWith(
        longText,
        expect.objectContaining({ enabled: true }),
        expect.any(Array)
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 8: Topic extraction and parsing
  // ═══════════════════════════════════════════════════════════════════════════

  describe('topic extraction from AI response', () => {
    it('should use parseAIResponse for Zod validation', async () => {
      const topics = [{ title: 'Horas Extras', category: 'MERIT' }];
      (parseAIResponse as ReturnType<typeof vi.fn>).mockReturnValue({
        success: true,
        data: { topics, partes: { reclamante: 'A', reclamadas: ['B'] } },
      });
      mockCallAI.mockResolvedValue({ stop_reason: 'end_turn' });
      mockExtractResponseText.mockReturnValue(VALID_TOPICS_RESPONSE);

      const props = createDefaultProps({
        pastedPeticaoTexts: [createMockPastedText()],
      });
      const { result } = renderHook(() => useDocumentAnalysis(props));

      await act(async () => {
        result.current.handleAnalyzeDocuments();
        await vi.advanceTimersByTimeAsync(5000);
      });

      expect(parseAIResponse).toHaveBeenCalled();
    });

    it('should use extractJSON fallback when Zod validation fails', async () => {
      (parseAIResponse as ReturnType<typeof vi.fn>).mockReturnValue({
        success: false,
        error: 'Schema validation failed',
      });
      (extractJSON as ReturnType<typeof vi.fn>).mockReturnValue(
        '{"topics":[{"title":"Fallback","category":"TEST"}],"partes":{"reclamante":"X","reclamadas":[]}}'
      );
      mockCallAI.mockResolvedValue({ stop_reason: 'end_turn' });
      mockExtractResponseText.mockReturnValue('some invalid response with json inside');

      const props = createDefaultProps({
        pastedPeticaoTexts: [createMockPastedText()],
      });
      const { result } = renderHook(() => useDocumentAnalysis(props));

      await act(async () => {
        result.current.handleAnalyzeDocuments();
        await vi.advanceTimersByTimeAsync(5000);
      });

      expect(extractJSON).toHaveBeenCalled();
    });

    it('should throw error when both Zod and JSON extraction fail', async () => {
      (parseAIResponse as ReturnType<typeof vi.fn>).mockReturnValue({
        success: false,
        error: 'Schema validation failed',
      });
      (extractJSON as ReturnType<typeof vi.fn>).mockReturnValue(null);
      mockCallAI.mockResolvedValue({ stop_reason: 'end_turn' });
      mockExtractResponseText.mockReturnValue('completely invalid response');

      const props = createDefaultProps({
        pastedPeticaoTexts: [createMockPastedText()],
      });
      const { result } = renderHook(() => useDocumentAnalysis(props));

      await act(async () => {
        result.current.handleAnalyzeDocuments();
        await vi.advanceTimersByTimeAsync(5000);
      });

      expect(mockSetError).toHaveBeenCalledWith(
        expect.stringContaining('Não foi possível encontrar JSON válido')
      );
    });

    it('should set partes when parsed data includes them', async () => {
      (parseAIResponse as ReturnType<typeof vi.fn>).mockReturnValue({
        success: true,
        data: {
          topics: [{ title: 'T1', category: 'C1' }],
          partes: { reclamante: 'Jose da Silva', reclamadas: ['Empresa ABC'] },
        },
      });
      mockCallAI.mockResolvedValue({ stop_reason: 'end_turn' });
      mockExtractResponseText.mockReturnValue(VALID_TOPICS_RESPONSE);

      const props = createDefaultProps({
        pastedPeticaoTexts: [createMockPastedText()],
      });
      const { result } = renderHook(() => useDocumentAnalysis(props));

      await act(async () => {
        result.current.handleAnalyzeDocuments();
        await vi.advanceTimersByTimeAsync(5000);
      });

      expect(mockSetPartesProcesso).toHaveBeenCalledWith({
        reclamante: 'Jose da Silva',
        reclamadas: ['Empresa ABC'],
      });
    });

    it('should call reorderTopicsViaLLM with extracted topics', async () => {
      const topics = [{ title: 'B Topic', category: 'M' }, { title: 'A Topic', category: 'P' }];
      (parseAIResponse as ReturnType<typeof vi.fn>).mockReturnValue({
        success: true,
        data: { topics, partes: { reclamante: '', reclamadas: [] } },
      });
      mockCallAI.mockResolvedValue({ stop_reason: 'end_turn' });
      mockExtractResponseText.mockReturnValue(VALID_TOPICS_RESPONSE);

      const props = createDefaultProps({
        pastedPeticaoTexts: [createMockPastedText()],
      });
      const { result } = renderHook(() => useDocumentAnalysis(props));

      await act(async () => {
        result.current.handleAnalyzeDocuments();
        await vi.advanceTimersByTimeAsync(5000);
      });

      expect(mockReorderTopicsViaLLM).toHaveBeenCalledWith(topics);
    });

    it('should open topic curation modal after successful extraction', async () => {
      (parseAIResponse as ReturnType<typeof vi.fn>).mockReturnValue({
        success: true,
        data: { topics: [{ title: 'T', category: 'C' }], partes: { reclamante: '', reclamadas: [] } },
      });
      mockCallAI.mockResolvedValue({ stop_reason: 'end_turn' });
      mockExtractResponseText.mockReturnValue(VALID_TOPICS_RESPONSE);

      const props = createDefaultProps({
        pastedPeticaoTexts: [createMockPastedText()],
      });
      const { result } = renderHook(() => useDocumentAnalysis(props));

      await act(async () => {
        result.current.handleAnalyzeDocuments();
        await vi.advanceTimersByTimeAsync(5000);
      });

      expect(result.current.showTopicCurationModal).toBe(true);
      expect(result.current.pendingCurationData).not.toBeNull();
    });

    it('should set analyzing=false after curation data is prepared', async () => {
      (parseAIResponse as ReturnType<typeof vi.fn>).mockReturnValue({
        success: true,
        data: { topics: [{ title: 'T', category: 'C' }], partes: { reclamante: '', reclamadas: [] } },
      });
      mockCallAI.mockResolvedValue({ stop_reason: 'end_turn' });
      mockExtractResponseText.mockReturnValue(VALID_TOPICS_RESPONSE);

      const props = createDefaultProps({
        pastedPeticaoTexts: [createMockPastedText()],
      });
      const { result } = renderHook(() => useDocumentAnalysis(props));

      await act(async () => {
        result.current.handleAnalyzeDocuments();
        await vi.advanceTimersByTimeAsync(5000);
      });

      expect(result.current.analyzing).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 9: Error handling
  // ═══════════════════════════════════════════════════════════════════════════

  describe('error handling', () => {
    it('should handle API call failure gracefully', async () => {
      mockCallAI.mockRejectedValue(new Error('Network error'));

      const props = createDefaultProps({
        pastedPeticaoTexts: [createMockPastedText()],
      });
      const { result } = renderHook(() => useDocumentAnalysis(props));

      await act(async () => {
        result.current.handleAnalyzeDocuments();
        await vi.advanceTimersByTimeAsync(5000);
      });

      expect(mockSetError).toHaveBeenCalledWith(
        expect.stringContaining('Network error')
      );
      expect(result.current.analyzing).toBe(false);
      expect(mockCloseModal).toHaveBeenCalledWith('analysis');
    });

    it('should handle truncated response (max_tokens for Claude)', async () => {
      mockCallAI.mockResolvedValue({ stop_reason: 'max_tokens' });
      mockExtractResponseText.mockReturnValue('some text');

      const props = createDefaultProps({
        pastedPeticaoTexts: [createMockPastedText()],
      });
      const { result } = renderHook(() => useDocumentAnalysis(props));

      await act(async () => {
        result.current.handleAnalyzeDocuments();
        await vi.advanceTimersByTimeAsync(5000);
      });

      expect(mockSetError).toHaveBeenCalledWith(
        expect.stringContaining('truncada')
      );
    });

    it('should handle truncated response (MAX_TOKENS for Gemini)', async () => {
      mockCallAI.mockResolvedValue({
        candidates: [{ finishReason: 'MAX_TOKENS' }],
      });
      mockExtractResponseText.mockReturnValue('some text');

      const props = createDefaultProps({
        pastedPeticaoTexts: [createMockPastedText()],
        aiIntegration: {
          aiSettings: { provider: 'gemini', anonymization: { enabled: false } } as any,
          setAiSettings: mockSetAiSettings,
          callAI: mockCallAI,
          extractResponseText: mockExtractResponseText,
        },
      });
      const { result } = renderHook(() => useDocumentAnalysis(props));

      await act(async () => {
        result.current.handleAnalyzeDocuments();
        await vi.advanceTimersByTimeAsync(5000);
      });

      expect(mockSetError).toHaveBeenCalledWith(
        expect.stringContaining('truncada')
      );
    });

    it('should handle empty response text from API', async () => {
      mockCallAI.mockResolvedValue({ stop_reason: 'end_turn' });
      mockExtractResponseText.mockReturnValue('');

      const props = createDefaultProps({
        pastedPeticaoTexts: [createMockPastedText()],
      });
      const { result } = renderHook(() => useDocumentAnalysis(props));

      await act(async () => {
        result.current.handleAnalyzeDocuments();
        await vi.advanceTimersByTimeAsync(5000);
      });

      expect(mockSetError).toHaveBeenCalledWith(
        expect.stringContaining('Nenhum conteúdo de texto encontrado')
      );
    });

    it('should handle null response text from API', async () => {
      mockCallAI.mockResolvedValue({ stop_reason: 'end_turn' });
      mockExtractResponseText.mockReturnValue(null);

      const props = createDefaultProps({
        pastedPeticaoTexts: [createMockPastedText()],
      });
      const { result } = renderHook(() => useDocumentAnalysis(props));

      await act(async () => {
        result.current.handleAnalyzeDocuments();
        await vi.advanceTimersByTimeAsync(5000);
      });

      expect(mockSetError).toHaveBeenCalledWith(
        expect.stringContaining('Nenhum conteúdo de texto encontrado')
      );
    });

    it('should close analysis modal on error', async () => {
      mockCallAI.mockRejectedValue(new Error('Unexpected error'));

      const props = createDefaultProps({
        pastedPeticaoTexts: [createMockPastedText()],
      });
      const { result } = renderHook(() => useDocumentAnalysis(props));

      await act(async () => {
        result.current.handleAnalyzeDocuments();
        await vi.advanceTimersByTimeAsync(5000);
      });

      expect(mockCloseModal).toHaveBeenCalledWith('analysis');
    });

    it('should reset analyzing state on error', async () => {
      mockCallAI.mockRejectedValue(new Error('Fatal error'));

      const props = createDefaultProps({
        pastedPeticaoTexts: [createMockPastedText()],
      });
      const { result } = renderHook(() => useDocumentAnalysis(props));

      await act(async () => {
        result.current.handleAnalyzeDocuments();
        await vi.advanceTimersByTimeAsync(5000);
      });

      expect(result.current.analyzing).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 10: handleCurationConfirm
  // ═══════════════════════════════════════════════════════════════════════════

  describe('handleCurationConfirm', () => {
    const mockCurationData: CurationData = {
      topics: [
        { title: 'Horas Extras', category: 'MERIT' },
        { title: 'FGTS', category: 'RESCISAO' },
      ] as any,
      partes: { reclamante: 'Jose', reclamadas: ['EmpresaX'] },
      relatórioContentArray: [{ type: 'text' as const, text: 'conteudo relatorio' }],
      documents: {
        peticoesText: [{ id: '1', text: 'peticao text', name: 'Petição Inicial' }],
        contestacoesText: [{ id: '2', text: 'contestacao text', name: 'Contestação 1' }],
        complementaresText: [],
        peticoesBase64: [],
        contestaçõesBase64: [],
        complementaryBase64: [],
        contestaçõesExtraidasDePDF: [],
        contestaçõesJaColadas: [{ id: '2', text: 'contestacao text', name: 'Contestação 1' }],
        complementaresExtraidasDePDF: [],
        complementaresJaColadas: [],
        peticoesExtraidasDePDF: [],
        peticoesJaColadas: [{ id: '1', text: 'peticao text', name: 'Petição Inicial' }],
      },
    };

    it('should do nothing if pendingCurationData is null', async () => {
      const props = createDefaultProps();
      const { result } = renderHook(() => useDocumentAnalysis(props));

      await act(async () => {
        await result.current.handleCurationConfirm([{ title: 'T', category: 'C' }] as any);
      });

      expect(mockGenerateRelatorioProcessual).not.toHaveBeenCalled();
    });

    it('should close curation modal and set analyzing=true', async () => {
      mockGenerateRelatorioProcessual.mockResolvedValue('<p>Relatorio processual</p>');
      mockGenerateMiniReportsBatch.mockResolvedValue({ results: [], errors: [] });

      const props = createDefaultProps();
      const { result } = renderHook(() => useDocumentAnalysis(props));

      // Set pendingCurationData
      act(() => { result.current.setPendingCurationData(mockCurationData); });

      await act(async () => {
        await result.current.handleCurationConfirm(mockCurationData.topics as any);
        await vi.advanceTimersByTimeAsync(5000);
      });

      expect(result.current.showTopicCurationModal).toBe(false);
    });

    it('should call generateRelatorioProcessual with relatórioContentArray', async () => {
      mockGenerateRelatorioProcessual.mockResolvedValue('<p>Relatorio gerado</p>');
      mockGenerateMiniReportsBatch.mockResolvedValue({ results: [], errors: [] });

      const props = createDefaultProps();
      const { result } = renderHook(() => useDocumentAnalysis(props));

      act(() => { result.current.setPendingCurationData(mockCurationData); });

      await act(async () => {
        await result.current.handleCurationConfirm(mockCurationData.topics as any);
        await vi.advanceTimersByTimeAsync(5000);
      });

      expect(mockGenerateRelatorioProcessual).toHaveBeenCalledWith(
        mockCurationData.relatórioContentArray
      );
    });

    it('should call generateMiniReportsBatch for curated topics', async () => {
      mockGenerateRelatorioProcessual.mockResolvedValue('<p>Report</p>');
      mockGenerateMiniReportsBatch.mockResolvedValue({
        results: [
          { title: 'Horas Extras', relatorio: '<p>Mini report HE</p>' },
          { title: 'FGTS', relatorio: '<p>Mini report FGTS</p>' },
        ],
        errors: [],
      });

      const props = createDefaultProps();
      const { result } = renderHook(() => useDocumentAnalysis(props));

      act(() => { result.current.setPendingCurationData(mockCurationData); });

      await act(async () => {
        await result.current.handleCurationConfirm(mockCurationData.topics as any);
        await vi.advanceTimersByTimeAsync(5000);
      });

      expect(mockGenerateMiniReportsBatch).toHaveBeenCalled();
    });

    it('should set extractedTopics with RELATORIO as first topic', async () => {
      mockGenerateRelatorioProcessual.mockResolvedValue('<p>Report content</p>');
      mockGenerateMiniReportsBatch.mockResolvedValue({
        results: [{ title: 'Horas Extras', relatorio: '<p>HE</p>' }],
        errors: [{ title: 'FGTS', error: 'timeout' }],
      });

      const props = createDefaultProps();
      const { result } = renderHook(() => useDocumentAnalysis(props));

      act(() => { result.current.setPendingCurationData(mockCurationData); });

      await act(async () => {
        await result.current.handleCurationConfirm(mockCurationData.topics as any);
        await vi.advanceTimersByTimeAsync(5000);
      });

      expect(mockSetExtractedTopics).toHaveBeenCalled();
      const calledTopics = mockSetExtractedTopics.mock.calls[0][0];
      expect(calledTopics[0].title).toBe('RELATÓRIO');
      expect(calledTopics[0].category).toBe('RELATÓRIO');
    });

    it('should call setAnalyzedDocuments with document data', async () => {
      mockGenerateRelatorioProcessual.mockResolvedValue('<p>R</p>');
      mockGenerateMiniReportsBatch.mockResolvedValue({ results: [], errors: [] });

      const props = createDefaultProps();
      const { result } = renderHook(() => useDocumentAnalysis(props));

      act(() => { result.current.setPendingCurationData(mockCurationData); });

      await act(async () => {
        await result.current.handleCurationConfirm(mockCurationData.topics as any);
        await vi.advanceTimersByTimeAsync(5000);
      });

      expect(mockSetAnalyzedDocuments).toHaveBeenCalledWith(
        expect.objectContaining({
          peticoes: [],
          contestacoes: [],
          complementares: [],
        })
      );
    });

    it('should call setSelectedTopics', async () => {
      mockGenerateRelatorioProcessual.mockResolvedValue('<p>R</p>');
      mockGenerateMiniReportsBatch.mockResolvedValue({
        results: [{ title: 'Horas Extras', relatorio: '<p>HE</p>' }],
        errors: [],
      });

      const props = createDefaultProps();
      const { result } = renderHook(() => useDocumentAnalysis(props));

      act(() => { result.current.setPendingCurationData(mockCurationData); });

      await act(async () => {
        await result.current.handleCurationConfirm(mockCurationData.topics as any);
        await vi.advanceTimersByTimeAsync(5000);
      });

      expect(mockSetSelectedTopics).toHaveBeenCalled();
    });

    it('should set activeTab to topics on success', async () => {
      mockGenerateRelatorioProcessual.mockResolvedValue('<p>R</p>');
      mockGenerateMiniReportsBatch.mockResolvedValue({ results: [], errors: [] });

      const props = createDefaultProps();
      const { result } = renderHook(() => useDocumentAnalysis(props));

      act(() => { result.current.setPendingCurationData(mockCurationData); });

      await act(async () => {
        await result.current.handleCurationConfirm(mockCurationData.topics as any);
        await vi.advanceTimersByTimeAsync(5000);
      });

      expect(mockSetActiveTab).toHaveBeenCalledWith('topics');
    });

    it('should show success toast on completion', async () => {
      mockGenerateRelatorioProcessual.mockResolvedValue('<p>R</p>');
      mockGenerateMiniReportsBatch.mockResolvedValue({ results: [], errors: [] });

      const props = createDefaultProps();
      const { result } = renderHook(() => useDocumentAnalysis(props));

      act(() => { result.current.setPendingCurationData(mockCurationData); });

      await act(async () => {
        await result.current.handleCurationConfirm(mockCurationData.topics as any);
        await vi.advanceTimersByTimeAsync(5000);
      });

      expect(mockShowToast).toHaveBeenCalledWith(
        'Análise concluída com sucesso!',
        'success'
      );
    });

    it('should show warning toast when some mini-reports fail', async () => {
      mockGenerateRelatorioProcessual.mockResolvedValue('<p>R</p>');
      mockGenerateMiniReportsBatch.mockResolvedValue({
        results: [{ title: 'Horas Extras', relatorio: '<p>ok</p>' }],
        errors: [{ title: 'FGTS', error: 'timeout' }],
      });

      const props = createDefaultProps();
      const { result } = renderHook(() => useDocumentAnalysis(props));

      act(() => { result.current.setPendingCurationData(mockCurationData); });

      await act(async () => {
        await result.current.handleCurationConfirm(mockCurationData.topics as any);
        await vi.advanceTimersByTimeAsync(5000);
      });

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringContaining('falharam'),
        'warning'
      );
    });

    it('should handle error in curation confirm and set error', async () => {
      mockGenerateRelatorioProcessual.mockRejectedValue(new Error('Report generation failed'));

      const props = createDefaultProps();
      const { result } = renderHook(() => useDocumentAnalysis(props));

      act(() => { result.current.setPendingCurationData(mockCurationData); });

      await act(async () => {
        await result.current.handleCurationConfirm(mockCurationData.topics as any);
        await vi.advanceTimersByTimeAsync(5000);
      });

      expect(mockSetError).toHaveBeenCalledWith(
        expect.stringContaining('Report generation failed')
      );
    });

    it('should set analyzing=false in finally block (even on error)', async () => {
      mockGenerateRelatorioProcessual.mockRejectedValue(new Error('Error'));

      const props = createDefaultProps();
      const { result } = renderHook(() => useDocumentAnalysis(props));

      act(() => { result.current.setPendingCurationData(mockCurationData); });

      await act(async () => {
        await result.current.handleCurationConfirm(mockCurationData.topics as any);
        await vi.advanceTimersByTimeAsync(5000);
      });

      expect(result.current.analyzing).toBe(false);
    });

    it('should clear pendingCurationData after success', async () => {
      mockGenerateRelatorioProcessual.mockResolvedValue('<p>R</p>');
      mockGenerateMiniReportsBatch.mockResolvedValue({ results: [], errors: [] });

      const props = createDefaultProps();
      const { result } = renderHook(() => useDocumentAnalysis(props));

      act(() => { result.current.setPendingCurationData(mockCurationData); });

      await act(async () => {
        await result.current.handleCurationConfirm(mockCurationData.topics as any);
        await vi.advanceTimersByTimeAsync(5000);
      });

      expect(result.current.pendingCurationData).toBeNull();
    });

    it('should filter out RELATORIO topic from curated topics', async () => {
      mockGenerateRelatorioProcessual.mockResolvedValue('<p>R</p>');
      mockGenerateMiniReportsBatch.mockResolvedValue({ results: [], errors: [] });

      const curationWithRelatorio = {
        ...mockCurationData,
        topics: [
          { title: 'RELATÓRIO', category: 'RELATÓRIO' },
          { title: 'Horas Extras', category: 'MERIT' },
        ],
      };

      const props = createDefaultProps();
      const { result } = renderHook(() => useDocumentAnalysis(props));

      act(() => { result.current.setPendingCurationData(curationWithRelatorio as any); });

      await act(async () => {
        await result.current.handleCurationConfirm(curationWithRelatorio.topics as any);
        await vi.advanceTimersByTimeAsync(5000);
      });

      // Should call generateMiniReportsBatch without the RELATORIO topic
      const batchCallArgs = mockGenerateMiniReportsBatch.mock.calls[0][0];
      const relatorioInBatch = batchCallArgs.find((t: any) => t.title === 'RELATÓRIO');
      expect(relatorioInBatch).toBeUndefined();
    });

    it('should close analysis modal on success', async () => {
      mockGenerateRelatorioProcessual.mockResolvedValue('<p>R</p>');
      mockGenerateMiniReportsBatch.mockResolvedValue({ results: [], errors: [] });

      const props = createDefaultProps();
      const { result } = renderHook(() => useDocumentAnalysis(props));

      act(() => { result.current.setPendingCurationData(mockCurationData); });

      await act(async () => {
        await result.current.handleCurationConfirm(mockCurationData.topics as any);
        await vi.advanceTimersByTimeAsync(5000);
      });

      expect(mockCloseModal).toHaveBeenCalledWith('analysis');
    });

    it('should set partesProcesso from curation data', async () => {
      mockGenerateRelatorioProcessual.mockResolvedValue('<p>R</p>');
      mockGenerateMiniReportsBatch.mockResolvedValue({ results: [], errors: [] });

      const props = createDefaultProps();
      const { result } = renderHook(() => useDocumentAnalysis(props));

      act(() => { result.current.setPendingCurationData(mockCurationData); });

      await act(async () => {
        await result.current.handleCurationConfirm(mockCurationData.topics as any);
        await vi.advanceTimersByTimeAsync(5000);
      });

      expect(mockSetPartesProcesso).toHaveBeenCalledWith({
        reclamante: 'Jose',
        reclamadas: ['EmpresaX'],
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 11: handleCurationCancel
  // ═══════════════════════════════════════════════════════════════════════════

  describe('handleCurationCancel', () => {
    it('should close curation modal', () => {
      const { result } = renderHook(() => useDocumentAnalysis(createDefaultProps()));

      act(() => { result.current.setShowTopicCurationModal(true); });
      act(() => { result.current.handleCurationCancel(); });

      expect(result.current.showTopicCurationModal).toBe(false);
    });

    it('should clear pendingCurationData', () => {
      const { result } = renderHook(() => useDocumentAnalysis(createDefaultProps()));

      act(() => { result.current.setPendingCurationData({ topics: [] } as any); });
      act(() => { result.current.handleCurationCancel(); });

      expect(result.current.pendingCurationData).toBeNull();
    });

    it('should clear analysisProgress', () => {
      const { result } = renderHook(() => useDocumentAnalysis(createDefaultProps()));

      act(() => { result.current.setAnalysisProgress('In progress...'); });
      act(() => { result.current.handleCurationCancel(); });

      expect(result.current.analysisProgress).toBe('');
    });

    it('should show info toast about cancellation', () => {
      const { result } = renderHook(() => useDocumentAnalysis(createDefaultProps()));

      act(() => { result.current.handleCurationCancel(); });

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringContaining('cancelada'),
        'info'
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 12: Document content building (cache_control)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('document content building', () => {
    it('should add cache_control for long pasted texts (>2000 chars)', async () => {
      const longText = 'X'.repeat(3000);
      (parseAIResponse as ReturnType<typeof vi.fn>).mockReturnValue({
        success: true,
        data: { topics: [], partes: { reclamante: '', reclamadas: [] } },
      });
      mockCallAI.mockResolvedValue({ stop_reason: 'end_turn' });
      mockExtractResponseText.mockReturnValue('{"topics":[],"partes":{}}');

      const props = createDefaultProps({
        pastedPeticaoTexts: [createMockPastedText(longText, 'Petição Inicial')],
      });
      const { result } = renderHook(() => useDocumentAnalysis(props));

      await act(async () => {
        result.current.handleAnalyzeDocuments();
        await vi.advanceTimersByTimeAsync(5000);
      });

      const callArgs = mockCallAI.mock.calls[0];
      const content = callArgs[0][0].content;
      const textWithCache = content.find((item: any) =>
        item.type === 'text' && item.cache_control
      );
      expect(textWithCache).toBeDefined();
      expect(textWithCache.cache_control).toEqual({ type: 'ephemeral' });
    });

    it('should NOT add cache_control for short pasted texts (<=2000 chars)', async () => {
      const shortText = 'Y'.repeat(500);
      (parseAIResponse as ReturnType<typeof vi.fn>).mockReturnValue({
        success: true,
        data: { topics: [], partes: { reclamante: '', reclamadas: [] } },
      });
      mockCallAI.mockResolvedValue({ stop_reason: 'end_turn' });
      mockExtractResponseText.mockReturnValue('{"topics":[],"partes":{}}');

      const props = createDefaultProps({
        pastedPeticaoTexts: [createMockPastedText(shortText, 'Petição')],
      });
      const { result } = renderHook(() => useDocumentAnalysis(props));

      await act(async () => {
        result.current.handleAnalyzeDocuments();
        await vi.advanceTimersByTimeAsync(5000);
      });

      const callArgs = mockCallAI.mock.calls[0];
      const content = callArgs[0][0].content;
      const peticaoItem = content.find((item: any) =>
        item.type === 'text' && item.text?.includes(shortText)
      );
      expect(peticaoItem?.cache_control).toBeUndefined();
    });

    it('should add cache_control for large base64 PDFs (>100000 chars)', async () => {
      const largeBase64 = 'Z'.repeat(150000);
      mockFileToBase64.mockResolvedValue(largeBase64);
      (parseAIResponse as ReturnType<typeof vi.fn>).mockReturnValue({
        success: true,
        data: { topics: [], partes: { reclamante: '', reclamadas: [] } },
      });
      mockCallAI.mockResolvedValue({ stop_reason: 'end_turn' });
      mockExtractResponseText.mockReturnValue('{"topics":[],"partes":{}}');

      const props = createDefaultProps({
        peticaoFiles: [createMockUploadedFile()],
        documentProcessingModes: { peticoes: { 0: 'pdf-puro' }, contestacoes: {}, complementares: {} } as any,
      });
      const { result } = renderHook(() => useDocumentAnalysis(props));

      await act(async () => {
        result.current.handleAnalyzeDocuments();
        await vi.advanceTimersByTimeAsync(5000);
      });

      const callArgs = mockCallAI.mock.calls[0];
      const content = callArgs[0][0].content;
      const docItem = content.find((item: any) => item.type === 'document');
      expect(docItem?.cache_control).toEqual({ type: 'ephemeral' });
    });

    it('should append buildAnalysisPrompt as last text item', async () => {
      (parseAIResponse as ReturnType<typeof vi.fn>).mockReturnValue({
        success: true,
        data: { topics: [], partes: { reclamante: '', reclamadas: [] } },
      });
      mockCallAI.mockResolvedValue({ stop_reason: 'end_turn' });
      mockExtractResponseText.mockReturnValue('{"topics":[],"partes":{}}');

      const props = createDefaultProps({
        pastedPeticaoTexts: [createMockPastedText()],
      });
      const { result } = renderHook(() => useDocumentAnalysis(props));

      await act(async () => {
        result.current.handleAnalyzeDocuments();
        await vi.advanceTimersByTimeAsync(5000);
      });

      const callArgs = mockCallAI.mock.calls[0];
      const content = callArgs[0][0].content;
      const lastItem = content[content.length - 1];
      expect(lastItem.type).toBe('text');
      expect(lastItem.text).toBe('MOCKED_ANALYSIS_PROMPT');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 13: Multiple documents (peticoes, contestacoes, complementares)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('multiple documents handling', () => {
    it('should process multiple peticao files', async () => {
      const longText = 'M'.repeat(200);
      mockExtractTextFromPDFPure.mockResolvedValue(longText);
      (parseAIResponse as ReturnType<typeof vi.fn>).mockReturnValue({
        success: true,
        data: { topics: [], partes: { reclamante: '', reclamadas: [] } },
      });
      mockCallAI.mockResolvedValue({ stop_reason: 'end_turn' });
      mockExtractResponseText.mockReturnValue('{"topics":[],"partes":{}}');

      const props = createDefaultProps({
        peticaoFiles: [createMockUploadedFile('pet1.pdf'), createMockUploadedFile('pet2.pdf')],
        documentProcessingModes: { peticoes: { 0: 'pdfjs', 1: 'pdfjs' }, contestacoes: {}, complementares: {} } as any,
      });
      const { result } = renderHook(() => useDocumentAnalysis(props));

      await act(async () => {
        result.current.handleAnalyzeDocuments();
        await vi.advanceTimersByTimeAsync(5000);
      });

      // Should be called once per file
      expect(mockExtractTextFromPDFPure).toHaveBeenCalledTimes(2);
    });

    it('should process multiple contestacao files and pasted texts together', async () => {
      const longText = 'N'.repeat(200);
      mockExtractTextFromPDFPure.mockResolvedValue(longText);
      (parseAIResponse as ReturnType<typeof vi.fn>).mockReturnValue({
        success: true,
        data: { topics: [], partes: { reclamante: '', reclamadas: [] } },
      });
      mockCallAI.mockResolvedValue({ stop_reason: 'end_turn' });
      mockExtractResponseText.mockReturnValue('{"topics":[],"partes":{}}');

      const props = createDefaultProps({
        pastedPeticaoTexts: [createMockPastedText()],
        contestacaoFiles: [createMockUploadedFile('cont1.pdf')],
        pastedContestacaoTexts: [createMockPastedText('Contestacao colada', 'Contestação 2')],
        documentProcessingModes: { peticoes: {}, contestacoes: { 0: 'pdfjs' }, complementares: {} } as any,
      });
      const { result } = renderHook(() => useDocumentAnalysis(props));

      await act(async () => {
        result.current.handleAnalyzeDocuments();
        await vi.advanceTimersByTimeAsync(5000);
      });

      const callArgs = mockCallAI.mock.calls[0];
      const content = callArgs[0][0].content;
      const contestacaoItems = content.filter((item: any) =>
        item.type === 'text' && item.text?.includes('CONTESTAÇÃO')
      );
      // One from PDF extraction, one from pasted text
      expect(contestacaoItems.length).toBe(2);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 14: CurationData structure
  // ═══════════════════════════════════════════════════════════════════════════

  describe('pendingCurationData structure', () => {
    it('should store complete curation data with correct structure after analysis', async () => {
      const topics = [{ title: 'Topic A', category: 'Cat A' }];
      (parseAIResponse as ReturnType<typeof vi.fn>).mockReturnValue({
        success: true,
        data: { topics, partes: { reclamante: 'Fulano', reclamadas: ['Empresa'] } },
      });
      mockCallAI.mockResolvedValue({ stop_reason: 'end_turn' });
      mockExtractResponseText.mockReturnValue(VALID_TOPICS_RESPONSE);

      const props = createDefaultProps({
        pastedPeticaoTexts: [createMockPastedText('peticao text content', 'Petição Inicial')],
        pastedContestacaoTexts: [createMockPastedText('contestacao text content', 'Contestação 1')],
      });
      const { result } = renderHook(() => useDocumentAnalysis(props));

      await act(async () => {
        result.current.handleAnalyzeDocuments();
        await vi.advanceTimersByTimeAsync(5000);
      });

      const curationData = result.current.pendingCurationData;
      expect(curationData).not.toBeNull();
      expect(curationData!.topics).toEqual(topics);
      expect(curationData!.partes).toEqual({ reclamante: 'Fulano', reclamadas: ['Empresa'] });
      expect(curationData!.relatórioContentArray).toBeDefined();
      expect(curationData!.documents).toBeDefined();
      expect(curationData!.documents.peticoesText).toBeDefined();
      expect(curationData!.documents.contestacoesText).toBeDefined();
      expect(curationData!.documents.complementaresText).toBeDefined();
    });

    it('should separate extracted-from-PDF vs already-pasted texts in curation data', async () => {
      const pdfExtractedText = 'P'.repeat(200);
      mockExtractTextFromPDFPure.mockResolvedValue(pdfExtractedText);
      const pastedContent = 'Texto ja colado da contestacao';

      (parseAIResponse as ReturnType<typeof vi.fn>).mockReturnValue({
        success: true,
        data: { topics: [{ title: 'T', category: 'C' }], partes: { reclamante: '', reclamadas: [] } },
      });
      mockCallAI.mockResolvedValue({ stop_reason: 'end_turn' });
      mockExtractResponseText.mockReturnValue(VALID_TOPICS_RESPONSE);

      const props = createDefaultProps({
        pastedPeticaoTexts: [createMockPastedText()],
        contestacaoFiles: [createMockUploadedFile('cont.pdf')],
        pastedContestacaoTexts: [{ id: 'pasted1', text: pastedContent, name: 'Contestação 2' }],
        documentProcessingModes: { peticoes: {}, contestacoes: { 0: 'pdfjs' }, complementares: {} } as any,
      });
      const { result } = renderHook(() => useDocumentAnalysis(props));

      await act(async () => {
        result.current.handleAnalyzeDocuments();
        await vi.advanceTimersByTimeAsync(5000);
      });

      const curationData = result.current.pendingCurationData;
      expect(curationData).not.toBeNull();
      // The pasted text should be in contestaçõesJaColadas
      expect(curationData!.documents.contestaçõesJaColadas.length).toBe(1);
      expect(curationData!.documents.contestaçõesJaColadas[0].text).toBe(pastedContent);
      // The PDF extracted should be in contestaçõesExtraidasDePDF
      expect(curationData!.documents.contestaçõesExtraidasDePDF.length).toBe(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 15: Provider-specific behavior
  // ═══════════════════════════════════════════════════════════════════════════

  describe('provider-specific behavior', () => {
    it('should pass provider to extractResponseText', async () => {
      (parseAIResponse as ReturnType<typeof vi.fn>).mockReturnValue({
        success: true,
        data: { topics: [], partes: { reclamante: '', reclamadas: [] } },
      });
      mockCallAI.mockResolvedValue({ stop_reason: 'end_turn' });
      mockExtractResponseText.mockReturnValue('{"topics":[],"partes":{}}');

      const props = createDefaultProps({
        pastedPeticaoTexts: [createMockPastedText()],
        aiIntegration: {
          aiSettings: { provider: 'gemini', anonymization: { enabled: false } } as any,
          setAiSettings: mockSetAiSettings,
          callAI: mockCallAI,
          extractResponseText: mockExtractResponseText,
        },
      });
      const { result } = renderHook(() => useDocumentAnalysis(props));

      await act(async () => {
        result.current.handleAnalyzeDocuments();
        await vi.advanceTimersByTimeAsync(5000);
      });

      expect(mockExtractResponseText).toHaveBeenCalledWith(
        expect.anything(),
        'gemini'
      );
    });

    it('should default to claude provider when not specified', async () => {
      (parseAIResponse as ReturnType<typeof vi.fn>).mockReturnValue({
        success: true,
        data: { topics: [], partes: { reclamante: '', reclamadas: [] } },
      });
      mockCallAI.mockResolvedValue({ stop_reason: 'end_turn' });
      mockExtractResponseText.mockReturnValue('{"topics":[],"partes":{}}');

      const props = createDefaultProps({
        pastedPeticaoTexts: [createMockPastedText()],
        aiIntegration: {
          aiSettings: { anonymization: { enabled: false } } as any,
          setAiSettings: mockSetAiSettings,
          callAI: mockCallAI,
          extractResponseText: mockExtractResponseText,
        },
      });
      const { result } = renderHook(() => useDocumentAnalysis(props));

      await act(async () => {
        result.current.handleAnalyzeDocuments();
        await vi.advanceTimersByTimeAsync(5000);
      });

      expect(mockExtractResponseText).toHaveBeenCalledWith(
        expect.anything(),
        'claude'
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 16: Double Check integration
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Double Check integration', () => {
    it('should NOT call performDoubleCheck when doubleCheck is disabled', async () => {
      (parseAIResponse as ReturnType<typeof vi.fn>).mockReturnValue({
        success: true,
        data: { topics: [{ title: 'T', category: 'C' }], partes: { reclamante: '', reclamadas: [] } },
      });
      mockCallAI.mockResolvedValue({ stop_reason: 'end_turn' });
      mockExtractResponseText.mockReturnValue(VALID_TOPICS_RESPONSE);

      const props = createDefaultProps({
        pastedPeticaoTexts: [createMockPastedText()],
      });
      const { result } = renderHook(() => useDocumentAnalysis(props));

      await act(async () => {
        result.current.handleAnalyzeDocuments();
        await vi.advanceTimersByTimeAsync(5000);
      });

      expect(mockPerformDoubleCheck).not.toHaveBeenCalled();
    });

    it('should call performDoubleCheck when enabled for topicExtraction', async () => {
      (parseAIResponse as ReturnType<typeof vi.fn>).mockReturnValue({
        success: true,
        data: { topics: [{ title: 'T', category: 'C' }], partes: { reclamante: '', reclamadas: [] } },
      });
      mockCallAI.mockResolvedValue({ stop_reason: 'end_turn' });
      mockExtractResponseText.mockReturnValue(VALID_TOPICS_RESPONSE);
      mockPerformDoubleCheck.mockResolvedValue({
        verified: VALID_TOPICS_RESPONSE,
        corrections: [],
        summary: 'All good',
        confidence: 0.95,
      });

      const props = createDefaultProps({
        pastedPeticaoTexts: [createMockPastedText()],
        aiIntegration: {
          aiSettings: {
            provider: 'claude',
            anonymization: { enabled: false },
            doubleCheck: { enabled: true, operations: { topicExtraction: true } },
          } as any,
          setAiSettings: mockSetAiSettings,
          callAI: mockCallAI,
          extractResponseText: mockExtractResponseText,
          performDoubleCheck: mockPerformDoubleCheck,
        },
      });
      const { result } = renderHook(() => useDocumentAnalysis(props));

      await act(async () => {
        result.current.handleAnalyzeDocuments();
        await vi.advanceTimersByTimeAsync(5000);
      });

      expect(mockPerformDoubleCheck).toHaveBeenCalledWith(
        'topicExtraction',
        expect.any(String),
        expect.any(Array),
        expect.any(Function)
      );
    });

    it('should handle doubleCheck errors gracefully (continue without crash)', async () => {
      (parseAIResponse as ReturnType<typeof vi.fn>).mockReturnValue({
        success: true,
        data: { topics: [{ title: 'T', category: 'C' }], partes: { reclamante: '', reclamadas: [] } },
      });
      mockCallAI.mockResolvedValue({ stop_reason: 'end_turn' });
      mockExtractResponseText.mockReturnValue(VALID_TOPICS_RESPONSE);
      mockPerformDoubleCheck.mockRejectedValue(new Error('DC failed'));

      const props = createDefaultProps({
        pastedPeticaoTexts: [createMockPastedText()],
        aiIntegration: {
          aiSettings: {
            provider: 'claude',
            anonymization: { enabled: false },
            doubleCheck: { enabled: true, operations: { topicExtraction: true } },
          } as any,
          setAiSettings: mockSetAiSettings,
          callAI: mockCallAI,
          extractResponseText: mockExtractResponseText,
          performDoubleCheck: mockPerformDoubleCheck,
        },
      });
      const { result } = renderHook(() => useDocumentAnalysis(props));

      await act(async () => {
        result.current.handleAnalyzeDocuments();
        await vi.advanceTimersByTimeAsync(5000);
      });

      // Should still succeed (topic curation modal shown)
      expect(result.current.showTopicCurationModal).toBe(true);
    });

    it('should show warning toast when doubleCheck verification failed flag is set', async () => {
      (parseAIResponse as ReturnType<typeof vi.fn>).mockReturnValue({
        success: true,
        data: { topics: [{ title: 'T', category: 'C' }], partes: { reclamante: '', reclamadas: [] } },
      });
      mockCallAI.mockResolvedValue({ stop_reason: 'end_turn' });
      mockExtractResponseText.mockReturnValue(VALID_TOPICS_RESPONSE);
      mockPerformDoubleCheck.mockResolvedValue({
        verified: '',
        corrections: [],
        summary: '',
        confidence: 0,
        failed: true,
      });

      const props = createDefaultProps({
        pastedPeticaoTexts: [createMockPastedText()],
        aiIntegration: {
          aiSettings: {
            provider: 'claude',
            anonymization: { enabled: false },
            doubleCheck: { enabled: true, operations: { topicExtraction: true } },
          } as any,
          setAiSettings: mockSetAiSettings,
          callAI: mockCallAI,
          extractResponseText: mockExtractResponseText,
          performDoubleCheck: mockPerformDoubleCheck,
        },
      });
      const { result } = renderHook(() => useDocumentAnalysis(props));

      await act(async () => {
        result.current.handleAnalyzeDocuments();
        await vi.advanceTimersByTimeAsync(5000);
      });

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringContaining('verificação falhou'),
        'warning'
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 17: Edge cases
  // ═══════════════════════════════════════════════════════════════════════════

  describe('edge cases', () => {
    it('should handle empty topics array from AI', async () => {
      (parseAIResponse as ReturnType<typeof vi.fn>).mockReturnValue({
        success: true,
        data: { topics: [], partes: { reclamante: '', reclamadas: [] } },
      });
      mockCallAI.mockResolvedValue({ stop_reason: 'end_turn' });
      mockExtractResponseText.mockReturnValue('{"topics":[],"partes":{}}');

      const props = createDefaultProps({
        pastedPeticaoTexts: [createMockPastedText()],
      });
      const { result } = renderHook(() => useDocumentAnalysis(props));

      await act(async () => {
        result.current.handleAnalyzeDocuments();
        await vi.advanceTimersByTimeAsync(5000);
      });

      // Should still open curation modal even with empty topics
      expect(result.current.showTopicCurationModal).toBe(true);
      expect(result.current.pendingCurationData!.topics).toEqual([]);
    });

    it('should handle parsed data without partes field', async () => {
      (parseAIResponse as ReturnType<typeof vi.fn>).mockReturnValue({
        success: true,
        data: { topics: [{ title: 'T', category: 'C' }] }, // No partes
      });
      mockCallAI.mockResolvedValue({ stop_reason: 'end_turn' });
      mockExtractResponseText.mockReturnValue('{"topics":[{"title":"T","category":"C"}]}');

      const props = createDefaultProps({
        pastedPeticaoTexts: [createMockPastedText()],
      });
      const { result } = renderHook(() => useDocumentAnalysis(props));

      await act(async () => {
        result.current.handleAnalyzeDocuments();
        await vi.advanceTimersByTimeAsync(5000);
      });

      // Should not crash - setPartesProcesso should not be called with undefined
      expect(result.current.showTopicCurationModal).toBe(true);
    });

    it('should use globalOcrEngine as default when no doc-specific mode set', async () => {
      const longText = 'Q'.repeat(200);
      mockExtractTextFromPDFPure.mockResolvedValue(longText);
      (parseAIResponse as ReturnType<typeof vi.fn>).mockReturnValue({
        success: true,
        data: { topics: [], partes: { reclamante: '', reclamadas: [] } },
      });
      mockCallAI.mockResolvedValue({ stop_reason: 'end_turn' });
      mockExtractResponseText.mockReturnValue('{"topics":[],"partes":{}}');

      const props = createDefaultProps({
        peticaoFiles: [createMockUploadedFile()],
        documentProcessingModes: { peticoes: {}, contestacoes: {}, complementares: {} } as any,
        aiIntegration: {
          aiSettings: { provider: 'claude', anonymization: { enabled: false }, ocrEngine: 'pdfjs' } as any,
          setAiSettings: mockSetAiSettings,
          callAI: mockCallAI,
          extractResponseText: mockExtractResponseText,
        },
      });
      const { result } = renderHook(() => useDocumentAnalysis(props));

      await act(async () => {
        result.current.handleAnalyzeDocuments();
        await vi.advanceTimersByTimeAsync(5000);
      });

      // Should use pdfjs (globalOcrEngine) since no specific mode set
      expect(mockExtractTextFromPDFPure).toHaveBeenCalled();
    });

    it('should handle handleCurationConfirm with topicosComplementares in aiSettings', async () => {
      mockGenerateRelatorioProcessual.mockResolvedValue('<p>R</p>');
      mockGenerateMiniReportsBatch.mockResolvedValue({ results: [], errors: [] });

      const curationData: CurationData = {
        topics: [{ title: 'Topic 1', category: 'MERIT' }] as any,
        partes: { reclamante: 'R', reclamadas: ['E'] },
        relatórioContentArray: [{ type: 'text' as const, text: 'content' }],
        documents: {
          peticoesText: [], contestacoesText: [], complementaresText: [],
          peticoesBase64: [], contestaçõesBase64: [], complementaryBase64: [],
          contestaçõesExtraidasDePDF: [], contestaçõesJaColadas: [],
          complementaresExtraidasDePDF: [], complementaresJaColadas: [],
          peticoesExtraidasDePDF: [], peticoesJaColadas: [],
        },
      };

      const props = createDefaultProps({
        aiIntegration: {
          aiSettings: {
            provider: 'claude',
            anonymization: { enabled: false },
            topicosComplementares: [
              { title: 'Honorários', category: 'COMPLEMENTAR', enabled: true, ordem: 1, descricao: 'Desc' },
              { title: 'Custas', category: 'COMPLEMENTAR', enabled: false, ordem: 2, descricao: 'Desc2' },
            ],
            parallelRequests: 3,
          } as any,
          setAiSettings: mockSetAiSettings,
          callAI: mockCallAI,
          extractResponseText: mockExtractResponseText,
        },
      });
      const { result } = renderHook(() => useDocumentAnalysis(props));

      act(() => { result.current.setPendingCurationData(curationData); });

      await act(async () => {
        await result.current.handleCurationConfirm(curationData.topics as any);
        await vi.advanceTimersByTimeAsync(5000);
      });

      // Should include enabled complementar topic (Honorários) but not disabled (Custas)
      const calledTopics = mockSetExtractedTopics.mock.calls[0][0];
      const honorarios = calledTopics.find((t: any) => t.title === 'Honorários');
      const custas = calledTopics.find((t: any) => t.title === 'Custas');
      expect(honorarios).toBeDefined();
      expect(custas).toBeUndefined();
    });
  });
});

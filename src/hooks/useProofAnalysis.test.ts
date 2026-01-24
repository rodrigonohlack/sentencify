/**
 * @file useProofAnalysis.test.ts
 * @description Testes para o hook useProofAnalysis
 * @version 1.38.39
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useProofAnalysis } from './useProofAnalysis';
import type {
  UseProofAnalysisProps,
  AIIntegrationForProofs,
  ProofManagerForAnalysis,
  DocumentServicesForProofs,
  StorageForProofs,
} from './useProofAnalysis';
import type { Topic, AnalyzedDocuments, ProofFile, ProofText } from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// MOCKS
// ═══════════════════════════════════════════════════════════════════════════

const mockOpenDoubleCheckReview = vi.fn();
const mockSetDoubleCheckResult = vi.fn();
let mockDoubleCheckResult: { operation: string; finalResult: string; selected: string[] } | null = null;

vi.mock('../stores/useUIStore', () => ({
  useUIStore: vi.fn((selector) => {
    const state = {
      openDoubleCheckReview: mockOpenDoubleCheckReview,
      doubleCheckResult: mockDoubleCheckResult,
      setDoubleCheckResult: mockSetDoubleCheckResult,
    };
    return selector(state);
  }),
}));

vi.mock('../utils/text', () => ({
  anonymizeText: vi.fn((text: string) => `[ANONIMIZADO] ${text}`),
}));

vi.mock('../utils/double-check-utils', () => ({
  getCorrectionDescription: vi.fn(() => 'Descrição da correção'),
}));

vi.mock('../components/ai/AIAssistantComponents', () => ({
  isOralProof: vi.fn((name: string) => name.toLowerCase().includes('depoimento') || name.toLowerCase().includes('oral')),
}));

vi.mock('../prompts/oral-proof-analysis', () => ({
  ORAL_PROOF_ANALYSIS_INSTRUCTIONS: 'INSTRUÇÕES DE PROVA ORAL',
  buildOralProofSynthesisSection: vi.fn(() => 'SEÇÃO DE SÍNTESE DE PROVA ORAL'),
}));

vi.mock('../prompts/proof-analysis-prompts', () => ({
  buildProofAnalysisPrompt: vi.fn(() => 'PROMPT DE ANÁLISE DE PROVA DOCUMENTAL'),
}));

describe('useProofAnalysis', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // MOCK FACTORIES
  // ═══════════════════════════════════════════════════════════════════════════

  const createMockProofFile = (overrides: Partial<ProofFile> = {}): ProofFile => ({
    id: 'proof-1',
    name: 'Laudo Pericial.pdf',
    type: 'pdf',
    file: new File(['test content'], 'test.pdf', { type: 'application/pdf' }),
    uploadDate: new Date().toISOString(),
    isPdf: true,
    ...overrides,
  });

  const createMockProofText = (overrides: Partial<ProofText> = {}): ProofText => ({
    id: 'proof-text-1',
    name: 'Prova Textual',
    type: 'text',
    text: 'Conteúdo da prova textual para análise.',
    uploadDate: new Date().toISOString(),
    ...overrides,
  });

  const createMockTopic = (overrides: Partial<Topic> = {}): Topic => ({
    id: 'topic-1',
    title: 'Horas Extras',
    category: 'MÉRITO',
    relatorio: 'Mini-relatório sobre horas extras.',
    ...overrides,
  });

  const createMockAnalyzedDocuments = (overrides: Partial<AnalyzedDocuments> = {}): AnalyzedDocuments => ({
    peticoes: [],
    peticoesText: [{ id: 'pet-1', name: 'Petição Inicial', text: 'Texto da petição inicial.' }],
    contestacoes: [],
    contestacoesText: [{ id: 'cont-1', name: 'Contestação 1', text: 'Texto da contestação.' }],
    complementares: [],
    complementaresText: [],
    ...overrides,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createMockAIIntegration = (overrides: Partial<AIIntegrationForProofs> = {}): AIIntegrationForProofs => ({
    aiSettings: {
      doubleCheck: {
        enabled: false,
        provider: 'claude',
        model: 'claude-sonnet-4-20250514',
        operations: {
          topicExtraction: false,
          dispositivo: false,
          sentenceReview: false,
          factsComparison: false,
          proofAnalysis: false,
          quickPrompt: false,
        },
      },
    } as unknown as AIIntegrationForProofs['aiSettings'],
    callAI: vi.fn().mockResolvedValue('Análise da prova: documento relevante para o caso.'),
    performDoubleCheck: vi.fn(),
    ...overrides,
  });

  const createMockProofManager = (overrides: Partial<ProofManagerForAnalysis> = {}): ProofManagerForAnalysis => ({
    addAnalyzingProof: vi.fn(),
    removeAnalyzingProof: vi.fn(),
    extractedProofTexts: {},
    proofTopicLinks: {},
    proofProcessingModes: {},
    addProofAnalysis: vi.fn(),
    ...overrides,
  });

  const createMockDocumentServices = (): DocumentServicesForProofs => ({
    extractTextFromPDFPure: vi.fn(),
    extractTextFromPDFWithClaudeVision: vi.fn(),
    extractTextFromPDFWithTesseract: vi.fn(),
  });

  const createMockStorage = (): StorageForProofs => ({
    fileToBase64: vi.fn().mockResolvedValue('base64encodedcontent'),
  });

  let mockProps: UseProofAnalysisProps;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDoubleCheckResult = null;

    mockProps = {
      aiIntegration: createMockAIIntegration(),
      proofManager: createMockProofManager(),
      documentServices: createMockDocumentServices(),
      storage: createMockStorage(),
      selectedTopics: [],
      analyzedDocuments: createMockAnalyzedDocuments(),
      setError: vi.fn(),
      showToast: vi.fn(),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // BASIC FUNCTIONALITY TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Basic Functionality', () => {
    it('should return analyzeProof function', () => {
      const { result } = renderHook(() => useProofAnalysis(mockProps));

      expect(result.current.analyzeProof).toBeDefined();
      expect(typeof result.current.analyzeProof).toBe('function');
    });

    it('should add and remove proof from analyzing state', async () => {
      const proof = createMockProofText();
      const { result } = renderHook(() => useProofAnalysis(mockProps));

      await act(async () => {
        await result.current.analyzeProof(proof, 'livre');
      });

      expect(mockProps.proofManager.addAnalyzingProof).toHaveBeenCalledWith('proof-text-1');
      expect(mockProps.proofManager.removeAnalyzingProof).toHaveBeenCalledWith('proof-text-1');
    });

    it('should clear error before starting analysis', async () => {
      const proof = createMockProofText();
      const { result } = renderHook(() => useProofAnalysis(mockProps));

      await act(async () => {
        await result.current.analyzeProof(proof, 'livre');
      });

      expect(mockProps.setError).toHaveBeenCalledWith('');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEXT PROOF ANALYSIS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Text Proof Analysis', () => {
    it('should analyze text proof with libre analysis type', async () => {
      const proof = createMockProofText({ text: 'Conteúdo da prova textual.' });
      const { result } = renderHook(() => useProofAnalysis(mockProps));

      await act(async () => {
        await result.current.analyzeProof(proof, 'livre');
      });

      expect(mockProps.aiIntegration.callAI).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: expect.arrayContaining([
              expect.objectContaining({
                type: 'text',
                text: expect.stringContaining('Conteúdo da prova textual'),
              }),
            ]),
          }),
        ]),
        expect.objectContaining({
          maxTokens: 20000,
          useInstructions: true,
        })
      );
    });

    it('should analyze text proof with custom instructions', async () => {
      const proof = createMockProofText();
      const { result } = renderHook(() => useProofAnalysis(mockProps));

      await act(async () => {
        await result.current.analyzeProof(proof, 'livre', 'Foque nos valores monetários.');
      });

      expect(mockProps.aiIntegration.callAI).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            content: expect.arrayContaining([
              expect.objectContaining({
                text: expect.stringContaining('Foque nos valores monetários'),
              }),
            ]),
          }),
        ]),
        expect.any(Object)
      );
    });

    it('should store analysis result', async () => {
      const proof = createMockProofText();
      const { result } = renderHook(() => useProofAnalysis(mockProps));

      await act(async () => {
        await result.current.analyzeProof(proof, 'livre');
      });

      expect(mockProps.proofManager.addProofAnalysis).toHaveBeenCalledWith(
        'proof-text-1',
        expect.objectContaining({
          type: 'livre',
          result: expect.any(String),
        })
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PDF PROOF ANALYSIS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('PDF Proof Analysis', () => {
    it('should analyze PDF proof with extracted text (pdfjs mode)', async () => {
      const proof = createMockProofFile({ id: 'pdf-proof-1' });
      mockProps.proofManager = createMockProofManager({
        extractedProofTexts: { 'pdf-proof-1': 'Texto extraído do PDF.' },
        proofProcessingModes: { 'pdf-proof-1': 'pdfjs' },
      });

      const { result } = renderHook(() => useProofAnalysis(mockProps));

      await act(async () => {
        await result.current.analyzeProof(proof, 'livre');
      });

      expect(mockProps.aiIntegration.callAI).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            content: expect.arrayContaining([
              expect.objectContaining({
                type: 'text',
                text: expect.stringContaining('texto extraído do PDF'),
              }),
            ]),
          }),
        ]),
        expect.any(Object)
      );
    });

    it('should send PDF binary in pdf-puro mode without anonymization', async () => {
      const proof = createMockProofFile({ id: 'pdf-proof-2' });
      mockProps.proofManager = createMockProofManager({
        proofProcessingModes: { 'pdf-proof-2': 'pdf-puro' },
      });

      const { result } = renderHook(() => useProofAnalysis(mockProps));

      await act(async () => {
        await result.current.analyzeProof(proof, 'livre');
      });

      expect(mockProps.storage.fileToBase64).toHaveBeenCalled();
      expect(mockProps.aiIntegration.callAI).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            content: expect.arrayContaining([
              expect.objectContaining({
                type: 'document',
                source: expect.objectContaining({
                  type: 'base64',
                  media_type: 'application/pdf',
                }),
              }),
            ]),
          }),
        ]),
        expect.any(Object)
      );
    });

    it('should show error when PDF file is missing in pdf-puro mode', async () => {
      const proof = createMockProofFile({ id: 'pdf-proof-3', file: undefined });
      mockProps.proofManager = createMockProofManager({
        proofProcessingModes: { 'pdf-proof-3': 'pdf-puro' },
      });

      const { result } = renderHook(() => useProofAnalysis(mockProps));

      await act(async () => {
        await result.current.analyzeProof(proof, 'livre');
      });

      expect(mockProps.showToast).toHaveBeenCalledWith('Arquivo PDF não encontrado.', 'error');
      expect(mockProps.aiIntegration.callAI).not.toHaveBeenCalled();
    });

    it('should show error when text not extracted', async () => {
      const proof = createMockProofFile({ id: 'pdf-proof-4' });
      mockProps.proofManager = createMockProofManager({
        extractedProofTexts: {},
        proofProcessingModes: { 'pdf-proof-4': 'pdfjs' },
      });

      const { result } = renderHook(() => useProofAnalysis(mockProps));

      await act(async () => {
        await result.current.analyzeProof(proof, 'livre');
      });

      expect(mockProps.showToast).toHaveBeenCalledWith(
        'Texto não extraído. Extraia o texto da prova antes de analisar.',
        'error'
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ANONYMIZATION TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Anonymization', () => {
    it('should anonymize text proof when enabled', async () => {
      const proof = createMockProofText({ text: 'João Silva trabalhou na empresa.' });
      mockProps.aiIntegration = createMockAIIntegration({
        aiSettings: {
          anonymization: { enabled: true, nomesUsuario: [] },
        } as unknown as AIIntegrationForProofs['aiSettings'],
      });

      const { result } = renderHook(() => useProofAnalysis(mockProps));

      await act(async () => {
        await result.current.analyzeProof(proof, 'livre');
      });

      // anonymizeText mock returns '[ANONIMIZADO] text'
      expect(mockProps.aiIntegration.callAI).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            content: expect.arrayContaining([
              expect.objectContaining({
                text: expect.stringContaining('[ANONIMIZADO]'),
              }),
            ]),
          }),
        ]),
        expect.any(Object)
      );
    });

    it('should use extracted text for PDF in pdf-puro mode with anonymization', async () => {
      const proof = createMockProofFile({ id: 'pdf-anon-1' });
      mockProps.proofManager = createMockProofManager({
        extractedProofTexts: { 'pdf-anon-1': 'Texto extraído do PDF para anonimizar.' },
        proofProcessingModes: { 'pdf-anon-1': 'pdf-puro' },
      });
      mockProps.aiIntegration = createMockAIIntegration({
        aiSettings: {
          anonymization: { enabled: true, nomesUsuario: [] },
        } as unknown as AIIntegrationForProofs['aiSettings'],
      });

      const { result } = renderHook(() => useProofAnalysis(mockProps));

      await act(async () => {
        await result.current.analyzeProof(proof, 'livre');
      });

      // Should NOT send binary PDF, should use extracted text
      expect(mockProps.storage.fileToBase64).not.toHaveBeenCalled();
      expect(mockProps.aiIntegration.callAI).toHaveBeenCalled();
    });

    it('should show error when pdf-puro with anonymization but no extracted text', async () => {
      const proof = createMockProofFile({ id: 'pdf-anon-2' });
      mockProps.proofManager = createMockProofManager({
        extractedProofTexts: {},
        proofProcessingModes: { 'pdf-anon-2': 'pdf-puro' },
      });
      mockProps.aiIntegration = createMockAIIntegration({
        aiSettings: {
          anonymization: { enabled: true, nomesUsuario: [] },
        } as unknown as AIIntegrationForProofs['aiSettings'],
      });

      const { result } = renderHook(() => useProofAnalysis(mockProps));

      await act(async () => {
        await result.current.analyzeProof(proof, 'livre');
      });

      expect(mockProps.showToast).toHaveBeenCalledWith(
        'Anonimizacao ativa: extraia o texto primeiro.',
        'error'
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CONTEXTUAL ANALYSIS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Contextual Analysis', () => {
    it('should include process documents in contextual analysis', async () => {
      const proof = createMockProofText();
      mockProps.analyzedDocuments = createMockAnalyzedDocuments({
        peticoesText: [{ id: 'pet-1', name: 'Petição', text: 'Pedido de horas extras.' }],
        contestacoesText: [{ id: 'cont-1', name: 'Contestação 1', text: 'Contestação das horas extras.' }],
      });

      const { result } = renderHook(() => useProofAnalysis(mockProps));

      await act(async () => {
        await result.current.analyzeProof(proof, 'contextual');
      });

      expect(mockProps.aiIntegration.callAI).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            content: expect.arrayContaining([
              expect.objectContaining({
                text: expect.stringContaining('PETICAO_INICIAL'),
              }),
            ]),
          }),
        ]),
        expect.any(Object)
      );
    });

    it('should use only mini-relatorios when option is enabled', async () => {
      const proof = createMockProofText({ id: 'proof-mini' });
      const topic = createMockTopic({ title: 'Horas Extras', relatorio: 'Mini-relatório detalhado.' });
      mockProps.selectedTopics = [topic];
      mockProps.proofManager = createMockProofManager({
        proofTopicLinks: { 'proof-mini': ['Horas Extras'] },
      });

      const { result } = renderHook(() => useProofAnalysis(mockProps));

      await act(async () => {
        await result.current.analyzeProof(proof, 'contextual', '', true);
      });

      expect(mockProps.aiIntegration.callAI).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            content: expect.arrayContaining([
              expect.objectContaining({
                text: expect.stringContaining('Mini-relatório detalhado'),
              }),
            ]),
          }),
        ]),
        expect.any(Object)
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // LINKED TOPICS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Linked Topics', () => {
    it('should include linked topics in libre analysis when requested', async () => {
      const proof = createMockProofText({ id: 'proof-linked' });
      const topic = createMockTopic({ title: 'Férias', relatorio: 'Mini-relatório de férias.' });
      mockProps.selectedTopics = [topic];
      mockProps.proofManager = createMockProofManager({
        proofTopicLinks: { 'proof-linked': ['Férias'] },
      });

      const { result } = renderHook(() => useProofAnalysis(mockProps));

      await act(async () => {
        await result.current.analyzeProof(proof, 'livre', '', false, true);
      });

      expect(mockProps.aiIntegration.callAI).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            content: expect.arrayContaining([
              expect.objectContaining({
                text: expect.stringContaining('TOPICOS VINCULADOS'),
              }),
            ]),
          }),
        ]),
        expect.any(Object)
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ORAL PROOF TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Oral Proof Detection', () => {
    it('should use oral proof prompt for depoimento', async () => {
      const proof = createMockProofText({
        name: 'Depoimento da Testemunha',
        text: 'A testemunha declarou que...',
      });

      const { result } = renderHook(() => useProofAnalysis(mockProps));

      await act(async () => {
        await result.current.analyzeProof(proof, 'contextual');
      });

      expect(mockProps.aiIntegration.callAI).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            content: expect.arrayContaining([
              expect.objectContaining({
                text: expect.stringContaining('INSTRUÇÕES DE PROVA ORAL'),
              }),
            ]),
          }),
        ]),
        expect.any(Object)
      );
    });

    it('should use documentary proof prompt for regular documents', async () => {
      const proof = createMockProofText({
        name: 'Laudo Pericial',
        text: 'O perito constatou que...',
      });

      const { result } = renderHook(() => useProofAnalysis(mockProps));

      await act(async () => {
        await result.current.analyzeProof(proof, 'contextual');
      });

      expect(mockProps.aiIntegration.callAI).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            content: expect.arrayContaining([
              expect.objectContaining({
                text: expect.stringContaining('PROMPT DE ANÁLISE DE PROVA DOCUMENTAL'),
              }),
            ]),
          }),
        ]),
        expect.any(Object)
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ATTACHMENTS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Attachments', () => {
    it('should include text attachments with XML delimiters', async () => {
      const proof = createMockProofText({
        attachments: [
          { id: 'att-1', name: 'Impugnação', type: 'text', text: 'Impugnação ao laudo.', uploadDate: new Date().toISOString() },
        ],
      });

      const { result } = renderHook(() => useProofAnalysis(mockProps));

      await act(async () => {
        await result.current.analyzeProof(proof, 'livre');
      });

      expect(mockProps.aiIntegration.callAI).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            content: expect.arrayContaining([
              expect.objectContaining({
                text: expect.stringContaining('<anexo numero="1"'),
              }),
            ]),
          }),
        ]),
        expect.any(Object)
      );
    });

    it('should include PDF attachment with extracted text', async () => {
      const proof = createMockProofText({
        attachments: [
          {
            id: 'att-pdf-1',
            name: 'Anexo PDF',
            type: 'pdf',
            file: new File([''], 'anexo.pdf'),
            extractedText: 'Texto extraído do anexo.',
            uploadDate: new Date().toISOString(),
          },
        ],
      });

      const { result } = renderHook(() => useProofAnalysis(mockProps));

      await act(async () => {
        await result.current.analyzeProof(proof, 'livre');
      });

      expect(mockProps.aiIntegration.callAI).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            content: expect.arrayContaining([
              expect.objectContaining({
                text: expect.stringContaining('Texto extraído do anexo'),
              }),
            ]),
          }),
        ]),
        expect.any(Object)
      );
    });

    it('should include XML instructions when attachments present', async () => {
      const proof = createMockProofText({
        attachments: [
          { id: 'att-2', name: 'Anexo', type: 'text', text: 'Anexo texto.', uploadDate: new Date().toISOString() },
        ],
      });

      const { result } = renderHook(() => useProofAnalysis(mockProps));

      await act(async () => {
        await result.current.analyzeProof(proof, 'livre');
      });

      expect(mockProps.aiIntegration.callAI).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            content: expect.arrayContaining([
              expect.objectContaining({
                text: expect.stringContaining('IMPORTANTE: O documento está organizado com delimitadores XML'),
              }),
            ]),
          }),
        ]),
        expect.any(Object)
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DOUBLE CHECK TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Double Check Integration', () => {
    it('should perform double check when enabled', async () => {
      const proof = createMockProofText();
      mockProps.aiIntegration = createMockAIIntegration({
        aiSettings: {
          doubleCheck: {
            enabled: true,
            provider: 'claude',
            model: 'claude-sonnet-4-20250514',
            operations: { topicExtraction: false, dispositivo: false, sentenceReview: false, factsComparison: false, proofAnalysis: true, quickPrompt: false },
          },
        } as unknown as AIIntegrationForProofs['aiSettings'],
        performDoubleCheck: vi.fn().mockResolvedValue({
          verified: 'Análise verificada.',
          corrections: [],
          summary: 'Nenhuma correção necessária.',
          confidence: 0.95,
        }),
      });

      const { result } = renderHook(() => useProofAnalysis(mockProps));

      await act(async () => {
        await result.current.analyzeProof(proof, 'livre');
      });

      expect(mockProps.aiIntegration.performDoubleCheck).toHaveBeenCalledWith(
        'proofAnalysis',
        expect.any(String),
        expect.any(Array)
      );
    });

    it('should not perform double check when disabled', async () => {
      const proof = createMockProofText();
      mockProps.aiIntegration = createMockAIIntegration({
        aiSettings: {
          doubleCheck: { enabled: false, provider: 'claude', model: 'claude-sonnet-4-20250514', operations: { topicExtraction: false, dispositivo: false, sentenceReview: false, factsComparison: false, proofAnalysis: false, quickPrompt: false } },
        } as unknown as AIIntegrationForProofs['aiSettings'],
      });

      const { result } = renderHook(() => useProofAnalysis(mockProps));

      await act(async () => {
        await result.current.analyzeProof(proof, 'livre');
      });

      expect(mockProps.aiIntegration.performDoubleCheck).not.toHaveBeenCalled();
    });

    it('should open review modal when corrections found', async () => {
      // This test verifies that openDoubleCheckReview is called with corrections
      // We use a custom implementation that immediately resolves the pending promise
      const proof = createMockProofText();

      // Override the openDoubleCheckReview to be a no-op for this test
      mockOpenDoubleCheckReview.mockImplementation(() => {
        // No-op - the useEffect will handle the result when we set mockDoubleCheckResult
      });

      mockProps.aiIntegration = createMockAIIntegration({
        aiSettings: {
          doubleCheck: {
            enabled: true,
            provider: 'claude',
            model: 'claude-sonnet-4-20250514',
            operations: { topicExtraction: false, dispositivo: false, sentenceReview: false, factsComparison: false, proofAnalysis: true, quickPrompt: false },
          },
        } as unknown as AIIntegrationForProofs['aiSettings'],
        performDoubleCheck: vi.fn().mockResolvedValue({
          verified: 'Análise corrigida.',
          corrections: [
            { type: 'factual', item: 'Data', reason: 'Data incorreta', suggestion: 'Corrigir data' },
          ],
          summary: 'Uma correção encontrada.',
          confidence: 0.85,
        }),
      });

      const { result, rerender } = renderHook(() => useProofAnalysis(mockProps));

      // Create promise to track analysis completion
      // @ts-expect-error -- tracking variable for async test
      let _analysisComplete = false;

      // Start analysis in a non-blocking way
      act(() => {
        result.current.analyzeProof(proof, 'livre').then(() => {
          _analysisComplete = true;
        });
      });

      // Wait for modal to be opened
      await waitFor(() => {
        expect(mockOpenDoubleCheckReview).toHaveBeenCalled();
      }, { timeout: 2000 });

      // Simulate user decision by setting the result and triggering rerender
      mockDoubleCheckResult = {
        operation: 'proofAnalysis',
        finalResult: 'Análise corrigida.',
        selected: ['proofAnalysis-0-factual'],
      };

      // Trigger the useEffect by re-rendering
      rerender();

      // Wait for analysis to complete
      await waitFor(() => {
        expect(mockProps.proofManager.addProofAnalysis).toHaveBeenCalled();
      }, { timeout: 2000 });

      expect(mockOpenDoubleCheckReview).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'proofAnalysis',
          corrections: expect.arrayContaining([
            expect.objectContaining({ type: 'factual' }),
          ]),
        })
      );
    });

    it('should continue with original result on double check error', async () => {
      // Reset mocks to ensure clean state
      vi.clearAllMocks();
      mockDoubleCheckResult = null;

      const proof = createMockProofText();
      const localProps: UseProofAnalysisProps = {
        aiIntegration: createMockAIIntegration({
          aiSettings: {
            doubleCheck: {
              enabled: true,
              provider: 'claude',
              model: 'claude-sonnet-4-20250514',
              operations: { topicExtraction: false, dispositivo: false, sentenceReview: false, factsComparison: false, proofAnalysis: true, quickPrompt: false },
            },
          } as unknown as AIIntegrationForProofs['aiSettings'],
          performDoubleCheck: vi.fn().mockRejectedValue(new Error('Double check failed')),
        }),
        proofManager: createMockProofManager(),
        documentServices: createMockDocumentServices(),
        storage: createMockStorage(),
        selectedTopics: [],
        analyzedDocuments: createMockAnalyzedDocuments(),
        setError: vi.fn(),
        showToast: vi.fn(),
      };

      const { result } = renderHook(() => useProofAnalysis(localProps));

      await act(async () => {
        await result.current.analyzeProof(proof, 'livre');
      });

      // Should still save result
      expect(localProps.proofManager.addProofAnalysis).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ERROR HANDLING TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Error Handling', () => {
    it('should set error when AI call fails', async () => {
      // Reset mocks to ensure clean state
      vi.clearAllMocks();
      mockDoubleCheckResult = null;

      const proof = createMockProofText();
      const localProps: UseProofAnalysisProps = {
        aiIntegration: createMockAIIntegration({
          callAI: vi.fn().mockRejectedValue(new Error('API error')),
        }),
        proofManager: createMockProofManager(),
        documentServices: createMockDocumentServices(),
        storage: createMockStorage(),
        selectedTopics: [],
        analyzedDocuments: createMockAnalyzedDocuments(),
        setError: vi.fn(),
        showToast: vi.fn(),
      };

      const { result } = renderHook(() => useProofAnalysis(localProps));

      await act(async () => {
        await result.current.analyzeProof(proof, 'livre');
      });

      expect(localProps.setError).toHaveBeenCalledWith('Erro ao analisar prova: API error');
    });

    it('should remove proof from analyzing on error', async () => {
      // Reset mocks to ensure clean state
      vi.clearAllMocks();
      mockDoubleCheckResult = null;

      const proof = createMockProofText();
      const localProps: UseProofAnalysisProps = {
        aiIntegration: createMockAIIntegration({
          callAI: vi.fn().mockRejectedValue(new Error('API error')),
        }),
        proofManager: createMockProofManager(),
        documentServices: createMockDocumentServices(),
        storage: createMockStorage(),
        selectedTopics: [],
        analyzedDocuments: createMockAnalyzedDocuments(),
        setError: vi.fn(),
        showToast: vi.fn(),
      };

      const { result } = renderHook(() => useProofAnalysis(localProps));

      await act(async () => {
        await result.current.analyzeProof(proof, 'livre');
      });

      expect(localProps.proofManager.removeAnalyzingProof).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DOCUMENT CONTENT ARRAY TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Document Content Building', () => {
    it('should include peticoesText with XML tags', async () => {
      // Reset mocks to ensure clean state
      vi.clearAllMocks();
      mockDoubleCheckResult = null;

      const proof = createMockProofText();
      const mockCallAI = vi.fn().mockResolvedValue('Análise da prova.');
      const localProps: UseProofAnalysisProps = {
        aiIntegration: createMockAIIntegration({ callAI: mockCallAI }),
        proofManager: createMockProofManager(),
        documentServices: createMockDocumentServices(),
        storage: createMockStorage(),
        selectedTopics: [],
        analyzedDocuments: createMockAnalyzedDocuments({
          peticoesText: [
            { id: 'pet-1', name: 'Petição Inicial', text: 'Texto da petição inicial.' },
            { id: 'pet-2', name: 'Emenda', text: 'Texto da emenda.' },
          ],
        }),
        setError: vi.fn(),
        showToast: vi.fn(),
      };

      const { result } = renderHook(() => useProofAnalysis(localProps));

      await act(async () => {
        await result.current.analyzeProof(proof, 'contextual');
      });

      const callArgs = mockCallAI.mock.calls[0][0];
      const content = callArgs[0].content;
      const peticaoContent = content.find((c: { text?: string }) => c.text?.includes('PETICAO_INICIAL'));
      expect(peticaoContent).toBeDefined();
    });

    it('should include contestacoesText with XML tags', async () => {
      // Reset mocks to ensure clean state
      vi.clearAllMocks();
      mockDoubleCheckResult = null;

      const proof = createMockProofText();
      const mockCallAI = vi.fn().mockResolvedValue('Análise da prova.');
      const localProps: UseProofAnalysisProps = {
        aiIntegration: createMockAIIntegration({ callAI: mockCallAI }),
        proofManager: createMockProofManager(),
        documentServices: createMockDocumentServices(),
        storage: createMockStorage(),
        selectedTopics: [],
        analyzedDocuments: createMockAnalyzedDocuments({
          contestacoesText: [{ id: 'cont-1', name: 'Contestação 1', text: 'Contestação completa.' }],
        }),
        setError: vi.fn(),
        showToast: vi.fn(),
      };

      const { result } = renderHook(() => useProofAnalysis(localProps));

      await act(async () => {
        await result.current.analyzeProof(proof, 'contextual');
      });

      const callArgs = mockCallAI.mock.calls[0][0];
      const content = callArgs[0].content;
      const contestacaoContent = content.find((c: { text?: string }) => c.text?.includes('CONTESTACAO'));
      expect(contestacaoContent).toBeDefined();
    });

    it('should add cache_control for large texts', async () => {
      // Reset mocks to ensure clean state
      vi.clearAllMocks();
      mockDoubleCheckResult = null;

      const proof = createMockProofText();
      const largeText = 'A'.repeat(3000); // > 2000 chars threshold
      const mockCallAI = vi.fn().mockResolvedValue('Análise da prova.');
      const localProps: UseProofAnalysisProps = {
        aiIntegration: createMockAIIntegration({ callAI: mockCallAI }),
        proofManager: createMockProofManager(),
        documentServices: createMockDocumentServices(),
        storage: createMockStorage(),
        selectedTopics: [],
        analyzedDocuments: createMockAnalyzedDocuments({
          peticoesText: [{ id: 'pet-large', name: 'Petição', text: largeText }],
        }),
        setError: vi.fn(),
        showToast: vi.fn(),
      };

      const { result } = renderHook(() => useProofAnalysis(localProps));

      await act(async () => {
        await result.current.analyzeProof(proof, 'contextual');
      });

      const callArgs = mockCallAI.mock.calls[0][0];
      const content = callArgs[0].content;
      const peticaoContent = content.find((c: { text?: string }) => c.text?.includes('PETICAO_INICIAL'));
      expect(peticaoContent?.cache_control).toEqual({ type: 'ephemeral' });
    });
  });
});

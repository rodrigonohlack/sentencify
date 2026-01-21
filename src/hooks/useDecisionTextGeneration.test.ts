/**
 * @file useDecisionTextGeneration.test.ts
 * @description Testes para o hook useDecisionTextGeneration
 * @version 1.38.39
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useDecisionTextGeneration } from './useDecisionTextGeneration';
import type {
  UseDecisionTextGenerationProps,
  AIIntegrationForDecisionText,
  ProofManagerForDecisionText,
  ChatAssistantForDecisionText,
  ModelLibraryForDecisionText,
  AnalyzedDocuments,
} from './useDecisionTextGeneration';
import type { Topic, QuillInstance, InsertMode } from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// MOCKS
// ═══════════════════════════════════════════════════════════════════════════

// Mock useUIStore
const mockOpenDoubleCheckReview = vi.fn();
const mockSetDoubleCheckResult = vi.fn();
let mockDoubleCheckResult: { operation: string; selected: string[]; finalResult: string } | null = null;

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

// Mock buildChatContext
vi.mock('../utils/chat-context-builder', () => ({
  buildChatContext: vi.fn().mockResolvedValue([
    { type: 'text', text: 'Mock chat context' }
  ]),
}));

// Mock context helpers - usar mockImplementation para retornar objeto novo a cada chamada
vi.mock('../utils/context-helpers', () => ({
  prepareDocumentsContext: vi.fn().mockImplementation(() => ({
    contentArray: [],
    flags: { hasPeticao: false, hasContestacoes: false, hasComplementares: false }
  })),
  prepareProofsContext: vi.fn().mockImplementation(() => Promise.resolve({
    proofDocuments: [],
    proofsContext: '',
    hasProofs: false
  })),
}));

// Mock color-stripper
vi.mock('../utils/color-stripper', () => ({
  stripInlineColors: vi.fn((html: string) => html),
}));

// Mock text utils
vi.mock('../utils/text', () => ({
  normalizeHTMLSpacing: vi.fn((html: string) => html),
}));

// Mock double-check-utils
vi.mock('../utils/double-check-utils', () => ({
  getCorrectionDescription: vi.fn(() => 'Mock correction description'),
}));

// Mock sanitizeQuillHTML
vi.mock('./useQuillEditor', () => ({
  sanitizeQuillHTML: vi.fn((html: string) => html),
}));

describe('useDecisionTextGeneration', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // MOCK FACTORIES
  // ═══════════════════════════════════════════════════════════════════════════

  const createMockTopic = (title: string = 'Horas Extras', category: 'PRELIMINAR' | 'PREJUDICIAL' | 'MÉRITO' | 'RELATÓRIO' | 'DISPOSITIVO' = 'MÉRITO'): Topic => ({
    id: `topic-${title.toLowerCase().replace(/\s/g, '-')}`,
    title,
    category,
    relatorio: `Relatório de ${title}`,
    fundamentacao: '',
    editedRelatorio: '',
    editedFundamentacao: '',
    editedContent: '',
  });

  const createMockQuillInstance = (): QuillInstance => ({
    root: {
      innerHTML: '<p>Conteúdo existente</p>',
      innerText: 'Conteúdo existente',
    },
    getLength: vi.fn().mockReturnValue(20),
    insertText: vi.fn(),
    clipboard: {
      dangerouslyPasteHTML: vi.fn(),
    },
  } as unknown as QuillInstance);

  const createMockAiIntegration = (): AIIntegrationForDecisionText => ({
    aiInstruction: 'Gere um texto sobre horas extras',
    aiInstructionModel: 'Gere um modelo de texto',
    aiGeneratedText: '',
    aiGeneratedTextModel: '',
    aiSettings: {
      anonymization: { enabled: false },
      doubleCheck: {
        enabled: false,
        operations: { quickPrompt: false },
      },
    },
    setGeneratingAi: vi.fn(),
    setGeneratingAiModel: vi.fn(),
    setAiGeneratedText: vi.fn(),
    setAiGeneratedTextModel: vi.fn(),
    setAiInstruction: vi.fn(),
    setAiInstructionModel: vi.fn(),
    callAI: vi.fn().mockResolvedValue('<p>Texto gerado pela IA</p>'),
    performDoubleCheck: vi.fn().mockResolvedValue({
      verified: '<p>Texto verificado</p>',
      corrections: [],
      summary: 'Nenhuma correção necessária',
      confidence: 0.95,
    }),
  });

  const createMockProofManager = (): ProofManagerForDecisionText => ({
    proofs: [],
  });

  const createMockChatAssistant = (): ChatAssistantForDecisionText => ({
    lastResponse: null,
    send: vi.fn().mockResolvedValue({ success: true, response: '<p>Resposta do chat</p>' }),
    updateLastAssistantMessage: vi.fn(),
  });

  const createMockModelLibrary = (): ModelLibraryForDecisionText => ({
    newModel: {
      title: 'Modelo de Horas Extras',
      category: 'Mérito',
      content: '',
    },
    setNewModel: vi.fn(),
  });

  const createMockAnalyzedDocuments = (): AnalyzedDocuments => ({
    peticoes: [],
    peticoesText: [],
    contestacoes: [],
    contestacoesText: [],
    complementares: [],
    complementaresText: [],
  });

  const createMockProps = (overrides: Partial<UseDecisionTextGenerationProps> = {}): UseDecisionTextGenerationProps => {
    const quillRef = { current: createMockQuillInstance() };
    const modelEditorRef = { current: createMockQuillInstance() };

    return {
      aiIntegration: createMockAiIntegration(),
      proofManager: createMockProofManager(),
      chatAssistant: createMockChatAssistant(),
      modelLibrary: createMockModelLibrary(),
      analyzedDocuments: createMockAnalyzedDocuments(),
      editorRef: quillRef,
      modelEditorRef: modelEditorRef,
      editingTopic: createMockTopic(),
      setEditingTopic: vi.fn(),
      selectedTopics: [createMockTopic()],
      topicContextScope: 'current',
      storage: {
        fileToBase64: vi.fn().mockResolvedValue('base64-content'),
      },
      closeModal: vi.fn(),
      setError: vi.fn(),
      sanitizeHTML: vi.fn((html: string) => html),
      ...overrides,
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockDoubleCheckResult = null as { operation: string; selected: string[]; finalResult: string } | null;
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // BASIC FUNCTIONALITY TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Basic Functionality', () => {
    it('should return all expected functions', () => {
      const props = createMockProps();
      const { result } = renderHook(() => useDecisionTextGeneration(props));

      expect(result.current.generateAiText).toBeDefined();
      expect(result.current.insertAiText).toBeDefined();
      expect(result.current.buildContextForChat).toBeDefined();
      expect(result.current.handleInsertChatResponse).toBeDefined();
      expect(result.current.handleSendChatMessage).toBeDefined();
      expect(result.current.generateAiTextForModel).toBeDefined();
      expect(result.current.insertAiTextModel).toBeDefined();
    });

    it('should have all functions as callable', () => {
      const props = createMockProps();
      const { result } = renderHook(() => useDecisionTextGeneration(props));

      expect(typeof result.current.generateAiText).toBe('function');
      expect(typeof result.current.insertAiText).toBe('function');
      expect(typeof result.current.buildContextForChat).toBe('function');
      expect(typeof result.current.handleInsertChatResponse).toBe('function');
      expect(typeof result.current.handleSendChatMessage).toBe('function');
      expect(typeof result.current.generateAiTextForModel).toBe('function');
      expect(typeof result.current.insertAiTextModel).toBe('function');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GENERATE AI TEXT TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('generateAiText', () => {
    it('should show error when instruction is empty', async () => {
      const props = createMockProps();
      props.aiIntegration.aiInstruction = '';
      const { result } = renderHook(() => useDecisionTextGeneration(props));

      await act(async () => {
        await result.current.generateAiText();
      });

      expect(props.setError).toHaveBeenCalledWith('Digite uma instrução para a IA');
      expect(props.aiIntegration.callAI).not.toHaveBeenCalled();
    });

    it('should show error when instruction is whitespace only', async () => {
      const props = createMockProps();
      props.aiIntegration.aiInstruction = '   ';
      const { result } = renderHook(() => useDecisionTextGeneration(props));

      await act(async () => {
        await result.current.generateAiText();
      });

      expect(props.setError).toHaveBeenCalledWith('Digite uma instrução para a IA');
    });

    it('should set generating state during AI call', async () => {
      const props = createMockProps();
      const { result } = renderHook(() => useDecisionTextGeneration(props));

      await act(async () => {
        await result.current.generateAiText();
      });

      expect(props.aiIntegration.setGeneratingAi).toHaveBeenCalledWith(true);
      expect(props.aiIntegration.setGeneratingAi).toHaveBeenCalledWith(false);
    });

    it('should clear previous generated text before generating', async () => {
      const props = createMockProps();
      const { result } = renderHook(() => useDecisionTextGeneration(props));

      await act(async () => {
        await result.current.generateAiText();
      });

      expect(props.aiIntegration.setAiGeneratedText).toHaveBeenCalledWith('');
    });

    it('should call AI with correct parameters', async () => {
      const props = createMockProps();
      const { result } = renderHook(() => useDecisionTextGeneration(props));

      await act(async () => {
        await result.current.generateAiText();
      });

      expect(props.aiIntegration.callAI).toHaveBeenCalledTimes(1);
      const callArgs = (props.aiIntegration.callAI as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(callArgs[0][0].role).toBe('user');
      expect(callArgs[1]).toMatchObject({
        maxTokens: 4000,
        useInstructions: true,
        logMetrics: true,
        temperature: 0.5,
        topP: 0.9,
        topK: 80,
      });
    });

    it('should set generated text on success', async () => {
      const props = createMockProps();
      (props.aiIntegration.callAI as ReturnType<typeof vi.fn>).mockResolvedValue('<p>Texto gerado</p>');
      const { result } = renderHook(() => useDecisionTextGeneration(props));

      await act(async () => {
        await result.current.generateAiText();
      });

      expect(props.aiIntegration.setAiGeneratedText).toHaveBeenCalledWith('<p>Texto gerado</p>');
      expect(props.setError).toHaveBeenCalledWith('');
    });

    it('should handle AI call error', async () => {
      const props = createMockProps();
      (props.aiIntegration.callAI as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('API Error'));
      const { result } = renderHook(() => useDecisionTextGeneration(props));

      await act(async () => {
        await result.current.generateAiText();
      });

      expect(props.setError).toHaveBeenCalledWith('Erro ao gerar texto com IA: API Error');
      expect(props.aiIntegration.setGeneratingAi).toHaveBeenCalledWith(false);
    });

    it('should include current topic context when scope is current', async () => {
      const props = createMockProps();
      props.topicContextScope = 'current';
      const { result } = renderHook(() => useDecisionTextGeneration(props));

      await act(async () => {
        await result.current.generateAiText();
      });

      const callArgs = (props.aiIntegration.callAI as ReturnType<typeof vi.fn>).mock.calls[0];
      const content = callArgs[0][0].content;
      const textContent = content.find((c: { type: string }) => c.type === 'text');
      expect(textContent.text).toContain('CONTEXTO DO TÓPICO');
    });

    it('should include all topics when scope is all', async () => {
      const props = createMockProps();
      props.topicContextScope = 'all';
      props.selectedTopics = [
        createMockTopic('RELATÓRIO', 'RELATÓRIO'),
        createMockTopic('Horas Extras', 'MÉRITO'),
        createMockTopic('DISPOSITIVO', 'DISPOSITIVO'),
      ];
      const { result } = renderHook(() => useDecisionTextGeneration(props));

      await act(async () => {
        await result.current.generateAiText();
      });

      const callArgs = (props.aiIntegration.callAI as ReturnType<typeof vi.fn>).mock.calls[0];
      const content = callArgs[0][0].content;
      const textContent = content.find((c: { type: string }) => c.type === 'text');
      expect(textContent.text).toContain('CONTEXTO COMPLETO DA DECISÃO');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INSERT AI TEXT TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('insertAiText', () => {
    it('should not insert when generated text is empty', () => {
      const props = createMockProps();
      props.aiIntegration.aiGeneratedText = '';
      const { result } = renderHook(() => useDecisionTextGeneration(props));

      act(() => {
        result.current.insertAiText('replace');
      });

      expect(props.setEditingTopic).not.toHaveBeenCalled();
    });

    it('should not insert when editorRef is null', () => {
      const props = createMockProps();
      props.aiIntegration.aiGeneratedText = '<p>Texto</p>';
      props.editorRef = { current: null };
      const { result } = renderHook(() => useDecisionTextGeneration(props));

      act(() => {
        result.current.insertAiText('replace');
      });

      expect(props.setEditingTopic).not.toHaveBeenCalled();
    });

    it('should not insert when editingTopic is null', () => {
      const props = createMockProps();
      props.aiIntegration.aiGeneratedText = '<p>Texto</p>';
      props.editingTopic = null;
      const { result } = renderHook(() => useDecisionTextGeneration(props));

      act(() => {
        result.current.insertAiText('replace');
      });

      expect(props.setEditingTopic).not.toHaveBeenCalled();
    });

    it('should replace content in replace mode', () => {
      const props = createMockProps();
      props.aiIntegration.aiGeneratedText = '<p>Novo texto</p>';
      const { result } = renderHook(() => useDecisionTextGeneration(props));

      act(() => {
        result.current.insertAiText('replace');
      });

      expect(props.editorRef.current!.root.innerHTML).toBe('<p>Novo texto</p>');
      expect(props.setEditingTopic).toHaveBeenCalled();
    });

    it('should append content in append mode', () => {
      const props = createMockProps();
      props.aiIntegration.aiGeneratedText = '<p>Texto adicional</p>';
      const { result } = renderHook(() => useDecisionTextGeneration(props));

      act(() => {
        result.current.insertAiText('append');
      });

      expect(props.editorRef.current!.root.innerHTML).toContain('Texto adicional');
      expect(props.setEditingTopic).toHaveBeenCalled();
    });

    it('should prepend content in prepend mode', () => {
      const props = createMockProps();
      props.aiIntegration.aiGeneratedText = '<p>Texto no início</p>';
      const { result } = renderHook(() => useDecisionTextGeneration(props));

      act(() => {
        result.current.insertAiText('prepend');
      });

      expect(props.editorRef.current!.root.innerHTML).toContain('Texto no início');
      expect(props.setEditingTopic).toHaveBeenCalled();
    });

    it('should close modal after insertion', () => {
      const props = createMockProps();
      props.aiIntegration.aiGeneratedText = '<p>Texto</p>';
      const { result } = renderHook(() => useDecisionTextGeneration(props));

      act(() => {
        result.current.insertAiText('replace');
      });

      expect(props.closeModal).toHaveBeenCalledWith('aiAssistant');
    });

    it('should clear instruction and generated text after insertion', () => {
      const props = createMockProps();
      props.aiIntegration.aiGeneratedText = '<p>Texto</p>';
      const { result } = renderHook(() => useDecisionTextGeneration(props));

      act(() => {
        result.current.insertAiText('replace');
      });

      expect(props.aiIntegration.setAiInstruction).toHaveBeenCalledWith('');
      expect(props.aiIntegration.setAiGeneratedText).toHaveBeenCalledWith('');
    });

    it('should update editingTopic with new fundamentacao', () => {
      const props = createMockProps();
      props.aiIntegration.aiGeneratedText = '<p>Nova fundamentação</p>';
      const { result } = renderHook(() => useDecisionTextGeneration(props));

      act(() => {
        result.current.insertAiText('replace');
      });

      const setTopicCall = (props.setEditingTopic as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(setTopicCall.editedFundamentacao).toBe('<p>Nova fundamentação</p>');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // BUILD CONTEXT FOR CHAT TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('buildContextForChat', () => {
    it('should return empty array when editingTopic is null', async () => {
      const props = createMockProps();
      props.editingTopic = null;
      const { result } = renderHook(() => useDecisionTextGeneration(props));

      let context: unknown[] = [];
      await act(async () => {
        context = await result.current.buildContextForChat('Test message');
      });

      expect(context).toEqual([]);
    });

    it('should call buildChatContext with correct parameters', async () => {
      const { buildChatContext } = await import('../utils/chat-context-builder');
      const props = createMockProps();
      const { result } = renderHook(() => useDecisionTextGeneration(props));

      await act(async () => {
        await result.current.buildContextForChat('Test message', { proofFilter: 'horas' });
      });

      expect(buildChatContext).toHaveBeenCalledWith(expect.objectContaining({
        userMessage: 'Test message',
        options: { proofFilter: 'horas' },
      }));
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLE INSERT CHAT RESPONSE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('handleInsertChatResponse', () => {
    it('should not insert when lastResponse is null', () => {
      const props = createMockProps();
      props.chatAssistant.lastResponse = null;
      const { result } = renderHook(() => useDecisionTextGeneration(props));

      act(() => {
        result.current.handleInsertChatResponse('replace');
      });

      expect(props.setEditingTopic).not.toHaveBeenCalled();
    });

    it('should not insert when editorRef is null', () => {
      const props = createMockProps();
      props.chatAssistant.lastResponse = '<p>Resposta</p>';
      props.editorRef = { current: null };
      const { result } = renderHook(() => useDecisionTextGeneration(props));

      act(() => {
        result.current.handleInsertChatResponse('replace');
      });

      expect(props.setEditingTopic).not.toHaveBeenCalled();
    });

    it('should replace content in replace mode', () => {
      const props = createMockProps();
      props.chatAssistant.lastResponse = '<p>Resposta do chat</p>';
      const { result } = renderHook(() => useDecisionTextGeneration(props));

      act(() => {
        result.current.handleInsertChatResponse('replace');
      });

      expect(props.editorRef.current!.root.innerHTML).toBe('<p>Resposta do chat</p>');
    });

    it('should append content in append mode', () => {
      const props = createMockProps();
      props.chatAssistant.lastResponse = '<p>Resposta adicional</p>';
      const { result } = renderHook(() => useDecisionTextGeneration(props));

      act(() => {
        result.current.handleInsertChatResponse('append');
      });

      expect(props.editorRef.current!.root.innerHTML).toContain('Resposta adicional');
    });

    it('should prepend content in prepend mode', () => {
      const props = createMockProps();
      props.chatAssistant.lastResponse = '<p>Resposta no início</p>';
      const { result } = renderHook(() => useDecisionTextGeneration(props));

      act(() => {
        result.current.handleInsertChatResponse('prepend');
      });

      expect(props.editorRef.current!.root.innerHTML).toContain('Resposta no início');
    });

    it('should update editingTopic with new fundamentacao', () => {
      const props = createMockProps();
      props.chatAssistant.lastResponse = '<p>Nova resposta</p>';
      const { result } = renderHook(() => useDecisionTextGeneration(props));

      act(() => {
        result.current.handleInsertChatResponse('replace');
      });

      const setTopicCall = (props.setEditingTopic as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(setTopicCall.editedFundamentacao).toBe('<p>Nova resposta</p>');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLE SEND CHAT MESSAGE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('handleSendChatMessage', () => {
    it('should send message via chatAssistant', async () => {
      const props = createMockProps();
      const { result } = renderHook(() => useDecisionTextGeneration(props));

      await act(async () => {
        await result.current.handleSendChatMessage('Olá, como posso ajudar?');
      });

      expect(props.chatAssistant.send).toHaveBeenCalledTimes(1);
      const sendCall = (props.chatAssistant.send as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(sendCall[0]).toBe('Olá, como posso ajudar?');
    });

    it('should pass options to context builder', async () => {
      const props = createMockProps();
      const { result } = renderHook(() => useDecisionTextGeneration(props));

      await act(async () => {
        await result.current.handleSendChatMessage('Test', { proofFilter: 'teste' });
      });

      expect(props.chatAssistant.send).toHaveBeenCalled();
    });

    it('should not trigger Double Check when disabled', async () => {
      const props = createMockProps();
      props.aiIntegration.aiSettings!.doubleCheck!.enabled = false;
      const { result } = renderHook(() => useDecisionTextGeneration(props));

      await act(async () => {
        await result.current.handleSendChatMessage('Test message');
      });

      expect(props.aiIntegration.performDoubleCheck).not.toHaveBeenCalled();
    });

    it('should not trigger Double Check when quickPrompt is disabled', async () => {
      const props = createMockProps();
      props.aiIntegration.aiSettings!.doubleCheck!.enabled = true;
      props.aiIntegration.aiSettings!.doubleCheck!.operations!.quickPrompt = false;
      const { result } = renderHook(() => useDecisionTextGeneration(props));

      await act(async () => {
        await result.current.handleSendChatMessage('Test message');
      });

      expect(props.aiIntegration.performDoubleCheck).not.toHaveBeenCalled();
    });

    it('should trigger Double Check when enabled for quickPrompt', async () => {
      const props = createMockProps();
      props.aiIntegration.aiSettings!.doubleCheck!.enabled = true;
      props.aiIntegration.aiSettings!.doubleCheck!.operations!.quickPrompt = true;
      (props.chatAssistant.send as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        response: '<p>Resposta original</p>',
      });
      const { result } = renderHook(() => useDecisionTextGeneration(props));

      // Don't await - this will hang because it waits for user decision
      // Just verify that performDoubleCheck is called
      act(() => {
        result.current.handleSendChatMessage('Test message');
      });

      await waitFor(() => {
        expect(props.aiIntegration.performDoubleCheck).toHaveBeenCalled();
      });
    });

    it('should show verification state while Double Check runs', async () => {
      const props = createMockProps();
      props.aiIntegration.aiSettings!.doubleCheck!.enabled = true;
      props.aiIntegration.aiSettings!.doubleCheck!.operations!.quickPrompt = true;
      (props.chatAssistant.send as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        response: '<p>Resposta original</p>',
      });
      const { result } = renderHook(() => useDecisionTextGeneration(props));

      act(() => {
        result.current.handleSendChatMessage('Test message');
      });

      await waitFor(() => {
        expect(props.chatAssistant.updateLastAssistantMessage).toHaveBeenCalledWith('🔍 Verificando resposta...');
      });
    });

    it('should restore original response when no corrections', async () => {
      const props = createMockProps();
      props.aiIntegration.aiSettings!.doubleCheck!.enabled = true;
      props.aiIntegration.aiSettings!.doubleCheck!.operations!.quickPrompt = true;
      (props.chatAssistant.send as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        response: '<p>Resposta original</p>',
      });
      (props.aiIntegration.performDoubleCheck as ReturnType<typeof vi.fn>).mockResolvedValue({
        verified: '<p>Resposta verificada</p>',
        corrections: [],
        summary: 'OK',
        confidence: 0.95,
      });
      const { result } = renderHook(() => useDecisionTextGeneration(props));

      await act(async () => {
        await result.current.handleSendChatMessage('Test message');
      });

      expect(props.chatAssistant.updateLastAssistantMessage).toHaveBeenLastCalledWith('<p>Resposta original</p>');
    });

    it('should restore original on Double Check error', async () => {
      const props = createMockProps();
      props.aiIntegration.aiSettings!.doubleCheck!.enabled = true;
      props.aiIntegration.aiSettings!.doubleCheck!.operations!.quickPrompt = true;
      (props.chatAssistant.send as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        response: '<p>Resposta original</p>',
      });
      (props.aiIntegration.performDoubleCheck as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('DC Error'));
      const { result } = renderHook(() => useDecisionTextGeneration(props));

      await act(async () => {
        await result.current.handleSendChatMessage('Test message');
      });

      expect(props.chatAssistant.updateLastAssistantMessage).toHaveBeenLastCalledWith('<p>Resposta original</p>');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GENERATE AI TEXT FOR MODEL TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('generateAiTextForModel', () => {
    it('should show error when instruction is empty', async () => {
      const props = createMockProps();
      props.aiIntegration.aiInstructionModel = '';
      const { result } = renderHook(() => useDecisionTextGeneration(props));

      await act(async () => {
        await result.current.generateAiTextForModel();
      });

      expect(props.setError).toHaveBeenCalledWith('Digite uma instrução para a IA');
    });

    it('should show error when callAI is undefined', async () => {
      const props = createMockProps();
      // @ts-expect-error - Testing undefined case
      props.aiIntegration.callAI = undefined;
      const { result } = renderHook(() => useDecisionTextGeneration(props));

      await act(async () => {
        await result.current.generateAiTextForModel();
      });

      expect(props.setError).toHaveBeenCalledWith('Erro interno: sistema de IA não inicializado. Recarregue a página.');
    });

    it('should set generating state during AI call', async () => {
      const props = createMockProps();
      const { result } = renderHook(() => useDecisionTextGeneration(props));

      await act(async () => {
        await result.current.generateAiTextForModel();
      });

      expect(props.aiIntegration.setGeneratingAiModel).toHaveBeenCalledWith(true);
      expect(props.aiIntegration.setGeneratingAiModel).toHaveBeenCalledWith(false);
    });

    it('should clear previous generated text before generating', async () => {
      const props = createMockProps();
      const { result } = renderHook(() => useDecisionTextGeneration(props));

      await act(async () => {
        await result.current.generateAiTextForModel();
      });

      expect(props.aiIntegration.setAiGeneratedTextModel).toHaveBeenCalledWith('');
    });

    it('should call AI with correct parameters for model', async () => {
      const props = createMockProps();
      const { result } = renderHook(() => useDecisionTextGeneration(props));

      await act(async () => {
        await result.current.generateAiTextForModel();
      });

      expect(props.aiIntegration.callAI).toHaveBeenCalledTimes(1);
      const callArgs = (props.aiIntegration.callAI as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(callArgs[1]).toMatchObject({
        maxTokens: 4000,
        useInstructions: true,
        temperature: 0.6,
        topP: 0.9,
        topK: 100,
      });
    });

    it('should include model context in prompt', async () => {
      const props = createMockProps();
      props.modelLibrary.newModel.title = 'Teste de Modelo';
      props.modelLibrary.newModel.category = 'Categoria X';
      const { result } = renderHook(() => useDecisionTextGeneration(props));

      await act(async () => {
        await result.current.generateAiTextForModel();
      });

      const callArgs = (props.aiIntegration.callAI as ReturnType<typeof vi.fn>).mock.calls[0];
      const content = callArgs[0][0].content[0].text;
      expect(content).toContain('Teste de Modelo');
      expect(content).toContain('Categoria X');
    });

    it('should set generated text on success', async () => {
      const props = createMockProps();
      (props.aiIntegration.callAI as ReturnType<typeof vi.fn>).mockResolvedValue('<p>Modelo gerado</p>');
      const { result } = renderHook(() => useDecisionTextGeneration(props));

      await act(async () => {
        await result.current.generateAiTextForModel();
      });

      expect(props.aiIntegration.setAiGeneratedTextModel).toHaveBeenCalledWith('<p>Modelo gerado</p>');
      expect(props.setError).toHaveBeenCalledWith('');
    });

    it('should handle AI call error', async () => {
      const props = createMockProps();
      (props.aiIntegration.callAI as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Model API Error'));
      const { result } = renderHook(() => useDecisionTextGeneration(props));

      await act(async () => {
        await result.current.generateAiTextForModel();
      });

      expect(props.setError).toHaveBeenCalledWith('Erro ao gerar texto com IA: Model API Error');
      expect(props.aiIntegration.setGeneratingAiModel).toHaveBeenCalledWith(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INSERT AI TEXT MODEL TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('insertAiTextModel', () => {
    it('should not insert when generated text is empty', () => {
      const props = createMockProps();
      props.aiIntegration.aiGeneratedTextModel = '';
      const { result } = renderHook(() => useDecisionTextGeneration(props));

      act(() => {
        result.current.insertAiTextModel('replace');
      });

      expect(props.modelLibrary.setNewModel).not.toHaveBeenCalled();
    });

    it('should not insert when modelEditorRef is null', () => {
      const props = createMockProps();
      props.aiIntegration.aiGeneratedTextModel = '<p>Texto</p>';
      props.modelEditorRef = { current: null };
      const { result } = renderHook(() => useDecisionTextGeneration(props));

      act(() => {
        result.current.insertAiTextModel('replace');
      });

      expect(props.modelLibrary.setNewModel).not.toHaveBeenCalled();
    });

    it('should replace content in replace mode', () => {
      const props = createMockProps();
      props.aiIntegration.aiGeneratedTextModel = '<p>Novo modelo</p>';
      const { result } = renderHook(() => useDecisionTextGeneration(props));

      act(() => {
        result.current.insertAiTextModel('replace');
      });

      expect(props.modelEditorRef.current!.root.innerHTML).toBe('<p>Novo modelo</p>');
    });

    it('should append content in append mode', () => {
      const props = createMockProps();
      props.aiIntegration.aiGeneratedTextModel = '<p>Texto adicional</p>';
      const { result } = renderHook(() => useDecisionTextGeneration(props));

      act(() => {
        result.current.insertAiTextModel('append');
      });

      expect(props.modelEditorRef.current!.insertText).toHaveBeenCalled();
      expect(props.modelEditorRef.current!.clipboard.dangerouslyPasteHTML).toHaveBeenCalled();
    });

    it('should prepend content in prepend mode', () => {
      const props = createMockProps();
      props.aiIntegration.aiGeneratedTextModel = '<p>Texto no início</p>';
      const { result } = renderHook(() => useDecisionTextGeneration(props));

      act(() => {
        result.current.insertAiTextModel('prepend');
      });

      expect(props.modelEditorRef.current!.clipboard.dangerouslyPasteHTML).toHaveBeenCalledWith(
        0,
        expect.stringContaining('Texto no início')
      );
    });

    it('should update model content after insertion', () => {
      const props = createMockProps();
      props.aiIntegration.aiGeneratedTextModel = '<p>Novo modelo</p>';
      const { result } = renderHook(() => useDecisionTextGeneration(props));

      act(() => {
        result.current.insertAiTextModel('replace');
      });

      expect(props.modelLibrary.setNewModel).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Modelo de Horas Extras',
        category: 'Mérito',
      }));
    });

    it('should close modal after insertion', () => {
      const props = createMockProps();
      props.aiIntegration.aiGeneratedTextModel = '<p>Texto</p>';
      const { result } = renderHook(() => useDecisionTextGeneration(props));

      act(() => {
        result.current.insertAiTextModel('replace');
      });

      expect(props.closeModal).toHaveBeenCalledWith('aiAssistantModel');
    });

    it('should clear instruction and generated text after insertion', () => {
      const props = createMockProps();
      props.aiIntegration.aiGeneratedTextModel = '<p>Texto</p>';
      const { result } = renderHook(() => useDecisionTextGeneration(props));

      act(() => {
        result.current.insertAiTextModel('replace');
      });

      expect(props.aiIntegration.setAiInstructionModel).toHaveBeenCalledWith('');
      expect(props.aiIntegration.setAiGeneratedTextModel).toHaveBeenCalledWith('');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INSERT MODE EDGE CASES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Insert Mode Edge Cases', () => {
    const modes: InsertMode[] = ['replace', 'append', 'prepend'];

    modes.forEach((mode) => {
      it(`should handle ${mode} mode correctly for insertAiText`, () => {
        const props = createMockProps();
        props.aiIntegration.aiGeneratedText = '<p>Texto</p>';
        const { result } = renderHook(() => useDecisionTextGeneration(props));

        act(() => {
          result.current.insertAiText(mode);
        });

        expect(props.setEditingTopic).toHaveBeenCalled();
        expect(props.closeModal).toHaveBeenCalled();
      });
    });

    modes.forEach((mode) => {
      it(`should handle ${mode} mode correctly for handleInsertChatResponse`, () => {
        const props = createMockProps();
        props.chatAssistant.lastResponse = '<p>Resposta</p>';
        const { result } = renderHook(() => useDecisionTextGeneration(props));

        act(() => {
          result.current.handleInsertChatResponse(mode);
        });

        expect(props.setEditingTopic).toHaveBeenCalled();
      });
    });

    modes.forEach((mode) => {
      it(`should handle ${mode} mode correctly for insertAiTextModel`, () => {
        const props = createMockProps();
        props.aiIntegration.aiGeneratedTextModel = '<p>Modelo</p>';
        const { result } = renderHook(() => useDecisionTextGeneration(props));

        act(() => {
          result.current.insertAiTextModel(mode);
        });

        expect(props.modelLibrary.setNewModel).toHaveBeenCalled();
        expect(props.closeModal).toHaveBeenCalled();
      });
    });
  });
});

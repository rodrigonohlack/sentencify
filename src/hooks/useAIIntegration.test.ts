import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock stores before importing the hook
const mockAddTokenUsage = vi.fn();
const mockSetTokenMetrics = vi.fn();
const mockSetAiSettings = vi.fn();

const defaultMockState = {
  aiSettings: {
    provider: 'claude',
    model: 'claude-sonnet-4-20250514',
    claudeModel: 'claude-sonnet-4-20250514',
    geminiModel: 'gemini-3-flash-preview',
    openaiModel: 'gpt-5.2-chat-latest',
    grokModel: 'grok-4-1-fast-reasoning',
    openaiReasoningLevel: 'medium',
    logThinking: false,
    useExtendedThinking: false,
    thinkingBudget: '10000',
    geminiThinkingLevel: 'high',
    customPrompt: '',
    apiKeys: { claude: 'sk-test-claude', openai: 'sk-test-openai', gemini: 'test-gemini-key', grok: 'xai-test-grok' },
    doubleCheck: {
      enabled: true,
      provider: 'claude' as const,
      model: 'claude-sonnet-4-20250514',
      operations: { topicExtraction: true, dispositivo: true, sentenceReview: true, factsComparison: true, proofAnalysis: true, quickPrompt: true }
    }
  },
  setAiSettings: mockSetAiSettings,
  apiKeys: { claude: 'sk-test-claude', openai: 'sk-test-openai', gemini: 'test-gemini-key', grok: 'xai-test-grok' },
  tokenMetrics: { totalInput: 100, totalOutput: 50, sessionCost: 0.01, history: [] },
  setTokenMetrics: mockSetTokenMetrics,
  addTokenUsage: mockAddTokenUsage,
};

vi.mock('../stores/useAIStore', () => ({
  useAIStore: vi.fn((selector: any) => selector(defaultMockState)),
}));

// Mock prompts
vi.mock('../prompts', () => ({
  AI_INSTRUCTIONS: 'Test AI instructions full',
  AI_INSTRUCTIONS_CORE: 'Test AI instructions core',
  AI_INSTRUCTIONS_SAFETY: 'Test AI instructions safety',
}));

// Mock constants/api
vi.mock('../constants/api', () => ({
  API_BASE: 'http://localhost:3001',
}));

// Mock schemas/ai-responses
vi.mock('../schemas/ai-responses', () => ({
  extractJSON: vi.fn((response: string) => {
    const match = response.match(/```json\s*([\s\S]*?)\s*```/);
    if (match) return match[1].trim();
    try { JSON.parse(response); return response; } catch { return null; }
  }),
  parseAIResponse: vi.fn((jsonStr: string) => {
    try {
      const data = JSON.parse(jsonStr);
      return { success: true, data };
    } catch {
      return { success: false, error: 'Parse error' };
    }
  }),
  DoubleCheckResponseSchema: {},
}));

import { useAIIntegration } from './useAIIntegration';
import { useAIStore } from '../stores/useAIStore';

// ═══════════════════════════════════════════════════════════════════════════
// HELPER: create mock fetch response
// ═══════════════════════════════════════════════════════════════════════════

function createMockResponse(data: unknown, status = 200, ok = true) {
  return {
    ok,
    status,
    json: vi.fn().mockResolvedValue(data),
    text: vi.fn().mockResolvedValue(JSON.stringify(data)),
  };
}

/** Override the useAIStore mock with custom state (merged with defaults) */
function mockStoreWith(overrides: Record<string, unknown>) {
  const customState = {
    ...defaultMockState,
    aiSettings: { ...defaultMockState.aiSettings, ...(overrides.aiSettings || {}) },
    ...overrides,
  };
  vi.mocked(useAIStore).mockImplementation((selector: any) => selector(customState));
}

/** Restore the default store mock */
function restoreDefaultStore() {
  vi.mocked(useAIStore).mockImplementation((selector: any) => selector(defaultMockState));
}

describe('useAIIntegration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    restoreDefaultStore();
    global.fetch = vi.fn();
    // Mock localStorage
    Object.defineProperty(global, 'localStorage', {
      value: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
      writable: true,
    });
  });

  afterEach(() => {
    restoreDefaultStore();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // HOOK INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('hook initialization', () => {
    it('should return all expected functions', () => {
      const { result } = renderHook(() => useAIIntegration());

      expect(typeof result.current.callAI).toBe('function');
      expect(typeof result.current.callLLM).toBe('function');
      expect(typeof result.current.callGeminiAPI).toBe('function');
      expect(typeof result.current.callOpenAIAPI).toBe('function');
      expect(typeof result.current.callGrokAPI).toBe('function');
      expect(typeof result.current.extractResponseText).toBe('function');
      expect(typeof result.current.buildApiRequest).toBe('function');
      expect(typeof result.current.getApiHeaders).toBe('function');
      expect(typeof result.current.convertToGeminiFormat).toBe('function');
      expect(typeof result.current.convertToOpenAIFormat).toBe('function');
      expect(typeof result.current.extractTokenMetrics).toBe('function');
      expect(typeof result.current.performDoubleCheck).toBe('function');
      expect(typeof result.current.logCacheMetrics).toBe('function');
      expect(typeof result.current.getModelDisplayName).toBe('function');
    });

    it('should start with empty AI generation state', () => {
      const { result } = renderHook(() => useAIIntegration());

      expect(result.current.aiInstruction).toBe('');
      expect(result.current.aiGeneratedText).toBe('');
      expect(result.current.generatingAi).toBe(false);
      expect(result.current.aiInstructionModel).toBe('');
      expect(result.current.aiGeneratedTextModel).toBe('');
      expect(result.current.generatingAiModel).toBe(false);
      expect(result.current.generatingKeywords).toBe(false);
      expect(result.current.generatingTitle).toBe(false);
      expect(result.current.relatorioInstruction).toBe('');
      expect(result.current.regeneratingRelatorio).toBe(false);
      expect(result.current.dispositivoText).toBe('');
      expect(result.current.generatingDispositivo).toBe(false);
    });

    it('should return AI settings from store', () => {
      const { result } = renderHook(() => useAIIntegration());

      expect(result.current.aiSettings).toEqual(
        expect.objectContaining({ provider: 'claude' })
      );
    });

    it('should return tokenMetrics from store', () => {
      const { result } = renderHook(() => useAIIntegration());

      expect(result.current.tokenMetrics).toBeDefined();
      expect(result.current.tokenMetrics.totalInput).toBe(100);
      expect(result.current.tokenMetrics.totalOutput).toBe(50);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // AI GENERATION REDUCER (via setters)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('aiGeneration reducer (via setters)', () => {
    it('should set instruction for generic context', () => {
      const { result } = renderHook(() => useAIIntegration());
      act(() => { result.current.setAiInstruction('Write a decision'); });
      expect(result.current.aiInstruction).toBe('Write a decision');
    });

    it('should set generated text for generic context', () => {
      const { result } = renderHook(() => useAIIntegration());
      act(() => { result.current.setAiGeneratedText('Generated text here'); });
      expect(result.current.aiGeneratedText).toBe('Generated text here');
    });

    it('should set generating flag for generic context', () => {
      const { result } = renderHook(() => useAIIntegration());
      act(() => { result.current.setGeneratingAi(true); });
      expect(result.current.generatingAi).toBe(true);
    });

    it('should set instruction for model context', () => {
      const { result } = renderHook(() => useAIIntegration());
      act(() => { result.current.setAiInstructionModel('Model instruction'); });
      expect(result.current.aiInstructionModel).toBe('Model instruction');
    });

    it('should set generated text for model context', () => {
      const { result } = renderHook(() => useAIIntegration());
      act(() => { result.current.setAiGeneratedTextModel('Model generated text'); });
      expect(result.current.aiGeneratedTextModel).toBe('Model generated text');
    });

    it('should set generating for model context', () => {
      const { result } = renderHook(() => useAIIntegration());
      act(() => { result.current.setGeneratingAiModel(true); });
      expect(result.current.generatingAiModel).toBe(true);
    });

    it('should set relatório instruction', () => {
      const { result } = renderHook(() => useAIIntegration());
      act(() => { result.current.setRelatorioInstruction('Relatório prompt'); });
      expect(result.current.relatorioInstruction).toBe('Relatório prompt');
    });

    it('should set regenerating relatório', () => {
      const { result } = renderHook(() => useAIIntegration());
      act(() => { result.current.setRegeneratingRelatorio(true); });
      expect(result.current.regeneratingRelatorio).toBe(true);
    });

    it('should set regenerating (alias for relatório)', () => {
      const { result } = renderHook(() => useAIIntegration());
      act(() => { result.current.setRegenerating(true); });
      expect(result.current.regenerating).toBe(true);
    });

    it('should set dispositivo text', () => {
      const { result } = renderHook(() => useAIIntegration());
      act(() => { result.current.setDispositivoText('Dispositivo content'); });
      expect(result.current.dispositivoText).toBe('Dispositivo content');
    });

    it('should set generating dispositivo', () => {
      const { result } = renderHook(() => useAIIntegration());
      act(() => { result.current.setGeneratingDispositivo(true); });
      expect(result.current.generatingDispositivo).toBe(true);
    });

    it('should set dispositivo instruction', () => {
      const { result } = renderHook(() => useAIIntegration());
      act(() => { result.current.setDispositivoInstruction('Dispositivo instruction'); });
      expect(result.current.dispositivoInstruction).toBe('Dispositivo instruction');
    });

    it('should set regenerating dispositivo', () => {
      const { result } = renderHook(() => useAIIntegration());
      act(() => { result.current.setRegeneratingDispositivo(true); });
      expect(result.current.regeneratingDispositivo).toBe(true);
    });

    it('should set generating keywords flag', () => {
      const { result } = renderHook(() => useAIIntegration());
      act(() => { result.current.setGeneratingKeywords(true); });
      expect(result.current.generatingKeywords).toBe(true);
    });

    it('should set generating title flag', () => {
      const { result } = renderHook(() => useAIIntegration());
      act(() => { result.current.setGeneratingTitle(true); });
      expect(result.current.generatingTitle).toBe(true);
    });

    it('should allow resetting values back to default', () => {
      const { result } = renderHook(() => useAIIntegration());
      act(() => {
        result.current.setAiInstruction('Something');
        result.current.setGeneratingAi(true);
      });
      expect(result.current.aiInstruction).toBe('Something');
      expect(result.current.generatingAi).toBe(true);

      act(() => {
        result.current.setAiInstruction('');
        result.current.setGeneratingAi(false);
      });
      expect(result.current.aiInstruction).toBe('');
      expect(result.current.generatingAi).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // extractResponseText
  // ═══════════════════════════════════════════════════════════════════════════

  describe('extractResponseText', () => {
    it('should extract text from Claude response format', () => {
      const { result } = renderHook(() => useAIIntegration());
      const claudeData = {
        content: [
          { type: 'thinking', thinking: 'internal thought' },
          { type: 'text', text: 'Claude response text' }
        ]
      };
      const text = result.current.extractResponseText(claudeData, 'claude');
      expect(text).toBe('Claude response text');
    });

    it('should extract text from OpenAI response format', () => {
      const { result } = renderHook(() => useAIIntegration());
      const openAIData = {
        choices: [
          { message: { content: 'OpenAI response text' }, finish_reason: 'stop' }
        ]
      };
      const text = result.current.extractResponseText(openAIData, 'openai');
      expect(text).toBe('OpenAI response text');
    });

    it('should extract text from Grok response (OpenAI-compatible)', () => {
      const { result } = renderHook(() => useAIIntegration());
      const grokData = {
        choices: [
          { message: { content: 'Grok response' }, finish_reason: 'stop' }
        ]
      };
      const text = result.current.extractResponseText(grokData, 'grok');
      expect(text).toBe('Grok response');
    });

    it('should extract text from Gemini response format', () => {
      const { result } = renderHook(() => useAIIntegration());
      const geminiData = {
        candidates: [{
          content: {
            parts: [{ text: 'Gemini response text' }]
          },
          finishReason: 'STOP'
        }]
      };
      const text = result.current.extractResponseText(geminiData, 'gemini');
      expect(text).toBe('Gemini response text');
    });

    it('should skip thinking blocks in Gemini response', () => {
      const { result } = renderHook(() => useAIIntegration());
      const geminiData = {
        candidates: [{
          content: {
            parts: [
              { text: 'thinking...', thought: true },
              { text: 'Actual response' }
            ]
          },
          finishReason: 'STOP'
        }]
      };
      const text = result.current.extractResponseText(geminiData, 'gemini');
      expect(text).toBe('Actual response');
    });

    it('should throw on OpenAI content_filter finish reason', () => {
      const { result } = renderHook(() => useAIIntegration());
      const data = {
        choices: [{ message: { content: '' }, finish_reason: 'content_filter' }]
      };
      expect(() => result.current.extractResponseText(data, 'openai'))
        .toThrow('bloqueada pelo filtro de conteúdo');
    });

    it('should throw on Grok content_filter finish reason', () => {
      const { result } = renderHook(() => useAIIntegration());
      const data = {
        choices: [{ message: { content: '' }, finish_reason: 'content_filter' }]
      };
      expect(() => result.current.extractResponseText(data, 'grok'))
        .toThrow('bloqueada pelo filtro de conteúdo');
    });

    it('should throw on Gemini SAFETY finish reason', () => {
      const { result } = renderHook(() => useAIIntegration());
      const data = {
        candidates: [{ content: { parts: [] }, finishReason: 'SAFETY' }]
      };
      expect(() => result.current.extractResponseText(data, 'gemini'))
        .toThrow('bloqueada por segurança');
    });

    it('should throw on Gemini RECITATION finish reason', () => {
      const { result } = renderHook(() => useAIIntegration());
      const data = {
        candidates: [{ content: { parts: [] }, finishReason: 'RECITATION' }]
      };
      expect(() => result.current.extractResponseText(data, 'gemini'))
        .toThrow('direitos autorais');
    });

    it('should throw on Gemini prompt block', () => {
      const { result } = renderHook(() => useAIIntegration());
      const data = {
        candidates: [{ content: { parts: [{ text: 'x' }] }, finishReason: 'STOP' }],
        promptFeedback: { blockReason: 'HARM_CATEGORY_VIOLENCE' }
      };
      expect(() => result.current.extractResponseText(data, 'gemini'))
        .toThrow('Prompt bloqueado');
    });

    it('should throw when Gemini returns only thinking without text', () => {
      const { result } = renderHook(() => useAIIntegration());
      const data = {
        candidates: [{
          content: {
            parts: [{ text: 'internal thought', thought: true }]
          },
          finishReason: 'STOP'
        }]
      };
      expect(() => result.current.extractResponseText(data, 'gemini'))
        .toThrow('Gemini retornou apenas thinking sem text part');
    });

    it('should return empty string for missing content (Claude)', () => {
      const { result } = renderHook(() => useAIIntegration());
      expect(result.current.extractResponseText({}, 'claude')).toBe('');
    });

    it('should return empty string for missing content (OpenAI)', () => {
      const { result } = renderHook(() => useAIIntegration());
      expect(result.current.extractResponseText({}, 'openai')).toBe('');
    });

    it('should return empty string for missing content (Gemini)', () => {
      const { result } = renderHook(() => useAIIntegration());
      expect(result.current.extractResponseText({}, 'gemini')).toBe('');
    });

    it('should warn on OpenAI length finish reason', () => {
      const { result } = renderHook(() => useAIIntegration());
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const data = {
        choices: [{ message: { content: 'Truncated text' }, finish_reason: 'length' }]
      };
      const text = result.current.extractResponseText(data, 'openai');
      expect(text).toBe('Truncated text');
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('truncada'));
      warnSpy.mockRestore();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // extractTokenMetrics
  // ═══════════════════════════════════════════════════════════════════════════

  describe('extractTokenMetrics', () => {
    it('should extract Claude token metrics', () => {
      const { result } = renderHook(() => useAIIntegration());
      const data = {
        usage: {
          input_tokens: 500,
          output_tokens: 200,
          cache_read_input_tokens: 100,
          cache_creation_input_tokens: 50
        }
      };
      const metrics = result.current.extractTokenMetrics(data, 'claude');
      expect(metrics).toEqual({
        input: 500,
        output: 200,
        cacheRead: 100,
        cacheCreation: 50
      });
    });

    it('should extract OpenAI token metrics', () => {
      const { result } = renderHook(() => useAIIntegration());
      const data = {
        usage: {
          prompt_tokens: 300,
          completion_tokens: 150,
          prompt_tokens_details: { cached_tokens: 80 }
        }
      };
      const metrics = result.current.extractTokenMetrics(data, 'openai');
      expect(metrics).toEqual({
        input: 300,
        output: 150,
        cacheRead: 80,
        cacheCreation: 0
      });
    });

    it('should extract Grok token metrics (same as OpenAI)', () => {
      const { result } = renderHook(() => useAIIntegration());
      const data = {
        usage: {
          prompt_tokens: 250,
          completion_tokens: 100,
          prompt_tokens_details: { cached_tokens: 0 }
        }
      };
      const metrics = result.current.extractTokenMetrics(data, 'grok');
      expect(metrics).toEqual({
        input: 250,
        output: 100,
        cacheRead: 0,
        cacheCreation: 0
      });
    });

    it('should extract Gemini token metrics', () => {
      const { result } = renderHook(() => useAIIntegration());
      const data = {
        usageMetadata: {
          promptTokenCount: 400,
          candidatesTokenCount: 180,
          cachedContentTokenCount: 60
        }
      };
      const metrics = result.current.extractTokenMetrics(data, 'gemini');
      expect(metrics).toEqual({
        input: 400,
        output: 180,
        cacheRead: 60,
        cacheCreation: 0
      });
    });

    it('should return zeros for missing usage data (Claude)', () => {
      const { result } = renderHook(() => useAIIntegration());
      const metrics = result.current.extractTokenMetrics({}, 'claude');
      expect(metrics).toEqual({ input: 0, output: 0, cacheRead: 0, cacheCreation: 0 });
    });

    it('should return zeros for missing usage data (OpenAI)', () => {
      const { result } = renderHook(() => useAIIntegration());
      const metrics = result.current.extractTokenMetrics({}, 'openai');
      expect(metrics).toEqual({ input: 0, output: 0, cacheRead: 0, cacheCreation: 0 });
    });

    it('should return zeros for missing usage data (Gemini)', () => {
      const { result } = renderHook(() => useAIIntegration());
      const metrics = result.current.extractTokenMetrics({}, 'gemini');
      expect(metrics).toEqual({ input: 0, output: 0, cacheRead: 0, cacheCreation: 0 });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // buildApiRequest
  // ═══════════════════════════════════════════════════════════════════════════

  describe('buildApiRequest', () => {
    it('should build a basic request with default options', () => {
      const { result } = renderHook(() => useAIIntegration());
      const messages = [{ role: 'user', content: 'Hello' }] as any;
      const request = result.current.buildApiRequest(messages);

      expect(request.model).toBe('claude-sonnet-4-20250514');
      expect(request.max_tokens).toBe(4000);
      expect(request.messages).toEqual(messages);
      expect(request.system).toBeUndefined();
      expect(request.thinking).toBeUndefined();
    });

    it('should accept maxTokens as a number (legacy format)', () => {
      const { result } = renderHook(() => useAIIntegration());
      const messages = [{ role: 'user', content: 'Hello' }] as any;
      const request = result.current.buildApiRequest(messages, 8000);

      expect(request.max_tokens).toBe(8000);
    });

    it('should set model from options', () => {
      const { result } = renderHook(() => useAIIntegration());
      const messages = [{ role: 'user', content: 'Hello' }] as any;
      const request = result.current.buildApiRequest(messages, { model: 'claude-opus-4-5-20251101' });

      expect(request.model).toBe('claude-opus-4-5-20251101');
    });

    it('should include system prompt with cache_control when provided', () => {
      const { result } = renderHook(() => useAIIntegration());
      const messages = [{ role: 'user', content: 'Hello' }] as any;
      const request = result.current.buildApiRequest(messages, { systemPrompt: 'Be helpful' });

      expect(request.system).toEqual([
        { type: 'text', text: 'Be helpful', cache_control: { type: 'ephemeral' } }
      ]);
    });

    it('should include instructions when useInstructions is true', () => {
      const { result } = renderHook(() => useAIIntegration());
      const messages = [{ role: 'user', content: 'Hello' }] as any;
      const request = result.current.buildApiRequest(messages, { useInstructions: true });

      expect(request.system).toBeDefined();
      expect(Array.isArray(request.system)).toBe(true);
      const system = request.system as any[];
      expect(system[0].type).toBe('text');
      expect(system[0].cache_control).toEqual({ type: 'ephemeral' });
    });

    it('should add temperature, topP, topK when provided', () => {
      const { result } = renderHook(() => useAIIntegration());
      const messages = [{ role: 'user', content: 'Hello' }] as any;
      const request = result.current.buildApiRequest(messages, {
        temperature: 0.7,
        topP: 0.9,
        topK: 40
      });

      expect(request.temperature).toBe(0.7);
      expect(request.top_p).toBe(0.9);
      expect(request.top_k).toBe(40);
    });

    it('should NOT add temperature/topP/topK when null', () => {
      const { result } = renderHook(() => useAIIntegration());
      const messages = [{ role: 'user', content: 'Hello' }] as any;
      const request = result.current.buildApiRequest(messages, {});

      expect(request.temperature).toBeUndefined();
      expect(request.top_p).toBeUndefined();
      expect(request.top_k).toBeUndefined();
    });

    it('should add cache_control to document blocks in message content', () => {
      const { result } = renderHook(() => useAIIntegration());
      const messages = [{
        role: 'user',
        content: [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: 'abc' } },
          { type: 'text', text: 'Analyze this document' }
        ]
      }] as any;
      const request = result.current.buildApiRequest(messages);
      const processedContent = (request.messages as any)[0].content;

      // First block (document, not last) should get cache_control
      expect(processedContent[0].cache_control).toEqual({ type: 'ephemeral' });
      // Last block should NOT get cache_control
      expect(processedContent[1].cache_control).toBeUndefined();
    });

    it('should add cache_control to long text blocks (>2000 chars)', () => {
      const { result } = renderHook(() => useAIIntegration());
      const longText = 'a'.repeat(3000);
      const messages = [{
        role: 'user',
        content: [
          { type: 'text', text: longText },
          { type: 'text', text: 'Short' }
        ]
      }] as any;
      const request = result.current.buildApiRequest(messages);
      const processedContent = (request.messages as any)[0].content;

      expect(processedContent[0].cache_control).toEqual({ type: 'ephemeral' });
    });

    it('should limit cache_control blocks to MAX_CACHE_BLOCKS (3)', () => {
      const { result } = renderHook(() => useAIIntegration());
      const messages = [{
        role: 'user',
        content: [
          { type: 'document', source: { type: 'base64', data: 'a' } },
          { type: 'document', source: { type: 'base64', data: 'b' } },
          { type: 'document', source: { type: 'base64', data: 'c' } },
          { type: 'document', source: { type: 'base64', data: 'd' } },
          { type: 'text', text: 'Last block' }
        ]
      }] as any;
      const request = result.current.buildApiRequest(messages);
      const processedContent = (request.messages as any)[0].content;

      const cacheBlocks = processedContent.filter((b: any) => b.cache_control);
      expect(cacheBlocks.length).toBe(3);
    });

    it('should handle string content in messages without modification', () => {
      const { result } = renderHook(() => useAIIntegration());
      const messages = [{ role: 'user', content: 'Simple string' }] as any;
      const request = result.current.buildApiRequest(messages);

      expect((request.messages as any)[0].content).toBe('Simple string');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // getApiHeaders
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getApiHeaders', () => {
    it('should return correct headers for Anthropic API', () => {
      const { result } = renderHook(() => useAIIntegration());
      const headers = result.current.getApiHeaders();

      expect(headers['Content-Type']).toBe('application/json');
      expect(headers['anthropic-beta']).toBe('prompt-caching-2024-07-31');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // logCacheMetrics
  // ═══════════════════════════════════════════════════════════════════════════

  describe('logCacheMetrics', () => {
    it('should call addTokenUsage when usage data is present', () => {
      const { result } = renderHook(() => useAIIntegration());
      const data = {
        usage: { input_tokens: 100, output_tokens: 50, cache_read_input_tokens: 20, cache_creation_input_tokens: 10 }
      };

      act(() => {
        result.current.logCacheMetrics(data, 'claude-sonnet-4-20250514', 'claude');
      });

      expect(mockAddTokenUsage).toHaveBeenCalledWith({
        input: 100,
        output: 50,
        cacheRead: 20,
        cacheCreation: 10,
        model: 'claude-sonnet-4-20250514',
        provider: 'claude'
      });
    });

    it('should not call addTokenUsage when usage data is absent', () => {
      const { result } = renderHook(() => useAIIntegration());
      act(() => {
        result.current.logCacheMetrics({});
      });
      expect(mockAddTokenUsage).not.toHaveBeenCalled();
    });

    it('should default to 0 for missing usage fields', () => {
      const { result } = renderHook(() => useAIIntegration());
      const data = { usage: {} };

      act(() => {
        result.current.logCacheMetrics(data);
      });

      expect(mockAddTokenUsage).toHaveBeenCalledWith({
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheCreation: 0,
        model: undefined,
        provider: undefined
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // convertToGeminiFormat
  // ═══════════════════════════════════════════════════════════════════════════

  describe('convertToGeminiFormat', () => {
    it('should convert user message to Gemini format', () => {
      const { result } = renderHook(() => useAIIntegration());
      const messages = [{ role: 'user', content: 'Hello Gemini' }] as any;
      const geminiReq = result.current.convertToGeminiFormat(messages);

      expect(geminiReq.contents).toEqual([
        { role: 'user', parts: [{ text: 'Hello Gemini' }] }
      ]);
    });

    it('should convert assistant role to model role', () => {
      const { result } = renderHook(() => useAIIntegration());
      const messages = [{ role: 'assistant', content: 'Hi there' }] as any;
      const geminiReq = result.current.convertToGeminiFormat(messages);

      expect((geminiReq.contents[0] as any).role).toBe('model');
    });

    it('should convert text content blocks', () => {
      const { result } = renderHook(() => useAIIntegration());
      const messages = [{
        role: 'user',
        content: [{ type: 'text', text: 'Analyze this' }]
      }] as any;
      const geminiReq = result.current.convertToGeminiFormat(messages);

      expect((geminiReq.contents[0] as any).parts).toEqual([{ text: 'Analyze this' }]);
    });

    it('should convert image content to inlineData', () => {
      const { result } = renderHook(() => useAIIntegration());
      const messages = [{
        role: 'user',
        content: [{ type: 'image', source: { media_type: 'image/png', data: 'base64data' } }]
      }] as any;
      const geminiReq = result.current.convertToGeminiFormat(messages);

      expect((geminiReq.contents[0] as any).parts[0]).toEqual({
        inlineData: { mimeType: 'image/png', data: 'base64data' }
      });
    });

    it('should convert document content to inlineData', () => {
      const { result } = renderHook(() => useAIIntegration());
      const messages = [{
        role: 'user',
        content: [{
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: 'pdfdata' }
        }]
      }] as any;
      const geminiReq = result.current.convertToGeminiFormat(messages);

      expect((geminiReq.contents[0] as any).parts[0]).toEqual({
        inlineData: { mimeType: 'application/pdf', data: 'pdfdata' }
      });
    });

    it('should set systemInstruction when systemPrompt is a string', () => {
      const { result } = renderHook(() => useAIIntegration());
      const messages = [{ role: 'user', content: 'Hi' }] as any;
      const geminiReq = result.current.convertToGeminiFormat(messages, 'Be helpful');

      expect(geminiReq.systemInstruction).toEqual({
        parts: [{ text: 'Be helpful' }]
      });
    });

    it('should set systemInstruction when systemPrompt is an array', () => {
      const { result } = renderHook(() => useAIIntegration());
      const messages = [{ role: 'user', content: 'Hi' }] as any;
      const systemPrompt = [{ text: 'Part 1' }, { text: 'Part 2' }] as any;
      const geminiReq = result.current.convertToGeminiFormat(messages, systemPrompt);

      expect(geminiReq.systemInstruction).toEqual({
        parts: [{ text: 'Part 1\n\nPart 2' }]
      });
    });

    it('should convert string content items in array', () => {
      const { result } = renderHook(() => useAIIntegration());
      const messages = [{
        role: 'user',
        content: ['Just a string']
      }] as any;
      const geminiReq = result.current.convertToGeminiFormat(messages);

      expect((geminiReq.contents[0] as any).parts).toEqual([{ text: 'Just a string' }]);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // convertToOpenAIFormat
  // ═══════════════════════════════════════════════════════════════════════════

  describe('convertToOpenAIFormat', () => {
    it('should convert user message with string content', () => {
      const { result } = renderHook(() => useAIIntegration());
      const messages = [{ role: 'user', content: 'Hello GPT' }] as any;
      const openaiMsgs = result.current.convertToOpenAIFormat(messages);

      expect(openaiMsgs).toEqual([
        { role: 'user', content: 'Hello GPT' }
      ]);
    });

    it('should add system message when systemPrompt provided', () => {
      const { result } = renderHook(() => useAIIntegration());
      const messages = [{ role: 'user', content: 'Hello' }] as any;
      const openaiMsgs = result.current.convertToOpenAIFormat(messages, 'System prompt');

      expect(openaiMsgs[0]).toEqual({ role: 'system', content: 'System prompt' });
      expect(openaiMsgs[1]).toEqual({ role: 'user', content: 'Hello' });
    });

    it('should convert text content blocks', () => {
      const { result } = renderHook(() => useAIIntegration());
      const messages = [{
        role: 'user',
        content: [{ type: 'text', text: 'Analyze' }]
      }] as any;
      const openaiMsgs = result.current.convertToOpenAIFormat(messages);

      expect(openaiMsgs[0].content).toEqual([
        { type: 'text', text: 'Analyze' }
      ]);
    });

    it('should convert image content to image_url format', () => {
      const { result } = renderHook(() => useAIIntegration());
      const messages = [{
        role: 'user',
        content: [{ type: 'image', source: { media_type: 'image/png', data: 'imgdata' } }]
      }] as any;
      const openaiMsgs = result.current.convertToOpenAIFormat(messages);

      expect((openaiMsgs[0].content as any)[0]).toEqual({
        type: 'image_url',
        image_url: { url: 'data:image/png;base64,imgdata' }
      });
    });

    it('should convert document content to file format', () => {
      const { result } = renderHook(() => useAIIntegration());
      const messages = [{
        role: 'user',
        content: [{ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: 'pdfdata' } }]
      }] as any;
      const openaiMsgs = result.current.convertToOpenAIFormat(messages);

      expect((openaiMsgs[0].content as any)[0]).toEqual({
        type: 'file',
        file: {
          filename: 'document.pdf',
          file_data: 'data:application/pdf;base64,pdfdata'
        }
      });
    });

    it('should preserve assistant role', () => {
      const { result } = renderHook(() => useAIIntegration());
      const messages = [{ role: 'assistant', content: 'I am assistant' }] as any;
      const openaiMsgs = result.current.convertToOpenAIFormat(messages);

      expect(openaiMsgs[0].role).toBe('assistant');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // callAI - Claude provider (successful calls)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('callAI - Claude provider', () => {
    it('should call Claude API and return extracted text', async () => {
      const mockResponse = createMockResponse({
        content: [{ type: 'text', text: 'Claude answer' }],
        usage: { input_tokens: 100, output_tokens: 50 }
      });
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

      const { result } = renderHook(() => useAIIntegration());
      const messages = [{ role: 'user', content: 'Hello' }] as any;

      let response: string = '';
      await act(async () => {
        response = await result.current.callAI(messages);
      });

      expect(response).toBe('Claude answer');
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/claude/messages',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'x-api-key': 'sk-test-claude'
          })
        })
      );
    });

    it('should include API key in headers', async () => {
      const mockResponse = createMockResponse({
        content: [{ type: 'text', text: 'test' }],
        usage: { input_tokens: 10, output_tokens: 5 }
      });
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

      const { result } = renderHook(() => useAIIntegration());
      await act(async () => {
        await result.current.callAI([{ role: 'user', content: 'Hi' }] as any);
      });

      const fetchCall = vi.mocked(global.fetch).mock.calls[0];
      expect((fetchCall[1] as any).headers['x-api-key']).toBe('sk-test-claude');
    });

    it('should throw on non-ok HTTP response', async () => {
      const mockResponse = createMockResponse(
        { error: { message: 'Server error' } },
        500,
        false
      );
      // Only resolve once to avoid infinite retry
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

      const { result } = renderHook(() => useAIIntegration());

      let error: Error | null = null;
      await act(async () => {
        try {
          await result.current.callLLM([{ role: 'user', content: 'Hi' }] as any, {});
        } catch (e) {
          error = e as Error;
        }
      });
      expect(error).not.toBeNull();
      expect(error!.message).toContain('Erro HTTP 500');
    });

    it('should throw on API error in response body', async () => {
      const mockResponse = createMockResponse({
        error: { message: 'Invalid request' }
      });
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

      const { result } = renderHook(() => useAIIntegration());

      let error: Error | null = null;
      await act(async () => {
        try {
          await result.current.callLLM([{ role: 'user', content: 'Hi' }] as any, {});
        } catch (e) {
          error = e as Error;
        }
      });
      expect(error).not.toBeNull();
      expect(error!.message).toContain('Erro da API');
    });

    it('should throw when no text content in response', async () => {
      const mockResponse = createMockResponse({
        content: [{ type: 'thinking', thinking: 'no text here' }]
      });
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

      const { result } = renderHook(() => useAIIntegration());

      let error: Error | null = null;
      await act(async () => {
        try {
          await result.current.callLLM([{ role: 'user', content: 'Hi' }] as any, {});
        } catch (e) {
          error = e as Error;
        }
      });
      expect(error).not.toBeNull();
      expect(error!.message).toContain('Nenhum conteúdo de texto');
    });

    it('should return raw data when extractText is false', async () => {
      const rawData = {
        content: [{ type: 'text', text: 'raw' }],
        usage: { input_tokens: 10, output_tokens: 5 }
      };
      const mockResponse = createMockResponse(rawData);
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

      const { result } = renderHook(() => useAIIntegration());

      let response: unknown;
      await act(async () => {
        response = await result.current.callLLM(
          [{ role: 'user', content: 'Hi' }] as any,
          { extractText: false }
        );
      });

      expect(response).toEqual(rawData);
    });

    it('should log cache metrics on successful call', async () => {
      const mockResponse = createMockResponse({
        content: [{ type: 'text', text: 'test' }],
        usage: { input_tokens: 200, output_tokens: 100, cache_read_input_tokens: 50 }
      });
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

      const { result } = renderHook(() => useAIIntegration());

      await act(async () => {
        await result.current.callLLM([{ role: 'user', content: 'Hi' }] as any, {});
      });

      expect(mockAddTokenUsage).toHaveBeenCalled();
    });

    it('should not log metrics when logMetrics is false', async () => {
      const mockResponse = createMockResponse({
        content: [{ type: 'text', text: 'response' }],
        usage: { input_tokens: 500, output_tokens: 200 }
      });
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

      const { result } = renderHook(() => useAIIntegration());

      await act(async () => {
        await result.current.callLLM(
          [{ role: 'user', content: 'Hi' }] as any,
          { logMetrics: false }
        );
      });

      expect(mockAddTokenUsage).not.toHaveBeenCalled();
    });

    it('should skip validation when validateResponse is false', async () => {
      const mockResponse = createMockResponse({
        error: { message: 'Should be ignored' },
        content: []
      });
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

      const { result } = renderHook(() => useAIIntegration());

      // With validateResponse=false, should not throw on error in body
      let response: unknown;
      await act(async () => {
        response = await result.current.callLLM(
          [{ role: 'user', content: 'Hi' }] as any,
          { validateResponse: false, extractText: false }
        );
      });

      expect(response).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // callAI - Claude retry logic
  // ═══════════════════════════════════════════════════════════════════════════

  describe('callAI - retry logic (429/529/520/502)', () => {
    it('should retry on 429 rate limit and succeed on second attempt', async () => {
      const rateLimitResponse = createMockResponse({}, 429, true);
      const successResponse = createMockResponse({
        content: [{ type: 'text', text: 'Success after retry' }],
        usage: { input_tokens: 10, output_tokens: 5 }
      });

      vi.mocked(global.fetch)
        .mockResolvedValueOnce(rateLimitResponse as any)
        .mockResolvedValueOnce(successResponse as any);

      const { result } = renderHook(() => useAIIntegration());

      let response: string = '';
      await act(async () => {
        response = await result.current.callLLM(
          [{ role: 'user', content: 'Hi' }] as any,
          {}
        );
      });

      expect(response).toBe('Success after retry');
      expect(global.fetch).toHaveBeenCalledTimes(2);
    }, 15000);

    it('should retry on 529 overloaded status', async () => {
      const overloadedResponse = createMockResponse({}, 529, true);
      const successResponse = createMockResponse({
        content: [{ type: 'text', text: 'Recovered' }],
        usage: { input_tokens: 10, output_tokens: 5 }
      });

      vi.mocked(global.fetch)
        .mockResolvedValueOnce(overloadedResponse as any)
        .mockResolvedValueOnce(successResponse as any);

      const { result } = renderHook(() => useAIIntegration());

      let response: string = '';
      await act(async () => {
        response = await result.current.callLLM(
          [{ role: 'user', content: 'Hi' }] as any,
          {}
        );
      });

      expect(response).toBe('Recovered');
      expect(global.fetch).toHaveBeenCalledTimes(2);
    }, 15000);

    it('should retry on 502 gateway error', async () => {
      const gatewayError = createMockResponse({}, 502, true);
      const successResponse = createMockResponse({
        content: [{ type: 'text', text: 'OK' }],
        usage: { input_tokens: 10, output_tokens: 5 }
      });

      vi.mocked(global.fetch)
        .mockResolvedValueOnce(gatewayError as any)
        .mockResolvedValueOnce(successResponse as any);

      const { result } = renderHook(() => useAIIntegration());

      let response: string = '';
      await act(async () => {
        response = await result.current.callLLM(
          [{ role: 'user', content: 'Hi' }] as any,
          {}
        );
      });

      expect(response).toBe('OK');
      expect(global.fetch).toHaveBeenCalledTimes(2);
    }, 15000);

    it('should handle AbortError (user cancellation)', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      vi.mocked(global.fetch).mockRejectedValue(abortError);

      const controller = new AbortController();
      controller.abort();

      const { result } = renderHook(() => useAIIntegration());

      let error: Error | null = null;
      await act(async () => {
        try {
          await result.current.callLLM(
            [{ role: 'user', content: 'Hi' }] as any,
            { abortSignal: controller.signal }
          );
        } catch (e) {
          error = e as Error;
        }
      });
      expect(error).not.toBeNull();
      expect(error!.message).toContain('cancelada');
    }, 15000);

    it('should handle network errors (Failed to fetch) with retry', async () => {
      const networkError = new Error('Failed to fetch');
      const successResponse = createMockResponse({
        content: [{ type: 'text', text: 'Recovered' }],
        usage: { input_tokens: 10, output_tokens: 5 }
      });

      vi.mocked(global.fetch)
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce(successResponse as any);

      const { result } = renderHook(() => useAIIntegration());

      let response: string = '';
      await act(async () => {
        response = await result.current.callLLM(
          [{ role: 'user', content: 'Hi' }] as any,
          {}
        );
      });

      expect(response).toBe('Recovered');
      expect(global.fetch).toHaveBeenCalledTimes(2);
    }, 15000);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // callAI - Gemini provider
  // ═══════════════════════════════════════════════════════════════════════════

  describe('callAI - Gemini provider', () => {
    it('should call Gemini API and return extracted text', async () => {
      const mockResponse = createMockResponse({
        candidates: [{
          content: { parts: [{ text: 'Gemini answer' }] },
          finishReason: 'STOP'
        }],
        usageMetadata: { promptTokenCount: 50, candidatesTokenCount: 30 }
      });
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

      const { result } = renderHook(() => useAIIntegration());

      let response: string = '';
      await act(async () => {
        response = await result.current.callAI(
          [{ role: 'user', content: 'Hello' }] as any,
          { provider: 'gemini' }
        );
      });

      expect(response).toBe('Gemini answer');
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/gemini/generate',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': 'test-gemini-key' }
        })
      );
    });

    it('should include API key in x-api-key header for Gemini', async () => {
      const mockResponse = createMockResponse({
        candidates: [{
          content: { parts: [{ text: 'test' }] },
          finishReason: 'STOP'
        }]
      });
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

      const { result } = renderHook(() => useAIIntegration());

      await act(async () => {
        await result.current.callGeminiAPI(
          [{ role: 'user', content: 'Hi' }] as any,
          {}
        );
      });

      const fetchCall = vi.mocked(global.fetch).mock.calls[0];
      const headers = (fetchCall[1] as any).headers;
      expect(headers['x-api-key']).toBe('test-gemini-key');
    });

    it('should include model in request body for Gemini', async () => {
      const mockResponse = createMockResponse({
        candidates: [{
          content: { parts: [{ text: 'test' }] },
          finishReason: 'STOP'
        }]
      });
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

      const { result } = renderHook(() => useAIIntegration());

      await act(async () => {
        await result.current.callGeminiAPI(
          [{ role: 'user', content: 'Hi' }] as any,
          { model: 'gemini-3-pro-preview' }
        );
      });

      const fetchCall = vi.mocked(global.fetch).mock.calls[0];
      const body = JSON.parse((fetchCall[1] as any).body);
      expect(body.model).toBe('gemini-3-pro-preview');
    });

    it('should retry on Gemini 429 and succeed', async () => {
      const rateLimitResponse = createMockResponse({}, 429, false);
      const successResponse = createMockResponse({
        candidates: [{
          content: { parts: [{ text: 'Recovered' }] },
          finishReason: 'STOP'
        }]
      });

      vi.mocked(global.fetch)
        .mockResolvedValueOnce(rateLimitResponse as any)
        .mockResolvedValueOnce(successResponse as any);

      const { result } = renderHook(() => useAIIntegration());

      let response: string = '';
      await act(async () => {
        response = await result.current.callGeminiAPI(
          [{ role: 'user', content: 'Hi' }] as any,
          {}
        );
      });

      expect(response).toBe('Recovered');
      expect(global.fetch).toHaveBeenCalledTimes(2);
    }, 15000);

    it('should retry on Gemini 500 server error', async () => {
      const serverError = createMockResponse({ error: { message: 'Internal error' } }, 500, false);
      const successResponse = createMockResponse({
        candidates: [{
          content: { parts: [{ text: 'Success' }] },
          finishReason: 'STOP'
        }]
      });

      vi.mocked(global.fetch)
        .mockResolvedValueOnce(serverError as any)
        .mockResolvedValueOnce(successResponse as any);

      const { result } = renderHook(() => useAIIntegration());

      let response: string = '';
      await act(async () => {
        response = await result.current.callGeminiAPI(
          [{ role: 'user', content: 'Hi' }] as any,
          {}
        );
      });

      expect(response).toBe('Success');
    }, 15000);

    it('should throw error immediately on Gemini 400 (non-retryable)', async () => {
      const badRequest = createMockResponse({ error: { message: 'Bad request' } }, 400, false);
      vi.mocked(global.fetch).mockResolvedValue(badRequest as any);

      const { result } = renderHook(() => useAIIntegration());

      let error: Error | null = null;
      await act(async () => {
        try {
          await result.current.callGeminiAPI(
            [{ role: 'user', content: 'Hi' }] as any,
            {}
          );
        } catch (e) {
          error = e as Error;
        }
      });
      expect(error).not.toBeNull();
      expect(global.fetch).toHaveBeenCalledTimes(1);
    }, 15000);

    it('should log token metrics for Gemini', async () => {
      const mockResponse = createMockResponse({
        candidates: [{
          content: { parts: [{ text: 'test' }] },
          finishReason: 'STOP'
        }],
        usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 50, cachedContentTokenCount: 20 }
      });
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

      const { result } = renderHook(() => useAIIntegration());

      await act(async () => {
        await result.current.callGeminiAPI(
          [{ role: 'user', content: 'Hi' }] as any,
          {}
        );
      });

      expect(mockAddTokenUsage).toHaveBeenCalledWith(
        expect.objectContaining({
          input: 100,
          output: 50,
          cacheRead: 20,
          provider: 'gemini'
        })
      );
    });

    it('should return raw data when extractText is false (Gemini)', async () => {
      const rawData = {
        candidates: [{
          content: { parts: [{ text: 'raw' }] },
          finishReason: 'STOP'
        }]
      };
      const mockResponse = createMockResponse(rawData);
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

      const { result } = renderHook(() => useAIIntegration());

      let response: unknown;
      await act(async () => {
        response = await result.current.callGeminiAPI(
          [{ role: 'user', content: 'Hi' }] as any,
          { extractText: false }
        );
      });

      expect(response).toEqual(rawData);
    });

    it('should handle Gemini abort signal', async () => {
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';
      vi.mocked(global.fetch).mockRejectedValue(abortError);

      const controller = new AbortController();
      controller.abort();

      const { result } = renderHook(() => useAIIntegration());

      let error: Error | null = null;
      await act(async () => {
        try {
          await result.current.callGeminiAPI(
            [{ role: 'user', content: 'Hi' }] as any,
            { abortSignal: controller.signal }
          );
        } catch (e) {
          error = e as Error;
        }
      });
      expect(error).not.toBeNull();
      expect(error!.message).toContain('cancelada');
    }, 15000);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // callAI - OpenAI provider
  // ═══════════════════════════════════════════════════════════════════════════

  describe('callAI - OpenAI provider', () => {
    it('should call OpenAI API and return extracted text', async () => {
      const mockResponse = createMockResponse({
        choices: [{ message: { content: 'GPT answer' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 50, completion_tokens: 30 }
      });
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

      const { result } = renderHook(() => useAIIntegration());

      let response: string = '';
      await act(async () => {
        response = await result.current.callAI(
          [{ role: 'user', content: 'Hello' }] as any,
          { provider: 'openai' }
        );
      });

      expect(response).toBe('GPT answer');
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/openai/chat',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'x-api-key': 'sk-test-openai'
          })
        })
      );
    });

    it('should include correct model in request body', async () => {
      const mockResponse = createMockResponse({
        choices: [{ message: { content: 'test' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 10, completion_tokens: 5 }
      });
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

      const { result } = renderHook(() => useAIIntegration());

      await act(async () => {
        await result.current.callOpenAIAPI(
          [{ role: 'user', content: 'Hi' }] as any,
          { model: 'gpt-5.2-chat-latest' }
        );
      });

      const fetchCall = vi.mocked(global.fetch).mock.calls[0];
      const body = JSON.parse((fetchCall[1] as any).body);
      expect(body.model).toBe('gpt-5.2-chat-latest');
    });

    it('should add reasoning config for gpt-5.2 model', async () => {
      const mockResponse = createMockResponse({
        choices: [{ message: { content: 'test' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 10, completion_tokens: 5 }
      });
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

      const { result } = renderHook(() => useAIIntegration());

      await act(async () => {
        await result.current.callOpenAIAPI(
          [{ role: 'user', content: 'Hi' }] as any,
          { model: 'gpt-5.2' }
        );
      });

      const fetchCall = vi.mocked(global.fetch).mock.calls[0];
      const body = JSON.parse((fetchCall[1] as any).body);
      expect(body.reasoning).toEqual({ effort: 'medium' });
    });

    it('should NOT add reasoning for gpt-5.2-chat-latest', async () => {
      const mockResponse = createMockResponse({
        choices: [{ message: { content: 'test' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 10, completion_tokens: 5 }
      });
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

      const { result } = renderHook(() => useAIIntegration());

      await act(async () => {
        await result.current.callOpenAIAPI(
          [{ role: 'user', content: 'Hi' }] as any,
          { model: 'gpt-5.2-chat-latest' }
        );
      });

      const fetchCall = vi.mocked(global.fetch).mock.calls[0];
      const body = JSON.parse((fetchCall[1] as any).body);
      expect(body.reasoning).toBeUndefined();
    });

    it('should retry on OpenAI 429 and succeed', async () => {
      const rateLimitResponse = createMockResponse({}, 429, false);
      const successResponse = createMockResponse({
        choices: [{ message: { content: 'Recovered' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 10, completion_tokens: 5 }
      });

      vi.mocked(global.fetch)
        .mockResolvedValueOnce(rateLimitResponse as any)
        .mockResolvedValueOnce(successResponse as any);

      const { result } = renderHook(() => useAIIntegration());

      let response: string = '';
      await act(async () => {
        response = await result.current.callOpenAIAPI(
          [{ role: 'user', content: 'Hi' }] as any,
          {}
        );
      });

      expect(response).toBe('Recovered');
      expect(global.fetch).toHaveBeenCalledTimes(2);
    }, 15000);

    it('should retry on OpenAI 500 server error', async () => {
      const serverError = createMockResponse({ error: { message: 'Server error' } }, 500, false);
      const successResponse = createMockResponse({
        choices: [{ message: { content: 'OK' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 10, completion_tokens: 5 }
      });

      vi.mocked(global.fetch)
        .mockResolvedValueOnce(serverError as any)
        .mockResolvedValueOnce(successResponse as any);

      const { result } = renderHook(() => useAIIntegration());

      let response: string = '';
      await act(async () => {
        response = await result.current.callOpenAIAPI(
          [{ role: 'user', content: 'Hi' }] as any,
          {}
        );
      });

      expect(response).toBe('OK');
    }, 15000);

    it('should throw error immediately on OpenAI 400 (non-retryable)', async () => {
      const badRequest = createMockResponse({ error: { message: 'Bad request' } }, 400, false);
      vi.mocked(global.fetch).mockResolvedValue(badRequest as any);

      const { result } = renderHook(() => useAIIntegration());

      let error: Error | null = null;
      await act(async () => {
        try {
          await result.current.callOpenAIAPI(
            [{ role: 'user', content: 'Hi' }] as any,
            {}
          );
        } catch (e) {
          error = e as Error;
        }
      });
      expect(error).not.toBeNull();
      expect(error!.message).toContain('Bad request');
      expect(global.fetch).toHaveBeenCalledTimes(1);
    }, 15000);

    it('should log token metrics for OpenAI', async () => {
      const mockResponse = createMockResponse({
        choices: [{ message: { content: 'test' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 200, completion_tokens: 100, prompt_tokens_details: { cached_tokens: 50 } }
      });
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

      const { result } = renderHook(() => useAIIntegration());

      await act(async () => {
        await result.current.callOpenAIAPI(
          [{ role: 'user', content: 'Hi' }] as any,
          {}
        );
      });

      expect(mockAddTokenUsage).toHaveBeenCalledWith(
        expect.objectContaining({
          input: 200,
          output: 100,
          cacheRead: 50,
          provider: 'openai'
        })
      );
    });

    it('should return raw data when extractText is false (OpenAI)', async () => {
      const rawData = {
        choices: [{ message: { content: 'raw' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 10, completion_tokens: 5 }
      };
      const mockResponse = createMockResponse(rawData);
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

      const { result } = renderHook(() => useAIIntegration());

      let response: unknown;
      await act(async () => {
        response = await result.current.callOpenAIAPI(
          [{ role: 'user', content: 'Hi' }] as any,
          { extractText: false }
        );
      });

      expect(response).toEqual(rawData);
    });

    it('should handle AbortError for OpenAI', async () => {
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';
      vi.mocked(global.fetch).mockRejectedValue(abortError);

      const controller = new AbortController();
      controller.abort();

      const { result } = renderHook(() => useAIIntegration());

      let error: Error | null = null;
      await act(async () => {
        try {
          await result.current.callOpenAIAPI(
            [{ role: 'user', content: 'Hi' }] as any,
            { abortSignal: controller.signal }
          );
        } catch (e) {
          error = e as Error;
        }
      });
      expect(error).not.toBeNull();
      expect(error!.message).toContain('cancelada');
    }, 15000);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // callAI - Grok provider
  // ═══════════════════════════════════════════════════════════════════════════

  describe('callAI - Grok provider', () => {
    it('should call Grok API and return extracted text', async () => {
      const mockResponse = createMockResponse({
        choices: [{ message: { content: 'Grok answer' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 50, completion_tokens: 30 }
      });
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

      const { result } = renderHook(() => useAIIntegration());

      let response: string = '';
      await act(async () => {
        response = await result.current.callAI(
          [{ role: 'user', content: 'Hello' }] as any,
          { provider: 'grok' }
        );
      });

      expect(response).toBe('Grok answer');
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/grok/chat',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'x-api-key': 'xai-test-grok'
          })
        })
      );
    });

    it('should include correct model in Grok request', async () => {
      const mockResponse = createMockResponse({
        choices: [{ message: { content: 'test' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 10, completion_tokens: 5 }
      });
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

      const { result } = renderHook(() => useAIIntegration());

      await act(async () => {
        await result.current.callGrokAPI(
          [{ role: 'user', content: 'Hi' }] as any,
          { model: 'grok-4-1-fast-non-reasoning' }
        );
      });

      const fetchCall = vi.mocked(global.fetch).mock.calls[0];
      const body = JSON.parse((fetchCall[1] as any).body);
      expect(body.model).toBe('grok-4-1-fast-non-reasoning');
    });

    it('should retry on Grok 429 and succeed', async () => {
      const rateLimitResponse = createMockResponse({}, 429, false);
      const successResponse = createMockResponse({
        choices: [{ message: { content: 'Recovered' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 10, completion_tokens: 5 }
      });

      vi.mocked(global.fetch)
        .mockResolvedValueOnce(rateLimitResponse as any)
        .mockResolvedValueOnce(successResponse as any);

      const { result } = renderHook(() => useAIIntegration());

      let response: string = '';
      await act(async () => {
        response = await result.current.callGrokAPI(
          [{ role: 'user', content: 'Hi' }] as any,
          {}
        );
      });

      expect(response).toBe('Recovered');
      expect(global.fetch).toHaveBeenCalledTimes(2);
    }, 15000);

    it('should retry on Grok 503 service unavailable', async () => {
      const unavailableResponse = createMockResponse({ error: { message: 'Service unavailable' } }, 503, false);
      const successResponse = createMockResponse({
        choices: [{ message: { content: 'OK' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 10, completion_tokens: 5 }
      });

      vi.mocked(global.fetch)
        .mockResolvedValueOnce(unavailableResponse as any)
        .mockResolvedValueOnce(successResponse as any);

      const { result } = renderHook(() => useAIIntegration());

      let response: string = '';
      await act(async () => {
        response = await result.current.callGrokAPI(
          [{ role: 'user', content: 'Hi' }] as any,
          {}
        );
      });

      expect(response).toBe('OK');
    }, 15000);

    it('should throw error immediately on Grok 400 (non-retryable)', async () => {
      const badRequest = createMockResponse({ error: { message: 'Invalid model' } }, 400, false);
      vi.mocked(global.fetch).mockResolvedValue(badRequest as any);

      const { result } = renderHook(() => useAIIntegration());

      let error: Error | null = null;
      await act(async () => {
        try {
          await result.current.callGrokAPI(
            [{ role: 'user', content: 'Hi' }] as any,
            {}
          );
        } catch (e) {
          error = e as Error;
        }
      });
      expect(error).not.toBeNull();
      expect(error!.message).toContain('Invalid model');
      expect(global.fetch).toHaveBeenCalledTimes(1);
    }, 15000);

    it('should log token metrics for Grok', async () => {
      const mockResponse = createMockResponse({
        choices: [{ message: { content: 'test' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 150, completion_tokens: 75, prompt_tokens_details: { cached_tokens: 30 } }
      });
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

      const { result } = renderHook(() => useAIIntegration());

      await act(async () => {
        await result.current.callGrokAPI(
          [{ role: 'user', content: 'Hi' }] as any,
          {}
        );
      });

      expect(mockAddTokenUsage).toHaveBeenCalledWith(
        expect.objectContaining({
          input: 150,
          output: 75,
          cacheRead: 30,
          provider: 'grok'
        })
      );
    });

    it('should return raw data when extractText is false (Grok)', async () => {
      const rawData = {
        choices: [{ message: { content: 'raw' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 10, completion_tokens: 5 }
      };
      const mockResponse = createMockResponse(rawData);
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

      const { result } = renderHook(() => useAIIntegration());

      let response: unknown;
      await act(async () => {
        response = await result.current.callGrokAPI(
          [{ role: 'user', content: 'Hi' }] as any,
          { extractText: false }
        );
      });

      expect(response).toEqual(rawData);
    });

    it('should handle AbortError for Grok', async () => {
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';
      vi.mocked(global.fetch).mockRejectedValue(abortError);

      const controller = new AbortController();
      controller.abort();

      const { result } = renderHook(() => useAIIntegration());

      let error: Error | null = null;
      await act(async () => {
        try {
          await result.current.callGrokAPI(
            [{ role: 'user', content: 'Hi' }] as any,
            { abortSignal: controller.signal }
          );
        } catch (e) {
          error = e as Error;
        }
      });
      expect(error).not.toBeNull();
      expect(error!.message).toContain('cancelada');
    }, 15000);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // callAI - provider routing
  // ═══════════════════════════════════════════════════════════════════════════

  describe('callAI - provider routing', () => {
    it('should route to Claude by default', async () => {
      const mockResponse = createMockResponse({
        content: [{ type: 'text', text: 'Claude' }],
        usage: { input_tokens: 10, output_tokens: 5 }
      });
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

      const { result } = renderHook(() => useAIIntegration());

      await act(async () => {
        await result.current.callAI([{ role: 'user', content: 'Hi' }] as any);
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/claude/'),
        expect.anything()
      );
    });

    it('should route to Gemini when provider is gemini', async () => {
      const mockResponse = createMockResponse({
        candidates: [{ content: { parts: [{ text: 'Gemini' }] }, finishReason: 'STOP' }]
      });
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

      const { result } = renderHook(() => useAIIntegration());

      await act(async () => {
        await result.current.callAI(
          [{ role: 'user', content: 'Hi' }] as any,
          { provider: 'gemini' }
        );
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/gemini/'),
        expect.anything()
      );
    });

    it('should route to OpenAI when provider is openai', async () => {
      const mockResponse = createMockResponse({
        choices: [{ message: { content: 'GPT' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 10, completion_tokens: 5 }
      });
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

      const { result } = renderHook(() => useAIIntegration());

      await act(async () => {
        await result.current.callAI(
          [{ role: 'user', content: 'Hi' }] as any,
          { provider: 'openai' }
        );
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/openai/'),
        expect.anything()
      );
    });

    it('should route to Grok when provider is grok', async () => {
      const mockResponse = createMockResponse({
        choices: [{ message: { content: 'Grok' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 10, completion_tokens: 5 }
      });
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

      const { result } = renderHook(() => useAIIntegration());

      await act(async () => {
        await result.current.callAI(
          [{ role: 'user', content: 'Hi' }] as any,
          { provider: 'grok' }
        );
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/grok/'),
        expect.anything()
      );
    });

    it('should use model override from options for Claude', async () => {
      const mockResponse = createMockResponse({
        content: [{ type: 'text', text: 'test' }],
        usage: { input_tokens: 10, output_tokens: 5 }
      });
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

      const { result } = renderHook(() => useAIIntegration());

      await act(async () => {
        await result.current.callAI(
          [{ role: 'user', content: 'Hi' }] as any,
          { model: 'claude-opus-4-5-20251101' }
        );
      });

      const fetchCall = vi.mocked(global.fetch).mock.calls[0];
      const body = JSON.parse((fetchCall[1] as any).body);
      expect(body.model).toBe('claude-opus-4-5-20251101');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // getModelDisplayName
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getModelDisplayName', () => {
    it('should return display name for Claude Sonnet', () => {
      const { result } = renderHook(() => useAIIntegration());
      expect(result.current.getModelDisplayName('claude-sonnet-4-20250514')).toBe('Claude Sonnet 4.5');
    });

    it('should return display name for Claude Opus', () => {
      const { result } = renderHook(() => useAIIntegration());
      expect(result.current.getModelDisplayName('claude-opus-4-5-20251101')).toBe('Claude Opus 4.5');
    });

    it('should return display name for Gemini 3 Flash', () => {
      const { result } = renderHook(() => useAIIntegration());
      expect(result.current.getModelDisplayName('gemini-3-flash-preview')).toBe('Gemini 3 Flash');
    });

    it('should return display name for Gemini 3 Pro', () => {
      const { result } = renderHook(() => useAIIntegration());
      expect(result.current.getModelDisplayName('gemini-3-pro-preview')).toBe('Gemini 3 Pro');
    });

    it('should return display name for GPT-5.2 Thinking', () => {
      const { result } = renderHook(() => useAIIntegration());
      expect(result.current.getModelDisplayName('gpt-5.2')).toBe('GPT-5.2 Thinking');
    });

    it('should return display name for GPT-5.2 Instant', () => {
      const { result } = renderHook(() => useAIIntegration());
      expect(result.current.getModelDisplayName('gpt-5.2-chat-latest')).toBe('GPT-5.2 Instant');
    });

    it('should return display name for Grok 4.1 Fast', () => {
      const { result } = renderHook(() => useAIIntegration());
      expect(result.current.getModelDisplayName('grok-4-1-fast-reasoning')).toBe('Grok 4.1 Fast');
    });

    it('should return display name for Grok 4.1 Instant', () => {
      const { result } = renderHook(() => useAIIntegration());
      expect(result.current.getModelDisplayName('grok-4-1-fast-non-reasoning')).toBe('Grok 4.1 Instant');
    });

    it('should return model id for unknown models', () => {
      const { result } = renderHook(() => useAIIntegration());
      expect(result.current.getModelDisplayName('unknown-model')).toBe('unknown-model');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // getAiInstructions
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getAiInstructions', () => {
    it('should return default instructions when no custom prompt', () => {
      const { result } = renderHook(() => useAIIntegration());
      const instructions = result.current.getAiInstructions();

      expect(Array.isArray(instructions)).toBe(true);
      expect(instructions[0].type).toBe('text');
      expect(instructions[0].text).toBe('Test AI instructions full');
      expect(instructions[0].cache_control).toEqual({ type: 'ephemeral' });
    });

    it('should return custom instructions when customPrompt is set', () => {
      mockStoreWith({
        aiSettings: { ...defaultMockState.aiSettings, customPrompt: 'Write like a poet' }
      });

      const { result } = renderHook(() => useAIIntegration());
      const instructions = result.current.getAiInstructions();

      expect(Array.isArray(instructions)).toBe(true);
      expect(instructions[0].text).toContain('Write like a poet');
      expect(instructions[0].text).toContain('Test AI instructions core');
      expect(instructions[0].text).toContain('Test AI instructions safety');
      expect(instructions[0].cache_control).toEqual({ type: 'ephemeral' });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // performDoubleCheck
  // ═══════════════════════════════════════════════════════════════════════════

  describe('performDoubleCheck', () => {
    it('should return original response when double check is disabled', async () => {
      mockStoreWith({
        aiSettings: {
          ...defaultMockState.aiSettings,
          doubleCheck: { enabled: false, provider: 'claude', model: 'claude-sonnet-4-20250514', operations: {} }
        }
      });

      const { result } = renderHook(() => useAIIntegration());
      let dcResult: any;

      await act(async () => {
        dcResult = await result.current.performDoubleCheck(
          'topicExtraction',
          '{"topics": []}',
          [{ type: 'text', text: 'context' }] as any
        );
      });

      expect(dcResult.verified).toBe('{"topics": []}');
      expect(dcResult.corrections).toEqual([]);
      expect(dcResult.summary).toBe('');
    });

    it('should return original response when operation is not selected', async () => {
      mockStoreWith({
        aiSettings: {
          ...defaultMockState.aiSettings,
          doubleCheck: {
            enabled: true,
            provider: 'claude',
            model: 'claude-sonnet-4-20250514',
            operations: { topicExtraction: false, dispositivo: false, sentenceReview: false }
          }
        }
      });

      const { result } = renderHook(() => useAIIntegration());
      let dcResult: any;

      await act(async () => {
        dcResult = await result.current.performDoubleCheck(
          'topicExtraction',
          '{"topics": []}',
          [{ type: 'text', text: 'context' }] as any
        );
      });

      expect(dcResult.verified).toBe('{"topics": []}');
      expect(dcResult.corrections).toEqual([]);
    });

    it('should return failed result on API error', async () => {
      // The default mock has doubleCheck.enabled=true and topicExtraction=true
      vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useAIIntegration());
      let dcResult: any;

      await act(async () => {
        dcResult = await result.current.performDoubleCheck(
          'topicExtraction',
          '{"topics": ["A"]}',
          [{ type: 'text', text: 'context' }] as any
        );
      });

      expect(dcResult.verified).toBe('{"topics": ["A"]}');
      expect(dcResult.failed).toBe(true);
      expect(dcResult.summary).toBe('Erro na verificação');
    });

    it('should call onProgress callback when provided', async () => {
      // Mock successful API call that returns valid JSON
      const mockResponse = createMockResponse({
        content: [{ type: 'text', text: '```json\n{"verifiedTopics": [], "corrections": [], "summary": "All correct", "confidence": 0.95}\n```' }],
        usage: { input_tokens: 100, output_tokens: 50 }
      });
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

      const { result } = renderHook(() => useAIIntegration());
      const onProgress = vi.fn();

      await act(async () => {
        await result.current.performDoubleCheck(
          'topicExtraction',
          '{"topics": []}',
          [{ type: 'text', text: 'context' }] as any,
          onProgress
        );
      });

      expect(onProgress).toHaveBeenCalledWith(expect.stringContaining('Double Check'));
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Token tracking
  // ═══════════════════════════════════════════════════════════════════════════

  describe('token tracking', () => {
    it('should expose tokenMetrics from store', () => {
      const { result } = renderHook(() => useAIIntegration());
      expect(result.current.tokenMetrics).toBeDefined();
      expect(typeof result.current.tokenMetrics.totalInput).toBe('number');
      expect(typeof result.current.tokenMetrics.totalOutput).toBe('number');
    });

    it('should expose setTokenMetrics from store', () => {
      const { result } = renderHook(() => useAIIntegration());
      expect(typeof result.current.setTokenMetrics).toBe('function');
    });

    it('should call addTokenUsage on successful Claude call', async () => {
      const mockResponse = createMockResponse({
        content: [{ type: 'text', text: 'response' }],
        usage: { input_tokens: 500, output_tokens: 200, cache_read_input_tokens: 100 }
      });
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

      const { result } = renderHook(() => useAIIntegration());

      await act(async () => {
        await result.current.callLLM(
          [{ role: 'user', content: 'Hi' }] as any,
          {}
        );
      });

      expect(mockAddTokenUsage).toHaveBeenCalledWith(
        expect.objectContaining({
          input: 500,
          output: 200,
          cacheRead: 100,
          provider: 'claude'
        })
      );
    });
  });
});

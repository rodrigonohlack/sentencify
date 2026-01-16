/**
 * @file useAIStore.test.ts
 * @description Testes para o store de IA (providers, modelos, tokens)
 * @version 1.37.57
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  useAIStore,
  selectProvider,
  selectCurrentModel,
  selectIsThinkingEnabled,
  selectTokenMetrics,
  selectCurrentApiKey,
  selectAnonymization,
  selectDoubleCheck,
  selectApiTestStatuses,
  selectApiTestStatus
} from './useAIStore';

describe('useAIStore', () => {
  // Reset store before each test
  beforeEach(() => {
    const store = useAIStore.getState();
    store.resetSettings();
    store.resetApiTestStatuses();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PROVIDER & MODEL TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Provider & Model Management', () => {
    it('should have claude as default provider', () => {
      const state = useAIStore.getState();
      expect(state.aiSettings.provider).toBe('claude');
    });

    it('should set provider correctly', () => {
      const store = useAIStore.getState();

      store.setProvider('gemini');
      expect(useAIStore.getState().aiSettings.provider).toBe('gemini');

      store.setProvider('openai');
      expect(useAIStore.getState().aiSettings.provider).toBe('openai');

      store.setProvider('grok');
      expect(useAIStore.getState().aiSettings.provider).toBe('grok');
    });

    it('should set claude model correctly', () => {
      const store = useAIStore.getState();

      store.setClaudeModel('claude-opus-4-20250514');

      const state = useAIStore.getState();
      expect(state.aiSettings.claudeModel).toBe('claude-opus-4-20250514');
    });

    it('should update legacy model field when setting claude model', () => {
      const store = useAIStore.getState();
      store.setProvider('claude');

      store.setClaudeModel('claude-opus-4-20250514');

      const state = useAIStore.getState();
      expect(state.aiSettings.model).toBe('claude-opus-4-20250514');
    });

    it('should set gemini model correctly', () => {
      const store = useAIStore.getState();

      store.setGeminiModel('gemini-3-pro-preview');

      expect(useAIStore.getState().aiSettings.geminiModel).toBe('gemini-3-pro-preview');
    });

    it('should set openai model correctly', () => {
      const store = useAIStore.getState();

      store.setOpenAIModel('gpt-5.2');

      expect(useAIStore.getState().aiSettings.openaiModel).toBe('gpt-5.2');
    });

    it('should set grok model correctly', () => {
      const store = useAIStore.getState();

      store.setGrokModel('grok-4-1-fast-non-reasoning');

      expect(useAIStore.getState().aiSettings.grokModel).toBe('grok-4-1-fast-non-reasoning');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // API KEY TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('API Key Management', () => {
    it('should set api key for claude', () => {
      const store = useAIStore.getState();

      store.setApiKey('claude', 'sk-ant-test-key');

      expect(useAIStore.getState().aiSettings.apiKeys.claude).toBe('sk-ant-test-key');
    });

    it('should set api key for gemini', () => {
      const store = useAIStore.getState();

      store.setApiKey('gemini', 'AIza-test-key');

      expect(useAIStore.getState().aiSettings.apiKeys.gemini).toBe('AIza-test-key');
    });

    it('should set api key for openai', () => {
      const store = useAIStore.getState();

      store.setApiKey('openai', 'sk-openai-test');

      expect(useAIStore.getState().aiSettings.apiKeys.openai).toBe('sk-openai-test');
    });

    it('should set api key for grok', () => {
      const store = useAIStore.getState();

      store.setApiKey('grok', 'xai-test-key');

      expect(useAIStore.getState().aiSettings.apiKeys.grok).toBe('xai-test-key');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // THINKING/REASONING TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Thinking/Reasoning Settings', () => {
    it('should toggle extended thinking', () => {
      const store = useAIStore.getState();

      expect(useAIStore.getState().aiSettings.useExtendedThinking).toBe(false);

      store.setUseExtendedThinking(true);
      expect(useAIStore.getState().aiSettings.useExtendedThinking).toBe(true);

      store.setUseExtendedThinking(false);
      expect(useAIStore.getState().aiSettings.useExtendedThinking).toBe(false);
    });

    it('should set thinking budget', () => {
      const store = useAIStore.getState();

      store.setThinkingBudget('50000');

      expect(useAIStore.getState().aiSettings.thinkingBudget).toBe('50000');
    });

    it('should set gemini thinking level', () => {
      const store = useAIStore.getState();

      store.setGeminiThinkingLevel('low');
      expect(useAIStore.getState().aiSettings.geminiThinkingLevel).toBe('low');

      store.setGeminiThinkingLevel('medium');
      expect(useAIStore.getState().aiSettings.geminiThinkingLevel).toBe('medium');

      store.setGeminiThinkingLevel('high');
      expect(useAIStore.getState().aiSettings.geminiThinkingLevel).toBe('high');
    });

    it('should set openai reasoning level', () => {
      const store = useAIStore.getState();

      store.setOpenAIReasoningLevel('low');
      expect(useAIStore.getState().aiSettings.openaiReasoningLevel).toBe('low');

      store.setOpenAIReasoningLevel('high');
      expect(useAIStore.getState().aiSettings.openaiReasoningLevel).toBe('high');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PROMPTS & TEMPLATES TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Prompts & Templates', () => {
    it('should set custom prompt', () => {
      const store = useAIStore.getState();

      store.setCustomPrompt('Seja formal e objetivo.');

      expect(useAIStore.getState().aiSettings.customPrompt).toBe('Seja formal e objetivo.');
    });

    it('should set quick prompts', () => {
      const store = useAIStore.getState();
      const newPrompts = [
        { id: 'qp-new', label: 'Novo Prompt', prompt: 'Teste' }
      ];

      store.setQuickPrompts(newPrompts);

      expect(useAIStore.getState().aiSettings.quickPrompts).toEqual(newPrompts);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // OCR & PROCESSING TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('OCR & Processing', () => {
    it('should set OCR engine', () => {
      const store = useAIStore.getState();

      store.setOCREngine('tesseract');
      expect(useAIStore.getState().aiSettings.ocrEngine).toBe('tesseract');

      store.setOCREngine('pdfjs');
      expect(useAIStore.getState().aiSettings.ocrEngine).toBe('pdfjs');
    });

    it('should set parallel requests', () => {
      const store = useAIStore.getState();

      store.setParallelRequests(10);

      expect(useAIStore.getState().aiSettings.parallelRequests).toBe(10);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ANONYMIZATION TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Anonymization Settings', () => {
    it('should set anonymization settings', () => {
      const store = useAIStore.getState();
      const newSettings = {
        enabled: true,
        cpf: false,
        rg: true,
        pis: true,
        ctps: true,
        telefone: true,
        email: true,
        contaBancaria: true,
        valores: true,
        nomes: true,
        processo: true,
        nomesUsuario: ['João', 'Maria']
      };

      store.setAnonymization(newSettings);

      const state = useAIStore.getState();
      expect(state.aiSettings.anonymization.enabled).toBe(true);
      expect(state.aiSettings.anonymization.cpf).toBe(false);
      expect(state.aiSettings.anonymization.nomesUsuario).toEqual(['João', 'Maria']);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DOUBLE CHECK TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Double Check Settings', () => {
    it('should set double check settings', () => {
      const store = useAIStore.getState();
      const newSettings = {
        enabled: true,
        provider: 'gemini' as const,
        model: 'gemini-3-flash-preview',
        operations: {
          topicExtraction: true,
          dispositivo: false,
          sentenceReview: true,
          factsComparison: false,
          proofAnalysis: false,
          quickPrompt: false
        }
      };

      store.setDoubleCheck(newSettings);

      const state = useAIStore.getState();
      expect(state.aiSettings.doubleCheck?.enabled).toBe(true);
      expect(state.aiSettings.doubleCheck?.provider).toBe('gemini');
      expect(state.aiSettings.doubleCheck?.operations.topicExtraction).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TOKEN METRICS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Token Metrics', () => {
    it('should add token usage', () => {
      const store = useAIStore.getState();

      store.addTokenUsage({ input: 100, output: 50 });

      const state = useAIStore.getState();
      expect(state.tokenMetrics.totalInput).toBe(100);
      expect(state.tokenMetrics.totalOutput).toBe(50);
      expect(state.tokenMetrics.requestCount).toBe(1);
    });

    it('should accumulate token usage over multiple calls', () => {
      const store = useAIStore.getState();

      store.addTokenUsage({ input: 100, output: 50 });
      store.addTokenUsage({ input: 200, output: 100 });
      store.addTokenUsage({ input: 50, output: 25 });

      const state = useAIStore.getState();
      expect(state.tokenMetrics.totalInput).toBe(350);
      expect(state.tokenMetrics.totalOutput).toBe(175);
      expect(state.tokenMetrics.requestCount).toBe(3);
    });

    it('should track cache read and creation', () => {
      const store = useAIStore.getState();

      store.addTokenUsage({ cacheRead: 500, cacheCreation: 1000 });

      const state = useAIStore.getState();
      expect(state.tokenMetrics.totalCacheRead).toBe(500);
      expect(state.tokenMetrics.totalCacheCreation).toBe(1000);
    });

    it('should set lastUpdated on token usage', () => {
      const store = useAIStore.getState();

      store.addTokenUsage({ input: 100 });

      const state = useAIStore.getState();
      expect(state.tokenMetrics.lastUpdated).not.toBeNull();
    });

    it('should reset token metrics', () => {
      const store = useAIStore.getState();
      store.addTokenUsage({ input: 100, output: 50 });

      store.resetTokenMetrics();

      const state = useAIStore.getState();
      expect(state.tokenMetrics.totalInput).toBe(0);
      expect(state.tokenMetrics.totalOutput).toBe(0);
      expect(state.tokenMetrics.requestCount).toBe(0);
    });

    it('should set token metrics directly', () => {
      const store = useAIStore.getState();

      store.setTokenMetrics({
        totalInput: 500,
        totalOutput: 250,
        totalCacheRead: 100,
        totalCacheCreation: 200,
        requestCount: 5,
        lastUpdated: '2024-01-01T00:00:00Z'
      });

      const state = useAIStore.getState();
      expect(state.tokenMetrics.totalInput).toBe(500);
      expect(state.tokenMetrics.requestCount).toBe(5);
    });

    it('should set token metrics with updater function', () => {
      const store = useAIStore.getState();
      store.addTokenUsage({ input: 100 });

      store.setTokenMetrics((prev) => ({
        ...prev,
        totalInput: (prev.totalInput || 0) + 50
      }));

      expect(useAIStore.getState().tokenMetrics.totalInput).toBe(150);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // API TEST STATUS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('API Test Status', () => {
    it('should set api test status for provider', () => {
      const store = useAIStore.getState();

      store.setApiTestStatus('claude', 'testing');
      expect(useAIStore.getState().apiTestStatuses.claude).toBe('testing');

      store.setApiTestStatus('claude', 'ok');
      expect(useAIStore.getState().apiTestStatuses.claude).toBe('ok');

      store.setApiTestStatus('claude', 'error');
      expect(useAIStore.getState().apiTestStatuses.claude).toBe('error');
    });

    it('should reset all api test statuses', () => {
      const store = useAIStore.getState();
      store.setApiTestStatus('claude', 'ok');
      store.setApiTestStatus('gemini', 'error');
      store.setApiTestStatus('openai', 'testing');

      store.resetApiTestStatuses();

      const state = useAIStore.getState();
      expect(state.apiTestStatuses.claude).toBeNull();
      expect(state.apiTestStatuses.gemini).toBeNull();
      expect(state.apiTestStatuses.openai).toBeNull();
      expect(state.apiTestStatuses.grok).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // AI SETTINGS SETTER TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('setAiSettings', () => {
    it('should set ai settings directly', () => {
      const store = useAIStore.getState();
      const currentSettings = store.aiSettings;

      store.setAiSettings({
        ...currentSettings,
        provider: 'gemini',
        customPrompt: 'Novo prompt'
      });

      const state = useAIStore.getState();
      expect(state.aiSettings.provider).toBe('gemini');
      expect(state.aiSettings.customPrompt).toBe('Novo prompt');
    });

    it('should set ai settings with updater function', () => {
      const store = useAIStore.getState();

      store.setAiSettings((prev) => ({
        ...prev,
        parallelRequests: prev.parallelRequests + 5
      }));

      expect(useAIStore.getState().aiSettings.parallelRequests).toBe(10); // 5 default + 5
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RESET TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Reset Settings', () => {
    it('should reset all settings to defaults', () => {
      const store = useAIStore.getState();

      // Modify some settings
      store.setProvider('gemini');
      store.setCustomPrompt('Custom');
      store.addTokenUsage({ input: 1000 });

      // Reset
      store.resetSettings();

      const state = useAIStore.getState();
      expect(state.aiSettings.provider).toBe('claude');
      expect(state.aiSettings.customPrompt).toBe('');
      expect(state.tokenMetrics.totalInput).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SELECTORS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Selectors', () => {
    it('selectProvider should return current provider', () => {
      const store = useAIStore.getState();
      store.setProvider('openai');

      expect(selectProvider(useAIStore.getState())).toBe('openai');
    });

    it('selectCurrentModel should return correct model based on provider', () => {
      const store = useAIStore.getState();

      store.setProvider('claude');
      store.setClaudeModel('claude-opus-4-20250514');
      expect(selectCurrentModel(useAIStore.getState())).toBe('claude-opus-4-20250514');

      store.setProvider('gemini');
      store.setGeminiModel('gemini-3-pro-preview');
      expect(selectCurrentModel(useAIStore.getState())).toBe('gemini-3-pro-preview');

      store.setProvider('openai');
      expect(selectCurrentModel(useAIStore.getState())).toBe('gpt-5.2-chat-latest');

      store.setProvider('grok');
      expect(selectCurrentModel(useAIStore.getState())).toBe('grok-4-1-fast-reasoning');
    });

    it('selectIsThinkingEnabled should return thinking state', () => {
      const store = useAIStore.getState();

      expect(selectIsThinkingEnabled(useAIStore.getState())).toBe(false);

      store.setUseExtendedThinking(true);
      expect(selectIsThinkingEnabled(useAIStore.getState())).toBe(true);
    });

    it('selectTokenMetrics should return token metrics', () => {
      const store = useAIStore.getState();
      store.addTokenUsage({ input: 100, output: 50 });

      const metrics = selectTokenMetrics(useAIStore.getState());
      expect(metrics.totalInput).toBe(100);
      expect(metrics.totalOutput).toBe(50);
    });

    it('selectCurrentApiKey should return api key for current provider', () => {
      const store = useAIStore.getState();
      store.setProvider('claude');
      store.setApiKey('claude', 'test-key');

      expect(selectCurrentApiKey(useAIStore.getState())).toBe('test-key');
    });

    it('selectAnonymization should return anonymization settings', () => {
      const anon = selectAnonymization(useAIStore.getState());
      expect(anon.enabled).toBe(false);
      expect(anon.cpf).toBe(true);
    });

    it('selectDoubleCheck should return double check settings', () => {
      const dc = selectDoubleCheck(useAIStore.getState());
      expect(dc?.enabled).toBe(false);
      expect(dc?.provider).toBe('claude');
    });

    it('selectApiTestStatuses should return all statuses', () => {
      const store = useAIStore.getState();
      store.setApiTestStatus('claude', 'ok');

      const statuses = selectApiTestStatuses(useAIStore.getState());
      expect(statuses.claude).toBe('ok');
      expect(statuses.gemini).toBeNull();
    });

    it('selectApiTestStatus should return status for specific provider', () => {
      const store = useAIStore.getState();
      store.setApiTestStatus('gemini', 'error');

      const selector = selectApiTestStatus('gemini');
      expect(selector(useAIStore.getState())).toBe('error');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPATIBILITY HOOK TEST
  // ═══════════════════════════════════════════════════════════════════════════

  describe('useAISettingsCompat', () => {
    it('should be importable (compatibility layer)', async () => {
      const { useAISettingsCompat } = await import('./useAIStore');
      expect(typeof useAISettingsCompat).toBe('function');
    });
  });
});

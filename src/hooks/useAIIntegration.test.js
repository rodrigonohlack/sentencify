// Testes para useAIIntegration
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useAIIntegration, {
  aiGenerationReducer,
  aiGenerationInitialState,
  defaultAiSettings,
  defaultTokenMetrics,
  AI_SETTINGS_KEY
} from './useAIIntegration';

describe('useAIIntegration', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('aiGenerationReducer', () => {
    it('deve definir instruction via SET_INSTRUCTION', () => {
      const state = aiGenerationReducer(aiGenerationInitialState, {
        type: 'SET_INSTRUCTION',
        context: 'generic',
        value: 'Minha instrução'
      });

      expect(state.generic.instruction).toBe('Minha instrução');
    });

    it('deve definir text via SET_TEXT', () => {
      const state = aiGenerationReducer(aiGenerationInitialState, {
        type: 'SET_TEXT',
        context: 'generic',
        value: 'Texto gerado'
      });

      expect(state.generic.text).toBe('Texto gerado');
    });

    it('deve definir generating via SET_GENERATING', () => {
      const state = aiGenerationReducer(aiGenerationInitialState, {
        type: 'SET_GENERATING',
        context: 'model',
        value: true
      });

      expect(state.model.generating).toBe(true);
    });

    it('deve definir regenerating via SET_REGENERATING', () => {
      const state = aiGenerationReducer(aiGenerationInitialState, {
        type: 'SET_REGENERATING',
        context: 'relatorio',
        value: true
      });

      expect(state.relatorio.regenerating).toBe(true);
    });

    it('deve resetar contexto via RESET_CONTEXT', () => {
      const modifiedState = {
        ...aiGenerationInitialState,
        generic: { instruction: 'Teste', text: 'Texto', generating: true }
      };

      const state = aiGenerationReducer(modifiedState, {
        type: 'RESET_CONTEXT',
        context: 'generic'
      });

      expect(state.generic).toEqual(aiGenerationInitialState.generic);
    });

    it('deve resetar tudo via RESET_ALL', () => {
      const modifiedState = {
        generic: { instruction: 'X', text: 'Y', generating: true },
        model: { instruction: 'Z', text: 'W', generating: true }
      };

      const state = aiGenerationReducer(modifiedState, {
        type: 'RESET_ALL'
      });

      expect(state).toEqual(aiGenerationInitialState);
    });

    it('deve preservar state em ação desconhecida', () => {
      const state = aiGenerationReducer(aiGenerationInitialState, {
        type: 'UNKNOWN_ACTION',
        context: 'generic'
      });

      expect(state).toEqual(aiGenerationInitialState);
    });

    it('deve criar contexto ausente com defaults', () => {
      const state = aiGenerationReducer(aiGenerationInitialState, {
        type: 'SET_GENERATING',
        context: 'new_context',
        value: true
      });

      expect(state.new_context.generating).toBe(true);
    });
  });

  describe('Constantes exportadas', () => {
    it('deve exportar defaultAiSettings com provider claude', () => {
      expect(defaultAiSettings.provider).toBe('claude');
    });

    it('deve exportar defaultAiSettings com apiKeys vazias', () => {
      expect(defaultAiSettings.apiKeys.claude).toBe('');
      expect(defaultAiSettings.apiKeys.gemini).toBe('');
    });

    it('deve exportar defaultAiSettings com anonymization', () => {
      expect(defaultAiSettings.anonymization.enabled).toBe(false);
      expect(defaultAiSettings.anonymization.nomes).toBe(true);
    });

    it('deve exportar defaultTokenMetrics zerado', () => {
      expect(defaultTokenMetrics.totalInput).toBe(0);
      expect(defaultTokenMetrics.totalOutput).toBe(0);
      expect(defaultTokenMetrics.requestCount).toBe(0);
    });

    it('deve exportar AI_SETTINGS_KEY correto', () => {
      expect(AI_SETTINGS_KEY).toBe('sentencify-ai-settings');
    });
  });

  describe('Estado inicial', () => {
    it('deve iniciar com defaultAiSettings', () => {
      const { result } = renderHook(() => useAIIntegration());

      expect(result.current.aiSettings.provider).toBe('claude');
    });

    it('deve iniciar com tokenMetrics zerado', () => {
      const { result } = renderHook(() => useAIIntegration());

      expect(result.current.tokenMetrics.totalInput).toBe(0);
      expect(result.current.tokenMetrics.requestCount).toBe(0);
    });

    it('deve iniciar com aiInstruction vazio', () => {
      const { result } = renderHook(() => useAIIntegration());

      expect(result.current.aiInstruction).toBe('');
    });

    it('deve iniciar com generatingAi false', () => {
      const { result } = renderHook(() => useAIIntegration());

      expect(result.current.generatingAi).toBe(false);
    });
  });

  describe('Persistência localStorage', () => {
    it('deve carregar settings do localStorage ao iniciar', () => {
      const savedSettings = { provider: 'gemini', claudeModel: 'claude-opus-4-20250514' };
      localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(savedSettings));

      const { result } = renderHook(() => useAIIntegration());

      expect(result.current.aiSettings.provider).toBe('gemini');
      expect(result.current.aiSettings.claudeModel).toBe('claude-opus-4-20250514');
    });

    it('deve fazer migração de settings antigos sem provider', () => {
      const oldSettings = { claudeModel: 'claude-sonnet-4-20250514' };
      localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(oldSettings));

      const { result } = renderHook(() => useAIIntegration());

      expect(result.current.aiSettings.provider).toBe('claude');
    });

    it('deve fazer migração de settings antigos sem apiKeys', () => {
      const oldSettings = { provider: 'gemini' };
      localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(oldSettings));

      const { result } = renderHook(() => useAIIntegration());

      expect(result.current.aiSettings.apiKeys).toEqual({ claude: '', gemini: '' });
    });

    it('deve ignorar JSON inválido no localStorage', () => {
      localStorage.setItem(AI_SETTINGS_KEY, 'invalid json {{{');
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const { result } = renderHook(() => useAIIntegration());

      expect(result.current.aiSettings.provider).toBe('claude');
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('deve salvar settings via setAiSettings (objeto)', () => {
      const { result } = renderHook(() => useAIIntegration());
      const newSettings = { ...defaultAiSettings, provider: 'gemini' };

      act(() => {
        result.current.setAiSettings(newSettings);
      });

      const saved = localStorage.getItem(AI_SETTINGS_KEY);
      expect(JSON.parse(saved).provider).toBe('gemini');
    });

    it('deve salvar settings via setAiSettings (função)', () => {
      const { result } = renderHook(() => useAIIntegration());

      act(() => {
        result.current.setAiSettings(prev => ({
          ...prev,
          parallelRequests: 10
        }));
      });

      const saved = localStorage.getItem(AI_SETTINGS_KEY);
      expect(JSON.parse(saved).parallelRequests).toBe(10);
    });
  });

  describe('Token Metrics', () => {
    it('deve atualizar tokenMetrics via updateTokenMetrics', () => {
      const { result } = renderHook(() => useAIIntegration());

      act(() => {
        result.current.updateTokenMetrics({
          input_tokens: 100,
          output_tokens: 50
        });
      });

      expect(result.current.tokenMetrics.totalInput).toBe(100);
      expect(result.current.tokenMetrics.totalOutput).toBe(50);
      expect(result.current.tokenMetrics.requestCount).toBe(1);
    });

    it('deve acumular tokenMetrics em múltiplas chamadas', () => {
      const { result } = renderHook(() => useAIIntegration());

      act(() => {
        result.current.updateTokenMetrics({ input_tokens: 100, output_tokens: 50 });
        result.current.updateTokenMetrics({ input_tokens: 200, output_tokens: 100 });
      });

      expect(result.current.tokenMetrics.totalInput).toBe(300);
      expect(result.current.tokenMetrics.totalOutput).toBe(150);
      expect(result.current.tokenMetrics.requestCount).toBe(2);
    });

    it('deve tratar cache tokens', () => {
      const { result } = renderHook(() => useAIIntegration());

      act(() => {
        result.current.updateTokenMetrics({
          input_tokens: 100,
          output_tokens: 50,
          cache_read_input_tokens: 500,
          cache_creation_input_tokens: 200
        });
      });

      expect(result.current.tokenMetrics.totalCacheRead).toBe(500);
      expect(result.current.tokenMetrics.totalCacheCreation).toBe(200);
    });

    it('deve definir lastUpdated ao atualizar', () => {
      const { result } = renderHook(() => useAIIntegration());

      act(() => {
        result.current.updateTokenMetrics({ input_tokens: 10 });
      });

      expect(result.current.tokenMetrics.lastUpdated).toBeInstanceOf(Date);
    });

    it('deve resetar tokenMetrics via resetTokenMetrics', () => {
      const { result } = renderHook(() => useAIIntegration());

      act(() => {
        result.current.updateTokenMetrics({ input_tokens: 100, output_tokens: 50 });
        result.current.resetTokenMetrics();
      });

      expect(result.current.tokenMetrics.totalInput).toBe(0);
      expect(result.current.tokenMetrics.totalOutput).toBe(0);
      expect(result.current.tokenMetrics.requestCount).toBe(0);
    });

    it('deve tratar valores undefined como 0', () => {
      const { result } = renderHook(() => useAIIntegration());

      act(() => {
        result.current.updateTokenMetrics({});
      });

      expect(result.current.tokenMetrics.totalInput).toBe(0);
      expect(result.current.tokenMetrics.totalOutput).toBe(0);
    });
  });

  describe('Geração de IA', () => {
    it('deve atualizar aiInstruction via setAiInstruction', () => {
      const { result } = renderHook(() => useAIIntegration());

      act(() => {
        result.current.setAiInstruction('Nova instrução');
      });

      expect(result.current.aiInstruction).toBe('Nova instrução');
    });

    it('deve atualizar aiGeneratedText via setAiGeneratedText', () => {
      const { result } = renderHook(() => useAIIntegration());

      act(() => {
        result.current.setAiGeneratedText('Texto gerado pela IA');
      });

      expect(result.current.aiGeneratedText).toBe('Texto gerado pela IA');
    });

    it('deve atualizar generatingAi via setGeneratingAi', () => {
      const { result } = renderHook(() => useAIIntegration());

      act(() => {
        result.current.setGeneratingAi(true);
      });

      expect(result.current.generatingAi).toBe(true);
    });

    it('deve resetar toda geração via resetAIGeneration', () => {
      const { result } = renderHook(() => useAIIntegration());

      act(() => {
        result.current.setAiInstruction('Instrução');
        result.current.setAiGeneratedText('Texto');
        result.current.setGeneratingAi(true);
        result.current.resetAIGeneration();
      });

      expect(result.current.aiInstruction).toBe('');
      expect(result.current.aiGeneratedText).toBe('');
      expect(result.current.generatingAi).toBe(false);
    });

    it('deve acessar outros contextos via dispatchAI', () => {
      const { result } = renderHook(() => useAIIntegration());

      act(() => {
        result.current.dispatchAI({
          type: 'SET_GENERATING',
          context: 'model',
          value: true
        });
      });

      expect(result.current.aiGeneration.model.generating).toBe(true);
    });

    it('deve suportar contexto dispositivo', () => {
      const { result } = renderHook(() => useAIIntegration());

      act(() => {
        result.current.dispatchAI({
          type: 'SET_REGENERATING',
          context: 'dispositivo',
          value: true
        });
      });

      expect(result.current.aiGeneration.dispositivo.regenerating).toBe(true);
    });

    it('deve resetar contexto específico', () => {
      const { result } = renderHook(() => useAIIntegration());

      act(() => {
        result.current.dispatchAI({
          type: 'SET_TEXT',
          context: 'model',
          value: 'Texto modelo'
        });
        result.current.dispatchAI({
          type: 'RESET_CONTEXT',
          context: 'model'
        });
      });

      expect(result.current.aiGeneration.model.text).toBe('');
    });
  });

  describe('Estabilidade de referências', () => {
    it('setAiSettings deve ser estável', () => {
      const { result, rerender } = renderHook(() => useAIIntegration());
      const firstRef = result.current.setAiSettings;

      rerender();

      expect(result.current.setAiSettings).toBe(firstRef);
    });

    it('updateTokenMetrics deve ser estável', () => {
      const { result, rerender } = renderHook(() => useAIIntegration());
      const firstRef = result.current.updateTokenMetrics;

      rerender();

      expect(result.current.updateTokenMetrics).toBe(firstRef);
    });

    it('resetTokenMetrics deve ser estável', () => {
      const { result, rerender } = renderHook(() => useAIIntegration());
      const firstRef = result.current.resetTokenMetrics;

      rerender();

      expect(result.current.resetTokenMetrics).toBe(firstRef);
    });

    it('resetAIGeneration deve ser estável', () => {
      const { result, rerender } = renderHook(() => useAIIntegration());
      const firstRef = result.current.resetAIGeneration;

      rerender();

      expect(result.current.resetAIGeneration).toBe(firstRef);
    });
  });
});

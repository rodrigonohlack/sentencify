import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVoiceImprovement, VOICE_MODEL_CONFIG } from './useVoiceImprovement';

const mockCallAI = vi.fn();

describe('useVoiceImprovement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should start with isImproving=false', () => {
      const { result } = renderHook(() => useVoiceImprovement({ callAI: mockCallAI }));
      expect(result.current.isImproving).toBe(false);
    });

    it('should return improveText function', () => {
      const { result } = renderHook(() => useVoiceImprovement({ callAI: mockCallAI }));
      expect(typeof result.current.improveText).toBe('function');
    });
  });

  describe('VOICE_MODEL_CONFIG', () => {
    it('should have haiku config', () => {
      expect(VOICE_MODEL_CONFIG.haiku.provider).toBe('claude');
    });

    it('should have flash config', () => {
      expect(VOICE_MODEL_CONFIG.flash.provider).toBe('gemini');
    });

    it('should have gpt-4o-mini config', () => {
      expect(VOICE_MODEL_CONFIG['gpt-4o-mini'].provider).toBe('openai');
    });

    it('should have grok-instant config', () => {
      expect(VOICE_MODEL_CONFIG['grok-instant'].provider).toBe('grok');
    });
  });

  describe('improveText', () => {
    it('should return short text unchanged (less than 10 chars)', async () => {
      const { result } = renderHook(() => useVoiceImprovement({ callAI: mockCallAI }));

      let improved = '';
      await act(async () => {
        improved = await result.current.improveText('curto', 'haiku');
      });

      expect(improved).toBe('curto');
      expect(mockCallAI).not.toHaveBeenCalled();
    });

    it('should call AI for text longer than 10 chars', async () => {
      mockCallAI.mockResolvedValue('Texto melhorado e corrigido.');
      const { result } = renderHook(() => useVoiceImprovement({ callAI: mockCallAI }));

      let improved = '';
      await act(async () => {
        improved = await result.current.improveText('este texto eh longo o suficiente pra melhorar', 'haiku');
      });

      expect(mockCallAI).toHaveBeenCalledOnce();
      expect(improved).toBe('Texto melhorado e corrigido.');
    });

    it('should pass correct provider/model for haiku', async () => {
      mockCallAI.mockResolvedValue('improved');
      const { result } = renderHook(() => useVoiceImprovement({ callAI: mockCallAI }));

      await act(async () => {
        await result.current.improveText('texto suficientemente longo para teste', 'haiku');
      });

      const callOptions = mockCallAI.mock.calls[0][1];
      expect(callOptions.provider).toBe('claude');
      expect(callOptions.model).toBe('claude-haiku-4-5-20251001');
    });

    it('should pass correct provider/model for flash', async () => {
      mockCallAI.mockResolvedValue('improved');
      const { result } = renderHook(() => useVoiceImprovement({ callAI: mockCallAI }));

      await act(async () => {
        await result.current.improveText('texto suficientemente longo para teste', 'flash');
      });

      const callOptions = mockCallAI.mock.calls[0][1];
      expect(callOptions.provider).toBe('gemini');
      expect(callOptions.model).toBe('gemini-3-flash-preview');
    });

    it('should return original text on API error', async () => {
      mockCallAI.mockRejectedValue(new Error('API Error'));
      const { result } = renderHook(() => useVoiceImprovement({ callAI: mockCallAI }));

      const originalText = 'texto original que deveria ser retornado em caso de erro';
      let improved = '';
      await act(async () => {
        improved = await result.current.improveText(originalText, 'haiku');
      });

      expect(improved).toBe(originalText);
    });

    it('should return original text if API returns empty', async () => {
      mockCallAI.mockResolvedValue('   ');
      const { result } = renderHook(() => useVoiceImprovement({ callAI: mockCallAI }));

      const originalText = 'texto original que nao deveria ser perdido';
      let improved = '';
      await act(async () => {
        improved = await result.current.improveText(originalText, 'haiku');
      });

      expect(improved).toBe(originalText);
    });

    it('should set isImproving during API call', async () => {
      let resolvePromise: (value: string) => void;
      mockCallAI.mockImplementation(() => new Promise(resolve => { resolvePromise = resolve; }));

      const { result } = renderHook(() => useVoiceImprovement({ callAI: mockCallAI }));

      let promise: Promise<string>;
      act(() => {
        promise = result.current.improveText('texto longo o suficiente para teste', 'haiku');
      });

      expect(result.current.isImproving).toBe(true);

      await act(async () => {
        resolvePromise!('improved text');
        await promise!;
      });

      expect(result.current.isImproving).toBe(false);
    });

    it('should reset isImproving on error', async () => {
      mockCallAI.mockRejectedValue(new Error('fail'));
      const { result } = renderHook(() => useVoiceImprovement({ callAI: mockCallAI }));

      await act(async () => {
        await result.current.improveText('texto longo o suficiente para testar', 'haiku');
      });

      expect(result.current.isImproving).toBe(false);
    });

    it('should use haiku fallback for unknown model', async () => {
      mockCallAI.mockResolvedValue('improved');
      const { result } = renderHook(() => useVoiceImprovement({ callAI: mockCallAI }));

      await act(async () => {
        await result.current.improveText('texto longo o suficiente para teste', 'unknown-model' as any);
      });

      const callOptions = mockCallAI.mock.calls[0][1];
      expect(callOptions.provider).toBe('claude');
      expect(callOptions.model).toBe('claude-haiku-4-5-20251001');
    });
  });
});

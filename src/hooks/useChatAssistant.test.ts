/**
 * @file useChatAssistant.test.ts
 * @description Testes para o hook de chat interativo com assistente IA
 * @version 1.37.57
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useChatAssistant, MAX_CHAT_HISTORY_MESSAGES } from './useChatAssistant';

describe('useChatAssistant', () => {
  // Mock AI integration
  const createMockAIIntegration = (response = 'AI response') => ({
    callAI: vi.fn().mockResolvedValue(response)
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIAL STATE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Initial State', () => {
    it('should start with empty history', () => {
      const { result } = renderHook(() => useChatAssistant(createMockAIIntegration()));

      expect(result.current.history).toEqual([]);
    });

    it('should start with generating as false', () => {
      const { result } = renderHook(() => useChatAssistant(createMockAIIntegration()));

      expect(result.current.generating).toBe(false);
    });

    it('should start with null lastResponse', () => {
      const { result } = renderHook(() => useChatAssistant(createMockAIIntegration()));

      expect(result.current.lastResponse).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SEND MESSAGE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('send', () => {
    it('should send message and receive response', async () => {
      const mockAI = createMockAIIntegration('Hello from AI');
      const { result } = renderHook(() => useChatAssistant(mockAI));
      const contextBuilder = vi.fn(() => 'Context: test');

      let sendResult: { success: boolean; error?: string };

      await act(async () => {
        sendResult = await result.current.send('Hello', contextBuilder);
      });

      expect(sendResult!.success).toBe(true);
      expect(result.current.history).toHaveLength(2);
      expect(result.current.history[0].role).toBe('user');
      expect(result.current.history[0].content).toBe('Hello');
      expect(result.current.history[1].role).toBe('assistant');
      expect(result.current.history[1].content).toBe('Hello from AI');
    });

    it('should set generating to true while processing', async () => {
      const mockAI = {
        callAI: vi.fn(() => new Promise<string>((resolve) => setTimeout(() => resolve('response'), 100)))
      };
      const { result } = renderHook(() => useChatAssistant(mockAI as any));
      const contextBuilder = vi.fn(() => 'Context');

      act(() => {
        result.current.send('Hello', contextBuilder);
      });

      expect(result.current.generating).toBe(true);

      await waitFor(() => {
        expect(result.current.generating).toBe(false);
      });
    });

    it('should fail with empty message', async () => {
      const mockAI = createMockAIIntegration();
      const { result } = renderHook(() => useChatAssistant(mockAI));
      const contextBuilder = vi.fn(() => 'Context');

      let sendResult: { success: boolean; error?: string };

      await act(async () => {
        sendResult = await result.current.send('', contextBuilder);
      });

      expect(sendResult!.success).toBe(false);
      expect(sendResult!.error).toBe('Mensagem vazia');
      expect(mockAI.callAI).not.toHaveBeenCalled();
    });

    it('should fail with whitespace-only message', async () => {
      const mockAI = createMockAIIntegration();
      const { result } = renderHook(() => useChatAssistant(mockAI));
      const contextBuilder = vi.fn(() => 'Context');

      let sendResult: { success: boolean; error?: string };

      await act(async () => {
        sendResult = await result.current.send('   ', contextBuilder);
      });

      expect(sendResult!.success).toBe(false);
      expect(sendResult!.error).toBe('Mensagem vazia');
    });

    it('should fail when AI is not available', async () => {
      const { result } = renderHook(() => useChatAssistant(null));
      const contextBuilder = vi.fn(() => 'Context');

      let sendResult: { success: boolean; error?: string };

      await act(async () => {
        sendResult = await result.current.send('Hello', contextBuilder);
      });

      expect(sendResult!.success).toBe(false);
      expect(sendResult!.error).toBe('IA não disponível');
    });

    it('should fail when callAI is undefined', async () => {
      const { result } = renderHook(() => useChatAssistant({ callAI: undefined }));
      const contextBuilder = vi.fn(() => 'Context');

      let sendResult: { success: boolean; error?: string };

      await act(async () => {
        sendResult = await result.current.send('Hello', contextBuilder);
      });

      expect(sendResult!.success).toBe(false);
      expect(sendResult!.error).toBe('IA não disponível');
    });

    it('should use context builder for first message', async () => {
      const mockAI = createMockAIIntegration();
      const { result } = renderHook(() => useChatAssistant(mockAI));
      const contextBuilder = vi.fn(() => 'Full context with message');

      await act(async () => {
        await result.current.send('Hello', contextBuilder);
      });

      expect(contextBuilder).toHaveBeenCalledWith('Hello');
      expect(mockAI.callAI).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ role: 'user', content: 'Full context with message' })
        ]),
        expect.any(Object)
      );
    });

    it('should support async context builder', async () => {
      const mockAI = createMockAIIntegration();
      const { result } = renderHook(() => useChatAssistant(mockAI));
      const asyncContextBuilder = vi.fn(async () => {
        return 'Async context';
      });

      await act(async () => {
        await result.current.send('Hello', asyncContextBuilder);
      });

      expect(mockAI.callAI).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ role: 'user', content: 'Async context' })
        ]),
        expect.any(Object)
      );
    });

    it('should rebuild history for subsequent messages', async () => {
      const mockAI = createMockAIIntegration('Response');
      const { result } = renderHook(() => useChatAssistant(mockAI));
      const contextBuilder = vi.fn(() => 'Context');

      // First message
      await act(async () => {
        await result.current.send('First', contextBuilder);
      });

      // Second message
      await act(async () => {
        await result.current.send('Second', contextBuilder);
      });

      // Should have 4 messages: user1, assistant1, user2, assistant2
      expect(result.current.history).toHaveLength(4);
      expect(result.current.history[2].content).toBe('Second');
    });

    it('should handle AI errors gracefully', async () => {
      const mockAI = {
        callAI: vi.fn().mockRejectedValue(new Error('Network error'))
      };
      const { result } = renderHook(() => useChatAssistant(mockAI));
      const contextBuilder = vi.fn(() => 'Context');

      let sendResult: { success: boolean; error?: string };

      await act(async () => {
        sendResult = await result.current.send('Hello', contextBuilder);
      });

      expect(sendResult!.success).toBe(false);
      expect(sendResult!.error).toBe('Network error');
    });

    it('should add error message to history on failure', async () => {
      const mockAI = {
        callAI: vi.fn().mockRejectedValue(new Error('API error'))
      };
      const { result } = renderHook(() => useChatAssistant(mockAI));
      const contextBuilder = vi.fn(() => 'Context');

      await act(async () => {
        await result.current.send('Hello', contextBuilder);
      });

      expect(result.current.history).toHaveLength(1);
      expect((result.current.history[0] as any).error).toBe('API error');
    });

    it('should trim AI response', async () => {
      const mockAI = createMockAIIntegration('  Response with spaces  ');
      const { result } = renderHook(() => useChatAssistant(mockAI));
      const contextBuilder = vi.fn(() => 'Context');

      await act(async () => {
        await result.current.send('Hello', contextBuilder);
      });

      expect(result.current.history[1].content).toBe('Response with spaces');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // HISTORY LIMIT TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('History Limit', () => {
    it('should limit history to MAX_CHAT_HISTORY_MESSAGES', async () => {
      const mockAI = createMockAIIntegration('Response');
      const { result } = renderHook(() => useChatAssistant(mockAI));
      const contextBuilder = vi.fn(() => 'Context');

      // Send enough messages to exceed limit
      // Each send adds 2 messages (user + assistant)
      const numMessages = Math.ceil(MAX_CHAT_HISTORY_MESSAGES / 2) + 5;

      for (let i = 0; i < numMessages; i++) {
        await act(async () => {
          await result.current.send(`Message ${i}`, contextBuilder);
        });
      }

      expect(result.current.history.length).toBeLessThanOrEqual(MAX_CHAT_HISTORY_MESSAGES);
    });

    it('should preserve first message with context when limiting', async () => {
      const mockAI = createMockAIIntegration('Response');
      const { result } = renderHook(() => useChatAssistant(mockAI));
      const contextBuilder = vi.fn(() => 'First context with special data');

      // First message
      await act(async () => {
        await result.current.send('First', contextBuilder);
      });

      const firstMessageContent = result.current.history[0].content;

      // Send many more messages to trigger limit
      const numMessages = MAX_CHAT_HISTORY_MESSAGES + 5;
      for (let i = 1; i < numMessages; i++) {
        await act(async () => {
          await result.current.send(`Message ${i}`, contextBuilder);
        });
      }

      // First message should be preserved
      expect(result.current.history[0].content).toBe(firstMessageContent);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CLEAR TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('clear', () => {
    it('should clear history', async () => {
      const mockAI = createMockAIIntegration();
      const { result } = renderHook(() => useChatAssistant(mockAI));
      const contextBuilder = vi.fn(() => 'Context');

      await act(async () => {
        await result.current.send('Hello', contextBuilder);
      });

      expect(result.current.history).toHaveLength(2);

      act(() => {
        result.current.clear();
      });

      expect(result.current.history).toEqual([]);
    });

    it('should reset lastResponse to null after clear', async () => {
      const mockAI = createMockAIIntegration('Response');
      const { result } = renderHook(() => useChatAssistant(mockAI));
      const contextBuilder = vi.fn(() => 'Context');

      await act(async () => {
        await result.current.send('Hello', contextBuilder);
      });

      expect(result.current.lastResponse).toBe('Response');

      act(() => {
        result.current.clear();
      });

      expect(result.current.lastResponse).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // LAST RESPONSE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('lastResponse', () => {
    it('should return last assistant message', async () => {
      const mockAI = createMockAIIntegration('First response');
      const { result } = renderHook(() => useChatAssistant(mockAI));
      const contextBuilder = vi.fn(() => 'Context');

      await act(async () => {
        await result.current.send('Hello', contextBuilder);
      });

      expect(result.current.lastResponse).toBe('First response');
    });

    it('should update with each new response', async () => {
      const mockAI = {
        callAI: vi.fn()
          .mockResolvedValueOnce('Response 1')
          .mockResolvedValueOnce('Response 2')
      };
      const { result } = renderHook(() => useChatAssistant(mockAI));
      const contextBuilder = vi.fn(() => 'Context');

      await act(async () => {
        await result.current.send('Hello 1', contextBuilder);
      });

      expect(result.current.lastResponse).toBe('Response 1');

      await act(async () => {
        await result.current.send('Hello 2', contextBuilder);
      });

      expect(result.current.lastResponse).toBe('Response 2');
    });

    it('should return null when no assistant messages', () => {
      const { result } = renderHook(() => useChatAssistant(createMockAIIntegration()));

      expect(result.current.lastResponse).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // AI CALL PARAMETERS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('AI Call Parameters', () => {
    it('should pass correct parameters to callAI', async () => {
      const mockAI = createMockAIIntegration();
      const { result } = renderHook(() => useChatAssistant(mockAI));
      const contextBuilder = vi.fn(() => 'Context');

      await act(async () => {
        await result.current.send('Hello', contextBuilder);
      });

      expect(mockAI.callAI).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({
          maxTokens: 16000,
          useInstructions: true,
          logMetrics: true,
          temperature: 0.5,
          topP: 0.9,
          topK: 80
        })
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CONSTANTS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Constants', () => {
    it('MAX_CHAT_HISTORY_MESSAGES should be 20', () => {
      expect(MAX_CHAT_HISTORY_MESSAGES).toBe(20);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CONTENT FOR API TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('contentForApi', () => {
    it('should store contentForApi for first message', async () => {
      const mockAI = createMockAIIntegration();
      const { result } = renderHook(() => useChatAssistant(mockAI));
      const contextBuilder = vi.fn(() => 'Full context content');

      await act(async () => {
        await result.current.send('Hello', contextBuilder);
      });

      expect(result.current.history[0].contentForApi).toBe('Full context content');
    });

    it('should use contentForApi in subsequent API calls', async () => {
      const mockAI = createMockAIIntegration();
      const { result } = renderHook(() => useChatAssistant(mockAI));
      const contextBuilder = vi.fn(() => 'Full context content');

      // First message
      await act(async () => {
        await result.current.send('First', contextBuilder);
      });

      // Second message
      await act(async () => {
        await result.current.send('Second', contextBuilder);
      });

      // Second call should include contentForApi from first message
      const secondCallArgs = mockAI.callAI.mock.calls[1][0];
      expect(secondCallArgs[0].content).toBe('Full context content');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // UPDATE LAST ASSISTANT MESSAGE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('updateLastAssistantMessage', () => {
    it('should update the last assistant message content', async () => {
      const mockAI = createMockAIIntegration('Original response');
      const { result } = renderHook(() => useChatAssistant(mockAI));
      const contextBuilder = vi.fn(() => 'Context');

      await act(async () => {
        await result.current.send('Hello', contextBuilder);
      });

      expect(result.current.history[1].content).toBe('Original response');

      act(() => {
        result.current.updateLastAssistantMessage('Updated response');
      });

      expect(result.current.history[1].content).toBe('Updated response');
    });

    it('should not modify history if no assistant messages', () => {
      const mockAI = createMockAIIntegration();
      const { result } = renderHook(() => useChatAssistant(mockAI));

      act(() => {
        result.current.updateLastAssistantMessage('New content');
      });

      expect(result.current.history).toEqual([]);
    });

    it('should update only the last assistant message when multiple exist', async () => {
      const mockAI = {
        callAI: vi.fn()
          .mockResolvedValueOnce('First response')
          .mockResolvedValueOnce('Second response')
      };
      const { result } = renderHook(() => useChatAssistant(mockAI));
      const contextBuilder = vi.fn(() => 'Context');

      await act(async () => {
        await result.current.send('Hello 1', contextBuilder);
        await result.current.send('Hello 2', contextBuilder);
      });

      act(() => {
        result.current.updateLastAssistantMessage('Updated last response');
      });

      expect(result.current.history[1].content).toBe('First response');
      expect(result.current.history[3].content).toBe('Updated last response');
    });

    it('should update lastResponse after updating message', async () => {
      const mockAI = createMockAIIntegration('Original');
      const { result } = renderHook(() => useChatAssistant(mockAI));
      const contextBuilder = vi.fn(() => 'Context');

      await act(async () => {
        await result.current.send('Hello', contextBuilder);
      });

      act(() => {
        result.current.updateLastAssistantMessage('Updated');
      });

      expect(result.current.lastResponse).toBe('Updated');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SET HISTORY TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('setHistory', () => {
    it('should set history directly', () => {
      const mockAI = createMockAIIntegration();
      const { result } = renderHook(() => useChatAssistant(mockAI));

      const newHistory = [
        { role: 'user' as const, content: 'Loaded message', ts: Date.now() },
        { role: 'assistant' as const, content: 'Loaded response', ts: Date.now() },
      ];

      act(() => {
        result.current.setHistory(newHistory);
      });

      expect(result.current.history).toEqual(newHistory);
    });

    it('should update lastResponse after setHistory', () => {
      const mockAI = createMockAIIntegration();
      const { result } = renderHook(() => useChatAssistant(mockAI));

      const newHistory = [
        { role: 'user' as const, content: 'Message', ts: Date.now() },
        { role: 'assistant' as const, content: 'Custom response', ts: Date.now() },
      ];

      act(() => {
        result.current.setHistory(newHistory);
      });

      expect(result.current.lastResponse).toBe('Custom response');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CACHE OPTIONS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Cache Options', () => {
    it('should load history from cache on mount with topicTitle', async () => {
      const mockAI = createMockAIIntegration();
      const cachedMessages = [
        { role: 'user' as const, content: 'Cached message', ts: Date.now() },
        { role: 'assistant' as const, content: 'Cached response', ts: Date.now() },
      ];
      const getChat = vi.fn().mockResolvedValue(cachedMessages);
      const saveChat = vi.fn().mockResolvedValue(undefined);

      const { result } = renderHook(() => useChatAssistant(mockAI, {
        topicTitle: 'Test Topic',
        getChat,
        saveChat,
      }));

      await waitFor(() => {
        expect(result.current.history).toEqual(cachedMessages);
      });

      expect(getChat).toHaveBeenCalledWith('Test Topic');
    });

    it('should save history to cache when messages change', async () => {
      const mockAI = createMockAIIntegration('Response');
      const saveChat = vi.fn().mockResolvedValue(undefined);
      const getChat = vi.fn().mockResolvedValue([]);

      const { result } = renderHook(() => useChatAssistant(mockAI, {
        topicTitle: 'Test Topic',
        saveChat,
        getChat,
      }));

      await waitFor(() => {
        expect(getChat).toHaveBeenCalled();
      });

      await act(async () => {
        await result.current.send('Hello', () => 'Context');
      });

      await waitFor(() => {
        expect(saveChat).toHaveBeenCalledWith('Test Topic', expect.any(Array));
      });
    });

    it('should call deleteChat when clear is called with cache', async () => {
      const mockAI = createMockAIIntegration('Response');
      const deleteChat = vi.fn().mockResolvedValue(undefined);
      const getChat = vi.fn().mockResolvedValue([]);
      const saveChat = vi.fn().mockResolvedValue(undefined);

      const { result } = renderHook(() => useChatAssistant(mockAI, {
        topicTitle: 'Test Topic',
        deleteChat,
        getChat,
        saveChat,
      }));

      await waitFor(() => {
        expect(getChat).toHaveBeenCalled();
      });

      act(() => {
        result.current.clear();
      });

      expect(deleteChat).toHaveBeenCalledWith('Test Topic');
    });

    it('should handle cache load errors gracefully', async () => {
      const mockAI = createMockAIIntegration();
      const getChat = vi.fn().mockRejectedValue(new Error('Cache error'));
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const { result } = renderHook(() => useChatAssistant(mockAI, {
        topicTitle: 'Test Topic',
        getChat,
      }));

      await waitFor(() => {
        expect(result.current.history).toEqual([]);
      });

      consoleSpy.mockRestore();
    });

    it('should reload from cache when isOpen changes to true', async () => {
      const mockAI = createMockAIIntegration();
      const cachedMessages = [
        { role: 'user' as const, content: 'Cached', ts: Date.now() },
        { role: 'assistant' as const, content: 'Response', ts: Date.now() },
      ];
      const getChat = vi.fn().mockResolvedValue(cachedMessages);

      const { result, rerender } = renderHook(
        (props) => useChatAssistant(mockAI, props),
        { initialProps: { topicTitle: 'Test', getChat, isOpen: false } }
      );

      await waitFor(() => {
        expect(getChat).toHaveBeenCalled();
      });

      getChat.mockClear();

      rerender({ topicTitle: 'Test', getChat, isOpen: true });

      await waitFor(() => {
        expect(getChat).toHaveBeenCalled();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RESPONSE RETURN TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Response Return', () => {
    it('should return response in send result', async () => {
      const mockAI = createMockAIIntegration('Direct response');
      const { result } = renderHook(() => useChatAssistant(mockAI));
      const contextBuilder = vi.fn(() => 'Context');

      let sendResult: { success: boolean; response?: string | null };

      await act(async () => {
        sendResult = await result.current.send('Hello', contextBuilder);
      });

      expect(sendResult!.response).toBe('Direct response');
    });

    it('should return null response on error', async () => {
      const mockAI = {
        callAI: vi.fn().mockRejectedValue(new Error('Error'))
      };
      const { result } = renderHook(() => useChatAssistant(mockAI));
      const contextBuilder = vi.fn(() => 'Context');

      let sendResult: { success: boolean; response?: string | null };

      await act(async () => {
        sendResult = await result.current.send('Hello', contextBuilder);
      });

      expect(sendResult!.response).toBeNull();
    });
  });
});

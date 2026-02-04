/**
 * @file useAIIntegration.ts
 * @description Hook para integração com provedores de IA
 */

import { useCallback } from 'react';
import { useAIStore } from '../stores';
import { API_BASE } from '../constants';
import type { AIMessage, AICallOptions, ClaudeContentBlock, OpenAIMessage, GrokMessage, GeminiMessage } from '../types';

const RETRY_MAX_ATTEMPTS = 3;
const RETRY_INITIAL_DELAY = 3000;
const RETRY_BACKOFF_MULTIPLIER = 2;

export const useAIIntegration = () => {
  const aiSettings = useAIStore((s) => s.aiSettings);
  const addTokenUsage = useAIStore((s) => s.addTokenUsage);

  const callClaudeAPI = useCallback(async (
    messages: AIMessage[],
    options: AICallOptions = {}
  ): Promise<string> => {
    const {
      maxTokens = 8000,
      systemPrompt = null,
      model = aiSettings.claudeModel,
      disableThinking = false
    } = options;

    let lastError: Error | null = null;
    const useThinking = aiSettings.useExtendedThinking && !disableThinking;
    const thinkingBudget = parseInt(aiSettings.thinkingBudget) || 10000;

    for (let attempt = 0; attempt < RETRY_MAX_ATTEMPTS; attempt++) {
      try {
        const requestBody: Record<string, unknown> = {
          model,
          max_tokens: useThinking ? Math.max(maxTokens, thinkingBudget + 2000) : maxTokens,
          messages
        };

        if (systemPrompt) {
          requestBody.system = systemPrompt;
        }

        // Extended Thinking para Claude
        if (useThinking) {
          requestBody.thinking = {
            type: 'enabled',
            budget_tokens: thinkingBudget
          };
        }

        const response = await fetch(`${API_BASE}/api/claude/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': aiSettings.apiKeys.claude
          },
          body: JSON.stringify(requestBody)
        });

        if ([429, 502, 503, 529].includes(response.status) && attempt < RETRY_MAX_ATTEMPTS - 1) {
          const delay = RETRY_INITIAL_DELAY * Math.pow(RETRY_BACKOFF_MULTIPLIER, attempt);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error?.message || `HTTP ${response.status}`);
        }

        if (data.usage) {
          addTokenUsage({
            input: data.usage.input_tokens || 0,
            output: data.usage.output_tokens || 0,
            cacheRead: data.usage.cache_read_input_tokens || 0,
            cacheCreation: data.usage.cache_creation_input_tokens || 0
          });
        }

        const textContent = data.content?.find((c: ClaudeContentBlock) => c.type === 'text')?.text || '';
        return textContent.trim();

      } catch (err) {
        lastError = err as Error;
        if (attempt < RETRY_MAX_ATTEMPTS - 1) {
          const delay = RETRY_INITIAL_DELAY * Math.pow(RETRY_BACKOFF_MULTIPLIER, attempt);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
      }
    }

    throw lastError || new Error('Todas as tentativas falharam');
  }, [aiSettings, addTokenUsage]);

  const callGeminiAPI = useCallback(async (
    messages: AIMessage[],
    options: AICallOptions = {}
  ): Promise<string> => {
    const {
      maxTokens = 8000,
      systemPrompt = null,
      model = aiSettings.geminiModel
    } = options;

    const contents: GeminiMessage[] = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' as const : 'user' as const,
      parts: Array.isArray(msg.content)
        ? msg.content.map(c => {
            if (typeof c === 'string') return { text: c };
            if (c.type === 'text') return { text: c.text };
            return { text: JSON.stringify(c) };
          })
        : [{ text: msg.content as string }]
    }));

    // Configuração de thinking level para Gemini
    const thinkingLevel = aiSettings.geminiThinkingLevel || 'high';
    const thinkingConfig = thinkingLevel !== 'minimal' ? {
      thinkingConfig: { thinkingBudget: thinkingLevel === 'high' ? 8192 : thinkingLevel === 'medium' ? 4096 : 2048 }
    } : {};

    const request: Record<string, unknown> = {
      contents,
      generationConfig: { maxOutputTokens: maxTokens, ...thinkingConfig }
    };

    if (systemPrompt) {
      request.systemInstruction = { parts: [{ text: systemPrompt }] };
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < RETRY_MAX_ATTEMPTS; attempt++) {
      try {
        const response = await fetch(`${API_BASE}/api/gemini/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model,
            apiKey: aiSettings.apiKeys.gemini,
            request
          })
        });

        if ([429, 500, 502, 503].includes(response.status) && attempt < RETRY_MAX_ATTEMPTS - 1) {
          const delay = RETRY_INITIAL_DELAY * Math.pow(RETRY_BACKOFF_MULTIPLIER, attempt);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error?.message || `HTTP ${response.status}`);
        }

        if (data.usageMetadata) {
          addTokenUsage({
            input: data.usageMetadata.promptTokenCount || 0,
            output: data.usageMetadata.candidatesTokenCount || 0
          });
        }

        // Gemini com thinking retorna múltiplas parts - precisamos encontrar a part com texto
        const parts = data.candidates?.[0]?.content?.parts || [];
        const textPart = parts.find((p: { text?: string }) => p.text !== undefined);
        const textContent = textPart?.text || '';
        return textContent.trim();

      } catch (err) {
        lastError = err as Error;
        if (attempt < RETRY_MAX_ATTEMPTS - 1) {
          await new Promise(r => setTimeout(r, RETRY_INITIAL_DELAY * Math.pow(RETRY_BACKOFF_MULTIPLIER, attempt)));
          continue;
        }
      }
    }

    throw lastError || new Error('Todas as tentativas falharam');
  }, [aiSettings, addTokenUsage]);

  const callOpenAIAPI = useCallback(async (
    messages: AIMessage[],
    options: AICallOptions = {}
  ): Promise<string> => {
    const {
      maxTokens = 8000,
      systemPrompt = null,
      model = aiSettings.openaiModel
    } = options;

    const openaiMessages: OpenAIMessage[] = [];

    if (systemPrompt) {
      openaiMessages.push({ role: 'system', content: systemPrompt });
    }

    for (const msg of messages) {
      openaiMessages.push({
        role: msg.role,
        content: Array.isArray(msg.content)
          ? msg.content.map(c => {
              if (typeof c === 'string') return { type: 'text', text: c };
              if (c.type === 'text') return { type: 'text', text: c.text };
              return { type: 'text', text: JSON.stringify(c) };
            })
          : msg.content
      });
    }

    let lastError: Error | null = null;

    // Reasoning para GPT-5.2 (modelo com thinking)
    const isReasoningModel = model === 'gpt-5.2';
    const reasoningLevel = aiSettings.openaiReasoningLevel || 'medium';

    for (let attempt = 0; attempt < RETRY_MAX_ATTEMPTS; attempt++) {
      try {
        const requestBody: Record<string, unknown> = {
          model,
          messages: openaiMessages,
          max_tokens: maxTokens
        };

        // Adicionar reasoning_effort para modelo com thinking
        if (isReasoningModel) {
          requestBody.reasoning_effort = reasoningLevel;
        }

        const response = await fetch(`${API_BASE}/api/openai/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': aiSettings.apiKeys.openai
          },
          body: JSON.stringify(requestBody)
        });

        if ([429, 500, 502, 503].includes(response.status) && attempt < RETRY_MAX_ATTEMPTS - 1) {
          const delay = RETRY_INITIAL_DELAY * Math.pow(RETRY_BACKOFF_MULTIPLIER, attempt);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error?.message || `HTTP ${response.status}`);
        }

        if (data.usage) {
          addTokenUsage({
            input: data.usage.prompt_tokens || 0,
            output: data.usage.completion_tokens || 0
          });
        }

        return data.choices?.[0]?.message?.content?.trim() || '';

      } catch (err) {
        lastError = err as Error;
        if (attempt < RETRY_MAX_ATTEMPTS - 1) {
          await new Promise(r => setTimeout(r, RETRY_INITIAL_DELAY * Math.pow(RETRY_BACKOFF_MULTIPLIER, attempt)));
          continue;
        }
      }
    }

    throw lastError || new Error('Todas as tentativas falharam');
  }, [aiSettings, addTokenUsage]);

  const callGrokAPI = useCallback(async (
    messages: AIMessage[],
    options: AICallOptions = {}
  ): Promise<string> => {
    const {
      maxTokens = 8000,
      systemPrompt = null,
      model = aiSettings.grokModel
    } = options;

    const grokMessages: GrokMessage[] = [];

    if (systemPrompt) {
      grokMessages.push({ role: 'system', content: systemPrompt });
    }

    for (const msg of messages) {
      grokMessages.push({
        role: msg.role,
        content: Array.isArray(msg.content)
          ? msg.content.map(c => {
              if (typeof c === 'string') return c;
              if (c.type === 'text') return c.text;
              return JSON.stringify(c);
            }).join('\n')
          : msg.content
      });
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < RETRY_MAX_ATTEMPTS; attempt++) {
      try {
        const response = await fetch(`${API_BASE}/api/grok/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': aiSettings.apiKeys.grok
          },
          body: JSON.stringify({
            model,
            messages: grokMessages,
            max_tokens: maxTokens
          })
        });

        if ([429, 500, 502, 503].includes(response.status) && attempt < RETRY_MAX_ATTEMPTS - 1) {
          const delay = RETRY_INITIAL_DELAY * Math.pow(RETRY_BACKOFF_MULTIPLIER, attempt);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error?.message || `HTTP ${response.status}`);
        }

        if (data.usage) {
          addTokenUsage({
            input: data.usage.prompt_tokens || 0,
            output: data.usage.completion_tokens || 0
          });
        }

        return data.choices?.[0]?.message?.content?.trim() || '';

      } catch (err) {
        lastError = err as Error;
        if (attempt < RETRY_MAX_ATTEMPTS - 1) {
          await new Promise(r => setTimeout(r, RETRY_INITIAL_DELAY * Math.pow(RETRY_BACKOFF_MULTIPLIER, attempt)));
          continue;
        }
      }
    }

    throw lastError || new Error('Todas as tentativas falharam');
  }, [aiSettings, addTokenUsage]);

  // ═══════════════════════════════════════════════════════════════════════════
  // STREAMING APIs - Evita timeout em operações longas
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Chamada Claude com streaming silencioso (não exibe texto parcial)
   * Usa SSE para manter conexão ativa e evitar timeout
   */
  const callClaudeAPIStream = useCallback(async (
    messages: AIMessage[],
    options: AICallOptions = {}
  ): Promise<string> => {
    const {
      maxTokens = 16000,
      systemPrompt = null,
      model = aiSettings.claudeModel,
      disableThinking = false
    } = options;

    const useThinking = aiSettings.useExtendedThinking && !disableThinking;
    const thinkingBudget = parseInt(aiSettings.thinkingBudget) || 10000;

    const requestBody: Record<string, unknown> = {
      model,
      max_tokens: useThinking ? Math.max(maxTokens, thinkingBudget + 2000) : maxTokens,
      messages
    };

    if (systemPrompt) {
      requestBody.system = systemPrompt;
    }

    if (useThinking) {
      requestBody.thinking = {
        type: 'enabled',
        budget_tokens: thinkingBudget
      };
    }

    const response = await fetch(`${API_BASE}/api/claude/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': aiSettings.apiKeys.claude
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    if (!response.body) {
      throw new Error('Response body is null');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const parsed = JSON.parse(line.slice(6));
            // Formato simplificado do servidor proxy
            if (parsed.type === 'text' && parsed.text) {
              fullText += parsed.text;
            }
            if (parsed.type === 'error') {
              throw new Error(parsed.error?.message || 'Erro no streaming');
            }
            if (parsed.type === 'done' && parsed.usage) {
              addTokenUsage({
                input: parsed.usage.input_tokens || 0,
                output: parsed.usage.output_tokens || 0,
                cacheRead: parsed.usage.cache_read_input_tokens || 0,
                cacheCreation: parsed.usage.cache_creation_input_tokens || 0
              });
            }
          } catch (e) {
            if (e instanceof SyntaxError) continue;
            throw e;
          }
        }
      }
    }

    return fullText.trim();
  }, [aiSettings, addTokenUsage]);

  /**
   * Chamada Gemini com streaming silencioso
   */
  const callGeminiAPIStream = useCallback(async (
    messages: AIMessage[],
    options: AICallOptions = {}
  ): Promise<string> => {
    const {
      maxTokens = 16000,
      systemPrompt = null,
      model = aiSettings.geminiModel
    } = options;

    const contents: GeminiMessage[] = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' as const : 'user' as const,
      parts: Array.isArray(msg.content)
        ? msg.content.map(c => {
            if (typeof c === 'string') return { text: c };
            if (c.type === 'text') return { text: c.text };
            return { text: JSON.stringify(c) };
          })
        : [{ text: msg.content as string }]
    }));

    const thinkingLevel = aiSettings.geminiThinkingLevel || 'high';
    const thinkingConfig = thinkingLevel !== 'minimal' ? {
      thinkingConfig: { thinkingBudget: thinkingLevel === 'high' ? 8192 : thinkingLevel === 'medium' ? 4096 : 2048 }
    } : {};

    const request: Record<string, unknown> = {
      contents,
      generationConfig: { maxOutputTokens: maxTokens, ...thinkingConfig }
    };

    if (systemPrompt) {
      request.systemInstruction = { parts: [{ text: systemPrompt }] };
    }

    const response = await fetch(`${API_BASE}/api/gemini/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        apiKey: aiSettings.apiKeys.gemini,
        request
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    if (!response.body) {
      throw new Error('Response body is null');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const parsed = JSON.parse(line.slice(6));
            // Formato simplificado do servidor proxy
            if (parsed.type === 'text' && parsed.text) {
              fullText += parsed.text;
            }
            if (parsed.type === 'error') {
              throw new Error(parsed.error?.message || 'Erro no streaming');
            }
            if (parsed.type === 'done' && parsed.usage) {
              addTokenUsage({
                input: parsed.usage.promptTokenCount || parsed.usage.input_tokens || 0,
                output: parsed.usage.candidatesTokenCount || parsed.usage.output_tokens || 0
              });
            }
          } catch (e) {
            if (e instanceof SyntaxError) continue;
            throw e;
          }
        }
      }
    }

    return fullText.trim();
  }, [aiSettings, addTokenUsage]);

  /**
   * Chamada OpenAI com streaming silencioso
   */
  const callOpenAIAPIStream = useCallback(async (
    messages: AIMessage[],
    options: AICallOptions = {}
  ): Promise<string> => {
    const {
      maxTokens = 16000,
      systemPrompt = null,
      model = aiSettings.openaiModel
    } = options;

    const openaiMessages: OpenAIMessage[] = [];

    if (systemPrompt) {
      openaiMessages.push({ role: 'system', content: systemPrompt });
    }

    for (const msg of messages) {
      openaiMessages.push({
        role: msg.role,
        content: Array.isArray(msg.content)
          ? msg.content.map(c => {
              if (typeof c === 'string') return { type: 'text', text: c };
              if (c.type === 'text') return { type: 'text', text: c.text };
              return { type: 'text', text: JSON.stringify(c) };
            })
          : msg.content
      });
    }

    const isReasoningModel = model === 'gpt-5.2';
    const reasoningLevel = aiSettings.openaiReasoningLevel || 'medium';

    const requestBody: Record<string, unknown> = {
      model,
      messages: openaiMessages,
      max_tokens: maxTokens,
      stream: true
    };

    if (isReasoningModel) {
      requestBody.reasoning_effort = reasoningLevel;
    }

    const response = await fetch(`${API_BASE}/api/openai/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': aiSettings.apiKeys.openai
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    if (!response.body) {
      throw new Error('Response body is null');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const parsed = JSON.parse(line.slice(6));
            // Formato simplificado do servidor proxy
            if (parsed.type === 'text' && parsed.text) {
              fullText += parsed.text;
            }
            if (parsed.type === 'error') {
              throw new Error(parsed.error?.message || 'Erro no streaming');
            }
            if (parsed.type === 'done' && parsed.usage) {
              addTokenUsage({
                input: parsed.usage.prompt_tokens || 0,
                output: parsed.usage.completion_tokens || 0
              });
            }
          } catch (e) {
            if (e instanceof SyntaxError) continue;
            throw e;
          }
        }
      }
    }

    return fullText.trim();
  }, [aiSettings, addTokenUsage]);

  /**
   * Chamada Grok com streaming silencioso
   */
  const callGrokAPIStream = useCallback(async (
    messages: AIMessage[],
    options: AICallOptions = {}
  ): Promise<string> => {
    const {
      maxTokens = 16000,
      systemPrompt = null,
      model = aiSettings.grokModel
    } = options;

    const grokMessages: GrokMessage[] = [];

    if (systemPrompt) {
      grokMessages.push({ role: 'system', content: systemPrompt });
    }

    for (const msg of messages) {
      grokMessages.push({
        role: msg.role,
        content: Array.isArray(msg.content)
          ? msg.content.map(c => {
              if (typeof c === 'string') return c;
              if (c.type === 'text') return c.text;
              return JSON.stringify(c);
            }).join('\n')
          : msg.content
      });
    }

    const response = await fetch(`${API_BASE}/api/grok/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': aiSettings.apiKeys.grok
      },
      body: JSON.stringify({
        model,
        messages: grokMessages,
        max_tokens: maxTokens,
        stream: true
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    if (!response.body) {
      throw new Error('Response body is null');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const parsed = JSON.parse(line.slice(6));
            // Formato simplificado do servidor proxy
            if (parsed.type === 'text' && parsed.text) {
              fullText += parsed.text;
            }
            if (parsed.type === 'error') {
              throw new Error(parsed.error?.message || 'Erro no streaming');
            }
            if (parsed.type === 'done' && parsed.usage) {
              addTokenUsage({
                input: parsed.usage.prompt_tokens || 0,
                output: parsed.usage.completion_tokens || 0
              });
            }
          } catch (e) {
            if (e instanceof SyntaxError) continue;
            throw e;
          }
        }
      }
    }

    return fullText.trim();
  }, [aiSettings, addTokenUsage]);

  /**
   * Chamada IA com streaming - escolhe provider automaticamente
   * Usa SSE para evitar timeout em operações longas
   */
  const callAIStream = useCallback(async (
    messages: AIMessage[],
    options: AICallOptions = {}
  ): Promise<string> => {
    const provider = aiSettings.provider;

    switch (provider) {
      case 'claude':
        return callClaudeAPIStream(messages, options);
      case 'gemini':
        return callGeminiAPIStream(messages, options);
      case 'openai':
        return callOpenAIAPIStream(messages, options);
      case 'grok':
        return callGrokAPIStream(messages, options);
      default:
        return callClaudeAPIStream(messages, options);
    }
  }, [aiSettings.provider, callClaudeAPIStream, callGeminiAPIStream, callOpenAIAPIStream, callGrokAPIStream]);

  const callAI = useCallback(async (
    messages: AIMessage[],
    options: AICallOptions = {}
  ): Promise<string> => {
    const provider = aiSettings.provider;

    switch (provider) {
      case 'claude':
        return callClaudeAPI(messages, options);
      case 'gemini':
        return callGeminiAPI(messages, options);
      case 'openai':
        return callOpenAIAPI(messages, options);
      case 'grok':
        return callGrokAPI(messages, options);
      default:
        return callClaudeAPI(messages, options);
    }
  }, [aiSettings.provider, callClaudeAPI, callGeminiAPI, callOpenAIAPI, callGrokAPI]);

  return {
    callAI,
    callAIStream,
    callClaudeAPI,
    callGeminiAPI,
    callOpenAIAPI,
    callGrokAPI,
    callClaudeAPIStream,
    callGeminiAPIStream,
    callOpenAIAPIStream,
    callGrokAPIStream,
    aiSettings
  };
};

export default useAIIntegration;

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

    // v1.32.38: Gemini thinking consome maxOutputTokens - adicionar buffer
    const thinkingLevel = aiSettings.geminiThinkingLevel || 'high';
    const thinkingBuffer: Record<string, number> = {
      'minimal': 1024,
      'low': 4000,
      'medium': 8000,
      'high': 16000
    };
    const effectiveBuffer = thinkingBuffer[thinkingLevel] || 8000;

    const request: Record<string, unknown> = {
      contents,
      generationConfig: {
        maxOutputTokens: maxTokens + effectiveBuffer,
        thinking_config: thinkingLevel !== 'minimal' ? {
          thinking_budget: effectiveBuffer,
          includeThoughts: true
        } : undefined
      }
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

        const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
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
    callClaudeAPI,
    callGeminiAPI,
    callOpenAIAPI,
    callGrokAPI,
    aiSettings
  };
};

export default useAIIntegration;

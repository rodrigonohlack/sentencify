// ═══════════════════════════════════════════════════════════════════════════
// HOOK - Integração com Provedores de IA
// v1.41.0 - Hook para chamadas de IA (copiado do Analisador)
// ═══════════════════════════════════════════════════════════════════════════

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
          headers: { 'Content-Type': 'application/json', 'x-api-key': aiSettings.apiKeys.gemini },
          body: JSON.stringify({
            model,
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
    const isReasoningModel = model === 'gpt-5.2';
    const reasoningLevel = aiSettings.openaiReasoningLevel || 'medium';

    for (let attempt = 0; attempt < RETRY_MAX_ATTEMPTS; attempt++) {
      try {
        const requestBody: Record<string, unknown> = {
          model,
          messages: openaiMessages,
          max_tokens: maxTokens
        };

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

  /**
   * Chamada IA unificada - escolhe provider automaticamente
   */
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

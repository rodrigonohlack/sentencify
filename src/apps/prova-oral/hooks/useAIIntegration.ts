/**
 * @file useAIIntegration.ts
 * @description Hook para integração com provedores de IA
 * v1.39.08: Adicionado streaming para evitar timeout do Render
 */

import { useCallback } from 'react';
import { useAIStore } from '../stores';
import { API_BASE } from '../constants';
import type { AIMessage, AICallOptions, ClaudeContentBlock, OpenAIMessage, GrokMessage, GeminiMessage } from '../types';

const RETRY_MAX_ATTEMPTS = 3;
const RETRY_INITIAL_DELAY = 3000;
const RETRY_BACKOFF_MULTIPLIER = 2;

/** Callback para receber chunks de texto durante streaming */
export type StreamChunkCallback = (fullText: string) => void;

/** Opções adicionais para chamadas com streaming */
export interface AIStreamOptions extends AICallOptions {
  onChunk?: StreamChunkCallback;
}

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
          requestBody.system = [{
            type: 'text',
            text: systemPrompt,
            cache_control: { type: 'ephemeral' }
          }];
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

        if (data.stop_reason === 'max_tokens') {
          throw new Error('A análise foi truncada por exceder o limite de tokens. Tente com uma transcrição menor.');
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
    // Gemini Pro só aceita low/high - converter valores inválidos
    // v1.43.25: gate isGemini3 — Gemma 4 não usa thinking_config nem temperature 1.0
    const isGemini3 = model?.includes('gemini-3') || model?.includes('3-flash') || model?.includes('3-pro');
    let thinkingLevel = aiSettings.geminiThinkingLevel || 'high';
    const isPro = model?.includes('pro');
    if (isPro && (thinkingLevel === 'minimal' || thinkingLevel === 'medium')) {
      thinkingLevel = 'low';
    }

    const thinkingBuffer: Record<string, number> = {
      'minimal': 4096,
      'low': 16000,
      'medium': 32000,
      'high': 48000
    };
    const effectiveBuffer = thinkingBuffer[thinkingLevel] || 32000;

    const request: Record<string, unknown> = {
      contents,
      generationConfig: isGemini3 ? {
        maxOutputTokens: 128000,  // Fixo para evitar que o modelo "economize" texto
        temperature: 1.0,  // Gemini 3 requer temperature 1.0
        thinking_config: {
          thinking_budget: effectiveBuffer,
          includeThoughts: true
        }
      } : {
        maxOutputTokens: 128000  // Gemma 4: sem thinking_config, sem forçar temperature
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

        if (data.candidates?.[0]?.finishReason === 'MAX_TOKENS') {
          throw new Error('A análise foi truncada por exceder o limite de tokens. Tente com uma transcrição menor.');
        }

        if (data.usageMetadata) {
          // v1.42.08: promptTokenCount já inclui cachedContentTokenCount — subtrair
          // para evitar double-count (consistente com Claude).
          const cached = data.usageMetadata.cachedContentTokenCount || 0;
          const prompt = data.usageMetadata.promptTokenCount || 0;
          addTokenUsage({
            input: Math.max(0, prompt - cached),
            output: data.usageMetadata.candidatesTokenCount || 0,
            cacheRead: cached
          });
        }

        // v1.32.35: Com thinking habilitado, parts[0] é o thinking block
        // Buscar o primeiro part que NÃO seja thinking (thought !== true)
        const parts = data.candidates?.[0]?.content?.parts || [];
        const textPart = parts.find((p: { thought?: boolean; text?: string }) => !p.thought && p.text);
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

        if (data.choices?.[0]?.finish_reason === 'length') {
          throw new Error('A análise foi truncada por exceder o limite de tokens. Tente com uma transcrição menor.');
        }

        if (data.usage) {
          addTokenUsage({
            input: data.usage.prompt_tokens || 0,
            output: data.usage.completion_tokens || 0,
            cacheRead: data.usage.prompt_tokens_details?.cached_tokens || 0
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

        if (data.choices?.[0]?.finish_reason === 'length') {
          throw new Error('A análise foi truncada por exceder o limite de tokens. Tente com uma transcrição menor.');
        }

        if (data.usage) {
          addTokenUsage({
            input: data.usage.prompt_tokens || 0,
            output: data.usage.completion_tokens || 0,
            cacheRead: data.usage.prompt_tokens_details?.cached_tokens || 0
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

  // v1.43.10: DeepSeek V4 (non-stream) — mantém paridade com src/hooks/useAIIntegration.ts
  const callDeepseekAPI = useCallback(async (
    messages: AIMessage[],
    options: AICallOptions = {}
  ): Promise<string> => {
    const {
      maxTokens = 8000,
      systemPrompt = null,
      model = aiSettings.deepseekModel || 'deepseek-v4-flash',
      disableThinking = false
    } = options;

    const deepseekMessages: GrokMessage[] = [];
    if (systemPrompt) {
      deepseekMessages.push({ role: 'system', content: systemPrompt });
    }
    for (const msg of messages) {
      deepseekMessages.push({
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

    const thinkingEnabled = !disableThinking && (aiSettings.deepseekThinking !== false);
    const reasoningEffort = aiSettings.deepseekReasoningEffort || 'high';
    const requestBody: Record<string, unknown> = {
      model,
      messages: deepseekMessages,
      max_tokens: maxTokens,
      thinking: { type: thinkingEnabled ? 'enabled' : 'disabled' }
    };
    if (thinkingEnabled) {
      requestBody.reasoning_effort = reasoningEffort;
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < RETRY_MAX_ATTEMPTS; attempt++) {
      try {
        const response = await fetch(`${API_BASE}/api/deepseek/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': aiSettings.apiKeys.deepseek || ''
          },
          body: JSON.stringify(requestBody)
        });

        if ([429, 500, 502, 503, 529].includes(response.status) && attempt < RETRY_MAX_ATTEMPTS - 1) {
          const delay = RETRY_INITIAL_DELAY * Math.pow(RETRY_BACKOFF_MULTIPLIER, attempt);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error?.message || `HTTP ${response.status}`);
        }

        if (data.usage) {
          const cacheHit = data.usage.prompt_cache_hit_tokens || 0;
          const cacheMiss = data.usage.prompt_cache_miss_tokens || 0;
          addTokenUsage({
            input: cacheMiss || data.usage.prompt_tokens || 0,
            output: data.usage.completion_tokens || 0,
            cacheRead: cacheHit
          });
        }

        const message = data.choices?.[0]?.message;
        const content = (message?.content || '').trim();
        if (!content && message?.reasoning_content) {
          console.warn('[DeepSeek] content vazio, usando reasoning_content como fallback');
          return String(message.reasoning_content).trim();
        }
        return content;

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
      case 'deepseek':
        return callDeepseekAPI(messages, options);
      default:
        return callClaudeAPI(messages, options);
    }
  }, [aiSettings.provider, callClaudeAPI, callGeminiAPI, callOpenAIAPI, callGrokAPI, callDeepseekAPI]);

  // ═══════════════════════════════════════════════════════════════════════════
  // STREAMING APIs - Evita timeout do Render com resposta em chunks
  // ═══════════════════════════════════════════════════════════════════════════

  const callClaudeAPIStream = useCallback(async (
    messages: AIMessage[],
    options: AIStreamOptions = {}
  ): Promise<string> => {
    const {
      maxTokens = 8000,
      systemPrompt = null,
      model = aiSettings.claudeModel,
      disableThinking = false,
      onChunk
    } = options;

    const useThinking = aiSettings.useExtendedThinking && !disableThinking;
    const thinkingBudget = parseInt(aiSettings.thinkingBudget) || 10000;

    const requestBody: Record<string, unknown> = {
      model,
      max_tokens: useThinking ? Math.max(maxTokens, thinkingBudget + 2000) : maxTokens,
      messages
    };

    if (systemPrompt) {
      requestBody.system = [{
        type: 'text',
        text: systemPrompt,
        cache_control: { type: 'ephemeral' }
      }];
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
      const data = await response.json();
      throw new Error(data.error?.message || `HTTP ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('Stream não disponível');

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

            if (parsed.type === 'text') {
              fullText += parsed.text;
              onChunk?.(fullText);
            }

            if (parsed.type === 'error') {
              throw new Error(parsed.error?.message || 'Erro no streaming');
            }

            if (parsed.type === 'done') {
              if (parsed.stop_reason === 'max_tokens') {
                throw new Error('A análise foi truncada por exceder o limite de tokens. Tente com uma transcrição menor.');
              }
              if (parsed.usage) {
                addTokenUsage({
                  input: parsed.usage.input_tokens || 0,
                  output: parsed.usage.output_tokens || 0,
                  cacheRead: parsed.usage.cache_read_input_tokens || 0,
                  cacheCreation: parsed.usage.cache_creation_input_tokens || 0
                });
              }
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

  const callOpenAIAPIStream = useCallback(async (
    messages: AIMessage[],
    options: AIStreamOptions = {}
  ): Promise<string> => {
    const {
      maxTokens = 8000,
      systemPrompt = null,
      model = aiSettings.openaiModel,
      onChunk
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
      max_tokens: maxTokens
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
      const data = await response.json();
      throw new Error(data.error?.message || `HTTP ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('Stream não disponível');

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

            if (parsed.type === 'text') {
              fullText += parsed.text;
              onChunk?.(fullText);
            }

            if (parsed.type === 'error') {
              throw new Error(parsed.error?.message || 'Erro no streaming');
            }

            if (parsed.type === 'done') {
              if (parsed.finish_reason === 'length') {
                throw new Error('A análise foi truncada por exceder o limite de tokens. Tente com uma transcrição menor.');
              }
              if (parsed.usage) {
                addTokenUsage({
                  input: parsed.usage.prompt_tokens || 0,
                  output: parsed.usage.completion_tokens || 0,
                  cacheRead: parsed.usage.prompt_tokens_details?.cached_tokens || 0
                });
              }
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

  const callGrokAPIStream = useCallback(async (
    messages: AIMessage[],
    options: AIStreamOptions = {}
  ): Promise<string> => {
    const {
      maxTokens = 8000,
      systemPrompt = null,
      model = aiSettings.grokModel,
      onChunk
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
        max_tokens: maxTokens
      })
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error?.message || `HTTP ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('Stream não disponível');

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

            if (parsed.type === 'text') {
              fullText += parsed.text;
              onChunk?.(fullText);
            }

            if (parsed.type === 'error') {
              throw new Error(parsed.error?.message || 'Erro no streaming');
            }

            if (parsed.type === 'done') {
              if (parsed.finish_reason === 'length') {
                throw new Error('A análise foi truncada por exceder o limite de tokens. Tente com uma transcrição menor.');
              }
              if (parsed.usage) {
                addTokenUsage({
                  input: parsed.usage.prompt_tokens || 0,
                  output: parsed.usage.completion_tokens || 0,
                  cacheRead: parsed.usage.prompt_tokens_details?.cached_tokens || 0
                });
              }
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

  const callGeminiAPIStream = useCallback(async (
    messages: AIMessage[],
    options: AIStreamOptions = {}
  ): Promise<string> => {
    const {
      systemPrompt = null,
      model = aiSettings.geminiModel,
      onChunk
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

    // v1.43.25: gate isGemini3 — Gemma 4 não usa thinking_config nem temperature 1.0
    const isGemini3 = model?.includes('gemini-3') || model?.includes('3-flash') || model?.includes('3-pro');
    let thinkingLevel = aiSettings.geminiThinkingLevel || 'high';
    const isPro = model?.includes('pro');
    if (isPro && (thinkingLevel === 'minimal' || thinkingLevel === 'medium')) {
      thinkingLevel = 'low';
    }

    const thinkingBuffer: Record<string, number> = {
      'minimal': 4096,
      'low': 16000,
      'medium': 32000,
      'high': 48000
    };
    const effectiveBuffer = thinkingBuffer[thinkingLevel] || 32000;

    const request: Record<string, unknown> = {
      contents,
      generationConfig: isGemini3 ? {
        maxOutputTokens: 128000,  // Fixo para evitar que o modelo "economize" texto
        temperature: 1.0,
        thinking_config: {
          thinking_budget: effectiveBuffer,
          includeThoughts: true
        }
      } : {
        maxOutputTokens: 128000
      }
    };

    if (systemPrompt) {
      request.systemInstruction = { parts: [{ text: systemPrompt }] };
    }

    const response = await fetch(`${API_BASE}/api/gemini/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': aiSettings.apiKeys.gemini },
      body: JSON.stringify({
        model,
        request
      })
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error?.message || `HTTP ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('Stream não disponível');

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

            if (parsed.type === 'text') {
              fullText += parsed.text;
              onChunk?.(fullText);
            }

            if (parsed.type === 'error') {
              throw new Error(parsed.error?.message || 'Erro no streaming');
            }

            if (parsed.type === 'done') {
              if (parsed.finish_reason === 'MAX_TOKENS') {
                throw new Error('A análise foi truncada por exceder o limite de tokens. Tente com uma transcrição menor.');
              }
              if (parsed.usage) {
                // v1.42.08: promptTokenCount já inclui cached — subtrair para não contar duas vezes
                const cached = parsed.usage.cachedContentTokenCount || 0;
                const prompt = parsed.usage.promptTokenCount || 0;
                addTokenUsage({
                  input: Math.max(0, prompt - cached),
                  output: parsed.usage.candidatesTokenCount || 0,
                  cacheRead: cached
                });
              }
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

  // v1.43.10: DeepSeek V4 streaming — mantém paridade com src/hooks/useAIIntegration.ts
  const callDeepseekAPIStream = useCallback(async (
    messages: AIMessage[],
    options: AIStreamOptions = {}
  ): Promise<string> => {
    const {
      maxTokens = 16000,
      systemPrompt = null,
      model = aiSettings.deepseekModel || 'deepseek-v4-flash',
      disableThinking = false,
      onChunk
    } = options;

    const deepseekMessages: GrokMessage[] = [];
    if (systemPrompt) {
      deepseekMessages.push({ role: 'system', content: systemPrompt });
    }
    for (const msg of messages) {
      deepseekMessages.push({
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

    const thinkingEnabled = !disableThinking && (aiSettings.deepseekThinking !== false);
    const reasoningEffort = aiSettings.deepseekReasoningEffort || 'high';
    const streamBody: Record<string, unknown> = {
      model,
      messages: deepseekMessages,
      max_tokens: maxTokens,
      stream: true,
      thinking: { type: thinkingEnabled ? 'enabled' : 'disabled' }
    };
    if (thinkingEnabled) {
      streamBody.reasoning_effort = reasoningEffort;
    }

    const response = await fetch(`${API_BASE}/api/deepseek/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': aiSettings.apiKeys.deepseek || ''
      },
      body: JSON.stringify(streamBody)
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
    let reasoningText = '';

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
            if (parsed.type === 'text' && parsed.text) {
              fullText += parsed.text;
              onChunk?.(fullText);
            }
            if (parsed.type === 'reasoning' && parsed.text) {
              reasoningText += parsed.text;
            }
            if (parsed.type === 'error') {
              throw new Error(parsed.error?.message || 'Erro no streaming');
            }
            if (parsed.type === 'done' && parsed.usage) {
              const cacheHit = parsed.usage.prompt_cache_hit_tokens || 0;
              const cacheMiss = parsed.usage.prompt_cache_miss_tokens || 0;
              addTokenUsage({
                input: cacheMiss || parsed.usage.prompt_tokens || 0,
                output: parsed.usage.completion_tokens || 0,
                cacheRead: cacheHit
              });
            }
          } catch (e) {
            if (e instanceof SyntaxError) continue;
            throw e;
          }
        }
      }
    }

    if (!fullText.trim() && reasoningText.trim()) {
      console.warn('[DeepSeek] content vazio, usando reasoning_content como fallback');
      return reasoningText.trim();
    }

    return fullText.trim();
  }, [aiSettings, addTokenUsage]);

  /**
   * Chamada com streaming - escolhe provider automaticamente
   * Usa callback onChunk para atualizar UI em tempo real
   */
  const callAIStream = useCallback(async (
    messages: AIMessage[],
    options: AIStreamOptions = {}
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
      case 'deepseek':
        return callDeepseekAPIStream(messages, options);
      default:
        return callClaudeAPIStream(messages, options);
    }
  }, [aiSettings.provider, callClaudeAPIStream, callGeminiAPIStream, callOpenAIAPIStream, callGrokAPIStream, callDeepseekAPIStream]);

  return {
    callAI,
    callAIStream,
    callClaudeAPI,
    callGeminiAPI,
    callOpenAIAPI,
    callGrokAPI,
    callDeepseekAPI,
    callClaudeAPIStream,
    callGeminiAPIStream,
    callOpenAIAPIStream,
    callGrokAPIStream,
    callDeepseekAPIStream,
    aiSettings
  };
};

export default useAIIntegration;

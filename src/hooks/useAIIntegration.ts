/**
 * @file useAIIntegration.ts
 * @description Hook de integracao com provedores de IA (Claude, Gemini, OpenAI, Grok)
 * @version 1.39.03
 *
 * Extraído do App.tsx
 * Gerencia: chamadas de API, tokens, cache, double check, multi-provider
 */

import React from 'react';
import { useAIStore } from '../stores/useAIStore';
import { AI_INSTRUCTIONS, AI_INSTRUCTIONS_CORE, AI_INSTRUCTIONS_SAFETY } from '../prompts';
import { API_BASE } from '../constants/api';
import { withRetry } from '../utils/retry';
import type {
  AIMessage,
  AIMessageContent,
  AITextContent,  // v1.37.68: adicionado para type guard no performDoubleCheck
  AICallOptions,
  AIProvider,
  AIGenState,
  AIGenAction,
  GeminiRequest,
  OpenAIMessage,
  OpenAIMessagePart,
  DoubleCheckCorrection
} from '../types';
import { extractJSON, parseAIResponse, DoubleCheckResponseSchema } from '../schemas/ai-responses';

/** Tipo para resultado parseado do Double Check (campos verificados variam por operação) */
interface DoubleCheckParsedResult {
  verifiedTopics?: unknown;
  verifiedResult?: unknown;
  verifiedDispositivo?: string;
  verifiedReview?: string;
  corrections?: DoubleCheckCorrection[];
  summary?: string;
  confidence?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// REDUCER PARA ESTADOS DE GERAÇÃO
// ═══════════════════════════════════════════════════════════════════════════════

// 🔧 Reducer para estados de geração de IA (consolidado)
const aiGenerationInitialState: AIGenState = {
  generic: { instruction: '', text: '', generating: false },
  model: { instruction: '', text: '', generating: false },
  relatorio: { instruction: '', regenerating: false },
  dispositivo: { instruction: '', text: '', generating: false, regenerating: false },
  keywords: { generating: false },
  title: { generating: false }
};

const aiGenerationReducer = (state: AIGenState, action: AIGenAction): AIGenState => {
  const ctx = action.context;
  const base = state[ctx] || aiGenerationInitialState[ctx] || {};
  switch (action.type) {
    case 'SET_INSTRUCTION':
      return { ...state, [ctx]: { ...base, instruction: action.value } };
    case 'SET_TEXT':
      return { ...state, [ctx]: { ...base, text: action.value } };
    case 'SET_GENERATING':
      return { ...state, [ctx]: { ...base, generating: action.value } };
    case 'SET_REGENERATING':
      return { ...state, [ctx]: { ...base, regenerating: action.value } };
    case 'RESET_CONTEXT':
      return { ...state, [ctx]: aiGenerationInitialState[ctx] };
    case 'RESET_ALL':
      return aiGenerationInitialState;
    default:
      return state;
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK: useAIIntegration
// ═══════════════════════════════════════════════════════════════════════════════

export type UseAIIntegrationReturn = ReturnType<typeof useAIIntegration>;

const useAIIntegration = () => {
  // v1.38.22: Migração Zustand completa - seletores diretos
  const aiSettings = useAIStore((s) => s.aiSettings);
  const setAiSettings = useAIStore((s) => s.setAiSettings);
  const tokenMetrics = useAIStore((s) => s.tokenMetrics);
  const setTokenMetrics = useAIStore((s) => s.setTokenMetrics);
  const addTokenUsage = useAIStore((s) => s.addTokenUsage);

  // 🔧 Estado consolidado de geração de IA (useReducer)
  const [aiGeneration, dispatchAI] = React.useReducer(aiGenerationReducer, aiGenerationInitialState);

  // v1.35.9: Todos os setters memoizados com useCallback para evitar re-renders
  // (createSetter retornava nova função a cada render, causando lag em inputs)

  // Genérica
  const aiInstruction = aiGeneration.generic.instruction;
  const setAiInstruction = React.useCallback(
    (value: string) => dispatchAI({ type: 'SET_INSTRUCTION', context: 'generic', value }),
    []
  );
  const aiGeneratedText = aiGeneration.generic.text;
  const setAiGeneratedText = React.useCallback(
    (value: string) => dispatchAI({ type: 'SET_TEXT', context: 'generic', value }),
    []
  );
  const generatingAi = aiGeneration.generic.generating;
  const setGeneratingAi = React.useCallback(
    (value: boolean) => dispatchAI({ type: 'SET_GENERATING', context: 'generic', value }),
    []
  );

  // Modelo
  const aiInstructionModel = aiGeneration.model.instruction;
  const setAiInstructionModel = React.useCallback(
    (value: string) => dispatchAI({ type: 'SET_INSTRUCTION', context: 'model', value }),
    []
  );
  const aiGeneratedTextModel = aiGeneration.model.text;
  const setAiGeneratedTextModel = React.useCallback(
    (value: string) => dispatchAI({ type: 'SET_TEXT', context: 'model', value }),
    []
  );
  const generatingAiModel = aiGeneration.model.generating;
  const setGeneratingAiModel = React.useCallback(
    (value: boolean) => dispatchAI({ type: 'SET_GENERATING', context: 'model', value }),
    []
  );

  // Keywords e Title
  const generatingKeywords = aiGeneration.keywords.generating;
  const setGeneratingKeywords = React.useCallback(
    (value: boolean) => dispatchAI({ type: 'SET_GENERATING', context: 'keywords', value }),
    []
  );
  const generatingTitle = aiGeneration.title.generating;
  const setGeneratingTitle = React.useCallback(
    (value: boolean) => dispatchAI({ type: 'SET_GENERATING', context: 'title', value }),
    []
  );

  // Relatório
  const relatorioInstruction = aiGeneration.relatorio.instruction;
  const setRelatorioInstruction = React.useCallback(
    (value: string) => dispatchAI({ type: 'SET_INSTRUCTION', context: 'relatorio', value }),
    []
  );
  const regeneratingRelatorio = aiGeneration.relatorio.regenerating;
  const setRegeneratingRelatorio = React.useCallback(
    (value: boolean) => dispatchAI({ type: 'SET_REGENERATING', context: 'relatorio', value }),
    []
  );
  const regenerating = aiGeneration.relatorio.regenerating;
  const setRegenerating = React.useCallback(
    (value: boolean) => dispatchAI({ type: 'SET_REGENERATING', context: 'relatorio', value }),
    []
  );

  // Dispositivo
  const dispositivoText = aiGeneration.dispositivo.text;
  const setDispositivoText = React.useCallback(
    (value: string) => dispatchAI({ type: 'SET_TEXT', context: 'dispositivo', value }),
    []
  );
  const generatingDispositivo = aiGeneration.dispositivo.generating;
  const setGeneratingDispositivo = React.useCallback(
    (value: boolean) => dispatchAI({ type: 'SET_GENERATING', context: 'dispositivo', value }),
    []
  );
  const dispositivoInstruction = aiGeneration.dispositivo.instruction;
  const setDispositivoInstruction = React.useCallback(
    (value: string) => dispatchAI({ type: 'SET_INSTRUCTION', context: 'dispositivo', value }),
    []
  );
  const regeneratingDispositivo = aiGeneration.dispositivo.regenerating;
  const setRegeneratingDispositivo = React.useCallback(
    (value: boolean) => dispatchAI({ type: 'SET_REGENERATING', context: 'dispositivo', value }),
    []
  );

  // v1.36.62: Load/Save AI Settings agora é gerenciado pelo Zustand store (useAIStore.ts)
  // A persistência acontece automaticamente via middleware 'persist'

  // Utilities
  // v1.20.3: Modificado para acumular tokens no estado persistente
  // v1.36.62: Usa addTokenUsage do Zustand store
  // v1.37.91: Aceita model/provider para tracking por modelo
  const logCacheMetrics = React.useCallback((
    data: { usage?: { input_tokens?: number; output_tokens?: number; cache_read_input_tokens?: number; cache_creation_input_tokens?: number } },
    model?: string,
    provider?: 'claude' | 'gemini' | 'openai' | 'grok'
  ) => {
    if (data.usage) {
      addTokenUsage({
        input: data.usage.input_tokens || 0,
        output: data.usage.output_tokens || 0,
        cacheRead: data.usage.cache_read_input_tokens || 0,
        cacheCreation: data.usage.cache_creation_input_tokens || 0,
        model,
        provider
      });
    }
  }, [addTokenUsage]);

  // Retorna array com cache_control para Prompt Caching
  // v1.35.76: Estilo personalizado SUBSTITUI (não complementa) o estilo default
  const getAiInstructions = React.useCallback(() => {
    const customPrompt = aiSettings?.customPrompt?.trim();

    if (customPrompt) {
      // SUBSTITUTIVO: customPrompt substitui STYLE, mas CORE e SAFETY permanecem
      const customInstructions = `${AI_INSTRUCTIONS_CORE}

📝 ESTILO DE REDAÇÃO PERSONALIZADO PELO MAGISTRADO:
${customPrompt}

${AI_INSTRUCTIONS_SAFETY}`;

      return [
        {
          type: "text",
          text: customInstructions,
          cache_control: { type: "ephemeral" }
        }
      ];
    }

    // Sem customização: usa AI_INSTRUCTIONS completo (inclui STYLE default)
    return [
      {
        type: "text",
        text: AI_INSTRUCTIONS,
        cache_control: { type: "ephemeral" }
      }
    ];
  }, [aiSettings]);

  // Build API Request
  const buildApiRequest = React.useCallback((messages: AIMessage[], optionsOrMaxTokens: AICallOptions | number = {}) => {
    const options = typeof optionsOrMaxTokens === 'number'
      ? { maxTokens: optionsOrMaxTokens }
      : optionsOrMaxTokens;

    const {
      maxTokens = 4000,
      systemPrompt = null,
      useInstructions = false,
      model = null,
      disableThinking = false,
      temperature = null,
      topP = null,
      topK = null
    } = options;

    let savedModel = null;
    try {
      const saved = localStorage.getItem('sentencify-ai-settings');
      if (saved) savedModel = JSON.parse(saved).model;
    } catch (e) { /* localStorage indisponível */ }
    const modelToUse = model || aiSettings?.model || savedModel || 'claude-sonnet-4-20250514';

    const useThinking = !disableThinking && (aiSettings?.useExtendedThinking || false);

    const MODEL_MAX_TOKENS: Record<string, number> = {
      'claude-sonnet-4-20250514': 64000,
      'claude-opus-4-5-20251101': 32000
    };
    const modelMaxTokens = MODEL_MAX_TOKENS[modelToUse] || 64000;

    const parsedBudget = parseInt(aiSettings?.thinkingBudget || '10000', 10);
    const rawThinkingBudget = isNaN(parsedBudget) ? 10000 : parsedBudget;

    const maxAllowedBudget = useThinking ? Math.max(modelMaxTokens - 2000, 1024) : 0;
    const thinkingBudget = useThinking ? Math.min(rawThinkingBudget, maxAllowedBudget) : 0;

    const rawAdjustedTokens = useThinking ? Math.max(maxTokens + thinkingBudget, thinkingBudget + 2000) : maxTokens;
    const adjustedMaxTokens = Math.min(rawAdjustedTokens, modelMaxTokens);

    const processedMessages = messages.map((message: AIMessage) => {
      if (message.content && Array.isArray(message.content)) {
        let cacheBlocksCount = 0;
        const MAX_CACHE_BLOCKS = 3; // 3 nas messages + 1 no system = 4 total (limite da API)

        const processedContent = message.content.map((block: AIMessageContent, index: number, array: AIMessageContent[]) => {
          const isLastBlock = index === array.length - 1;

          if (isLastBlock) {
            return block;
          }

          if (cacheBlocksCount >= MAX_CACHE_BLOCKS) {
            return block;
          }

          // Type guard: strings don't have .type property
          if (typeof block === 'string') {
            return block;
          }

          if (block.type === 'document') {
            cacheBlocksCount++;
            return {
              ...block,
              cache_control: { type: "ephemeral" as const }
            };
          }

          if (block.type === 'text' && block.text && block.text.length > 2000) {
            cacheBlocksCount++;
            return {
              ...block,
              cache_control: { type: "ephemeral" as const }
            };
          }

          return block;
        });

        return {
          ...message,
          content: processedContent
        };
      }

      return message;
    });

    const requestBody: Record<string, unknown> = {
      model: modelToUse,
      max_tokens: adjustedMaxTokens,
      messages: processedMessages
    };

    // v1.21.25: Parametros opcionais de geracao (apenas se explicitamente passados)
    if (temperature !== null) requestBody.temperature = temperature;
    if (topP !== null) requestBody.top_p = topP;
    if (topK !== null) requestBody.top_k = topK;

    // System prompt com Prompt Caching
    let finalSystemPrompt: unknown = null;
    if (systemPrompt) {
      // systemPrompt customizado: wrap em array com cache
      finalSystemPrompt = [
        {
          type: "text",
          text: systemPrompt,
          cache_control: { type: "ephemeral" }
        }
      ];
    } else if (useInstructions) {
      // getAiInstructions() já retorna array com cache_control
      finalSystemPrompt = getAiInstructions();
    }

    if (finalSystemPrompt) {
      requestBody.system = finalSystemPrompt;
    }

    if (useThinking) {
      requestBody.thinking = {
        type: "enabled",
        budget_tokens: thinkingBudget
      };
    }

    return requestBody;
  }, [aiSettings, getAiInstructions]);

  // Retorna headers HTTP para API Anthropic
  const getApiHeaders = React.useCallback(() => {
    return {
      'Content-Type': 'application/json',
      'anthropic-beta': 'prompt-caching-2024-07-31'
    };
  }, []);

  // Wrapper para chamadas a API Anthropic (com retry via withRetry, timeout e caching)
  // v1.39.03: Refatorado para usar withRetry centralizado
  const CLAUDE_RETRY_CODES = [429, 529, 520, 502];

  const callLLM = React.useCallback(async (messages: AIMessage[], options: AICallOptions = {}) => {
    const {
      maxTokens = 4000,
      useInstructions = true,
      systemPrompt = null,
      model = null,
      disableThinking = false,
      timeout = null,
      abortSignal = null,
      logMetrics = true,
      extractText = true,
      validateResponse = true
    } = options;

    // v1.32.33: Auto-aumentar timeout para 5 min quando thinking budget >= 40K
    const thinkingBudget = parseInt(aiSettings?.thinkingBudget || '10000', 10);
    const useThinking = !disableThinking && (aiSettings?.useExtendedThinking || false);
    const effectiveTimeout = timeout || (useThinking && thinkingBudget >= 40000 ? 300000 : null); // 5 min para budgets altos

    // Criar AbortController interno se timeout especificado
    const internalController = effectiveTimeout ? new AbortController() : null;
    const timeoutId = effectiveTimeout && internalController ? setTimeout(() => internalController.abort(), effectiveTimeout) : null;

    // Combinar signals: externo tem prioridade, senao interno
    const signal = abortSignal || internalController?.signal;

    // Funcao de requisicao que sera retentada
    const makeRequest = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/claude/messages`, {
          method: 'POST',
          headers: {
            ...getApiHeaders(),
            'x-api-key': aiSettings.apiKeys?.claude || ''
          },
          body: JSON.stringify(buildApiRequest(messages, {
            maxTokens,
            useInstructions,
            systemPrompt: systemPrompt ?? undefined,
            model: model ?? undefined,
            disableThinking
          })),
          signal
        });

        // Se status retryable, lancar erro com status para withRetry detectar
        if (CLAUDE_RETRY_CODES.includes(response.status)) {
          const error = new Error(`HTTP ${response.status}`) as Error & { status: number };
          error.status = response.status;
          throw error;
        }

        // Validar status HTTP
        if (validateResponse && !response.ok) {
          const errorText = await response.text();
          throw new Error(`Erro HTTP ${response.status}: ${errorText}`);
        }

        // Parsear JSON
        const data = await response.json();

        // v1.32.39: Log thinking no console do browser
        if (aiSettings.logThinking) {
          const thinkingBlock = data.content?.find((c: Record<string, unknown>) => c.type === 'thinking');
          if (thinkingBlock?.thinking) {
            console.group('[Claude] Thinking');
            console.log(thinkingBlock.thinking);
            console.groupEnd();
          }
        }

        // Logar metricas de cache
        if (logMetrics) {
          const effectiveModel = model || aiSettings?.claudeModel || 'claude-sonnet-4-20250514';
          logCacheMetrics(data, effectiveModel, 'claude');
        }

        // Verificar erros da API
        if (validateResponse && data.error) {
          throw new Error(`Erro da API: ${data.error.message || JSON.stringify(data.error)}`);
        }

        // Retornar resposta bruta se solicitado
        if (!extractText) {
          return data;
        }

        // Extrair texto da resposta
        const textContent = data.content?.find((c: Record<string, unknown>) => c.type === 'text')?.text || '';

        // Validar se encontrou conteudo
        if (validateResponse && !textContent) {
          throw new Error('Nenhum conteúdo de texto encontrado na resposta da API');
        }

        return textContent.trim();
      } catch (err) {
        // Tratar erros de abort (nao retentar)
        const errObj = err as Error;
        if (errObj.name === 'AbortError') {
          if (abortSignal?.aborted) {
            throw new Error('Operação cancelada pelo usuário');
          } else {
            throw new Error(`Timeout: operacao demorou mais de ${(effectiveTimeout || 0) / 1000}s`);
          }
        }
        throw err;
      }
    };

    try {
      return await withRetry(makeRequest, {
        maxRetries: 3,
        initialDelayMs: 5000,
        backoffType: 'exponential',
        backoffMultiplier: 2,
        retryableStatusCodes: CLAUDE_RETRY_CODES,
        onRetry: (attempt, err, delay) => {
          console.warn(`[Claude] Retry ${attempt}, aguardando ${delay}ms:`, err.message);
        }
      });
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }, [getApiHeaders, buildApiRequest, logCacheMetrics, aiSettings]);

  // ========================================
  // v1.30: MULTI-PROVIDER SUPPORT (Gemini)
  // ========================================

  // Converter formato de mensagens Claude → Gemini
  const convertToGeminiFormat = React.useCallback((claudeMessages: AIMessage[], systemPrompt: string | null | Record<string, unknown>[] = null): GeminiRequest => {
    const contents = claudeMessages.map((msg: AIMessage) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: Array.isArray(msg.content)
        ? msg.content.map((c: AIMessageContent) => {
            // String direta
            if (typeof c === 'string') return { text: c };
            // Texto simples
            if (c.type === 'text') return { text: c.text };
            // Imagem (base64)
            if (c.type === 'image') return {
              inlineData: { mimeType: c.source.media_type || 'image/png', data: c.source.data }
            };
            // PDF/Documento
            if (c.type === 'document' && c.source.type === 'base64') {
              return {
                inlineData: {
                  mimeType: c.source.media_type || 'application/pdf',
                  data: c.source.data
                }
              };
            }
            // Fallback
            return { text: JSON.stringify(c) };
          })
        : [{ text: msg.content as string }]
    }));

    const result: GeminiRequest = { contents };

    // System prompt → systemInstruction
    if (systemPrompt) {
      const systemText = Array.isArray(systemPrompt)
        ? systemPrompt.map((s: Record<string, unknown>) => s.text || s).join('\n\n')
        : systemPrompt;
      result.systemInstruction = { parts: [{ text: systemText as string }] };
    }

    return result;
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // OPENAI/GROK FORMAT CONVERSION (v1.35.97)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Converte mensagens do formato Claude para formato OpenAI (também usado pelo Grok)
   * @param claudeMessages - Array de mensagens no formato Claude (AIMessage[])
   * @param systemPrompt - System prompt opcional (string ou array de objetos)
   * @returns Array de mensagens no formato OpenAI (OpenAIMessage[])
   */
  const convertToOpenAIFormat = React.useCallback((claudeMessages: AIMessage[], systemPrompt: string | null = null): OpenAIMessage[] => {
    const messages: OpenAIMessage[] = [];

    // System prompt primeiro (se houver)
    if (systemPrompt) {
      const systemText = Array.isArray(systemPrompt)
        ? systemPrompt.map((s: Record<string, unknown>) => s.text || s).join('\n\n')
        : systemPrompt;
      messages.push({ role: 'system', content: systemText });
    }

    // Converter mensagens
    for (const msg of claudeMessages) {
      if (Array.isArray(msg.content)) {
        // Mensagem com múltiplos conteúdos (texto + imagem)
        const parts: OpenAIMessagePart[] = [];

        for (const c of msg.content as unknown as Record<string, unknown>[]) {
          if (c.type === 'text') {
            parts.push({ type: 'text', text: c.text as string });
          } else if (c.type === 'image') {
            // Converter formato Claude → OpenAI para imagens
            const source = c.source as Record<string, unknown>;
            const mediaType = source?.media_type || 'image/png';
            const data = source?.data as string;
            parts.push({
              type: 'image_url',
              image_url: { url: `data:${mediaType};base64,${data}` }
            });
          } else if (c.type === 'document') {
            // v1.36.29: OpenAI suporta PDF via base64 (Grok não - requer Files API)
            // Nota: Para Grok, UI mostra aviso para usar texto extraído
            const source = c.source as Record<string, unknown>;
            const mediaType = source?.media_type || 'application/pdf';
            const data = source?.data as string;
            parts.push({
              type: 'file',
              file: {
                filename: 'document.pdf',
                file_data: `data:${mediaType};base64,${data}`
              }
            });
          }
        }

        messages.push({ role: msg.role as 'user' | 'assistant', content: parts });
      } else {
        messages.push({ role: msg.role as 'user' | 'assistant', content: msg.content as string });
      }
    }

    return messages;
  }, []);

  // Extrair métricas de tokens da resposta (provider-aware)
  const extractTokenMetrics = React.useCallback((data: Record<string, unknown>, provider: AIProvider) => {
    // v1.35.97: OpenAI e Grok usam mesmo formato (OpenAI-compatible)
    if (provider === 'openai' || provider === 'grok') {
      const usage = (data.usage || {}) as Record<string, unknown>;
      const promptDetails = (usage.prompt_tokens_details || {}) as Record<string, number>;
      return {
        input: (usage.prompt_tokens as number) || 0,
        output: (usage.completion_tokens as number) || 0,
        cacheRead: promptDetails.cached_tokens || 0,
        cacheCreation: 0
      };
    }
    if (provider === 'gemini') {
      const usage = (data.usageMetadata || {}) as Record<string, number>;
      return {
        input: usage.promptTokenCount || 0,
        output: usage.candidatesTokenCount || 0,
        cacheRead: usage.cachedContentTokenCount || 0,
        cacheCreation: 0
      };
    }
    // Claude (default)
    const usage = (data.usage || {}) as Record<string, number>;
    return {
      input: usage.input_tokens || 0,
      output: usage.output_tokens || 0,
      cacheRead: usage.cache_read_input_tokens || 0,
      cacheCreation: usage.cache_creation_input_tokens || 0
    };
  }, []);

  // Extrair texto da resposta (provider-aware)
  const extractResponseText = React.useCallback((data: Record<string, unknown>, provider: AIProvider) => {
    // v1.35.97: OpenAI e Grok usam mesmo formato (OpenAI-compatible)
    if (provider === 'openai' || provider === 'grok') {
      const choices = data.choices as Record<string, unknown>[] | undefined;
      const message = choices?.[0]?.message as Record<string, unknown> | undefined;

      // Log reasoning se logThinking ativo (OpenAI apenas)
      if (provider === 'openai' && aiSettings.logThinking && message?.reasoning_details) {
        console.log('[OpenAI Reasoning]', message.reasoning_details);
      }

      // Verificar finish_reason para erros
      const finishReason = choices?.[0]?.finish_reason;
      if (finishReason === 'content_filter') {
        throw new Error('Resposta bloqueada pelo filtro de conteúdo.');
      }
      if (finishReason === 'length') {
        console.warn(`[${provider}] Resposta truncada por limite de tokens`);
      }

      return (message?.content as string) || '';
    }
    if (provider === 'gemini') {
      const candidates = data.candidates as Record<string, unknown>[] | undefined;
      const candidate = candidates?.[0];
      const finishReason = candidate?.finishReason;

      // Verificar bloqueio de segurança
      if (finishReason === 'SAFETY') {
        throw new Error('Resposta bloqueada por segurança. Reformule a pergunta.');
      }
      if (finishReason === 'RECITATION') {
        throw new Error('Resposta bloqueada por direitos autorais.');
      }
      const promptFeedback = data.promptFeedback as Record<string, unknown> | undefined;
      if (promptFeedback?.blockReason) {
        throw new Error(`Prompt bloqueado: ${promptFeedback.blockReason}`);
      }

      // v1.32.35: Com thinking habilitado, parts[0] é o thinking block
      // Buscar o primeiro part que NÃO seja thinking (thought !== true)
      const content = candidate?.content as Record<string, unknown> | undefined;
      const parts = (content?.parts || []) as Record<string, unknown>[];
      const textPart = parts.find((p: Record<string, unknown>) => !p.thought && p.text);
      if (!textPart) {
        const hasOnlyThought = parts.some((p: Record<string, unknown>) => p.thought && p.text);
        if (hasOnlyThought) {
          // v1.38.46: Gemini gastou budget no thinking sem gerar resposta - retry
          throw new Error('Gemini retornou apenas thinking sem text part. Retentando...');
        }
        console.error('[Gemini] extractResponseText: nenhum text part encontrado.', {
          hasCandidates: !!data.candidates,
          candidatesLength: (data.candidates as unknown[])?.length,
          finishReason,
          partsLength: parts.length,
          partTypes: parts.map((p: Record<string, unknown>) => ({ thought: p.thought, hasText: !!p.text }))
        });
      }
      return (textPart?.text as string) || '';
    }
    // Claude (default)
    const content = data.content as Record<string, unknown>[] | undefined;
    return (content?.find((c: Record<string, unknown>) => c.type === 'text')?.text as string) || '';
  }, [aiSettings.logThinking]);

  // v1.32.37: Configurar thinking para Gemini 3 (removido suporte a 2.5)
  // Docs: https://ai.google.dev/gemini-api/docs/thinking
  // Gemini 3: usa thinking_level enum (não pode desativar)
  // - Flash: minimal, low, medium, high
  // - Pro: low, high (não tem minimal nem medium)
  const getGeminiThinkingConfig = React.useCallback((model: string) => {
    let level = aiSettings.geminiThinkingLevel || 'high';

    // v1.32.37: Pro só suporta low/high - converter valores inválidos
    const isPro = model?.includes('pro');
    if (isPro && (level === 'minimal' || level === 'medium')) {
      level = 'low';  // Fallback para nível válido mais próximo
    }

    return { thinking_level: level };
  }, [aiSettings.geminiThinkingLevel]);

  // Codigos de status para retry por provider
  // v1.39.03: Refatorado para usar withRetry centralizado
  const GEMINI_RETRY_CODES = [429, 500, 502, 503, 529];

  // Chamada a API Gemini
  const callGeminiAPI = React.useCallback(async (messages: AIMessage[], options: AICallOptions = {}) => {
    const {
      maxTokens = 4000,
      systemPrompt = null,
      useInstructions = false,
      model = aiSettings.geminiModel || 'gemini-3-flash-preview',
      temperature = null,
      topP = null,
      topK = null,
      timeout = null,
      abortSignal = null,
      logMetrics = true,
      extractText = true,
      disableThinking = false
    } = options;

    // v1.32.29: Resolver systemPrompt igual ao Claude (useInstructions -> getAiInstructions)
    let finalSystemPrompt = systemPrompt;
    if (!finalSystemPrompt && useInstructions) {
      const instructions = getAiInstructions();
      finalSystemPrompt = Array.isArray(instructions)
        ? instructions.map(i => i.text || i).join('\n\n')
        : instructions;
    }

    // AbortController para timeout
    const internalController = timeout ? new AbortController() : null;
    const timeoutId = timeout && internalController ? setTimeout(() => internalController.abort(), timeout) : null;
    const signal = abortSignal || internalController?.signal;

    // Funcao de requisicao que sera retentada
    const makeRequest = async () => {
      try {
        // Converter mensagens para formato Gemini
        const geminiRequest = convertToGeminiFormat(messages, finalSystemPrompt);

        // Detectar Gemini 3 antes de calcular buffer
        const isGemini3 = model.includes('gemini-3') || model.includes('3-flash') || model.includes('3-pro');

        // v1.32.38: Gemini thinking consome maxOutputTokens - adicionar buffer
        const effectiveThinkingLevel = disableThinking ? 'minimal' : (options.geminiThinkingLevel || aiSettings.geminiThinkingLevel || 'high');
        const thinkingBuffer = isGemini3 ? ({
          'minimal': 1024,
          'low': 4000,
          'medium': 8000,
          'high': 16000
        }[effectiveThinkingLevel] || 8000) : 0;

        // Configurar generationConfig com buffer para thinking
        geminiRequest.generationConfig = {
          maxOutputTokens: maxTokens + thinkingBuffer
        };

        // Gemini 3: forcar temperature 1.0 para evitar bugs
        if (isGemini3) {
          geminiRequest.generationConfig.temperature = 1.0;
        } else {
          const minTemp = 0.7;
          geminiRequest.generationConfig.temperature = temperature !== null
            ? Math.max(temperature, minTemp)
            : minTemp;
        }

        if (topP !== null) geminiRequest.generationConfig.topP = topP;
        if (topK !== null) geminiRequest.generationConfig.topK = topK;

        // So adicionar thinking_config para Gemini 3
        if (isGemini3) {
          geminiRequest.generationConfig.thinking_config = {
            thinking_budget: thinkingBuffer,
            includeThoughts: !disableThinking
          };
        }

        // Fazer requisicao via proxy local
        const response = await fetch(`${API_BASE}/api/gemini/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': aiSettings.apiKeys?.gemini || '' },
          body: JSON.stringify({
            model,
            request: geminiRequest
          }),
          signal
        });

        // Se status retryable, lancar erro com status para withRetry detectar
        if (GEMINI_RETRY_CODES.includes(response.status)) {
          const error = new Error(`HTTP ${response.status}`) as Error & { status: number };
          error.status = response.status;
          throw error;
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error?.message || `HTTP ${response.status}`);
        }

        const data = await response.json();

        // v1.32.39: Log thinking no console do browser
        if (aiSettings.logThinking) {
          const parts = data.candidates?.[0]?.content?.parts || [];
          const thinkingPart = parts.find((p: { thought?: boolean; text?: string }) => p.thought === true);
          if (thinkingPart?.text) {
            console.group('[Gemini] Thinking');
            console.log(thinkingPart.text);
            console.groupEnd();
          }
        }

        // Logar metricas
        if (logMetrics && data.usageMetadata) {
          const metrics = extractTokenMetrics(data, 'gemini');
          addTokenUsage({
            input: metrics.input,
            output: metrics.output,
            cacheRead: metrics.cacheRead,
            cacheCreation: metrics.cacheCreation,
            model,
            provider: 'gemini'
          });
        }

        // Retornar resposta bruta se solicitado
        if (!extractText) {
          return data;
        }

        // Extrair texto
        const textContent = extractResponseText(data, 'gemini');
        return textContent.trim();
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          throw new Error(abortSignal?.aborted ? 'Operacao cancelada' : `Timeout apos ${(timeout ?? 0)/1000}s`);
        }
        throw err;
      }
    };

    try {
      return await withRetry(makeRequest, {
        maxRetries: 3,
        initialDelayMs: 5000,
        backoffType: 'exponential',
        backoffMultiplier: 2,
        retryableStatusCodes: GEMINI_RETRY_CODES,
        abortSignal,
        onRetry: (attempt, err, delay) => {
          console.warn(`[Gemini] Retry ${attempt}, aguardando ${delay}ms:`, err.message);
        }
      });
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }, [aiSettings, convertToGeminiFormat, extractTokenMetrics, extractResponseText, getGeminiThinkingConfig, setTokenMetrics, getAiInstructions]);

  // ═══════════════════════════════════════════════════════════════════════════
  // OPENAI GPT-5.2 INTEGRATION (v1.35.97)
  // v1.39.03: Refatorado para usar withRetry centralizado
  // ═══════════════════════════════════════════════════════════════════════════

  /** Codigos HTTP que disparam retry automatico */
  const OPENAI_RETRY_CODES = [429, 500, 502, 503, 529];

  /** Configuracoes padrao OpenAI */
  const OPENAI_CONFIG = {
    MAX_TOKENS_DEFAULT: 4000,
    REASONING_TIMEOUT_MS: 300000  // 5 min para reasoning xhigh
  } as const;

  /**
   * Faz chamada a API OpenAI (GPT-5.2)
   */
  const callOpenAIAPI = React.useCallback(async (messages: AIMessage[], options: AICallOptions = {}) => {
    const {
      maxTokens = OPENAI_CONFIG.MAX_TOKENS_DEFAULT,
      systemPrompt = null,
      useInstructions = false,
      model = aiSettings.openaiModel || 'gpt-5.2-chat-latest',
      timeout = null,
      abortSignal = null,
      logMetrics = true,
      extractText = true,
      disableThinking = false
    } = options;

    // Resolver systemPrompt
    let finalSystemPrompt = systemPrompt as string | null;
    if (!finalSystemPrompt && useInstructions) {
      const instructions = getAiInstructions();
      finalSystemPrompt = Array.isArray(instructions)
        ? instructions.map((i: Record<string, unknown>) => i.text || i).join('\n\n')
        : instructions;
    }

    // Timeout maior para reasoning xhigh
    const reasoningLevel = aiSettings.openaiReasoningLevel || 'medium';
    const effectiveTimeout = timeout || (
      model === 'gpt-5.2' && reasoningLevel === 'xhigh'
        ? OPENAI_CONFIG.REASONING_TIMEOUT_MS
        : null
    );

    const internalController = effectiveTimeout ? new AbortController() : null;
    const timeoutId = effectiveTimeout ? setTimeout(() => internalController?.abort(), effectiveTimeout) : null;
    const signal = abortSignal || internalController?.signal;

    // Funcao de requisicao que sera retentada
    const makeRequest = async () => {
      try {
        const openaiMessages = convertToOpenAIFormat(messages, finalSystemPrompt);

        const requestBody: Record<string, unknown> = {
          model,
          messages: openaiMessages,
          max_tokens: maxTokens
        };

        // Adicionar reasoning apenas para gpt-5.2 (nao gpt-5.2-chat-latest)
        if (model === 'gpt-5.2' && !disableThinking) {
          requestBody.reasoning = { effort: reasoningLevel };
        }

        const response = await fetch(`${API_BASE}/api/openai/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': aiSettings.apiKeys?.openai || ''
          },
          body: JSON.stringify(requestBody),
          signal
        });

        // Se status retryable, lancar erro com status para withRetry detectar
        if (OPENAI_RETRY_CODES.includes(response.status)) {
          const error = new Error(`HTTP ${response.status}`) as Error & { status: number };
          error.status = response.status;
          throw error;
        }

        const data = await response.json();

        if (!response.ok) {
          const errorMsg = data.error?.message || `OpenAI API error: ${response.status}`;
          throw new Error(errorMsg);
        }

        // v1.37.91: Usa addTokenUsage com model/provider para tracking por modelo
        if (logMetrics) {
          const metrics = extractTokenMetrics(data, 'openai');
          addTokenUsage({
            input: metrics.input,
            output: metrics.output,
            cacheRead: metrics.cacheRead,
            cacheCreation: metrics.cacheCreation,
            model,
            provider: 'openai'
          });
        }

        if (extractText) {
          return extractResponseText(data, 'openai');
        }
        return data;
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          throw new Error('Operação cancelada pelo usuário');
        }
        throw err;
      }
    };

    try {
      return await withRetry(makeRequest, {
        maxRetries: 3,
        initialDelayMs: 5000,
        backoffType: 'linear',  // OpenAI usa backoff linear
        retryableStatusCodes: OPENAI_RETRY_CODES,
        abortSignal,
        onRetry: (attempt, err, delay) => {
          console.warn(`[OpenAI] Retry ${attempt}, aguardando ${delay}ms:`, err.message);
        }
      });
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }, [aiSettings, convertToOpenAIFormat, extractTokenMetrics, extractResponseText, setTokenMetrics, getAiInstructions]);

  // ═══════════════════════════════════════════════════════════════════════════
  // XAI GROK 4.1 INTEGRATION (v1.35.97)
  // v1.39.03: Refatorado para usar withRetry centralizado
  // ═══════════════════════════════════════════════════════════════════════════

  /** Codigos HTTP que disparam retry automatico (mesmo do OpenAI) */
  const GROK_RETRY_CODES = [429, 500, 502, 503, 529];

  /** Configuracoes padrao Grok */
  const GROK_CONFIG = {
    MAX_TOKENS_DEFAULT: 4000
  } as const;

  /**
   * Faz chamada a API xAI Grok (OpenAI-compatible)
   */
  const callGrokAPI = React.useCallback(async (messages: AIMessage[], options: AICallOptions = {}) => {
    const {
      maxTokens = GROK_CONFIG.MAX_TOKENS_DEFAULT,
      systemPrompt = null,
      useInstructions = false,
      model = aiSettings.grokModel || 'grok-4-1-fast-reasoning',
      abortSignal = null,
      logMetrics = true,
      extractText = true
    } = options;

    let finalSystemPrompt = systemPrompt as string | null;
    if (!finalSystemPrompt && useInstructions) {
      const instructions = getAiInstructions();
      finalSystemPrompt = Array.isArray(instructions)
        ? instructions.map((i: Record<string, unknown>) => i.text || i).join('\n\n')
        : instructions;
    }

    // Funcao de requisicao que sera retentada
    const makeRequest = async () => {
      try {
        const grokMessages = convertToOpenAIFormat(messages, finalSystemPrompt);

        const requestBody = {
          model,
          messages: grokMessages,
          max_tokens: maxTokens
        };

        const response = await fetch(`${API_BASE}/api/grok/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': aiSettings.apiKeys?.grok || ''
          },
          body: JSON.stringify(requestBody),
          signal: abortSignal
        });

        // Se status retryable, lancar erro com status para withRetry detectar
        if (GROK_RETRY_CODES.includes(response.status)) {
          const error = new Error(`HTTP ${response.status}`) as Error & { status: number };
          error.status = response.status;
          throw error;
        }

        const data = await response.json();

        // v1.36.17: Log thinking no console para Grok
        if (aiSettings.logThinking) {
          const choices = data.choices as Record<string, unknown>[] | undefined;
          const message = choices?.[0]?.message as Record<string, unknown> | undefined;
          const reasoning = message?.reasoning || message?.reasoning_content || message?.thinking;
          if (reasoning) {
            console.group('[Grok] Thinking');
            console.log(reasoning);
            console.groupEnd();
          }
        }

        if (!response.ok) {
          const errorMsg = data.error?.message || `Grok API error: ${response.status}`;
          throw new Error(errorMsg);
        }

        // v1.37.91: Usa addTokenUsage com model/provider para tracking por modelo
        if (logMetrics) {
          const metrics = extractTokenMetrics(data, 'grok');
          addTokenUsage({
            input: metrics.input,
            output: metrics.output,
            cacheRead: metrics.cacheRead,
            cacheCreation: metrics.cacheCreation,
            model,
            provider: 'grok'
          });
        }

        if (extractText) {
          return extractResponseText(data, 'grok');
        }
        return data;
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          throw new Error('Operação cancelada pelo usuário');
        }
        throw err;
      }
    };

    return await withRetry(makeRequest, {
      maxRetries: 3,
      initialDelayMs: 5000,
      backoffType: 'linear',  // Grok usa backoff linear
      retryableStatusCodes: GROK_RETRY_CODES,
      abortSignal,
      onRetry: (attempt, err, delay) => {
        console.warn(`[Grok] Retry ${attempt}, aguardando ${delay}ms:`, err.message);
      }
    });
  }, [aiSettings, convertToOpenAIFormat, extractTokenMetrics, extractResponseText, setTokenMetrics, getAiInstructions]);

  // Função unificada que escolhe Claude, Gemini, OpenAI ou Grok baseado no provider
  // v1.37.90: Permite override do provider via options para casos específicos (ex: voice improvement)
  const callAI = React.useCallback(async (messages: AIMessage[], options: AICallOptions = {}) => {
    const provider = options.provider || aiSettings.provider || 'claude';

    // v1.35.97: OpenAI GPT-5.2
    if (provider === 'openai') {
      return await callOpenAIAPI(messages, {
        ...options,
        model: options.model || aiSettings.openaiModel || 'gpt-5.2-chat-latest'
      });
    }

    // v1.35.97: xAI Grok 4.1
    if (provider === 'grok') {
      return await callGrokAPI(messages, {
        ...options,
        model: options.model || aiSettings.grokModel || 'grok-4-1-fast-reasoning'
      });
    }

    if (provider === 'gemini') {
      return await callGeminiAPI(messages, {
        ...options,
        model: options.model || aiSettings.geminiModel || 'gemini-3-flash-preview'
      });
    }

    // Default: Claude
    return await callLLM(messages, {
      ...options,
      model: options.model || aiSettings.claudeModel || 'claude-sonnet-4-20250514'
    });
  }, [aiSettings, callLLM, callGeminiAPI, callOpenAIAPI, callGrokAPI]);

  // ========================================
  // END MULTI-PROVIDER SUPPORT
  // ========================================

  const getModelDisplayName = React.useCallback((modelId: string) => {
    const models: Record<string, string> = {
      // Claude
      'claude-sonnet-4-20250514': 'Claude Sonnet 4.5',
      'claude-opus-4-5-20251101': 'Claude Opus 4.5',
      // Gemini 3 (v1.32.36: removido 2.5)
      'gemini-3-flash-preview': 'Gemini 3 Flash',
      'gemini-3-pro-preview': 'Gemini 3 Pro',
      // v1.35.97: OpenAI GPT-5.2
      'gpt-5.2': 'GPT-5.2 Thinking',
      'gpt-5.2-chat-latest': 'GPT-5.2 Instant',
      // v1.35.97: xAI Grok 4.1
      'grok-4-1-fast-reasoning': 'Grok 4.1 Fast',
      'grok-4-1-fast-non-reasoning': 'Grok 4.1 Instant'
    };
    return models[modelId] || modelId;
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // STREAMING APIs - v1.39.09: Evita timeout do Render com resposta em chunks
  // v1.40.02: Double Check migrado para usar streaming
  // ═══════════════════════════════════════════════════════════════════════════

  /** Callback para receber chunks de texto durante streaming */
  type StreamChunkCallback = (fullText: string) => void;

  /** Opções adicionais para chamadas com streaming */
  interface AIStreamOptions extends AICallOptions {
    onChunk?: StreamChunkCallback;
  }

  /**
   * Chamada Claude com streaming
   * Retorna texto conforme chega em chunks via SSE
   */
  const callClaudeAPIStream = React.useCallback(async (
    messages: AIMessage[],
    options: AIStreamOptions = {}
  ): Promise<string> => {
    const {
      maxTokens = 8000,
      systemPrompt = null,
      useInstructions = false,
      model = aiSettings.claudeModel,
      disableThinking = false,
      onChunk
    } = options;

    const useThinking = aiSettings.useExtendedThinking && !disableThinking;
    const thinkingBudget = parseInt(aiSettings.thinkingBudget) || 10000;

    // Resolver systemPrompt
    let finalSystemPrompt = systemPrompt;
    if (!finalSystemPrompt && useInstructions) {
      const instructions = getAiInstructions();
      finalSystemPrompt = Array.isArray(instructions)
        ? instructions.map((i: Record<string, unknown>) => i.text || i).join('\n\n')
        : instructions;
    }

    const requestBody: Record<string, unknown> = {
      model,
      max_tokens: useThinking ? Math.max(maxTokens, thinkingBudget + 2000) : maxTokens,
      messages
    };

    if (finalSystemPrompt) {
      requestBody.system = finalSystemPrompt;
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
        'x-api-key': aiSettings.apiKeys?.claude || ''
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

            if (parsed.type === 'done' && parsed.usage) {
              addTokenUsage({
                input: parsed.usage.input_tokens || 0,
                output: parsed.usage.output_tokens || 0,
                model,
                provider: 'claude'
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
  }, [aiSettings, addTokenUsage, getAiInstructions]);

  /**
   * Chamada OpenAI com streaming
   */
  const callOpenAIAPIStream = React.useCallback(async (
    messages: AIMessage[],
    options: AIStreamOptions = {}
  ): Promise<string> => {
    const {
      maxTokens = 8000,
      systemPrompt = null,
      useInstructions = false,
      model = aiSettings.openaiModel,
      disableThinking = false,
      onChunk
    } = options;

    // Resolver systemPrompt
    let finalSystemPrompt = systemPrompt as string | null;
    if (!finalSystemPrompt && useInstructions) {
      const instructions = getAiInstructions();
      finalSystemPrompt = Array.isArray(instructions)
        ? instructions.map((i: Record<string, unknown>) => i.text || i).join('\n\n')
        : instructions;
    }

    const openaiMessages = convertToOpenAIFormat(messages, finalSystemPrompt);

    const isReasoningModel = model === 'gpt-5.2';
    const reasoningLevel = aiSettings.openaiReasoningLevel || 'medium';

    const requestBody: Record<string, unknown> = {
      model,
      messages: openaiMessages,
      max_tokens: maxTokens
    };

    if (isReasoningModel && !disableThinking) {
      requestBody.reasoning_effort = reasoningLevel;
    }

    const response = await fetch(`${API_BASE}/api/openai/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': aiSettings.apiKeys?.openai || ''
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

            if (parsed.type === 'done' && parsed.usage) {
              addTokenUsage({
                input: parsed.usage.prompt_tokens || 0,
                output: parsed.usage.completion_tokens || 0,
                model,
                provider: 'openai'
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
  }, [aiSettings, addTokenUsage, convertToOpenAIFormat, getAiInstructions]);

  /**
   * Chamada Grok com streaming
   */
  const callGrokAPIStream = React.useCallback(async (
    messages: AIMessage[],
    options: AIStreamOptions = {}
  ): Promise<string> => {
    const {
      maxTokens = 8000,
      systemPrompt = null,
      useInstructions = false,
      model = aiSettings.grokModel,
      onChunk
    } = options;

    // Resolver systemPrompt
    let finalSystemPrompt = systemPrompt as string | null;
    if (!finalSystemPrompt && useInstructions) {
      const instructions = getAiInstructions();
      finalSystemPrompt = Array.isArray(instructions)
        ? instructions.map((i: Record<string, unknown>) => i.text || i).join('\n\n')
        : instructions;
    }

    const grokMessages = convertToOpenAIFormat(messages, finalSystemPrompt);

    const response = await fetch(`${API_BASE}/api/grok/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': aiSettings.apiKeys?.grok || ''
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

            if (parsed.type === 'done' && parsed.usage) {
              addTokenUsage({
                input: parsed.usage.prompt_tokens || 0,
                output: parsed.usage.completion_tokens || 0,
                model,
                provider: 'grok'
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
  }, [aiSettings, addTokenUsage, convertToOpenAIFormat, getAiInstructions]);

  /**
   * Chamada Gemini com streaming
   */
  const callGeminiAPIStream = React.useCallback(async (
    messages: AIMessage[],
    options: AIStreamOptions = {}
  ): Promise<string> => {
    const {
      maxTokens = 8000,
      systemPrompt = null,
      useInstructions = false,
      model = aiSettings.geminiModel,
      disableThinking = false,
      onChunk
    } = options;

    // Resolver systemPrompt
    let finalSystemPrompt = systemPrompt;
    if (!finalSystemPrompt && useInstructions) {
      const instructions = getAiInstructions();
      finalSystemPrompt = Array.isArray(instructions)
        ? instructions.map((i: Record<string, unknown>) => i.text || i).join('\n\n')
        : instructions;
    }

    const geminiRequest = convertToGeminiFormat(messages, finalSystemPrompt);

    // Detectar Gemini 3 antes de calcular buffer
    const isGemini3 = model.includes('gemini-3') || model.includes('3-flash') || model.includes('3-pro');

    // Thinking config
    const effectiveThinkingLevel = disableThinking ? 'minimal' : (aiSettings.geminiThinkingLevel || 'high');
    const thinkingBuffer = isGemini3 ? ({
      'minimal': 1024,
      'low': 4000,
      'medium': 8000,
      'high': 16000
    }[effectiveThinkingLevel] || 8000) : 0;

    geminiRequest.generationConfig = {
      maxOutputTokens: maxTokens + thinkingBuffer,
      temperature: isGemini3 ? 1.0 : 0.7
    };

    if (isGemini3) {
      geminiRequest.generationConfig.thinking_config = {
        thinking_budget: thinkingBuffer,
        includeThoughts: !disableThinking
      };
    }

    const response = await fetch(`${API_BASE}/api/gemini/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': aiSettings.apiKeys?.gemini || '' },
      body: JSON.stringify({
        model,
        request: geminiRequest
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

            if (parsed.type === 'done' && parsed.usage) {
              addTokenUsage({
                input: parsed.usage.promptTokenCount || 0,
                output: parsed.usage.candidatesTokenCount || 0,
                model,
                provider: 'gemini'
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
  }, [aiSettings, addTokenUsage, convertToGeminiFormat, getAiInstructions]);

  /**
   * Chamada com streaming - escolhe provider automaticamente
   * Usa callback onChunk para atualizar UI em tempo real
   */
  const callAIStream = React.useCallback(async (
    messages: AIMessage[],
    options: AIStreamOptions = {}
  ): Promise<string> => {
    const provider = options.provider || aiSettings.provider;

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

  /**
   * Chama a API com streaming para provider/modelo específico (para double check)
   * v1.40.02: Streaming silencioso para evitar timeout em operações longas
   */
  const callDoubleCheckAPIStream = React.useCallback(async (
    provider: AIProvider,
    model: string,
    content: AIMessageContent[],
    maxTokens: number = 8000,
    onChunk?: (fullText: string) => void
  ): Promise<string> => {
    // v1.37.68: Verificar se há PDF binário e se provider suporta
    const hasPdfBinary = content.some(c =>
      typeof c === 'object' && c !== null && 'type' in c && c.type === 'document'
    );
    const providerSupportsPdf = provider !== 'grok';  // Grok não suporta PDF binário

    let finalContent: AIMessageContent[];
    if (hasPdfBinary && !providerSupportsPdf) {
      // Grok: filtrar PDFs binários (não suportados) - usar apenas texto
      console.warn('[DoubleCheck] Grok não suporta PDF binário, usando apenas texto');
      finalContent = content.filter(c =>
        !(typeof c === 'object' && c !== null && 'type' in c && c.type === 'document')
      );
    } else {
      finalContent = content;
    }

    const messages: AIMessage[] = [
      { role: 'user', content: finalContent }
    ];

    // v1.36.56: Construir opções com thinking config do Double Check
    const dcSettings = aiSettings.doubleCheck;
    const options: AIStreamOptions = {
      maxTokens,
      model,
      geminiThinkingLevel: dcSettings?.geminiThinkingLevel,
      onChunk
    };

    // Aplicar thinking config baseado no provider
    if (provider === 'claude' && dcSettings?.claudeThinkingBudget && dcSettings.claudeThinkingBudget > 0) {
      options.disableThinking = false;
    } else if (provider === 'claude') {
      options.disableThinking = true;
    }

    // Chamar a API de streaming específica do provider
    if (provider === 'openai') {
      return await callOpenAIAPIStream(messages, options);
    }
    if (provider === 'grok') {
      return await callGrokAPIStream(messages, options);
    }
    if (provider === 'gemini') {
      return await callGeminiAPIStream(messages, options);
    }
    // Default: Claude
    return await callClaudeAPIStream(messages, options);
  }, [callClaudeAPIStream, callGeminiAPIStream, callOpenAIAPIStream, callGrokAPIStream, aiSettings.doubleCheck]);

  /**
   * Executa o double check em uma resposta da IA
   * @param operation - Tipo de operação (topicExtraction, etc)
   * @param originalResponse - Resposta original em JSON
   * @param context - v1.37.68: AIMessageContent[] - contexto original (PDFs incluídos)
   * @param onProgress - Callback de progresso opcional
   * @param userPrompt - (v1.37.65) Solicitação original do usuário (para quickPrompt)
   */
  // v1.37.68: context agora é AIMessageContent[] (não string)
  const performDoubleCheck = React.useCallback(async (
    operation: 'topicExtraction' | 'dispositivo' | 'sentenceReview' | 'factsComparison' | 'proofAnalysis' | 'quickPrompt',
    originalResponse: string,
    context: AIMessageContent[],  // v1.37.68: MUDOU de string para array
    onProgress?: (msg: string) => void,
    userPrompt?: string
  ): Promise<{ verified: string; corrections: DoubleCheckCorrection[]; summary: string; confidence?: number; failed?: boolean }> => {
    const { doubleCheck } = aiSettings;

    // Se double check desabilitado ou operação não selecionada, retornar original
    if (!doubleCheck?.enabled || !doubleCheck.operations[operation]) {
      return { verified: originalResponse, corrections: [], summary: '' };
    }

    onProgress?.('🔄 Verificando resposta com Double Check...');

    try {
      // v1.37.68: Extrair texto do contexto para o template do prompt
      const textContext = context
        .filter((c): c is AITextContent =>
          typeof c === 'object' && c !== null && 'type' in c && c.type === 'text'
        )
        .map(c => c.text)
        .join('\n\n');

      // Importar dinamicamente o prompt builder
      const { buildDoubleCheckPrompt } = await import('../prompts/double-check-prompts');
      // v1.37.65: Passar userPrompt para quickPrompt
      const verificationPrompt = buildDoubleCheckPrompt(operation, originalResponse, textContext, userPrompt);

      // v1.37.68: Criar conteúdo final - prompt de verificação + PDFs binários (se houver)
      const pdfContent = context.filter(c =>
        typeof c === 'object' && c !== null && 'type' in c && c.type === 'document'
      );
      const finalContent: AIMessageContent[] = [
        { type: 'text', text: verificationPrompt },
        ...pdfContent  // PDFs binários do contexto original
      ];

      // v1.40.02: Chamar API com streaming silencioso para evitar timeout
      const response = await callDoubleCheckAPIStream(
        doubleCheck.provider,
        doubleCheck.model,
        finalContent,  // v1.37.68: array (não string)
        8000,
        undefined  // streaming silencioso (sem callback onChunk)
      );

      // v1.36.56: Parsear resposta JSON baseado no tipo de operação
      // v1.37.65: Adicionado proofAnalysis e quickPrompt (verifiedResult)
      const verifiedFieldPattern = operation === 'topicExtraction'
        ? '"verifiedTopics"'
        : operation === 'dispositivo'
          ? '"verifiedDispositivo"'
          : operation === 'factsComparison' || operation === 'proofAnalysis' || operation === 'quickPrompt'
            ? '"verifiedResult"'
            : '"verifiedReview"';

      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) ||
                        response.match(new RegExp(`\\{[\\s\\S]*${verifiedFieldPattern}[\\s\\S]*\\}`));

      const jsonStr = jsonMatch
        ? (jsonMatch[1] || jsonMatch[0])
        : extractJSON(response);

      if (!jsonStr) {
        console.warn('[DoubleCheck] Resposta não contém JSON válido:', response.substring(0, 200));
        return { verified: originalResponse, corrections: [], summary: 'Falha ao parsear resposta', failed: true };
      }
      const dcValidated = parseAIResponse(jsonStr, DoubleCheckResponseSchema);
      let result: DoubleCheckParsedResult;
      if (dcValidated.success) {
        result = dcValidated.data as unknown as DoubleCheckParsedResult;
      } else {
        console.warn('[DoubleCheck] Validação Zod falhou, usando fallback:', dcValidated.error);
        result = JSON.parse(jsonStr);
      }

      // Debug: Log do verifiedResult retornado pela IA
      // Nota: verifiedTopics e verifiedResult (factsComparison) são objetos, não strings
      const rawVerified = result.verifiedTopics || result.verifiedResult || result.verifiedDispositivo || result.verifiedReview;
      const verifiedPreview = typeof rawVerified === 'string'
        ? rawVerified.substring(0, 200) + '...'
        : rawVerified
          ? JSON.stringify(rawVerified).substring(0, 200) + '...'
          : '[vazio]';
      console.log('[DoubleCheck] Resultado parseado:', {
        operation,
        hasCorrections: (result.corrections?.length ?? 0) > 0,
        correctionsCount: result.corrections?.length || 0,
        verifiedResultPreview: verifiedPreview,
        originalResponsePreview: originalResponse.substring(0, 200) + '...',
        verifiedEqualsOriginal: rawVerified === originalResponse
      });

      // Extrair campo verificado baseado na operação
      // v1.37.65: Adicionado proofAnalysis e quickPrompt (verifiedResult como string)
      const verified = operation === 'topicExtraction'
        ? JSON.stringify(result.verifiedTopics)
        : operation === 'dispositivo'
          ? result.verifiedDispositivo || originalResponse
          : operation === 'factsComparison'
            ? JSON.stringify(result.verifiedResult) || originalResponse
            : operation === 'proofAnalysis' || operation === 'quickPrompt'
              ? (result.verifiedResult as string) || originalResponse
              : result.verifiedReview || originalResponse;

      return {
        verified,
        corrections: result.corrections || [],
        summary: result.summary || '',
        confidence: result.confidence ?? 0.85  // Fallback 85% se IA não retornar
      };
    } catch (error) {
      console.error('[DoubleCheck] Erro:', error);
      return { verified: originalResponse, corrections: [], summary: 'Erro na verificação', confidence: 0.85, failed: true };
    }
  }, [aiSettings, callDoubleCheckAPIStream]);

  return {
    // Estados
    aiSettings,
    aiInstruction,
    aiGeneratedText,
    generatingAi,
    aiInstructionModel,
    aiGeneratedTextModel,
    generatingAiModel,
    generatingKeywords,
    relatorioInstruction,
    regeneratingRelatorio,
    regenerating,
    dispositivoText,
    generatingDispositivo,
    dispositivoInstruction,
    regeneratingDispositivo,

    // Setters
    setAiSettings,
    setAiInstruction,
    setAiGeneratedText,
    setGeneratingAi,
    setAiInstructionModel,
    setAiGeneratedTextModel,
    setGeneratingAiModel,
    setGeneratingKeywords,
    generatingTitle,
    setGeneratingTitle,
    setRelatorioInstruction,
    setRegeneratingRelatorio,
    setRegenerating,
    setDispositivoText,
    setGeneratingDispositivo,
    setDispositivoInstruction,
    setRegeneratingDispositivo,

    // Funções
    buildApiRequest,
    getApiHeaders,
    callLLM,
    logCacheMetrics,
    getAiInstructions,
    getModelDisplayName,

    // v1.30: Multi-provider support
    callGeminiAPI,
    callOpenAIAPI,   // v1.35.97
    callGrokAPI,     // v1.35.97
    callAI,
    convertToGeminiFormat,
    convertToOpenAIFormat,  // v1.35.97
    extractTokenMetrics,
    extractResponseText,

    // v1.36.50: Double Check
    performDoubleCheck,

    // v1.39.09: Streaming APIs
    callClaudeAPIStream,
    callOpenAIAPIStream,
    callGrokAPIStream,
    callGeminiAPIStream,
    callAIStream,

    // v1.20.3: Contador de tokens persistente
    tokenMetrics,
    setTokenMetrics
  };
};

export { useAIIntegration };

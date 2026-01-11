/**
 * @file aiProviders.ts
 * @description Mocks para APIs de IA (Claude, Gemini, OpenAI, Grok)
 * @usage vi.mock('../../path', () => aiProviderMocks)
 */

import { vi } from 'vitest';

// Tipos
export interface MockAPIResponse {
  text: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
    cache_read_input_tokens?: number;
    cache_creation_input_tokens?: number;
  };
  finish_reason?: string;
  model?: string;
}

export interface MockAPIError {
  status: number;
  message: string;
  type?: string;
}

// Respostas padrão
export const defaultResponse: MockAPIResponse = {
  text: 'Mock response from AI',
  usage: {
    input_tokens: 100,
    output_tokens: 50,
    cache_read_input_tokens: 0,
    cache_creation_input_tokens: 0,
  },
  finish_reason: 'end_turn',
  model: 'mock-model',
};

// Erros comuns
export const rateLimitError: MockAPIError = {
  status: 429,
  message: 'Rate limit exceeded',
  type: 'rate_limit_error',
};

export const serverError: MockAPIError = {
  status: 500,
  message: 'Internal server error',
  type: 'server_error',
};

export const overloadedError: MockAPIError = {
  status: 529,
  message: 'API is overloaded',
  type: 'overloaded_error',
};

// Factory para criar mocks
export const createMockAPICall = (response: MockAPIResponse = defaultResponse) => {
  return vi.fn().mockResolvedValue(response);
};

export const createFailingAPICall = (error: MockAPIError = rateLimitError) => {
  return vi.fn().mockRejectedValue(new Error(JSON.stringify(error)));
};

export const createRetryableAPICall = (
  failCount: number,
  response: MockAPIResponse = defaultResponse
) => {
  let callCount = 0;
  return vi.fn().mockImplementation(() => {
    callCount++;
    if (callCount <= failCount) {
      return Promise.reject(new Error(JSON.stringify(rateLimitError)));
    }
    return Promise.resolve(response);
  });
};

// Mocks por provider
export const claudeMocks = {
  callClaudeAPI: createMockAPICall({
    ...defaultResponse,
    model: 'claude-sonnet-4-20250514',
  }),
  callClaudeAPIWithRetry: createMockAPICall({
    ...defaultResponse,
    model: 'claude-sonnet-4-20250514',
  }),
};

export const geminiMocks = {
  callGeminiAPI: createMockAPICall({
    ...defaultResponse,
    model: 'gemini-3-flash',
  }),
};

export const openaiMocks = {
  callOpenAIAPI: createMockAPICall({
    ...defaultResponse,
    model: 'gpt-5.2',
  }),
};

export const grokMocks = {
  callGrokAPI: createMockAPICall({
    ...defaultResponse,
    model: 'grok-4.1',
  }),
};

// Mock completo de todos os providers
export const allProviderMocks = {
  ...claudeMocks,
  ...geminiMocks,
  ...openaiMocks,
  ...grokMocks,
};

// Helpers para testes
export const resetAllMocks = (): void => {
  Object.values(allProviderMocks).forEach(mock => {
    if (typeof mock === 'function' && 'mockReset' in mock) {
      mock.mockReset();
    }
  });
};

export const setMockResponse = (
  mockFn: ReturnType<typeof vi.fn>,
  response: MockAPIResponse
): void => {
  mockFn.mockResolvedValue(response);
};

export const setMockError = (
  mockFn: ReturnType<typeof vi.fn>,
  error: MockAPIError
): void => {
  mockFn.mockRejectedValue(new Error(JSON.stringify(error)));
};

// Resposta com thinking (extended thinking)
export const responseWithThinking: MockAPIResponse = {
  text: 'Final response after thinking',
  usage: {
    input_tokens: 100,
    output_tokens: 500,
    cache_read_input_tokens: 0,
    cache_creation_input_tokens: 0,
  },
  finish_reason: 'end_turn',
  model: 'claude-sonnet-4-20250514',
};

// Resposta truncada (MAX_TOKENS)
export const truncatedResponse: MockAPIResponse = {
  text: 'This response was truncated...',
  usage: {
    input_tokens: 100,
    output_tokens: 4096,
  },
  finish_reason: 'max_tokens',
  model: 'claude-sonnet-4-20250514',
};

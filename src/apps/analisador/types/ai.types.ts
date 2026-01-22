/**
 * @file ai.types.ts
 * @description Tipos para integração com provedores de IA
 */

export type AIProvider = 'claude' | 'gemini' | 'openai' | 'grok';

/** Níveis de thinking do Gemini */
export type GeminiThinkingLevel = 'minimal' | 'low' | 'medium' | 'high';

/** Níveis de reasoning do OpenAI (para gpt-5.2) */
export type OpenAIReasoningLevel = 'low' | 'medium' | 'high';

export interface APIKeys {
  claude: string;
  gemini: string;
  openai: string;
  grok: string;
}

export interface AISettings {
  provider: AIProvider;
  claudeModel: string;
  geminiModel: string;
  openaiModel: 'gpt-5.2' | 'gpt-5.2-chat-latest';
  openaiReasoningLevel: OpenAIReasoningLevel;
  grokModel: 'grok-4-1-fast-reasoning' | 'grok-4-1-fast-non-reasoning';
  apiKeys: APIKeys;
  useExtendedThinking: boolean;
  thinkingBudget: string;
  geminiThinkingLevel: GeminiThinkingLevel;
}

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string | AIMessageContent[];
}

export interface AIMessageContent {
  type: 'text' | 'document';
  text?: string;
  source?: {
    type: 'base64';
    media_type: string;
    data: string;
  };
}

export interface AICallOptions {
  maxTokens?: number;
  systemPrompt?: string | null;
  useInstructions?: boolean;
  model?: string | null;
  disableThinking?: boolean;
  timeout?: number | null;
  abortSignal?: AbortSignal | null;
  logMetrics?: boolean;
  extractText?: boolean;
  validateResponse?: boolean;
  temperature?: number | null;
}

export interface TokenMetrics {
  totalInput: number;
  totalOutput: number;
  totalCacheRead: number;
  totalCacheCreation: number;
  requestCount: number;
  lastUpdated: string | null;
}

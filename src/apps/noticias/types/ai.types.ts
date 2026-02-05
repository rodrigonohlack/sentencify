// ═══════════════════════════════════════════════════════════════════════════
// TIPOS IA - App de Notícias Jurídicas
// v1.41.0 - Tipos para integração com provedores de IA
// ═══════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════
// API RESPONSE TYPES
// ═══════════════════════════════════════════════════════════════════════════

/** Claude API response content block */
export interface ClaudeContentBlock {
  type: 'text' | 'thinking' | 'tool_use';
  text?: string;
  thinking?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
}

/** OpenAI/Grok API message format */
export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{ type: string; text?: string }>;
}

/** Grok API message format (simplified content) */
export interface GrokMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** Gemini API message format */
export interface GeminiMessage {
  role: 'user' | 'model';
  parts: Array<{ text?: string }>;
}

/** Gemini API system instruction format */
export interface GeminiSystemInstruction {
  parts: Array<{ text: string }>;
}

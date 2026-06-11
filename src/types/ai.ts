/**
 * @file ai.ts
 * @description Tipos base de integração com provedores de IA, compartilhados
 *              entre os apps (analisador, noticias, prova-oral). O Core
 *              (src/types/index.ts) possui sua própria versão extendida de
 *              AISettings/TokenMetrics com features adicionais (quickPrompts,
 *              anonymization, doubleCheck, etc.); esses tipos extendidos NÃO
 *              devem ser movidos para cá sem revisão.
 */

export type AIProvider = 'claude' | 'gemini' | 'openai' | 'grok' | 'deepseek' | 'claude-cli' | 'codex-cli' | 'manual';

/**
 * Providers de CLI local que autenticam por login OAuth (Claude Code / ChatGPT)
 * via daemon local e, portanto, NÃO exigem API key.
 */
export const KEYLESS_CLI_PROVIDERS: ReadonlyArray<AIProvider> = ['claude-cli', 'codex-cli'];

/** True quando o provider exige API key (todos, exceto os CLIs locais OAuth). */
export const providerRequiresApiKey = (provider: AIProvider): boolean =>
  !KEYLESS_CLI_PROVIDERS.includes(provider);

/** Níveis de thinking do Gemini */
export type GeminiThinkingLevel = 'minimal' | 'low' | 'medium' | 'high';

/** Níveis de reasoning do OpenAI (para gpt-5.2) */
export type OpenAIReasoningLevel = 'low' | 'medium' | 'high';

/** Modelos DeepSeek V4 ('' = não selecionado, força escolha em ConfigModal) */
export type DeepseekModel = 'deepseek-v4-flash' | 'deepseek-v4-pro' | '';

/** Reasoning effort do DeepSeek V4 (quando thinking está ativo) */
export type DeepseekReasoningEffort = 'high' | 'max';

/** Níveis de effort do claude-cli (--effort flag do CLI) */
export type ClaudeCliEffort = 'off' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';

/** Reasoning effort do codex-cli (mapeado para `model_reasoning_effort` do config Codex) */
export type CodexCliReasoning = 'minimal' | 'low' | 'medium' | 'high';

export interface APIKeys {
  claude: string;
  gemini: string;
  openai: string;
  grok: string;
  deepseek: string;
  'claude-cli'?: string; // Sem API key — usa login OAuth local
  'codex-cli'?: string; // Sem API key — usa OAuth ChatGPT local
  'manual'?: string;    // Sem API key — usuário cola a resposta manualmente
}

export interface AISettings {
  provider: AIProvider;
  claudeModel: string;
  claudeCliModel?: string;
  claudeCliEffort?: ClaudeCliEffort;
  codexCliModel?: string;
  codexCliReasoning?: CodexCliReasoning;
  geminiModel: string;
  openaiModel: 'gpt-5.2' | 'gpt-5.2-chat-latest';
  openaiReasoningLevel: OpenAIReasoningLevel;
  grokModel: 'grok-4-1-fast-reasoning' | 'grok-4-1-fast-non-reasoning'
           | 'grok-4.20-0309-reasoning' | 'grok-4.20-0309-non-reasoning';
  deepseekModel: DeepseekModel;
  deepseekThinking: boolean;
  deepseekReasoningEffort: DeepseekReasoningEffort;
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
  // 'image' (v1.50.47): páginas de PDF rasterizadas para o provider Codex (PDF Puro).
  type: 'text' | 'document' | 'image';
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
  /** Quando true, roteia para o daemon llm-bridge local em vez do proxy remoto. */
  localBridge?: boolean;
  /** v1.53.7: usa o estilo de redação SEM o item "FORMATO NARRATIVO CONTÍNUO" (proibição de
   *  enumerações) no system prompt — para tarefas com estrutura enumerada (DISPOSITIVO).
   *  Só tem efeito com useInstructions: true e sem customPrompt do magistrado. */
  semFormatoNarrativo?: boolean;
  /** Título opcional exibido no modal do modo manual (ex.: "Prova oral — fase 2 de 3"). */
  manualTitle?: string;
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
  // image_url (v1.50.47): páginas de PDF rasterizadas no caminho do Codex (PDF Puro).
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

/** Grok API message format (simplified content) */
export interface GrokMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** Gemini API message format */
export interface GeminiMessage {
  role: 'user' | 'model';
  parts: Array<{
    text?: string;
    inline_data?: { mime_type: string; data: string };
  }>;
}

/** Gemini API system instruction format */
export interface GeminiSystemInstruction {
  parts: Array<{ text: string }>;
}

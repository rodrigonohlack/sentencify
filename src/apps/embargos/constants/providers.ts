/**
 * @file providers.ts
 * @description Helpers de compatibilidade de providers com features específicas
 */

import type { AIProvider } from '../../../types/ai';

/**
 * Providers que aceitam PDF binário (base64) nativamente como anexo.
 * - claude: usa block {type:'document', source:{type:'base64', media_type, data}}
 * - gemini: usa part {inline_data: {mime_type, data}}
 * - grok / deepseek: text-only (não suportam binário)
 * - openai: suporta via file blocks, mas fora do escopo da entrega inicial
 */
export const PROVIDERS_WITH_PDF_BINARY: ReadonlyArray<AIProvider> = ['claude', 'gemini', 'claude-cli'] as const;

export function providerSupportsPdfBinary(provider: AIProvider): boolean {
  return PROVIDERS_WITH_PDF_BINARY.includes(provider);
}

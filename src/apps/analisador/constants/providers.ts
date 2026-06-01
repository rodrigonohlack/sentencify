/**
 * @file providers.ts
 * @description Helpers de compatibilidade de providers com features específicas
 */

import type { AIProvider } from '../../../types/ai';

/**
 * Providers que suportam "PDF Puro" (enviar o PDF sem depender de texto extraído).
 * - claude / claude-cli: block {type:'document', source:{type:'base64', media_type, data}}
 * - gemini: part {inline_data: {mime_type, data}}
 * - codex-cli (v1.50.47): NÃO aceita PDF; o PDF é rasterizado em imagens de página
 *   (uma `-i` por página no codex exec). Ver src/utils/pdfRasterize.ts.
 * - grok / deepseek: text-only (não suportam)
 * - openai: suporta via file blocks, mas fora do escopo da entrega inicial
 */
export const PROVIDERS_WITH_PDF_BINARY: ReadonlyArray<AIProvider> = ['claude', 'gemini', 'claude-cli', 'codex-cli'] as const;

export function providerSupportsPdfBinary(provider: AIProvider): boolean {
  return PROVIDERS_WITH_PDF_BINARY.includes(provider);
}

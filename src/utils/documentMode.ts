import type { AIProvider } from '../types';
import { isPdfBinaryAllowed } from './manualCall';

/**
 * Resolve o modo efetivo de processamento de um documento.
 * - Anonimização ligada: rebaixa modos binário/vision para 'pdfjs' (comportamento atual).
 * - Provider sem suporte a PDF binário ('manual'/'grok'): proíbe 'pdf-puro' → cai para extração.
 */
export function resolveEffectiveMode(
  docMode: string | undefined,
  ctx: { provider: AIProvider; anonymizationEnabled: boolean; globalOcrEngine?: string },
): string {
  const blockedWithAnon = ['claude-vision', 'gemini-vision', 'pdf-puro'];
  if (ctx.anonymizationEnabled && docMode && blockedWithAnon.includes(docMode)) {
    return 'pdfjs';
  }
  if (!isPdfBinaryAllowed(ctx.provider) && docMode === 'pdf-puro') {
    return ctx.globalOcrEngine && ctx.globalOcrEngine !== 'pdf-puro' ? ctx.globalOcrEngine : 'pdfjs';
  }
  return docMode || ctx.globalOcrEngine || 'pdfjs';
}

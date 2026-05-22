/**
 * @file concat-draft.ts
 * @description Concatena seções da minuta em texto único para copy/export.
 */

import type { Draft } from '../types';

/**
 * Concatena as três seções com quebras duplas, sem cabeçalhos.
 * Cabeçalhos não são inseridos porque o usuário cola direto no PJe.
 */
export function concatDraft(draft: Draft): string {
  const parts = [
    draft.relatorio.text.trim(),
    draft.fundamentacao.text.trim(),
    draft.dispositivo.text.trim()
  ].filter(p => p.length > 0);
  return parts.join('\n\n');
}

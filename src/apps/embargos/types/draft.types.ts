/**
 * @file draft.types.ts
 * @description Tipos da minuta gerada (2ª chamada à IA) e do histórico local.
 */

import type { DocumentSlot } from './document.types';
import type { SynthesisResult } from './synthesis.types';

export type DraftSectionKey = 'relatorio' | 'fundamentacao' | 'dispositivo';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

/**
 * Estado persistido de uma seção da minuta.
 * O status de refino em andamento NÃO fica aqui — é tracked exclusivamente em
 * useDraftStore.refiningSection (em memória), para evitar estado "preso" caso
 * o usuário feche a aba durante uma chamada à IA.
 */
export interface DraftSection {
  text: string;
  chatHistory: ChatMessage[];
}

export interface Draft {
  relatorio: DraftSection;
  fundamentacao: DraftSection;
  dispositivo: DraftSection;
}

export interface SavedDocumentMeta {
  slot: DocumentSlot;
  name: string;
  size: number;
}

export interface SavedEmbargos {
  id: string;
  createdAt: number;
  updatedAt: number;
  titulo: string;
  documents: SavedDocumentMeta[];
  synthesis: SynthesisResult;
  draft: Draft | null;
}

export const SECTION_LABELS: Record<DraftSectionKey, string> = {
  relatorio: 'Relatório',
  fundamentacao: 'Fundamentação',
  dispositivo: 'Dispositivo'
};

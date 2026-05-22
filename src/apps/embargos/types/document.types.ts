/**
 * @file document.types.ts
 * @description Tipos de documentos (PDFs) do subapp Embargos.
 */

export type DocumentSlot =
  | 'decisaoEmbargada'
  | 'embargos'
  | 'contrarrazoes'
  | 'inicial'
  | 'contestacao';

export interface DocumentFile {
  id: string;
  slot: DocumentSlot;
  name: string;
  size: number;
  text: string;
  base64: string | null;
  useBinary: boolean;
  status: 'pending' | 'parsing' | 'ready' | 'error';
  errorMessage?: string;
}

export const SLOT_LABELS: Record<DocumentSlot, string> = {
  decisaoEmbargada: 'Decisão Embargada',
  embargos: 'Embargos',
  contrarrazoes: 'Contrarrazões',
  inicial: 'Petição Inicial',
  contestacao: 'Contestação'
};

export const REQUIRED_SLOTS: ReadonlyArray<DocumentSlot> = ['decisaoEmbargada', 'embargos'];

/**
 * @file document.types.ts
 * @description Tipos para documentos e upload
 */

export type DocumentType = 'peticao' | 'contestacao';

export interface DocumentFile {
  id: string;
  name: string;
  type: DocumentType;
  file: File;
  text: string;
  base64?: string;
  status: 'pending' | 'processing' | 'ready' | 'error';
  error?: string;
  uploadedAt: Date;
}

export interface DocumentStore {
  peticao: DocumentFile | null;
  contestacao: DocumentFile | null;
  setPeticao: (doc: DocumentFile | null) => void;
  setContestacao: (doc: DocumentFile | null) => void;
  clearAll: () => void;
}

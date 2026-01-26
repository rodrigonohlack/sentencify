/**
 * @file document.types.ts
 * @description Tipos para documentos e upload
 */

export type DocumentType = 'peticao' | 'emenda' | 'contestacao';

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
  order: number;
}

export interface DocumentStore {
  peticao: DocumentFile | null;
  emendas: DocumentFile[];
  contestacoes: DocumentFile[];
  setPeticao: (doc: DocumentFile | null) => void;
  addEmenda: (doc: DocumentFile) => void;
  removeEmenda: (id: string) => void;
  updateEmenda: (id: string, updates: Partial<DocumentFile>) => void;
  reorderEmendas: (ids: string[]) => void;
  addContestacao: (doc: DocumentFile) => void;
  removeContestacao: (id: string) => void;
  updateContestacao: (id: string, updates: Partial<DocumentFile>) => void;
  reorderContestacoes: (ids: string[]) => void;
  clearAll: () => void;
  hasDocuments: () => boolean;
  canAnalyze: () => boolean;
  getAllDocumentsText: () => {
    peticao: string;
    emendas: string[];
    contestacoes: string[];
  };
}

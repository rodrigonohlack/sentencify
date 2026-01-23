/**
 * @file useDocumentsStore.ts
 * @description Zustand store para gerenciamento de documentos (petições, contestações, complementares)
 * @version 1.38.40
 *
 * FASE 3 Etapa 3.1 - Extração de estado do useDocumentManager para Zustand:
 * - 14 useState migrados para store global
 * - Setters simples e handlers como actions
 * - Métodos de persistência (serialize/restore/clear)
 * - DevTools habilitado para debug
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type {
  UploadedFile,
  PastedText,
  ProcessingMode,
  ExtractedTexts,
  AnalyzedDocuments,
  DocumentProcessingModes
} from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACE DO STORE
// ═══════════════════════════════════════════════════════════════════════════════

interface DocumentsStoreState {
  // ═══════════════════════════════════════════════════════════════════════════
  // ESTADOS DE ARQUIVOS (3)
  // ═══════════════════════════════════════════════════════════════════════════

  /** PDFs da petição inicial e emendas */
  peticaoFiles: UploadedFile[];

  /** PDFs de contestações */
  contestacaoFiles: UploadedFile[];

  /** PDFs de documentos complementares */
  complementaryFiles: UploadedFile[];

  // ═══════════════════════════════════════════════════════════════════════════
  // ESTADOS DE TEXTOS COLADOS (3)
  // ═══════════════════════════════════════════════════════════════════════════

  /** Petições e emendas coladas */
  pastedPeticaoTexts: PastedText[];

  /** Contestações coladas */
  pastedContestacaoTexts: PastedText[];

  /** Documentos complementares colados */
  pastedComplementaryTexts: PastedText[];

  // ═══════════════════════════════════════════════════════════════════════════
  // ESTADOS DE METADADOS (1)
  // ═══════════════════════════════════════════════════════════════════════════

  /** Documentos processados após análise */
  analyzedDocuments: AnalyzedDocuments;

  // ═══════════════════════════════════════════════════════════════════════════
  // ESTADOS DE UI/PROGRESSO (6)
  // ═══════════════════════════════════════════════════════════════════════════

  /** Flag indicando se análise está em andamento */
  analyzing: boolean;

  /** Mensagem de progresso durante análise */
  analysisProgress: string;

  /** Flag indicando se extração de texto de PDF está em andamento */
  extractingText: boolean;

  /** Controla visibilidade das áreas de colagem por tipo */
  showPasteArea: Record<string, boolean>;

  /** Cache de textos extraídos de PDFs */
  extractedTexts: ExtractedTexts;

  /** Controla exibição de modal de preview de texto extraído */
  showTextPreview: boolean;

  // ═══════════════════════════════════════════════════════════════════════════
  // ESTADOS DE PROCESSAMENTO (1)
  // ═══════════════════════════════════════════════════════════════════════════

  /** Modo de processamento por documento (pdfjs, pdf-puro, claude-vision) */
  documentProcessingModes: DocumentProcessingModes;

  // ═══════════════════════════════════════════════════════════════════════════
  // SETTERS DE ARQUIVOS (3)
  // ═══════════════════════════════════════════════════════════════════════════

  setPeticaoFiles: (files: UploadedFile[] | ((prev: UploadedFile[]) => UploadedFile[])) => void;
  setContestacaoFiles: (files: UploadedFile[] | ((prev: UploadedFile[]) => UploadedFile[])) => void;
  setComplementaryFiles: (files: UploadedFile[] | ((prev: UploadedFile[]) => UploadedFile[])) => void;

  // ═══════════════════════════════════════════════════════════════════════════
  // SETTERS DE TEXTOS COLADOS (3)
  // ═══════════════════════════════════════════════════════════════════════════

  setPastedPeticaoTexts: (texts: PastedText[] | ((prev: PastedText[]) => PastedText[])) => void;
  setPastedContestacaoTexts: (texts: PastedText[] | ((prev: PastedText[]) => PastedText[])) => void;
  setPastedComplementaryTexts: (texts: PastedText[] | ((prev: PastedText[]) => PastedText[])) => void;

  // ═══════════════════════════════════════════════════════════════════════════
  // SETTERS DE METADADOS E UI (7)
  // ═══════════════════════════════════════════════════════════════════════════

  setAnalyzedDocuments: (docs: AnalyzedDocuments | ((prev: AnalyzedDocuments) => AnalyzedDocuments)) => void;
  setAnalyzing: (v: boolean) => void;
  setAnalysisProgress: (p: string) => void;
  setExtractingText: (v: boolean) => void;
  setShowPasteArea: (areas: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)) => void;
  setExtractedTexts: (texts: ExtractedTexts | ((prev: ExtractedTexts) => ExtractedTexts)) => void;
  setShowTextPreview: (v: boolean) => void;

  // ═══════════════════════════════════════════════════════════════════════════
  // SETTERS DE PROCESSAMENTO (4)
  // ═══════════════════════════════════════════════════════════════════════════

  setDocumentProcessingModes: (modes: DocumentProcessingModes | ((prev: DocumentProcessingModes) => DocumentProcessingModes)) => void;
  setPeticaoMode: (index: number, mode: ProcessingMode) => void;
  setContestacaoMode: (index: number, mode: ProcessingMode) => void;
  setComplementarMode: (index: number, mode: ProcessingMode) => void;

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTIONS COMPLEXAS (2)
  // ═══════════════════════════════════════════════════════════════════════════

  /** Processa texto colado para petição, contestação ou complementar */
  handlePastedText: (text: string, type: string) => boolean;

  /** Remove texto colado por tipo e índice */
  removePastedText: (type: string, index: number | null) => void;

  // ═══════════════════════════════════════════════════════════════════════════
  // MÉTODOS DE PERSISTÊNCIA (3)
  // ═══════════════════════════════════════════════════════════════════════════

  /** Serializa estado para persistência */
  serializeForPersistence: () => Record<string, unknown>;

  /** Restaura estado de dados persistidos */
  restoreFromPersistence: (data: Record<string, unknown> | null) => void;

  /** Reseta todo o estado de documentos */
  clearAll: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALORES INICIAIS
// ═══════════════════════════════════════════════════════════════════════════════

const INITIAL_ANALYZED_DOCUMENTS: AnalyzedDocuments = {
  peticoes: [],
  peticoesText: [],
  contestacoes: [],
  contestacoesText: [],
  complementares: [],
  complementaresText: []
};

const INITIAL_EXTRACTED_TEXTS: ExtractedTexts = {
  peticoes: [],
  contestacoes: [],
  complementares: []
};

const INITIAL_PASTE_AREA: Record<string, boolean> = {
  peticao: false,
  contestacao: false,
  complementary: false
};

const INITIAL_PROCESSING_MODES: DocumentProcessingModes = {
  peticoes: [],
  contestacoes: [],
  complementares: []
};

// ═══════════════════════════════════════════════════════════════════════════════
// STORE
// ═══════════════════════════════════════════════════════════════════════════════

export const useDocumentsStore = create<DocumentsStoreState>()(
  devtools(
    immer((set, get) => ({
      // ═══════════════════════════════════════════════════════════════════════
      // ESTADO INICIAL
      // ═══════════════════════════════════════════════════════════════════════

      // Arquivos (3)
      peticaoFiles: [],
      contestacaoFiles: [],
      complementaryFiles: [],

      // Textos Colados (3)
      pastedPeticaoTexts: [],
      pastedContestacaoTexts: [],
      pastedComplementaryTexts: [],

      // Metadados (1)
      analyzedDocuments: { ...INITIAL_ANALYZED_DOCUMENTS },

      // UI/Progresso (6)
      analyzing: false,
      analysisProgress: '',
      extractingText: false,
      showPasteArea: { ...INITIAL_PASTE_AREA },
      extractedTexts: { ...INITIAL_EXTRACTED_TEXTS },
      showTextPreview: false,

      // Processamento (1)
      documentProcessingModes: { ...INITIAL_PROCESSING_MODES },

      // ═══════════════════════════════════════════════════════════════════════
      // SETTERS DE ARQUIVOS
      // ═══════════════════════════════════════════════════════════════════════

      setPeticaoFiles: (filesOrUpdater) =>
        set((state) => {
          if (typeof filesOrUpdater === 'function') {
            state.peticaoFiles = filesOrUpdater(state.peticaoFiles);
          } else {
            state.peticaoFiles = filesOrUpdater;
          }
        }, false, 'setPeticaoFiles'),

      setContestacaoFiles: (filesOrUpdater) =>
        set((state) => {
          if (typeof filesOrUpdater === 'function') {
            state.contestacaoFiles = filesOrUpdater(state.contestacaoFiles);
          } else {
            state.contestacaoFiles = filesOrUpdater;
          }
        }, false, 'setContestacaoFiles'),

      setComplementaryFiles: (filesOrUpdater) =>
        set((state) => {
          if (typeof filesOrUpdater === 'function') {
            state.complementaryFiles = filesOrUpdater(state.complementaryFiles);
          } else {
            state.complementaryFiles = filesOrUpdater;
          }
        }, false, 'setComplementaryFiles'),

      // ═══════════════════════════════════════════════════════════════════════
      // SETTERS DE TEXTOS COLADOS
      // ═══════════════════════════════════════════════════════════════════════

      setPastedPeticaoTexts: (textsOrUpdater) =>
        set((state) => {
          if (typeof textsOrUpdater === 'function') {
            state.pastedPeticaoTexts = textsOrUpdater(state.pastedPeticaoTexts);
          } else {
            state.pastedPeticaoTexts = textsOrUpdater;
          }
        }, false, 'setPastedPeticaoTexts'),

      setPastedContestacaoTexts: (textsOrUpdater) =>
        set((state) => {
          if (typeof textsOrUpdater === 'function') {
            state.pastedContestacaoTexts = textsOrUpdater(state.pastedContestacaoTexts);
          } else {
            state.pastedContestacaoTexts = textsOrUpdater;
          }
        }, false, 'setPastedContestacaoTexts'),

      setPastedComplementaryTexts: (textsOrUpdater) =>
        set((state) => {
          if (typeof textsOrUpdater === 'function') {
            state.pastedComplementaryTexts = textsOrUpdater(state.pastedComplementaryTexts);
          } else {
            state.pastedComplementaryTexts = textsOrUpdater;
          }
        }, false, 'setPastedComplementaryTexts'),

      // ═══════════════════════════════════════════════════════════════════════
      // SETTERS DE METADADOS E UI
      // ═══════════════════════════════════════════════════════════════════════

      setAnalyzedDocuments: (docsOrUpdater) =>
        set((state) => {
          if (typeof docsOrUpdater === 'function') {
            state.analyzedDocuments = docsOrUpdater(state.analyzedDocuments);
          } else {
            state.analyzedDocuments = docsOrUpdater;
          }
        }, false, 'setAnalyzedDocuments'),

      setAnalyzing: (v) =>
        set((state) => {
          state.analyzing = v;
        }, false, 'setAnalyzing'),

      setAnalysisProgress: (p) =>
        set((state) => {
          state.analysisProgress = p;
        }, false, 'setAnalysisProgress'),

      setExtractingText: (v) =>
        set((state) => {
          state.extractingText = v;
        }, false, 'setExtractingText'),

      setShowPasteArea: (areasOrUpdater) =>
        set((state) => {
          if (typeof areasOrUpdater === 'function') {
            state.showPasteArea = areasOrUpdater(state.showPasteArea);
          } else {
            state.showPasteArea = areasOrUpdater;
          }
        }, false, 'setShowPasteArea'),

      setExtractedTexts: (textsOrUpdater) =>
        set((state) => {
          if (typeof textsOrUpdater === 'function') {
            state.extractedTexts = textsOrUpdater(state.extractedTexts);
          } else {
            state.extractedTexts = textsOrUpdater;
          }
        }, false, 'setExtractedTexts'),

      setShowTextPreview: (v) =>
        set((state) => {
          state.showTextPreview = v;
        }, false, 'setShowTextPreview'),

      // ═══════════════════════════════════════════════════════════════════════
      // SETTERS DE PROCESSAMENTO
      // ═══════════════════════════════════════════════════════════════════════

      setDocumentProcessingModes: (modesOrUpdater) =>
        set((state) => {
          if (typeof modesOrUpdater === 'function') {
            state.documentProcessingModes = modesOrUpdater(state.documentProcessingModes);
          } else {
            state.documentProcessingModes = modesOrUpdater;
          }
        }, false, 'setDocumentProcessingModes'),

      setPeticaoMode: (index, mode) =>
        set((state) => {
          const newPeticoes = [...(state.documentProcessingModes.peticoes || [])];
          newPeticoes[index] = mode;
          state.documentProcessingModes.peticoes = newPeticoes;
        }, false, 'setPeticaoMode'),

      setContestacaoMode: (index, mode) =>
        set((state) => {
          const newContestacoes = [...state.documentProcessingModes.contestacoes];
          newContestacoes[index] = mode;
          state.documentProcessingModes.contestacoes = newContestacoes;
        }, false, 'setContestacaoMode'),

      setComplementarMode: (index, mode) =>
        set((state) => {
          const newComplementares = [...state.documentProcessingModes.complementares];
          newComplementares[index] = mode;
          state.documentProcessingModes.complementares = newComplementares;
        }, false, 'setComplementarMode'),

      // ═══════════════════════════════════════════════════════════════════════
      // ACTIONS COMPLEXAS
      // ═══════════════════════════════════════════════════════════════════════

      handlePastedText: (text, type) => {
        if (!text.trim()) return false;

        set((state) => {
          if (type === 'peticao') {
            state.pastedPeticaoTexts.push({
              id: `pasted-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
              text,
              name: state.pastedPeticaoTexts.length === 0
                ? 'Petição Inicial'
                : `Emenda/Doc Autor ${state.pastedPeticaoTexts.length + 1}`
            });
            state.showPasteArea.peticao = false;
          } else if (type === 'contestacao') {
            state.pastedContestacaoTexts.push({
              id: `pasted-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
              text,
              name: `Contestação ${state.pastedContestacaoTexts.length + 1}`
            });
            state.showPasteArea.contestacao = false;
          } else if (type === 'complementary') {
            state.pastedComplementaryTexts.push({
              id: `pasted-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
              text,
              name: `Documento Complementar ${state.pastedComplementaryTexts.length + 1}`
            });
            state.showPasteArea.complementary = false;
          }
        }, false, 'handlePastedText');

        return true;
      },

      removePastedText: (type, index) =>
        set((state) => {
          if (index === null) return;
          if (type === 'peticao') {
            state.pastedPeticaoTexts = state.pastedPeticaoTexts.filter((_, i) => i !== index);
          } else if (type === 'contestacao') {
            state.pastedContestacaoTexts = state.pastedContestacaoTexts.filter((_, i) => i !== index);
          } else if (type === 'complementary') {
            state.pastedComplementaryTexts = state.pastedComplementaryTexts.filter((_, i) => i !== index);
          }
        }, false, 'removePastedText'),

      // ═══════════════════════════════════════════════════════════════════════
      // MÉTODOS DE PERSISTÊNCIA
      // ═══════════════════════════════════════════════════════════════════════

      serializeForPersistence: () => {
        const state = get();
        return {
          peticaoFiles: state.peticaoFiles,
          contestacaoFiles: state.contestacaoFiles,
          complementaryFiles: state.complementaryFiles,
          pastedPeticaoTexts: state.pastedPeticaoTexts,
          pastedContestacaoTexts: state.pastedContestacaoTexts,
          pastedComplementaryTexts: state.pastedComplementaryTexts,
          analyzedDocuments: state.analyzedDocuments,
          showPasteArea: state.showPasteArea,
          extractedTexts: state.extractedTexts,
          documentProcessingModes: state.documentProcessingModes
        };
      },

      restoreFromPersistence: (data) =>
        set((state) => {
          if (!data) return;

          if (data.peticaoFiles) state.peticaoFiles = data.peticaoFiles as UploadedFile[];
          if (data.contestacaoFiles) state.contestacaoFiles = data.contestacaoFiles as UploadedFile[];
          if (data.complementaryFiles) state.complementaryFiles = data.complementaryFiles as UploadedFile[];
          if (data.pastedPeticaoTexts) state.pastedPeticaoTexts = data.pastedPeticaoTexts as PastedText[];
          if (data.pastedContestacaoTexts) state.pastedContestacaoTexts = data.pastedContestacaoTexts as PastedText[];
          if (data.pastedComplementaryTexts) state.pastedComplementaryTexts = data.pastedComplementaryTexts as PastedText[];
          if (data.analyzedDocuments) state.analyzedDocuments = data.analyzedDocuments as AnalyzedDocuments;
          if (data.showPasteArea) state.showPasteArea = data.showPasteArea as Record<string, boolean>;
          if (data.extractedTexts) state.extractedTexts = data.extractedTexts as ExtractedTexts;
          if (data.documentProcessingModes) state.documentProcessingModes = data.documentProcessingModes as DocumentProcessingModes;
        }, false, 'restoreFromPersistence'),

      clearAll: () =>
        set((state) => {
          state.peticaoFiles = [];
          state.contestacaoFiles = [];
          state.complementaryFiles = [];
          state.pastedPeticaoTexts = [];
          state.pastedContestacaoTexts = [];
          state.pastedComplementaryTexts = [];
          state.analyzedDocuments = { ...INITIAL_ANALYZED_DOCUMENTS };
          state.analyzing = false;
          state.analysisProgress = '';
          state.extractingText = false;
          state.showPasteArea = { ...INITIAL_PASTE_AREA };
          state.extractedTexts = { ...INITIAL_EXTRACTED_TEXTS };
          state.showTextPreview = false;
          state.documentProcessingModes = { ...INITIAL_PROCESSING_MODES };
        }, false, 'clearAll'),
    })),
    { name: 'DocumentsStore' }
  )
);

// ═══════════════════════════════════════════════════════════════════════════════
// SELETORES OTIMIZADOS
// ═══════════════════════════════════════════════════════════════════════════════

/** Seleciona arquivos de petição */
export const selectPeticaoFiles = (state: DocumentsStoreState) => state.peticaoFiles;

/** Seleciona arquivos de contestação */
export const selectContestacaoFiles = (state: DocumentsStoreState) => state.contestacaoFiles;

/** Seleciona arquivos complementares */
export const selectComplementaryFiles = (state: DocumentsStoreState) => state.complementaryFiles;

/** Seleciona documentos analisados */
export const selectAnalyzedDocuments = (state: DocumentsStoreState) => state.analyzedDocuments;

/** Seleciona modos de processamento */
export const selectDocumentProcessingModes = (state: DocumentsStoreState) => state.documentProcessingModes;

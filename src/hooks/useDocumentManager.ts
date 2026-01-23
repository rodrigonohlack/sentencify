/**
 * @file useDocumentManager.ts
 * @description Hook wrapper para gerenciamento de documentos (petições, contestações, complementares)
 * @version 1.38.40
 *
 * FASE 3 Etapa 3.1: Thin wrapper sobre useDocumentsStore.
 * Estado delegado ao store Zustand. Hook mantém apenas handlers com I/O (IndexedDB).
 */

import React from 'react';
import { savePdfToIndexedDB, removePdfFromIndexedDB } from './useLocalStorage';
import { useDocumentsStore } from '../stores/useDocumentsStore';
import type {
  UploadedFile,
  PastedText,
  ProcessingMode,
  ExtractedTexts,
  AnalyzedDocuments,
  DocumentProcessingModes
} from '../types';

/**
 * Interface de retorno do useDocumentManager
 */
export interface UseDocumentManagerReturn {
  // Arquivos (3)
  peticaoFiles: UploadedFile[];
  contestacaoFiles: UploadedFile[];
  complementaryFiles: UploadedFile[];

  // Textos Colados (3)
  pastedPeticaoTexts: PastedText[];
  pastedContestacaoTexts: PastedText[];
  pastedComplementaryTexts: PastedText[];

  // Metadados (1)
  analyzedDocuments: AnalyzedDocuments;

  // UI/Progresso (6)
  analyzing: boolean;
  analysisProgress: string;
  extractingText: boolean;
  showPasteArea: Record<string, boolean>;
  extractedTexts: ExtractedTexts;
  showTextPreview: boolean;

  // v1.12.18: Modos de processamento por documento
  documentProcessingModes: DocumentProcessingModes;

  // Setters Arquivos (3)
  setPeticaoFiles: (files: UploadedFile[] | ((prev: UploadedFile[]) => UploadedFile[])) => void;
  setContestacaoFiles: (files: UploadedFile[] | ((prev: UploadedFile[]) => UploadedFile[])) => void;
  setComplementaryFiles: (files: UploadedFile[] | ((prev: UploadedFile[]) => UploadedFile[])) => void;

  // Setters Textos Colados (3)
  setPastedPeticaoTexts: (texts: PastedText[] | ((prev: PastedText[]) => PastedText[])) => void;
  setPastedContestacaoTexts: (texts: PastedText[] | ((prev: PastedText[]) => PastedText[])) => void;
  setPastedComplementaryTexts: (texts: PastedText[] | ((prev: PastedText[]) => PastedText[])) => void;

  // Setters Metadados (1)
  setAnalyzedDocuments: (docs: AnalyzedDocuments | ((prev: AnalyzedDocuments) => AnalyzedDocuments)) => void;

  // Setters UI/Progresso (6)
  setAnalyzing: (v: boolean) => void;
  setAnalysisProgress: (p: string) => void;
  setExtractingText: (v: boolean) => void;
  setShowPasteArea: (areas: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)) => void;
  setExtractedTexts: (texts: ExtractedTexts | ((prev: ExtractedTexts) => ExtractedTexts)) => void;
  setShowTextPreview: (v: boolean) => void;

  // v1.12.18: Setters de modos de processamento
  setDocumentProcessingModes: (modes: DocumentProcessingModes | ((prev: DocumentProcessingModes) => DocumentProcessingModes)) => void;
  setPeticaoMode: (index: number, mode: ProcessingMode) => void;
  setContestacaoMode: (index: number, mode: ProcessingMode) => void;
  setComplementarMode: (index: number, mode: ProcessingMode) => void;

  // Handlers (6)
  handlePastedText: (text: string, type: string, setError?: ((msg: string) => void) | null) => void;
  removePastedText: (type: string, index: number | null) => void;
  removePeticaoFile: (index: number) => Promise<void>;
  handleUploadPeticao: (files: FileList | File[]) => Promise<void>;
  handleUploadContestacao: (files: FileList | File[]) => Promise<void>;
  handleUploadComplementary: (files: FileList | File[]) => Promise<void>;

  // Métodos de Persistência (3)
  serializeForPersistence: () => Record<string, unknown>;
  restoreFromPersistence: (data: Record<string, unknown> | null) => void;
  clearAll: () => Promise<void>;
}

/**
 * Hook para gerenciamento de documentos
 * Thin wrapper sobre useDocumentsStore + handlers com I/O (IndexedDB)
 *
 * @param clearPdfCache - Função opcional para limpar cache de PDFs
 * @returns Estados, setters, handlers e métodos de persistência
 */
const useDocumentManager = (clearPdfCache?: () => void): UseDocumentManagerReturn => {
  // ═══════════════════════════════════════════════════════════════════════════
  // SELETORES DO STORE
  // ═══════════════════════════════════════════════════════════════════════════

  // Estados
  const peticaoFiles = useDocumentsStore((s) => s.peticaoFiles);
  const contestacaoFiles = useDocumentsStore((s) => s.contestacaoFiles);
  const complementaryFiles = useDocumentsStore((s) => s.complementaryFiles);
  const pastedPeticaoTexts = useDocumentsStore((s) => s.pastedPeticaoTexts);
  const pastedContestacaoTexts = useDocumentsStore((s) => s.pastedContestacaoTexts);
  const pastedComplementaryTexts = useDocumentsStore((s) => s.pastedComplementaryTexts);
  const analyzedDocuments = useDocumentsStore((s) => s.analyzedDocuments);
  const analyzing = useDocumentsStore((s) => s.analyzing);
  const analysisProgress = useDocumentsStore((s) => s.analysisProgress);
  const extractingText = useDocumentsStore((s) => s.extractingText);
  const showPasteArea = useDocumentsStore((s) => s.showPasteArea);
  const extractedTexts = useDocumentsStore((s) => s.extractedTexts);
  const showTextPreview = useDocumentsStore((s) => s.showTextPreview);
  const documentProcessingModes = useDocumentsStore((s) => s.documentProcessingModes);

  // Setters
  const setPeticaoFiles = useDocumentsStore((s) => s.setPeticaoFiles);
  const setContestacaoFiles = useDocumentsStore((s) => s.setContestacaoFiles);
  const setComplementaryFiles = useDocumentsStore((s) => s.setComplementaryFiles);
  const setPastedPeticaoTexts = useDocumentsStore((s) => s.setPastedPeticaoTexts);
  const setPastedContestacaoTexts = useDocumentsStore((s) => s.setPastedContestacaoTexts);
  const setPastedComplementaryTexts = useDocumentsStore((s) => s.setPastedComplementaryTexts);
  const setAnalyzedDocuments = useDocumentsStore((s) => s.setAnalyzedDocuments);
  const setAnalyzing = useDocumentsStore((s) => s.setAnalyzing);
  const setAnalysisProgress = useDocumentsStore((s) => s.setAnalysisProgress);
  const setExtractingText = useDocumentsStore((s) => s.setExtractingText);
  const setShowPasteArea = useDocumentsStore((s) => s.setShowPasteArea);
  const setExtractedTexts = useDocumentsStore((s) => s.setExtractedTexts);
  const setShowTextPreview = useDocumentsStore((s) => s.setShowTextPreview);
  const setDocumentProcessingModes = useDocumentsStore((s) => s.setDocumentProcessingModes);
  const setPeticaoMode = useDocumentsStore((s) => s.setPeticaoMode);
  const setContestacaoMode = useDocumentsStore((s) => s.setContestacaoMode);
  const setComplementarMode = useDocumentsStore((s) => s.setComplementarMode);

  // Actions do store
  const storeHandlePastedText = useDocumentsStore((s) => s.handlePastedText);
  const storeRemovePastedText = useDocumentsStore((s) => s.removePastedText);
  const storeClearAll = useDocumentsStore((s) => s.clearAll);
  const storeSerialize = useDocumentsStore((s) => s.serializeForPersistence);
  const storeRestore = useDocumentsStore((s) => s.restoreFromPersistence);

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS COM I/O (IndexedDB)
  // ═══════════════════════════════════════════════════════════════════════════

  const toUploadFilesArray = (value: FileList | File[] | null) =>
    Array.isArray(value) ? value : Array.from(value || []);

  const handlePastedText = React.useCallback((text: string, type: string, setError: ((msg: string) => void) | null = null) => {
    if (!text.trim()) {
      if (setError) setError('O texto colado está vazio');
      return;
    }
    storeHandlePastedText(text, type);
    if (setError) setError('');
  }, [storeHandlePastedText]);

  const removePastedText = React.useCallback((type: string, index: number | null = null) => {
    storeRemovePastedText(type, index);
  }, [storeRemovePastedText]);

  const removePeticaoFile = React.useCallback(async (index: number) => {
    const fileToRemove = peticaoFiles[index];
    if (fileToRemove?.id) {
      try {
        await removePdfFromIndexedDB(`upload-peticao-${fileToRemove.id}`);
      } catch { /* ignore */ }
    }
    setPeticaoFiles(prev => prev.filter((_, i: number) => i !== index));
    setDocumentProcessingModes(prev => ({
      ...prev,
      peticoes: (prev.peticoes || []).filter((_, i: number) => i !== index)
    }));
  }, [peticaoFiles, setPeticaoFiles, setDocumentProcessingModes]);

  const handleUploadPeticao = React.useCallback(async (files: FileList | File[]) => {
    const filesArray = toUploadFilesArray(files);
    const pdfFiles = filesArray.filter(f => f.type === 'application/pdf');
    if (pdfFiles.length === 0) return;

    const filesWithIds = pdfFiles.map(file => ({
      file,
      id: crypto.randomUUID()
    }));

    setPeticaoFiles(prev => [...prev, ...filesWithIds]);

    for (const { file, id } of filesWithIds) {
      try {
        await savePdfToIndexedDB(`upload-peticao-${id}`, file, 'upload');
      } catch { /* ignore */ }
    }
  }, [setPeticaoFiles]);

  const handleUploadContestacao = React.useCallback(async (files: FileList | File[]) => {
    const filesArray = toUploadFilesArray(files);
    const pdfFiles = filesArray.filter(f => f.type === 'application/pdf');
    if (pdfFiles.length === 0) return;

    const filesWithIds = pdfFiles.map(file => ({
      file,
      id: crypto.randomUUID()
    }));

    setContestacaoFiles(prev => [...prev, ...filesWithIds]);

    for (const { file, id } of filesWithIds) {
      try {
        await savePdfToIndexedDB(`upload-contestacao-${id}`, file, 'upload');
      } catch { /* ignore */ }
    }
  }, [setContestacaoFiles]);

  const handleUploadComplementary = React.useCallback(async (files: FileList | File[]) => {
    const filesArray = toUploadFilesArray(files);
    const pdfFiles = filesArray.filter(f => f.type === 'application/pdf');
    if (pdfFiles.length === 0) return;

    const filesWithIds = pdfFiles.map(file => ({
      file,
      id: crypto.randomUUID()
    }));

    setComplementaryFiles(prev => [...prev, ...filesWithIds]);

    for (const { file, id } of filesWithIds) {
      try {
        await savePdfToIndexedDB(`upload-complementar-${id}`, file, 'upload');
      } catch { /* ignore */ }
    }
  }, [setComplementaryFiles]);

  // ═══════════════════════════════════════════════════════════════════════════
  // MÉTODOS DE PERSISTÊNCIA (wrappers com cleanup de IndexedDB)
  // ═══════════════════════════════════════════════════════════════════════════

  const clearAll = React.useCallback(async () => {
    // Limpar IndexedDB por ID antes de limpar estados
    for (const fileObj of peticaoFiles) {
      if (fileObj?.id) try { await removePdfFromIndexedDB(`upload-peticao-${fileObj.id}`); } catch {}
    }
    for (const fileObj of contestacaoFiles) {
      if (fileObj?.id) try { await removePdfFromIndexedDB(`upload-contestacao-${fileObj.id}`); } catch {}
    }
    for (const fileObj of complementaryFiles) {
      if (fileObj?.id) try { await removePdfFromIndexedDB(`upload-complementar-${fileObj.id}`); } catch {}
    }
    clearPdfCache?.();
    storeClearAll();
  }, [peticaoFiles, contestacaoFiles, complementaryFiles, clearPdfCache, storeClearAll]);

  // ═══════════════════════════════════════════════════════════════════════════
  // RETURN: API compatível com versão anterior
  // ═══════════════════════════════════════════════════════════════════════════

  return {
    // Arquivos (3)
    peticaoFiles,
    contestacaoFiles,
    complementaryFiles,

    // Textos Colados (3)
    pastedPeticaoTexts,
    pastedContestacaoTexts,
    pastedComplementaryTexts,

    // Metadados (1)
    analyzedDocuments,

    // UI/Progresso (6)
    analyzing,
    analysisProgress,
    extractingText,
    showPasteArea,
    extractedTexts,
    showTextPreview,

    // v1.12.18: Modos de processamento por documento
    documentProcessingModes,

    // Setters Arquivos (3)
    setPeticaoFiles,
    setContestacaoFiles,
    setComplementaryFiles,

    // Setters Textos Colados (3)
    setPastedPeticaoTexts,
    setPastedContestacaoTexts,
    setPastedComplementaryTexts,

    // Setters Metadados (1)
    setAnalyzedDocuments,

    // Setters UI/Progresso (6)
    setAnalyzing,
    setAnalysisProgress,
    setExtractingText,
    setShowPasteArea,
    setExtractedTexts,
    setShowTextPreview,

    // v1.12.18: Setters de modos de processamento
    setDocumentProcessingModes,
    setPeticaoMode,
    setContestacaoMode,
    setComplementarMode,

    // Handlers (6) com I/O
    handlePastedText,
    removePastedText,
    removePeticaoFile,
    handleUploadPeticao,
    handleUploadContestacao,
    handleUploadComplementary,

    // Métodos de Persistência (3)
    serializeForPersistence: storeSerialize,
    restoreFromPersistence: storeRestore,
    clearAll
  };
};

export { useDocumentManager };

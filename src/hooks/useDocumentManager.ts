/**
 * @file useDocumentManager.ts
 * @description Hook para gerenciamento de documentos (petições, contestações, complementares)
 * @version 1.36.76
 *
 * Extraído do App.tsx - Sistema de Análise de Documentos v1.2.7a
 * Gerencia arquivos PDF e textos colados para análise
 */

import React from 'react';
import { savePdfToIndexedDB, removePdfFromIndexedDB } from './useLocalStorage';
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
  setPeticaoFiles: React.Dispatch<React.SetStateAction<UploadedFile[]>>;
  setContestacaoFiles: React.Dispatch<React.SetStateAction<UploadedFile[]>>;
  setComplementaryFiles: React.Dispatch<React.SetStateAction<UploadedFile[]>>;

  // Setters Textos Colados (3)
  setPastedPeticaoTexts: React.Dispatch<React.SetStateAction<PastedText[]>>;
  setPastedContestacaoTexts: React.Dispatch<React.SetStateAction<PastedText[]>>;
  setPastedComplementaryTexts: React.Dispatch<React.SetStateAction<PastedText[]>>;

  // Setters Metadados (1)
  setAnalyzedDocuments: React.Dispatch<React.SetStateAction<AnalyzedDocuments>>;

  // Setters UI/Progresso (6)
  setAnalyzing: React.Dispatch<React.SetStateAction<boolean>>;
  setAnalysisProgress: React.Dispatch<React.SetStateAction<string>>;
  setExtractingText: React.Dispatch<React.SetStateAction<boolean>>;
  setShowPasteArea: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setExtractedTexts: React.Dispatch<React.SetStateAction<ExtractedTexts>>;
  setShowTextPreview: React.Dispatch<React.SetStateAction<boolean>>;

  // v1.12.18: Setters de modos de processamento
  setDocumentProcessingModes: React.Dispatch<React.SetStateAction<DocumentProcessingModes>>;
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
 * Gerencia PDFs e textos colados de petições, contestações e documentos complementares
 *
 * @param clearPdfCache - Função opcional para limpar cache de PDFs
 * @returns Estados, setters, handlers e métodos de persistência
 */
const useDocumentManager = (clearPdfCache?: () => void): UseDocumentManagerReturn => {
  // 📦 ESTADOS CORE (13 total)

  // Arquivos de Documentos (3)
  const [peticaoFiles, setPeticaoFiles] = React.useState<UploadedFile[]>([]);
  // Array de {file: File, id: string} dos PDFs da petição inicial e emendas

  const [contestacaoFiles, setContestacaoFiles] = React.useState<UploadedFile[]>([]);
  // Array de {file: File, id: string} dos PDFs de contestações

  const [complementaryFiles, setComplementaryFiles] = React.useState<UploadedFile[]>([]);
  // Array de File objects dos PDFs de documentos complementares

  // Textos Colados (Alternativa aos PDFs) (3)
  const [pastedPeticaoTexts, setPastedPeticaoTexts] = React.useState<PastedText[]>([]);
  // Array de {text: string, name: string} - petição e emendas coladas

  const [pastedContestacaoTexts, setPastedContestacaoTexts] = React.useState<PastedText[]>([]);
  // Array de {text: string, name: string} - contestações coladas

  const [pastedComplementaryTexts, setPastedComplementaryTexts] = React.useState<PastedText[]>([]);
  // Array de {text: string, name: string} - documentos complementares colados

  // Metadados de Documentos Processados (1)
  const [analyzedDocuments, setAnalyzedDocuments] = React.useState<AnalyzedDocuments>({
    peticoes: [],            // Array de base64 (PDFs não extraídos)
    peticoesText: [],        // Array de {text, name} (textos extraídos/colados)
    contestacoes: [],        // Array de base64 (PDFs não extraídos)
    contestacoesText: [],    // Array de {text, name} (textos extraídos/colados)
    complementares: [],      // Array de base64 (PDFs não extraídos)
    complementaresText: []   // Array de {text, name} (textos extraídos/colados)
  });
  // Objeto contendo documentos processados após análise

  // Estados de UI e Progresso (6)
  const [analyzing, setAnalyzing] = React.useState<boolean>(false);
  // Flag indicando se análise está em andamento

  const [analysisProgress, setAnalysisProgress] = React.useState<string>('');
  // Mensagem de progresso exibida durante análise (ex: "Extraindo texto da petição...")

  const [extractingText, setExtractingText] = React.useState<boolean>(false);
  // Flag indicando se extração de texto de PDF está em andamento

  const [showPasteArea, setShowPasteArea] = React.useState<Record<string, boolean>>({
    peticao: false,
    contestacao: false,
    complementary: false
  });
  // Controla visibilidade das áreas de colagem de texto para cada tipo de documento

  const [extractedTexts, setExtractedTexts] = React.useState<ExtractedTexts>({
    peticoes: [],
    contestacoes: [],
    complementares: []
  });
  // Cache de textos extraídos de PDFs (para não reprocessar)

  // 🆕 v1.12.18: Modo de processamento por documento (v1.12.22: removido OCRAD)
  // Cada documento pode ter seu próprio modo: 'pdf-puro' | 'pdfjs' | 'claude-vision'
  const [documentProcessingModes, setDocumentProcessingModes] = React.useState<DocumentProcessingModes>({
    peticoes: [],               // Array de modos, um por arquivo de petição
    contestacoes: [],           // Array de modos, um por arquivo
    complementares: []          // Array de modos, um por arquivo
  });

  const [showTextPreview, setShowTextPreview] = React.useState<boolean>(false);
  // Controla exibição de modal de preview de texto extraído

  // 🆕 v1.12.18: Helpers para definir modo de processamento por índice
  const setPeticaoMode = React.useCallback((index: number, mode: ProcessingMode) => {
    setDocumentProcessingModes(prev => {
      const newPeticoes = [...(prev.peticoes || [])];
      newPeticoes[index] = mode;
      return { ...prev, peticoes: newPeticoes };
    });
  }, []);

  const setContestacaoMode = React.useCallback((index: number, mode: ProcessingMode) => {
    setDocumentProcessingModes(prev => {
      const newContestacoes = [...prev.contestacoes];
      newContestacoes[index] = mode;
      return { ...prev, contestacoes: newContestacoes };
    });
  }, []);

  const setComplementarMode = React.useCallback((index: number, mode: ProcessingMode) => {
    setDocumentProcessingModes(prev => {
      const newComplementares = [...prev.complementares];
      newComplementares[index] = mode;
      return { ...prev, complementares: newComplementares };
    });
  }, []);

  // 🛠️ HANDLERS SIMPLES (5) - ETAPA 7b

  // Helper para garantir array (usado por handleUploadContestacao e handleUploadComplementary)
  const toUploadFilesArray = (value: FileList | File[] | null) => Array.isArray(value) ? value : Array.from(value || []);

  // Handler: Processa texto colado (petição, contestação ou complementar)
  const handlePastedText = React.useCallback((text: string, type: string, setError: ((msg: string) => void) | null = null) => {
    if (!text.trim()) {
      if (setError) setError('O texto colado está vazio');
      return;
    }

    if (type === 'peticao') {
      setPastedPeticaoTexts(prev => [...prev, {
        id: `pasted-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        text,
        name: prev.length === 0 ? 'Petição Inicial' : `Emenda/Doc Autor ${prev.length + 1}`
      }]);
      setShowPasteArea(prev => ({ ...prev, peticao: false }));
    } else if (type === 'contestacao') {
      setPastedContestacaoTexts(prev => [...prev, {
        id: `pasted-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        text,
        name: `Contestação ${prev.length + 1}`
      }]);
      setShowPasteArea(prev => ({ ...prev, contestacao: false }));
    } else if (type === 'complementary') {
      setPastedComplementaryTexts(prev => [...prev, {
        id: `pasted-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        text,
        name: `Documento Complementar ${prev.length + 1}`
      }]);
      setShowPasteArea(prev => ({ ...prev, complementary: false }));
    }

    if (setError) setError('');
  }, []); // 🚀 v1.8.1: Memoizado (3 textareas)

  // Handler: Remove texto colado
  const removePastedText = (type: string, index: number | null = null) => {
    if (type === 'peticao' && index !== null) {
      setPastedPeticaoTexts(prev => prev.filter((_, i: number) => i !== index));
    } else if (type === 'contestacao' && index !== null) {
      setPastedContestacaoTexts(prev => prev.filter((_, i: number) => i !== index));
    } else if (type === 'complementary' && index !== null) {
      setPastedComplementaryTexts(prev => prev.filter((_, i: number) => i !== index));
    }
  };

  // Handler: Remove arquivo de petição por índice (com limpeza IndexedDB)
  const removePeticaoFile = React.useCallback(async (index: number) => {
    const fileToRemove = peticaoFiles[index];
    if (fileToRemove?.id) {
      try {
        await removePdfFromIndexedDB(`upload-peticao-${fileToRemove.id}`);
      } catch (err) { /* ignore */ }
    }
    setPeticaoFiles(prev => prev.filter((_, i: number) => i !== index));
    setDocumentProcessingModes(prev => ({
      ...prev,
      peticoes: (prev.peticoes || []).filter((_, i: number) => i !== index)
    }));
  }, [peticaoFiles]);

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
      } catch (err) { /* ignore */ }
    }
  }, []);

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
      } catch (err) { /* ignore */ }
    }
  }, []);

  // Handler: Upload de complementares
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
      } catch (err) { /* ignore */ }
    }
  }, []);

  // 💾 MÉTODOS DE PERSISTÊNCIA (3) - ETAPA 7c

  // Serializa dados para persistência
  const serializeForPersistence = () => {
    return {
      // Arquivos (serão convertidos para base64 pelo useLocalStorage)
      peticaoFiles,
      contestacaoFiles,
      complementaryFiles,

      // Textos colados
      pastedPeticaoTexts,
      pastedContestacaoTexts,
      pastedComplementaryTexts,

      // Metadados processados
      analyzedDocuments,

      // Estados de UI (não precisa salvar analyzing/extractingText - temporários)
      showPasteArea,
      extractedTexts,

      // v1.12.18: Modos de processamento por documento
      documentProcessingModes

      // showTextPreview não precisa persistir (modal temporário)
    };
  };

  // Restaura dados do localStorage
  const restoreFromPersistence = (data: Record<string, unknown> | null) => {
    if (!data) return;

    // Restaurar arquivos (File objects reconstruídos pelo useLocalStorage)
    if (data.peticaoFiles) setPeticaoFiles(data.peticaoFiles as UploadedFile[]);
    if (data.contestacaoFiles) setContestacaoFiles(data.contestacaoFiles as UploadedFile[]);
    if (data.complementaryFiles) setComplementaryFiles(data.complementaryFiles as UploadedFile[]);

    // Restaurar textos colados
    if (data.pastedPeticaoTexts) setPastedPeticaoTexts(data.pastedPeticaoTexts as PastedText[]);
    if (data.pastedContestacaoTexts) setPastedContestacaoTexts(data.pastedContestacaoTexts as PastedText[]);
    if (data.pastedComplementaryTexts) setPastedComplementaryTexts(data.pastedComplementaryTexts as PastedText[]);

    // Restaurar metadados
    if (data.analyzedDocuments) setAnalyzedDocuments(data.analyzedDocuments as AnalyzedDocuments);

    // Restaurar estados de UI
    if (data.showPasteArea) setShowPasteArea(data.showPasteArea as Record<string, boolean>);
    if (data.extractedTexts) setExtractedTexts(data.extractedTexts as ExtractedTexts);

    // v1.12.18: Restaurar modos de processamento
    if (data.documentProcessingModes) setDocumentProcessingModes(data.documentProcessingModes as DocumentProcessingModes);
  };

  // Limpa TODOS os estados de documentos
  const clearAll = async () => {
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

    // Limpar arquivos
    setPeticaoFiles([]);
    setContestacaoFiles([]);
    setComplementaryFiles([]);

    // Limpar textos colados
    setPastedPeticaoTexts([]);
    setPastedContestacaoTexts([]);
    setPastedComplementaryTexts([]);

    // Limpar metadados
    setAnalyzedDocuments({
      peticoes: [],
      peticoesText: [],
      contestacoes: [],
      contestacoesText: [],
      complementares: [],
      complementaresText: []
    });

    // Limpar estados de UI/Progresso
    setAnalyzing(false);
    setAnalysisProgress('');
    setExtractingText(false);
    setShowPasteArea({
      peticao: false,
      contestacao: false,
      complementary: false
    });
    setExtractedTexts({
      peticoes: [],
      contestacoes: [],
      complementares: []
    });
    setShowTextPreview(false);

    // v1.12.18: Resetar modos de processamento
    setDocumentProcessingModes({
      peticoes: [],
      contestacoes: [],
      complementares: []
    });
  };

  // 🎯 RETURN: Estados, Setters, Handlers e Persistência
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

    // Handlers (5) - ETAPA 7b
    handlePastedText,
    removePastedText,
    removePeticaoFile,
    handleUploadPeticao,
    handleUploadContestacao,
    handleUploadComplementary,

    // Métodos de Persistência (3) - ETAPA 7c
    serializeForPersistence,
    restoreFromPersistence,
    clearAll
  };
};

export { useDocumentManager };

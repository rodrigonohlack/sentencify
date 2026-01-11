/**
 * @file useLocalStorage.ts
 * @description Hook para persistência de sessão e projeto (localStorage + IndexedDB)
 * @tier 0 (sem dependências de outros hooks do projeto, exceto cache helpers)
 * @extractedFrom App.tsx linhas 2452-3664
 * @usedBy App.tsx (autoSaveSession, restoreSession, exportProject, importProject, clearProject)
 */

import React from 'react';
import { APP_VERSION } from '../constants/app-version';
import { openFactsDB, FACTS_STORE_NAME } from './useFactsComparisonCache';
import { openReviewDB, REVIEW_STORE_NAME } from './useSentenceReviewCache';
import type {
  SessionState,
  RestoreSessionCallbacks,
  ProjectState,
  ImportedProject,
  ImportCallbacks,
  ImportProjectCallbacks,
  ClearProjectCallbacks,
  Proof,
  ProofFile,
  ProofText,
  ProofAnalysisResult,
  UploadedFile,
  ProcessingMode,
  FactsComparisonResult,
  FactsComparisonSource,
  ModalKey,
  TokenMetrics,
} from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// PDF INDEXEDDB HELPERS
// ═══════════════════════════════════════════════════════════════════════════

const PDF_DB_NAME = 'sentencify-pdfs';
const PDF_STORE_NAME = 'pdfs';
const PDF_DB_VERSION = 1;

const openPdfDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(PDF_DB_NAME, PDF_DB_VERSION);

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(PDF_STORE_NAME)) {
        // Store com chave 'id' (formato: 'upload-{index}' ou 'proof-{id}')
        db.createObjectStore(PDF_STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

// Tipo para registro de PDF no IndexedDB
interface PdfRecord {
  id: string;
  data: ArrayBuffer;
  mimeType: string;
  fileName: string;
  savedAt: number;
}

/**
 * Salva um PDF no IndexedDB
 */
export const savePdfToIndexedDB = async (id: string, file: File, type: string) => {
  try {
    // Converter File para ArrayBuffer ANTES de abrir transação
    // (evita TransactionInactiveError quando chamado em paralelo)
    const arrayBuffer = await file.arrayBuffer();

    const db = await openPdfDB();
    const transaction = db.transaction([PDF_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(PDF_STORE_NAME);

    const pdfRecord = {
      id,
      type,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      data: arrayBuffer,
      savedAt: Date.now()
    };

    await new Promise<void>((resolve, reject) => {
      const request = store.put(pdfRecord);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    db.close();
  } catch (error) {
    throw error;
  }
};

/**
 * Recupera um PDF do IndexedDB
 */
export const getPdfFromIndexedDB = async (id: string) => {
  try {
    const db = await openPdfDB();
    const transaction = db.transaction([PDF_STORE_NAME], 'readonly');
    const store = transaction.objectStore(PDF_STORE_NAME);

    const record = await new Promise<PdfRecord | undefined>((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result as PdfRecord | undefined);
      request.onerror = () => reject(request.error);
    });

    db.close();

    if (!record) {
      return null;
    }

    // Reconstruir File a partir do ArrayBuffer
    const blob = new Blob([record.data], { type: record.mimeType });
    const file = new File([blob], record.fileName, {
      type: record.mimeType,
      lastModified: record.savedAt
    });

    return file;
  } catch (error) {
    return null;
  }
};

/**
 * Remove um PDF específico do IndexedDB
 */
export const removePdfFromIndexedDB = async (id: string) => {
  try {
    const db = await openPdfDB();
    const transaction = db.transaction([PDF_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(PDF_STORE_NAME);

    await new Promise<void>((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    db.close();
  } catch (error) {
    throw error;
  }
};

/**
 * Remove todos os PDFs do IndexedDB
 */
export const clearAllPdfsFromIndexedDB = async () => {
  try {
    const db = await openPdfDB();
    const transaction = db.transaction([PDF_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(PDF_STORE_NAME);

    await new Promise<void>((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    db.close();
  } catch (error) {
    throw error;
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

export interface UseLocalStorageReturn {
  // Estados
  sessionLastSaved: string | null;
  showAutoSaveIndicator: boolean;

  // Setters
  setSessionLastSaved: React.Dispatch<React.SetStateAction<string | null>>;
  setShowAutoSaveIndicator: React.Dispatch<React.SetStateAction<boolean>>;

  // Funções Auxiliares
  fileToBase64: (file: File) => Promise<string>;
  base64ToFile: (base64: string, fileName: string, mimeType?: string) => File;
  clearPdfCache: () => void;

  // Funções de Verificação
  checkSavedSession: (openModal: (modalName: ModalKey) => void) => void;

  // Funções de Persistência
  autoSaveSession: (allStates: SessionState, setError: (err: string | null) => void, immediate?: boolean) => Promise<void>;
  restoreSession: (callbacks: RestoreSessionCallbacks) => Promise<void>;
  exportProject: (allStates: ProjectState, setError: (err: string | null) => void) => Promise<void>;
  importProject: (event: React.ChangeEvent<HTMLInputElement>, callbacks: ImportCallbacks & ImportProjectCallbacks, autoSaveSessionFn: (states: SessionState, setError: (err: string | null) => void, immediate: boolean) => Promise<void>) => Promise<void>;
  importProjectFromJson: (project: ImportedProject, callbacks: ImportCallbacks, autoSaveSessionFn: (states: SessionState, setError: (err: string | null) => void, immediate: boolean) => Promise<void>) => Promise<void>;
  clearProject: (callbacks: ClearProjectCallbacks) => void;
  buildProjectJson: (allStates: ProjectState) => Promise<object>;
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook para persistência de sessão e projeto
 * Gerencia: sessão (localStorage), PDFs (IndexedDB), export/import de projeto
 */
export function useLocalStorage(): UseLocalStorageReturn {
  // Estados de Persistência
  const [sessionLastSaved, setSessionLastSaved] = React.useState<string | null>(null);
  const [showAutoSaveIndicator, setShowAutoSaveIndicator] = React.useState(false);

  // OTIMIZAÇÃO v1.4.1: Cache de conversões PDF→base64
  // Evita re-converter mesmos PDFs (key: fileName-size-lastModified)
  // v1.20.2: Adicionado limite LRU para evitar memory leak
  const PDF_CACHE_MAX_SIZE = 5; // Máximo 5 PDFs em cache (~50MB worst case)
  const pdfCacheRef = React.useRef<Map<string, string>>(new Map());
  const pdfCacheOrderRef = React.useRef<string[]>([]); // Track insertion order para LRU

  // Adiciona ao cache com eviction LRU
  const addToPdfCache = (key: string, value: string) => {
    if (pdfCacheRef.current.has(key)) {
      pdfCacheRef.current.set(key, value);
      return;
    }
    while (pdfCacheRef.current.size >= PDF_CACHE_MAX_SIZE) {
      const oldestKey = pdfCacheOrderRef.current.shift();
      if (oldestKey) pdfCacheRef.current.delete(oldestKey);
    }
    pdfCacheRef.current.set(key, value);
    pdfCacheOrderRef.current.push(key);
  };

  // Limpa cache completamente (usado no reset de sessão)
  const clearPdfCache = () => {
    pdfCacheRef.current.clear();
    pdfCacheOrderRef.current = [];
  };

  // Funções Auxiliares

  // Converte File para base64 (com cache LRU)
  const fileToBase64 = React.useCallback((file: File): Promise<string> => {
    // Criar chave única baseada em propriedades do arquivo
    const cacheKey = `${file.name}-${file.size}-${file.lastModified}`;

    // Verificar cache primeiro
    if (pdfCacheRef.current.has(cacheKey)) {
      return Promise.resolve(pdfCacheRef.current.get(cacheKey)!);
    }

    // Se não está no cache, converter e cachear
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (!result || typeof result !== 'string') {
          return reject(new Error('Falha ao ler arquivo: resultado vazio'));
        }
        const parts = result.split(',');
        const base64 = parts[1] || '';
        if (!base64) {
          return reject(new Error('Falha ao converter arquivo para base64'));
        }
        addToPdfCache(cacheKey, base64);
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }, []);

  // Converte base64 para File
  const base64ToFile = React.useCallback((base64: string, fileName: string, mimeType = 'application/pdf') => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });
    const file = new File([blob], fileName, { type: mimeType });
    return file;
  }, []);

  // Verifica se existe sessão salva
  const checkSavedSession = React.useCallback((openModal: (modalName: ModalKey) => void) => {
    try {
      const saved = localStorage.getItem('sentencifySession');
      if (saved) {
        const session = JSON.parse(saved);
        setSessionLastSaved(session.savedAt);
        openModal('restoreSession');
      }
    } catch (err) {
      // Ignore parsing errors
    }
  }, []);

  const autoSaveSession = React.useCallback(async (allStates: SessionState, setError: (err: string | null) => void, immediate = false) => {
    try {
      const {
        processoNumero,
        pastedPeticaoTexts,
        pastedContestacaoTexts,
        pastedComplementaryTexts,
        extractedTopics,
        selectedTopics,
        partesProcesso,
        activeTab,
        analyzedDocuments,
        proofFiles,
        proofTexts,
        proofUsePdfMode,
        extractedProofTexts,
        proofExtractionFailed,
        proofTopicLinks,
        proofAnalysisResults,
        proofConclusions,
        extractedTexts,
        documentProcessingModes,
        peticaoFiles,
        contestacaoFiles,
        complementaryFiles,
        tokenMetrics // v1.20.3: Contador de tokens persistente
      } = allStates;

      const proofFilesSerializable = proofFiles.map((proof: Proof) => ({
        id: proof.id,
        name: proof.name,
        type: proof.type,
        size: proof.size,
        uploadDate: proof.uploadDate
        // Sem fileData - PDFs estão no IndexedDB
      }));

      const session = {
        version: APP_VERSION,
        savedAt: new Date().toISOString(),
        processoNumero,
        pastedPeticaoTexts,
        pastedContestacaoTexts,
        pastedComplementaryTexts,
        extractedTopics,
        selectedTopics,
        partesProcesso,
        activeTab,
        // v1.20.1: NÃO persistir base64 de PDFs (economia de memória ~200-500MB)
        // Base64 é regenerado quando necessário via fileToBase64()
        analyzedDocuments: {
          peticoes: [], // NÃO salvar base64 (pode ser 50MB+ por PDF)
          peticoesText: analyzedDocuments?.peticoesText || [],
          contestacoes: [], // NÃO salvar base64
          contestacoesText: analyzedDocuments?.contestacoesText || [],
          complementares: [], // NÃO salvar base64
          complementaresText: analyzedDocuments?.complementaresText || [],
        },
        extractedTexts: extractedTexts || { peticoes: [], contestacoes: [], complementares: [] },
        documentProcessingModes: documentProcessingModes || { peticoes: [], contestacoes: [], complementares: [] },
        // IDs dos arquivos para restauração do IndexedDB
        peticaoFileIds: (peticaoFiles || []).map((f: { id?: string }) => f.id).filter(Boolean),
        contestacaoFileIds: (contestacaoFiles || []).map((f: { id?: string }) => f.id).filter(Boolean),
        complementaryFileIds: (complementaryFiles || []).map((f: { id?: string }) => f.id).filter(Boolean),
        // Dados de provas (apenas metadados, PDFs no IndexedDB)
        proofFiles: proofFilesSerializable,
        proofTexts: proofTexts,
        proofUsePdfMode: proofUsePdfMode,
        extractedProofTexts: extractedProofTexts,
        proofExtractionFailed: proofExtractionFailed,
        proofTopicLinks: proofTopicLinks,
        proofAnalysisResults: proofAnalysisResults,
        proofConclusions: proofConclusions,
        proofSendFullContent: allStates.proofSendFullContent || {},
        // v1.20.3: Contador de tokens persistente
        tokenMetrics: tokenMetrics || { totalInput: 0, totalOutput: 0, totalCacheRead: 0, totalCacheCreation: 0, requestCount: 0, lastUpdated: null }
      };

      if (immediate) {
        try {
          const serialized = JSON.stringify(session);
          localStorage.setItem('sentencifySession', serialized);
          setSessionLastSaved(session.savedAt);
          setShowAutoSaveIndicator(true);
          setTimeout(() => setShowAutoSaveIndicator(false), 3000);
        } catch (storageErr) {
          if ((storageErr as Error).name === 'QuotaExceededError') {
            setError('LocalStorage cheio. Considere limpar dados antigos.');
            setTimeout(() => setError(''), 8000);
          }
        }
      } else {
        // OTIMIZAÇÃO v1.4.1: Save assíncrono não-bloqueante usando requestIdleCallback
        const saveAsync = () => {
          const scheduleTask = window.requestIdleCallback || ((cb: IdleRequestCallback) => setTimeout(cb, 0));
          scheduleTask(() => {
            try {
              const serialized = JSON.stringify(session);
              localStorage.setItem('sentencifySession', serialized);
              setSessionLastSaved(session.savedAt);
              setShowAutoSaveIndicator(true);
              setTimeout(() => setShowAutoSaveIndicator(false), 3000);
            } catch (storageErr) {
              if ((storageErr as Error).name === 'QuotaExceededError') {
                setError('LocalStorage cheio. Considere limpar dados antigos.');
                setTimeout(() => setError(''), 8000);
              }
            }
          });
        };
        saveAsync();
      }
    } catch (err) {
      // Ignore errors silently
    }
  }, [setShowAutoSaveIndicator, setSessionLastSaved]);

  // Restaura sessão (PDFs do IndexedDB, metadados do localStorage)
  const restoreSession = React.useCallback(async (callbacks: RestoreSessionCallbacks) => {
    try {
      const saved = localStorage.getItem('sentencifySession');
      if (!saved) return;

      const session = JSON.parse(saved);

      const {
        setPastedPeticaoTexts,
        setPastedContestacaoTexts,
        setPastedComplementaryTexts,
        setExtractedTopics,
        setSelectedTopics,
        setPartesProcesso,
        setAnalyzedDocuments,
        setProofFiles,
        setProofTexts,
        setProofUsePdfMode,
        setExtractedProofTexts,
        setProofExtractionFailed,
        setProofTopicLinks,
        setProofAnalysisResults,
        setProofConclusions,
        setProofSendFullContent,
        setActiveTab,
        closeModal,
        setError,
        setProcessoNumero,
        setPeticaoFiles,
        setContestacaoFiles,
        setComplementaryFiles,
        setExtractedTexts,
        setDocumentProcessingModes,
        setTokenMetrics // v1.20.3: Contador de tokens persistente
      } = callbacks;

      // v1.21: Migração de sessões antigas (peticao singular → peticoes array)
      if (session.pastedPeticaoText && !session.pastedPeticaoTexts) {
        session.pastedPeticaoTexts = [{ text: session.pastedPeticaoText, name: 'Petição Inicial' }];
      }
      if (session.analyzedDocuments?.peticao && !session.analyzedDocuments?.peticoes) {
        session.analyzedDocuments.peticoes = session.analyzedDocuments.peticaoType === 'pdf'
          ? [session.analyzedDocuments.peticao] : [];
        session.analyzedDocuments.peticoesText = session.analyzedDocuments.peticaoType === 'text'
          ? [{ text: session.analyzedDocuments.peticao, name: 'Petição Inicial' }] : [];
      }

      setProcessoNumero(session.processoNumero || '');
      setPastedPeticaoTexts(session.pastedPeticaoTexts || []);
      setPastedContestacaoTexts(session.pastedContestacaoTexts || []);
      setPastedComplementaryTexts(session.pastedComplementaryTexts || []);
      setExtractedTopics(session.extractedTopics || []);
      setSelectedTopics(session.selectedTopics || []);
      setPartesProcesso(session.partesProcesso || { reclamante: '', reclamadas: [] });
      setAnalyzedDocuments(session.analyzedDocuments || {
        peticoes: [],
        peticoesText: [],
        contestacoes: [],
        contestacoesText: [],
        complementares: [],
        complementaresText: []
      });

      if (setExtractedTexts) {
        setExtractedTexts(session.extractedTexts || { peticoes: [], contestacoes: [], complementares: [] });
      }

      if (setDocumentProcessingModes) {
        // Migrar modos legados (ex: 'gemini-vision') para 'pdfjs'
        const validModes = ['pdfjs', 'tesseract', 'pdf-puro', 'claude-vision'];
        const migrateMode = (mode: ProcessingMode) => validModes.includes(mode) ? mode : 'pdfjs';
        const migrateModes = (modes: ProcessingMode[]) => (modes || []).map(migrateMode);
        const rawModes = session.documentProcessingModes || { peticoes: [], contestacoes: [], complementares: [] };
        setDocumentProcessingModes({
          peticoes: migrateModes(rawModes.peticoes),
          contestacoes: migrateModes(rawModes.contestacoes),
          complementares: migrateModes(rawModes.complementares)
        });
      }

      // Restaurar PDFs usando UUIDs (novo formato) ou migrar do formato antigo (índices)
      if (setPeticaoFiles) {
        const peticaoPdfs = [];
        if (session.peticaoFileIds?.length > 0) {
          // Novo formato: usar UUIDs salvos
          for (const id of session.peticaoFileIds) {
            const pPdf = await getPdfFromIndexedDB(`upload-peticao-${id}`);
            if (pPdf) peticaoPdfs.push({ file: pPdf, id });
          }
        } else {
          // Migração: formato antigo com índices → novo com UUIDs
          const oldPdf = await getPdfFromIndexedDB('upload-peticao');
          if (oldPdf) {
            const newId = crypto.randomUUID();
            peticaoPdfs.push({ file: oldPdf, id: newId });
            await savePdfToIndexedDB(`upload-peticao-${newId}`, oldPdf, 'upload');
            await removePdfFromIndexedDB('upload-peticao');
          }
          for (let i = 0; i < 20; i++) {
            const pPdf = await getPdfFromIndexedDB(`upload-peticao-${i}`);
            if (pPdf) {
              const newId = crypto.randomUUID();
              peticaoPdfs.push({ file: pPdf, id: newId });
              await savePdfToIndexedDB(`upload-peticao-${newId}`, pPdf, 'upload');
              await removePdfFromIndexedDB(`upload-peticao-${i}`);
            } else if (i > 0) break;
          }
        }
        if (peticaoPdfs.length > 0) setPeticaoFiles(peticaoPdfs);
      }
      if (setContestacaoFiles) {
        const contestFiles = [];
        if (session.contestacaoFileIds?.length > 0) {
          for (const id of session.contestacaoFileIds) {
            const cPdf = await getPdfFromIndexedDB(`upload-contestacao-${id}`);
            if (cPdf) contestFiles.push({ file: cPdf, id });
          }
        } else {
          for (let i = 0; i < 20; i++) {
            const cPdf = await getPdfFromIndexedDB(`upload-contestacao-${i}`);
            if (cPdf) {
              const newId = crypto.randomUUID();
              contestFiles.push({ file: cPdf, id: newId });
              await savePdfToIndexedDB(`upload-contestacao-${newId}`, cPdf, 'upload');
              await removePdfFromIndexedDB(`upload-contestacao-${i}`);
            } else break;
          }
        }
        if (contestFiles.length > 0) setContestacaoFiles(contestFiles);
      }
      if (setComplementaryFiles) {
        const compFiles = [];
        if (session.complementaryFileIds?.length > 0) {
          for (const id of session.complementaryFileIds) {
            const cpPdf = await getPdfFromIndexedDB(`upload-complementar-${id}`);
            if (cpPdf) compFiles.push({ file: cpPdf, id });
          }
        } else {
          for (let i = 0; i < 20; i++) {
            const cpPdf = await getPdfFromIndexedDB(`upload-complementar-${i}`);
            if (cpPdf) {
              const newId = crypto.randomUUID();
              compFiles.push({ file: cpPdf, id: newId });
              await savePdfToIndexedDB(`upload-complementar-${newId}`, cpPdf, 'upload');
              await removePdfFromIndexedDB(`upload-complementar-${i}`);
            } else break;
          }
        }
        if (compFiles.length > 0) setComplementaryFiles(compFiles);
      }

      if (session.proofFiles && Array.isArray(session.proofFiles)) {
        const results = await Promise.allSettled(
          session.proofFiles.map(async (proof: Proof) => {
            const pdfFile = await getPdfFromIndexedDB(`proof-${proof.id}`);
            return {
              id: proof.id,
              file: pdfFile,
              name: proof.name,
              type: proof.type,
              size: proof.size,
              uploadDate: proof.uploadDate
            };
          })
        );
        const restoredProofFiles = results
          .filter(r => r.status === 'fulfilled')
          .map(r => r.value);
        setProofFiles(restoredProofFiles);
      } else {
        setProofFiles([]);
      }

      setProofTexts(session.proofTexts || []);
      setProofUsePdfMode(session.proofUsePdfMode || {});
      setExtractedProofTexts(session.extractedProofTexts || {});
      setProofExtractionFailed(session.proofExtractionFailed || {});
      setProofTopicLinks(session.proofTopicLinks || {});
      setProofAnalysisResults(session.proofAnalysisResults || {});
      setProofConclusions(session.proofConclusions || {});
      setProofSendFullContent(session.proofSendFullContent || {});  // v1.19.2

      // Ir para a aba upload se houver documentos, senão manter a aba salva
      const hasDocuments = (session.analyzedDocuments?.peticoes?.length > 0) ||
                          (session.analyzedDocuments?.peticoesText?.length > 0) ||
                          (session.pastedPeticaoTexts?.length > 0) ||
                          (session.analyzedDocuments?.contestacoes?.length > 0) ||
                          (session.pastedContestacaoTexts?.length > 0);

      setActiveTab(hasDocuments ? 'upload' : (session.activeTab || 'topics'));

      // v1.20.3: Restaurar contador de tokens
      if (setTokenMetrics && session.tokenMetrics) {
        setTokenMetrics(session.tokenMetrics);
      }

      closeModal('restoreSession');

      // Sessão restaurada silenciosamente
    } catch (err) {
      console.error('[useLocalStorage] Erro ao restaurar sessão:', (err as Error).message);
    }
  }, [setSessionLastSaved]);

  // v1.35.40: Constrói JSON do projeto para salvar no Google Drive (sem download)
  // v1.35.41: Movido para antes de exportProject (usado por ambos)
  const buildProjectJson = React.useCallback(async (allStates: ProjectState) => {
    const {
      processoNumero,
      pastedPeticaoTexts,
      pastedContestacaoTexts,
      pastedComplementaryTexts,
      extractedTopics,
      selectedTopics,
      partesProcesso,
      aiSettings,
      analyzedDocuments,
      proofFiles,
      proofTexts,
      proofUsePdfMode,
      extractedProofTexts,
      proofExtractionFailed,
      proofTopicLinks,
      proofAnalysisResults,
      proofConclusions,
      peticaoFiles,
      contestacaoFiles,
      complementaryFiles,
      extractedTexts,
      documentProcessingModes,
      tokenMetrics
    } = allStates;

    const uploadPdfs: {
      peticoes: Array<{ name: string; id: string; fileData: string }>;
      contestacoes: Array<{ name: string; id: string; fileData: string }>;
      complementares: Array<{ name: string; id: string; fileData: string }>;
    } = {
      peticoes: [],
      contestacoes: [],
      complementares: []
    };

    if (peticaoFiles && peticaoFiles.length > 0) {
      uploadPdfs.peticoes = await Promise.all(
        peticaoFiles.map(async (f: UploadedFile) => {
          const fileObj = f.file;
          return { name: fileObj.name, id: f.id, fileData: await fileToBase64(fileObj) };
        })
      );
    }

    if (contestacaoFiles && contestacaoFiles.length > 0) {
      uploadPdfs.contestacoes = await Promise.all(
        contestacaoFiles.map(async (f: UploadedFile) => {
          const fileObj = f.file;
          return { name: fileObj.name, id: f.id, fileData: await fileToBase64(fileObj) };
        })
      );
    }

    if (complementaryFiles && complementaryFiles.length > 0) {
      uploadPdfs.complementares = await Promise.all(
        complementaryFiles.map(async (f: UploadedFile) => {
          const fileObj = f.file;
          return { name: fileObj.name, id: f.id, fileData: await fileToBase64(fileObj) };
        })
      );
    }

    const proofFilesSerializable = await Promise.all(
      (proofFiles || []).map(async (proof: Proof) => {
        if (!proof.file) {
          return {
            id: proof.id,
            name: proof.name,
            type: proof.type,
            size: proof.size,
            uploadDate: proof.uploadDate,
            fileData: null
          };
        }
        const base64 = await fileToBase64(proof.file);
        return {
          id: proof.id,
          name: proof.name,
          type: proof.type,
          size: proof.size,
          uploadDate: proof.uploadDate,
          fileData: base64
        };
      })
    );

    // v1.35.74: Não exportar apiKeys por segurança
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { apiKeys: _excluded, ...aiSettingsWithoutKeys } = aiSettings;

    // v1.36.12: Exportar cache de confronto de fatos
    let factsComparison: Record<string, FactsComparisonResult> = {};
    try {
      const db = await openFactsDB();
      const store = db.transaction(FACTS_STORE_NAME).objectStore(FACTS_STORE_NAME);
      const entries = await new Promise<Array<{ topicTitle: string; source: string; result: FactsComparisonResult }>>((resolve) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });
      db.close();
      for (const entry of entries) {
        factsComparison[`${entry.topicTitle}_${entry.source}`] = entry.result;
      }
    } catch (e) {
      console.warn('[Export] Erro ao exportar factsComparison:', e);
    }

    // v1.36.57: Exportar cache de revisão de sentença
    let sentenceReviewCacheExport: Record<string, string> = {};
    try {
      const db = await openReviewDB();
      const store = db.transaction(REVIEW_STORE_NAME).objectStore(REVIEW_STORE_NAME);
      const entries = await new Promise<Array<{ scope: string; result: string }>>((resolve) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });
      db.close();
      for (const entry of entries) {
        sentenceReviewCacheExport[entry.scope] = entry.result;
      }
    } catch (e) {
      console.warn('[Export] Erro ao exportar sentenceReviewCache:', e);
    }

    return {
      version: APP_VERSION,
      exportedAt: new Date().toISOString(),
      processoNumero,
      pastedPeticaoTexts,
      pastedContestacaoTexts,
      pastedComplementaryTexts,
      extractedTopics,
      selectedTopics,
      partesProcesso,
      aiSettings: aiSettingsWithoutKeys,
      analyzedDocuments,
      extractedTexts: extractedTexts || { peticoes: [], contestacoes: [], complementares: [] },
      uploadPdfs,
      proofFiles: proofFilesSerializable,
      proofTexts: proofTexts || {},
      proofUsePdfMode: proofUsePdfMode || {},
      extractedProofTexts: extractedProofTexts || {},
      proofExtractionFailed: proofExtractionFailed || {},
      proofTopicLinks: proofTopicLinks || {},
      proofAnalysisResults: proofAnalysisResults || {},
      proofConclusions: proofConclusions || {},
      proofSendFullContent: allStates.proofSendFullContent || {},
      documentProcessingModes: documentProcessingModes || { peticao: 'pdfjs', contestacoes: [], complementares: [] },
      tokenMetrics: tokenMetrics || { totalInput: 0, totalOutput: 0, totalCacheRead: 0, totalCacheCreation: 0, requestCount: 0, lastUpdated: null },
      factsComparison,  // v1.36.12
      sentenceReviewCache: sentenceReviewCacheExport  // v1.36.57
    };
  }, [fileToBase64]);

  // Exporta projeto completo em JSON (PDFs em base64)
  // v1.35.41: Refatorado para usar buildProjectJson (elimina duplicação)
  const exportProject = React.useCallback(async (allStates: ProjectState, setError: (err: string | null) => void) => {
    try {
      const project = await buildProjectJson(allStates);
      const dataStr = JSON.stringify(project, null, 2);

      // Copiar para clipboard
      await navigator.clipboard.writeText(dataStr);

      // Download do arquivo
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      // Gerar nome do arquivo baseado no número do processo (se disponível)
      const projectTyped = project as { processoNumero?: string };
      const processoPart = projectTyped.processoNumero
        ? projectTyped.processoNumero.replace(/\s+/g, '-').replace(/\//g, '-')
        : '';
      const datePart = new Date().toISOString().split('T')[0];
      a.download = processoPart
        ? `sentencify-${processoPart}-${datePart}.json`
        : `sentencify-projeto-${datePart}.json`;

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Erro ao exportar projeto: ' + (err as Error).message);
    }
  }, [buildProjectJson]);

  // v1.35.40: Importa projeto a partir de JSON (para Google Drive)
  // v1.35.41: Adicionadas migrações de projetos antigos (formato singular)
  const importProjectFromJson = React.useCallback(async (project: ImportedProject, callbacks: ImportCallbacks, autoSaveSessionFn: (states: SessionState, setError: (err: string | null) => void, immediate: boolean) => Promise<void>) => {
    if (!project || !project.version) {
      throw new Error('Arquivo inválido ou incompatível.');
    }

    const {
      setPastedPeticaoTexts,
      setPastedContestacaoTexts,
      setPastedComplementaryTexts,
      setExtractedTopics,
      setSelectedTopics,
      setPartesProcesso,
      setAnalyzedDocuments,
      setProofFiles,
      setProofTexts,
      setProofUsePdfMode,
      setExtractedProofTexts,
      setProofExtractionFailed,
      setProofTopicLinks,
      setProofAnalysisResults,
      setProofConclusions,
      setProofSendFullContent,
      setAiSettings,
      setActiveTab,
      setError,
      setProcessoNumero,
      setPeticaoFiles,
      setContestacaoFiles,
      setComplementaryFiles,
      setExtractedTexts,
      setDocumentProcessingModes,
      setTokenMetrics
    } = callbacks;

    try {
      await clearAllPdfsFromIndexedDB();
    } catch (err) {
      // Ignore
    }

    // Migração de projetos antigos (formato singular → plural)
    if (project.pastedPeticaoText && !project.pastedPeticaoTexts) {
      project.pastedPeticaoTexts = [{ id: crypto.randomUUID(), text: project.pastedPeticaoText, name: 'Petição Inicial' }];
    }
    if (project.analyzedDocuments?.peticao && !project.analyzedDocuments?.peticoes) {
      project.analyzedDocuments.peticoes = project.analyzedDocuments.peticaoType === 'pdf'
        ? [project.analyzedDocuments.peticao as string] : [];
      project.analyzedDocuments.peticoesText = project.analyzedDocuments.peticaoType === 'text'
        ? [{ id: crypto.randomUUID(), text: project.analyzedDocuments.peticao as string, name: 'Petição Inicial' }] : [];
    }

    // Restaurar dados
    setProcessoNumero(project.processoNumero || '');
    setPastedPeticaoTexts(project.pastedPeticaoTexts || []);
    setPastedContestacaoTexts(project.pastedContestacaoTexts || []);
    setPastedComplementaryTexts(project.pastedComplementaryTexts || []);
    setExtractedTopics(project.extractedTopics || []);
    setSelectedTopics(project.selectedTopics || []);
    setPartesProcesso(project.partesProcesso || { reclamante: '', reclamadas: [] });
    setAnalyzedDocuments(project.analyzedDocuments || {
      peticoes: [], peticoesText: [], contestacoes: [], contestacoesText: [],
      complementares: [], complementaresText: []
    });

    if (setExtractedTexts) {
      setExtractedTexts(project.extractedTexts || { peticoes: [], contestacoes: [], complementares: [] });
    }

    if (setDocumentProcessingModes) {
      const validModes = ['pdfjs', 'tesseract', 'pdf-puro', 'claude-vision'];
      const migrateMode = (mode: ProcessingMode) => validModes.includes(mode) ? mode : 'pdfjs';
      const migrateModes = (modes: ProcessingMode[]) => (modes || []).map(migrateMode);
      const rawModes = project.documentProcessingModes || { peticoes: [], contestacoes: [], complementares: [] };
      setDocumentProcessingModes({
        peticoes: migrateModes(rawModes.peticoes),
        contestacoes: migrateModes(rawModes.contestacoes),
        complementares: migrateModes(rawModes.complementares)
      });
    }

    // Restaurar PDFs
    if (project.uploadPdfs) {
      // Petições (novo formato com UUID)
      if (project.uploadPdfs.peticoes && setPeticaoFiles) {
        const petFiles = [];
        for (const pData of project.uploadPdfs.peticoes) {
          const pFile = base64ToFile(pData.fileData, pData.name, 'application/pdf');
          const id = pData.id || crypto.randomUUID();
          petFiles.push({ file: pFile, id });
          await savePdfToIndexedDB(`upload-peticao-${id}`, pFile, 'upload');
        }
        setPeticaoFiles(petFiles);
      }
      // Petição (formato antigo singular - migração)
      else if (project.uploadPdfs.peticao && setPeticaoFiles) {
        const pData = project.uploadPdfs.peticao;
        const pFile = base64ToFile(pData.fileData, pData.name, 'application/pdf');
        const id = crypto.randomUUID();
        setPeticaoFiles([{ file: pFile, id }]);
        await savePdfToIndexedDB(`upload-peticao-${id}`, pFile, 'upload');
      }
      if (project.uploadPdfs.contestacoes && setContestacaoFiles) {
        const contestFiles = [];
        for (const cData of project.uploadPdfs.contestacoes) {
          const cFile = base64ToFile(cData.fileData, cData.name, 'application/pdf');
          const id = cData.id || crypto.randomUUID();
          contestFiles.push({ file: cFile, id });
          await savePdfToIndexedDB(`upload-contestacao-${id}`, cFile, 'upload');
        }
        setContestacaoFiles(contestFiles);
      }
      if (project.uploadPdfs.complementares && setComplementaryFiles) {
        const compFiles = [];
        for (const cpData of project.uploadPdfs.complementares) {
          const cpFile = base64ToFile(cpData.fileData, cpData.name, 'application/pdf');
          const id = cpData.id || crypto.randomUUID();
          compFiles.push({ file: cpFile, id });
          await savePdfToIndexedDB(`upload-complementar-${id}`, cpFile, 'upload');
        }
        setComplementaryFiles(compFiles);
      }
    }

    // Restaurar provas
    let restoredProofFiles: Proof[] = [];
    if (project.proofFiles && Array.isArray(project.proofFiles)) {
      restoredProofFiles = await Promise.all(
        project.proofFiles.map(async (proof: Proof): Promise<Proof> => {
          if (proof.type === 'text') {
            // ProofText - return as-is
            return proof;
          }
          if (!proof.fileData) {
            // ProofFile without data - mark as placeholder
            return { id: proof.id, name: proof.name, type: 'pdf' as const, size: proof.size, uploadDate: proof.uploadDate, isPlaceholder: true };
          }
          const byteCharacters = atob(proof.fileData);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: 'application/pdf' });
          const restoredFile = new File([blob], proof.name, { type: 'application/pdf' });
          await savePdfToIndexedDB(`proof-${proof.id}`, restoredFile, 'proof');
          return { id: proof.id, file: restoredFile, name: proof.name, type: 'pdf' as const, size: proof.size, uploadDate: proof.uploadDate };
        })
      );
      // Filtrar apenas PDFs para setProofFiles (textos vão em setProofTexts)
      setProofFiles(restoredProofFiles.filter((p): p is ProofFile => p.type === 'pdf'));
    } else {
      setProofFiles([]);
    }

    setProofTexts((project.proofTexts as unknown as ProofText[]) || []);
    setProofUsePdfMode(project.proofUsePdfMode || {});
    setExtractedProofTexts(project.extractedProofTexts || {});
    setProofExtractionFailed(project.proofExtractionFailed || {});
    setProofTopicLinks(project.proofTopicLinks || {});
    setProofAnalysisResults((project.proofAnalysisResults as unknown as Record<string, ProofAnalysisResult>) || {});
    setProofConclusions(project.proofConclusions || {});
    setProofSendFullContent(project.proofSendFullContent || {});

    if (setTokenMetrics && project.tokenMetrics) {
      setTokenMetrics(project.tokenMetrics);
    }

    // v1.35.74: Migrar projetos antigos + preservar apiKeys do localStorage
    if (project.aiSettings) {
      // Defaults para campos novos de IA Local
      const iaLocalDefaults = {
        semanticSearchEnabled: false,
        semanticThreshold: 50,
        jurisSemanticEnabled: false,
        jurisSemanticThreshold: 50,
        modelSemanticEnabled: false,
        modelSemanticThreshold: 40,
        useLocalAIForSuggestions: false,
        useLocalAIForJuris: false
      };

      // Obter apiKeys ATUAIS do localStorage (nunca sobrescrever!)
      let currentApiKeys = { claude: '', gemini: '', openai: '', grok: '' };
      try {
        const saved = localStorage.getItem('sentencify-ai-settings');
        if (saved) {
          const parsed = JSON.parse(saved);
          currentApiKeys = { ...currentApiKeys, ...parsed.apiKeys };
        }
      } catch (e) { /* ignore */ }

      // Merge: defaults → projeto → apiKeys atuais (nunca sobrescreve chaves)
      const mergedAiSettings = {
        ...iaLocalDefaults,
        ...project.aiSettings,
        apiKeys: currentApiKeys  // Sempre preserva as chaves do usuário
      };
      setAiSettings(mergedAiSettings);
    }

    setActiveTab('upload');

    if (autoSaveSessionFn) {
      const allStates: SessionState = {
        processoNumero: project.processoNumero || '',
        pastedPeticaoTexts: project.pastedPeticaoTexts || [],
        pastedContestacaoTexts: project.pastedContestacaoTexts || [],
        pastedComplementaryTexts: project.pastedComplementaryTexts || [],
        extractedTopics: project.extractedTopics || [],
        selectedTopics: project.selectedTopics || [],
        partesProcesso: project.partesProcesso || { reclamante: '', reclamadas: [] },
        activeTab: 'upload' as const,
        analyzedDocuments: project.analyzedDocuments || { peticoes: [], peticoesText: [], contestacoes: [], contestacoesText: [], complementares: [], complementaresText: [] },
        extractedTexts: project.extractedTexts || { peticoes: [], contestacoes: [], complementares: [] },
        proofFiles: restoredProofFiles || [],
        proofTexts: (project.proofTexts as unknown as ProofText[]) || [],
        proofUsePdfMode: project.proofUsePdfMode || {},
        extractedProofTexts: project.extractedProofTexts || {},
        proofExtractionFailed: project.proofExtractionFailed || {},
        proofTopicLinks: project.proofTopicLinks || {},
        proofAnalysisResults: (project.proofAnalysisResults as unknown as Record<string, { type: string; result: string }>) || {},
        proofConclusions: project.proofConclusions || {},
        proofSendFullContent: project.proofSendFullContent || {},
        documentProcessingModes: project.documentProcessingModes || { peticoes: ['pdfjs'], contestacoes: [], complementares: [] },
        tokenMetrics: project.tokenMetrics || { totalInput: 0, totalOutput: 0, totalCacheRead: 0, totalCacheCreation: 0, requestCount: 0, lastUpdated: null },
        peticaoFiles: [],
        contestacaoFiles: [],
        complementaryFiles: []
      };
      autoSaveSessionFn(allStates, (err) => err && setError(err), true);
    }

    // v1.36.12: Importar cache de confronto de fatos
    if (project.factsComparison && typeof project.factsComparison === 'object') {
      try {
        const db = await openFactsDB();
        const tx = db.transaction(FACTS_STORE_NAME, 'readwrite');
        const store = tx.objectStore(FACTS_STORE_NAME);

        for (const [key, result] of Object.entries(project.factsComparison as Record<string, FactsComparisonResult>)) {
          const lastUnderscore = key.lastIndexOf('_');
          if (lastUnderscore === -1) continue;

          const topicTitle = key.substring(0, lastUnderscore);
          const source = key.substring(lastUnderscore + 1) as FactsComparisonSource;

          if (topicTitle && (source === 'mini-relatorio' || source === 'documentos-completos')) {
            store.add({
              topicTitle,
              source,
              result,
              createdAt: Date.now()
            });
          }
        }

        await new Promise<void>((resolve) => {
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        });
        db.close();
      } catch (e) {
        console.warn('[Import] Erro ao importar factsComparison:', e);
      }
    }

    // v1.36.57: Importar cache de revisão de sentença
    if (project.sentenceReviewCache && typeof project.sentenceReviewCache === 'object') {
      try {
        const db = await openReviewDB();
        const tx = db.transaction(REVIEW_STORE_NAME, 'readwrite');
        const store = tx.objectStore(REVIEW_STORE_NAME);

        for (const [scope, result] of Object.entries(project.sentenceReviewCache)) {
          if (scope === 'decisionOnly' || scope === 'decisionWithDocs') {
            store.add({
              scope,
              result,
              createdAt: Date.now()
            });
          }
        }

        await new Promise<void>((resolve) => {
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        });
        db.close();
      } catch (e) {
        console.warn('[Import] Erro ao importar sentenceReviewCache:', e);
      }
    }
  }, [base64ToFile]);

  // Importa projeto de arquivo JSON
  // v1.35.41: Refatorado para usar importProjectFromJson (elimina duplicação)
  const importProject = React.useCallback(async (event: React.ChangeEvent<HTMLInputElement>, callbacks: ImportCallbacks & ImportProjectCallbacks, autoSaveSessionFn: (states: SessionState, setError: (err: string | null) => void, immediate: boolean) => Promise<void>) => {
    const files = event.target.files;
    if (!files || !files[0]) return;
    const file = files[0];

    try {
      const text = await file.text();
      const project = JSON.parse(text);

      if (!project.version) {
        callbacks.setError('Arquivo inválido ou incompatível.');
        event.target.value = '';
        return;
      }

      await importProjectFromJson(project, callbacks, autoSaveSessionFn);

      // Limpar input para permitir reimportar o mesmo arquivo
      event.target.value = '';
    } catch (err) {
      callbacks.setError('Erro ao importar projeto: ' + (err as Error).message);
      event.target.value = '';
    }
  }, [importProjectFromJson]);

  // Limpa todos os dados do projeto
  const clearProject = React.useCallback((callbacks: ClearProjectCallbacks) => {
    try {
      const {
        closeModal,
        setPastedPeticaoTexts,
        setPastedContestacaoTexts,
        setPastedComplementaryTexts,
        setExtractedTopics,
        setSelectedTopics,
        setPartesProcesso,
        setAnalyzedDocuments,
        setPeticaoFiles,
        setContestacaoFiles,
        setComplementaryFiles,
        setActiveTab,
        setProofFiles,
        setProofTexts,
        setProofUsePdfMode,
        setExtractedProofTexts,
        setProofExtractionFailed,
        setProofTopicLinks,
        setProofAnalysisResults,
        setProofConclusions,
        setProofToDelete,
        setProofToLink,
        setProofToAnalyze,
        clearAnalyzingProofs,
        setShowProofPanel,
        setNewProofTextData,
        setError,
        setProcessoNumero,
        setTokenMetrics // v1.20.3: Contador de tokens persistente
      } = callbacks;

      // Resetar estados de sessão e modais
      setSessionLastSaved(null);
      closeModal('restoreSession');
      closeModal('clearProject');

      // Limpar estados de documentos
      setProcessoNumero('');
      setPastedPeticaoTexts([]);
      setPastedContestacaoTexts([]);
      setPastedComplementaryTexts([]);
      setExtractedTopics([]);
      setSelectedTopics([]);
      setPartesProcesso({ reclamante: '', reclamadas: [] });
      setAnalyzedDocuments({
        peticoes: [],
        peticoesText: [],
        contestacoes: [],
        contestacoesText: [],
        complementares: [],
        complementaresText: []
      });
      setPeticaoFiles?.([]);
      setContestacaoFiles?.([]);
      setComplementaryFiles?.([]);
      setActiveTab('upload');

      // Limpar estados do sistema de provas - Dados (v1.2.0)
      setProofFiles([]);
      setProofTexts([]);
      setProofUsePdfMode({});
      setExtractedProofTexts({});
      setProofExtractionFailed({});
      setProofTopicLinks({});
      setProofAnalysisResults({});
      setProofConclusions({});

      // Limpar estados do sistema de provas - UI/Modais (v1.2.0)
      setProofToDelete(null);
      setProofToLink(null);
      setProofToAnalyze(null);
      clearAnalyzingProofs();
      setShowProofPanel(true);
      closeModal('addProofText');
      setNewProofTextData({ name: '', text: '' });
      closeModal('deleteProof');
      closeModal('linkProof');
      closeModal('proofAnalysis');

      // Remover dados salvos do localStorage (deve ser feito após resetar estados)
      localStorage.removeItem('sentencifySession');

      // v1.12.14: Limpar todos os PDFs do IndexedDB
      clearAllPdfsFromIndexedDB().catch(() => {
        // Ignore errors
      });

      // v1.20.2: Limpar cache de PDFs em memória para liberar RAM
      clearPdfCache();

      // v1.20.3: Resetar contador de tokens
      if (setTokenMetrics) {
        setTokenMetrics({
          totalInput: 0,
          totalOutput: 0,
          totalCacheRead: 0,
          totalCacheCreation: 0,
          requestCount: 0,
          lastUpdated: null
        });
      }

    } catch (err) {
      console.error('[useLocalStorage] Erro ao limpar sessão:', (err as Error).message);
    }
  }, [setSessionLastSaved]);

  // Return
  return {
    // Estados
    sessionLastSaved,
    showAutoSaveIndicator,

    // Setters
    setSessionLastSaved,
    setShowAutoSaveIndicator,

    // Funções Auxiliares
    fileToBase64,
    base64ToFile,
    clearPdfCache,

    // Funções de Verificação
    checkSavedSession,

    // Funções de Persistência (ETAPA 4/5)
    autoSaveSession,
    restoreSession,
    exportProject,
    importProject,
    importProjectFromJson,  // v1.35.40: Para carregar do Google Drive
    clearProject,
    buildProjectJson  // v1.35.40: Para salvar no Google Drive
  };
}

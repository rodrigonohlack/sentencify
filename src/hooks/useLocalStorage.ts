/**
 * @file useLocalStorage.ts
 * @description Hook para persistência de sessão e projeto (localStorage + IndexedDB)
 * @version 1.38.52
 * @tier 0 (sem dependências de outros hooks do projeto, exceto cache helpers)
 * @extractedFrom App.tsx linhas 2452-3664
 * @usedBy App.tsx (autoSaveSession, restoreSession, exportProject, importProject, clearProject)
 *
 * v1.38.52: PDF helpers extraídos para usePdfStorage.ts
 * v1.38.16: Export/import de chatHistory inclui includeMainDocs (suporta formato legado)
 */

import React from 'react';
import { APP_VERSION } from '../constants/app-version';
import { openFactsDB, FACTS_STORE_NAME } from './useFactsComparisonCache';
import { openReviewDB, REVIEW_STORE_NAME } from './useSentenceReviewCache';
import { openChatDB, CHAT_STORE_NAME, type ChatExportEntry } from './useChatHistoryCache';
import { openVersionDB, VERSION_STORE } from './useFieldVersioning';
import { stripInlineColors } from '../utils/color-stripper';
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
  ChatMessage,
  ChatHistoryCacheEntry,
} from '../types';
import { useAIStore } from '../stores/useAIStore';

// ═══════════════════════════════════════════════════════════════════════════
// PDF INDEXEDDB HELPERS (v1.38.52: Extracted to usePdfStorage.ts)
// Re-export for backwards compatibility
// ═══════════════════════════════════════════════════════════════════════════

import {
  savePdfToIndexedDB,
  getPdfFromIndexedDB,
  removePdfFromIndexedDB,
  clearAllPdfsFromIndexedDB,
  saveProofTextToIndexedDB,
  getProofTextFromIndexedDB,
  clearAllProofTextsFromIndexedDB,
  saveUploadTextToIndexedDB,
  getUploadTextFromIndexedDB,
  clearAllUploadTextsFromIndexedDB,
  type UploadTextCategory,
} from './usePdfStorage';

// Re-export all PDF functions for backwards compatibility
export {
  savePdfToIndexedDB,
  getPdfFromIndexedDB,
  removePdfFromIndexedDB,
  clearAllPdfsFromIndexedDB,
} from './usePdfStorage';

export {
  getAttachmentIndexedDBKey,
  saveAttachmentToIndexedDB,
  getAttachmentFromIndexedDB,
  removeAttachmentFromIndexedDB,
  removeAllAttachmentsFromIndexedDB,
} from './usePdfStorage';

export {
  getProofTextIndexedDBKey,
  saveProofTextToIndexedDB,
  getProofTextFromIndexedDB,
  removeProofTextFromIndexedDB,
  clearAllProofTextsFromIndexedDB,
} from './usePdfStorage';

export {
  getUploadTextIndexedDBKey,
  saveUploadTextToIndexedDB,
  getUploadTextFromIndexedDB,
  getAllUploadTextsByCategoryFromIndexedDB,
  removeUploadTextFromIndexedDB,
  clearUploadTextsByCategoryFromIndexedDB,
  clearAllUploadTextsFromIndexedDB,
  type UploadTextCategory,
} from './usePdfStorage';

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
  // v1.40.20: Otimizado para evitar array intermediário (reduz ~50% memória por PDF)
  const base64ToFile = React.useCallback((base64: string, fileName: string, mimeType = 'application/pdf') => {
    const byteCharacters = atob(base64);
    // Criar Uint8Array diretamente sem array intermediário
    const byteArray = new Uint8Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteArray[i] = byteCharacters.charCodeAt(i);
    }
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

      // v1.40.17: Salvar proofTexts no IndexedDB para evitar estouro do localStorage
      const proofTextIds: string[] = [];
      for (const pt of (proofTexts || [])) {
        const idStr = String(pt.id);
        await saveProofTextToIndexedDB(idStr, pt.text, pt.name, pt.uploadDate);
        proofTextIds.push(idStr);
      }

      // v1.40.18: Salvar pastedTexts no IndexedDB para evitar estouro do localStorage
      // Nota: todos os textos já TÊM id garantido por handlePastedText, restoreSession ou importProjectFromJson
      const pastedPeticaoTextIds: string[] = [];
      for (const pt of (pastedPeticaoTexts || [])) {
        await saveUploadTextToIndexedDB('pasted-peticao' as UploadTextCategory, pt.id, pt.text, pt.name);
        pastedPeticaoTextIds.push(pt.id);
      }

      const pastedContestacaoTextIds: string[] = [];
      for (const pt of (pastedContestacaoTexts || [])) {
        await saveUploadTextToIndexedDB('pasted-contestacao' as UploadTextCategory, pt.id, pt.text, pt.name);
        pastedContestacaoTextIds.push(pt.id);
      }

      const pastedComplementaryTextIds: string[] = [];
      for (const pt of (pastedComplementaryTexts || [])) {
        await saveUploadTextToIndexedDB('pasted-complementar' as UploadTextCategory, pt.id, pt.text, pt.name);
        pastedComplementaryTextIds.push(pt.id);
      }

      // v1.40.18: Salvar analyzedDocuments texts no IndexedDB
      const analyzedPeticoesTextIds: string[] = [];
      for (const pt of (analyzedDocuments?.peticoesText || [])) {
        await saveUploadTextToIndexedDB('analyzed-peticao' as UploadTextCategory, pt.id, pt.text, pt.name);
        analyzedPeticoesTextIds.push(pt.id);
      }

      const analyzedContestacoesTextIds: string[] = [];
      for (const pt of (analyzedDocuments?.contestacoesText || [])) {
        await saveUploadTextToIndexedDB('analyzed-contestacao' as UploadTextCategory, pt.id, pt.text, pt.name);
        analyzedContestacoesTextIds.push(pt.id);
      }

      const analyzedComplementaresTextIds: string[] = [];
      for (const pt of (analyzedDocuments?.complementaresText || [])) {
        await saveUploadTextToIndexedDB('analyzed-complementar' as UploadTextCategory, pt.id, pt.text, pt.name);
        analyzedComplementaresTextIds.push(pt.id);
      }

      // v1.40.18: Salvar extractedTexts no IndexedDB
      const extractedPeticoesIds: string[] = [];
      for (let i = 0; i < (extractedTexts?.peticoes || []).length; i++) {
        const et = extractedTexts.peticoes[i];
        const idStr = String(i);
        await saveUploadTextToIndexedDB('extracted-peticao' as UploadTextCategory, idStr, et.text, et.name || `Petição ${i + 1}`);
        extractedPeticoesIds.push(idStr);
      }

      const extractedContestacoesIds: string[] = [];
      for (let i = 0; i < (extractedTexts?.contestacoes || []).length; i++) {
        const et = extractedTexts.contestacoes[i];
        const idStr = String(i);
        await saveUploadTextToIndexedDB('extracted-contestacao' as UploadTextCategory, idStr, et.text, et.name || `Contestação ${i + 1}`);
        extractedContestacoesIds.push(idStr);
      }

      const extractedComplementaresIds: string[] = [];
      for (let i = 0; i < (extractedTexts?.complementares || []).length; i++) {
        const et = extractedTexts.complementares[i];
        const idStr = String(i);
        await saveUploadTextToIndexedDB('extracted-complementar' as UploadTextCategory, idStr, et.text, et.name || `Complementar ${i + 1}`);
        extractedComplementaresIds.push(idStr);
      }

      // v1.40.19: Salvar extractedProofTexts no IndexedDB para evitar estouro do localStorage
      const extractedProofTextIds: string[] = [];
      for (const [proofId, text] of Object.entries(extractedProofTexts || {})) {
        await saveUploadTextToIndexedDB('extracted-proof' as UploadTextCategory, proofId, text, `Prova ${proofId}`);
        extractedProofTextIds.push(proofId);
      }

      const session = {
        version: APP_VERSION,
        savedAt: new Date().toISOString(),
        processoNumero,
        // v1.40.18: Textos no IndexedDB, apenas IDs no localStorage
        pastedPeticaoTextIds,
        pastedContestacaoTextIds,
        pastedComplementaryTextIds,
        extractedTopics,
        selectedTopics,
        partesProcesso,
        activeTab,
        // v1.20.1: NÃO persistir base64 de PDFs (economia de memória ~200-500MB)
        // Base64 é regenerado quando necessário via fileToBase64()
        // v1.40.18: Textos também no IndexedDB, apenas IDs aqui
        analyzedDocuments: {
          peticoes: [], // NÃO salvar base64 (pode ser 50MB+ por PDF)
          peticoesTextIds: analyzedPeticoesTextIds,
          contestacoes: [], // NÃO salvar base64
          contestacoesTextIds: analyzedContestacoesTextIds,
          complementares: [], // NÃO salvar base64
          complementaresTextIds: analyzedComplementaresTextIds,
        },
        extractedTextIds: {
          peticoes: extractedPeticoesIds,
          contestacoes: extractedContestacoesIds,
          complementares: extractedComplementaresIds,
        },
        documentProcessingModes: documentProcessingModes || { peticoes: [], contestacoes: [], complementares: [] },
        // IDs dos arquivos para restauração do IndexedDB
        peticaoFileIds: (peticaoFiles || []).map((f: { id?: string }) => f.id).filter(Boolean),
        contestacaoFileIds: (contestacaoFiles || []).map((f: { id?: string }) => f.id).filter(Boolean),
        complementaryFileIds: (complementaryFiles || []).map((f: { id?: string }) => f.id).filter(Boolean),
        // Dados de provas (apenas metadados, PDFs no IndexedDB)
        proofFiles: proofFilesSerializable,
        // v1.40.17: proofTexts agora no IndexedDB, apenas IDs no localStorage
        proofTextIds: proofTextIds,
        proofUsePdfMode: proofUsePdfMode,
        // v1.40.19: extractedProofTexts agora no IndexedDB, apenas IDs no localStorage
        extractedProofTextIds: extractedProofTextIds,
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
        setError: _setError,
        setProcessoNumero,
        setPeticaoFiles,
        setContestacaoFiles,
        setComplementaryFiles,
        setExtractedTexts,
        setDocumentProcessingModes,
        setTokenMetrics // v1.20.3: Contador de tokens persistente
      } = callbacks;

      // v1.21: Migração de sessões antigas (peticao singular → peticoes array)
      if (session.pastedPeticaoText && !session.pastedPeticaoTexts && !session.pastedPeticaoTextIds) {
        session.pastedPeticaoTexts = [{ text: session.pastedPeticaoText, name: 'Petição Inicial' }];
      }
      if (session.analyzedDocuments?.peticao && !session.analyzedDocuments?.peticoes) {
        session.analyzedDocuments.peticoes = session.analyzedDocuments.peticaoType === 'pdf'
          ? [session.analyzedDocuments.peticao] : [];
        session.analyzedDocuments.peticoesText = session.analyzedDocuments.peticaoType === 'text'
          ? [{ text: session.analyzedDocuments.peticao, name: 'Petição Inicial' }] : [];
      }

      setProcessoNumero(session.processoNumero || '');

      // v1.40.18: Carregar pastedTexts do IndexedDB (com migração de formato antigo)
      // Petições
      if (session.pastedPeticaoTextIds && Array.isArray(session.pastedPeticaoTextIds)) {
        const restoredTexts: Array<{ id: string; text: string; name: string }> = [];
        for (const id of session.pastedPeticaoTextIds) {
          const pt = await getUploadTextFromIndexedDB('pasted-peticao' as UploadTextCategory, id);
          if (pt) restoredTexts.push(pt);
        }
        setPastedPeticaoTexts(restoredTexts);
      } else if (session.pastedPeticaoTexts && Array.isArray(session.pastedPeticaoTexts)) {
        // Formato antigo: migrar textos para IndexedDB
        const legacyTexts = session.pastedPeticaoTexts as Array<{ id?: string; text: string; name: string }>;
        const migratedTexts: Array<{ id: string; text: string; name: string }> = [];
        for (const pt of legacyTexts) {
          const id = pt.id || crypto.randomUUID();
          await saveUploadTextToIndexedDB('pasted-peticao' as UploadTextCategory, id, pt.text, pt.name);
          migratedTexts.push({ id, text: pt.text, name: pt.name });
        }
        setPastedPeticaoTexts(migratedTexts);
      } else {
        setPastedPeticaoTexts([]);
      }

      // Contestações
      if (session.pastedContestacaoTextIds && Array.isArray(session.pastedContestacaoTextIds)) {
        const restoredTexts: Array<{ id: string; text: string; name: string }> = [];
        for (const id of session.pastedContestacaoTextIds) {
          const pt = await getUploadTextFromIndexedDB('pasted-contestacao' as UploadTextCategory, id);
          if (pt) restoredTexts.push(pt);
        }
        setPastedContestacaoTexts(restoredTexts);
      } else if (session.pastedContestacaoTexts && Array.isArray(session.pastedContestacaoTexts)) {
        const legacyTexts = session.pastedContestacaoTexts as Array<{ id?: string; text: string; name: string }>;
        const migratedTexts: Array<{ id: string; text: string; name: string }> = [];
        for (const pt of legacyTexts) {
          const id = pt.id || crypto.randomUUID();
          await saveUploadTextToIndexedDB('pasted-contestacao' as UploadTextCategory, id, pt.text, pt.name);
          migratedTexts.push({ id, text: pt.text, name: pt.name });
        }
        setPastedContestacaoTexts(migratedTexts);
      } else {
        setPastedContestacaoTexts([]);
      }

      // Complementares
      if (session.pastedComplementaryTextIds && Array.isArray(session.pastedComplementaryTextIds)) {
        const restoredTexts: Array<{ id: string; text: string; name: string }> = [];
        for (const id of session.pastedComplementaryTextIds) {
          const pt = await getUploadTextFromIndexedDB('pasted-complementar' as UploadTextCategory, id);
          if (pt) restoredTexts.push(pt);
        }
        setPastedComplementaryTexts(restoredTexts);
      } else if (session.pastedComplementaryTexts && Array.isArray(session.pastedComplementaryTexts)) {
        const legacyTexts = session.pastedComplementaryTexts as Array<{ id?: string; text: string; name: string }>;
        const migratedTexts: Array<{ id: string; text: string; name: string }> = [];
        for (const pt of legacyTexts) {
          const id = pt.id || crypto.randomUUID();
          await saveUploadTextToIndexedDB('pasted-complementar' as UploadTextCategory, id, pt.text, pt.name);
          migratedTexts.push({ id, text: pt.text, name: pt.name });
        }
        setPastedComplementaryTexts(migratedTexts);
      } else {
        setPastedComplementaryTexts([]);
      }

      setExtractedTopics(session.extractedTopics || []);
      setSelectedTopics(session.selectedTopics || []);
      setPartesProcesso(session.partesProcesso || { reclamante: '', reclamadas: [] });

      // v1.40.18: Carregar analyzedDocuments texts do IndexedDB
      const restoredAnalyzedDocs: {
        peticoes: string[];
        peticoesText: Array<{ id: string; text: string; name: string }>;
        contestacoes: string[];
        contestacoesText: Array<{ id: string; text: string; name: string }>;
        complementares: string[];
        complementaresText: Array<{ id: string; text: string; name: string }>;
      } = {
        peticoes: session.analyzedDocuments?.peticoes || [],
        peticoesText: [],
        contestacoes: session.analyzedDocuments?.contestacoes || [],
        contestacoesText: [],
        complementares: session.analyzedDocuments?.complementares || [],
        complementaresText: []
      };

      // Petições analyzedDocuments
      if (session.analyzedDocuments?.peticoesTextIds && Array.isArray(session.analyzedDocuments.peticoesTextIds)) {
        for (const id of session.analyzedDocuments.peticoesTextIds) {
          const pt = await getUploadTextFromIndexedDB('analyzed-peticao' as UploadTextCategory, id);
          if (pt) restoredAnalyzedDocs.peticoesText.push(pt);
        }
      } else if (session.analyzedDocuments?.peticoesText && Array.isArray(session.analyzedDocuments.peticoesText)) {
        const legacyTexts = session.analyzedDocuments.peticoesText as Array<{ id?: string; text: string; name: string }>;
        for (const pt of legacyTexts) {
          const id = pt.id || crypto.randomUUID();
          pt.id = id;
          await saveUploadTextToIndexedDB('analyzed-peticao' as UploadTextCategory, id, pt.text, pt.name);
          restoredAnalyzedDocs.peticoesText.push({ id, text: pt.text, name: pt.name });
        }
      }

      // Contestações analyzedDocuments
      if (session.analyzedDocuments?.contestacoesTextIds && Array.isArray(session.analyzedDocuments.contestacoesTextIds)) {
        for (const id of session.analyzedDocuments.contestacoesTextIds) {
          const pt = await getUploadTextFromIndexedDB('analyzed-contestacao' as UploadTextCategory, id);
          if (pt) restoredAnalyzedDocs.contestacoesText.push(pt);
        }
      } else if (session.analyzedDocuments?.contestacoesText && Array.isArray(session.analyzedDocuments.contestacoesText)) {
        const legacyTexts = session.analyzedDocuments.contestacoesText as Array<{ id?: string; text: string; name: string }>;
        for (const pt of legacyTexts) {
          const id = pt.id || crypto.randomUUID();
          pt.id = id;
          await saveUploadTextToIndexedDB('analyzed-contestacao' as UploadTextCategory, id, pt.text, pt.name);
          restoredAnalyzedDocs.contestacoesText.push({ id, text: pt.text, name: pt.name });
        }
      }

      // Complementares analyzedDocuments
      if (session.analyzedDocuments?.complementaresTextIds && Array.isArray(session.analyzedDocuments.complementaresTextIds)) {
        for (const id of session.analyzedDocuments.complementaresTextIds) {
          const pt = await getUploadTextFromIndexedDB('analyzed-complementar' as UploadTextCategory, id);
          if (pt) restoredAnalyzedDocs.complementaresText.push(pt);
        }
      } else if (session.analyzedDocuments?.complementaresText && Array.isArray(session.analyzedDocuments.complementaresText)) {
        const legacyTexts = session.analyzedDocuments.complementaresText as Array<{ id?: string; text: string; name: string }>;
        for (const pt of legacyTexts) {
          const id = pt.id || crypto.randomUUID();
          pt.id = id;
          await saveUploadTextToIndexedDB('analyzed-complementar' as UploadTextCategory, id, pt.text, pt.name);
          restoredAnalyzedDocs.complementaresText.push({ id, text: pt.text, name: pt.name });
        }
      }

      setAnalyzedDocuments(restoredAnalyzedDocs);

      // v1.40.18: Carregar extractedTexts do IndexedDB
      if (setExtractedTexts) {
        const restoredExtractedTexts: {
          peticoes: Array<{ text: string; name?: string }>;
          contestacoes: Array<{ text: string; name?: string }>;
          complementares: Array<{ text: string; name?: string }>;
        } = { peticoes: [], contestacoes: [], complementares: [] };

        // Petições extracted
        if (session.extractedTextIds?.peticoes && Array.isArray(session.extractedTextIds.peticoes)) {
          for (const id of session.extractedTextIds.peticoes) {
            const et = await getUploadTextFromIndexedDB('extracted-peticao' as UploadTextCategory, id);
            if (et) restoredExtractedTexts.peticoes.push({ text: et.text, name: et.name });
          }
        } else if (session.extractedTexts?.peticoes && Array.isArray(session.extractedTexts.peticoes)) {
          // Migrar formato antigo
          for (let i = 0; i < session.extractedTexts.peticoes.length; i++) {
            const et = session.extractedTexts.peticoes[i];
            await saveUploadTextToIndexedDB('extracted-peticao' as UploadTextCategory, String(i), et.text, et.name || `Petição ${i + 1}`);
            restoredExtractedTexts.peticoes.push(et);
          }
        }

        // Contestações extracted
        if (session.extractedTextIds?.contestacoes && Array.isArray(session.extractedTextIds.contestacoes)) {
          for (const id of session.extractedTextIds.contestacoes) {
            const et = await getUploadTextFromIndexedDB('extracted-contestacao' as UploadTextCategory, id);
            if (et) restoredExtractedTexts.contestacoes.push({ text: et.text, name: et.name });
          }
        } else if (session.extractedTexts?.contestacoes && Array.isArray(session.extractedTexts.contestacoes)) {
          for (let i = 0; i < session.extractedTexts.contestacoes.length; i++) {
            const et = session.extractedTexts.contestacoes[i];
            await saveUploadTextToIndexedDB('extracted-contestacao' as UploadTextCategory, String(i), et.text, et.name || `Contestação ${i + 1}`);
            restoredExtractedTexts.contestacoes.push(et);
          }
        }

        // Complementares extracted
        if (session.extractedTextIds?.complementares && Array.isArray(session.extractedTextIds.complementares)) {
          for (const id of session.extractedTextIds.complementares) {
            const et = await getUploadTextFromIndexedDB('extracted-complementar' as UploadTextCategory, id);
            if (et) restoredExtractedTexts.complementares.push({ text: et.text, name: et.name });
          }
        } else if (session.extractedTexts?.complementares && Array.isArray(session.extractedTexts.complementares)) {
          for (let i = 0; i < session.extractedTexts.complementares.length; i++) {
            const et = session.extractedTexts.complementares[i];
            await saveUploadTextToIndexedDB('extracted-complementar' as UploadTextCategory, String(i), et.text, et.name || `Complementar ${i + 1}`);
            restoredExtractedTexts.complementares.push(et);
          }
        }

        setExtractedTexts(restoredExtractedTexts);
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

      // v1.40.17: Carregar proofTexts do IndexedDB (com migração de formato antigo)
      if (session.proofTextIds && Array.isArray(session.proofTextIds)) {
        // Novo formato: carregar do IndexedDB usando IDs
        const restoredProofTexts: ProofText[] = [];
        for (const id of session.proofTextIds) {
          const pt = await getProofTextFromIndexedDB(id);
          if (pt) {
            restoredProofTexts.push({
              id: pt.id,
              text: pt.text,
              name: pt.name,
              type: 'text' as const,
              uploadDate: pt.uploadDate
            });
          }
        }
        setProofTexts(restoredProofTexts);
      } else if (session.proofTexts && Array.isArray(session.proofTexts)) {
        // Formato antigo: migrar textos para IndexedDB
        const legacyProofTexts = session.proofTexts as ProofText[];
        for (const pt of legacyProofTexts) {
          await saveProofTextToIndexedDB(String(pt.id), pt.text, pt.name, pt.uploadDate);
        }
        setProofTexts(legacyProofTexts);
      } else {
        setProofTexts([]);
      }
      setProofUsePdfMode(session.proofUsePdfMode || {});

      // v1.40.19: Carregar extractedProofTexts do IndexedDB (com migração de formato antigo)
      if (session.extractedProofTextIds && Array.isArray(session.extractedProofTextIds)) {
        // Novo formato: carregar do IndexedDB usando IDs
        const restoredExtractedProofTexts: Record<string, string> = {};
        for (const proofId of session.extractedProofTextIds) {
          const pt = await getUploadTextFromIndexedDB('extracted-proof' as UploadTextCategory, proofId);
          if (pt) restoredExtractedProofTexts[proofId] = pt.text;
        }
        setExtractedProofTexts(restoredExtractedProofTexts);
      } else if (session.extractedProofTexts && typeof session.extractedProofTexts === 'object') {
        // Formato antigo: migrar textos para IndexedDB
        const legacyTexts = session.extractedProofTexts as Record<string, string>;
        for (const [proofId, text] of Object.entries(legacyTexts)) {
          await saveUploadTextToIndexedDB('extracted-proof' as UploadTextCategory, proofId, text, `Prova ${proofId}`);
        }
        setExtractedProofTexts(legacyTexts);
      } else {
        setExtractedProofTexts({});
      }

      setProofExtractionFailed(session.proofExtractionFailed || {});
      setProofTopicLinks(session.proofTopicLinks || {});

      // v1.38.28: Migrar análises antigas (objeto único) para arrays
      if (session.proofAnalysisResults) {
        const rawAnalysisResults = session.proofAnalysisResults as Record<string, unknown>;
        const migratedAnalysisResults: Record<string, ProofAnalysisResult[]> = {};
        for (const [proofId, analysis] of Object.entries(rawAnalysisResults)) {
          if (Array.isArray(analysis)) {
            migratedAnalysisResults[proofId] = analysis as ProofAnalysisResult[];
          } else if (analysis && typeof analysis === 'object') {
            const old = analysis as { type?: string; result?: string; topicTitle?: string; timestamp?: string };
            if (old.type && old.result) {
              migratedAnalysisResults[proofId] = [{
                id: crypto.randomUUID(),
                type: old.type as 'contextual' | 'livre',
                result: old.result,
                topicTitle: old.topicTitle,
                timestamp: old.timestamp || new Date().toISOString()
              }];
            }
          }
        }
        setProofAnalysisResults(migratedAnalysisResults);
      } else {
        setProofAnalysisResults({});
      }

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

    // v1.37.92: Exportar cache de histórico de chat
    // v1.38.16: Inclui includeMainDocs junto com messages
    let chatHistoryExport: Record<string, ChatExportEntry> = {};
    try {
      const db = await openChatDB();
      const store = db.transaction(CHAT_STORE_NAME).objectStore(CHAT_STORE_NAME);
      const entries = await new Promise<ChatHistoryCacheEntry[]>((resolve) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });
      db.close();
      for (const entry of entries) {
        chatHistoryExport[entry.topicTitle] = {
          messages: entry.messages,
          includeMainDocs: entry.includeMainDocs
        };
      }
    } catch (e) {
      console.warn('[Export] Erro ao exportar chatHistory:', e);
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
      sentenceReviewCache: sentenceReviewCacheExport,  // v1.36.57
      chatHistory: chatHistoryExport  // v1.37.92
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

    // v1.40.18: Limpar upload texts do projeto anterior
    try {
      await clearAllUploadTextsFromIndexedDB();
    } catch (err) {
      // Ignore
    }

    // Limpar caches project-specific do projeto anterior
    const clearStore = async (openDb: () => Promise<IDBDatabase>, storeName: string) => {
      try {
        const db = await openDb();
        const tx = db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).clear();
        await new Promise<void>((resolve) => {
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        });
        db.close();
      } catch { /* ignore */ }
    };
    await Promise.all([
      clearStore(openChatDB, CHAT_STORE_NAME),
      clearStore(openFactsDB, FACTS_STORE_NAME),
      clearStore(openReviewDB, REVIEW_STORE_NAME),
      clearStore(openVersionDB, VERSION_STORE),
    ]);

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

    // v1.40.18: Salvar pastedTexts importados no IndexedDB
    const rawPastedPeticaoTexts = (project.pastedPeticaoTexts || []) as Array<{ id?: string; text: string; name: string }>;
    const importedPastedPeticaoTexts: Array<{ id: string; text: string; name: string }> = [];
    for (const pt of rawPastedPeticaoTexts) {
      const id = pt.id || crypto.randomUUID();
      await saveUploadTextToIndexedDB('pasted-peticao' as UploadTextCategory, id, pt.text, pt.name);
      importedPastedPeticaoTexts.push({ id, text: pt.text, name: pt.name });
    }
    setPastedPeticaoTexts(importedPastedPeticaoTexts);

    const rawPastedContestacaoTexts = (project.pastedContestacaoTexts || []) as Array<{ id?: string; text: string; name: string }>;
    const importedPastedContestacaoTexts: Array<{ id: string; text: string; name: string }> = [];
    for (const pt of rawPastedContestacaoTexts) {
      const id = pt.id || crypto.randomUUID();
      await saveUploadTextToIndexedDB('pasted-contestacao' as UploadTextCategory, id, pt.text, pt.name);
      importedPastedContestacaoTexts.push({ id, text: pt.text, name: pt.name });
    }
    setPastedContestacaoTexts(importedPastedContestacaoTexts);

    const rawPastedComplementaryTexts = (project.pastedComplementaryTexts || []) as Array<{ id?: string; text: string; name: string }>;
    const importedPastedComplementaryTexts: Array<{ id: string; text: string; name: string }> = [];
    for (const pt of rawPastedComplementaryTexts) {
      const id = pt.id || crypto.randomUUID();
      await saveUploadTextToIndexedDB('pasted-complementar' as UploadTextCategory, id, pt.text, pt.name);
      importedPastedComplementaryTexts.push({ id, text: pt.text, name: pt.name });
    }
    setPastedComplementaryTexts(importedPastedComplementaryTexts);

    setExtractedTopics(project.extractedTopics || []);
    // v1.37.81: Sanitizar cores inline dos tópicos (sistema color-free)
    const sanitizedSelectedTopics = (project.selectedTopics || []).map(topic => ({
      ...topic,
      fundamentacao: stripInlineColors(topic.fundamentacao || ''),
      editedFundamentacao: stripInlineColors(topic.editedFundamentacao || ''),
      relatorio: stripInlineColors(topic.relatorio || ''),
      editedRelatorio: stripInlineColors(topic.editedRelatorio || ''),
    }));
    setSelectedTopics(sanitizedSelectedTopics);
    setPartesProcesso(project.partesProcesso || { reclamante: '', reclamadas: [] });

    // v1.40.18: Salvar analyzedDocuments texts no IndexedDB
    const analyzedDocs = project.analyzedDocuments || {
      peticoes: [], peticoesText: [], contestacoes: [], contestacoesText: [],
      complementares: [], complementaresText: []
    };

    for (const pt of (analyzedDocs.peticoesText || []) as Array<{ id?: string; text: string; name: string }>) {
      const id = pt.id || crypto.randomUUID();
      pt.id = id;
      await saveUploadTextToIndexedDB('analyzed-peticao' as UploadTextCategory, id, pt.text, pt.name);
    }
    for (const pt of (analyzedDocs.contestacoesText || []) as Array<{ id?: string; text: string; name: string }>) {
      const id = pt.id || crypto.randomUUID();
      pt.id = id;
      await saveUploadTextToIndexedDB('analyzed-contestacao' as UploadTextCategory, id, pt.text, pt.name);
    }
    for (const pt of (analyzedDocs.complementaresText || []) as Array<{ id?: string; text: string; name: string }>) {
      const id = pt.id || crypto.randomUUID();
      pt.id = id;
      await saveUploadTextToIndexedDB('analyzed-complementar' as UploadTextCategory, id, pt.text, pt.name);
    }
    setAnalyzedDocuments(analyzedDocs);

    // v1.40.18: Salvar extractedTexts no IndexedDB
    if (setExtractedTexts) {
      const extractedTextsData = project.extractedTexts || { peticoes: [], contestacoes: [], complementares: [] };

      for (let i = 0; i < (extractedTextsData.peticoes || []).length; i++) {
        const et = extractedTextsData.peticoes[i];
        await saveUploadTextToIndexedDB('extracted-peticao' as UploadTextCategory, String(i), et.text, et.name || `Petição ${i + 1}`);
      }
      for (let i = 0; i < (extractedTextsData.contestacoes || []).length; i++) {
        const et = extractedTextsData.contestacoes[i];
        await saveUploadTextToIndexedDB('extracted-contestacao' as UploadTextCategory, String(i), et.text, et.name || `Contestação ${i + 1}`);
      }
      for (let i = 0; i < (extractedTextsData.complementares || []).length; i++) {
        const et = extractedTextsData.complementares[i];
        await saveUploadTextToIndexedDB('extracted-complementar' as UploadTextCategory, String(i), et.text, et.name || `Complementar ${i + 1}`);
      }

      setExtractedTexts(extractedTextsData);
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

    // Acumular arquivos restaurados para incluir no autoSave
    let restoredPeticaoFiles: UploadedFile[] = [];
    let restoredContestacaoFiles: UploadedFile[] = [];
    let restoredComplementaryFiles: UploadedFile[] = [];

    // v1.40.20: Utilitário para dar oportunidade ao GC entre operações pesadas
    const yieldToMain = () => new Promise<void>(resolve => setTimeout(resolve, 0));

    // Restaurar PDFs
    // v1.40.20: Processamento sequencial para reduzir pico de memória
    if (project.uploadPdfs) {
      // Petições (novo formato com UUID)
      if (project.uploadPdfs.peticoes && setPeticaoFiles) {
        const petFiles: UploadedFile[] = [];
        for (const pData of project.uploadPdfs.peticoes) {
          const pFile = base64ToFile(pData.fileData, pData.name, 'application/pdf');
          const id = pData.id || crypto.randomUUID();
          petFiles.push({ file: pFile, id });
          await savePdfToIndexedDB(`upload-peticao-${id}`, pFile, 'upload');
          // Yield para permitir GC do base64 processado
          await yieldToMain();
        }
        setPeticaoFiles(petFiles);
        restoredPeticaoFiles = petFiles;
      }
      // Petição (formato antigo singular - migração)
      else if (project.uploadPdfs.peticao && setPeticaoFiles) {
        const pData = project.uploadPdfs.peticao;
        const pFile = base64ToFile(pData.fileData, pData.name, 'application/pdf');
        const id = crypto.randomUUID();
        const petFiles = [{ file: pFile, id }];
        setPeticaoFiles(petFiles);
        restoredPeticaoFiles = petFiles;
        await savePdfToIndexedDB(`upload-peticao-${id}`, pFile, 'upload');
      }
      if (project.uploadPdfs.contestacoes && setContestacaoFiles) {
        const contestFiles: UploadedFile[] = [];
        for (const cData of project.uploadPdfs.contestacoes) {
          const cFile = base64ToFile(cData.fileData, cData.name, 'application/pdf');
          const id = cData.id || crypto.randomUUID();
          contestFiles.push({ file: cFile, id });
          await savePdfToIndexedDB(`upload-contestacao-${id}`, cFile, 'upload');
          await yieldToMain();
        }
        setContestacaoFiles(contestFiles);
        restoredContestacaoFiles = contestFiles;
      }
      if (project.uploadPdfs.complementares && setComplementaryFiles) {
        const compFiles: UploadedFile[] = [];
        for (const cpData of project.uploadPdfs.complementares) {
          const cpFile = base64ToFile(cpData.fileData, cpData.name, 'application/pdf');
          const id = cpData.id || crypto.randomUUID();
          compFiles.push({ file: cpFile, id });
          await savePdfToIndexedDB(`upload-complementar-${id}`, cpFile, 'upload');
          await yieldToMain();
        }
        setComplementaryFiles(compFiles);
        restoredComplementaryFiles = compFiles;
      }
    }

    // Restaurar provas
    // v1.40.20: Processamento sequencial para reduzir pico de memória
    let restoredProofFiles: Proof[] = [];
    if (project.proofFiles && Array.isArray(project.proofFiles)) {
      for (const proof of project.proofFiles as Proof[]) {
        if (proof.type === 'text') {
          // ProofText - add as-is
          restoredProofFiles.push(proof);
          continue;
        }
        if (!proof.fileData) {
          // ProofFile without data - mark as placeholder
          restoredProofFiles.push({ id: proof.id, name: proof.name, type: 'pdf' as const, size: proof.size, uploadDate: proof.uploadDate, isPlaceholder: true });
          continue;
        }
        // Converter base64 para File (otimizado sem array intermediário)
        const byteCharacters = atob(proof.fileData);
        const byteArray = new Uint8Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteArray[i] = byteCharacters.charCodeAt(i);
        }
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        const restoredFile = new File([blob], proof.name, { type: 'application/pdf' });
        await savePdfToIndexedDB(`proof-${proof.id}`, restoredFile, 'proof');
        restoredProofFiles.push({ id: proof.id, file: restoredFile, name: proof.name, type: 'pdf' as const, size: proof.size, uploadDate: proof.uploadDate });
        // Yield para permitir GC do base64 processado
        await yieldToMain();
      }
      // Filtrar apenas PDFs para setProofFiles (textos vão em setProofTexts)
      setProofFiles(restoredProofFiles.filter((p): p is ProofFile => p.type === 'pdf'));
    } else {
      setProofFiles([]);
    }

    // v1.40.17: Salvar proofTexts importados no IndexedDB
    const importedProofTexts = (project.proofTexts as unknown as ProofText[]) || [];
    for (const pt of importedProofTexts) {
      await saveProofTextToIndexedDB(String(pt.id), pt.text, pt.name, pt.uploadDate);
    }
    setProofTexts(importedProofTexts);
    setProofUsePdfMode(project.proofUsePdfMode || {});

    // v1.40.19: Salvar extractedProofTexts importados no IndexedDB
    const importedExtractedProofTexts = (project.extractedProofTexts || {}) as Record<string, string>;
    for (const [proofId, text] of Object.entries(importedExtractedProofTexts)) {
      await saveUploadTextToIndexedDB('extracted-proof' as UploadTextCategory, proofId, text, `Prova ${proofId}`);
    }
    setExtractedProofTexts(importedExtractedProofTexts);

    setProofExtractionFailed(project.proofExtractionFailed || {});
    setProofTopicLinks(project.proofTopicLinks || {});

    // v1.38.27: Migrar análises antigas (objeto único) para arrays
    const rawAnalysisResults = project.proofAnalysisResults as Record<string, unknown> || {};
    const migratedAnalysisResults: Record<string, ProofAnalysisResult[]> = {};
    for (const [proofId, analysis] of Object.entries(rawAnalysisResults)) {
      if (Array.isArray(analysis)) {
        // Já é array (formato novo)
        migratedAnalysisResults[proofId] = analysis as ProofAnalysisResult[];
      } else if (analysis && typeof analysis === 'object') {
        // Análise antiga (objeto único) - converter para array
        const old = analysis as { type?: string; result?: string; topicTitle?: string; timestamp?: string };
        if (old.type && old.result) {
          migratedAnalysisResults[proofId] = [{
            id: crypto.randomUUID(),
            type: old.type as 'contextual' | 'livre',
            result: old.result,
            topicTitle: old.topicTitle,
            timestamp: old.timestamp || new Date().toISOString()
          }];
        }
      }
    }
    setProofAnalysisResults(migratedAnalysisResults);

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

      // Usar apiKeys do Zustand store (já decriptadas) - nunca ler do localStorage
      // pois lá estão criptografadas e setAiSettings() criptografaria novamente
      const currentApiKeys = useAIStore.getState().aiSettings.apiKeys || { claude: '', gemini: '', openai: '', grok: '' };

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
        proofAnalysisResults: migratedAnalysisResults,
        proofConclusions: project.proofConclusions || {},
        proofSendFullContent: project.proofSendFullContent || {},
        documentProcessingModes: project.documentProcessingModes || { peticoes: ['pdfjs'], contestacoes: [], complementares: [] },
        tokenMetrics: project.tokenMetrics || { totalInput: 0, totalOutput: 0, totalCacheRead: 0, totalCacheCreation: 0, requestCount: 0, lastUpdated: null },
        peticaoFiles: restoredPeticaoFiles,
        contestacaoFiles: restoredContestacaoFiles,
        complementaryFiles: restoredComplementaryFiles
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

    // v1.37.92: Importar cache de histórico de chat
    // v1.38.16: Suporta novo formato (objeto com messages + includeMainDocs) e legado (array de messages)
    if (project.chatHistory && typeof project.chatHistory === 'object') {
      try {
        const db = await openChatDB();
        const tx = db.transaction(CHAT_STORE_NAME, 'readwrite');
        const store = tx.objectStore(CHAT_STORE_NAME);

        for (const [topicTitle, value] of Object.entries(project.chatHistory)) {
          if (!topicTitle) continue;

          // v1.38.16: Detectar formato (novo vs legado)
          const isNewFormat = value && typeof value === 'object' && !Array.isArray(value) && 'messages' in value;
          const messages = isNewFormat ? (value as ChatExportEntry).messages : (value as ChatMessage[]);
          const includeMainDocs = isNewFormat ? (value as ChatExportEntry).includeMainDocs : undefined;

          if (Array.isArray(messages) && messages.length > 0) {
            const now = Date.now();
            store.add({
              topicTitle,
              messages,
              includeMainDocs,
              createdAt: now,
              updatedAt: now
            });
          }
        }

        await new Promise<void>((resolve) => {
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        });
        db.close();
      } catch (e) {
        console.warn('[Import] Erro ao importar chatHistory:', e);
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
        setError: _setError2,
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

      // v1.40.17: Limpar todos os proofTexts do IndexedDB
      clearAllProofTextsFromIndexedDB().catch(() => {
        // Ignore errors
      });

      // v1.40.18: Limpar todos os upload texts do IndexedDB
      clearAllUploadTextsFromIndexedDB().catch(() => {
        // Ignore errors
      });

      // Limpar caches project-specific
      const clearProjectStore = (openDb: () => Promise<IDBDatabase>, storeName: string) => {
        openDb().then(db => {
          const tx = db.transaction(storeName, 'readwrite');
          tx.objectStore(storeName).clear();
          tx.oncomplete = () => db.close();
          tx.onerror = () => db.close();
        }).catch(() => { /* ignore */ });
      };
      clearProjectStore(openChatDB, CHAT_STORE_NAME);
      clearProjectStore(openFactsDB, FACTS_STORE_NAME);
      clearProjectStore(openReviewDB, REVIEW_STORE_NAME);
      clearProjectStore(openVersionDB, VERSION_STORE);

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

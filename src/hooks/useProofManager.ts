/**
 * 🎣 CUSTOM HOOK: useProofManager - Sistema de Provas
 * Versão simplificada extraída do App.jsx para testes
 *
 * @version 1.35.76 - Migrado para TypeScript
 */
import { useState, useCallback } from 'react';
import type { ProcessingMode, Proof } from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

/** Arquivo de prova (PDF) */
export interface ProofFileLocal {
  id: number;
  file?: File;
  name: string;
  type: 'pdf';
  size: number;
  uploadDate: string;
  isPdf?: true;
}

/** Prova em texto */
export interface ProofTextLocal {
  id: number;
  text: string;
  name: string;
  uploadDate: string;
}

/** Prova genérica (pode ser PDF ou texto) */
export type ProofLocal = ProofFileLocal | ProofTextLocal;

/** Dados para nova prova em texto */
export interface NewProofTextData {
  name: string;
  text: string;
}

/** Resultado de análise de prova */
export interface ProofAnalysisResultLocal {
  type: 'contextual' | 'livre';
  result: string;
  topicTitle?: string;
  timestamp?: string;
}

/** Prova pendente (para anonimização) */
export interface PendingProof {
  id?: number;
  text?: string;
  file?: File;
  name?: string;
  // Para extração com anonimização
  proofId?: string | number;
  proof?: Proof;
  executeExtraction?: (nomes: string[]) => void;
}

/** Mensagem de chat pendente */
export interface PendingChatMessage {
  message: string;
  proofId?: number;
}

/** Dados serializados para persistência */
export interface ProofPersistenceData {
  proofFiles?: ProofFileLocal[];
  proofTexts?: ProofTextLocal[];
  proofUsePdfMode?: Record<number, boolean>;
  extractedProofTexts?: Record<number, string>;
  proofExtractionFailed?: Record<number, boolean>;
  proofTopicLinks?: Record<number, string[]>;
  proofAnalysisResults?: Record<number, ProofAnalysisResultLocal[]>;
  proofConclusions?: Record<number, string>;
  proofProcessingModes?: Record<number, ProcessingMode>;
  proofSendFullContent?: Record<number, boolean>;
}

/** Retorno do hook useProofManager */
export interface UseProofManagerReturn {
  // Estados Core
  proofFiles: ProofFileLocal[];
  proofTexts: ProofTextLocal[];
  proofUsePdfMode: Record<number, boolean>;
  extractedProofTexts: Record<number, string>;
  proofExtractionFailed: Record<number, boolean>;
  proofTopicLinks: Record<number, string[]>;
  proofAnalysisResults: Record<number, ProofAnalysisResultLocal[]>;
  proofConclusions: Record<number, string>;
  proofProcessingModes: Record<number, ProcessingMode>;
  proofSendFullContent: Record<number, boolean>;
  pendingProofText: PendingProof | null;
  pendingExtraction: PendingProof | null;
  pendingChatMessage: PendingChatMessage | null;

  // Estados UI
  analyzingProofIds: Set<number>;
  showProofPanel: boolean;
  newProofTextData: NewProofTextData;
  proofToDelete: ProofLocal | null;
  proofToLink: ProofLocal | null;
  proofToAnalyze: ProofLocal | null;
  proofAnalysisCustomInstructions: string;
  useOnlyMiniRelatorios: boolean;
  includeLinkedTopicsInFree: boolean;

  // Setters Core
  setProofFiles: React.Dispatch<React.SetStateAction<ProofFileLocal[]>>;
  setProofTexts: React.Dispatch<React.SetStateAction<ProofTextLocal[]>>;
  setProofUsePdfMode: React.Dispatch<React.SetStateAction<Record<number, boolean>>>;
  setExtractedProofTexts: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  setProofExtractionFailed: React.Dispatch<React.SetStateAction<Record<number, boolean>>>;
  setProofTopicLinks: React.Dispatch<React.SetStateAction<Record<number, string[]>>>;
  setProofAnalysisResults: React.Dispatch<React.SetStateAction<Record<number, ProofAnalysisResultLocal[]>>>;
  setProofConclusions: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  setProofProcessingModes: React.Dispatch<React.SetStateAction<Record<number, ProcessingMode>>>;
  setProofSendFullContent: React.Dispatch<React.SetStateAction<Record<number, boolean>>>;
  setPendingProofText: React.Dispatch<React.SetStateAction<PendingProof | null>>;
  setPendingExtraction: React.Dispatch<React.SetStateAction<PendingProof | null>>;
  setPendingChatMessage: React.Dispatch<React.SetStateAction<PendingChatMessage | null>>;

  // Setters UI
  setShowProofPanel: React.Dispatch<React.SetStateAction<boolean>>;
  setNewProofTextData: React.Dispatch<React.SetStateAction<NewProofTextData>>;
  setProofToDelete: React.Dispatch<React.SetStateAction<ProofLocal | null>>;
  setProofToLink: React.Dispatch<React.SetStateAction<ProofLocal | null>>;
  setProofToAnalyze: React.Dispatch<React.SetStateAction<ProofLocal | null>>;
  setProofAnalysisCustomInstructions: React.Dispatch<React.SetStateAction<string>>;
  setUseOnlyMiniRelatorios: React.Dispatch<React.SetStateAction<boolean>>;
  setIncludeLinkedTopicsInFree: React.Dispatch<React.SetStateAction<boolean>>;

  // Funções de análise
  addAnalyzingProof: (id: number) => void;
  removeAnalyzingProof: (id: number) => void;
  isAnalyzingProof: (id: number) => boolean;
  clearAnalyzingProofs: () => void;

  // Helpers
  totalProofs: number;
  hasProofs: boolean;

  // Handlers
  handleUploadProofPdf: (files: FileList | File[]) => Promise<void>;
  handleAddProofText: () => boolean;
  handleDeleteProof: (proof: ProofLocal) => void;
  handleToggleProofMode: (proofId: number, usePdf: boolean) => void;
  handleLinkProof: (proofId: number, topicTitles: string[]) => void;
  handleUnlinkProof: (proofId: number, topicTitle: string) => void;
  handleSaveProofConclusion: (proofId: number, conclusion: string) => void;

  // Persistência
  serializeForPersistence: () => ProofPersistenceData;
  restoreFromPersistence: (data: ProofPersistenceData | null) => void;
  resetAll: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

const useProofManager = (): UseProofManagerReturn => {
  // 📊 ESTADOS CORE DE DADOS
  const [proofFiles, setProofFiles] = useState<ProofFileLocal[]>([]);
  const [proofTexts, setProofTexts] = useState<ProofTextLocal[]>([]);
  const [proofUsePdfMode, setProofUsePdfMode] = useState<Record<number, boolean>>({});
  const [extractedProofTexts, setExtractedProofTexts] = useState<Record<number, string>>({});
  const [proofExtractionFailed, setProofExtractionFailed] = useState<Record<number, boolean>>({});
  const [proofTopicLinks, setProofTopicLinks] = useState<Record<number, string[]>>({});
  const [proofAnalysisResults, setProofAnalysisResults] = useState<Record<number, ProofAnalysisResultLocal[]>>({});
  const [proofConclusions, setProofConclusions] = useState<Record<number, string>>({});
  const [proofProcessingModes, setProofProcessingModes] = useState<Record<number, ProcessingMode>>({});
  const [proofSendFullContent, setProofSendFullContent] = useState<Record<number, boolean>>({});

  // Estados pendentes (anonimização)
  const [pendingProofText, setPendingProofText] = useState<PendingProof | null>(null);
  const [pendingExtraction, setPendingExtraction] = useState<PendingProof | null>(null);
  const [pendingChatMessage, setPendingChatMessage] = useState<PendingChatMessage | null>(null);

  // 🎛️ ESTADOS DE UI/CONTROLE
  const [analyzingProofIds, setAnalyzingProofIds] = useState<Set<number>>(new Set());
  const [showProofPanel, setShowProofPanel] = useState<boolean>(true);
  const [newProofTextData, setNewProofTextData] = useState<NewProofTextData>({ name: '', text: '' });
  const [proofToDelete, setProofToDelete] = useState<ProofLocal | null>(null);
  const [proofToLink, setProofToLink] = useState<ProofLocal | null>(null);
  const [proofToAnalyze, setProofToAnalyze] = useState<ProofLocal | null>(null);
  const [proofAnalysisCustomInstructions, setProofAnalysisCustomInstructions] = useState<string>('');
  const [useOnlyMiniRelatorios, setUseOnlyMiniRelatorios] = useState<boolean>(false);
  const [includeLinkedTopicsInFree, setIncludeLinkedTopicsInFree] = useState<boolean>(false);

  // Funções de controle de análise
  const addAnalyzingProof = useCallback((id: number): void => {
    setAnalyzingProofIds((prev) => new Set([...prev, id]));
  }, []);

  const removeAnalyzingProof = useCallback((id: number): void => {
    setAnalyzingProofIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const isAnalyzingProof = useCallback(
    (id: number): boolean => {
      return analyzingProofIds.has(id);
    },
    [analyzingProofIds]
  );

  const clearAnalyzingProofs = useCallback((): void => {
    setAnalyzingProofIds(new Set());
  }, []);

  // 📊 HELPERS COMPUTADOS
  const totalProofs = proofFiles.length + proofTexts.length;
  const hasProofs = totalProofs > 0;

  // 🔧 Helpers utilitários
  const removeObjectKey = useCallback(
    <T extends Record<number, unknown>>(
      setter: React.Dispatch<React.SetStateAction<T>>,
      keyToRemove: number
    ): void => {
      setter((prev) => {
        const { [keyToRemove]: _, ...rest } = prev;
        return rest as T;
      });
    },
    []
  );

  const removeById = useCallback(
    <T extends { id: number }>(arr: T[], id: number): T[] => arr.filter((item) => item.id !== id),
    []
  );

  // 🔧 HANDLERS

  // Handler: Upload de provas em PDF (versão simplificada sem IndexedDB)
  const handleUploadProofPdf = useCallback(async (files: FileList | File[]): Promise<void> => {
    const filesArray = Array.isArray(files) ? files : Array.from(files || []);

    for (const file of filesArray) {
      const id = Date.now() + Math.random();
      // v1.36.28: isPdf: true é obrigatório para analyzeProof discriminar corretamente
      const newProof: ProofFileLocal = {
        id,
        file,
        name: file.name,
        type: 'pdf',
        size: file.size,
        uploadDate: new Date().toISOString(),
        isPdf: true
      };

      setProofFiles((prev) => [...prev, newProof]);
      setProofUsePdfMode((prev) => ({ ...prev, [id]: true }));
      setProofProcessingModes((prev) => ({ ...prev, [id]: 'pdfjs' }));
    }
  }, []);

  // Handler: Adicionar prova em texto
  const handleAddProofText = useCallback((): boolean => {
    if (!newProofTextData.name.trim() || !newProofTextData.text.trim()) {
      return false;
    }

    const id = Date.now() + Math.random();
    const newProof: ProofTextLocal = {
      id,
      text: newProofTextData.text,
      name: newProofTextData.name,
      uploadDate: new Date().toISOString()
    };

    setProofTexts((prev) => [...prev, newProof]);
    setNewProofTextData({ name: '', text: '' });
    return true;
  }, [newProofTextData]);

  // Handler: Deletar prova
  const handleDeleteProof = useCallback(
    (proof: ProofLocal): void => {
      if ('isPdf' in proof || ('type' in proof && proof.type === 'pdf')) {
        setProofFiles((prev) => removeById(prev, proof.id));
      } else {
        setProofTexts((prev) => removeById(prev, proof.id));
      }
      removeObjectKey(setProofUsePdfMode, proof.id);
      removeObjectKey(setExtractedProofTexts, proof.id);
      removeObjectKey(setProofExtractionFailed, proof.id);
      removeObjectKey(setProofTopicLinks, proof.id);
      removeObjectKey(setProofAnalysisResults, proof.id);
      removeObjectKey(setProofConclusions, proof.id);
      removeObjectKey(setProofProcessingModes, proof.id);
    },
    [removeObjectKey, removeById]
  );

  const handleToggleProofMode = useCallback((proofId: number, usePdf: boolean): void => {
    setProofUsePdfMode((prev) => ({ ...prev, [proofId]: usePdf }));
  }, []);

  const handleLinkProof = useCallback((proofId: number, topicTitles: string[]): void => {
    setProofTopicLinks((prev) => ({ ...prev, [proofId]: topicTitles }));
  }, []);

  const handleUnlinkProof = useCallback((proofId: number, topicTitle: string): void => {
    setProofTopicLinks((prev) => {
      const currentLinks = prev[proofId] || [];
      const newLinks = currentLinks.filter((t) => t !== topicTitle);
      if (newLinks.length === 0) {
        const { [proofId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [proofId]: newLinks };
    });
  }, []);

  const handleSaveProofConclusion = useCallback((proofId: number, conclusion: string): void => {
    if (conclusion && conclusion.trim()) {
      setProofConclusions((prev) => ({ ...prev, [proofId]: conclusion }));
    } else {
      setProofConclusions((prev) => {
        const { [proofId]: _, ...rest } = prev;
        return rest;
      });
    }
  }, []);

  // Persistência
  const serializeForPersistence = useCallback((): ProofPersistenceData => {
    return {
      proofFiles,
      proofTexts,
      proofUsePdfMode,
      extractedProofTexts,
      proofExtractionFailed,
      proofTopicLinks,
      proofAnalysisResults,
      proofConclusions,
      proofProcessingModes,
      proofSendFullContent
    };
  }, [
    proofFiles,
    proofTexts,
    proofUsePdfMode,
    extractedProofTexts,
    proofExtractionFailed,
    proofTopicLinks,
    proofAnalysisResults,
    proofConclusions,
    proofProcessingModes,
    proofSendFullContent
  ]);

  const restoreFromPersistence = useCallback((data: ProofPersistenceData | null): void => {
    if (!data) return;
    if (data.proofFiles) setProofFiles(data.proofFiles);
    if (data.proofTexts) setProofTexts(data.proofTexts);
    if (data.proofUsePdfMode) setProofUsePdfMode(data.proofUsePdfMode);
    if (data.extractedProofTexts) setExtractedProofTexts(data.extractedProofTexts);
    if (data.proofExtractionFailed) setProofExtractionFailed(data.proofExtractionFailed);
    if (data.proofTopicLinks) setProofTopicLinks(data.proofTopicLinks);
    if (data.proofAnalysisResults) setProofAnalysisResults(data.proofAnalysisResults);
    if (data.proofConclusions) setProofConclusions(data.proofConclusions);
    if (data.proofProcessingModes) setProofProcessingModes(data.proofProcessingModes);
    if (data.proofSendFullContent) setProofSendFullContent(data.proofSendFullContent);
  }, []);

  const resetAll = useCallback((): void => {
    setProofFiles([]);
    setProofTexts([]);
    setProofUsePdfMode({});
    setExtractedProofTexts({});
    setProofExtractionFailed({});
    setProofTopicLinks({});
    setProofAnalysisResults({});
    setProofConclusions({});
    setProofProcessingModes({});
    setProofSendFullContent({});
    clearAnalyzingProofs();
    setShowProofPanel(true);
    setNewProofTextData({ name: '', text: '' });
    setProofToDelete(null);
    setProofToLink(null);
    setProofToAnalyze(null);
    setProofAnalysisCustomInstructions('');
    setUseOnlyMiniRelatorios(false);
  }, [clearAnalyzingProofs]);

  return {
    // Estados Core
    proofFiles,
    proofTexts,
    proofUsePdfMode,
    extractedProofTexts,
    proofExtractionFailed,
    proofTopicLinks,
    proofAnalysisResults,
    proofConclusions,
    proofProcessingModes,
    proofSendFullContent,
    pendingProofText,
    pendingExtraction,
    pendingChatMessage,

    // Estados UI
    analyzingProofIds,
    showProofPanel,
    newProofTextData,
    proofToDelete,
    proofToLink,
    proofToAnalyze,
    proofAnalysisCustomInstructions,
    useOnlyMiniRelatorios,
    includeLinkedTopicsInFree,

    // Setters Core
    setProofFiles,
    setProofTexts,
    setProofUsePdfMode,
    setExtractedProofTexts,
    setProofExtractionFailed,
    setProofTopicLinks,
    setProofAnalysisResults,
    setProofConclusions,
    setProofProcessingModes,
    setProofSendFullContent,
    setPendingProofText,
    setPendingExtraction,
    setPendingChatMessage,

    // Setters UI
    setShowProofPanel,
    setNewProofTextData,
    setProofToDelete,
    setProofToLink,
    setProofToAnalyze,
    setProofAnalysisCustomInstructions,
    setUseOnlyMiniRelatorios,
    setIncludeLinkedTopicsInFree,

    // Funções de análise
    addAnalyzingProof,
    removeAnalyzingProof,
    isAnalyzingProof,
    clearAnalyzingProofs,

    // Helpers
    totalProofs,
    hasProofs,

    // Handlers
    handleUploadProofPdf,
    handleAddProofText,
    handleDeleteProof,
    handleToggleProofMode,
    handleLinkProof,
    handleUnlinkProof,
    handleSaveProofConclusion,

    // Persistência
    serializeForPersistence,
    restoreFromPersistence,
    resetAll
  };
};

export default useProofManager;

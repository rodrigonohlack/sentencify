/**
 * @file useGoogleDriveActions.ts
 * @description Hook para ações de salvar/carregar do GoogleDriveButton
 * @version 1.38.52
 *
 * Extraído do App.tsx para reduzir tamanho do arquivo.
 * Contém callbacks para: onSave, onSaveLocal, onLoadClick, onLoadLocal do GoogleDriveButton.
 */

import { useCallback } from 'react';
import type {
  Topic,
  PartesProcesso,
  AnalyzedDocuments,
  ProofFile,
  ProofText,
  AISettings,
  TokenMetrics,
  SessionState,
  ImportCallbacks,
  PastedText,
  UploadedFile,
  ExtractedTexts,
  DocumentProcessingModes,
  ProofAnalysisResult,
  ProjectState,
  ModalKey,
} from '../types';
import type { GoogleDriveFile } from './useGoogleDrive';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Proof Manager subset needed for Google Drive actions
 */
interface ProofManagerForDrive {
  proofFiles: ProofFile[];
  proofTexts: ProofText[];
  proofUsePdfMode: Record<string, boolean>;
  extractedProofTexts: Record<string, string>;
  proofExtractionFailed: Record<string, boolean>;
  proofTopicLinks: Record<string, string[]>;
  proofAnalysisResults: Record<string, ProofAnalysisResult[]>;
  proofConclusions: Record<string, string>;
  setProofFiles: React.Dispatch<React.SetStateAction<ProofFile[]>>;
  setProofTexts: (texts: ProofText[]) => void;
  setProofUsePdfMode: (mode: Record<string, boolean>) => void;
  setExtractedProofTexts: (texts: Record<string, string>) => void;
  setProofExtractionFailed: (failed: Record<string, boolean>) => void;
  setProofTopicLinks: (links: Record<string, string[]>) => void;
  setProofAnalysisResults: (results: Record<string, ProofAnalysisResult[]> | ((prev: Record<string, ProofAnalysisResult[]>) => Record<string, ProofAnalysisResult[]>)) => void;
  setProofConclusions: (conclusions: Record<string, string>) => void;
  setProofSendFullContent: (value: Record<string, boolean>) => void;
}

/**
 * AI Integration subset needed for Google Drive actions
 */
interface AIIntegrationForDrive {
  aiSettings: AISettings;
  tokenMetrics: TokenMetrics;
  setAiSettings: (settings: AISettings) => void;
  setTokenMetrics: (metrics: TokenMetrics) => void;
}

/**
 * Storage subset needed for Google Drive actions
 */
interface StorageForDrive {
  buildProjectJson: (allStates: ProjectState) => Promise<object>;
  exportProject: (allStates: ProjectState, onError: (err: string | null) => void) => void;
  importProject: (
    event: React.ChangeEvent<HTMLInputElement>,
    callbacks: ImportCallbacks,
    autoSaveFn: (states: SessionState, setErrorFn: (err: string | null) => void, immediate: boolean) => Promise<void>
  ) => Promise<void>;
  autoSaveSession: (
    allStates: SessionState,
    setError: (err: string | null) => void,
    immediate: boolean
  ) => Promise<void>;
}

/**
 * Google Drive subset needed for actions
 */
interface GoogleDriveForActions {
  saveFile: (fileName: string, content: unknown) => Promise<GoogleDriveFile>;
  listFiles: () => Promise<GoogleDriveFile[]>;
}

/**
 * Document state needed for Google Drive actions
 */
interface DocumentStateForDrive {
  processoNumero: string;
  pastedPeticaoTexts: PastedText[];
  pastedContestacaoTexts: PastedText[];
  pastedComplementaryTexts: PastedText[];
  extractedTopics: Topic[];
  selectedTopics: Topic[];
  partesProcesso: PartesProcesso;
  activeTab: string;
  analyzedDocuments: AnalyzedDocuments;
  peticaoFiles: UploadedFile[];
  contestacaoFiles: UploadedFile[];
  complementaryFiles: UploadedFile[];
  extractedTexts: ExtractedTexts;
  documentProcessingModes: DocumentProcessingModes;
}

/**
 * Document setters needed for Google Drive actions
 */
interface DocumentSettersForDrive {
  setPastedPeticaoTexts: (texts: PastedText[]) => void;
  setPastedContestacaoTexts: (texts: PastedText[]) => void;
  setPastedComplementaryTexts: (texts: PastedText[]) => void;
  setExtractedTopics: (topics: Topic[]) => void;
  setSelectedTopics: React.Dispatch<React.SetStateAction<Topic[]>>;
  setPartesProcesso: (partes: PartesProcesso) => void;
  setAnalyzedDocuments: (docs: AnalyzedDocuments) => void;
  setActiveTab: (tab: string) => void;
  setProcessoNumero: (numero: string) => void;
  setPeticaoFiles: (files: UploadedFile[]) => void;
  setContestacaoFiles: (files: UploadedFile[]) => void;
  setComplementaryFiles: (files: UploadedFile[]) => void;
  setExtractedTexts: (texts: ExtractedTexts) => void;
  setDocumentProcessingModes: (modes: DocumentProcessingModes) => void;
}

export interface UseGoogleDriveActionsProps {
  googleDrive: GoogleDriveForActions;
  storage: StorageForDrive;
  proofManager: ProofManagerForDrive;
  aiIntegration: AIIntegrationForDrive;
  documentState: DocumentStateForDrive;
  documentSetters: DocumentSettersForDrive;
  setError: (error: string | { type: string; message: string } | null) => void;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
  setDriveFiles: (files: GoogleDriveFile[]) => void;
  setDriveFilesModalOpen: (open: boolean) => void;
  openModal: (modal: ModalKey) => void;
}

export interface UseGoogleDriveActionsReturn {
  handleDriveSave: () => Promise<void>;
  handleDriveLoadClick: () => Promise<void>;
  handleLocalSave: () => void;
  handleLocalLoad: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleClear: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

export function useGoogleDriveActions(props: UseGoogleDriveActionsProps): UseGoogleDriveActionsReturn {
  const {
    googleDrive,
    storage,
    proofManager,
    aiIntegration,
    documentState,
    documentSetters,
    setError,
    showToast,
    setDriveFiles,
    setDriveFilesModalOpen,
    openModal,
  } = props;

  /**
   * Build all states object for save operations
   */
  const buildAllStates = useCallback(() => {
    return {
      processoNumero: documentState.processoNumero,
      pastedPeticaoTexts: documentState.pastedPeticaoTexts,
      pastedContestacaoTexts: documentState.pastedContestacaoTexts,
      pastedComplementaryTexts: documentState.pastedComplementaryTexts,
      extractedTopics: documentState.extractedTopics,
      selectedTopics: documentState.selectedTopics,
      partesProcesso: documentState.partesProcesso,
      activeTab: documentState.activeTab,
      analyzedDocuments: documentState.analyzedDocuments,
      proofFiles: proofManager.proofFiles,
      proofTexts: proofManager.proofTexts,
      proofUsePdfMode: proofManager.proofUsePdfMode,
      extractedProofTexts: proofManager.extractedProofTexts,
      proofExtractionFailed: proofManager.proofExtractionFailed,
      proofTopicLinks: proofManager.proofTopicLinks,
      proofAnalysisResults: proofManager.proofAnalysisResults,
      proofConclusions: proofManager.proofConclusions,
      aiSettings: aiIntegration.aiSettings,
      peticaoFiles: documentState.peticaoFiles,
      contestacaoFiles: documentState.contestacaoFiles,
      complementaryFiles: documentState.complementaryFiles,
      extractedTexts: documentState.extractedTexts,
      documentProcessingModes: documentState.documentProcessingModes,
      tokenMetrics: aiIntegration.tokenMetrics
    };
  }, [documentState, proofManager, aiIntegration]);

  /**
   * Save project to Google Drive
   */
  const handleDriveSave = useCallback(async () => {
    try {
      const allStates = buildAllStates();
      const projectJson = await storage.buildProjectJson(allStates);
      const fileName = `sentencify-${documentState.processoNumero || 'projeto'}-${new Date().toISOString().split('T')[0]}.json`;
      await googleDrive.saveFile(fileName, projectJson);
      showToast(`Projeto salvo no Google Drive: ${fileName}`, 'success');
    } catch (err) {
      showToast(`Erro ao salvar no Drive: ${(err as Error).message}`, 'error');
    }
  }, [buildAllStates, storage, googleDrive, documentState.processoNumero, showToast]);

  /**
   * Open Google Drive files modal
   */
  const handleDriveLoadClick = useCallback(async () => {
    try {
      const files = await googleDrive.listFiles();
      setDriveFiles(files);
      setDriveFilesModalOpen(true);
    } catch (err) {
      showToast(`Erro ao listar arquivos: ${(err as Error).message}`, 'error');
    }
  }, [googleDrive, setDriveFiles, setDriveFilesModalOpen, showToast]);

  /**
   * Save project to local file
   */
  const handleLocalSave = useCallback(() => {
    const allStates = buildAllStates();
    storage.exportProject(allStates, (err: string | null) => setError(err || ''));
  }, [buildAllStates, storage, setError]);

  /**
   * Load project from local file
   */
  const handleLocalLoad = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const callbacks: ImportCallbacks = {
      setPastedPeticaoTexts: documentSetters.setPastedPeticaoTexts,
      setPastedContestacaoTexts: documentSetters.setPastedContestacaoTexts,
      setPastedComplementaryTexts: documentSetters.setPastedComplementaryTexts,
      setExtractedTopics: documentSetters.setExtractedTopics,
      setSelectedTopics: documentSetters.setSelectedTopics,
      setPartesProcesso: documentSetters.setPartesProcesso,
      setAnalyzedDocuments: documentSetters.setAnalyzedDocuments,
      setProofFiles: proofManager.setProofFiles,
      setProofTexts: proofManager.setProofTexts,
      setProofUsePdfMode: proofManager.setProofUsePdfMode,
      setExtractedProofTexts: proofManager.setExtractedProofTexts,
      setProofExtractionFailed: proofManager.setProofExtractionFailed,
      setProofTopicLinks: proofManager.setProofTopicLinks,
      setProofAnalysisResults: proofManager.setProofAnalysisResults,
      setProofConclusions: proofManager.setProofConclusions,
      setProofSendFullContent: proofManager.setProofSendFullContent,
      setActiveTab: documentSetters.setActiveTab,
      setAiSettings: aiIntegration.setAiSettings,
      setError: (err) => setError(err || ''),
      setProcessoNumero: documentSetters.setProcessoNumero,
      setPeticaoFiles: documentSetters.setPeticaoFiles,
      setContestacaoFiles: documentSetters.setContestacaoFiles,
      setComplementaryFiles: documentSetters.setComplementaryFiles,
      setExtractedTexts: documentSetters.setExtractedTexts,
      setDocumentProcessingModes: documentSetters.setDocumentProcessingModes,
      setTokenMetrics: aiIntegration.setTokenMetrics
    };

    const autoSaveFn = (states: SessionState, setErrorFn: (err: string | null) => void, immediate: boolean) => {
      return storage.autoSaveSession(states, setErrorFn, immediate);
    };

    storage.importProject(e, callbacks, autoSaveFn);
  }, [documentSetters, proofManager, aiIntegration, storage, setError]);

  /**
   * Open clear project modal
   */
  const handleClear = useCallback(() => {
    openModal('clearProject');
  }, [openModal]);

  return {
    handleDriveSave,
    handleDriveLoadClick,
    handleLocalSave,
    handleLocalLoad,
    handleClear,
  };
}

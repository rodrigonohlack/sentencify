/**
 * @file useDriveFileHandlers.ts
 * @description Hook para handlers do DriveFilesModal
 * @version 1.38.52
 *
 * Extraído do App.tsx para reduzir tamanho do arquivo.
 * Contém handlers para: load, delete, share, refresh de arquivos do Google Drive.
 */

import { useCallback } from 'react';
import { useUIStore } from '../stores/useUIStore';
import type { UseGoogleDriveReturn, GoogleDriveFile } from './useGoogleDrive';
import type {
  ImportedProject,
  ImportCallbacks,
  SessionState,
  AISettings,
  TokenMetrics,
} from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Subset of UseGoogleDriveReturn needed for drive file handlers
 */
type GoogleDriveForHandlers = Pick<
  UseGoogleDriveReturn,
  'loadFile' | 'deleteFile' | 'shareFile' | 'listFiles' | 'getPermissions' | 'removePermission'
>;

/**
 * Subset of UseLocalStorageReturn needed for drive file handlers
 */
interface StorageForDrive {
  importProjectFromJson: (
    project: ImportedProject,
    callbacks: ImportCallbacks,
    autoSaveSessionFn: (allStates: SessionState, setError: (err: string | null) => void, immediate: boolean) => Promise<void>
  ) => Promise<void>;
  autoSaveSession: (
    allStates: SessionState,
    setError: (err: string | null) => void,
    immediate: boolean
  ) => Promise<void>;
}

/**
 * Subset of UseProofManagerReturn needed for drive file handlers
 */
interface ProofManagerForDrive {
  setProofFiles: ImportCallbacks['setProofFiles'];
  setProofTexts: ImportCallbacks['setProofTexts'];
  setProofUsePdfMode: ImportCallbacks['setProofUsePdfMode'];
  setExtractedProofTexts: ImportCallbacks['setExtractedProofTexts'];
  setProofExtractionFailed: ImportCallbacks['setProofExtractionFailed'];
  setProofTopicLinks: ImportCallbacks['setProofTopicLinks'];
  setProofAnalysisResults: ImportCallbacks['setProofAnalysisResults'];
  setProofConclusions: ImportCallbacks['setProofConclusions'];
  setProofSendFullContent: ImportCallbacks['setProofSendFullContent'];
}

export interface UseDriveFileHandlersProps {
  // Google Drive hook
  googleDrive: GoogleDriveForHandlers;

  // Storage hook
  storage: StorageForDrive;

  // Proof Manager
  proofManager: ProofManagerForDrive;

  // AI Integration
  aiIntegration: {
    setAiSettings: (settings: AISettings) => void;
    setTokenMetrics: (value: TokenMetrics) => void;
  };

  // Document setters
  setPastedPeticaoTexts: ImportCallbacks['setPastedPeticaoTexts'];
  setPastedContestacaoTexts: ImportCallbacks['setPastedContestacaoTexts'];
  setPastedComplementaryTexts: ImportCallbacks['setPastedComplementaryTexts'];
  setExtractedTopics: ImportCallbacks['setExtractedTopics'];
  setSelectedTopics: ImportCallbacks['setSelectedTopics'];
  setPartesProcesso: ImportCallbacks['setPartesProcesso'];
  setAnalyzedDocuments: ImportCallbacks['setAnalyzedDocuments'];
  setActiveTab: ImportCallbacks['setActiveTab'];
  setError: ImportCallbacks['setError'];
  setProcessoNumero: ImportCallbacks['setProcessoNumero'];
  setPeticaoFiles: NonNullable<ImportCallbacks['setPeticaoFiles']>;
  setContestacaoFiles: NonNullable<ImportCallbacks['setContestacaoFiles']>;
  setComplementaryFiles: NonNullable<ImportCallbacks['setComplementaryFiles']>;
  setExtractedTexts: NonNullable<ImportCallbacks['setExtractedTexts']>;
  setDocumentProcessingModes: NonNullable<ImportCallbacks['setDocumentProcessingModes']>;
  setDriveFilesModalOpen: (open: boolean) => void;
  setDriveFiles: (files: GoogleDriveFile[]) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

export function useDriveFileHandlers(props: UseDriveFileHandlersProps) {
  const {
    googleDrive,
    storage,
    proofManager,
    aiIntegration,
    setPastedPeticaoTexts,
    setPastedContestacaoTexts,
    setPastedComplementaryTexts,
    setExtractedTopics,
    setSelectedTopics,
    setPartesProcesso,
    setAnalyzedDocuments,
    setActiveTab,
    setError,
    setProcessoNumero,
    setPeticaoFiles,
    setContestacaoFiles,
    setComplementaryFiles,
    setExtractedTexts,
    setDocumentProcessingModes,
    setDriveFilesModalOpen,
    setDriveFiles,
  } = props;

  /**
   * Handler para carregar arquivo do Google Drive
   */
  const handleDriveLoad = useCallback(async (file: GoogleDriveFile) => {
    try {
      const projectData = await googleDrive.loadFile(file.id);

      const callbacks: ImportCallbacks = {
        setPastedPeticaoTexts,
        setPastedContestacaoTexts,
        setPastedComplementaryTexts,
        setExtractedTopics,
        setSelectedTopics,
        setPartesProcesso,
        setAnalyzedDocuments,
        setProofFiles: proofManager.setProofFiles,
        setProofTexts: proofManager.setProofTexts,
        setProofUsePdfMode: proofManager.setProofUsePdfMode,
        setExtractedProofTexts: proofManager.setExtractedProofTexts,
        setProofExtractionFailed: proofManager.setProofExtractionFailed,
        setProofTopicLinks: proofManager.setProofTopicLinks,
        setProofAnalysisResults: proofManager.setProofAnalysisResults,
        setProofConclusions: proofManager.setProofConclusions,
        setProofSendFullContent: proofManager.setProofSendFullContent,
        setActiveTab,
        setAiSettings: aiIntegration.setAiSettings,
        setError,
        setProcessoNumero,
        setPeticaoFiles,
        setContestacaoFiles,
        setComplementaryFiles,
        setExtractedTexts,
        setDocumentProcessingModes,
        setTokenMetrics: aiIntegration.setTokenMetrics
      };

      await storage.importProjectFromJson(projectData as ImportedProject, callbacks, async (allStates) => {
        await storage.autoSaveSession(allStates, (err) => err && setError(err), true);
      });

      setDriveFilesModalOpen(false);
      setError({ type: 'success', message: `Projeto carregado do Google Drive: ${file.name}` });
    } catch (err) {
      setError({ type: 'error', message: `Erro ao carregar projeto: ${(err as Error).message}` });
    }
  }, [
    googleDrive,
    storage,
    proofManager,
    aiIntegration,
    setPastedPeticaoTexts,
    setPastedContestacaoTexts,
    setPastedComplementaryTexts,
    setExtractedTopics,
    setSelectedTopics,
    setPartesProcesso,
    setAnalyzedDocuments,
    setActiveTab,
    setError,
    setProcessoNumero,
    setPeticaoFiles,
    setContestacaoFiles,
    setComplementaryFiles,
    setExtractedTexts,
    setDocumentProcessingModes,
    setDriveFilesModalOpen,
  ]);

  /**
   * Handler para deletar arquivo do Google Drive
   */
  const handleDriveDelete = useCallback(async (file: GoogleDriveFile) => {
    try {
      await googleDrive.deleteFile(file.id);
      const currentFiles = useUIStore.getState().driveFilesList;
      setDriveFiles(currentFiles.filter(f => f.id !== file.id));
      setError({ type: 'success', message: `Arquivo excluído: ${file.name}` });
    } catch (err) {
      setError({ type: 'error', message: `Erro ao excluir: ${(err as Error).message}` });
    }
  }, [googleDrive, setDriveFiles, setError]);

  /**
   * Handler para compartilhar arquivo do Google Drive
   */
  const handleDriveShare = useCallback(async (fileId: string, email: string, role: string) => {
    try {
      await googleDrive.shareFile(fileId, email, role as 'writer' | 'reader');
      const roleText = role === 'writer' ? 'edição' : 'visualização';
      setError({ type: 'success', message: `Compartilhado com ${email} (${roleText})` });
    } catch (err) {
      setError({ type: 'error', message: `Erro ao compartilhar: ${(err as Error).message}` });
    }
  }, [googleDrive, setError]);

  /**
   * Handler para atualizar lista de arquivos do Google Drive
   */
  const handleDriveRefresh = useCallback(async () => {
    try {
      const files = await googleDrive.listFiles();
      setDriveFiles(files);
    } catch (err) {
      setError({ type: 'error', message: `Erro ao atualizar: ${(err as Error).message}` });
    }
  }, [googleDrive, setDriveFiles, setError]);

  return {
    handleDriveLoad,
    handleDriveDelete,
    handleDriveShare,
    handleDriveRefresh,
    handleDriveGetPermissions: googleDrive.getPermissions,
    handleDriveRemovePermission: googleDrive.removePermission,
  };
}

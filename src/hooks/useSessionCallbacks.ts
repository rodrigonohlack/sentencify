/**
 * @file useSessionCallbacks.ts
 * @description Hook para callbacks dos modais de sessão (RestoreSession, ClearProject, Logout)
 * @version 1.38.52
 *
 * Extraído do App.tsx para reduzir tamanho do arquivo.
 * Contém callbacks para: RestoreSessionModal, ClearProjectModal, LogoutConfirmModal.
 */

import { useCallback } from 'react';
import type {
  RestoreSessionCallbacks,
  ClearProjectCallbacks,
  ModalKey,
  AISettings,
} from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Subset of UseProofManagerReturn needed for session callbacks
 */
interface ProofManagerForSession {
  setProofFiles: ClearProjectCallbacks['setProofFiles'];
  setProofTexts: ClearProjectCallbacks['setProofTexts'];
  setProofUsePdfMode: ClearProjectCallbacks['setProofUsePdfMode'];
  setExtractedProofTexts: ClearProjectCallbacks['setExtractedProofTexts'];
  setProofExtractionFailed: ClearProjectCallbacks['setProofExtractionFailed'];
  setProofTopicLinks: ClearProjectCallbacks['setProofTopicLinks'];
  setProofAnalysisResults: ClearProjectCallbacks['setProofAnalysisResults'];
  setProofConclusions: ClearProjectCallbacks['setProofConclusions'];
  setProofSendFullContent: ClearProjectCallbacks['setProofSendFullContent'];
  setProofToDelete: ClearProjectCallbacks['setProofToDelete'];
  setProofToLink: ClearProjectCallbacks['setProofToLink'];
  setProofToAnalyze: ClearProjectCallbacks['setProofToAnalyze'];
  clearAnalyzingProofs: ClearProjectCallbacks['clearAnalyzingProofs'];
  setShowProofPanel: ClearProjectCallbacks['setShowProofPanel'];
  setNewProofTextData: ClearProjectCallbacks['setNewProofTextData'];
}

export interface UseSessionCallbacksProps {
  // Storage hook
  storage: {
    restoreSession: (callbacks: RestoreSessionCallbacks) => Promise<void>;
    clearProject: (callbacks: ClearProjectCallbacks) => void;
  };

  // AI Integration
  aiIntegration: {
    setAiSettings: (fn: (prev: AISettings) => AISettings) => void;
    setTokenMetrics: RestoreSessionCallbacks['setTokenMetrics'];
  };

  // Modal Manager
  openModal: (modal: ModalKey) => void;
  closeModal: (modal: ModalKey) => void;

  // Proof Manager
  proofManager: ProofManagerForSession;

  // Document setters
  setPastedPeticaoTexts: RestoreSessionCallbacks['setPastedPeticaoTexts'];
  setPastedContestacaoTexts: RestoreSessionCallbacks['setPastedContestacaoTexts'];
  setPastedComplementaryTexts: RestoreSessionCallbacks['setPastedComplementaryTexts'];
  setExtractedTopics: RestoreSessionCallbacks['setExtractedTopics'];
  setSelectedTopics: RestoreSessionCallbacks['setSelectedTopics'];
  setPartesProcesso: RestoreSessionCallbacks['setPartesProcesso'];
  setAnalyzedDocuments: RestoreSessionCallbacks['setAnalyzedDocuments'];
  setActiveTab: RestoreSessionCallbacks['setActiveTab'];
  setError: RestoreSessionCallbacks['setError'];
  setProcessoNumero: RestoreSessionCallbacks['setProcessoNumero'];
  setPeticaoFiles: NonNullable<RestoreSessionCallbacks['setPeticaoFiles']>;
  setContestacaoFiles: NonNullable<RestoreSessionCallbacks['setContestacaoFiles']>;
  setComplementaryFiles: NonNullable<RestoreSessionCallbacks['setComplementaryFiles']>;
  setExtractedTexts: NonNullable<RestoreSessionCallbacks['setExtractedTexts']>;
  setDocumentProcessingModes: NonNullable<RestoreSessionCallbacks['setDocumentProcessingModes']>;
  setAnonymizationNamesText: (value: string) => void;

  // Logout callback (optional - only provided when logged in)
  onLogout?: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

export function useSessionCallbacks(props: UseSessionCallbacksProps) {
  const {
    storage,
    aiIntegration,
    openModal,
    closeModal,
    proofManager,
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
    setAnonymizationNamesText,
    onLogout,
  } = props;

  /**
   * Handler para restaurar sessão salva
   */
  const handleRestoreSession = useCallback(() => {
    const callbacks: RestoreSessionCallbacks = {
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
      setExtractedTexts,
      setDocumentProcessingModes,
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
      closeModal,
      setError,
      setProcessoNumero,
      setTokenMetrics: aiIntegration.setTokenMetrics,
    };
    storage.restoreSession(callbacks);
  }, [
    storage,
    aiIntegration.setTokenMetrics,
    closeModal,
    proofManager,
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
  ]);

  /**
   * Handler para iniciar novo projeto (abre modal de confirmação)
   */
  const handleStartNew = useCallback(() => {
    closeModal('restoreSession');
    openModal('clearProject');
  }, [closeModal, openModal]);

  /**
   * Handler para fechar modal de limpar projeto (volta para restaurar)
   */
  const handleCloseClearProject = useCallback(() => {
    closeModal('clearProject');
    openModal('restoreSession');
  }, [closeModal, openModal]);

  /**
   * Handler para confirmar limpeza de projeto
   */
  const handleConfirmClear = useCallback(() => {
    const callbacks: ClearProjectCallbacks = {
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
      closeModal,
      setError,
      setProcessoNumero,
      setPeticaoFiles,
      setContestacaoFiles,
      setComplementaryFiles,
      setExtractedTexts,
      setDocumentProcessingModes,
      setProofToDelete: proofManager.setProofToDelete,
      setProofToLink: proofManager.setProofToLink,
      setProofToAnalyze: proofManager.setProofToAnalyze,
      clearAnalyzingProofs: proofManager.clearAnalyzingProofs,
      setShowProofPanel: proofManager.setShowProofPanel,
      setNewProofTextData: proofManager.setNewProofTextData,
      setTokenMetrics: aiIntegration.setTokenMetrics,
    };

    storage.clearProject(callbacks);

    // v1.25.19: Limpar nomes de anonimização ao limpar projeto
    aiIntegration.setAiSettings(prev => ({
      ...prev,
      anonymization: { ...prev.anonymization, nomesUsuario: [] }
    }));
    setAnonymizationNamesText('');
  }, [
    storage,
    aiIntegration,
    closeModal,
    proofManager,
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
    setAnonymizationNamesText,
  ]);

  /**
   * Handler para fechar modal de logout
   */
  const handleCloseLogout = useCallback(() => {
    closeModal('logout');
  }, [closeModal]);

  /**
   * Handler para confirmar logout
   */
  const handleConfirmLogout = useCallback(() => {
    closeModal('logout');
    if (onLogout) {
      onLogout();
      window.location.reload();
    }
  }, [closeModal, onLogout]);

  return {
    // RestoreSessionModal handlers
    handleRestoreSession,
    handleStartNew,

    // ClearProjectModal handlers
    handleCloseClearProject,
    handleConfirmClear,

    // LogoutConfirmModal handlers
    handleCloseLogout,
    handleConfirmLogout,
  };
}

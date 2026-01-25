/**
 * @file useProofModalCallbacks.ts
 * @description Hook para callbacks de modais relacionados a provas
 * @version 1.38.52
 *
 * Extraído do App.tsx para reduzir tamanho do arquivo.
 * Contém callbacks para: AddProofTextModal, AnonymizationNamesModal, ProofAnalysisModal, DeleteProofModal
 */

import { useCallback } from 'react';
import type {
  AISettings,
  ProofFile,
  ProofText,
  Proof,
  ModalKey,
} from '../types';
import { anonymizeText } from '../utils/text';
import { removePdfFromIndexedDB } from './usePdfStorage';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Proof Manager subset needed for proof modal callbacks
 */
interface ProofManagerForModals {
  newProofTextData: { name: string; text: string };
  setNewProofTextData: (data: { name: string; text: string }) => void;
  pendingProofText: { name: string; text: string } | null;
  setPendingProofText: (data: { name: string; text: string } | null) => void;
  pendingExtraction: {
    proofId: string | number;
    proof: Proof;
    executeExtraction?: (nomes: string[]) => void;
  } | null;
  setPendingExtraction: (data: {
    proofId: string | number;
    proof: Proof;
    executeExtraction?: (nomes: string[]) => void;
  } | null) => void;
  proofToAnalyze: ProofFile | ProofText | null;
  setProofToAnalyze: (proof: ProofFile | ProofText | null) => void;
  proofAnalysisCustomInstructions: string;
  setProofAnalysisCustomInstructions: (instructions: string) => void;
  useOnlyMiniRelatorios: boolean;
  setUseOnlyMiniRelatorios: (value: boolean) => void;
  includeLinkedTopicsInFree: boolean;
  setIncludeLinkedTopicsInFree: (value: boolean) => void;
  proofToDelete: ProofFile | ProofText | null;
  setProofToDelete: (proof: ProofFile | ProofText | null) => void;
  proofProcessingModes: Record<string, string>;
  setProofTexts: React.Dispatch<React.SetStateAction<ProofText[]>>;
  handleDeleteProof: (proof: ProofFile | ProofText) => void;
}

/**
 * AI Integration subset needed for proof modal callbacks
 */
interface AIIntegrationForProofModals {
  aiSettings: AISettings;
  setAiSettings: React.Dispatch<React.SetStateAction<AISettings>>;
}

/**
 * Document Services subset needed for proof modal callbacks
 */
interface DocumentServicesForProofModals {
  extractTextFromPDFWithMode: (
    file: File,
    mode: string,
    options: null
  ) => Promise<string | null>;
}

export interface UseProofModalCallbacksProps {
  proofManager: ProofManagerForModals;
  aiIntegration: AIIntegrationForProofModals;
  documentServices: DocumentServicesForProofModals;
  openModal: (modal: ModalKey) => void;
  closeModal: (modal: ModalKey) => void;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
  setDetectingNames: (detecting: boolean) => void;
  detectarNomesAutomaticamente: (text: string | undefined, isProof: boolean) => Promise<void>;
  analyzeProof: (
    proof: ProofFile | ProofText,
    type: 'contextual' | 'livre',
    customInstructions: string,
    useOnlyMiniRelatorios: boolean,
    includeLinkedTopicsInFree: boolean
  ) => Promise<void>;
}

export interface UseProofModalCallbacksReturn {
  // AddProofTextModal
  handleAddProofText: () => void;

  // AnonymizationNamesModal (proof text)
  handleProofTextAnonymizationClose: () => void;
  handleProofTextAnonymizationConfirm: (nomes: string[]) => void;
  handleProofTextAnonymizationDetect: () => Promise<void>;

  // AnonymizationNamesModal (extraction)
  handleProofExtractionAnonymizationClose: () => void;
  handleProofExtractionAnonymizationConfirm: (nomes: string[]) => void;
  handleProofExtractionAnonymizationDetect: () => Promise<void>;

  // ProofAnalysisModal
  handleProofAnalysisClose: () => void;
  handleAnalyzeContextual: () => Promise<void>;
  handleAnalyzeFree: () => Promise<void>;

  // DeleteProofModal
  handleDeleteProofClose: () => void;
  handleDeleteProofConfirm: () => Promise<void>;
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

export function useProofModalCallbacks(props: UseProofModalCallbacksProps): UseProofModalCallbacksReturn {
  const {
    proofManager,
    aiIntegration,
    documentServices,
    openModal,
    closeModal,
    showToast,
    setDetectingNames,
    detectarNomesAutomaticamente,
    analyzeProof,
  } = props;

  // ═══════════════════════════════════════════════════════════════════════════
  // AddProofTextModal Callbacks
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Handle adding a proof text (from AddProofTextModal)
   */
  const handleAddProofText = useCallback(() => {
    if (proofManager.newProofTextData.text.trim()) {
      const anonConfig = aiIntegration?.aiSettings?.anonymization;
      const anonymizationEnabled = anonConfig?.enabled;

      // If anonymization is active, open modal to confirm names
      if (anonymizationEnabled) {
        proofManager.setPendingProofText({
          name: proofManager.newProofTextData.name.trim() || 'Prova (texto)',
          text: proofManager.newProofTextData.text.trim()
        });
        closeModal('addProofText');
        openModal('proofTextAnonymization');
      } else {
        // Save directly without anonymization
        const id = Date.now() + Math.random();
        const name = proofManager.newProofTextData.name.trim() || 'Prova (texto)';
        proofManager.setProofTexts(prev => [...prev, {
          id,
          text: proofManager.newProofTextData.text.trim(),
          name,
          type: 'text',
          uploadDate: new Date().toISOString()
        }]);
        closeModal('addProofText');
        proofManager.setNewProofTextData({ name: '', text: '' });
      }
    }
  }, [proofManager, aiIntegration, closeModal, openModal]);

  // ═══════════════════════════════════════════════════════════════════════════
  // AnonymizationNamesModal (Proof Text) Callbacks
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Close proof text anonymization modal
   */
  const handleProofTextAnonymizationClose = useCallback(() => {
    closeModal('proofTextAnonymization');
    proofManager.setPendingProofText(null);
    proofManager.setNewProofTextData({ name: '', text: '' });
  }, [closeModal, proofManager]);

  /**
   * Confirm proof text anonymization with names
   */
  const handleProofTextAnonymizationConfirm = useCallback((nomes: string[]) => {
    if (proofManager.pendingProofText) {
      const anonConfig = aiIntegration?.aiSettings?.anonymization;

      // Persist names for future use
      aiIntegration.setAiSettings((prev: AISettings) => ({
        ...prev,
        anonymization: {
          ...prev.anonymization,
          nomesUsuario: nomes
        }
      }));

      // Anonymize and save proof
      const pendingProof = proofManager.pendingProofText;
      if (!pendingProof) return;

      const id = Date.now() + Math.random();
      const anonText = anonymizeText(pendingProof.text, anonConfig, nomes);

      proofManager.setProofTexts((prev: ProofText[]) => [...prev, {
        id,
        text: anonText,
        name: pendingProof.name,
        type: 'text',
        uploadDate: new Date().toISOString()
      }]);

      closeModal('proofTextAnonymization');
      proofManager.setPendingProofText(null);
      proofManager.setNewProofTextData({ name: '', text: '' });
      showToast('✅ Prova de texto adicionada com anonimização', 'success');
    }
  }, [proofManager, aiIntegration, closeModal, showToast]);

  /**
   * Detect names automatically for proof text anonymization
   */
  const handleProofTextAnonymizationDetect = useCallback(async () => {
    setDetectingNames(true);
    try {
      await detectarNomesAutomaticamente(proofManager.pendingProofText?.text, true);
    } catch {
      setDetectingNames(false);
    }
  }, [proofManager, setDetectingNames, detectarNomesAutomaticamente]);

  // ═══════════════════════════════════════════════════════════════════════════
  // AnonymizationNamesModal (Extraction) Callbacks
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Close proof extraction anonymization modal
   */
  const handleProofExtractionAnonymizationClose = useCallback(() => {
    closeModal('proofExtractionAnonymization');
    proofManager.setPendingExtraction(null);
  }, [closeModal, proofManager]);

  /**
   * Confirm proof extraction anonymization with names
   */
  const handleProofExtractionAnonymizationConfirm = useCallback((nomes: string[]) => {
    if (proofManager.pendingExtraction) {
      // Persist names for future use
      aiIntegration.setAiSettings((prev: AISettings) => ({
        ...prev,
        anonymization: {
          ...prev.anonymization,
          nomesUsuario: nomes
        }
      }));

      // Execute extraction with confirmed names
      proofManager.pendingExtraction?.executeExtraction?.(nomes);
      closeModal('proofExtractionAnonymization');
      proofManager.setPendingExtraction(null);
      showToast('📝 Extraindo texto com anonimização...', 'info');
    }
  }, [proofManager, aiIntegration, closeModal, showToast]);

  /**
   * Detect names automatically for proof extraction anonymization
   */
  const handleProofExtractionAnonymizationDetect = useCallback(async () => {
    setDetectingNames(true);
    try {
      const proofId = proofManager.pendingExtraction?.proofId;
      const proof = proofManager.pendingExtraction?.proof as ProofFile | undefined;

      if (!proof || !proof.file) {
        showToast('Prova não encontrada ou arquivo indisponível', 'error');
        setDetectingNames(false);
        return;
      }

      // Use the extraction mode selected by user
      const userMode = proofManager.proofProcessingModes[proofId as string] || 'pdfjs';
      // Block binary modes (anonymization always requires text)
      const blockedModes = ['claude-vision', 'pdf-puro'];
      const selectedMode = blockedModes.includes(userMode) ? 'pdfjs' : userMode;

      // Extract text with correct mode (PDF.js or Tesseract)
      const extractedText = await documentServices.extractTextFromPDFWithMode(proof.file, selectedMode, null);

      if (extractedText && extractedText.trim().length > 50) {
        await detectarNomesAutomaticamente(extractedText, true);
      } else {
        showToast('PDF sem texto extraível. Tente modo Tesseract OCR.', 'error');
        setDetectingNames(false);
      }
    } catch (err) {
      console.error('[NER] Erro ao extrair PDF para NER:', err);
      showToast('Erro ao extrair texto do PDF', 'error');
      setDetectingNames(false);
    }
  }, [proofManager, documentServices, showToast, setDetectingNames, detectarNomesAutomaticamente]);

  // ═══════════════════════════════════════════════════════════════════════════
  // ProofAnalysisModal Callbacks
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Close proof analysis modal
   */
  const handleProofAnalysisClose = useCallback(() => {
    closeModal('proofAnalysis');
    proofManager.setProofToAnalyze(null);
    proofManager.setProofAnalysisCustomInstructions('');
    proofManager.setUseOnlyMiniRelatorios(false);
    proofManager.setIncludeLinkedTopicsInFree(false);
  }, [closeModal, proofManager]);

  /**
   * Analyze proof with contextual analysis
   */
  const handleAnalyzeContextual = useCallback(async () => {
    closeModal('proofAnalysis');
    if (proofManager.proofToAnalyze) {
      await analyzeProof(
        proofManager.proofToAnalyze,
        'contextual',
        proofManager.proofAnalysisCustomInstructions,
        proofManager.useOnlyMiniRelatorios,
        false
      );
    }
    proofManager.setProofToAnalyze(null);
    proofManager.setProofAnalysisCustomInstructions('');
    proofManager.setUseOnlyMiniRelatorios(false);
    proofManager.setIncludeLinkedTopicsInFree(false);
  }, [closeModal, proofManager, analyzeProof]);

  /**
   * Analyze proof with free analysis
   */
  const handleAnalyzeFree = useCallback(async () => {
    closeModal('proofAnalysis');
    if (proofManager.proofToAnalyze) {
      await analyzeProof(
        proofManager.proofToAnalyze,
        'livre',
        proofManager.proofAnalysisCustomInstructions,
        false,
        proofManager.includeLinkedTopicsInFree
      );
    }
    proofManager.setProofToAnalyze(null);
    proofManager.setProofAnalysisCustomInstructions('');
    proofManager.setUseOnlyMiniRelatorios(false);
    proofManager.setIncludeLinkedTopicsInFree(false);
  }, [closeModal, proofManager, analyzeProof]);

  // ═══════════════════════════════════════════════════════════════════════════
  // DeleteProofModal Callbacks
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Close delete proof modal
   */
  const handleDeleteProofClose = useCallback(() => {
    closeModal('deleteProof');
    proofManager.setProofToDelete(null);
  }, [closeModal, proofManager]);

  /**
   * Confirm deletion of proof
   */
  const handleDeleteProofConfirm = useCallback(async () => {
    const proofToDelete = proofManager.proofToDelete;
    if (!proofToDelete) return;

    // Clean up IndexedDB if it's a PDF
    if ('isPdf' in proofToDelete && proofToDelete.isPdf || ('type' in proofToDelete && proofToDelete.type === 'pdf')) {
      try {
        await removePdfFromIndexedDB(`proof-${proofToDelete.id}`);
      } catch (err) {
        console.warn('[App] Falha ao remover PDF do IndexedDB:', err);
      }
    }

    // Use existing handler from hook (correct typing, cleans all states)
    proofManager.handleDeleteProof(proofToDelete);

    closeModal('deleteProof');
    proofManager.setProofToDelete(null);
  }, [proofManager, closeModal]);

  return {
    // AddProofTextModal
    handleAddProofText,

    // AnonymizationNamesModal (proof text)
    handleProofTextAnonymizationClose,
    handleProofTextAnonymizationConfirm,
    handleProofTextAnonymizationDetect,

    // AnonymizationNamesModal (extraction)
    handleProofExtractionAnonymizationClose,
    handleProofExtractionAnonymizationConfirm,
    handleProofExtractionAnonymizationDetect,

    // ProofAnalysisModal
    handleProofAnalysisClose,
    handleAnalyzeContextual,
    handleAnalyzeFree,

    // DeleteProofModal
    handleDeleteProofClose,
    handleDeleteProofConfirm,
  };
}

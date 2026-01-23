/**
 * @file useProofManager.ts
 * @description Hook para gerenciamento de provas (PDFs e textos)
 * @version 1.38.40
 *
 * FASE 3 Etapa 3.2: Importa de 2 stores (useProofsStore + useProofUIStore).
 * API externa mantida compatível.
 * v1.38.23: Migração completa para seletores diretos do Zustand
 * v1.36.76: Extraído do App.tsx
 */

import React from 'react';
import { useProofsStore } from '../stores/useProofsStore';
import { useProofUIStore } from '../stores/useProofUIStore';
import { savePdfToIndexedDB } from './useLocalStorage';
import type { ProofFile, ProofText, Proof } from '../types';

/**
 * Hook para gerenciamento de provas
 * Usa seletores diretos do store Zustand + handlers com I/O (IndexedDB)
 *
 * @param _documentServices - Parâmetro legacy (não utilizado, mantido para compatibilidade)
 * @returns Estados e handlers para gerenciar provas
 */
const useProofManager = (_documentServices: unknown = null) => {
  // ═══════════════════════════════════════════════════════════════════════════
  // SELETORES DIRETOS DO STORE
  // ═══════════════════════════════════════════════════════════════════════════

  // Core Data States
  const proofFiles = useProofsStore((s) => s.proofFiles);
  const proofTexts = useProofsStore((s) => s.proofTexts);
  const proofUsePdfMode = useProofsStore((s) => s.proofUsePdfMode);
  const extractedProofTexts = useProofsStore((s) => s.extractedProofTexts);
  const proofExtractionFailed = useProofsStore((s) => s.proofExtractionFailed);
  const proofTopicLinks = useProofsStore((s) => s.proofTopicLinks);
  const proofAnalysisResults = useProofsStore((s) => s.proofAnalysisResults);
  const proofConclusions = useProofsStore((s) => s.proofConclusions);
  const proofProcessingModes = useProofsStore((s) => s.proofProcessingModes);
  const proofSendFullContent = useProofsStore((s) => s.proofSendFullContent);

  // UI/Control States (useProofUIStore)
  const pendingProofText = useProofUIStore((s) => s.pendingProofText);
  const pendingExtraction = useProofUIStore((s) => s.pendingExtraction);
  const pendingChatMessage = useProofUIStore((s) => s.pendingChatMessage);
  const analyzingProofIds = useProofUIStore((s) => s.analyzingProofIds);
  const showProofPanel = useProofUIStore((s) => s.showProofPanel);
  const newProofTextData = useProofUIStore((s) => s.newProofTextData);
  const proofToDelete = useProofUIStore((s) => s.proofToDelete);
  const proofToLink = useProofUIStore((s) => s.proofToLink);
  const proofToAnalyze = useProofUIStore((s) => s.proofToAnalyze);
  const proofAnalysisCustomInstructions = useProofUIStore((s) => s.proofAnalysisCustomInstructions);
  const useOnlyMiniRelatorios = useProofUIStore((s) => s.useOnlyMiniRelatorios);
  const includeLinkedTopicsInFree = useProofUIStore((s) => s.includeLinkedTopicsInFree);

  // Core Setters
  const setProofFiles = useProofsStore((s) => s.setProofFiles);
  const setProofTexts = useProofsStore((s) => s.setProofTexts);
  const setProofUsePdfMode = useProofsStore((s) => s.setProofUsePdfMode);
  const setExtractedProofTexts = useProofsStore((s) => s.setExtractedProofTexts);
  const setProofExtractionFailed = useProofsStore((s) => s.setProofExtractionFailed);
  const setProofTopicLinks = useProofsStore((s) => s.setProofTopicLinks);
  const setProofAnalysisResults = useProofsStore((s) => s.setProofAnalysisResults);
  const setProofConclusions = useProofsStore((s) => s.setProofConclusions);
  const setProofProcessingModes = useProofsStore((s) => s.setProofProcessingModes);
  const setProofSendFullContent = useProofsStore((s) => s.setProofSendFullContent);

  // UI/Control Setters (useProofUIStore)
  const setPendingProofText = useProofUIStore((s) => s.setPendingProofText);
  const setPendingExtraction = useProofUIStore((s) => s.setPendingExtraction);
  const setPendingChatMessage = useProofUIStore((s) => s.setPendingChatMessage);
  const setShowProofPanel = useProofUIStore((s) => s.setShowProofPanel);
  const setNewProofTextData = useProofUIStore((s) => s.setNewProofTextData);
  const setProofToDelete = useProofUIStore((s) => s.setProofToDelete);
  const setProofToLink = useProofUIStore((s) => s.setProofToLink);
  const setProofToAnalyze = useProofUIStore((s) => s.setProofToAnalyze);
  const setProofAnalysisCustomInstructions = useProofUIStore((s) => s.setProofAnalysisCustomInstructions);
  const setUseOnlyMiniRelatorios = useProofUIStore((s) => s.setUseOnlyMiniRelatorios);
  const setIncludeLinkedTopicsInFree = useProofUIStore((s) => s.setIncludeLinkedTopicsInFree);

  // UI Actions (useProofUIStore)
  const addAnalyzingProof = useProofUIStore((s) => s.addAnalyzingProof);
  const removeAnalyzingProof = useProofUIStore((s) => s.removeAnalyzingProof);
  const isAnalyzingProof = useProofUIStore((s) => s.isAnalyzingProof);
  const clearAnalyzingProofs = useProofUIStore((s) => s.clearAnalyzingProofs);
  const handleToggleProofMode = useProofsStore((s) => s.handleToggleProofMode);
  const handleLinkProof = useProofsStore((s) => s.handleLinkProof);
  const handleUnlinkProof = useProofsStore((s) => s.handleUnlinkProof);
  const handleSaveProofConclusion = useProofsStore((s) => s.handleSaveProofConclusion);

  // Proof Analysis Actions (v1.38.27)
  const addProofAnalysis = useProofsStore((s) => s.addProofAnalysis);
  const removeProofAnalysis = useProofsStore((s) => s.removeProofAnalysis);

  // Attachment Actions (v1.38.8)
  const addAttachment = useProofsStore((s) => s.addAttachment);
  const removeAttachment = useProofsStore((s) => s.removeAttachment);
  const updateAttachmentExtractedText = useProofsStore((s) => s.updateAttachmentExtractedText);
  const updateAttachmentProcessingMode = useProofsStore((s) => s.updateAttachmentProcessingMode);

  // Persistence
  const serializeForPersistence = useProofsStore((s) => s.serializeForPersistence);
  const restoreFromPersistence = useProofsStore((s) => s.restoreFromPersistence);
  const resetAll = useProofsStore((s) => s.resetAll);

  // Computed helpers
  const totalProofs = proofFiles.length + proofTexts.length;
  const hasProofs = totalProofs > 0;

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS COM I/O (INDEXEDDB)
  // ═══════════════════════════════════════════════════════════════════════════

  const removeById = React.useCallback(<T extends { id: string | number }>(arr: T[], id: string | number): T[] => arr.filter((item: T) => item.id !== id), []);
  const toFilesArray = React.useCallback((value: FileList | File[] | null) => Array.isArray(value) ? value : Array.from(value || []), []);

  // Handler: Upload de provas em PDF (usa savePdfToIndexedDB externo)
  const handleUploadProofPdf = React.useCallback(async (files: FileList | File[]) => {
    const filesArray = toFilesArray(files);

    for (const file of filesArray) {
      const id = Date.now() + Math.random();
      const newProof: ProofFile = {
        id,
        file,
        name: file.name,
        type: 'pdf',
        size: file.size,
        uploadDate: new Date().toISOString()
      };

      setProofFiles(prev => [...prev, newProof]);
      setProofUsePdfMode(prev => ({ ...prev, [id]: true }));
      setProofProcessingModes(prev => ({ ...prev, [id]: 'pdfjs' }));

      // Salvar no IndexedDB para persistência entre reloads
      try {
        await savePdfToIndexedDB(`proof-${id}`, file, 'proof');
      } catch (err) {
        // Silently ignore - PDF won't persist but app continues working
      }
    }
  }, [toFilesArray, setProofFiles, setProofUsePdfMode, setProofProcessingModes]);

  // Handler: Adicionar prova em texto
  const handleAddProofText = React.useCallback(() => {
    if (!newProofTextData.name.trim() || !newProofTextData.text.trim()) {
      return;
    }

    const id = Date.now() + Math.random();
    const newProof: ProofText = {
      id,
      text: newProofTextData.text,
      name: newProofTextData.name,
      type: 'text',
      uploadDate: new Date().toISOString()
    };

    setProofTexts(prev => [...prev, newProof]);
    setNewProofTextData({ name: '', text: '' });
  }, [newProofTextData, setProofTexts, setNewProofTextData]);

  // Handler: Deletar prova (PDF ou texto)
  const handleDeleteProof = React.useCallback((proof: Proof) => {
    if (proof.isPdf || proof.type === 'pdf') {
      setProofFiles(prev => removeById(prev, proof.id));
    } else {
      setProofTexts(prev => removeById(prev, proof.id));
    }
    // Limpar dados relacionados
    setProofUsePdfMode(prev => { const { [proof.id]: _, ...rest } = prev; return rest; });
    setExtractedProofTexts(prev => { const { [proof.id]: _, ...rest } = prev; return rest; });
    setProofExtractionFailed(prev => { const { [proof.id]: _, ...rest } = prev; return rest; });
    setProofTopicLinks(prev => { const { [proof.id]: _, ...rest } = prev; return rest; });
    setProofAnalysisResults(prev => { const { [proof.id]: _, ...rest } = prev; return rest; });
    setProofConclusions(prev => { const { [proof.id]: _, ...rest } = prev; return rest; });
    setProofProcessingModes(prev => { const { [proof.id]: _, ...rest } = prev; return rest; });
  }, [removeById, setProofFiles, setProofTexts, setProofUsePdfMode, setExtractedProofTexts, setProofExtractionFailed, setProofTopicLinks, setProofAnalysisResults, setProofConclusions, setProofProcessingModes]);

  // ═══════════════════════════════════════════════════════════════════════════
  // RETORNO
  // ═══════════════════════════════════════════════════════════════════════════

  return {
    // Estados Core de Dados (13)
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

    // Estados de UI/Controle (10)
    analyzingProofIds,
    isAnalyzingProof,
    showProofPanel,
    newProofTextData,
    proofToDelete,
    proofToLink,
    proofToAnalyze,
    proofAnalysisCustomInstructions,
    useOnlyMiniRelatorios,
    includeLinkedTopicsInFree,

    // Setters Core (13)
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

    // Setters UI/Controle (9)
    addAnalyzingProof,
    removeAnalyzingProof,
    clearAnalyzingProofs,
    setShowProofPanel,
    setNewProofTextData,
    setProofToDelete,
    setProofToLink,
    setProofToAnalyze,
    setProofAnalysisCustomInstructions,
    setUseOnlyMiniRelatorios,
    setIncludeLinkedTopicsInFree,

    // Helpers (2)
    totalProofs,
    hasProofs,

    // Handlers do Store (4)
    handleToggleProofMode,
    handleLinkProof,
    handleUnlinkProof,
    handleSaveProofConclusion,

    // Proof Analysis Actions (2) - v1.38.27
    addProofAnalysis,
    removeProofAnalysis,

    // Attachment Actions (4) - v1.38.8, v1.38.10
    addAttachment,
    removeAttachment,
    updateAttachmentExtractedText,
    updateAttachmentProcessingMode,

    // Métodos de Persistência (3)
    serializeForPersistence,
    restoreFromPersistence,
    resetAll,

    // Handlers com I/O (3) - específicos deste hook
    handleUploadProofPdf,
    handleAddProofText,
    handleDeleteProof
  };
};

/**
 * Interface de retorno do useProofManager
 */
export type UseProofManagerReturn = ReturnType<typeof useProofManager>;

export { useProofManager };

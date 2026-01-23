/**
 * @file useProofModalHandlers.ts
 * @description Handlers simples para modais de provas
 * @version 1.37.73
 *
 * Este hook fornece callbacks simples para modais de provas que
 * funcionam apenas com Zustand, sem dependências externas.
 *
 * @usedBy ModalRoot, ProofModals
 */

import { useCallback } from 'react';
import { useProofsStore } from '../stores/useProofsStore';
import { useProofUIStore } from '../stores/useProofUIStore';
import { useUIStore } from '../stores/useUIStore';
import type { Proof, ProofFile, ProofText } from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

export interface UseProofModalHandlersReturn {
  // Handlers de exclusão
  confirmDeleteProof: () => void;
  cancelDeleteProof: () => void;

  // Handlers de vinculação
  cancelLinkProof: () => void;

  // Handlers de análise
  cancelProofAnalysis: () => void;

  // Handlers de texto
  cancelAddProofText: () => void;

  // Handlers de preparação (abre modais)
  openDeleteProofModal: (proof: Proof) => void;
  openLinkProofModal: (proof: Proof) => void;
  openProofAnalysisModal: (proof: Proof) => void;
  openAddProofTextModal: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook com handlers simples para modais de provas
 *
 * @description Fornece callbacks que funcionam apenas com Zustand:
 * - Confirmar/cancelar exclusão de prova
 * - Cancelar vinculação de prova
 * - Cancelar análise de prova
 *
 * @returns Handlers para operações simples de provas
 */
export function useProofModalHandlers(): UseProofModalHandlersReturn {
  // ═══════════════════════════════════════════════════════════════════════
  // ESTADO DOS STORES
  // ═══════════════════════════════════════════════════════════════════════

  const closeModal = useUIStore((s) => s.closeModal);
  const openModal = useUIStore((s) => s.openModal);

  const proofToDelete = useProofUIStore((s) => s.proofToDelete);
  const setProofToDelete = useProofUIStore((s) => s.setProofToDelete);
  const proofFiles = useProofsStore((s) => s.proofFiles);
  const setProofFiles = useProofsStore((s) => s.setProofFiles);
  const proofTexts = useProofsStore((s) => s.proofTexts);
  const setProofTexts = useProofsStore((s) => s.setProofTexts);
  const setProofToLink = useProofUIStore((s) => s.setProofToLink);
  const setProofToAnalyze = useProofUIStore((s) => s.setProofToAnalyze);
  const setNewProofTextData = useProofUIStore((s) => s.setNewProofTextData);

  // ═══════════════════════════════════════════════════════════════════════
  // HANDLERS: EXCLUSÃO DE PROVA
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Confirma exclusão da prova selecionada
   * Remove a prova da lista correspondente (PDF ou texto)
   */
  const confirmDeleteProof = useCallback(() => {
    if (!proofToDelete) return;

    const deleteId = String((proofToDelete as ProofFile | ProofText).id);

    // Verifica se é prova de arquivo (ProofFile) ou texto (ProofText)
    if ('file' in proofToDelete || 'type' in proofToDelete) {
      // É um ProofFile (tem 'file' ou 'type')
      setProofFiles((prev: ProofFile[]) =>
        prev.filter((p) => String(p.id) !== deleteId)
      );
    } else {
      // É um ProofText
      setProofTexts((prev: ProofText[]) =>
        prev.filter((p) => String(p.id) !== deleteId)
      );
    }

    // Limpa estado e fecha modal
    setProofToDelete(null);
    closeModal('deleteProof');
  }, [proofToDelete, setProofFiles, setProofTexts, setProofToDelete, closeModal]);

  const cancelDeleteProof = useCallback(() => {
    setProofToDelete(null);
    closeModal('deleteProof');
  }, [setProofToDelete, closeModal]);

  // ═══════════════════════════════════════════════════════════════════════
  // HANDLERS: VINCULAÇÃO
  // ═══════════════════════════════════════════════════════════════════════

  const cancelLinkProof = useCallback(() => {
    setProofToLink(null);
    closeModal('linkProof');
  }, [setProofToLink, closeModal]);

  // ═══════════════════════════════════════════════════════════════════════
  // HANDLERS: ANÁLISE
  // ═══════════════════════════════════════════════════════════════════════

  const cancelProofAnalysis = useCallback(() => {
    setProofToAnalyze(null);
    closeModal('proofAnalysis');
  }, [setProofToAnalyze, closeModal]);

  // ═══════════════════════════════════════════════════════════════════════
  // HANDLERS: ADICIONAR TEXTO
  // ═══════════════════════════════════════════════════════════════════════

  const cancelAddProofText = useCallback(() => {
    setNewProofTextData({ name: '', text: '' });
    closeModal('addProofText');
  }, [setNewProofTextData, closeModal]);

  // ═══════════════════════════════════════════════════════════════════════
  // HANDLERS: ABRIR MODAIS
  // ═══════════════════════════════════════════════════════════════════════

  const openDeleteProofModal = useCallback((proof: Proof) => {
    setProofToDelete(proof);
    openModal('deleteProof');
  }, [setProofToDelete, openModal]);

  const openLinkProofModal = useCallback((proof: Proof) => {
    setProofToLink(proof);
    openModal('linkProof');
  }, [setProofToLink, openModal]);

  const openProofAnalysisModal = useCallback((proof: Proof) => {
    setProofToAnalyze(proof);
    openModal('proofAnalysis');
  }, [setProofToAnalyze, openModal]);

  const openAddProofTextModal = useCallback(() => {
    setNewProofTextData({ name: '', text: '' });
    openModal('addProofText');
  }, [setNewProofTextData, openModal]);

  // ═══════════════════════════════════════════════════════════════════════
  // RETORNO
  // ═══════════════════════════════════════════════════════════════════════

  return {
    // Exclusão
    confirmDeleteProof,
    cancelDeleteProof,

    // Vinculação
    cancelLinkProof,

    // Análise
    cancelProofAnalysis,

    // Texto
    cancelAddProofText,

    // Abrir modais
    openDeleteProofModal,
    openLinkProofModal,
    openProofAnalysisModal,
    openAddProofTextModal,
  };
}

export default useProofModalHandlers;

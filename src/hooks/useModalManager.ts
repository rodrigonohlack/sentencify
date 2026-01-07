/**
 * 🎣 CUSTOM HOOK: useModalManager - Gerenciamento de modais
 * Extraído do App.jsx para facilitar testes
 *
 * @version 1.35.76 - Migrado para TypeScript
 */
import { useState, useCallback, useMemo } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

/** Lista de modais disponíveis (const assertion para type-safety) */
export const MODAL_NAMES = [
  'modelForm', 'extractModelConfirm', 'extractedModelPreview',
  'export', 'import', 'exportModels', 'deleteModel', 'deleteAllModels',
  'deleteAllPrecedentes', 'rename', 'merge', 'split', 'newTopic',
  'deleteTopic', 'aiAssistant', 'aiAssistantModel', 'analysis',
  'settings', 'dispositivo', 'restoreSession', 'clearProject',
  'bulkModel', 'bulkReview', 'bulkDiscardConfirm', 'confirmBulkCancel',
  'addProofText', 'deleteProof', 'linkProof', 'proofAnalysis',
  'globalEditor', 'jurisIndividual', 'proofTextAnonymization',
  'proofExtractionAnonymization', 'sentenceReview', 'sentenceReviewResult'
] as const;

/** Tipo derivado da lista de modais */
export type ModalName = typeof MODAL_NAMES[number];

/** Estado de todos os modais (boolean por nome) */
export type ModalState = Record<ModalName, boolean>;

/** Estado do preview de texto */
export interface TextPreviewState {
  isOpen: boolean;
  title: string;
  text: string;
}

/** Retorno do hook useModalManager */
export interface UseModalManagerReturn {
  modals: ModalState;
  openModal: (modalName: ModalName) => void;
  closeModal: (modalName: ModalName) => void;
  closeAllModals: () => void;
  isAnyModalOpen: boolean;
  textPreview: TextPreviewState;
  setTextPreview: React.Dispatch<React.SetStateAction<TextPreviewState>>;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/** Cria estado inicial dos modais (todos fechados) */
const createInitialState = (): ModalState =>
  MODAL_NAMES.reduce((acc, name) => ({ ...acc, [name]: false }), {} as ModalState);

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

const useModalManager = (): UseModalManagerReturn => {
  const [modals, setModals] = useState<ModalState>(createInitialState);
  const [textPreview, setTextPreview] = useState<TextPreviewState>({
    isOpen: false,
    title: '',
    text: ''
  });

  const openModal = useCallback((modalName: ModalName) => {
    setModals(prev => ({ ...prev, [modalName]: true }));
  }, []);

  const closeModal = useCallback((modalName: ModalName) => {
    setModals(prev => ({ ...prev, [modalName]: false }));
  }, []);

  const closeAllModals = useCallback(() => {
    setModals(prev =>
      Object.keys(prev).reduce((acc, key) => ({ ...acc, [key]: false }), {} as ModalState)
    );
  }, []);

  const isAnyModalOpen = useMemo(() => {
    return Object.values(modals).some(value => value === true);
  }, [modals]);

  return {
    modals,
    openModal,
    closeModal,
    closeAllModals,
    isAnyModalOpen,
    textPreview,
    setTextPreview
  };
};

export default useModalManager;

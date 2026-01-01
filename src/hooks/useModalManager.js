// 🎣 CUSTOM HOOK: useModalManager - Gerenciamento de modais
// Extraído do App.jsx para facilitar testes
import React, { useState } from 'react';

// Lista de modais disponíveis
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
];

// Estado inicial dos modais (todos fechados)
const createInitialState = () => 
  MODAL_NAMES.reduce((acc, name) => ({ ...acc, [name]: false }), {});

const useModalManager = () => {
  const [modals, setModals] = useState(createInitialState);
  const [textPreview, setTextPreview] = useState({ isOpen: false, title: '', text: '' });

  const openModal = React.useCallback((modalName) => {
    setModals(prev => ({ ...prev, [modalName]: true }));
  }, []);

  const closeModal = React.useCallback((modalName) => {
    setModals(prev => ({ ...prev, [modalName]: false }));
  }, []);

  const closeAllModals = React.useCallback(() => {
    setModals(prev => Object.keys(prev).reduce((acc, key) => ({ ...acc, [key]: false }), {}));
  }, []);

  const isAnyModalOpen = React.useMemo(() => {
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

/**
 * @file useModalManager.ts
 * @description Hook para gerenciamento de modais da aplicação
 * @version 1.38.23
 *
 * v1.38.23: Migração completa para seletores diretos do Zustand
 * v1.36.78: Extraído do App.tsx
 * v1.36.61: Estado migrado para Zustand
 */

import { useUIStore, selectIsAnyModalOpen } from '../stores/useUIStore';

/**
 * Hook para gerenciamento de modais
 * Usa seletores diretos do store Zustand
 *
 * @returns Estados e handlers para controle de modais
 */
const useModalManager = () => {
  // Estados de modais
  const modals = useUIStore((s) => s.modals);
  const openModal = useUIStore((s) => s.openModal);
  const closeModal = useUIStore((s) => s.closeModal);
  const closeAllModals = useUIStore((s) => s.closeAllModals);
  const isAnyModalOpen = useUIStore(selectIsAnyModalOpen);

  // Preview de texto
  const textPreview = useUIStore((s) => s.textPreview);
  const setTextPreview = useUIStore((s) => s.setTextPreview);

  // Toast (v1.37.38)
  const toast = useUIStore((s) => s.toast);
  const showToast = useUIStore((s) => s.showToast);
  const clearToast = useUIStore((s) => s.clearToast);

  return {
    modals,
    openModal,
    closeModal,
    closeAllModals,
    isAnyModalOpen,
    textPreview,
    setTextPreview,
    toast,
    showToast,
    clearToast,
  };
};

/**
 * Tipo de retorno do useModalManager
 */
export type UseModalManagerReturn = ReturnType<typeof useModalManager>;

export { useModalManager };

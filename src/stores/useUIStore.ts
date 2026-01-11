/**
 * @file useUIStore.ts
 * @description Store Zustand para estado de UI (modais, tema, preview)
 * @version 1.36.61
 *
 * Este store centraliza o estado de UI que antes estava distribuído
 * em múltiplos hooks e componentes.
 *
 * @replaces useModalManager (parcialmente)
 * @usedBy App.tsx, todos os componentes que usam modais
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { ModalKey, ModalState, TextPreviewState } from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// SEÇÃO 1: TIPOS DO STORE
// ═══════════════════════════════════════════════════════════════════════════

/** Estado inicial dos modais */
const initialModalState: ModalState = {
  modelForm: false,
  extractModelConfirm: false,
  extractedModelPreview: false,
  export: false,
  import: false,
  exportModels: false,
  deleteModel: false,
  deleteAllModels: false,
  deleteAllPrecedentes: false,
  deleteAllLegislacao: false,
  rename: false,
  merge: false,
  split: false,
  newTopic: false,
  deleteTopic: false,
  aiAssistant: false,
  aiAssistantModel: false,
  analysis: false,
  settings: false,
  dispositivo: false,
  restoreSession: false,
  clearProject: false,
  bulkModel: false,
  bulkReview: false,
  bulkDiscardConfirm: false,
  confirmBulkCancel: false,
  addProofText: false,
  deleteProof: false,
  linkProof: false,
  proofAnalysis: false,
  globalEditor: false,
  jurisIndividual: false,
  factsComparisonIndividual: false,
  proofTextAnonymization: false,
  proofExtractionAnonymization: false,
  sentenceReview: false,
  sentenceReviewResult: false,
  logout: false,
  shareLibrary: false,
  changelog: false,
  topicCuration: false,
  modelGenerator: false,
  regenerateRelatorioCustom: false,
  bulkModal: false,
};

/** Estado inicial do preview de texto */
const initialTextPreviewState: TextPreviewState = {
  isOpen: false,
  title: '',
  text: '',
};

/** Interface do estado do store */
interface UIState {
  // Estado
  modals: ModalState;
  textPreview: TextPreviewState;

  // Actions - Modais
  openModal: (modalName: ModalKey) => void;
  closeModal: (modalName: ModalKey) => void;
  closeAllModals: () => void;
  toggleModal: (modalName: ModalKey) => void;

  // Actions - Text Preview
  setTextPreview: (preview: TextPreviewState) => void;
  openTextPreview: (title: string, text: string) => void;
  closeTextPreview: () => void;

  // Computed (via selectors)
  // isAnyModalOpen é um selector, não uma action
}

// ═══════════════════════════════════════════════════════════════════════════
// SEÇÃO 2: STORE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Store de UI - Gerencia modais e estado visual
 *
 * @example
 * // Uso básico
 * const { openModal, closeModal } = useUIStore();
 * openModal('settings');
 *
 * @example
 * // Com selector para evitar re-renders
 * const isSettingsOpen = useUIStore((s) => s.modals.settings);
 */
export const useUIStore = create<UIState>()(
  devtools(
    immer((set) => ({
      // Estado inicial
      modals: initialModalState,
      textPreview: initialTextPreviewState,

      // ─────────────────────────────────────────────────────────────────────
      // Actions - Modais
      // ─────────────────────────────────────────────────────────────────────

      openModal: (modalName: ModalKey) =>
        set(
          (state) => {
            state.modals[modalName] = true;
          },
          false,
          `openModal/${modalName}`
        ),

      closeModal: (modalName: ModalKey) =>
        set(
          (state) => {
            state.modals[modalName] = false;
          },
          false,
          `closeModal/${modalName}`
        ),

      closeAllModals: () =>
        set(
          (state) => {
            (Object.keys(state.modals) as ModalKey[]).forEach((key) => {
              state.modals[key] = false;
            });
          },
          false,
          'closeAllModals'
        ),

      toggleModal: (modalName: ModalKey) =>
        set(
          (state) => {
            state.modals[modalName] = !state.modals[modalName];
          },
          false,
          `toggleModal/${modalName}`
        ),

      // ─────────────────────────────────────────────────────────────────────
      // Actions - Text Preview
      // ─────────────────────────────────────────────────────────────────────

      setTextPreview: (preview: TextPreviewState) =>
        set(
          (state) => {
            state.textPreview = preview;
          },
          false,
          'setTextPreview'
        ),

      openTextPreview: (title: string, text: string) =>
        set(
          (state) => {
            state.textPreview = { isOpen: true, title, text };
          },
          false,
          'openTextPreview'
        ),

      closeTextPreview: () =>
        set(
          (state) => {
            state.textPreview = initialTextPreviewState;
          },
          false,
          'closeTextPreview'
        ),
    })),
    { name: 'UIStore' }
  )
);

// ═══════════════════════════════════════════════════════════════════════════
// SEÇÃO 3: SELECTORS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Selector: Verifica se algum modal está aberto
 * @example const isAnyOpen = useUIStore(selectIsAnyModalOpen);
 */
export const selectIsAnyModalOpen = (state: UIState): boolean =>
  Object.values(state.modals).some((value) => value === true);

/**
 * Selector: Retorna estado de um modal específico
 * @example const isSettingsOpen = useUIStore(selectModal('settings'));
 */
export const selectModal = (modalName: ModalKey) => (state: UIState): boolean =>
  state.modals[modalName];

/**
 * Selector: Retorna estado do text preview
 * @example const textPreview = useUIStore(selectTextPreview);
 */
export const selectTextPreview = (state: UIState): TextPreviewState =>
  state.textPreview;

/**
 * Selector: Verifica se text preview está aberto
 * @example const isPreviewOpen = useUIStore(selectIsTextPreviewOpen);
 */
export const selectIsTextPreviewOpen = (state: UIState): boolean =>
  state.textPreview.isOpen;

// ═══════════════════════════════════════════════════════════════════════════
// SEÇÃO 4: HOOKS DE COMPATIBILIDADE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook de compatibilidade com useModalManager antigo
 *
 * @deprecated Use useUIStore diretamente após migração completa
 *
 * @example
 * // Substituir:
 * const { modals, openModal, closeModal } = useModalManager();
 *
 * // Por:
 * const { modals, openModal, closeModal } = useModalManagerCompat();
 *
 * // Ou melhor ainda, use o store diretamente:
 * const openModal = useUIStore((s) => s.openModal);
 * const isSettingsOpen = useUIStore((s) => s.modals.settings);
 */
export function useModalManagerCompat() {
  const modals = useUIStore((s) => s.modals);
  const openModal = useUIStore((s) => s.openModal);
  const closeModal = useUIStore((s) => s.closeModal);
  const closeAllModals = useUIStore((s) => s.closeAllModals);
  const isAnyModalOpen = useUIStore(selectIsAnyModalOpen);
  const textPreview = useUIStore((s) => s.textPreview);
  const setTextPreview = useUIStore((s) => s.setTextPreview);

  return {
    modals,
    openModal,
    closeModal,
    closeAllModals,
    isAnyModalOpen,
    textPreview,
    setTextPreview,
  };
}

export default useUIStore;

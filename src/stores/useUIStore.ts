/**
 * @file useUIStore.ts
 * @description Store Zustand para estado de UI (modais, tema, preview, toast, formulários)
 * @version 1.37.56 - Modal Registry Pattern (openModals array substitui 46 flags)
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
import type {
  ModalKey,
  ModalState,
  TextPreviewState,
  ToastState,
  DriveFile,
  DoubleCheckReviewData,
  DoubleCheckReviewResult
} from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// SEÇÃO 1: TIPOS DO STORE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * v1.37.56: Modal Registry Pattern
 * Substitui 46 flags booleanas por um array de modais abertos
 * Benefícios: código mais limpo, escalável, fácil debug
 */

/** Lista de todas as chaves de modal válidas para inicialização */
const ALL_MODAL_KEYS: ModalKey[] = [
  'modelForm', 'extractModelConfirm', 'extractedModelPreview', 'export', 'import',
  'exportModels', 'deleteModel', 'deleteAllModels', 'deleteAllPrecedentes', 'deleteAllLegislacao',
  'rename', 'merge', 'split', 'newTopic', 'deleteTopic', 'aiAssistant', 'aiAssistantModel',
  'analysis', 'settings', 'dispositivo', 'restoreSession', 'clearProject', 'bulkModel',
  'bulkReview', 'bulkDiscardConfirm', 'confirmBulkCancel', 'addProofText', 'deleteProof',
  'linkProof', 'proofAnalysis', 'globalEditor', 'jurisIndividual', 'factsComparisonIndividual',
  'proofTextAnonymization', 'proofExtractionAnonymization', 'sentenceReview', 'sentenceReviewResult',
  'logout', 'shareLibrary', 'changelog', 'topicCuration', 'modelGenerator',
  'regenerateRelatorioCustom', 'bulkModal', 'driveFiles'
];

/**
 * Converte array de modais abertos para objeto ModalState (compatibilidade backwards)
 * @param openModals Array de chaves de modais atualmente abertos
 * @returns Objeto com todas as chaves e seus estados booleanos
 */
const arrayToModalState = (openModals: ModalKey[]): ModalState => {
  const state: Partial<ModalState> = {};
  ALL_MODAL_KEYS.forEach(key => {
    state[key] = openModals.includes(key);
  });
  return state as ModalState;
};

/** Estado inicial do preview de texto */
const initialTextPreviewState: TextPreviewState = {
  isOpen: false,
  title: '',
  text: '',
};

/** Estado inicial do toast de notificações */
const initialToastState: ToastState = {
  show: false,
  message: '',
  type: 'success',
};

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS AUXILIARES (v1.37.49)
// ═══════════════════════════════════════════════════════════════════════════

/** Estado de partes do processo */
interface PartesProcesso {
  reclamante: string;
  reclamadas: string[];
}

/** Status de download (v1.37.73) */
export type DownloadStatus = 'idle' | 'downloading' | 'done' | 'error';

/** Interface do estado do store */
interface UIState {
  // Estado - Modais (v1.37.56: Modal Registry)
  openModals: ModalKey[];  // Array interno de modais abertos
  modals: ModalState;      // Computed: objeto para compatibilidade backwards
  textPreview: TextPreviewState;
  toast: ToastState;

  // Estado - Drive (v1.37.49)
  driveFilesList: DriveFile[];
  modelGeneratorTargetField: string | null;

  // Estado - Feedback (v1.37.49)
  autoSaveDirty: boolean;
  copySuccess: boolean;
  error: string | { type: string; message: string } | null;

  // Estado - Formulário (v1.37.49)
  anonymizationNamesText: string;
  partesProcesso: PartesProcesso;
  processoNumero: string;

  // Estado - Exportação (v1.37.49)
  exportedText: string;
  exportedHtml: string;

  // Estado - Double Check Review (v1.37.58)
  doubleCheckReview: DoubleCheckReviewData | null;
  doubleCheckResult: DoubleCheckReviewResult | null;

  // Estado - Modais Diversos (v1.37.73: ModalRoot)
  showAnonymizationModal: boolean;
  showDataDownloadModal: boolean;
  showEmbeddingsDownloadModal: boolean;
  dataDownloadStatus: DownloadStatus;
  embeddingsDownloadStatus: DownloadStatus;

  // Actions - Modais (v1.37.56: Modal Registry)
  openModal: (modalName: ModalKey) => void;
  closeModal: (modalName: ModalKey) => void;
  closeAllModals: () => void;
  toggleModal: (modalName: ModalKey) => void;
  isModalOpen: (modalName: ModalKey) => boolean;

  // Actions - Text Preview
  setTextPreview: (preview: TextPreviewState) => void;
  openTextPreview: (title: string, text: string) => void;
  closeTextPreview: () => void;

  // Actions - Toast (v1.37.38)
  setToast: (toast: ToastState) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  clearToast: () => void;

  // Actions - Drive (v1.37.49)
  setDriveFilesList: (files: DriveFile[]) => void;
  setModelGeneratorTargetField: (field: string | null) => void;
  openModelGenerator: (targetField: string) => void;
  closeModelGenerator: () => void;

  // Actions - Feedback (v1.37.49)
  setAutoSaveDirty: (dirty: boolean) => void;
  setCopySuccess: (success: boolean) => void;
  setError: (error: string | { type: string; message: string } | null) => void;

  // Actions - Formulário (v1.37.49)
  setAnonymizationNamesText: (text: string) => void;
  setPartesProcesso: (partes: PartesProcesso) => void;
  setProcessoNumero: (numero: string) => void;

  // Actions - Exportação (v1.37.49)
  setExportedText: (text: string) => void;
  setExportedHtml: (html: string) => void;

  // Actions - Double Check Review (v1.37.58)
  openDoubleCheckReview: (data: DoubleCheckReviewData) => void;
  closeDoubleCheckReview: () => void;
  setDoubleCheckResult: (result: DoubleCheckReviewResult | null) => void;

  // Actions - Modais Diversos (v1.37.73: ModalRoot)
  setShowAnonymizationModal: (show: boolean) => void;
  setShowDataDownloadModal: (show: boolean) => void;
  setShowEmbeddingsDownloadModal: (show: boolean) => void;
  setDataDownloadStatus: (status: DownloadStatus) => void;
  setEmbeddingsDownloadStatus: (status: DownloadStatus) => void;

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
    immer((set, get) => ({
      // Estado inicial (v1.37.56: Modal Registry)
      openModals: [] as ModalKey[],
      modals: arrayToModalState([]),  // Computed para compatibilidade
      textPreview: initialTextPreviewState,
      toast: initialToastState,

      // Estado - Drive (v1.37.49)
      driveFilesList: [],
      modelGeneratorTargetField: null,

      // Estado - Feedback (v1.37.49)
      autoSaveDirty: false,
      copySuccess: false,
      error: null,

      // Estado - Formulário (v1.37.49)
      anonymizationNamesText: '',
      partesProcesso: { reclamante: '', reclamadas: [] },
      processoNumero: '',

      // Estado - Exportação (v1.37.49)
      exportedText: '',
      exportedHtml: '',

      // Estado - Double Check Review (v1.37.58)
      doubleCheckReview: null,
      doubleCheckResult: null,

      // Estado - Modais Diversos (v1.37.73: ModalRoot)
      showAnonymizationModal: false,
      showDataDownloadModal: false,
      showEmbeddingsDownloadModal: false,
      dataDownloadStatus: 'idle' as DownloadStatus,
      embeddingsDownloadStatus: 'idle' as DownloadStatus,

      // ─────────────────────────────────────────────────────────────────────
      // Actions - Modais (v1.37.56: Modal Registry Pattern)
      // ─────────────────────────────────────────────────────────────────────

      openModal: (modalName: ModalKey) =>
        set(
          (state) => {
            if (!state.openModals.includes(modalName)) {
              state.openModals.push(modalName);
              state.modals = arrayToModalState(state.openModals);
            }
          },
          false,
          `openModal/${modalName}`
        ),

      closeModal: (modalName: ModalKey) =>
        set(
          (state) => {
            const idx = state.openModals.indexOf(modalName);
            if (idx !== -1) {
              state.openModals.splice(idx, 1);
              state.modals = arrayToModalState(state.openModals);
            }
          },
          false,
          `closeModal/${modalName}`
        ),

      closeAllModals: () =>
        set(
          (state) => {
            state.openModals = [];
            state.modals = arrayToModalState([]);
          },
          false,
          'closeAllModals'
        ),

      toggleModal: (modalName: ModalKey) =>
        set(
          (state) => {
            const idx = state.openModals.indexOf(modalName);
            if (idx === -1) {
              state.openModals.push(modalName);
            } else {
              state.openModals.splice(idx, 1);
            }
            state.modals = arrayToModalState(state.openModals);
          },
          false,
          `toggleModal/${modalName}`
        ),

      isModalOpen: (modalName: ModalKey) => get().openModals.includes(modalName),

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

      // ─────────────────────────────────────────────────────────────────────
      // Actions - Toast (v1.37.38)
      // ─────────────────────────────────────────────────────────────────────

      setToast: (toast: ToastState) =>
        set(
          (state) => {
            state.toast = toast;
          },
          false,
          'setToast'
        ),

      showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') => {
        set(
          (state) => {
            state.toast = { show: true, message, type };
          },
          false,
          `showToast/${type}`
        );
        // Auto-hide after 4 seconds
        setTimeout(() => {
          get().clearToast();
        }, 4000);
      },

      clearToast: () =>
        set(
          (state) => {
            state.toast = initialToastState;
          },
          false,
          'clearToast'
        ),

      // ─────────────────────────────────────────────────────────────────────
      // Actions - Drive (v1.37.49)
      // ─────────────────────────────────────────────────────────────────────

      setDriveFilesList: (files: DriveFile[]) =>
        set(
          (state) => {
            state.driveFilesList = files;
          },
          false,
          'setDriveFilesList'
        ),

      setModelGeneratorTargetField: (field: string | null) =>
        set(
          (state) => {
            state.modelGeneratorTargetField = field;
          },
          false,
          'setModelGeneratorTargetField'
        ),

      openModelGenerator: (targetField: string) =>
        set(
          (state) => {
            state.modals.modelGenerator = true;
            state.modelGeneratorTargetField = targetField;
          },
          false,
          'openModelGenerator'
        ),

      closeModelGenerator: () =>
        set(
          (state) => {
            state.modals.modelGenerator = false;
            state.modelGeneratorTargetField = null;
          },
          false,
          'closeModelGenerator'
        ),

      // ─────────────────────────────────────────────────────────────────────
      // Actions - Feedback (v1.37.49)
      // ─────────────────────────────────────────────────────────────────────

      setAutoSaveDirty: (dirty: boolean) =>
        set(
          (state) => {
            state.autoSaveDirty = dirty;
          },
          false,
          'setAutoSaveDirty'
        ),

      setCopySuccess: (success: boolean) =>
        set(
          (state) => {
            state.copySuccess = success;
          },
          false,
          'setCopySuccess'
        ),

      setError: (error: string | { type: string; message: string } | null) =>
        set(
          (state) => {
            state.error = error;
          },
          false,
          'setError'
        ),

      // ─────────────────────────────────────────────────────────────────────
      // Actions - Formulário (v1.37.49)
      // ─────────────────────────────────────────────────────────────────────

      setAnonymizationNamesText: (text: string) =>
        set(
          (state) => {
            state.anonymizationNamesText = text;
          },
          false,
          'setAnonymizationNamesText'
        ),

      setPartesProcesso: (partes: PartesProcesso) =>
        set(
          (state) => {
            state.partesProcesso = partes;
          },
          false,
          'setPartesProcesso'
        ),

      setProcessoNumero: (numero: string) =>
        set(
          (state) => {
            state.processoNumero = numero;
          },
          false,
          'setProcessoNumero'
        ),

      // ─────────────────────────────────────────────────────────────────────
      // Actions - Exportação (v1.37.49)
      // ─────────────────────────────────────────────────────────────────────

      setExportedText: (text: string) =>
        set(
          (state) => {
            state.exportedText = text;
          },
          false,
          'setExportedText'
        ),

      setExportedHtml: (html: string) =>
        set(
          (state) => {
            state.exportedHtml = html;
          },
          false,
          'setExportedHtml'
        ),

      // ─────────────────────────────────────────────────────────────────────
      // Actions - Double Check Review (v1.37.58)
      // ─────────────────────────────────────────────────────────────────────

      openDoubleCheckReview: (data: DoubleCheckReviewData) =>
        set(
          (state) => {
            state.doubleCheckReview = data;
            state.doubleCheckResult = null; // Limpa resultado anterior
          },
          false,
          `openDoubleCheckReview/${data.operation}`
        ),

      closeDoubleCheckReview: () =>
        set(
          (state) => {
            state.doubleCheckReview = null;
          },
          false,
          'closeDoubleCheckReview'
        ),

      setDoubleCheckResult: (result: DoubleCheckReviewResult | null) =>
        set(
          (state) => {
            state.doubleCheckResult = result;
          },
          false,
          'setDoubleCheckResult'
        ),

      // ─────────────────────────────────────────────────────────────────────
      // Actions - Modais Diversos (v1.37.73: ModalRoot)
      // ─────────────────────────────────────────────────────────────────────

      setShowAnonymizationModal: (show: boolean) =>
        set(
          (state) => {
            state.showAnonymizationModal = show;
          },
          false,
          `setShowAnonymizationModal/${show}`
        ),

      setShowDataDownloadModal: (show: boolean) =>
        set(
          (state) => {
            state.showDataDownloadModal = show;
          },
          false,
          `setShowDataDownloadModal/${show}`
        ),

      setShowEmbeddingsDownloadModal: (show: boolean) =>
        set(
          (state) => {
            state.showEmbeddingsDownloadModal = show;
          },
          false,
          `setShowEmbeddingsDownloadModal/${show}`
        ),

      setDataDownloadStatus: (status: DownloadStatus) =>
        set(
          (state) => {
            state.dataDownloadStatus = status;
          },
          false,
          `setDataDownloadStatus/${status}`
        ),

      setEmbeddingsDownloadStatus: (status: DownloadStatus) =>
        set(
          (state) => {
            state.embeddingsDownloadStatus = status;
          },
          false,
          `setEmbeddingsDownloadStatus/${status}`
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
  state.openModals.length > 0;  // v1.37.56: Usa array diretamente (mais eficiente)

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

/**
 * Selector: Retorna estado do toast (v1.37.38)
 * @example const toast = useUIStore(selectToast);
 */
export const selectToast = (state: UIState): ToastState =>
  state.toast;

/**
 * Selector: Verifica se toast está visível (v1.37.38)
 * @example const isToastVisible = useUIStore(selectIsToastVisible);
 */
export const selectIsToastVisible = (state: UIState): boolean =>
  state.toast.show;

/**
 * Selector: Retorna dados do Double Check Review (v1.37.58)
 * @example const reviewData = useUIStore(selectDoubleCheckReview);
 */
export const selectDoubleCheckReview = (state: UIState): DoubleCheckReviewData | null =>
  state.doubleCheckReview;

/**
 * Selector: Verifica se modal de Double Check Review está aberto (v1.37.58)
 * @example const isReviewOpen = useUIStore(selectIsDoubleCheckReviewOpen);
 */
export const selectIsDoubleCheckReviewOpen = (state: UIState): boolean =>
  state.doubleCheckReview !== null;

/**
 * Selector: Retorna resultado do Double Check Review (v1.37.58)
 * @example const result = useUIStore(selectDoubleCheckResult);
 */
export const selectDoubleCheckResult = (state: UIState): DoubleCheckReviewResult | null =>
  state.doubleCheckResult;

export default useUIStore;

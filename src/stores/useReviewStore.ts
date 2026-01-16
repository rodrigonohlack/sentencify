/**
 * @file useReviewStore.ts
 * @description Store Zustand para estado de revisão de sentença e confronto de fatos
 * @version 1.37.73
 *
 * Este store centraliza o estado de revisão que antes estava em useState no App.tsx.
 * Usado pelo ModalRoot para modais de revisão sem precisar receber props.
 *
 * @usedBy ModalRoot, SentenceReviewModals, FactsComparisonModal
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// ═══════════════════════════════════════════════════════════════════════════
// SEÇÃO 1: TIPOS
// ═══════════════════════════════════════════════════════════════════════════

/** Escopo da revisão de sentença */
export type ReviewScope = 'decisionOnly' | 'decisionWithDocs';

/** Resultado da revisão de sentença */
export interface ReviewResult {
  content: string;
  timestamp: string;
  scope: ReviewScope;
  topicTitles?: string[];
}

/** Resultado do confronto de fatos */
export interface FactsComparisonResult {
  content: string;
  timestamp: string;
  topicTitle: string;
}

/** Interface do estado do store */
interface ReviewStoreState {
  // ═══════════════════════════════════════════════════════════════════════════
  // ESTADO - REVISÃO DE SENTENÇA
  // ═══════════════════════════════════════════════════════════════════════════

  /** Escopo da revisão (minuta, todos, selecionados) */
  reviewScope: ReviewScope;

  /** Resultado da revisão de sentença */
  reviewResult: ReviewResult | null;

  /** Indica se resultado veio do cache */
  reviewFromCache: boolean;

  /** Indica se está gerando revisão */
  generatingReview: boolean;

  // ═══════════════════════════════════════════════════════════════════════════
  // ESTADO - CONFRONTO DE FATOS (INDIVIDUAL)
  // ═══════════════════════════════════════════════════════════════════════════

  /** Resultado do confronto de fatos individual */
  factsComparisonResultIndividual: FactsComparisonResult | null;

  /** Indica se está gerando confronto individual */
  generatingFactsComparisonIndividual: boolean;

  /** Erro do confronto individual */
  factsComparisonErrorIndividual: string | null;

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTIONS - REVISÃO DE SENTENÇA
  // ═══════════════════════════════════════════════════════════════════════════

  /** Define o escopo da revisão (decisionOnly = minuta, decisionWithDocs = com documentos) */
  setReviewScope: (scope: ReviewScope) => void;

  /** Define o resultado da revisão */
  setReviewResult: (result: ReviewResult | null) => void;

  /** Define se resultado veio do cache */
  setReviewFromCache: (fromCache: boolean) => void;

  /** Define se está gerando revisão */
  setGeneratingReview: (generating: boolean) => void;

  /** Limpa o estado de revisão */
  clearReviewState: () => void;

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTIONS - CONFRONTO DE FATOS
  // ═══════════════════════════════════════════════════════════════════════════

  /** Define o resultado do confronto individual */
  setFactsComparisonResultIndividual: (result: FactsComparisonResult | null) => void;

  /** Define se está gerando confronto individual */
  setGeneratingFactsComparisonIndividual: (generating: boolean) => void;

  /** Define o erro do confronto individual */
  setFactsComparisonErrorIndividual: (error: string | null) => void;

  /** Limpa o estado de confronto individual */
  clearFactsComparisonState: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// SEÇÃO 2: STORE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Store de Revisão - Gerencia estado de revisão de sentença e confronto de fatos
 *
 * @example
 * // Uso básico
 * const { reviewScope, setReviewScope, reviewResult } = useReviewStore();
 *
 * @example
 * // Com selector para evitar re-renders
 * const generatingReview = useReviewStore((s) => s.generatingReview);
 */
export const useReviewStore = create<ReviewStoreState>()(
  devtools(
    immer((set) => ({
      // ═══════════════════════════════════════════════════════════════════════
      // ESTADO INICIAL
      // ═══════════════════════════════════════════════════════════════════════

      // Revisão de sentença
      reviewScope: 'decisionOnly' as ReviewScope,
      reviewResult: null,
      reviewFromCache: false,
      generatingReview: false,

      // Confronto de fatos individual
      factsComparisonResultIndividual: null,
      generatingFactsComparisonIndividual: false,
      factsComparisonErrorIndividual: null,

      // ═══════════════════════════════════════════════════════════════════════
      // ACTIONS - REVISÃO DE SENTENÇA
      // ═══════════════════════════════════════════════════════════════════════

      setReviewScope: (scope) =>
        set(
          (state) => {
            state.reviewScope = scope;
          },
          false,
          `setReviewScope/${scope}`
        ),

      setReviewResult: (result) =>
        set(
          (state) => {
            state.reviewResult = result;
          },
          false,
          'setReviewResult'
        ),

      setReviewFromCache: (fromCache) =>
        set(
          (state) => {
            state.reviewFromCache = fromCache;
          },
          false,
          `setReviewFromCache/${fromCache}`
        ),

      setGeneratingReview: (generating) =>
        set(
          (state) => {
            state.generatingReview = generating;
          },
          false,
          `setGeneratingReview/${generating}`
        ),

      clearReviewState: () =>
        set(
          (state) => {
            state.reviewResult = null;
            state.reviewFromCache = false;
            state.generatingReview = false;
            // reviewScope mantém o valor (é preferência do usuário)
          },
          false,
          'clearReviewState'
        ),

      // ═══════════════════════════════════════════════════════════════════════
      // ACTIONS - CONFRONTO DE FATOS
      // ═══════════════════════════════════════════════════════════════════════

      setFactsComparisonResultIndividual: (result) =>
        set(
          (state) => {
            state.factsComparisonResultIndividual = result;
          },
          false,
          'setFactsComparisonResultIndividual'
        ),

      setGeneratingFactsComparisonIndividual: (generating) =>
        set(
          (state) => {
            state.generatingFactsComparisonIndividual = generating;
          },
          false,
          `setGeneratingFactsComparisonIndividual/${generating}`
        ),

      setFactsComparisonErrorIndividual: (error) =>
        set(
          (state) => {
            state.factsComparisonErrorIndividual = error;
          },
          false,
          'setFactsComparisonErrorIndividual'
        ),

      clearFactsComparisonState: () =>
        set(
          (state) => {
            state.factsComparisonResultIndividual = null;
            state.generatingFactsComparisonIndividual = false;
            state.factsComparisonErrorIndividual = null;
          },
          false,
          'clearFactsComparisonState'
        ),
    })),
    { name: 'ReviewStore' }
  )
);

// ═══════════════════════════════════════════════════════════════════════════
// SEÇÃO 3: SELECTORS
// ═══════════════════════════════════════════════════════════════════════════

/** Selector: Retorna se está gerando revisão */
export const selectGeneratingReview = (state: ReviewStoreState): boolean =>
  state.generatingReview;

/** Selector: Retorna se tem resultado de revisão */
export const selectHasReviewResult = (state: ReviewStoreState): boolean =>
  state.reviewResult !== null;

/** Selector: Retorna se está gerando confronto individual */
export const selectGeneratingFactsComparison = (state: ReviewStoreState): boolean =>
  state.generatingFactsComparisonIndividual;

/** Selector: Retorna se tem erro no confronto */
export const selectHasFactsComparisonError = (state: ReviewStoreState): boolean =>
  state.factsComparisonErrorIndividual !== null;

export default useReviewStore;

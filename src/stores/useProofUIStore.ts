/**
 * @file useProofUIStore.ts
 * @description Zustand store para estado de UI/ephemeral de provas
 * @version 1.38.40
 *
 * FASE 3 Etapa 3.2: Separação do useProofsStore em dados (useProofsStore) e UI (useProofUIStore).
 * Este store contém estado efêmero: modais, formulários, flags de análise.
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { enableMapSet } from 'immer';
import type { Proof, NewProofTextData } from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS LOCAIS
// ═══════════════════════════════════════════════════════════════════════════════

interface PendingExtraction {
  proofId: string | number;
  proof: Proof;
  executeExtraction?: (nomes: string[]) => void;
}

interface PendingChatMessage {
  message: string;
  options: unknown;
  isGlobal: boolean;
  topicTitle: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACE DO STORE
// ═══════════════════════════════════════════════════════════════════════════════

interface ProofUIStoreState {
  // ═══════════════════════════════════════════════════════════════════════════
  // ESTADOS DE MODAL STAGING (3)
  // ═══════════════════════════════════════════════════════════════════════════

  /** Prova selecionada para deletar */
  proofToDelete: Proof | null;

  /** Prova selecionada para vincular */
  proofToLink: Proof | null;

  /** Prova selecionada para análise */
  proofToAnalyze: Proof | null;

  // ═══════════════════════════════════════════════════════════════════════════
  // ESTADOS DE FORMULÁRIO (4)
  // ═══════════════════════════════════════════════════════════════════════════

  /** Dados do formulário de nova prova texto */
  newProofTextData: NewProofTextData;

  /** Texto de prova pendente (anonimização) */
  pendingProofText: NewProofTextData | null;

  /** Extração de PDF pendente (anonimização) */
  pendingExtraction: PendingExtraction | null;

  /** Mensagem de chat pendente (anonimização) */
  pendingChatMessage: PendingChatMessage | null;

  // ═══════════════════════════════════════════════════════════════════════════
  // ESTADOS DE ANÁLISE (4)
  // ═══════════════════════════════════════════════════════════════════════════

  /** IDs das provas sendo analisadas */
  analyzingProofIds: Set<string | number>;

  /** Instruções customizadas para análise */
  proofAnalysisCustomInstructions: string;

  /** Usar apenas mini-relatórios na análise */
  useOnlyMiniRelatorios: boolean;

  /** Incluir tópicos vinculados na análise livre */
  includeLinkedTopicsInFree: boolean;

  // ═══════════════════════════════════════════════════════════════════════════
  // FLAGS DE UI (1)
  // ═══════════════════════════════════════════════════════════════════════════

  /** Visibilidade do painel de provas */
  showProofPanel: boolean;

  // ═══════════════════════════════════════════════════════════════════════════
  // SETTERS DE MODAL STAGING (3)
  // ═══════════════════════════════════════════════════════════════════════════

  setProofToDelete: (proof: Proof | null) => void;
  setProofToLink: (proof: Proof | null) => void;
  setProofToAnalyze: (proof: Proof | null) => void;

  // ═══════════════════════════════════════════════════════════════════════════
  // SETTERS DE FORMULÁRIO (4)
  // ═══════════════════════════════════════════════════════════════════════════

  setNewProofTextData: (data: NewProofTextData | ((prev: NewProofTextData) => NewProofTextData)) => void;
  setPendingProofText: (data: NewProofTextData | null) => void;
  setPendingExtraction: (data: PendingExtraction | null) => void;
  setPendingChatMessage: (data: PendingChatMessage | null) => void;

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTIONS DE ANÁLISE (4)
  // ═══════════════════════════════════════════════════════════════════════════

  addAnalyzingProof: (id: string | number) => void;
  removeAnalyzingProof: (id: string | number) => void;
  isAnalyzingProof: (id: string | number) => boolean;
  clearAnalyzingProofs: () => void;

  // ═══════════════════════════════════════════════════════════════════════════
  // SETTERS DE CONFIGURAÇÃO DE ANÁLISE (2)
  // ═══════════════════════════════════════════════════════════════════════════

  setProofAnalysisCustomInstructions: (instructions: string) => void;
  setUseOnlyMiniRelatorios: (use: boolean) => void;
  setIncludeLinkedTopicsInFree: (include: boolean) => void;

  // ═══════════════════════════════════════════════════════════════════════════
  // SETTER DE UI (1)
  // ═══════════════════════════════════════════════════════════════════════════

  setShowProofPanel: (show: boolean) => void;

  // ═══════════════════════════════════════════════════════════════════════════
  // RESET
  // ═══════════════════════════════════════════════════════════════════════════

  resetAll: () => void;
}

// Habilita suporte a Set/Map no Immer (necessário para analyzingProofIds)
enableMapSet();

// ═══════════════════════════════════════════════════════════════════════════════
// STORE
// ═══════════════════════════════════════════════════════════════════════════════

export const useProofUIStore = create<ProofUIStoreState>()(
  devtools(
    immer((set, get) => ({
      // ═══════════════════════════════════════════════════════════════════════
      // ESTADO INICIAL
      // ═══════════════════════════════════════════════════════════════════════

      // Modal staging (3)
      proofToDelete: null,
      proofToLink: null,
      proofToAnalyze: null,

      // Formulário (4)
      newProofTextData: { name: '', text: '' },
      pendingProofText: null,
      pendingExtraction: null,
      pendingChatMessage: null,

      // Análise (4)
      analyzingProofIds: new Set(),
      proofAnalysisCustomInstructions: '',
      useOnlyMiniRelatorios: false,
      includeLinkedTopicsInFree: false,

      // UI (1)
      showProofPanel: true,

      // ═══════════════════════════════════════════════════════════════════════
      // SETTERS DE MODAL STAGING
      // ═══════════════════════════════════════════════════════════════════════

      setProofToDelete: (proof) =>
        set((state) => {
          state.proofToDelete = proof;
        }, false, 'setProofToDelete'),

      setProofToLink: (proof) =>
        set((state) => {
          state.proofToLink = proof;
        }, false, 'setProofToLink'),

      setProofToAnalyze: (proof) =>
        set((state) => {
          state.proofToAnalyze = proof;
        }, false, 'setProofToAnalyze'),

      // ═══════════════════════════════════════════════════════════════════════
      // SETTERS DE FORMULÁRIO
      // ═══════════════════════════════════════════════════════════════════════

      setNewProofTextData: (dataOrUpdater) =>
        set((state) => {
          if (typeof dataOrUpdater === 'function') {
            state.newProofTextData = dataOrUpdater(state.newProofTextData);
          } else {
            state.newProofTextData = dataOrUpdater;
          }
        }, false, 'setNewProofTextData'),

      setPendingProofText: (data) =>
        set((state) => {
          state.pendingProofText = data;
        }, false, 'setPendingProofText'),

      setPendingExtraction: (data) =>
        set((state) => {
          state.pendingExtraction = data;
        }, false, 'setPendingExtraction'),

      setPendingChatMessage: (data) =>
        set((state) => {
          state.pendingChatMessage = data;
        }, false, 'setPendingChatMessage'),

      // ═══════════════════════════════════════════════════════════════════════
      // ACTIONS DE ANÁLISE
      // ═══════════════════════════════════════════════════════════════════════

      addAnalyzingProof: (id) =>
        set((state) => {
          state.analyzingProofIds = new Set([...state.analyzingProofIds, id]);
        }, false, 'addAnalyzingProof'),

      removeAnalyzingProof: (id) =>
        set((state) => {
          const next = new Set(state.analyzingProofIds);
          next.delete(id);
          state.analyzingProofIds = next;
        }, false, 'removeAnalyzingProof'),

      isAnalyzingProof: (id) => {
        return get().analyzingProofIds.has(id);
      },

      clearAnalyzingProofs: () =>
        set((state) => {
          state.analyzingProofIds = new Set();
        }, false, 'clearAnalyzingProofs'),

      // ═══════════════════════════════════════════════════════════════════════
      // SETTERS DE CONFIGURAÇÃO DE ANÁLISE
      // ═══════════════════════════════════════════════════════════════════════

      setProofAnalysisCustomInstructions: (instructions) =>
        set((state) => {
          state.proofAnalysisCustomInstructions = instructions;
        }, false, 'setProofAnalysisCustomInstructions'),

      setUseOnlyMiniRelatorios: (use) =>
        set((state) => {
          state.useOnlyMiniRelatorios = use;
        }, false, 'setUseOnlyMiniRelatorios'),

      setIncludeLinkedTopicsInFree: (include) =>
        set((state) => {
          state.includeLinkedTopicsInFree = include;
        }, false, 'setIncludeLinkedTopicsInFree'),

      // ═══════════════════════════════════════════════════════════════════════
      // SETTER DE UI
      // ═══════════════════════════════════════════════════════════════════════

      setShowProofPanel: (show) =>
        set((state) => {
          state.showProofPanel = show;
        }, false, 'setShowProofPanel'),

      // ═══════════════════════════════════════════════════════════════════════
      // RESET
      // ═══════════════════════════════════════════════════════════════════════

      resetAll: () =>
        set((state) => {
          state.proofToDelete = null;
          state.proofToLink = null;
          state.proofToAnalyze = null;
          state.newProofTextData = { name: '', text: '' };
          state.pendingProofText = null;
          state.pendingExtraction = null;
          state.pendingChatMessage = null;
          state.analyzingProofIds = new Set();
          state.proofAnalysisCustomInstructions = '';
          state.useOnlyMiniRelatorios = false;
          state.includeLinkedTopicsInFree = false;
          state.showProofPanel = true;
        }, false, 'resetAll'),
    })),
    { name: 'ProofUIStore' }
  )
);

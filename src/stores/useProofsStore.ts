/**
 * @file useProofsStore.ts
 * @description Zustand store para gerenciamento de provas
 * @version 1.36.65
 * @replaces useProofManager (parcialmente - estado migrado, handlers com IO permanecem no hook)
 *
 * FASE 2 Wave 3 - Zustand Migration:
 * - 23 useState migrados para store global
 * - Handlers simples como actions
 * - Métodos de persistência (serialize/restore/reset)
 * - DevTools habilitado para debug
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type {
  ProofFile,
  ProofText,
  Proof,
  ProofAnalysisResult,
  ProcessingMode,
  NewProofTextData
} from '../types';

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

interface ProofsStoreState {
  // ═══════════════════════════════════════════════════════════════════════════
  // ESTADOS CORE DE DADOS (13)
  // ═══════════════════════════════════════════════════════════════════════════

  /** Provas em PDF */
  proofFiles: ProofFile[];

  /** Provas em texto */
  proofTexts: ProofText[];

  /** Modo de uso por prova: true = PDF completo, false = texto extraído */
  proofUsePdfMode: Record<string, boolean>;

  /** Textos extraídos das provas PDF */
  extractedProofTexts: Record<string, string>;

  /** PDFs que falharam na extração (imagens) */
  proofExtractionFailed: Record<string, boolean>;

  /** Vinculações prova -> tópicos */
  proofTopicLinks: Record<string, string[]>;

  /** Resultados de análise por prova */
  proofAnalysisResults: Record<string, ProofAnalysisResult>;

  /** Conclusões manuais do juiz por prova */
  proofConclusions: Record<string, string>;

  /** Modo de processamento por prova PDF */
  proofProcessingModes: Record<string, ProcessingMode>;

  /** Flag para enviar conteúdo completo à IA */
  proofSendFullContent: Record<string, boolean>;

  /** Texto de prova pendente (anonimização) */
  pendingProofText: NewProofTextData | null;

  /** Extração de PDF pendente (anonimização) */
  pendingExtraction: PendingExtraction | null;

  /** Mensagem de chat pendente (anonimização) */
  pendingChatMessage: PendingChatMessage | null;

  // ═══════════════════════════════════════════════════════════════════════════
  // ESTADOS DE UI/CONTROLE (10)
  // ═══════════════════════════════════════════════════════════════════════════

  /** IDs das provas sendo analisadas */
  analyzingProofIds: Set<string | number>;

  /** Visibilidade do painel de provas */
  showProofPanel: boolean;

  /** Dados do formulário de nova prova texto */
  newProofTextData: NewProofTextData;

  /** Prova selecionada para deletar */
  proofToDelete: Proof | null;

  /** Prova selecionada para vincular */
  proofToLink: Proof | null;

  /** Prova selecionada para análise */
  proofToAnalyze: Proof | null;

  /** Instruções customizadas para análise */
  proofAnalysisCustomInstructions: string;

  /** Usar apenas mini-relatórios na análise */
  useOnlyMiniRelatorios: boolean;

  /** Incluir tópicos vinculados na análise livre */
  includeLinkedTopicsInFree: boolean;

  // ═══════════════════════════════════════════════════════════════════════════
  // SETTERS CORE (13)
  // ═══════════════════════════════════════════════════════════════════════════

  setProofFiles: (files: ProofFile[] | ((prev: ProofFile[]) => ProofFile[])) => void;
  setProofTexts: (texts: ProofText[] | ((prev: ProofText[]) => ProofText[])) => void;
  setProofUsePdfMode: (mode: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)) => void;
  setExtractedProofTexts: (texts: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void;
  setProofExtractionFailed: (failed: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)) => void;
  setProofTopicLinks: (links: Record<string, string[]> | ((prev: Record<string, string[]>) => Record<string, string[]>)) => void;
  setProofAnalysisResults: (results: Record<string, ProofAnalysisResult> | ((prev: Record<string, ProofAnalysisResult>) => Record<string, ProofAnalysisResult>)) => void;
  setProofConclusions: (conclusions: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void;
  setProofProcessingModes: (modes: Record<string, ProcessingMode> | ((prev: Record<string, ProcessingMode>) => Record<string, ProcessingMode>)) => void;
  setProofSendFullContent: (content: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)) => void;
  setPendingProofText: (data: NewProofTextData | null) => void;
  setPendingExtraction: (data: PendingExtraction | null) => void;
  setPendingChatMessage: (data: PendingChatMessage | null) => void;

  // ═══════════════════════════════════════════════════════════════════════════
  // SETTERS UI/CONTROLE (10)
  // ═══════════════════════════════════════════════════════════════════════════

  setShowProofPanel: (show: boolean) => void;
  setNewProofTextData: (data: NewProofTextData | ((prev: NewProofTextData) => NewProofTextData)) => void;
  setProofToDelete: (proof: Proof | null) => void;
  setProofToLink: (proof: Proof | null) => void;
  setProofToAnalyze: (proof: Proof | null) => void;
  setProofAnalysisCustomInstructions: (instructions: string) => void;
  setUseOnlyMiniRelatorios: (use: boolean) => void;
  setIncludeLinkedTopicsInFree: (include: boolean) => void;

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTIONS DE ANÁLISE
  // ═══════════════════════════════════════════════════════════════════════════

  /** Adiciona prova ao set de análise */
  addAnalyzingProof: (id: string | number) => void;

  /** Remove prova do set de análise */
  removeAnalyzingProof: (id: string | number) => void;

  /** Verifica se prova está sendo analisada */
  isAnalyzingProof: (id: string | number) => boolean;

  /** Limpa todas as provas em análise */
  clearAnalyzingProofs: () => void;

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTIONS DE MANIPULAÇÃO
  // ═══════════════════════════════════════════════════════════════════════════

  /** Toggle modo PDF/texto para uma prova */
  handleToggleProofMode: (proofId: string | number, usePdf: boolean) => void;

  /** Vincula prova a tópicos */
  handleLinkProof: (proofId: string | number, topicTitles: string[]) => void;

  /** Desvincula prova de um tópico */
  handleUnlinkProof: (proofId: string | number, topicTitle: string) => void;

  /** Salva conclusão do juiz para uma prova */
  handleSaveProofConclusion: (proofId: string | number, conclusion: string) => void;

  // ═══════════════════════════════════════════════════════════════════════════
  // MÉTODOS DE PERSISTÊNCIA
  // ═══════════════════════════════════════════════════════════════════════════

  /** Serializa estado para persistência */
  serializeForPersistence: () => {
    proofFiles: ProofFile[];
    proofTexts: ProofText[];
    proofUsePdfMode: Record<string, boolean>;
    extractedProofTexts: Record<string, string>;
    proofExtractionFailed: Record<string, boolean>;
    proofTopicLinks: Record<string, string[]>;
    proofAnalysisResults: Record<string, ProofAnalysisResult>;
    proofConclusions: Record<string, string>;
    proofProcessingModes: Record<string, ProcessingMode>;
    proofSendFullContent: Record<string, boolean>;
  };

  /** Restaura estado de dados persistidos */
  restoreFromPersistence: (data: Record<string, unknown> | null) => void;

  /** Reseta todo o estado */
  resetAll: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STORE
// ═══════════════════════════════════════════════════════════════════════════════

export const useProofsStore = create<ProofsStoreState>()(
  devtools(
    immer((set, get) => ({
      // ═══════════════════════════════════════════════════════════════════════
      // ESTADO INICIAL
      // ═══════════════════════════════════════════════════════════════════════

      // Core Data (13)
      proofFiles: [],
      proofTexts: [],
      proofUsePdfMode: {},
      extractedProofTexts: {},
      proofExtractionFailed: {},
      proofTopicLinks: {},
      proofAnalysisResults: {},
      proofConclusions: {},
      proofProcessingModes: {},
      proofSendFullContent: {},
      pendingProofText: null,
      pendingExtraction: null,
      pendingChatMessage: null,

      // UI/Control (10)
      analyzingProofIds: new Set(),
      showProofPanel: true,
      newProofTextData: { name: '', text: '' },
      proofToDelete: null,
      proofToLink: null,
      proofToAnalyze: null,
      proofAnalysisCustomInstructions: '',
      useOnlyMiniRelatorios: false,
      includeLinkedTopicsInFree: false,

      // ═══════════════════════════════════════════════════════════════════════
      // SETTERS CORE
      // ═══════════════════════════════════════════════════════════════════════

      setProofFiles: (filesOrUpdater) =>
        set((state) => {
          if (typeof filesOrUpdater === 'function') {
            state.proofFiles = filesOrUpdater(state.proofFiles);
          } else {
            state.proofFiles = filesOrUpdater;
          }
        }, false, 'setProofFiles'),

      setProofTexts: (textsOrUpdater) =>
        set((state) => {
          if (typeof textsOrUpdater === 'function') {
            state.proofTexts = textsOrUpdater(state.proofTexts);
          } else {
            state.proofTexts = textsOrUpdater;
          }
        }, false, 'setProofTexts'),

      setProofUsePdfMode: (modeOrUpdater) =>
        set((state) => {
          if (typeof modeOrUpdater === 'function') {
            state.proofUsePdfMode = modeOrUpdater(state.proofUsePdfMode);
          } else {
            state.proofUsePdfMode = modeOrUpdater;
          }
        }, false, 'setProofUsePdfMode'),

      setExtractedProofTexts: (textsOrUpdater) =>
        set((state) => {
          if (typeof textsOrUpdater === 'function') {
            state.extractedProofTexts = textsOrUpdater(state.extractedProofTexts);
          } else {
            state.extractedProofTexts = textsOrUpdater;
          }
        }, false, 'setExtractedProofTexts'),

      setProofExtractionFailed: (failedOrUpdater) =>
        set((state) => {
          if (typeof failedOrUpdater === 'function') {
            state.proofExtractionFailed = failedOrUpdater(state.proofExtractionFailed);
          } else {
            state.proofExtractionFailed = failedOrUpdater;
          }
        }, false, 'setProofExtractionFailed'),

      setProofTopicLinks: (linksOrUpdater) =>
        set((state) => {
          if (typeof linksOrUpdater === 'function') {
            state.proofTopicLinks = linksOrUpdater(state.proofTopicLinks);
          } else {
            state.proofTopicLinks = linksOrUpdater;
          }
        }, false, 'setProofTopicLinks'),

      setProofAnalysisResults: (resultsOrUpdater) =>
        set((state) => {
          if (typeof resultsOrUpdater === 'function') {
            state.proofAnalysisResults = resultsOrUpdater(state.proofAnalysisResults);
          } else {
            state.proofAnalysisResults = resultsOrUpdater;
          }
        }, false, 'setProofAnalysisResults'),

      setProofConclusions: (conclusionsOrUpdater) =>
        set((state) => {
          if (typeof conclusionsOrUpdater === 'function') {
            state.proofConclusions = conclusionsOrUpdater(state.proofConclusions);
          } else {
            state.proofConclusions = conclusionsOrUpdater;
          }
        }, false, 'setProofConclusions'),

      setProofProcessingModes: (modesOrUpdater) =>
        set((state) => {
          if (typeof modesOrUpdater === 'function') {
            state.proofProcessingModes = modesOrUpdater(state.proofProcessingModes);
          } else {
            state.proofProcessingModes = modesOrUpdater;
          }
        }, false, 'setProofProcessingModes'),

      setProofSendFullContent: (contentOrUpdater) =>
        set((state) => {
          if (typeof contentOrUpdater === 'function') {
            state.proofSendFullContent = contentOrUpdater(state.proofSendFullContent);
          } else {
            state.proofSendFullContent = contentOrUpdater;
          }
        }, false, 'setProofSendFullContent'),

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
      // SETTERS UI/CONTROLE
      // ═══════════════════════════════════════════════════════════════════════

      setShowProofPanel: (show) =>
        set((state) => {
          state.showProofPanel = show;
        }, false, 'setShowProofPanel'),

      setNewProofTextData: (dataOrUpdater) =>
        set((state) => {
          if (typeof dataOrUpdater === 'function') {
            state.newProofTextData = dataOrUpdater(state.newProofTextData);
          } else {
            state.newProofTextData = dataOrUpdater;
          }
        }, false, 'setNewProofTextData'),

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
      // ACTIONS DE MANIPULAÇÃO
      // ═══════════════════════════════════════════════════════════════════════

      handleToggleProofMode: (proofId, usePdf) =>
        set((state) => {
          state.proofUsePdfMode[String(proofId)] = usePdf;
        }, false, 'handleToggleProofMode'),

      handleLinkProof: (proofId, topicTitles) =>
        set((state) => {
          state.proofTopicLinks[String(proofId)] = topicTitles;
        }, false, 'handleLinkProof'),

      handleUnlinkProof: (proofId, topicTitle) =>
        set((state) => {
          const key = String(proofId);
          const currentLinks = state.proofTopicLinks[key] || [];
          const newLinks = currentLinks.filter((t: string) => t !== topicTitle);

          if (newLinks.length === 0) {
            delete state.proofTopicLinks[key];
          } else {
            state.proofTopicLinks[key] = newLinks;
          }
        }, false, 'handleUnlinkProof'),

      handleSaveProofConclusion: (proofId, conclusion) =>
        set((state) => {
          const key = String(proofId);
          if (conclusion && conclusion.trim()) {
            state.proofConclusions[key] = conclusion;
          } else {
            delete state.proofConclusions[key];
          }
        }, false, 'handleSaveProofConclusion'),

      // ═══════════════════════════════════════════════════════════════════════
      // MÉTODOS DE PERSISTÊNCIA
      // ═══════════════════════════════════════════════════════════════════════

      serializeForPersistence: () => {
        const state = get();
        return {
          proofFiles: state.proofFiles,
          proofTexts: state.proofTexts,
          proofUsePdfMode: state.proofUsePdfMode,
          extractedProofTexts: state.extractedProofTexts,
          proofExtractionFailed: state.proofExtractionFailed,
          proofTopicLinks: state.proofTopicLinks,
          proofAnalysisResults: state.proofAnalysisResults,
          proofConclusions: state.proofConclusions,
          proofProcessingModes: state.proofProcessingModes,
          proofSendFullContent: state.proofSendFullContent
        };
      },

      restoreFromPersistence: (data) =>
        set((state) => {
          if (!data) return;

          // Restaurar arrays de provas
          if (data.proofFiles) state.proofFiles = data.proofFiles as ProofFile[];
          if (data.proofTexts) state.proofTexts = data.proofTexts as ProofText[];

          // Restaurar objetos de configuração
          if (data.proofUsePdfMode) state.proofUsePdfMode = data.proofUsePdfMode as Record<string, boolean>;
          if (data.extractedProofTexts) state.extractedProofTexts = data.extractedProofTexts as Record<string, string>;
          if (data.proofExtractionFailed) state.proofExtractionFailed = data.proofExtractionFailed as Record<string, boolean>;

          // Restaurar vinculações e análises
          if (data.proofTopicLinks) state.proofTopicLinks = data.proofTopicLinks as Record<string, string[]>;
          if (data.proofAnalysisResults) state.proofAnalysisResults = data.proofAnalysisResults as Record<string, ProofAnalysisResult>;
          if (data.proofConclusions) state.proofConclusions = data.proofConclusions as Record<string, string>;

          // Restaurar modos de processamento e flags
          if (data.proofProcessingModes) state.proofProcessingModes = data.proofProcessingModes as Record<string, ProcessingMode>;
          if (data.proofSendFullContent) state.proofSendFullContent = data.proofSendFullContent as Record<string, boolean>;
        }, false, 'restoreFromPersistence'),

      resetAll: () =>
        set((state) => {
          // Core Data
          state.proofFiles = [];
          state.proofTexts = [];
          state.proofUsePdfMode = {};
          state.extractedProofTexts = {};
          state.proofExtractionFailed = {};
          state.proofTopicLinks = {};
          state.proofAnalysisResults = {};
          state.proofConclusions = {};
          state.proofProcessingModes = {};
          state.proofSendFullContent = {};
          state.pendingProofText = null;
          state.pendingExtraction = null;
          state.pendingChatMessage = null;

          // UI/Control
          state.analyzingProofIds = new Set();
          state.showProofPanel = true;
          state.newProofTextData = { name: '', text: '' };
          state.proofToDelete = null;
          state.proofToLink = null;
          state.proofToAnalyze = null;
          state.proofAnalysisCustomInstructions = '';
          state.useOnlyMiniRelatorios = false;
          state.includeLinkedTopicsInFree = false;
        }, false, 'resetAll'),
    })),
    { name: 'ProofsStore' }
  )
);

// ═══════════════════════════════════════════════════════════════════════════════
// SELETORES OTIMIZADOS
// ═══════════════════════════════════════════════════════════════════════════════

/** Seleciona provas em PDF */
export const selectProofFiles = (state: ProofsStoreState) => state.proofFiles;

/** Seleciona provas em texto */
export const selectProofTexts = (state: ProofsStoreState) => state.proofTexts;

/** Seleciona vinculações prova -> tópicos */
export const selectProofTopicLinks = (state: ProofsStoreState) => state.proofTopicLinks;

/** Seleciona resultados de análise */
export const selectProofAnalysisResults = (state: ProofsStoreState) => state.proofAnalysisResults;

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK DE COMPATIBILIDADE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Hook de compatibilidade para transição gradual.
 * Retorna a mesma interface do useProofManager original.
 *
 * @deprecated Use useProofsStore diretamente após migração completa
 */
export function useProofManagerCompat() {
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
  const pendingProofText = useProofsStore((s) => s.pendingProofText);
  const pendingExtraction = useProofsStore((s) => s.pendingExtraction);
  const pendingChatMessage = useProofsStore((s) => s.pendingChatMessage);

  // UI/Control States
  const analyzingProofIds = useProofsStore((s) => s.analyzingProofIds);
  const showProofPanel = useProofsStore((s) => s.showProofPanel);
  const newProofTextData = useProofsStore((s) => s.newProofTextData);
  const proofToDelete = useProofsStore((s) => s.proofToDelete);
  const proofToLink = useProofsStore((s) => s.proofToLink);
  const proofToAnalyze = useProofsStore((s) => s.proofToAnalyze);
  const proofAnalysisCustomInstructions = useProofsStore((s) => s.proofAnalysisCustomInstructions);
  const useOnlyMiniRelatorios = useProofsStore((s) => s.useOnlyMiniRelatorios);
  const includeLinkedTopicsInFree = useProofsStore((s) => s.includeLinkedTopicsInFree);

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
  const setPendingProofText = useProofsStore((s) => s.setPendingProofText);
  const setPendingExtraction = useProofsStore((s) => s.setPendingExtraction);
  const setPendingChatMessage = useProofsStore((s) => s.setPendingChatMessage);

  // UI/Control Setters
  const setShowProofPanel = useProofsStore((s) => s.setShowProofPanel);
  const setNewProofTextData = useProofsStore((s) => s.setNewProofTextData);
  const setProofToDelete = useProofsStore((s) => s.setProofToDelete);
  const setProofToLink = useProofsStore((s) => s.setProofToLink);
  const setProofToAnalyze = useProofsStore((s) => s.setProofToAnalyze);
  const setProofAnalysisCustomInstructions = useProofsStore((s) => s.setProofAnalysisCustomInstructions);
  const setUseOnlyMiniRelatorios = useProofsStore((s) => s.setUseOnlyMiniRelatorios);
  const setIncludeLinkedTopicsInFree = useProofsStore((s) => s.setIncludeLinkedTopicsInFree);

  // Actions
  const addAnalyzingProof = useProofsStore((s) => s.addAnalyzingProof);
  const removeAnalyzingProof = useProofsStore((s) => s.removeAnalyzingProof);
  const isAnalyzingProof = useProofsStore((s) => s.isAnalyzingProof);
  const clearAnalyzingProofs = useProofsStore((s) => s.clearAnalyzingProofs);
  const handleToggleProofMode = useProofsStore((s) => s.handleToggleProofMode);
  const handleLinkProof = useProofsStore((s) => s.handleLinkProof);
  const handleUnlinkProof = useProofsStore((s) => s.handleUnlinkProof);
  const handleSaveProofConclusion = useProofsStore((s) => s.handleSaveProofConclusion);

  // Persistence
  const serializeForPersistence = useProofsStore((s) => s.serializeForPersistence);
  const restoreFromPersistence = useProofsStore((s) => s.restoreFromPersistence);
  const resetAll = useProofsStore((s) => s.resetAll);

  // Computed helpers
  const totalProofs = proofFiles.length + proofTexts.length;
  const hasProofs = totalProofs > 0;

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

    // Handlers (4)
    handleToggleProofMode,
    handleLinkProof,
    handleUnlinkProof,
    handleSaveProofConclusion,

    // Métodos de Persistência (3)
    serializeForPersistence,
    restoreFromPersistence,
    resetAll
  };
}

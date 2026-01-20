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
import { enableMapSet } from 'immer';
import type {
  ProofFile,
  ProofText,
  Proof,
  ProofAttachment,
  ProofAnalysisResult,
  ProcessingMode,
  NewProofTextData
} from '../types';
import { MAX_PROOF_ANALYSES } from '../types';

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

  /** Resultados de análise por prova (array de até MAX_PROOF_ANALYSES análises) */
  proofAnalysisResults: Record<string, ProofAnalysisResult[]>;

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
  setProofAnalysisResults: (results: Record<string, ProofAnalysisResult[]> | ((prev: Record<string, ProofAnalysisResult[]>) => Record<string, ProofAnalysisResult[]>)) => void;
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

  /**
   * Adiciona nova análise a uma prova (máximo MAX_PROOF_ANALYSES)
   * Se já existem MAX_PROOF_ANALYSES análises, remove a mais antiga automaticamente (FIFO)
   * @param proofId - ID da prova
   * @param analysis - Dados da análise (sem id/timestamp, serão gerados)
   */
  addProofAnalysis: (proofId: string, analysis: Omit<ProofAnalysisResult, 'id' | 'timestamp'>) => void;

  /**
   * Remove uma análise específica de uma prova
   * @param proofId - ID da prova
   * @param analysisId - ID da análise a remover
   */
  removeProofAnalysis: (proofId: string, analysisId: string) => void;

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
  // ACTIONS DE ANEXOS (v1.38.8)
  // ═══════════════════════════════════════════════════════════════════════════

  /** Adiciona anexo a uma prova */
  addAttachment: (proofId: string | number, attachment: ProofAttachment) => void;

  /** Remove anexo de uma prova */
  removeAttachment: (proofId: string | number, attachmentId: string) => void;

  /** Atualiza texto extraído de anexo PDF */
  updateAttachmentExtractedText: (proofId: string | number, attachmentId: string, text: string) => void;

  /** v1.38.10: Atualiza modo de processamento de anexo PDF */
  updateAttachmentProcessingMode: (proofId: string | number, attachmentId: string, mode: ProcessingMode) => void;

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
    proofAnalysisResults: Record<string, ProofAnalysisResult[]>;
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

// Habilita suporte a Set/Map no Immer (necessário para analyzingProofIds)
enableMapSet();

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

      addProofAnalysis: (proofId, analysis) =>
        set((state) => {
          const existing = state.proofAnalysisResults[proofId] || [];

          // Se já tem MAX_PROOF_ANALYSES, remove a mais antiga (FIFO)
          const trimmed = existing.length >= MAX_PROOF_ANALYSES
            ? existing.slice(1)
            : existing;

          const newAnalysis: ProofAnalysisResult = {
            ...analysis,
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString()
          };

          state.proofAnalysisResults[proofId] = [...trimmed, newAnalysis];
        }, false, 'addProofAnalysis'),

      removeProofAnalysis: (proofId, analysisId) =>
        set((state) => {
          const existing = state.proofAnalysisResults[proofId] || [];
          state.proofAnalysisResults[proofId] = existing.filter(a => a.id !== analysisId);

          // Se ficou vazio, remove a chave para manter store limpo
          if (state.proofAnalysisResults[proofId].length === 0) {
            delete state.proofAnalysisResults[proofId];
          }
        }, false, 'removeProofAnalysis'),

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
      // ACTIONS DE ANEXOS (v1.38.8)
      // ═══════════════════════════════════════════════════════════════════════

      addAttachment: (proofId, attachment) =>
        set((state) => {
          const key = String(proofId);
          // Procurar em proofFiles
          const fileIndex = state.proofFiles.findIndex(
            (p) => String(p.id) === key
          );
          if (fileIndex !== -1) {
            if (!state.proofFiles[fileIndex].attachments) {
              state.proofFiles[fileIndex].attachments = [];
            }
            state.proofFiles[fileIndex].attachments!.push(attachment);
            return;
          }
          // Procurar em proofTexts
          const textIndex = state.proofTexts.findIndex(
            (p) => String(p.id) === key
          );
          if (textIndex !== -1) {
            if (!state.proofTexts[textIndex].attachments) {
              state.proofTexts[textIndex].attachments = [];
            }
            state.proofTexts[textIndex].attachments!.push(attachment);
          }
        }, false, 'addAttachment'),

      removeAttachment: (proofId, attachmentId) =>
        set((state) => {
          const key = String(proofId);
          // Procurar em proofFiles
          const fileIndex = state.proofFiles.findIndex(
            (p) => String(p.id) === key
          );
          if (fileIndex !== -1 && state.proofFiles[fileIndex].attachments) {
            state.proofFiles[fileIndex].attachments = state.proofFiles[fileIndex].attachments!.filter(
              (a) => a.id !== attachmentId
            );
            return;
          }
          // Procurar em proofTexts
          const textIndex = state.proofTexts.findIndex(
            (p) => String(p.id) === key
          );
          if (textIndex !== -1 && state.proofTexts[textIndex].attachments) {
            state.proofTexts[textIndex].attachments = state.proofTexts[textIndex].attachments!.filter(
              (a) => a.id !== attachmentId
            );
          }
        }, false, 'removeAttachment'),

      updateAttachmentExtractedText: (proofId, attachmentId, text) =>
        set((state) => {
          const key = String(proofId);
          // Procurar em proofFiles
          const fileIndex = state.proofFiles.findIndex(
            (p) => String(p.id) === key
          );
          if (fileIndex !== -1 && state.proofFiles[fileIndex].attachments) {
            const attachIdx = state.proofFiles[fileIndex].attachments!.findIndex(
              (a) => a.id === attachmentId
            );
            if (attachIdx !== -1) {
              state.proofFiles[fileIndex].attachments![attachIdx].extractedText = text;
              return;
            }
          }
          // Procurar em proofTexts
          const textIndex = state.proofTexts.findIndex(
            (p) => String(p.id) === key
          );
          if (textIndex !== -1 && state.proofTexts[textIndex].attachments) {
            const attachIdx = state.proofTexts[textIndex].attachments!.findIndex(
              (a) => a.id === attachmentId
            );
            if (attachIdx !== -1) {
              state.proofTexts[textIndex].attachments![attachIdx].extractedText = text;
            }
          }
        }, false, 'updateAttachmentExtractedText'),

      updateAttachmentProcessingMode: (proofId, attachmentId, mode) =>
        set((state) => {
          const key = String(proofId);
          // Procurar em proofFiles
          const fileIndex = state.proofFiles.findIndex(
            (p) => String(p.id) === key
          );
          if (fileIndex !== -1 && state.proofFiles[fileIndex].attachments) {
            const attachIdx = state.proofFiles[fileIndex].attachments!.findIndex(
              (a) => a.id === attachmentId
            );
            if (attachIdx !== -1) {
              state.proofFiles[fileIndex].attachments![attachIdx].processingMode = mode;
              return;
            }
          }
          // Procurar em proofTexts
          const textIndex = state.proofTexts.findIndex(
            (p) => String(p.id) === key
          );
          if (textIndex !== -1 && state.proofTexts[textIndex].attachments) {
            const attachIdx = state.proofTexts[textIndex].attachments!.findIndex(
              (a) => a.id === attachmentId
            );
            if (attachIdx !== -1) {
              state.proofTexts[textIndex].attachments![attachIdx].processingMode = mode;
            }
          }
        }, false, 'updateAttachmentProcessingMode'),

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

          // Migração: converter análises antigas (objeto único) para arrays
          if (data.proofAnalysisResults) {
            const migrated: Record<string, ProofAnalysisResult[]> = {};
            for (const [proofId, analysis] of Object.entries(data.proofAnalysisResults as Record<string, unknown>)) {
              if (Array.isArray(analysis)) {
                // Já é array (formato novo)
                migrated[proofId] = analysis as ProofAnalysisResult[];
              } else if (analysis && typeof analysis === 'object') {
                // Análise antiga (objeto único) - converter para array
                const oldAnalysis = analysis as { type: string; result: string; topicTitle?: string; timestamp?: string };
                migrated[proofId] = [{
                  id: crypto.randomUUID(),
                  type: oldAnalysis.type as 'contextual' | 'livre',
                  result: oldAnalysis.result,
                  topicTitle: oldAnalysis.topicTitle,
                  timestamp: oldAnalysis.timestamp || new Date().toISOString()
                }];
              }
            }
            state.proofAnalysisResults = migrated;
          }

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


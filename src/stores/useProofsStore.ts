/**
 * @file useProofsStore.ts
 * @description Zustand store para gerenciamento de provas (dados persistidos)
 * @version 1.38.40
 *
 * FASE 3 Etapa 3.2: Store dividido em dados (aqui) e UI (useProofUIStore).
 * Este store contém: collections, config por prova, persistência.
 * Estado efêmero de UI migrado para useProofUIStore.
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type {
  ProofFile,
  ProofText,
  ProofAttachment,
  ProofAnalysisResult,
  ProcessingMode
} from '../types';
import { MAX_PROOF_ANALYSES } from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACE DO STORE
// ═══════════════════════════════════════════════════════════════════════════════

interface ProofsStoreState {
  // ═══════════════════════════════════════════════════════════════════════════
  // ESTADOS CORE DE DADOS (10)
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

  // ═══════════════════════════════════════════════════════════════════════════
  // SETTERS CORE (10)
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

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTIONS DE ANÁLISE
  // ═══════════════════════════════════════════════════════════════════════════

  addProofAnalysis: (proofId: string, analysis: Omit<ProofAnalysisResult, 'id' | 'timestamp'>) => void;
  removeProofAnalysis: (proofId: string, analysisId: string) => void;
  updateProofAnalysis: (proofId: string, analysisId: string, newResult: string) => void;

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTIONS DE MANIPULAÇÃO
  // ═══════════════════════════════════════════════════════════════════════════

  handleToggleProofMode: (proofId: string | number, usePdf: boolean) => void;
  handleLinkProof: (proofId: string | number, topicTitles: string[]) => void;
  handleUnlinkProof: (proofId: string | number, topicTitle: string) => void;
  handleSaveProofConclusion: (proofId: string | number, conclusion: string) => void;

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTIONS DE ANEXOS (v1.38.8)
  // ═══════════════════════════════════════════════════════════════════════════

  addAttachment: (proofId: string | number, attachment: ProofAttachment) => void;
  removeAttachment: (proofId: string | number, attachmentId: string) => void;
  updateAttachmentExtractedText: (proofId: string | number, attachmentId: string, text: string) => void;
  updateAttachmentProcessingMode: (proofId: string | number, attachmentId: string, mode: ProcessingMode) => void;

  // ═══════════════════════════════════════════════════════════════════════════
  // MÉTODOS DE PERSISTÊNCIA
  // ═══════════════════════════════════════════════════════════════════════════

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

  restoreFromPersistence: (data: Record<string, unknown> | null) => void;
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

      // ═══════════════════════════════════════════════════════════════════════
      // ACTIONS DE ANÁLISE
      // ═══════════════════════════════════════════════════════════════════════

      addProofAnalysis: (proofId, analysis) =>
        set((state) => {
          const existing = state.proofAnalysisResults[proofId] || [];
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
          if (state.proofAnalysisResults[proofId].length === 0) {
            delete state.proofAnalysisResults[proofId];
          }
        }, false, 'removeProofAnalysis'),

      updateProofAnalysis: (proofId, analysisId, newResult) =>
        set((state) => {
          const analyses = state.proofAnalysisResults[proofId] || [];
          state.proofAnalysisResults[proofId] = analyses.map(a =>
            a.id === analysisId ? { ...a, result: newResult } : a
          );
        }, false, 'updateProofAnalysis'),

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
          const fileIndex = state.proofFiles.findIndex((p) => String(p.id) === key);
          if (fileIndex !== -1) {
            if (!state.proofFiles[fileIndex].attachments) {
              state.proofFiles[fileIndex].attachments = [];
            }
            state.proofFiles[fileIndex].attachments!.push(attachment);
            return;
          }
          const textIndex = state.proofTexts.findIndex((p) => String(p.id) === key);
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
          const fileIndex = state.proofFiles.findIndex((p) => String(p.id) === key);
          if (fileIndex !== -1 && state.proofFiles[fileIndex].attachments) {
            state.proofFiles[fileIndex].attachments = state.proofFiles[fileIndex].attachments!.filter(
              (a) => a.id !== attachmentId
            );
            return;
          }
          const textIndex = state.proofTexts.findIndex((p) => String(p.id) === key);
          if (textIndex !== -1 && state.proofTexts[textIndex].attachments) {
            state.proofTexts[textIndex].attachments = state.proofTexts[textIndex].attachments!.filter(
              (a) => a.id !== attachmentId
            );
          }
        }, false, 'removeAttachment'),

      updateAttachmentExtractedText: (proofId, attachmentId, text) =>
        set((state) => {
          const key = String(proofId);
          const fileIndex = state.proofFiles.findIndex((p) => String(p.id) === key);
          if (fileIndex !== -1 && state.proofFiles[fileIndex].attachments) {
            const attachIdx = state.proofFiles[fileIndex].attachments!.findIndex((a) => a.id === attachmentId);
            if (attachIdx !== -1) {
              state.proofFiles[fileIndex].attachments![attachIdx].extractedText = text;
              return;
            }
          }
          const textIndex = state.proofTexts.findIndex((p) => String(p.id) === key);
          if (textIndex !== -1 && state.proofTexts[textIndex].attachments) {
            const attachIdx = state.proofTexts[textIndex].attachments!.findIndex((a) => a.id === attachmentId);
            if (attachIdx !== -1) {
              state.proofTexts[textIndex].attachments![attachIdx].extractedText = text;
            }
          }
        }, false, 'updateAttachmentExtractedText'),

      updateAttachmentProcessingMode: (proofId, attachmentId, mode) =>
        set((state) => {
          const key = String(proofId);
          const fileIndex = state.proofFiles.findIndex((p) => String(p.id) === key);
          if (fileIndex !== -1 && state.proofFiles[fileIndex].attachments) {
            const attachIdx = state.proofFiles[fileIndex].attachments!.findIndex((a) => a.id === attachmentId);
            if (attachIdx !== -1) {
              state.proofFiles[fileIndex].attachments![attachIdx].processingMode = mode;
              return;
            }
          }
          const textIndex = state.proofTexts.findIndex((p) => String(p.id) === key);
          if (textIndex !== -1 && state.proofTexts[textIndex].attachments) {
            const attachIdx = state.proofTexts[textIndex].attachments!.findIndex((a) => a.id === attachmentId);
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
          if (data.proofFiles) state.proofFiles = data.proofFiles as ProofFile[];
          if (data.proofTexts) state.proofTexts = data.proofTexts as ProofText[];
          if (data.proofUsePdfMode) state.proofUsePdfMode = data.proofUsePdfMode as Record<string, boolean>;
          if (data.extractedProofTexts) state.extractedProofTexts = data.extractedProofTexts as Record<string, string>;
          if (data.proofExtractionFailed) state.proofExtractionFailed = data.proofExtractionFailed as Record<string, boolean>;
          if (data.proofTopicLinks) state.proofTopicLinks = data.proofTopicLinks as Record<string, string[]>;

          // Migração: converter análises antigas (objeto único) para arrays
          if (data.proofAnalysisResults) {
            const migrated: Record<string, ProofAnalysisResult[]> = {};
            for (const [proofId, analysis] of Object.entries(data.proofAnalysisResults as Record<string, unknown>)) {
              if (Array.isArray(analysis)) {
                migrated[proofId] = analysis as ProofAnalysisResult[];
              } else if (analysis && typeof analysis === 'object') {
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
          if (data.proofProcessingModes) state.proofProcessingModes = data.proofProcessingModes as Record<string, ProcessingMode>;
          if (data.proofSendFullContent) state.proofSendFullContent = data.proofSendFullContent as Record<string, boolean>;
        }, false, 'restoreFromPersistence'),

      resetAll: () =>
        set((state) => {
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
        }, false, 'resetAll'),
    })),
    { name: 'ProofsStore' }
  )
);

// ═══════════════════════════════════════════════════════════════════════════════
// SELETORES OTIMIZADOS
// ═══════════════════════════════════════════════════════════════════════════════

export const selectProofFiles = (state: ProofsStoreState) => state.proofFiles;
export const selectProofTexts = (state: ProofsStoreState) => state.proofTexts;
export const selectProofTopicLinks = (state: ProofsStoreState) => state.proofTopicLinks;
export const selectProofAnalysisResults = (state: ProofsStoreState) => state.proofAnalysisResults;

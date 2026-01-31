/**
 * @file useChangeDetectionHashes.ts
 * @description Hook para cálculo de hashes de detecção de mudanças
 *
 * FASE 41: Extraído do App.tsx para consolidar lógica de hashing usada
 * no sistema de auto-save e detecção de alterações não salvas.
 *
 * Hashes calculados:
 * - extractedTopicsHash: Detecta mudanças em tópicos extraídos
 * - selectedTopicsHash: Detecta mudanças em tópicos selecionados
 * - proofsHash: Detecta mudanças em provas (files, texts, extracted)
 */

import { useMemo } from 'react';
import type { Topic, ProofFile, ProofText, ProofAnalysisResult } from '../types';
import { fastHashUtil } from '../utils/context-helpers';

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════════

export interface ProofManagerData {
  proofFiles?: ProofFile[];
  proofTexts?: ProofText[];
  extractedProofTexts?: Record<string, string>;
  proofConclusions?: Record<string, string>;
  proofTopicLinks?: Record<string, string[]>;
  proofAnalysisResults?: Record<string, ProofAnalysisResult[]>;
  proofUsePdfMode?: Record<string, boolean>;
  proofSendFullContent?: Record<string, boolean>;
}

export interface UseChangeDetectionHashesReturn {
  extractedTopicsHash: string;
  selectedTopicsHash: string;
  proofsHash: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNÇÕES AUXILIARES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calcula hash de um array de tópicos
 * Inclui todos os campos relevantes para detectar qualquer tipo de edição
 */
function computeTopicsHash(topics: Topic[] | undefined): string {
  if (!topics || topics.length === 0) return 'empty';

  try {
    const signature = topics
      .map((t, idx) => {
        const id = t?.id || '';
        const title = t?.title || '';
        const category = t?.category || '';
        const resultado = t?.resultado || '';
        // Hash do conteúdo completo para detectar qualquer mudança
        const contentHash = fastHashUtil(t?.content || '');
        const fundamentacaoHash = fastHashUtil(t?.fundamentacao || '');
        const editedFundHash = fastHashUtil(t?.editedFundamentacao || '');
        const editedRelHash = fastHashUtil(t?.editedRelatorio || '');
        const editedContentHash = fastHashUtil(t?.editedContent || '');
        return `${idx}:${id}-${title}-${category}-${contentHash}-${fundamentacaoHash}-${editedFundHash}-${editedRelHash}-${editedContentHash}-${resultado}`;
      })
      .join('||');

    return fastHashUtil(signature);
  } catch {
    return 'error';
  }
}

/**
 * Calcula hash das provas
 * Inclui arquivos, textos, extrações, conclusões, vínculos e análises
 */
function computeProofsHash(proofManager: ProofManagerData): string {
  try {
    // Hash dos arquivos de prova
    const proofFilesSig = (proofManager.proofFiles || [])
      .map(p => `${p?.id || ''}-${p?.name || ''}-${p?.size || 0}`)
      .join('|');

    // Hash dos textos de prova
    const proofTextsSig = (proofManager.proofTexts || [])
      .map(p => {
        const id = p?.id || '';
        const name = p?.name || '';
        const text = p?.text || '';
        const textPreview = typeof text === 'string' ? text.substring(0, 50) : '';
        return `${id}-${name}-${textPreview}`;
      })
      .join('|');

    // Hash dos textos extraídos
    const extractedTexts = proofManager.extractedProofTexts || {};
    const extractedSig = Object.keys(extractedTexts)
      .map(id => {
        const text = extractedTexts[id] || '';
        const textPreview = typeof text === 'string' ? text.substring(0, 50) : '';
        return `${id}-${textPreview}`;
      })
      .join('|');

    // Hash das conclusões
    const conclusions = proofManager.proofConclusions || {};
    const conclusionsSig = Object.keys(conclusions)
      .map(id => {
        const text = conclusions[id] || '';
        const textPreview = typeof text === 'string' ? text.substring(0, 50) : '';
        return `${id}-${textPreview}`;
      })
      .join('|');

    // Hash dos vínculos prova-tópico
    const topicLinks = proofManager.proofTopicLinks || {};
    const topicLinksSig = Object.keys(topicLinks)
      .map(id => {
        const links = topicLinks[id] || [];
        return `${id}:[${links.join(',')}]`;
      })
      .join('|');

    // Hash dos resultados de análise IA (v1.38.27: array format)
    const analysisResults = proofManager.proofAnalysisResults || {};
    const analysisResultsSig = Object.keys(analysisResults)
      .map(id => {
        const analyses = analysisResults[id] || [];
        const analysisSigs = analyses.map((a, idx) => {
          const type = a.type || '';
          const result = a.result || '';
          const resultPreview = typeof result === 'string' ? result.substring(0, 50) : '';
          const resultLen = typeof result === 'string' ? result.length : 0;
          return `${idx}:${type}:${resultPreview}:${resultLen}`;
        });
        return `${id}:[${analysisSigs.join(';')}]`;
      })
      .join('|');

    // Hash das flags de modo PDF e enviar conteúdo completo
    const pdfModeSig = JSON.stringify(proofManager.proofUsePdfMode || {});
    const sendFullContentSig = JSON.stringify(proofManager.proofSendFullContent || {});

    // Combinar todas as assinaturas
    const signature = `${proofFilesSig}||${proofTextsSig}||${extractedSig}||${conclusionsSig}||${topicLinksSig}||${analysisResultsSig}||${pdfModeSig}||${sendFullContentSig}`;
    return fastHashUtil(signature);
  } catch {
    return 'error';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Hook para calcular hashes de detecção de mudanças
 *
 * @param extractedTopics - Array de tópicos extraídos
 * @param selectedTopics - Array de tópicos selecionados
 * @param proofManager - Objeto com dados das provas
 */
export function useChangeDetectionHashes(
  extractedTopics: Topic[] | undefined,
  selectedTopics: Topic[] | undefined,
  proofManager: ProofManagerData
): UseChangeDetectionHashesReturn {
  // Hash de tópicos extraídos
  const extractedTopicsHash = useMemo(
    () => computeTopicsHash(extractedTopics),
    [extractedTopics]
  );

  // Hash de tópicos selecionados
  const selectedTopicsHash = useMemo(
    () => computeTopicsHash(selectedTopics),
    [selectedTopics]
  );

  // Hash de provas
  const proofsHash = useMemo(
    () => computeProofsHash(proofManager),
    [
      proofManager.proofFiles,
      proofManager.proofTexts,
      proofManager.extractedProofTexts,
      proofManager.proofConclusions,
      proofManager.proofTopicLinks,
      proofManager.proofAnalysisResults,
      proofManager.proofUsePdfMode,
      proofManager.proofSendFullContent,
    ]
  );

  return {
    extractedTopicsHash,
    selectedTopicsHash,
    proofsHash,
  };
}

export default useChangeDetectionHashes;

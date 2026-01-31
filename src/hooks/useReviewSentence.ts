/**
 * @file useReviewSentence.ts
 * @description Hook para revisão crítica de sentenças
 *
 * FASE 44: Extraído do App.tsx para consolidar lógica de revisão
 * de sentenças com IA, incluindo cache e double check.
 *
 * v1.37.59: Integração com DoubleCheckReviewModal - abre modal para revisão de correções
 *
 * Responsabilidades:
 * - Gerenciar estado da revisão (scope, result, loading, fromCache)
 * - Executar revisão com IA
 * - Integrar com cache de revisões
 * - Aplicar double check quando habilitado
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import useSentenceReviewCache from './useSentenceReviewCache';
import { useUIStore } from '../stores/useUIStore';
import { normalizeHTMLSpacing } from '../utils/text';
import { AI_PROMPTS } from '../prompts';
import type { AIMessageContent, AnalyzedDocuments, DoubleCheckReviewResult, DoubleCheckCorrection } from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════════

export type ReviewScope = 'decisionOnly' | 'decisionWithDocs';

export interface CanGenerateResult {
  enabled: boolean;
  reason: string;
}

export interface AIIntegrationForReview {
  callAI: (messages: Array<{ role: string; content: AIMessageContent[] }>, options?: {
    maxTokens?: number;
    systemPrompt?: string;
    useInstructions?: boolean;
    logMetrics?: boolean;
    temperature?: number;
    topP?: number;
    topK?: number;
  }) => Promise<string>;
  /** v1.40.01: Streaming para evitar timeout no Render */
  callAIStream?: (messages: Array<{ role: string; content: AIMessageContent[] }>, options?: {
    maxTokens?: number;
    systemPrompt?: string;
    useInstructions?: boolean;
    temperature?: number;
    topP?: number;
    topK?: number;
    onChunk?: (text: string) => void;
  }) => Promise<string>;
  aiSettings: {
    doubleCheck?: {
      enabled: boolean;
      operations: {
        sentenceReview?: boolean;
      };
    };
  };
  performDoubleCheck: (operation: string, content: string, context: AIMessageContent[]) => Promise<{  // v1.37.68: mudou de string para array
    verified: string;
    corrections: string[];
    summary: string;
    confidence?: number;
    failed?: boolean;
  }>;
}

export interface UseReviewSentenceProps {
  canGenerateDispositivo: CanGenerateResult;
  setError: (error: string) => void;
  buildDecisionText: () => string;
  buildDocumentContentArray: (docs: AnalyzedDocuments, options: { includeComplementares: boolean }) => AIMessageContent[];
  analyzedDocuments: AnalyzedDocuments | null;
  aiIntegration: AIIntegrationForReview;
  showToast: (message: string, type?: 'error' | 'success' | 'info' | 'warning') => void;
  closeModal: (id: 'sentenceReview' | 'sentenceReviewResult') => void;
  openModal: (id: 'sentenceReview' | 'sentenceReviewResult') => void;
}

export interface UseReviewSentenceReturn {
  // Estados
  reviewScope: ReviewScope;
  setReviewScope: (scope: ReviewScope) => void;
  reviewResult: string;
  setReviewResult: (result: string) => void;
  generatingReview: boolean;
  reviewFromCache: boolean;

  // Funções
  reviewSentence: () => Promise<void>;
  clearReviewCache: () => Promise<void>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Hook para revisão crítica de sentenças
 *
 * @param props - Dependências necessárias
 */
export function useReviewSentence({
  canGenerateDispositivo,
  setError,
  buildDecisionText,
  buildDocumentContentArray,
  analyzedDocuments,
  aiIntegration,
  showToast,
  closeModal,
  openModal,
}: UseReviewSentenceProps): UseReviewSentenceReturn {
  // ═══════════════════════════════════════════════════════════════════════════════
  // ESTADOS
  // ═══════════════════════════════════════════════════════════════════════════════

  const [reviewScope, setReviewScope] = useState<ReviewScope>('decisionOnly');
  const [reviewResult, setReviewResult] = useState('');
  const [generatingReview, setGeneratingReview] = useState(false);
  const [reviewFromCache, setReviewFromCache] = useState(false);

  // Double Check Review - Zustand actions (v1.37.59)
  const openDoubleCheckReview = useUIStore(state => state.openDoubleCheckReview);
  const doubleCheckResult = useUIStore(state => state.doubleCheckResult);
  const setDoubleCheckResult = useUIStore(state => state.setDoubleCheckResult);

  // Ref para armazenar o resolver da Promise que aguarda decisão do usuário
  const pendingDoubleCheckResolve = useRef<((result: DoubleCheckReviewResult) => void) | null>(null);

  // Quando o usuário decide no modal, resolver a Promise pendente
  useEffect(() => {
    if (doubleCheckResult && doubleCheckResult.operation === 'sentenceReview' && pendingDoubleCheckResolve.current) {
      pendingDoubleCheckResolve.current(doubleCheckResult);
      pendingDoubleCheckResolve.current = null;
      setDoubleCheckResult(null); // Limpar após consumir
    }
  }, [doubleCheckResult, setDoubleCheckResult]);

  // Cache de revisão de sentença
  const sentenceReviewCache = useSentenceReviewCache();

  // ═══════════════════════════════════════════════════════════════════════════════
  // FUNÇÃO DE REVISÃO
  // ═══════════════════════════════════════════════════════════════════════════════

  const reviewSentence = useCallback(async () => {
    if (!canGenerateDispositivo.enabled) {
      setError('Complete todos os tópicos antes de revisar a sentença.');
      return;
    }

    setGeneratingReview(true);
    setError('');

    try {
      // Verificar cache primeiro
      const cachedReview = await sentenceReviewCache.getReview(reviewScope);
      if (cachedReview) {
        setReviewResult(cachedReview);
        setReviewFromCache(true);
        closeModal('sentenceReview');
        openModal('sentenceReviewResult');
        setGeneratingReview(false);
        return;
      }

      // Não há cache, gerar com IA
      setReviewFromCache(false);
      const contentArray: AIMessageContent[] = [];

      // Se escopo inclui documentos, usar buildDocumentContentArray existente
      if (reviewScope === 'decisionWithDocs' && analyzedDocuments) {
        const docsArray = buildDocumentContentArray(analyzedDocuments, { includeComplementares: true });
        contentArray.push(...docsArray);
      }

      // Adicionar decisão completa
      contentArray.push({
        type: 'text' as const,
        text: `DECISÃO PARA REVISÃO:\n\n${buildDecisionText()}`
      });

      // v1.40.01: Usar streaming silencioso para evitar timeout de 30s no Render
      // Parâmetros específicos para revisão crítica (mais rigoroso, menos criativo)
      let result: string;

      if (aiIntegration.callAIStream) {
        // Streaming silencioso: evita timeout, não mostra texto parcial
        result = await aiIntegration.callAIStream([{
          role: 'user',
          content: contentArray
        }], {
          maxTokens: 8192,
          systemPrompt: AI_PROMPTS.revisaoSentenca(reviewScope === 'decisionWithDocs'),
          useInstructions: false,
          temperature: 0.2,
          topP: 0.9,
          topK: 40
        });
      } else {
        // Fallback: chamada tradicional
        result = await aiIntegration.callAI([{
          role: 'user',
          content: contentArray
        }], {
          maxTokens: 8192,
          systemPrompt: AI_PROMPTS.revisaoSentenca(reviewScope === 'decisionWithDocs'),
          useInstructions: false,
          logMetrics: true,
          temperature: 0.2,
          topP: 0.9,
          topK: 40
        });
      }

      let reviewFinal = normalizeHTMLSpacing(result.trim());

      // Double Check da Revisão de Sentença
      if (aiIntegration.aiSettings.doubleCheck?.enabled &&
          aiIntegration.aiSettings.doubleCheck?.operations.sentenceReview) {

        // v1.37.68: Usar contentArray original (inclui documentos se scope=decisionWithDocs)
        // contentArray já contém: documentos via buildDocumentContentArray + decisão via buildDecisionText
        try {
          const { verified, corrections, summary, confidence } = await aiIntegration.performDoubleCheck(
            'sentenceReview',
            reviewFinal,
            contentArray  // Array original (já é AIMessageContent[])
          );

          if (corrections.length > 0) {
            // v1.37.86: Preservar campos originais da IA (antes: sobrescritos com valores genéricos)
            const typedCorrections: DoubleCheckCorrection[] = corrections.map((c) => {
              // Se a IA retornou objeto estruturado, preservar campos
              if (typeof c === 'object' && c !== null) {
                const correction = c as DoubleCheckCorrection;
                return {
                  type: correction.type || 'improve',
                  item: correction.item || '',
                  suggestion: correction.suggestion || '',
                  reason: correction.reason || ''
                } as DoubleCheckCorrection;
              }
              // Fallback para string (compatibilidade legada)
              return {
                type: 'improve' as const,
                item: String(c),
                suggestion: '',
                reason: ''
              };
            });

            // Criar Promise para aguardar decisão do usuário
            const waitForDecision = new Promise<DoubleCheckReviewResult>(resolve => {
              pendingDoubleCheckResolve.current = resolve;
            });

            // Abrir modal de revisão
            openDoubleCheckReview({
              operation: 'sentenceReview',
              originalResult: reviewFinal,
              verifiedResult: verified,
              corrections: typedCorrections,
              summary,
              confidence: Math.round((confidence ?? 0.85) * 100)
            });

            // Aguardar decisão do usuário
            const result = await waitForDecision;

            // Aplicar resultado da decisão
            if (result.selected.length > 0) {
              reviewFinal = result.finalResult;
              showToast(`🔄 Double Check: ${result.selected.length} correção(ões) aplicada(s)`, 'info');
              console.log('[DoubleCheck Review] Correções aplicadas pelo usuário:', result.selected);
            } else {
              console.log('[DoubleCheck Review] Usuário descartou todas as correções');
              showToast('Double Check: correções descartadas', 'info');
            }
          } else {
            console.log('[DoubleCheck Review] Nenhuma correção necessária');
          }
        } catch (dcError) {
          console.error('[DoubleCheck Review] Erro:', dcError);
          // Continuar com revisão original em caso de erro
        }
      }

      // Salvar no cache após gerar
      await sentenceReviewCache.saveReview(reviewScope, reviewFinal);

      setReviewResult(reviewFinal);
      closeModal('sentenceReview');
      openModal('sentenceReviewResult');
    } catch (err) {
      setError('Erro ao revisar sentença: ' + (err as Error).message);
    } finally {
      setGeneratingReview(false);
    }
  }, [
    canGenerateDispositivo,
    setError,
    reviewScope,
    sentenceReviewCache,
    buildDecisionText,
    buildDocumentContentArray,
    analyzedDocuments,
    aiIntegration,
    showToast,
    closeModal,
    openModal,
    openDoubleCheckReview
  ]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // LIMPAR CACHE
  // ═══════════════════════════════════════════════════════════════════════════════

  const clearReviewCache = useCallback(async () => {
    await sentenceReviewCache.deleteReview(reviewScope);
    setReviewFromCache(false);
  }, [sentenceReviewCache, reviewScope]);

  return {
    reviewScope,
    setReviewScope,
    reviewResult,
    setReviewResult,
    generatingReview,
    reviewFromCache,
    reviewSentence,
    clearReviewCache,
  };
}

export default useReviewSentence;

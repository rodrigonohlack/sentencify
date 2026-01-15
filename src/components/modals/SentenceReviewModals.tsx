/**
 * @file SentenceReviewModals.tsx
 * @description Modais para revisão crítica de sentenças
 * @version 1.37.51
 *
 * Extraído do App.tsx como parte da extração de modais.
 * Contém dois modais relacionados:
 * - SentenceReviewOptionsModal: Seleção de escopo da revisão
 * - SentenceReviewResultModal: Exibição do resultado da revisão
 */

import React, { useRef, useState, useCallback } from 'react';
import { Scale, X, Sparkles, AlertTriangle, Copy, Check, RotateCcw } from 'lucide-react';
import { useModalManager } from '../../hooks/useModalManager';
import { extractPlainText } from '../';  // Barrel export do components
import type { ReviewScope } from '../../hooks/useReviewSentence';
import type { AnalyzedDocuments } from '../../types';
import { CSS } from '../../constants/styles';

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════════

interface SentenceReviewOptionsModalProps {
  reviewScope: ReviewScope;
  setReviewScope: (scope: ReviewScope) => void;
  analyzedDocuments: AnalyzedDocuments | null;
  generatingReview: boolean;
  reviewSentence: () => Promise<void>;
}

interface SentenceReviewResultModalProps {
  reviewResult: string | null;
  reviewFromCache: boolean;
  sanitizeHTML: (html: string) => string;
  clearReviewCache: () => Promise<void>;
  setError: (error: string) => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SENTENCE REVIEW OPTIONS MODAL
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * SentenceReviewOptionsModal - Modal de opções para revisão de sentença
 *
 * Permite escolher o escopo da revisão:
 * - Apenas decisão (relatório + tópicos + dispositivo)
 * - Decisão + peças processuais (inclui petição e contestações)
 */
export const SentenceReviewOptionsModal: React.FC<SentenceReviewOptionsModalProps> = ({
  reviewScope,
  setReviewScope,
  analyzedDocuments,
  generatingReview,
  reviewSentence
}) => {
  const { modals, closeModal } = useModalManager();

  if (!modals.sentenceReview) return null;

  const hasDocuments = (analyzedDocuments?.peticoesText?.length || 0) > 0 || (analyzedDocuments?.contestacoesText?.length || 0) > 0;

  return (
    <div className={CSS.modalOverlay}>
      <div className={`${CSS.modalContainer} theme-border-modal theme-modal-glow animate-modal max-w-lg`}>
        <div className={CSS.modalHeader}>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-amber-500/20">
                <Scale className="w-6 h-6 text-amber-400" />
              </div>
              <h3 className="text-lg font-semibold theme-text-primary">Revisar Sentença</h3>
            </div>
            <button
              onClick={() => closeModal('sentenceReview')}
              className="p-2 rounded-xl theme-bg-secondary-50 theme-hover-bg transition-colors"
              title="Fechar"
            >
              <X className="w-5 h-5 theme-text-tertiary" />
            </button>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm theme-text-tertiary mb-4">
            Análise crítica da decisão buscando omissões, contradições e obscuridades que poderiam fundamentar embargos de declaração.
          </p>
          {/* Radio 1: Apenas decisão */}
          <label className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
            reviewScope === 'decisionOnly' ? 'border-amber-500 bg-amber-500/10' : 'theme-border-input theme-bg-secondary-30'
          }`}>
            <input
              type="radio"
              name="reviewScope"
              checked={reviewScope === 'decisionOnly'}
              onChange={() => setReviewScope('decisionOnly')}
              className="w-4 h-4 text-amber-600 mt-1"
            />
            <div>
              <span className="text-sm font-medium theme-text-primary">Apenas a decisão completa</span>
              <p className="text-xs theme-text-muted mt-1">RELATÓRIO + todos os tópicos (mini-relatórios + decisões) + DISPOSITIVO</p>
            </div>
          </label>
          {/* Radio 2: Decisão + documentos */}
          <label className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
            reviewScope === 'decisionWithDocs' ? 'border-amber-500 bg-amber-500/10' : 'theme-border-input theme-bg-secondary-30'
          } ${!hasDocuments ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <input
              type="radio"
              name="reviewScope"
              disabled={!hasDocuments}
              checked={reviewScope === 'decisionWithDocs'}
              onChange={() => hasDocuments && setReviewScope('decisionWithDocs')}
              className="w-4 h-4 text-amber-600 mt-1"
            />
            <div>
              <span className="text-sm font-medium theme-text-primary">Decisão + peças processuais</span>
              <p className="text-xs theme-text-muted mt-1">Inclui petição inicial, contestações e documentos complementares</p>
              {!hasDocuments && (
                <p className="text-xs text-red-400 mt-1">Nenhum documento extraído disponível</p>
              )}
            </div>
          </label>
        </div>
        <div className={CSS.modalFooter}>
          <button onClick={() => closeModal('sentenceReview')} disabled={generatingReview} className={CSS.btnSecondary}>
            Cancelar
          </button>
          <button
            onClick={reviewSentence}
            disabled={generatingReview}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover-amber-700 disabled:opacity-50"
          >
            {generatingReview ? (
              <>
                <div className={CSS.spinner}></div>
                Analisando...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Iniciar Revisão
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// SENTENCE REVIEW RESULT MODAL
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * SentenceReviewResultModal - Modal de resultado da revisão de sentença
 *
 * Exibe o resultado da análise crítica com:
 * - Aviso sobre revisão por IA
 * - Conteúdo HTML sanitizado
 * - Botões para copiar, regenerar e fechar
 */
export const SentenceReviewResultModal: React.FC<SentenceReviewResultModalProps> = ({
  reviewResult,
  reviewFromCache,
  sanitizeHTML,
  clearReviewCache,
  setError
}) => {
  const { modals, closeModal, openModal } = useModalManager();
  const [copySuccess, setCopySuccess] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopy = useCallback(async () => {
    if (!reviewResult) return;
    try {
      const plainText = extractPlainText(reviewResult);
      await navigator.clipboard.writeText(plainText);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      setCopySuccess(true);
      copyTimeoutRef.current = setTimeout(() => setCopySuccess(false), 3000);
    } catch (err) {
      setError('Erro ao copiar: ' + (err as Error).message);
    }
  }, [reviewResult, setError]);

  const handleRegenerate = useCallback(async () => {
    await clearReviewCache();
    closeModal('sentenceReviewResult');
    openModal('sentenceReview');
  }, [clearReviewCache, closeModal, openModal]);

  if (!modals.sentenceReviewResult || !reviewResult) return null;

  return (
    <div className={`${CSS.modalOverlay} overflow-auto`}>
      <div className={`${CSS.modalContainer} max-w-5xl w-full max-h-[95vh] flex flex-col my-auto`}>
        <div className={`${CSS.modalHeader} flex-shrink-0`}>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <Scale className="w-6 h-6 text-amber-400" />
              <div>
                <h3 className="text-xl font-bold text-amber-400">Revisão Crítica da Sentença</h3>
                <div className="flex items-center gap-2">
                  <p className="text-sm theme-text-muted">Análise detalhada por IA - revise os apontamentos abaixo</p>
                  {/* Badge de cache */}
                  {reviewFromCache && (
                    <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">
                      📦 Cache
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button onClick={() => closeModal('sentenceReviewResult')} className="p-2 rounded-lg hover-slate-700">
              <X className="w-5 h-5 theme-text-muted" />
            </button>
          </div>
        </div>
        {/* Aviso */}
        <div className="mx-6 mt-4 p-4 bg-amber-500/15 border border-amber-500/30 rounded-lg flex-shrink-0">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-400 mb-1">REVISÃO POR IA - AVALIE CRITICAMENTE</p>
              <p className="text-xs theme-text-muted">Esta análise foi gerada por inteligência artificial e pode conter falsos positivos ou não identificar todos os problemas. Use como ferramenta de apoio, não como decisão final.</p>
            </div>
          </div>
        </div>
        {/* Conteúdo com scroll */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div
            className="prose prose-sm max-w-none theme-text-secondary dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: sanitizeHTML(reviewResult) }}
          />
        </div>
        {/* Footer */}
        <div className={`${CSS.modalFooter} flex-shrink-0`}>
          <button
            onClick={handleCopy}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${copySuccess ? 'bg-green-600 text-white' : 'theme-bg-secondary hover-slate-600'}`}
          >
            {copySuccess ? (
              <><Check className="w-4 h-4" /> Copiado!</>
            ) : (
              <><Copy className="w-4 h-4" /> Copiar Texto</>
            )}
          </button>
          {/* Botão Regenerar */}
          <button
            onClick={handleRegenerate}
            className="flex items-center gap-2 px-4 py-2 theme-bg-secondary hover-slate-600 rounded-lg"
            title="Limpar cache e gerar nova revisão"
          >
            <RotateCcw className="w-4 h-4" /> Regenerar
          </button>
          <button
            onClick={() => closeModal('sentenceReviewResult')}
            className="px-6 py-2 bg-amber-600 text-white rounded-lg hover-amber-700"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default { SentenceReviewOptionsModal, SentenceReviewResultModal };

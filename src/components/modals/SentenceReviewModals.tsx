/**
 * @file SentenceReviewModals.tsx
 * @description Modais para revisão crítica de sentenças
 * @version 1.37.52
 *
 * Extraído do App.tsx como parte da extração de modais.
 * v1.37.52: Migrado para BaseModal (scroll lock + visual consistente)
 *
 * Contém dois modais relacionados:
 * - SentenceReviewOptionsModal: Seleção de escopo da revisão
 * - SentenceReviewResultModal: Exibição do resultado da revisão
 */

import React, { useRef, useState, useCallback } from 'react';
import { Scale, Sparkles, AlertTriangle, Copy, Check, RotateCcw, Filter } from 'lucide-react';
import { BaseModal, CSS } from './BaseModal';
import { useModalManager } from '../../hooks/useModalManager';
import { extractPlainText } from '../';  // Barrel export do components
import type { ReviewScope } from '../../hooks/useReviewSentence';
import { buildCacheKey } from '../../hooks/useSentenceReviewCache';
import type { AnalyzedDocuments } from '../../types';

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════════

interface SentenceReviewOptionsModalProps {
  reviewScope: ReviewScope;
  setReviewScope: (scope: ReviewScope) => void;
  /** v1.42.04: Excluir tópicos com resultado 'SEM RESULTADO' do envio à IA */
  excludeNoResultTopics: boolean;
  setExcludeNoResultTopics: (value: boolean) => void;
  analyzedDocuments: AnalyzedDocuments | null;
  generatingReview: boolean;
  reviewSentence: () => Promise<void>;
  /** Conjunto de chaves compostas (`scope` ou `scope:noEmpty`) com cache disponível */
  cachedScopes?: Set<string>;
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
  excludeNoResultTopics,
  setExcludeNoResultTopics,
  analyzedDocuments,
  generatingReview,
  reviewSentence,
  cachedScopes
}) => {
  const { modals, closeModal } = useModalManager();

  const hasDocuments = (analyzedDocuments?.peticoesText?.length || 0) > 0 || (analyzedDocuments?.contestacoesText?.length || 0) > 0;

  // v1.42.04: Badge de cache reflete a combinação atual (scope + flag)
  const hasCacheFor = (scope: ReviewScope): boolean =>
    cachedScopes?.has(buildCacheKey(scope, excludeNoResultTopics)) ?? false;

  return (
    <BaseModal
      isOpen={modals.sentenceReview}
      onClose={() => closeModal('sentenceReview')}
      title="Revisar Sentença"
      icon={<Scale />}
      iconColor="orange"
      size="md"
      preventClose={generatingReview}
      footer={
        <>
          <button onClick={() => closeModal('sentenceReview')} disabled={generatingReview} className={CSS.btnSecondary}>
            Cancelar
          </button>
          <button
            onClick={reviewSentence}
            disabled={generatingReview}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-lg shadow-amber-500/25 disabled:opacity-50"
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
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm theme-text-tertiary">
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
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium theme-text-primary">Apenas a decisão completa</span>
              {hasCacheFor('decisionOnly') && (
                <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded font-medium">Cache</span>
              )}
            </div>
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
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium theme-text-primary">Decisão + peças processuais</span>
              {hasCacheFor('decisionWithDocs') && (
                <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded font-medium">Cache</span>
              )}
            </div>
            <p className="text-xs theme-text-muted mt-1">Inclui petição inicial, contestações e documentos complementares</p>
            {!hasDocuments && (
              <p className="text-xs text-red-400 mt-1">Nenhum documento extraído disponível</p>
            )}
          </div>
        </label>
        {/* v1.42.04: Toggle para excluir tópicos com resultado 'SEM RESULTADO' */}
        <div className="flex items-start justify-between gap-3 p-4 rounded-lg border theme-border-input theme-bg-secondary-30">
          <div className="flex items-start gap-3">
            <Filter className="w-4 h-4 mt-0.5 text-amber-500" aria-hidden="true" />
            <div>
              <span className="text-sm font-medium theme-text-primary">Excluir tópicos sem resultado</span>
              <p className="text-xs theme-text-muted mt-1">
                Não envia tópicos marcados como &quot;SEM RESULTADO&quot; — economiza tokens e foca a revisão.
              </p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={excludeNoResultTopics}
            aria-pressed={excludeNoResultTopics}
            aria-label={excludeNoResultTopics ? 'Desativar exclusão de tópicos sem resultado' : 'Ativar exclusão de tópicos sem resultado'}
            onClick={() => setExcludeNoResultTopics(!excludeNoResultTopics)}
            disabled={generatingReview}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              excludeNoResultTopics
                ? 'bg-amber-600 hover:bg-amber-500'
                : 'bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500'
            }`}
          >
            <span
              aria-hidden="true"
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                excludeNoResultTopics ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      </div>
    </BaseModal>
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

  if (!reviewResult) return null;

  return (
    <BaseModal
      isOpen={modals.sentenceReviewResult}
      onClose={() => closeModal('sentenceReviewResult')}
      title="Revisão Crítica da Sentença"
      subtitle={
        <div className="flex items-center gap-2">
          <span>Análise detalhada por IA - revise os apontamentos abaixo</span>
          {reviewFromCache && (
            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">
              Cache
            </span>
          )}
        </div>
      }
      icon={<Scale />}
      iconColor="orange"
      size="2xl"
      footer={
        <>
          <button
            onClick={handleCopy}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${copySuccess ? 'bg-green-600 text-white' : 'theme-bg-secondary hover:theme-bg-secondary-hover'}`}
          >
            {copySuccess ? (
              <><Check className="w-4 h-4" /> Copiado!</>
            ) : (
              <><Copy className="w-4 h-4" /> Copiar Texto</>
            )}
          </button>
          <button
            onClick={handleRegenerate}
            className="flex items-center gap-2 px-4 py-2 theme-bg-secondary hover:theme-bg-secondary-hover rounded-lg"
            title="Limpar cache e gerar nova revisão"
          >
            <RotateCcw className="w-4 h-4" /> Regenerar
          </button>
          <button
            onClick={() => closeModal('sentenceReviewResult')}
            className="px-6 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-lg"
          >
            Fechar
          </button>
        </>
      }
    >
      {/* Aviso */}
      <div className="mb-4 p-4 bg-amber-500/15 border border-amber-500/30 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-amber-400 mb-1">REVISÃO POR IA - AVALIE CRITICAMENTE</p>
            <p className="text-xs theme-text-muted">Esta análise foi gerada por inteligência artificial e pode conter falsos positivos ou não identificar todos os problemas. Use como ferramenta de apoio, não como decisão final.</p>
          </div>
        </div>
      </div>
      {/* Conteúdo */}
      <div
        className="prose prose-sm max-w-none theme-text-secondary dark:prose-invert"
        dangerouslySetInnerHTML={{ __html: sanitizeHTML(reviewResult) }}
      />
    </BaseModal>
  );
};

export default { SentenceReviewOptionsModal, SentenceReviewResultModal };

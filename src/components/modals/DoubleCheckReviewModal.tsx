/**
 * @file DoubleCheckReviewModal.tsx
 * @description Modal para revisão de correções do Double Check
 * @version 1.37.59
 *
 * Modal OBRIGATÓRIO (sem fechar com X, ESC ou click fora).
 * O usuário DEVE escolher entre "Descartar Todas" ou "Aplicar Selecionadas".
 */

import React, { useState, useCallback, useMemo } from 'react';
import { RefreshCw, Check, Info } from 'lucide-react';
import { BaseModal, CSS, ModalInfoBox } from './BaseModal';
import { useUIStore } from '../../stores/useUIStore';
import type { DoubleCheckCorrectionWithSelection } from '../../types';
import {
  getCorrectionIcon,
  correctionsToSelectable,
  applySelectedCorrections,
  getSelectedCorrections,
  OPERATION_LABELS
} from '../../utils/double-check-utils';

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE DE ITEM DE CORREÇÃO
// ═══════════════════════════════════════════════════════════════════════════════

interface CorrectionItemProps {
  correction: DoubleCheckCorrectionWithSelection;
  operation: string;
  onToggle: (id: string) => void;
}

/**
 * Item individual de correção com checkbox
 */
const CorrectionItem: React.FC<CorrectionItemProps> = React.memo(({
  correction,
  operation,
  onToggle
}) => {
  const icon = getCorrectionIcon(operation as 'topicExtraction' | 'dispositivo' | 'sentenceReview' | 'factsComparison', correction.type);

  return (
    <div
      className={`p-3 rounded-xl border transition-all cursor-pointer ${
        correction.selected
          ? 'theme-bg-blue-accent border-blue-500/30 theme-text-blue'
          : 'theme-bg-secondary border-transparent theme-text-secondary hover:border-gray-500/30'
      }`}
      onClick={() => onToggle(correction.id)}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <div
          className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
            correction.selected
              ? 'bg-blue-600 text-white'
              : 'theme-bg-app border theme-border-modal'
          }`}
        >
          {correction.selected && <Check className="w-3 h-3" />}
        </div>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{icon}</span>
            <span className="font-medium theme-text-primary text-sm">
              {correction.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </span>
          </div>
          <p className="text-sm theme-text-secondary">
            {correction.description}
          </p>
          {correction.reason && (
            <p className="text-xs theme-text-muted mt-1 italic">
              Motivo: {correction.reason}
            </p>
          )}
        </div>
      </div>
    </div>
  );
});
CorrectionItem.displayName = 'CorrectionItem';

// ═══════════════════════════════════════════════════════════════════════════════
// MODAL PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Modal de revisão de correções do Double Check
 * Modal obrigatório: usuário deve escolher entre descartar ou aplicar correções
 */
export const DoubleCheckReviewModal: React.FC = () => {
  // ─────────────────────────────────────────────────────────────────────────────
  // ESTADO ZUSTAND
  // ─────────────────────────────────────────────────────────────────────────────

  const doubleCheckReview = useUIStore(state => state.doubleCheckReview);
  const closeDoubleCheckReview = useUIStore(state => state.closeDoubleCheckReview);
  const setDoubleCheckResult = useUIStore(state => state.setDoubleCheckResult);

  // ─────────────────────────────────────────────────────────────────────────────
  // ESTADO LOCAL
  // ─────────────────────────────────────────────────────────────────────────────

  const [corrections, setCorrections] = useState<DoubleCheckCorrectionWithSelection[]>([]);

  // Inicializar correções quando modal abre
  React.useEffect(() => {
    if (doubleCheckReview?.corrections) {
      setCorrections(
        correctionsToSelectable(
          doubleCheckReview.operation,
          doubleCheckReview.corrections,
          true // Todas selecionadas por padrão
        )
      );
    }
  }, [doubleCheckReview]);

  // ─────────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────────────────────

  /** Toggle seleção de uma correção */
  const handleToggle = useCallback((id: string) => {
    setCorrections(prev =>
      prev.map(c => (c.id === id ? { ...c, selected: !c.selected } : c))
    );
  }, []);

  /** Selecionar todas as correções */
  const handleSelectAll = useCallback(() => {
    setCorrections(prev => prev.map(c => ({ ...c, selected: true })));
  }, []);

  /** Desmarcar todas as correções */
  const handleDeselectAll = useCallback(() => {
    setCorrections(prev => prev.map(c => ({ ...c, selected: false })));
  }, []);

  /** Descartar todas as correções e usar resultado original */
  const handleDiscardAll = useCallback(() => {
    if (!doubleCheckReview) return;

    setDoubleCheckResult({
      selected: [],
      finalResult: doubleCheckReview.originalResult,
      operation: doubleCheckReview.operation
    });
    closeDoubleCheckReview();
  }, [doubleCheckReview, setDoubleCheckResult, closeDoubleCheckReview]);

  /** Aplicar correções selecionadas */
  const handleApply = useCallback(() => {
    if (!doubleCheckReview) return;

    const selectedCorrections = getSelectedCorrections(corrections);
    const finalResult = applySelectedCorrections(
      doubleCheckReview.operation,
      doubleCheckReview.originalResult,
      doubleCheckReview.verifiedResult,
      selectedCorrections,
      doubleCheckReview.corrections
    );

    setDoubleCheckResult({
      selected: selectedCorrections,
      finalResult,
      operation: doubleCheckReview.operation
    });
    closeDoubleCheckReview();
  }, [doubleCheckReview, corrections, setDoubleCheckResult, closeDoubleCheckReview]);

  // ─────────────────────────────────────────────────────────────────────────────
  // COMPUTED VALUES
  // ─────────────────────────────────────────────────────────────────────────────

  const selectedCount = useMemo(
    () => corrections.filter(c => c.selected).length,
    [corrections]
  );

  const operationLabel = doubleCheckReview
    ? OPERATION_LABELS[doubleCheckReview.operation] || doubleCheckReview.operation
    : '';

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  if (!doubleCheckReview) return null;

  return (
    <BaseModal
      isOpen={true} // Modal aberto quando doubleCheckReview não é null
      onClose={() => {}} // Não faz nada - modal obrigatório
      title={`Revisão do Double Check`}
      subtitle={operationLabel}
      icon={<RefreshCw />}
      iconColor="purple"
      size="lg"
      preventClose={true}
      footer={
        <div className="flex items-center justify-between w-full">
          {/* Botões de seleção em massa */}
          <div className="flex gap-2">
            <button
              onClick={handleSelectAll}
              className="px-4 py-2 rounded-lg text-sm font-medium theme-bg-secondary theme-hover-bg theme-text-secondary transition-all"
            >
              Selecionar Todas
            </button>
            <button
              onClick={handleDeselectAll}
              className="px-4 py-2 rounded-lg text-sm font-medium theme-bg-secondary theme-hover-bg theme-text-secondary transition-all"
            >
              Desmarcar Todas
            </button>
          </div>

          {/* Separador visual */}
          <div className="h-6 w-px bg-gray-500/30 mx-4" />

          {/* Botões de ação */}
          <div className="flex gap-2">
            <button
              onClick={handleDiscardAll}
              className="px-4 py-2 rounded-lg text-sm font-medium theme-bg-secondary theme-hover-bg theme-text-secondary border theme-border-secondary transition-all"
            >
              Descartar
            </button>
            <button
              onClick={handleApply}
              disabled={selectedCount === 0}
              className={`px-4 py-2 rounded-lg text-sm font-medium bg-green-600 hover:bg-green-700 text-white transition-all ${selectedCount === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Aplicar ({selectedCount})
            </button>
          </div>
        </div>
      }
    >
      {/* Informação inicial */}
      <ModalInfoBox className="mb-4">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">
              O Double Check encontrou {corrections.length} correção(ões) sugerida(s).
            </p>
            <p className="mt-1 opacity-80">
              Revise cada sugestão e selecione as que deseja aplicar.
            </p>
          </div>
        </div>
      </ModalInfoBox>

      {/* Lista de correções */}
      <div className="space-y-2 mb-4">
        {corrections.map(correction => (
          <CorrectionItem
            key={correction.id}
            correction={correction}
            operation={doubleCheckReview.operation}
            onToggle={handleToggle}
          />
        ))}
      </div>

      {/* Resumo e confiança */}
      {(doubleCheckReview.summary || doubleCheckReview.confidence) && (
        <div className="p-3 rounded-xl theme-bg-app border theme-border-secondary">
          {doubleCheckReview.summary && (
            <p className="text-sm theme-text-secondary">
              <span className="font-medium theme-text-primary">Resumo:</span>{' '}
              {doubleCheckReview.summary}
            </p>
          )}
          {doubleCheckReview.confidence !== undefined && (
            <p className="text-sm theme-text-secondary mt-1">
              <span className="font-medium theme-text-primary">Confiança:</span>{' '}
              <span
                className={`font-mono ${
                  doubleCheckReview.confidence >= 80
                    ? 'text-green-500'
                    : doubleCheckReview.confidence >= 60
                    ? 'text-yellow-500'
                    : 'text-red-500'
                }`}
              >
                {doubleCheckReview.confidence}%
              </span>
            </p>
          )}
        </div>
      )}
    </BaseModal>
  );
};

export default DoubleCheckReviewModal;

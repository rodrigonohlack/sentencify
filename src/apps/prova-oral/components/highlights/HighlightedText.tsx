/**
 * @file HighlightedText.tsx
 * @description Componente que renderiza texto com marcações coloridas
 * Permite selecionar texto para criar novas marcações e interagir com existentes
 */

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { HighlightPopover } from './HighlightPopover';
import { HighlightTooltip } from './HighlightTooltip';
import type { TextHighlight, HighlightColor, SinteseViewMode } from '../../types';

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO DE CORES
// ═══════════════════════════════════════════════════════════════════════════

const HIGHLIGHT_BG_CLASSES: Record<HighlightColor, string> = {
  yellow: 'bg-yellow-400/40 dark:bg-yellow-500/30',
  green: 'bg-green-400/40 dark:bg-green-500/30',
  blue: 'bg-blue-400/40 dark:bg-blue-500/30',
  purple: 'bg-purple-400/40 dark:bg-purple-500/30',
  red: 'bg-red-400/40 dark:bg-red-500/30',
};

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface HighlightedTextProps {
  /** Texto a ser renderizado */
  text: string;
  /** ID do depoente (para identificação da marcação) */
  deponenteId: string;
  /** Índice do item (para síntese detalhada) */
  itemIndex: number;
  /** Modo de visualização atual */
  viewMode: SinteseViewMode;
  /** Índice do tema (apenas para viewMode 'tema') */
  temaIndex?: number;
  /** Marcações existentes */
  highlights: TextHighlight[];
  /** Callback para adicionar nova marcação */
  onAddHighlight: (highlight: Omit<TextHighlight, 'id' | 'createdAt'>) => void;
  /** Callback para remover marcação */
  onRemoveHighlight: (id: string) => void;
  /** Classes CSS adicionais para o container */
  className?: string;
}

interface TextSegment {
  text: string;
  highlight?: TextHighlight;
  startOffset: number;
  endOffset: number;
}

interface SelectionState {
  text: string;
  startOffset: number;
  endOffset: number;
  position: { x: number; y: number };
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Filtra highlights relevantes para este texto específico
 */
function getRelevantHighlights(
  highlights: TextHighlight[],
  deponenteId: string,
  itemIndex: number,
  viewMode: SinteseViewMode,
  temaIndex?: number
): TextHighlight[] {
  return highlights.filter(h => {
    if (h.deponenteId !== deponenteId) return false;
    if (h.viewMode !== viewMode) return false;
    if (h.itemIndex !== itemIndex) return false;
    if (viewMode === 'tema' && h.temaIndex !== temaIndex) return false;
    return true;
  });
}

/**
 * Divide o texto em segmentos baseado nas marcações
 * Segmentos podem ser texto normal ou texto marcado
 */
function computeSegments(text: string, highlights: TextHighlight[]): TextSegment[] {
  if (highlights.length === 0) {
    return [{ text, startOffset: 0, endOffset: text.length, highlight: undefined }];
  }

  // Ordena highlights por posição inicial
  const sortedHighlights = [...highlights].sort((a, b) => a.startOffset - b.startOffset);

  const segments: TextSegment[] = [];
  let currentPosition = 0;

  for (const h of sortedHighlights) {
    // Valida offsets
    const start = Math.max(0, Math.min(h.startOffset, text.length));
    const end = Math.max(start, Math.min(h.endOffset, text.length));

    // Adiciona texto antes do highlight (se houver)
    if (start > currentPosition) {
      segments.push({
        text: text.slice(currentPosition, start),
        startOffset: currentPosition,
        endOffset: start,
        highlight: undefined,
      });
    }

    // Adiciona o texto marcado
    if (end > start) {
      segments.push({
        text: text.slice(start, end),
        startOffset: start,
        endOffset: end,
        highlight: h,
      });
    }

    currentPosition = end;
  }

  // Adiciona texto restante após o último highlight
  if (currentPosition < text.length) {
    segments.push({
      text: text.slice(currentPosition),
      startOffset: currentPosition,
      endOffset: text.length,
      highlight: undefined,
    });
  }

  return segments;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE
// ═══════════════════════════════════════════════════════════════════════════

export const HighlightedText: React.FC<HighlightedTextProps> = ({
  text,
  deponenteId,
  itemIndex,
  viewMode,
  temaIndex,
  highlights,
  onAddHighlight,
  onRemoveHighlight,
  className = '',
}) => {
  const containerRef = useRef<HTMLSpanElement>(null);
  const [selection, setSelection] = useState<SelectionState | null>(null);
  const [activeTooltip, setActiveTooltip] = useState<{ highlight: TextHighlight; position: { x: number; y: number } } | null>(null);

  // Filtra highlights relevantes para este texto
  const relevantHighlights = useMemo(
    () => getRelevantHighlights(highlights, deponenteId, itemIndex, viewMode, temaIndex),
    [highlights, deponenteId, itemIndex, viewMode, temaIndex]
  );

  // Computa segmentos de texto (memoizado para performance)
  const segments = useMemo(
    () => computeSegments(text, relevantHighlights),
    [text, relevantHighlights]
  );

  /**
   * Calcula o offset relativo ao texto completo a partir de um node e offset dentro dele
   */
  const calculateTextOffset = useCallback((
    container: Node,
    targetNode: Node,
    nodeOffset: number
  ): number => {
    let totalOffset = 0;

    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      null
    );

    let node = walker.nextNode();
    while (node) {
      if (node === targetNode) {
        return totalOffset + nodeOffset;
      }
      totalOffset += node.textContent?.length || 0;
      node = walker.nextNode();
    }

    return totalOffset;
  }, []);

  /**
   * Handler para quando o usuário termina de selecionar texto
   */
  const handleMouseUp = useCallback(() => {
    const windowSelection = window.getSelection();
    if (!windowSelection || windowSelection.isCollapsed || !containerRef.current) {
      return;
    }

    const selectedText = windowSelection.toString().trim();
    if (!selectedText || selectedText.length < 2) {
      return;
    }

    // Verifica se a seleção está dentro do nosso container
    const range = windowSelection.getRangeAt(0);
    if (!containerRef.current.contains(range.commonAncestorContainer)) {
      return;
    }

    // Calcula offsets relativos ao texto completo
    const startOffset = calculateTextOffset(
      containerRef.current,
      range.startContainer,
      range.startOffset
    );
    const endOffset = calculateTextOffset(
      containerRef.current,
      range.endContainer,
      range.endOffset
    );

    // Obtém posição para o popover
    const rect = range.getBoundingClientRect();

    setSelection({
      text: selectedText,
      startOffset,
      endOffset,
      position: {
        x: rect.left + rect.width / 2 - 144, // Centraliza o popover (288/2)
        y: rect.bottom + 8,
      },
    });

    // Limpa a seleção nativa
    windowSelection.removeAllRanges();
  }, [calculateTextOffset]);

  /**
   * Handler para confirmar criação de marcação
   */
  const handleConfirmHighlight = useCallback((color: HighlightColor, comment?: string) => {
    if (!selection) return;

    onAddHighlight({
      deponenteId,
      itemIndex,
      startOffset: selection.startOffset,
      endOffset: selection.endOffset,
      selectedText: selection.text,
      color,
      comment,
      viewMode,
      temaIndex,
    });

    setSelection(null);
  }, [selection, onAddHighlight, deponenteId, itemIndex, viewMode, temaIndex]);

  /**
   * Handler para cancelar criação de marcação
   */
  const handleCancelHighlight = useCallback(() => {
    setSelection(null);
  }, []);

  /**
   * Handler para click em marcação existente
   */
  const handleHighlightClick = useCallback((e: React.MouseEvent, highlight: TextHighlight) => {
    e.stopPropagation();
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setActiveTooltip({
      highlight,
      position: {
        x: rect.left,
        y: rect.bottom + 4,
      },
    });
  }, []);

  /**
   * Handler para deletar marcação
   */
  const handleDeleteHighlight = useCallback(() => {
    if (activeTooltip) {
      onRemoveHighlight(activeTooltip.highlight.id);
      setActiveTooltip(null);
    }
  }, [activeTooltip, onRemoveHighlight]);

  /**
   * Handler para fechar tooltip
   */
  const handleCloseTooltip = useCallback(() => {
    setActiveTooltip(null);
  }, []);

  return (
    <>
      <span
        ref={containerRef}
        className={`select-text ${className}`}
        onMouseUp={handleMouseUp}
      >
        {segments.map((segment, idx) => {
          if (segment.highlight) {
            // Texto marcado
            const bgClass = HIGHLIGHT_BG_CLASSES[segment.highlight.color];
            const hasComment = segment.highlight.comment && segment.highlight.comment.trim().length > 0;
            return (
              <mark
                key={`${segment.startOffset}-${idx}`}
                className={`${bgClass} rounded-sm px-0.5 cursor-pointer transition-all hover:brightness-90 ${
                  hasComment ? 'underline decoration-dotted decoration-1 underline-offset-2' : ''
                }`}
                onClick={(e) => handleHighlightClick(e, segment.highlight!)}
                title={hasComment ? 'Clique para ver comentário' : 'Clique para opções'}
              >
                {segment.text}
              </mark>
            );
          }
          // Texto normal
          return <span key={`${segment.startOffset}-${idx}`}>{segment.text}</span>;
        })}
      </span>

      {/* Popover para criar nova marcação */}
      {selection && createPortal(
        <HighlightPopover
          position={selection.position}
          selectedText={selection.text}
          onConfirm={handleConfirmHighlight}
          onCancel={handleCancelHighlight}
        />,
        document.body
      )}

      {/* Tooltip para marcação existente */}
      {activeTooltip && createPortal(
        <HighlightTooltip
          highlight={activeTooltip.highlight}
          position={activeTooltip.position}
          onDelete={handleDeleteHighlight}
          onClose={handleCloseTooltip}
        />,
        document.body
      )}
    </>
  );
};

export default HighlightedText;

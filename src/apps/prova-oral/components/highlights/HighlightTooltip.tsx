/**
 * @file HighlightTooltip.tsx
 * @description Tooltip exibido ao passar mouse sobre marcação existente
 * Mostra comentário (se houver) e botão para deletar
 */

import React, { useRef, useEffect, useState } from 'react';
import { Trash2, MessageSquare } from 'lucide-react';
import type { TextHighlight } from '../../types';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface HighlightTooltipProps {
  /** Highlight sendo visualizado */
  highlight: TextHighlight;
  /** Posição do tooltip (coordenadas da viewport) */
  position: { x: number; y: number };
  /** Callback para deletar a marcação */
  onDelete: () => void;
  /** Callback para fechar o tooltip */
  onClose: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE
// ═══════════════════════════════════════════════════════════════════════════

export const HighlightTooltip: React.FC<HighlightTooltipProps> = ({
  highlight,
  position,
  onDelete,
  onClose
}) => {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState(position);

  // Calcula posição ajustada para não sair da viewport
  useEffect(() => {
    if (tooltipRef.current) {
      const rect = tooltipRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let newX = position.x;
      let newY = position.y;

      // Ajusta horizontalmente
      if (position.x + rect.width > viewportWidth - 16) {
        newX = viewportWidth - rect.width - 16;
      }
      if (newX < 16) newX = 16;

      // Ajusta verticalmente (mostra acima se não couber abaixo)
      if (position.y + rect.height > viewportHeight - 16) {
        newY = position.y - rect.height - 8;
      }
      if (newY < 16) newY = 16;

      setAdjustedPosition({ x: newX, y: newY });
    }
  }, [position]);

  // Fecha ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Keyboard: Escape para fechar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const hasComment = highlight.comment && highlight.comment.trim().length > 0;

  return (
    <div
      ref={tooltipRef}
      className="fixed z-[60] bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-600 animate-in fade-in zoom-in-95 duration-100"
      style={{
        left: `${adjustedPosition.x}px`,
        top: `${adjustedPosition.y}px`,
        maxWidth: '300px',
      }}
    >
      {hasComment ? (
        // Com comentário
        <div className="p-3">
          <div className="flex items-start gap-2 mb-2">
            <MessageSquare className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
              {highlight.comment}
            </p>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-700">
            <span className="text-xs text-slate-400">
              {new Date(highlight.createdAt).toLocaleDateString('pt-BR')}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="flex items-center gap-1 px-2 py-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
              title="Remover marcação"
            >
              <Trash2 className="w-3 h-3" />
              Remover
            </button>
          </div>
        </div>
      ) : (
        // Sem comentário - tooltip compacto
        <div className="flex items-center gap-2 px-3 py-2">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {new Date(highlight.createdAt).toLocaleDateString('pt-BR')}
          </span>
          <div className="w-px h-4 bg-slate-200 dark:bg-slate-600" />
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="flex items-center gap-1 px-2 py-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
            title="Remover marcação"
          >
            <Trash2 className="w-3 h-3" />
            Remover
          </button>
        </div>
      )}
    </div>
  );
};

export default HighlightTooltip;

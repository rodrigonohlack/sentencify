/**
 * @file HighlightPopover.tsx
 * @description Popover para criar/editar marcações de texto nas sínteses
 * UX inspirado em Medium/Hypothesis - aparece inline na posição da seleção
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import type { HighlightColor } from '../../types';

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO DE CORES
// ═══════════════════════════════════════════════════════════════════════════

const HIGHLIGHT_COLORS: { color: HighlightColor; label: string; bgClass: string; ringClass: string }[] = [
  { color: 'yellow', label: 'Amarelo', bgClass: 'bg-yellow-400', ringClass: 'ring-yellow-500' },
  { color: 'green', label: 'Verde', bgClass: 'bg-green-400', ringClass: 'ring-green-500' },
  { color: 'blue', label: 'Azul', bgClass: 'bg-blue-400', ringClass: 'ring-blue-500' },
  { color: 'purple', label: 'Roxo', bgClass: 'bg-purple-400', ringClass: 'ring-purple-500' },
  { color: 'red', label: 'Vermelho', bgClass: 'bg-red-400', ringClass: 'ring-red-500' },
];

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface HighlightPopoverProps {
  /** Posição do popover (coordenadas da viewport) */
  position: { x: number; y: number };
  /** Callback ao confirmar a marcação */
  onConfirm: (color: HighlightColor, comment?: string) => void;
  /** Callback ao cancelar */
  onCancel: () => void;
  /** Texto selecionado (para preview) */
  selectedText?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE
// ═══════════════════════════════════════════════════════════════════════════

export const HighlightPopover: React.FC<HighlightPopoverProps> = ({
  position,
  onConfirm,
  onCancel,
  selectedText
}) => {
  const [selectedColor, setSelectedColor] = useState<HighlightColor>('yellow');
  const [comment, setComment] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Calcula posição ajustada para não sair da viewport
  const [adjustedPosition, setAdjustedPosition] = useState(position);

  // Auto-focus no campo de comentário após aparecer
  useEffect(() => {
    const timer = setTimeout(() => {
      textareaRef.current?.focus();
    }, 150); // Aguarda animação de entrada
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (popoverRef.current) {
      const rect = popoverRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let newX = position.x;
      let newY = position.y;

      // Ajusta horizontalmente se sair da tela
      if (position.x + rect.width > viewportWidth - 16) {
        newX = viewportWidth - rect.width - 16;
      }
      if (newX < 16) newX = 16;

      // Ajusta verticalmente se sair da tela (mostra acima da seleção)
      if (position.y + rect.height > viewportHeight - 16) {
        newY = position.y - rect.height - 40; // 40px acima da seleção
      }
      if (newY < 16) newY = 16;

      setAdjustedPosition({ x: newX, y: newY });
    }
  }, [position]);

  // Fecha ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onCancel();
      }
    };

    // Delay para não capturar o click que abriu o popover
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onCancel]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      onConfirm(selectedColor, comment.trim() || undefined);
    }
  }, [onCancel, onConfirm, selectedColor, comment]);

  const handleConfirm = () => {
    onConfirm(selectedColor, comment.trim() || undefined);
  };

  return (
    <div
      ref={popoverRef}
      className="fixed z-[60] bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-600 p-3 w-72 animate-in fade-in zoom-in-95 duration-150"
      style={{
        left: `${adjustedPosition.x}px`,
        top: `${adjustedPosition.y}px`,
      }}
      onKeyDown={handleKeyDown}
    >
      {/* Header com botão fechar */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
          Nova marcação
        </span>
        <button
          onClick={onCancel}
          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
          aria-label="Fechar"
        >
          <X className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {/* Preview do texto selecionado */}
      {selectedText && (
        <div className="mb-3 p-2 bg-slate-50 dark:bg-slate-700/50 rounded text-xs text-slate-600 dark:text-slate-300 line-clamp-2 italic">
          "{selectedText.length > 80 ? selectedText.slice(0, 80) + '...' : selectedText}"
        </div>
      )}

      {/* Seletor de cores */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-slate-500 dark:text-slate-400 mr-1">Cor:</span>
        {HIGHLIGHT_COLORS.map(({ color, label, bgClass, ringClass }) => (
          <button
            key={color}
            onClick={() => setSelectedColor(color)}
            className={`w-6 h-6 rounded-full ${bgClass} transition-all hover:scale-110 ${
              selectedColor === color ? `ring-2 ${ringClass} ring-offset-2 dark:ring-offset-slate-800` : ''
            }`}
            aria-label={label}
            title={label}
          />
        ))}
      </div>

      {/* Campo de comentário */}
      <div className="mb-3">
        <textarea
          ref={textareaRef}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Comentário (opcional)"
          className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          rows={2}
          maxLength={500}
        />
        <div className="text-xs text-slate-400 dark:text-slate-500 text-right mt-1">
          {comment.length}/500
        </div>
      </div>

      {/* Botões de ação */}
      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleConfirm}
          className="px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors font-medium"
        >
          Marcar
        </button>
      </div>

      {/* Dica de atalho */}
      <div className="mt-2 text-xs text-slate-400 dark:text-slate-500 text-center">
        <kbd className="px-1 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-xs">Ctrl+Enter</kbd> para confirmar
      </div>
    </div>
  );
};

export default HighlightPopover;

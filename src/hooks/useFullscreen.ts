/**
 * @file useFullscreen.ts
 * @description Hook para controle de modo fullscreen e split view dos editores
 * @tier 0 (sem dependências)
 * @extractedFrom App.tsx linhas 2486-2561
 * @usedBy LegalDecisionEditor, GlobalEditorModal
 */

import { useState, useCallback, useRef, useEffect } from 'react';

export interface UseFullscreenReturn {
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  isSplitMode: boolean;
  toggleSplitMode: () => void;
  splitPosition: number;
  handleSplitDrag: (e: MouseEvent) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function useFullscreen(): UseFullscreenReturn {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSplitMode, setIsSplitMode] = useState(false);
  const [splitPosition, setSplitPosition] = useState(70); // percentual do editor (70/30)
  const containerRef = useRef<HTMLDivElement | null>(null);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => {
      const newValue = !prev;
      if (prev) {
        document.body.style.overflow = '';
      }
      return newValue;
    });
    // Fechar split mode separadamente para evitar race condition
    setIsSplitMode(prev => prev ? false : prev);
  }, []);

  const toggleSplitMode = useCallback(() => {
    setIsSplitMode(prev => !prev);
  }, []);

  // Handler para drag do divisor
  const handleSplitDrag = useCallback((e: MouseEvent) => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const newPosition = ((e.clientX - rect.left) / rect.width) * 100;

    // Limitar entre 20% e 80%
    const clampedPosition = Math.max(20, Math.min(80, newPosition));
    setSplitPosition(clampedPosition);
  }, []);

  // Atalhos de teclado: Ctrl+F para ativar, ESC para sair, Ctrl+M para split
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+F: ativa fullscreen quando foco está no container do editor
      if (e.ctrlKey && e.key === 'f') {
        const container = containerRef.current;
        if (container && (container.contains(document.activeElement) || isFullscreen)) {
          e.preventDefault();
          toggleFullscreen();
        }
      }
      if (e.ctrlKey && e.key === 'm' && isFullscreen) {
        e.preventDefault();
        setIsSplitMode(prev => !prev);
      }
      // ESC: fecha split primeiro, depois fullscreen
      if (e.key === 'Escape') {
        if (isSplitMode) {
          setIsSplitMode(false);
        } else if (isFullscreen) {
          setIsFullscreen(false);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isFullscreen, isSplitMode, toggleFullscreen]);

  return { isFullscreen, toggleFullscreen, isSplitMode, toggleSplitMode, splitPosition, handleSplitDrag, containerRef };
}

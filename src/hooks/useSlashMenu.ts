/**
 * @file useSlashMenu.ts
 * @description Hook para gerenciamento do Slash Menu (acesso rápido a modelos)
 * @version v1.37.27
 *
 * Extraído do App.tsx para modularização.
 * Gerencia menu de comandos com \ para inserir modelos no editor.
 */

import React from 'react';
import type { Model, QuillInstance, SlashMenuStateExtended } from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

export interface UseSlashMenuProps {
  sanitizeHTML: (html: string) => string;
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

export interface UseSlashMenuReturn {
  slashMenu: SlashMenuStateExtended;
  openSlashMenu: (data: { position: { top: number; left: number }; quillInstance: QuillInstance | null; triggerPosition: number }) => void;
  closeSlashMenu: (removeSlash?: boolean) => void;
  navigateSlashMenu: (direction: 'up' | 'down', maxItems?: number) => void;
  selectModelFromSlash: (model: Model) => void;
  updateSlashSearchTerm: (term: string) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

// Encontra posição do \ no texto
const findSlashPosition = (text: string, triggerPos: number): number => {
  if (text[triggerPos] === '\\') return triggerPos;
  if (text[triggerPos + 1] === '\\') return triggerPos + 1;
  if (triggerPos > 0 && text[triggerPos - 1] === '\\') return triggerPos - 1;
  return -1;
};

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

export function useSlashMenu({
  sanitizeHTML,
  showToast
}: UseSlashMenuProps): UseSlashMenuReturn {

  // Estado do slash menu
  const [slashMenu, setSlashMenu] = React.useState<SlashMenuStateExtended>({
    isOpen: false,
    position: { top: 0, left: 0 },
    searchTerm: '',
    selectedIndex: 0,
    quillInstance: null,
    triggerPosition: 0
  });

  // Abre o menu
  const openSlashMenu = React.useCallback((data: { position: { top: number; left: number }; quillInstance: QuillInstance | null; triggerPosition: number }) => {
    setSlashMenu({
      isOpen: true,
      position: data.position,
      searchTerm: '',
      selectedIndex: 0,
      quillInstance: data.quillInstance,
      triggerPosition: data.triggerPosition
    });
  }, []);

  // Fecha o menu (opcionalmente removendo o \)
  const closeSlashMenu = React.useCallback((removeSlash = false) => {
    setSlashMenu(prev => {
      if (removeSlash && prev.quillInstance && typeof prev.triggerPosition === 'number') {
        try {
          const quill = prev.quillInstance;
          const text = quill.getText();
          const slashPos = findSlashPosition(text, prev.triggerPosition);
          if (slashPos >= 0) {
            quill.deleteText(slashPos, 1);
            setTimeout(() => {
              quill.focus();
              quill.setSelection(slashPos, 0);
            }, 0);
          }
        } catch (e) { /* Quill pode estar indisponível */ }
      }
      return { ...prev, isOpen: false };
    });
  }, []);

  // Navegação com setas
  const navigateSlashMenu = React.useCallback((direction: 'up' | 'down', maxItems: number = 10) => {
    setSlashMenu(prev => {
      if (direction === 'down') {
        return { ...prev, selectedIndex: Math.min(prev.selectedIndex + 1, maxItems - 1) };
      } else {
        return { ...prev, selectedIndex: Math.max(prev.selectedIndex - 1, 0) };
      }
    });
  }, []);

  // Seleciona modelo e insere no editor
  const selectModelFromSlash = React.useCallback((model: Model) => {
    const { quillInstance, triggerPosition } = slashMenu;
    if (!quillInstance || !model) {
      closeSlashMenu();
      return;
    }

    try {
      const text = quillInstance.getText();
      const slashPos = findSlashPosition(text, triggerPosition);
      if (slashPos < 0) { closeSlashMenu(); return; }

      const currentPos = quillInstance.getSelection()?.index || slashPos + 1;
      const deleteLength = currentPos - slashPos;
      if (deleteLength > 0) quillInstance.deleteText(slashPos, deleteLength);

      const sanitizedContent = sanitizeHTML(model.content);
      quillInstance.clipboard.dangerouslyPasteHTML(slashPos, sanitizedContent);

      closeSlashMenu();
      showToast(`Modelo "${model.title}" inserido`, 'success');
    } catch (err) {
      closeSlashMenu();
    }
  }, [slashMenu, closeSlashMenu, sanitizeHTML, showToast]);

  // Atualiza termo de busca
  const updateSlashSearchTerm = React.useCallback((term: string) => {
    setSlashMenu(prev => ({ ...prev, searchTerm: term, selectedIndex: 0 }));
  }, []);

  // ESC global para fechar slash menu
  React.useEffect(() => {
    if (!slashMenu.isOpen) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        closeSlashMenu(true);
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown, true);
  }, [slashMenu.isOpen, closeSlashMenu]);

  // Click fora do menu fecha
  React.useEffect(() => {
    if (!slashMenu.isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const menuEl = document.querySelector('.slash-command-menu');
      if (menuEl && !menuEl.contains(e.target as Node)) {
        closeSlashMenu(true);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [slashMenu.isOpen, closeSlashMenu]);

  return {
    slashMenu,
    openSlashMenu,
    closeSlashMenu,
    navigateSlashMenu,
    selectModelFromSlash,
    updateSlashSearchTerm
  };
}

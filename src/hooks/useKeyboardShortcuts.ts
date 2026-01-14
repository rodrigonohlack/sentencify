/**
 * @file useKeyboardShortcuts.ts
 * @description Hook para gerenciar atalhos de teclado da aplicação
 *
 * FASE 48: Extraído do App.tsx para consolidar lógica de atalhos
 * de teclado (Ctrl+S, ESC) e scroll lock de modais.
 *
 * Responsabilidades:
 * - Atalho Ctrl+S para salvar tópico/modelo
 * - ESC para fechar modal de configurações
 * - Bloquear scroll do body quando modal aberto
 */

import { useEffect } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════════

export interface UseKeyboardShortcutsProps {
  // Estados necessários
  editingTopic: unknown | null;
  isModelFormOpen: boolean;
  isSettingsOpen: boolean;
  isModelGeneratorOpen: boolean;

  // Callbacks
  saveTopicEditWithoutClosing: () => void;
  saveModelWithoutClosing: () => void;
  closeSettingsModal: () => void;
}

export interface UseKeyboardShortcutsReturn {
  // Hook não expõe nada, apenas configura os listeners
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Hook para gerenciar atalhos de teclado da aplicação
 *
 * @param props - Configurações e callbacks necessários
 */
export function useKeyboardShortcuts({
  editingTopic,
  isModelFormOpen,
  isSettingsOpen,
  isModelGeneratorOpen,
  saveTopicEditWithoutClosing,
  saveModelWithoutClosing,
  closeSettingsModal,
}: UseKeyboardShortcutsProps): UseKeyboardShortcutsReturn {
  // ═══════════════════════════════════════════════════════════════════════════════
  // CTRL+S PARA SALVAR
  // ═══════════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (editingTopic) {
          saveTopicEditWithoutClosing();
        } else if (isModelFormOpen) {
          saveModelWithoutClosing();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [editingTopic, isModelFormOpen, saveTopicEditWithoutClosing, saveModelWithoutClosing]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // ESC PARA FECHAR SETTINGS
  // ═══════════════════════════════════════════════════════════════════════════════

  // v1.36.46: Não fechar se ModelGeneratorModal está aberto (respeitar hierarquia)
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSettingsOpen && !isModelGeneratorOpen) {
        closeSettingsModal();
      }
    };

    if (isSettingsOpen) {
      window.addEventListener('keydown', handleEscape);
    }

    return () => window.removeEventListener('keydown', handleEscape);
  }, [isSettingsOpen, closeSettingsModal, isModelGeneratorOpen]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // BODY SCROLL LOCK
  // ═══════════════════════════════════════════════════════════════════════════════

  // v1.35.64: Bloquear scroll do body quando modal de configurações aberto
  useEffect(() => {
    if (isSettingsOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isSettingsOpen]);

  return {};
}

export default useKeyboardShortcuts;

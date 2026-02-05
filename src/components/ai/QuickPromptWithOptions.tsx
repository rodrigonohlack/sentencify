/**
 * @file QuickPromptWithOptions.tsx
 * @description QuickPrompt com dropdown de sub-opções
 * @version 1.40.XX
 *
 * Renderiza um quickprompt que possui múltiplas sub-opções,
 * seguindo o padrão visual de InsertDropdown.tsx.
 */

import React from 'react';
import { ChevronDown } from 'lucide-react';
import type { QuickPrompt, QuickPromptSubOption } from '../../types';

// ═══════════════════════════════════════════════════════════════════════════
// SEÇÃO 1: TIPOS
// ═══════════════════════════════════════════════════════════════════════════

export interface QuickPromptWithOptionsProps {
  /** QuickPrompt com subOptions definidas */
  quickPrompt: QuickPrompt;
  /** Callback quando sub-opção é selecionada */
  onSelect: (qp: QuickPrompt, subOption: QuickPromptSubOption) => void;
  /** Desabilita interação durante geração */
  disabled?: boolean;
  /** Estado de erro */
  isError?: boolean;
  /** Mensagem de erro */
  errorMessage?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// SEÇÃO 2: COMPONENTE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * QuickPromptWithOptions - Renderiza quickprompt com dropdown de sub-opções
 * Baseado no padrão de InsertDropdown.tsx
 * @param quickPrompt - QuickPrompt com subOptions definidas
 * @param onSelect - Callback quando sub-opção é selecionada
 * @param disabled - Desabilita interação durante geração
 * @param isError - Estado de erro
 * @param errorMessage - Mensagem de erro para exibir
 */
export const QuickPromptWithOptions = React.memo(({
  quickPrompt,
  onSelect,
  disabled = false,
  isError = false,
  errorMessage
}: QuickPromptWithOptionsProps) => {
  const [open, setOpen] = React.useState(false);

  // ─────────────────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────────────────

  const handleToggle = React.useCallback(() => {
    if (!disabled && !isError) {
      setOpen(prev => !prev);
    }
  }, [disabled, isError]);

  const handleSelectOption = React.useCallback((subOption: QuickPromptSubOption) => {
    setOpen(false);
    onSelect(quickPrompt, subOption);
  }, [quickPrompt, onSelect]);

  const handleCloseDropdown = React.useCallback(() => {
    setOpen(false);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  const subOptions = quickPrompt.subOptions || [];

  return (
    <div className="relative">
      {/* Botão principal */}
      <button
        onClick={handleToggle}
        disabled={disabled || isError}
        className={`px-3 py-1.5 text-xs rounded-full border transition-colors flex items-center gap-1 ${
          isError
            ? 'bg-red-500/20 border-red-500 text-red-400 cursor-not-allowed'
            : disabled
              ? 'theme-bg-secondary theme-border-input opacity-50 cursor-not-allowed'
              : 'hover-quick-prompt theme-bg-secondary text-blue-600 dark:text-blue-400 theme-border-input'
        }`}
        title={isError ? errorMessage : quickPrompt.label}
      >
        {isError ? (
          <>
            <span>⚠️</span>
            <span>{errorMessage}</span>
          </>
        ) : (
          <>
            {quickPrompt.icon && <span>{quickPrompt.icon}</span>}
            <span>{quickPrompt.label}</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
          </>
        )}
      </button>

      {/* Dropdown de opções */}
      {open && subOptions.length > 0 && (
        <>
          {/* Overlay para fechar ao clicar fora */}
          <div
            className="fixed inset-0 z-10"
            onClick={handleCloseDropdown}
          />

          {/* Menu dropdown */}
          <div className="absolute bottom-full left-0 mb-1 z-20 theme-bg-primary border theme-border-input rounded-lg shadow-xl py-1 min-w-[200px]">
            {subOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => handleSelectOption(option)}
                className="w-full px-4 py-2 text-left text-sm hover:bg-blue-500/10 dark:hover:bg-blue-500/20 transition-colors flex items-center gap-2"
              >
                {option.icon && <span>{option.icon}</span>}
                <span className="theme-text-secondary">{option.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
});

QuickPromptWithOptions.displayName = 'QuickPromptWithOptions';

/**
 * @file WebSearchToggle.tsx
 * @description Toggle opt-in para habilitar busca na web no Assistente de Redação.
 *
 * v1.42.02 — v1 Gemini-only.
 *
 * Comportamento:
 * - `enabled` controla on/off (default OFF no caller — reseta ao fechar modal)
 * - `disabled` bloqueia interação (usado quando anonimização está ativa)
 * - Acessível: button com aria-pressed, aria-disabled, keyboard nativo
 * - Tooltip dinâmico explica estado ao usuário
 */

import * as React from 'react';
import { Globe } from 'lucide-react';

export interface WebSearchToggleProps {
  /** Se o toggle está ativo. */
  enabled: boolean;
  /** Callback ao alternar. */
  onToggle: (enabled: boolean) => void;
  /** Se true, toggle aparece desabilitado (ex: anonimização ativa). */
  disabled?: boolean;
}

const DEFAULT_ON_TOOLTIP = 'Buscar na web ativado (Gemini) — clique para desligar';
const DEFAULT_OFF_TOOLTIP = 'Ativar busca na web (Gemini) — permite consulta a informações atualizadas durante esta conversa';
const DISABLED_TOOLTIP = 'Busca na web indisponível enquanto a anonimização estiver ativa. As queries enviadas ao Google poderiam expor dados sensíveis do processo.';

export const WebSearchToggle: React.FC<WebSearchToggleProps> = ({
  enabled,
  onToggle,
  disabled = false,
}) => {
  const tooltip = disabled
    ? DISABLED_TOOLTIP
    : enabled
      ? DEFAULT_ON_TOOLTIP
      : DEFAULT_OFF_TOOLTIP;

  const handleClick = React.useCallback(() => {
    if (disabled) return;
    onToggle(!enabled);
  }, [disabled, enabled, onToggle]);

  const baseClasses =
    'inline-flex items-center justify-center h-8 px-2.5 rounded-md border transition-colors select-none';

  const stateClasses = disabled
    ? 'opacity-50 cursor-not-allowed border-slate-400 dark:border-slate-600 text-slate-400 dark:text-slate-500'
    : enabled
      ? 'bg-blue-500/20 border-blue-500/50 text-blue-700 dark:text-blue-300 hover:bg-blue-500/30'
      : 'bg-transparent border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700';

  return (
    <button
      type="button"
      role="switch"
      aria-pressed={enabled}
      aria-disabled={disabled}
      aria-label={tooltip}
      title={tooltip}
      onClick={handleClick}
      className={`${baseClasses} ${stateClasses}`}
    >
      <Globe className="w-4 h-4" aria-hidden="true" />
      <span className="ml-1.5 text-xs font-medium">Web</span>
    </button>
  );
};

WebSearchToggle.displayName = 'WebSearchToggle';

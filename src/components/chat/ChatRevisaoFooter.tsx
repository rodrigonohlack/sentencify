/**
 * @file ChatRevisaoFooter.tsx
 * @description Exibe a auto-revisão da IA abaixo de uma mensagem do assistente,
 * em painel colapsável — fora do corpo do texto, para não vazar para a minuta
 * em copiar/colar ou "Usar".
 *
 * v1.53.20: a revisão chega pela tag <revisao> da resposta, extraída por
 * extractRevisao (utils/text.ts) e gravada em ChatMessage.revisao.
 *
 * Acessibilidade:
 * - Botão de expandir tem `aria-expanded` e `aria-controls`
 * - Texto escapado automaticamente pelo React (JSX)
 */

import * as React from 'react';
import { ShieldCheck, ChevronDown, ChevronRight } from 'lucide-react';

export interface ChatRevisaoFooterProps {
  /** Texto da auto-revisão extraída da resposta. */
  revisao: string;
}

export const ChatRevisaoFooter: React.FC<ChatRevisaoFooterProps> = ({ revisao }) => {
  const [expanded, setExpanded] = React.useState(false);
  const panelId = React.useId();

  if (!revisao.trim()) return null;

  return (
    <div className="mt-2 border-t theme-border-input pt-2">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-controls={panelId}
        className="inline-flex items-center gap-1.5 text-xs theme-text-muted hover:theme-text-secondary transition-colors"
      >
        <ShieldCheck className="w-3 h-3" aria-hidden="true" />
        <span>Revisão da IA</span>
        {expanded ? (
          <ChevronDown className="w-3 h-3" aria-hidden="true" />
        ) : (
          <ChevronRight className="w-3 h-3" aria-hidden="true" />
        )}
      </button>

      {expanded && (
        <p
          id={panelId}
          className="mt-2 text-xs theme-text-muted whitespace-pre-wrap leading-relaxed"
        >
          {revisao}
        </p>
      )}
    </div>
  );
};

ChatRevisaoFooter.displayName = 'ChatRevisaoFooter';

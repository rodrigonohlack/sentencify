/**
 * @file ChatGroundingFooter.tsx
 * @description Exibe fontes consultadas na web abaixo de uma mensagem do assistente.
 *
 * v1.42.02
 *
 * Segurança:
 * - `href` de cada link passa por `safeHref` (rejeita javascript:, data:, etc)
 * - Links sempre `target="_blank" rel="noopener noreferrer"`
 * - Texto escapado automaticamente pelo React (JSX)
 *
 * Acessibilidade:
 * - Botão de expandir tem `aria-expanded` e `aria-controls`
 * - Lista usa `role="list"` implícito de `<ul>`
 * - Links com `aria-label` anunciando "abre em nova aba"
 */

import * as React from 'react';
import { Link as LinkIcon, ChevronDown, ChevronRight } from 'lucide-react';
import type { GroundingMetadata } from '../../types';
import { safeHref, extractHostname } from '../../utils/safeHref';

export interface ChatGroundingFooterProps {
  /** Metadata de grounding vinda do provider. */
  metadata: GroundingMetadata;
}

export const ChatGroundingFooter: React.FC<ChatGroundingFooterProps> = ({ metadata }) => {
  const [expanded, setExpanded] = React.useState(false);
  const listId = React.useId();

  const chunks = React.useMemo(
    () => (metadata.groundingChunks || []).filter((c) => c.web?.uri && c.web?.title),
    [metadata.groundingChunks]
  );

  if (chunks.length === 0) return null;

  const count = chunks.length;
  const label = `${count} ${count === 1 ? 'fonte consultada' : 'fontes consultadas'}`;

  return (
    <div className="mt-2 border-t theme-border-input pt-2">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-controls={listId}
        className="inline-flex items-center gap-1.5 text-xs theme-text-muted hover:theme-text-secondary transition-colors"
      >
        <LinkIcon className="w-3 h-3" aria-hidden="true" />
        <span>🔗 {label}</span>
        {expanded ? (
          <ChevronDown className="w-3 h-3" aria-hidden="true" />
        ) : (
          <ChevronRight className="w-3 h-3" aria-hidden="true" />
        )}
      </button>

      {expanded && (
        <ul id={listId} className="mt-2 space-y-1 text-xs">
          {chunks.map((chunk, i) => {
            const uri = chunk.web!.uri;
            const title = chunk.web!.title;
            const host = extractHostname(uri);
            const href = safeHref(uri);
            return (
              <li key={`${uri}-${i}`} className="flex items-start gap-1.5">
                <span className="theme-text-muted mt-0.5" aria-hidden="true">↳</span>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${title}, abre em nova aba`}
                  className="theme-text-secondary hover:text-blue-600 dark:hover:text-blue-400 underline-offset-2 hover:underline break-words"
                >
                  {title}
                  {host && (
                    <span className="theme-text-muted ml-1">({host})</span>
                  )}
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

ChatGroundingFooter.displayName = 'ChatGroundingFooter';

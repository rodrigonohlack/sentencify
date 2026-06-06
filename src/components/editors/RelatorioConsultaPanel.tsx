/**
 * @file RelatorioConsultaPanel.tsx
 * @description Chip de consulta rápida que abre um card flutuante read-only
 *              no hover e o fixa no clique. Recebe texto HTML pronto.
 * @version 1.52.31
 */

import React from 'react';
import { FileText, X } from 'lucide-react';

export interface RelatorioConsultaPanelProps {
  /** Rótulo do chip e título do card */
  label: string;
  /** Conteúdo HTML (do Quill) a exibir, read-only */
  html: string;
  /** Sanitizador opcional aplicado ao html antes de renderizar */
  sanitizeHTML?: (html: string) => string;
  /** Quando true, renderiza um chip esmaecido não-interativo */
  disabled?: boolean;
}

/**
 * RelatorioConsultaPanel — gatilho de consulta com card flutuante.
 * Hover abre; clique fixa; clique-fora ou ✕ fecha quando fixado.
 */
export const RelatorioConsultaPanel: React.FC<RelatorioConsultaPanelProps> = ({
  label,
  html,
  sanitizeHTML,
  disabled = false,
}) => {
  const [hovering, setHovering] = React.useState(false);
  const [pinned, setPinned] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const open = hovering || pinned;

  React.useEffect(() => {
    if (!pinned) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setPinned(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [pinned]);

  const safeHTML = React.useMemo(
    () => (sanitizeHTML ? sanitizeHTML(html || '') : (html || '')),
    [html, sanitizeHTML]
  );

  if (disabled) {
    return (
      <span
        className="px-2 py-1 text-xs rounded flex items-center gap-1 border theme-border-input theme-text-muted opacity-40 cursor-not-allowed select-none"
        title={`${label} indisponível`}
        aria-disabled="true"
      >
        <FileText className="w-3 h-3" />
        {label}
      </span>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative inline-block"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <button
        type="button"
        onClick={() => setPinned((p) => !p)}
        className={`px-2 py-1 text-xs rounded flex items-center gap-1 border theme-border-input theme-text-primary transition-colors ${
          pinned ? 'theme-bg-tertiary' : 'theme-bg-secondary theme-hover-bg'
        }`}
        title={pinned ? `${label} (fixado — clique para soltar)` : `${label} (clique para fixar)`}
        aria-expanded={open}
      >
        <FileText className="w-3 h-3" />
        {label}
      </button>

      {open && (
        <div
          className="absolute left-0 top-full mt-1 z-[60] w-[min(680px,90vw)] max-h-[60vh] overflow-auto rounded-lg border theme-border-input theme-bg-primary shadow-xl"
          role="dialog"
          aria-label={label}
        >
          <div className="flex items-center justify-between px-3 py-2 border-b theme-border-input sticky top-0 theme-bg-primary">
            <span className="text-xs font-semibold theme-text-secondary uppercase tracking-wide">
              {label}
            </span>
            {pinned && (
              <button
                type="button"
                onClick={() => setPinned(false)}
                className="theme-text-muted hover:theme-text-primary transition-colors"
                title="Fechar"
                aria-label="Fechar"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div
            className="sentence-serif px-4 py-3 text-sm theme-text-primary leading-relaxed [&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2 [&_li]:my-0.5 [&_strong]:font-semibold [&_blockquote]:border-l-2 [&_blockquote]:border-current [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:opacity-80"
            dangerouslySetInnerHTML={{ __html: safeHTML }}
          />
        </div>
      )}
    </div>
  );
};

RelatorioConsultaPanel.displayName = 'RelatorioConsultaPanel';

/**
 * @file gemini-timestamp-renderer.tsx
 * @description Renderiza texto com marcações MM:SS ou HH:MM:SS como botões
 *   clicáveis que disparam um seek no player de mídia. v1.43.00.
 */

import React from 'react';

const TIMESTAMP_RE = /\b(\d{1,2}:\d{2}(?::\d{2})?)\b/g;

/** Converte "MM:SS" ou "HH:MM:SS" em segundos. */
export function parseTimestamp(s: string): number | null {
  const parts = s.split(':').map((p) => parseInt(p, 10));
  if (parts.some((n) => Number.isNaN(n))) return null;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

interface RenderProps {
  text: string;
  onSeek?: (seconds: number) => void;
}

/**
 * Quebra um texto em fragmentos: spans de texto + botões para cada timestamp.
 * Não-destrutivo: timestamps não reconhecíveis são deixados como texto.
 */
export const TimestampedText: React.FC<RenderProps> = ({ text, onSeek }) => {
  const fragments: React.ReactNode[] = [];
  let last = 0;
  let key = 0;

  for (const match of text.matchAll(TIMESTAMP_RE)) {
    const idx = match.index ?? 0;
    if (idx > last) {
      fragments.push(<span key={`t-${key++}`}>{text.slice(last, idx)}</span>);
    }
    const ts = match[1];
    const seconds = parseTimestamp(ts);
    if (seconds !== null && onSeek) {
      fragments.push(
        <button
          key={`b-${key++}`}
          type="button"
          onClick={() => onSeek(seconds)}
          className="inline-flex items-center px-1.5 py-0.5 mx-0.5 text-xs font-mono rounded
            bg-blue-500/15 hover:bg-blue-500/30 text-blue-400 hover:text-blue-300
            border border-blue-500/30 transition-colors"
          title={`Ir para ${ts}`}
        >
          {ts}
        </button>
      );
    } else {
      fragments.push(<span key={`s-${key++}`}>{ts}</span>);
    }
    last = idx + ts.length;
  }
  if (last < text.length) {
    fragments.push(<span key={`t-${key++}`}>{text.slice(last)}</span>);
  }

  return <>{fragments}</>;
};

export default TimestampedText;

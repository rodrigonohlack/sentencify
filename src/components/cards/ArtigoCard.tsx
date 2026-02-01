/**
 * @file ArtigoCard.tsx
 * @description Card de exibição de artigo de lei
 * @version 1.36.83
 */

import React from 'react';
import { Check, Copy, ChevronUp, ChevronDown } from 'lucide-react';
import type { ArtigoCardProps } from '../../types';
import { getLeiFromId } from '../../hooks';

export const ArtigoCard = React.memo(({
  artigo,
  onCopy,
  expanded,
  onToggleExpand,
  copiedId
}: ArtigoCardProps) => {
  const lei = getLeiFromId(artigo.id);
  const hasDetails = (artigo.paragrafos && artigo.paragrafos.length > 0) || (artigo.incisos && artigo.incisos.length > 0) || (artigo.alineas && artigo.alineas.length > 0);
  const isCopied = copiedId === artigo.id;

  return (
    <div className="theme-bg-secondary rounded-lg p-3 border theme-border-subtle">
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-400">
              {lei.nome}
            </span>
            <span className="font-semibold text-sm theme-text-primary">
              Art. {artigo.numero}
            </span>
            {artigo.status === 'revogado' && (
              <span className="px-1.5 py-0.5 rounded text-xs bg-red-500/20 text-red-400">
                Revogado
              </span>
            )}
          </div>
          <p className="text-sm theme-text-secondary line-clamp-3">
            {artigo.caput}
          </p>
        </div>
        <div className="flex gap-1">
          {hasDetails && (
            <button
              onClick={() => onToggleExpand(artigo.id)}
              className="p-1.5 rounded hover-bg-blue-opacity text-blue-400"
              title={expanded ? 'Recolher' : 'Expandir'}
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
          <button
            onClick={() => onCopy(artigo)}
            className={`p-1.5 rounded transition-colors ${isCopied ? 'bg-green-500/20 text-green-400' : 'hover-bg-blue-opacity text-blue-400'}`}
            title={isCopied ? 'Copiado!' : 'Copiar artigo'}
          >
            {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {expanded && hasDetails && (
        <div className="mt-3 pt-3 border-t theme-border-subtle text-sm space-y-2">
          {artigo.paragrafos && artigo.paragrafos.length > 0 && (
            <div>
              <span className="text-xs font-medium theme-text-purple block mb-1">Parágrafos:</span>
              {artigo.paragrafos.map((p: { numero: string; texto: string }, i: number) => (
                <p key={i} className="theme-text-secondary ml-2 mb-1">
                  <span className="theme-text-purple">§ {p.numero}º</span> {p.texto}
                </p>
              ))}
            </div>
          )}
          {artigo.incisos && artigo.incisos.length > 0 && (
            <div>
              <span className="text-xs font-medium theme-text-amber block mb-1">Incisos:</span>
              {artigo.incisos.map((inc: { numero: string; texto: string }, i: number) => (
                <p key={i} className="theme-text-secondary ml-2 mb-1">
                  <span className="theme-text-amber">{inc.numero}</span> - {inc.texto}
                </p>
              ))}
            </div>
          )}
          {artigo.alineas && artigo.alineas.length > 0 && (
            <div>
              <span className="text-xs font-medium theme-text-green block mb-1">Alíneas:</span>
              {artigo.alineas.map((al: { letra: string; texto: string }, i: number) => (
                <p key={i} className="theme-text-secondary ml-2 mb-1">
                  <span className="theme-text-green">{al.letra})</span> {al.texto}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

ArtigoCard.displayName = 'ArtigoCard';

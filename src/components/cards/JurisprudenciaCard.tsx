/**
 * @file JurisprudenciaCard.tsx
 * @description Card de exibição de precedente jurisprudencial
 * @version 1.36.83
 */

import React from 'react';
import { Check, Copy } from 'lucide-react';
import type { JurisprudenciaCardProps } from '../../types';
import { isStatusValido } from '../../utils/jurisprudencia';

export const JurisprudenciaCard = React.memo(({
  precedente,
  onCopy,
  expanded,
  onToggleExpand,
  copiedId
}: JurisprudenciaCardProps) => {
  // v1.36.52: Adiciona fallback para fullText/texto (embeddings semânticos não têm tese/enunciado)
  const texto = precedente.tese || precedente.enunciado || precedente.fullText || precedente.texto || '';
  const isCopied = copiedId === precedente.id;  // v1.36.54: Feedback visual
  const tesePreview = texto.length > 200 ? texto.slice(0, 200) + '...' : texto;

  const renderIdentificador = () => {
    if (precedente.tema) {
      return <span className="text-xs theme-text-muted ml-2">Tema {precedente.tema}</span>;
    }
    if (precedente.tipoProcesso === 'Súmula' || precedente.tipoProcesso === 'OJ') {
      return <span className="text-xs theme-text-muted ml-2">nº {precedente.numero}</span>;
    }
    return null;
  };

  return (
    <div className="theme-bg-secondary p-4 rounded-lg border theme-border-secondary">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-0.5 rounded theme-bg-tertiary theme-text-tertiary">
            {precedente.tipoProcesso}
          </span>
          {renderIdentificador()}
        </div>
        <div className="flex items-center gap-1">
          {precedente.status && (
            <span className={`text-xs px-2 py-0.5 rounded ${
              isStatusValido(precedente.status)
                ? 'theme-badge-success'
                : 'theme-badge-error'
            }`}>
              {isStatusValido(precedente.status) ? '✓' : '✗'} {precedente.status.replace(/_/g, ' ')}
            </span>
          )}
          {precedente.orgao && (
            <span className="text-xs px-2 py-0.5 rounded theme-badge-purple">
              {precedente.orgao}
            </span>
          )}
          {precedente.tribunal && (
            <span className="text-xs px-2 py-0.5 rounded theme-badge-blue">
              {precedente.tribunal}
            </span>
          )}
          <button
            onClick={() => onCopy(precedente)}
            className={`p-1.5 rounded ${isCopied ? 'text-green-500' : 'hover-icon-blue-scale'}`}
            title={isCopied ? 'Copiado!' : 'Copiar tese'}
          >
            {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>
      {precedente.titulo && (
        <h4 className="font-semibold theme-text-primary text-sm mb-1 uppercase">{precedente.titulo}</h4>
      )}
      {precedente.numeroProcesso && (
        <h4 className="font-medium theme-text-primary text-sm mb-1">{precedente.numeroProcesso}</h4>
      )}
      {(precedente.relator || precedente.dataJulgamento || precedente.dataAprovacao) && (
        <p className="text-xs theme-text-muted mb-2">
          {precedente.relator && `Rel: ${precedente.relator}`}
          {precedente.relator && (precedente.dataJulgamento || precedente.dataAprovacao) && ' | '}
          {precedente.dataJulgamento || precedente.dataAprovacao}
        </p>
      )}
      <p className={`text-sm theme-text-secondary ${precedente.status && !isStatusValido(precedente.status) ? 'line-through opacity-70' : ''}`}>
        {expanded ? texto : tesePreview}
      </p>
      {texto.length > 200 && (
        <button
          onClick={() => onToggleExpand(precedente.id)}
          className="text-xs text-purple-500 mt-2 hover-text-purple-400"
        >
          {expanded ? 'Recolher' : 'Expandir'}
        </button>
      )}
    </div>
  );
});

JurisprudenciaCard.displayName = 'JurisprudenciaCard';

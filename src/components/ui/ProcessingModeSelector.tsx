/**
 * @file ProcessingModeSelector.tsx
 * @description Seletor de modo de processamento de PDF
 * @version 1.36.82
 */

import React from 'react';
import type { ProcessingMode, ProcessingModeSelectorProps } from '../../types';

export type { ProcessingModeSelectorProps };

// v1.14.1: Restaurado PDF Puro como opção (config global é apenas padrão, usuário pode mudar por arquivo)
// v1.32.13: anonymizationEnabled bloqueia apenas modos que não extraem texto (claude-vision, pdf-puro)
// v1.36.36: grokEnabled bloqueia apenas pdf-puro (Grok não suporta binário, mas texto ok)
export const ProcessingModeSelector = React.memo(({
  value,
  onChange,
  disabled = false,
  anonymizationEnabled = false,
  grokEnabled = false,
  className = ''
}: ProcessingModeSelectorProps) => {
  // Grok: só bloqueia pdf-puro | Anonimização: bloqueia pdf-puro E claude-vision
  const isPdfPuroBlocked = anonymizationEnabled || grokEnabled;
  const isClaudeVisionBlocked = anonymizationEnabled;

  // Determinar valor efetivo (fallback para pdfjs se bloqueado)
  const blockedModes = [
    ...(isPdfPuroBlocked ? ['pdf-puro'] : []),
    ...(isClaudeVisionBlocked ? ['claude-vision'] : [])
  ];
  const isValueBlocked = blockedModes.includes(value);
  const effectiveValue = isValueBlocked ? 'pdfjs' : (value || 'pdfjs');

  // Labels com motivo do bloqueio
  const getPdfPuroLabel = () => {
    if (anonymizationEnabled) return '🔒 PDF Binário (anonimização)';
    if (grokEnabled) return '🔒 PDF Binário (Grok)';
    return 'PDF Puro (binário)';
  };

  const getTitle = () => {
    if (anonymizationEnabled) return 'Anonimização ativa: modos binários bloqueados';
    if (grokEnabled) return 'Grok não suporta PDF binário';
    return undefined;
  };

  return (
    <select
      value={effectiveValue}
      onChange={(e) => onChange(e.target.value as ProcessingMode)}
      disabled={disabled}
      title={getTitle()}
      className={`text-xs theme-bg-secondary theme-border-input border rounded px-2 py-1 cursor-pointer theme-text-primary hover-border-blue-500 transition-colors ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      <option value="pdfjs" className="theme-bg-secondary theme-text-primary">PDF.js (Texto)</option>
      <option value="tesseract" className="theme-bg-secondary theme-text-primary">Tesseract OCR (Offline)</option>
      <option value="claude-vision" className="theme-bg-secondary theme-text-primary" disabled={isClaudeVisionBlocked}>{isClaudeVisionBlocked ? '🔒 Claude Vision' : 'Claude Vision (API)'}</option>
      <option value="pdf-puro" className="theme-bg-secondary theme-text-primary" disabled={isPdfPuroBlocked}>{getPdfPuroLabel()}</option>
    </select>
  );
});

ProcessingModeSelector.displayName = 'ProcessingModeSelector';

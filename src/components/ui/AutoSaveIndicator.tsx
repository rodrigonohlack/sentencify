/**
 * @file AutoSaveIndicator.tsx
 * @description Indicador discreto de auto-save no canto inferior direito
 * @version 1.37.51
 *
 * Extraído do App.tsx como parte da extração de componentes UI.
 */

import React from 'react';

interface AutoSaveIndicatorProps {
  show: boolean;
}

/**
 * AutoSaveIndicator - Ícone pulsante indicando salvamento automático
 *
 * Aparece brevemente quando dados são salvos automaticamente.
 */
export const AutoSaveIndicator: React.FC<AutoSaveIndicatorProps> = ({ show }) => {
  if (!show) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] animate-in fade-in duration-300">
      <div className="theme-autosave p-2 rounded-full shadow-lg border">
        <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
    </div>
  );
};

export default AutoSaveIndicator;

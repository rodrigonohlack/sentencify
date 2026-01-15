/**
 * @file Toast.tsx
 * @description Componente de notificação toast flutuante
 * @version 1.37.51
 *
 * Extraído do App.tsx como parte da extração de modais.
 * Usa useModalManager para acessar estado do toast via Zustand.
 */

import React from 'react';
import { useModalManager } from '../../hooks/useModalManager';

/**
 * Toast - Componente de notificação flutuante
 *
 * Exibe mensagens temporárias no canto superior esquerdo da tela.
 * Suporta 4 tipos: success, error, info, warning.
 */
export const Toast: React.FC = () => {
  const { toast, clearToast } = useModalManager();

  if (!toast.show) return null;

  return (
    <div className="fixed top-4 left-4 z-[9999] animate-slide-in-right">
      <div className={`
        rounded-lg shadow-2xl border p-4 min-w-[320px] max-w-md
        ${toast.type === 'success' ? 'theme-toast-success' : ''}
        ${toast.type === 'error' ? 'theme-toast-error' : ''}
        ${toast.type === 'info' ? 'theme-toast-info' : ''}
        ${toast.type === 'warning' ? 'theme-toast-warning' : ''}
      `}>
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 text-2xl">
            {toast.type === 'success' && '✅'}
            {toast.type === 'error' && '❌'}
            {toast.type === 'info' && 'ℹ️'}
            {toast.type === 'warning' && '⚠️'}
          </div>
          <div className="flex-1">
            <p className="text-sm theme-text-primary whitespace-pre-line">{toast.message}</p>
          </div>
          <button
            onClick={clearToast}
            className="flex-shrink-0 text-white/60 hover-text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Toast;

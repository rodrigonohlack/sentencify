/**
 * @file TeseModal.tsx
 * @description Modal para exibir teses expandidas - usa createPortal para escapar do DOM
 */

import React from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, AlertTriangle } from 'lucide-react';

interface TeseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  text: string;
  variant: 'autor' | 'reu';
}

export const TeseModal: React.FC<TeseModalProps> = ({ isOpen, onClose, title, text, variant }) => {
  // ESC para fechar
  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const Icon = variant === 'autor' ? CheckCircle : AlertTriangle;
  const iconBg = variant === 'autor'
    ? 'bg-gradient-to-br from-green-500 to-emerald-500'
    : 'bg-gradient-to-br from-yellow-500 to-orange-500';

  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-full ${iconBg} flex items-center justify-center`}>
              <Icon className="w-4 h-4 text-white" />
            </div>
            <h2 className="font-semibold text-slate-800 dark:text-white">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center justify-center text-slate-500 dark:text-slate-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto">
          <p className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
            {text}
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
};

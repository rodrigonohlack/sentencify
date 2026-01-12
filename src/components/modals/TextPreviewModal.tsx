/**
 * @file TextPreviewModal.tsx
 * @description Modal para preview de texto extraído
 * @version 1.36.85
 *
 * Extraído do App.tsx como parte da FASE 3 de refatoração.
 * v1.21.16: Modal de preview de texto extraído
 */

import React from 'react';
import { Eye, X } from 'lucide-react';
import { CSS } from './BaseModal';
import type { TextPreviewModalProps } from '../../types';

// v1.21.16: Modal de preview de texto extraído
export const TextPreviewModal = React.memo(({ isOpen, onClose, title, text }: TextPreviewModalProps) => {
  // v1.35.67: ESC handler
  React.useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // v1.35.67: Scroll lock
  React.useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = originalOverflow; };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className={`${CSS.modalOverlay} overflow-y-auto`} style={{ alignItems: 'flex-start' }} onClick={onClose}>
      <div
        className={`${CSS.modalContainer} theme-border-modal theme-modal-glow animate-modal w-full max-w-4xl my-8`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`${CSS.modalHeader} flex items-start justify-between`}>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-blue-500/20">
              <Eye className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold theme-text-primary">Preview: {title}</h3>
              <p className="text-xs theme-text-muted">{text?.length?.toLocaleString() || 0} caracteres</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl theme-bg-secondary-50 theme-hover-bg transition-colors" title="Fechar">
            <X className="w-5 h-5 theme-text-tertiary" />
          </button>
        </div>
        <div className="p-4 max-h-[70vh] overflow-y-auto">
          <pre className="whitespace-pre-wrap text-sm theme-text-secondary font-mono bg-black/20 p-4 rounded-lg">
            {text || 'Sem conteúdo'}
          </pre>
        </div>
      </div>
    </div>
  );
});
TextPreviewModal.displayName = 'TextPreviewModal';

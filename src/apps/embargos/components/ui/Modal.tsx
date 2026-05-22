/**
 * @file Modal.tsx
 * @description Componente de modal reutilizável com suporte a dark mode
 * @version 1.39.0
 */

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  footer?: React.ReactNode;
  preventClose?: boolean;
  subtitle?: string;
  icon?: React.ReactNode;
  iconColor?: string;
}

const sizeStyles = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-6xl'
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  footer,
  preventClose = false,
  subtitle,
  icon,
  iconColor = 'text-indigo-600 dark:text-indigo-400'
}) => {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !preventClose) onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose, preventClose]);

  if (!isOpen) return null;

  const handleBackdropClick = () => {
    if (!preventClose) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-auto">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm"
        onClick={handleBackdropClick}
      />

      {/* Modal */}
      <div
        className={`
          relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full ${sizeStyles[size]}
          max-h-[90vh] flex flex-col my-auto
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            {icon && <span className={iconColor}>{icon}</span>}
            <div>
              <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">{title}</h2>
              {subtitle && (
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>
          {!preventClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex justify-end gap-3 p-4 border-t border-slate-200 dark:border-slate-700">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;

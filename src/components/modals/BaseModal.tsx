/**
 * @file BaseModal.tsx
 * @description Componente base reutilizável para modais + helpers
 * @version 1.36.85
 *
 * Extraído do App.tsx como parte da FASE 3 de refatoração.
 * v1.33.48: ESC handler centralizado (18 modais beneficiados)
 */

import React from 'react';
import { X, AlertCircle } from 'lucide-react';
import type { BaseModalProps } from '../../types';

// CSS object (classes comuns usadas nos modais)
export const CSS = {
  modalOverlay: "fixed inset-0 theme-modal-overlay backdrop-blur-sm flex items-center justify-center z-[90] p-4",
  modalContainer: "theme-modal-container backdrop-blur-md rounded-2xl shadow-2xl theme-border-modal border theme-modal-glow max-h-[90vh] flex flex-col",
  modalHeader: "p-5 border-b theme-border-modal",
  modalFooter: "flex gap-3 p-4 border-t theme-border-modal",
  infoBox: "theme-info-box",
  spinner: "w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin",
  label: "block text-sm font-medium theme-text-tertiary mb-2",
  textMuted: "text-xs theme-text-muted",
  btnSecondary: "px-4 py-2.5 rounded-xl font-medium theme-bg-secondary theme-hover-bg border theme-border-modal theme-text-primary transition-all",
  btnBlue: "px-4 py-2.5 rounded-xl font-medium bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-lg shadow-blue-500/25",
  btnRed: "px-4 py-2.5 rounded-xl font-medium bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white shadow-lg shadow-red-500/25",
  btnGreen: "px-4 py-2.5 rounded-xl font-medium bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white shadow-lg shadow-green-500/25",
  btnSuccess: "px-4 py-2.5 rounded-xl font-medium bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white shadow-lg shadow-green-500/25",
};

// BaseModal: Componente base reutilizável para modais
export const BaseModal = React.memo(({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  iconColor = 'blue',
  size = 'md',
  children,
  footer,
  preventClose = false
}: BaseModalProps) => {
  // ESC handler - deve vir antes do early return para cleanup funcionar
  React.useEffect(() => {
    if (preventClose) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
    }
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose, preventClose]);

  // v1.35.63: Bloquear scroll do body quando modal aberto
  React.useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const sizes: Record<string, string> = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    '2xl': 'max-w-5xl'
  };

  // Gradientes para o círculo do ícone
  const iconGradients: Record<string, string> = {
    blue: 'from-blue-500 to-cyan-500 shadow-blue-500/30',
    red: 'from-red-500 to-orange-500 shadow-red-500/30',
    green: 'from-green-500 to-emerald-500 shadow-green-500/30',
    yellow: 'from-yellow-500 to-orange-500 shadow-yellow-500/30',
    purple: 'from-purple-500 to-blue-500 shadow-purple-500/30',
    orange: 'from-orange-500 to-red-500 shadow-orange-500/30'
  };

  return (
    <div className={CSS.modalOverlay} onClick={preventClose ? undefined : onClose}>
      <div
        className={`${CSS.modalContainer} ${sizes[size] || sizes.md} w-full animate-modal`}
        onClick={e => e.stopPropagation()}
        style={{ animation: 'modalFadeIn 0.2s ease-out' }}
      >
        {/* Header com ícone em círculo e botão X */}
        <div className={`${CSS.modalHeader} flex items-center justify-between flex-shrink-0`}>
          <div className="flex items-center gap-3">
            {icon && (
              <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${iconGradients[iconColor] || iconGradients.blue} flex items-center justify-center shadow-lg`}>
                {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: 'w-4 h-4 text-white' })}
              </div>
            )}
            <div>
              <h2 className="font-semibold theme-text-primary">{title}</h2>
              {subtitle && <p className="text-xs theme-text-secondary">{subtitle}</p>}
            </div>
          </div>
          {!preventClose && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full theme-bg-secondary theme-hover-bg flex items-center justify-center theme-text-secondary transition-all border theme-border-modal hover:border-current"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1 min-h-0">
          {children}
        </div>
        {/* Footer */}
        {footer && (
          <div className={CSS.modalFooter}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
});
BaseModal.displayName = 'BaseModal';

// ModalFooter: Helpers para footers de modais
export const ModalFooter = {
  // Footer com Cancelar + Confirmar (azul)
  Standard: ({ onClose, onConfirm, confirmText = 'Confirmar', disabled = false, loading = false }: { onClose: () => void; onConfirm: () => void; confirmText?: string; disabled?: boolean; loading?: boolean }) => (
    <>
      <button onClick={onClose} className={CSS.btnSecondary} disabled={loading}>Cancelar</button>
      <button onClick={onConfirm} disabled={disabled || loading} className={CSS.btnBlue}>
        {loading ? 'Processando...' : confirmText}
      </button>
    </>
  ),
  // Footer com apenas Fechar
  CloseOnly: ({ onClose, text = 'Fechar' }: { onClose: () => void; text?: string }) => (
    <button onClick={onClose} className={CSS.btnSecondary}>{text}</button>
  ),
  // Footer com Cancelar + Ação Destrutiva (vermelho)
  Destructive: ({ onClose, onConfirm, confirmText = 'Deletar', disabled = false }: { onClose: () => void; onConfirm: () => void; confirmText?: string; disabled?: boolean }) => (
    <>
      <button onClick={onClose} className={CSS.btnSecondary}>Cancelar</button>
      <button onClick={onConfirm} disabled={disabled} className={CSS.btnRed}>{confirmText}</button>
    </>
  ),
  // Footer com Cancelar + Confirmar (verde)
  Success: ({ onClose, onConfirm, confirmText = 'Confirmar', disabled = false }: { onClose: () => void; onConfirm: () => void; confirmText?: string; disabled?: boolean }) => (
    <>
      <button onClick={onClose} className={CSS.btnSecondary}>Cancelar</button>
      <button onClick={onConfirm} disabled={disabled} className={CSS.btnGreen}>{confirmText}</button>
    </>
  )
};

// ModalWarningBox: Caixa de aviso vermelho para ações destrutivas
export const ModalWarningBox = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-red-900/20 border border-red-500/30 rounded-lg p-3 ${className}`}>
    <div className="text-xs theme-text-red flex items-start gap-2">
      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
      <div className="flex-1">{children}</div>
    </div>
  </div>
);

// ModalInfoBox: Caixa de informação azul para dicas
export const ModalInfoBox = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`${CSS.infoBox} ${className}`}>
    <div className="text-xs theme-text-blue">{children}</div>
  </div>
);

// ModalAmberBox: Caixa de aviso amarelo
export const ModalAmberBox = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`theme-warning-box p-4 ${className}`}>
    {children}
  </div>
);

// ModalContentPreview: Preview de conteúdo em box
export const ModalContentPreview = ({ title, subtitle, badge, children, className = '' }: { title?: string; subtitle?: string; badge?: string; children?: React.ReactNode; className?: string }) => (
  <div className={`theme-bg-app p-4 rounded-lg border theme-border-secondary ${className}`}>
    {title && <p className="font-semibold theme-text-primary text-lg">{title}</p>}
    {subtitle && <p className="text-sm theme-text-muted mt-1">{subtitle}</p>}
    {badge && <span className="text-xs px-2 py-1 rounded theme-bg-purple-accent theme-text-purple border border-purple-500/30 inline-block mt-2">{badge}</span>}
    {children}
  </div>
);

export default BaseModal;

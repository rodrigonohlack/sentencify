/**
 * @file Button.tsx
 * @description Botão central do main app. Fundação da hierarquia de botões:
 *   azul-500 primário sólido + neutros, sem "arco-íris" de ação (roxo/âmbar de
 *   ação foram eliminados). Verde = Salvar/Criar; vermelho = destrutivo.
 *   Consome os tokens de tema (`theme-*`) para funcionar em ambos os temas.
 *
 *   NÃO usa o gradiente indigo-violeta dos subapps — o main app é azul sólido.
 *
 * @version 1.52.0
 */

import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'success' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Hierarquia visual. `primary` é a ação principal (uma por contexto). */
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Exibe spinner e desabilita o botão. */
  loading?: boolean;
  /** Ícone à esquerda do texto (ex.: <Save className="w-4 h-4" />). */
  icon?: React.ReactNode;
}

/**
 * Classes por variante. Hover sempre escurece; cor sólida (sem gradiente).
 * `success`/`danger` permanecem semânticos (Salvar/Criar, destrutivo).
 */
const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-blue-500 hover:bg-blue-600 text-white shadow-sm',
  secondary: 'theme-bg-secondary theme-hover-bg border theme-border-input theme-text-primary',
  ghost: 'theme-text-secondary theme-hover-bg',
  success: 'bg-green-600 hover:bg-green-700 text-white shadow-sm',
  danger: 'bg-red-600 hover:bg-red-700 text-white shadow-sm',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3',
};

/**
 * Botão padronizado do main app.
 *
 * @example
 * <Button variant="primary" icon={<Save className="w-4 h-4" />}>Salvar</Button>
 * <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
 */
export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  disabled,
  className = '',
  type = 'button',
  ...props
}) => {
  const isDisabled = disabled || loading;
  return (
    <button
      type={type}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        isDisabled ? 'opacity-50 cursor-not-allowed' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      disabled={isDisabled}
      {...props}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      {children}
    </button>
  );
};

export default Button;

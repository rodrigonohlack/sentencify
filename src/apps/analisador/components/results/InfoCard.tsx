/**
 * @file InfoCard.tsx
 * @description Componente de card para exibição de informações
 * @version 1.39.0
 */

import React from 'react';
import { LucideIcon } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

interface InfoCardProps {
  /** Label do campo */
  label: string;
  /** Valor do campo */
  value: React.ReactNode;
  /** Ícone opcional */
  icon?: LucideIcon;
  /** Cor do ícone */
  iconColor?: string;
  /** Tamanho do card */
  size?: 'sm' | 'md' | 'lg';
  /** Variante visual */
  variant?: 'default' | 'highlight' | 'warning' | 'success' | 'error';
  /** Classes adicionais */
  className?: string;
  /** Se o valor é editável */
  editable?: boolean;
  /** Callback quando valor é alterado */
  onEdit?: (value: string) => void;
  /** Placeholder quando não há valor */
  placeholder?: string;
}

interface InfoGridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// ESTILOS
// ═══════════════════════════════════════════════════════════════════════════

const sizeStyles = {
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5',
};

const variantStyles = {
  default:
    'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700',
  highlight:
    'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800',
  warning:
    'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
  success:
    'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800',
  error:
    'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
};

const iconVariantColors = {
  default: 'text-slate-500 dark:text-slate-400',
  highlight: 'text-indigo-600 dark:text-indigo-400',
  warning: 'text-amber-600 dark:text-amber-400',
  success: 'text-emerald-600 dark:text-emerald-400',
  error: 'text-red-600 dark:text-red-400',
};

const gridColumns = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
};

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Card para exibição de uma informação com label e valor
 */
export const InfoCard: React.FC<InfoCardProps> = ({
  label,
  value,
  icon: Icon,
  iconColor,
  size = 'md',
  variant = 'default',
  className = '',
  editable = false,
  onEdit,
  placeholder = '—',
}) => {
  const hasValue = value !== null && value !== undefined && value !== '';

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onEdit) {
      onEdit(e.target.value);
    }
  };

  return (
    <div
      className={`
        rounded-lg border ${variantStyles[variant]} ${sizeStyles[size]}
        transition-colors
        ${className}
      `}
    >
      {/* Label */}
      <div className="flex items-center gap-2 mb-1">
        {Icon && (
          <Icon
            className={`w-4 h-4 ${iconColor || iconVariantColors[variant]}`}
          />
        )}
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          {label}
        </span>
      </div>

      {/* Value */}
      {editable ? (
        <input
          type="text"
          value={hasValue ? String(value) : ''}
          onChange={handleInputChange}
          placeholder={placeholder}
          className="w-full bg-transparent border-none p-0 text-slate-800 dark:text-slate-100 font-medium focus:outline-none focus:ring-0"
        />
      ) : (
        <div className="text-slate-800 dark:text-slate-100 font-medium">
          {hasValue ? value : (
            <span className="text-slate-400 dark:text-slate-500">{placeholder}</span>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Grid para organizar múltiplos InfoCards
 */
export const InfoGrid: React.FC<InfoGridProps> = ({
  children,
  columns = 2,
  className = '',
}) => {
  return (
    <div className={`grid ${gridColumns[columns]} gap-3 ${className}`}>
      {children}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// VARIANTES ESPECIALIZADAS
// ═══════════════════════════════════════════════════════════════════════════

interface InfoListProps {
  label: string;
  items: string[];
  icon?: LucideIcon;
  variant?: 'default' | 'highlight' | 'warning' | 'success' | 'error';
  className?: string;
  emptyMessage?: string;
}

/**
 * Card para exibição de uma lista de itens
 */
export const InfoList: React.FC<InfoListProps> = ({
  label,
  items,
  icon: Icon,
  variant = 'default',
  className = '',
  emptyMessage = 'Nenhum item',
}) => {
  return (
    <div
      className={`
        rounded-lg border ${variantStyles[variant]} p-4
        ${className}
      `}
    >
      {/* Label */}
      <div className="flex items-center gap-2 mb-2">
        {Icon && (
          <Icon className={`w-4 h-4 ${iconVariantColors[variant]}`} />
        )}
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          {label}
        </span>
      </div>

      {/* Items */}
      {items.length > 0 ? (
        <ul className="space-y-1">
          {items.map((item, index) => (
            <li
              key={index}
              className="text-slate-800 dark:text-slate-100 text-sm flex items-start gap-2"
            >
              <span className="text-indigo-500 dark:text-indigo-400 mt-1">•</span>
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-slate-400 dark:text-slate-500 text-sm">{emptyMessage}</p>
      )}
    </div>
  );
};

export default InfoCard;

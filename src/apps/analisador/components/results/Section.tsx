/**
 * @file Section.tsx
 * @description Componente de seção expansível reutilizável
 * @version 1.39.0
 */

import React, { useState, useCallback } from 'react';
import { ChevronDown, ChevronRight, LucideIcon } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

interface SectionProps {
  /** Título da seção */
  title: string;
  /** Subtítulo opcional */
  subtitle?: string;
  /** Ícone opcional */
  icon?: LucideIcon;
  /** Cor do ícone */
  iconColor?: string;
  /** Se a seção está expandida por padrão */
  defaultExpanded?: boolean;
  /** Conteúdo da seção */
  children: React.ReactNode;
  /** Badge numérico (ex: quantidade de itens) */
  badge?: number | string;
  /** Ações no header (botões, etc) */
  headerActions?: React.ReactNode;
  /** Classes adicionais */
  className?: string;
  /** Se a seção pode ser expandida/colapsada */
  collapsible?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Seção expansível para agrupar conteúdo relacionado
 */
export const Section: React.FC<SectionProps> = ({
  title,
  subtitle,
  icon: Icon,
  iconColor = 'text-indigo-600 dark:text-indigo-400',
  defaultExpanded = true,
  children,
  badge,
  headerActions,
  className = '',
  collapsible = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const handleToggle = useCallback(() => {
    if (collapsible) {
      setIsExpanded((prev) => !prev);
    }
  }, [collapsible]);

  const ChevronIcon = isExpanded ? ChevronDown : ChevronRight;

  return (
    <div
      className={`
        bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700
        shadow-sm overflow-hidden transition-shadow hover:shadow-md
        ${className}
      `}
    >
      {/* Header */}
      <div
        className={`
          flex items-center justify-between px-4 py-3
          bg-slate-50 dark:bg-slate-800/50
          ${collapsible ? 'cursor-pointer select-none' : ''}
        `}
        onClick={handleToggle}
      >
        <div className="flex items-center gap-3">
          {/* Chevron */}
          {collapsible && (
            <ChevronIcon className="w-5 h-5 text-slate-400 dark:text-slate-500 transition-transform" />
          )}

          {/* Icon */}
          {Icon && <Icon className={`w-5 h-5 ${iconColor}`} />}

          {/* Title + Subtitle */}
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
              {badge !== undefined && (
                <span className="px-2 py-0.5 text-xs font-medium bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-full">
                  {badge}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Header Actions */}
        {headerActions && (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {headerActions}
          </div>
        )}
      </div>

      {/* Content */}
      {(isExpanded || !collapsible) && (
        <div className="px-4 py-4 bg-white dark:bg-slate-800">{children}</div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// VARIANTES
// ═══════════════════════════════════════════════════════════════════════════

interface SectionGroupProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Agrupa múltiplas seções com espaçamento consistente
 */
export const SectionGroup: React.FC<SectionGroupProps> = ({ children, className = '' }) => {
  return <div className={`flex flex-col gap-4 ${className}`}>{children}</div>;
};

export default Section;

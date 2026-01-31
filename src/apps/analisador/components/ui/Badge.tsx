/**
 * @file Badge.tsx
 * @description Componente de badge/tag
 */

import React from 'react';

type BadgeVariant = 'success' | 'danger' | 'warning' | 'info' | 'neutral';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  success: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300',
  danger: 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300',
  warning: 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300',
  info: 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300',
  neutral: 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  children,
  className = ''
}) => {
  return (
    <span
      className={`
        inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
        ${variantStyles[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  );
};

export default Badge;

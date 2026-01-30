/**
 * @file Spinner.tsx
 * @description Componente de loading spinner
 */

import React from 'react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeStyles = {
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-10 h-10 border-3'
};

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className = '' }) => {
  return (
    <div
      className={`
        ${sizeStyles[size]}
        border-indigo-600 dark:border-indigo-400 border-t-transparent
        rounded-full animate-spin
        ${className}
      `}
    />
  );
};

export const SpinnerOverlay: React.FC<{ message?: string }> = ({ message }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        <Spinner size="lg" />
        {message && (
          <p className="text-slate-600 dark:text-slate-300 font-medium">{message}</p>
        )}
      </div>
    </div>
  );
};

export default Spinner;

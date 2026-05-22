/**
 * @file PdfDropArea.tsx
 * @description Área drag&drop para um único arquivo PDF.
 */

import React, { useCallback, useState } from 'react';
import { Upload, AlertCircle } from 'lucide-react';

interface PdfDropAreaProps {
  onFile: (file: File) => void;
  disabled?: boolean;
  helperText?: string;
}

export const PdfDropArea: React.FC<PdfDropAreaProps> = ({ onFile, disabled, helperText }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') onFile(file);
  }, [onFile, disabled]);

  const handleSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFile(file);
    e.target.value = '';
  }, [onFile]);

  return (
    <label
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={`block border-2 border-dashed rounded-xl px-4 py-6 text-center cursor-pointer transition-all
        ${disabled
          ? 'border-slate-200 dark:border-slate-700 opacity-50 cursor-not-allowed'
          : isDragging
            ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
            : 'border-slate-300 dark:border-slate-600 hover:border-amber-400 dark:hover:border-amber-500'}`}
    >
      <input
        type="file"
        accept="application/pdf"
        className="sr-only"
        onChange={handleSelect}
        disabled={disabled}
      />
      <Upload className="w-6 h-6 mx-auto mb-2 text-slate-400 dark:text-slate-500" />
      <p className="text-sm text-slate-600 dark:text-slate-300">
        {isDragging ? 'Solte o PDF aqui' : 'Clique ou arraste um PDF'}
      </p>
      {helperText && (
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 flex items-center justify-center gap-1">
          <AlertCircle className="w-3 h-3" /> {helperText}
        </p>
      )}
    </label>
  );
};

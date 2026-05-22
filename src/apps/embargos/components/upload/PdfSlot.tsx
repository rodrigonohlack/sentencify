/**
 * @file PdfSlot.tsx
 * @description Slot fixo para um documento (drop area se vazio, card se preenchido).
 */

import React from 'react';
import { FileText, X, AlertCircle, Loader2 } from 'lucide-react';
import { PdfDropArea } from './PdfDropArea';
import { usePdfUpload } from '../../hooks';
import { SLOT_LABELS, REQUIRED_SLOTS } from '../../types';
import type { DocumentSlot } from '../../types';

interface PdfSlotProps {
  slot: DocumentSlot;
}

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const PdfSlot: React.FC<PdfSlotProps> = ({ slot }) => {
  const { uploadFile, removeFile, slot: file } = usePdfUpload(slot);
  const isRequired = REQUIRED_SLOTS.includes(slot);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          {SLOT_LABELS[slot]}
          {isRequired && <span className="text-red-500 ml-1">*</span>}
        </h3>
        {file && (
          <button
            onClick={removeFile}
            className="text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400"
            title="Remover"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {!file && (
        <PdfDropArea
          onFile={uploadFile}
          helperText={isRequired ? 'Obrigatório' : 'Opcional'}
        />
      )}

      {file && file.status === 'parsing' && (
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin" /> Processando…
        </div>
      )}

      {file && file.status === 'ready' && (
        <div className="flex items-start gap-3 text-sm">
          <FileText className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-slate-700 dark:text-slate-200 font-medium">{file.name}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {formatSize(file.size)}{file.useBinary ? ' · enviado como PDF' : ' · texto extraído'}
            </p>
          </div>
        </div>
      )}

      {file && file.status === 'error' && (
        <div className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{file.errorMessage ?? 'Falha ao processar PDF.'}</span>
        </div>
      )}
    </div>
  );
};

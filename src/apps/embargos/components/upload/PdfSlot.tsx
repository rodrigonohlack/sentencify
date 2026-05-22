/**
 * @file PdfSlot.tsx
 * @description Slot fixo para um documento (drop area se vazio, card se preenchido).
 */

import React from 'react';
import { FileText, X, AlertCircle, Loader2 } from 'lucide-react';
import { PdfDropArea } from './PdfDropArea';
import { usePdfUpload } from '../../hooks';
import { useDocumentStore, useAIStore } from '../../stores';
import { providerSupportsPdfBinary } from '../../constants';
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
  const setSlotUseBinary = useDocumentStore(s => s.setSlotUseBinary);
  const provider = useAIStore(s => s.aiSettings.provider);
  const canBinary = providerSupportsPdfBinary(provider);
  const isRequired = REQUIRED_SLOTS.includes(slot);

  const isBinaryActive = file?.useBinary === true;
  const binaryFallingBack = isBinaryActive && !canBinary;

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
        <div className="flex flex-col gap-2 text-sm">
          <div className="flex items-start gap-3">
            <FileText className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-slate-700 dark:text-slate-200 font-medium">{file.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {formatSize(file.size)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSlotUseBinary(slot, false)}
              className={`text-xs px-2 py-0.5 rounded transition-colors ${
                !isBinaryActive
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200'
              }`}
              aria-pressed={!isBinaryActive}
            >
              Usar Texto
            </button>
            <button
              type="button"
              onClick={() => { if (canBinary && file.base64) setSlotUseBinary(slot, true); }}
              disabled={!canBinary || !file.base64}
              title={!canBinary ? 'Provider atual não suporta PDF binário (use Claude ou Gemini)' : ''}
              className={`text-xs px-2 py-0.5 rounded transition-colors ${
                isBinaryActive && canBinary
                  ? 'bg-emerald-600 text-white'
                  : !canBinary
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-800 dark:text-slate-600'
                    : 'bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200'
              }`}
              aria-pressed={isBinaryActive}
            >
              Usar PDF
            </button>
            {binaryFallingBack && (
              <span
                className="text-xs text-amber-600 dark:text-amber-400"
                title="Provider não compatível com PDF binário — texto extraído será usado na análise."
              >
                ⚠ fallback texto
              </span>
            )}
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

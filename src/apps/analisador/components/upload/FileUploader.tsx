/**
 * @file FileUploader.tsx
 * @description Componente de upload de arquivo com drag & drop
 * Usado exclusivamente para petição inicial
 */

import React, { useCallback, useState } from 'react';
import { Upload, FileText, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useDocumentStore } from '../../stores';
import { useFileProcessing } from '../../hooks';
import { formatFileSize } from '../../services/pdfService';
import type { DocumentFile } from '../../types';

interface FileUploaderProps {
  type: 'peticao';
  label: string;
  description?: string;
  optional?: boolean;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  type: _type,
  label,
  description,
  optional = false
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const document = useDocumentStore((s) => s.peticao);
  const { processPeticao, removePeticao } = useFileProcessing();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      await processPeticao(file);
    }
  }, [processPeticao]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processPeticao(file);
    }
    e.target.value = '';
  }, [processPeticao]);

  const handleRemove = useCallback(() => {
    removePeticao();
  }, [removePeticao]);

  const renderStatus = (doc: DocumentFile) => {
    switch (doc.status) {
      case 'processing':
        return (
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Processando...</span>
          </div>
        );
      case 'ready':
        return (
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm">Pronto</span>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{doc.error}</span>
          </div>
        );
      default:
        return null;
    }
  };

  if (document) {
    return (
      <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 bg-white dark:bg-slate-800">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <p className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                {document.name}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {formatFileSize(document.file.size)}
              </p>
              <div className="mt-1">
                {renderStatus(document)}
              </div>
            </div>
          </div>
          <button
            onClick={handleRemove}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer
        ${isDragging
          ? 'border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-900/20'
          : 'border-slate-300 dark:border-slate-600 hover:border-indigo-400 hover:bg-indigo-50/50 dark:hover:border-indigo-500 dark:hover:bg-indigo-900/10'
        }
      `}
    >
      <input
        type="file"
        accept=".pdf"
        onChange={handleFileSelect}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />

      <div className="flex flex-col items-center gap-3">
        <div className={`p-3 rounded-full ${isDragging ? 'bg-indigo-100 dark:bg-indigo-900/30' : 'bg-slate-100 dark:bg-slate-800'}`}>
          <Upload className={`w-6 h-6 ${isDragging ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`} />
        </div>

        <div>
          <p className="font-medium text-slate-700 dark:text-slate-200">
            {label}
            {optional && <span className="text-slate-400 dark:text-slate-500 font-normal"> (opcional)</span>}
          </p>
          {description && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{description}</p>
          )}
        </div>

        <p className="text-sm text-slate-400 dark:text-slate-500">
          Arraste o PDF ou clique para selecionar
        </p>
      </div>
    </div>
  );
};

export default FileUploader;

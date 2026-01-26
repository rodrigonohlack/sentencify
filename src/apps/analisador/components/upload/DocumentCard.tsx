/**
 * @file DocumentCard.tsx
 * @description Card individual para documento na lista com drag handle
 */

import React from 'react';
import {
  FileText,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  GripVertical,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { formatFileSize } from '../../services/pdfService';
import type { DocumentFile } from '../../types';

interface DocumentCardProps {
  document: DocumentFile;
  index: number;
  total: number;
  onRemove: (id: string) => void;
  onMoveUp?: (id: string) => void;
  onMoveDown?: (id: string) => void;
  disabled?: boolean;
}

const DocumentCardComponent: React.FC<DocumentCardProps> = ({
  document,
  index,
  total,
  onRemove,
  onMoveUp,
  onMoveDown,
  disabled = false
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: document.id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1
  };

  const renderStatus = () => {
    switch (document.status) {
      case 'processing':
        return (
          <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span className="text-xs">Processando...</span>
          </div>
        );
      case 'ready':
        return (
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
            <CheckCircle className="w-3.5 h-3.5" />
            <span className="text-xs">Pronto</span>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
            <AlertCircle className="w-3.5 h-3.5" />
            <span className="text-xs truncate max-w-[150px]" title={document.error}>
              {document.error || 'Erro'}
            </span>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        flex items-center gap-3 p-3 rounded-lg border transition-colors
        bg-white dark:bg-slate-800
        ${isDragging
          ? 'border-indigo-400 dark:border-indigo-500 shadow-lg'
          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
        }
      `}
      aria-label={`${document.type === 'emenda' ? 'Emenda' : 'Contestacao'} ${index + 1}: ${document.name}`}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className={`
          p-1 rounded cursor-grab active:cursor-grabbing
          text-slate-400 hover:text-slate-600
          dark:text-slate-500 dark:hover:text-slate-300
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        disabled={disabled}
        aria-label="Arrastar para reordenar"
      >
        <GripVertical className="w-4 h-4" />
      </button>

      {/* Número de ordem */}
      <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300">
        {index + 1}
      </span>

      {/* Ícone do documento */}
      <div className="flex-shrink-0 p-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
        <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
      </div>

      {/* Nome e status */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-slate-800 dark:text-slate-200 truncate" title={document.name}>
          {document.name}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {formatFileSize(document.file.size)}
          </span>
          {renderStatus()}
        </div>
      </div>

      {/* Botões de ordenação para acessibilidade */}
      <div className="flex flex-col gap-0.5">
        <button
          onClick={() => onMoveUp?.(document.id)}
          disabled={index === 0 || disabled}
          className={`
            p-0.5 rounded transition-colors
            ${index === 0 || disabled
              ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
              : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
            }
          `}
          aria-label="Mover para cima"
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onMoveDown?.(document.id)}
          disabled={index === total - 1 || disabled}
          className={`
            p-0.5 rounded transition-colors
            ${index === total - 1 || disabled
              ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
              : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
            }
          `}
          aria-label="Mover para baixo"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Botão remover */}
      <button
        onClick={() => onRemove(document.id)}
        disabled={disabled}
        className={`
          p-1.5 rounded-lg transition-colors
          text-slate-400 hover:text-red-600 hover:bg-red-50
          dark:text-slate-500 dark:hover:text-red-400 dark:hover:bg-red-900/20
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        aria-label={`Remover ${document.name}`}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export const DocumentCard = React.memo(DocumentCardComponent);
export default DocumentCard;

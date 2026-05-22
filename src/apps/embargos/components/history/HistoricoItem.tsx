/**
 * @file HistoricoItem.tsx
 */

import React from 'react';
import { FileText, Trash2 } from 'lucide-react';
import { formatTimestampBR } from '../../utils/format-date';
import type { SavedEmbargos } from '../../types';

interface HistoricoItemProps {
  item: SavedEmbargos;
  onSelect: () => void;
  onDelete: () => void;
}

export const HistoricoItem: React.FC<HistoricoItemProps> = ({ item, onSelect, onDelete }) => {
  const numDocs = item.documents.length;
  const hasDraft = !!item.draft;

  return (
    <div className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-amber-400 dark:hover:border-amber-500 hover:bg-amber-50/30 dark:hover:bg-amber-900/10 transition-all">
      <FileText className="w-5 h-5 text-amber-500 dark:text-amber-400 mt-0.5 flex-shrink-0" />
      <button onClick={onSelect} className="flex-1 min-w-0 text-left">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
          {item.titulo}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {formatTimestampBR(item.updatedAt)} · {numDocs} {numDocs === 1 ? 'documento' : 'documentos'} · {hasDraft ? 'Minuta gerada' : 'Síntese pendente'}
        </p>
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); if (confirm('Excluir este item do histórico?')) onDelete(); }}
        className="text-slate-400 hover:text-red-500"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
};

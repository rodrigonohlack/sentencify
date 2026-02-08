import { Pause, Play, Trash2, Pencil } from 'lucide-react';
import type { RecurringExpense } from '../../types';
import { formatBRL } from '../../utils/formatters';
import { CategoryBadge } from '../expenses';

interface RecurringCardProps {
  item: RecurringExpense;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
}

export default function RecurringCard({ item, onToggle, onDelete, onEdit }: RecurringCardProps) {
  return (
    <div className={`glass-card flex items-center justify-between ${!item.is_active ? 'opacity-60' : ''}`}>
      <div className="flex items-center gap-4">
        <div className="w-11 h-11 rounded-[14px] bg-gradient-to-br from-indigo-500/15 to-violet-500/15 flex items-center justify-center text-indigo-500 font-bold text-sm">
          {item.due_day}
        </div>
        <div>
          <div className="text-sm font-semibold text-[#1e1b4b] dark:text-gray-100">{item.description}</div>
          <div className="flex items-center gap-2 mt-1">
            <CategoryBadge
              categoryId={item.category_id}
              categoryName={item.category_name}
              categoryColor={item.category_color}
            />
            <span className="text-[11px] text-[#7c7caa] dark:text-gray-400">Dia {item.due_day} de cada mês</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-lg font-bold text-[#1e1b4b] dark:text-gray-100 tabular-nums">{formatBRL(item.value_brl)}</span>
        <div className="flex items-center gap-1">
          <button onClick={() => onToggle(item.id)} className="p-2 rounded-xl hover:bg-white/50 dark:hover:bg-white/10 transition-colors" title={item.is_active ? 'Pausar' : 'Ativar'}>
            {item.is_active ? <Pause className="w-4 h-4 text-amber-500" /> : <Play className="w-4 h-4 text-emerald-500" />}
          </button>
          <button onClick={() => onEdit(item.id)} className="p-2 rounded-xl hover:bg-white/50 dark:hover:bg-white/10 transition-colors">
            <Pencil className="w-4 h-4 text-[#7c7caa] dark:text-gray-400" />
          </button>
          <button onClick={() => onDelete(item.id)} className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
            <Trash2 className="w-4 h-4 text-red-400" />
          </button>
        </div>
      </div>
    </div>
  );
}

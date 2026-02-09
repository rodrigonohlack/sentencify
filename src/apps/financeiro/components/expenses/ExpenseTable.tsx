import { Trash2, Pencil } from 'lucide-react';
import { useExpenseStore } from '../../stores/useExpenseStore';
import { formatDate, formatBRL } from '../../utils/formatters';
import CategoryBadge from './CategoryBadge';

interface ExpenseTableProps {
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onCategoryChange?: (expenseId: string, categoryId: string | null) => void;
}

export default function ExpenseTable({ onEdit, onDelete, onCategoryChange }: ExpenseTableProps) {
  const { expenses, pagination } = useExpenseStore();

  return (
    <div className="glass-card overflow-hidden p-0">
      <div className="flex items-center justify-between px-6 py-4 border-b border-indigo-500/10 dark:border-indigo-400/15">
        <h3 className="text-base font-bold text-[#1e1b4b] dark:text-gray-100 tracking-tight">Despesas</h3>
        {pagination && (
          <div className="flex items-center gap-2">
            <span className="bg-gradient-to-r from-indigo-500/10 to-violet-500/10 text-indigo-500 text-xs font-bold px-3.5 py-1.5 rounded-[10px]">
              {pagination.total} transações
            </span>
            <span className="text-xs font-bold text-[#1e1b4b] dark:text-gray-100 px-3.5 py-1.5">
              {formatBRL(pagination.total_amount)}
            </span>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-[#7c7caa] dark:text-gray-400 uppercase tracking-wider border-b border-indigo-500/8 dark:border-indigo-400/10">Data</th>
              <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-[#7c7caa] dark:text-gray-400 uppercase tracking-wider border-b border-indigo-500/8 dark:border-indigo-400/10">Descrição</th>
              <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-[#7c7caa] dark:text-gray-400 uppercase tracking-wider border-b border-indigo-500/8 dark:border-indigo-400/10">Categoria</th>
              <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-[#7c7caa] dark:text-gray-400 uppercase tracking-wider border-b border-indigo-500/8 dark:border-indigo-400/10">Cartão</th>
              <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-[#7c7caa] dark:text-gray-400 uppercase tracking-wider border-b border-indigo-500/8 dark:border-indigo-400/10">Parcela</th>
              <th className="px-6 py-3.5 text-right text-[11px] font-semibold text-[#7c7caa] dark:text-gray-400 uppercase tracking-wider border-b border-indigo-500/8 dark:border-indigo-400/10">Valor</th>
              <th className="px-6 py-3.5 text-right text-[11px] font-semibold text-[#7c7caa] dark:text-gray-400 uppercase tracking-wider border-b border-indigo-500/8 dark:border-indigo-400/10"></th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((expense) => (
              <tr key={expense.id} className={`hover:bg-indigo-500/3 transition-colors ${expense.source === 'csv_projected' ? 'border-l-2 border-l-sky-400/50' : ''}`}>
                <td className="px-6 py-3 text-[13px] dark:text-gray-200 border-b border-indigo-500/5 dark:border-white/5">
                  {formatDate(expense.purchase_date)}
                </td>
                <td className="px-6 py-3 text-[13px] font-semibold dark:text-gray-200 border-b border-indigo-500/5 dark:border-white/5">
                  {expense.description}
                </td>
                <td className="px-6 py-3 border-b border-indigo-500/5 dark:border-white/5">
                  <CategoryBadge
                    categoryId={expense.category_id}
                    categoryName={expense.category_name}
                    categoryColor={expense.category_color}
                    onCategoryChange={onCategoryChange ? (catId) => onCategoryChange(expense.id, catId) : undefined}
                  />
                </td>
                <td className="px-6 py-3 text-xs text-[#7c7caa] dark:text-gray-400 font-medium border-b border-indigo-500/5 dark:border-white/5">
                  {expense.card_last_four ? `**** ${expense.card_last_four}` : '-'}
                </td>
                <td className="px-6 py-3 text-[11px] text-[#7c7caa] dark:text-gray-400 border-b border-indigo-500/5 dark:border-white/5">
                  <span className="inline-flex items-center gap-1.5">
                    {expense.installment || 'Única'}
                    {expense.source === 'csv_projected' && (
                      <span className="text-[9px] font-bold text-sky-600 bg-sky-100/50 dark:bg-sky-500/20 px-1.5 py-0.5 rounded-full">PROJETADA</span>
                    )}
                  </span>
                </td>
                <td className={`px-6 py-3 text-right font-bold tabular-nums border-b border-indigo-500/5 dark:border-white/5 ${expense.is_refund ? 'text-emerald-600' : 'text-[#1e1b4b] dark:text-gray-200'}`}>
                  {expense.is_refund ? '- ' : ''}{formatBRL(Math.abs(expense.value_brl))}
                </td>
                <td className="px-6 py-3 text-right border-b border-indigo-500/5 dark:border-white/5">
                  <div className="flex items-center justify-end gap-1">
                    {onEdit && (
                      <button onClick={() => onEdit(expense.id)} className="p-1.5 rounded-lg hover:bg-white/50 dark:hover:bg-white/10 transition-colors">
                        <Pencil className="w-3.5 h-3.5 text-[#7c7caa] dark:text-gray-400" />
                      </button>
                    )}
                    {onDelete && (
                      <button onClick={() => onDelete(expense.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

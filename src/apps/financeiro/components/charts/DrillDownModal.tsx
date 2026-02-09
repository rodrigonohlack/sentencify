import { useState, useEffect, useCallback } from 'react';
import { List } from 'lucide-react';
import { BaseModal } from '../../../../components/modals/BaseModal';
import { apiFetch } from '../../utils/api';
import { ENDPOINTS } from '../../constants/api';
import { formatBRL, formatDate } from '../../utils/formatters';
import CategoryBadge from '../expenses/CategoryBadge';
import { Spinner } from '../ui';
import { useExpenses } from '../../hooks/useExpenses';
import { CATEGORIES } from '../../constants/categories';
import type { Expense } from '../../types';

interface DrillDownModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  filterParams: Record<string, string>;
}

export default function DrillDownModal({ isOpen, onClose, title, subtitle, filterParams }: DrillDownModalProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { editExpense } = useExpenses();

  const handleCategoryChange = useCallback(async (expenseId: string, categoryId: string | null) => {
    const cat = categoryId ? CATEGORIES.find(c => c.id === categoryId) : null;
    const updated = await editExpense(expenseId, {
      category_id: categoryId,
      category_source: 'manual',
    });
    if (updated) {
      setExpenses(prev => prev.map(e =>
        e.id === expenseId
          ? { ...e, category_id: categoryId, category_source: 'manual' as const, category_name: cat?.name, category_color: cat?.color }
          : e
      ));
    }
  }, [editExpense]);

  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);
    const params = new URLSearchParams(filterParams);
    params.set('limit', '200');
    apiFetch<{ expenses: Expense[] }>(`${ENDPOINTS.EXPENSES}?${params}`)
      .then((data) => setExpenses(data.expenses))
      .catch(() => setExpenses([]))
      .finally(() => setIsLoading(false));
  }, [isOpen, filterParams]);

  const total = expenses.reduce((sum, e) => sum + e.value_brl, 0);
  const computedSubtitle = !isLoading && expenses.length > 0
    ? `${expenses.length} despesa${expenses.length !== 1 ? 's' : ''} — Total: ${formatBRL(total)}`
    : subtitle;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle={computedSubtitle}
      icon={<List />}
      iconColor="purple"
      size="xl"
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : expenses.length === 0 ? (
        <div className="text-center py-12 text-sm text-[#7c7caa] dark:text-gray-400">
          Nenhuma despesa encontrada para este filtro.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200/50 dark:border-white/10">
                <th className="text-left py-2 px-3 text-xs font-semibold text-[#7c7caa] dark:text-gray-400 uppercase tracking-wider">Data</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-[#7c7caa] dark:text-gray-400 uppercase tracking-wider">Descrição</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-[#7c7caa] dark:text-gray-400 uppercase tracking-wider">Categoria</th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-[#7c7caa] dark:text-gray-400 uppercase tracking-wider">Valor</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense) => (
                <tr key={expense.id} className="border-b border-gray-100/50 dark:border-white/5 hover:bg-white/30 dark:hover:bg-white/5 transition-colors">
                  <td className="py-2.5 px-3 text-[#1e1b4b] dark:text-gray-200 tabular-nums whitespace-nowrap">
                    {formatDate(expense.purchase_date)}
                  </td>
                  <td className="py-2.5 px-3 text-[#1e1b4b] dark:text-gray-200 max-w-[300px] truncate">
                    {expense.description}
                  </td>
                  <td className="py-2.5 px-3">
                    <CategoryBadge
                      categoryId={expense.category_id}
                      categoryName={expense.category_name}
                      categoryColor={expense.category_color}
                      onCategoryChange={(catId) => handleCategoryChange(expense.id, catId)}
                    />
                  </td>
                  <td className={`py-2.5 px-3 text-right font-bold tabular-nums whitespace-nowrap ${
                    expense.is_refund ? 'text-emerald-600' : 'text-[#1e1b4b] dark:text-gray-200'
                  }`}>
                    {expense.is_refund ? '+' : ''}{formatBRL(expense.value_brl)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </BaseModal>
  );
}

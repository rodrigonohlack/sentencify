import { useEffect, useState } from 'react';
import { Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { useExpenseStore } from '../stores/useExpenseStore';
import { useExpenses } from '../hooks/useExpenses';
import { useCategorization } from '../hooks/useCategorization';
import { Spinner, Button, EmptyState } from '../components/ui';
import { ExpenseTable, ExpenseFilters } from '../components/expenses';
import Header from '../components/layout/Header';
import { Receipt } from 'lucide-react';

export default function ExpensesPage() {
  const { expenses, pagination, isLoading } = useExpenseStore();
  const { fetchExpenses, deleteExpense } = useExpenses();
  const { categorizeBatch, isCategorizing } = useCategorization();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handlePageChange = (page: number) => {
    fetchExpenses(page);
  };

  const handleCategorize = async () => {
    const uncategorized = expenses.filter((e) => !e.category_id).map((e) => e.id);
    const ids = selectedIds.length > 0 ? selectedIds : uncategorized;
    if (ids.length === 0) return;

    const result = await categorizeBatch(ids);
    if (result) {
      setSelectedIds([]);
      fetchExpenses(pagination?.page);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteExpense(id);
  };

  const uncategorizedCount = expenses.filter((e) => !e.category_id).length;

  return (
    <div>
      <Header
        title="Despesas"
        subtitle="Gerencie todas as suas despesas"
        actions={
          <div className="flex items-center gap-2">
            {uncategorizedCount > 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCategorize}
                isLoading={isCategorizing}
              >
                <Sparkles className="w-4 h-4" />
                Categorizar {uncategorizedCount} com IA
              </Button>
            )}
          </div>
        }
      />

      <ExpenseFilters />

      {isLoading && expenses.length === 0 ? (
        <Spinner size="lg" className="mt-20" />
      ) : expenses.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Nenhuma despesa encontrada"
          description="Importe uma fatura CSV ou adicione despesas manualmente."
        />
      ) : (
        <>
          <ExpenseTable onDelete={handleDelete} />

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-6">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="p-2 bg-white/55 backdrop-blur-lg border border-white/70 rounded-xl hover:bg-white/65 transition-all disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4 text-indigo-500" />
              </button>
              <span className="text-sm font-semibold text-[#1e1b4b]">
                {pagination.page} / {pagination.pages}
              </span>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages}
                className="p-2 bg-white/55 backdrop-blur-lg border border-white/70 rounded-xl hover:bg-white/65 transition-all disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4 text-indigo-500" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

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
  const { expenses, pagination, uncategorizedTotal, isLoading, filters } = useExpenseStore();
  const { fetchExpenses, deleteExpense } = useExpenses();
  const { categorizeBatch, categorizeAll, isCategorizing } = useCategorization();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    fetchExpenses(1);
  }, [filters]);

  const handlePageChange = (page: number) => {
    fetchExpenses(page);
  };

  const handleCategorize = async () => {
    if (selectedIds.length > 0) {
      const result = await categorizeBatch(selectedIds);
      if (result) {
        setSelectedIds([]);
        fetchExpenses(pagination?.page);
      }
    } else {
      const result = await categorizeAll();
      if (result) {
        fetchExpenses(pagination?.page);
      }
    }
  };

  const handleDelete = async (id: string) => {
    await deleteExpense(id);
  };

  return (
    <div>
      <Header
        title="Despesas"
        subtitle="Gerencie todas as suas despesas"
        actions={
          <div className="flex items-center gap-2">
            {uncategorizedTotal > 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCategorize}
                isLoading={isCategorizing}
              >
                <Sparkles className="w-4 h-4" />
                Categorizar {uncategorizedTotal} com IA
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

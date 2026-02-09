import { useEffect, useState, useCallback } from 'react';
import { Sparkles, ChevronLeft, ChevronRight, Plus, Receipt } from 'lucide-react';
import { useExpenseStore } from '../stores/useExpenseStore';
import { useExpenses } from '../hooks/useExpenses';
import { useCategorization } from '../hooks/useCategorization';
import { Spinner, Button, EmptyState, Modal } from '../components/ui';
import { ExpenseTable, ExpenseFilters, ExpenseForm } from '../components/expenses';
import Header from '../components/layout/Header';

export default function ExpensesPage() {
  const { expenses, pagination, uncategorizedTotal, isLoading, filters } = useExpenseStore();
  const { fetchExpenses, createExpense, deleteExpense, editExpense } = useExpenses();
  const { categorizeBatch, categorizeAll, isCategorizing } = useCategorization();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

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

  const handleCategoryChange = useCallback(async (expenseId: string, categoryId: string | null) => {
    await editExpense(expenseId, { category_id: categoryId, category_source: 'manual' } as any);
  }, [editExpense]);

  const handleDelete = async (id: string) => {
    await deleteExpense(id);
  };

  const handleCreateExpense = async (data: { purchase_date: string; description: string; value_brl: number; category_id: string; notes: string }) => {
    setIsCreating(true);
    const result = await createExpense({
      purchase_date: data.purchase_date,
      description: data.description,
      value_brl: data.value_brl,
      category_id: data.category_id || null,
      notes: data.notes || null,
    } as any);
    setIsCreating(false);
    if (result) {
      setShowAddModal(false);
      fetchExpenses(pagination?.page);
    }
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
            <Button size="sm" onClick={() => setShowAddModal(true)}>
              <Plus className="w-4 h-4" />
              Nova Despesa
            </Button>
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
          <ExpenseTable onDelete={handleDelete} onCategoryChange={handleCategoryChange} />

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-6">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="p-2 bg-white/55 dark:bg-white/[0.06] backdrop-blur-lg border border-white/70 dark:border-white/[0.12] rounded-xl hover:bg-white/65 dark:hover:bg-white/10 transition-all disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4 text-indigo-500" />
              </button>
              <span className="text-sm font-semibold text-[#1e1b4b] dark:text-gray-100">
                {pagination.page} / {pagination.pages}
              </span>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages}
                className="p-2 bg-white/55 dark:bg-white/[0.06] backdrop-blur-lg border border-white/70 dark:border-white/[0.12] rounded-xl hover:bg-white/65 dark:hover:bg-white/10 transition-all disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4 text-indigo-500" />
              </button>
            </div>
          )}
        </>
      )}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Nova Despesa" size="sm">
        <ExpenseForm onSubmit={handleCreateExpense} isLoading={isCreating} />
      </Modal>
    </div>
  );
}

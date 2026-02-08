import { useCallback } from 'react';
import { useExpenseStore } from '../stores/useExpenseStore';
import { useUIStore } from '../stores/useUIStore';
import { apiFetch } from '../utils/api';
import { ENDPOINTS } from '../constants/api';
import type { Expense, Pagination } from '../types';

export function useExpenses() {
  const { setExpenses, setLoading, updateExpense, removeExpense, filters } = useExpenseStore();
  const addToast = useUIStore((s) => s.addToast);

  const fetchExpenses = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      if (filters.month) params.set('month', filters.month);
      if (filters.category) params.set('category', filters.category);
      if (filters.holder) params.set('holder', filters.holder);
      if (filters.card) params.set('card', filters.card);
      if (filters.source) params.set('source', filters.source);
      if (filters.search) params.set('search', filters.search);

      const data = await apiFetch<{ expenses: Expense[]; pagination: Pagination; uncategorized_total: number }>(
        `${ENDPOINTS.EXPENSES}?${params}`
      );
      setExpenses(data.expenses, data.pagination, data.uncategorized_total);
    } catch {
      addToast('Erro ao carregar despesas', 'error');
    } finally {
      setLoading(false);
    }
  }, [filters, setExpenses, setLoading, addToast]);

  const createExpense = useCallback(async (data: Partial<Expense>) => {
    try {
      const result = await apiFetch<{ expense: Expense }>(ENDPOINTS.EXPENSES, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      addToast('Despesa criada com sucesso', 'success');
      return result.expense;
    } catch {
      addToast('Erro ao criar despesa', 'error');
    }
  }, [addToast]);

  const editExpense = useCallback(async (id: string, data: Partial<Expense>) => {
    try {
      const result = await apiFetch<{ expense: Expense }>(`${ENDPOINTS.EXPENSES}/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      updateExpense(id, result.expense);
      addToast('Despesa atualizada', 'success');
      return result.expense;
    } catch {
      addToast('Erro ao atualizar despesa', 'error');
    }
  }, [updateExpense, addToast]);

  const deleteExpense = useCallback(async (id: string) => {
    try {
      await apiFetch(`${ENDPOINTS.EXPENSES}/${id}`, { method: 'DELETE' });
      removeExpense(id);
      addToast('Despesa removida', 'success');
    } catch {
      addToast('Erro ao remover despesa', 'error');
    }
  }, [removeExpense, addToast]);

  const bulkUpdateCategory = useCallback(async (updates: Array<{ id: string; category_id: string; category_source?: string }>) => {
    try {
      const result = await apiFetch<{ updated: number }>(ENDPOINTS.EXPENSES_BULK_CATEGORY, {
        method: 'POST',
        body: JSON.stringify({ updates }),
      });
      addToast(`${result.updated} categorias atualizadas`, 'success');
      return result;
    } catch {
      addToast('Erro ao atualizar categorias', 'error');
    }
  }, [addToast]);

  return { fetchExpenses, createExpense, editExpense, deleteExpense, bulkUpdateCategory };
}

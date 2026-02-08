import { create } from 'zustand';
import type { Expense, Pagination } from '../types';

interface ExpenseState {
  expenses: Expense[];
  pagination: Pagination | null;
  uncategorizedTotal: number;
  isLoading: boolean;
  filters: {
    month?: string;
    category?: string;
    holder?: string;
    card?: string;
    source?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
  };
  setExpenses: (expenses: Expense[], pagination: Pagination, uncategorizedTotal?: number) => void;
  setFilters: (filters: Partial<ExpenseState['filters']>) => void;
  setLoading: (loading: boolean) => void;
  updateExpense: (id: string, data: Partial<Expense>) => void;
  removeExpense: (id: string) => void;
}

export const useExpenseStore = create<ExpenseState>((set) => ({
  expenses: [],
  pagination: null,
  uncategorizedTotal: 0,
  isLoading: false,
  filters: {},

  setExpenses: (expenses, pagination, uncategorizedTotal) => set({
    expenses,
    pagination,
    ...(uncategorizedTotal !== undefined ? { uncategorizedTotal } : {}),
  }),
  setFilters: (filters) => set((s) => ({ filters: { ...s.filters, ...filters } })),
  setLoading: (isLoading) => set({ isLoading }),

  updateExpense: (id, data) =>
    set((s) => ({
      expenses: s.expenses.map((e) => (e.id === id ? { ...e, ...data } : e)),
    })),

  removeExpense: (id) =>
    set((s) => ({
      expenses: s.expenses.filter((e) => e.id !== id),
    })),
}));

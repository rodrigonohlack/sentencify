import { create } from 'zustand';
import type { Expense, Pagination } from '../types';

interface ExpenseState {
  expenses: Expense[];
  pagination: Pagination | null;
  isLoading: boolean;
  filters: {
    month?: string;
    category?: string;
    holder?: string;
    card?: string;
    source?: string;
    search?: string;
  };
  setExpenses: (expenses: Expense[], pagination: Pagination) => void;
  setFilters: (filters: Partial<ExpenseState['filters']>) => void;
  setLoading: (loading: boolean) => void;
  updateExpense: (id: string, data: Partial<Expense>) => void;
  removeExpense: (id: string) => void;
}

export const useExpenseStore = create<ExpenseState>((set) => ({
  expenses: [],
  pagination: null,
  isLoading: false,
  filters: {},

  setExpenses: (expenses, pagination) => set({ expenses, pagination }),
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

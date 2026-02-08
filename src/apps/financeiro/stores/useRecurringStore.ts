import { create } from 'zustand';
import type { RecurringExpense, Reminder } from '../types';

interface RecurringState {
  recurring: RecurringExpense[];
  reminders: Reminder[];
  isLoading: boolean;
  setRecurring: (recurring: RecurringExpense[]) => void;
  setReminders: (reminders: Reminder[]) => void;
  setLoading: (loading: boolean) => void;
}

export const useRecurringStore = create<RecurringState>((set) => ({
  recurring: [],
  reminders: [],
  isLoading: false,

  setRecurring: (recurring) => set({ recurring }),
  setReminders: (reminders) => set({ reminders }),
  setLoading: (isLoading) => set({ isLoading }),
}));

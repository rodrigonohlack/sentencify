import { create } from 'zustand';
import type { DashboardSummary, CategoryBreakdown, HolderBreakdown, TrendPoint } from '../types';

interface DashboardState {
  selectedMonth: string;
  summary: DashboardSummary | null;
  categoryData: CategoryBreakdown[];
  holderData: HolderBreakdown[];
  trends: TrendPoint[];
  isLoading: boolean;
  setMonth: (month: string) => void;
  setSummary: (summary: DashboardSummary) => void;
  setCategoryData: (data: CategoryBreakdown[]) => void;
  setHolderData: (data: HolderBreakdown[]) => void;
  setTrends: (trends: TrendPoint[]) => void;
  setLoading: (loading: boolean) => void;
}

const now = new Date();
const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

export const useDashboardStore = create<DashboardState>((set) => ({
  selectedMonth: currentMonth,
  summary: null,
  categoryData: [],
  holderData: [],
  trends: [],
  isLoading: false,

  setMonth: (selectedMonth) => set({ selectedMonth }),
  setSummary: (summary) => set({ summary }),
  setCategoryData: (categoryData) => set({ categoryData }),
  setHolderData: (holderData) => set({ holderData }),
  setTrends: (trends) => set({ trends }),
  setLoading: (isLoading) => set({ isLoading }),
}));

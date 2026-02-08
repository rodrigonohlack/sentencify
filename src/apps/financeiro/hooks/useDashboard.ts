import { useCallback } from 'react';
import { useDashboardStore } from '../stores/useDashboardStore';
import { useUIStore } from '../stores/useUIStore';
import { apiFetch } from '../utils/api';
import { ENDPOINTS } from '../constants/api';
import { offsetMonth } from '../utils/formatters';
import type { DashboardSummary, CategoryBreakdown, HolderBreakdown, TrendPoint } from '../types';

export function useDashboard() {
  const { selectedMonth, setMonth, setSummary, setCategoryData, setHolderData, setTrends, setLoading } = useDashboardStore();
  const addToast = useUIStore((s) => s.addToast);

  const fetchAll = useCallback(async (month?: string) => {
    const m = month || selectedMonth;
    setLoading(true);
    try {
      const fromMonth = offsetMonth(m, -5);

      const [summary, categories, holders, trends] = await Promise.all([
        apiFetch<DashboardSummary>(`${ENDPOINTS.DASHBOARD_SUMMARY}?month=${m}`),
        apiFetch<{ categories: CategoryBreakdown[] }>(`${ENDPOINTS.DASHBOARD_BY_CATEGORY}?month=${m}`),
        apiFetch<{ holders: HolderBreakdown[] }>(`${ENDPOINTS.DASHBOARD_BY_HOLDER}?month=${m}`),
        apiFetch<{ trends: TrendPoint[] }>(`${ENDPOINTS.DASHBOARD_TRENDS}?from=${fromMonth}&to=${m}`),
      ]);

      setSummary(summary);
      setCategoryData(categories.categories);
      setHolderData(holders.holders);
      setTrends(trends.trends);
    } catch {
      addToast('Erro ao carregar dashboard', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, setLoading, setSummary, setCategoryData, setHolderData, setTrends, addToast]);

  const changeMonth = useCallback((month: string) => {
    setMonth(month);
  }, [setMonth]);

  return { fetchAll, changeMonth };
}

import { useEffect, useState, useCallback, useMemo } from 'react';
import { TrendingDown, TrendingUp, DollarSign, Receipt, ArrowUpRight } from 'lucide-react';
import { useDashboardStore } from '../stores/useDashboardStore';
import { useDashboard } from '../hooks/useDashboard';
import { useRecurring } from '../hooks/useRecurring';
import { formatBRL, formatPercent, formatMonthLabel, offsetMonth } from '../utils/formatters';
import { Spinner } from '../components/ui';
import Header from '../components/layout/Header';
import MonthlyBarChart from '../components/charts/MonthlyBarChart';
import CategoryPieChart from '../components/charts/CategoryPieChart';
import TrendLineChart from '../components/charts/TrendLineChart';
import HolderBreakdown from '../components/charts/HolderBreakdown';
import DrillDownModal from '../components/charts/DrillDownModal';

interface DrillDownState {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  filterParams: Record<string, string>;
}

export default function DashboardPage() {
  const { selectedMonth, summary, categoryData, holderData, trends, isLoading } = useDashboardStore();
  const { fetchAll, changeMonth } = useDashboard();
  const { fetchReminders } = useRecurring();

  useEffect(() => {
    fetchAll();
    fetchReminders();
  }, [selectedMonth]);

  const handlePrev = () => changeMonth(offsetMonth(selectedMonth, -1));
  const handleNext = () => changeMonth(offsetMonth(selectedMonth, 1));

  const [drillDown, setDrillDown] = useState<DrillDownState | null>(null);

  const closeDrillDown = useCallback(() => setDrillDown(null), []);

  const handleCategoryClick = useCallback((categoryId: string, categoryName: string) => {
    setDrillDown({
      isOpen: true,
      title: `Despesas — ${categoryName}`,
      filterParams: { category: categoryId, month: selectedMonth },
    });
  }, [selectedMonth]);

  const handleMonthClick = useCallback((month: string) => {
    setDrillDown({
      isOpen: true,
      title: `Despesas — ${formatMonthLabel(month)}`,
      filterParams: { month },
    });
  }, []);

  const handleHolderClick = useCallback((holder: string) => {
    const displayName = holder?.split(' ').slice(0, 2).join(' ') || 'Desconhecido';
    setDrillDown({
      isOpen: true,
      title: `Despesas — ${displayName}`,
      filterParams: { holder, month: selectedMonth },
    });
  }, [selectedMonth]);

  const drillDownFilterParams = useMemo(() => drillDown?.filterParams ?? {}, [drillDown?.filterParams]);

  if (isLoading && !summary) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <Header
        title="Dashboard"
        subtitle="Visão geral das suas despesas"
        month={selectedMonth}
        onPrevMonth={handlePrev}
        onNextMonth={handleNext}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        <div className="glass-card animate-slide-up" style={{ animationDelay: '0s' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-[12px] bg-gradient-to-br from-indigo-500/15 to-violet-500/15 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-indigo-500" />
            </div>
            <span className="text-xs font-semibold text-[#7c7caa] dark:text-gray-400 uppercase tracking-wider">Total do mês</span>
          </div>
          <div className="text-2xl font-extrabold text-[#1e1b4b] dark:text-gray-100 tracking-tight">
            {formatBRL(summary?.net_total || 0)}
          </div>
        </div>

        <div className="glass-card animate-slide-up" style={{ animationDelay: '0.08s' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 rounded-[12px] flex items-center justify-center ${
              (summary?.change_percent || 0) <= 0
                ? 'bg-emerald-500/15'
                : 'bg-red-500/15'
            }`}>
              {(summary?.change_percent || 0) <= 0
                ? <TrendingDown className="w-5 h-5 text-emerald-600" />
                : <TrendingUp className="w-5 h-5 text-red-500" />
              }
            </div>
            <span className="text-xs font-semibold text-[#7c7caa] dark:text-gray-400 uppercase tracking-wider">vs mês anterior</span>
          </div>
          <div className={`text-2xl font-extrabold tracking-tight ${
            (summary?.change_percent || 0) <= 0 ? 'text-emerald-600' : 'text-red-500'
          }`}>
            {formatPercent(summary?.change_percent || 0)}
          </div>
        </div>

        <div className="glass-card animate-slide-up" style={{ animationDelay: '0.16s' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-[12px] bg-gradient-to-br from-violet-500/15 to-pink-500/15 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-violet-500" />
            </div>
            <span className="text-xs font-semibold text-[#7c7caa] dark:text-gray-400 uppercase tracking-wider">Transações</span>
          </div>
          <div className="text-2xl font-extrabold text-[#1e1b4b] dark:text-gray-100 tracking-tight">
            {summary?.transaction_count || 0}
          </div>
        </div>

        <div className="glass-card animate-slide-up" style={{ animationDelay: '0.24s' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-[12px] bg-gradient-to-br from-amber-500/15 to-orange-500/15 flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5 text-amber-500" />
            </div>
            <span className="text-xs font-semibold text-[#7c7caa] dark:text-gray-400 uppercase tracking-wider">Maior despesa</span>
          </div>
          <div className="text-2xl font-extrabold text-[#1e1b4b] dark:text-gray-100 tracking-tight">
            {formatBRL(summary?.max_expense || 0)}
          </div>
          {summary?.max_expense_description && (
            <p className="text-[11px] text-[#7c7caa] dark:text-gray-400 mt-1 truncate">{summary.max_expense_description}</p>
          )}
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
        <MonthlyBarChart data={trends} selectedMonth={selectedMonth} onMonthClick={handleMonthClick} />
        <CategoryPieChart data={categoryData} onCategoryClick={handleCategoryClick} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <TrendLineChart data={trends} />
        <HolderBreakdown data={holderData} onHolderClick={handleHolderClick} />
      </div>

      <DrillDownModal
        isOpen={drillDown?.isOpen ?? false}
        onClose={closeDrillDown}
        title={drillDown?.title ?? ''}
        subtitle={drillDown?.subtitle}
        filterParams={drillDownFilterParams}
      />
    </div>
  );
}

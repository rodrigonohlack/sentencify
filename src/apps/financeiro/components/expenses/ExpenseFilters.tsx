import { useState } from 'react';
import { Search, Calendar } from 'lucide-react';
import { useExpenseStore } from '../../stores/useExpenseStore';
import { CATEGORIES } from '../../constants/categories';
import { getCurrentMonth, offsetMonth, formatMonthLabel } from '../../utils/formatters';

type DateMode = 'all' | 'month' | 'range';

function generateMonthOptions(): Array<{ value: string; label: string }> {
  const current = getCurrentMonth();
  const months: Array<{ value: string; label: string }> = [];
  for (let i = 0; i < 12; i++) {
    const m = offsetMonth(current, -i);
    months.push({ value: m, label: formatMonthLabel(m) });
  }
  return months;
}

export default function ExpenseFilters() {
  const { filters, setFilters } = useExpenseStore();
  const [dateMode, setDateMode] = useState<DateMode>('all');

  const handleDateModeChange = (mode: DateMode) => {
    setDateMode(mode);
    // Clear date filters when switching modes
    setFilters({ dateFrom: undefined, dateTo: undefined });
  };

  const handleMonthSelect = (month: string) => {
    if (!month) {
      setFilters({ dateFrom: undefined, dateTo: undefined });
      return;
    }
    // First day of month
    const dateFrom = `${month}-01`;
    // Last day of month
    const [y, m] = month.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    const dateTo = `${month}-${String(lastDay).padStart(2, '0')}`;
    setFilters({ dateFrom, dateTo });
  };

  const monthOptions = generateMonthOptions();

  return (
    <div className="glass-card p-4 mb-4 flex flex-wrap items-center gap-3">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7c7caa] dark:text-gray-400" />
        <input
          type="text"
          placeholder="Buscar descrição..."
          value={filters.search || ''}
          onChange={(e) => setFilters({ search: e.target.value || undefined })}
          className="w-full pl-10 pr-4 py-2 bg-white/40 dark:bg-white/5 border border-white/60 dark:border-white/10 rounded-xl text-sm text-[#1e1b4b] dark:text-gray-200 placeholder:text-[#7c7caa]/50 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
      </div>

      {/* Category filter */}
      <select
        value={filters.category || ''}
        onChange={(e) => setFilters({ category: e.target.value || undefined })}
        className="bg-white/40 dark:bg-white/5 border border-white/60 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-[#1e1b4b] dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
      >
        <option value="">Todas categorias</option>
        {CATEGORIES.map((cat) => (
          <option key={cat.id} value={cat.id}>{cat.name}</option>
        ))}
      </select>

      {/* Source filter */}
      <select
        value={filters.source || ''}
        onChange={(e) => setFilters({ source: e.target.value || undefined })}
        className="bg-white/40 dark:bg-white/5 border border-white/60 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-[#1e1b4b] dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
      >
        <option value="">Todas fontes</option>
        <option value="csv">CSV</option>
        <option value="manual">Manual</option>
        <option value="recurring">Recorrente</option>
        <option value="csv_projected">Projetada</option>
      </select>

      {/* Date filter mode */}
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-[#7c7caa] dark:text-gray-400" />
        <select
          value={dateMode}
          onChange={(e) => handleDateModeChange(e.target.value as DateMode)}
          className="bg-white/40 dark:bg-white/5 border border-white/60 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-[#1e1b4b] dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          <option value="all">Todas as datas</option>
          <option value="month">Por mês</option>
          <option value="range">Por período</option>
        </select>
      </div>

      {/* Month selector */}
      {dateMode === 'month' && (
        <select
          onChange={(e) => handleMonthSelect(e.target.value)}
          className="bg-white/40 dark:bg-white/5 border border-white/60 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-[#1e1b4b] dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          <option value="">Selecione o mês</option>
          {monthOptions.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      )}

      {/* Date range inputs */}
      {dateMode === 'range' && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={filters.dateFrom || ''}
            onChange={(e) => setFilters({ dateFrom: e.target.value || undefined })}
            className="bg-white/40 dark:bg-white/5 border border-white/60 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-[#1e1b4b] dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            placeholder="De"
          />
          <span className="text-xs text-[#7c7caa] dark:text-gray-400">até</span>
          <input
            type="date"
            value={filters.dateTo || ''}
            onChange={(e) => setFilters({ dateTo: e.target.value || undefined })}
            className="bg-white/40 dark:bg-white/5 border border-white/60 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-[#1e1b4b] dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            placeholder="Até"
          />
        </div>
      )}
    </div>
  );
}

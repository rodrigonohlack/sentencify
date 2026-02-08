import { Search } from 'lucide-react';
import { useExpenseStore } from '../../stores/useExpenseStore';
import { CATEGORIES } from '../../constants/categories';

export default function ExpenseFilters() {
  const { filters, setFilters } = useExpenseStore();

  return (
    <div className="glass-card p-4 mb-4 flex flex-wrap items-center gap-3">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7c7caa]" />
        <input
          type="text"
          placeholder="Buscar descrição..."
          value={filters.search || ''}
          onChange={(e) => setFilters({ search: e.target.value || undefined })}
          className="w-full pl-10 pr-4 py-2 bg-white/40 border border-white/60 rounded-xl text-sm text-[#1e1b4b] placeholder:text-[#7c7caa]/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
      </div>

      {/* Category filter */}
      <select
        value={filters.category || ''}
        onChange={(e) => setFilters({ category: e.target.value || undefined })}
        className="bg-white/40 border border-white/60 rounded-xl px-3 py-2 text-sm text-[#1e1b4b] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
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
        className="bg-white/40 border border-white/60 rounded-xl px-3 py-2 text-sm text-[#1e1b4b] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
      >
        <option value="">Todas fontes</option>
        <option value="csv">CSV</option>
        <option value="manual">Manual</option>
        <option value="recurring">Recorrente</option>
      </select>
    </div>
  );
}

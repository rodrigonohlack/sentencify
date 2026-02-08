import { LayoutDashboard, List, FilePlus2, Repeat, Settings, LogOut, LayoutGrid } from 'lucide-react';
import { useRecurringStore } from '../../stores/useRecurringStore';
import { useUIStore } from '../../stores/useUIStore';
import { useLoginGate } from '../auth/LoginGate';
import { AppSwitcher } from '../../../../components/shared/AppSwitcher';
import type { FinPage } from '../../types';

const navItems: Array<{ page: FinPage; icon: typeof LayoutDashboard; label: string }> = [
  { page: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { page: 'expenses', icon: List, label: 'Despesas' },
  { page: 'import', icon: FilePlus2, label: 'Importar CSV' },
  { page: 'recurring', icon: Repeat, label: 'Recorrentes' },
  { page: 'settings', icon: Settings, label: 'Configurações' },
];

export default function Sidebar() {
  const { userEmail, logout } = useLoginGate();
  const reminders = useRecurringStore((s) => s.reminders);
  const currentPage = useUIStore((s) => s.currentPage);
  const setCurrentPage = useUIStore((s) => s.setCurrentPage);

  const initials = userEmail
    ? userEmail.split('@')[0].slice(0, 2).toUpperCase()
    : '??';

  return (
    <aside className="fixed top-4 left-4 bottom-4 w-[260px] bg-[rgba(255,255,255,0.25)] dark:bg-[rgba(30,41,59,0.4)] backdrop-blur-[24px] border border-white/70 dark:border-white/[0.08] rounded-[24px] flex flex-col z-50 overflow-hidden">
      {/* Brand */}
      <div className="px-6 pt-7 pb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold gradient-text">Financeiro</h1>
          <span className="text-xs text-[#7c7caa] dark:text-gray-400 font-normal block mt-0.5">Gestão de Despesas</span>
        </div>
        <AppSwitcher
          currentApp="financeiro"
          className="flex items-center gap-1 px-2 py-1.5 text-sm text-[#7c7caa] dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors rounded-lg hover:bg-white/40 dark:hover:bg-white/10"
        >
          <LayoutGrid className="w-4 h-4" />
        </AppSwitcher>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2">
        {navItems.map(({ page, icon: Icon, label }) => (
          <button
            key={page}
            onClick={() => setCurrentPage(page)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-[14px] text-sm font-medium mb-1 transition-all duration-250 ${
              currentPage === page
                ? 'bg-gradient-to-r from-[rgba(99,102,241,0.85)] to-[rgba(139,92,246,0.85)] text-white shadow-[0_8px_24px_rgba(99,102,241,0.3)]'
                : 'text-[#7c7caa] dark:text-gray-400 hover:bg-white/40 dark:hover:bg-white/10 hover:text-[#1e1b4b] dark:hover:text-gray-100'
            }`}
          >
            <Icon className="w-5 h-5" />
            {label}
            {page === 'recurring' && reminders.length > 0 && (
              <span className="ml-auto bg-amber-400/20 text-amber-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {reminders.length}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-white/30 dark:border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="w-[38px] h-[38px] rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold text-sm shadow-[0_4px_12px_rgba(99,102,241,0.3)]">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold text-[#1e1b4b] dark:text-gray-100 truncate">
              {userEmail?.split('@')[0]}
            </div>
            <div className="text-[11px] text-[#7c7caa] dark:text-gray-400 truncate">{userEmail}</div>
          </div>
          <button
            onClick={logout}
            className="p-2 rounded-xl hover:bg-white/40 dark:hover:bg-white/10 transition-colors"
            title="Sair"
          >
            <LogOut className="w-4 h-4 text-[#7c7caa] dark:text-gray-400" />
          </button>
        </div>
      </div>
    </aside>
  );
}

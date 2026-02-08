import { Calendar, ChevronLeft, ChevronRight, ChevronDown, Bell } from 'lucide-react';
import { useRecurringStore } from '../../stores/useRecurringStore';
import { formatMonthLabel } from '../../utils/formatters';

interface HeaderProps {
  title: string;
  subtitle?: string;
  month?: string;
  onPrevMonth?: () => void;
  onNextMonth?: () => void;
  actions?: React.ReactNode;
}

export default function Header({ title, subtitle, month, onPrevMonth, onNextMonth, actions }: HeaderProps) {
  const reminders = useRecurringStore((s) => s.reminders);

  return (
    <header className="flex items-center justify-between mb-6 px-1">
      <div>
        <h2 className="text-[28px] font-extrabold tracking-tight gradient-text">{title}</h2>
        {subtitle && <p className="text-sm text-[#7c7caa] dark:text-gray-400 font-normal mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {reminders.length > 0 && (
          <div className="relative">
            <button className="p-2.5 bg-white/55 dark:bg-white/[0.06] backdrop-blur-lg border border-white/70 dark:border-white/[0.12] rounded-[14px] hover:bg-white/65 dark:hover:bg-white/10 transition-all">
              <Bell className="w-5 h-5 text-amber-500" />
            </button>
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-400 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {reminders.length}
            </span>
          </div>
        )}

        {month && (
          <div className="flex items-center gap-1">
            <button
              onClick={onPrevMonth}
              className="p-2 bg-white/55 dark:bg-white/[0.06] backdrop-blur-lg border border-white/70 dark:border-white/[0.12] rounded-xl hover:bg-white/65 dark:hover:bg-white/10 transition-all"
            >
              <ChevronLeft className="w-4 h-4 text-indigo-500" />
            </button>
            <button className="flex items-center gap-2.5 bg-white/55 dark:bg-white/[0.06] backdrop-blur-lg border border-white/70 dark:border-white/[0.12] rounded-[14px] px-5 py-2.5 font-semibold text-sm text-[#1e1b4b] dark:text-gray-100 hover:bg-white/65 dark:hover:bg-white/10 transition-all">
              <Calendar className="w-[18px] h-[18px] text-indigo-500" />
              {formatMonthLabel(month)}
              <ChevronDown className="w-3.5 h-3.5 text-[#7c7caa] dark:text-gray-400" />
            </button>
            <button
              onClick={onNextMonth}
              className="p-2 bg-white/55 dark:bg-white/[0.06] backdrop-blur-lg border border-white/70 dark:border-white/[0.12] rounded-xl hover:bg-white/65 dark:hover:bg-white/10 transition-all"
            >
              <ChevronRight className="w-4 h-4 text-indigo-500" />
            </button>
          </div>
        )}

        {actions}
      </div>
    </header>
  );
}

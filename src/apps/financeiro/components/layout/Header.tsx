import { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, ChevronDown, Bell, icons } from 'lucide-react';
import { useRecurringStore } from '../../stores/useRecurringStore';
import { formatMonthLabel, formatBRL } from '../../utils/formatters';

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
  const [showReminders, setShowReminders] = useState(false);
  const remindersRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showReminders) return;
    function handleClickOutside(e: MouseEvent) {
      if (remindersRef.current && !remindersRef.current.contains(e.target as Node)) {
        setShowReminders(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showReminders]);

  return (
    <header className="flex items-center justify-between mb-6 px-1">
      <div>
        <h2 className="text-[28px] font-extrabold tracking-tight gradient-text">{title}</h2>
        {subtitle && <p className="text-sm text-[#7c7caa] dark:text-gray-400 font-normal mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {reminders.length > 0 && (
          <div className="relative" ref={remindersRef}>
            <button
              onClick={() => setShowReminders((v) => !v)}
              className="p-2.5 bg-white/55 dark:bg-white/[0.06] backdrop-blur-lg border border-white/70 dark:border-white/[0.12] rounded-[14px] hover:bg-white/65 dark:hover:bg-white/10 transition-all"
            >
              <Bell className="w-5 h-5 text-amber-500" />
            </button>
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-400 text-white text-[10px] font-bold rounded-full flex items-center justify-center pointer-events-none">
              {reminders.length}
            </span>

            {showReminders && (
              <div className="absolute right-0 top-full mt-2 w-80 z-50 glass-card rounded-2xl border border-white/70 dark:border-white/[0.12] shadow-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-white/30 dark:border-white/[0.08]">
                  <h3 className="text-sm font-bold text-[#1e1b4b] dark:text-gray-100">Lembretes</h3>
                  <p className="text-xs text-[#7c7caa] dark:text-gray-400">{reminders.length} conta{reminders.length !== 1 ? 's' : ''} próxima{reminders.length !== 1 ? 's' : ''} do vencimento</p>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {reminders.map((r) => (
                    <div key={r.id} className="px-4 py-3 border-b border-white/20 dark:border-white/[0.06] last:border-b-0 hover:bg-white/30 dark:hover:bg-white/[0.04] transition-colors">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {(() => {
                            const Icon = r.category_icon ? icons[r.category_icon as keyof typeof icons] : null;
                            return Icon ? <Icon className="w-4 h-4 flex-shrink-0" style={{ color: r.category_color || '#7c7caa' }} /> : null;
                          })()}
                          <span className="text-sm font-medium text-[#1e1b4b] dark:text-gray-100 truncate">{r.description}</span>
                        </div>
                        <span className="text-sm font-semibold text-[#1e1b4b] dark:text-gray-100 flex-shrink-0">{formatBRL(r.value_brl)}</span>
                      </div>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-xs text-[#7c7caa] dark:text-gray-400">Vence dia {r.due_day}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          r.days_until < 0
                            ? 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400'
                            : r.days_until === 0
                              ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400'
                              : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
                        }`}>
                          {r.days_until < 0 ? 'atrasado' : r.days_until === 0 ? 'hoje' : `em ${r.days_until} dia${r.days_until !== 1 ? 's' : ''}`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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

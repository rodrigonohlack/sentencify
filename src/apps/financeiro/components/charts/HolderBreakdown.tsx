import type { HolderBreakdown as HolderData } from '../../types';
import { formatBRL } from '../../utils/formatters';
import { CreditCard } from 'lucide-react';

interface HolderBreakdownProps {
  data: HolderData[];
  onHolderClick?: (holder: string) => void;
}

const HOLDER_COLORS = ['#6366f1', '#a855f7', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];

export default function HolderBreakdown({ data, onHolderClick }: HolderBreakdownProps) {
  const total = data.reduce((sum, d) => sum + d.total, 0);

  return (
    <div className="glass-card">
      <h3 className="text-base font-bold text-[#1e1b4b] dark:text-gray-100 tracking-tight mb-5">Por Titular / Cartão</h3>

      {data.length === 0 ? (
        <p className="text-sm text-[#7c7caa] dark:text-gray-400 text-center py-8">Sem dados disponíveis</p>
      ) : (
        <div className="flex flex-col gap-3">
          {data.map((holder, i) => {
            const percent = total > 0 ? (holder.total / total) * 100 : 0;
            const color = HOLDER_COLORS[i % HOLDER_COLORS.length];

            return (
              <div
                key={`${holder.card_holder}-${holder.card_last_four}`}
                onClick={() => onHolderClick?.(holder.card_holder)}
                className={onHolderClick ? 'cursor-pointer hover:bg-white/30 dark:hover:bg-white/5 rounded-lg p-1 -m-1 transition-colors' : ''}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4" style={{ color }} />
                    <span className="text-sm font-semibold text-[#1e1b4b] dark:text-gray-100">
                      {holder.card_holder?.split(' ').slice(0, 2).join(' ') || 'Desconhecido'}
                    </span>
                    <span className="text-[11px] text-[#7c7caa] dark:text-gray-400">**** {holder.card_last_four}</span>
                  </div>
                  <span className="text-sm font-bold text-[#1e1b4b] dark:text-gray-100 tabular-nums">{formatBRL(holder.total)}</span>
                </div>
                <div className="h-2 bg-white/40 dark:bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${percent}%`, background: color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import type { CategoryBreakdown } from '../../types';
import { formatBRL, formatBRLCompact } from '../../utils/formatters';

interface CategoryPieChartProps {
  data: CategoryBreakdown[];
}

export default function CategoryPieChart({ data }: CategoryPieChartProps) {
  const total = data.reduce((sum, d) => sum + d.total, 0);
  const chartData = data.filter((d) => d.total > 0).slice(0, 8);

  return (
    <div className="glass-card">
      <h3 className="text-base font-bold text-[#1e1b4b] tracking-tight mb-5">Por Categoria</h3>
      <div className="flex items-center gap-6 min-w-0">
        <div className="w-[170px] h-[170px] flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="total"
                cx="50%"
                cy="50%"
                innerRadius={42}
                outerRadius={80}
                paddingAngle={2}
                animationDuration={600}
              >
                {chartData.map((entry, index) => (
                  <Cell key={index} fill={entry.category_color || '#94a3b8'} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => [formatBRL(Number(value ?? 0)), '']}
                contentStyle={{
                  background: 'rgba(255,255,255,0.9)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid rgba(255,255,255,0.7)',
                  borderRadius: '14px',
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex flex-col gap-1.5 flex-1">
          {chartData.map((cat) => (
            <div key={cat.category_id} className="flex items-center gap-2 text-xs text-[#7c7caa] font-medium">
              <span className="w-2.5 h-2.5 rounded flex-shrink-0" style={{ background: cat.category_color }} />
              <span className="truncate">{cat.category_name || 'Sem categoria'}</span>
              <span className="ml-auto font-bold text-[#1e1b4b] tabular-nums">{formatBRLCompact(cat.total)}</span>
            </div>
          ))}
          {total > 0 && (
            <div className="mt-2 pt-2 border-t border-indigo-500/10 text-xs font-bold text-[#1e1b4b]">
              Total: {formatBRLCompact(total)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

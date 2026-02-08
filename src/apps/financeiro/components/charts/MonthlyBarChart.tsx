import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { TrendPoint } from '../../types';
import { formatBRLCompact, formatMonthShort } from '../../utils/formatters';

interface MonthlyBarChartProps {
  data: TrendPoint[];
  selectedMonth: string;
}

export default function MonthlyBarChart({ data, selectedMonth }: MonthlyBarChartProps) {
  const chartData = data.map((d) => ({
    ...d,
    label: formatMonthShort(d.month),
    isSelected: d.month === selectedMonth,
  }));

  return (
    <div className="glass-card">
      <h3 className="text-base font-bold text-[#1e1b4b] tracking-tight mb-5">Evolucao Mensal</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} barCategoryGap="20%">
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#7c7caa', fontSize: 11, fontWeight: 500 }}
          />
          <YAxis hide />
          <Tooltip
            formatter={(value) => [formatBRLCompact(Number(value ?? 0)), 'Total']}
            contentStyle={{
              background: 'rgba(255,255,255,0.9)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,255,255,0.7)',
              borderRadius: '14px',
              boxShadow: '0 8px 32px rgba(99,102,241,0.1)',
              fontSize: '13px',
              fontWeight: 600,
            }}
          />
          <Bar dataKey="total" radius={[12, 12, 6, 6]} animationDuration={700}>
            {chartData.map((entry, index) => (
              <Cell
                key={index}
                fill={entry.isSelected ? 'url(#barGradientActive)' : 'url(#barGradient)'}
              />
            ))}
          </Bar>
          <defs>
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a5b4fc" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>
            <linearGradient id="barGradientActive" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#818cf8" />
              <stop offset="100%" stopColor="#4f46e5" />
            </linearGradient>
          </defs>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

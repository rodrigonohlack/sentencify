import { XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import type { TrendPoint } from '../../types';
import { formatBRLCompact, formatMonthShort } from '../../utils/formatters';

interface TrendLineChartProps {
  data: TrendPoint[];
}

export default function TrendLineChart({ data }: TrendLineChartProps) {
  if (data.length === 0) {
    return (
      <div className="glass-card">
        <h3 className="text-base font-bold text-[#1e1b4b] tracking-tight mb-5">Tendencia</h3>
        <div className="h-[200px] flex items-center justify-center text-sm text-[#7c7caa]">
          Sem dados
        </div>
      </div>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    label: formatMonthShort(d.month),
  }));

  return (
    <div className="glass-card">
      <h3 className="text-base font-bold text-[#1e1b4b] tracking-tight mb-5">Tendencia</h3>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
          </defs>
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
              fontSize: '13px',
              fontWeight: 600,
            }}
          />
          <Area
            type="monotone"
            dataKey="total"
            stroke="#6366f1"
            strokeWidth={3}
            fill="url(#trendGradient)"
            dot={{ fill: '#6366f1', r: 4, strokeWidth: 2, stroke: '#fff' }}
            activeDot={{ r: 6, strokeWidth: 3 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

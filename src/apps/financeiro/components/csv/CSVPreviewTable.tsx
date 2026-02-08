import { formatDate, formatBRL } from '../../utils/formatters';
import type { CSVPreviewRow } from '../../types';

interface CSVPreviewTableProps {
  rows: CSVPreviewRow[];
  totalRows: number;
  duplicateCount: number;
}

export default function CSVPreviewTable({ rows, totalRows, duplicateCount }: CSVPreviewTableProps) {
  return (
    <div className="glass-card overflow-hidden p-0">
      <div className="flex items-center justify-between px-6 py-4 border-b border-indigo-500/10">
        <h3 className="text-base font-bold text-[#1e1b4b]">Preview da importacao</h3>
        <div className="flex gap-3">
          <span className="bg-indigo-500/10 text-indigo-500 text-xs font-bold px-3 py-1.5 rounded-[10px]">
            {totalRows} linhas
          </span>
          {duplicateCount > 0 && (
            <span className="bg-amber-500/10 text-amber-600 text-xs font-bold px-3 py-1.5 rounded-[10px]">
              {duplicateCount} duplicatas
            </span>
          )}
        </div>
      </div>

      <div className="overflow-x-auto max-h-[400px]">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 bg-white/80 backdrop-blur-sm">
            <tr>
              <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#7c7caa] uppercase tracking-wider">#</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#7c7caa] uppercase tracking-wider">Data</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#7c7caa] uppercase tracking-wider">Descricao</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#7c7caa] uppercase tracking-wider">Titular</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#7c7caa] uppercase tracking-wider">Parcela</th>
              <th className="px-4 py-3 text-right text-[11px] font-semibold text-[#7c7caa] uppercase tracking-wider">Valor</th>
              <th className="px-4 py-3 text-center text-[11px] font-semibold text-[#7c7caa] uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={i}
                className={`${row.isDuplicate ? 'opacity-50 bg-amber-50/50' : ''} hover:bg-indigo-500/3 transition-colors`}
              >
                <td className="px-4 py-2.5 text-xs text-[#7c7caa]">{row.index + 1}</td>
                <td className="px-4 py-2.5 text-[13px]">{formatDate(row.purchase_date)}</td>
                <td className="px-4 py-2.5 text-[13px] font-semibold max-w-[200px] truncate">{row.description}</td>
                <td className="px-4 py-2.5 text-xs text-[#7c7caa]">{row.card_holder}</td>
                <td className="px-4 py-2.5 text-[11px] text-[#7c7caa]">{row.installment || 'Unica'}</td>
                <td className={`px-4 py-2.5 text-right font-bold tabular-nums ${row.is_refund ? 'text-emerald-600' : 'text-[#1e1b4b]'}`}>
                  {row.is_refund ? '- ' : ''}{formatBRL(Math.abs(row.value_brl))}
                </td>
                <td className="px-4 py-2.5 text-center">
                  {row.isDuplicate ? (
                    <span className="text-[10px] font-bold text-amber-600 bg-amber-100/50 px-2 py-0.5 rounded-full">DUPLICATA</span>
                  ) : (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100/50 px-2 py-0.5 rounded-full">NOVO</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

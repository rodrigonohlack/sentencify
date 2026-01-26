/**
 * @file TabelaComparativa.tsx
 * @description Tabela sintética comparativa dos pedidos
 */

import React from 'react';
import { DollarSign, AlertTriangle, CheckCircle } from 'lucide-react';
import { Badge } from '../ui';
import { safeRender } from '../../utils/safe-render';
import type { TabelaPedido, ValorCausa } from '../../types';

interface TabelaComparativaProps {
  pedidos: TabelaPedido[];
  valorCausa: ValorCausa;
}

export const TabelaComparativa: React.FC<TabelaComparativaProps> = ({ pedidos, valorCausa }) => {
  const formatCurrency = (value?: number) => {
    if (!value) return '-';
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const totalPedidos = pedidos.reduce((sum, p) => sum + (p.valor || 0), 0);
  const controvertidos = pedidos.filter(p => p.controversia).length;
  const incontroversos = pedidos.length - controvertidos;

  return (
    <div className="space-y-6">
      {/* Resumo Financeiro */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-gradient-to-br from-indigo-50 to-violet-50 rounded-xl border border-indigo-100">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-indigo-600" />
            <span className="text-sm text-slate-600">Valor da Causa</span>
          </div>
          <p className="text-xl font-bold text-indigo-700">
            {formatCurrency(valorCausa.valorTotal)}
          </p>
        </div>

        <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-100">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <span className="text-sm text-slate-600">Soma dos Pedidos</span>
          </div>
          <p className="text-xl font-bold text-emerald-700">
            {formatCurrency(valorCausa.somaPedidos || totalPedidos)}
          </p>
        </div>

        <div className="p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-slate-500" />
            <span className="text-sm text-slate-600">Controvérsias</span>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="warning">{controvertidos} controvertidos</Badge>
            <Badge variant="success">{incontroversos} incontroversos</Badge>
          </div>
        </div>
      </div>

      {/* Alerta de Inconsistência */}
      {valorCausa.inconsistencia && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">Inconsistência no Valor da Causa</p>
            <p className="text-sm text-amber-700 mt-1">
              {safeRender(valorCausa.detalhes) || 'O valor da causa não corresponde à soma dos pedidos.'}
            </p>
          </div>
        </div>
      )}

      {/* Tabela */}
      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50">
              <th className="px-4 py-3 text-left font-medium text-slate-600 w-12">#</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Tema</th>
              <th className="px-4 py-3 text-right font-medium text-slate-600">Valor</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Tese do Autor</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Tese do Réu</th>
              <th className="px-4 py-3 text-center font-medium text-slate-600">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pedidos.map((pedido) => (
              <tr key={pedido.numero} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 text-slate-800 font-medium">
                  {pedido.numero}
                </td>
                <td className="px-4 py-3 text-slate-800 font-medium">
                  {pedido.tema}
                </td>
                <td className="px-4 py-3 text-right text-slate-700">
                  {formatCurrency(pedido.valor)}
                </td>
                <td className="px-4 py-3 text-slate-600 max-w-[200px]">
                  <p className="truncate" title={safeRender(pedido.teseAutor)}>
                    {safeRender(pedido.teseAutor)}
                  </p>
                </td>
                <td className="px-4 py-3 text-slate-600 max-w-[200px]">
                  <p className="truncate" title={safeRender(pedido.teseRe)}>
                    {safeRender(pedido.teseRe) || '-'}
                  </p>
                </td>
                <td className="px-4 py-3 text-center">
                  <Badge variant={pedido.controversia ? 'warning' : 'success'}>
                    {pedido.controversia ? 'Controvertido' : 'Incontroverso'}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-100 font-medium">
              <td colSpan={2} className="px-4 py-3 text-slate-700">Total</td>
              <td className="px-4 py-3 text-right text-slate-800">
                {formatCurrency(totalPedidos)}
              </td>
              <td colSpan={3}></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Observações e Confissões Fictas */}
      {pedidos.some(p => p.confissaoFicta || p.observacoes) && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <h4 className="font-medium text-red-800 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Confissões Fictas e Observações
          </h4>
          <div className="space-y-2">
            {pedidos.filter(p => p.confissaoFicta || p.observacoes).map((p) => (
              <div key={p.numero} className="text-sm text-red-700">
                <strong>#{p.numero} {p.tema}:</strong>{' '}
                {safeRender(p.confissaoFicta || p.observacoes)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TabelaComparativa;

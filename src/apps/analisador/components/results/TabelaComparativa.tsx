/**
 * @file TabelaComparativa.tsx
 * @description Tabela sintética comparativa dos pedidos
 */

import React, { useState } from 'react';
import { DollarSign, AlertTriangle, CheckCircle } from 'lucide-react';
import { Badge, TeseModal } from '../ui';
import { safeRender } from '../../utils/safe-render';
import { formatCurrency, parseThemeAndValue } from '../../utils/format-pedido';
import type { TabelaPedido, ValorCausa } from '../../types';

// ═══════════════════════════════════════════════════════════════════════════
// TIPO PARA TESE SELECIONADA
// ═══════════════════════════════════════════════════════════════════════════

interface SelectedTese {
  text: string;
  label: string;
  variant: 'autor' | 'reu';
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE DE TEXTO EXPANSÍVEL (apenas botão, modal renderizado fora)
// ═══════════════════════════════════════════════════════════════════════════

interface ExpandableTextProps {
  text: string;
  label: string;
  variant: 'autor' | 'reu';
  onExpand: (data: SelectedTese) => void;
}

const ExpandableText: React.FC<ExpandableTextProps> = ({ text, label, variant, onExpand }) => {
  const displayText = safeRender(text);
  if (!displayText || displayText === '-') {
    return <span className="text-slate-400 dark:text-slate-500">-</span>;
  }

  return (
    <button
      onClick={() => onExpand({ text: displayText, label, variant })}
      className="text-left w-full truncate cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
      title="Clique para expandir"
    >
      {displayText}
    </button>
  );
};

interface TabelaComparativaProps {
  pedidos: TabelaPedido[];
  valorCausa: ValorCausa;
}

export const TabelaComparativa: React.FC<TabelaComparativaProps> = ({ pedidos, valorCausa }) => {
  // Estado para o modal de tese expandida (renderizado fora da tabela)
  const [selectedTese, setSelectedTese] = useState<SelectedTese | null>(null);

  const totalPedidos = pedidos.reduce((sum, p) => {
    const { extractedValor } = parseThemeAndValue(p.tema, p.valor);
    return sum + (extractedValor || 0);
  }, 0);
  const controvertidos = pedidos.filter(p => p.controversia).length;
  const incontroversos = pedidos.length - controvertidos;

  return (
    <div className="space-y-6">
      {/* Resumo Financeiro */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-gradient-to-br from-indigo-50 dark:from-indigo-900/20 to-violet-50 dark:to-violet-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800/40">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span className="text-sm text-slate-600 dark:text-slate-300">Valor da Causa</span>
          </div>
          <p className="text-xl font-bold text-indigo-700 dark:text-indigo-300">
            {formatCurrency(valorCausa.valorTotal)}
          </p>
        </div>

        <div className="p-4 bg-gradient-to-br from-emerald-50 dark:from-emerald-900/20 to-teal-50 dark:to-teal-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800/40">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-sm text-slate-600 dark:text-slate-300">Soma dos Pedidos</span>
          </div>
          <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
            {formatCurrency(valorCausa.somaPedidos || totalPedidos)}
          </p>
        </div>

        <div className="p-4 bg-gradient-to-br from-slate-50 dark:from-slate-800 to-slate-100 dark:to-slate-700 rounded-xl border border-slate-200 dark:border-slate-600">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-slate-500 dark:text-slate-400" />
            <span className="text-sm text-slate-600 dark:text-slate-300">Controvérsias</span>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="warning">{controvertidos} controvertidos</Badge>
            <Badge variant="success">{incontroversos} incontroversos</Badge>
          </div>
        </div>
      </div>

      {/* Alerta de Inconsistência */}
      {valorCausa.inconsistencia && (
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800 dark:text-amber-300">Inconsistência no Valor da Causa</p>
            <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
              {safeRender(valorCausa.detalhes) || 'O valor da causa não corresponde à soma dos pedidos.'}
            </p>
          </div>
        </div>
      )}

      {/* Tabela */}
      <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50">
              <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300 w-12">#</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">Tema</th>
              <th className="px-4 py-3 text-right font-medium text-slate-600 dark:text-slate-300">Valor</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">Tese do Autor</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">Tese do Réu</th>
              <th className="px-4 py-3 text-center font-medium text-slate-600 dark:text-slate-300">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {pedidos.map((pedido) => {
              const { cleanTema } = parseThemeAndValue(pedido.tema, pedido.valor);
              return (
                <tr key={pedido.numero} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-4 py-3 text-slate-800 dark:text-slate-100 font-medium">
                    {pedido.numero}
                  </td>
                  <td className="px-4 py-3 text-slate-800 dark:text-slate-100 font-medium">
                    {cleanTema}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-200">
                    {formatCurrency(pedido.valor)}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400 max-w-[200px]">
                    <ExpandableText
                      text={pedido.teseAutor}
                      label="Tese do Autor"
                      variant="autor"
                      onExpand={setSelectedTese}
                    />
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400 max-w-[200px]">
                    <ExpandableText
                      text={pedido.teseRe || ''}
                      label="Tese do Réu"
                      variant="reu"
                      onExpand={setSelectedTese}
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={pedido.controversia ? 'warning' : 'success'}>
                      {pedido.controversia ? 'Controvertido' : 'Incontroverso'}
                    </Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-slate-100 dark:bg-slate-800 font-medium">
              <td colSpan={2} className="px-4 py-3 text-slate-700 dark:text-slate-200">Total</td>
              <td className="px-4 py-3 text-right text-slate-800 dark:text-slate-100">
                {formatCurrency(totalPedidos)}
              </td>
              <td colSpan={3}></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Observações e Confissões Fictas */}
      {pedidos.some(p => p.confissaoFicta || p.observacoes) && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-lg">
          <h4 className="font-medium text-red-800 dark:text-red-300 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Confissões Fictas e Observações
          </h4>
          <div className="space-y-2">
            {pedidos.filter(p => p.confissaoFicta || p.observacoes).map((p) => {
              const { cleanTema } = parseThemeAndValue(p.tema, p.valor);
              return (
                <div key={p.numero} className="text-sm text-red-700 dark:text-red-400">
                  <strong>#{p.numero} {cleanTema}:</strong>{' '}
                  {safeRender(p.confissaoFicta || p.observacoes)}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal de Tese Expandida - usa createPortal para escapar do overflow-hidden */}
      <TeseModal
        isOpen={selectedTese !== null}
        onClose={() => setSelectedTese(null)}
        title={selectedTese?.label || ''}
        text={selectedTese?.text || ''}
        variant={selectedTese?.variant || 'autor'}
      />
    </div>
  );
};

export default TabelaComparativa;

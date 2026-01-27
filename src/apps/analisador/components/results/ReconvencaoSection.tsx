/**
 * @file ReconvencaoSection.tsx
 * @description Seção de reconvenção com seus pedidos
 */

import React, { useState } from 'react';
import { ArrowLeftRight, ChevronDown, AlertCircle, CheckCircle, HelpCircle } from 'lucide-react';
import { AccordionItem, Badge } from '../ui';
import { safeRender } from '../../utils/safe-render';
import { formatCurrency, parseThemeAndValue } from '../../utils/format-pedido';
import type { Reconvencao, PedidoAnalise } from '../../types';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface ReconvencaoSectionProps {
  reconvencao: Reconvencao;
}

// ═══════════════════════════════════════════════════════════════════════════
// SUBCOMPONENTES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Card de pedido da reconvenção (simplificado)
 */
const PedidoReconvencaoCard: React.FC<{ pedido: PedidoAnalise }> = ({ pedido }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const { cleanTema, extractedValor } = parseThemeAndValue(pedido.tema, pedido.valor);

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-between text-left transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 flex items-center justify-center font-semibold rounded-lg text-sm bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300">
            {pedido.numero}
          </span>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-800 dark:text-slate-200">{cleanTema}</span>
              {extractedValor !== undefined && extractedValor !== null && (
                <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                  {formatCurrency(extractedValor)}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={pedido.controversia ? 'warning' : 'success'}>
            {pedido.controversia ? 'Controvertido' : 'Incontroverso'}
          </Badge>
          <ChevronDown
            className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 py-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 space-y-4">
          {/* Descrição */}
          <div>
            <h5 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Descrição do Pedido</h5>
            <p className="text-sm text-slate-800 dark:text-slate-200">{safeRender(pedido.descricao)}</p>
            {pedido.periodo && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                <strong>Período:</strong> {pedido.periodo}
              </p>
            )}
          </div>

          {/* Tese da Reclamada (autora da reconvenção) */}
          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800/40">
            <h5 className="text-sm font-medium text-purple-800 dark:text-purple-300 mb-1">Tese da Reclamada (Reconvinte)</h5>
            <p className="text-sm text-purple-700 dark:text-purple-400">{safeRender(pedido.fatosReclamante)}</p>
          </div>

          {/* Defesa do Reclamante (réu na reconvenção) */}
          {pedido.defesaReclamada && (
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800/40">
              <h5 className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-1">Defesa do Reclamante (Reconvindo)</h5>
              <p className="text-sm text-amber-700 dark:text-amber-400">{safeRender(pedido.defesaReclamada)}</p>
            </div>
          )}

          {/* Tese Jurídica */}
          {pedido.teseJuridica && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800/40">
              <h5 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">Fundamento Jurídico</h5>
              <p className="text-sm text-blue-700 dark:text-blue-400">{safeRender(pedido.teseJuridica)}</p>
            </div>
          )}

          {/* Pontos a Esclarecer */}
          {pedido.pontosEsclarecer && pedido.pontosEsclarecer.length > 0 && (
            <div className="p-3 bg-violet-50 dark:bg-violet-900/20 rounded-lg border border-violet-200 dark:border-violet-800/40">
              <div className="flex items-center gap-2 mb-2">
                <HelpCircle className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                <h5 className="text-sm font-medium text-violet-800 dark:text-violet-300">Pontos a Esclarecer em Audiência</h5>
              </div>
              <ul className="space-y-1">
                {pedido.pontosEsclarecer.map((ponto, idx) => (
                  <li key={idx} className="text-sm text-violet-700 dark:text-violet-400 flex items-start gap-2">
                    <span className="text-violet-400 dark:text-violet-500">•</span>
                    {safeRender(ponto)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Seção de reconvenção
 */
export const ReconvencaoSection: React.FC<ReconvencaoSectionProps> = ({ reconvencao }) => {
  const pedidos = reconvencao.pedidos || [];
  const controvertidos = pedidos.filter(p => p.controversia).length;
  const incontroversos = pedidos.length - controvertidos;

  return (
    <AccordionItem
      title={`Reconvenção (${pedidos.length} pedido${pedidos.length !== 1 ? 's' : ''})`}
      icon={<ArrowLeftRight className="w-5 h-5" />}
      defaultOpen
    >
      <div className="space-y-4">
        {/* Fundamentação geral */}
        {reconvencao.fundamentacao && (
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800/40">
            <h4 className="font-medium text-purple-800 dark:text-purple-300 mb-2">Fundamentação da Reconvenção</h4>
            <p className="text-sm text-purple-700 dark:text-purple-400">{safeRender(reconvencao.fundamentacao)}</p>
          </div>
        )}

        {/* Resumo dos pedidos */}
        {pedidos.length > 0 && (
          <>
            <div className="flex flex-wrap items-center gap-4 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  <strong className="text-amber-600 dark:text-amber-400">{controvertidos}</strong> controvertidos
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  <strong className="text-emerald-600 dark:text-emerald-400">{incontroversos}</strong> incontroversos
                </span>
              </div>
            </div>

            {/* Lista de Pedidos da Reconvenção */}
            <div className="space-y-3">
              {pedidos.map((pedido) => (
                <PedidoReconvencaoCard key={pedido.numero} pedido={pedido} />
              ))}
            </div>
          </>
        )}

        {pedidos.length === 0 && !reconvencao.fundamentacao && (
          <p className="text-slate-500 dark:text-slate-400 text-sm italic">
            Reconvenção identificada, mas sem pedidos detalhados.
          </p>
        )}
      </div>
    </AccordionItem>
  );
};

export default ReconvencaoSection;

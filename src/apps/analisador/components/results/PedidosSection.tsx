/**
 * @file PedidosSection.tsx
 * @description Seção de análise dos pedidos
 */

import React, { useState } from 'react';
import { ListChecks, ChevronDown, AlertCircle, CheckCircle, HelpCircle } from 'lucide-react';
import { AccordionItem, Badge } from '../ui';
import { safeRender } from '../../utils/safe-render';
import type { PedidoAnalise } from '../../types';

interface PedidosSectionProps {
  pedidos: PedidoAnalise[];
}

const PedidoCard: React.FC<{ pedido: PedidoAnalise }> = ({ pedido }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatCurrency = (value?: number) => {
    if (!value && value !== 0) return null;
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Extrai valor numérico do tema se a IA concatenou (ex: "HORAS EXTRAS(12316.19)")
  const parseThemeAndValue = (tema: string, valor?: number) => {
    const match = tema.match(/^(.+?)\s*\((\d+(?:\.\d+)?)\)$/);
    if (match) {
      return {
        cleanTema: match[1].trim(),
        extractedValor: valor ?? parseFloat(match[2])
      };
    }
    return { cleanTema: tema, extractedValor: valor };
  };

  const { cleanTema, extractedValor } = parseThemeAndValue(pedido.tema, pedido.valor);

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-between text-left transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 flex items-center justify-center bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-semibold rounded-lg text-sm">
            {pedido.numero}
          </span>
          <div>
            <span className="font-medium text-slate-800 dark:text-slate-200">{cleanTema}</span>
            {extractedValor !== undefined && extractedValor !== null && (
              <span className="ml-2 text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                {formatCurrency(extractedValor)}
              </span>
            )}
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

          {/* Tese do Reclamante */}
          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800/40">
            <h5 className="text-sm font-medium text-emerald-800 dark:text-emerald-300 mb-1">Tese do Reclamante</h5>
            <p className="text-sm text-emerald-700 dark:text-emerald-400">{safeRender(pedido.fatosReclamante)}</p>
          </div>

          {/* Defesa da Reclamada */}
          {pedido.defesaReclamada && (
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800/40">
              <h5 className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-1">Defesa da Reclamada</h5>
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

          {/* Confissão Ficta */}
          {pedido.confissaoFicta && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800/40 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <h5 className="text-sm font-medium text-red-800 dark:text-red-300">Confissão Ficta</h5>
                <p className="text-sm text-red-700 dark:text-red-400">{safeRender(pedido.confissaoFicta)}</p>
              </div>
            </div>
          )}

          {/* Pontos a Esclarecer */}
          {pedido.pontosEsclarecer.length > 0 && (
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

export const PedidosSection: React.FC<PedidosSectionProps> = ({ pedidos }) => {
  const controvertidos = pedidos.filter(p => p.controversia).length;
  const incontroversos = pedidos.length - controvertidos;

  return (
    <AccordionItem
      title={`Pedidos (${pedidos.length})`}
      icon={<ListChecks className="w-5 h-5" />}
      defaultOpen
    >
      <div className="space-y-4">
        {/* Resumo */}
        <div className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
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

        {/* Lista de Pedidos */}
        <div className="space-y-3">
          {pedidos.map((pedido) => (
            <PedidoCard key={pedido.numero} pedido={pedido} />
          ))}
        </div>
      </div>
    </AccordionItem>
  );
};

export default PedidosSection;

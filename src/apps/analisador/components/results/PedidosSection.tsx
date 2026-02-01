/**
 * @file PedidosSection.tsx
 * @description Seção de análise dos pedidos
 */

import React, { useState, useMemo } from 'react';
import { ListChecks, ChevronDown, AlertCircle, CheckCircle, HelpCircle, GitBranch, ArrowRightLeft, Link2 } from 'lucide-react';
import { AccordionItem, Badge } from '../ui';
import { safeRender } from '../../utils/safe-render';
import { formatCurrency, parseThemeAndValue } from '../../utils/format-pedido';
import type { PedidoAnalise, TipoPedido } from '../../types';

interface PedidosSectionProps {
  pedidos: PedidoAnalise[];
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS E SUBCOMPONENTES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Badge visual para indicar o tipo do pedido
 */
const TipoPedidoBadge: React.FC<{ tipo?: TipoPedido }> = ({ tipo }) => {
  if (!tipo || tipo === 'principal') return null;

  const config: Record<TipoPedido, { label: string; bgClass: string; textClass: string; icon: React.ReactNode }> = {
    principal: { label: '', bgClass: '', textClass: '', icon: null },
    subsidiario: {
      label: 'Subsidiário',
      bgClass: 'bg-violet-100 dark:bg-violet-900/40',
      textClass: 'text-violet-700 dark:text-violet-300',
      icon: <GitBranch className="w-3 h-3" />,
    },
    alternativo: {
      label: 'Alternativo',
      bgClass: 'bg-blue-100 dark:bg-blue-900/40',
      textClass: 'text-blue-700 dark:text-blue-300',
      icon: <ArrowRightLeft className="w-3 h-3" />,
    },
    sucessivo: {
      label: 'Sucessivo',
      bgClass: 'bg-orange-100 dark:bg-orange-900/40',
      textClass: 'text-orange-700 dark:text-orange-300',
      icon: <Link2 className="w-3 h-3" />,
    },
  };

  // Guard: validar se tipo existe no config antes de desestruturar
  if (!(tipo in config)) return null;

  const { label, bgClass, textClass, icon } = config[tipo];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium ${bgClass} ${textClass} rounded-full`}>
      {icon}
      {label}
    </span>
  );
};

const PedidoCard: React.FC<{ pedido: PedidoAnalise; isChild?: boolean }> = ({ pedido, isChild = false }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const { cleanTema, extractedValor } = parseThemeAndValue(pedido.tema, pedido.valor);

  const isNotPrincipal = pedido.tipoPedido && pedido.tipoPedido !== 'principal';

  return (
    <div className={`border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden ${isChild ? 'ml-6 border-l-4 border-l-violet-300 dark:border-l-violet-700' : ''}`}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-between text-left transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className={`w-8 h-8 flex items-center justify-center font-semibold rounded-lg text-sm ${
            isNotPrincipal
              ? 'bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300'
              : 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300'
          }`}>
            {pedido.numero}
          </span>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-800 dark:text-slate-200">{cleanTema}</span>
              <TipoPedidoBadge tipo={pedido.tipoPedido} />
              {extractedValor !== undefined && extractedValor !== null && (
                <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                  {formatCurrency(extractedValor)}
                </span>
              )}
            </div>
            {pedido.condicao && (
              <span className="text-xs text-slate-500 dark:text-slate-400 italic mt-0.5">
                {pedido.condicao}
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

  // Contagem por tipo de pedido
  const countByType = useMemo(() => ({
    principais: pedidos.filter(p => !p.tipoPedido || p.tipoPedido === 'principal').length,
    subsidiarios: pedidos.filter(p => p.tipoPedido === 'subsidiario').length,
    alternativos: pedidos.filter(p => p.tipoPedido === 'alternativo').length,
    sucessivos: pedidos.filter(p => p.tipoPedido === 'sucessivo').length,
  }), [pedidos]);

  // Organiza pedidos: principais primeiro, depois filhos agrupados
  const organizedPedidos = useMemo(() => {
    const principais = pedidos.filter(p => !p.tipoPedido || p.tipoPedido === 'principal');
    const filhos = pedidos.filter(p => p.tipoPedido && p.tipoPedido !== 'principal');

    // Cria estrutura agrupada
    const result: { pedido: PedidoAnalise; filhos: PedidoAnalise[] }[] = [];

    // Adiciona principais com seus filhos
    for (const principal of principais) {
      const pedidosRelacionados = filhos.filter(f => f.pedidoPrincipalNumero === principal.numero);
      result.push({ pedido: principal, filhos: pedidosRelacionados });
    }

    // Adiciona filhos órfãos (sem principal identificado)
    const filhosOrfaos = filhos.filter(f => !principais.some(p => p.numero === f.pedidoPrincipalNumero));
    for (const orfao of filhosOrfaos) {
      result.push({ pedido: orfao, filhos: [] });
    }

    return result;
  }, [pedidos]);

  const hasNonPrincipalPedidos = countByType.subsidiarios > 0 || countByType.alternativos > 0 || countByType.sucessivos > 0;

  return (
    <AccordionItem
      title={`Pedidos (${pedidos.length})`}
      icon={<ListChecks className="w-5 h-5" />}
      defaultOpen
    >
      <div className="space-y-4">
        {/* Resumo */}
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
          {hasNonPrincipalPedidos && (
            <>
              <span className="text-slate-300 dark:text-slate-600">|</span>
              {countByType.subsidiarios > 0 && (
                <div className="flex items-center gap-1">
                  <GitBranch className="w-3.5 h-3.5 text-violet-500" />
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    <strong className="text-violet-600 dark:text-violet-400">{countByType.subsidiarios}</strong> subsidiário{countByType.subsidiarios !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
              {countByType.alternativos > 0 && (
                <div className="flex items-center gap-1">
                  <ArrowRightLeft className="w-3.5 h-3.5 text-blue-500" />
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    <strong className="text-blue-600 dark:text-blue-400">{countByType.alternativos}</strong> alternativo{countByType.alternativos !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
              {countByType.sucessivos > 0 && (
                <div className="flex items-center gap-1">
                  <Link2 className="w-3.5 h-3.5 text-orange-500" />
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    <strong className="text-orange-600 dark:text-orange-400">{countByType.sucessivos}</strong> sucessivo{countByType.sucessivos !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Lista de Pedidos (agrupados) */}
        <div className="space-y-3">
          {organizedPedidos.map(({ pedido, filhos }) => (
            <div key={pedido.numero}>
              <PedidoCard pedido={pedido} />
              {filhos.length > 0 && (
                <div className="mt-2 space-y-2">
                  {filhos.map((filho) => (
                    <PedidoCard key={filho.numero} pedido={filho} isChild />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </AccordionItem>
  );
};

export default PedidosSection;

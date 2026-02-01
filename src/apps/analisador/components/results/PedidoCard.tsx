/**
 * @file PedidoCard.tsx
 * @description Componente de card para exibição de pedidos da análise
 * @version 1.39.0
 */

import React, { useState, useCallback } from 'react';
import {
  ChevronDown,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  HelpCircle,
  Scale,
  MessageSquare,
  DollarSign,
  Calendar,
  FileText,
  GitBranch,
  ArrowRightLeft,
  Link2,
  Info,
} from 'lucide-react';
import type { PedidoAnalise, TabelaPedido, TipoPedido } from '../../types/analysis.types';
import { safeRender } from '../../utils/safe-render';
import { formatCurrency, parseThemeAndValue } from '../../utils/format-pedido';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

interface PedidoCardProps {
  /** Pedido completo (da análise detalhada) */
  pedido?: PedidoAnalise;
  /** Pedido resumido (da tabela sintética) */
  tabelaPedido?: TabelaPedido;
  /** Se está expandido por padrão */
  defaultExpanded?: boolean;
  /** Se mostra versão compacta */
  compact?: boolean;
}

interface PedidoFieldProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
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

// ═══════════════════════════════════════════════════════════════════════════
// SUBCOMPONENTES
// ═══════════════════════════════════════════════════════════════════════════

const PedidoField: React.FC<PedidoFieldProps> = ({ label, value, icon }) => {
  if (!value) return null;

  return (
    <div className="mb-3">
      <div className="flex items-center gap-2 mb-1">
        {icon && <span className="text-slate-400 dark:text-slate-500">{icon}</span>}
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          {label}
        </span>
      </div>
      <div className="text-slate-700 dark:text-slate-200 text-sm pl-6">{safeRender(value)}</div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Card para exibição detalhada de um pedido da análise
 */
export const PedidoCard: React.FC<PedidoCardProps> = ({
  pedido,
  tabelaPedido,
  defaultExpanded = false,
  compact = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const handleToggle = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  // Usar dados do pedido completo ou da tabela
  const numero = pedido?.numero ?? tabelaPedido?.numero ?? 0;
  const temaRaw = pedido?.tema ?? tabelaPedido?.tema ?? '';
  const valorRaw = pedido?.valor ?? tabelaPedido?.valor;
  const controversia = pedido?.controversia ?? tabelaPedido?.controversia ?? false;
  const confissaoFicta = pedido?.confissaoFicta ?? tabelaPedido?.confissaoFicta;
  const tipoPedido = pedido?.tipoPedido ?? tabelaPedido?.tipoPedido;
  const condicao = pedido?.condicao ?? tabelaPedido?.condicao;

  // Extrai valor do tema se necessário
  const { cleanTema: tema, extractedValor: valor } = parseThemeAndValue(temaRaw, valorRaw);

  // Dados específicos do pedido completo
  const descricao = pedido?.descricao;
  const periodo = pedido?.periodo;
  const fatosReclamante = pedido?.fatosReclamante;
  const defesaReclamada = pedido?.defesaReclamada;
  const teseJuridica = pedido?.teseJuridica;
  const pontosEsclarecer = pedido?.pontosEsclarecer ?? [];

  // Dados específicos da tabela
  const teseAutor = tabelaPedido?.teseAutor;
  const teseRe = tabelaPedido?.teseRe;
  const observacoes = tabelaPedido?.observacoes;

  // Verificar se não é pedido principal
  const isNotPrincipal = tipoPedido && tipoPedido !== 'principal';

  const ChevronIcon = isExpanded ? ChevronDown : ChevronRight;

  // Badge de status
  const StatusBadge = () => {
    if (confissaoFicta) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded-full">
          <AlertCircle className="w-3 h-3" />
          Confissão Ficta
        </span>
      );
    }
    if (controversia) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded-full">
          <HelpCircle className="w-3 h-3" />
          Controvérsia
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-full">
        <CheckCircle className="w-3 h-3" />
        Incontroverso
      </span>
    );
  };

  if (compact) {
    // Versão compacta para lista
    return (
      <div className={`flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 ${isNotPrincipal ? 'border-l-4 border-l-violet-300 dark:border-l-violet-700' : ''}`}>
        <div className="flex items-center gap-3">
          <span className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${
            isNotPrincipal
              ? 'bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300'
              : 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300'
          }`}>
            {numero}
          </span>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium text-slate-800 dark:text-slate-100">{tema}</p>
              <TipoPedidoBadge tipo={tipoPedido} />
            </div>
            {condicao && (
              <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                {condicao}
              </p>
            )}
            {valor !== undefined && (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {formatCurrency(valor)}
              </p>
            )}
          </div>
        </div>
        <StatusBadge />
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden ${isNotPrincipal ? 'border-l-4 border-l-violet-300 dark:border-l-violet-700' : ''}`}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/50 cursor-pointer select-none"
        onClick={handleToggle}
      >
        <div className="flex items-center gap-3">
          <ChevronIcon className="w-5 h-5 text-slate-400 dark:text-slate-500" />
          <span className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${
            isNotPrincipal
              ? 'bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300'
              : 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300'
          }`}>
            {numero}
          </span>
          <div className="flex flex-col">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-semibold text-slate-800 dark:text-slate-100">{tema}</h4>
              <TipoPedidoBadge tipo={tipoPedido} />
            </div>
            {condicao && (
              <p className="text-xs text-slate-500 dark:text-slate-400 italic mt-0.5">
                {condicao}
              </p>
            )}
            {valor !== undefined && (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {formatCurrency(valor)}
              </p>
            )}
          </div>
        </div>
        <StatusBadge />
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 py-4 space-y-4">
          {/* Descrição */}
          {descricao && (
            <PedidoField
              label="Descrição"
              value={descricao}
              icon={<FileText className="w-4 h-4" />}
            />
          )}

          {/* Período */}
          {periodo && (
            <PedidoField
              label="Período"
              value={periodo}
              icon={<Calendar className="w-4 h-4" />}
            />
          )}

          {/* Valor */}
          {valor !== undefined && (
            <PedidoField
              label="Valor"
              value={formatCurrency(valor)}
              icon={<DollarSign className="w-4 h-4" />}
            />
          )}

          {/* Condição de aplicação (pedidos subsidiários/alternativos/sucessivos) */}
          {condicao && (
            <div className="p-3 bg-violet-50 dark:bg-violet-900/20 rounded-lg border border-violet-200 dark:border-violet-800/40">
              <div className="flex items-center gap-2 mb-1">
                <Info className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                <span className="text-xs font-medium text-violet-600 dark:text-violet-400 uppercase tracking-wider">
                  Condição de Aplicação
                </span>
              </div>
              <p className="text-sm text-violet-700 dark:text-violet-300 italic pl-6">
                {safeRender(condicao)}
              </p>
            </div>
          )}

          {/* Divider */}
          <hr className="border-slate-200 dark:border-slate-700" />

          {/* Teses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tese do Autor */}
            {(fatosReclamante || teseAutor) && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-2">
                  <Scale className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                    Tese do Autor
                  </span>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap">
                  {safeRender(fatosReclamante) || safeRender(teseAutor)}
                </p>
              </div>
            )}

            {/* Tese da Ré */}
            {(defesaReclamada || teseRe) && (
              <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                <div className="flex items-center gap-2 mb-2">
                  <Scale className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  <span className="text-xs font-medium text-orange-600 dark:text-orange-400 uppercase tracking-wider">
                    Tese da Ré
                  </span>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap">
                  {safeRender(defesaReclamada) || safeRender(teseRe)}
                </p>
              </div>
            )}
          </div>

          {/* Tese Jurídica */}
          {teseJuridica && (
            <PedidoField
              label="Tese Jurídica"
              value={teseJuridica}
              icon={<MessageSquare className="w-4 h-4" />}
            />
          )}

          {/* Pontos a Esclarecer */}
          {pontosEsclarecer.length > 0 && (
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-2 mb-2">
                <HelpCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                  Pontos a Esclarecer
                </span>
              </div>
              <ul className="space-y-1">
                {pontosEsclarecer.map((ponto, index) => (
                  <li
                    key={index}
                    className="text-sm text-slate-700 dark:text-slate-200 flex items-start gap-2"
                  >
                    <span className="text-amber-500 dark:text-amber-400 mt-0.5">•</span>
                    {safeRender(ponto)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Confissão Ficta */}
          {confissaoFicta && (
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                  Confissão Ficta
                </span>
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{safeRender(confissaoFicta)}</p>
            </div>
          )}

          {/* Observações */}
          {observacoes && (
            <PedidoField
              label="Observações"
              value={observacoes}
              icon={<FileText className="w-4 h-4" />}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default PedidoCard;

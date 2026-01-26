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
} from 'lucide-react';
import type { PedidoAnalise, TabelaPedido } from '../../types/analysis.types';

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
 * Formata valor monetário em Real brasileiro
 */
const formatCurrency = (value?: number): string => {
  if (value === undefined || value === null) return '—';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

/**
 * Renderiza qualquer valor como string de forma segura
 * Evita React Error #300 quando LLM retorna objetos ao invés de strings
 */
const safeRender = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
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
      <div className="text-slate-700 dark:text-slate-200 text-sm pl-6">{value}</div>
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
  const tema = pedido?.tema ?? tabelaPedido?.tema ?? '';
  const valor = pedido?.valor ?? tabelaPedido?.valor;
  const controversia = pedido?.controversia ?? tabelaPedido?.controversia ?? false;
  const confissaoFicta = pedido?.confissaoFicta ?? tabelaPedido?.confissaoFicta;

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
      <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-sm font-semibold">
            {numero}
          </span>
          <div>
            <p className="font-medium text-slate-800 dark:text-slate-100">{tema}</p>
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
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/50 cursor-pointer select-none"
        onClick={handleToggle}
      >
        <div className="flex items-center gap-3">
          <ChevronIcon className="w-5 h-5 text-slate-400 dark:text-slate-500" />
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-sm font-semibold">
            {numero}
          </span>
          <div>
            <h4 className="font-semibold text-slate-800 dark:text-slate-100">{tema}</h4>
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
                  {safeRender(fatosReclamante) || teseAutor}
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
                  {safeRender(defesaReclamada) || teseRe}
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
                    {ponto}
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

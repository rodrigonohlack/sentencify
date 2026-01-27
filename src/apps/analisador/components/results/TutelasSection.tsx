/**
 * @file TutelasSection.tsx
 * @description Seção de tutelas provisórias de urgência e evidência
 */

import React, { useState } from 'react';
import { Zap, ChevronDown, AlertTriangle } from 'lucide-react';
import { AccordionItem } from '../ui';
import { safeRender } from '../../utils/safe-render';
import type { TutelaProvisoria } from '../../types';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface TutelasSectionProps {
  tutelas: TutelaProvisoria[];
}

// ═══════════════════════════════════════════════════════════════════════════
// SUBCOMPONENTES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Badge visual para indicar o tipo de tutela
 */
const TipoTutelaBadge: React.FC<{ tipo: string }> = ({ tipo }) => {
  const tipoLower = tipo.toLowerCase();
  const isUrgencia = tipoLower.includes('urgência') || tipoLower.includes('urgencia');
  const isEvidencia = tipoLower.includes('evidência') || tipoLower.includes('evidencia');

  if (isUrgencia) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded-full">
        <AlertTriangle className="w-3 h-3" />
        Urgência
      </span>
    );
  }

  if (isEvidencia) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 rounded-full">
        <Zap className="w-3 h-3" />
        Evidência
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full">
      {tipo}
    </span>
  );
};

/**
 * Card individual de tutela provisória
 */
const TutelaCard: React.FC<{ tutela: TutelaProvisoria; index: number }> = ({ tutela, index }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-between text-left transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 flex items-center justify-center font-semibold rounded-lg text-sm bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300">
            {index + 1}
          </span>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-800 dark:text-slate-200 line-clamp-1">
                {tutela.pedido}
              </span>
              <TipoTutelaBadge tipo={tutela.tipo} />
            </div>
          </div>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-slate-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 py-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 space-y-4">
          {/* Pedido */}
          <div>
            <h5 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Pedido</h5>
            <p className="text-sm text-slate-800 dark:text-slate-200">{safeRender(tutela.pedido)}</p>
          </div>

          {/* Fundamentação */}
          {tutela.fundamentacao && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800/40">
              <h5 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">Fundamentação</h5>
              <p className="text-sm text-blue-700 dark:text-blue-400">{safeRender(tutela.fundamentacao)}</p>
            </div>
          )}

          {/* Urgência */}
          {tutela.urgencia && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800/40 flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <h5 className="text-sm font-medium text-red-800 dark:text-red-300">Motivo da Urgência</h5>
                <p className="text-sm text-red-700 dark:text-red-400">{safeRender(tutela.urgencia)}</p>
              </div>
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
 * Seção de tutelas provisórias de urgência e evidência
 */
export const TutelasSection: React.FC<TutelasSectionProps> = ({ tutelas }) => {
  const countByType = {
    urgencia: tutelas.filter(t => {
      const tipo = t.tipo.toLowerCase();
      return tipo.includes('urgência') || tipo.includes('urgencia');
    }).length,
    evidencia: tutelas.filter(t => {
      const tipo = t.tipo.toLowerCase();
      return tipo.includes('evidência') || tipo.includes('evidencia');
    }).length,
  };

  return (
    <AccordionItem
      title={`Tutelas Provisórias (${tutelas.length})`}
      icon={<Zap className="w-5 h-5" />}
      defaultOpen
    >
      <div className="space-y-4">
        {/* Resumo */}
        <div className="flex flex-wrap items-center gap-4 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
          {countByType.urgencia > 0 && (
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="text-sm text-slate-600 dark:text-slate-400">
                <strong className="text-red-600 dark:text-red-400">{countByType.urgencia}</strong> de urgência
              </span>
            </div>
          )}
          {countByType.evidencia > 0 && (
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-orange-500" />
              <span className="text-sm text-slate-600 dark:text-slate-400">
                <strong className="text-orange-600 dark:text-orange-400">{countByType.evidencia}</strong> de evidência
              </span>
            </div>
          )}
        </div>

        {/* Lista de Tutelas */}
        <div className="space-y-3">
          {tutelas.map((tutela, idx) => (
            <TutelaCard key={idx} tutela={tutela} index={idx} />
          ))}
        </div>
      </div>
    </AccordionItem>
  );
};

export default TutelasSection;

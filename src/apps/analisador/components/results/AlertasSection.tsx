/**
 * @file AlertasSection.tsx
 * @description Seção de alertas e recomendações
 */

import React from 'react';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { AccordionItem, Badge } from '../ui';
import { safeRender } from '../../utils/safe-render';
import type { Alerta, AlertaSeveridade } from '../../types';

interface AlertasSectionProps {
  alertas: Alerta[];
}

const severidadeConfig: Record<AlertaSeveridade, {
  icon: React.ReactNode;
  bgColor: string;
  borderColor: string;
  textColor: string;
}> = {
  alta: {
    icon: <AlertTriangle className="w-5 h-5" />,
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-200 dark:border-red-800/40',
    textColor: 'text-red-800 dark:text-red-300'
  },
  media: {
    icon: <AlertCircle className="w-5 h-5" />,
    bgColor: 'bg-amber-50 dark:bg-amber-900/20',
    borderColor: 'border-amber-200 dark:border-amber-800/40',
    textColor: 'text-amber-800 dark:text-amber-300'
  },
  baixa: {
    icon: <Info className="w-5 h-5" />,
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800/40',
    textColor: 'text-blue-800 dark:text-blue-300'
  }
};

export const AlertasSection: React.FC<AlertasSectionProps> = ({ alertas }) => {
  const alertasAlta = alertas.filter(a => a.severidade === 'alta');
  const alertasMedia = alertas.filter(a => a.severidade === 'media');
  const alertasBaixa = alertas.filter(a => a.severidade === 'baixa');

  const sortedAlertas = [...alertasAlta, ...alertasMedia, ...alertasBaixa];

  return (
    <AccordionItem
      title={`Alertas (${alertas.length})`}
      icon={<AlertTriangle className="w-5 h-5" />}
      defaultOpen={alertasAlta.length > 0}
    >
      <div className="space-y-3">
        {/* Resumo por severidade */}
        <div className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
          {alertasAlta.length > 0 && (
            <Badge variant="danger">{alertasAlta.length} alta</Badge>
          )}
          {alertasMedia.length > 0 && (
            <Badge variant="warning">{alertasMedia.length} média</Badge>
          )}
          {alertasBaixa.length > 0 && (
            <Badge variant="info">{alertasBaixa.length} baixa</Badge>
          )}
        </div>

        {/* Lista de alertas */}
        <div className="space-y-3">
          {sortedAlertas.map((alerta, idx) => {
            const config = severidadeConfig[alerta.severidade];
            return (
              <div
                key={idx}
                className={`p-4 rounded-lg border ${config.bgColor} ${config.borderColor}`}
              >
                <div className="flex items-start gap-3">
                  <div className={config.textColor}>
                    {config.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`font-medium ${config.textColor}`}>
                        {alerta.tipo}
                      </span>
                      <Badge
                        variant={
                          alerta.severidade === 'alta' ? 'danger' :
                          alerta.severidade === 'media' ? 'warning' : 'info'
                        }
                      >
                        {alerta.severidade}
                      </Badge>
                    </div>
                    <p className={`text-sm ${config.textColor} opacity-90`}>
                      {safeRender(alerta.descricao)}
                    </p>
                    {alerta.recomendacao && (
                      <p className={`text-sm ${config.textColor} opacity-75 mt-2 italic`}>
                        <strong>Recomendação:</strong> {safeRender(alerta.recomendacao)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AccordionItem>
  );
};

export default AlertasSection;

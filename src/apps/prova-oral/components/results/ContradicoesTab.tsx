/**
 * @file ContradicoesTab.tsx
 * @description Tab de contradições identificadas
 */

import React from 'react';
import { AlertTriangle, Users } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Badge } from '../ui';
import { getRelevanciaStyle, getRelevanciaLabel } from '../../constants';
import type { Contradicao } from '../../types';

interface ContradicoesTabProps {
  contradicoes: Contradicao[];
}

export const ContradicoesTab: React.FC<ContradicoesTabProps> = ({ contradicoes }) => {
  if (!contradicoes || contradicoes.length === 0) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
        <p className="text-slate-500 dark:text-slate-400">
          Nenhuma contradição identificada na análise.
        </p>
        <p className="text-sm text-slate-400 dark:text-slate-500 mt-2">
          Isso pode indicar que os depoimentos foram coerentes entre si.
        </p>
      </div>
    );
  }

  // Ordenar por relevância (alta primeiro)
  const sorted = [...contradicoes].sort((a, b) => {
    const order = { alta: 0, media: 1, baixa: 2 };
    return order[a.relevancia] - order[b.relevancia];
  });

  return (
    <div className="space-y-4">
      {/* Resumo */}
      <div className="flex items-center gap-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
        <AlertTriangle className="w-6 h-6 text-amber-500" />
        <div>
          <p className="font-medium text-amber-800 dark:text-amber-200">
            {contradicoes.length} contradição{contradicoes.length !== 1 ? 'ões' : ''} identificada{contradicoes.length !== 1 ? 's' : ''}
          </p>
          <p className="text-sm text-amber-700 dark:text-amber-300">
            {contradicoes.filter(c => c.relevancia === 'alta').length} de alta relevância
          </p>
        </div>
      </div>

      {/* Lista */}
      {sorted.map((contradicao, index) => {
        const relevanciaStyle = getRelevanciaStyle(contradicao.relevancia);

        return (
          <Card key={index} className={`border-l-4 ${
            contradicao.relevancia === 'alta' ? 'border-red-500' :
            contradicao.relevancia === 'media' ? 'border-amber-500' : 'border-blue-500'
          }`}>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <CardTitle icon={<AlertTriangle className="w-5 h-5" />}>
                  {contradicao.tema}
                </CardTitle>
                <Badge className={`${relevanciaStyle.bg} ${relevanciaStyle.text}`}>
                  Relevância {getRelevanciaLabel(contradicao.relevancia)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Depoentes envolvidos */}
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <Users className="w-4 h-4 text-slate-400" />
                <span>Envolvidos: </span>
                <div className="flex flex-wrap gap-1">
                  {contradicao.depoentes.map((nome, i) => (
                    <Badge key={i} variant="neutral">
                      {nome}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Descrição */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <p className="text-sm text-slate-700 dark:text-slate-200">
                  {contradicao.descricao}
                </p>
              </div>

              {/* Impacto */}
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <p className="text-xs font-medium text-amber-700 dark:text-amber-300 uppercase mb-1">
                  Impacto
                </p>
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  {contradicao.impacto}
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default ContradicoesTab;

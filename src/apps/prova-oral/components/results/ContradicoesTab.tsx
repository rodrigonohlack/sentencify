/**
 * @file ContradicoesTab.tsx
 * @description Tab de contradições identificadas
 * Baseado no protótipo v2 com tipo (interna/externa) e timestamps
 */

import React from 'react';
import { AlertTriangle, Users, Clock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Badge } from '../ui';
import { getRelevanciaStyle, getRelevanciaLabel } from '../../constants';
import type { Contradicao } from '../../types';

interface ContradicoesTabProps {
  contradicoes: Contradicao[];
}

/** Badge de timestamp */
const TimestampBadge: React.FC<{ timestamp: string }> = ({ timestamp }) => (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs rounded-full font-mono flex-shrink-0">
    <Clock className="w-3 h-3" />{timestamp}
  </span>
);

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

        // Título: usa tema (antigo) ou depoente (novo)
        const titulo = contradicao.tema || contradicao.depoente || 'Contradição';

        return (
          <Card key={index} className={`border-l-4 ${
            contradicao.relevancia === 'alta' ? 'border-red-500' :
            contradicao.relevancia === 'media' ? 'border-amber-500' : 'border-blue-500'
          }`}>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <CardTitle icon={<AlertTriangle className="w-5 h-5" />}>
                  {titulo}
                </CardTitle>
                <div className="flex items-center gap-2">
                  {/* Tipo de contradição (novo formato) */}
                  {contradicao.tipo && (
                    <Badge className={`${
                      contradicao.tipo === 'interna'
                        ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300'
                        : 'bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300'
                    }`}>
                      {contradicao.tipo === 'interna' ? 'Contradição Interna' : 'Contradição Externa'}
                    </Badge>
                  )}
                  <Badge className={`${relevanciaStyle.bg} ${relevanciaStyle.text}`}>
                    Relevância {getRelevanciaLabel(contradicao.relevancia)}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Depoentes envolvidos (formato antigo) */}
              {contradicao.depoentes && contradicao.depoentes.length > 0 && (
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
              )}

              {/* Timestamps (novo formato) */}
              {contradicao.timestamps && contradicao.timestamps.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {contradicao.timestamps.map((t, j) => (
                    <TimestampBadge key={j} timestamp={t} />
                  ))}
                </div>
              )}

              {/* Descrição */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <p className="text-sm text-slate-700 dark:text-slate-200">
                  {contradicao.descricao}
                </p>
              </div>

              {/* Análise (novo formato) ou Impacto (formato antigo) */}
              {(contradicao.analise || contradicao.impacto) && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-300 uppercase mb-1">
                    {contradicao.analise ? 'Análise' : 'Impacto'}
                  </p>
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    {contradicao.analise || contradicao.impacto}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default ContradicoesTab;

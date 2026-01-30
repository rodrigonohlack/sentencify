/**
 * @file CredibilidadeTab.tsx
 * @description Tab de avaliação de credibilidade dos depoentes
 */

import React from 'react';
import { UserCheck, ThumbsUp, ThumbsDown, Minus } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Badge } from '../ui';
import { getQualificacaoStyle, getQualificacaoLabel, getCredibilidadeStyle, getCredibilidadeLabel } from '../../constants';
import type { AvaliacaoCredibilidade } from '../../types';

interface CredibilidadeTabProps {
  credibilidade: AvaliacaoCredibilidade[];
}

export const CredibilidadeTab: React.FC<CredibilidadeTabProps> = ({ credibilidade }) => {
  if (!credibilidade || credibilidade.length === 0) {
    return (
      <div className="text-center py-12">
        <UserCheck className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
        <p className="text-slate-500 dark:text-slate-400">
          Nenhuma avaliação de credibilidade disponível.
        </p>
      </div>
    );
  }

  // Ordenar por credibilidade (alta primeiro)
  const sorted = [...credibilidade].sort((a, b) => {
    const order = { alta: 0, media: 1, baixa: 2 };
    return order[a.nivel] - order[b.nivel];
  });

  // Estatísticas
  const stats = {
    alta: credibilidade.filter(c => c.nivel === 'alta').length,
    media: credibilidade.filter(c => c.nivel === 'media').length,
    baixa: credibilidade.filter(c => c.nivel === 'baixa').length,
  };

  return (
    <div className="space-y-6">
      {/* Resumo */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl text-center">
          <ThumbsUp className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
            {stats.alta}
          </p>
          <p className="text-sm text-emerald-600 dark:text-emerald-400">
            Alta Credibilidade
          </p>
        </div>
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-center">
          <Minus className="w-6 h-6 text-amber-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
            {stats.media}
          </p>
          <p className="text-sm text-amber-600 dark:text-amber-400">
            Média Credibilidade
          </p>
        </div>
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-center">
          <ThumbsDown className="w-6 h-6 text-red-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-red-700 dark:text-red-300">
            {stats.baixa}
          </p>
          <p className="text-sm text-red-600 dark:text-red-400">
            Baixa Credibilidade
          </p>
        </div>
      </div>

      {/* Lista */}
      <div className="space-y-4">
        {sorted.map((avaliacao) => {
          const qualStyle = getQualificacaoStyle(avaliacao.qualificacao);
          const credStyle = getCredibilidadeStyle(avaliacao.nivel);

          return (
            <Card
              key={avaliacao.deponenteId}
              className={`border-l-4 ${
                avaliacao.nivel === 'alta' ? 'border-emerald-500' :
                avaliacao.nivel === 'media' ? 'border-amber-500' : 'border-red-500'
              }`}
            >
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <CardTitle icon={<UserCheck className="w-5 h-5" />}>
                      {avaliacao.deponenteNome}
                    </CardTitle>
                    <Badge className={`${qualStyle.bg} ${qualStyle.text}`}>
                      {getQualificacaoLabel(avaliacao.qualificacao)}
                    </Badge>
                  </div>
                  <Badge className={`${credStyle.bg} ${credStyle.text}`}>
                    Credibilidade {getCredibilidadeLabel(avaliacao.nivel)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Fundamentação */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <p className="text-sm text-slate-700 dark:text-slate-200">
                    {avaliacao.fundamentacao}
                  </p>
                </div>

                {/* Pontos */}
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Positivos */}
                  {avaliacao.pontosPositivos.length > 0 && (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <ThumbsUp className="w-4 h-4 text-emerald-500" />
                        <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                          Pontos Positivos
                        </span>
                      </div>
                      <ul className="space-y-1">
                        {avaliacao.pontosPositivos.map((ponto, i) => (
                          <li key={i} className="text-sm text-emerald-600 dark:text-emerald-400 flex items-start gap-2">
                            <span className="text-emerald-400">+</span>
                            <span>{ponto}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Negativos */}
                  {avaliacao.pontosNegativos.length > 0 && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <ThumbsDown className="w-4 h-4 text-red-500" />
                        <span className="text-sm font-medium text-red-700 dark:text-red-300">
                          Pontos Negativos
                        </span>
                      </div>
                      <ul className="space-y-1">
                        {avaliacao.pontosNegativos.map((ponto, i) => (
                          <li key={i} className="text-sm text-red-600 dark:text-red-400 flex items-start gap-2">
                            <span className="text-red-400">-</span>
                            <span>{ponto}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default CredibilidadeTab;

/**
 * @file CredibilidadeTab.tsx
 * @description Tab de avaliação de credibilidade dos depoentes
 * Baseado no protótipo v2 com pontuação de estrelas e critérios estruturados
 */

import React from 'react';
import { UserCheck, ThumbsUp, ThumbsDown, Minus, Star } from 'lucide-react';
import { Card, CardContent, Badge } from '../ui';
import { getQualificacaoStyle, getQualificacaoLabel, getCredibilidadeStyle, getCredibilidadeLabel } from '../../constants';
import type { AvaliacaoCredibilidade, Depoente } from '../../types';

interface CredibilidadeTabProps {
  credibilidade: AvaliacaoCredibilidade[];
  depoentes?: Depoente[];
}

/** Renderiza estrelas de pontuação */
const StarRating: React.FC<{ pontuacao: number }> = ({ pontuacao }) => (
  <div className="flex">
    {Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < pontuacao
            ? 'text-amber-400 fill-amber-400'
            : 'text-slate-200 dark:text-slate-600'
        }`}
      />
    ))}
  </div>
);

export const CredibilidadeTab: React.FC<CredibilidadeTabProps> = ({ credibilidade, depoentes = [] }) => {
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

  // Função para buscar depoente
  const getDepoente = (id: string): Depoente | undefined =>
    depoentes.find(d => d.id === id);

  // Verifica se tem o novo formato (pontuacao e criterios)
  const hasNewFormat = credibilidade.some(c => c.pontuacao !== undefined || c.criterios !== undefined);

  // Ordenar por credibilidade/pontuação (alta/maior primeiro)
  const sorted = [...credibilidade].sort((a, b) => {
    if (hasNewFormat) {
      return (b.pontuacao || 3) - (a.pontuacao || 3);
    }
    const order = { alta: 0, media: 1, baixa: 2 };
    return (order[a.nivel || 'media'] || 1) - (order[b.nivel || 'media'] || 1);
  });

  // Estatísticas
  const stats = hasNewFormat
    ? {
        alta: credibilidade.filter(c => (c.pontuacao || 3) >= 4).length,
        media: credibilidade.filter(c => (c.pontuacao || 3) === 3).length,
        baixa: credibilidade.filter(c => (c.pontuacao || 3) <= 2).length,
      }
    : {
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

      {/* Lista - Grid para novo formato, lista para antigo */}
      <div className={hasNewFormat ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-4'}>
        {sorted.map((avaliacao, index) => {
          const dep = getDepoente(avaliacao.deponenteId);
          const qualificacao = avaliacao.qualificacao || dep?.qualificacao;
          const qualStyle = qualificacao ? getQualificacaoStyle(qualificacao) : { bg: 'bg-slate-100', text: 'text-slate-700' };

          // Determina nível baseado na pontuação ou no nivel direto
          const nivel = avaliacao.nivel || (
            (avaliacao.pontuacao || 3) >= 4 ? 'alta' :
            (avaliacao.pontuacao || 3) <= 2 ? 'baixa' : 'media'
          );
          const credStyle = getCredibilidadeStyle(nivel);

          // Nome do depoente
          const nome = avaliacao.deponenteNome || dep?.nome || avaliacao.deponenteId;

          return (
            <Card
              key={avaliacao.deponenteId || index}
              className={`border-l-4 ${
                nivel === 'alta' ? 'border-emerald-500' :
                nivel === 'media' ? 'border-amber-500' : 'border-red-500'
              }`}
            >
              <CardContent>
                {/* Header com nome e pontuação */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100">{nome}</h3>
                    {qualificacao && (
                      <Badge className={`mt-1 ${qualStyle.bg} ${qualStyle.text}`}>
                        {getQualificacaoLabel(qualificacao)}
                      </Badge>
                    )}
                  </div>
                  {/* Estrelas (novo formato) ou Badge (antigo) */}
                  {avaliacao.pontuacao !== undefined ? (
                    <StarRating pontuacao={avaliacao.pontuacao} />
                  ) : (
                    <Badge className={`${credStyle.bg} ${credStyle.text}`}>
                      {getCredibilidadeLabel(nivel)}
                    </Badge>
                  )}
                </div>

                {/* ═══════════════════════════════════════════════════════════ */}
                {/* NOVO FORMATO: Critérios estruturados */}
                {/* ═══════════════════════════════════════════════════════════ */}
                {avaliacao.criterios && (
                  <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Conhecimento direto:</span>
                      <span className={avaliacao.criterios.conhecimentoDireto ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                        {avaliacao.criterios.conhecimentoDireto ? 'Sim' : 'Não'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Contemporaneidade:</span>
                      <span className="text-slate-700 dark:text-slate-300">{avaliacao.criterios.contemporaneidade}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Coerência:</span>
                      <span className="text-slate-700 dark:text-slate-300">{avaliacao.criterios.coerenciaInterna}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Interesse:</span>
                      <span className={avaliacao.criterios.interesseLitigio === 'alto' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}>
                        {avaliacao.criterios.interesseLitigio}
                      </span>
                    </div>
                  </div>
                )}

                {/* Avaliação Geral (novo) ou Fundamentação (antigo) */}
                {(avaliacao.avaliacaoGeral || avaliacao.fundamentacao) && (
                  <div className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      {avaliacao.avaliacaoGeral || avaliacao.fundamentacao}
                    </p>
                  </div>
                )}

                {/* ═══════════════════════════════════════════════════════════ */}
                {/* FORMATO ANTIGO: Pontos positivos/negativos */}
                {/* ═══════════════════════════════════════════════════════════ */}
                {!hasNewFormat && (
                  <div className="grid md:grid-cols-2 gap-4 mt-3">
                    {/* Positivos */}
                    {avaliacao.pontosPositivos && avaliacao.pontosPositivos.length > 0 && (
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
                    {avaliacao.pontosNegativos && avaliacao.pontosNegativos.length > 0 && (
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
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default CredibilidadeTab;

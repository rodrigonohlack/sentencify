/**
 * @file AnalisesTab.tsx
 * @description Tab de análises por tema/pedido
 * Baseado no protótipo v2 com alegacaoAutor, defesaRe, provaOral
 */

import React, { useState } from 'react';
import { Scale, ChevronDown, ChevronUp, MessageSquare, Clock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Badge } from '../ui';
import {
  getStatusStyle,
  getStatusLabel,
  getRelevanciaStyle,
  getRelevanciaLabel,
  getFavorabilidadeStyle,
  getFavorabilidadeLabel,
  getQualificacaoLabel,
} from '../../constants';
import type { AnaliseTemaPedido } from '../../types';

interface AnalisesTabProps {
  analises: AnaliseTemaPedido[];
}

/** Badge de timestamp */
const TimestampBadge: React.FC<{ timestamp: string }> = ({ timestamp }) => (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs rounded-full font-mono flex-shrink-0">
    <Clock className="w-3 h-3" />{timestamp}
  </span>
);

export const AnalisesTab: React.FC<AnalisesTabProps> = ({ analises }) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  if (!analises || analises.length === 0) {
    return (
      <div className="text-center py-12">
        <Scale className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
        <p className="text-slate-500 dark:text-slate-400">
          Nenhuma análise temática disponível.
        </p>
      </div>
    );
  }

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <div className="space-y-4">
      {analises.map((analise, index) => {
        // Suporta ambos formatos: status (novo) e conclusao (antigo)
        const status = analise.status || analise.conclusao;
        const statusStyle = getStatusStyle(status);
        const relevanciaStyle = analise.relevancia ? getRelevanciaStyle(analise.relevancia) : null;
        const isExpanded = expandedIndex === index;

        // Título: suporta titulo (novo) e tema (antigo)
        const titulo = analise.titulo || analise.tema || 'Tema não identificado';

        // Verifica se tem o novo formato (provaOral) ou o antigo (declaracoes)
        const hasNewFormat = analise.provaOral && analise.provaOral.length > 0;

        return (
          <Card key={index} className={`border-l-4 ${statusStyle.border}`}>
            {/* Header clicável */}
            <button
              onClick={() => toggleExpand(index)}
              className="w-full text-left"
            >
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <CardTitle icon={<Scale className="w-5 h-5" />}>
                    {titulo}
                  </CardTitle>
                  {analise.descricao && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 truncate">
                      {analise.descricao}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge className={`${statusStyle.bg} ${statusStyle.text}`}>
                    {getStatusLabel(status)}
                  </Badge>
                  {relevanciaStyle && (
                    <Badge className={`${relevanciaStyle.bg} ${relevanciaStyle.text}`}>
                      {getRelevanciaLabel(analise.relevancia!)}
                    </Badge>
                  )}
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  )}
                </div>
              </CardHeader>
            </button>

            {/* Content expandível */}
            {isExpanded && (
              <CardContent className="border-t border-slate-200 dark:border-slate-700 space-y-4">
                {/* ═══════════════════════════════════════════════════════════ */}
                {/* NOVO FORMATO: Alegação do Autor x Defesa da Ré */}
                {/* ═══════════════════════════════════════════════════════════ */}
                {(analise.alegacaoAutor || analise.defesaRe) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-100 dark:border-blue-800">
                      <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase mb-1">
                        Alegação do Autor
                      </p>
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        {analise.alegacaoAutor || '-'}
                      </p>
                    </div>
                    <div className="bg-rose-50 dark:bg-rose-900/20 rounded-lg p-3 border border-rose-100 dark:border-rose-800">
                      <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase mb-1">
                        Defesa da Ré
                      </p>
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        {analise.defesaRe || '-'}
                      </p>
                    </div>
                  </div>
                )}

                {/* ═══════════════════════════════════════════════════════════ */}
                {/* NOVO FORMATO: Prova Oral (com timestamps) */}
                {/* ═══════════════════════════════════════════════════════════ */}
                {hasNewFormat && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2">
                      Prova Oral
                    </p>
                    <div className="space-y-2">
                      {analise.provaOral!.map((p, j) => (
                        <div key={j} className="flex gap-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 text-sm">
                          <span className="font-semibold text-slate-700 dark:text-slate-200 flex-shrink-0">
                            {p.deponente}:
                          </span>
                          <p className="text-slate-600 dark:text-slate-300 flex-1">{p.conteudo}</p>
                          {p.timestamp && <TimestampBadge timestamp={p.timestamp} />}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ═══════════════════════════════════════════════════════════ */}
                {/* FORMATO ANTIGO: Declarações (retrocompatibilidade) */}
                {/* ═══════════════════════════════════════════════════════════ */}
                {!hasNewFormat && analise.declaracoes && analise.declaracoes.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Declarações
                    </h4>
                    <div className="space-y-3">
                      {analise.declaracoes.map((decl, i) => {
                        const favStyle = getFavorabilidadeStyle(decl.favoravel);

                        return (
                          <div
                            key={i}
                            className={`p-3 rounded-lg border ${favStyle.bg} border-slate-200 dark:border-slate-700`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                {decl.deponenteNome}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                  {getQualificacaoLabel(decl.qualificacao)}
                                </span>
                                <Badge className={`text-xs ${favStyle.bg} ${favStyle.text}`}>
                                  {getFavorabilidadeLabel(decl.favoravel)}
                                </Badge>
                              </div>
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-300">
                              {decl.declaracao}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ═══════════════════════════════════════════════════════════ */}
                {/* Conclusão / Fundamentação */}
                {/* ═══════════════════════════════════════════════════════════ */}
                {(analise.conclusao || analise.fundamentacao) && (
                  <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3 border border-indigo-100 dark:border-indigo-800">
                    <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase mb-1">
                      {hasNewFormat ? 'Conclusão Probatória' : 'Fundamentação'}
                    </p>
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      {typeof analise.conclusao === 'string' && analise.conclusao.length > 50
                        ? analise.conclusao
                        : analise.fundamentacao || analise.conclusao}
                    </p>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
};

export default AnalisesTab;

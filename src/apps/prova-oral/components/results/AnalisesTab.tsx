/**
 * @file AnalisesTab.tsx
 * @description Tab de análises por tema/pedido
 */

import React, { useState } from 'react';
import { Scale, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';
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
        const statusStyle = getStatusStyle(analise.conclusao);
        const relevanciaStyle = getRelevanciaStyle(analise.relevancia);
        const isExpanded = expandedIndex === index;

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
                    {analise.tema}
                  </CardTitle>
                  {analise.descricao && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 truncate">
                      {analise.descricao}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge className={`${statusStyle.bg} ${statusStyle.text}`}>
                    {getStatusLabel(analise.conclusao)}
                  </Badge>
                  <Badge className={`${relevanciaStyle.bg} ${relevanciaStyle.text}`}>
                    {getRelevanciaLabel(analise.relevancia)}
                  </Badge>
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
                {/* Declarações */}
                {analise.declaracoes.length > 0 && (
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

                {/* Fundamentação */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                  <h4 className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                    Fundamentação
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {analise.fundamentacao}
                  </p>
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
};

export default AnalisesTab;

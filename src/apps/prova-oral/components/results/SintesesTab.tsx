/**
 * @file SintesesTab.tsx
 * @description Tab de sínteses dos depoimentos
 */

import React from 'react';
import { FileText, Quote } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Badge } from '../ui';
import { getQualificacaoStyle, getQualificacaoLabel } from '../../constants';
import type { Sintese } from '../../types';

interface SintesesTabProps {
  sinteses: Sintese[];
}

export const SintesesTab: React.FC<SintesesTabProps> = ({ sinteses }) => {
  if (!sinteses || sinteses.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
        <p className="text-slate-500 dark:text-slate-400">
          Nenhuma síntese de depoimento disponível.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {sinteses.map((sintese, index) => {
        const style = getQualificacaoStyle(sintese.qualificacao);

        return (
          <Card key={`${sintese.deponenteId}-${index}`}>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <CardTitle icon={<FileText className="w-5 h-5" />}>
                  {sintese.deponenteNome}
                </CardTitle>
                <Badge className={`${style.bg} ${style.text}`}>
                  {getQualificacaoLabel(sintese.qualificacao)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Pontos Principais */}
              <div>
                <h4 className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                  Pontos Principais
                </h4>
                <ul className="space-y-2">
                  {sintese.pontosPrincipais.map((ponto, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300"
                    >
                      <span className="text-indigo-500 mt-1">•</span>
                      <span>{ponto}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Trecho Relevante */}
              {sintese.trechoRelevante && (
                <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border-l-4 border-indigo-500">
                  <div className="flex items-start gap-2">
                    <Quote className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-slate-600 dark:text-slate-300 italic">
                      "{sintese.trechoRelevante}"
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default SintesesTab;

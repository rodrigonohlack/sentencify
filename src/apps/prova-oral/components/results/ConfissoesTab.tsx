/**
 * @file ConfissoesTab.tsx
 * @description Tab de confissões identificadas
 */

import React from 'react';
import { MessageSquareQuote, Quote } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Badge } from '../ui';
import { getQualificacaoStyle, getQualificacaoLabel, getRelevanciaStyle, getRelevanciaLabel } from '../../constants';
import type { Confissao } from '../../types';

interface ConfissoesTabProps {
  confissoes: Confissao[];
}

export const ConfissoesTab: React.FC<ConfissoesTabProps> = ({ confissoes }) => {
  if (!confissoes || confissoes.length === 0) {
    return (
      <div className="text-center py-12">
        <MessageSquareQuote className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
        <p className="text-slate-500 dark:text-slate-400">
          Nenhuma confissão identificada na análise.
        </p>
      </div>
    );
  }

  // Separar por tipo
  const confissoesReais = confissoes.filter(c => c.tipo === 'real');
  const confissoesFictas = confissoes.filter(c => c.tipo === 'ficta');

  return (
    <div className="space-y-6">
      {/* Resumo */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
            {confissoesReais.length}
          </p>
          <p className="text-sm text-emerald-600 dark:text-emerald-400">
            Confissões Reais
          </p>
        </div>
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
          <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
            {confissoesFictas.length}
          </p>
          <p className="text-sm text-amber-600 dark:text-amber-400">
            Confissões Fictas
          </p>
        </div>
      </div>

      {/* Confissões Reais */}
      {confissoesReais.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-3">
            Confissões Reais
          </h3>
          <div className="space-y-4">
            {confissoesReais.map((confissao, index) => (
              <ConfissaoCard key={`real-${index}`} confissao={confissao} />
            ))}
          </div>
        </div>
      )}

      {/* Confissões Fictas */}
      {confissoesFictas.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-3">
            Confissões Fictas
          </h3>
          <div className="space-y-4">
            {confissoesFictas.map((confissao, index) => (
              <ConfissaoCard key={`ficta-${index}`} confissao={confissao} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const ConfissaoCard: React.FC<{ confissao: Confissao }> = ({ confissao }) => {
  const qualStyle = getQualificacaoStyle(confissao.qualificacao);
  const relStyle = getRelevanciaStyle(confissao.relevancia);

  return (
    <Card className={`border-l-4 ${
      confissao.tipo === 'real' ? 'border-emerald-500' : 'border-amber-500'
    }`}>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <CardTitle icon={<MessageSquareQuote className="w-5 h-5" />}>
              {confissao.deponenteNome}
            </CardTitle>
            <Badge className={`${qualStyle.bg} ${qualStyle.text}`}>
              {getQualificacaoLabel(confissao.qualificacao)}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={`${relStyle.bg} ${relStyle.text}`}>
              {getRelevanciaLabel(confissao.relevancia)}
            </Badge>
            <Badge className={confissao.tipo === 'real' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300'}>
              {confissao.tipo === 'real' ? 'Real' : 'Ficta'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Tema */}
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400 uppercase mb-1">
            Tema
          </p>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
            {confissao.tema}
          </p>
        </div>

        {/* Declaração */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border-l-4 border-indigo-500">
          <div className="flex items-start gap-2">
            <Quote className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-slate-600 dark:text-slate-300 italic">
              "{confissao.declaracao}"
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ConfissoesTab;

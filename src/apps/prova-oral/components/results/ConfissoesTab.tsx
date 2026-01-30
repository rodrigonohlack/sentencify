/**
 * @file ConfissoesTab.tsx
 * @description Tab de confissões identificadas
 * Baseado no protótipo v2 com tipo (autor/preposto), timestamps e implicação
 */

import React from 'react';
import { MessageSquareQuote, Quote, Clock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Badge } from '../ui';
import { getQualificacaoStyle, getQualificacaoLabel, getRelevanciaStyle, getRelevanciaLabel } from '../../constants';
import type { Confissao, Relevancia } from '../../types';

interface ConfissoesTabProps {
  confissoes: Confissao[];
}

/** Badge de timestamp */
const TimestampBadge: React.FC<{ timestamp: string }> = ({ timestamp }) => (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs rounded-full font-mono flex-shrink-0">
    <Clock className="w-3 h-3" />{timestamp}
  </span>
);

/** Barra de gravidade */
const GravidadeBar: React.FC<{ gravidade: Relevancia }> = ({ gravidade }) => {
  const colors: Record<Relevancia, string> = {
    'alta': 'bg-rose-500',
    'media': 'bg-amber-500',
    'baixa': 'bg-slate-400'
  };
  return <div className={`absolute top-0 left-0 w-1 h-full ${colors[gravidade] || 'bg-slate-400'}`} />;
};

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

  // Separar por tipo (suporta ambos formatos)
  const confissoesAutor = confissoes.filter(c => c.tipo === 'autor' || c.qualificacao === 'autor');
  const confissoesPreposto = confissoes.filter(c => c.tipo === 'preposto' || c.qualificacao === 'preposto');
  // Formato antigo: real/ficta
  const confissoesReais = confissoes.filter(c => (c as any).tipo === 'real');
  const confissoesFictas = confissoes.filter(c => (c as any).tipo === 'ficta');

  const hasNewFormat = confissoesAutor.length > 0 || confissoesPreposto.length > 0;

  return (
    <div className="space-y-6">
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* NOVO FORMATO: Autor / Preposto */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {hasNewFormat && (
        <>
          {/* Resumo */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                {confissoesAutor.length}
              </p>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                Admissões do Autor
              </p>
            </div>
            <div className="p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl">
              <p className="text-2xl font-bold text-rose-700 dark:text-rose-300">
                {confissoesPreposto.length}
              </p>
              <p className="text-sm text-rose-600 dark:text-rose-400">
                Confissões do Preposto
              </p>
            </div>
          </div>

          {/* Cards em grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {confissoes.map((confissao, index) => (
              <ConfissaoCardNew key={index} confissao={confissao} />
            ))}
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* FORMATO ANTIGO: Real / Ficta */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {!hasNewFormat && (
        <>
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
                  <ConfissaoCardOld key={`real-${index}`} confissao={confissao} />
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
                  <ConfissaoCardOld key={`ficta-${index}`} confissao={confissao} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

/** Card de confissão - Novo formato (autor/preposto com timestamp) */
const ConfissaoCardNew: React.FC<{ confissao: Confissao }> = ({ confissao }) => {
  const isPreposto = confissao.tipo === 'preposto';
  const gravidade = confissao.gravidade || confissao.relevancia || 'media';

  return (
    <Card className="relative overflow-hidden">
      <GravidadeBar gravidade={gravidade} />
      <CardContent className="pl-4">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <Badge className={`${
            isPreposto
              ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300'
              : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
          }`}>
            {isPreposto ? 'Confissão do Preposto' : 'Admissão do Autor'}
          </Badge>
          {confissao.timestamp && <TimestampBadge timestamp={confissao.timestamp} />}
        </div>

        <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm mb-2">
          {confissao.tema}
        </h3>

        <blockquote className="text-sm text-slate-600 dark:text-slate-300 italic border-l-2 border-slate-200 dark:border-slate-600 pl-2 mb-2">
          "{confissao.trecho || confissao.declaracao}"
        </blockquote>

        {confissao.implicacao && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium text-slate-600 dark:text-slate-300">Implicação:</span> {confissao.implicacao}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

/** Card de confissão - Formato antigo (real/ficta) */
const ConfissaoCardOld: React.FC<{ confissao: Confissao }> = ({ confissao }) => {
  const qualStyle = confissao.qualificacao ? getQualificacaoStyle(confissao.qualificacao) : { bg: 'bg-slate-100', text: 'text-slate-700' };
  const relStyle = confissao.relevancia ? getRelevanciaStyle(confissao.relevancia) : { bg: 'bg-slate-100', text: 'text-slate-700' };
  const isReal = (confissao as any).tipo === 'real';

  return (
    <Card className={`border-l-4 ${isReal ? 'border-emerald-500' : 'border-amber-500'}`}>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <CardTitle icon={<MessageSquareQuote className="w-5 h-5" />}>
              {confissao.deponenteNome || 'Depoente'}
            </CardTitle>
            {confissao.qualificacao && (
              <Badge className={`${qualStyle.bg} ${qualStyle.text}`}>
                {getQualificacaoLabel(confissao.qualificacao)}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {confissao.relevancia && (
              <Badge className={`${relStyle.bg} ${relStyle.text}`}>
                {getRelevanciaLabel(confissao.relevancia)}
              </Badge>
            )}
            <Badge className={isReal ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300'}>
              {isReal ? 'Real' : 'Ficta'}
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
              "{confissao.declaracao || confissao.trecho}"
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ConfissoesTab;

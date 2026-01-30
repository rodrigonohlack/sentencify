/**
 * @file ComparativoTab.tsx
 * @description Tab de quadro comparativo das análises por tema
 */

import React from 'react';
import { Table, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent, Badge } from '../ui';
import { getStatusStyle, getStatusLabel } from '../../constants';
import type { AnaliseTemaPedido, ProvaOralResult, StatusAnalise } from '../../types';

interface ComparativoTabProps {
  resultado: ProvaOralResult;
}

export const ComparativoTab: React.FC<ComparativoTabProps> = ({ resultado }) => {
  const { analises, processo } = resultado;

  if (!analises || analises.length === 0) {
    return (
      <div className="text-center py-12">
        <Table className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
        <p className="text-slate-500 dark:text-slate-400">
          Nenhuma análise temática para comparar.
        </p>
      </div>
    );
  }

  // Estatísticas gerais (suporta novo formato: status, e antigo: conclusao)
  const getStatus = (a: AnaliseTemaPedido): StatusAnalise =>
    (a.status || a.conclusao) as StatusAnalise;

  const stats = {
    total: analises.length,
    favoravelAutor: analises.filter(a => getStatus(a) === 'favoravel-autor').length,
    favoravelRe: analises.filter(a => getStatus(a) === 'favoravel-re').length,
    parcial: analises.filter(a => getStatus(a) === 'parcial').length,
    inconclusivo: analises.filter(a => getStatus(a) === 'inconclusivo').length,
  };

  return (
    <div className="space-y-6">
      {/* Header com informações do processo */}
      {processo && (processo.numeroProcesso || processo.reclamante || processo.reclamada) && (
        <Card className="bg-slate-50 dark:bg-slate-800/50">
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              {processo.numeroProcesso && (
                <div>
                  <p className="text-slate-500 dark:text-slate-400">Processo</p>
                  <p className="font-medium text-slate-800 dark:text-slate-100">
                    {processo.numeroProcesso}
                  </p>
                </div>
              )}
              {processo.reclamante && (
                <div>
                  <p className="text-slate-500 dark:text-slate-400">Reclamante</p>
                  <p className="font-medium text-slate-800 dark:text-slate-100">
                    {processo.reclamante}
                  </p>
                </div>
              )}
              {processo.reclamada && (
                <div>
                  <p className="text-slate-500 dark:text-slate-400">Reclamada</p>
                  <p className="font-medium text-slate-800 dark:text-slate-100">
                    {processo.reclamada}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resumo visual */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Favorável ao Autor"
          value={stats.favoravelAutor}
          total={stats.total}
          color="emerald"
        />
        <StatCard
          icon={<TrendingDown className="w-5 h-5" />}
          label="Favorável à Ré"
          value={stats.favoravelRe}
          total={stats.total}
          color="red"
        />
        <StatCard
          icon={<Minus className="w-5 h-5" />}
          label="Prova Dividida"
          value={stats.parcial}
          total={stats.total}
          color="amber"
        />
        <StatCard
          icon={<Minus className="w-5 h-5" />}
          label="Inconclusivo"
          value={stats.inconclusivo}
          total={stats.total}
          color="slate"
        />
      </div>

      {/* Tabela comparativa */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Tema/Pedido
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Depoentes
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Conclusão
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Resumo
                </th>
              </tr>
            </thead>
            <tbody>
              {analises.map((analise, index) => (
                <ComparativoRow key={index} analise={analise} />
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Legenda */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
        <span className="font-medium">Legenda:</span>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <span>Favorável ao Autor</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span>Favorável à Ré</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-amber-500" />
          <span>Prova Dividida</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-slate-400" />
          <span>Inconclusivo</span>
        </div>
      </div>
    </div>
  );
};

// Componente de estatística
const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: number;
  total: number;
  color: 'emerald' | 'red' | 'amber' | 'slate';
}> = ({ icon, label, value, total, color }) => {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;

  const colorClasses = {
    emerald: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400',
    red: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400',
    amber: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400',
    slate: 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400',
  };

  return (
    <div className={`p-4 rounded-xl border ${colorClasses[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold">{value}</span>
        <span className="text-sm opacity-70">({percentage}%)</span>
      </div>
    </div>
  );
};

// Linha da tabela
const ComparativoRow: React.FC<{ analise: AnaliseTemaPedido }> = ({ analise }) => {
  // Suporta novo formato (status) e antigo (conclusao como StatusAnalise)
  const statusValue = (analise.status || analise.conclusao) as StatusAnalise;
  const statusStyle = getStatusStyle(statusValue);

  // Novo formato usa provaOral, antigo usa declaracoes
  const declaracoes = analise.declaracoes || [];
  const provaOral = analise.provaOral || [];

  // Contagem para formato antigo (declaracoes)
  const favoraveisAutor = declaracoes.filter(d => d.favoravel === 'autor').length;
  const favoraveisRe = declaracoes.filter(d => d.favoravel === 're').length;
  const neutros = declaracoes.filter(d => d.favoravel === 'neutro').length;

  // Para novo formato, conta depoentes únicos
  const totalDepoentes = provaOral.length > 0 ? provaOral.length : declaracoes.length;

  return (
    <tr className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
      <td className="px-4 py-3">
        <div>
          <p className="font-medium text-slate-800 dark:text-slate-100">
            {analise.titulo || analise.tema}
          </p>
          {analise.descricao && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
              {analise.descricao}
            </p>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-center">
        {declaracoes.length > 0 ? (
          <div className="flex items-center justify-center gap-2 text-xs">
            <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
              {favoraveisAutor} A
            </span>
            <span className="px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
              {favoraveisRe} R
            </span>
            {neutros > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
                {neutros} N
              </span>
            )}
          </div>
        ) : (
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {totalDepoentes} depoente{totalDepoentes !== 1 ? 's' : ''}
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-center">
        <Badge className={`${statusStyle.bg} ${statusStyle.text}`}>
          {getStatusLabel(statusValue)}
        </Badge>
      </td>
      <td className="px-4 py-3">
        <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2">
          {typeof analise.conclusao === 'string' && analise.conclusao.length > 50
            ? analise.conclusao
            : analise.fundamentacao || analise.conclusao}
        </p>
      </td>
    </tr>
  );
};

export default ComparativoTab;

/**
 * @file IdentificacaoCard.tsx
 * @description Card editável de identificação do processo.
 */

import React from 'react';
import { useSynthesisStore } from '../../stores';

export const IdentificacaoCard: React.FC = () => {
  const identificacao = useSynthesisStore(s => s.synthesis?.identificacao);
  const updateIdentificacao = useSynthesisStore(s => s.updateIdentificacao);

  if (!identificacao) return null;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 mb-4">
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Identificação</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500 dark:text-slate-400">Número do processo</span>
          <input
            type="text"
            value={identificacao.numeroProcesso ?? ''}
            onChange={(e) => updateIdentificacao({ numeroProcesso: e.target.value || null })}
            className="px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500 dark:text-slate-400">Polo do embargante</span>
          <select
            value={identificacao.polo}
            onChange={(e) => updateIdentificacao({ polo: e.target.value as 'reclamante' | 'reclamada' | 'ambas' })}
            className="px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
          >
            <option value="reclamante">Reclamante</option>
            <option value="reclamada">Reclamada</option>
            <option value="ambas">Ambas</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500 dark:text-slate-400">Parte embargante</span>
          <input
            type="text"
            value={identificacao.parteEmbargante}
            onChange={(e) => updateIdentificacao({ parteEmbargante: e.target.value })}
            className="px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500 dark:text-slate-400">Parte embargada</span>
          <input
            type="text"
            value={identificacao.parteEmbargada}
            onChange={(e) => updateIdentificacao({ parteEmbargada: e.target.value })}
            className="px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
          />
        </label>
      </div>
      <label className="flex items-center gap-2 mt-3 text-sm">
        <input
          type="checkbox"
          checked={identificacao.tempestividade.tempestivo === true}
          onChange={(e) => updateIdentificacao({
            tempestividade: { ...identificacao.tempestividade, tempestivo: e.target.checked }
          })}
        />
        <span className="text-slate-700 dark:text-slate-200">Tempestivos</span>
        {identificacao.tempestividade.observacao && (
          <span className="text-xs text-slate-500 dark:text-slate-400">({identificacao.tempestividade.observacao})</span>
        )}
      </label>
    </div>
  );
};

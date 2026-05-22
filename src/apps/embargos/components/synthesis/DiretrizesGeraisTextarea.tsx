/**
 * @file DiretrizesGeraisTextarea.tsx
 */

import React from 'react';
import { useSynthesisStore } from '../../stores';

export const DiretrizesGeraisTextarea: React.FC = () => {
  const value = useSynthesisStore(s => s.synthesis?.diretrizesGeraisUsuario ?? '');
  const setDiretrizesGerais = useSynthesisStore(s => s.setDiretrizesGerais);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 mb-4">
      <label className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Diretrizes gerais (opcional)</span>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          Argumentos, dispositivos e jurisprudência que devem permear toda a fundamentação.
        </span>
        <textarea
          value={value}
          onChange={(e) => setDiretrizesGerais(e.target.value)}
          rows={4}
          className="px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 resize-y text-sm"
          placeholder="Ex.: enfatizar que embargos não substituem recurso ordinário…"
        />
      </label>
    </div>
  );
};

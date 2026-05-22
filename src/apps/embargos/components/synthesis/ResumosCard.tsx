/**
 * @file ResumosCard.tsx
 * @description Três textareas para resumos da sentença, embargos e contrarrazões.
 */

import React from 'react';
import { useSynthesisStore } from '../../stores';

export const ResumosCard: React.FC = () => {
  const synthesis = useSynthesisStore(s => s.synthesis);
  const updateResumo = useSynthesisStore(s => s.updateResumo);

  if (!synthesis) return null;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 mb-4">
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Resumos</h3>
      <div className="flex flex-col gap-3 text-sm">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500 dark:text-slate-400">Sentença embargada</span>
          <textarea
            value={synthesis.resumoSentenca}
            onChange={(e) => updateResumo('resumoSentenca', e.target.value)}
            rows={3}
            className="px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 resize-y"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500 dark:text-slate-400">Embargos</span>
          <textarea
            value={synthesis.resumoEmbargos}
            onChange={(e) => updateResumo('resumoEmbargos', e.target.value)}
            rows={3}
            className="px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 resize-y"
          />
        </label>
        {synthesis.resumoContrarrazoes !== null && (
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-500 dark:text-slate-400">Contrarrazões</span>
            <textarea
              value={synthesis.resumoContrarrazoes}
              onChange={(e) => updateResumo('resumoContrarrazoes', e.target.value)}
              rows={3}
              className="px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 resize-y"
            />
          </label>
        )}
      </div>
    </div>
  );
};

/**
 * @file PontoCard.tsx
 * @description Card empilhado expansível com chevron, exibindo um ponto suscitado
 *              editável (conclusão, justificativa, diretrizes do usuário).
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';
import { useSynthesisStore } from '../../stores';
import {
  VICIO_LABELS,
  CONCLUSAO_LABELS
} from '../../types';
import type { PontoSuscitado, ConclusaoTipo } from '../../types';

interface PontoCardProps {
  ponto: PontoSuscitado;
}

export const PontoCard: React.FC<PontoCardProps> = ({ ponto }) => {
  const [expanded, setExpanded] = useState(true);
  const updatePonto = useSynthesisStore(s => s.updatePonto);

  const effectiveConclusao = ponto.conclusaoUsuario ?? ponto.conclusaoPreliminar;
  const hasDivergencia = !!ponto.divergenciaVicio;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 mb-3 overflow-hidden">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50"
      >
        {expanded ? <ChevronDown className="w-4 h-4 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 flex-shrink-0" />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Ponto {ponto.ordem}</span>
            {ponto.vicioAlegadoPelaParte.map(v => (
              <span key={v} className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                {VICIO_LABELS[v]}
              </span>
            ))}
            {hasDivergencia && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Divergência
              </span>
            )}
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 ml-auto">
              {CONCLUSAO_LABELS[effectiveConclusao]}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">{ponto.trechoEmbargos}</p>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 text-sm flex flex-col gap-3">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Trecho dos embargos</p>
            <p className="text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{ponto.trechoEmbargos}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">O que a sentença disse</p>
            <p className="text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{ponto.oQueSentencaDisse}</p>
          </div>
          {hasDivergencia && (
            <div>
              <p className="text-xs text-orange-600 dark:text-orange-400 mb-1">Divergência</p>
              <p className="text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{ponto.divergenciaVicio}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Vício reconhecido pela análise: {ponto.vicioReconhecidoPelaIA.map(v => VICIO_LABELS[v]).join(', ')}
              </p>
            </div>
          )}
          {ponto.questaoSuscitadaNoProcesso !== null && (
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={ponto.questaoSuscitadaNoProcesso}
                onChange={(e) => updatePonto(ponto.id, { questaoSuscitadaNoProcesso: e.target.checked })}
              />
              <span>Questão suscitada na inicial/contestação</span>
            </label>
          )}
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-500 dark:text-slate-400">Conclusão</span>
            <select
              value={effectiveConclusao}
              onChange={(e) => updatePonto(ponto.id, { conclusaoUsuario: e.target.value as ConclusaoTipo })}
              className="px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
            >
              {(Object.entries(CONCLUSAO_LABELS) as Array<[ConclusaoTipo, string]>).map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-500 dark:text-slate-400">Justificativa (preliminar — editável)</span>
            <textarea
              value={ponto.justificativaPreliminar}
              onChange={(e) => updatePonto(ponto.id, { justificativaPreliminar: e.target.value })}
              rows={3}
              className="px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 resize-y"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Diretrizes deste ponto (argumentos, Ids, dispositivos, jurisprudência)
            </span>
            <textarea
              value={ponto.diretrizesUsuario ?? ''}
              onChange={(e) => updatePonto(ponto.id, { diretrizesUsuario: e.target.value })}
              rows={3}
              placeholder="Ex.: cite Id 1a2b3c4; aplicar art. 832 da CLT; OJ 394 SDI-I…"
              className="px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 resize-y"
            />
          </label>
        </div>
      )}
    </div>
  );
};

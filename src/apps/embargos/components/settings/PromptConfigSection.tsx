/**
 * @file PromptConfigSection.tsx
 * @description Seção de Configurações para editar o prompt-base da minuta e o
 *              guia de estilo de redação. Valores nullable: enquanto não houver
 *              personalização, o textarea exibe o padrão e o estado fica `null`.
 */

import React from 'react';
import { usePromptConfigStore } from '../../stores';
import { DEFAULT_DRAFT_BASE_PROMPT, STYLE_GUIDE } from '../../prompts';

interface PromptFieldProps {
  title: string;
  hint: string;
  value: string;
  isCustom: boolean;
  rows: number;
  onChange: (value: string) => void;
  onReset: () => void;
}

const PromptField: React.FC<PromptFieldProps> = ({
  title,
  hint,
  value,
  isCustom,
  rows,
  onChange,
  onReset
}) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{title}</span>
        {isCustom && (
          <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
            personalizado
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={onReset}
        disabled={!isCustom}
        className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Restaurar padrão
      </button>
    </div>
    <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      spellCheck={false}
      className="w-full px-3 py-2 text-sm font-mono leading-relaxed border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 resize-y focus:ring-2 focus:ring-indigo-500"
    />
  </div>
);

export const PromptConfigSection: React.FC = () => {
  const draftBasePrompt = usePromptConfigStore((s) => s.draftBasePrompt);
  const styleGuide = usePromptConfigStore((s) => s.styleGuide);
  const setDraftBasePrompt = usePromptConfigStore((s) => s.setDraftBasePrompt);
  const setStyleGuide = usePromptConfigStore((s) => s.setStyleGuide);
  const resetDraftBasePrompt = usePromptConfigStore((s) => s.resetDraftBasePrompt);
  const resetStyleGuide = usePromptConfigStore((s) => s.resetStyleGuide);

  const effectivePrompt = draftBasePrompt ?? DEFAULT_DRAFT_BASE_PROMPT;
  const effectiveStyle = styleGuide ?? STYLE_GUIDE;

  return (
    <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-6">
      <div>
        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-200">
          Prompts e estilo (Embargos)
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Controlam apenas a redação da minuta. A estrutura obrigatória (parágrafos de
          abertura, vícios em análise) e o formato JSON continuam aplicados automaticamente.
        </p>
      </div>

      <PromptField
        title="Prompt da IA para a minuta"
        hint="Papel, regras e diretrizes que a IA segue ao redigir a decisão de embargos."
        value={effectivePrompt}
        isCustom={draftBasePrompt !== null}
        rows={14}
        onChange={setDraftBasePrompt}
        onReset={resetDraftBasePrompt}
      />

      <PromptField
        title="Estilo de redação"
        hint="Guia de estilo (tom, coesão, pontuação) aplicado à minuta e ao refino por chat."
        value={effectiveStyle}
        isCustom={styleGuide !== null}
        rows={10}
        onChange={setStyleGuide}
        onReset={resetStyleGuide}
      />
    </div>
  );
};

export default PromptConfigSection;

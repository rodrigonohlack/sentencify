/**
 * @file ProvasSection.tsx
 * @description Seção de provas requeridas
 */

import React from 'react';
import { FileSearch, Check, X } from 'lucide-react';
import { AccordionItem } from '../ui';
import { safeRender } from '../../utils/safe-render';
import type { Provas } from '../../types';

interface ProvasSectionProps {
  provas: Provas;
}

const ProvaItem: React.FC<{ label: string; value: boolean }> = ({ label, value }) => (
  <div className="flex items-center gap-2">
    {value ? (
      <Check className="w-4 h-4 text-emerald-500" />
    ) : (
      <X className="w-4 h-4 text-slate-300 dark:text-slate-600" />
    )}
    <span className={value ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'}>{label}</span>
  </div>
);

// Fallback para análises sem o bloco de provas de uma das partes (ex.: processo
// sem contestação não traz `provas.reclamada`). Evita crash ao ler `.testemunhal`.
const PROVA_VAZIA: Provas['reclamante'] = {
  testemunhal: false,
  documental: false,
  pericial: false,
  depoimentoPessoal: false,
};

export const ProvasSection: React.FC<ProvasSectionProps> = ({ provas }) => {
  const reclamante = provas?.reclamante ?? PROVA_VAZIA;
  const reclamada = provas?.reclamada ?? PROVA_VAZIA;
  return (
    <AccordionItem
      title="Provas Requeridas"
      icon={<FileSearch className="w-5 h-5" />}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Reclamante */}
        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800/40">
          <h4 className="font-medium text-emerald-800 dark:text-emerald-300 mb-3">Reclamante</h4>
          <div className="space-y-2 text-sm">
            <ProvaItem label="Testemunhal" value={reclamante.testemunhal} />
            <ProvaItem label="Documental" value={reclamante.documental} />
            <ProvaItem label="Pericial" value={reclamante.pericial} />
            <ProvaItem label="Depoimento Pessoal" value={reclamante.depoimentoPessoal} />
            {reclamante.outras && reclamante.outras.length > 0 && (
              <div className="pt-2 border-t border-emerald-200 dark:border-emerald-800/40">
                <p className="text-emerald-700 dark:text-emerald-400 font-medium mb-1">Outras:</p>
                <ul className="space-y-1">
                  {reclamante.outras.map((item, idx) => (
                    <li key={idx} className="text-emerald-600 dark:text-emerald-400">• {safeRender(item)}</li>
                  ))}
                </ul>
              </div>
            )}
            {reclamante.especificacoes && (
              <div className="pt-2 border-t border-emerald-200 dark:border-emerald-800/40">
                <p className="text-emerald-700 dark:text-emerald-400 italic">{safeRender(reclamante.especificacoes)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Reclamada */}
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800/40">
          <h4 className="font-medium text-amber-800 dark:text-amber-300 mb-3">Reclamada</h4>
          <div className="space-y-2 text-sm">
            <ProvaItem label="Testemunhal" value={reclamada.testemunhal} />
            <ProvaItem label="Documental" value={reclamada.documental} />
            <ProvaItem label="Pericial" value={reclamada.pericial} />
            <ProvaItem label="Depoimento Pessoal" value={reclamada.depoimentoPessoal} />
            {reclamada.outras && reclamada.outras.length > 0 && (
              <div className="pt-2 border-t border-amber-200 dark:border-amber-800/40">
                <p className="text-amber-700 dark:text-amber-400 font-medium mb-1">Outras:</p>
                <ul className="space-y-1">
                  {reclamada.outras.map((item, idx) => (
                    <li key={idx} className="text-amber-600 dark:text-amber-400">• {safeRender(item)}</li>
                  ))}
                </ul>
              </div>
            )}
            {reclamada.especificacoes && (
              <div className="pt-2 border-t border-amber-200 dark:border-amber-800/40">
                <p className="text-amber-700 dark:text-amber-400 italic">{safeRender(reclamada.especificacoes)}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AccordionItem>
  );
};

export default ProvasSection;

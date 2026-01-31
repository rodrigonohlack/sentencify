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

export const ProvasSection: React.FC<ProvasSectionProps> = ({ provas }) => {
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
            <ProvaItem label="Testemunhal" value={provas.reclamante.testemunhal} />
            <ProvaItem label="Documental" value={provas.reclamante.documental} />
            <ProvaItem label="Pericial" value={provas.reclamante.pericial} />
            <ProvaItem label="Depoimento Pessoal" value={provas.reclamante.depoimentoPessoal} />
            {provas.reclamante.outras && provas.reclamante.outras.length > 0 && (
              <div className="pt-2 border-t border-emerald-200 dark:border-emerald-800/40">
                <p className="text-emerald-700 dark:text-emerald-400 font-medium mb-1">Outras:</p>
                <ul className="space-y-1">
                  {provas.reclamante.outras.map((item, idx) => (
                    <li key={idx} className="text-emerald-600 dark:text-emerald-400">• {safeRender(item)}</li>
                  ))}
                </ul>
              </div>
            )}
            {provas.reclamante.especificacoes && (
              <div className="pt-2 border-t border-emerald-200 dark:border-emerald-800/40">
                <p className="text-emerald-700 dark:text-emerald-400 italic">{safeRender(provas.reclamante.especificacoes)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Reclamada */}
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800/40">
          <h4 className="font-medium text-amber-800 dark:text-amber-300 mb-3">Reclamada</h4>
          <div className="space-y-2 text-sm">
            <ProvaItem label="Testemunhal" value={provas.reclamada.testemunhal} />
            <ProvaItem label="Documental" value={provas.reclamada.documental} />
            <ProvaItem label="Pericial" value={provas.reclamada.pericial} />
            <ProvaItem label="Depoimento Pessoal" value={provas.reclamada.depoimentoPessoal} />
            {provas.reclamada.outras && provas.reclamada.outras.length > 0 && (
              <div className="pt-2 border-t border-amber-200 dark:border-amber-800/40">
                <p className="text-amber-700 dark:text-amber-400 font-medium mb-1">Outras:</p>
                <ul className="space-y-1">
                  {provas.reclamada.outras.map((item, idx) => (
                    <li key={idx} className="text-amber-600 dark:text-amber-400">• {safeRender(item)}</li>
                  ))}
                </ul>
              </div>
            )}
            {provas.reclamada.especificacoes && (
              <div className="pt-2 border-t border-amber-200 dark:border-amber-800/40">
                <p className="text-amber-700 dark:text-amber-400 italic">{safeRender(provas.reclamada.especificacoes)}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AccordionItem>
  );
};

export default ProvasSection;

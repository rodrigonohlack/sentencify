/**
 * @file DraftView.tsx
 * @description Tela 3: chips dos documentos + 3 SectionEditor + DraftActionBar + RefinePanel.
 */

import React, { useState } from 'react';
import { FileText, AlertTriangle } from 'lucide-react';
import { SectionEditor } from './SectionEditor';
import { RefinePanel } from './RefinePanel';
import { DraftActionBar } from './DraftActionBar';
import { useDocumentStore, useDraftStore } from '../../stores';
import { SLOT_LABELS } from '../../types';
import type { DocumentSlot, DraftSectionKey } from '../../types';

interface DraftViewProps {
  onBackToSynthesis: () => void;
  onNew: () => void;
}

const SLOTS: DocumentSlot[] = ['decisaoEmbargada', 'embargos', 'contrarrazoes', 'inicial', 'contestacao'];

export const DraftView: React.FC<DraftViewProps> = ({ onBackToSynthesis, onNew }) => {
  const draft = useDraftStore(s => s.draft);
  const docs = useDocumentStore.getState();
  const [refining, setRefining] = useState<DraftSectionKey | null>(null);

  if (!draft) return null;

  const hasAttention = (['relatorio', 'fundamentacao', 'dispositivo'] as DraftSectionKey[]).some(
    (k) => draft[k].text.includes('[ATENÇÃO:')
  );

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex flex-wrap gap-2 mb-4">
        {SLOTS.map(slot => {
          const d = docs[slot];
          if (!d) return null;
          return (
            <span
              key={slot}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300"
            >
              <FileText className="w-3 h-3" /> {SLOT_LABELS[slot]}: {d.name}
            </span>
          );
        })}
      </div>

      <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-1">Minuta</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
        Edite cada seção diretamente ou refine com auxílio da IA.
      </p>

      {hasAttention && (
        <div className="mb-4 p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-sm text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>
            Há marcações <strong>[ATENÇÃO: …]</strong> na minuta indicando elementos que a IA considerou insuficientes. Revise antes de copiar.
          </span>
        </div>
      )}

      <SectionEditor section="relatorio" onOpenRefine={() => setRefining('relatorio')} />
      <SectionEditor section="fundamentacao" onOpenRefine={() => setRefining('fundamentacao')} />
      <SectionEditor section="dispositivo" onOpenRefine={() => setRefining('dispositivo')} />

      <DraftActionBar onBackToSynthesis={onBackToSynthesis} onNew={onNew} />

      {refining && <RefinePanel section={refining} onClose={() => setRefining(null)} />}
    </div>
  );
};

/**
 * @file SectionEditor.tsx
 * @description Card de uma seção: textarea editável + botão Refinar.
 */

import React from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '../ui';
import { useDraftStore } from '../../stores';
import { SECTION_LABELS } from '../../types';
import type { DraftSectionKey } from '../../types';

interface SectionEditorProps {
  section: DraftSectionKey;
  onOpenRefine: () => void;
}

export const SectionEditor: React.FC<SectionEditorProps> = ({ section, onOpenRefine }) => {
  const text = useDraftStore(s => s.draft?.[section].text ?? '');
  const updateSection = useDraftStore(s => s.updateSection);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          {SECTION_LABELS[section]}
        </h3>
        <Button variant="secondary" onClick={onOpenRefine} icon={<Sparkles className="w-4 h-4" />}>
          Refinar
        </Button>
      </div>
      <textarea
        value={text}
        onChange={(e) => updateSection(section, e.target.value)}
        rows={Math.max(8, Math.min(40, text.split('\n').length + 2))}
        className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-sm font-serif leading-relaxed resize-y"
      />
    </div>
  );
};

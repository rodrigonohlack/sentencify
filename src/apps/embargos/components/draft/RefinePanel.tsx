/**
 * @file RefinePanel.tsx
 * @description Drawer lateral direito para refinar uma seção via chat.
 */

import React, { useState } from 'react';
import { X, Send, Check, Loader2 } from 'lucide-react';
import { Button } from '../ui';
import { useDraftStore } from '../../stores';
import { useSectionRefine, saveNow } from '../../hooks';
import { SECTION_LABELS } from '../../types';
import type { DraftSectionKey } from '../../types';

interface RefinePanelProps {
  section: DraftSectionKey;
  onClose: () => void;
}

export const RefinePanel: React.FC<RefinePanelProps> = ({ section, onClose }) => {
  const draft = useDraftStore(s => s.draft);
  const isRefining = useDraftStore(s => s.refiningSection === section);
  const { sendMessage, acceptLastSuggestion } = useSectionRefine(section);
  const [input, setInput] = useState('');

  if (!draft) return null;
  const history = draft[section].chatHistory;
  const lastAssistant = [...history].reverse().find(m => m.role === 'assistant');
  const canAccept = !!lastAssistant && !lastAssistant.content.startsWith('[Erro:');

  const handleSend = async () => {
    if (!input.trim() || isRefining) return;
    const text = input;
    setInput('');
    await sendMessage(text);
  };

  const handleAccept = async () => {
    acceptLastSuggestion();
    await saveNow();
  };

  return (
    <aside className="fixed top-0 right-0 h-full w-full sm:w-[480px] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700 shadow-2xl z-50 flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          Refinar — {SECTION_LABELS[section]}
        </h3>
        <button onClick={onClose} className="text-slate-400 hover:text-red-500">
          <X className="w-5 h-5" />
        </button>
      </header>

      <div className="flex-1 overflow-auto px-4 py-3 flex flex-col gap-3">
        {history.length === 0 && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Descreva o ajuste desejado (ex.: "reescreva incluindo o argumento de X", "reduza pela metade", "adicione citação ao art. 832 da CLT").
          </p>
        )}
        {history.map((m, i) => (
          <div
            key={i}
            className={`px-3 py-2 rounded-lg text-sm whitespace-pre-wrap ${
              m.role === 'user'
                ? 'bg-amber-50 dark:bg-amber-900/20 text-slate-800 dark:text-slate-100 self-end'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
            }`}
          >
            {m.content}
          </div>
        ))}
        {isRefining && (
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin" /> Refinando…
          </div>
        )}
      </div>

      {canAccept && (
        <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-700 flex gap-2">
          <Button
            variant="primary"
            onClick={() => void handleAccept()}
            icon={<Check className="w-4 h-4" />}
          >
            Aceitar e substituir
          </Button>
        </div>
      )}

      <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 flex gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              void handleSend();
            }
          }}
          rows={2}
          placeholder="Ctrl+Enter para enviar"
          className="flex-1 px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 resize-none"
        />
        <button
          onClick={() => void handleSend()}
          disabled={!input.trim() || isRefining}
          className="px-3 py-2 rounded bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};

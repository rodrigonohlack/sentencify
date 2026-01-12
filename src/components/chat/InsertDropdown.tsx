/**
 * @file InsertDropdown.tsx
 * @description Dropdown para inserir resposta da IA (v1.19.0)
 * @version 1.36.84
 */

import React from 'react';
import { ChevronDown } from 'lucide-react';
import type { InsertDropdownProps } from '../../types';

export const InsertDropdown = React.memo(({
  onInsert,
  disabled
}: InsertDropdownProps) => {
  const [open, setOpen] = React.useState(false);

  if (disabled) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="px-4 py-2 rounded-lg font-medium bg-green-600 text-white hover-green-700-from-600 flex items-center gap-2"
      >
        Inserir Última Resposta
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-0 mb-1 z-20 theme-bg-primary border theme-border-input rounded-lg shadow-xl py-1 min-w-[180px]">
            <button onClick={() => { onInsert('replace'); setOpen(false); }} className="w-full px-4 py-2 text-left text-sm hover-amber-600 text-amber-400">
              Substituir Tudo
            </button>
            <button onClick={() => { onInsert('prepend'); setOpen(false); }} className="w-full px-4 py-2 text-left text-sm hover-blue-600 text-blue-400">
              Adicionar no Início
            </button>
            <button onClick={() => { onInsert('append'); setOpen(false); }} className="w-full px-4 py-2 text-left text-sm hover-green-600 text-green-400">
              Adicionar no Final
            </button>
          </div>
        </>
      )}
    </div>
  );
});

InsertDropdown.displayName = 'InsertDropdown';

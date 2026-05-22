/**
 * @file HistoricoModal.tsx
 */

import React from 'react';
import { History } from 'lucide-react';
import { Modal } from '../ui';
import { HistoricoItem } from './HistoricoItem';
import { useLocalHistory } from '../../hooks';
import {
  useSynthesisStore,
  useDraftStore
} from '../../stores';
import type { SavedEmbargos } from '../../types';

interface HistoricoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAndOpen: (item: SavedEmbargos) => void;
}

export const HistoricoModal: React.FC<HistoricoModalProps> = ({ isOpen, onClose, onSelectAndOpen }) => {
  const { items, isLoading, remove } = useLocalHistory();
  const setSynthesis = useSynthesisStore(s => s.setSynthesis);
  const setSavedId = useSynthesisStore(s => s.setSavedId);
  const setDraft = useDraftStore(s => s.setDraft);

  const handleSelect = (item: SavedEmbargos) => {
    setSynthesis(item.synthesis);
    setSavedId(item.id);
    if (item.draft) setDraft(item.draft);
    onSelectAndOpen(item);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Histórico"
      icon={<History className="w-5 h-5" />}
      iconColor="text-amber-500"
      size="lg"
    >
      <div className="flex flex-col gap-2 max-h-[60vh] overflow-auto">
        {isLoading && <p className="text-sm text-slate-500">Carregando…</p>}
        {!isLoading && items.length === 0 && (
          <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">
            Nenhuma minuta salva ainda.
          </p>
        )}
        {items.map(item => (
          <HistoricoItem
            key={item.id}
            item={item}
            onSelect={() => handleSelect(item)}
            onDelete={() => void remove(item.id)}
          />
        ))}
      </div>
    </Modal>
  );
};

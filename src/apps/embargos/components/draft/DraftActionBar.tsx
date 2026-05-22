/**
 * @file DraftActionBar.tsx
 * @description Barra de ações na Tela 3: voltar, copiar, novo.
 */

import React, { useState } from 'react';
import { ArrowLeft, Copy, Check, FilePlus } from 'lucide-react';
import { Button } from '../ui';
import { useDraftStore } from '../../stores';
import { concatDraft } from '../../utils/concat-draft';

interface DraftActionBarProps {
  onBackToSynthesis: () => void;
  onNew: () => void;
}

export const DraftActionBar: React.FC<DraftActionBarProps> = ({ onBackToSynthesis, onNew }) => {
  const draft = useDraftStore(s => s.draft);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!draft) return;
    try {
      await navigator.clipboard.writeText(concatDraft(draft));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('[embargos] copy falhou:', err);
    }
  };

  const handleNew = () => {
    if (confirm('Descartar a minuta atual e iniciar uma nova?')) onNew();
  };

  return (
    <div className="flex flex-wrap gap-2 items-center justify-between sticky bottom-4">
      <Button variant="secondary" onClick={onBackToSynthesis} icon={<ArrowLeft className="w-4 h-4" />}>
        Voltar para síntese
      </Button>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          onClick={() => void handleCopy()}
          icon={copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        >
          {copied ? 'Copiado!' : 'Copiar minuta'}
        </Button>
        <Button variant="primary" onClick={handleNew} icon={<FilePlus className="w-4 h-4" />}>
          Novo
        </Button>
      </div>
    </div>
  );
};

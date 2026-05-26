/**
 * @file UploadView.tsx
 * @description Tela 1: grid de slots + botão Analisar.
 */

import React from 'react';
import { Loader2, Gavel } from 'lucide-react';
import { PdfSlot } from './PdfSlot';
import { Button } from '../ui';
import { useDocumentStore, useSynthesisStore, useAIStore, selectCurrentApiKey, selectProvider } from '../../stores';
import { useSynthesisAnalysis } from '../../hooks';
import type { DocumentSlot } from '../../types';

const SLOTS: DocumentSlot[] = ['decisaoEmbargada', 'embargos', 'contrarrazoes', 'inicial', 'contestacao'];

export const UploadView: React.FC = () => {
  const canAnalyze = useDocumentStore(s => s.canAnalyze());
  const isAnalyzing = useSynthesisStore(s => s.isAnalyzing);
  const progress = useSynthesisStore(s => s.progress);
  const error = useSynthesisStore(s => s.error);
  const apiKey = useAIStore(selectCurrentApiKey);
  const provider = useAIStore(selectProvider);

  const { analyze } = useSynthesisAnalysis();
  const noApiKey = !apiKey && provider !== 'claude-cli';

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="text-center mb-8">
        <div className="inline-flex p-3 bg-amber-600 rounded-2xl mb-4 shadow-lg shadow-amber-200 dark:shadow-amber-900/30">
          <Gavel className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Embargos de Declaração</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
          Envie os documentos do processo. Decisão embargada e embargos são obrigatórios.
        </p>
      </div>

      {noApiKey && (
        <div className="mb-6 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-sm text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
          Configure o provider e a chave de API em <strong>Configurações</strong> antes de analisar.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {SLOTS.map(slot => (
          <PdfSlot key={slot} slot={slot} />
        ))}
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
          {error}
        </div>
      )}

      <div className="flex flex-col items-center gap-3">
        <Button
          variant="primary"
          onClick={() => void analyze()}
          disabled={!canAnalyze || isAnalyzing || noApiKey}
          icon={isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}
        >
          {isAnalyzing ? progress.label || 'Analisando…' : 'Analisar embargos'}
        </Button>
        {isAnalyzing && progress.value > 0 && (
          <div className="w-full max-w-md h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 transition-all"
              style={{ width: `${progress.value}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

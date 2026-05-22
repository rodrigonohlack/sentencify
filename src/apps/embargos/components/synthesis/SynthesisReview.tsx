/**
 * @file SynthesisReview.tsx
 * @description Tela 2: revisão da síntese com cards editáveis.
 */

import React from 'react';
import { ArrowLeft, RefreshCw, FileSignature, Loader2 } from 'lucide-react';
import { IdentificacaoCard } from './IdentificacaoCard';
import { ResumosCard } from './ResumosCard';
import { PontoCard } from './PontoCard';
import { DiretrizesGeraisTextarea } from './DiretrizesGeraisTextarea';
import { Button } from '../ui';
import {
  useSynthesisStore,
  useDraftStore
} from '../../stores';
import {
  useSynthesisAnalysis,
  useDraftGeneration
} from '../../hooks';

interface SynthesisReviewProps {
  onBackToUpload: () => void;
}

export const SynthesisReview: React.FC<SynthesisReviewProps> = ({ onBackToUpload }) => {
  const synthesis = useSynthesisStore(s => s.synthesis);
  const isGenerating = useDraftStore(s => s.isGenerating);
  const progressDraft = useDraftStore(s => s.progress);
  const draftError = useDraftStore(s => s.error);

  const { analyze } = useSynthesisAnalysis();
  const { generate } = useDraftGeneration();

  if (!synthesis) return null;

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <Button variant="secondary" onClick={onBackToUpload} icon={<ArrowLeft className="w-4 h-4" />}>
          Voltar
        </Button>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => void analyze()}
            icon={<RefreshCw className="w-4 h-4" />}
            title="Refazer análise (descarta a síntese atual)"
          >
            Refazer análise
          </Button>
        </div>
      </div>

      <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-1">Revisão da síntese</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
        Ajuste o que for necessário e adicione suas diretrizes antes de gerar a minuta.
      </p>

      <IdentificacaoCard />
      <ResumosCard />

      <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mt-6 mb-2">
        Pontos suscitados ({synthesis.pontos.length})
      </h2>

      {synthesis.pontos.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 mb-4 text-sm text-slate-500 dark:text-slate-400">
          A análise não identificou pontos a apreciar. Verifique os embargos ou refaça a análise.
        </div>
      ) : (
        synthesis.pontos.map(p => <PontoCard key={p.id} ponto={p} />)
      )}

      <DiretrizesGeraisTextarea />

      {draftError && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
          {draftError}
        </div>
      )}

      <div className="flex flex-col items-center gap-3 mt-6">
        <Button
          variant="primary"
          onClick={() => void generate()}
          disabled={isGenerating || synthesis.pontos.length === 0}
          icon={isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSignature className="w-4 h-4" />}
        >
          {isGenerating ? progressDraft.label || 'Gerando minuta…' : 'Gerar minuta'}
        </Button>
        {isGenerating && progressDraft.value > 0 && (
          <div className="w-full max-w-md h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-amber-500 transition-all" style={{ width: `${progressDraft.value}%` }} />
          </div>
        )}
      </div>
    </div>
  );
};

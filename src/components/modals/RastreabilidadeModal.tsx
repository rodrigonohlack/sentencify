/**
 * @file RastreabilidadeModal.tsx
 * @description Exibe a rastreabilidade de fontes do mini-relatório por parágrafo:
 * verificação de citações (✓/⚠) E juízo de fidelidade do parágrafo às peças
 * (fiel/divergente). Sob demanda; resultado persiste no tópico.
 */

import React from 'react';
import { Search, CheckCircle2, AlertTriangle, RefreshCw, XCircle } from 'lucide-react';
import { BaseModal, CSS } from './BaseModal';
import type { RelatorioBlocoFidelidade, Topic } from '../../types';

export interface RastreabilidadeModalProps {
  isOpen: boolean;
  onClose: () => void;
  topic: Topic | null;
  tracing: boolean;
  onRunTrace: () => void;
}

/** Selo de fidelidade do parágrafo (fiel / divergente / indeterminado). */
const FidelidadeBadge: React.FC<{ fidelidade?: RelatorioBlocoFidelidade }> = ({ fidelidade }) => {
  if (!fidelidade) return null;
  if (fidelidade.veredito === 'fiel') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-sans text-green-600 dark:text-green-400 flex-shrink-0">
        <CheckCircle2 className="w-3.5 h-3.5" /> Fiel
      </span>
    );
  }
  if (fidelidade.veredito === 'divergente') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-sans text-red-600 dark:text-red-400 flex-shrink-0">
        <XCircle className="w-3.5 h-3.5" /> Divergência
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-sans theme-text-muted flex-shrink-0">
      — Indeterminado
    </span>
  );
};

export const RastreabilidadeModal: React.FC<RastreabilidadeModalProps> = ({
  isOpen, onClose, topic, tracing, onRunTrace
}) => {
  // currentText espelha a derivação usada quando baseSnapshot foi gravado (editedRelatorio || relatorio).
  const currentText = topic?.editedRelatorio || topic?.relatorio || '';
  const rast = topic?.relatorioFontes;
  const stale = !!rast && rast.baseSnapshot !== currentText;

  const allTrechos = (rast?.blocos || []).flatMap(b => b.trechos);
  const verificados = allTrechos.filter(t => t.status === 'verificado').length;
  const naoLocalizados = allTrechos.length - verificados;
  const divergentes = (rast?.blocos || []).filter(b => b.fidelidade?.veredito === 'divergente').length;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Rastreabilidade do mini-relatório"
      subtitle={topic?.title}
      icon={<Search />}
      iconColor="blue"
      size="xl"
    >
      {tracing ? (
        <div className="flex flex-col items-center justify-center py-12 theme-text-secondary">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" role="status" aria-label="Rastreando fontes" />
          <p className="mt-4 text-sm">Rastreando fontes nas peças…</p>
        </div>
      ) : !rast ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <Search className="w-10 h-10 theme-text-muted mb-3" />
          <p className="theme-text-secondary text-sm max-w-md mb-5">
            Audite de quais trechos das peças (petição inicial e contestações) a IA extraiu cada
            parágrafo deste mini-relatório. Cada trecho é verificado localmente contra o texto das peças.
          </p>
          <button onClick={onRunTrace} className={CSS.btnBlue}>Rastrear fontes</button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Resumo */}
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="theme-text-secondary">{allTrechos.length} trecho(s)</span>
            <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
              <CheckCircle2 className="w-4 h-4" /> {verificados} verificado(s)
            </span>
            <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-4 h-4" /> {naoLocalizados} não localizado(s)
            </span>
            {divergentes > 0 && (
              <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-medium">
                <XCircle className="w-4 h-4" /> {divergentes} parágrafo(s) divergente(s)
              </span>
            )}
          </div>

          {/* Staleness */}
          {stale && (
            <div className="flex items-center justify-between gap-3 theme-warning-box">
              <div className="flex items-center gap-2 text-xs theme-text-primary">
                <RefreshCw className="w-4 h-4 flex-shrink-0" />
                <span>Fontes desatualizadas — o relatório foi editado desde a última rastreabilidade.</span>
              </div>
              <button onClick={onRunTrace} className={CSS.btnSecondary + ' whitespace-nowrap text-xs !py-1.5'}>
                Regerar
              </button>
            </div>
          )}

          {/* Blocos */}
          <div className="space-y-3">
            {(rast.blocos || []).map(bloco => (
              <div key={bloco.blocoIndex} className="rounded-lg border theme-border-secondary theme-bg-app p-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-sm font-medium theme-text-primary font-serif">
                    <span className="theme-text-muted mr-1 font-sans">¶{bloco.blocoIndex + 1}</span>
                    {bloco.blocoResumo.replace(/[.…]+$/, '')}…
                  </p>
                  <FidelidadeBadge fidelidade={bloco.fidelidade} />
                </div>
                {bloco.fidelidade?.veredito === 'divergente' && bloco.fidelidade.divergencias.length > 0 && (
                  <div className="rounded-lg border border-red-500/30 bg-red-50 dark:bg-red-900/15 p-3 mb-2">
                    <p className="text-[11px] font-semibold text-red-700 dark:text-red-300 mb-1 inline-flex items-center gap-1 font-sans">
                      <XCircle className="w-3.5 h-3.5" /> Divergências em relação às peças
                    </p>
                    <ul className="space-y-1">
                      {bloco.fidelidade.divergencias.map((d, i) => (
                        <li key={i} className="text-xs text-red-800 dark:text-red-200 font-serif">• {d}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {bloco.trechos.length === 0 ? (
                  <p className="text-xs theme-text-muted italic">Sem trechos identificados para este parágrafo.</p>
                ) : (
                  <ul className="space-y-2">
                    {/* trechos não têm id estável; índice posicional é seguro (lista somente-leitura) */}
                    {bloco.trechos.map((t, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs">
                        {t.status === 'verificado' ? (
                          <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-green-600 dark:text-green-400" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                        )}
                        <div className="flex-1">
                          <span className="theme-text-primary font-serif">"{t.trecho}"</span>
                          <span className="theme-text-muted ml-1">— {t.peca}</span>
                          {t.status === 'nao_localizado' && (
                            <span className="ml-1 text-amber-600 dark:text-amber-400">(não localizado na peça)</span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>

          {rast.geradoEm && (
            <p className="text-[11px] theme-text-muted pt-1">
              Gerado em {new Date(rast.geradoEm).toLocaleString('pt-BR')}
              {rast.modelo ? ` · ${rast.modelo}` : ''}
            </p>
          )}
        </div>
      )}
    </BaseModal>
  );
};

export default RastreabilidadeModal;

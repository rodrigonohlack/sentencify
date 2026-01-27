/**
 * @file ResultsContainer.tsx
 * @description Container principal dos resultados da análise
 */

import React from 'react';
import { FileText, Table2, Calendar, Clock } from 'lucide-react';
import { Card, Tabs } from '../ui';
import { useResultStore } from '../../stores';
import { IdentificacaoSection } from './IdentificacaoSection';
import { ContratoSection } from './ContratoSection';
import { TutelasSection } from './TutelasSection';
import { PreliminaresSection } from './PreliminaresSection';
import { PedidosSection } from './PedidosSection';
import { ReconvencaoSection } from './ReconvencaoSection';
import { ProvasSection } from './ProvasSection';
import { AlertasSection } from './AlertasSection';
import { TabelaComparativa } from './TabelaComparativa';
import { ReanalyzePanel } from './ReanalyzePanel';

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/** Formata data ISO (YYYY-MM-DD) para exibição legível */
const formatDateLabel = (dateStr: string): string => {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

/** Verifica se a prescrição tem conteúdo real */
const hasPrescricaoContent = (prescricao?: { fundamentacao?: string; dataBase?: string }): boolean => {
  if (!prescricao) return false;
  return Boolean(prescricao.fundamentacao?.trim() || prescricao.dataBase?.trim());
};

/** Verifica se a decadência tem conteúdo real */
const hasDecadenciaContent = (decadencia?: { fundamentacao?: string; prazo?: string }): boolean => {
  if (!decadencia) return false;
  return Boolean(decadencia.fundamentacao?.trim() || decadencia.prazo?.trim());
};

const tabs = [
  { id: 'analise', label: 'Análise Completa', icon: <FileText className="w-4 h-4" /> },
  { id: 'tabela', label: 'Tabela Sintética', icon: <Table2 className="w-4 h-4" /> }
];

export const ResultsContainer: React.FC = () => {
  const result = useResultStore((s) => s.result);
  const dataPauta = useResultStore((s) => s.dataPauta);
  const horarioAudiencia = useResultStore((s) => s.horarioAudiencia);
  const nomeArquivoPeticao = useResultStore((s) => s.nomeArquivoPeticao);

  if (!result) {
    return (
      <Card className="p-8">
        <div className="text-center text-slate-500">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="font-medium">Nenhuma análise realizada</p>
          <p className="text-sm mt-1">
            Faça upload de uma petição e clique em "Analisar" para ver os resultados
          </p>
        </div>
      </Card>
    );
  }

  return (
    <>
      {/* Painel de reanálise (quando não há contestação) */}
      <ReanalyzePanel />

      <Card className="overflow-hidden">
        {/* Header com Data/Hora da Audiência (quando vem do histórico) */}
        {(dataPauta || horarioAudiencia) && (
        <div className="flex items-center gap-4 px-4 py-3 bg-indigo-50 dark:bg-indigo-900/20 border-b border-indigo-100 dark:border-indigo-800/40">
          {dataPauta && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
              <span className="font-medium text-slate-700 dark:text-slate-200 capitalize">
                {formatDateLabel(dataPauta)}
              </span>
            </div>
          )}
          {horarioAudiencia && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
              <span className="font-medium text-slate-700 dark:text-slate-200">{horarioAudiencia}</span>
            </div>
          )}
        </div>
      )}

      <Tabs tabs={tabs} defaultTab="analise">
        {(activeTab) => (
          <>
            {activeTab === 'analise' && (
              <div className="space-y-6 p-4">
                {/* Identificação */}
                <IdentificacaoSection
                  data={result.identificacao}
                  valorCausa={result.valorCausa}
                  nomeArquivoPeticao={nomeArquivoPeticao}
                />

                {/* Contrato */}
                <ContratoSection data={result.contrato} />

                {/* Tutelas Provisórias */}
                {result.tutelasProvisoras && result.tutelasProvisoras.length > 0 && (
                  <TutelasSection tutelas={result.tutelasProvisoras} />
                )}

                {/* Preliminares e Prejudiciais - só exibe se tiver conteúdo real */}
                {(result.preliminares.length > 0 || hasPrescricaoContent(result.prejudiciais.prescricao) || hasDecadenciaContent(result.prejudiciais.decadencia)) && (
                  <PreliminaresSection
                    preliminares={result.preliminares}
                    prejudiciais={result.prejudiciais}
                  />
                )}

                {/* Pedidos */}
                {result.pedidos.length > 0 && (
                  <PedidosSection pedidos={result.pedidos} />
                )}

                {/* Reconvenção */}
                {result.reconvencao?.existe && (
                  <ReconvencaoSection reconvencao={result.reconvencao} />
                )}

                {/* Provas */}
                <ProvasSection provas={result.provas} />

                {/* Alertas */}
                {result.alertas.length > 0 && (
                  <AlertasSection alertas={result.alertas} />
                )}
              </div>
            )}

            {activeTab === 'tabela' && (
              <div className="p-4">
                <TabelaComparativa
                  pedidos={result.tabelaSintetica}
                  valorCausa={result.valorCausa}
                />
              </div>
            )}
          </>
        )}
      </Tabs>
      </Card>
    </>
  );
};

export default ResultsContainer;

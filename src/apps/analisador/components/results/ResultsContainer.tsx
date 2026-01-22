/**
 * @file ResultsContainer.tsx
 * @description Container principal dos resultados da análise
 */

import React from 'react';
import { FileText, Table2 } from 'lucide-react';
import { Card, Tabs } from '../ui';
import { useResultStore } from '../../stores';
import { IdentificacaoSection } from './IdentificacaoSection';
import { ContratoSection } from './ContratoSection';
import { PreliminaresSection } from './PreliminaresSection';
import { PedidosSection } from './PedidosSection';
import { ProvasSection } from './ProvasSection';
import { AlertasSection } from './AlertasSection';
import { TabelaComparativa } from './TabelaComparativa';

const tabs = [
  { id: 'analise', label: 'Análise Completa', icon: <FileText className="w-4 h-4" /> },
  { id: 'tabela', label: 'Tabela Sintética', icon: <Table2 className="w-4 h-4" /> }
];

export const ResultsContainer: React.FC = () => {
  const result = useResultStore((s) => s.result);

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
    <Card className="overflow-hidden">
      <Tabs tabs={tabs} defaultTab="analise">
        {(activeTab) => (
          <>
            {activeTab === 'analise' && (
              <div className="space-y-6 p-4">
                {/* Identificação */}
                <IdentificacaoSection data={result.identificacao} />

                {/* Contrato */}
                <ContratoSection data={result.contrato} />

                {/* Preliminares e Prejudiciais */}
                {(result.preliminares.length > 0 || result.prejudiciais.prescricao || result.prejudiciais.decadencia) && (
                  <PreliminaresSection
                    preliminares={result.preliminares}
                    prejudiciais={result.prejudiciais}
                  />
                )}

                {/* Pedidos */}
                {result.pedidos.length > 0 && (
                  <PedidosSection pedidos={result.pedidos} />
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
  );
};

export default ResultsContainer;

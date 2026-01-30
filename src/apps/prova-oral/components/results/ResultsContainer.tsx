/**
 * @file ResultsContainer.tsx
 * @description Container principal dos resultados com tabs
 */

import React from 'react';
import {
  Users,
  FileText,
  Scale,
  AlertTriangle,
  MessageSquareQuote,
  UserCheck,
  Table,
} from 'lucide-react';
import { Tabs, Card, CardContent } from '../ui';
import { DepoentesTab } from './DepoentesTab';
import { SintesesTab } from './SintesesTab';
import { AnalisesTab } from './AnalisesTab';
import { ContradicoesTab } from './ContradicoesTab';
import { ConfissoesTab } from './ConfissoesTab';
import { CredibilidadeTab } from './CredibilidadeTab';
import { ComparativoTab } from './ComparativoTab';
import { useProvaOralStore } from '../../stores';
import type { ResultTabId } from '../../types';

export const ResultsContainer: React.FC = () => {
  const { result, activeTab, setActiveTab } = useProvaOralStore();

  if (!result) {
    return (
      <Card className="bg-slate-50 dark:bg-slate-800/50">
        <CardContent className="py-12 text-center">
          <Scale className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400">
            Nenhuma análise realizada ainda.
          </p>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-2">
            Insira a transcrição da audiência e clique em "Analisar Prova Oral".
          </p>
        </CardContent>
      </Card>
    );
  }

  const tabs = [
    {
      id: 'depoentes' as ResultTabId,
      label: 'Depoentes',
      icon: <Users className="w-4 h-4" />,
      badge: result.depoentes?.length || 0,
    },
    {
      id: 'sinteses' as ResultTabId,
      label: 'Sínteses',
      icon: <FileText className="w-4 h-4" />,
      badge: result.sinteses?.length || 0,
    },
    {
      id: 'analises' as ResultTabId,
      label: 'Análises',
      icon: <Scale className="w-4 h-4" />,
      badge: result.analises?.length || 0,
    },
    {
      id: 'contradicoes' as ResultTabId,
      label: 'Contradições',
      icon: <AlertTriangle className="w-4 h-4" />,
      badge: result.contradicoes?.length || 0,
    },
    {
      id: 'confissoes' as ResultTabId,
      label: 'Confissões',
      icon: <MessageSquareQuote className="w-4 h-4" />,
      badge: result.confissoes?.length || 0,
    },
    {
      id: 'credibilidade' as ResultTabId,
      label: 'Credibilidade',
      icon: <UserCheck className="w-4 h-4" />,
      badge: result.credibilidade?.length || 0,
    },
    {
      id: 'comparativo' as ResultTabId,
      label: 'Comparativo',
      icon: <Table className="w-4 h-4" />,
    },
  ];

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId as ResultTabId);
  };

  return (
    <Card>
      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={handleTabChange}
      >
        {(currentTab) => (
          <div className="p-4">
            {currentTab === 'depoentes' && (
              <DepoentesTab depoentes={result.depoentes} />
            )}
            {currentTab === 'sinteses' && (
              <SintesesTab sinteses={result.sinteses} />
            )}
            {currentTab === 'analises' && (
              <AnalisesTab analises={result.analises} />
            )}
            {currentTab === 'contradicoes' && (
              <ContradicoesTab contradicoes={result.contradicoes} />
            )}
            {currentTab === 'confissoes' && (
              <ConfissoesTab confissoes={result.confissoes} />
            )}
            {currentTab === 'credibilidade' && (
              <CredibilidadeTab credibilidade={result.credibilidade} />
            )}
            {currentTab === 'comparativo' && (
              <ComparativoTab resultado={result} />
            )}
          </div>
        )}
      </Tabs>
    </Card>
  );
};

export default ResultsContainer;

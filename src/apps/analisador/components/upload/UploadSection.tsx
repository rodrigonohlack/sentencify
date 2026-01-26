/**
 * @file UploadSection.tsx
 * @description Seção completa de upload de documentos
 * Suporta petição inicial, múltiplas emendas e múltiplas contestações
 */

import React, { useCallback, useMemo } from 'react';
import { FileText, FileCheck, FilePlus, Scale } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui';
import { FileUploader } from './FileUploader';
import { DocumentList } from './DocumentList';
import { useDocumentStore } from '../../stores';
import { useFileProcessing } from '../../hooks';

export const UploadSection: React.FC = () => {
  const {
    peticao,
    emendas,
    contestacoes,
    reorderEmendas,
    reorderContestacoes
  } = useDocumentStore();

  const {
    processEmenda,
    processContestacao,
    removeEmenda,
    removeContestacao
  } = useFileProcessing();

  // Handlers para emendas
  const handleAddEmenda = useCallback(async (file: File) => {
    await processEmenda(file);
  }, [processEmenda]);

  const handleReorderEmendas = useCallback((ids: string[]) => {
    reorderEmendas(ids);
  }, [reorderEmendas]);

  const handleRemoveEmenda = useCallback((id: string) => {
    removeEmenda(id);
  }, [removeEmenda]);

  // Handlers para contestações
  const handleAddContestacao = useCallback(async (file: File) => {
    await processContestacao(file);
  }, [processContestacao]);

  const handleReorderContestacoes = useCallback((ids: string[]) => {
    reorderContestacoes(ids);
  }, [reorderContestacoes]);

  const handleRemoveContestacao = useCallback((id: string) => {
    removeContestacao(id);
  }, [removeContestacao]);

  // Status resumido
  const statusInfo = useMemo(() => {
    const peticaoReady = peticao?.status === 'ready';
    const emendasReady = emendas.filter((e) => e.status === 'ready').length;
    const contestacoesReady = contestacoes.filter((c) => c.status === 'ready').length;

    if (!peticaoReady) return null;

    const parts: string[] = ['Petição inicial'];
    if (emendasReady > 0) {
      parts.push(`${emendasReady} emenda${emendasReady > 1 ? 's' : ''}`);
    }
    if (contestacoesReady > 0) {
      parts.push(`${contestacoesReady} contestaç${contestacoesReady > 1 ? 'ões' : 'ão'}`);
    }

    if (parts.length === 1) {
      return 'Petição inicial pronta para análise (sem emendas ou contestações)';
    }

    const last = parts.pop();
    return `${parts.join(', ')} e ${last} prontas para análise`;
  }, [peticao, emendas, contestacoes]);

  return (
    <Card>
      <CardHeader>
        <CardTitle icon={<FileText className="w-5 h-5" />}>
          Documentos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Petição Inicial */}
        <div>
          <FileUploader
            type="peticao"
            label="Petição Inicial"
            description="Documento obrigatório para análise"
          />
        </div>

        {/* Emendas à Petição */}
        <DocumentList
          documents={emendas}
          onReorder={handleReorderEmendas}
          onRemove={handleRemoveEmenda}
          onAdd={handleAddEmenda}
          title="Emendas à Petição"
          icon={<FilePlus className="w-4 h-4 text-amber-600 dark:text-amber-400" />}
          emptyMessage="Nenhuma emenda adicionada"
        />

        {/* Contestações */}
        <DocumentList
          documents={contestacoes}
          onReorder={handleReorderContestacoes}
          onRemove={handleRemoveContestacao}
          onAdd={handleAddContestacao}
          title="Contestações"
          icon={<Scale className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
          emptyMessage="Nenhuma contestação adicionada"
        />

        {/* Status resumido */}
        {statusInfo && (
          <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
            <FileCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
              {statusInfo}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UploadSection;

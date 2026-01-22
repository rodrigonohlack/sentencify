/**
 * @file UploadSection.tsx
 * @description Seção completa de upload de documentos
 */

import React from 'react';
import { FileText, FileCheck } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui';
import { FileUploader } from './FileUploader';
import { useDocumentStore } from '../../stores';

export const UploadSection: React.FC = () => {
  const { peticao, contestacao } = useDocumentStore();

  const documentsReady = peticao?.status === 'ready';
  const hasContestacao = contestacao?.status === 'ready';

  return (
    <Card>
      <CardHeader>
        <CardTitle icon={<FileText className="w-5 h-5" />}>
          Documentos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Petição Inicial */}
        <FileUploader
          type="peticao"
          label="Petição Inicial"
          description="Documento obrigatório para análise"
        />

        {/* Contestação */}
        <FileUploader
          type="contestacao"
          label="Contestação"
          description="Permite análise comparativa"
          optional
        />

        {/* Status resumido */}
        {documentsReady && (
          <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
            <FileCheck className="w-5 h-5 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-700">
              {hasContestacao
                ? 'Petição e Contestação prontas para análise'
                : 'Petição pronta para análise (sem contestação)'
              }
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UploadSection;

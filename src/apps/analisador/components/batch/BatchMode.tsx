/**
 * @file BatchMode.tsx
 * @description Componente de processamento em lote de PDFs
 * @version 1.39.0
 */

import React, { useCallback, useState, useMemo } from 'react';
import {
  Upload,
  FileText,
  Trash2,
  Play,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Link2,
  X,
} from 'lucide-react';
import { useAnalysesStore, BATCH_CONCURRENCY_LIMIT } from '../../stores';
import { useAnalysesAPI } from '../../hooks';
import { useAnalysis, useFileProcessing } from '../../hooks';
import { Button, Card, CardContent, ProgressBar } from '../ui';
import type { BatchFile, BatchPair, AnalysisResult } from '../../types/analysis.types';

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Extrai número do processo do nome do arquivo
 * Padrão esperado: NNNNNNN-NN.NNNN.N.NN.NNNN ou similar
 */
const extractNumeroProcesso = (filename: string): string | null => {
  // Remove extensão
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');

  // Padrão CNJ: 0000000-00.0000.0.00.0000
  const cnjPattern = /(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})/;
  const match = nameWithoutExt.match(cnjPattern);

  if (match) return match[1];

  // Tenta extrair qualquer sequência numérica longa
  const numericPattern = /(\d{15,20})/;
  const numericMatch = nameWithoutExt.match(numericPattern);

  return numericMatch ? numericMatch[1] : null;
};

/**
 * Detecta tipo de documento pelo nome do arquivo
 */
const detectTipoDocumento = (filename: string): 'peticao' | 'contestacao' => {
  const lower = filename.toLowerCase();

  if (
    lower.includes('contestacao') ||
    lower.includes('contestação') ||
    lower.includes('defesa') ||
    lower.includes('resposta')
  ) {
    return 'contestacao';
  }

  return 'peticao';
};

/**
 * Gera ID único
 */
const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

// ═══════════════════════════════════════════════════════════════════════════
// SUBCOMPONENTES
// ═══════════════════════════════════════════════════════════════════════════

interface FileItemProps {
  file: BatchFile;
  onRemove: (id: string) => void;
  onTypeChange: (id: string, tipo: 'peticao' | 'contestacao') => void;
}

const FileItem: React.FC<FileItemProps> = ({ file, onRemove, onTypeChange }) => {
  const statusIcon = {
    pending: <FileText className="w-5 h-5 text-slate-400 dark:text-slate-500" />,
    processing: <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />,
    success: <CheckCircle className="w-5 h-5 text-emerald-500" />,
    error: <XCircle className="w-5 h-5 text-red-500" />,
  };

  return (
    <div
      className={`
        flex items-center gap-3 p-3 rounded-lg border transition-colors
        ${file.status === 'error'
          ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          : file.status === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
        }
      `}
    >
      {statusIcon[file.status]}

      <div className="flex-1 min-w-0">
        <p className="font-medium text-slate-800 dark:text-slate-100 truncate">
          {file.file.name}
        </p>
        <div className="flex items-center gap-2 mt-1">
          {file.numeroProcesso && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {file.numeroProcesso}
            </span>
          )}
          {file.matchedWith && (
            <span className="inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400">
              <Link2 className="w-3 h-3" />
              Pareado
            </span>
          )}
          {file.error && (
            <span className="text-xs text-red-600 dark:text-red-400">{file.error}</span>
          )}
        </div>
      </div>

      {/* Tipo selector */}
      <select
        value={file.tipo}
        onChange={(e) => onTypeChange(file.id, e.target.value as 'peticao' | 'contestacao')}
        disabled={file.status !== 'pending'}
        className="text-sm border border-slate-300 dark:border-slate-600 rounded-md px-2 py-1 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 disabled:opacity-50"
      >
        <option value="peticao">Petição</option>
        <option value="contestacao">Contestação</option>
      </select>

      {/* Remove button */}
      <button
        onClick={() => onRemove(file.id)}
        disabled={file.status === 'processing'}
        className="p-1.5 text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 transition-colors disabled:opacity-50"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

export const BatchMode: React.FC = () => {
  const [isDragOver, setIsDragOver] = useState(false);

  // Stores
  const {
    batch,
    setBatchFiles,
    addBatchFiles,
    updateBatchFile,
    removeBatchFile,
    clearBatchFiles,
    setBatchProcessing,
    setBatchProgress,
    resetBatch,
  } = useAnalysesStore();

  // Hooks
  const { createAnalysis } = useAnalysesAPI();
  const { extractPDFText } = useFileProcessing();
  const { analyzeWithAI } = useAnalysis();

  // Computed: agrupar arquivos por número de processo
  const pairs = useMemo((): BatchPair[] => {
    const byProcesso = new Map<string, { peticao?: BatchFile; contestacao?: BatchFile }>();
    const unmatched: BatchFile[] = [];

    batch.files.forEach((file) => {
      if (file.numeroProcesso) {
        const existing = byProcesso.get(file.numeroProcesso) || {};
        if (file.tipo === 'peticao') {
          existing.peticao = file;
        } else {
          existing.contestacao = file;
        }
        byProcesso.set(file.numeroProcesso, existing);
      } else {
        unmatched.push(file);
      }
    });

    const result: BatchPair[] = [];

    // Adicionar pares completos e incompletos
    byProcesso.forEach((group) => {
      if (group.peticao) {
        result.push({
          peticao: group.peticao,
          contestacao: group.contestacao,
        });
      } else if (group.contestacao) {
        // Contestação sem petição - criar par incompleto
        result.push({
          peticao: group.contestacao, // Usar como documento principal
          contestacao: undefined,
        });
      }
    });

    // Adicionar arquivos não pareados
    unmatched.forEach((file) => {
      if (file.tipo === 'peticao') {
        result.push({ peticao: file });
      } else {
        // Contestação sem petição
        result.push({ peticao: file });
      }
    });

    return result;
  }, [batch.files]);

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const files = Array.from(e.dataTransfer.files).filter(
        (f) => f.type === 'application/pdf'
      );

      if (files.length === 0) return;

      const newFiles: BatchFile[] = files.map((file) => ({
        id: generateId(),
        file,
        tipo: detectTipoDocumento(file.name),
        numeroProcesso: extractNumeroProcesso(file.name),
        status: 'pending',
      }));

      addBatchFiles(newFiles);
    },
    [addBatchFiles]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []).filter(
        (f) => f.type === 'application/pdf'
      );

      if (files.length === 0) return;

      const newFiles: BatchFile[] = files.map((file) => ({
        id: generateId(),
        file,
        tipo: detectTipoDocumento(file.name),
        numeroProcesso: extractNumeroProcesso(file.name),
        status: 'pending',
      }));

      addBatchFiles(newFiles);

      // Limpar input para permitir re-seleção
      e.target.value = '';
    },
    [addBatchFiles]
  );

  const handleTypeChange = useCallback(
    (id: string, tipo: 'peticao' | 'contestacao') => {
      updateBatchFile(id, { tipo });
    },
    [updateBatchFile]
  );

  const handleRemove = useCallback(
    (id: string) => {
      removeBatchFile(id);
    },
    [removeBatchFile]
  );

  const handleClearAll = useCallback(() => {
    clearBatchFiles();
  }, [clearBatchFiles]);

  const handleProcess = useCallback(async () => {
    if (pairs.length === 0) return;

    setBatchProcessing(true);
    let processed = 0;
    let errors = 0;

    // Processar pares em paralelo com limite de concorrência
    const processPair = async (pair: BatchPair): Promise<void> => {
      const { peticao, contestacao } = pair;

      try {
        // Marcar como processando
        updateBatchFile(peticao.id, { status: 'processing' });
        if (contestacao) {
          updateBatchFile(contestacao.id, { status: 'processing' });
        }

        // Processar PDFs
        const peticaoResult = await extractPDFText(peticao.file);
        const contestacaoResult = contestacao ? await extractPDFText(contestacao.file) : null;

        // Analisar com IA
        const analysisResult = await analyzeWithAI(
          peticaoResult.text,
          contestacaoResult?.text || null
        );

        if (!analysisResult) {
          throw new Error('Falha na análise com IA');
        }

        // Salvar no banco
        const id = await createAnalysis({
          resultado: analysisResult,
          nomeArquivoPeticao: peticao.file.name,
          nomeArquivoContestacao: contestacao?.file.name,
        });

        if (!id) {
          throw new Error('Falha ao salvar análise');
        }

        // Marcar como sucesso
        updateBatchFile(peticao.id, { status: 'success' });
        if (contestacao) {
          updateBatchFile(contestacao.id, { status: 'success' });
        }

        processed++;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';

        // Marcar como erro
        updateBatchFile(peticao.id, { status: 'error', error: errorMessage });
        if (contestacao) {
          updateBatchFile(contestacao.id, { status: 'error', error: errorMessage });
        }

        errors++;
      }

      setBatchProgress(processed + errors, pairs.length, processed, errors);
    };

    // Processar em chunks de BATCH_CONCURRENCY_LIMIT
    for (let i = 0; i < pairs.length; i += BATCH_CONCURRENCY_LIMIT) {
      const chunk = pairs.slice(i, i + BATCH_CONCURRENCY_LIMIT);
      await Promise.all(chunk.map(processPair));
    }

    setBatchProcessing(false);
  }, [
    pairs,
    setBatchProcessing,
    setBatchProgress,
    updateBatchFile,
    extractPDFText,
    analyzeWithAI,
    createAnalysis,
  ]);

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  const pendingCount = batch.files.filter((f) => f.status === 'pending').length;
  const canProcess = pendingCount > 0 && !batch.isProcessing;

  return (
    <Card className="h-full">
      <CardContent className="p-0 flex flex-col h-full">
        {/* Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            p-6 border-2 border-dashed rounded-t-xl transition-colors
            ${isDragOver
              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
              : 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50'
            }
          `}
        >
          <div className="flex flex-col items-center gap-3 text-center">
            <Upload
              className={`w-10 h-10 ${
                isDragOver ? 'text-indigo-500' : 'text-slate-400 dark:text-slate-500'
              }`}
            />
            <div>
              <p className="font-medium text-slate-800 dark:text-slate-100">
                Arraste PDFs aqui ou{' '}
                <label className="text-indigo-600 dark:text-indigo-400 cursor-pointer hover:underline">
                  selecione arquivos
                  <input
                    type="file"
                    accept="application/pdf"
                    multiple
                    onChange={handleFileInput}
                    className="hidden"
                  />
                </label>
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Petições e contestações serão pareadas automaticamente pelo número do processo
              </p>
            </div>
          </div>
        </div>

        {/* File List */}
        {batch.files.length > 0 && (
          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">
                Arquivos ({batch.files.length})
              </h3>
              <button
                onClick={handleClearAll}
                disabled={batch.isProcessing}
                className="text-sm text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
              >
                Limpar todos
              </button>
            </div>

            <div className="space-y-2">
              {batch.files.map((file) => (
                <FileItem
                  key={file.id}
                  file={file}
                  onRemove={handleRemove}
                  onTypeChange={handleTypeChange}
                />
              ))}
            </div>
          </div>
        )}

        {/* Progress */}
        {batch.isProcessing && (
          <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
            <ProgressBar
              progress={(batch.processedCount + batch.errorCount) / batch.totalFiles * 100}
              message={`Processando ${batch.processedCount + batch.errorCount} de ${pairs.length} pares...`}
            />
            {batch.errorCount > 0 && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                {batch.errorCount} erro(s) encontrado(s)
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-slate-500 dark:text-slate-400">
              {pairs.length > 0 && (
                <>
                  {pairs.length} par{pairs.length > 1 ? 'es' : ''} de documentos
                </>
              )}
            </div>

            <Button
              onClick={handleProcess}
              disabled={!canProcess}
              loading={batch.isProcessing}
              icon={batch.isProcessing ? undefined : <Play className="w-4 h-4" />}
            >
              {batch.isProcessing
                ? 'Processando...'
                : `Processar ${pendingCount > 0 ? `(${pendingCount})` : ''}`}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BatchMode;

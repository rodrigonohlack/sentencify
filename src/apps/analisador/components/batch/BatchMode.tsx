/**
 * @file BatchMode.tsx
 * @description Componente de processamento em lote de PDFs com agrupamento por processo
 * @version 1.39.0 - Redesign com process cards
 */

import React, { useCallback, useState, useMemo, useRef } from 'react';
import {
  Upload,
  FileText,
  Trash2,
  CheckCircle,
  AlertCircle,
  Loader2,
  Scale,
  X,
} from 'lucide-react';
import { useAnalysesStore } from '../../stores';
import { useAnalysesAPI } from '../../hooks';
import { useAnalysis, useFileProcessing } from '../../hooks';
import { ProgressBar, useToast } from '../ui';
import type { BatchFile, BatchPair } from '../../types/analysis.types';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

interface ProcessGroup {
  numeroProcesso: string;
  peticao?: BatchFile;
  contestacao?: BatchFile;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Extrai número do processo do nome do arquivo
 * Suporta formatos: [0000272-52.2025.5.08.0201] ou 0000272-52.2025.5.08.0201
 */
const extractNumeroProcesso = (filename: string): string | null => {
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');

  // Formato com colchetes: [0000272-52.2025.5.08.0201]
  const bracketPattern = /\[(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})\]/;
  const bracketMatch = nameWithoutExt.match(bracketPattern);
  if (bracketMatch) return bracketMatch[1];

  // Padrão CNJ sem colchetes: 0000272-52.2025.5.08.0201
  const cnjPattern = /(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})/;
  const cnjMatch = nameWithoutExt.match(cnjPattern);
  if (cnjMatch) return cnjMatch[1];

  // Fallback: sequência numérica longa
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

/** Gera ID único */
const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

/** Limite de tamanho por arquivo (50MB) */
const MAX_FILE_SIZE_MB = 50;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// ═══════════════════════════════════════════════════════════════════════════
// SUBCOMPONENTES
// ═══════════════════════════════════════════════════════════════════════════

interface ProcessCardProps {
  index: number;
  group: ProcessGroup;
  onRemove: (processoNum: string) => void;
}

const ProcessCard: React.FC<ProcessCardProps> = React.memo(({ index, group, onRemove }) => {
  const getStatusIcon = (file?: BatchFile) => {
    if (!file) return <FileText className="w-4 h-4 text-slate-300 dark:text-slate-600" />;
    switch (file.status) {
      case 'processing':
        return <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <CheckCircle className="w-4 h-4 text-emerald-500" />;
    }
  };

  const getFileLabel = (file: BatchFile | undefined, label: string) => {
    if (!file) {
      return (
        <span className="text-sm text-slate-400 dark:text-slate-500 italic">
          Não fornecida (opcional)
        </span>
      );
    }
    return (
      <span className="text-sm text-slate-700 dark:text-slate-200 block truncate" title={file.file.name}>
        {file.file.name}
      </span>
    );
  };

  // Determine card status based on files
  const isProcessing = group.peticao?.status === 'processing' || group.contestacao?.status === 'processing';
  const hasError = group.peticao?.status === 'error' || group.contestacao?.status === 'error';
  const isSuccess = (group.peticao?.status === 'success' || !group.peticao) &&
    (group.contestacao?.status === 'success' || !group.contestacao) &&
    (group.peticao?.status === 'success' || group.contestacao?.status === 'success');

  return (
    <div
      className={`
        rounded-xl border p-4 transition-all
        ${hasError
          ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
          : isSuccess
            ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800'
            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
        }
      `}
      aria-label={`Processo ${group.numeroProcesso}`}
    >
      {/* Card Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-xs font-bold">
            {index + 1}
          </span>
          <span className="text-sm font-medium text-slate-800 dark:text-slate-100 font-mono">
            {group.numeroProcesso}
          </span>
          {isProcessing && (
            <Loader2 className="w-3.5 h-3.5 text-indigo-500 animate-spin" />
          )}
        </div>
        <button
          onClick={() => onRemove(group.numeroProcesso)}
          className="p-1 text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 transition-colors"
          title="Remover processo"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Files Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Petição */}
        <div className="flex items-start gap-2 min-w-0">
          {getStatusIcon(group.peticao)}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-0.5">
              Petição Inicial
            </p>
            {getFileLabel(group.peticao, 'Petição')}
            {group.peticao?.error && (
              <p className="text-xs text-red-500 mt-0.5 truncate">{group.peticao.error}</p>
            )}
          </div>
        </div>

        {/* Contestação */}
        <div className="flex items-start gap-2 min-w-0">
          {getStatusIcon(group.contestacao)}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-0.5">
              Contestação
            </p>
            {getFileLabel(group.contestacao, 'Contestação')}
            {group.contestacao?.error && (
              <p className="text-xs text-red-500 mt-0.5 truncate">{group.contestacao.error}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

ProcessCard.displayName = 'ProcessCard';

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

export const BatchMode: React.FC = () => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  // Stores
  const {
    batch,
    addBatchFiles,
    updateBatchFile,
    removeBatchFile,
    clearBatchFiles,
    setBatchProcessing,
    setBatchProgress,
    settings,
  } = useAnalysesStore();

  // Hooks
  const { createAnalysis, fetchAnalyses } = useAnalysesAPI();
  const { extractPDFText } = useFileProcessing();
  const { analyzeWithAI } = useAnalysis();

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPUTED: Agrupar arquivos por número de processo
  // ═══════════════════════════════════════════════════════════════════════════

  const { processGroups, unmatchedFiles } = useMemo(() => {
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

    const groups: ProcessGroup[] = Array.from(byProcesso.entries()).map(([numero, files]) => ({
      numeroProcesso: numero,
      peticao: files.peticao,
      contestacao: files.contestacao,
    }));

    return { processGroups: groups, unmatchedFiles: unmatched };
  }, [batch.files]);

  // Convert processGroups to BatchPairs for processing
  const pairs = useMemo((): BatchPair[] => {
    return processGroups
      .filter((g) => g.peticao || g.contestacao)
      .map((g) => ({
        peticao: g.peticao || g.contestacao!,
        contestacao: g.peticao ? g.contestacao : undefined,
      }));
  }, [processGroups]);

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  const processFiles = useCallback(
    (files: File[]) => {
      const pdfFiles = files.filter((f) => f.type === 'application/pdf');
      const nonPdfCount = files.length - pdfFiles.length;

      if (nonPdfCount > 0) {
        showToast('warning', `${nonPdfCount} arquivo(s) ignorado(s) — apenas PDFs são aceitos`);
      }

      if (pdfFiles.length === 0) return;

      // Verificar tamanho e duplicatas
      const existingNames = new Set(batch.files.map((f) => f.file.name));
      const validFiles: File[] = [];
      let oversizedCount = 0;
      let duplicateCount = 0;

      pdfFiles.forEach((file) => {
        if (file.size > MAX_FILE_SIZE_BYTES) {
          oversizedCount++;
        } else if (existingNames.has(file.name)) {
          duplicateCount++;
        } else {
          validFiles.push(file);
          existingNames.add(file.name);
        }
      });

      if (oversizedCount > 0) {
        showToast('warning', `${oversizedCount} arquivo(s) excede(m) ${MAX_FILE_SIZE_MB}MB`);
      }
      if (duplicateCount > 0) {
        showToast('info', `${duplicateCount} arquivo(s) duplicado(s) ignorado(s)`);
      }

      if (validFiles.length === 0) return;

      const newFiles: BatchFile[] = validFiles.map((file) => ({
        id: generateId(),
        file,
        tipo: detectTipoDocumento(file.name),
        numeroProcesso: extractNumeroProcesso(file.name),
        status: 'pending',
      }));

      addBatchFiles(newFiles);
    },
    [addBatchFiles, batch.files, showToast]
  );

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
      const files = Array.from(e.dataTransfer.files);
      processFiles(files);
    },
    [processFiles]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      processFiles(files);
      e.target.value = '';
    },
    [processFiles]
  );

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleUploadKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleUploadClick();
      }
    },
    [handleUploadClick]
  );

  const handleRemoveProcess = useCallback(
    (processoNum: string) => {
      // Remove all files with this process number
      batch.files.forEach((file) => {
        if (file.numeroProcesso === processoNum) {
          removeBatchFile(file.id);
        }
      });
    },
    [batch.files, removeBatchFile]
  );

  const handleRemoveUnmatched = useCallback(
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
    const concurrencyLimit = settings.concurrencyLimit;

    const processPair = async (pair: BatchPair): Promise<void> => {
      const { peticao, contestacao } = pair;

      try {
        updateBatchFile(peticao.id, { status: 'processing' });
        if (contestacao) {
          updateBatchFile(contestacao.id, { status: 'processing' });
        }

        const peticaoResult = await extractPDFText(peticao.file);
        const contestacaoResult = contestacao ? await extractPDFText(contestacao.file) : null;

        const analysisResult = await analyzeWithAI(
          peticaoResult.text,
          contestacaoResult?.text || null
        );

        if (!analysisResult) {
          throw new Error('Falha na análise com IA');
        }

        const id = await createAnalysis({
          resultado: analysisResult,
          nomeArquivoPeticao: peticao.file.name,
          nomeArquivoContestacao: contestacao?.file.name,
        });

        if (!id) {
          throw new Error('Falha ao salvar análise');
        }

        updateBatchFile(peticao.id, { status: 'success' });
        if (contestacao) {
          updateBatchFile(contestacao.id, { status: 'success' });
        }

        processed++;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
        updateBatchFile(peticao.id, { status: 'error', error: errorMessage });
        if (contestacao) {
          updateBatchFile(contestacao.id, { status: 'error', error: errorMessage });
        }
        errors++;
      }

      setBatchProgress(processed + errors, pairs.length, processed, errors);
    };

    // Processar em chunks com concurrencyLimit do settings
    for (let i = 0; i < pairs.length; i += concurrencyLimit) {
      const chunk = pairs.slice(i, i + concurrencyLimit);
      await Promise.all(chunk.map(processPair));
    }

    setBatchProcessing(false);

    // Post-processing
    if (processed > 0) {
      showToast('success', `${processed} processo(s) analisado(s) com sucesso`);
      fetchAnalyses();
      clearBatchFiles();
    } else if (errors > 0) {
      showToast('error', `Falha ao processar ${errors} processo(s)`);
    }
  }, [
    pairs,
    settings.concurrencyLimit,
    setBatchProcessing,
    setBatchProgress,
    updateBatchFile,
    extractPDFText,
    analyzeWithAI,
    createAnalysis,
    showToast,
    fetchAnalyses,
    clearBatchFiles,
  ]);

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  const hasFiles = batch.files.length > 0;

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleUploadClick}
        onKeyDown={handleUploadKeyDown}
        role="button"
        tabIndex={0}
        className={`
          p-8 border-2 border-dashed rounded-2xl transition-all cursor-pointer
          ${isDragOver
            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 scale-[1.01]'
            : 'border-slate-300 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800/30 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          multiple
          onChange={handleFileInput}
          className="hidden"
        />

        <div className="flex flex-col items-center gap-3 text-center">
          <div className={`p-3 rounded-xl ${isDragOver ? 'bg-indigo-100 dark:bg-indigo-900/40' : 'bg-slate-100 dark:bg-slate-700/50'}`}>
            <Upload
              className={`w-8 h-8 ${
                isDragOver ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'
              }`}
            />
          </div>
          <div>
            <p className="font-medium text-slate-800 dark:text-slate-100">
              Arraste os arquivos aqui ou clique para selecionar
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Selecione múltiplos PDFs de uma vez (petições iniciais e contestações)
            </p>
          </div>

          {/* Format hint */}
          <div className="mt-3 w-full max-w-sm bg-slate-100 dark:bg-slate-700/50 rounded-lg px-4 py-3">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
              Formato esperado do nome:
            </p>
            <div className="space-y-1">
              <p className="text-xs text-slate-600 dark:text-slate-300 font-mono">
                [0000272-52.2025.5.08.0201] 1. Petição Inicial
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300 font-mono">
                [0000272-52.2025.5.08.0201] 2. Contestação
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Process List */}
      {processGroups.length > 0 && (
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                {processGroups.length} processo{processGroups.length > 1 ? 's' : ''} identificado{processGroups.length > 1 ? 's' : ''}
              </span>
            </div>
            <button
              onClick={handleClearAll}
              disabled={batch.isProcessing}
              className="text-sm text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors disabled:opacity-50"
            >
              Limpar todos
            </button>
          </div>

          {/* Process Cards */}
          <div className="space-y-3">
            {processGroups.map((group, idx) => (
              <ProcessCard
                key={group.numeroProcesso}
                index={idx}
                group={group}
                onRemove={handleRemoveProcess}
              />
            ))}
          </div>
        </div>
      )}

      {/* Unmatched Warning */}
      {unmatchedFiles.length > 0 && (
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-red-800 dark:text-red-200">
                Alguns arquivos não foram identificados
              </p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                {unmatchedFiles.length} arquivo{unmatchedFiles.length > 1 ? 's' : ''} não identificado{unmatchedFiles.length > 1 ? 's' : ''}. Verifique se o nome segue o padrão: [NÚMERO-DO-PROCESSO] Tipo do documento
              </p>
              <div className="mt-2 space-y-1">
                {unmatchedFiles.map((file) => (
                  <div key={file.id} className="flex items-center justify-between gap-2">
                    <span className="text-xs text-red-700 dark:text-red-300 truncate">
                      {file.file.name}
                    </span>
                    <button
                      onClick={() => handleRemoveUnmatched(file.id)}
                      className="p-0.5 text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors flex-shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Progress */}
      {batch.isProcessing && (
        <div className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 p-4">
          <ProgressBar
            progress={pairs.length > 0 ? ((batch.processedCount + batch.errorCount) / pairs.length) * 100 : 0}
            message={`Processando ${batch.processedCount + batch.errorCount} de ${pairs.length} processo${pairs.length > 1 ? 's' : ''}...`}
          />
          {batch.errorCount > 0 && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-2">
              {batch.errorCount} erro(s) encontrado(s)
            </p>
          )}
        </div>
      )}

      {/* Action Button */}
      {hasFiles && !batch.isProcessing && (
        <button
          onClick={handleProcess}
          disabled={processGroups.length === 0}
          aria-disabled={processGroups.length === 0}
          className={`
            w-full py-3.5 px-6 rounded-xl font-medium text-white text-sm
            flex items-center justify-center gap-2 transition-all
            ${processGroups.length > 0
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30 hover:shadow-xl hover:shadow-indigo-300 dark:hover:shadow-indigo-900/40'
              : 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed'
            }
          `}
        >
          <Scale className="w-4 h-4" />
          Processar {processGroups.length} Processo{processGroups.length !== 1 ? 's' : ''}
        </button>
      )}
    </div>
  );
};

export default BatchMode;

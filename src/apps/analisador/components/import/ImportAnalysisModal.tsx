/**
 * @file ImportAnalysisModal.tsx
 * @description Modal para importar análises geradas externamente (JSON)
 * @version 1.43.38
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  Upload,
  FileJson,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Trash2,
} from 'lucide-react';
import { Modal, Button, useToast } from '../ui';
import { useAnalysesAPI } from '../../hooks';
import { validateImportFile, type ValidationResult } from '../../utils/import-validation';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS LOCAIS
// ═══════════════════════════════════════════════════════════════════════════

interface ParsedFile {
  filename: string;
  /** Resultados de validação — um por análise dentro do arquivo (array ou single) */
  items: Array<ValidationResult & { rowIndex: number }>;
  /** Erro de parsing JSON (se houver) */
  parseError?: string;
}

interface ImportProgress {
  current: number;
  total: number;
  /** Número de análises importadas com sucesso até agora */
  succeeded: number;
  /** Lista de erros encontrados durante a importação */
  errors: string[];
}

interface ImportAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE
// ═══════════════════════════════════════════════════════════════════════════

export const ImportAnalysisModal: React.FC<ImportAnalysisModalProps> = ({ isOpen, onClose }) => {
  const { showToast } = useToast();
  const { createAnalysis } = useAnalysesAPI();
  const [files, setFiles] = useState<ParsedFile[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);

  // ═══════════════════════════════════════════════════════════════════════════
  // ESTATÍSTICAS AGREGADAS
  // ═══════════════════════════════════════════════════════════════════════════

  const stats = useMemo(() => {
    let totalItems = 0;
    let validItems = 0;
    let invalidItems = 0;
    for (const f of files) {
      if (f.parseError) {
        invalidItems += 1;
        continue;
      }
      totalItems += f.items.length;
      validItems += f.items.filter((i) => i.valid).length;
      invalidItems += f.items.filter((i) => !i.valid).length;
    }
    return { totalItems, validItems, invalidItems };
  }, [files]);

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  const handleFiles = useCallback(async (fileList: FileList) => {
    const next: ParsedFile[] = [];
    for (const f of Array.from(fileList)) {
      if (!f.name.toLowerCase().endsWith('.json')) {
        next.push({ filename: f.name, items: [], parseError: 'Arquivo não é .json' });
        continue;
      }
      try {
        const text = await f.text();
        const parsed: unknown = JSON.parse(text);
        const batch = validateImportFile(parsed);
        next.push({
          filename: f.name,
          items: batch.items.map((r, idx) => ({ ...r, rowIndex: idx })),
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro ao parsear JSON';
        next.push({ filename: f.name, items: [], parseError: msg });
      }
    }
    setFiles((prev) => [...prev, ...next]);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        handleFiles(e.target.files);
        e.target.value = '';
      }
    },
    [handleFiles]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const handleRemoveFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleClear = useCallback(() => {
    setFiles([]);
    setProgress(null);
  }, []);

  const handleImport = useCallback(async () => {
    const valid = files
      .flatMap((f) =>
        f.parseError ? [] : f.items.filter((i) => i.valid && i.payload).map((i) => i.payload!)
      );
    if (valid.length === 0) {
      showToast('warning', 'Nenhuma análise válida para importar');
      return;
    }
    setIsImporting(true);
    setProgress({ current: 0, total: valid.length, succeeded: 0, errors: [] });
    let succeeded = 0;
    const errors: string[] = [];
    for (let i = 0; i < valid.length; i += 1) {
      const p = valid[i];
      setProgress({ current: i + 1, total: valid.length, succeeded, errors: [...errors] });
      const id = await createAnalysis(p);
      if (id) {
        succeeded += 1;
      } else {
        errors.push(`Análise ${i + 1}: falha na persistência`);
      }
    }
    setProgress({ current: valid.length, total: valid.length, succeeded, errors });
    setIsImporting(false);
    if (errors.length === 0) {
      showToast('success', `${succeeded} análise${succeeded === 1 ? '' : 's'} importada${succeeded === 1 ? '' : 's'} com sucesso`);
      setFiles([]);
      onClose();
    } else {
      showToast('warning', `${succeeded} importada${succeeded === 1 ? '' : 's'}, ${errors.length} com erro`);
    }
  }, [files, createAnalysis, onClose, showToast]);

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  const canImport = stats.validItems > 0 && !isImporting;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Importar Análises"
      subtitle="Carregue arquivos .json gerados externamente (skill analise-paralela-processos)"
      icon={<Upload className="w-5 h-5" />}
      size="xl"
      preventClose={isImporting}
      footer={
        <div className="flex items-center justify-between w-full">
          <button
            type="button"
            onClick={handleClear}
            disabled={isImporting || files.length === 0}
            className="text-sm text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
          >
            <Trash2 className="w-4 h-4" /> Limpar tudo
          </button>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={onClose} disabled={isImporting}>
              Fechar
            </Button>
            <Button
              variant="primary"
              onClick={handleImport}
              disabled={!canImport}
              icon={isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            >
              {isImporting
                ? `Importando ${progress?.current ?? 0}/${progress?.total ?? 0}`
                : `Importar ${stats.validItems} análise${stats.validItems === 1 ? '' : 's'}`}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-8 text-center bg-slate-50 dark:bg-slate-800/50 hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors"
        >
          <FileJson className="w-10 h-10 mx-auto text-slate-400 dark:text-slate-500 mb-3" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
            Arraste arquivos <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700">.json</code> aqui
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Cada arquivo pode conter uma análise (objeto) ou várias (array)
          </p>
          <label className="inline-block">
            <input
              type="file"
              accept="application/json,.json"
              multiple
              className="hidden"
              onChange={handleInputChange}
              disabled={isImporting}
            />
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium cursor-pointer transition-colors">
              <Upload className="w-4 h-4" /> Selecionar arquivos
            </span>
          </label>
        </div>

        {/* Resumo */}
        {files.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-sm">
            <span className="text-slate-600 dark:text-slate-300">
              <strong>{files.length}</strong> arquivo{files.length === 1 ? '' : 's'} ·{' '}
              <strong>{stats.totalItems}</strong> análise{stats.totalItems === 1 ? '' : 's'}
            </span>
            {stats.validItems > 0 && (
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="w-4 h-4" /> {stats.validItems} válida{stats.validItems === 1 ? '' : 's'}
              </span>
            )}
            {stats.invalidItems > 0 && (
              <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
                <XCircle className="w-4 h-4" /> {stats.invalidItems} inválida{stats.invalidItems === 1 ? '' : 's'}
              </span>
            )}
          </div>
        )}

        {/* Lista de arquivos */}
        {files.length > 0 && (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {files.map((file, fileIdx) => (
              <div
                key={`${file.filename}-${fileIdx}`}
                className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-800"
              >
                <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileJson className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                      {file.filename}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(fileIdx)}
                    disabled={isImporting}
                    className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/40 text-red-500 dark:text-red-400 transition-colors disabled:opacity-40"
                    aria-label="Remover arquivo"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-3">
                  {file.parseError ? (
                    <div className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400">
                      <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>JSON inválido: {file.parseError}</span>
                    </div>
                  ) : (
                    <ul className="space-y-1.5">
                      {file.items.map((item, idx) => (
                        <li key={idx} className="text-sm flex items-start gap-2">
                          {item.valid ? (
                            <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-slate-700 dark:text-slate-200">
                              {item.valid && item.payload?.resultado.identificacao ? (
                                <>
                                  {item.payload.resultado.identificacao.numeroProcesso || `Análise ${idx + 1}`}
                                  {' — '}
                                  <span className="text-slate-500 dark:text-slate-400">
                                    {item.payload.resultado.identificacao.reclamantes?.[0] || '?'}
                                    {' × '}
                                    {item.payload.resultado.identificacao.reclamadas?.join(', ') || '?'}
                                  </span>
                                </>
                              ) : (
                                <span className="text-red-600 dark:text-red-400">
                                  Análise {idx + 1} inválida
                                </span>
                              )}
                            </div>
                            {item.errors.length > 0 && (
                              <ul className="mt-1 ml-1 text-xs text-red-600 dark:text-red-400 space-y-0.5">
                                {item.errors.slice(0, 5).map((e, i) => (
                                  <li key={i}>• {e}</li>
                                ))}
                                {item.errors.length > 5 && (
                                  <li>• ... e mais {item.errors.length - 5} erro{item.errors.length - 5 === 1 ? '' : 's'}</li>
                                )}
                              </ul>
                            )}
                            {item.warnings.length > 0 && (
                              <ul className="mt-1 ml-1 text-xs text-amber-600 dark:text-amber-400 space-y-0.5">
                                {item.warnings.slice(0, 3).map((w, i) => (
                                  <li key={i} className="inline-flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> {w}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Progresso */}
        {progress && progress.errors.length > 0 && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40">
            <p className="text-sm font-medium text-red-800 dark:text-red-300 mb-1">
              Erros durante importação:
            </p>
            <ul className="text-xs text-red-700 dark:text-red-400 space-y-0.5">
              {progress.errors.map((e, i) => (
                <li key={i}>• {e}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ImportAnalysisModal;

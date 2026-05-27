/**
 * @file ImportJsonModal.tsx
 * @description Modal para importar uma análise de prova oral a partir de JSON
 * (tipicamente gerado pela skill analise-prova-oral-json). Valida, cria a
 * análise via API e carrega na tela. v1.47.0
 */

import React, { useCallback, useState } from 'react';
import { FileJson, Loader2, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { Modal, Button, useToast } from '../ui';
import { useProvaOralAPI } from '../../hooks';
import { useProvaOralStore } from '../../stores';
import {
  validateProvaOralImport,
  type ProvaOralValidationResult,
} from '../../utils/import-validation';

interface ImportJsonModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Chamado após import bem-sucedido (ex.: comutar para a tela de resultados). */
  onSuccess?: () => void;
}

interface ParsedJson {
  filename: string;
  result?: ProvaOralValidationResult;
  /** Erro de parsing ou de cardinalidade. */
  error?: string;
}

async function parseSingleJson(file: File): Promise<ParsedJson> {
  if (!file.name.toLowerCase().endsWith('.json')) {
    return { filename: file.name, error: 'Arquivo não é .json' };
  }
  try {
    const text = await file.text();
    const parsed: unknown = JSON.parse(text);
    if (Array.isArray(parsed)) {
      if (parsed.length === 0) {
        return { filename: file.name, error: 'Arquivo não contém nenhuma análise' };
      }
      if (parsed.length > 1) {
        return {
          filename: file.name,
          error: `Arquivo contém ${parsed.length} análises; a importação aceita apenas uma`,
        };
      }
      return { filename: file.name, result: validateProvaOralImport(parsed[0]) };
    }
    return { filename: file.name, result: validateProvaOralImport(parsed) };
  } catch (err) {
    return { filename: file.name, error: err instanceof Error ? err.message : 'Erro ao parsear JSON' };
  }
}

export const ImportJsonModal: React.FC<ImportJsonModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { showToast } = useToast();
  const { createAnalysis, error: apiError } = useProvaOralAPI();
  const loadAnalysis = useProvaOralStore((s) => s.loadAnalysis);

  const [parsed, setParsed] = useState<ParsedJson | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFile = useCallback(async (file: File | undefined) => {
    if (!file) return;
    setParsed(await parseSingleJson(file));
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      handleFile(e.dataTransfer.files?.[0]);
    },
    [handleFile]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFile(e.target.files?.[0]);
      e.target.value = '';
    },
    [handleFile]
  );

  const reset = useCallback(() => setParsed(null), []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const handleImport = useCallback(async () => {
    const payload = parsed?.result?.payload;
    if (!payload) return;
    setIsImporting(true);
    try {
      const { resultado, transcricao, sinteseProcesso } = payload;
      const id = await createAnalysis({ resultado, transcricao, sinteseProcesso });
      if (!id) {
        showToast('error', apiError || 'Falha ao salvar a análise importada. Tente novamente.');
        return;
      }
      loadAnalysis(id, transcricao, sinteseProcesso, resultado);
      showToast('success', 'Análise importada do JSON');
      reset();
      onSuccess?.();
      onClose();
    } finally {
      setIsImporting(false);
    }
  }, [parsed, createAnalysis, apiError, loadAnalysis, showToast, reset, onSuccess, onClose]);

  const result = parsed?.result;
  const canImport = result?.valid === true && !isImporting;
  const proc = result?.payload?.resultado.processo;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Importar análise (JSON)"
      subtitle="Importe uma análise gerada fora do app (ex.: pela skill analise-prova-oral-json)"
      icon={<FileJson className="w-5 h-5" />}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleImport}
            disabled={!canImport}
            icon={isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          >
            {isImporting ? 'Importando...' : 'Importar análise'}
          </Button>
        </>
      }
    >
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onClick={() => document.getElementById('prova-oral-import-json-input')?.click()}
        className={`p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all text-center ${
          isDragOver
            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
            : 'border-slate-300 dark:border-slate-600 hover:border-indigo-400 dark:hover:border-indigo-500'
        }`}
      >
        <FileJson className="w-8 h-8 mx-auto mb-2 text-slate-400" />
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Arraste um arquivo .json ou clique para selecionar
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Uma análise por arquivo</p>
        <input
          id="prova-oral-import-json-input"
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={handleInputChange}
          disabled={isImporting}
        />
      </div>

      {/* Erro de parsing / cardinalidade */}
      {parsed?.error && (
        <div className="mt-4 flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-800 dark:text-red-300">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{parsed.error}</p>
        </div>
      )}

      {/* Erros de validação */}
      {result && !result.valid && (
        <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <p className="text-sm font-medium text-red-800 dark:text-red-300 mb-2">JSON inválido:</p>
          <ul className="text-sm text-red-700 dark:text-red-400 list-disc pl-5 space-y-1">
            {result.errors.slice(0, 6).map((e, i) => (
              <li key={i}>{e}</li>
            ))}
            {result.errors.length > 6 && <li>… e mais {result.errors.length - 6}</li>}
          </ul>
        </div>
      )}

      {/* Preview de sucesso */}
      {result?.valid && (
        <div className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
          <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 mb-2">
            <CheckCircle2 className="w-5 h-5" />
            <p className="text-sm font-medium">{parsed?.filename} — pronto para importar</p>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {proc?.numero || proc?.numeroProcesso || 'Processo não identificado'} —{' '}
            {proc?.reclamante || '—'} × {proc?.reclamada || '—'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
            {result.payload!.resultado.depoentes.length} depoente(s),{' '}
            {result.payload!.resultado.analises.length} tema(s)
          </p>
          {result.warnings.length > 0 && (
            <ul className="mt-2 text-xs text-amber-600 dark:text-amber-400 list-disc pl-5 space-y-0.5">
              {result.warnings.slice(0, 4).map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Modal>
  );
};

export default ImportJsonModal;

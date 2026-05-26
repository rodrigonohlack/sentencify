/**
 * @file ImportJsonPanel.tsx
 * @description Importa um JSON avulso para SUBSTITUIR a análise do processo atual
 *              (disponível apenas quando o processo foi analisado sem contestação).
 * @version 1.46.0
 *
 * Diferente do ImportAnalysisModal (que CRIA novas análises via createAnalysis),
 * este painel SUBSTITUI o resultado da análise corrente via replaceAnalysisResult,
 * reaproveitando o mesmo validador (validateAnalysisImport).
 */

import React, { useCallback, useState } from 'react';
import {
  FileJson,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { Button, useToast } from '../ui';
import { useResultStore } from '../../stores';
import { useAnalysesAPI } from '../../hooks';
import { validateAnalysisImport, type ValidationResult } from '../../utils/import-validation';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════

/** Rótulo sintético quando o JSON não traz nomes de arquivos de contestação. */
const CONTESTACAO_SINTETICA = 'Contestação (importada via JSON)';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS LOCAIS
// ═══════════════════════════════════════════════════════════════════════════

interface ParsedJson {
  filename: string;
  /** Resultado da validação (quando o JSON foi parseado com sucesso). */
  result?: ValidationResult;
  /** Erro de parsing ou de cardinalidade (ex.: array com mais de uma análise). */
  error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Parseia e valida um único arquivo .json para import individual.
 * Aceita objeto único ou array de exatamente uma análise; arrays com mais de
 * uma análise são rejeitados (este painel substitui um único processo).
 */
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
          error: `Arquivo contém ${parsed.length} análises; a importação individual aceita apenas uma`,
        };
      }
      return { filename: file.name, result: validateAnalysisImport(parsed[0]) };
    }
    return { filename: file.name, result: validateAnalysisImport(parsed) };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao parsear JSON';
    return { filename: file.name, error: msg };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE
// ═══════════════════════════════════════════════════════════════════════════

interface ImportJsonPanelProps {
  /** Chamado após substituição bem-sucedida (para fechar o painel pai). */
  onSuccess?: () => void;
}

export const ImportJsonPanel: React.FC<ImportJsonPanelProps> = ({ onSuccess }) => {
  const { showToast } = useToast();
  const { replaceAnalysisResult } = useAnalysesAPI();

  const savedAnalysisId = useResultStore((s) => s.savedAnalysisId);
  const nomeArquivoPeticaoAtual = useResultStore((s) => s.nomeArquivoPeticao);
  const nomesArquivosEmendasAtuais = useResultStore((s) => s.nomesArquivosEmendas);
  const { setResult, setFileNames } = useResultStore();

  const [parsed, setParsed] = useState<ParsedJson | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS - Upload
  // ═══════════════════════════════════════════════════════════════════════════

  const handleFile = useCallback(async (file: File) => {
    const next = await parseSingleJson(file);
    setParsed(next);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      e.target.value = '';
    },
    [handleFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // SUBSTITUIÇÃO
  // ═══════════════════════════════════════════════════════════════════════════

  const handleReplace = useCallback(async () => {
    const payload = parsed?.result?.payload;
    if (!payload) return;

    setIsImporting(true);
    try {
      const resultado = payload.resultado;

      // Contestação: usa o que vier no JSON; senão, rótulo sintético para que
      // o processo deixe de constar como "sem contestação".
      const contestacoesNames =
        payload.nomesArquivosContestacoes && payload.nomesArquivosContestacoes.length > 0
          ? payload.nomesArquivosContestacoes
          : [CONTESTACAO_SINTETICA];

      // Petição/emendas: usa o que vier no JSON; senão, preserva o atual.
      const peticaoName = payload.nomeArquivoPeticao ?? nomeArquivoPeticaoAtual ?? undefined;
      const emendasNames = payload.nomesArquivosEmendas ?? nomesArquivosEmendasAtuais;

      // Persiste no banco apenas se a análise já estiver salva (espelha o
      // ReanalyzePanel: análise recém-feita não persistida atualiza só o estado local).
      if (savedAnalysisId) {
        const ok = await replaceAnalysisResult(savedAnalysisId, {
          resultado,
          nomesArquivosContestacoes: contestacoesNames,
          ...(peticaoName && { nomeArquivoPeticao: peticaoName }),
          ...(emendasNames.length > 0 && { nomesArquivosEmendas: emendasNames }),
        });
        if (!ok) {
          showToast('error', 'Falha ao substituir a análise no banco. Tente novamente.');
          setIsImporting(false);
          return;
        }
      }

      // Atualiza o estado local: resultado na tela + nomes (faz o painel âmbar sumir).
      setResult(resultado);
      setFileNames(peticaoName ?? null, emendasNames, contestacoesNames);

      showToast('success', 'Análise substituída pelo JSON importado');
      setParsed(null);
      onSuccess?.();
    } finally {
      setIsImporting(false);
    }
  }, [
    parsed,
    savedAnalysisId,
    nomeArquivoPeticaoAtual,
    nomesArquivosEmendasAtuais,
    replaceAnalysisResult,
    setResult,
    setFileNames,
    showToast,
    onSuccess,
  ]);

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  const result = parsed?.result;
  const ident = result?.payload?.resultado.identificacao;
  const canReplace = result?.valid === true && !isImporting;

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all text-center
          ${isDragOver
            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
            : 'border-slate-300 dark:border-slate-600 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10'
          }
        `}
        onClick={() => document.getElementById('import-json-replace-input')?.click()}
      >
        <FileJson className={`w-8 h-8 mx-auto mb-2 ${isDragOver ? 'text-indigo-500' : 'text-slate-400 dark:text-slate-500'}`} />
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
          Arraste um arquivo <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700">.json</code> ou clique para selecionar
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          O conteúdo substitui o resultado atual deste processo
        </p>
        <input
          id="import-json-replace-input"
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={handleInputChange}
          disabled={isImporting}
        />
      </div>

      {/* Resultado da validação */}
      {parsed && (
        <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-800">
          <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 min-w-0">
              <FileJson className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                {parsed.filename}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setParsed(null)}
              disabled={isImporting}
              className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/40 text-red-500 dark:text-red-400 transition-colors disabled:opacity-40"
              aria-label="Remover arquivo"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
          <div className="p-3 text-sm">
            {parsed.error ? (
              <div className="flex items-start gap-2 text-red-600 dark:text-red-400">
                <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{parsed.error}</span>
              </div>
            ) : result?.valid ? (
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <div className="text-slate-700 dark:text-slate-200">
                    {ident?.numeroProcesso || 'Análise válida'}
                    {' — '}
                    <span className="text-slate-500 dark:text-slate-400">
                      {ident?.reclamantes?.[0] || '?'}
                      {' × '}
                      {ident?.reclamadas?.join(', ') || '?'}
                    </span>
                  </div>
                </div>
                {result.warnings.length > 0 && (
                  <ul className="ml-6 text-xs text-amber-600 dark:text-amber-400 space-y-0.5">
                    {result.warnings.slice(0, 4).map((w, i) => (
                      <li key={i} className="inline-flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {w}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex items-start gap-2 text-red-600 dark:text-red-400">
                  <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>JSON inválido para importação</span>
                </div>
                {result && result.errors.length > 0 && (
                  <ul className="ml-6 text-xs text-red-600 dark:text-red-400 space-y-0.5">
                    {result.errors.slice(0, 6).map((e, i) => (
                      <li key={i}>• {e}</li>
                    ))}
                    {result.errors.length > 6 && (
                      <li>• ... e mais {result.errors.length - 6} erro{result.errors.length - 6 === 1 ? '' : 's'}</li>
                    )}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Botão de ação */}
      <div className="flex justify-end pt-1">
        <Button
          variant="primary"
          onClick={handleReplace}
          disabled={!canReplace}
          icon={isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        >
          {isImporting ? 'Substituindo...' : 'Substituir análise'}
        </Button>
      </div>
    </div>
  );
};

export default ImportJsonPanel;

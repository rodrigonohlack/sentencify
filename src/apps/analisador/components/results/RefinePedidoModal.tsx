/**
 * @file RefinePedidoModal.tsx
 * @description Modal para reanalisar UM pedido com instruções customizadas do magistrado.
 *
 * Fluxo:
 *  - Análise recente (docs no documentStore): textarea apenas; docs são reusados em memória.
 *  - Análise do histórico (savedAnalysisId && !hasDocsInMemory): exige re-upload da petição
 *    (e opcionalmente emendas + contestações), igual ao ReanalyzePanel.
 *
 * Por design, FileBinaryToggle é duplicado inline (~30 linhas) — consistente com a
 * decisão registrada na v1.43.33 de não extrair esse padrão para componente compartilhado.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Sparkles,
  Upload,
  FileText,
  X,
  Loader2,
  CheckCircle,
  Scale,
  FilePlus2,
  AlertTriangle,
} from 'lucide-react';
import { Button, Modal } from '../ui';
import { useResultStore, useDocumentStore, useAIStore } from '../../stores';
import { useRefinePedido, useAnalysesAPI } from '../../hooks';
import type { RefineOverrideDoc, RefineOverrideDocs } from '../../hooks';
import { extractPdfMetadata } from '../../services/pdfService';
import { providerSupportsPdfBinary } from '../../constants';
import type { PedidoAnalise } from '../../types';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS LOCAIS
// ═══════════════════════════════════════════════════════════════════════════

interface UploadedFile {
  id: string;
  name: string;
  text: string;
  base64?: string;
  useBinary?: boolean;
  hasUsableText?: boolean;
  tipo: 'peticao' | 'emenda' | 'contestacao';
  status: 'processing' | 'ready' | 'error';
  error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

const detectTipoDocumento = (filename: string): 'peticao' | 'emenda' | 'contestacao' => {
  const lower = filename.toLowerCase();
  if (
    lower.includes('contestacao') ||
    lower.includes('contestação') ||
    lower.includes('defesa') ||
    lower.includes('resposta')
  ) {
    return 'contestacao';
  }
  if (lower.includes('emenda')) return 'emenda';
  return 'peticao';
};

const generateId = (): string =>
  `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

const MIN_INSTRUCAO_LENGTH = 10;

// ═══════════════════════════════════════════════════════════════════════════
// SUBCOMPONENTES
// ═══════════════════════════════════════════════════════════════════════════

const FileBinaryToggle: React.FC<{
  file: UploadedFile;
  canBinary: boolean;
  onToggle: (id: string, next: boolean) => void;
}> = ({ file, canBinary, onToggle }) => {
  const isBinary = file.useBinary === true;
  const binaryFallingBack = isBinary && !canBinary;
  const tooltip = !canBinary
    ? 'Provider atual não suporta PDF binário (use Claude ou Gemini). Enviará como texto.'
    : isBinary
      ? 'Enviar como PDF binário (Gemini/Claude lê o documento diretamente)'
      : 'Enviar como texto extraído (PDF.js)';

  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onToggle(file.id, !isBinary); }}
      disabled={!canBinary && !isBinary}
      title={tooltip}
      className={`
        flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded transition-colors
        ${binaryFallingBack
          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
          : isBinary && canBinary
            ? 'bg-emerald-600 text-white hover:bg-emerald-700'
            : !canBinary
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-800 dark:text-slate-600'
              : 'bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200'
        }
      `}
      aria-pressed={isBinary}
      aria-label={`Modo de envio: ${binaryFallingBack ? 'fallback texto' : isBinary ? 'PDF binário' : 'texto'}`}
    >
      {binaryFallingBack ? '⚠ TXT' : isBinary ? 'PDF' : 'TXT'}
    </button>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE
// ═══════════════════════════════════════════════════════════════════════════

interface RefinePedidoModalProps {
  pedido: PedidoAnalise | null;
  onClose: () => void;
}

export const RefinePedidoModal: React.FC<RefinePedidoModalProps> = ({ pedido, onClose }) => {
  // ─── Stores ───
  const result = useResultStore(s => s.result);
  const savedAnalysisId = useResultStore(s => s.savedAnalysisId);
  const refinePedidoInResult = useResultStore(s => s.refinePedidoInResult);
  const nomeArquivoPeticao = useResultStore(s => s.nomeArquivoPeticao);
  const nomesArquivosEmendas = useResultStore(s => s.nomesArquivosEmendas);
  const nomesArquivosContestacoes = useResultStore(s => s.nomesArquivosContestacoes);
  const setFileNames = useResultStore(s => s.setFileNames);
  const documentStore = useDocumentStore();
  const provider = useAIStore(s => s.aiSettings.provider);
  const canBinary = providerSupportsPdfBinary(provider);

  // ─── Hooks ───
  const { refinePedido } = useRefinePedido();
  const { replaceAnalysisResult } = useAnalysesAPI();

  // ─── Local state ───
  const [instrucao, setInstrucao] = useState('');
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isRefining, setIsRefining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasDocsInMemory = documentStore.peticao?.status === 'ready';
  const isFromHistory = savedAnalysisId !== null;
  const requiresUpload = isFromHistory && !hasDocsInMemory;

  // ─── Reset ao trocar de pedido / fechar ───
  useEffect(() => {
    if (pedido) {
      setInstrucao('');
      setFiles([]);
      setError(null);
      setIsRefining(false);
    }
  }, [pedido?.numero]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Computed ───
  const peticaoFiles = files.filter(f => f.tipo === 'peticao');
  const emendaFiles = files.filter(f => f.tipo === 'emenda');
  const contestacaoFiles = files.filter(f => f.tipo === 'contestacao');

  const hasUsablePeticaoUpload = peticaoFiles.some(f => f.status === 'ready');
  const docsReady = requiresUpload ? hasUsablePeticaoUpload : hasDocsInMemory;
  const instrucaoValid = instrucao.trim().length >= MIN_INSTRUCAO_LENGTH;
  const canRefine = docsReady && instrucaoValid && !isRefining;

  // ─── Upload handlers ───
  const processFile = useCallback(async (file: File) => {
    const id = generateId();
    const tipo = detectTipoDocumento(file.name);
    setFiles(prev => [...prev, {
      id, name: file.name, text: '', tipo, status: 'processing'
    }]);
    setError(null);

    try {
      const meta = await extractPdfMetadata(file);

      if (!meta.hasUsableText && !canBinary) {
        setFiles(prev => prev.map(f =>
          f.id === id ? {
            ...f, status: 'error',
            error: 'PDF escaneado ou protegido. Para enviar como PDF binário, selecione Claude ou Gemini.',
          } : f
        ));
        return;
      }

      const useBinary = !meta.hasUsableText && canBinary;
      setFiles(prev => prev.map(f =>
        f.id === id ? {
          ...f,
          text: meta.text,
          base64: meta.base64,
          hasUsableText: meta.hasUsableText,
          useBinary,
          status: 'ready',
        } : f
      ));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao processar arquivo';
      setFiles(prev => prev.map(f => f.id === id ? { ...f, status: 'error', error: message } : f));
    }
  }, [canBinary]);

  const handleToggleBinary = useCallback((id: string, next: boolean) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, useBinary: next } : f));
  }, []);

  const handleFilesSelected = useCallback(async (selected: File[]) => {
    const pdfs = selected.filter(f => f.type === 'application/pdf');
    const existing = new Set(files.map(f => f.name));
    const unique = pdfs.filter(f => !existing.has(f.name));
    for (const file of unique) {
      await processFile(file);
    }
  }, [files, processFile]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFilesSelected(Array.from(e.target.files || []));
    e.target.value = '';
  }, [handleFilesSelected]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFilesSelected(Array.from(e.dataTransfer.files));
  }, [handleFilesSelected]);

  const handleRemoveFile = useCallback((id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  // ─── Refino ───
  const handleRefine = useCallback(async () => {
    if (!pedido || !result || !canRefine) return;

    setIsRefining(true);
    setError(null);

    try {
      let overrideDocs: RefineOverrideDocs | undefined;

      if (requiresUpload) {
        const peticaoReady = peticaoFiles.find(f => f.status === 'ready');
        if (!peticaoReady) {
          throw new Error('Faça upload da petição inicial.');
        }
        const toOverride = (f: UploadedFile): RefineOverrideDoc => ({
          text: f.text,
          base64: f.base64,
          useBinary: f.useBinary,
          name: f.name,
        });
        overrideDocs = {
          peticao: toOverride(peticaoReady),
          emendas: emendaFiles.filter(f => f.status === 'ready').map(toOverride),
          contestacoes: contestacaoFiles.filter(f => f.status === 'ready').map(toOverride),
        };
      }

      const refined = await refinePedido(pedido, instrucao, result, overrideDocs);

      refinePedidoInResult(pedido.numero, refined);

      // Persistir no banco se for análise do histórico.
      if (savedAnalysisId) {
        // Recalcula o resultado pós-refino para enviar ao endpoint.
        const novoResult = useResultStore.getState().result;
        if (novoResult) {
          // Se veio re-upload, atualizamos os nomes de arquivo registrados.
          let peticaoNomeParaSalvar = nomeArquivoPeticao || undefined;
          let emendasNomesParaSalvar = nomesArquivosEmendas;
          let contestacoesNomesParaSalvar = nomesArquivosContestacoes;

          if (requiresUpload && overrideDocs?.peticao) {
            peticaoNomeParaSalvar = overrideDocs.peticao.name;
            emendasNomesParaSalvar = (overrideDocs.emendas || []).map(e => e.name);
            contestacoesNomesParaSalvar = (overrideDocs.contestacoes || []).map(c => c.name);
            setFileNames(peticaoNomeParaSalvar, emendasNomesParaSalvar, contestacoesNomesParaSalvar);
          }

          const success = await replaceAnalysisResult(savedAnalysisId, {
            resultado: novoResult,
            nomesArquivosContestacoes: contestacoesNomesParaSalvar,
            nomeArquivoPeticao: peticaoNomeParaSalvar,
            nomesArquivosEmendas: emendasNomesParaSalvar.length > 0 ? emendasNomesParaSalvar : undefined,
          });

          if (!success) {
            console.warn('[RefinePedido] replaceAnalysisResult falhou; mudança local preservada.');
          }
        }
      }

      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao refinar pedido';
      setError(message);
    } finally {
      setIsRefining(false);
    }
  }, [
    pedido, result, canRefine, requiresUpload, peticaoFiles, emendaFiles, contestacaoFiles,
    refinePedido, instrucao, refinePedidoInResult, savedAnalysisId, nomeArquivoPeticao,
    nomesArquivosEmendas, nomesArquivosContestacoes, setFileNames, replaceAnalysisResult, onClose,
  ]);

  if (!pedido) return null;

  // ─── Render: file item ───
  const renderFileItem = (file: UploadedFile) => (
    <div key={file.id} className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {file.status === 'processing' && (
          <Loader2 className="w-4 h-4 text-amber-500 animate-spin shrink-0" />
        )}
        {file.status === 'ready' && (
          <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
        )}
        {file.status === 'error' && (
          <X className="w-4 h-4 text-red-500 shrink-0" />
        )}
        <span className="text-sm text-slate-700 dark:text-slate-200 truncate" title={file.name}>
          {file.name}
        </span>
        {file.error && (
          <span className="text-xs text-red-500 shrink-0">{file.error}</span>
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {file.status === 'ready' && (
          <FileBinaryToggle file={file} canBinary={canBinary} onToggle={handleToggleBinary} />
        )}
        <button
          onClick={() => handleRemoveFile(file.id)}
          className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-red-500 transition-colors"
          title="Remover arquivo"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={true}
      onClose={isRefining ? () => {} : onClose}
      title={`Reanalisar pedido #${pedido.numero}`}
      subtitle={pedido.tema}
      size="lg"
      icon={<Sparkles className="w-6 h-6" />}
      iconColor="text-indigo-500 dark:text-indigo-400"
      preventClose={isRefining}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isRefining}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleRefine}
            disabled={!canRefine}
            loading={isRefining}
            icon={!isRefining ? <Sparkles className="w-4 h-4" /> : undefined}
          >
            {isRefining ? 'Refinando análise...' : 'Reanalisar Pedido'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Aviso para análises do histórico sem docs em memória */}
        {requiresUpload && (
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800 dark:text-amber-200">
                Esta análise veio do histórico. Para reanalisar este pedido, é preciso reenviar
                a petição inicial (e opcionalmente emendas/contestações).
              </div>
            </div>
          </div>
        )}

        {/* Dropzone (só quando precisa de upload) */}
        {requiresUpload && (
          <div>
            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2 flex items-center gap-2">
              <FilePlus2 className="w-4 h-4" />
              Documentos do processo
            </h4>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`
                p-5 border-2 border-dashed rounded-xl cursor-pointer transition-all text-center
                ${isDragOver
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                  : 'border-slate-300 dark:border-slate-600 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10'
                }
              `}
            >
              <Upload className={`w-7 h-7 mx-auto mb-1.5 ${isDragOver ? 'text-indigo-500' : 'text-slate-400 dark:text-slate-500'}`} />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                Arraste os PDFs ou clique para selecionar
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Categorização automática pelo nome do arquivo
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              multiple
              onChange={handleFileInputChange}
              className="hidden"
            />

            {/* Lista de arquivos uploaded */}
            {files.length > 0 && (
              <div className="mt-3 space-y-2">
                {peticaoFiles.length > 0 && (
                  <div className="p-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="w-4 h-4 text-blue-500" />
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
                        Petição Inicial
                      </span>
                    </div>
                    <div className="pl-6">{peticaoFiles.map(renderFileItem)}</div>
                  </div>
                )}
                {emendaFiles.length > 0 && (
                  <div className="p-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="w-4 h-4 text-amber-500" />
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
                        Emendas ({emendaFiles.length})
                      </span>
                    </div>
                    <div className="pl-6">{emendaFiles.map(renderFileItem)}</div>
                  </div>
                )}
                {contestacaoFiles.length > 0 && (
                  <div className="p-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Scale className="w-4 h-4 text-indigo-500" />
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
                        Contestações ({contestacaoFiles.length})
                      </span>
                    </div>
                    <div className="pl-6">{contestacaoFiles.map(renderFileItem)}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Instrução do magistrado */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
            O que precisa ser refinado neste pedido?
          </label>
          <textarea
            value={instrucao}
            onChange={(e) => setInstrucao(e.target.value)}
            placeholder="Ex: O reclamante mencionou na seção VI da petição que trabalhava em condições insalubres, mas a análise atual diz que ele não pediu adicional — verifique novamente."
            rows={5}
            disabled={isRefining}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none disabled:opacity-60"
          />
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {instrucao.trim().length < MIN_INSTRUCAO_LENGTH
              ? `Descreva com pelo menos ${MIN_INSTRUCAO_LENGTH} caracteres (${instrucao.trim().length}/${MIN_INSTRUCAO_LENGTH}).`
              : `A IA receberá a instrução acima junto com os documentos originais e refinará apenas o pedido #${pedido.numero}.`}
          </p>
        </div>

        {/* Erro */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default RefinePedidoModal;

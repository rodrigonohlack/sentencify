/**
 * @file ReanalyzePanel.tsx
 * @description Painel para reanalisar processo adicionando contestação
 * @version 1.40.0 - Nova UX com upload único e categorização automática
 */

import React, { useCallback, useState, useRef } from 'react';
import {
  AlertTriangle,
  RefreshCw,
  Upload,
  FileText,
  X,
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckCircle,
  Scale,
  FilePlus2,
  FileJson
} from 'lucide-react';
import { Button, ProgressBar } from '../ui';
import { useResultStore, useDocumentStore, useAIStore } from '../../stores';
import { useAnalysis, useAnalysesAPI } from '../../hooks';
import { extractPdfMetadata } from '../../services/pdfService';
import { providerSupportsPdfBinary } from '../../constants';
import { ImportJsonPanel } from './ImportJsonPanel';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

/** Modo do painel: subir PDFs e rodar a IA, ou importar um JSON pronto. */
type ReanalyzeMode = 'upload' | 'json';

interface CategorizedFile {
  id: string;
  name: string;
  file: File;
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

/**
 * Detecta tipo de documento pelo nome do arquivo
 */
const detectTipoDocumento = (filename: string): 'peticao' | 'emenda' | 'contestacao' => {
  const lower = filename.toLowerCase();

  // Contestação
  if (
    lower.includes('contestacao') ||
    lower.includes('contestação') ||
    lower.includes('defesa') ||
    lower.includes('resposta')
  ) {
    return 'contestacao';
  }

  // Emenda
  if (lower.includes('emenda')) {
    return 'emenda';
  }

  // Default: petição (inclui "inicial", "petição")
  return 'peticao';
};

/** Gera ID único */
const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

// ═══════════════════════════════════════════════════════════════════════════
// SUBCOMPONENTES
// ═══════════════════════════════════════════════════════════════════════════

const FileBinaryToggle: React.FC<{
  file: CategorizedFile;
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

export const ReanalyzePanel: React.FC = () => {
  // Stores
  const savedAnalysisId = useResultStore((s) => s.savedAnalysisId);
  const nomesArquivosContestacoes = useResultStore((s) => s.nomesArquivosContestacoes);
  const { setResult, setProgress, setFileNames, setIsAnalyzing, progress, progressMessage } = useResultStore();
  const documentStore = useDocumentStore();

  // Hooks
  const { analyzeWithAI } = useAnalysis();
  const { replaceAnalysisResult } = useAnalysesAPI();
  const provider = useAIStore((s) => s.aiSettings.provider);
  const canBinary = providerSupportsPdfBinary(provider);

  // Local state
  const [isExpanded, setIsExpanded] = useState(false);
  const [mode, setMode] = useState<ReanalyzeMode>('upload');
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [files, setFiles] = useState<CategorizedFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Determina se é análise do histórico (precisa re-upload da petição)
  const isFromHistory = savedAnalysisId !== null;

  // Verifica se tem docs em memória
  const hasDocsInMemory = documentStore.peticao?.status === 'ready';

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPUTED
  // ═══════════════════════════════════════════════════════════════════════════

  const peticaoFiles = files.filter(f => f.tipo === 'peticao');
  const emendaFiles = files.filter(f => f.tipo === 'emenda');
  const contestacaoFiles = files.filter(f => f.tipo === 'contestacao');

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS - Upload de Arquivos
  // ═══════════════════════════════════════════════════════════════════════════

  const processFile = useCallback(async (file: File) => {
    const id = generateId();
    const tipo = detectTipoDocumento(file.name);
    const newFile: CategorizedFile = {
      id,
      name: file.name,
      file,
      text: '',
      tipo,
      status: 'processing'
    };

    setFiles(prev => [...prev, newFile]);
    setError(null);

    try {
      const meta = await extractPdfMetadata(file);

      if (!meta.hasUsableText && !canBinary) {
        setFiles(prev =>
          prev.map(f => f.id === id ? {
            ...f,
            status: 'error',
            error: 'PDF escaneado ou protegido. Para enviar como PDF binário, selecione Claude ou Gemini.'
          } : f)
        );
        return;
      }

      const useBinary = !meta.hasUsableText && canBinary;

      setFiles(prev =>
        prev.map(f => f.id === id ? {
          ...f,
          text: meta.text,
          base64: meta.base64,
          hasUsableText: meta.hasUsableText,
          useBinary,
          status: 'ready'
        } : f)
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao processar arquivo';
      setFiles(prev =>
        prev.map(f => f.id === id ? { ...f, status: 'error', error: message } : f)
      );
    }
  }, [canBinary]);

  const handleToggleBinary = useCallback((id: string, next: boolean) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, useBinary: next } : f));
  }, []);

  const handleFilesSelected = useCallback(async (selectedFiles: File[]) => {
    const pdfFiles = selectedFiles.filter(f => f.type === 'application/pdf');

    // Verificar duplicatas
    const existingNames = new Set(files.map(f => f.name));
    const uniqueFiles = pdfFiles.filter(f => !existingNames.has(f.name));

    for (const file of uniqueFiles) {
      await processFile(file);
    }
  }, [files, processFile]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    handleFilesSelected(selectedFiles);
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
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFilesSelected(droppedFiles);
  }, [handleFilesSelected]);

  const handleRemoveFile = useCallback((id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // VALIDAÇÃO E REANÁLISE
  // ═══════════════════════════════════════════════════════════════════════════

  const canReanalyze = useCallback(() => {
    // Precisa de pelo menos uma contestação pronta
    const hasContestacao = contestacaoFiles.some(f => f.status === 'ready');
    if (!hasContestacao) return false;

    // Se é do histórico e não tem docs em memória, precisa de petição
    if (isFromHistory && !hasDocsInMemory) {
      return peticaoFiles.some(f => f.status === 'ready');
    }

    return true;
  }, [contestacaoFiles, isFromHistory, hasDocsInMemory, peticaoFiles]);

  const handleReanalyze = useCallback(async () => {
    if (!canReanalyze()) return;

    setIsReanalyzing(true);
    setIsAnalyzing(true);
    setError(null);

    try {
      let peticaoText: string;
      let emendasTexts: string[];
      let peticaoName: string;
      let emendasNames: string[];

      let peticaoBin: { base64: string; name: string } | null = null;
      let emendasBin: ({ base64: string; name: string } | null)[] = [];

      if (isFromHistory && !hasDocsInMemory) {
        const peticaoReady = peticaoFiles.find(f => f.status === 'ready');
        peticaoText = peticaoReady?.text || '';
        peticaoName = peticaoReady?.name || '';
        if (peticaoReady?.useBinary && peticaoReady.base64 && canBinary) {
          peticaoBin = { base64: peticaoReady.base64, name: peticaoReady.name };
        }

        const readyEmendas = emendaFiles.filter(f => f.status === 'ready');
        emendasTexts = readyEmendas.map(f => f.text);
        emendasNames = readyEmendas.map(f => f.name);
        emendasBin = readyEmendas.map(f =>
          f.useBinary && f.base64 && canBinary ? { base64: f.base64, name: f.name } : null
        );
      } else {
        // Análise recém-feita: usar documentStore (herda useBinary já marcado no BatchMode)
        const docs = documentStore.getAllDocumentsText();
        peticaoText = docs.peticao;
        peticaoName = documentStore.peticao?.name || '';

        const memPet = documentStore.peticao;
        if (memPet?.useBinary && memPet.base64 && canBinary) {
          peticaoBin = { base64: memPet.base64, name: memPet.name };
        }

        emendasTexts = docs.emendas;
        emendasNames = documentStore.emendas.map(e => e.name);
        emendasBin = documentStore.emendas.map(e =>
          e.useBinary && e.base64 && canBinary ? { base64: e.base64, name: e.name } : null
        );

        // Acrescentar emendas uploaded novos (mantendo ordem texts/names/bin)
        const newEmendas = emendaFiles.filter(f => f.status === 'ready');
        emendasTexts.push(...newEmendas.map(f => f.text));
        emendasNames.push(...newEmendas.map(f => f.name));
        emendasBin.push(...newEmendas.map(f =>
          f.useBinary && f.base64 && canBinary ? { base64: f.base64, name: f.name } : null
        ));
      }

      const readyContestacoes = contestacaoFiles.filter(f => f.status === 'ready');
      const contestacoesTexts = readyContestacoes.map(f => f.text);
      const contestacoesNames = readyContestacoes.map(f => f.name);
      const contestacoesBin: ({ base64: string; name: string } | null)[] = readyContestacoes.map(f =>
        f.useBinary && f.base64 && canBinary ? { base64: f.base64, name: f.name } : null
      );

      setProgress(30, 'Analisando documentos com IA...');

      const binaryDocs = canBinary ? {
        peticao: peticaoBin,
        emendas: emendasBin,
        contestacoes: contestacoesBin,
        nomeArquivoPeticao: peticaoName,
        nomesArquivosEmendas: emendasNames,
        nomesArquivosContestacoes: contestacoesNames
      } : undefined;

      const newResult = await analyzeWithAI(
        peticaoText,
        contestacoesTexts.length > 0 ? contestacoesTexts : null,
        emendasTexts,
        binaryDocs
      );

      if (!newResult) {
        throw new Error('Erro ao analisar documentos. Tente novamente.');
      }

      setProgress(80, 'Salvando resultado...');

      // Atualizar resultado no store
      setResult(newResult);
      setFileNames(peticaoName, emendasNames, contestacoesNames);

      // Se veio do histórico, atualizar no banco
      if (savedAnalysisId) {
        const success = await replaceAnalysisResult(savedAnalysisId, {
          resultado: newResult,
          nomesArquivosContestacoes: contestacoesNames,
          nomeArquivoPeticao: peticaoName || undefined,
          nomesArquivosEmendas: emendasNames.length > 0 ? emendasNames : undefined
        });

        if (!success) {
          console.warn('Não foi possível atualizar no banco, mas resultado local foi atualizado');
        }
      }

      setProgress(100, 'Análise concluída!');

      // Limpar estado e fechar painel
      setFiles([]);
      setIsExpanded(false);

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao reanalisar';
      setError(message);
    } finally {
      setIsReanalyzing(false);
      setIsAnalyzing(false);
    }
  }, [
    canReanalyze,
    isFromHistory,
    hasDocsInMemory,
    peticaoFiles,
    emendaFiles,
    documentStore,
    contestacaoFiles,
    analyzeWithAI,
    canBinary,
    setResult,
    setFileNames,
    setProgress,
    setIsAnalyzing,
    savedAnalysisId,
    replaceAnalysisResult
  ]);

  const handleCancel = useCallback(() => {
    setFiles([]);
    setError(null);
    setIsExpanded(false);
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // EARLY RETURN - Se já tem contestação, não renderiza o painel
  // ═══════════════════════════════════════════════════════════════════════════

  if (nomesArquivosContestacoes.length > 0) {
    return null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER - File Item
  // ═══════════════════════════════════════════════════════════════════════════

  const renderFileItem = (file: CategorizedFile) => (
    <div
      key={file.id}
      className="flex items-center justify-between py-1.5"
    >
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

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  // Durante reanálise, mostra loading overlay
  if (isReanalyzing) {
    return (
      <div className="mb-4 p-6 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800/40 rounded-xl">
        <div className="flex items-center gap-3 mb-4">
          <Loader2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-spin" />
          <span className="font-medium text-indigo-700 dark:text-indigo-300">
            Reprocessando Análise...
          </span>
        </div>
        <ProgressBar progress={progress} message={progressMessage} />
      </div>
    );
  }

  return (
    <div className="mb-4">
      {/* Banner de alerta */}
      <div
        className={`
          p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40
          ${isExpanded ? 'rounded-t-xl border-b-0' : 'rounded-xl'}
          transition-all
        `}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <span className="font-medium text-amber-800 dark:text-amber-200">
              Esta análise foi feita SEM CONTESTAÇÃO
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            icon={isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            className="text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-800/30"
          >
            {isExpanded ? 'Fechar' : '+ Adicionar Documentos'}
          </Button>
        </div>
      </div>

      {/* Painel expandido */}
      {isExpanded && (
        <div className="p-4 bg-white dark:bg-slate-800 border border-t-0 border-slate-200 dark:border-slate-700 rounded-b-xl space-y-4">

          {/* Seletor de modo: subir PDFs (IA) ou importar JSON pronto */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode('upload')}
              className={`
                flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${mode === 'upload'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }
              `}
            >
              <FilePlus2 className="w-4 h-4" /> Adicionar Documentos
            </button>
            <button
              type="button"
              onClick={() => setMode('json')}
              className={`
                flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${mode === 'json'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }
              `}
            >
              <FileJson className="w-4 h-4" /> Importar JSON
            </button>
          </div>

          {/* MODO: upload de PDFs + reanálise via IA */}
          {mode === 'upload' && (
          <>
          {/* Área de Upload Única */}
          <div>
            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
              <FilePlus2 className="w-4 h-4" />
              Adicionar Documentos
            </h4>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`
                p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all text-center
                ${isDragOver
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                  : 'border-slate-300 dark:border-slate-600 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10'
                }
              `}
            >
              <Upload className={`w-8 h-8 mx-auto mb-2 ${isDragOver ? 'text-indigo-500' : 'text-slate-400 dark:text-slate-500'}`} />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                Arraste os PDFs ou clique para selecionar
              </p>
              <div className="mt-3 text-xs text-slate-500 dark:text-slate-400 space-y-0.5">
                <p>O sistema identifica automaticamente pelo nome:</p>
                <p>• <span className="font-mono">petição</span>, <span className="font-mono">inicial</span> → Petição Inicial</p>
                <p>• <span className="font-mono">emenda</span> → Emenda à Inicial</p>
                <p>• <span className="font-mono">contestação</span>, <span className="font-mono">defesa</span> → Contestação</p>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              multiple
              onChange={handleFileInputChange}
              className="hidden"
            />
          </div>

          {/* Lista Categorizada de Arquivos */}
          {files.length > 0 && (
            <div className="space-y-3">
              {/* Petição (se do histórico e não tem em memória) */}
              {isFromHistory && !hasDocsInMemory && (
                <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      Petição Inicial
                      {peticaoFiles.length === 0 && (
                        <span className="text-red-500 ml-1">*</span>
                      )}
                    </span>
                  </div>
                  {peticaoFiles.length > 0 ? (
                    <div className="pl-6">
                      {peticaoFiles.map(renderFileItem)}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 dark:text-slate-500 pl-6 italic">
                      Nenhuma petição adicionada
                    </p>
                  )}
                </div>
              )}

              {/* Emendas (se houver) */}
              {emendaFiles.length > 0 && (
                <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      Emendas ({emendaFiles.length})
                    </span>
                  </div>
                  <div className="pl-6">
                    {emendaFiles.map(renderFileItem)}
                  </div>
                </div>
              )}

              {/* Contestações */}
              <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Scale className="w-4 h-4 text-indigo-500" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    Contestações ({contestacaoFiles.length})
                    {contestacaoFiles.length === 0 && (
                      <span className="text-red-500 ml-1">*</span>
                    )}
                  </span>
                </div>
                {contestacaoFiles.length > 0 ? (
                  <div className="pl-6">
                    {contestacaoFiles.map(renderFileItem)}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 dark:text-slate-500 pl-6 italic">
                    Nenhuma contestação adicionada
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Erro */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Botões de ação */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={handleCancel}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleReanalyze}
              disabled={!canReanalyze()}
              icon={<RefreshCw className="w-4 h-4" />}
            >
              Reanalisar Processo
            </Button>
          </div>
          </>
          )}

          {/* MODO: importar JSON pronto (substitui o resultado deste processo) */}
          {mode === 'json' && (
            <ImportJsonPanel onSuccess={() => setIsExpanded(false)} />
          )}
        </div>
      )}
    </div>
  );
};

export default ReanalyzePanel;

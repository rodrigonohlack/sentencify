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
  FilePlus2
} from 'lucide-react';
import { Button, ProgressBar } from '../ui';
import { useResultStore, useDocumentStore } from '../../stores';
import { useFileProcessing, useAnalysis, useAnalysesAPI } from '../../hooks';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

interface CategorizedFile {
  id: string;
  name: string;
  file: File;
  text: string;
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
// COMPONENTE
// ═══════════════════════════════════════════════════════════════════════════

export const ReanalyzePanel: React.FC = () => {
  // Stores
  const savedAnalysisId = useResultStore((s) => s.savedAnalysisId);
  const nomesArquivosContestacoes = useResultStore((s) => s.nomesArquivosContestacoes);
  const { setResult, setProgress, setFileNames, setIsAnalyzing, progress, progressMessage } = useResultStore();
  const documentStore = useDocumentStore();

  // Hooks
  const { extractPDFText } = useFileProcessing();
  const { analyzeWithAI } = useAnalysis();
  const { replaceAnalysisResult } = useAnalysesAPI();

  // Local state
  const [isExpanded, setIsExpanded] = useState(false);
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
      const result = await extractPDFText(file);
      setFiles(prev =>
        prev.map(f => f.id === id ? { ...f, text: result.text, status: 'ready' } : f)
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao processar arquivo';
      setFiles(prev =>
        prev.map(f => f.id === id ? { ...f, status: 'error', error: message } : f)
      );
    }
  }, [extractPDFText]);

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
      // Obter textos
      let peticaoText: string;
      let emendasTexts: string[];
      let peticaoName: string;
      let emendasNames: string[];

      if (isFromHistory && !hasDocsInMemory) {
        // Do histórico: usar arquivos carregados
        const peticaoReady = peticaoFiles.find(f => f.status === 'ready');
        peticaoText = peticaoReady?.text || '';
        emendasTexts = emendaFiles.filter(f => f.status === 'ready').map(f => f.text);
        peticaoName = peticaoReady?.name || '';
        emendasNames = emendaFiles.filter(f => f.status === 'ready').map(f => f.name);
      } else {
        // Análise recém-feita: usar documentStore
        const docs = documentStore.getAllDocumentsText();
        peticaoText = docs.peticao;
        emendasTexts = docs.emendas;
        peticaoName = documentStore.peticao?.name || '';
        emendasNames = documentStore.emendas.map(e => e.name);

        // Adicionar emendas carregadas agora (se houver)
        const newEmendas = emendaFiles.filter(f => f.status === 'ready');
        emendasTexts.push(...newEmendas.map(f => f.text));
        emendasNames.push(...newEmendas.map(f => f.name));
      }

      // Textos das contestações carregadas
      const contestacoesTexts = contestacaoFiles
        .filter(f => f.status === 'ready')
        .map(f => f.text);
      const contestacoesNames = contestacaoFiles
        .filter(f => f.status === 'ready')
        .map(f => f.name);

      setProgress(30, 'Analisando documentos com IA...');

      // Concatenar contestações para análise
      const contestacaoTextoCompleto = contestacoesTexts.join('\n\n---\n\n');
      const newResult = await analyzeWithAI(peticaoText, contestacaoTextoCompleto, emendasTexts);

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
      <div className="flex items-center gap-2 min-w-0">
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
      <button
        onClick={() => handleRemoveFile(file.id)}
        className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-red-500 transition-colors shrink-0"
        title="Remover arquivo"
      >
        <X className="w-4 h-4" />
      </button>
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
        </div>
      )}
    </div>
  );
};

export default ReanalyzePanel;

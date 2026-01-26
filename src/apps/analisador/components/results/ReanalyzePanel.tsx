/**
 * @file ReanalyzePanel.tsx
 * @description Painel para reanalisar processo adicionando contestação
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
  CheckCircle
} from 'lucide-react';
import { Button, ProgressBar } from '../ui';
import { useResultStore, useDocumentStore } from '../../stores';
import { useFileProcessing, useAnalysis, useAnalysesAPI } from '../../hooks';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

interface UploadedFile {
  id: string;
  name: string;
  file: File;
  text: string;
  status: 'processing' | 'ready' | 'error';
  error?: string;
}

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
  const [contestacaoFiles, setContestacaoFiles] = useState<UploadedFile[]>([]);
  const [peticaoFile, setPeticaoFile] = useState<UploadedFile | null>(null);
  const [emendasFiles, setEmendasFiles] = useState<UploadedFile[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const contestacaoInputRef = useRef<HTMLInputElement>(null);
  const peticaoInputRef = useRef<HTMLInputElement>(null);
  const emendasInputRef = useRef<HTMLInputElement>(null);

  // Determina se é análise do histórico (precisa re-upload da petição)
  const isFromHistory = savedAnalysisId !== null;

  // Verifica se tem docs em memória
  const hasDocsInMemory = documentStore.peticao?.status === 'ready';

  // Se tem contestação, não mostra o painel
  if (nomesArquivosContestacoes.length > 0) {
    return null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS - Upload de Contestação
  // ═══════════════════════════════════════════════════════════════════════════

  const processContestacaoFile = useCallback(async (file: File) => {
    const id = `cont-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const newFile: UploadedFile = {
      id,
      name: file.name,
      file,
      text: '',
      status: 'processing'
    };

    setContestacaoFiles(prev => [...prev, newFile]);
    setError(null);

    try {
      const result = await extractPDFText(file);
      setContestacaoFiles(prev =>
        prev.map(f => f.id === id ? { ...f, text: result.text, status: 'ready' } : f)
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao processar arquivo';
      setContestacaoFiles(prev =>
        prev.map(f => f.id === id ? { ...f, status: 'error', error: message } : f)
      );
    }
  }, [extractPDFText]);

  const handleContestacaoSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      await processContestacaoFile(file);
    }
    e.target.value = '';
  }, [processContestacaoFile]);

  const handleRemoveContestacao = useCallback((id: string) => {
    setContestacaoFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS - Upload de Petição (histórico)
  // ═══════════════════════════════════════════════════════════════════════════

  const processPeticaoFile = useCallback(async (file: File) => {
    const id = `pet-${Date.now()}`;
    const newFile: UploadedFile = {
      id,
      name: file.name,
      file,
      text: '',
      status: 'processing'
    };

    setPeticaoFile(newFile);
    setError(null);

    try {
      const result = await extractPDFText(file);
      setPeticaoFile({ ...newFile, text: result.text, status: 'ready' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao processar arquivo';
      setPeticaoFile({ ...newFile, status: 'error', error: message });
    }
  }, [extractPDFText]);

  const handlePeticaoSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processPeticaoFile(file);
    }
    e.target.value = '';
  }, [processPeticaoFile]);

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS - Upload de Emendas (histórico)
  // ═══════════════════════════════════════════════════════════════════════════

  const processEmendaFile = useCallback(async (file: File) => {
    const id = `emenda-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const newFile: UploadedFile = {
      id,
      name: file.name,
      file,
      text: '',
      status: 'processing'
    };

    setEmendasFiles(prev => [...prev, newFile]);
    setError(null);

    try {
      const result = await extractPDFText(file);
      setEmendasFiles(prev =>
        prev.map(f => f.id === id ? { ...f, text: result.text, status: 'ready' } : f)
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao processar arquivo';
      setEmendasFiles(prev =>
        prev.map(f => f.id === id ? { ...f, status: 'error', error: message } : f)
      );
    }
  }, [extractPDFText]);

  const handleEmendasSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      await processEmendaFile(file);
    }
    e.target.value = '';
  }, [processEmendaFile]);

  const handleRemoveEmenda = useCallback((id: string) => {
    setEmendasFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // REANÁLISE
  // ═══════════════════════════════════════════════════════════════════════════

  const canReanalyze = useCallback(() => {
    // Precisa de pelo menos uma contestação pronta
    const hasContestacao = contestacaoFiles.some(f => f.status === 'ready');
    if (!hasContestacao) return false;

    // Se é do histórico, precisa de petição também
    if (isFromHistory && !hasDocsInMemory) {
      return peticaoFile?.status === 'ready';
    }

    return true;
  }, [contestacaoFiles, isFromHistory, hasDocsInMemory, peticaoFile]);

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
        peticaoText = peticaoFile?.text || '';
        emendasTexts = emendasFiles.filter(f => f.status === 'ready').map(f => f.text);
        peticaoName = peticaoFile?.name || '';
        emendasNames = emendasFiles.filter(f => f.status === 'ready').map(f => f.name);
      } else {
        // Análise recém-feita: usar documentStore
        const docs = documentStore.getAllDocumentsText();
        peticaoText = docs.peticao;
        emendasTexts = docs.emendas;
        peticaoName = documentStore.peticao?.name || '';
        emendasNames = documentStore.emendas.map(e => e.name);
      }

      // Textos das contestações carregadas
      const contestacoesTexts = contestacaoFiles
        .filter(f => f.status === 'ready')
        .map(f => f.text);
      const contestacoesNames = contestacaoFiles
        .filter(f => f.status === 'ready')
        .map(f => f.name);

      setProgress(30, 'Analisando documentos com IA...');

      // Analisar com IA - passa array de contestações como primeiro elemento
      // A função analyzeWithAI espera uma única contestação, mas podemos concatenar
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
      setContestacaoFiles([]);
      setPeticaoFile(null);
      setEmendasFiles([]);
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
    peticaoFile,
    emendasFiles,
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
    setContestacaoFiles([]);
    setPeticaoFile(null);
    setEmendasFiles([]);
    setError(null);
    setIsExpanded(false);
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER - File Item
  // ═══════════════════════════════════════════════════════════════════════════

  const renderFileItem = (file: UploadedFile, onRemove: (id: string) => void) => (
    <div
      key={file.id}
      className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg shrink-0">
          <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
        </div>
        <span className="text-sm text-slate-700 dark:text-slate-200 truncate">
          {file.name}
        </span>
        {file.status === 'processing' && (
          <Loader2 className="w-4 h-4 text-amber-500 animate-spin shrink-0" />
        )}
        {file.status === 'ready' && (
          <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
        )}
        {file.status === 'error' && (
          <span className="text-xs text-red-500 shrink-0">{file.error}</span>
        )}
      </div>
      <button
        onClick={() => onRemove(file.id)}
        className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-red-500 transition-colors shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER - Drop Area
  // ═══════════════════════════════════════════════════════════════════════════

  const renderDropArea = (
    inputRef: React.RefObject<HTMLInputElement | null>,
    label: string
  ) => (
    <div
      onClick={() => inputRef.current?.click()}
      className="p-6 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-all text-center"
    >
      <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400 dark:text-slate-500" />
      <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
        {label}
      </p>
      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
        Arraste PDFs ou clique para selecionar
      </p>
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
            Reprocessando Analise...
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
              Esta analise foi feita SEM CONTESTACAO
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            icon={isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            className="text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-800/30"
          >
            {isExpanded ? 'Fechar' : 'Adicionar Contestacao'}
          </Button>
        </div>
      </div>

      {/* Painel expandido */}
      {isExpanded && (
        <div className="p-4 bg-white dark:bg-slate-800 border border-t-0 border-slate-200 dark:border-slate-700 rounded-b-xl space-y-4">
          {/* Se do histórico e não tem docs em memória: área para petição */}
          {isFromHistory && !hasDocsInMemory && (
            <div>
              <h4 className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Peticao Inicial <span className="text-red-500">*</span>
              </h4>
              {peticaoFile ? (
                renderFileItem(peticaoFile, () => setPeticaoFile(null))
              ) : (
                renderDropArea(peticaoInputRef, 'Selecione a peticao inicial')
              )}
              <input
                ref={peticaoInputRef}
                type="file"
                accept=".pdf"
                onChange={handlePeticaoSelect}
                className="hidden"
              />
            </div>
          )}

          {/* Se do histórico e não tem docs em memória: área opcional para emendas */}
          {isFromHistory && !hasDocsInMemory && (
            <div>
              <h4 className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Emendas <span className="text-slate-400 text-xs">(opcional)</span>
              </h4>
              {emendasFiles.length > 0 && (
                <div className="space-y-2 mb-2">
                  {emendasFiles.map(f => renderFileItem(f, handleRemoveEmenda))}
                </div>
              )}
              {renderDropArea(emendasInputRef, 'Adicionar emendas (se houver)')}
              <input
                ref={emendasInputRef}
                type="file"
                accept=".pdf"
                multiple
                onChange={handleEmendasSelect}
                className="hidden"
              />
            </div>
          )}

          {/* Área de contestações */}
          <div>
            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Contestacao <span className="text-red-500">*</span>
            </h4>
            {contestacaoFiles.length > 0 && (
              <div className="space-y-2 mb-2">
                {contestacaoFiles.map(f => renderFileItem(f, handleRemoveContestacao))}
              </div>
            )}
            {renderDropArea(contestacaoInputRef, 'Adicionar contestacao')}
            <input
              ref={contestacaoInputRef}
              type="file"
              accept=".pdf"
              multiple
              onChange={handleContestacaoSelect}
              className="hidden"
            />
          </div>

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

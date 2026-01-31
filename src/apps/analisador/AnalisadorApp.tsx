/**
 * @file AnalisadorApp.tsx
 * @description Componente principal do Analisador de Prepauta Trabalhista
 * @version 1.39.0 - Redesign com layout centralizado e batch mode
 */

import React, { useState, useCallback, useEffect } from 'react';
import { History, Settings, LogOut, FileSearch, ArrowLeft, Sun, Moon, Scale } from 'lucide-react';

// Auth
import { LoginGate, useLoginGate } from './components/auth/LoginGate';

// Batch
import { BatchMode } from './components/batch/BatchMode';

// History
import { HistoricoModal } from './components/history/HistoricoModal';

// Results
import { ResultsContainer } from './components/results';

// Settings
import { SettingsModal } from './components/settings';

// UI
import { Button, ToastProvider, useToast } from './components/ui';

// Stores & Hooks
import { useAnalysesStore, useResultStore } from './stores';
import { useAnalysesAPI } from './hooks';
import { useThemeManagement } from '../../hooks';
import type { SavedAnalysis } from './types/analysis.types';

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE DE CONTEÚDO (AUTENTICADO)
// ═══════════════════════════════════════════════════════════════════════════

const AnalisadorContent: React.FC = () => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [cameFromHistorico, setCameFromHistorico] = useState(false);
  const { showToast } = useToast();
  const { appTheme, toggleAppTheme } = useThemeManagement();

  // Auth
  const { logout } = useLoginGate();

  // Stores
  const { openHistorico, analyses } = useAnalysesStore();
  const {
    result,
    setResult,
    setAnalysisContext,
    setSavedAnalysisId,
    setFileNames,
    clearAnalysisContext,
    reset: resetResult
  } = useResultStore();

  // API
  const { fetchAnalyses } = useAnalysesAPI();

  // Fetch analyses on mount
  useEffect(() => {
    fetchAnalyses();
  }, [fetchAnalyses]);

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  const handleOpenSettings = useCallback(() => {
    setSettingsOpen(true);
  }, []);

  const handleCloseSettings = useCallback(() => {
    setSettingsOpen(false);
  }, []);

  const handleOpenHistorico = useCallback(() => {
    openHistorico();
  }, [openHistorico]);

  const handleSelectAnalysis = useCallback(
    (analysis: SavedAnalysis) => {
      setResult(analysis.resultado);
      setAnalysisContext(analysis.dataPauta ?? null, analysis.horarioAudiencia ?? null);
      setSavedAnalysisId(analysis.id);
      setFileNames(
        analysis.nomeArquivoPeticao,
        analysis.nomesArquivosEmendas || [],
        analysis.nomesArquivosContestacoes || []
      );
      setCameFromHistorico(true);
    },
    [setResult, setAnalysisContext, setSavedAnalysisId, setFileNames]
  );

  const handleVoltar = useCallback(() => {
    resetResult();
    clearAnalysisContext();
    if (cameFromHistorico) {
      setCameFromHistorico(false);
      openHistorico();
    }
  }, [resetResult, clearAnalysisContext, cameFromHistorico, openHistorico]);

  const handleLogout = useCallback(async () => {
    await logout();
    showToast('info', 'Sessão encerrada');
  }, [logout, showToast]);

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50/50 to-purple-50/50 dark:from-slate-900 dark:to-slate-800 relative">
      {/* Top-right: Sentencify Link + Theme Toggle + Settings + Logout icons */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        <a
          href="/"
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-300 dark:hover:border-indigo-600 transition-all shadow-sm"
          title="Voltar ao Sentencify"
        >
          <Scale className="w-4 h-4" />
          <span className="hidden sm:inline text-sm">Sentencify</span>
        </a>
        <button
          onClick={toggleAppTheme}
          className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 hover:border-amber-300 dark:hover:border-amber-600 transition-all shadow-sm"
          title={appTheme === 'dark' ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro'}
        >
          {appTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
        <button
          onClick={handleOpenSettings}
          className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-300 dark:hover:border-indigo-600 transition-all shadow-sm"
          title="Configurações"
        >
          <Settings className="w-4 h-4" />
        </button>
        <button
          onClick={handleLogout}
          className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:border-red-300 dark:hover:border-red-600 transition-all shadow-sm"
          title="Sair"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      <div className={`mx-auto px-6 py-8 ${result ? 'max-w-5xl' : 'max-w-3xl'}`}>
        {result ? (
          <>
            {/* Voltar button + ResultsContainer */}
            <div className="mb-4">
              <Button
                variant="secondary"
                onClick={handleVoltar}
                icon={<ArrowLeft className="w-4 h-4" />}
              >
                Voltar
              </Button>
            </div>
            <ResultsContainer />
          </>
        ) : (
          <>
            {/* Header centralizado */}
            <div className="text-center mb-6">
              <div className="inline-flex p-3 bg-indigo-600 rounded-2xl mb-4 shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30">
                <FileSearch className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                Análise em Lote
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                Arraste múltiplos arquivos de uma vez — o sistema agrupa automaticamente por processo
              </p>
            </div>

            {/* Botão Histórico */}
            <div className="text-center mb-8">
              <Button
                variant="secondary"
                onClick={handleOpenHistorico}
                icon={<History className="w-4 h-4" />}
                className="relative"
              >
                Ver Análises Salvas
                {analyses.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-indigo-500 text-white text-xs font-medium rounded-full flex items-center justify-center">
                    {analyses.length > 99 ? '99+' : analyses.length}
                  </span>
                )}
              </Button>
            </div>

            {/* Batch Mode */}
            <BatchMode />
          </>
        )}
      </div>

      {/* Modals */}
      <SettingsModal isOpen={settingsOpen} onClose={handleCloseSettings} />
      <HistoricoModal onSelectAnalysis={handleSelectAnalysis} />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL COM AUTH
// ═══════════════════════════════════════════════════════════════════════════

const AnalisadorApp: React.FC = () => {
  return (
    <ToastProvider>
      <LoginGate>
        <AnalisadorContent />
      </LoginGate>
    </ToastProvider>
  );
};

export default AnalisadorApp;

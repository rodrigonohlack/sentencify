/**
 * @file AnalisadorApp.tsx
 * @description Componente principal do Analisador de Prepauta Trabalhista
 * @version 1.39.0 - Redesign com batch mode only e histórico SQL
 */

import React, { useState, useCallback, useEffect } from 'react';
import { History, Settings, LogOut, FileSearch, User, Scale } from 'lucide-react';

// Layout
import { Header } from './components/layout';

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
import { Button, Card, CardContent, ToastProvider, useToast } from './components/ui';

// Stores & Hooks
import { useAnalysesStore, useResultStore } from './stores';
import { useAnalysesAPI } from './hooks';
import type { SavedAnalysis } from './types/analysis.types';

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE DE CONTEÚDO (AUTENTICADO)
// ═══════════════════════════════════════════════════════════════════════════

const AnalisadorContent: React.FC = () => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState<SavedAnalysis | null>(null);
  const { showToast } = useToast();

  // Auth
  const { user, logout, userEmail } = useLoginGate();

  // Stores
  const { openHistorico, isHistoricoOpen, analyses } = useAnalysesStore();
  const { result, setResult } = useResultStore();

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
      setSelectedAnalysis(analysis);
      setResult(analysis.resultado);
      showToast('success', `Análise do processo ${analysis.numeroProcesso || 'carregada'}`);
    },
    [setResult, showToast]
  );

  const handleLogout = useCallback(async () => {
    await logout();
    showToast('info', 'Sessão encerrada');
  }, [logout, showToast]);

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl">
                <FileSearch className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                  Analisador de Prepauta
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Análise automatizada de processos trabalhistas
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              {/* History button */}
              <Button
                variant="secondary"
                onClick={handleOpenHistorico}
                icon={<History className="w-4 h-4" />}
                className="relative"
              >
                Histórico
                {analyses.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-indigo-500 text-white text-xs font-medium rounded-full flex items-center justify-center">
                    {analyses.length > 99 ? '99+' : analyses.length}
                  </span>
                )}
              </Button>

              {/* Settings button */}
              <Button
                variant="secondary"
                onClick={handleOpenSettings}
                icon={<Settings className="w-4 h-4" />}
              >
                Configurações
              </Button>

              {/* User menu */}
              <div className="flex items-center gap-3 pl-3 border-l border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <User className="w-4 h-4 text-slate-400" />
                  <span className="hidden sm:inline">{userEmail}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                  title="Sair"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-180px)]">
          {/* Left Column - Batch Upload */}
          <div className="flex flex-col">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-sm font-bold">
                1
              </span>
              Upload de Documentos
            </h2>
            <div className="flex-1 min-h-0">
              <BatchMode />
            </div>
          </div>

          {/* Right Column - Results */}
          <div className="flex flex-col">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-sm font-bold">
                2
              </span>
              Resultado da Análise
              {selectedAnalysis && (
                <span className="ml-2 text-sm font-normal text-slate-500 dark:text-slate-400">
                  ({selectedAnalysis.numeroProcesso || 'Processo não identificado'})
                </span>
              )}
            </h2>
            <div className="flex-1 min-h-0 overflow-auto">
              <ResultsContainer />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 py-2">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4" />
              <a href="/" className="hover:text-indigo-500 transition-colors">
                Voltar ao Sentencify
              </a>
            </div>
            <div>
              v1.39.0 • Analisador de Prepauta
            </div>
          </div>
        </div>
      </footer>

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

/**
 * @file ProvaOralApp.tsx
 * @description Componente principal do App de Análise de Prova Oral
 */

import React from 'react';
import {
  Mic,
  Settings,
  History,
  LogOut,
  Scale,
  Moon,
  Sun,
} from 'lucide-react';
import {
  LoginGate,
  useLoginGate,
  ToastProvider,
  Button,
  SettingsModal,
  InputForm,
  ResultsContainer,
  HistoricoModal,
} from './components';
import { useProvaOralStore } from './stores';

// ═══════════════════════════════════════════════════════════════════════════
// HOOK PARA TEMA
// ═══════════════════════════════════════════════════════════════════════════

const useTheme = () => {
  const [isDark, setIsDark] = React.useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  const toggleTheme = React.useCallback(() => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    if (newIsDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  return { isDark, toggleTheme };
};

// ═══════════════════════════════════════════════════════════════════════════
// APP CONTENT
// ═══════════════════════════════════════════════════════════════════════════

const AppContent: React.FC = () => {
  const { userEmail, logout } = useLoginGate();
  const { isDark, toggleTheme } = useTheme();
  const {
    result,
    isSettingsOpen,
    isHistoricoOpen,
    openSettings,
    closeSettings,
    openHistorico,
    closeHistorico,
  } = useProvaOralStore();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-600/20">
                <Mic className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                  Análise de Prova Oral
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Sentencify AI
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {/* Voltar ao Sentencify */}
              <a
                href="/"
                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              >
                <Scale className="w-4 h-4" />
                <span className="hidden sm:inline">Sentencify</span>
              </a>

              {/* Theme toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTheme}
                icon={isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              >
                <span className="sr-only">Alternar tema</span>
              </Button>

              {/* Histórico */}
              <Button
                variant="ghost"
                size="sm"
                onClick={openHistorico}
                icon={<History className="w-4 h-4" />}
              >
                <span className="hidden sm:inline">Histórico</span>
              </Button>

              {/* Settings */}
              <Button
                variant="ghost"
                size="sm"
                onClick={openSettings}
                icon={<Settings className="w-4 h-4" />}
              >
                <span className="hidden sm:inline">Configurações</span>
              </Button>

              {/* User info & Logout */}
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-700">
                <span className="text-sm text-slate-600 dark:text-slate-400 hidden md:inline truncate max-w-[150px]">
                  {userEmail}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={logout}
                  icon={<LogOut className="w-4 h-4" />}
                >
                  <span className="sr-only">Sair</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Input Section */}
          <div>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
              <Mic className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Entrada de Dados
            </h2>
            <InputForm />
          </div>

          {/* Results Section */}
          <div>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
              <Scale className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Resultados da Análise
              {result && (
                <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
                  ({result.depoentes?.length || 0} depoentes, {result.analises?.length || 0} temas)
                </span>
              )}
            </h2>
            <ResultsContainer />
          </div>
        </div>
      </main>

      {/* Modals */}
      <SettingsModal isOpen={isSettingsOpen} onClose={closeSettings} />
      <HistoricoModal isOpen={isHistoricoOpen} onClose={closeHistorico} />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════════

export const ProvaOralApp: React.FC = () => {
  return (
    <ToastProvider>
      <LoginGate>
        <AppContent />
      </LoginGate>
    </ToastProvider>
  );
};

export default ProvaOralApp;

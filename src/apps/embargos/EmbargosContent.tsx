/**
 * @file EmbargosContent.tsx
 * @description Roteamento entre Tela 1, Tela 2 e Tela 3 com base no estado dos stores.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  History,
  Settings,
  LogOut,
  Sun,
  Moon,
  LayoutGrid
} from 'lucide-react';
import { AppSwitcher } from '../../components/shared/AppSwitcher';
import { UploadView } from './components/upload';
import { SynthesisReview } from './components/synthesis';
import { DraftView } from './components/draft';
import { HistoricoModal } from './components/history';
import { SettingsModal } from './components/settings';
import { useLoginGate } from './components/auth/LoginGate';
import { useToast } from './components/ui';
import {
  useSynthesisStore,
  useDocumentStore,
  useDraftStore
} from './stores';
import { useAutoSave, useLocalHistory } from './hooks';
import { useThemeManagement } from '../../hooks';

export const EmbargosContent: React.FC = () => {
  const synthesis = useSynthesisStore(s => s.synthesis);
  const draft = useDraftStore(s => s.draft);
  const resetSynthesis = useSynthesisStore(s => s.reset);
  const resetDocuments = useDocumentStore(s => s.reset);
  const resetDraft = useDraftStore(s => s.reset);

  const [view, setView] = useState<'upload' | 'synthesis' | 'draft'>('upload');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historicoOpen, setHistoricoOpen] = useState(false);

  const { showToast } = useToast();
  const { logout } = useLoginGate();
  const { appTheme, toggleAppTheme } = useThemeManagement();
  const { items: historyItems } = useLocalHistory();

  useAutoSave();

  // Auto-advance forward APENAS na transição null → valor (não força view sempre que
  // synthesis/draft existe — evita revert do "Voltar" enquanto o estado persiste).
  const prevSynthesisRef = useRef<typeof synthesis>(null);
  const prevDraftRef = useRef<typeof draft>(null);
  useEffect(() => {
    if (!prevDraftRef.current && draft) {
      setView('draft');
    } else if (!prevSynthesisRef.current && synthesis) {
      setView('synthesis');
    }
    prevSynthesisRef.current = synthesis;
    prevDraftRef.current = draft;
  }, [synthesis, draft]);

  const handleLogout = useCallback(async () => {
    await logout();
    showToast('info', 'Sessão encerrada');
  }, [logout, showToast]);

  const handleNew = useCallback(() => {
    resetSynthesis();
    resetDocuments();
    resetDraft();
    setView('upload');
  }, [resetSynthesis, resetDocuments, resetDraft]);

  const handleBackToUpload = useCallback(() => {
    setView('upload');
  }, []);

  const handleBackToSynthesis = useCallback(() => {
    resetDraft();
    setView('synthesis');
  }, [resetDraft]);

  // Escolha de tela
  let screen: React.ReactNode;
  if (view === 'draft' && draft) {
    screen = <DraftView onBackToSynthesis={handleBackToSynthesis} onNew={handleNew} />;
  } else if (view === 'synthesis' && synthesis) {
    screen = <SynthesisReview onBackToUpload={handleBackToUpload} />;
  } else {
    screen = <UploadView />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-slate-900 dark:to-slate-800 relative">
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        <AppSwitcher
          currentApp="embargos"
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:border-amber-300 dark:hover:border-amber-600 transition-all shadow-sm"
        >
          <LayoutGrid className="w-4 h-4" />
          <span className="hidden sm:inline text-sm">Apps</span>
        </AppSwitcher>
        <button
          onClick={() => setHistoricoOpen(true)}
          className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:border-amber-300 dark:hover:border-amber-600 transition-all shadow-sm relative"
          title="Histórico"
        >
          <History className="w-4 h-4" />
          {historyItems.length > 0 && (
            <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1.5 bg-amber-500 text-white text-xs font-semibold rounded-full inline-flex items-center justify-center">
              {historyItems.length}
            </span>
          )}
        </button>
        <button
          onClick={toggleAppTheme}
          className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 hover:border-amber-300 dark:hover:border-amber-600 transition-all shadow-sm"
          title={appTheme === 'dark' ? 'Tema claro' : 'Tema escuro'}
        >
          {appTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
        <button
          onClick={() => setSettingsOpen(true)}
          className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:border-amber-300 dark:hover:border-amber-600 transition-all shadow-sm"
          title="Configurações"
        >
          <Settings className="w-4 h-4" />
        </button>
        <button
          onClick={() => void handleLogout()}
          className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:border-red-300 dark:hover:border-red-600 transition-all shadow-sm"
          title="Sair"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {screen}

      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <HistoricoModal
        isOpen={historicoOpen}
        onClose={() => setHistoricoOpen(false)}
        onSelectAndOpen={() => setHistoricoOpen(false)}
      />
    </div>
  );
};

/**
 * @file AppHeader.tsx
 * @description Componente de cabeçalho da aplicação
 * @version 1.38.53
 *
 * Extraído do App.tsx para reduzir tamanho do arquivo.
 * Contém: título, número do processo, botões de ação, aviso de responsabilidade.
 */

import { LogOut, FileSearch, Mic, Sun, Moon, BookOpen, Settings } from 'lucide-react';
import { GoogleDriveButton } from '../GoogleDriveButton';
import { CSS } from '../../constants/styles';
import { APP_VERSION } from '../../constants/app-version';
import type { ModalKey } from '../../types';
import type { UseGoogleDriveReturn } from '../../hooks/useGoogleDrive';
import type { UseGoogleDriveActionsReturn } from '../../hooks/useGoogleDriveActions';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface CloudSyncForHeader {
  isAuthenticated: boolean;
}

export interface AppHeaderProps {
  // Process number
  processoNumero: string;
  setProcessoNumero: (numero: string) => void;

  // Theme
  appTheme: 'light' | 'dark';
  toggleAppTheme: () => void;

  // Modals
  setShowChangelogModal: (show: boolean) => void;
  openModal: (modal: ModalKey) => void;

  // Google Drive
  googleDrive: Pick<
    UseGoogleDriveReturn,
    'isConnected' | 'isLoading' | 'userEmail' | 'userPhoto' | 'connect' | 'disconnect'
  >;
  googleDriveActions: UseGoogleDriveActionsReturn;

  // Cloud Sync (for logout button)
  cloudSync: CloudSyncForHeader | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function AppHeader({
  processoNumero,
  setProcessoNumero,
  appTheme,
  toggleAppTheme,
  setShowChangelogModal,
  openModal,
  googleDrive,
  googleDriveActions,
  cloudSync,
}: AppHeaderProps) {
  return (
    <div className={CSS.modalHeader}>
      <div className="flex items-center justify-between">
        {/* Left side - Title and Process Number */}
        <div>
          <div className="flex items-baseline gap-3">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
              SENTENCIFY.AI
            </h1>
            <a
              href="/analise"
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 hover:border-blue-500/40 transition-all"
            >
              <FileSearch className="w-3.5 h-3.5" />
              Analisador
            </a>
            <a
              href="/prova-oral"
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 hover:border-purple-500/40 transition-all"
            >
              <Mic className="w-3.5 h-3.5" />
              Prova Oral
            </a>
          </div>

          {/* Process Number Input */}
          <div className="mt-2 mb-1">
            <input
              type="text"
              value={processoNumero}
              onChange={(e) => setProcessoNumero(e.target.value)}
              placeholder="Nº do Processo (ex: ATOrd 0000313-98.2025.5.08.0110)"
              className="w-full max-w-md px-3 py-1.5 rounded text-sm font-mono theme-bg-secondary border theme-border-primary theme-text-secondary theme-placeholder focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all theme-hover-bg"
              style={{ transition: 'all 0.2s ease' }}
            />
          </div>

          <p className="theme-text-muted mt-1">
            Ferramenta integrada com IA para auxílio na minuta de sentenças trabalhistas
          </p>
        </div>

        {/* Right side - Actions */}
        <div className="text-right">
          <div className="flex items-center justify-end gap-2 mb-2">
            <p className="text-xs theme-text-disabled">
              <button
                onClick={() => setShowChangelogModal(true)}
                className="hover:text-blue-400 transition-colors cursor-pointer"
                title="Ver histórico de alterações"
              >
                Versão {APP_VERSION}
              </button>
              {' '}- <span className="text-amber-500 font-semibold">PROTÓTIPO</span> (não utilizar
              com processos reais)
            </p>
          </div>
          <p className="text-xs theme-text-muted mt-1">
            Made by <span className="text-blue-400">Rodrigo Nohlack Corrêa Cesar</span>
          </p>
          <p className="text-xs theme-text-disabled">Juiz do Trabalho no TRT8</p>

          <div className="mt-2 flex gap-2 justify-end flex-wrap">
            {/* Manual Button */}
            <button
              onClick={() => window.open('/MANUAL_USUARIO_AVANCADO.html', '_blank')}
              className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-600 transition-all shadow-sm"
              title="Manual do Usuário Avançado"
            >
              <BookOpen className="w-4 h-4" />
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggleAppTheme}
              className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 hover:border-amber-300 dark:hover:border-amber-600 transition-all shadow-sm"
              title={appTheme === 'dark' ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro'}
            >
              {appTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Settings Button */}
            <button
              onClick={() => openModal('settings')}
              className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 hover:border-indigo-300 dark:hover:border-indigo-600 transition-all shadow-sm"
              title="Configurações de IA"
              data-testid="settings-button"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Google Drive Button */}
            <GoogleDriveButton
              isConnected={googleDrive.isConnected}
              isLoading={googleDrive.isLoading}
              userEmail={googleDrive.userEmail}
              userPhoto={googleDrive.userPhoto}
              onConnect={googleDrive.connect}
              onDisconnect={googleDrive.disconnect}
              onSave={googleDriveActions.handleDriveSave}
              onLoadClick={googleDriveActions.handleDriveLoadClick}
              onSaveLocal={googleDriveActions.handleLocalSave}
              onLoadLocal={googleDriveActions.handleLocalLoad}
              onClear={googleDriveActions.handleClear}
              isDarkMode={appTheme === 'dark'}
            />

            {/* Logout Button */}
            {cloudSync?.isAuthenticated && (
              <button
                onClick={() => openModal('logout')}
                className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-red-200 dark:border-red-900/50 text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:border-red-400 dark:hover:border-red-700 transition-all shadow-sm"
                title="Sair do sistema"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Responsibility Warning */}
      <div className="mt-4 p-3 theme-bg-amber-accent border border-amber-500/30 rounded-lg">
        <div className="flex items-start gap-2">
          <span className="theme-text-amber text-lg flex-shrink-0">⚠️</span>
          <div className="text-xs theme-text-amber-muted">
            <span className="font-semibold">Aviso Importante:</span> Esta ferramenta utiliza
            Inteligência Artificial para auxiliar na redação de sentenças. A IA pode cometer erros,
            omitir informações relevantes ou gerar conteúdo impreciso.
            <span className="block mt-1 font-semibold theme-text-amber">
              É responsabilidade do usuário revisar, verificar e validar todas as informações
              geradas antes de utilizá-las.
            </span>
            <span className="block mt-1 theme-text-amber-muted">
              Sua revisão é fundamental, na forma estabelecida pela{' '}
              <span className="font-semibold">Resolução 615/2025 do CNJ</span>.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AppHeader;

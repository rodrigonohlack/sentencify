/**
 * @file AppHeader.test.tsx
 * @description Testes para o componente AppHeader
 * @version 1.38.53
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AppHeader } from './AppHeader';
import type { AppHeaderProps } from './AppHeader';

// ═══════════════════════════════════════════════════════════════════════════
// MOCKS
// ═══════════════════════════════════════════════════════════════════════════

vi.mock('../GoogleDriveButton', () => ({
  GoogleDriveButton: vi.fn(({ onSave, onLoadClick, onSaveLocal, onClear }) => (
    <div data-testid="google-drive-button">
      <button data-testid="drive-save" onClick={onSave}>Save</button>
      <button data-testid="drive-load" onClick={onLoadClick}>Load</button>
      <button data-testid="local-save" onClick={onSaveLocal}>Local Save</button>
      <button data-testid="drive-clear" onClick={onClear}>Clear</button>
    </div>
  )),
}));

vi.mock('../../constants/styles', () => ({
  CSS: {
    modalHeader: 'modal-header-class',
    flexGap2: 'flex gap-2',
    label: 'label-class',
  },
}));

vi.mock('../../constants/app-version', () => ({
  APP_VERSION: '1.38.53',
}));

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

const mockSetProcessoNumero = vi.fn();
const mockToggleAppTheme = vi.fn();
const mockSetShowChangelogModal = vi.fn();
const mockOpenModal = vi.fn();
const mockConnect = vi.fn();
const mockDisconnect = vi.fn();
const mockHandleDriveSave = vi.fn();
const mockHandleDriveLoadClick = vi.fn();
const mockHandleLocalSave = vi.fn();
const mockHandleLocalLoad = vi.fn();
const mockHandleClear = vi.fn();

const createDefaultProps = (overrides: Partial<AppHeaderProps> = {}): AppHeaderProps => ({
  processoNumero: '0001234-56.2025.5.08.0110',
  setProcessoNumero: mockSetProcessoNumero,
  appTheme: 'dark',
  toggleAppTheme: mockToggleAppTheme,
  setShowChangelogModal: mockSetShowChangelogModal,
  openModal: mockOpenModal,
  googleDrive: {
    isConnected: false,
    isLoading: false,
    userEmail: null,
    userPhoto: null,
    connect: mockConnect,
    disconnect: mockDisconnect,
  },
  googleDriveActions: {
    handleDriveSave: mockHandleDriveSave,
    handleDriveLoadClick: mockHandleDriveLoadClick,
    handleLocalSave: mockHandleLocalSave,
    handleLocalLoad: mockHandleLocalLoad,
    handleClear: mockHandleClear,
  },
  cloudSync: null,
  ...overrides,
});

// ═══════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('AppHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // BASIC RENDERING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Basic Rendering', () => {
    it('should render SENTENCIFY.AI title', () => {
      render(<AppHeader {...createDefaultProps()} />);

      expect(screen.getByText('SENTENCIFY.AI')).toBeInTheDocument();
    });

    it('should render version number', () => {
      render(<AppHeader {...createDefaultProps()} />);

      expect(screen.getByText(/Versão 1.38.53/)).toBeInTheDocument();
    });

    it('should render PROTÓTIPO warning', () => {
      render(<AppHeader {...createDefaultProps()} />);

      expect(screen.getByText('PROTÓTIPO')).toBeInTheDocument();
    });

    it('should render author name', () => {
      render(<AppHeader {...createDefaultProps()} />);

      expect(screen.getByText('Rodrigo Nohlack Corrêa Cesar')).toBeInTheDocument();
    });

    it('should render responsibility warning', () => {
      render(<AppHeader {...createDefaultProps()} />);

      expect(screen.getByText(/Aviso Importante/)).toBeInTheDocument();
    });

    it('should render Analisador link', () => {
      render(<AppHeader {...createDefaultProps()} />);

      const link = screen.getByText('Analisador');
      expect(link).toBeInTheDocument();
      expect(link.closest('a')).toHaveAttribute('href', '/analise');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCESS NUMBER INPUT
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Process Number Input', () => {
    it('should render process number input', () => {
      render(<AppHeader {...createDefaultProps()} />);

      const input = screen.getByPlaceholderText(/Nº do Processo/);
      expect(input).toBeInTheDocument();
    });

    it('should display current process number', () => {
      render(<AppHeader {...createDefaultProps()} />);

      const input = screen.getByPlaceholderText(/Nº do Processo/) as HTMLInputElement;
      expect(input.value).toBe('0001234-56.2025.5.08.0110');
    });

    it('should call setProcessoNumero on input change', () => {
      render(<AppHeader {...createDefaultProps()} />);

      const input = screen.getByPlaceholderText(/Nº do Processo/);
      fireEvent.change(input, { target: { value: '9999999-00.2025.5.08.0001' } });

      expect(mockSetProcessoNumero).toHaveBeenCalledWith('9999999-00.2025.5.08.0001');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // THEME TOGGLE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Theme Toggle', () => {
    it('should show theme toggle button in light mode', () => {
      render(<AppHeader {...createDefaultProps({ appTheme: 'light' })} />);

      const themeButton = screen.getByTitle('Mudar para Tema Escuro');
      expect(themeButton).toBeInTheDocument();
    });

    it('should show theme toggle button in dark mode', () => {
      render(<AppHeader {...createDefaultProps({ appTheme: 'dark' })} />);

      const themeButton = screen.getByTitle('Mudar para Tema Claro');
      expect(themeButton).toBeInTheDocument();
    });

    it('should call toggleAppTheme on click', () => {
      render(<AppHeader {...createDefaultProps()} />);

      const themeButton = screen.getByTitle('Mudar para Tema Claro');
      fireEvent.click(themeButton);

      expect(mockToggleAppTheme).toHaveBeenCalledTimes(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SETTINGS BUTTON
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Settings Button', () => {
    it('should render settings button', () => {
      render(<AppHeader {...createDefaultProps()} />);

      expect(screen.getByTitle('Configurações de IA')).toBeInTheDocument();
    });

    it('should open settings modal on click', () => {
      render(<AppHeader {...createDefaultProps()} />);

      const settingsButton = screen.getByTitle('Configurações de IA');
      fireEvent.click(settingsButton);

      expect(mockOpenModal).toHaveBeenCalledWith('settings');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CHANGELOG
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Changelog', () => {
    it('should open changelog modal on version click', () => {
      render(<AppHeader {...createDefaultProps()} />);

      const versionButton = screen.getByTitle('Ver histórico de alterações');
      fireEvent.click(versionButton);

      expect(mockSetShowChangelogModal).toHaveBeenCalledWith(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GOOGLE DRIVE BUTTON
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Google Drive Button', () => {
    it('should render GoogleDriveButton component', () => {
      render(<AppHeader {...createDefaultProps()} />);

      expect(screen.getByTestId('google-drive-button')).toBeInTheDocument();
    });

    it('should pass correct handlers to GoogleDriveButton', () => {
      render(<AppHeader {...createDefaultProps()} />);

      // Test onSave
      fireEvent.click(screen.getByTestId('drive-save'));
      expect(mockHandleDriveSave).toHaveBeenCalled();

      // Test onLoadClick
      fireEvent.click(screen.getByTestId('drive-load'));
      expect(mockHandleDriveLoadClick).toHaveBeenCalled();

      // Test onSaveLocal
      fireEvent.click(screen.getByTestId('local-save'));
      expect(mockHandleLocalSave).toHaveBeenCalled();

      // Test onClear
      fireEvent.click(screen.getByTestId('drive-clear'));
      expect(mockHandleClear).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // LOGOUT BUTTON
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Logout Button', () => {
    it('should not show logout button when cloudSync is null', () => {
      render(<AppHeader {...createDefaultProps({ cloudSync: null })} />);

      expect(screen.queryByText('Sair')).not.toBeInTheDocument();
    });

    it('should not show logout button when not authenticated', () => {
      render(<AppHeader {...createDefaultProps({ cloudSync: { isAuthenticated: false } })} />);

      expect(screen.queryByTitle('Sair do sistema')).not.toBeInTheDocument();
    });

    it('should show logout button when authenticated', () => {
      render(<AppHeader {...createDefaultProps({ cloudSync: { isAuthenticated: true } })} />);

      expect(screen.getByTitle('Sair do sistema')).toBeInTheDocument();
    });

    it('should open logout modal on click', () => {
      render(<AppHeader {...createDefaultProps({ cloudSync: { isAuthenticated: true } })} />);

      const logoutButton = screen.getByTitle('Sair do sistema');
      fireEvent.click(logoutButton);

      expect(mockOpenModal).toHaveBeenCalledWith('logout');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // MANUAL BUTTON
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Manual Button', () => {
    it('should render manual button', () => {
      render(<AppHeader {...createDefaultProps()} />);

      const manualButton = screen.getByTitle('Manual do Usuário Avançado');
      expect(manualButton).toBeInTheDocument();
      // Agora usa ícone BookOpen do Lucide (SVG) em vez de emoji
      expect(manualButton.querySelector('svg')).toBeInTheDocument();
    });

    it('should open manual in new window on click', () => {
      const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
      render(<AppHeader {...createDefaultProps()} />);

      const manualButton = screen.getByTitle('Manual do Usuário Avançado');
      fireEvent.click(manualButton);

      expect(windowOpenSpy).toHaveBeenCalledWith('/MANUAL_USUARIO_AVANCADO.html', '_blank');
      windowOpenSpy.mockRestore();
    });
  });
});

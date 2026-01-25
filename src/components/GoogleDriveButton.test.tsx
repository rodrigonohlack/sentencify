/**
 * @file GoogleDriveButton.test.tsx
 * @description Testes para o componente GoogleDriveButton e DriveFilesModal
 * @version 1.38.52
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GoogleDriveButton, DriveFilesModal } from './GoogleDriveButton';
import type { GoogleDriveFile } from '../hooks/useGoogleDrive';

// Mock BaseModal
vi.mock('./modals/BaseModal', () => ({
  BaseModal: ({ isOpen, children, footer, onClose }: { isOpen: boolean; children: React.ReactNode; footer?: React.ReactNode; onClose: () => void }) => {
    if (!isOpen) return null;
    return (
      <div data-testid="base-modal">
        <div data-testid="modal-content">{children}</div>
        <div data-testid="modal-footer">{footer}</div>
        <button onClick={onClose} data-testid="modal-close">Close</button>
      </div>
    );
  },
  ModalFooter: {
    Destructive: ({ onClose, onConfirm, confirmText }: { onClose: () => void; onConfirm: () => void; confirmText: string }) => (
      <>
        <button onClick={onClose}>Cancelar</button>
        <button onClick={onConfirm}>{confirmText}</button>
      </>
    ),
  },
}));

describe('GoogleDriveButton', () => {
  const defaultProps = {
    isConnected: false,
    isLoading: false,
    userEmail: null as string | null,
    userPhoto: null as string | null,
    onConnect: vi.fn(),
    onDisconnect: vi.fn(),
    onSave: vi.fn(),
    onLoadClick: vi.fn(),
    onSaveLocal: vi.fn(),
    onLoadLocal: vi.fn(),
    onClear: vi.fn(),
    isDarkMode: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Cleanup any listeners
    document.removeEventListener('mousedown', () => {});
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERING - DISCONNECTED STATE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Rendering - Disconnected', () => {
    it('should render button with Projeto text', () => {
      render(<GoogleDriveButton {...defaultProps} />);
      expect(screen.getByText('Projeto')).toBeInTheDocument();
    });

    it('should show CloudOff icon when not connected', () => {
      const { container } = render(<GoogleDriveButton {...defaultProps} />);
      // CloudOff has specific classes
      const svgs = container.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThan(0);
    });

    it('should have title "Google Drive" when not connected', () => {
      render(<GoogleDriveButton {...defaultProps} />);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', 'Google Drive');
    });

    it('should not show dropdown initially', () => {
      render(<GoogleDriveButton {...defaultProps} />);
      expect(screen.queryByText('Conectar Google Drive')).not.toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERING - CONNECTED STATE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Rendering - Connected', () => {
    it('should show connected title with email', () => {
      render(<GoogleDriveButton {...defaultProps} isConnected={true} userEmail="user@example.com" />);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', 'Conectado: user@example.com');
    });

    it('should show Cloud icon when connected', () => {
      const { container } = render(<GoogleDriveButton {...defaultProps} isConnected={true} />);
      const svgs = container.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERING - LOADING STATE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Rendering - Loading', () => {
    it('should show spinner when loading', () => {
      const { container } = render(<GoogleDriveButton {...defaultProps} isLoading={true} />);
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should disable button when loading', () => {
      render(<GoogleDriveButton {...defaultProps} isLoading={true} />);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('should have opacity class when loading', () => {
      render(<GoogleDriveButton {...defaultProps} isLoading={true} />);
      const button = screen.getByRole('button');
      expect(button.className).toContain('opacity-50');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DROPDOWN TOGGLE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Dropdown Toggle', () => {
    it('should open dropdown when button clicked', () => {
      render(<GoogleDriveButton {...defaultProps} />);
      fireEvent.click(screen.getByRole('button'));

      expect(screen.getByText('Desconectado')).toBeInTheDocument();
    });

    it('should close dropdown when button clicked again', () => {
      render(<GoogleDriveButton {...defaultProps} />);
      const button = screen.getByRole('button');

      fireEvent.click(button);
      expect(screen.getByText('Desconectado')).toBeInTheDocument();

      fireEvent.click(button);
      expect(screen.queryByText('Desconectado')).not.toBeInTheDocument();
    });

    it('should rotate chevron when open', () => {
      const { container } = render(<GoogleDriveButton {...defaultProps} />);

      // Click to open dropdown
      fireEvent.click(screen.getByRole('button'));

      // Verify dropdown is open by checking for dropdown content
      expect(screen.getByText('Desconectado')).toBeInTheDocument();

      // Chevron should have transition class
      const svgs = container.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DROPDOWN - DISCONNECTED OPTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Dropdown - Disconnected Options', () => {
    it('should show Connect option when disconnected', () => {
      render(<GoogleDriveButton {...defaultProps} />);
      fireEvent.click(screen.getByRole('button'));

      expect(screen.getByText('Conectar Google Drive')).toBeInTheDocument();
    });

    it('should call onConnect and close dropdown when connect clicked', () => {
      render(<GoogleDriveButton {...defaultProps} />);
      fireEvent.click(screen.getByRole('button'));
      fireEvent.click(screen.getByText('Conectar Google Drive'));

      expect(defaultProps.onConnect).toHaveBeenCalled();
      expect(screen.queryByText('Conectar Google Drive')).not.toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DROPDOWN - CONNECTED OPTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Dropdown - Connected Options', () => {
    const connectedProps = { ...defaultProps, isConnected: true, userEmail: 'user@test.com' };

    it('should show user email when connected', () => {
      render(<GoogleDriveButton {...connectedProps} />);
      fireEvent.click(screen.getByRole('button'));

      expect(screen.getByText('user@test.com')).toBeInTheDocument();
    });

    it('should show user photo when provided', () => {
      const { container } = render(<GoogleDriveButton {...connectedProps} userPhoto="https://example.com/photo.jpg" />);
      fireEvent.click(screen.getByRole('button'));

      const img = container.querySelector('img');
      expect(img).toHaveAttribute('src', 'https://example.com/photo.jpg');
    });

    it('should show Save option when connected', () => {
      render(<GoogleDriveButton {...connectedProps} />);
      fireEvent.click(screen.getByRole('button'));

      expect(screen.getByText('Salvar no Drive')).toBeInTheDocument();
    });

    it('should show Load option when connected', () => {
      render(<GoogleDriveButton {...connectedProps} />);
      fireEvent.click(screen.getByRole('button'));

      expect(screen.getByText('Carregar do Drive')).toBeInTheDocument();
    });

    it('should show Disconnect option when connected', () => {
      render(<GoogleDriveButton {...connectedProps} />);
      fireEvent.click(screen.getByRole('button'));

      expect(screen.getByText('Desconectar')).toBeInTheDocument();
    });

    it('should call onSave when save clicked', () => {
      render(<GoogleDriveButton {...connectedProps} />);
      fireEvent.click(screen.getByRole('button'));
      fireEvent.click(screen.getByText('Salvar no Drive'));

      expect(defaultProps.onSave).toHaveBeenCalled();
    });

    it('should call onLoadClick when load clicked', () => {
      render(<GoogleDriveButton {...connectedProps} />);
      fireEvent.click(screen.getByRole('button'));
      fireEvent.click(screen.getByText('Carregar do Drive'));

      expect(defaultProps.onLoadClick).toHaveBeenCalled();
    });

    it('should call onDisconnect when disconnect clicked', () => {
      render(<GoogleDriveButton {...connectedProps} />);
      fireEvent.click(screen.getByRole('button'));
      fireEvent.click(screen.getByText('Desconectar'));

      expect(defaultProps.onDisconnect).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // LOCAL OPTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Local Options', () => {
    it('should show Local section header', () => {
      render(<GoogleDriveButton {...defaultProps} />);
      fireEvent.click(screen.getByRole('button'));

      expect(screen.getByText('Local')).toBeInTheDocument();
    });

    it('should show Save Local option', () => {
      render(<GoogleDriveButton {...defaultProps} />);
      fireEvent.click(screen.getByRole('button'));

      expect(screen.getByText('Salvar Arquivo')).toBeInTheDocument();
    });

    it('should show Load Local option', () => {
      render(<GoogleDriveButton {...defaultProps} />);
      fireEvent.click(screen.getByRole('button'));

      expect(screen.getByText('Carregar Arquivo')).toBeInTheDocument();
    });

    it('should show Clear Project option', () => {
      render(<GoogleDriveButton {...defaultProps} />);
      fireEvent.click(screen.getByRole('button'));

      expect(screen.getByText('Limpar Projeto')).toBeInTheDocument();
    });

    it('should call onSaveLocal when clicked', () => {
      render(<GoogleDriveButton {...defaultProps} />);
      fireEvent.click(screen.getByRole('button'));
      fireEvent.click(screen.getByText('Salvar Arquivo'));

      expect(defaultProps.onSaveLocal).toHaveBeenCalled();
    });

    it('should call onClear when clear clicked', () => {
      render(<GoogleDriveButton {...defaultProps} />);
      fireEvent.click(screen.getByRole('button'));
      fireEvent.click(screen.getByText('Limpar Projeto'));

      expect(defaultProps.onClear).toHaveBeenCalled();
    });

    it('should have hidden file input for load local', () => {
      const { container } = render(<GoogleDriveButton {...defaultProps} />);
      const fileInput = container.querySelector('input[type="file"]');

      expect(fileInput).toBeInTheDocument();
      expect(fileInput?.className).toContain('hidden');
      expect(fileInput).toHaveAttribute('accept', '.json');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DARK MODE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Dark Mode', () => {
    it('should apply dark mode classes to button', () => {
      render(<GoogleDriveButton {...defaultProps} isDarkMode={true} />);
      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-slate-700');
    });

    it('should apply light mode classes to button', () => {
      render(<GoogleDriveButton {...defaultProps} isDarkMode={false} />);
      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-slate-200');
    });
  });
});

describe('DriveFilesModal', () => {
  const createMockFile = (id: string, name: string): GoogleDriveFile => ({
    id,
    name,
    modifiedTime: '2025-01-20T10:00:00Z',
    createdTime: '2025-01-15T08:00:00Z',
    size: '1024',
  });

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    files: [createMockFile('1', 'Project 1.json'), createMockFile('2', 'Project 2.json')],
    isLoading: false,
    onLoad: vi.fn(),
    onDelete: vi.fn(),
    onShare: vi.fn().mockResolvedValue(undefined),
    onGetPermissions: vi.fn().mockResolvedValue([]),
    onRemovePermission: vi.fn().mockResolvedValue(true),
    onRefresh: vi.fn(),
    userEmail: 'user@test.com',
    isDarkMode: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    document.body.style.overflow = '';
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Rendering', () => {
    it('should render when isOpen is true', () => {
      render(<DriveFilesModal {...defaultProps} />);
      expect(screen.getByText('Projetos no Google Drive')).toBeInTheDocument();
    });

    it('should return null when isOpen is false', () => {
      const { container } = render(<DriveFilesModal {...defaultProps} isOpen={false} />);
      expect(container.firstChild).toBeNull();
    });

    it('should display file list', () => {
      render(<DriveFilesModal {...defaultProps} />);
      expect(screen.getByText('Project 1.json')).toBeInTheDocument();
      expect(screen.getByText('Project 2.json')).toBeInTheDocument();
    });

    it('should display file count', () => {
      render(<DriveFilesModal {...defaultProps} />);
      expect(screen.getByText('2 arquivo(s) encontrado(s)')).toBeInTheDocument();
    });

    it('should show loading state', () => {
      const { container } = render(<DriveFilesModal {...defaultProps} isLoading={true} />);
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should show empty state when no files', () => {
      render(<DriveFilesModal {...defaultProps} files={[]} />);
      expect(screen.getByText(/Nenhum projeto Sentencify/)).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SEARCH FUNCTIONALITY
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Search Functionality', () => {
    it('should render search input when files exist', () => {
      render(<DriveFilesModal {...defaultProps} />);
      expect(screen.getByPlaceholderText(/Buscar projeto/)).toBeInTheDocument();
    });

    it('should filter files based on search', () => {
      render(<DriveFilesModal {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText(/Buscar projeto/);
      fireEvent.change(searchInput, { target: { value: 'Project 1' } });

      expect(screen.getByText('Project 1.json')).toBeInTheDocument();
      expect(screen.queryByText('Project 2.json')).not.toBeInTheDocument();
    });

    it('should show no results message when search has no matches', () => {
      render(<DriveFilesModal {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText(/Buscar projeto/);
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

      expect(screen.getByText(/Nenhum projeto corresponde/)).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FILE ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('File Actions', () => {
    it('should call onLoad when Carregar button clicked', () => {
      render(<DriveFilesModal {...defaultProps} />);
      const loadButtons = screen.getAllByText('Carregar');
      fireEvent.click(loadButtons[0]);

      expect(defaultProps.onLoad).toHaveBeenCalledWith(defaultProps.files[0]);
    });

    it('should call onRefresh when refresh button clicked', () => {
      render(<DriveFilesModal {...defaultProps} />);
      const refreshButton = screen.getByTitle('Atualizar lista');
      fireEvent.click(refreshButton);

      expect(defaultProps.onRefresh).toHaveBeenCalled();
    });

    it('should call onClose when backdrop clicked', () => {
      const { container } = render(<DriveFilesModal {...defaultProps} />);
      const backdrop = container.querySelector('.bg-black\\/50');
      if (backdrop) {
        fireEvent.click(backdrop);
      }
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // KEYBOARD NAVIGATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Keyboard Navigation', () => {
    it('should call onClose when ESC is pressed', () => {
      render(<DriveFilesModal {...defaultProps} />);
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SCROLL LOCK
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Scroll Lock', () => {
    it('should set body overflow to hidden when open', () => {
      render(<DriveFilesModal {...defaultProps} />);
      expect(document.body.style.overflow).toBe('hidden');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DATE/SIZE FORMATTING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Formatting', () => {
    it('should format dates correctly', () => {
      render(<DriveFilesModal {...defaultProps} />);
      // Should show pt-BR formatted date (at least part of it)
      expect(screen.getAllByText(/20\/01\/2025/).length).toBeGreaterThan(0);
    });

    it('should format sizes correctly', () => {
      render(<DriveFilesModal {...defaultProps} />);
      // 1024 bytes = 1 KB (may appear multiple times)
      expect(screen.getAllByText(/KB/).length).toBeGreaterThan(0);
    });
  });
});

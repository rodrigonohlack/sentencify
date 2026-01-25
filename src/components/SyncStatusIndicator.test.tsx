/**
 * @file SyncStatusIndicator.test.tsx
 * @description Testes para o componente SyncStatusIndicator
 * @version 1.38.52
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SyncStatusIndicator, { SyncStatusIcon } from './SyncStatusIndicator';

describe('SyncStatusIndicator', () => {
  const defaultProps = {
    status: 'idle' as const,
    pendingCount: 0,
    lastSyncAt: null,
    onSync: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Rendering', () => {
    it('should render button with label', () => {
      render(<SyncStatusIndicator {...defaultProps} />);
      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByText('Modelos sincronizados')).toBeInTheDocument();
    });

    it('should render with custom className', () => {
      const { container } = render(<SyncStatusIndicator {...defaultProps} className="custom-class" />);
      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });

    it('should show pending message when pendingCount > 0', () => {
      render(<SyncStatusIndicator {...defaultProps} pendingCount={3} />);
      expect(screen.getByText('3 modelos pendentes')).toBeInTheDocument();
    });

    it('should show singular pending message when pendingCount === 1', () => {
      render(<SyncStatusIndicator {...defaultProps} pendingCount={1} />);
      expect(screen.getByText('1 modelo pendente')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // STATUS STATES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Status States', () => {
    it('should show syncing state', () => {
      render(<SyncStatusIndicator {...defaultProps} status="syncing" />);
      expect(screen.getByText('Sincronizando...')).toBeInTheDocument();
    });

    it('should show error state', () => {
      render(<SyncStatusIndicator {...defaultProps} status="error" />);
      expect(screen.getByText('Erro de sync')).toBeInTheDocument();
    });

    it('should show offline state', () => {
      render(<SyncStatusIndicator {...defaultProps} status="offline" />);
      expect(screen.getByText('Offline')).toBeInTheDocument();
    });

    it('should show idle state with synced message', () => {
      render(<SyncStatusIndicator {...defaultProps} status="idle" />);
      expect(screen.getByText('Modelos sincronizados')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INTERACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Interactions', () => {
    it('should call onSync when clicked in idle state', () => {
      render(<SyncStatusIndicator {...defaultProps} />);
      fireEvent.click(screen.getByRole('button'));
      expect(defaultProps.onSync).toHaveBeenCalledTimes(1);
    });

    it('should call onSync when clicked in error state', () => {
      render(<SyncStatusIndicator {...defaultProps} status="error" />);
      fireEvent.click(screen.getByRole('button'));
      expect(defaultProps.onSync).toHaveBeenCalledTimes(1);
    });

    it('should not call onSync when syncing', () => {
      render(<SyncStatusIndicator {...defaultProps} status="syncing" />);
      fireEvent.click(screen.getByRole('button'));
      expect(defaultProps.onSync).not.toHaveBeenCalled();
    });

    it('should not call onSync when offline', () => {
      render(<SyncStatusIndicator {...defaultProps} status="offline" />);
      fireEvent.click(screen.getByRole('button'));
      expect(defaultProps.onSync).not.toHaveBeenCalled();
    });

    it('should be disabled when syncing', () => {
      render(<SyncStatusIndicator {...defaultProps} status="syncing" />);
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('should be disabled when offline', () => {
      render(<SyncStatusIndicator {...defaultProps} status="offline" />);
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('should be enabled when idle with onSync', () => {
      render(<SyncStatusIndicator {...defaultProps} />);
      expect(screen.getByRole('button')).not.toBeDisabled();
    });

    it('should be disabled when no onSync provided', () => {
      render(<SyncStatusIndicator status="idle" pendingCount={0} lastSyncAt={null} />);
      expect(screen.getByRole('button')).toBeDisabled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TITLE/TOOLTIP
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Title/Tooltip', () => {
    it('should show "Nunca" when lastSyncAt is null', () => {
      render(<SyncStatusIndicator {...defaultProps} lastSyncAt={null} />);
      const button = screen.getByRole('button');
      expect(button.title).toContain('Nunca');
    });

    it('should show "Agora" when lastSyncAt is very recent', () => {
      const now = new Date().toISOString();
      render(<SyncStatusIndicator {...defaultProps} lastSyncAt={now} />);
      const button = screen.getByRole('button');
      expect(button.title).toContain('Agora');
    });

    it('should include sync instruction when clickable', () => {
      render(<SyncStatusIndicator {...defaultProps} />);
      const button = screen.getByRole('button');
      expect(button.title).toContain('Clique para sincronizar');
    });

    it('should not include sync instruction when not clickable', () => {
      render(<SyncStatusIndicator {...defaultProps} status="syncing" />);
      const button = screen.getByRole('button');
      expect(button.title).not.toContain('Clique para sincronizar');
    });
  });
});

describe('SyncStatusIcon', () => {
  const defaultProps = {
    status: 'idle' as const,
    pendingCount: 0,
    onSync: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Rendering', () => {
    it('should render button', () => {
      render(<SyncStatusIcon {...defaultProps} />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should render SVG icon', () => {
      const { container } = render(<SyncStatusIcon {...defaultProps} />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('should render with custom className', () => {
      const { container } = render(<SyncStatusIcon {...defaultProps} className="custom-class" />);
      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PENDING COUNT BADGE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Pending Count Badge', () => {
    it('should not show badge when pendingCount is 0', () => {
      render(<SyncStatusIcon {...defaultProps} pendingCount={0} />);
      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });

    it('should show badge when pendingCount > 0 and idle', () => {
      render(<SyncStatusIcon {...defaultProps} pendingCount={5} />);
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('should show 9+ when pendingCount > 9', () => {
      render(<SyncStatusIcon {...defaultProps} pendingCount={15} />);
      expect(screen.getByText('9+')).toBeInTheDocument();
    });

    it('should not show badge when syncing', () => {
      render(<SyncStatusIcon {...defaultProps} status="syncing" pendingCount={5} />);
      expect(screen.queryByText('5')).not.toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INTERACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Interactions', () => {
    it('should call onSync when clicked', () => {
      render(<SyncStatusIcon {...defaultProps} />);
      fireEvent.click(screen.getByRole('button'));
      expect(defaultProps.onSync).toHaveBeenCalledTimes(1);
    });

    it('should not call onSync when syncing', () => {
      render(<SyncStatusIcon {...defaultProps} status="syncing" />);
      fireEvent.click(screen.getByRole('button'));
      expect(defaultProps.onSync).not.toHaveBeenCalled();
    });

    it('should not call onSync when offline', () => {
      render(<SyncStatusIcon {...defaultProps} status="offline" />);
      fireEvent.click(screen.getByRole('button'));
      expect(defaultProps.onSync).not.toHaveBeenCalled();
    });

    it('should be disabled when syncing', () => {
      render(<SyncStatusIcon {...defaultProps} status="syncing" />);
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('should be disabled when offline', () => {
      render(<SyncStatusIcon {...defaultProps} status="offline" />);
      expect(screen.getByRole('button')).toBeDisabled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // STATUS VISUAL
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Status Visual', () => {
    it('should have green color when idle and synced', () => {
      const { container } = render(<SyncStatusIcon {...defaultProps} />);
      const svg = container.querySelector('svg');
      expect(svg?.classList.contains('text-green-400')).toBe(true);
    });

    it('should have yellow color when idle with pending', () => {
      const { container } = render(<SyncStatusIcon {...defaultProps} pendingCount={2} />);
      const svg = container.querySelector('svg');
      expect(svg?.classList.contains('text-yellow-400')).toBe(true);
    });

    it('should have blue color when syncing', () => {
      const { container } = render(<SyncStatusIcon {...defaultProps} status="syncing" />);
      const svg = container.querySelector('svg');
      expect(svg?.classList.contains('text-blue-400')).toBe(true);
    });

    it('should have red color when error', () => {
      const { container } = render(<SyncStatusIcon {...defaultProps} status="error" />);
      const svg = container.querySelector('svg');
      expect(svg?.classList.contains('text-red-400')).toBe(true);
    });

    it('should have slate color when offline', () => {
      const { container } = render(<SyncStatusIcon {...defaultProps} status="offline" />);
      const svg = container.querySelector('svg');
      expect(svg?.classList.contains('text-slate-500')).toBe(true);
    });

    it('should have spin animation when syncing', () => {
      const { container } = render(<SyncStatusIcon {...defaultProps} status="syncing" />);
      const svg = container.querySelector('svg');
      expect(svg?.classList.contains('animate-spin')).toBe(true);
    });
  });
});

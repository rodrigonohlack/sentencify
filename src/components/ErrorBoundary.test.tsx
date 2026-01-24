/**
 * @file ErrorBoundary.test.tsx
 * @description Testes para o componente ErrorBoundary
 * @version 1.37.57
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

// Suppress console.error for cleaner test output
const originalError = console.error;

// Component that throws an error for testing
const ThrowingComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div>Child content</div>;
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = originalError;
    vi.restoreAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // NORMAL RENDERING TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Normal Rendering', () => {
    it('should render children when no error', () => {
      render(
        <ErrorBoundary>
          <div>Child content</div>
        </ErrorBoundary>
      );

      expect(screen.getByText('Child content')).toBeInTheDocument();
    });

    it('should not show error UI when no error', () => {
      render(
        <ErrorBoundary>
          <div>Child content</div>
        </ErrorBoundary>
      );

      expect(screen.queryByText('Erro na Aplicação')).not.toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ERROR CATCHING TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Error Catching', () => {
    it('should catch errors and show error UI', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Erro na Aplicação')).toBeInTheDocument();
    });

    it('should show reassuring message', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Seus dados estão seguros.')).toBeInTheDocument();
    });

    it('should show reload button', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Recarregar')).toBeInTheDocument();
    });

    it('should show export backup button', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Exportar Backup')).toBeInTheDocument();
    });

    it('should show instructions', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('O que fazer:')).toBeInTheDocument();
      expect(screen.getByText('Clique em "Recarregar"')).toBeInTheDocument();
    });

    it('should show technical details section', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Detalhes Técnicos')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RELOAD BUTTON TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Reload Button', () => {
    it('should call window.location.reload when clicked', () => {
      const mockReload = vi.fn();
      Object.defineProperty(window, 'location', {
        value: { reload: mockReload },
        writable: true,
      });

      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      fireEvent.click(screen.getByText('Recarregar'));

      expect(mockReload).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EXPORT BACKUP TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Export Backup', () => {
    it('should have export backup button visible in error UI', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      const exportButton = screen.getByText('Exportar Backup');
      expect(exportButton).toBeInTheDocument();
      expect(exportButton.tagName).toBe('BUTTON');
    });

    it('should be clickable without errors', () => {
      // Mock necessary APIs to prevent errors during export
      Object.defineProperty(URL, 'createObjectURL', { value: vi.fn(() => 'blob:mock'), writable: true });
      Object.defineProperty(URL, 'revokeObjectURL', { value: vi.fn(), writable: true });
      vi.spyOn(window, 'alert').mockImplementation(() => {});

      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      // Should not throw when clicking export
      expect(() => {
        fireEvent.click(screen.getByText('Exportar Backup'));
      }).not.toThrow();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ERROR DETAILS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Error Details', () => {
    it('should show error message in details', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      // Click on details to expand
      fireEvent.click(screen.getByText('Detalhes Técnicos'));

      expect(screen.getByText(/Test error message/)).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // VERSION DISPLAY TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Version Display', () => {
    it('should show app version', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/SentencifyAI/)).toBeInTheDocument();
      expect(screen.getByText(/PROTÓTIPO/)).toBeInTheDocument();
    });
  });
});

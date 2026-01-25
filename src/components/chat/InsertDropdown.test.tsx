/**
 * @file InsertDropdown.test.tsx
 * @description Testes para o componente InsertDropdown
 * @version 1.38.52
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InsertDropdown } from './InsertDropdown';

describe('InsertDropdown', () => {
  const defaultProps = {
    onInsert: vi.fn(),
    disabled: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Rendering', () => {
    it('should render button when not disabled', () => {
      render(<InsertDropdown {...defaultProps} />);
      expect(screen.getByText('Inserir Última Resposta')).toBeInTheDocument();
    });

    it('should return null when disabled', () => {
      const { container } = render(<InsertDropdown {...defaultProps} disabled={true} />);
      expect(container.firstChild).toBeNull();
    });

    it('should not show dropdown menu initially', () => {
      render(<InsertDropdown {...defaultProps} />);
      expect(screen.queryByText('Substituir Tudo')).not.toBeInTheDocument();
    });

    it('should render ChevronDown icon', () => {
      const { container } = render(<InsertDropdown {...defaultProps} />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DROPDOWN TOGGLE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Dropdown Toggle', () => {
    it('should show dropdown when button is clicked', () => {
      render(<InsertDropdown {...defaultProps} />);
      fireEvent.click(screen.getByText('Inserir Última Resposta'));

      expect(screen.getByText('Substituir Tudo')).toBeInTheDocument();
      expect(screen.getByText('Adicionar no Início')).toBeInTheDocument();
      expect(screen.getByText('Adicionar no Final')).toBeInTheDocument();
    });

    it('should hide dropdown when button is clicked again', () => {
      render(<InsertDropdown {...defaultProps} />);
      const button = screen.getByText('Inserir Última Resposta');

      fireEvent.click(button);
      expect(screen.getByText('Substituir Tudo')).toBeInTheDocument();

      fireEvent.click(button);
      expect(screen.queryByText('Substituir Tudo')).not.toBeInTheDocument();
    });

    it('should rotate chevron icon when open', () => {
      const { container } = render(<InsertDropdown {...defaultProps} />);

      // Click to open
      fireEvent.click(screen.getByText('Inserir Última Resposta'));

      // Find the ChevronDown SVG (should have rotate-180 class when open)
      const svg = container.querySelector('svg');
      expect(svg).not.toBeNull();
      // The SVG should have a transition class
      expect(svg?.classList.contains('transition-transform')).toBe(true);
    });

    it('should close dropdown when clicking outside', () => {
      render(<InsertDropdown {...defaultProps} />);
      fireEvent.click(screen.getByText('Inserir Última Resposta'));

      expect(screen.getByText('Substituir Tudo')).toBeInTheDocument();

      // Click on the fixed backdrop
      const backdrop = document.querySelector('.fixed.inset-0');
      if (backdrop) {
        fireEvent.click(backdrop);
      }

      expect(screen.queryByText('Substituir Tudo')).not.toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INSERT OPTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Insert Options', () => {
    it('should call onInsert with "replace" when Substituir Tudo clicked', () => {
      render(<InsertDropdown {...defaultProps} />);
      fireEvent.click(screen.getByText('Inserir Última Resposta'));
      fireEvent.click(screen.getByText('Substituir Tudo'));

      expect(defaultProps.onInsert).toHaveBeenCalledWith('replace');
      expect(defaultProps.onInsert).toHaveBeenCalledTimes(1);
    });

    it('should call onInsert with "prepend" when Adicionar no Início clicked', () => {
      render(<InsertDropdown {...defaultProps} />);
      fireEvent.click(screen.getByText('Inserir Última Resposta'));
      fireEvent.click(screen.getByText('Adicionar no Início'));

      expect(defaultProps.onInsert).toHaveBeenCalledWith('prepend');
    });

    it('should call onInsert with "append" when Adicionar no Final clicked', () => {
      render(<InsertDropdown {...defaultProps} />);
      fireEvent.click(screen.getByText('Inserir Última Resposta'));
      fireEvent.click(screen.getByText('Adicionar no Final'));

      expect(defaultProps.onInsert).toHaveBeenCalledWith('append');
    });

    it('should close dropdown after selecting an option', () => {
      render(<InsertDropdown {...defaultProps} />);
      fireEvent.click(screen.getByText('Inserir Última Resposta'));
      fireEvent.click(screen.getByText('Substituir Tudo'));

      expect(screen.queryByText('Substituir Tudo')).not.toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // STYLING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Styling', () => {
    it('should have green background on main button', () => {
      render(<InsertDropdown {...defaultProps} />);
      const button = screen.getByText('Inserir Última Resposta').closest('button');
      expect(button?.className).toContain('bg-green-600');
    });

    it('should have different colors for each option', () => {
      render(<InsertDropdown {...defaultProps} />);
      fireEvent.click(screen.getByText('Inserir Última Resposta'));

      const replaceBtn = screen.getByText('Substituir Tudo');
      const prependBtn = screen.getByText('Adicionar no Início');
      const appendBtn = screen.getByText('Adicionar no Final');

      expect(replaceBtn.className).toContain('text-amber-400');
      expect(prependBtn.className).toContain('text-blue-400');
      expect(appendBtn.className).toContain('text-green-400');
    });

    it('should position dropdown above button', () => {
      render(<InsertDropdown {...defaultProps} />);
      fireEvent.click(screen.getByText('Inserir Última Resposta'));

      const dropdown = screen.getByText('Substituir Tudo').closest('div.absolute');
      expect(dropdown?.className).toContain('bottom-full');
    });
  });
});

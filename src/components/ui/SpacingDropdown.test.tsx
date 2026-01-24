/**
 * @file SpacingDropdown.test.tsx
 * @description Testes para o componente SpacingDropdown
 * @version 1.37.57
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SpacingDropdown } from './SpacingDropdown';
import { SPACING_PRESETS } from '../../constants/presets';

describe('SpacingDropdown', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERING TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Rendering', () => {
    it('should render as select element', () => {
      render(<SpacingDropdown value="normal" onChange={mockOnChange} />);

      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should render all spacing presets from constants', () => {
      render(<SpacingDropdown value="normal" onChange={mockOnChange} />);

      Object.entries(SPACING_PRESETS).forEach(([_key, preset]) => {
        expect(screen.getByText(`${preset.icon} ${preset.label}`)).toBeInTheDocument();
      });
    });

    it('should render compact option', () => {
      render(<SpacingDropdown value="normal" onChange={mockOnChange} />);

      expect(screen.getByText('▼ Compacto')).toBeInTheDocument();
    });

    it('should render normal option', () => {
      render(<SpacingDropdown value="normal" onChange={mockOnChange} />);

      expect(screen.getByText('= Normal')).toBeInTheDocument();
    });

    it('should render comfortable option', () => {
      render(<SpacingDropdown value="normal" onChange={mockOnChange} />);

      expect(screen.getByText('≡ Confortável')).toBeInTheDocument();
    });

    it('should render wide option', () => {
      render(<SpacingDropdown value="normal" onChange={mockOnChange} />);

      expect(screen.getByText('☰ Amplo')).toBeInTheDocument();
    });

    it('should have default aria-label', () => {
      render(<SpacingDropdown value="normal" onChange={mockOnChange} />);

      expect(screen.getByLabelText('Espaçamento de parágrafo')).toBeInTheDocument();
    });

    it('should use custom aria-label when provided', () => {
      render(
        <SpacingDropdown value="normal" onChange={mockOnChange} ariaLabel="Custom Label" />
      );

      expect(screen.getByLabelText('Custom Label')).toBeInTheDocument();
    });

    it('should have title attribute', () => {
      render(<SpacingDropdown value="normal" onChange={mockOnChange} />);

      const select = screen.getByRole('combobox');
      expect(select.title).toBe('Espaçamento entre linhas e parágrafos');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // VALUE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Value Selection', () => {
    it('should show compact as selected value', () => {
      render(<SpacingDropdown value="compact" onChange={mockOnChange} />);

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('compact');
    });

    it('should show normal as selected value', () => {
      render(<SpacingDropdown value="normal" onChange={mockOnChange} />);

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('normal');
    });

    it('should show wide as selected value', () => {
      render(<SpacingDropdown value="wide" onChange={mockOnChange} />);

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('wide');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CHANGE HANDLER TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Change Handler', () => {
    it('should call onChange with compact when selected', () => {
      render(<SpacingDropdown value="normal" onChange={mockOnChange} />);

      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'compact' } });

      expect(mockOnChange).toHaveBeenCalledWith('compact');
    });

    it('should call onChange with normal when selected', () => {
      render(<SpacingDropdown value="compact" onChange={mockOnChange} />);

      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'normal' } });

      expect(mockOnChange).toHaveBeenCalledWith('normal');
    });

    it('should call onChange with wide when selected', () => {
      render(<SpacingDropdown value="normal" onChange={mockOnChange} />);

      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'wide' } });

      expect(mockOnChange).toHaveBeenCalledWith('wide');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // STRUCTURE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Structure', () => {
    it('should be wrapped in a relative div', () => {
      const { container } = render(<SpacingDropdown value="normal" onChange={mockOnChange} />);

      expect(container.firstChild).toHaveClass('relative');
    });

    it('should have correct number of options', () => {
      render(<SpacingDropdown value="normal" onChange={mockOnChange} />);

      const options = screen.getAllByRole('option');
      expect(options.length).toBe(Object.keys(SPACING_PRESETS).length);
    });
  });
});

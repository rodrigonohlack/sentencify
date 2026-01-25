/**
 * @file FontSizeDropdown.test.tsx
 * @description Testes para o componente FontSizeDropdown
 * @version 1.38.52
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FontSizeDropdown } from './FontSizeDropdown';

// Mock the presets
vi.mock('../../constants/presets', () => ({
  FONTSIZE_PRESETS: {
    small: { icon: '🔤', label: 'Pequeno' },
    normal: { icon: '📝', label: 'Normal' },
    large: { icon: '📰', label: 'Grande' },
  },
}));

describe('FontSizeDropdown', () => {
  const defaultProps = {
    value: 'normal' as 'small' | 'normal' | 'large',
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Rendering', () => {
    it('should render select element', () => {
      render(<FontSizeDropdown {...defaultProps} />);
      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
    });

    it('should render all size options', () => {
      render(<FontSizeDropdown {...defaultProps} />);

      expect(screen.getByText(/Pequeno/)).toBeInTheDocument();
      expect(screen.getByText(/Normal/)).toBeInTheDocument();
      expect(screen.getByText(/Grande/)).toBeInTheDocument();
    });

    it('should render option icons', () => {
      render(<FontSizeDropdown {...defaultProps} />);

      expect(screen.getByText(/🔤/)).toBeInTheDocument();
      expect(screen.getByText(/📝/)).toBeInTheDocument();
      expect(screen.getByText(/📰/)).toBeInTheDocument();
    });

    it('should have correct initial value', () => {
      render(<FontSizeDropdown {...defaultProps} value="large" />);
      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('large');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INTERACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Interactions', () => {
    it('should call onChange when value changes to small', () => {
      render(<FontSizeDropdown {...defaultProps} />);
      const select = screen.getByRole('combobox');

      fireEvent.change(select, { target: { value: 'small' } });
      expect(defaultProps.onChange).toHaveBeenCalledWith('small');
    });

    it('should call onChange when value changes to large', () => {
      render(<FontSizeDropdown {...defaultProps} />);
      const select = screen.getByRole('combobox');

      fireEvent.change(select, { target: { value: 'large' } });
      expect(defaultProps.onChange).toHaveBeenCalledWith('large');
    });

    it('should call onChange when value changes to normal', () => {
      render(<FontSizeDropdown {...defaultProps} value="small" />);
      const select = screen.getByRole('combobox');

      fireEvent.change(select, { target: { value: 'normal' } });
      expect(defaultProps.onChange).toHaveBeenCalledWith('normal');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ACCESSIBILITY
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Accessibility', () => {
    it('should have default aria-label', () => {
      render(<FontSizeDropdown {...defaultProps} />);
      const select = screen.getByRole('combobox');
      expect(select).toHaveAttribute('aria-label', 'Tamanho da fonte');
    });

    it('should accept custom aria-label', () => {
      render(<FontSizeDropdown {...defaultProps} ariaLabel="Custom label" />);
      const select = screen.getByRole('combobox');
      expect(select).toHaveAttribute('aria-label', 'Custom label');
    });

    it('should have title attribute', () => {
      render(<FontSizeDropdown {...defaultProps} />);
      const select = screen.getByRole('combobox');
      expect(select).toHaveAttribute('title', 'Tamanho da fonte do editor');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // STYLING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Styling', () => {
    it('should have theme classes', () => {
      render(<FontSizeDropdown {...defaultProps} />);
      const select = screen.getByRole('combobox');

      expect(select.className).toContain('theme-bg-secondary');
      expect(select.className).toContain('theme-text-primary');
      expect(select.className).toContain('theme-border-input');
    });

    it('should have hover transition classes', () => {
      render(<FontSizeDropdown {...defaultProps} />);
      const select = screen.getByRole('combobox');

      expect(select.className).toContain('transition-colors');
    });

    it('should have cursor-pointer', () => {
      render(<FontSizeDropdown {...defaultProps} />);
      const select = screen.getByRole('combobox');

      expect(select.className).toContain('cursor-pointer');
    });

    it('should have rounded border', () => {
      render(<FontSizeDropdown {...defaultProps} />);
      const select = screen.getByRole('combobox');

      expect(select.className).toContain('rounded');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // OPTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Options', () => {
    it('should have 3 options', () => {
      render(<FontSizeDropdown {...defaultProps} />);
      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(3);
    });

    it('should have correct values for options', () => {
      render(<FontSizeDropdown {...defaultProps} />);
      const options = screen.getAllByRole('option');

      expect((options[0] as HTMLOptionElement).value).toBe('small');
      expect((options[1] as HTMLOptionElement).value).toBe('normal');
      expect((options[2] as HTMLOptionElement).value).toBe('large');
    });

    it('should apply theme classes to options', () => {
      render(<FontSizeDropdown {...defaultProps} />);
      const options = screen.getAllByRole('option');

      options.forEach((option) => {
        expect(option.className).toContain('theme-bg-secondary');
        expect(option.className).toContain('theme-text-primary');
      });
    });
  });
});

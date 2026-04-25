/**
 * @file ProcessingModeSelector.test.tsx
 * @description Testes para o componente ProcessingModeSelector
 * @version 1.37.57
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProcessingModeSelector } from './ProcessingModeSelector';
import type { ProcessingMode } from '../../types';

describe('ProcessingModeSelector', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERING TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Rendering', () => {
    it('should render all processing modes', () => {
      render(<ProcessingModeSelector value="pdfjs" onChange={mockOnChange} />);

      expect(screen.getByText('PDF.js (Texto)')).toBeInTheDocument();
      expect(screen.getByText('Gemini Vision (API)')).toBeInTheDocument();
      expect(screen.getByText('Claude Vision (API)')).toBeInTheDocument();
      expect(screen.getByText('Tesseract OCR (Offline)')).toBeInTheDocument();
      expect(screen.getByText('PDF Puro (binário)')).toBeInTheDocument();
    });

    it('should render as select element', () => {
      render(<ProcessingModeSelector value="pdfjs" onChange={mockOnChange} />);

      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <ProcessingModeSelector value="pdfjs" onChange={mockOnChange} className="custom-class" />
      );

      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });

    it('should be disabled when disabled prop is true', () => {
      render(<ProcessingModeSelector value="pdfjs" onChange={mockOnChange} disabled={true} />);

      expect(screen.getByRole('combobox')).toBeDisabled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // VALUE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Value Selection', () => {
    it('should show pdfjs as selected value', () => {
      render(<ProcessingModeSelector value="pdfjs" onChange={mockOnChange} />);

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('pdfjs');
    });

    it('should show tesseract as selected value', () => {
      render(<ProcessingModeSelector value="tesseract" onChange={mockOnChange} />);

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('tesseract');
    });

    it('should show claude-vision as selected value', () => {
      render(<ProcessingModeSelector value="claude-vision" onChange={mockOnChange} />);

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('claude-vision');
    });

    it('should show gemini-vision as selected value', () => {
      render(<ProcessingModeSelector value="gemini-vision" onChange={mockOnChange} />);

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('gemini-vision');
    });

    it('should show pdf-puro as selected value', () => {
      render(<ProcessingModeSelector value="pdf-puro" onChange={mockOnChange} />);

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('pdf-puro');
    });

    it('should call onChange when selection changes', () => {
      render(<ProcessingModeSelector value="pdfjs" onChange={mockOnChange} />);

      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'tesseract' } });

      expect(mockOnChange).toHaveBeenCalledWith('tesseract');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ANONYMIZATION MODE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Anonymization Mode', () => {
    it('should block pdf-puro when anonymization is enabled', () => {
      render(
        <ProcessingModeSelector value="pdfjs" onChange={mockOnChange} anonymizationEnabled={true} />
      );

      expect(screen.getByText('🔒 PDF Binário (anonimização)')).toBeInTheDocument();
    });

    it('should block claude-vision when anonymization is enabled', () => {
      render(
        <ProcessingModeSelector value="pdfjs" onChange={mockOnChange} anonymizationEnabled={true} />
      );

      expect(screen.getByText('🔒 Claude Vision')).toBeInTheDocument();
    });

    it('should block gemini-vision when anonymization is enabled', () => {
      render(
        <ProcessingModeSelector value="pdfjs" onChange={mockOnChange} anonymizationEnabled={true} />
      );

      expect(screen.getByText('🔒 Gemini Vision')).toBeInTheDocument();
    });

    it('should fallback to pdfjs when gemini-vision is blocked by anonymization', () => {
      render(
        <ProcessingModeSelector value="gemini-vision" onChange={mockOnChange} anonymizationEnabled={true} />
      );

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('pdfjs');
    });

    it('should fallback to pdfjs when pdf-puro is blocked by anonymization', () => {
      render(
        <ProcessingModeSelector value="pdf-puro" onChange={mockOnChange} anonymizationEnabled={true} />
      );

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('pdfjs');
    });

    it('should show anonymization tooltip when enabled', () => {
      render(
        <ProcessingModeSelector value="pdfjs" onChange={mockOnChange} anonymizationEnabled={true} />
      );

      const select = screen.getByRole('combobox');
      expect(select.title).toBe('Anonimização ativa: modos binários bloqueados');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // BINARY PDF BLOCKED TESTS (Grok / DeepSeek)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Binary PDF Blocked - Grok', () => {
    it('should block pdf-puro when Grok blocks binary PDFs', () => {
      render(
        <ProcessingModeSelector value="pdfjs" onChange={mockOnChange} binaryPdfBlocked={true} blockReason="grok" />
      );

      expect(screen.getByText('🔒 PDF Binário (Grok)')).toBeInTheDocument();
    });

    it('should NOT block claude-vision when only binary is blocked', () => {
      render(
        <ProcessingModeSelector value="pdfjs" onChange={mockOnChange} binaryPdfBlocked={true} blockReason="grok" />
      );

      expect(screen.getByText('Claude Vision (API)')).toBeInTheDocument();
    });

    it('should fallback to pdfjs when pdf-puro is blocked by Grok', () => {
      render(
        <ProcessingModeSelector value="pdf-puro" onChange={mockOnChange} binaryPdfBlocked={true} blockReason="grok" />
      );

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('pdfjs');
    });

    it('should show Grok tooltip when blocked by Grok', () => {
      render(
        <ProcessingModeSelector value="pdfjs" onChange={mockOnChange} binaryPdfBlocked={true} blockReason="grok" />
      );

      const select = screen.getByRole('combobox');
      expect(select.title).toBe('Grok não suporta PDF binário');
    });
  });

  describe('Gemini Vision availability', () => {
    it('should NOT block gemini-vision when binaryPdfBlocked by DeepSeek (OCR independente do provider)', () => {
      render(
        <ProcessingModeSelector value="gemini-vision" onChange={mockOnChange} binaryPdfBlocked={true} blockReason="deepseek" />
      );

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('gemini-vision');
      expect(screen.getByText('Gemini Vision (API)')).toBeInTheDocument();
    });

    it('should NOT block gemini-vision when binaryPdfBlocked by Grok', () => {
      render(
        <ProcessingModeSelector value="gemini-vision" onChange={mockOnChange} binaryPdfBlocked={true} blockReason="grok" />
      );

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('gemini-vision');
    });
  });

  describe('Binary PDF Blocked - DeepSeek', () => {
    it('should block pdf-puro when DeepSeek blocks binary PDFs', () => {
      render(
        <ProcessingModeSelector value="pdfjs" onChange={mockOnChange} binaryPdfBlocked={true} blockReason="deepseek" />
      );

      expect(screen.getByText('🔒 PDF Binário (DeepSeek)')).toBeInTheDocument();
    });

    it('should fallback to pdfjs when pdf-puro is blocked by DeepSeek', () => {
      render(
        <ProcessingModeSelector value="pdf-puro" onChange={mockOnChange} binaryPdfBlocked={true} blockReason="deepseek" />
      );

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('pdfjs');
    });

    it('should show DeepSeek tooltip when blocked by DeepSeek', () => {
      render(
        <ProcessingModeSelector value="pdfjs" onChange={mockOnChange} binaryPdfBlocked={true} blockReason="deepseek" />
      );

      const select = screen.getByRole('combobox');
      expect(select.title).toBe('DeepSeek não suporta PDF binário (text-only em abr/2026)');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // COMBINED BLOCKING TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Combined Blocking', () => {
    it('should prioritize anonymization label over binary block when both enabled', () => {
      render(
        <ProcessingModeSelector
          value="pdfjs"
          onChange={mockOnChange}
          anonymizationEnabled={true}
          binaryPdfBlocked={true}
          blockReason="grok"
        />
      );

      // Should show anonymization label (it takes priority)
      expect(screen.getByText('🔒 PDF Binário (anonimização)')).toBeInTheDocument();
    });

    it('should fallback to pdfjs when value is blocked', () => {
      render(
        <ProcessingModeSelector
          value="claude-vision"
          onChange={mockOnChange}
          anonymizationEnabled={true}
        />
      );

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('pdfjs');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EVENT PROPAGATION TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Event Propagation', () => {
    it('should stop click propagation', () => {
      const parentClick = vi.fn();
      const { container: _container } = render(
        <div onClick={parentClick}>
          <ProcessingModeSelector value="pdfjs" onChange={mockOnChange} />
        </div>
      );

      const select = screen.getByRole('combobox');
      fireEvent.click(select);

      // Parent click should not be called
      expect(parentClick).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DEFAULT VALUES TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Default Values', () => {
    it('should default to pdfjs when value is empty', () => {
      render(<ProcessingModeSelector value={'' as ProcessingMode} onChange={mockOnChange} />);

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('pdfjs');
    });

    it('should have no tooltip by default', () => {
      render(<ProcessingModeSelector value="pdfjs" onChange={mockOnChange} />);

      const select = screen.getByRole('combobox');
      expect(select.title).toBe('');
    });
  });
});

/**
 * @file JurisprudenciaCard.test.tsx
 * @description Testes para o componente JurisprudenciaCard
 * @version 1.38.49
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { JurisprudenciaCard } from './JurisprudenciaCard';
import type { Precedente } from '../../types';

// ═══════════════════════════════════════════════════════════════════════════
// MOCKS
// ═══════════════════════════════════════════════════════════════════════════

vi.mock('../../utils/jurisprudencia', () => ({
  isStatusValido: vi.fn((status: string) => {
    const validos = ['vigente', 'ativo', 'válido', 'em_vigor'];
    return validos.includes(status?.toLowerCase());
  }),
}));

describe('JurisprudenciaCard', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  const createMockPrecedente = (overrides: Partial<Precedente> = {}): Precedente => ({
    id: 'prec-1',
    tipo: 'Súmula',
    numero: '331',
    texto: 'Texto da súmula sobre terceirização lícita e ilícita.',
    tipoProcesso: 'Súmula',
    tese: 'A contratação de trabalhadores por empresa interposta é ilegal.',
    ...overrides,
  });

  const defaultProps = {
    precedente: createMockPrecedente(),
    onCopy: vi.fn(),
    expanded: false,
    onToggleExpand: vi.fn(),
    copiedId: null as string | null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERING TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Rendering', () => {
    it('should render tipoProcesso badge', () => {
      render(<JurisprudenciaCard {...defaultProps} />);
      expect(screen.getByText('Súmula')).toBeInTheDocument();
    });

    it('should render the tese text (truncated if > 200 chars)', () => {
      const shortTese = 'Texto curto da tese.';
      const precedente = createMockPrecedente({ tese: shortTese });
      render(<JurisprudenciaCard {...defaultProps} precedente={precedente} />);
      expect(screen.getByText(shortTese)).toBeInTheDocument();
    });

    it('should truncate long tese text when collapsed', () => {
      const longTese = 'A'.repeat(250);
      const precedente = createMockPrecedente({ tese: longTese });
      render(<JurisprudenciaCard {...defaultProps} precedente={precedente} expanded={false} />);
      // Should show truncated with ellipsis
      expect(screen.getByText(longTese.slice(0, 200) + '...')).toBeInTheDocument();
    });

    it('should show full text when expanded', () => {
      const longTese = 'A'.repeat(250);
      const precedente = createMockPrecedente({ tese: longTese });
      render(<JurisprudenciaCard {...defaultProps} precedente={precedente} expanded={true} />);
      expect(screen.getByText(longTese)).toBeInTheDocument();
    });

    it('should render titulo when available', () => {
      const precedente = createMockPrecedente({ titulo: 'Título do Precedente' });
      render(<JurisprudenciaCard {...defaultProps} precedente={precedente} />);
      expect(screen.getByText('Título do Precedente')).toBeInTheDocument();
    });

    it('should render numeroProcesso when available', () => {
      const precedente = createMockPrecedente({ numeroProcesso: 'TST-RR-1234-56.2020.5.01.0001' });
      render(<JurisprudenciaCard {...defaultProps} precedente={precedente} />);
      expect(screen.getByText('TST-RR-1234-56.2020.5.01.0001')).toBeInTheDocument();
    });

    it('should render relator when available', () => {
      const precedente = createMockPrecedente({ relator: 'Min. Fulano' });
      render(<JurisprudenciaCard {...defaultProps} precedente={precedente} />);
      expect(screen.getByText(/Rel: Min. Fulano/)).toBeInTheDocument();
    });

    it('should render dataJulgamento when available', () => {
      const precedente = createMockPrecedente({ dataJulgamento: '15/03/2023' });
      render(<JurisprudenciaCard {...defaultProps} precedente={precedente} />);
      expect(screen.getByText(/15\/03\/2023/)).toBeInTheDocument();
    });

    it('should render tribunal badge when available', () => {
      const precedente = createMockPrecedente({ tribunal: 'TST' });
      render(<JurisprudenciaCard {...defaultProps} precedente={precedente} />);
      expect(screen.getByText('TST')).toBeInTheDocument();
    });

    it('should render orgao badge when available', () => {
      const precedente = createMockPrecedente({ orgao: 'SDI-1' });
      render(<JurisprudenciaCard {...defaultProps} precedente={precedente} />);
      expect(screen.getByText('SDI-1')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // IDENTIFICADOR
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Identificador', () => {
    it('should show tema number when available', () => {
      const precedente = createMockPrecedente({ tema: '1046' });
      render(<JurisprudenciaCard {...defaultProps} precedente={precedente} />);
      expect(screen.getByText(/Tema 1046/)).toBeInTheDocument();
    });

    it('should show numero for Súmula type when no tema', () => {
      const precedente = createMockPrecedente({ tipoProcesso: 'Súmula', numero: '331', tema: undefined });
      render(<JurisprudenciaCard {...defaultProps} precedente={precedente} />);
      expect(screen.getByText(/nº 331/)).toBeInTheDocument();
    });

    it('should show numero for OJ type when no tema', () => {
      const precedente = createMockPrecedente({ tipoProcesso: 'OJ', numero: '394', tema: undefined });
      render(<JurisprudenciaCard {...defaultProps} precedente={precedente} />);
      expect(screen.getByText(/nº 394/)).toBeInTheDocument();
    });

    it('should NOT show numero for other process types without tema', () => {
      const precedente = createMockPrecedente({ tipoProcesso: 'IRDR', numero: '5', tema: undefined });
      render(<JurisprudenciaCard {...defaultProps} precedente={precedente} />);
      expect(screen.queryByText(/nº 5/)).not.toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // STATUS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Status', () => {
    it('should render valid status with check mark', () => {
      const precedente = createMockPrecedente({ status: 'vigente' });
      render(<JurisprudenciaCard {...defaultProps} precedente={precedente} />);
      expect(screen.getByText(/vigente/)).toBeInTheDocument();
    });

    it('should render invalid status with X mark', () => {
      const precedente = createMockPrecedente({ status: 'cancelada' });
      render(<JurisprudenciaCard {...defaultProps} precedente={precedente} />);
      expect(screen.getByText(/cancelada/)).toBeInTheDocument();
    });

    it('should not render status badge when status is undefined', () => {
      const precedente = createMockPrecedente({ status: undefined });
      render(<JurisprudenciaCard {...defaultProps} precedente={precedente} />);
      // No status badge should be rendered
      expect(screen.queryByText('✓')).not.toBeInTheDocument();
      expect(screen.queryByText('✗')).not.toBeInTheDocument();
    });

    it('should replace underscores with spaces in status', () => {
      const precedente = createMockPrecedente({ status: 'em_vigor' });
      render(<JurisprudenciaCard {...defaultProps} precedente={precedente} />);
      expect(screen.getByText(/em vigor/)).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // COPY FUNCTIONALITY
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Copy', () => {
    it('should render copy button with "Copiar tese" title', () => {
      render(<JurisprudenciaCard {...defaultProps} />);
      expect(screen.getByTitle('Copiar tese')).toBeInTheDocument();
    });

    it('should call onCopy with precedente when copy button is clicked', () => {
      const precedente = createMockPrecedente();
      render(<JurisprudenciaCard {...defaultProps} precedente={precedente} />);
      fireEvent.click(screen.getByTitle('Copiar tese'));
      expect(defaultProps.onCopy).toHaveBeenCalledWith(precedente);
    });

    it('should show "Copiado!" title when copiedId matches', () => {
      render(<JurisprudenciaCard {...defaultProps} copiedId="prec-1" />);
      expect(screen.getByTitle('Copiado!')).toBeInTheDocument();
    });

    it('should show "Copiar tese" title when copiedId does not match', () => {
      render(<JurisprudenciaCard {...defaultProps} copiedId="other-id" />);
      expect(screen.getByTitle('Copiar tese')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EXPAND/COLLAPSE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Expand/Collapse', () => {
    it('should show Expandir button when text > 200 chars', () => {
      const longTese = 'A'.repeat(250);
      const precedente = createMockPrecedente({ tese: longTese });
      render(<JurisprudenciaCard {...defaultProps} precedente={precedente} />);
      expect(screen.getByText('Expandir')).toBeInTheDocument();
    });

    it('should show Recolher button when expanded and text > 200 chars', () => {
      const longTese = 'A'.repeat(250);
      const precedente = createMockPrecedente({ tese: longTese });
      render(<JurisprudenciaCard {...defaultProps} precedente={precedente} expanded={true} />);
      expect(screen.getByText('Recolher')).toBeInTheDocument();
    });

    it('should NOT show expand/collapse when text <= 200 chars', () => {
      const shortTese = 'Short text';
      const precedente = createMockPrecedente({ tese: shortTese });
      render(<JurisprudenciaCard {...defaultProps} precedente={precedente} />);
      expect(screen.queryByText('Expandir')).not.toBeInTheDocument();
      expect(screen.queryByText('Recolher')).not.toBeInTheDocument();
    });

    it('should call onToggleExpand with precedente.id on click', () => {
      const longTese = 'A'.repeat(250);
      const precedente = createMockPrecedente({ tese: longTese });
      render(<JurisprudenciaCard {...defaultProps} precedente={precedente} />);
      fireEvent.click(screen.getByText('Expandir'));
      expect(defaultProps.onToggleExpand).toHaveBeenCalledWith('prec-1');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEXT FALLBACK
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Text Fallback', () => {
    it('should use tese as primary text source', () => {
      const precedente = createMockPrecedente({ tese: 'Tese principal' });
      render(<JurisprudenciaCard {...defaultProps} precedente={precedente} />);
      expect(screen.getByText('Tese principal')).toBeInTheDocument();
    });

    it('should fallback to enunciado when tese is empty', () => {
      const precedente = createMockPrecedente({ tese: '', enunciado: 'Enunciado text' });
      render(<JurisprudenciaCard {...defaultProps} precedente={precedente} />);
      expect(screen.getByText('Enunciado text')).toBeInTheDocument();
    });

    it('should fallback to fullText when tese and enunciado are empty', () => {
      const precedente = createMockPrecedente({ tese: '', enunciado: undefined, fullText: 'Full text content' });
      render(<JurisprudenciaCard {...defaultProps} precedente={precedente} />);
      expect(screen.getByText('Full text content')).toBeInTheDocument();
    });

    it('should fallback to texto when all others are empty', () => {
      const precedente = createMockPrecedente({ tese: '', enunciado: undefined, fullText: undefined, texto: 'Fallback texto' });
      render(<JurisprudenciaCard {...defaultProps} precedente={precedente} />);
      expect(screen.getByText('Fallback texto')).toBeInTheDocument();
    });
  });
});

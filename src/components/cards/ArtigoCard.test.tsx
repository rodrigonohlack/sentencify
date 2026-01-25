/**
 * @file ArtigoCard.test.tsx
 * @description Testes para o componente ArtigoCard
 * @version 1.38.49
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ArtigoCard } from './ArtigoCard';
import type { Artigo } from '../../types';

// ═══════════════════════════════════════════════════════════════════════════
// MOCKS
// ═══════════════════════════════════════════════════════════════════════════

vi.mock('../../hooks', () => ({
  getLeiFromId: vi.fn((id: string) => {
    if (id.startsWith('clt')) return { nome: 'CLT', sigla: 'CLT' };
    if (id.startsWith('cf')) return { nome: 'CF/88', sigla: 'CF' };
    return { nome: 'Lei Desconhecida', sigla: 'LD' };
  }),
}));

describe('ArtigoCard', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  const createMockArtigo = (overrides: Partial<Artigo> = {}): Artigo => ({
    id: 'clt-art-7',
    lei: 'CLT',
    numero: '7',
    texto: 'Texto do artigo 7',
    caput: 'Os direitos dos trabalhadores urbanos e rurais...',
    ...overrides,
  });

  const defaultProps = {
    artigo: createMockArtigo(),
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
    it('should render the law name badge', () => {
      render(<ArtigoCard {...defaultProps} />);
      expect(screen.getByText('CLT')).toBeInTheDocument();
    });

    it('should render the article number', () => {
      render(<ArtigoCard {...defaultProps} />);
      expect(screen.getByText('Art. 7')).toBeInTheDocument();
    });

    it('should render the caput text', () => {
      render(<ArtigoCard {...defaultProps} />);
      expect(screen.getByText('Os direitos dos trabalhadores urbanos e rurais...')).toBeInTheDocument();
    });

    it('should render "Revogado" badge when status is revogado', () => {
      const artigo = createMockArtigo({ status: 'revogado' });
      render(<ArtigoCard {...defaultProps} artigo={artigo} />);
      expect(screen.getByText('Revogado')).toBeInTheDocument();
    });

    it('should NOT render "Revogado" badge when status is not revogado', () => {
      const artigo = createMockArtigo({ status: 'vigente' });
      render(<ArtigoCard {...defaultProps} artigo={artigo} />);
      expect(screen.queryByText('Revogado')).not.toBeInTheDocument();
    });

    it('should render CF/88 badge for CF articles', () => {
      const artigo = createMockArtigo({ id: 'cf-art-5' });
      render(<ArtigoCard {...defaultProps} artigo={artigo} />);
      expect(screen.getByText('CF/88')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // COPY FUNCTIONALITY
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Copy', () => {
    it('should render copy button with correct title', () => {
      render(<ArtigoCard {...defaultProps} />);
      expect(screen.getByTitle('Copiar artigo')).toBeInTheDocument();
    });

    it('should call onCopy with artigo when copy button is clicked', () => {
      const artigo = createMockArtigo();
      render(<ArtigoCard {...defaultProps} artigo={artigo} />);
      fireEvent.click(screen.getByTitle('Copiar artigo'));
      expect(defaultProps.onCopy).toHaveBeenCalledWith(artigo);
    });

    it('should show "Copiado!" title when copiedId matches artigo.id', () => {
      const artigo = createMockArtigo({ id: 'clt-art-7' });
      render(<ArtigoCard {...defaultProps} artigo={artigo} copiedId="clt-art-7" />);
      expect(screen.getByTitle('Copiado!')).toBeInTheDocument();
    });

    it('should show "Copiar artigo" title when copiedId does not match', () => {
      render(<ArtigoCard {...defaultProps} copiedId="other-id" />);
      expect(screen.getByTitle('Copiar artigo')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EXPAND/COLLAPSE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Expand/Collapse', () => {
    it('should show expand button when artigo has paragrafos', () => {
      const artigo = createMockArtigo({
        paragrafos: [{ numero: '1', texto: 'Parágrafo único' }],
      });
      render(<ArtigoCard {...defaultProps} artigo={artigo} />);
      expect(screen.getByTitle('Expandir')).toBeInTheDocument();
    });

    it('should show expand button when artigo has incisos', () => {
      const artigo = createMockArtigo({
        incisos: [{ numero: 'I', texto: 'Primeiro inciso' }],
      });
      render(<ArtigoCard {...defaultProps} artigo={artigo} />);
      expect(screen.getByTitle('Expandir')).toBeInTheDocument();
    });

    it('should show expand button when artigo has alineas', () => {
      const artigo = createMockArtigo({
        alineas: [{ letra: 'a', texto: 'Primeira alínea' }],
      });
      render(<ArtigoCard {...defaultProps} artigo={artigo} />);
      expect(screen.getByTitle('Expandir')).toBeInTheDocument();
    });

    it('should NOT show expand button when artigo has no details', () => {
      const artigo = createMockArtigo({ paragrafos: [], incisos: [], alineas: [] });
      render(<ArtigoCard {...defaultProps} artigo={artigo} />);
      expect(screen.queryByTitle('Expandir')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Recolher')).not.toBeInTheDocument();
    });

    it('should call onToggleExpand with artigo.id when expand button is clicked', () => {
      const artigo = createMockArtigo({
        paragrafos: [{ numero: '1', texto: 'Parágrafo' }],
      });
      render(<ArtigoCard {...defaultProps} artigo={artigo} />);
      fireEvent.click(screen.getByTitle('Expandir'));
      expect(defaultProps.onToggleExpand).toHaveBeenCalledWith(artigo.id);
    });

    it('should show "Recolher" title when expanded', () => {
      const artigo = createMockArtigo({
        paragrafos: [{ numero: '1', texto: 'Parágrafo' }],
      });
      render(<ArtigoCard {...defaultProps} artigo={artigo} expanded={true} />);
      expect(screen.getByTitle('Recolher')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EXPANDED CONTENT
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Expanded Content', () => {
    it('should show paragrafos when expanded', () => {
      const artigo = createMockArtigo({
        paragrafos: [
          { numero: '1', texto: 'Texto do parágrafo 1' },
          { numero: '2', texto: 'Texto do parágrafo 2' },
        ],
      });
      render(<ArtigoCard {...defaultProps} artigo={artigo} expanded={true} />);
      expect(screen.getByText('Parágrafos:')).toBeInTheDocument();
      expect(screen.getByText('Texto do parágrafo 1')).toBeInTheDocument();
      expect(screen.getByText('Texto do parágrafo 2')).toBeInTheDocument();
    });

    it('should show incisos when expanded', () => {
      const artigo = createMockArtigo({
        incisos: [
          { numero: 'I', texto: 'Primeiro inciso' },
          { numero: 'II', texto: 'Segundo inciso' },
        ],
      });
      render(<ArtigoCard {...defaultProps} artigo={artigo} expanded={true} />);
      expect(screen.getByText('Incisos:')).toBeInTheDocument();
      expect(screen.getByText(/Primeiro inciso/)).toBeInTheDocument();
      expect(screen.getByText(/Segundo inciso/)).toBeInTheDocument();
    });

    it('should show alineas when expanded', () => {
      const artigo = createMockArtigo({
        alineas: [
          { letra: 'a', texto: 'Primeira alínea' },
          { letra: 'b', texto: 'Segunda alínea' },
        ],
      });
      render(<ArtigoCard {...defaultProps} artigo={artigo} expanded={true} />);
      expect(screen.getByText('Alíneas:')).toBeInTheDocument();
      expect(screen.getByText(/Primeira alínea/)).toBeInTheDocument();
      expect(screen.getByText(/Segunda alínea/)).toBeInTheDocument();
    });

    it('should NOT show expanded content when collapsed', () => {
      const artigo = createMockArtigo({
        paragrafos: [{ numero: '1', texto: 'Texto do parágrafo' }],
      });
      render(<ArtigoCard {...defaultProps} artigo={artigo} expanded={false} />);
      expect(screen.queryByText('Parágrafos:')).not.toBeInTheDocument();
    });

    it('should render paragraph numbers with correct format', () => {
      const artigo = createMockArtigo({
        paragrafos: [{ numero: '1', texto: 'Texto' }],
      });
      render(<ArtigoCard {...defaultProps} artigo={artigo} expanded={true} />);
      expect(screen.getByText('§ 1º')).toBeInTheDocument();
    });

    it('should render inciso numbers', () => {
      const artigo = createMockArtigo({
        incisos: [{ numero: 'III', texto: 'Terceiro inciso' }],
      });
      render(<ArtigoCard {...defaultProps} artigo={artigo} expanded={true} />);
      expect(screen.getByText('III')).toBeInTheDocument();
    });

    it('should render alinea letters with closing parenthesis', () => {
      const artigo = createMockArtigo({
        alineas: [{ letra: 'c', texto: 'Terceira alínea' }],
      });
      render(<ArtigoCard {...defaultProps} artigo={artigo} expanded={true} />);
      expect(screen.getByText('c)')).toBeInTheDocument();
    });
  });
});

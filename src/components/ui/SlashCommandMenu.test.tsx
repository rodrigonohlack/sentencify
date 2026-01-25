/**
 * @file SlashCommandMenu.test.tsx
 * @description Testes para o componente SlashCommandMenu
 * @version 1.38.49
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SlashCommandMenu } from './SlashCommandMenu';
import type { Model } from '../../types';

// Mock scrollIntoView which is not available in JSDOM
Element.prototype.scrollIntoView = vi.fn();

describe('SlashCommandMenu', () => {
  const mockOnSelect = vi.fn();
  const mockOnClose = vi.fn();
  const mockOnSearchChange = vi.fn();
  const mockOnNavigate = vi.fn();

  const mockModels: Model[] = [
    { id: '1', title: 'Modelo Danos Morais', content: '<p>Conteudo modelo 1</p>', keywords: ['danos', 'morais'], category: 'Indenizacao' },
    { id: '2', title: 'Modelo Horas Extras', content: '<p>Conteudo modelo 2</p>', keywords: ['horas', 'extras'], category: 'Jornada' },
    { id: '3', title: 'Modelo Rescisao', content: '<p>Conteudo modelo 3</p>', keywords: ['rescisao'], category: 'Contrato' },
  ];

  const defaultProps = {
    isOpen: true,
    position: { top: 100, left: 200 },
    models: mockModels,
    searchTerm: '',
    selectedIndex: 0,
    onSelect: mockOnSelect,
    onClose: mockOnClose,
    onSearchChange: mockOnSearchChange,
    onNavigate: mockOnNavigate,
    semanticAvailable: false,
    searchModelsBySimilarity: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERING TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Rendering', () => {
    it('should render when isOpen is true', () => {
      render(<SlashCommandMenu {...defaultProps} />);

      expect(screen.getByPlaceholderText('Buscar modelo...')).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      render(<SlashCommandMenu {...defaultProps} isOpen={false} />);

      expect(screen.queryByPlaceholderText('Buscar modelo...')).not.toBeInTheDocument();
    });

    it('should render model titles', () => {
      render(<SlashCommandMenu {...defaultProps} />);

      expect(screen.getByText('Modelo Danos Morais')).toBeInTheDocument();
      expect(screen.getByText('Modelo Horas Extras')).toBeInTheDocument();
      expect(screen.getByText('Modelo Rescisao')).toBeInTheDocument();
    });

    it('should render model categories', () => {
      render(<SlashCommandMenu {...defaultProps} />);

      expect(screen.getByText('Indenizacao')).toBeInTheDocument();
      expect(screen.getByText('Jornada')).toBeInTheDocument();
      expect(screen.getByText('Contrato')).toBeInTheDocument();
    });

    it('should render navigation hints in footer', () => {
      render(<SlashCommandMenu {...defaultProps} />);

      // Footer text nodes include leading spaces, so use regex matching
      expect(screen.getByText(/navegar/)).toBeInTheDocument();
      expect(screen.getByText(/inserir/)).toBeInTheDocument();
      expect(screen.getByText(/fechar/)).toBeInTheDocument();
    });

    it('should render close button', () => {
      render(<SlashCommandMenu {...defaultProps} />);

      expect(screen.getByTitle('Fechar (Esc)')).toBeInTheDocument();
    });

    it('should display empty message when no models match', () => {
      render(<SlashCommandMenu {...defaultProps} models={[]} />);

      expect(screen.getByText('Nenhum modelo encontrado')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SEARCH TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Search', () => {
    it('should filter models by title', () => {
      render(<SlashCommandMenu {...defaultProps} searchTerm="danos" />);

      expect(screen.getByText('Modelo Danos Morais')).toBeInTheDocument();
      expect(screen.queryByText('Modelo Horas Extras')).not.toBeInTheDocument();
    });

    it('should filter models by keywords', () => {
      render(<SlashCommandMenu {...defaultProps} searchTerm="rescisao" />);

      expect(screen.getByText('Modelo Rescisao')).toBeInTheDocument();
      expect(screen.queryByText('Modelo Danos Morais')).not.toBeInTheDocument();
    });

    it('should show all models (up to 10) when searchTerm is empty', () => {
      render(<SlashCommandMenu {...defaultProps} searchTerm="" />);

      expect(screen.getByText('Modelo Danos Morais')).toBeInTheDocument();
      expect(screen.getByText('Modelo Horas Extras')).toBeInTheDocument();
      expect(screen.getByText('Modelo Rescisao')).toBeInTheDocument();
    });

    it('should call onSearchChange when typing in input', () => {
      render(<SlashCommandMenu {...defaultProps} />);

      const input = screen.getByPlaceholderText('Buscar modelo...');
      fireEvent.change(input, { target: { value: 'test' } });

      expect(mockOnSearchChange).toHaveBeenCalledWith('test');
    });

    it('should show empty message when no search results', () => {
      render(<SlashCommandMenu {...defaultProps} searchTerm="xyz_nao_existe" />);

      expect(screen.getByText('Nenhum modelo encontrado')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // KEYBOARD NAVIGATION TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Keyboard Navigation', () => {
    it('should call onNavigate with down when ArrowDown is pressed', () => {
      render(<SlashCommandMenu {...defaultProps} />);

      const input = screen.getByPlaceholderText('Buscar modelo...');
      fireEvent.keyDown(input, { key: 'ArrowDown' });

      expect(mockOnNavigate).toHaveBeenCalledWith('down', 3);
    });

    it('should call onNavigate with up when ArrowUp is pressed', () => {
      render(<SlashCommandMenu {...defaultProps} />);

      const input = screen.getByPlaceholderText('Buscar modelo...');
      fireEvent.keyDown(input, { key: 'ArrowUp' });

      expect(mockOnNavigate).toHaveBeenCalledWith('up', 3);
    });

    it('should call onSelect with selected model when Enter is pressed', () => {
      render(<SlashCommandMenu {...defaultProps} selectedIndex={1} />);

      const input = screen.getByPlaceholderText('Buscar modelo...');
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(mockOnSelect).toHaveBeenCalledWith(mockModels[1]);
    });

    it('should call onClose when Escape is pressed', () => {
      render(<SlashCommandMenu {...defaultProps} />);

      const input = screen.getByPlaceholderText('Buscar modelo...');
      fireEvent.keyDown(input, { key: 'Escape' });

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when Tab is pressed', () => {
      render(<SlashCommandMenu {...defaultProps} />);

      const input = screen.getByPlaceholderText('Buscar modelo...');
      fireEvent.keyDown(input, { key: 'Tab' });

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INTERACTION TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Interactions', () => {
    it('should call onSelect when clicking a model', () => {
      render(<SlashCommandMenu {...defaultProps} />);

      fireEvent.click(screen.getByText('Modelo Horas Extras'));

      expect(mockOnSelect).toHaveBeenCalledWith(mockModels[1]);
    });

    it('should call onClose when clicking close button', () => {
      render(<SlashCommandMenu {...defaultProps} />);

      fireEvent.click(screen.getByTitle('Fechar (Esc)'));

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should highlight selected item with appropriate class', () => {
      render(<SlashCommandMenu {...defaultProps} selectedIndex={0} />);

      const firstItem = screen.getByText('Modelo Danos Morais').closest('[class*="cursor-pointer"]');
      expect(firstItem?.className).toContain('bg-purple-600/30');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // POSITIONING TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Positioning', () => {
    it('should apply position style from props', () => {
      const { container } = render(<SlashCommandMenu {...defaultProps} position={{ top: 150, left: 250 }} />);

      const menu = container.querySelector('.slash-command-menu');
      expect(menu).toBeInTheDocument();
    });

    it('should have fixed positioning', () => {
      const { container } = render(<SlashCommandMenu {...defaultProps} />);

      const menu = container.querySelector('.slash-command-menu');
      expect(menu?.className).toContain('fixed');
    });

    it('should have z-index 100', () => {
      const { container } = render(<SlashCommandMenu {...defaultProps} />);

      const menu = container.querySelector('.slash-command-menu');
      expect(menu?.className).toContain('z-[100]');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SEMANTIC SEARCH TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Semantic Search', () => {
    it('should show semantic toggle button when semanticAvailable is true', () => {
      render(<SlashCommandMenu {...defaultProps} semanticAvailable={true} />);

      expect(screen.getByTitle('Busca textual (por palavras)')).toBeInTheDocument();
    });

    it('should not show semantic toggle when semanticAvailable is false', () => {
      render(<SlashCommandMenu {...defaultProps} semanticAvailable={false} />);

      expect(screen.queryByTitle('Busca textual (por palavras)')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Busca semantica (por significado)')).not.toBeInTheDocument();
    });

    it('should toggle to semantic search placeholder when semantic button is clicked', () => {
      render(<SlashCommandMenu {...defaultProps} semanticAvailable={true} />);

      const toggleBtn = screen.getByTitle('Busca textual (por palavras)');
      fireEvent.click(toggleBtn);

      expect(screen.getByPlaceholderText('Busca semantica...')).toBeInTheDocument();
    });

    it('should toggle back to textual search after clicking twice', () => {
      render(<SlashCommandMenu {...defaultProps} semanticAvailable={true} />);

      const toggleBtn = screen.getByTitle('Busca textual (por palavras)');
      fireEvent.click(toggleBtn);

      const semanticBtn = screen.getByTitle('Busca semantica (por significado)');
      fireEvent.click(semanticBtn);

      expect(screen.getByPlaceholderText('Buscar modelo...')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SIMILARITY BADGE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Similarity Badge', () => {
    it('should show similarity badge when model has similarity', () => {
      const modelsWithSimilarity: Model[] = [
        { id: '1', title: 'Modelo A', content: 'x', similarity: 0.85, category: 'Cat' },
      ];

      render(<SlashCommandMenu {...defaultProps} models={modelsWithSimilarity} />);

      expect(screen.getByText('85%')).toBeInTheDocument();
    });

    it('should apply green style for high similarity', () => {
      const modelsWithSimilarity: Model[] = [
        { id: '1', title: 'Modelo A', content: 'x', similarity: 0.75, category: 'Cat' },
      ];

      render(<SlashCommandMenu {...defaultProps} models={modelsWithSimilarity} />);

      const badge = screen.getByText('75%');
      expect(badge.className).toContain('bg-green-500/20');
    });

    it('should apply yellow style for medium similarity', () => {
      const modelsWithSimilarity: Model[] = [
        { id: '1', title: 'Modelo A', content: 'x', similarity: 0.55, category: 'Cat' },
      ];

      render(<SlashCommandMenu {...defaultProps} models={modelsWithSimilarity} />);

      const badge = screen.getByText('55%');
      expect(badge.className).toContain('bg-yellow-500/20');
    });

    it('should apply gray style for low similarity', () => {
      const modelsWithSimilarity: Model[] = [
        { id: '1', title: 'Modelo A', content: 'x', similarity: 0.35, category: 'Cat' },
      ];

      render(<SlashCommandMenu {...defaultProps} models={modelsWithSimilarity} />);

      const badge = screen.getByText('35%');
      expect(badge.className).toContain('bg-gray-500/20');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TOOLTIP / PREVIEW TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Tooltip Preview', () => {
    it('should show plain text preview in title attribute', () => {
      render(<SlashCommandMenu {...defaultProps} />);

      const firstItem = screen.getByText('Modelo Danos Morais').closest('[class*="cursor-pointer"]');
      expect(firstItem?.getAttribute('title')).toBe('Conteudo modelo 1');
    });

    it('should strip HTML from content for tooltip', () => {
      const modelsWithHtml: Model[] = [
        { id: '1', title: 'Modelo HTML', content: '<p><b>Texto</b> com <i>tags</i></p>', category: 'Test' },
      ];

      render(<SlashCommandMenu {...defaultProps} models={modelsWithHtml} />);

      const item = screen.getByText('Modelo HTML').closest('[class*="cursor-pointer"]');
      expect(item?.getAttribute('title')).toBe('Texto com tags');
    });

    it('should show "Sem conteudo" for empty content', () => {
      const modelsEmpty: Model[] = [
        { id: '1', title: 'Modelo Vazio', content: '', category: 'Test' },
      ];

      render(<SlashCommandMenu {...defaultProps} models={modelsEmpty} />);

      const item = screen.getByText('Modelo Vazio').closest('[class*="cursor-pointer"]');
      expect(item?.getAttribute('title')).toBe('Sem conteudo');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DISPLAY NAME TEST
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Component Metadata', () => {
    it('should have displayName set', () => {
      expect(SlashCommandMenu.displayName).toBe('SlashCommandMenu');
    });
  });
});

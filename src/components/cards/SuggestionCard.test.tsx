/**
 * @file SuggestionCard.test.tsx
 * @description Testes para o componente SuggestionCard
 * @version 1.37.57
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SuggestionCard } from './SuggestionCard';
import type { Model } from '../../types';

describe('SuggestionCard', () => {
  const mockOnPreview = vi.fn();
  const mockOnInsert = vi.fn();
  const mockSanitizeHTML = vi.fn((html: string) => html);

  const createMockModel = (overrides: Partial<Model> = {}): Model => ({
    id: 'model-1',
    title: 'Test Model',
    content: '<p>Model content for testing</p>',
    keywords: 'keyword1, keyword2',
    category: 'MÉRITO',
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERING TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Rendering', () => {
    it('should render model title', () => {
      const model = createMockModel({ title: 'My Model Title' });
      render(
        <SuggestionCard
          model={model}
          onPreview={mockOnPreview}
          onInsert={mockOnInsert}
          sanitizeHTML={mockSanitizeHTML}
        />
      );

      expect(screen.getByText('My Model Title')).toBeInTheDocument();
    });

    it('should render category badge', () => {
      const model = createMockModel({ category: 'PRELIMINAR' });
      render(
        <SuggestionCard
          model={model}
          onPreview={mockOnPreview}
          onInsert={mockOnInsert}
          sanitizeHTML={mockSanitizeHTML}
        />
      );

      expect(screen.getByText('PRELIMINAR')).toBeInTheDocument();
    });

    it('should render keywords', () => {
      const model = createMockModel({ keywords: 'horas extras, adicional noturno' });
      render(
        <SuggestionCard
          model={model}
          onPreview={mockOnPreview}
          onInsert={mockOnInsert}
          sanitizeHTML={mockSanitizeHTML}
        />
      );

      expect(screen.getByText(/horas extras, adicional noturno/)).toBeInTheDocument();
    });

    it('should render favorite star when model is favorite', () => {
      const model = createMockModel({ favorite: true });
      render(
        <SuggestionCard
          model={model}
          onPreview={mockOnPreview}
          onInsert={mockOnInsert}
          sanitizeHTML={mockSanitizeHTML}
        />
      );

      expect(screen.getByTitle('Modelo favorito')).toBeInTheDocument();
    });

    it('should NOT render favorite star when model is not favorite', () => {
      const model = createMockModel({ favorite: false });
      render(
        <SuggestionCard
          model={model}
          onPreview={mockOnPreview}
          onInsert={mockOnInsert}
          sanitizeHTML={mockSanitizeHTML}
        />
      );

      expect(screen.queryByTitle('Modelo favorito')).not.toBeInTheDocument();
    });

    it('should return null when model is undefined', () => {
      const { container } = render(
        <SuggestionCard
          model={undefined as any}
          onPreview={mockOnPreview}
          onInsert={mockOnInsert}
          sanitizeHTML={mockSanitizeHTML}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should render action buttons', () => {
      const model = createMockModel();
      render(
        <SuggestionCard
          model={model}
          onPreview={mockOnPreview}
          onInsert={mockOnInsert}
          sanitizeHTML={mockSanitizeHTML}
        />
      );

      expect(screen.getByText('Visualizar')).toBeInTheDocument();
      expect(screen.getByText('Inserir')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RANKING TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Ranking', () => {
    it('should show 5 stars for first place (index 0)', () => {
      const model = createMockModel();
      render(
        <SuggestionCard
          model={model}
          index={0}
          totalSuggestions={5}
          onPreview={mockOnPreview}
          onInsert={mockOnInsert}
          sanitizeHTML={mockSanitizeHTML}
          showRanking={true}
        />
      );

      expect(screen.getByText('⭐⭐⭐⭐⭐')).toBeInTheDocument();
      expect(screen.getByText('(Mais relevante)')).toBeInTheDocument();
    });

    it('should show 4 stars for second place (index 1)', () => {
      const model = createMockModel();
      render(
        <SuggestionCard
          model={model}
          index={1}
          totalSuggestions={5}
          onPreview={mockOnPreview}
          onInsert={mockOnInsert}
          sanitizeHTML={mockSanitizeHTML}
          showRanking={true}
        />
      );

      expect(screen.getByText('⭐⭐⭐⭐')).toBeInTheDocument();
      expect(screen.getByText('(2º lugar)')).toBeInTheDocument();
    });

    it('should show 3 stars for third place (index 2)', () => {
      const model = createMockModel();
      render(
        <SuggestionCard
          model={model}
          index={2}
          totalSuggestions={5}
          onPreview={mockOnPreview}
          onInsert={mockOnInsert}
          sanitizeHTML={mockSanitizeHTML}
          showRanking={true}
        />
      );

      expect(screen.getByText('⭐⭐⭐')).toBeInTheDocument();
      expect(screen.getByText('(3º lugar)')).toBeInTheDocument();
    });

    it('should hide ranking when showRanking is false', () => {
      const model = createMockModel();
      render(
        <SuggestionCard
          model={model}
          index={0}
          totalSuggestions={5}
          onPreview={mockOnPreview}
          onInsert={mockOnInsert}
          sanitizeHTML={mockSanitizeHTML}
          showRanking={false}
        />
      );

      expect(screen.queryByText(/⭐/)).not.toBeInTheDocument();
      expect(screen.queryByText('(Mais relevante)')).not.toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SIMILARITY TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Similarity Badge', () => {
    it('should show similarity percentage', () => {
      const model = createMockModel();
      render(
        <SuggestionCard
          model={model}
          onPreview={mockOnPreview}
          onInsert={mockOnInsert}
          sanitizeHTML={mockSanitizeHTML}
          similarity={0.85}
        />
      );

      expect(screen.getByText('85% similar')).toBeInTheDocument();
    });

    it('should round similarity percentage', () => {
      const model = createMockModel();
      render(
        <SuggestionCard
          model={model}
          onPreview={mockOnPreview}
          onInsert={mockOnInsert}
          sanitizeHTML={mockSanitizeHTML}
          similarity={0.876}
        />
      );

      expect(screen.getByText('88% similar')).toBeInTheDocument();
    });

    it('should NOT show similarity when undefined', () => {
      const model = createMockModel();
      render(
        <SuggestionCard
          model={model}
          onPreview={mockOnPreview}
          onInsert={mockOnInsert}
          sanitizeHTML={mockSanitizeHTML}
        />
      );

      expect(screen.queryByText(/similar/)).not.toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // BUTTON ACTION TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Button Actions', () => {
    it('should call onPreview with model when Visualizar clicked', () => {
      const model = createMockModel();
      render(
        <SuggestionCard
          model={model}
          onPreview={mockOnPreview}
          onInsert={mockOnInsert}
          sanitizeHTML={mockSanitizeHTML}
        />
      );

      fireEvent.click(screen.getByText('Visualizar'));

      expect(mockOnPreview).toHaveBeenCalledWith(model);
    });

    it('should call onInsert with content when Inserir clicked', () => {
      const model = createMockModel({ content: '<p>Content to insert</p>' });
      render(
        <SuggestionCard
          model={model}
          onPreview={mockOnPreview}
          onInsert={mockOnInsert}
          sanitizeHTML={mockSanitizeHTML}
        />
      );

      fireEvent.click(screen.getByText('Inserir'));

      expect(mockOnInsert).toHaveBeenCalledWith('<p>Content to insert</p>');
    });

    it('should have correct aria-labels', () => {
      const model = createMockModel({ title: 'My Model' });
      render(
        <SuggestionCard
          model={model}
          onPreview={mockOnPreview}
          onInsert={mockOnInsert}
          sanitizeHTML={mockSanitizeHTML}
        />
      );

      expect(screen.getByLabelText('Visualizar modelo My Model')).toBeInTheDocument();
      expect(screen.getByLabelText('Inserir modelo My Model no editor')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CONTENT PREVIEW TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Content Preview', () => {
    it('should sanitize content preview', () => {
      const model = createMockModel({ content: '<p>Preview content</p>' });
      render(
        <SuggestionCard
          model={model}
          onPreview={mockOnPreview}
          onInsert={mockOnInsert}
          sanitizeHTML={mockSanitizeHTML}
        />
      );

      expect(mockSanitizeHTML).toHaveBeenCalled();
    });

    it('should truncate content preview to 300 characters', () => {
      const longContent = 'A'.repeat(500);
      const model = createMockModel({ content: longContent });
      render(
        <SuggestionCard
          model={model}
          onPreview={mockOnPreview}
          onInsert={mockOnInsert}
          sanitizeHTML={mockSanitizeHTML}
        />
      );

      const call = mockSanitizeHTML.mock.calls[0][0];
      expect(call.length).toBe(300);
    });

    it('should handle empty content', () => {
      const model = createMockModel({ content: '' });
      expect(() =>
        render(
          <SuggestionCard
            model={model}
            onPreview={mockOnPreview}
            onInsert={mockOnInsert}
            sanitizeHTML={mockSanitizeHTML}
          />
        )
      ).not.toThrow();
    });

    it('should handle undefined content', () => {
      const model = createMockModel({ content: undefined as any });
      expect(() =>
        render(
          <SuggestionCard
            model={model}
            onPreview={mockOnPreview}
            onInsert={mockOnInsert}
            sanitizeHTML={mockSanitizeHTML}
          />
        )
      ).not.toThrow();
    });
  });
});

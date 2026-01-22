/**
 * @file ModelCard.test.tsx
 * @description Testes para o componente ModelCard
 * @version 1.38.39
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ModelCard } from './ModelCard';
import type { Model, ModelCardProps } from '../../types';

describe('ModelCard', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  const createMockModel = (overrides: Partial<Model> = {}): Model => ({
    id: 'model-1',
    title: 'Horas Extras',
    content: '<p>Conteúdo do modelo de horas extras.</p>',
    keywords: 'horas extras, adicional, jornada',
    category: 'Remuneração',
    favorite: false,
    createdAt: '2024-01-15T10:00:00Z',
    ...overrides,
  });

  const createDefaultProps = (overrides: Partial<ModelCardProps> = {}): ModelCardProps => ({
    model: createMockModel(),
    viewMode: 'cards',
    onEdit: vi.fn(),
    onToggleFavorite: vi.fn(),
    onDuplicate: vi.fn(),
    onDelete: vi.fn(),
    onInsert: vi.fn(),
    sanitizeHTML: vi.fn((html: string) => html),
    isShared: false,
    ownerEmail: null,
    sharedPermission: 'view',
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CARDS VIEW MODE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Cards View Mode', () => {
    it('should render model title', () => {
      const props = createDefaultProps();
      render(<ModelCard {...props} />);

      expect(screen.getByText('Horas Extras')).toBeInTheDocument();
    });

    it('should render model category', () => {
      const props = createDefaultProps();
      render(<ModelCard {...props} />);

      expect(screen.getByText('Remuneração')).toBeInTheDocument();
    });

    it('should render model content preview', () => {
      const props = createDefaultProps();
      render(<ModelCard {...props} />);

      expect(screen.getByText('Conteúdo do modelo de horas extras.')).toBeInTheDocument();
    });

    it('should render keywords (max 3)', () => {
      const props = createDefaultProps();
      render(<ModelCard {...props} />);

      expect(screen.getByText('horas extras')).toBeInTheDocument();
      expect(screen.getByText('adicional')).toBeInTheDocument();
      expect(screen.getByText('jornada')).toBeInTheDocument();
    });

    it('should show +N for additional keywords', () => {
      const props = createDefaultProps({
        model: createMockModel({ keywords: 'kw1, kw2, kw3, kw4, kw5' }),
      });
      render(<ModelCard {...props} />);

      expect(screen.getByText('+2')).toBeInTheDocument();
    });

    it('should handle keywords as array', () => {
      const props = createDefaultProps({
        model: createMockModel({ keywords: ['palavra1', 'palavra2'] }),
      });
      render(<ModelCard {...props} />);

      expect(screen.getByText('palavra1')).toBeInTheDocument();
      expect(screen.getByText('palavra2')).toBeInTheDocument();
    });

    it('should render creation date', () => {
      const props = createDefaultProps();
      render(<ModelCard {...props} />);

      expect(screen.getByText('15/01/2024')).toBeInTheDocument();
    });

    it('should render favorite star (unfavorited)', () => {
      const props = createDefaultProps({ model: createMockModel({ favorite: false }) });
      render(<ModelCard {...props} />);

      expect(screen.getByText('☆')).toBeInTheDocument();
    });

    it('should render favorite star (favorited)', () => {
      const props = createDefaultProps({ model: createMockModel({ favorite: true }) });
      render(<ModelCard {...props} />);

      expect(screen.getByText('★')).toBeInTheDocument();
    });

    it('should render edit button', () => {
      const props = createDefaultProps();
      render(<ModelCard {...props} />);

      expect(screen.getByText('Editar')).toBeInTheDocument();
    });

    it('should render duplicate button', () => {
      const props = createDefaultProps();
      render(<ModelCard {...props} />);

      expect(screen.getByText('📋')).toBeInTheDocument();
    });

    it('should render delete button for own models', () => {
      const props = createDefaultProps();
      render(<ModelCard {...props} />);

      expect(screen.getByTitle('Excluir modelo')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // LIST VIEW MODE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('List View Mode', () => {
    it('should render model title in list view', () => {
      const props = createDefaultProps({ viewMode: 'list' });
      render(<ModelCard {...props} />);

      expect(screen.getByText('Horas Extras')).toBeInTheDocument();
    });

    it('should render category in list view', () => {
      const props = createDefaultProps({ viewMode: 'list' });
      render(<ModelCard {...props} />);

      expect(screen.getByText('Remuneração')).toBeInTheDocument();
    });

    it('should show compact keywords in list view', () => {
      const props = createDefaultProps({ viewMode: 'list' });
      render(<ModelCard {...props} />);

      // In list view, shows first keyword + count
      expect(screen.getByText(/horas extras/)).toBeInTheDocument();
    });

    it('should render favorite button in list view', () => {
      const props = createDefaultProps({ viewMode: 'list' });
      render(<ModelCard {...props} />);

      expect(screen.getByText('☆')).toBeInTheDocument();
    });

    it('should default to cards mode for invalid viewMode', () => {
      const props = createDefaultProps({ viewMode: 'invalid' as 'cards' | 'list' });
      render(<ModelCard {...props} />);

      // Cards mode shows "Editar" text, list mode shows just icon
      expect(screen.getByText('Editar')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SIMILARITY BADGE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Similarity Badge', () => {
    it('should show high similarity badge (green) for >= 70%', () => {
      const props = createDefaultProps({
        model: createMockModel({ similarity: 0.85 }),
      });
      render(<ModelCard {...props} />);

      expect(screen.getByText('85% similar')).toBeInTheDocument();
    });

    it('should show medium similarity badge (yellow) for >= 50%', () => {
      const props = createDefaultProps({
        model: createMockModel({ similarity: 0.55 }),
      });
      render(<ModelCard {...props} />);

      expect(screen.getByText('55% similar')).toBeInTheDocument();
    });

    it('should show low similarity badge (gray) for < 50%', () => {
      const props = createDefaultProps({
        model: createMockModel({ similarity: 0.35 }),
      });
      render(<ModelCard {...props} />);

      expect(screen.getByText('35% similar')).toBeInTheDocument();
    });

    it('should not show similarity badge when undefined', () => {
      const props = createDefaultProps({
        model: createMockModel({ similarity: undefined }),
      });
      render(<ModelCard {...props} />);

      expect(screen.queryByText(/similar/)).not.toBeInTheDocument();
    });

    it('should show percentage in list view', () => {
      const props = createDefaultProps({
        viewMode: 'list',
        model: createMockModel({ similarity: 0.72 }),
      });
      render(<ModelCard {...props} />);

      expect(screen.getByText('72%')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SHARED MODEL TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Shared Models', () => {
    it('should show shared badge with owner name', () => {
      const props = createDefaultProps({
        isShared: true,
        ownerEmail: 'joao.silva@email.com',
      });
      render(<ModelCard {...props} />);

      expect(screen.getByText('De: joao.silva')).toBeInTheDocument();
    });

    it('should show "Visualizar" instead of "Editar" for view-only shared', () => {
      const props = createDefaultProps({
        isShared: true,
        ownerEmail: 'user@email.com',
        sharedPermission: 'view',
      });
      render(<ModelCard {...props} />);

      expect(screen.getByText('Visualizar')).toBeInTheDocument();
      expect(screen.queryByText('Editar')).not.toBeInTheDocument();
    });

    it('should disable edit button for view-only shared models', () => {
      const props = createDefaultProps({
        isShared: true,
        ownerEmail: 'user@email.com',
        sharedPermission: 'view',
      });
      render(<ModelCard {...props} />);

      const editButton = screen.getByTitle('Modelo compartilhado (somente leitura)');
      expect(editButton).toBeDisabled();
    });

    it('should hide delete button for view-only shared models', () => {
      const props = createDefaultProps({
        isShared: true,
        ownerEmail: 'user@email.com',
        sharedPermission: 'view',
      });
      render(<ModelCard {...props} />);

      expect(screen.queryByTitle(/Excluir/)).not.toBeInTheDocument();
    });

    it('should show delete button for shared models with edit permission', () => {
      const props = createDefaultProps({
        isShared: true,
        ownerEmail: 'user@email.com',
        sharedPermission: 'edit',
      });
      render(<ModelCard {...props} />);

      expect(screen.getByTitle('Excluir modelo compartilhado (afeta o proprietario)')).toBeInTheDocument();
    });

    it('should show "Editar" for shared models with edit permission', () => {
      const props = createDefaultProps({
        isShared: true,
        ownerEmail: 'user@email.com',
        sharedPermission: 'edit',
      });
      render(<ModelCard {...props} />);

      expect(screen.getByText('Editar')).toBeInTheDocument();
    });

    it('should show shared badge in list view', () => {
      const props = createDefaultProps({
        viewMode: 'list',
        isShared: true,
        ownerEmail: 'maria@email.com',
      });
      render(<ModelCard {...props} />);

      expect(screen.getByText('De: maria')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // BUTTON INTERACTIONS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Button Interactions', () => {
    it('should call onToggleFavorite when favorite button clicked', () => {
      const onToggleFavorite = vi.fn();
      const props = createDefaultProps({ onToggleFavorite });
      render(<ModelCard {...props} />);

      fireEvent.click(screen.getByText('☆'));

      expect(onToggleFavorite).toHaveBeenCalledWith('model-1');
    });

    it('should call onEdit when edit button clicked', () => {
      const onEdit = vi.fn();
      const props = createDefaultProps({ onEdit });
      render(<ModelCard {...props} />);

      fireEvent.click(screen.getByText('Editar'));

      expect(onEdit).toHaveBeenCalledWith(props.model);
    });

    it('should call onDuplicate when duplicate button clicked', () => {
      const onDuplicate = vi.fn();
      const props = createDefaultProps({ onDuplicate });
      render(<ModelCard {...props} />);

      fireEvent.click(screen.getByText('📋'));

      expect(onDuplicate).toHaveBeenCalledWith(props.model);
    });

    it('should call onDelete when delete button clicked', () => {
      const onDelete = vi.fn();
      const props = createDefaultProps({ onDelete });
      render(<ModelCard {...props} />);

      fireEvent.click(screen.getByTitle('Excluir modelo'));

      expect(onDelete).toHaveBeenCalledWith(props.model);
    });

    it('should not call onEdit when disabled (view-only shared)', () => {
      const onEdit = vi.fn();
      const props = createDefaultProps({
        onEdit,
        isShared: true,
        ownerEmail: 'user@email.com',
        sharedPermission: 'view',
      });
      render(<ModelCard {...props} />);

      const editButton = screen.getByTitle('Modelo compartilhado (somente leitura)');
      fireEvent.click(editButton);

      expect(onEdit).not.toHaveBeenCalled();
    });

    it('should call onToggleFavorite in list view', () => {
      const onToggleFavorite = vi.fn();
      const props = createDefaultProps({ viewMode: 'list', onToggleFavorite });
      render(<ModelCard {...props} />);

      fireEvent.click(screen.getByText('☆'));

      expect(onToggleFavorite).toHaveBeenCalledWith('model-1');
    });

    it('should call onDuplicate in list view', () => {
      const onDuplicate = vi.fn();
      const props = createDefaultProps({ viewMode: 'list', onDuplicate });
      render(<ModelCard {...props} />);

      fireEvent.click(screen.getByTitle('Duplicar para sua biblioteca'));

      expect(onDuplicate).toHaveBeenCalledWith(props.model);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SANITIZE HTML TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Sanitize HTML', () => {
    it('should call sanitizeHTML with model content', () => {
      const sanitizeHTML = vi.fn((html: string) => html);
      const props = createDefaultProps({ sanitizeHTML });
      render(<ModelCard {...props} />);

      expect(sanitizeHTML).toHaveBeenCalledWith('<p>Conteúdo do modelo de horas extras.</p>');
    });

    it('should render sanitized content', () => {
      const sanitizeHTML = vi.fn(() => 'Conteúdo sanitizado');
      const props = createDefaultProps({ sanitizeHTML });
      render(<ModelCard {...props} />);

      expect(screen.getByText('Conteúdo sanitizado')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EDGE CASES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Edge Cases', () => {
    it('should handle model without category', () => {
      const props = createDefaultProps({
        model: createMockModel({ category: undefined }),
      });
      render(<ModelCard {...props} />);

      expect(screen.getByText('Horas Extras')).toBeInTheDocument();
      expect(screen.queryByText('Remuneração')).not.toBeInTheDocument();
    });

    it('should handle model without keywords', () => {
      const props = createDefaultProps({
        model: createMockModel({ keywords: undefined }),
      });
      render(<ModelCard {...props} />);

      expect(screen.getByText('Horas Extras')).toBeInTheDocument();
    });

    it('should handle model without createdAt', () => {
      const props = createDefaultProps({
        model: createMockModel({ createdAt: undefined }),
      });
      render(<ModelCard {...props} />);

      expect(screen.getByText('Horas Extras')).toBeInTheDocument();
      expect(screen.queryByText(/2024/)).not.toBeInTheDocument();
    });

    it('should handle empty keywords string', () => {
      const props = createDefaultProps({
        model: createMockModel({ keywords: '' }),
      });
      render(<ModelCard {...props} />);

      expect(screen.getByText('Horas Extras')).toBeInTheDocument();
    });

    it('should handle isShared without ownerEmail', () => {
      const props = createDefaultProps({
        isShared: true,
        ownerEmail: null,
      });
      render(<ModelCard {...props} />);

      // Should not crash and should not show shared badge
      expect(screen.getByText('Horas Extras')).toBeInTheDocument();
      expect(screen.queryByText(/De:/)).not.toBeInTheDocument();
    });
  });
});

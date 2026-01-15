/**
 * @file TopicsTab.test.tsx
 * @description Testes para o componente TopicsTab
 * @version 1.37.57
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TopicsTab } from './TopicsTab';
import type { Topic, TopicsTabProps } from '../../types';

// Mock do SortableTopicCard para simplificar testes
vi.mock('../cards', () => ({
  SortableTopicCard: ({ topic, selectedIdx }: { topic: Topic; selectedIdx: number }) => (
    <div data-testid={`sortable-topic-${topic.id || topic.title}`}>
      <span>Topic: {topic.title}</span>
      <span>Index: {selectedIdx}</span>
    </div>
  ),
}));

// Mock do @dnd-kit/core
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dnd-context">{children}</div>
  ),
}));

// Mock do @dnd-kit/sortable
vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children, items }: { children: React.ReactNode; items: string[] }) => (
    <div data-testid="sortable-context" data-items={items.join(',')}>{children}</div>
  ),
  verticalListSortingStrategy: {},
}));

describe('TopicsTab', () => {
  // Default props factory
  const createMockProps = (overrides: Partial<TopicsTabProps> = {}): TopicsTabProps => ({
    extractedTopics: [],
    setExtractedTopics: vi.fn(),
    selectedTopics: [],
    setSelectedTopics: vi.fn(),
    topicsToMerge: [],
    setTopicsToMerge: vi.fn(),
    unselectedTopics: [],
    topicsDecididos: 0,
    topicsPendentes: 0,
    lastEditedTopicTitle: null,
    topicRefs: { current: {} },
    dndSensors: [],
    customCollisionDetection: vi.fn(),
    handleDndDragEnd: vi.fn(),
    regenerating: false,
    generatingDispositivo: false,
    generatingReview: false,
    canGenerateDispositivo: { enabled: true, reason: '' },
    toggleTopicSelection: vi.fn(),
    moveTopicUp: vi.fn(),
    moveTopicDown: vi.fn(),
    moveTopicToPosition: vi.fn(),
    startEditing: vi.fn(),
    deleteTopic: vi.fn(),
    setTopicToRename: vi.fn(),
    setNewTopicName: vi.fn(),
    setTopicToSplit: vi.fn(),
    openModal: vi.fn(),
    generateDispositivo: vi.fn(),
    exportDecision: vi.fn(),
    isTopicDecidido: vi.fn(() => false),
    isSpecialTopic: vi.fn((t: Topic) =>
      t.title.toUpperCase() === 'RELATÓRIO' || t.title.toUpperCase() === 'DISPOSITIVO'
    ),
    CSS: { spinner: 'spinner', flexGap2: 'flex gap-2' },
    ...overrides,
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERING TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Rendering', () => {
    it('should show empty state when no topics', () => {
      const props = createMockProps({ extractedTopics: [] });
      render(<TopicsTab {...props} />);

      expect(screen.getByText(/Nenhum tópico extraído ainda/i)).toBeInTheDocument();
    });

    it('should render header with selected topics count', () => {
      const topics: Topic[] = [
        { id: '1', title: 'Topic 1', category: 'MÉRITO' },
        { id: '2', title: 'Topic 2', category: 'MÉRITO' },
      ];
      const props = createMockProps({
        extractedTopics: topics,
        selectedTopics: topics,
      });
      render(<TopicsTab {...props} />);

      expect(screen.getByText(/Gerenciar Tópicos/i)).toBeInTheDocument();
      expect(screen.getByText(/\(2 selecionados\)/i)).toBeInTheDocument();
    });

    it('should render status counters (decididos/pendentes)', () => {
      const topics: Topic[] = [{ id: '1', title: 'Topic 1', category: 'MÉRITO' }];
      const props = createMockProps({
        extractedTopics: topics,
        topicsDecididos: 3,
        topicsPendentes: 5,
      });
      render(<TopicsTab {...props} />);

      expect(screen.getByText(/3 Decididos/i)).toBeInTheDocument();
      expect(screen.getByText(/5 Pendentes/i)).toBeInTheDocument();
    });

    it('should render CNJ info box', () => {
      const topics: Topic[] = [{ id: '1', title: 'Topic 1', category: 'MÉRITO' }];
      const props = createMockProps({ extractedTopics: topics });
      render(<TopicsTab {...props} />);

      expect(screen.getByText(/Resolução 615\/2025 do CNJ/i)).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // BUTTON ENABLEMENT TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Button Enablement', () => {
    it('should show "Unir" button only when 2+ topics to merge', () => {
      const topics: Topic[] = [
        { id: '1', title: 'Topic 1', category: 'MÉRITO' },
        { id: '2', title: 'Topic 2', category: 'MÉRITO' },
      ];
      const props = createMockProps({
        extractedTopics: topics,
        topicsToMerge: topics,
      });
      render(<TopicsTab {...props} />);

      expect(screen.getByText(/Unir 2 Selecionados/i)).toBeInTheDocument();
    });

    it('should NOT show "Unir" button when less than 2 topics', () => {
      const topics: Topic[] = [{ id: '1', title: 'Topic 1', category: 'MÉRITO' }];
      const props = createMockProps({
        extractedTopics: topics,
        topicsToMerge: [topics[0]],
      });
      render(<TopicsTab {...props} />);

      expect(screen.queryByText(/Unir.*Selecionados/i)).not.toBeInTheDocument();
    });

    it('should always show "Novo Tópico" button', () => {
      const topics: Topic[] = [{ id: '1', title: 'Topic 1', category: 'MÉRITO' }];
      const props = createMockProps({ extractedTopics: topics });
      render(<TopicsTab {...props} />);

      expect(screen.getByText(/Novo Tópico/i)).toBeInTheDocument();
    });

    it('should show action buttons only when topics selected', () => {
      const topics: Topic[] = [{ id: '1', title: 'Topic 1', category: 'MÉRITO' }];

      // Without selected topics
      const propsNoSelection = createMockProps({
        extractedTopics: topics,
        selectedTopics: [],
      });
      const { rerender } = render(<TopicsTab {...propsNoSelection} />);

      expect(screen.queryByText(/Edição Global/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Exportar Minuta/i)).not.toBeInTheDocument();

      // With selected topics
      const propsWithSelection = createMockProps({
        extractedTopics: topics,
        selectedTopics: topics,
      });
      rerender(<TopicsTab {...propsWithSelection} />);

      expect(screen.getByText(/Edição Global/i)).toBeInTheDocument();
      expect(screen.getByText(/Exportar Minuta/i)).toBeInTheDocument();
    });

    it('should disable "Gerar Dispositivo" when canGenerateDispositivo is false', () => {
      const topics: Topic[] = [{ id: '1', title: 'Topic 1', category: 'MÉRITO' }];
      const props = createMockProps({
        extractedTopics: topics,
        selectedTopics: topics,
        canGenerateDispositivo: { enabled: false, reason: 'Preencha todos os campos' },
      });
      render(<TopicsTab {...props} />);

      const button = screen.getByText(/Gerar Dispositivo/i).closest('button');
      expect(button).toBeDisabled();
    });

    it('should disable "Gerar Dispositivo" when generating', () => {
      const topics: Topic[] = [{ id: '1', title: 'Topic 1', category: 'MÉRITO' }];
      const props = createMockProps({
        extractedTopics: topics,
        selectedTopics: topics,
        generatingDispositivo: true,
      });
      render(<TopicsTab {...props} />);

      expect(screen.getByText(/Gerando.../i)).toBeInTheDocument();
    });

    it('should disable "Revisar Sentença" when generating review', () => {
      const topics: Topic[] = [{ id: '1', title: 'Topic 1', category: 'MÉRITO' }];
      const props = createMockProps({
        extractedTopics: topics,
        selectedTopics: topics,
        generatingReview: true,
      });
      render(<TopicsTab {...props} />);

      expect(screen.getByText(/Revisando.../i)).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DND TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Drag and Drop', () => {
    it('should render DndContext', () => {
      const topics: Topic[] = [{ id: '1', title: 'Topic 1', category: 'MÉRITO' }];
      const props = createMockProps({
        extractedTopics: topics,
        selectedTopics: topics,
      });
      render(<TopicsTab {...props} />);

      expect(screen.getByTestId('dnd-context')).toBeInTheDocument();
    });

    it('should only include selected topics in SortableContext', () => {
      const selectedTopics: Topic[] = [
        { id: '1', title: 'Selected 1', category: 'MÉRITO' },
        { id: '2', title: 'Selected 2', category: 'MÉRITO' },
      ];
      const unselectedTopics: Topic[] = [
        { id: '3', title: 'Unselected', category: 'MÉRITO' },
      ];
      const props = createMockProps({
        extractedTopics: [...selectedTopics, ...unselectedTopics],
        selectedTopics,
        unselectedTopics,
      });
      render(<TopicsTab {...props} />);

      const sortableContext = screen.getByTestId('sortable-context');
      const items = sortableContext.getAttribute('data-items');

      // Should contain selected topic IDs
      expect(items).toContain('1');
      expect(items).toContain('2');
      // Should NOT contain unselected topic ID
      expect(items).not.toContain('3');
    });

    it('should render SortableTopicCard for each selected topic', () => {
      const selectedTopics: Topic[] = [
        { id: '1', title: 'Topic 1', category: 'MÉRITO' },
        { id: '2', title: 'Topic 2', category: 'MÉRITO' },
      ];
      const props = createMockProps({
        extractedTopics: selectedTopics,
        selectedTopics,
      });
      render(<TopicsTab {...props} />);

      expect(screen.getByTestId('sortable-topic-1')).toBeInTheDocument();
      expect(screen.getByTestId('sortable-topic-2')).toBeInTheDocument();
    });

    it('should NOT render unselected topics in DndContext', () => {
      const selectedTopics: Topic[] = [{ id: '1', title: 'Selected', category: 'MÉRITO' }];
      const unselectedTopics: Topic[] = [{ id: '2', title: 'Unselected', category: 'MÉRITO' }];
      const props = createMockProps({
        extractedTopics: [...selectedTopics, ...unselectedTopics],
        selectedTopics,
        unselectedTopics,
      });
      render(<TopicsTab {...props} />);

      // Unselected should NOT be in sortable context
      expect(screen.queryByTestId('sortable-topic-2')).not.toBeInTheDocument();
      // But should still be rendered outside DndContext
      expect(screen.getByText('UNSELECTED')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TOPIC SELECTION TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Topic Selection', () => {
    it('should call toggleTopicSelection when topic title clicked', () => {
      const toggleFn = vi.fn();
      const unselectedTopics: Topic[] = [{ id: '1', title: 'Topic 1', category: 'MÉRITO' }];
      const props = createMockProps({
        extractedTopics: unselectedTopics,
        unselectedTopics,
        toggleTopicSelection: toggleFn,
      });
      render(<TopicsTab {...props} />);

      fireEvent.click(screen.getByText('TOPIC 1'));

      expect(toggleFn).toHaveBeenCalledWith(unselectedTopics[0]);
    });

    it('should call toggleTopicSelection when checkbox clicked', () => {
      const toggleFn = vi.fn();
      const unselectedTopics: Topic[] = [{ id: '1', title: 'Topic 1', category: 'MÉRITO' }];
      const props = createMockProps({
        extractedTopics: unselectedTopics,
        unselectedTopics,
        toggleTopicSelection: toggleFn,
      });
      render(<TopicsTab {...props} />);

      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);

      expect(toggleFn).toHaveBeenCalledWith(unselectedTopics[0]);
    });

    it('should show checkbox for unselected topics', () => {
      const unselectedTopics: Topic[] = [{ id: '1', title: 'Topic 1', category: 'MÉRITO' }];
      const props = createMockProps({
        extractedTopics: unselectedTopics,
        unselectedTopics,
      });
      render(<TopicsTab {...props} />);

      expect(screen.getByRole('checkbox')).toBeInTheDocument();
      // Use getAllByText since text appears in header and checkbox area
      const elements = screen.getAllByText(/Clique para selecionar/i);
      expect(elements.length).toBeGreaterThanOrEqual(1);
    });

    it('should hide category selector for RELATÓRIO', () => {
      const unselectedTopics: Topic[] = [{ id: '1', title: 'RELATÓRIO', category: 'MÉRITO' }];
      const props = createMockProps({
        extractedTopics: unselectedTopics,
        unselectedTopics,
        isSpecialTopic: vi.fn((t: Topic) => t.title.toUpperCase() === 'RELATÓRIO'),
      });
      render(<TopicsTab {...props} />);

      // Should not have category select dropdown
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    });

    it('should hide category selector for DISPOSITIVO', () => {
      const unselectedTopics: Topic[] = [{ id: '1', title: 'DISPOSITIVO', category: 'MÉRITO' }];
      const props = createMockProps({
        extractedTopics: unselectedTopics,
        unselectedTopics,
        isSpecialTopic: vi.fn((t: Topic) => t.title.toUpperCase() === 'DISPOSITIVO'),
      });
      render(<TopicsTab {...props} />);

      // Should not have category select dropdown
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    });

    it('should show category selector for normal topics', () => {
      const unselectedTopics: Topic[] = [{ id: '1', title: 'Normal Topic', category: 'MÉRITO' }];
      const props = createMockProps({
        extractedTopics: unselectedTopics,
        unselectedTopics,
        isSpecialTopic: vi.fn(() => false),
      });
      render(<TopicsTab {...props} />);

      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // BUTTON ACTIONS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Button Actions', () => {
    it('should call openModal with "merge" when Unir button clicked', () => {
      const openModalFn = vi.fn();
      const topics: Topic[] = [
        { id: '1', title: 'Topic 1', category: 'MÉRITO' },
        { id: '2', title: 'Topic 2', category: 'MÉRITO' },
      ];
      const props = createMockProps({
        extractedTopics: topics,
        topicsToMerge: topics,
        openModal: openModalFn,
      });
      render(<TopicsTab {...props} />);

      fireEvent.click(screen.getByText(/Unir 2 Selecionados/i));

      expect(openModalFn).toHaveBeenCalledWith('merge');
    });

    it('should call openModal with "newTopic" when Novo Tópico clicked', () => {
      const openModalFn = vi.fn();
      const topics: Topic[] = [{ id: '1', title: 'Topic 1', category: 'MÉRITO' }];
      const props = createMockProps({
        extractedTopics: topics,
        openModal: openModalFn,
      });
      render(<TopicsTab {...props} />);

      fireEvent.click(screen.getByText(/Novo Tópico/i));

      expect(openModalFn).toHaveBeenCalledWith('newTopic');
    });

    it('should call openModal with "globalEditor" when Edição Global clicked', () => {
      const openModalFn = vi.fn();
      const topics: Topic[] = [{ id: '1', title: 'Topic 1', category: 'MÉRITO' }];
      const props = createMockProps({
        extractedTopics: topics,
        selectedTopics: topics,
        openModal: openModalFn,
      });
      render(<TopicsTab {...props} />);

      fireEvent.click(screen.getByText(/Edição Global/i));

      expect(openModalFn).toHaveBeenCalledWith('globalEditor');
    });

    it('should call generateDispositivo when button clicked', () => {
      const generateFn = vi.fn();
      const topics: Topic[] = [{ id: '1', title: 'Topic 1', category: 'MÉRITO' }];
      const props = createMockProps({
        extractedTopics: topics,
        selectedTopics: topics,
        generateDispositivo: generateFn,
      });
      render(<TopicsTab {...props} />);

      fireEvent.click(screen.getByText(/Gerar Dispositivo/i));

      expect(generateFn).toHaveBeenCalled();
    });

    it('should call exportDecision when Exportar Minuta clicked', () => {
      const exportFn = vi.fn();
      const topics: Topic[] = [{ id: '1', title: 'Topic 1', category: 'MÉRITO' }];
      const props = createMockProps({
        extractedTopics: topics,
        selectedTopics: topics,
        exportDecision: exportFn,
      });
      render(<TopicsTab {...props} />);

      fireEvent.click(screen.getByText(/Exportar Minuta/i));

      expect(exportFn).toHaveBeenCalled();
    });

    it('should call deleteTopic when delete button clicked', () => {
      const deleteFn = vi.fn();
      const unselectedTopics: Topic[] = [{ id: '1', title: 'Topic 1', category: 'MÉRITO' }];
      const props = createMockProps({
        extractedTopics: unselectedTopics,
        unselectedTopics,
        deleteTopic: deleteFn,
      });
      render(<TopicsTab {...props} />);

      const deleteButton = screen.getByTitle(/Excluir tópico/i);
      fireEvent.click(deleteButton);

      expect(deleteFn).toHaveBeenCalledWith(unselectedTopics[0]);
    });
  });
});

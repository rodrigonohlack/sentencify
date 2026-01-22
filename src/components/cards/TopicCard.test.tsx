/**
 * @file TopicCard.test.tsx
 * @description Testes para o componente TopicCard
 * @version 1.38.39
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TopicCard, SortableTopicCard } from './TopicCard';
import type { Topic, TopicCardProps } from '../../types';

// ═══════════════════════════════════════════════════════════════════════════
// MOCKS
// ═══════════════════════════════════════════════════════════════════════════

vi.mock('@dnd-kit/sortable', () => ({
  useSortable: vi.fn(() => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
    isOver: false,
  })),
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: vi.fn(() => ''),
    },
  },
}));

vi.mock('../../utils/text', () => ({
  isSpecialTopic: vi.fn((topic: Topic) =>
    topic.title.toUpperCase() === 'RELATÓRIO' || topic.title.toUpperCase() === 'DISPOSITIVO'
  ),
  isDispositivo: vi.fn((topic: Topic) => topic.title.toUpperCase() === 'DISPOSITIVO'),
  isRelatorio: vi.fn((topic: Topic) => topic.title.toUpperCase() === 'RELATÓRIO'),
}));

describe('TopicCard', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  const createMockTopic = (overrides: Partial<Topic> = {}): Topic => ({
    id: 'topic-1',
    title: 'Horas Extras',
    category: 'MÉRITO',
    relatorio: 'Mini-relatório sobre horas extras.',
    ...overrides,
  });

  const createDefaultProps = (overrides: Partial<TopicCardProps> = {}): TopicCardProps => ({
    topic: createMockTopic(),
    selectedIdx: 0,
    topicRefs: { current: {} },
    lastEditedTopicTitle: null,
    isDragging: false,
    isOver: false,
    selectedTopics: [createMockTopic()],
    extractedTopics: [createMockTopic()],
    topicsToMerge: [],
    toggleTopicSelection: vi.fn(),
    moveTopicUp: vi.fn(),
    moveTopicDown: vi.fn(),
    moveTopicToPosition: vi.fn(),
    setSelectedTopics: vi.fn(),
    setExtractedTopics: vi.fn(),
    startEditing: vi.fn(),
    setTopicToRename: vi.fn(),
    setNewTopicName: vi.fn(),
    openModal: vi.fn(),
    setTopicToSplit: vi.fn(),
    setTopicsToMerge: vi.fn(),
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // BASIC RENDERING TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Basic Rendering', () => {
    it('should render topic title', () => {
      const props = createDefaultProps();
      render(<TopicCard {...props} />);

      expect(screen.getByText('HORAS EXTRAS')).toBeInTheDocument();
    });

    it('should render position badge', () => {
      const props = createDefaultProps({ selectedIdx: 2 });
      render(<TopicCard {...props} />);

      expect(screen.getByText('#3')).toBeInTheDocument();
    });

    it('should render category selector for normal topics', () => {
      const props = createDefaultProps();
      render(<TopicCard {...props} />);

      // Category is the first combobox
      const comboboxes = screen.getAllByRole('combobox');
      expect(comboboxes[0]).toHaveValue('MÉRITO');
    });

    it('should render edit button', () => {
      const props = createDefaultProps();
      render(<TopicCard {...props} />);

      expect(screen.getByText('Editar')).toBeInTheDocument();
    });

    it('should render rename button for normal topics', () => {
      const props = createDefaultProps();
      render(<TopicCard {...props} />);

      expect(screen.getByText('Renomear')).toBeInTheDocument();
    });

    it('should render split button for normal topics', () => {
      const props = createDefaultProps();
      render(<TopicCard {...props} />);

      expect(screen.getByText('Separar')).toBeInTheDocument();
    });

    it('should render merge button for normal topics', () => {
      const props = createDefaultProps();
      render(<TopicCard {...props} />);

      expect(screen.getByText('Unir')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SPECIAL TOPICS TESTS (RELATÓRIO and DISPOSITIVO)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Special Topics', () => {
    it('should show "Posição Fixa" badge for RELATÓRIO', () => {
      const props = createDefaultProps({
        topic: createMockTopic({ title: 'RELATÓRIO', category: 'RELATÓRIO' }),
      });
      render(<TopicCard {...props} />);

      expect(screen.getByText('Posição Fixa')).toBeInTheDocument();
    });

    it('should show "Posição Fixa" badge for DISPOSITIVO', () => {
      const props = createDefaultProps({
        topic: createMockTopic({ title: 'DISPOSITIVO', category: 'DISPOSITIVO' }),
      });
      render(<TopicCard {...props} />);

      expect(screen.getByText('Posição Fixa')).toBeInTheDocument();
    });

    it('should not show checkbox for RELATÓRIO', () => {
      const props = createDefaultProps({
        topic: createMockTopic({ title: 'RELATÓRIO' }),
      });
      render(<TopicCard {...props} />);

      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    });

    it('should not show rename button for RELATÓRIO', () => {
      const props = createDefaultProps({
        topic: createMockTopic({ title: 'RELATÓRIO' }),
      });
      render(<TopicCard {...props} />);

      expect(screen.queryByText('Renomear')).not.toBeInTheDocument();
    });

    it('should not show split button for DISPOSITIVO', () => {
      const props = createDefaultProps({
        topic: createMockTopic({ title: 'DISPOSITIVO' }),
      });
      render(<TopicCard {...props} />);

      expect(screen.queryByText('Separar')).not.toBeInTheDocument();
    });

    it('should not show result selector for RELATÓRIO', () => {
      const props = createDefaultProps({
        topic: createMockTopic({ title: 'RELATÓRIO' }),
      });
      render(<TopicCard {...props} />);

      expect(screen.queryByText('Selecione o resultado...')).not.toBeInTheDocument();
    });

    it('should still show edit button for special topics', () => {
      const props = createDefaultProps({
        topic: createMockTopic({ title: 'RELATÓRIO' }),
      });
      render(<TopicCard {...props} />);

      expect(screen.getByText('Editar')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RESULT SELECTOR TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Result Selector', () => {
    it('should render result selector with placeholder', () => {
      const props = createDefaultProps();
      render(<TopicCard {...props} />);

      expect(screen.getByText('Selecione o resultado...')).toBeInTheDocument();
    });

    it('should show selected result', () => {
      const props = createDefaultProps({
        topic: createMockTopic({ resultado: 'PROCEDENTE' }),
      });
      render(<TopicCard {...props} />);

      const resultSelect = screen.getAllByRole('combobox')[1];
      expect(resultSelect).toHaveValue('PROCEDENTE');
    });

    it('should call setSelectedTopics when result changes', () => {
      const setSelectedTopics = vi.fn();
      const props = createDefaultProps({ setSelectedTopics });
      render(<TopicCard {...props} />);

      const resultSelect = screen.getAllByRole('combobox')[1];
      fireEvent.change(resultSelect, { target: { value: 'IMPROCEDENTE' } });

      expect(setSelectedTopics).toHaveBeenCalled();
    });

    it('should show auto-detection indicator when resultado is auto-detected', () => {
      const props = createDefaultProps({
        topic: createMockTopic({ resultado: 'PROCEDENTE', resultadoManual: false }),
      });
      render(<TopicCard {...props} />);

      expect(screen.getByText('Auto')).toBeInTheDocument();
    });

    it('should not show auto-detection indicator when resultado is manual', () => {
      const props = createDefaultProps({
        topic: createMockTopic({ resultado: 'PROCEDENTE', resultadoManual: true }),
      });
      render(<TopicCard {...props} />);

      expect(screen.queryByText('Auto')).not.toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // STATUS INDICATOR TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Status Indicator', () => {
    it('should show "Pendente" for topic without content and result', () => {
      const props = createDefaultProps({
        topic: createMockTopic({ editedFundamentacao: '', resultado: undefined }),
      });
      render(<TopicCard {...props} />);

      expect(screen.getByText('Pendente')).toBeInTheDocument();
    });

    it('should show "Decidido" for topic with content and result', () => {
      const props = createDefaultProps({
        topic: createMockTopic({
          editedFundamentacao: 'Fundamentação do tópico.',
          resultado: 'PROCEDENTE',
        }),
      });
      render(<TopicCard {...props} />);

      expect(screen.getByText('Decidido')).toBeInTheDocument();
    });

    it('should show "Pendente" for topic with content but no result', () => {
      const props = createDefaultProps({
        topic: createMockTopic({
          editedFundamentacao: 'Fundamentação do tópico.',
          resultado: undefined,
        }),
      });
      render(<TopicCard {...props} />);

      expect(screen.getByText('Pendente')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CHECKBOX INTERACTION TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Checkbox Interaction', () => {
    it('should render checkbox for normal topics', () => {
      const props = createDefaultProps();
      render(<TopicCard {...props} />);

      expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });

    it('should call toggleTopicSelection when checkbox clicked', () => {
      const toggleTopicSelection = vi.fn();
      const props = createDefaultProps({ toggleTopicSelection });
      render(<TopicCard {...props} />);

      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);

      expect(toggleTopicSelection).toHaveBeenCalledWith(props.topic);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // POSITION CONTROLS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Position Controls', () => {
    it('should call moveTopicUp when up button clicked', () => {
      const moveTopicUp = vi.fn();
      const props = createDefaultProps({ moveTopicUp, selectedIdx: 1 });
      render(<TopicCard {...props} />);

      const upButton = screen.getAllByRole('button')[0];
      fireEvent.click(upButton);

      expect(moveTopicUp).toHaveBeenCalledWith(1);
    });

    it('should disable up button for first topic', () => {
      const props = createDefaultProps({ selectedIdx: 0 });
      render(<TopicCard {...props} />);

      const upButton = screen.getAllByRole('button')[0];
      expect(upButton).toBeDisabled();
    });

    it('should call moveTopicDown when down button clicked', () => {
      const moveTopicDown = vi.fn();
      const selectedTopics = [createMockTopic(), createMockTopic({ title: 'Férias' })];
      const props = createDefaultProps({ moveTopicDown, selectedIdx: 0, selectedTopics });
      render(<TopicCard {...props} />);

      const downButton = screen.getAllByRole('button')[1];
      fireEvent.click(downButton);

      expect(moveTopicDown).toHaveBeenCalledWith(0);
    });

    it('should disable down button for last topic', () => {
      const selectedTopics = [createMockTopic()];
      const props = createDefaultProps({ selectedIdx: 0, selectedTopics });
      render(<TopicCard {...props} />);

      const downButton = screen.getAllByRole('button')[1];
      expect(downButton).toBeDisabled();
    });

    it('should call moveTopicToPosition on Enter key in position input', () => {
      const moveTopicToPosition = vi.fn();
      const selectedTopics = [createMockTopic(), createMockTopic({ title: 'Férias' }), createMockTopic({ title: 'FGTS' })];
      const props = createDefaultProps({ moveTopicToPosition, selectedTopics });
      render(<TopicCard {...props} />);

      const positionInput = screen.getByRole('spinbutton');
      fireEvent.change(positionInput, { target: { value: '3' } });
      fireEvent.keyDown(positionInput, { key: 'Enter' });

      expect(moveTopicToPosition).toHaveBeenCalledWith(0, 3);
    });

    it('should call moveTopicToPosition on change', () => {
      const moveTopicToPosition = vi.fn();
      const selectedTopics = [createMockTopic(), createMockTopic({ title: 'Férias' })];
      const props = createDefaultProps({ moveTopicToPosition, selectedTopics });
      render(<TopicCard {...props} />);

      const positionInput = screen.getByRole('spinbutton');
      fireEvent.change(positionInput, { target: { value: '2' } });

      expect(moveTopicToPosition).toHaveBeenCalledWith(0, 2);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CATEGORY SELECTOR TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Category Selector', () => {
    it('should call setSelectedTopics when category changes', () => {
      const setSelectedTopics = vi.fn();
      const props = createDefaultProps({ setSelectedTopics });
      render(<TopicCard {...props} />);

      const categorySelect = screen.getAllByRole('combobox')[0];
      fireEvent.change(categorySelect, { target: { value: 'PRELIMINAR' } });

      expect(setSelectedTopics).toHaveBeenCalled();
    });

    it('should update extractedTopics when category changes', () => {
      const setExtractedTopics = vi.fn();
      const topic = createMockTopic();
      const extractedTopics = [topic];
      const props = createDefaultProps({ setExtractedTopics, extractedTopics, topic });
      render(<TopicCard {...props} />);

      const categorySelect = screen.getAllByRole('combobox')[0];
      fireEvent.change(categorySelect, { target: { value: 'PREJUDICIAL' } });

      expect(setExtractedTopics).toHaveBeenCalled();
    });

    it('should render all category options', () => {
      const props = createDefaultProps();
      render(<TopicCard {...props} />);

      expect(screen.getByText('Preliminar')).toBeInTheDocument();
      expect(screen.getByText('Prejudicial')).toBeInTheDocument();
      expect(screen.getByText('Mérito')).toBeInTheDocument();
      expect(screen.getByText('Processual')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTION BUTTONS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Action Buttons', () => {
    it('should call startEditing when edit button clicked', () => {
      const startEditing = vi.fn();
      const props = createDefaultProps({ startEditing });
      render(<TopicCard {...props} />);

      fireEvent.click(screen.getByText('Editar'));

      expect(startEditing).toHaveBeenCalledWith(props.topic);
    });

    it('should call setTopicToRename and openModal when rename button clicked', () => {
      const setTopicToRename = vi.fn();
      const setNewTopicName = vi.fn();
      const openModal = vi.fn();
      const props = createDefaultProps({ setTopicToRename, setNewTopicName, openModal });
      render(<TopicCard {...props} />);

      fireEvent.click(screen.getByText('Renomear'));

      expect(setTopicToRename).toHaveBeenCalledWith(props.topic);
      expect(setNewTopicName).toHaveBeenCalledWith('Horas Extras');
      expect(openModal).toHaveBeenCalledWith('rename');
    });

    it('should call setTopicToSplit and openModal when split button clicked', () => {
      const setTopicToSplit = vi.fn();
      const openModal = vi.fn();
      const props = createDefaultProps({ setTopicToSplit, openModal });
      render(<TopicCard {...props} />);

      fireEvent.click(screen.getByText('Separar'));

      expect(setTopicToSplit).toHaveBeenCalledWith(props.topic);
      expect(openModal).toHaveBeenCalledWith('split');
    });

    it('should add topic to merge list when merge button clicked', () => {
      const setTopicsToMerge = vi.fn();
      const props = createDefaultProps({ setTopicsToMerge, topicsToMerge: [] });
      render(<TopicCard {...props} />);

      fireEvent.click(screen.getByText('Unir'));

      expect(setTopicsToMerge).toHaveBeenCalledWith([props.topic]);
    });

    it('should remove topic from merge list when already selected', () => {
      const setTopicsToMerge = vi.fn();
      const topic = createMockTopic();
      const props = createDefaultProps({ setTopicsToMerge, topicsToMerge: [topic], topic });
      render(<TopicCard {...props} />);

      fireEvent.click(screen.getByText('Selecionado'));

      expect(setTopicsToMerge).toHaveBeenCalledWith([]);
    });

    it('should show "Selecionado" text when topic is in merge list', () => {
      const topic = createMockTopic();
      const props = createDefaultProps({ topicsToMerge: [topic], topic });
      render(<TopicCard {...props} />);

      expect(screen.getByText('Selecionado')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // VISUAL STATE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Visual States', () => {
    it('should apply dragging styles when isDragging is true', () => {
      const props = createDefaultProps({ isDragging: true });
      const { container } = render(<TopicCard {...props} />);

      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('border-blue-500');
    });

    it('should apply isOver styles when isOver is true', () => {
      const props = createDefaultProps({ isOver: true });
      const { container } = render(<TopicCard {...props} />);

      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('border-purple-500');
    });

    it('should apply last edited styles when topic was just edited', () => {
      const props = createDefaultProps({ lastEditedTopicTitle: 'Horas Extras' });
      const { container } = render(<TopicCard {...props} />);

      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('border-green-500');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SORTABLE TOPIC CARD TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('SortableTopicCard', () => {
    it('should render TopicCard inside wrapper', () => {
      const props = createDefaultProps();
      render(<SortableTopicCard id="topic-1" {...props} />);

      expect(screen.getByText('HORAS EXTRAS')).toBeInTheDocument();
    });

    it('should render with sortable wrapper', () => {
      const props = createDefaultProps();
      const { container } = render(<SortableTopicCard id="topic-1" {...props} />);

      // Check that the wrapper div exists
      expect(container.firstChild).toBeInTheDocument();
      expect(screen.getByText('HORAS EXTRAS')).toBeInTheDocument();
    });
  });
});

/**
 * @file TopicModals.test.tsx
 * @description Testes para os modais de tópicos
 * @version 1.38.39
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  RenameTopicModal,
  DeleteTopicModal,
  MergeTopicsModal,
  SplitTopicModal,
  NewTopicModal,
} from './TopicModals';
import type {
  Topic,
  TopicCategory,
  RenameTopicModalProps,
  DeleteTopicModalProps,
  MergeTopicsModalProps,
  SplitTopicModalProps,
  NewTopicModalProps,
} from '../../types';

describe('TopicModals', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  const createMockTopic = (overrides: Partial<Topic> = {}): Topic => ({
    id: 'topic-1',
    title: 'Horas Extras',
    category: 'MÉRITO',
    relatorio: 'Mini-relatório sobre horas extras.',
    resultado: 'PROCEDENTE',
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RENAME TOPIC MODAL TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('RenameTopicModal', () => {
    const createRenameProps = (overrides: Partial<RenameTopicModalProps> = {}): RenameTopicModalProps => ({
      isOpen: true,
      onClose: vi.fn(),
      topicToRename: createMockTopic(),
      setTopicToRename: vi.fn(),
      newTopicName: '',
      setNewTopicName: vi.fn(),
      handleRenameTopic: vi.fn(),
      isRegenerating: false,
      hasDocuments: false,
      ...overrides,
    });

    it('should render when open', () => {
      render(<RenameTopicModal {...createRenameProps()} />);

      expect(screen.getByText('Renomear Tópico')).toBeInTheDocument();
    });

    it('should display current topic title', () => {
      render(<RenameTopicModal {...createRenameProps()} />);

      expect(screen.getByText('Horas Extras')).toBeInTheDocument();
    });

    it('should render input for new title', () => {
      render(<RenameTopicModal {...createRenameProps()} />);

      expect(screen.getByPlaceholderText('Digite o novo título')).toBeInTheDocument();
    });

    it('should call setNewTopicName when typing', () => {
      const setNewTopicName = vi.fn();
      render(<RenameTopicModal {...createRenameProps({ setNewTopicName })} />);

      fireEvent.change(screen.getByPlaceholderText('Digite o novo título'), {
        target: { value: 'Novo Título' },
      });

      expect(setNewTopicName).toHaveBeenCalledWith('Novo Título');
    });

    it('should render both rename buttons', () => {
      render(<RenameTopicModal {...createRenameProps({ newTopicName: 'Novo' })} />);

      expect(screen.getByText('Renomear e Regenerar')).toBeInTheDocument();
      expect(screen.getByText('Apenas Renomear')).toBeInTheDocument();
    });

    it('should call handleRenameTopic with true for regenerate', () => {
      const handleRenameTopic = vi.fn();
      render(<RenameTopicModal {...createRenameProps({ handleRenameTopic, newTopicName: 'Novo' })} />);

      fireEvent.click(screen.getByText('Renomear e Regenerar'));

      expect(handleRenameTopic).toHaveBeenCalledWith(true);
    });

    it('should call handleRenameTopic with false for just rename', () => {
      const handleRenameTopic = vi.fn();
      render(<RenameTopicModal {...createRenameProps({ handleRenameTopic, newTopicName: 'Novo' })} />);

      fireEvent.click(screen.getByText('Apenas Renomear'));

      expect(handleRenameTopic).toHaveBeenCalledWith(false);
    });

    it('should disable buttons when empty name', () => {
      render(<RenameTopicModal {...createRenameProps({ newTopicName: '' })} />);

      expect(screen.getByText('Renomear e Regenerar').closest('button')).toBeDisabled();
      expect(screen.getByText('Apenas Renomear').closest('button')).toBeDisabled();
    });

    it('should disable buttons when regenerating', () => {
      render(<RenameTopicModal {...createRenameProps({ isRegenerating: true, newTopicName: 'Novo' })} />);

      expect(screen.getByText('Regenerando...').closest('button')).toBeDisabled();
    });

    it('should show regenerating state', () => {
      render(<RenameTopicModal {...createRenameProps({ isRegenerating: true, newTopicName: 'Novo' })} />);

      expect(screen.getByText('Regenerando...')).toBeInTheDocument();
      expect(screen.getByText('Renomeando...')).toBeInTheDocument();
    });

    it('should show documents info when hasDocuments', () => {
      render(<RenameTopicModal {...createRenameProps({ hasDocuments: true })} />);

      expect(screen.getByText(/Regerará com base nos documentos/)).toBeInTheDocument();
    });

    it('should show AI info when no documents', () => {
      render(<RenameTopicModal {...createRenameProps({ hasDocuments: false })} />);

      expect(screen.getByText(/Regerará com IA/)).toBeInTheDocument();
    });

    it('should call onClose and reset state on cancel', () => {
      const onClose = vi.fn();
      const setTopicToRename = vi.fn();
      const setNewTopicName = vi.fn();
      render(<RenameTopicModal {...createRenameProps({ onClose, setTopicToRename, setNewTopicName })} />);

      fireEvent.click(screen.getByText('Cancelar'));

      expect(onClose).toHaveBeenCalled();
      expect(setTopicToRename).toHaveBeenCalledWith(null);
      expect(setNewTopicName).toHaveBeenCalledWith('');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DELETE TOPIC MODAL TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('DeleteTopicModal', () => {
    const createDeleteProps = (overrides: Partial<DeleteTopicModalProps> = {}): DeleteTopicModalProps => ({
      isOpen: true,
      onClose: vi.fn(),
      topicToDelete: createMockTopic(),
      setTopicToDelete: vi.fn(),
      onConfirmDelete: vi.fn(),
      ...overrides,
    });

    it('should render when open', () => {
      render(<DeleteTopicModal {...createDeleteProps()} />);

      expect(screen.getByText('Confirmar Exclusão')).toBeInTheDocument();
    });

    it('should display topic title', () => {
      render(<DeleteTopicModal {...createDeleteProps()} />);

      expect(screen.getByText('Horas Extras')).toBeInTheDocument();
    });

    it('should display topic relatorio', () => {
      render(<DeleteTopicModal {...createDeleteProps()} />);

      expect(screen.getByText('Mini-relatório sobre horas extras.')).toBeInTheDocument();
    });

    it('should show warning message', () => {
      render(<DeleteTopicModal {...createDeleteProps()} />);

      expect(screen.getByText(/Esta ação não pode ser desfeita/)).toBeInTheDocument();
    });

    it('should call onConfirmDelete when clicking confirm', () => {
      const onConfirmDelete = vi.fn();
      render(<DeleteTopicModal {...createDeleteProps({ onConfirmDelete })} />);

      fireEvent.click(screen.getByText('Sim, Excluir'));

      expect(onConfirmDelete).toHaveBeenCalled();
    });

    it('should call onClose and reset on cancel', () => {
      const onClose = vi.fn();
      const setTopicToDelete = vi.fn();
      render(<DeleteTopicModal {...createDeleteProps({ onClose, setTopicToDelete })} />);

      fireEvent.click(screen.getByText('Cancelar'));

      expect(onClose).toHaveBeenCalled();
      expect(setTopicToDelete).toHaveBeenCalledWith(null);
    });

    it('should handle topic without relatorio', () => {
      const topic = createMockTopic({ relatorio: undefined });
      render(<DeleteTopicModal {...createDeleteProps({ topicToDelete: topic })} />);

      expect(screen.getByText('Horas Extras')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // MERGE TOPICS MODAL TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('MergeTopicsModal', () => {
    const createMergeProps = (overrides: Partial<MergeTopicsModalProps> = {}): MergeTopicsModalProps => ({
      isOpen: true,
      onClose: vi.fn(),
      topicsToMerge: [
        createMockTopic({ id: 'topic-1', title: 'Horas Extras' }),
        createMockTopic({ id: 'topic-2', title: 'Adicional Noturno' }),
      ],
      onConfirmMerge: vi.fn(),
      isRegenerating: false,
      hasDocuments: false,
      ...overrides,
    });

    it('should render when open with topics', () => {
      render(<MergeTopicsModal {...createMergeProps()} />);

      expect(screen.getByText('Unir Tópicos')).toBeInTheDocument();
    });

    it('should return null when no topics', () => {
      const { container } = render(<MergeTopicsModal {...createMergeProps({ topicsToMerge: [] })} />);

      expect(container.firstChild).toBeNull();
    });

    it('should return null when topicsToMerge is null', () => {
      const { container } = render(<MergeTopicsModal {...createMergeProps({ topicsToMerge: null as unknown as Topic[] })} />);

      expect(container.firstChild).toBeNull();
    });

    it('should display all topics to merge', () => {
      render(<MergeTopicsModal {...createMergeProps()} />);

      expect(screen.getByText('1. Horas Extras')).toBeInTheDocument();
      expect(screen.getByText('2. Adicional Noturno')).toBeInTheDocument();
    });

    it('should call onConfirmMerge when clicking confirm', () => {
      const onConfirmMerge = vi.fn();
      render(<MergeTopicsModal {...createMergeProps({ onConfirmMerge })} />);

      fireEvent.click(screen.getByText('Confirmar União'));

      expect(onConfirmMerge).toHaveBeenCalled();
    });

    it('should disable button when regenerating', () => {
      render(<MergeTopicsModal {...createMergeProps({ isRegenerating: true })} />);

      expect(screen.getByText('Unindo...').closest('button')).toBeDisabled();
    });

    it('should show regenerating text when hasDocuments', () => {
      render(<MergeTopicsModal {...createMergeProps({ isRegenerating: true, hasDocuments: true })} />);

      expect(screen.getByText('Regenerando...')).toBeInTheDocument();
    });

    it('should show documents info when hasDocuments', () => {
      render(<MergeTopicsModal {...createMergeProps({ hasDocuments: true })} />);

      expect(screen.getByText(/regenerado com base nos documentos originais/)).toBeInTheDocument();
    });

    it('should call onClose on cancel', () => {
      const onClose = vi.fn();
      render(<MergeTopicsModal {...createMergeProps({ onClose })} />);

      fireEvent.click(screen.getByText('Cancelar'));

      expect(onClose).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SPLIT TOPIC MODAL TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('SplitTopicModal', () => {
    const createSplitProps = (overrides: Partial<SplitTopicModalProps> = {}): SplitTopicModalProps => ({
      isOpen: true,
      onClose: vi.fn(),
      topicToSplit: createMockTopic(),
      setTopicToSplit: vi.fn(),
      splitNames: ['', ''],
      setSplitNames: vi.fn(),
      onConfirmSplit: vi.fn(),
      isRegenerating: false,
      hasDocuments: false,
      ...overrides,
    });

    it('should render when open', () => {
      render(<SplitTopicModal {...createSplitProps()} />);

      expect(screen.getByText('Separar Tópico')).toBeInTheDocument();
    });

    it('should return null when splitNames is null', () => {
      const { container } = render(<SplitTopicModal {...createSplitProps({ splitNames: null as unknown as string[] })} />);

      expect(container.firstChild).toBeNull();
    });

    it('should display original topic title', () => {
      render(<SplitTopicModal {...createSplitProps()} />);

      expect(screen.getByText('Horas Extras')).toBeInTheDocument();
    });

    it('should render inputs for subtopics', () => {
      render(<SplitTopicModal {...createSplitProps()} />);

      expect(screen.getByPlaceholderText('Título do subtópico 1')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Título do subtópico 2')).toBeInTheDocument();
    });

    it('should call setSplitNames when typing in subtopic input', () => {
      const setSplitNames = vi.fn();
      render(<SplitTopicModal {...createSplitProps({ setSplitNames })} />);

      fireEvent.change(screen.getByPlaceholderText('Título do subtópico 1'), {
        target: { value: 'Subtópico 1' },
      });

      expect(setSplitNames).toHaveBeenCalledWith(['Subtópico 1', '']);
    });

    it('should add new subtopic input when clicking add button', () => {
      const setSplitNames = vi.fn();
      render(<SplitTopicModal {...createSplitProps({ setSplitNames })} />);

      fireEvent.click(screen.getByText('+ Adicionar mais um subtópico'));

      expect(setSplitNames).toHaveBeenCalledWith(['', '', '']);
    });

    it('should disable confirm when less than 2 names filled', () => {
      render(<SplitTopicModal {...createSplitProps({ splitNames: ['Sub1', ''] })} />);

      expect(screen.getByText('Confirmar Separação').closest('button')).toBeDisabled();
    });

    it('should enable confirm when at least 2 names filled', () => {
      render(<SplitTopicModal {...createSplitProps({ splitNames: ['Sub1', 'Sub2'] })} />);

      expect(screen.getByText('Confirmar Separação').closest('button')).not.toBeDisabled();
    });

    it('should call onConfirmSplit when clicking confirm', () => {
      const onConfirmSplit = vi.fn();
      render(<SplitTopicModal {...createSplitProps({ onConfirmSplit, splitNames: ['Sub1', 'Sub2'] })} />);

      fireEvent.click(screen.getByText('Confirmar Separação'));

      expect(onConfirmSplit).toHaveBeenCalled();
    });

    it('should show regenerating state', () => {
      render(<SplitTopicModal {...createSplitProps({ isRegenerating: true })} />);

      expect(screen.getByText('Separando...')).toBeInTheDocument();
    });

    it('should show regenerating with documents', () => {
      render(<SplitTopicModal {...createSplitProps({ isRegenerating: true, hasDocuments: true })} />);

      expect(screen.getByText('Regenerando...')).toBeInTheDocument();
    });

    it('should show documents info when hasDocuments', () => {
      render(<SplitTopicModal {...createSplitProps({ hasDocuments: true })} />);

      expect(screen.getByText(/regenerado com base nos documentos originais/)).toBeInTheDocument();
    });

    it('should call onClose and reset on cancel', () => {
      const onClose = vi.fn();
      const setTopicToSplit = vi.fn();
      const setSplitNames = vi.fn();
      render(<SplitTopicModal {...createSplitProps({ onClose, setTopicToSplit, setSplitNames })} />);

      fireEvent.click(screen.getByText('Cancelar'));

      expect(onClose).toHaveBeenCalled();
      expect(setTopicToSplit).toHaveBeenCalledWith(null);
      expect(setSplitNames).toHaveBeenCalledWith(['', '']);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // NEW TOPIC MODAL TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('NewTopicModal', () => {
    const createNewTopicProps = (overrides: Partial<NewTopicModalProps> = {}): NewTopicModalProps => ({
      isOpen: true,
      onClose: vi.fn(),
      newTopicData: { title: '', category: 'MÉRITO', relatorio: '' },
      setNewTopicData: vi.fn(),
      onConfirmCreate: vi.fn(),
      isRegenerating: false,
      hasDocuments: false,
      ...overrides,
    });

    it('should render when open', () => {
      render(<NewTopicModal {...createNewTopicProps()} />);

      expect(screen.getByText('Criar Novo Tópico')).toBeInTheDocument();
    });

    it('should render title input', () => {
      render(<NewTopicModal {...createNewTopicProps()} />);

      expect(screen.getByPlaceholderText('Ex: Adicional de Periculosidade')).toBeInTheDocument();
    });

    it('should render category select with options', () => {
      render(<NewTopicModal {...createNewTopicProps()} />);

      expect(screen.getByText('Preliminar')).toBeInTheDocument();
      expect(screen.getByText('Prejudicial')).toBeInTheDocument();
      expect(screen.getByText('Mérito')).toBeInTheDocument();
    });

    it('should render relatorio textarea', () => {
      render(<NewTopicModal {...createNewTopicProps()} />);

      expect(screen.getByPlaceholderText(/Digite ou deixe em branco/)).toBeInTheDocument();
    });

    it('should call setNewTopicData when typing title', () => {
      const setNewTopicData = vi.fn();
      render(<NewTopicModal {...createNewTopicProps({ setNewTopicData })} />);

      fireEvent.change(screen.getByPlaceholderText('Ex: Adicional de Periculosidade'), {
        target: { value: 'Novo Tópico' },
      });

      expect(setNewTopicData).toHaveBeenCalledWith(expect.objectContaining({ title: 'Novo Tópico' }));
    });

    it('should call setNewTopicData when changing category', () => {
      const setNewTopicData = vi.fn();
      render(<NewTopicModal {...createNewTopicProps({ setNewTopicData })} />);

      fireEvent.change(screen.getByRole('combobox'), {
        target: { value: 'PRELIMINAR' },
      });

      expect(setNewTopicData).toHaveBeenCalledWith(expect.objectContaining({ category: 'PRELIMINAR' }));
    });

    it('should call setNewTopicData when typing relatorio', () => {
      const setNewTopicData = vi.fn();
      render(<NewTopicModal {...createNewTopicProps({ setNewTopicData })} />);

      fireEvent.change(screen.getByPlaceholderText(/Digite ou deixe em branco/), {
        target: { value: 'Novo relatório' },
      });

      expect(setNewTopicData).toHaveBeenCalledWith(expect.objectContaining({ relatorio: 'Novo relatório' }));
    });

    it('should disable create button when title is empty', () => {
      render(<NewTopicModal {...createNewTopicProps()} />);

      expect(screen.getByText('Criar Tópico').closest('button')).toBeDisabled();
    });

    it('should enable create button when title is filled', () => {
      render(<NewTopicModal {...createNewTopicProps({ newTopicData: { title: 'Novo', category: 'MÉRITO', relatorio: '' } })} />);

      expect(screen.getByText('Criar Tópico').closest('button')).not.toBeDisabled();
    });

    it('should call onConfirmCreate when clicking create', () => {
      const onConfirmCreate = vi.fn();
      render(<NewTopicModal {...createNewTopicProps({ onConfirmCreate, newTopicData: { title: 'Novo', category: 'MÉRITO', relatorio: '' } })} />);

      fireEvent.click(screen.getByText('Criar Tópico'));

      expect(onConfirmCreate).toHaveBeenCalled();
    });

    it('should show regenerating state', () => {
      render(<NewTopicModal {...createNewTopicProps({ isRegenerating: true })} />);

      expect(screen.getByText('Criando...')).toBeInTheDocument();
    });

    it('should show analyzing state with documents', () => {
      render(<NewTopicModal {...createNewTopicProps({ isRegenerating: true, hasDocuments: true })} />);

      expect(screen.getByText('Analisando...')).toBeInTheDocument();
    });

    it('should show documents info when hasDocuments', () => {
      render(<NewTopicModal {...createNewTopicProps({ hasDocuments: true })} />);

      expect(screen.getByText(/gerado com base nos documentos/)).toBeInTheDocument();
    });

    it('should call onClose and reset on cancel', () => {
      const onClose = vi.fn();
      const setNewTopicData = vi.fn();
      render(<NewTopicModal {...createNewTopicProps({ onClose, setNewTopicData })} />);

      fireEvent.click(screen.getByText('Cancelar'));

      expect(onClose).toHaveBeenCalled();
      expect(setNewTopicData).toHaveBeenCalledWith({ title: '', category: 'MÉRITO', relatorio: '' });
    });

    it('should handle null newTopicData', () => {
      render(<NewTopicModal {...createNewTopicProps({ newTopicData: null as unknown as { title: string; category: TopicCategory; relatorio: string } })} />);

      expect(screen.getByText('Criar Novo Tópico')).toBeInTheDocument();
    });
  });
});

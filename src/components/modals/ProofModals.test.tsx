/**
 * @file ProofModals.test.tsx
 * @description Testes para os modais de provas
 * @version 1.38.39
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  AddProofTextModal,
  DeleteProofModal,
  ProofAnalysisModal,
  LinkProofModal,
} from './ProofModals';
import type {
  AddProofTextModalProps,
  DeleteProofModalProps,
  ProofAnalysisModalProps,
  LinkProofModalProps,
  Proof,
  Topic,
} from '../../types';

describe('ProofModals', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  const createMockProof = (overrides: Record<string, unknown> = {}): Proof & { isPdf?: boolean } => ({
    id: 'proof-1',
    name: 'Documento de Prova.pdf',
    type: 'pdf' as const,
    file: new File([''], 'test.pdf', { type: 'application/pdf' }),
    size: 1024,
    uploadDate: '2024-01-15T10:00:00Z',
    isPdf: true,
    ...overrides,
  } as Proof & { isPdf?: boolean });

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
  // ADD PROOF TEXT MODAL TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('AddProofTextModal', () => {
    const createAddProps = (overrides: Partial<AddProofTextModalProps> = {}): AddProofTextModalProps => ({
      isOpen: true,
      onClose: vi.fn(),
      newProofData: { name: '', text: '' },
      setNewProofData: vi.fn(),
      onAddProof: vi.fn(),
      ...overrides,
    });

    it('should render when open', () => {
      render(<AddProofTextModal {...createAddProps()} />);

      expect(screen.getByText('Adicionar Prova (Texto)')).toBeInTheDocument();
    });

    it('should render name input', () => {
      render(<AddProofTextModal {...createAddProps()} />);

      expect(screen.getByPlaceholderText('Ex: Contracheques, Ata de Audiência')).toBeInTheDocument();
    });

    it('should render text textarea', () => {
      render(<AddProofTextModal {...createAddProps()} />);

      expect(screen.getByPlaceholderText('Cole aqui o texto da prova...')).toBeInTheDocument();
    });

    it('should call setNewProofData when typing name', () => {
      const setNewProofData = vi.fn();
      render(<AddProofTextModal {...createAddProps({ setNewProofData })} />);

      fireEvent.change(screen.getByPlaceholderText('Ex: Contracheques, Ata de Audiência'), {
        target: { value: 'Contracheques' },
      });

      expect(setNewProofData).toHaveBeenCalled();
    });

    it('should call setNewProofData when typing text', () => {
      const setNewProofData = vi.fn();
      render(<AddProofTextModal {...createAddProps({ setNewProofData })} />);

      fireEvent.change(screen.getByPlaceholderText('Cole aqui o texto da prova...'), {
        target: { value: 'Texto da prova' },
      });

      expect(setNewProofData).toHaveBeenCalled();
    });

    it('should disable add button when text is empty', () => {
      render(<AddProofTextModal {...createAddProps()} />);

      expect(screen.getByText('Adicionar Prova').closest('button')).toBeDisabled();
    });

    it('should enable add button when text is filled', () => {
      render(<AddProofTextModal {...createAddProps({ newProofData: { name: '', text: 'Conteúdo' } })} />);

      expect(screen.getByText('Adicionar Prova').closest('button')).not.toBeDisabled();
    });

    it('should call onAddProof when clicking add', () => {
      const onAddProof = vi.fn();
      render(<AddProofTextModal {...createAddProps({ onAddProof, newProofData: { name: '', text: 'Conteúdo' } })} />);

      fireEvent.click(screen.getByText('Adicionar Prova'));

      expect(onAddProof).toHaveBeenCalled();
    });

    it('should call onClose and reset on cancel', () => {
      const onClose = vi.fn();
      const setNewProofData = vi.fn();
      render(<AddProofTextModal {...createAddProps({ onClose, setNewProofData })} />);

      fireEvent.click(screen.getByText('Cancelar'));

      expect(onClose).toHaveBeenCalled();
      expect(setNewProofData).toHaveBeenCalledWith({ name: '', text: '' });
    });

    it('should handle null newProofData', () => {
      render(<AddProofTextModal {...createAddProps({ newProofData: null as unknown as { name: string; text: string } })} />);

      expect(screen.getByText('Adicionar Prova (Texto)')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DELETE PROOF MODAL TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('DeleteProofModal', () => {
    const createDeleteProps = (overrides: Partial<DeleteProofModalProps> = {}): DeleteProofModalProps => ({
      isOpen: true,
      onClose: vi.fn(),
      proofToDelete: createMockProof(),
      onConfirmDelete: vi.fn(),
      ...overrides,
    });

    it('should render when open with proof', () => {
      render(<DeleteProofModal {...createDeleteProps()} />);

      expect(screen.getByText('Confirmar Exclusão')).toBeInTheDocument();
    });

    it('should not render content when proofToDelete is null', () => {
      const { container } = render(<DeleteProofModal {...createDeleteProps({ proofToDelete: null })} />);

      // Modal should not show the content
      expect(container.querySelector('[data-testid="delete-proof-content"]')).toBeNull();
    });

    it('should display proof name', () => {
      render(<DeleteProofModal {...createDeleteProps()} />);

      expect(screen.getByText('Documento de Prova.pdf')).toBeInTheDocument();
    });

    it('should display PDF badge for PDF proofs', () => {
      render(<DeleteProofModal {...createDeleteProps()} />);

      expect(screen.getByText('PDF')).toBeInTheDocument();
    });

    it('should display TEXTO badge for text proofs', () => {
      const textProof = createMockProof({ isPdf: false, type: 'text', text: 'Conteúdo da prova' });
      render(<DeleteProofModal {...createDeleteProps({ proofToDelete: textProof })} />);

      expect(screen.getByText('TEXTO')).toBeInTheDocument();
    });

    it('should display text preview for text proofs', () => {
      const textProof = createMockProof({
        isPdf: false,
        type: 'text',
        text: 'Este é o conteúdo da prova de texto para visualização.',
      });
      render(<DeleteProofModal {...createDeleteProps({ proofToDelete: textProof })} />);

      expect(screen.getByText(/Este é o conteúdo da prova/)).toBeInTheDocument();
    });

    it('should show warning message', () => {
      render(<DeleteProofModal {...createDeleteProps()} />);

      expect(screen.getByText(/Esta ação não pode ser desfeita/)).toBeInTheDocument();
    });

    it('should call onConfirmDelete when clicking confirm', () => {
      const onConfirmDelete = vi.fn();
      render(<DeleteProofModal {...createDeleteProps({ onConfirmDelete })} />);

      fireEvent.click(screen.getByText('Excluir Prova'));

      expect(onConfirmDelete).toHaveBeenCalled();
    });

    it('should call onClose on cancel', () => {
      const onClose = vi.fn();
      render(<DeleteProofModal {...createDeleteProps({ onClose })} />);

      fireEvent.click(screen.getByText('Cancelar'));

      expect(onClose).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PROOF ANALYSIS MODAL TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('ProofAnalysisModal', () => {
    const createAnalysisProps = (overrides: Partial<ProofAnalysisModalProps> = {}): ProofAnalysisModalProps => ({
      isOpen: true,
      onClose: vi.fn(),
      proofToAnalyze: createMockProof(),
      customInstructions: '',
      setCustomInstructions: vi.fn(),
      useOnlyMiniRelatorios: false,
      setUseOnlyMiniRelatorios: vi.fn(),
      includeLinkedTopicsInFree: false,
      setIncludeLinkedTopicsInFree: vi.fn(),
      proofTopicLinks: {},
      onAnalyzeContextual: vi.fn(),
      onAnalyzeFree: vi.fn(),
      editorTheme: 'dark',
      ...overrides,
    });

    it('should render when open with proof', () => {
      render(<ProofAnalysisModal {...createAnalysisProps()} />);

      expect(screen.getByText('Analisar Prova com IA')).toBeInTheDocument();
    });

    it('should return null when not open', () => {
      const { container } = render(<ProofAnalysisModal {...createAnalysisProps({ isOpen: false })} />);

      expect(container.firstChild).toBeNull();
    });

    it('should return null when proofToAnalyze is null', () => {
      const { container } = render(<ProofAnalysisModal {...createAnalysisProps({ proofToAnalyze: null })} />);

      expect(container.firstChild).toBeNull();
    });

    it('should display proof name as subtitle', () => {
      render(<ProofAnalysisModal {...createAnalysisProps()} />);

      expect(screen.getByText('Documento de Prova.pdf')).toBeInTheDocument();
    });

    it('should render custom instructions textarea', () => {
      render(<ProofAnalysisModal {...createAnalysisProps()} />);

      expect(screen.getByPlaceholderText(/Adicione instruções específicas/)).toBeInTheDocument();
    });

    it('should call setCustomInstructions when typing', () => {
      const setCustomInstructions = vi.fn();
      render(<ProofAnalysisModal {...createAnalysisProps({ setCustomInstructions })} />);

      fireEvent.change(screen.getByPlaceholderText(/Adicione instruções específicas/), {
        target: { value: 'Focar em valores' },
      });

      expect(setCustomInstructions).toHaveBeenCalledWith('Focar em valores');
    });

    it('should render Análise Contextual option', () => {
      render(<ProofAnalysisModal {...createAnalysisProps()} />);

      expect(screen.getByText('Análise Contextual')).toBeInTheDocument();
    });

    it('should render Análise Livre option', () => {
      render(<ProofAnalysisModal {...createAnalysisProps()} />);

      expect(screen.getByText('Análise Livre')).toBeInTheDocument();
    });

    it('should call onAnalyzeContextual when clicking contextual', () => {
      const onAnalyzeContextual = vi.fn();
      render(<ProofAnalysisModal {...createAnalysisProps({ onAnalyzeContextual })} />);

      fireEvent.click(screen.getByText('Análise Contextual'));

      expect(onAnalyzeContextual).toHaveBeenCalled();
    });

    it('should call onAnalyzeFree when clicking free', () => {
      const onAnalyzeFree = vi.fn();
      render(<ProofAnalysisModal {...createAnalysisProps({ onAnalyzeFree })} />);

      fireEvent.click(screen.getByText('Análise Livre'));

      expect(onAnalyzeFree).toHaveBeenCalled();
    });

    it('should show mini-relatórios checkbox when has linked topics', () => {
      render(<ProofAnalysisModal {...createAnalysisProps({
        proofTopicLinks: { 'proof-1': ['Horas Extras', 'Adicional'] },
      })} />);

      expect(screen.getByText(/mini-relatórios dos 2 tópico/)).toBeInTheDocument();
    });

    it('should call setUseOnlyMiniRelatorios when clicking checkbox', () => {
      const setUseOnlyMiniRelatorios = vi.fn();
      render(<ProofAnalysisModal {...createAnalysisProps({
        setUseOnlyMiniRelatorios,
        proofTopicLinks: { 'proof-1': ['Horas Extras'] },
      })} />);

      const checkbox = screen.getByText(/mini-relatórios dos 1 tópico/).closest('label')?.querySelector('input');
      if (checkbox) {
        fireEvent.click(checkbox);
        expect(setUseOnlyMiniRelatorios).toHaveBeenCalled();
      }
    });

    it('should show include linked topics checkbox in free analysis', () => {
      render(<ProofAnalysisModal {...createAnalysisProps({
        proofTopicLinks: { 'proof-1': ['Horas Extras', 'Adicional', 'Terceiro'] },
      })} />);

      expect(screen.getByText(/Incluir tópicos vinculados \(3 tóp\.\)/)).toBeInTheDocument();
    });

    it('should call setIncludeLinkedTopicsInFree when clicking checkbox', () => {
      const setIncludeLinkedTopicsInFree = vi.fn();
      render(<ProofAnalysisModal {...createAnalysisProps({
        setIncludeLinkedTopicsInFree,
        proofTopicLinks: { 'proof-1': ['Horas Extras'] },
      })} />);

      const checkbox = screen.getByText(/Incluir tópicos vinculados/).closest('label')?.querySelector('input');
      if (checkbox) {
        fireEvent.click(checkbox);
        expect(setIncludeLinkedTopicsInFree).toHaveBeenCalled();
      }
    });

    it('should call onClose when clicking cancel', () => {
      const onClose = vi.fn();
      render(<ProofAnalysisModal {...createAnalysisProps({ onClose })} />);

      fireEvent.click(screen.getByText('Cancelar'));

      expect(onClose).toHaveBeenCalled();
    });

    it('should render with light theme', () => {
      render(<ProofAnalysisModal {...createAnalysisProps({ editorTheme: 'light' })} />);

      expect(screen.getByText('Análise Contextual')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // LINK PROOF MODAL TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('LinkProofModal', () => {
    const createLinkProps = (overrides: Partial<LinkProofModalProps> = {}): LinkProofModalProps => ({
      isOpen: true,
      onClose: vi.fn(),
      proofToLink: createMockProof(),
      extractedTopics: [
        createMockTopic({ id: 'topic-1', title: 'Horas Extras', category: 'MÉRITO' }),
        createMockTopic({ id: 'topic-2', title: 'Adicional Noturno', category: 'MÉRITO' }),
      ],
      proofTopicLinks: {},
      setProofTopicLinks: vi.fn(),
      ...overrides,
    });

    it('should render when open with proof', () => {
      render(<LinkProofModal {...createLinkProps()} />);

      expect(screen.getByText('Vincular Prova a Tópicos')).toBeInTheDocument();
    });

    it('should return null when not open', () => {
      const { container } = render(<LinkProofModal {...createLinkProps({ isOpen: false })} />);

      expect(container.firstChild).toBeNull();
    });

    it('should return null when proofToLink is null', () => {
      const { container } = render(<LinkProofModal {...createLinkProps({ proofToLink: null })} />);

      expect(container.firstChild).toBeNull();
    });

    it('should display proof name as subtitle', () => {
      render(<LinkProofModal {...createLinkProps()} />);

      expect(screen.getByText('Documento de Prova.pdf')).toBeInTheDocument();
    });

    it('should display all topics', () => {
      render(<LinkProofModal {...createLinkProps()} />);

      expect(screen.getByText('Horas Extras')).toBeInTheDocument();
      expect(screen.getByText('Adicional Noturno')).toBeInTheDocument();
    });

    it('should display topic categories', () => {
      render(<LinkProofModal {...createLinkProps({
        extractedTopics: [
          createMockTopic({ title: 'Carência', category: 'PRELIMINAR' }),
          createMockTopic({ title: 'Prescrição', category: 'PREJUDICIAL' }),
          createMockTopic({ title: 'Mérito', category: 'MÉRITO' }),
        ],
      })} />);

      expect(screen.getByText('PRELIMINAR')).toBeInTheDocument();
      expect(screen.getByText('PREJUDICIAL')).toBeInTheDocument();
      expect(screen.getByText('MÉRITO')).toBeInTheDocument();
    });

    it('should show empty state when no topics', () => {
      render(<LinkProofModal {...createLinkProps({ extractedTopics: [] })} />);

      expect(screen.getByText('Nenhum tópico disponível')).toBeInTheDocument();
    });

    it('should show topic relatorio preview', () => {
      render(<LinkProofModal {...createLinkProps({
        extractedTopics: [
          createMockTopic({ id: 'topic-1', title: 'Horas Extras', relatorio: 'Relatorio único de horas extras' }),
        ],
      })} />);

      expect(screen.getByText(/Relatorio único de horas extras/)).toBeInTheDocument();
    });

    it('should show checkbox as checked for linked topics', () => {
      render(<LinkProofModal {...createLinkProps({
        proofTopicLinks: { 'proof-1': ['Horas Extras'] },
      })} />);

      const checkbox = screen.getByText('Horas Extras').closest('label')?.querySelector('input');
      expect(checkbox).toBeChecked();
    });

    it('should call setProofTopicLinks when linking topic', () => {
      const setProofTopicLinks = vi.fn();
      render(<LinkProofModal {...createLinkProps({ setProofTopicLinks })} />);

      const checkbox = screen.getByText('Horas Extras').closest('label')?.querySelector('input');
      if (checkbox) {
        fireEvent.click(checkbox);
        expect(setProofTopicLinks).toHaveBeenCalled();
      }
    });

    it('should call setProofTopicLinks when unlinking topic', () => {
      const setProofTopicLinks = vi.fn();
      render(<LinkProofModal {...createLinkProps({
        setProofTopicLinks,
        proofTopicLinks: { 'proof-1': ['Horas Extras'] },
      })} />);

      const checkbox = screen.getByText('Horas Extras').closest('label')?.querySelector('input');
      if (checkbox) {
        fireEvent.click(checkbox);
        expect(setProofTopicLinks).toHaveBeenCalled();
      }
    });

    it('should call onClose when clicking Concluir', () => {
      const onClose = vi.fn();
      render(<LinkProofModal {...createLinkProps({ onClose })} />);

      fireEvent.click(screen.getByText('Concluir'));

      expect(onClose).toHaveBeenCalled();
    });

    it('should handle topic without relatorio', () => {
      render(<LinkProofModal {...createLinkProps({
        extractedTopics: [createMockTopic({ relatorio: undefined })],
      })} />);

      expect(screen.getByText('Horas Extras')).toBeInTheDocument();
    });
  });
});

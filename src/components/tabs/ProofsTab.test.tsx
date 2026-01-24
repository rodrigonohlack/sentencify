/**
 * @file ProofsTab.test.tsx
 * @description Testes para o componente ProofsTab
 * @version 1.38.40
 *
 * Atualizado para FASE 3: ProofsTab agora acessa stores diretamente
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProofsTab } from './ProofsTab';
import type { ProofsTabProps, Topic, Proof } from '../../types';

// Mock useUIStore
const mockUIStore = {
  openModal: vi.fn(),
  setError: vi.fn(),
  setTextPreview: vi.fn(),
};
vi.mock('../../stores/useUIStore', () => ({
  useUIStore: (selector: (s: typeof mockUIStore) => unknown) => selector(mockUIStore),
}));

// Mock useTopicsStore
const mockTopicsStore = {
  extractedTopics: [] as Topic[],
};
vi.mock('../../stores/useTopicsStore', () => ({
  useTopicsStore: (selector: (s: typeof mockTopicsStore) => unknown) => selector(mockTopicsStore),
}));

// Mock useAIStore
const mockAIStore = {
  aiSettings: null as { provider?: string; anonymization?: { enabled?: boolean } } | null,
};
vi.mock('../../stores/useAIStore', () => ({
  useAIStore: (selector: (s: typeof mockAIStore) => unknown) => selector(mockAIStore),
}));

// Mock useThemeManagement hook
vi.mock('../../hooks', () => ({
  useThemeManagement: () => ({ appTheme: 'dark' }),
}));

// Mock do ProofCard para simplificar testes
vi.mock('../cards', () => ({
  ProofCard: ({ proof, isPdf }: { proof: Proof; isPdf: boolean }) => (
    <div data-testid={`proof-card-${proof.id}`}>
      <span>Proof: {proof.name}</span>
      <span>Type: {isPdf ? 'PDF' : 'Text'}</span>
    </div>
  ),
}));

describe('ProofsTab', () => {
  // Default props factory - only proofManager and documentServices remain
  const createMockProps = (overrides: Partial<ProofsTabProps> = {}): ProofsTabProps => ({
    proofManager: {
      proofFiles: [],
      proofTexts: [],
      handleUploadProofPdf: vi.fn(),
      setNewProofTextData: vi.fn(),
      // ProofCardProps['proofManager'] properties
      setProofTopicLinks: vi.fn(),
      setProofConclusions: vi.fn(),
      setProofUsePdfMode: vi.fn(),
      setProofExtractionFailed: vi.fn(),
      setExtractedProofTexts: vi.fn(),
      setProofProcessingModes: vi.fn(),
      setProofSendFullContent: vi.fn(),
      setProofToAnalyze: vi.fn(),
      setProofToDelete: vi.fn(),
      setProofToLink: vi.fn(),
      setPendingExtraction: vi.fn(),
      isAnalyzingProof: vi.fn(() => false),
      proofTopicLinks: {},
      proofConclusions: {},
      proofUsePdfMode: {},
      proofExtractionFailed: {},
      extractedProofTexts: {},
      proofProcessingModes: {},
      proofAnalysisResults: {},
      proofSendFullContent: {},
    } as any,
    documentServices: {
      extractTextFromPDFWithMode: vi.fn().mockResolvedValue('extracted text'),
    },
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store mocks
    mockUIStore.openModal = vi.fn();
    mockUIStore.setError = vi.fn();
    mockUIStore.setTextPreview = vi.fn();
    mockTopicsStore.extractedTopics = [];
    mockAIStore.aiSettings = null;
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERING TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Rendering', () => {
    it('should render header with title', () => {
      const props = createMockProps();
      render(<ProofsTab {...props} />);

      expect(screen.getByText(/Gestão de Provas/i)).toBeInTheDocument();
    });

    it('should render proof count in header', () => {
      mockTopicsStore.extractedTopics = [{ id: '1', title: 'Topic 1', category: 'MÉRITO' }] as Topic[];
      const props = createMockProps({
        proofManager: {
          ...createMockProps().proofManager,
          proofFiles: [{ id: '1', name: 'file1.pdf' }] as Proof[],
          proofTexts: [{ id: '2', name: 'text1' }] as Proof[],
        },
      });
      render(<ProofsTab {...props} />);

      expect(screen.getByText(/Provas Enviadas \(2\)/i)).toBeInTheDocument();
    });

    it('should show empty state when no proofs', () => {
      const props = createMockProps();
      render(<ProofsTab {...props} />);

      expect(screen.getByText(/Nenhuma prova enviada ainda/i)).toBeInTheDocument();
      expect(screen.getByText(/Faça upload de PDFs ou cole textos/i)).toBeInTheDocument();
    });

    it('should show warning when proofs exist but no extracted topics', () => {
      mockTopicsStore.extractedTopics = [];
      const props = createMockProps({
        proofManager: {
          ...createMockProps().proofManager,
          proofFiles: [{ id: '1', name: 'file1.pdf' }] as Proof[],
        },
      });
      render(<ProofsTab {...props} />);

      expect(screen.getByText(/Atenção:/i)).toBeInTheDocument();
      expect(screen.getByText(/Para vincular provas a tópicos/i)).toBeInTheDocument();
    });

    it('should hide warning when topics exist', () => {
      mockTopicsStore.extractedTopics = [{ id: '1', title: 'Topic 1', category: 'MÉRITO' }] as Topic[];
      const props = createMockProps({
        proofManager: {
          ...createMockProps().proofManager,
          proofFiles: [{ id: '1', name: 'file1.pdf' }] as Proof[],
        },
      });
      render(<ProofsTab {...props} />);

      expect(screen.queryByText(/Atenção:/i)).not.toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FILE UPLOAD TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('File Upload', () => {
    it('should render upload area for PDF', () => {
      const props = createMockProps();
      render(<ProofsTab {...props} />);

      expect(screen.getByText(/Clique para fazer upload de PDFs/i)).toBeInTheDocument();
      expect(screen.getByText(/Suporta múltiplos arquivos PDF/i)).toBeInTheDocument();
    });

    it('should call handleUploadProofPdf on file select', () => {
      const handleUpload = vi.fn();
      const props = createMockProps({
        proofManager: {
          ...createMockProps().proofManager,
          handleUploadProofPdf: handleUpload,
        },
      });
      render(<ProofsTab {...props} />);

      const fileInput = document.getElementById('proof-pdf-upload') as HTMLInputElement;
      const file = new File(['dummy content'], 'test.pdf', { type: 'application/pdf' });

      fireEvent.change(fileInput, { target: { files: [file] } });

      expect(handleUpload).toHaveBeenCalledWith([file]);
    });

    it('should have accept attribute for PDF files', () => {
      const props = createMockProps();
      render(<ProofsTab {...props} />);

      const fileInput = document.getElementById('proof-pdf-upload') as HTMLInputElement;
      expect(fileInput.accept).toBe('application/pdf');
    });

    it('should support multiple file upload', () => {
      const props = createMockProps();
      render(<ProofsTab {...props} />);

      const fileInput = document.getElementById('proof-pdf-upload') as HTMLInputElement;
      expect(fileInput.multiple).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEXT PASTE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Text Paste', () => {
    it('should render "Colar Texto como Prova" button', () => {
      const props = createMockProps();
      render(<ProofsTab {...props} />);

      expect(screen.getByText(/Colar Texto como Prova/i)).toBeInTheDocument();
    });

    it('should call setNewProofTextData and openModal on button click', () => {
      const setNewProofTextDataFn = vi.fn();
      const props = createMockProps({
        proofManager: {
          ...createMockProps().proofManager,
          setNewProofTextData: setNewProofTextDataFn,
        },
      });
      render(<ProofsTab {...props} />);

      fireEvent.click(screen.getByText(/Colar Texto como Prova/i));

      expect(setNewProofTextDataFn).toHaveBeenCalledWith({ name: '', text: '' });
      expect(mockUIStore.openModal).toHaveBeenCalledWith('addProofText');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PROOF CARD LIST TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('ProofCard List', () => {
    it('should render ProofCard for each PDF proof', () => {
      const pdfProofs: Proof[] = [
        { id: '1', name: 'file1.pdf' } as Proof,
        { id: '2', name: 'file2.pdf' } as Proof,
      ];
      mockTopicsStore.extractedTopics = [{ id: '1', title: 'Topic', category: 'MÉRITO' }] as Topic[];
      const props = createMockProps({
        proofManager: {
          ...createMockProps().proofManager,
          proofFiles: pdfProofs,
        },
      });
      render(<ProofsTab {...props} />);

      expect(screen.getByTestId('proof-card-1')).toBeInTheDocument();
      expect(screen.getByTestId('proof-card-2')).toBeInTheDocument();
    });

    it('should render ProofCard for each text proof', () => {
      const textProofs: Proof[] = [
        { id: '3', name: 'text1' } as Proof,
        { id: '4', name: 'text2' } as Proof,
      ];
      mockTopicsStore.extractedTopics = [{ id: '1', title: 'Topic', category: 'MÉRITO' }] as Topic[];
      const props = createMockProps({
        proofManager: {
          ...createMockProps().proofManager,
          proofTexts: textProofs,
        },
      });
      render(<ProofsTab {...props} />);

      expect(screen.getByTestId('proof-card-3')).toBeInTheDocument();
      expect(screen.getByTestId('proof-card-4')).toBeInTheDocument();
    });

    it('should render both PDF and text proofs', () => {
      mockTopicsStore.extractedTopics = [{ id: '1', title: 'Topic', category: 'MÉRITO' }] as Topic[];
      const props = createMockProps({
        proofManager: {
          ...createMockProps().proofManager,
          proofFiles: [{ id: '1', name: 'file.pdf' }] as Proof[],
          proofTexts: [{ id: '2', name: 'text' }] as Proof[],
        },
      });
      render(<ProofsTab {...props} />);

      expect(screen.getByTestId('proof-card-1')).toBeInTheDocument();
      expect(screen.getByTestId('proof-card-2')).toBeInTheDocument();

      // Check types via mock
      expect(screen.getByText('Type: PDF')).toBeInTheDocument();
      expect(screen.getByText('Type: Text')).toBeInTheDocument();
    });
  });
});

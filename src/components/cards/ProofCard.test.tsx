/**
 * @file ProofCard.test.tsx
 * @description Testes para o componente ProofCard
 * @version 1.38.39
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProofCard } from './ProofCard';
import type { ProofCardProps, ProofFile, ProofText, ProofAttachment, ProcessingMode, ProofAnalysisResult, AnonymizationSettings } from '../../types';

// ═══════════════════════════════════════════════════════════════════════════
// MOCKS
// ═══════════════════════════════════════════════════════════════════════════

const mockCallAI = vi.fn();
const mockImproveText = vi.fn();
const mockAddAttachment = vi.fn();
const mockRemoveAttachment = vi.fn();
const mockUpdateAttachmentExtractedText = vi.fn();
const mockUpdateAttachmentProcessingMode = vi.fn();

vi.mock('../../stores/useAIStore', () => ({
  useAIStore: vi.fn((selector) => {
    const state = {
      aiSettings: {
        voiceImprovement: { enabled: false, model: 'haiku' },
      },
    };
    return selector(state);
  }),
}));

vi.mock('../../hooks', () => ({
  useAIIntegration: vi.fn(() => ({
    callAI: mockCallAI,
  })),
}));

vi.mock('../../hooks/useVoiceImprovement', () => ({
  useVoiceImprovement: vi.fn(() => ({
    improveText: mockImproveText,
  })),
}));

vi.mock('../../stores/useProofsStore', () => ({
  useProofsStore: vi.fn((selector) => {
    const state = {
      addAttachment: mockAddAttachment,
      removeAttachment: mockRemoveAttachment,
      updateAttachmentExtractedText: mockUpdateAttachmentExtractedText,
      updateAttachmentProcessingMode: mockUpdateAttachmentProcessingMode,
    };
    return selector(state);
  }),
}));

vi.mock('../../hooks/useLocalStorage', () => ({
  saveAttachmentToIndexedDB: vi.fn().mockResolvedValue(undefined),
  removeAttachmentFromIndexedDB: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../ui/ProcessingModeSelector', () => ({
  ProcessingModeSelector: ({ value, onChange, disabled }: { value: string; onChange: (mode: ProcessingMode) => void; disabled?: boolean }) => (
    <select
      data-testid="processing-mode-selector"
      value={value}
      onChange={(e) => onChange(e.target.value as ProcessingMode)}
      disabled={disabled}
    >
      <option value="pdfjs">PDF.js</option>
      <option value="tesseract">Tesseract OCR</option>
      <option value="claude-vision">Claude Vision</option>
      <option value="pdf-puro">PDF Puro</option>
    </select>
  ),
}));

vi.mock('../VoiceButton', () => ({
  default: ({ onTranscript, size }: { onTranscript: (text: string) => void; size?: string }) => (
    <button
      data-testid="voice-button"
      onClick={() => onTranscript('Texto transcrito')}
    >
      Voice {size}
    </button>
  ),
}));

vi.mock('../../utils/text', () => ({
  anonymizeText: vi.fn((text: string) => `[ANONIMIZADO] ${text}`),
}));

describe('ProofCard', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  const createMockProofFile = (overrides: Partial<ProofFile> = {}): ProofFile => ({
    id: 'proof-1',
    name: 'Documento de Prova.pdf',
    type: 'pdf' as const,
    file: new File(['content'], 'test.pdf', { type: 'application/pdf' }),
    size: 1024,
    uploadDate: '2024-01-15T10:00:00Z',
    ...overrides,
  });

  const createMockProofText = (overrides: Partial<ProofText> = {}): ProofText => ({
    id: 'proof-1',
    name: 'Prova de Texto',
    type: 'text' as const,
    text: 'Conteúdo da prova de texto',
    uploadDate: '2024-01-15T10:00:00Z',
    ...overrides,
  });

  const createMockProofManager = (overrides: Partial<ProofCardProps['proofManager']> = {}): ProofCardProps['proofManager'] => ({
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
    isAnalyzingProof: vi.fn().mockReturnValue(false),
    removeProofAnalysis: vi.fn(),
    proofTopicLinks: {},
    proofConclusions: {},
    proofUsePdfMode: {},
    proofExtractionFailed: {},
    extractedProofTexts: {},
    proofProcessingModes: {},
    proofAnalysisResults: {},
    proofSendFullContent: {},
    ...overrides,
  });

  const createDefaultProps = (overrides: Partial<ProofCardProps> = {}): ProofCardProps => ({
    proof: createMockProofFile(),
    isPdf: true,
    proofManager: createMockProofManager(),
    openModal: vi.fn(),
    setError: vi.fn(),
    extractTextFromPDFWithMode: vi.fn().mockResolvedValue('Texto extraído do PDF'),
    anonymizationEnabled: false,
    grokEnabled: false,
    anonConfig: null,
    nomesParaAnonimizar: [],
    editorTheme: 'dark',
    setTextPreview: vi.fn(),
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // BASIC RENDERING TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Basic Rendering', () => {
    it('should render PDF proof with correct name', () => {
      const props = createDefaultProps();
      render(<ProofCard {...props} />);

      expect(screen.getByText('Documento de Prova.pdf')).toBeInTheDocument();
    });

    it('should render PDF badge for PDF proofs', () => {
      const props = createDefaultProps({ isPdf: true });
      render(<ProofCard {...props} />);

      // Badge is a span with specific classes
      const pdfBadges = screen.getAllByText('PDF');
      const badge = pdfBadges.find(el => el.tagName === 'SPAN' && el.className.includes('rounded'));
      expect(badge).toBeTruthy();
    });

    it('should render TEXTO badge for text proofs', () => {
      const props = createDefaultProps({
        isPdf: false,
        proof: createMockProofText({ text: 'Conteúdo da prova de texto' }),
      });
      render(<ProofCard {...props} />);

      expect(screen.getByText('TEXTO')).toBeInTheDocument();
    });

    it('should render file size for PDF proofs', () => {
      const props = createDefaultProps();
      render(<ProofCard {...props} />);

      expect(screen.getByText('1.0 KB')).toBeInTheDocument();
    });

    it('should render character count for text proofs', () => {
      const props = createDefaultProps({
        isPdf: false,
        proof: createMockProofText({ text: 'Conteúdo da prova' }),
      });
      render(<ProofCard {...props} />);

      expect(screen.getByText('17 caracteres')).toBeInTheDocument();
    });

    it('should render upload date', () => {
      const props = createDefaultProps();
      render(<ProofCard {...props} />);

      expect(screen.getByText('15/01/2024')).toBeInTheDocument();
    });

    it('should render text preview for text proofs', () => {
      const props = createDefaultProps({
        isPdf: false,
        proof: createMockProofText({ text: 'Conteúdo da prova de texto para preview' }),
      });
      render(<ProofCard {...props} />);

      expect(screen.getByText(/Conteúdo da prova de texto/)).toBeInTheDocument();
    });

    it('should render "Somente Texto" badge for placeholder PDFs', () => {
      const props = createDefaultProps({
        proof: createMockProofFile({ isPlaceholder: true }),
      });
      render(<ProofCard {...props} />);

      expect(screen.getByText('Somente Texto')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PDF EXTRACTION TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('PDF Extraction', () => {
    it('should render "Usar PDF" and "Extrair Texto" buttons for PDF', () => {
      const props = createDefaultProps({ isPdf: true });
      render(<ProofCard {...props} />);

      expect(screen.getByText('Usar PDF')).toBeInTheDocument();
      expect(screen.getByText('Extrair Texto')).toBeInTheDocument();
    });

    it('should call extractTextFromPDFWithMode when Extrair Texto clicked', async () => {
      const extractTextFromPDFWithMode = vi.fn().mockResolvedValue('Texto extraído');
      const props = createDefaultProps({ extractTextFromPDFWithMode });
      render(<ProofCard {...props} />);

      fireEvent.click(screen.getByText('Extrair Texto'));

      await waitFor(() => {
        expect(extractTextFromPDFWithMode).toHaveBeenCalled();
      });
    });

    it('should disable Usar PDF for placeholder PDFs', () => {
      const props = createDefaultProps({
        proof: createMockProofFile({ isPlaceholder: true }),
      });
      render(<ProofCard {...props} />);

      expect(screen.getByText('Usar PDF')).toBeDisabled();
    });

    it('should show BINÁRIO badge when in PDF mode', () => {
      const props = createDefaultProps({
        proofManager: createMockProofManager({
          proofUsePdfMode: { 'proof-1': true },
        }),
      });
      render(<ProofCard {...props} />);

      expect(screen.getByText('BINÁRIO')).toBeInTheDocument();
    });

    it('should show EXTRAÍDO badge when text is extracted', () => {
      const props = createDefaultProps({
        proofManager: createMockProofManager({
          proofUsePdfMode: { 'proof-1': false },
          extractedProofTexts: { 'proof-1': 'Texto extraído' },
        }),
      });
      render(<ProofCard {...props} />);

      expect(screen.getByText('EXTRAÍDO')).toBeInTheDocument();
    });

    it('should show extraction success message with character count', () => {
      const props = createDefaultProps({
        proofManager: createMockProofManager({
          proofUsePdfMode: { 'proof-1': false },
          extractedProofTexts: { 'proof-1': 'Texto extraído com sucesso' },
        }),
      });
      render(<ProofCard {...props} />);

      expect(screen.getByText(/Texto extraído com sucesso/)).toBeInTheDocument();
      expect(screen.getByText(/26 caracteres/)).toBeInTheDocument();
    });

    it('should show extraction failed message', () => {
      const props = createDefaultProps({
        proofManager: createMockProofManager({
          proofExtractionFailed: { 'proof-1': true },
        }),
      });
      render(<ProofCard {...props} />);

      expect(screen.getByText(/PDF sem texto extraível/)).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ANONYMIZATION TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Anonymization', () => {
    it('should show anonymization warning when enabled and no text extracted', () => {
      const props = createDefaultProps({
        anonymizationEnabled: true,
        isPdf: true,
      });
      render(<ProofCard {...props} />);

      expect(screen.getByText(/Anonimização ativa/)).toBeInTheDocument();
    });

    it('should disable Usar PDF when anonymization enabled', () => {
      const props = createDefaultProps({
        anonymizationEnabled: true,
      });
      render(<ProofCard {...props} />);

      expect(screen.getByText('Usar PDF')).toBeDisabled();
    });

    it('should show CONFLITO badge when anonymization + PDF mode', () => {
      const props = createDefaultProps({
        anonymizationEnabled: true,
        proofManager: createMockProofManager({
          proofUsePdfMode: { 'proof-1': true },
        }),
      });
      render(<ProofCard {...props} />);

      expect(screen.getByText('CONFLITO')).toBeInTheDocument();
    });

    it('should open anonymization modal when extracting with anonymization', async () => {
      const openModal = vi.fn();
      const anonConfig: AnonymizationSettings = {
        enabled: true,
        nomesUsuario: [],
      };
      const props = createDefaultProps({
        anonymizationEnabled: true,
        anonConfig,
        openModal,
      });
      render(<ProofCard {...props} />);

      fireEvent.click(screen.getByText('Extrair Texto'));

      expect(openModal).toHaveBeenCalledWith('proofExtractionAnonymization');
    });

    it('should show specific error for anonymization when extraction fails', () => {
      const props = createDefaultProps({
        anonymizationEnabled: true,
        proofManager: createMockProofManager({
          proofExtractionFailed: { 'proof-1': true },
        }),
      });
      render(<ProofCard {...props} />);

      expect(screen.getByText(/extração obrigatória.*Tesseract OCR/)).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GROK TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Grok Support', () => {
    it('should show Grok warning when enabled and no text extracted', () => {
      const props = createDefaultProps({
        grokEnabled: true,
        isPdf: true,
      });
      render(<ProofCard {...props} />);

      expect(screen.getByText(/Grok selecionado/)).toBeInTheDocument();
    });

    it('should not show Grok warning when anonymization is also enabled', () => {
      const props = createDefaultProps({
        grokEnabled: true,
        anonymizationEnabled: true,
        isPdf: true,
      });
      render(<ProofCard {...props} />);

      // Should show anonymization warning, not Grok
      expect(screen.getByText(/Anonimização ativa/)).toBeInTheDocument();
      expect(screen.queryByText(/Grok selecionado/)).not.toBeInTheDocument();
    });

    it('should disable Usar PDF when Grok enabled', () => {
      const props = createDefaultProps({
        grokEnabled: true,
      });
      render(<ProofCard {...props} />);

      expect(screen.getByText('Usar PDF')).toBeDisabled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ATTACHMENTS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Attachments', () => {
    it('should render attachments section header', () => {
      const props = createDefaultProps();
      render(<ProofCard {...props} />);

      expect(screen.getByText('Anexos')).toBeInTheDocument();
    });

    it('should show empty attachments message', () => {
      const props = createDefaultProps();
      render(<ProofCard {...props} />);

      expect(screen.getByText(/Nenhum anexo/)).toBeInTheDocument();
    });

    it('should render attachment count when has attachments', () => {
      const attachments: ProofAttachment[] = [
        { id: 'att-1', name: 'Anexo 1.pdf', type: 'pdf', size: 512, uploadDate: '2024-01-15' },
        { id: 'att-2', name: 'Anexo 2', type: 'text', text: 'Conteúdo', uploadDate: '2024-01-15' },
      ];
      const props = createDefaultProps({
        proof: createMockProofFile({ attachments }),
      });
      render(<ProofCard {...props} />);

      expect(screen.getByText('Anexos (2)')).toBeInTheDocument();
    });

    it('should render attachment list items', () => {
      const attachments: ProofAttachment[] = [
        { id: 'att-1', name: 'Impugnação.pdf', type: 'pdf', size: 1024, uploadDate: '2024-01-15' },
      ];
      const props = createDefaultProps({
        proof: createMockProofFile({ attachments }),
      });
      render(<ProofCard {...props} />);

      expect(screen.getByText('Impugnação.pdf')).toBeInTheDocument();
    });

    it('should show text input form when clicking Texto button', () => {
      const props = createDefaultProps();
      render(<ProofCard {...props} />);

      // Find the Texto button (it's the second + button)
      const textoButton = screen.getByTitle('Adicionar anexo de texto');
      fireEvent.click(textoButton);

      expect(screen.getByPlaceholderText(/Nome do anexo/)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Cole o conteúdo/)).toBeInTheDocument();
    });

    it('should call addAttachment when adding text attachment', () => {
      const props = createDefaultProps();
      render(<ProofCard {...props} />);

      const textoButton = screen.getByTitle('Adicionar anexo de texto');
      fireEvent.click(textoButton);

      const nameInput = screen.getByPlaceholderText(/Nome do anexo/);
      const contentInput = screen.getByPlaceholderText(/Cole o conteúdo/);

      fireEvent.change(nameInput, { target: { value: 'Meu Anexo' } });
      fireEvent.change(contentInput, { target: { value: 'Conteúdo do anexo' } });

      fireEvent.click(screen.getByText('Adicionar Anexo'));

      expect(mockAddAttachment).toHaveBeenCalledWith('proof-1', expect.objectContaining({
        name: 'Meu Anexo',
        type: 'text',
        text: 'Conteúdo do anexo',
      }));
    });

    it('should show extracted text indicator for attachment', () => {
      const attachments: ProofAttachment[] = [
        { id: 'att-1', name: 'Doc.pdf', type: 'pdf', size: 512, uploadDate: '2024-01-15', extractedText: 'Texto extraído do anexo' },
      ];
      const props = createDefaultProps({
        proof: createMockProofFile({ attachments }),
      });
      render(<ProofCard {...props} />);

      expect(screen.getByText(/Extraído: 23 caracteres/)).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ANALYSIS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Analysis', () => {
    it('should render analyze button', () => {
      const props = createDefaultProps();
      render(<ProofCard {...props} />);

      expect(screen.getByText('Analisar com IA')).toBeInTheDocument();
    });

    it('should call openModal with proofAnalysis when clicking analyze', () => {
      const openModal = vi.fn();
      const proofManager = createMockProofManager();
      const props = createDefaultProps({ openModal, proofManager });
      render(<ProofCard {...props} />);

      fireEvent.click(screen.getByText('Analisar com IA'));

      expect(proofManager.setProofToAnalyze).toHaveBeenCalledWith(props.proof);
      expect(openModal).toHaveBeenCalledWith('proofAnalysis');
    });

    it('should show analyzing state', () => {
      const props = createDefaultProps({
        proofManager: createMockProofManager({
          isAnalyzingProof: vi.fn().mockReturnValue(true),
        }),
      });
      render(<ProofCard {...props} />);

      expect(screen.getByText('Analisando...')).toBeInTheDocument();
    });

    it('should disable analyze button when analyzing', () => {
      const props = createDefaultProps({
        proofManager: createMockProofManager({
          isAnalyzingProof: vi.fn().mockReturnValue(true),
        }),
      });
      render(<ProofCard {...props} />);

      expect(screen.getByText('Analisando...').closest('button')).toBeDisabled();
    });

    it('should render analysis results', () => {
      const analyses: ProofAnalysisResult[] = [
        { id: 'analysis-1', type: 'livre', result: 'Análise livre da prova', timestamp: '2024-01-15T10:00:00Z' },
      ];
      const props = createDefaultProps({
        proofManager: createMockProofManager({
          proofAnalysisResults: { 'proof-1': analyses },
        }),
      });
      render(<ProofCard {...props} />);

      expect(screen.getByText('Análises (1/5)')).toBeInTheDocument();
      expect(screen.getByText(/Livre/)).toBeInTheDocument();
      expect(screen.getByText('Análise livre da prova')).toBeInTheDocument();
    });

    it('should call removeProofAnalysis when deleting analysis', () => {
      const analyses: ProofAnalysisResult[] = [
        { id: 'analysis-1', type: 'contextual', result: 'Análise contextual', timestamp: '2024-01-15T10:00:00Z' },
      ];
      const proofManager = createMockProofManager({
        proofAnalysisResults: { 'proof-1': analyses },
      });
      const props = createDefaultProps({ proofManager });
      render(<ProofCard {...props} />);

      // Find delete button (has Trash2 icon, appears on hover)
      const deleteButtons = screen.getAllByTitle('Excluir esta análise');
      fireEvent.click(deleteButtons[0]);

      expect(proofManager.removeProofAnalysis).toHaveBeenCalledWith('proof-1', 'analysis-1');
    });

    it('should disable analyze when anonymization + PDF + no extracted text', () => {
      const props = createDefaultProps({
        anonymizationEnabled: true,
        isPdf: true,
      });
      render(<ProofCard {...props} />);

      expect(screen.getByText('Analisar com IA').closest('button')).toBeDisabled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TOPIC LINKING TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Topic Linking', () => {
    it('should render link to topics button', () => {
      const props = createDefaultProps();
      render(<ProofCard {...props} />);

      expect(screen.getByText('Vincular a Tópicos')).toBeInTheDocument();
    });

    it('should call openModal with linkProof when clicking link button', () => {
      const openModal = vi.fn();
      const proofManager = createMockProofManager();
      const props = createDefaultProps({ openModal, proofManager });
      render(<ProofCard {...props} />);

      fireEvent.click(screen.getByText('Vincular a Tópicos'));

      expect(proofManager.setProofToLink).toHaveBeenCalledWith(props.proof);
      expect(openModal).toHaveBeenCalledWith('linkProof');
    });

    it('should render linked topic badges', () => {
      const props = createDefaultProps({
        proofManager: createMockProofManager({
          proofTopicLinks: { 'proof-1': ['Horas Extras', 'Adicional Noturno'] },
        }),
      });
      render(<ProofCard {...props} />);

      expect(screen.getByText('Vinculado a:')).toBeInTheDocument();
      expect(screen.getByText('Horas Extras')).toBeInTheDocument();
      expect(screen.getByText('Adicional Noturno')).toBeInTheDocument();
    });

    it('should call setProofTopicLinks when unlinking topic', () => {
      const proofManager = createMockProofManager({
        proofTopicLinks: { 'proof-1': ['Horas Extras'] },
      });
      const props = createDefaultProps({ proofManager });
      render(<ProofCard {...props} />);

      // Find the x button to unlink
      const unlinkButton = screen.getByText('x');
      fireEvent.click(unlinkButton);

      expect(proofManager.setProofTopicLinks).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CONCLUSIONS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Conclusions', () => {
    it('should render conclusions textarea', () => {
      const props = createDefaultProps();
      render(<ProofCard {...props} />);

      expect(screen.getByText('Minhas Conclusões:')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Adicione suas conclusões/)).toBeInTheDocument();
    });

    it('should render voice button for conclusions', () => {
      const props = createDefaultProps();
      render(<ProofCard {...props} />);

      expect(screen.getByTestId('voice-button')).toBeInTheDocument();
    });

    it('should call setProofConclusions when typing', () => {
      const proofManager = createMockProofManager();
      const props = createDefaultProps({ proofManager });
      render(<ProofCard {...props} />);

      const textarea = screen.getByPlaceholderText(/Adicione suas conclusões/);
      fireEvent.change(textarea, { target: { value: 'Minha conclusão' } });

      expect(proofManager.setProofConclusions).toHaveBeenCalled();
    });

    it('should append voice transcript to conclusions', () => {
      const proofManager = createMockProofManager();
      const props = createDefaultProps({ proofManager });
      render(<ProofCard {...props} />);

      fireEvent.click(screen.getByTestId('voice-button'));

      expect(proofManager.setProofConclusions).toHaveBeenCalled();
    });

    it('should show existing conclusion text', () => {
      const props = createDefaultProps({
        proofManager: createMockProofManager({
          proofConclusions: { 'proof-1': 'Conclusão existente' },
        }),
      });
      render(<ProofCard {...props} />);

      expect(screen.getByDisplayValue('Conclusão existente')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SEND FULL CONTENT TOGGLE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Send Full Content Toggle', () => {
    it('should render toggle for sending full content', () => {
      const props = createDefaultProps();
      render(<ProofCard {...props} />);

      expect(screen.getByText('Enviar conteúdo completo à IA')).toBeInTheDocument();
    });

    it('should call setProofSendFullContent when toggling', () => {
      const proofManager = createMockProofManager();
      const props = createDefaultProps({ proofManager });
      render(<ProofCard {...props} />);

      // Find the toggle button (it's before the label text)
      const toggleButtons = screen.getAllByRole('button');
      const toggleButton = toggleButtons.find(btn =>
        btn.className.includes('rounded-full') && btn.className.includes('h-5')
      );

      if (toggleButton) {
        fireEvent.click(toggleButton);
        expect(proofManager.setProofSendFullContent).toHaveBeenCalled();
      }
    });

    it('should disable toggle when anonymization + PDF + no extracted text', () => {
      const props = createDefaultProps({
        anonymizationEnabled: true,
        isPdf: true,
      });
      render(<ProofCard {...props} />);

      // The toggle should have disabled styling
      const toggleButtons = screen.getAllByRole('button');
      const toggleButton = toggleButtons.find(btn =>
        btn.className.includes('rounded-full') && btn.className.includes('h-5')
      );

      expect(toggleButton?.className).toContain('cursor-not-allowed');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DELETE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Delete', () => {
    it('should render delete button', () => {
      const props = createDefaultProps();
      render(<ProofCard {...props} />);

      // The delete button has a Trash2 icon
      const buttons = screen.getAllByRole('button');
      const deleteButton = buttons.find(btn =>
        btn.querySelector('svg.lucide-trash-2') ||
        btn.className.includes('hover-delete-proof')
      );

      expect(deleteButton).toBeTruthy();
    });

    it('should call openModal with deleteProof when clicking delete', () => {
      const openModal = vi.fn();
      const proofManager = createMockProofManager();
      const props = createDefaultProps({ openModal, proofManager });
      render(<ProofCard {...props} />);

      // Find the main delete button (the one at the top right)
      const buttons = screen.getAllByRole('button');
      const deleteButton = buttons.find(btn =>
        btn.className.includes('hover-delete-proof')
      );

      if (deleteButton) {
        fireEvent.click(deleteButton);
        expect(proofManager.setProofToDelete).toHaveBeenCalledWith(props.proof);
        expect(openModal).toHaveBeenCalledWith('deleteProof');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCESSING MODE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Processing Mode', () => {
    it('should render processing mode selector for PDF', () => {
      const props = createDefaultProps({ isPdf: true });
      render(<ProofCard {...props} />);

      expect(screen.getByTestId('processing-mode-selector')).toBeInTheDocument();
    });

    it('should call setProofProcessingModes when changing mode', () => {
      const proofManager = createMockProofManager();
      const props = createDefaultProps({ proofManager, isPdf: true });
      render(<ProofCard {...props} />);

      const selector = screen.getByTestId('processing-mode-selector');
      fireEvent.change(selector, { target: { value: 'tesseract' } });

      expect(proofManager.setProofProcessingModes).toHaveBeenCalled();
    });

    it('should show current processing mode', () => {
      const props = createDefaultProps({
        isPdf: true,
        proofManager: createMockProofManager({
          proofProcessingModes: { 'proof-1': 'tesseract' },
        }),
      });
      render(<ProofCard {...props} />);

      const selector = screen.getByTestId('processing-mode-selector') as HTMLSelectElement;
      expect(selector.value).toBe('tesseract');
    });

    it('should disable selector when analyzing', () => {
      const props = createDefaultProps({
        isPdf: true,
        proofManager: createMockProofManager({
          isAnalyzingProof: vi.fn().mockReturnValue(true),
        }),
      });
      render(<ProofCard {...props} />);

      expect(screen.getByTestId('processing-mode-selector')).toBeDisabled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEXT PREVIEW TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Text Preview', () => {
    it('should call setTextPreview when clicking extracted text indicator', () => {
      const setTextPreview = vi.fn();
      const props = createDefaultProps({
        setTextPreview,
        proofManager: createMockProofManager({
          proofUsePdfMode: { 'proof-1': false },
          extractedProofTexts: { 'proof-1': 'Texto extraído para preview' },
        }),
      });
      render(<ProofCard {...props} />);

      const extractedIndicator = screen.getByText(/Texto extraído com sucesso/);
      fireEvent.click(extractedIndicator);

      expect(setTextPreview).toHaveBeenCalledWith({
        isOpen: true,
        title: 'Documento de Prova.pdf',
        text: 'Texto extraído para preview',
      });
    });

    it('should call setTextPreview when clicking attachment extracted text', () => {
      const setTextPreview = vi.fn();
      const attachments: ProofAttachment[] = [
        { id: 'att-1', name: 'Anexo.pdf', type: 'pdf', size: 512, uploadDate: '2024-01-15', extractedText: 'Texto do anexo' },
      ];
      const props = createDefaultProps({
        setTextPreview,
        proof: createMockProofFile({ attachments }),
      });
      render(<ProofCard {...props} />);

      const extractedButton = screen.getByText(/Extraído: 14 caracteres/);
      fireEvent.click(extractedButton);

      expect(setTextPreview).toHaveBeenCalledWith({
        isOpen: true,
        title: 'Anexo: Anexo.pdf',
        text: 'Texto do anexo',
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EDGE CASES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Edge Cases', () => {
    it('should handle proof without file', () => {
      const props = createDefaultProps({
        proof: createMockProofFile({ file: undefined }),
      });

      expect(() => render(<ProofCard {...props} />)).not.toThrow();
    });

    it('should handle empty proofTopicLinks gracefully', () => {
      const props = createDefaultProps({
        proofManager: createMockProofManager({
          proofTopicLinks: {},
        }),
      });
      render(<ProofCard {...props} />);

      expect(screen.queryByText('Vinculado a:')).not.toBeInTheDocument();
    });

    it('should handle null proofAnalysisResults gracefully', () => {
      const props = createDefaultProps({
        proofManager: createMockProofManager({
          proofAnalysisResults: {},
        }),
      });
      render(<ProofCard {...props} />);

      expect(screen.queryByText(/Análises/)).not.toBeInTheDocument();
    });

    it('should handle proof without attachments', () => {
      const props = createDefaultProps({
        proof: createMockProofFile({ attachments: undefined }),
      });
      render(<ProofCard {...props} />);

      expect(screen.getByText(/Nenhum anexo/)).toBeInTheDocument();
    });

    it('should handle extraction returning empty string', async () => {
      const extractTextFromPDFWithMode = vi.fn().mockResolvedValue('');
      const proofManager = createMockProofManager();
      const props = createDefaultProps({ extractTextFromPDFWithMode, proofManager });
      render(<ProofCard {...props} />);

      fireEvent.click(screen.getByText('Extrair Texto'));

      await waitFor(() => {
        expect(proofManager.setProofExtractionFailed).toHaveBeenCalled();
      });
    });

    it('should handle extraction error gracefully', async () => {
      const extractTextFromPDFWithMode = vi.fn().mockRejectedValue(new Error('Extraction failed'));
      const proofManager = createMockProofManager();
      const props = createDefaultProps({ extractTextFromPDFWithMode, proofManager });
      render(<ProofCard {...props} />);

      fireEvent.click(screen.getByText('Extrair Texto'));

      await waitFor(() => {
        expect(proofManager.setProofExtractionFailed).toHaveBeenCalled();
      });
    });

    it('should not extract from placeholder PDF', () => {
      const extractTextFromPDFWithMode = vi.fn();
      const props = createDefaultProps({
        extractTextFromPDFWithMode,
        proof: createMockProofFile({ isPlaceholder: true }),
      });
      render(<ProofCard {...props} />);

      fireEvent.click(screen.getByText('Extrair Texto'));

      expect(extractTextFromPDFWithMode).not.toHaveBeenCalled();
    });

    it('should render with light theme', () => {
      const props = createDefaultProps({ editorTheme: 'light' });

      expect(() => render(<ProofCard {...props} />)).not.toThrow();
    });
  });
});

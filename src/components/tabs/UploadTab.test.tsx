/**
 * @file UploadTab.test.tsx
 * @description Testes de regressão para o componente UploadTab
 * @version 1.38.40
 *
 * Atualizado para FASE 3: UploadTab agora acessa useDocumentsStore e useUIStore diretamente.
 *
 * Cobre todas as ações do usuário:
 * 1. Upload de PDFs (petição, contestação, complementares)
 * 2. Colar texto (paste areas)
 * 3. Remoção de arquivos/textos
 * 4. Seleção de modo de processamento
 * 5. Botão de análise
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UploadTab } from './UploadTab';
import type { UploadTabProps, UploadedFile, PastedText, AnalyzedDocuments, ProcessingMode } from '../../types';

// Mock useDocumentsStore
const mockDocumentsStore = {
  peticaoFiles: [] as UploadedFile[],
  contestacaoFiles: [] as UploadedFile[],
  complementaryFiles: [] as UploadedFile[],
  pastedPeticaoTexts: [] as PastedText[],
  pastedContestacaoTexts: [] as PastedText[],
  pastedComplementaryTexts: [] as PastedText[],
  analyzedDocuments: {
    peticoes: [],
    peticoesText: [],
    contestacoes: [],
    contestacoesText: [],
    complementares: [],
    complementaresText: [],
  } as unknown as AnalyzedDocuments,
  setAnalyzedDocuments: vi.fn(),
  documentProcessingModes: { peticoes: [] as string[], contestacoes: [] as string[], complementares: [] as string[] },
  setDocumentProcessingModes: vi.fn(),
  setPeticaoMode: vi.fn(),
  setContestacaoMode: vi.fn(),
  setComplementarMode: vi.fn(),
  showPasteArea: { peticao: false, contestacao: false, complementary: false } as Record<string, boolean>,
  setShowPasteArea: vi.fn(),
  handlePastedText: vi.fn(),
  removePastedText: vi.fn(),
  analyzing: false,
  setContestacaoFiles: vi.fn(),
  setComplementaryFiles: vi.fn(),
};
vi.mock('../../stores/useDocumentsStore', () => ({
  useDocumentsStore: (selector: (s: typeof mockDocumentsStore) => unknown) => selector(mockDocumentsStore),
}));

// Mock useUIStore
const mockUIStore = {
  setTextPreview: vi.fn(),
};
vi.mock('../../stores/useUIStore', () => ({
  useUIStore: (selector: (s: typeof mockUIStore) => unknown) => selector(mockUIStore),
}));

// Mock removePdfFromIndexedDB
const mockRemovePdfFromIndexedDB = vi.fn().mockResolvedValue(undefined);
vi.mock('../../hooks/useLocalStorage', () => ({
  removePdfFromIndexedDB: (...args: unknown[]) => mockRemovePdfFromIndexedDB(...args),
}));

// Mock ProcessingModeSelector
vi.mock('../ui', () => ({
  ProcessingModeSelector: ({ value, onChange }: { value: string; onChange: (mode: string) => void }) => (
    <select
      data-testid="processing-mode-selector"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="pdfjs">PDF.js</option>
      <option value="ocr">OCR</option>
      <option value="tesseract">Tesseract</option>
    </select>
  ),
}));

// Mock CSS
vi.mock('../../constants/styles', () => ({
  CSS: {
    textMuted: 'text-muted',
  },
}));

describe('UploadTab', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // DEFAULT PROPS FACTORY
  // ═══════════════════════════════════════════════════════════════════════════

  const createMockProps = (overrides: Partial<UploadTabProps> = {}): UploadTabProps => ({
    getDefaultProcessingMode: vi.fn((): ProcessingMode => 'pdfjs'),
    processoNumero: '',
    setProcessoNumero: vi.fn(),
    handleUploadPeticao: vi.fn(),
    handleUploadContestacao: vi.fn(),
    handleUploadComplementary: vi.fn(),
    removePeticaoFile: vi.fn(),
    handleAnalyzeDocuments: vi.fn(),
    aiIntegration: {
      aiSettings: { provider: 'claude', anonymization: { enabled: false } },
    },
    documentServices: {
      autoDetectProcessoNumero: vi.fn().mockResolvedValue(null),
    },
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store mocks
    mockDocumentsStore.peticaoFiles = [];
    mockDocumentsStore.contestacaoFiles = [];
    mockDocumentsStore.complementaryFiles = [];
    mockDocumentsStore.pastedPeticaoTexts = [];
    mockDocumentsStore.pastedContestacaoTexts = [];
    mockDocumentsStore.pastedComplementaryTexts = [];
    mockDocumentsStore.analyzedDocuments = {
      peticoes: [],
      peticoesText: [],
      contestacoes: [],
      contestacoesText: [],
      complementares: [],
      complementaresText: [],
    } as unknown as AnalyzedDocuments;
    mockDocumentsStore.setAnalyzedDocuments = vi.fn();
    mockDocumentsStore.documentProcessingModes = { peticoes: [], contestacoes: [], complementares: [] };
    mockDocumentsStore.setDocumentProcessingModes = vi.fn();
    mockDocumentsStore.setPeticaoMode = vi.fn();
    mockDocumentsStore.setContestacaoMode = vi.fn();
    mockDocumentsStore.setComplementarMode = vi.fn();
    mockDocumentsStore.showPasteArea = { peticao: false, contestacao: false, complementary: false };
    mockDocumentsStore.setShowPasteArea = vi.fn();
    mockDocumentsStore.handlePastedText = vi.fn();
    mockDocumentsStore.removePastedText = vi.fn();
    mockDocumentsStore.analyzing = false;
    mockDocumentsStore.setContestacaoFiles = vi.fn();
    mockDocumentsStore.setComplementaryFiles = vi.fn();
    mockUIStore.setTextPreview = vi.fn();
    mockRemovePdfFromIndexedDB.mockClear().mockResolvedValue(undefined);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERING TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Rendering', () => {
    it('should render all three upload sections', () => {
      const props = createMockProps();
      render(<UploadTab {...props} />);

      expect(screen.getByText(/Petição Inicial \/ Emendas/i)).toBeInTheDocument();
      expect(screen.getByText(/Contestações \(Opcional/i)).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Documentos Complementares/i })).toBeInTheDocument();
    });

    it('should show "Analisar Documentos" button', () => {
      const props = createMockProps();
      render(<UploadTab {...props} />);

      expect(screen.getByText(/Analisar Documentos/i)).toBeInTheDocument();
    });

    it('should show paste text options for each section', () => {
      const props = createMockProps();
      render(<UploadTab {...props} />);

      const pasteButtons = screen.getAllByText(/Colar texto/i);
      expect(pasteButtons.length).toBeGreaterThanOrEqual(3);
    });

    it('should show file count when files are uploaded', () => {
      const mockFile: UploadedFile = { id: '1', name: 'test.pdf', file: new File([''], 'test.pdf') };
      mockDocumentsStore.peticaoFiles = [mockFile];
      const props = createMockProps();
      render(<UploadTab {...props} />);

      expect(screen.getByText(/1 documento\(s\) carregado\(s\)/i)).toBeInTheDocument();
    });

    it('should show multiple files count correctly', () => {
      const mockFiles: UploadedFile[] = [
        { id: '1', name: 'test1.pdf', file: new File([''], 'test1.pdf') },
        { id: '2', name: 'test2.pdf', file: new File([''], 'test2.pdf') },
        { id: '3', name: 'test3.pdf', file: new File([''], 'test3.pdf') },
      ];
      mockDocumentsStore.peticaoFiles = mockFiles;
      const props = createMockProps();
      render(<UploadTab {...props} />);

      expect(screen.getByText(/3 documento\(s\) carregado\(s\)/i)).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PDF UPLOAD TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('PDF Upload', () => {
    it('should call handleUploadPeticao when petição file is selected', async () => {
      const handleUploadPeticao = vi.fn();
      const props = createMockProps({ handleUploadPeticao });
      render(<UploadTab {...props} />);

      const fileInput = document.getElementById('peticao') as HTMLInputElement;
      const mockFile = new File(['test content'], 'peticao.pdf', { type: 'application/pdf' });

      Object.defineProperty(fileInput, 'files', { value: [mockFile] });
      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(handleUploadPeticao).toHaveBeenCalledWith([mockFile]);
      });
    });

    it('should call handleUploadContestacao when contestação file is selected', async () => {
      const handleUploadContestacao = vi.fn();
      const props = createMockProps({ handleUploadContestacao });
      render(<UploadTab {...props} />);

      const fileInput = document.getElementById('contestacao') as HTMLInputElement;
      const mockFile = new File(['test content'], 'contestacao.pdf', { type: 'application/pdf' });

      Object.defineProperty(fileInput, 'files', { value: [mockFile] });
      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(handleUploadContestacao).toHaveBeenCalledWith([mockFile]);
      });
    });

    it('should call handleUploadComplementary when complementary file is selected', async () => {
      const handleUploadComplementary = vi.fn();
      const props = createMockProps({ handleUploadComplementary });
      render(<UploadTab {...props} />);

      const fileInput = document.getElementById('complementary') as HTMLInputElement;
      const mockFile = new File(['test content'], 'complementar.pdf', { type: 'application/pdf' });

      Object.defineProperty(fileInput, 'files', { value: [mockFile] });
      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(handleUploadComplementary).toHaveBeenCalledWith([mockFile]);
      });
    });

    it('should set default processing mode on upload', async () => {
      const props = createMockProps();
      render(<UploadTab {...props} />);

      const fileInput = document.getElementById('peticao') as HTMLInputElement;
      const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });

      Object.defineProperty(fileInput, 'files', { value: [mockFile] });
      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(mockDocumentsStore.setDocumentProcessingModes).toHaveBeenCalled();
      });
    });

    it('should attempt to detect processo number on first upload', async () => {
      const autoDetectProcessoNumero = vi.fn().mockResolvedValue('0001234-56.2024.5.00.0001');
      const setProcessoNumero = vi.fn();
      const props = createMockProps({
        processoNumero: '',
        documentServices: { autoDetectProcessoNumero },
        setProcessoNumero,
      });
      render(<UploadTab {...props} />);

      const fileInput = document.getElementById('peticao') as HTMLInputElement;
      const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });

      Object.defineProperty(fileInput, 'files', { value: [mockFile] });
      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(autoDetectProcessoNumero).toHaveBeenCalled();
      });
    });

    it('should NOT detect processo number if already set', async () => {
      const autoDetectProcessoNumero = vi.fn();
      const props = createMockProps({
        processoNumero: '0001234-56.2024.5.00.0001',
        documentServices: { autoDetectProcessoNumero },
      });
      render(<UploadTab {...props} />);

      const fileInput = document.getElementById('peticao') as HTMLInputElement;
      const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });

      Object.defineProperty(fileInput, 'files', { value: [mockFile] });
      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(autoDetectProcessoNumero).not.toHaveBeenCalled();
      });
    });

    it('should accept multiple files in single upload', async () => {
      const handleUploadPeticao = vi.fn();
      const props = createMockProps({ handleUploadPeticao });
      render(<UploadTab {...props} />);

      const fileInput = document.getElementById('peticao') as HTMLInputElement;
      const mockFiles = [
        new File(['test1'], 'peticao1.pdf', { type: 'application/pdf' }),
        new File(['test2'], 'peticao2.pdf', { type: 'application/pdf' }),
        new File(['test3'], 'peticao3.pdf', { type: 'application/pdf' }),
      ];

      Object.defineProperty(fileInput, 'files', { value: mockFiles });
      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(handleUploadPeticao).toHaveBeenCalledWith(mockFiles);
      });
    });

    it('should not process upload if no files selected', async () => {
      const handleUploadPeticao = vi.fn();
      const props = createMockProps({ handleUploadPeticao });
      render(<UploadTab {...props} />);

      const fileInput = document.getElementById('peticao') as HTMLInputElement;

      Object.defineProperty(fileInput, 'files', { value: [] });
      fireEvent.change(fileInput);

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(handleUploadPeticao).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEXT PASTE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Text Paste', () => {
    it('should show paste area when "Colar texto" is clicked for petição', () => {
      const props = createMockProps();
      render(<UploadTab {...props} />);

      const pasteButtons = screen.getAllByText(/Colar texto/i);
      fireEvent.click(pasteButtons[0]);

      expect(mockDocumentsStore.setShowPasteArea).toHaveBeenCalled();
    });

    it('should render textarea when paste area is open', () => {
      mockDocumentsStore.showPasteArea = { peticao: true, contestacao: false, complementary: false };
      const props = createMockProps();
      render(<UploadTab {...props} />);

      expect(screen.getByPlaceholderText(/Cole o texto aqui/i)).toBeInTheDocument();
    });

    it('should call handlePastedText on paste event', () => {
      mockDocumentsStore.showPasteArea = { peticao: true, contestacao: false, complementary: false };
      const props = createMockProps();
      render(<UploadTab {...props} />);

      const textarea = screen.getByPlaceholderText(/Cole o texto aqui/i);

      const pasteEvent = {
        clipboardData: {
          getData: () => 'Texto colado da petição',
        },
      };
      fireEvent.paste(textarea, pasteEvent);

      expect(mockDocumentsStore.handlePastedText).toHaveBeenCalledWith('Texto colado da petição', 'peticao');
    });

    it('should have confirm and cancel buttons in paste area', () => {
      mockDocumentsStore.showPasteArea = { peticao: true, contestacao: false, complementary: false };
      const props = createMockProps();
      render(<UploadTab {...props} />);

      expect(screen.getByText('Confirmar')).toBeInTheDocument();
      expect(screen.getByText('Cancelar')).toBeInTheDocument();
    });

    it('should close paste area when cancel is clicked', () => {
      mockDocumentsStore.showPasteArea = { peticao: true, contestacao: false, complementary: false };
      const props = createMockProps();
      render(<UploadTab {...props} />);

      const cancelButton = screen.getByText('Cancelar');
      fireEvent.click(cancelButton);

      expect(mockDocumentsStore.setShowPasteArea).toHaveBeenCalledWith(
        expect.objectContaining({ peticao: false })
      );
    });

    it('should show pasted text in the documents list', () => {
      const pastedText: PastedText = { id: 'paste-1', name: 'Petição colada', text: 'Conteúdo da petição' };
      mockDocumentsStore.pastedPeticaoTexts = [pastedText];
      const props = createMockProps();
      render(<UploadTab {...props} />);

      expect(screen.getByText(/Petição colada/i)).toBeInTheDocument();
    });

    it('should show character count for pasted texts', () => {
      const pastedText: PastedText = { id: 'paste-2', name: 'Petição colada', text: 'A'.repeat(5000) };
      mockDocumentsStore.pastedPeticaoTexts = [pastedText];
      const props = createMockProps();
      render(<UploadTab {...props} />);

      expect(screen.getByText(/5\.000 caracteres/i)).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FILE/TEXT REMOVAL TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('File/Text Removal', () => {
    it('should call removePeticaoFile when delete button is clicked', () => {
      const removePeticaoFile = vi.fn();
      const mockFile: UploadedFile = { id: '1', name: 'test.pdf', file: new File([''], 'test.pdf') };
      mockDocumentsStore.peticaoFiles = [mockFile];
      const props = createMockProps({ removePeticaoFile });
      render(<UploadTab {...props} />);

      const deleteButtons = document.querySelectorAll('[title="Remover"]');
      expect(deleteButtons.length).toBeGreaterThan(0);

      fireEvent.click(deleteButtons[0]);
      expect(removePeticaoFile).toHaveBeenCalledWith(0);
    });

    it('should call removePastedText for pasted petição text', () => {
      const pastedText: PastedText = { id: 'paste-3', name: 'Petição colada', text: 'Conteúdo' };
      mockDocumentsStore.pastedPeticaoTexts = [pastedText];
      const props = createMockProps();
      render(<UploadTab {...props} />);

      const deleteButtons = document.querySelectorAll('[title="Remover"]');
      expect(deleteButtons.length).toBeGreaterThan(0);

      fireEvent.click(deleteButtons[0]);
      expect(mockDocumentsStore.removePastedText).toHaveBeenCalledWith('peticao', 0);
    });

    it('should call setContestacaoFiles to remove contestação file', async () => {
      const mockFile: UploadedFile = { id: '1', name: 'contestacao.pdf', file: new File([''], 'contestacao.pdf') };
      mockDocumentsStore.contestacaoFiles = [mockFile];
      const props = createMockProps();
      render(<UploadTab {...props} />);

      const fileNameElement = screen.getByText(/contestacao\.pdf/i);
      const fileRow = fileNameElement.closest('div.flex');
      expect(fileRow).not.toBeNull();

      const deleteButton = fileRow!.querySelector('button');
      expect(deleteButton).not.toBeNull();
      fireEvent.click(deleteButton!);

      await waitFor(() => {
        expect(mockDocumentsStore.setContestacaoFiles).toHaveBeenCalled();
      });
    });

    it('should call setComplementaryFiles to remove complementary file', async () => {
      const mockFile: UploadedFile = { id: '1', name: 'complementar.pdf', file: new File([''], 'complementar.pdf') };
      mockDocumentsStore.complementaryFiles = [mockFile];
      const props = createMockProps();
      render(<UploadTab {...props} />);

      const fileNameElement = screen.getByText(/complementar\.pdf/i);
      const fileRow = fileNameElement.closest('div.flex');
      expect(fileRow).not.toBeNull();

      const deleteButton = fileRow!.querySelector('button');
      expect(deleteButton).not.toBeNull();
      fireEvent.click(deleteButton!);

      await waitFor(() => {
        expect(mockDocumentsStore.setComplementaryFiles).toHaveBeenCalled();
      });
    });

    it('should remove imported PDF from analyzedDocuments', () => {
      mockDocumentsStore.analyzedDocuments = {
        peticoes: [new ArrayBuffer(10)],
        peticoesText: [],
        contestacoes: [],
        contestacoesText: [],
        complementares: [],
        complementaresText: [],
      } as unknown as AnalyzedDocuments;
      const props = createMockProps();
      render(<UploadTab {...props} />);

      const deleteButtons = document.querySelectorAll('[title="Remover"]');
      expect(deleteButtons.length).toBeGreaterThan(0);

      fireEvent.click(deleteButtons[0]);
      expect(mockDocumentsStore.setAnalyzedDocuments).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCESSING MODE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Processing Mode Selection', () => {
    it('should render ProcessingModeSelector for each uploaded file', () => {
      const mockFile: UploadedFile = { id: '1', name: 'test.pdf', file: new File([''], 'test.pdf') };
      mockDocumentsStore.peticaoFiles = [mockFile];
      mockDocumentsStore.documentProcessingModes = { peticoes: ['pdfjs'], contestacoes: [], complementares: [] };
      const props = createMockProps();
      render(<UploadTab {...props} />);

      const selectors = screen.getAllByTestId('processing-mode-selector');
      expect(selectors.length).toBeGreaterThanOrEqual(1);
    });

    it('should call setPeticaoMode when mode changes for petição', () => {
      const mockFile: UploadedFile = { id: '1', name: 'test.pdf', file: new File([''], 'test.pdf') };
      mockDocumentsStore.peticaoFiles = [mockFile];
      mockDocumentsStore.documentProcessingModes = { peticoes: ['pdfjs'], contestacoes: [], complementares: [] };
      const props = createMockProps();
      render(<UploadTab {...props} />);

      const selectors = screen.getAllByTestId('processing-mode-selector');
      fireEvent.change(selectors[0], { target: { value: 'ocr' } });

      expect(mockDocumentsStore.setPeticaoMode).toHaveBeenCalledWith(0, 'ocr');
    });

    it('should call setContestacaoMode when mode changes for contestação', () => {
      const mockFile: UploadedFile = { id: '1', name: 'contestacao.pdf', file: new File([''], 'contestacao.pdf') };
      mockDocumentsStore.contestacaoFiles = [mockFile];
      mockDocumentsStore.documentProcessingModes = { peticoes: [], contestacoes: ['pdfjs'], complementares: [] };
      const props = createMockProps();
      render(<UploadTab {...props} />);

      const selectors = screen.getAllByTestId('processing-mode-selector');
      fireEvent.change(selectors[0], { target: { value: 'tesseract' } });

      expect(mockDocumentsStore.setContestacaoMode).toHaveBeenCalledWith(0, 'tesseract');
    });

    it('should call setComplementarMode when mode changes for complementar', () => {
      const mockFile: UploadedFile = { id: '1', name: 'complementar.pdf', file: new File([''], 'complementar.pdf') };
      mockDocumentsStore.complementaryFiles = [mockFile];
      mockDocumentsStore.documentProcessingModes = { peticoes: [], contestacoes: [], complementares: ['pdfjs'] };
      const props = createMockProps();
      render(<UploadTab {...props} />);

      const selectors = screen.getAllByTestId('processing-mode-selector');
      fireEvent.change(selectors[0], { target: { value: 'ocr' } });

      expect(mockDocumentsStore.setComplementarMode).toHaveBeenCalledWith(0, 'ocr');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ANALYZE BUTTON TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Analyze Documents Button', () => {
    it('should be disabled when no petição files', () => {
      mockDocumentsStore.peticaoFiles = [];
      mockDocumentsStore.pastedPeticaoTexts = [];
      const props = createMockProps();
      render(<UploadTab {...props} />);

      const analyzeButton = screen.getByText(/Analisar Documentos/i);
      expect(analyzeButton).toBeDisabled();
    });

    it('should be enabled when petição file is uploaded', () => {
      const mockFile: UploadedFile = { id: '1', name: 'peticao.pdf', file: new File([''], 'peticao.pdf') };
      mockDocumentsStore.peticaoFiles = [mockFile];
      const props = createMockProps();
      render(<UploadTab {...props} />);

      const analyzeButton = screen.getByText(/Analisar Documentos/i);
      expect(analyzeButton).not.toBeDisabled();
    });

    it('should be enabled when petição text is pasted', () => {
      const pastedText: PastedText = { id: 'paste-4', name: 'Petição', text: 'Conteúdo' };
      mockDocumentsStore.pastedPeticaoTexts = [pastedText];
      const props = createMockProps();
      render(<UploadTab {...props} />);

      const analyzeButton = screen.getByText(/Analisar Documentos/i);
      expect(analyzeButton).not.toBeDisabled();
    });

    it('should call handleAnalyzeDocuments when clicked', () => {
      const handleAnalyzeDocuments = vi.fn();
      const mockFile: UploadedFile = { id: '1', name: 'peticao.pdf', file: new File([''], 'peticao.pdf') };
      mockDocumentsStore.peticaoFiles = [mockFile];
      const props = createMockProps({ handleAnalyzeDocuments });
      render(<UploadTab {...props} />);

      const analyzeButton = screen.getByText(/Analisar Documentos/i);
      fireEvent.click(analyzeButton);

      expect(handleAnalyzeDocuments).toHaveBeenCalled();
    });

    it('should be disabled during analysis', () => {
      const mockFile: UploadedFile = { id: '1', name: 'peticao.pdf', file: new File([''], 'peticao.pdf') };
      mockDocumentsStore.peticaoFiles = [mockFile];
      mockDocumentsStore.analyzing = true;
      const props = createMockProps();
      render(<UploadTab {...props} />);

      const analyzeButton = screen.getByText(/Analisando documentos/i);
      expect(analyzeButton).toBeDisabled();
    });

    it('should show "Analisando documentos..." during analysis', () => {
      const mockFile: UploadedFile = { id: '1', name: 'peticao.pdf', file: new File([''], 'peticao.pdf') };
      mockDocumentsStore.peticaoFiles = [mockFile];
      mockDocumentsStore.analyzing = true;
      const props = createMockProps();
      render(<UploadTab {...props} />);

      expect(screen.getByText(/Analisando documentos/i)).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEXT PREVIEW TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Text Preview', () => {
    it('should call setTextPreview when clicking on pasted text', () => {
      const pastedText: PastedText = { id: 'paste-5', name: 'Petição colada', text: 'Conteúdo da petição' };
      mockDocumentsStore.pastedPeticaoTexts = [pastedText];
      const props = createMockProps();
      render(<UploadTab {...props} />);

      const textElement = screen.getByText(/Petição colada/i);
      fireEvent.click(textElement);

      expect(mockUIStore.setTextPreview).toHaveBeenCalledWith({
        isOpen: true,
        title: 'Petição colada',
        text: 'Conteúdo da petição',
      });
    });

    it('should show clickable text for imported texts', () => {
      mockDocumentsStore.analyzedDocuments = {
        peticoes: [],
        peticoesText: [{ name: 'Petição importada', text: 'Texto importado' }],
        contestacoes: [],
        contestacoesText: [],
        complementares: [],
        complementaresText: [],
      } as unknown as AnalyzedDocuments;
      const props = createMockProps();
      render(<UploadTab {...props} />);

      expect(screen.getByText(/Petição importada/i)).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FILE LABELING TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('File Labeling', () => {
    it('should label first petição file as "Petição Inicial"', () => {
      const mockFile: UploadedFile = { id: '1', name: 'documento.pdf', file: new File([''], 'documento.pdf') };
      mockDocumentsStore.peticaoFiles = [mockFile];
      const props = createMockProps();
      render(<UploadTab {...props} />);

      expect(screen.getByText(/1\. Petição Inicial/i)).toBeInTheDocument();
    });

    it('should number subsequent petição files', () => {
      const mockFiles: UploadedFile[] = [
        { id: '1', name: 'peticao.pdf', file: new File([''], 'peticao.pdf') },
        { id: '2', name: 'emenda.pdf', file: new File([''], 'emenda.pdf') },
      ];
      mockDocumentsStore.peticaoFiles = mockFiles;
      const props = createMockProps();
      render(<UploadTab {...props} />);

      expect(screen.getByText(/1\. Petição Inicial/i)).toBeInTheDocument();
      expect(screen.getByText(/2\. emenda\.pdf/i)).toBeInTheDocument();
    });

    it('should show "Documentos do Autor" label in petição section', () => {
      const mockFile: UploadedFile = { id: '1', name: 'peticao.pdf', file: new File([''], 'peticao.pdf') };
      mockDocumentsStore.peticaoFiles = [mockFile];
      const props = createMockProps();
      render(<UploadTab {...props} />);

      expect(screen.getByText(/Documentos do Autor/i)).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INDEXEDDB CLEANUP TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('IndexedDB Cleanup', () => {
    it('should call removePdfFromIndexedDB when removing contestação file with id', async () => {
      const mockFile: UploadedFile = { id: 'file-123', name: 'contestacao-idb.pdf', file: new File([''], 'contestacao-idb.pdf') };
      mockDocumentsStore.contestacaoFiles = [mockFile];
      const props = createMockProps();
      render(<UploadTab {...props} />);

      const fileNameElement = screen.getByText(/contestacao-idb\.pdf/i);
      const fileRow = fileNameElement.closest('div.flex');
      const deleteButton = fileRow!.querySelector('button');
      fireEvent.click(deleteButton!);

      await waitFor(() => {
        expect(mockRemovePdfFromIndexedDB).toHaveBeenCalledWith('upload-contestacao-file-123');
      });
    });

    it('should call removePdfFromIndexedDB when removing complementary file with id', async () => {
      const mockFile: UploadedFile = { id: 'file-456', name: 'complementar-idb.pdf', file: new File([''], 'complementar-idb.pdf') };
      mockDocumentsStore.complementaryFiles = [mockFile];
      const props = createMockProps();
      render(<UploadTab {...props} />);

      const fileNameElement = screen.getByText(/complementar-idb\.pdf/i);
      const fileRow = fileNameElement.closest('div.flex');
      const deleteButton = fileRow!.querySelector('button');
      fireEvent.click(deleteButton!);

      await waitFor(() => {
        expect(mockRemovePdfFromIndexedDB).toHaveBeenCalledWith('upload-complementar-file-456');
      });
    });
  });
});

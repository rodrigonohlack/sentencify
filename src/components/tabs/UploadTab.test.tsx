/**
 * @file UploadTab.test.tsx
 * @description Testes de regressão para o componente UploadTab
 * @version 1.38.39
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
import type { UploadTabProps, UploadedFile, PastedText, AnalyzedDocuments } from '../../types';

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
    peticaoFiles: [],
    contestacaoFiles: [],
    complementaryFiles: [],
    setContestacaoFiles: vi.fn(),
    setComplementaryFiles: vi.fn(),
    pastedPeticaoTexts: [],
    pastedContestacaoTexts: [],
    pastedComplementaryTexts: [],
    analyzedDocuments: {
      peticoes: [],
      peticoesText: [],
      contestacoes: [],
      contestacoesText: [],
      complementares: [],
      complementaresText: [],
    } as AnalyzedDocuments,
    setAnalyzedDocuments: vi.fn(),
    documentProcessingModes: { peticoes: [], contestacoes: [], complementares: [] },
    setDocumentProcessingModes: vi.fn(),
    getDefaultProcessingMode: vi.fn(() => 'pdfjs'),
    setPeticaoMode: vi.fn(),
    setContestacaoMode: vi.fn(),
    setComplementarMode: vi.fn(),
    processoNumero: '',
    setProcessoNumero: vi.fn(),
    handleUploadPeticao: vi.fn(),
    handleUploadContestacao: vi.fn(),
    handleUploadComplementary: vi.fn(),
    removePeticaoFile: vi.fn(),
    removePastedText: vi.fn(),
    showPasteArea: { peticao: false, contestacao: false, complementary: false },
    setShowPasteArea: vi.fn(),
    handlePastedText: vi.fn(),
    setTextPreview: vi.fn(),
    documentAnalyzing: false,
    handleAnalyzeDocuments: vi.fn(),
    aiIntegration: {
      aiSettings: { provider: 'claude', anonymization: { enabled: false } },
    },
    documentServices: {
      autoDetectProcessoNumero: vi.fn().mockResolvedValue(null),
    },
    removePdfFromIndexedDB: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
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
      // Use h3 specifically since the text also appears in upload area
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

      // Should show paste buttons for all 3 sections
      const pasteButtons = screen.getAllByText(/Colar texto/i);
      expect(pasteButtons.length).toBeGreaterThanOrEqual(3);
    });

    it('should show file count when files are uploaded', () => {
      const mockFile: UploadedFile = { id: '1', name: 'test.pdf', file: new File([''], 'test.pdf') };
      const props = createMockProps({
        peticaoFiles: [mockFile],
      });
      render(<UploadTab {...props} />);

      expect(screen.getByText(/1 documento\(s\) carregado\(s\)/i)).toBeInTheDocument();
    });

    it('should show multiple files count correctly', () => {
      const mockFiles: UploadedFile[] = [
        { id: '1', name: 'test1.pdf', file: new File([''], 'test1.pdf') },
        { id: '2', name: 'test2.pdf', file: new File([''], 'test2.pdf') },
        { id: '3', name: 'test3.pdf', file: new File([''], 'test3.pdf') },
      ];
      const props = createMockProps({
        peticaoFiles: mockFiles,
      });
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
      const setDocumentProcessingModes = vi.fn();
      const getDefaultProcessingMode = vi.fn(() => 'ocr');
      const props = createMockProps({ setDocumentProcessingModes, getDefaultProcessingMode });
      render(<UploadTab {...props} />);

      const fileInput = document.getElementById('peticao') as HTMLInputElement;
      const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });

      Object.defineProperty(fileInput, 'files', { value: [mockFile] });
      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(setDocumentProcessingModes).toHaveBeenCalled();
      });
    });

    it('should attempt to detect processo number on first upload', async () => {
      const autoDetectProcessoNumero = vi.fn().mockResolvedValue('0001234-56.2024.5.00.0001');
      const setProcessoNumero = vi.fn();
      const props = createMockProps({
        processoNumero: '', // No processo number yet
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
        processoNumero: '0001234-56.2024.5.00.0001', // Already has number
        documentServices: { autoDetectProcessoNumero },
      });
      render(<UploadTab {...props} />);

      const fileInput = document.getElementById('peticao') as HTMLInputElement;
      const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });

      Object.defineProperty(fileInput, 'files', { value: [mockFile] });
      fireEvent.change(fileInput);

      // Should not call detection since processoNumero already exists
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

      // Give time for potential async operations
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(handleUploadPeticao).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEXT PASTE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Text Paste', () => {
    it('should show paste area when "Colar texto" is clicked for petição', () => {
      const setShowPasteArea = vi.fn();
      const props = createMockProps({ setShowPasteArea });
      render(<UploadTab {...props} />);

      // Find the first "Colar texto" button (petição)
      const pasteButtons = screen.getAllByText(/Colar texto/i);
      fireEvent.click(pasteButtons[0]);

      expect(setShowPasteArea).toHaveBeenCalled();
    });

    it('should render textarea when paste area is open', () => {
      const props = createMockProps({
        showPasteArea: { peticao: true, contestacao: false, complementary: false },
      });
      render(<UploadTab {...props} />);

      expect(screen.getByPlaceholderText(/Cole o texto aqui/i)).toBeInTheDocument();
    });

    it('should call handlePastedText on paste event', () => {
      const handlePastedText = vi.fn();
      const props = createMockProps({
        showPasteArea: { peticao: true, contestacao: false, complementary: false },
        handlePastedText,
      });
      render(<UploadTab {...props} />);

      const textarea = screen.getByPlaceholderText(/Cole o texto aqui/i);

      // Simulate paste event
      const pasteEvent = {
        clipboardData: {
          getData: () => 'Texto colado da petição',
        },
      };
      fireEvent.paste(textarea, pasteEvent);

      expect(handlePastedText).toHaveBeenCalledWith('Texto colado da petição', 'peticao');
    });

    it('should have confirm and cancel buttons in paste area', () => {
      const props = createMockProps({
        showPasteArea: { peticao: true, contestacao: false, complementary: false },
      });
      render(<UploadTab {...props} />);

      expect(screen.getByText('Confirmar')).toBeInTheDocument();
      expect(screen.getByText('Cancelar')).toBeInTheDocument();
    });

    it('should close paste area when cancel is clicked', () => {
      const setShowPasteArea = vi.fn();
      const props = createMockProps({
        showPasteArea: { peticao: true, contestacao: false, complementary: false },
        setShowPasteArea,
      });
      render(<UploadTab {...props} />);

      const cancelButton = screen.getByText('Cancelar');
      fireEvent.click(cancelButton);

      expect(setShowPasteArea).toHaveBeenCalledWith(
        expect.objectContaining({ peticao: false })
      );
    });

    it('should show pasted text in the documents list', () => {
      const pastedText: PastedText = { name: 'Petição colada', text: 'Conteúdo da petição' };
      const props = createMockProps({
        pastedPeticaoTexts: [pastedText],
      });
      render(<UploadTab {...props} />);

      expect(screen.getByText(/Petição colada/i)).toBeInTheDocument();
    });

    it('should show character count for pasted texts', () => {
      const pastedText: PastedText = { name: 'Petição colada', text: 'A'.repeat(5000) };
      const props = createMockProps({
        pastedPeticaoTexts: [pastedText],
      });
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
      const props = createMockProps({
        peticaoFiles: [mockFile],
        removePeticaoFile,
      });
      render(<UploadTab {...props} />);

      // Find delete button (Trash2 icon)
      const deleteButtons = document.querySelectorAll('[title="Remover"]');
      expect(deleteButtons.length).toBeGreaterThan(0);

      fireEvent.click(deleteButtons[0]);
      expect(removePeticaoFile).toHaveBeenCalledWith(0);
    });

    it('should call removePastedText for pasted petição text', () => {
      const removePastedText = vi.fn();
      const pastedText: PastedText = { name: 'Petição colada', text: 'Conteúdo' };
      const props = createMockProps({
        pastedPeticaoTexts: [pastedText],
        removePastedText,
      });
      render(<UploadTab {...props} />);

      const deleteButtons = document.querySelectorAll('[title="Remover"]');
      expect(deleteButtons.length).toBeGreaterThan(0);

      fireEvent.click(deleteButtons[0]);
      expect(removePastedText).toHaveBeenCalledWith('peticao', 0);
    });

    it('should call setContestacaoFiles to remove contestação file', async () => {
      const setContestacaoFiles = vi.fn();
      const mockFile: UploadedFile = { id: '1', name: 'contestacao.pdf', file: new File([''], 'contestacao.pdf') };
      const props = createMockProps({
        contestacaoFiles: [mockFile],
        setContestacaoFiles,
      });
      render(<UploadTab {...props} />);

      // Find the file name in the list, then find the delete button next to it
      const fileNameElement = screen.getByText(/contestacao\.pdf/i);
      const fileRow = fileNameElement.closest('div.flex');
      expect(fileRow).not.toBeNull();

      // Find the button within this row
      const deleteButton = fileRow!.querySelector('button');
      expect(deleteButton).not.toBeNull();
      fireEvent.click(deleteButton!);

      await waitFor(() => {
        expect(setContestacaoFiles).toHaveBeenCalled();
      });
    });

    it('should call setComplementaryFiles to remove complementary file', async () => {
      const setComplementaryFiles = vi.fn();
      const mockFile: UploadedFile = { id: '1', name: 'complementar.pdf', file: new File([''], 'complementar.pdf') };
      const props = createMockProps({
        complementaryFiles: [mockFile],
        setComplementaryFiles,
      });
      render(<UploadTab {...props} />);

      // Find the file name in the list, then find the delete button next to it
      const fileNameElement = screen.getByText(/complementar\.pdf/i);
      const fileRow = fileNameElement.closest('div.flex');
      expect(fileRow).not.toBeNull();

      // Find the button within this row
      const deleteButton = fileRow!.querySelector('button');
      expect(deleteButton).not.toBeNull();
      fireEvent.click(deleteButton!);

      await waitFor(() => {
        expect(setComplementaryFiles).toHaveBeenCalled();
      });
    });

    it('should remove imported PDF from analyzedDocuments', () => {
      const setAnalyzedDocuments = vi.fn();
      const props = createMockProps({
        peticaoFiles: [], // No new files
        analyzedDocuments: {
          peticoes: [new ArrayBuffer(10)], // Has imported PDF
          peticoesText: [],
          contestacoes: [],
          contestacoesText: [],
          complementares: [],
          complementaresText: [],
        } as unknown as AnalyzedDocuments,
        setAnalyzedDocuments,
      });
      render(<UploadTab {...props} />);

      const deleteButtons = document.querySelectorAll('[title="Remover"]');
      expect(deleteButtons.length).toBeGreaterThan(0);

      fireEvent.click(deleteButtons[0]);
      expect(setAnalyzedDocuments).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCESSING MODE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Processing Mode Selection', () => {
    it('should render ProcessingModeSelector for each uploaded file', () => {
      const mockFile: UploadedFile = { id: '1', name: 'test.pdf', file: new File([''], 'test.pdf') };
      const props = createMockProps({
        peticaoFiles: [mockFile],
        documentProcessingModes: { peticoes: ['pdfjs'], contestacoes: [], complementares: [] },
      });
      render(<UploadTab {...props} />);

      const selectors = screen.getAllByTestId('processing-mode-selector');
      expect(selectors.length).toBeGreaterThanOrEqual(1);
    });

    it('should call setPeticaoMode when mode changes for petição', () => {
      const setPeticaoMode = vi.fn();
      const mockFile: UploadedFile = { id: '1', name: 'test.pdf', file: new File([''], 'test.pdf') };
      const props = createMockProps({
        peticaoFiles: [mockFile],
        documentProcessingModes: { peticoes: ['pdfjs'], contestacoes: [], complementares: [] },
        setPeticaoMode,
      });
      render(<UploadTab {...props} />);

      const selectors = screen.getAllByTestId('processing-mode-selector');
      fireEvent.change(selectors[0], { target: { value: 'ocr' } });

      expect(setPeticaoMode).toHaveBeenCalledWith(0, 'ocr');
    });

    it('should call setContestacaoMode when mode changes for contestação', () => {
      const setContestacaoMode = vi.fn();
      const mockFile: UploadedFile = { id: '1', name: 'contestacao.pdf', file: new File([''], 'contestacao.pdf') };
      const props = createMockProps({
        contestacaoFiles: [mockFile],
        documentProcessingModes: { peticoes: [], contestacoes: ['pdfjs'], complementares: [] },
        setContestacaoMode,
      });
      render(<UploadTab {...props} />);

      const selectors = screen.getAllByTestId('processing-mode-selector');
      fireEvent.change(selectors[0], { target: { value: 'tesseract' } });

      expect(setContestacaoMode).toHaveBeenCalledWith(0, 'tesseract');
    });

    it('should call setComplementarMode when mode changes for complementar', () => {
      const setComplementarMode = vi.fn();
      const mockFile: UploadedFile = { id: '1', name: 'complementar.pdf', file: new File([''], 'complementar.pdf') };
      const props = createMockProps({
        complementaryFiles: [mockFile],
        documentProcessingModes: { peticoes: [], contestacoes: [], complementares: ['pdfjs'] },
        setComplementarMode,
      });
      render(<UploadTab {...props} />);

      const selectors = screen.getAllByTestId('processing-mode-selector');
      fireEvent.change(selectors[0], { target: { value: 'ocr' } });

      expect(setComplementarMode).toHaveBeenCalledWith(0, 'ocr');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ANALYZE BUTTON TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Analyze Documents Button', () => {
    it('should be disabled when no petição files', () => {
      const props = createMockProps({
        peticaoFiles: [],
        pastedPeticaoTexts: [],
      });
      render(<UploadTab {...props} />);

      const analyzeButton = screen.getByText(/Analisar Documentos/i);
      expect(analyzeButton).toBeDisabled();
    });

    it('should be enabled when petição file is uploaded', () => {
      const mockFile: UploadedFile = { id: '1', name: 'peticao.pdf', file: new File([''], 'peticao.pdf') };
      const props = createMockProps({
        peticaoFiles: [mockFile],
      });
      render(<UploadTab {...props} />);

      const analyzeButton = screen.getByText(/Analisar Documentos/i);
      expect(analyzeButton).not.toBeDisabled();
    });

    it('should be enabled when petição text is pasted', () => {
      const pastedText: PastedText = { name: 'Petição', text: 'Conteúdo' };
      const props = createMockProps({
        pastedPeticaoTexts: [pastedText],
      });
      render(<UploadTab {...props} />);

      const analyzeButton = screen.getByText(/Analisar Documentos/i);
      expect(analyzeButton).not.toBeDisabled();
    });

    it('should call handleAnalyzeDocuments when clicked', () => {
      const handleAnalyzeDocuments = vi.fn();
      const mockFile: UploadedFile = { id: '1', name: 'peticao.pdf', file: new File([''], 'peticao.pdf') };
      const props = createMockProps({
        peticaoFiles: [mockFile],
        handleAnalyzeDocuments,
      });
      render(<UploadTab {...props} />);

      const analyzeButton = screen.getByText(/Analisar Documentos/i);
      fireEvent.click(analyzeButton);

      expect(handleAnalyzeDocuments).toHaveBeenCalled();
    });

    it('should be disabled during analysis', () => {
      const mockFile: UploadedFile = { id: '1', name: 'peticao.pdf', file: new File([''], 'peticao.pdf') };
      const props = createMockProps({
        peticaoFiles: [mockFile],
        documentAnalyzing: true,
      });
      render(<UploadTab {...props} />);

      const analyzeButton = screen.getByText(/Analisando documentos/i);
      expect(analyzeButton).toBeDisabled();
    });

    it('should show "Analisando documentos..." during analysis', () => {
      const mockFile: UploadedFile = { id: '1', name: 'peticao.pdf', file: new File([''], 'peticao.pdf') };
      const props = createMockProps({
        peticaoFiles: [mockFile],
        documentAnalyzing: true,
      });
      render(<UploadTab {...props} />);

      expect(screen.getByText(/Analisando documentos/i)).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEXT PREVIEW TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Text Preview', () => {
    it('should call setTextPreview when clicking on pasted text', () => {
      const setTextPreview = vi.fn();
      const pastedText: PastedText = { name: 'Petição colada', text: 'Conteúdo da petição' };
      const props = createMockProps({
        pastedPeticaoTexts: [pastedText],
        setTextPreview,
      });
      render(<UploadTab {...props} />);

      const textElement = screen.getByText(/Petição colada/i);
      fireEvent.click(textElement);

      expect(setTextPreview).toHaveBeenCalledWith({
        isOpen: true,
        title: 'Petição colada',
        text: 'Conteúdo da petição',
      });
    });

    it('should show clickable text for imported texts', () => {
      const props = createMockProps({
        analyzedDocuments: {
          peticoes: [],
          peticoesText: [{ name: 'Petição importada', text: 'Texto importado' }],
          contestacoes: [],
          contestacoesText: [],
          complementares: [],
          complementaresText: [],
        } as unknown as AnalyzedDocuments,
      });
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
      const props = createMockProps({
        peticaoFiles: [mockFile],
      });
      render(<UploadTab {...props} />);

      expect(screen.getByText(/1\. Petição Inicial/i)).toBeInTheDocument();
    });

    it('should number subsequent petição files', () => {
      const mockFiles: UploadedFile[] = [
        { id: '1', name: 'peticao.pdf', file: new File([''], 'peticao.pdf') },
        { id: '2', name: 'emenda.pdf', file: new File([''], 'emenda.pdf') },
      ];
      const props = createMockProps({
        peticaoFiles: mockFiles,
      });
      render(<UploadTab {...props} />);

      expect(screen.getByText(/1\. Petição Inicial/i)).toBeInTheDocument();
      expect(screen.getByText(/2\. emenda\.pdf/i)).toBeInTheDocument();
    });

    it('should show "Documentos do Autor" label in petição section', () => {
      const mockFile: UploadedFile = { id: '1', name: 'peticao.pdf', file: new File([''], 'peticao.pdf') };
      const props = createMockProps({
        peticaoFiles: [mockFile],
      });
      render(<UploadTab {...props} />);

      expect(screen.getByText(/Documentos do Autor/i)).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INDEXEDDB CLEANUP TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('IndexedDB Cleanup', () => {
    it('should call removePdfFromIndexedDB when removing contestação file with id', async () => {
      const removePdfFromIndexedDB = vi.fn().mockResolvedValue(undefined);
      const setContestacaoFiles = vi.fn();
      const mockFile: UploadedFile = { id: 'file-123', name: 'contestacao-idb.pdf', file: new File([''], 'contestacao-idb.pdf') };
      const props = createMockProps({
        contestacaoFiles: [mockFile],
        setContestacaoFiles,
        removePdfFromIndexedDB,
      });
      render(<UploadTab {...props} />);

      // Find the file name in the list, then find the delete button next to it
      const fileNameElement = screen.getByText(/contestacao-idb\.pdf/i);
      const fileRow = fileNameElement.closest('div.flex');
      const deleteButton = fileRow!.querySelector('button');
      fireEvent.click(deleteButton!);

      await waitFor(() => {
        expect(removePdfFromIndexedDB).toHaveBeenCalledWith('upload-contestacao-file-123');
      });
    });

    it('should call removePdfFromIndexedDB when removing complementary file with id', async () => {
      const removePdfFromIndexedDB = vi.fn().mockResolvedValue(undefined);
      const setComplementaryFiles = vi.fn();
      const mockFile: UploadedFile = { id: 'file-456', name: 'complementar-idb.pdf', file: new File([''], 'complementar-idb.pdf') };
      const props = createMockProps({
        complementaryFiles: [mockFile],
        setComplementaryFiles,
        removePdfFromIndexedDB,
      });
      render(<UploadTab {...props} />);

      // Find the file name in the list, then find the delete button next to it
      const fileNameElement = screen.getByText(/complementar-idb\.pdf/i);
      const fileRow = fileNameElement.closest('div.flex');
      const deleteButton = fileRow!.querySelector('button');
      fireEvent.click(deleteButton!);

      await waitFor(() => {
        expect(removePdfFromIndexedDB).toHaveBeenCalledWith('upload-complementar-file-456');
      });
    });
  });
});

/**
 * @file UploadTab.test.tsx
 * @description Testes de regressao para o componente UploadTab
 * @version 1.38.49
 *
 * Atualizado para FASE 3: UploadTab agora acessa useDocumentsStore e useUIStore diretamente.
 *
 * Cobre todas as acoes do usuario:
 * 1. Upload de PDFs (peticao, contestacao, complementares)
 * 2. Colar texto (paste areas)
 * 3. Remocao de arquivos/textos
 * 4. Selecao de modo de processamento
 * 5. Botao de analise
 * 6. Contestacao paste area toggling
 * 7. Complementary paste area toggling
 * 8. Imported PDF removal (contestacao, complementar)
 * 9. Imported text removal (contestacao, complementar)
 * 10. File count display (contestacao, complementar)
 * 11. Auto-detect processo number for contestacao/complementar
 * 12. Text preview for contestacao/complementar texts
 * 13. Ctrl+Enter paste handler
 */

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

    it('should show contestacao file count when files are uploaded', () => {
      const mockFiles: UploadedFile[] = [
        { id: '1', name: 'contestacao1.pdf', file: new File([''], 'contestacao1.pdf') },
        { id: '2', name: 'contestacao2.pdf', file: new File([''], 'contestacao2.pdf') },
      ];
      mockDocumentsStore.contestacaoFiles = mockFiles;
      const props = createMockProps();
      render(<UploadTab {...props} />);

      expect(screen.getByText(/2 arquivos selecionados/i)).toBeInTheDocument();
    });

    it('should show singular contestacao file count', () => {
      const mockFile: UploadedFile = { id: '1', name: 'contestacao.pdf', file: new File([''], 'contestacao.pdf') };
      mockDocumentsStore.contestacaoFiles = [mockFile];
      const props = createMockProps();
      render(<UploadTab {...props} />);

      expect(screen.getByText(/1 arquivo selecionado$/i)).toBeInTheDocument();
    });

    it('should show complementary file count', () => {
      const mockFiles: UploadedFile[] = [
        { id: '1', name: 'comp1.pdf', file: new File([''], 'comp1.pdf') },
        { id: '2', name: 'comp2.pdf', file: new File([''], 'comp2.pdf') },
        { id: '3', name: 'comp3.pdf', file: new File([''], 'comp3.pdf') },
      ];
      mockDocumentsStore.complementaryFiles = mockFiles;
      const props = createMockProps();
      render(<UploadTab {...props} />);

      expect(screen.getByText(/3 documentos complementares/i)).toBeInTheDocument();
    });

    it('should show singular complementary file count', () => {
      const mockFile: UploadedFile = { id: '1', name: 'comp.pdf', file: new File([''], 'comp.pdf') };
      mockDocumentsStore.complementaryFiles = [mockFile];
      const props = createMockProps();
      render(<UploadTab {...props} />);

      expect(screen.getByText(/1 documento complementar$/i)).toBeInTheDocument();
    });

    it('should show imported contestacao count with checkmark', () => {
      mockDocumentsStore.analyzedDocuments = {
        peticoes: [],
        peticoesText: [],
        contestacoes: [new ArrayBuffer(10)],
        contestacoesText: [],
        complementares: [],
        complementaresText: [],
      } as unknown as AnalyzedDocuments;
      const props = createMockProps();
      render(<UploadTab {...props} />);

      expect(screen.getByText(/1 importado$/i)).toBeInTheDocument();
    });

    it('should show complementary description text', () => {
      const props = createMockProps();
      render(<UploadTab {...props} />);

      expect(screen.getByText(/Atas de audiência/i)).toBeInTheDocument();
    });

    it('should show default upload text when no peticao files', () => {
      const props = createMockProps();
      render(<UploadTab {...props} />);

      expect(screen.getByText(/Clique para fazer upload \(múltiplos\)/i)).toBeInTheDocument();
    });

    it('should show default upload text for contestacao when no files', () => {
      const props = createMockProps();
      render(<UploadTab {...props} />);

      expect(screen.getByText(/Clique para fazer upload$/i)).toBeInTheDocument();
    });

    it('should show default upload text for complementary when no files', () => {
      const props = createMockProps();
      render(<UploadTab {...props} />);

      expect(screen.getByText(/Clique para adicionar documentos complementares/i)).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PDF UPLOAD TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('PDF Upload', () => {
    it('should call handleUploadPeticao when peticao file is selected', async () => {
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

    it('should call handleUploadContestacao when contestacao file is selected', async () => {
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

    it('should not process contestacao upload if no files selected', async () => {
      const handleUploadContestacao = vi.fn();
      const props = createMockProps({ handleUploadContestacao });
      render(<UploadTab {...props} />);

      const fileInput = document.getElementById('contestacao') as HTMLInputElement;

      Object.defineProperty(fileInput, 'files', { value: [] });
      fireEvent.change(fileInput);

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(handleUploadContestacao).not.toHaveBeenCalled();
    });

    it('should not process complementary upload if no files selected', async () => {
      const handleUploadComplementary = vi.fn();
      const props = createMockProps({ handleUploadComplementary });
      render(<UploadTab {...props} />);

      const fileInput = document.getElementById('complementary') as HTMLInputElement;

      Object.defineProperty(fileInput, 'files', { value: [] });
      fireEvent.change(fileInput);

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(handleUploadComplementary).not.toHaveBeenCalled();
    });

    it('should attempt to detect processo number on contestacao upload', async () => {
      const autoDetectProcessoNumero = vi.fn().mockResolvedValue('0001234-56.2024.5.00.0001');
      const setProcessoNumero = vi.fn();
      const props = createMockProps({
        processoNumero: '',
        documentServices: { autoDetectProcessoNumero },
        setProcessoNumero,
      });
      render(<UploadTab {...props} />);

      const fileInput = document.getElementById('contestacao') as HTMLInputElement;
      const mockFile = new File(['test'], 'contestacao.pdf', { type: 'application/pdf' });

      Object.defineProperty(fileInput, 'files', { value: [mockFile] });
      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(autoDetectProcessoNumero).toHaveBeenCalled();
      });
    });

    it('should attempt to detect processo number on complementary upload', async () => {
      const autoDetectProcessoNumero = vi.fn().mockResolvedValue('0001234-56.2024.5.00.0001');
      const setProcessoNumero = vi.fn();
      const props = createMockProps({
        processoNumero: '',
        documentServices: { autoDetectProcessoNumero },
        setProcessoNumero,
      });
      render(<UploadTab {...props} />);

      const fileInput = document.getElementById('complementary') as HTMLInputElement;
      const mockFile = new File(['test'], 'comp.pdf', { type: 'application/pdf' });

      Object.defineProperty(fileInput, 'files', { value: [mockFile] });
      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(autoDetectProcessoNumero).toHaveBeenCalled();
      });
    });

    it('should set processo number when detected on contestacao upload', async () => {
      const autoDetectProcessoNumero = vi.fn().mockResolvedValue('0009999-88.2025.5.01.0001');
      const setProcessoNumero = vi.fn();
      const props = createMockProps({
        processoNumero: '',
        documentServices: { autoDetectProcessoNumero },
        setProcessoNumero,
      });
      render(<UploadTab {...props} />);

      const fileInput = document.getElementById('contestacao') as HTMLInputElement;
      const mockFile = new File(['test'], 'contestacao.pdf', { type: 'application/pdf' });

      Object.defineProperty(fileInput, 'files', { value: [mockFile] });
      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(setProcessoNumero).toHaveBeenCalledWith('0009999-88.2025.5.01.0001');
      });
    });

    it('should set processing modes for contestacao upload', async () => {
      const props = createMockProps();
      render(<UploadTab {...props} />);

      const fileInput = document.getElementById('contestacao') as HTMLInputElement;
      const mockFile = new File(['test'], 'contestacao.pdf', { type: 'application/pdf' });

      Object.defineProperty(fileInput, 'files', { value: [mockFile] });
      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(mockDocumentsStore.setDocumentProcessingModes).toHaveBeenCalled();
      });
    });

    it('should set processing modes for complementary upload', async () => {
      const props = createMockProps();
      render(<UploadTab {...props} />);

      const fileInput = document.getElementById('complementary') as HTMLInputElement;
      const mockFile = new File(['test'], 'comp.pdf', { type: 'application/pdf' });

      Object.defineProperty(fileInput, 'files', { value: [mockFile] });
      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(mockDocumentsStore.setDocumentProcessingModes).toHaveBeenCalled();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEXT PASTE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Text Paste', () => {
    it('should show paste area when "Colar texto" is clicked for peticao', () => {
      const props = createMockProps();
      render(<UploadTab {...props} />);

      const pasteButtons = screen.getAllByText(/Colar texto/i);
      fireEvent.click(pasteButtons[0]);

      expect(mockDocumentsStore.setShowPasteArea).toHaveBeenCalled();
    });

    it('should render textarea when paste area is open for peticao', () => {
      mockDocumentsStore.showPasteArea = { peticao: true, contestacao: false, complementary: false };
      const props = createMockProps();
      render(<UploadTab {...props} />);

      expect(screen.getByPlaceholderText(/Cole o texto aqui/i)).toBeInTheDocument();
    });

    it('should call handlePastedText on paste event for peticao', () => {
      mockDocumentsStore.showPasteArea = { peticao: true, contestacao: false, complementary: false };
      const props = createMockProps();
      render(<UploadTab {...props} />);

      const textarea = screen.getByPlaceholderText(/Cole o texto aqui/i);

      const pasteEvent = {
        clipboardData: {
          getData: () => 'Texto colado da peticao',
        },
      };
      fireEvent.paste(textarea, pasteEvent);

      expect(mockDocumentsStore.handlePastedText).toHaveBeenCalledWith('Texto colado da peticao', 'peticao');
    });

    it('should have confirm and cancel buttons in paste area', () => {
      mockDocumentsStore.showPasteArea = { peticao: true, contestacao: false, complementary: false };
      const props = createMockProps();
      render(<UploadTab {...props} />);

      expect(screen.getByText('Confirmar')).toBeInTheDocument();
      expect(screen.getByText('Cancelar')).toBeInTheDocument();
    });

    it('should close paste area when cancel is clicked for peticao', () => {
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
      const pastedText: PastedText = { id: 'paste-1', name: 'Peticao colada', text: 'Conteudo da peticao' };
      mockDocumentsStore.pastedPeticaoTexts = [pastedText];
      const props = createMockProps();
      render(<UploadTab {...props} />);

      expect(screen.getByText(/Peticao colada/i)).toBeInTheDocument();
    });

    it('should show character count for pasted texts', () => {
      const pastedText: PastedText = { id: 'paste-2', name: 'Peticao colada', text: 'A'.repeat(5000) };
      mockDocumentsStore.pastedPeticaoTexts = [pastedText];
      const props = createMockProps();
      render(<UploadTab {...props} />);

      expect(screen.getByText(/5[.,]000\s*caracteres/i)).toBeInTheDocument();
    });

    it('should show paste area for contestacao when toggled', () => {
      mockDocumentsStore.showPasteArea = { peticao: false, contestacao: true, complementary: false };
      const props = createMockProps();
      render(<UploadTab {...props} />);

      expect(screen.getByText(/Cole o texto da contestação abaixo/i)).toBeInTheDocument();
    });

    it('should call handlePastedText on paste event for contestacao', () => {
      mockDocumentsStore.showPasteArea = { peticao: false, contestacao: true, complementary: false };
      const props = createMockProps();
      render(<UploadTab {...props} />);

      const textareas = screen.getAllByPlaceholderText(/Cole o texto aqui/i);
      const contestacaoTextarea = textareas[0];

      const pasteEvent = {
        clipboardData: {
          getData: () => 'Texto da contestacao',
        },
      };
      fireEvent.paste(contestacaoTextarea, pasteEvent);

      expect(mockDocumentsStore.handlePastedText).toHaveBeenCalledWith('Texto da contestacao', 'contestacao');
    });

    it('should close paste area when cancel is clicked for contestacao', () => {
      mockDocumentsStore.showPasteArea = { peticao: false, contestacao: true, complementary: false };
      const props = createMockProps();
      render(<UploadTab {...props} />);

      const cancelButton = screen.getByText('Cancelar');
      fireEvent.click(cancelButton);

      expect(mockDocumentsStore.setShowPasteArea).toHaveBeenCalledWith(
        expect.objectContaining({ contestacao: false })
      );
    });

    it('should show paste area for complementary when toggled', () => {
      mockDocumentsStore.showPasteArea = { peticao: false, contestacao: false, complementary: true };
      const props = createMockProps();
      render(<UploadTab {...props} />);

      expect(screen.getByText(/Cole o texto do documento complementar abaixo/i)).toBeInTheDocument();
    });

    it('should call handlePastedText on paste event for complementary', () => {
      mockDocumentsStore.showPasteArea = { peticao: false, contestacao: false, complementary: true };
      const props = createMockProps();
      render(<UploadTab {...props} />);

      const textarea = screen.getByPlaceholderText(/Cole o texto aqui/i);

      const pasteEvent = {
        clipboardData: {
          getData: () => 'Texto complementar',
        },
      };
      fireEvent.paste(textarea, pasteEvent);

      expect(mockDocumentsStore.handlePastedText).toHaveBeenCalledWith('Texto complementar', 'complementary');
    });

    it('should close paste area when cancel is clicked for complementary', () => {
      mockDocumentsStore.showPasteArea = { peticao: false, contestacao: false, complementary: true };
      const props = createMockProps();
      render(<UploadTab {...props} />);

      const cancelButton = screen.getByText('Cancelar');
      fireEvent.click(cancelButton);

      expect(mockDocumentsStore.setShowPasteArea).toHaveBeenCalledWith(
        expect.objectContaining({ complementary: false })
      );
    });

    it('should open contestacao paste area when button is clicked', () => {
      const props = createMockProps();
      render(<UploadTab {...props} />);

      const pasteButtons = screen.getAllByText(/Colar texto/i);
      // Second paste button is for contestacao
      fireEvent.click(pasteButtons[1]);

      expect(mockDocumentsStore.setShowPasteArea).toHaveBeenCalledWith(
        expect.objectContaining({ contestacao: true })
      );
    });

    it('should open complementary paste area when button is clicked', () => {
      const props = createMockProps();
      render(<UploadTab {...props} />);

      const pasteButtons = screen.getAllByText(/Colar texto/i);
      // Third paste button is for complementary
      fireEvent.click(pasteButtons[2]);

      expect(mockDocumentsStore.setShowPasteArea).toHaveBeenCalledWith(
        expect.objectContaining({ complementary: true })
      );
    });

    it('should handle Ctrl+Enter in peticao paste area', () => {
      mockDocumentsStore.showPasteArea = { peticao: true, contestacao: false, complementary: false };
      const props = createMockProps();
      render(<UploadTab {...props} />);

      const textarea = screen.getByPlaceholderText(/Cole o texto aqui/i) as HTMLTextAreaElement;

      // Set textarea value
      fireEvent.change(textarea, { target: { value: 'Texto via Ctrl+Enter' } });

      // Simulate Ctrl+Enter
      fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });

      expect(mockDocumentsStore.handlePastedText).toHaveBeenCalledWith('Texto via Ctrl+Enter', 'peticao');
    });

    it('should handle Ctrl+Enter in contestacao paste area', () => {
      mockDocumentsStore.showPasteArea = { peticao: false, contestacao: true, complementary: false };
      const props = createMockProps();
      render(<UploadTab {...props} />);

      const textarea = screen.getByPlaceholderText(/Cole o texto aqui/i) as HTMLTextAreaElement;

      fireEvent.change(textarea, { target: { value: 'Contestacao Ctrl+Enter' } });
      fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });

      expect(mockDocumentsStore.handlePastedText).toHaveBeenCalledWith('Contestacao Ctrl+Enter', 'contestacao');
    });

    it('should handle Ctrl+Enter in complementary paste area', () => {
      mockDocumentsStore.showPasteArea = { peticao: false, contestacao: false, complementary: true };
      const props = createMockProps();
      render(<UploadTab {...props} />);

      const textarea = screen.getByPlaceholderText(/Cole o texto aqui/i) as HTMLTextAreaElement;

      fireEvent.change(textarea, { target: { value: 'Complementar Ctrl+Enter' } });
      fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });

      expect(mockDocumentsStore.handlePastedText).toHaveBeenCalledWith('Complementar Ctrl+Enter', 'complementary');
    });

    it('should NOT trigger paste on Enter without Ctrl', () => {
      mockDocumentsStore.showPasteArea = { peticao: true, contestacao: false, complementary: false };
      const props = createMockProps();
      render(<UploadTab {...props} />);

      const textarea = screen.getByPlaceholderText(/Cole o texto aqui/i) as HTMLTextAreaElement;

      fireEvent.change(textarea, { target: { value: 'Some text' } });
      fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: false });

      expect(mockDocumentsStore.handlePastedText).not.toHaveBeenCalled();
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

    it('should call removePastedText for pasted peticao text', () => {
      const pastedText: PastedText = { id: 'paste-3', name: 'Peticao colada', text: 'Conteudo' };
      mockDocumentsStore.pastedPeticaoTexts = [pastedText];
      const props = createMockProps();
      render(<UploadTab {...props} />);

      const deleteButtons = document.querySelectorAll('[title="Remover"]');
      expect(deleteButtons.length).toBeGreaterThan(0);

      fireEvent.click(deleteButtons[0]);
      expect(mockDocumentsStore.removePastedText).toHaveBeenCalledWith('peticao', 0);
    });

    it('should call setContestacaoFiles to remove contestacao file', async () => {
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

    it('should remove imported PDF from analyzedDocuments for peticao', () => {
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

    it('should remove imported PDF from analyzedDocuments for contestacao', () => {
      mockDocumentsStore.analyzedDocuments = {
        peticoes: [],
        peticoesText: [],
        contestacoes: [new ArrayBuffer(10)],
        contestacoesText: [],
        complementares: [],
        complementaresText: [],
      } as unknown as AnalyzedDocuments;
      const props = createMockProps();
      render(<UploadTab {...props} />);

      // Imported PDF row: find by label, then find its sibling delete button
      const textElement = screen.getByText(/Contestação 1 \(PDF importado\)/i);
      const row = textElement.closest('div.flex');
      expect(row).not.toBeNull();
      const deleteButton = row!.querySelector('button');
      expect(deleteButton).not.toBeNull();
      fireEvent.click(deleteButton!);
      expect(mockDocumentsStore.setAnalyzedDocuments).toHaveBeenCalled();
    });

    it('should remove imported PDF from analyzedDocuments for complementar', () => {
      mockDocumentsStore.analyzedDocuments = {
        peticoes: [],
        peticoesText: [],
        contestacoes: [],
        contestacoesText: [],
        complementares: [new ArrayBuffer(10)],
        complementaresText: [],
      } as unknown as AnalyzedDocuments;
      const props = createMockProps();
      render(<UploadTab {...props} />);

      // Imported PDF row: find by label, then find its sibling delete button
      const textElement = screen.getByText(/Documento complementar 1 \(PDF importado\)/i);
      const row = textElement.closest('div.flex');
      expect(row).not.toBeNull();
      const deleteButton = row!.querySelector('button');
      expect(deleteButton).not.toBeNull();
      fireEvent.click(deleteButton!);
      expect(mockDocumentsStore.setAnalyzedDocuments).toHaveBeenCalled();
    });

    it('should call removePastedText for pasted contestacao text', () => {
      const pastedText: PastedText = { id: 'paste-c1', name: 'Contestacao colada', text: 'Conteudo contestacao' };
      mockDocumentsStore.pastedContestacaoTexts = [pastedText];
      const props = createMockProps();
      render(<UploadTab {...props} />);

      // Find the contestacao text element, then find the button in its row
      const textElement = screen.getByText(/Contestacao colada/i);
      const row = textElement.closest('div.flex');
      expect(row).not.toBeNull();
      const deleteButton = row!.querySelector('button');
      expect(deleteButton).not.toBeNull();
      fireEvent.click(deleteButton!);
      expect(mockDocumentsStore.removePastedText).toHaveBeenCalledWith('contestacao', 0);
    });

    it('should call removePastedText for pasted complementary text', () => {
      const pastedText: PastedText = { id: 'paste-comp1', name: 'Doc complementar', text: 'Conteudo complementar' };
      mockDocumentsStore.pastedComplementaryTexts = [pastedText];
      const props = createMockProps();
      render(<UploadTab {...props} />);

      // Find the complementary text element, then find the button in its row
      const textElement = screen.getByText(/Doc complementar/i);
      const row = textElement.closest('div.flex');
      expect(row).not.toBeNull();
      const deleteButton = row!.querySelector('button');
      expect(deleteButton).not.toBeNull();
      fireEvent.click(deleteButton!);
      expect(mockDocumentsStore.removePastedText).toHaveBeenCalledWith('complementary', 0);
    });

    it('should remove imported text from analyzedDocuments for peticao', () => {
      mockDocumentsStore.analyzedDocuments = {
        peticoes: [],
        peticoesText: [{ name: 'Peticao importada', text: 'Texto importado' }],
        contestacoes: [],
        contestacoesText: [],
        complementares: [],
        complementaresText: [],
      } as unknown as AnalyzedDocuments;
      const props = createMockProps();
      render(<UploadTab {...props} />);

      const textElement = screen.getByText(/Peticao importada/i);
      const row = textElement.closest('div.flex');
      const deleteButton = row?.querySelector('[title="Remover"]');
      if (deleteButton) {
        fireEvent.click(deleteButton);
        expect(mockDocumentsStore.setAnalyzedDocuments).toHaveBeenCalled();
      }
    });

    it('should remove imported text from analyzedDocuments for contestacao', () => {
      mockDocumentsStore.analyzedDocuments = {
        peticoes: [],
        peticoesText: [],
        contestacoes: [],
        contestacoesText: [{ name: 'Contestacao importada', text: 'Texto contestacao importado' }],
        complementares: [],
        complementaresText: [],
      } as unknown as AnalyzedDocuments;
      const props = createMockProps();
      render(<UploadTab {...props} />);

      const textElement = screen.getByText(/Contestacao importada/i);
      const row = textElement.closest('div.flex');
      const deleteButton = row?.querySelector('[title="Remover"]');
      if (deleteButton) {
        fireEvent.click(deleteButton);
        expect(mockDocumentsStore.setAnalyzedDocuments).toHaveBeenCalled();
      }
    });

    it('should remove imported text from analyzedDocuments for complementar', () => {
      mockDocumentsStore.analyzedDocuments = {
        peticoes: [],
        peticoesText: [],
        contestacoes: [],
        contestacoesText: [],
        complementares: [],
        complementaresText: [{ name: 'Complementar importado', text: 'Texto complementar importado' }],
      } as unknown as AnalyzedDocuments;
      const props = createMockProps();
      render(<UploadTab {...props} />);

      const textElement = screen.getByText(/Complementar importado/i);
      const row = textElement.closest('div.flex');
      const deleteButton = row?.querySelector('[title="Remover"]');
      if (deleteButton) {
        fireEvent.click(deleteButton);
        expect(mockDocumentsStore.setAnalyzedDocuments).toHaveBeenCalled();
      }
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

    it('should call setPeticaoMode when mode changes for peticao', () => {
      const mockFile: UploadedFile = { id: '1', name: 'test.pdf', file: new File([''], 'test.pdf') };
      mockDocumentsStore.peticaoFiles = [mockFile];
      mockDocumentsStore.documentProcessingModes = { peticoes: ['pdfjs'], contestacoes: [], complementares: [] };
      const props = createMockProps();
      render(<UploadTab {...props} />);

      const selectors = screen.getAllByTestId('processing-mode-selector');
      fireEvent.change(selectors[0], { target: { value: 'ocr' } });

      expect(mockDocumentsStore.setPeticaoMode).toHaveBeenCalledWith(0, 'ocr');
    });

    it('should call setContestacaoMode when mode changes for contestacao', () => {
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
    it('should be disabled when no peticao files', () => {
      mockDocumentsStore.peticaoFiles = [];
      mockDocumentsStore.pastedPeticaoTexts = [];
      const props = createMockProps();
      render(<UploadTab {...props} />);

      const analyzeButton = screen.getByText(/Analisar Documentos/i);
      expect(analyzeButton).toBeDisabled();
    });

    it('should be enabled when peticao file is uploaded', () => {
      const mockFile: UploadedFile = { id: '1', name: 'peticao.pdf', file: new File([''], 'peticao.pdf') };
      mockDocumentsStore.peticaoFiles = [mockFile];
      const props = createMockProps();
      render(<UploadTab {...props} />);

      const analyzeButton = screen.getByText(/Analisar Documentos/i);
      expect(analyzeButton).not.toBeDisabled();
    });

    it('should be enabled when peticao text is pasted', () => {
      const pastedText: PastedText = { id: 'paste-4', name: 'Peticao', text: 'Conteudo' };
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
    it('should call setTextPreview when clicking on pasted peticao text', () => {
      const pastedText: PastedText = { id: 'paste-5', name: 'Peticao colada', text: 'Conteudo da peticao' };
      mockDocumentsStore.pastedPeticaoTexts = [pastedText];
      const props = createMockProps();
      render(<UploadTab {...props} />);

      const textElement = screen.getByText(/Peticao colada/i);
      fireEvent.click(textElement);

      expect(mockUIStore.setTextPreview).toHaveBeenCalledWith({
        isOpen: true,
        title: 'Peticao colada',
        text: 'Conteudo da peticao',
      });
    });

    it('should show clickable text for imported texts', () => {
      mockDocumentsStore.analyzedDocuments = {
        peticoes: [],
        peticoesText: [{ name: 'Peticao importada', text: 'Texto importado' }],
        contestacoes: [],
        contestacoesText: [],
        complementares: [],
        complementaresText: [],
      } as unknown as AnalyzedDocuments;
      const props = createMockProps();
      render(<UploadTab {...props} />);

      expect(screen.getByText(/Peticao importada/i)).toBeInTheDocument();
    });

    it('should call setTextPreview when clicking on imported peticao text', () => {
      mockDocumentsStore.analyzedDocuments = {
        peticoes: [],
        peticoesText: [{ name: 'Peticao importada', text: 'Texto importado preview' }],
        contestacoes: [],
        contestacoesText: [],
        complementares: [],
        complementaresText: [],
      } as unknown as AnalyzedDocuments;
      const props = createMockProps();
      render(<UploadTab {...props} />);

      const textElement = screen.getByText(/Peticao importada/i);
      fireEvent.click(textElement);

      expect(mockUIStore.setTextPreview).toHaveBeenCalledWith({
        isOpen: true,
        title: 'Peticao importada',
        text: 'Texto importado preview',
      });
    });

    it('should call setTextPreview when clicking on pasted contestacao text', () => {
      const pastedText: PastedText = { id: 'paste-c2', name: 'Contestacao colada', text: 'Texto contestacao' };
      mockDocumentsStore.pastedContestacaoTexts = [pastedText];
      const props = createMockProps();
      render(<UploadTab {...props} />);

      const textElement = screen.getByText(/Contestacao colada/i);
      fireEvent.click(textElement);

      expect(mockUIStore.setTextPreview).toHaveBeenCalledWith({
        isOpen: true,
        title: 'Contestacao colada',
        text: 'Texto contestacao',
      });
    });

    it('should call setTextPreview when clicking on imported contestacao text', () => {
      mockDocumentsStore.analyzedDocuments = {
        peticoes: [],
        peticoesText: [],
        contestacoes: [],
        contestacoesText: [{ name: 'Contestacao importada', text: 'Texto contestacao importado' }],
        complementares: [],
        complementaresText: [],
      } as unknown as AnalyzedDocuments;
      const props = createMockProps();
      render(<UploadTab {...props} />);

      const textElement = screen.getByText(/Contestacao importada/i);
      fireEvent.click(textElement);

      expect(mockUIStore.setTextPreview).toHaveBeenCalledWith({
        isOpen: true,
        title: 'Contestacao importada',
        text: 'Texto contestacao importado',
      });
    });

    it('should call setTextPreview when clicking on pasted complementary text', () => {
      const pastedText: PastedText = { id: 'paste-comp2', name: 'Complementar colado', text: 'Texto complementar' };
      mockDocumentsStore.pastedComplementaryTexts = [pastedText];
      const props = createMockProps();
      render(<UploadTab {...props} />);

      const textElement = screen.getByText(/Complementar colado/i);
      fireEvent.click(textElement);

      expect(mockUIStore.setTextPreview).toHaveBeenCalledWith({
        isOpen: true,
        title: 'Complementar colado',
        text: 'Texto complementar',
      });
    });

    it('should call setTextPreview when clicking on imported complementar text', () => {
      mockDocumentsStore.analyzedDocuments = {
        peticoes: [],
        peticoesText: [],
        contestacoes: [],
        contestacoesText: [],
        complementares: [],
        complementaresText: [{ name: 'Complementar importado', text: 'Texto complementar importado' }],
      } as unknown as AnalyzedDocuments;
      const props = createMockProps();
      render(<UploadTab {...props} />);

      const textElement = screen.getByText(/Complementar importado/i);
      fireEvent.click(textElement);

      expect(mockUIStore.setTextPreview).toHaveBeenCalledWith({
        isOpen: true,
        title: 'Complementar importado',
        text: 'Texto complementar importado',
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FILE LABELING TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('File Labeling', () => {
    it('should label first peticao file as "Peticao Inicial"', () => {
      const mockFile: UploadedFile = { id: '1', name: 'documento.pdf', file: new File([''], 'documento.pdf') };
      mockDocumentsStore.peticaoFiles = [mockFile];
      const props = createMockProps();
      render(<UploadTab {...props} />);

      expect(screen.getByText(/1\. Petição Inicial/i)).toBeInTheDocument();
    });

    it('should number subsequent peticao files', () => {
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

    it('should show "Documentos do Autor" label in peticao section', () => {
      const mockFile: UploadedFile = { id: '1', name: 'peticao.pdf', file: new File([''], 'peticao.pdf') };
      mockDocumentsStore.peticaoFiles = [mockFile];
      const props = createMockProps();
      render(<UploadTab {...props} />);

      expect(screen.getByText(/Documentos do Autor/i)).toBeInTheDocument();
    });

    it('should show "Contestacoes" label in contestacao section', () => {
      const mockFile: UploadedFile = { id: '1', name: 'contestacao.pdf', file: new File([''], 'contestacao.pdf') };
      mockDocumentsStore.contestacaoFiles = [mockFile];
      const props = createMockProps();
      render(<UploadTab {...props} />);

      expect(screen.getByText(/^Contestações:$/i)).toBeInTheDocument();
    });

    it('should show "Documentos complementares anexados" label', () => {
      const mockFile: UploadedFile = { id: '1', name: 'comp.pdf', file: new File([''], 'comp.pdf') };
      mockDocumentsStore.complementaryFiles = [mockFile];
      const props = createMockProps();
      render(<UploadTab {...props} />);

      expect(screen.getByText(/Documentos complementares anexados/i)).toBeInTheDocument();
    });

    it('should show imported contestacao labels', () => {
      mockDocumentsStore.analyzedDocuments = {
        peticoes: [],
        peticoesText: [],
        contestacoes: [new ArrayBuffer(10), new ArrayBuffer(10)],
        contestacoesText: [],
        complementares: [],
        complementaresText: [],
      } as unknown as AnalyzedDocuments;
      const props = createMockProps();
      render(<UploadTab {...props} />);

      expect(screen.getByText(/Contestação 1 \(PDF importado\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Contestação 2 \(PDF importado\)/i)).toBeInTheDocument();
    });

    it('should show imported complementar labels', () => {
      mockDocumentsStore.analyzedDocuments = {
        peticoes: [],
        peticoesText: [],
        contestacoes: [],
        contestacoesText: [],
        complementares: [new ArrayBuffer(10)],
        complementaresText: [],
      } as unknown as AnalyzedDocuments;
      const props = createMockProps();
      render(<UploadTab {...props} />);

      expect(screen.getByText(/Documento complementar 1 \(PDF importado\)/i)).toBeInTheDocument();
    });

    it('should show imported peticao labels when no new files', () => {
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

      expect(screen.getByText(/Petição Inicial.*\(PDF importado\)/i)).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INDEXEDDB CLEANUP TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('IndexedDB Cleanup', () => {
    it('should call removePdfFromIndexedDB when removing contestacao file with id', async () => {
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

    it('should update processing modes when removing contestacao file', async () => {
      const mockFile: UploadedFile = { id: 'file-789', name: 'contestacao-modes.pdf', file: new File([''], 'contestacao-modes.pdf') };
      mockDocumentsStore.contestacaoFiles = [mockFile];
      mockDocumentsStore.documentProcessingModes = { peticoes: [], contestacoes: ['pdfjs'], complementares: [] };
      const props = createMockProps();
      render(<UploadTab {...props} />);

      const fileNameElement = screen.getByText(/contestacao-modes\.pdf/i);
      const fileRow = fileNameElement.closest('div.flex');
      const deleteButton = fileRow!.querySelector('button');
      fireEvent.click(deleteButton!);

      await waitFor(() => {
        expect(mockDocumentsStore.setDocumentProcessingModes).toHaveBeenCalled();
      });
    });

    it('should update processing modes when removing complementary file', async () => {
      const mockFile: UploadedFile = { id: 'file-101', name: 'complementar-modes.pdf', file: new File([''], 'complementar-modes.pdf') };
      mockDocumentsStore.complementaryFiles = [mockFile];
      mockDocumentsStore.documentProcessingModes = { peticoes: [], contestacoes: [], complementares: ['pdfjs'] };
      const props = createMockProps();
      render(<UploadTab {...props} />);

      const fileNameElement = screen.getByText(/complementar-modes\.pdf/i);
      const fileRow = fileNameElement.closest('div.flex');
      const deleteButton = fileRow!.querySelector('button');
      fireEvent.click(deleteButton!);

      await waitFor(() => {
        expect(mockDocumentsStore.setDocumentProcessingModes).toHaveBeenCalled();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // IMPORTED DOCUMENTS DISPLAY TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Imported Documents Display', () => {
    it('should NOT show imported peticao PDFs when new files exist', () => {
      const mockFile: UploadedFile = { id: '1', name: 'new-peticao.pdf', file: new File([''], 'new-peticao.pdf') };
      mockDocumentsStore.peticaoFiles = [mockFile];
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

      // When peticaoFiles.length > 0, imported PDFs are NOT shown
      expect(screen.queryByText(/PDF importado/i)).not.toBeInTheDocument();
    });

    it('should NOT show imported contestacao PDFs when new files exist', () => {
      const mockFile: UploadedFile = { id: '1', name: 'new-contestacao.pdf', file: new File([''], 'new-contestacao.pdf') };
      mockDocumentsStore.contestacaoFiles = [mockFile];
      mockDocumentsStore.analyzedDocuments = {
        peticoes: [],
        peticoesText: [],
        contestacoes: [new ArrayBuffer(10)],
        contestacoesText: [],
        complementares: [],
        complementaresText: [],
      } as unknown as AnalyzedDocuments;
      const props = createMockProps();
      render(<UploadTab {...props} />);

      // When contestacaoFiles.length > 0, imported PDFs are NOT shown
      expect(screen.queryByText(/PDF importado/i)).not.toBeInTheDocument();
    });

    it('should NOT show imported complementar PDFs when new files exist', () => {
      const mockFile: UploadedFile = { id: '1', name: 'new-comp.pdf', file: new File([''], 'new-comp.pdf') };
      mockDocumentsStore.complementaryFiles = [mockFile];
      mockDocumentsStore.analyzedDocuments = {
        peticoes: [],
        peticoesText: [],
        contestacoes: [],
        contestacoesText: [],
        complementares: [new ArrayBuffer(10)],
        complementaresText: [],
      } as unknown as AnalyzedDocuments;
      const props = createMockProps();
      render(<UploadTab {...props} />);

      // When complementaryFiles.length > 0, imported PDFs are NOT shown
      expect(screen.queryByText(/PDF importado/i)).not.toBeInTheDocument();
    });

    it('should show contestacao imported text character count', () => {
      mockDocumentsStore.analyzedDocuments = {
        peticoes: [],
        peticoesText: [],
        contestacoes: [],
        contestacoesText: [{ name: 'Texto importado', text: 'A'.repeat(2500) }],
        complementares: [],
        complementaresText: [],
      } as unknown as AnalyzedDocuments;
      const props = createMockProps();
      render(<UploadTab {...props} />);

      expect(screen.getByText(/2[.,]500\s*caracteres/i)).toBeInTheDocument();
    });

    it('should show complementar imported text character count', () => {
      mockDocumentsStore.analyzedDocuments = {
        peticoes: [],
        peticoesText: [],
        contestacoes: [],
        contestacoesText: [],
        complementares: [],
        complementaresText: [{ name: 'Texto complementar', text: 'B'.repeat(3000) }],
      } as unknown as AnalyzedDocuments;
      const props = createMockProps();
      render(<UploadTab {...props} />);

      expect(screen.getByText(/3[.,]000\s*caracteres/i)).toBeInTheDocument();
    });
  });
});

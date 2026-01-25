/**
 * @file AdvancedModals.test.tsx
 * @description Comprehensive tests for AdvancedModals components
 * Tests: ShareLibraryModal, AcceptSharePage, DispositivoModal, BulkReviewModal, BulkUploadModal
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  ShareLibraryModal,
  AcceptSharePage,
  DispositivoModal,
  BulkReviewModal,
  BulkUploadModal
} from './AdvancedModals';
import type { Topic, BulkFile, BulkGeneratedModel, BulkError } from '../../types';

// ═══════════════════════════════════════════════════════════════════════════
// MOCKS
// ═══════════════════════════════════════════════════════════════════════════

// Note: We don't mock BaseModal to get real coverage of AdvancedModals

// Mock API_BASE
vi.mock('../../constants/api', () => ({
  API_BASE: 'http://localhost:3000'
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

// Mock clipboard
const mockClipboard = {
  writeText: vi.fn().mockResolvedValue(undefined),
};
Object.defineProperty(navigator, 'clipboard', { value: mockClipboard });

// Mock document.execCommand
document.execCommand = vi.fn().mockReturnValue(true);

// ═══════════════════════════════════════════════════════════════════════════
// FACTORIES
// ═══════════════════════════════════════════════════════════════════════════

const createMockTopic = (overrides: Partial<Topic> = {}): Topic => ({
  title: 'Test Topic',
  category: 'MÉRITO',
  relatorio: 'Test relatorio',
  editedContent: '<p>Test content</p>',
  ...overrides,
});

const createMockBulkFile = (overrides: Partial<BulkFile> = {}): BulkFile => ({
  file: new File(['test content'], 'test-file.pdf', { type: 'application/pdf' }),
  name: 'test-file.pdf',
  size: 1024,
  ...overrides,
});

const createMockBulkGeneratedModel = (overrides: Partial<BulkGeneratedModel> = {}): BulkGeneratedModel => ({
  id: 'model-1',
  title: 'Generated Model',
  content: '<p>Model content</p>',
  category: 'MERITO',
  keywords: 'test, model',
  sourceFile: 'source.pdf',
  ...overrides,
});

const createMockBulkError = (overrides: Partial<BulkError> = {}): BulkError => ({
  file: 'error-file.pdf',
  error: 'Processing failed',
  ...overrides,
});

// ═══════════════════════════════════════════════════════════════════════════
// ShareLibraryModal TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('ShareLibraryModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    user: { id: 'user-1', email: 'test@example.com' },
    onRemoveSharedModels: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue('mock-token');
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ shares: [], libraries: [] }),
    });
  });

  it('should render when isOpen is true', () => {
    render(<ShareLibraryModal {...defaultProps} />);
    expect(screen.getByText('Compartilhar Biblioteca')).toBeInTheDocument();
  });

  it('should not render when isOpen is false', () => {
    render(<ShareLibraryModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Compartilhar Biblioteca')).not.toBeInTheDocument();
  });

  it('should show tabs', () => {
    render(<ShareLibraryModal {...defaultProps} />);
    expect(screen.getByText('Compartilhar')).toBeInTheDocument();
    expect(screen.getByText(/Meus Convites/)).toBeInTheDocument();
    expect(screen.getByText(/Recebidos/)).toBeInTheDocument();
  });

  it('should switch tabs when clicked', () => {
    render(<ShareLibraryModal {...defaultProps} />);

    // Click on "Meus Convites" tab
    fireEvent.click(screen.getByText(/Meus Convites/));
    expect(screen.getByText('Nenhum convite enviado.')).toBeInTheDocument();
  });

  it('should have email input', () => {
    render(<ShareLibraryModal {...defaultProps} />);
    expect(screen.getByPlaceholderText('email@exemplo.com')).toBeInTheDocument();
  });

  it('should update email input value', () => {
    render(<ShareLibraryModal {...defaultProps} />);
    const input = screen.getByPlaceholderText('email@exemplo.com');
    fireEvent.change(input, { target: { value: 'new@email.com' } });
    expect(input).toHaveValue('new@email.com');
  });

  it('should show permission options', () => {
    render(<ShareLibraryModal {...defaultProps} />);
    expect(screen.getByText('Somente Leitura')).toBeInTheDocument();
    expect(screen.getByText('Leitura e Escrita')).toBeInTheDocument();
  });

  it('should have send button', () => {
    render(<ShareLibraryModal {...defaultProps} />);
    expect(screen.getByText('Enviar Convite')).toBeInTheDocument();
  });

  it('should fetch shares when opened', async () => {
    render(<ShareLibraryModal {...defaultProps} />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// AcceptSharePage TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('AcceptSharePage', () => {
  const defaultProps = {
    token: 'share-token-123',
    onAccepted: vi.fn(),
    onLogin: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue('mock-auth-token');
  });

  it('should show loading state initially', () => {
    mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves
    render(<AcceptSharePage {...defaultProps} />);
    expect(screen.getByText('Carregando...')).toBeInTheDocument();
  });

  it('should show error when share token is invalid', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
    });

    render(<AcceptSharePage {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Link Inválido')).toBeInTheDocument();
    });
  });

  it('should show share info when token is valid', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        owner: { email: 'owner@example.com' },
        modelsCount: 10,
        permission: 'view',
      }),
    });

    render(<AcceptSharePage {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Convite de Compartilhamento')).toBeInTheDocument();
    });
  });

  it('should have accept button', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        owner: 'owner@example.com',
        modelsCount: 5,
        permission: 'edit',
      }),
    });

    render(<AcceptSharePage {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Aceitar Compartilhamento')).toBeInTheDocument();
    });
  });

  it('should show back button on error', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
    });

    render(<AcceptSharePage {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Voltar ao Início')).toBeInTheDocument();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// DispositivoModal TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('DispositivoModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    dispositivoText: '<p>Test dispositivo content</p>',
    setDispositivoText: vi.fn(),
    copySuccess: false,
    setCopySuccess: vi.fn(),
    setError: vi.fn(),
    extractedTopics: [] as Topic[],
    setExtractedTopics: vi.fn(),
    selectedTopics: [] as Topic[],
    setSelectedTopics: vi.fn(),
    sanitizeHTML: (html: string) => html,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render when isOpen is true', () => {
    render(<DispositivoModal {...defaultProps} />);
    expect(screen.getByText('Dispositivo Gerado com IA')).toBeInTheDocument();
  });

  it('should not render when isOpen is false', () => {
    render(<DispositivoModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Dispositivo Gerado com IA')).not.toBeInTheDocument();
  });

  it('should display the dispositivo text', () => {
    render(<DispositivoModal {...defaultProps} />);
    expect(screen.getByText('Test dispositivo content')).toBeInTheDocument();
  });

  it('should show revision warning', () => {
    render(<DispositivoModal {...defaultProps} />);
    expect(screen.getByText('ATENÇÃO: REVISÃO OBRIGATÓRIA')).toBeInTheDocument();
  });

  it('should have copy buttons', () => {
    render(<DispositivoModal {...defaultProps} />);
    expect(screen.getByText('Copiar Texto Puro')).toBeInTheDocument();
    expect(screen.getByText('Copiar Formatado')).toBeInTheDocument();
  });

  it('should have add to topics button', () => {
    render(<DispositivoModal {...defaultProps} />);
    expect(screen.getByText('Adicionar aos Tópicos')).toBeInTheDocument();
  });

  it('should have close button', () => {
    render(<DispositivoModal {...defaultProps} />);
    expect(screen.getByText('Fechar')).toBeInTheDocument();
  });

  it('should call onClose when close button clicked', () => {
    render(<DispositivoModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Fechar'));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('should copy text to clipboard when copy button clicked', async () => {
    render(<DispositivoModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Copiar Texto Puro'));

    await waitFor(() => {
      expect(mockClipboard.writeText).toHaveBeenCalledWith('<p>Test dispositivo content</p>');
      expect(defaultProps.setCopySuccess).toHaveBeenCalledWith(true);
    });
  });

  it('should add dispositivo to topics when button clicked', () => {
    const setExtractedTopics = vi.fn();
    const setSelectedTopics = vi.fn();
    const onClose = vi.fn();

    render(
      <DispositivoModal
        {...defaultProps}
        setExtractedTopics={setExtractedTopics}
        setSelectedTopics={setSelectedTopics}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByText('Adicionar aos Tópicos'));

    expect(setExtractedTopics).toHaveBeenCalled();
    expect(setSelectedTopics).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('should replace existing dispositivo topic', () => {
    const existingDispositivo = createMockTopic({ title: 'DISPOSITIVO' });
    const setSelectedTopics = vi.fn();

    render(
      <DispositivoModal
        {...defaultProps}
        selectedTopics={[existingDispositivo]}
        setSelectedTopics={setSelectedTopics}
      />
    );

    expect(screen.getByText('Substituir Dispositivo')).toBeInTheDocument();
  });

  it('should show copy success state', () => {
    render(<DispositivoModal {...defaultProps} copySuccess={true} />);
    expect(screen.getAllByText('✓ Copiado!').length).toBeGreaterThan(0);
  });

  it('should close on ESC key', () => {
    render(<DispositivoModal {...defaultProps} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('should show placeholder when no dispositivo text', () => {
    render(<DispositivoModal {...defaultProps} dispositivoText="" />);
    expect(screen.getByText(/O dispositivo será gerado aqui/)).toBeInTheDocument();
  });

  it('should show revision checklist items', () => {
    render(<DispositivoModal {...defaultProps} />);
    expect(screen.getByText('✓ Nomes corretos das partes')).toBeInTheDocument();
    expect(screen.getByText('✓ Pedidos e valores mencionados')).toBeInTheDocument();
  });

  it('should update existing dispositivo in extractedTopics', () => {
    const existingTopics = [createMockTopic({ title: 'DISPOSITIVO', editedContent: 'Old content' })];
    const setExtractedTopics = vi.fn();
    const setSelectedTopics = vi.fn();
    const onClose = vi.fn();

    render(
      <DispositivoModal
        {...defaultProps}
        extractedTopics={existingTopics}
        selectedTopics={existingTopics}
        setExtractedTopics={setExtractedTopics}
        setSelectedTopics={setSelectedTopics}
        onClose={onClose}
      />
    );

    // Button shows "Substituir" when dispositivo exists in selectedTopics
    fireEvent.click(screen.getByText('Substituir Dispositivo'));
    expect(setExtractedTopics).toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// BulkReviewModal TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('BulkReviewModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    bulkReviewModels: [] as BulkGeneratedModel[],
    bulkFiles: [] as BulkFile[],
    bulkGeneratedModels: [] as BulkGeneratedModel[],
    bulkErrors: [] as BulkError[],
    onRemoveModel: vi.fn(),
    onDiscard: vi.fn(),
    onSave: vi.fn(),
    sanitizeHTML: (html: string) => html,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when isOpen is false', () => {
    render(<BulkReviewModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Revisão de Modelos Gerados')).not.toBeInTheDocument();
  });

  it('should render when isOpen is true', () => {
    render(<BulkReviewModal {...defaultProps} />);
    expect(screen.getByText('Revisão de Modelos Gerados')).toBeInTheDocument();
  });

  it('should show empty state when no models', () => {
    render(<BulkReviewModal {...defaultProps} />);
    expect(screen.getByText('Nenhum modelo para revisar')).toBeInTheDocument();
  });

  it('should show models list when models exist', () => {
    const models = [createMockBulkGeneratedModel({ title: 'Model 1' })];
    render(<BulkReviewModal {...defaultProps} bulkReviewModels={models} />);
    expect(screen.getByText('Model 1')).toBeInTheDocument();
  });

  it('should show errors when errors exist', () => {
    const errors = [createMockBulkError({ file: 'error.pdf', error: 'Failed to process' })];
    render(<BulkReviewModal {...defaultProps} bulkErrors={errors} />);
    // Check for error section (with emoji)
    expect(screen.getByText(/Arquivos com erro/)).toBeInTheDocument();
    expect(screen.getByText(/error.pdf/)).toBeInTheDocument();
  });

  it('should call onRemoveModel when remove button clicked', () => {
    const models = [createMockBulkGeneratedModel({ id: 'model-1' })];
    const onRemoveModel = vi.fn();
    render(<BulkReviewModal {...defaultProps} bulkReviewModels={models} onRemoveModel={onRemoveModel} />);

    const removeButton = screen.getByTitle('Remover este modelo');
    fireEvent.click(removeButton);
    expect(onRemoveModel).toHaveBeenCalledWith('model-1');
  });

  it('should call onDiscard when discard button clicked', () => {
    render(<BulkReviewModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Descartar Tudo'));
    expect(defaultProps.onDiscard).toHaveBeenCalled();
  });

  it('should call onSave when save button clicked', () => {
    const models = [createMockBulkGeneratedModel()];
    render(<BulkReviewModal {...defaultProps} bulkReviewModels={models} />);
    fireEvent.click(screen.getByText(/Salvar 1 Modelo/));
    expect(defaultProps.onSave).toHaveBeenCalled();
  });

  it('should disable save button when no models', () => {
    render(<BulkReviewModal {...defaultProps} />);
    const saveButton = screen.getByText(/Salvar 0 Modelo/);
    expect(saveButton).toBeDisabled();
  });

  it('should show summary statistics', () => {
    const files = [createMockBulkFile(), createMockBulkFile()];
    const models = [createMockBulkGeneratedModel()];
    const errors = [createMockBulkError()];

    render(
      <BulkReviewModal
        {...defaultProps}
        bulkFiles={files}
        bulkReviewModels={models}
        bulkErrors={errors}
      />
    );

    expect(screen.getByText('Total de arquivos:')).toBeInTheDocument();
    expect(screen.getByText('Modelos na revisão:')).toBeInTheDocument();
    expect(screen.getByText('Erros:')).toBeInTheDocument();
  });

  it('should show similarity warning for similar models', () => {
    const models = [createMockBulkGeneratedModel({
      similarityInfo: {
        similarity: 0.95,
        similarModel: { title: 'Similar Model' } as any,
      },
    })];

    render(<BulkReviewModal {...defaultProps} bulkReviewModels={models} />);
    expect(screen.getByText(/95% similar a "Similar Model"/)).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// BulkUploadModal TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('BulkUploadModal', () => {
  const fileInputRef = { current: { click: vi.fn() } };

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    isProcessing: false,
    isReviewOpen: false,
    bulkFiles: [] as BulkFile[],
    bulkFileInputRef: fileInputRef as any,
    onFileUpload: vi.fn(),
    onRemoveFile: vi.fn(),
    onProcess: vi.fn(),
    currentFileIndex: 0,
    processedFiles: [] as any[],
    bulkStaggerDelay: 0,
    setBulkStaggerDelay: vi.fn(),
    bulkCancelController: null,
    generatedModels: [] as any[],
    bulkCurrentBatch: 1,
    bulkBatchSize: 3,
    openModal: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when isOpen is false', () => {
    render(<BulkUploadModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Criar Modelos de Arquivos com IA')).not.toBeInTheDocument();
  });

  it('should render upload view when not processing', () => {
    render(<BulkUploadModal {...defaultProps} />);
    expect(screen.getByText('Criar Modelos de Arquivos com IA')).toBeInTheDocument();
  });

  it('should show upload area', () => {
    render(<BulkUploadModal {...defaultProps} />);
    expect(screen.getByText('Clique para selecionar arquivos')).toBeInTheDocument();
  });

  it('should have clickable upload area', () => {
    render(<BulkUploadModal {...defaultProps} />);
    // The upload area should be clickable and contain the prompt text
    const uploadArea = screen.getByText('Clique para selecionar arquivos').closest('div');
    expect(uploadArea).toBeInTheDocument();
  });

  it('should show file list when files selected', () => {
    const files = [createMockBulkFile({ name: 'document.pdf' })];
    render(<BulkUploadModal {...defaultProps} bulkFiles={files} />);
    expect(screen.getByText('document.pdf')).toBeInTheDocument();
  });

  it('should call onRemoveFile when remove button clicked', () => {
    const files = [createMockBulkFile()];
    const onRemoveFile = vi.fn();
    render(<BulkUploadModal {...defaultProps} bulkFiles={files} onRemoveFile={onRemoveFile} />);

    const removeButton = screen.getByTitle('Remover');
    fireEvent.click(removeButton);
    expect(onRemoveFile).toHaveBeenCalledWith(0);
  });

  it('should show delay selector', () => {
    render(<BulkUploadModal {...defaultProps} />);
    expect(screen.getByText(/Delay entre iniciar arquivos/)).toBeInTheDocument();
  });

  it('should call setBulkStaggerDelay when delay changed', () => {
    const setBulkStaggerDelay = vi.fn();
    render(<BulkUploadModal {...defaultProps} setBulkStaggerDelay={setBulkStaggerDelay} />);

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '500' } });
    expect(setBulkStaggerDelay).toHaveBeenCalledWith(500);
  });

  it('should disable process button when no files', () => {
    render(<BulkUploadModal {...defaultProps} />);
    const processButton = screen.getByText(/Processar 0 Arquivo/);
    expect(processButton).toBeDisabled();
  });

  it('should enable process button when files selected', () => {
    const files = [createMockBulkFile()];
    render(<BulkUploadModal {...defaultProps} bulkFiles={files} />);
    const processButton = screen.getByText(/Processar 1 Arquivo/);
    expect(processButton).not.toBeDisabled();
  });

  it('should call onProcess when process button clicked', () => {
    const files = [createMockBulkFile()];
    const onProcess = vi.fn();
    render(<BulkUploadModal {...defaultProps} bulkFiles={files} onProcess={onProcess} />);

    fireEvent.click(screen.getByText(/Processar 1 Arquivo/));
    expect(onProcess).toHaveBeenCalled();
  });

  it('should call onClose when cancel button clicked', () => {
    render(<BulkUploadModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Cancelar'));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('should render processing view when processing', () => {
    const files = [createMockBulkFile()];
    render(<BulkUploadModal {...defaultProps} bulkFiles={files} isProcessing={true} />);
    expect(screen.getByText('Processando Arquivos...')).toBeInTheDocument();
  });

  it('should show cancel button during processing', () => {
    const files = [createMockBulkFile()];
    render(<BulkUploadModal {...defaultProps} bulkFiles={files} isProcessing={true} />);
    expect(screen.getByText('Cancelar Processamento')).toBeInTheDocument();
  });

  it('should call openModal when cancel processing clicked', () => {
    const files = [createMockBulkFile()];
    const openModal = vi.fn();
    render(<BulkUploadModal {...defaultProps} bulkFiles={files} isProcessing={true} openModal={openModal} />);

    fireEvent.click(screen.getByText('Cancelar Processamento'));
    expect(openModal).toHaveBeenCalledWith('confirmBulkCancel');
  });

  it('should show progress during processing', () => {
    const files = [createMockBulkFile(), createMockBulkFile()];
    const processedFiles = [{ file: files[0].name, status: 'success', modelsCount: 1, duration: '2' }];

    render(
      <BulkUploadModal
        {...defaultProps}
        bulkFiles={files}
        isProcessing={true}
        processedFiles={processedFiles}
      />
    );

    expect(screen.getByText(/1 de 2 arquivos/)).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('should show success status for completed files', () => {
    const files = [createMockBulkFile({ name: 'success.pdf' })];
    const processedFiles = [{ file: 'success.pdf', status: 'success', modelsCount: 2, duration: '1.5' }];

    render(
      <BulkUploadModal
        {...defaultProps}
        bulkFiles={files}
        isProcessing={true}
        processedFiles={processedFiles}
      />
    );

    expect(screen.getByText(/2 modelos gerados em 1.5s/)).toBeInTheDocument();
  });

  it('should show error status for failed files', () => {
    const files = [createMockBulkFile({ name: 'error.pdf' })];
    const processedFiles = [{ file: 'error.pdf', status: 'error', error: 'Processing failed' }];

    render(
      <BulkUploadModal
        {...defaultProps}
        bulkFiles={files}
        isProcessing={true}
        processedFiles={processedFiles}
      />
    );

    expect(screen.getByText(/Erro: Processing failed/)).toBeInTheDocument();
  });

  it('should return null when processing and review open', () => {
    const { container } = render(
      <BulkUploadModal {...defaultProps} isProcessing={false} isReviewOpen={true} />
    );
    expect(container.firstChild).toBeNull();
  });
});

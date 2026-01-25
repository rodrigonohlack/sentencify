/**
 * @file EditorTabContent.test.tsx
 * @description Testes para o componente EditorTabContent
 * @version 1.38.52
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EditorTabContent } from './EditorTabContent';
import type { EditorTabContentProps } from './EditorTabContent';
import type { Topic, Model, Proof } from '../../types';

// ═══════════════════════════════════════════════════════════════════════════
// MOCKS
// ═══════════════════════════════════════════════════════════════════════════

vi.mock('../../constants/styles', () => ({
  CSS: {
    modalHeader: 'modal-header-class',
    flexGap2: 'flex gap-2',
    label: 'label-class',
  },
}));

vi.mock('../', () => ({
  DecisionEditorContainer: vi.fn(({ topic, onSave, onCancel }) => (
    <div data-testid="decision-editor-container">
      <span data-testid="editing-topic">{topic?.title}</span>
      <button data-testid="save-btn" onClick={onSave}>Save</button>
      <button data-testid="cancel-btn" onClick={onCancel}>Cancel</button>
    </div>
  )),
  SuggestionCard: vi.fn(({ model, onPreview, onInsert }) => (
    <div data-testid={`suggestion-${model.id}`}>
      <span>{model.title}</span>
      <button data-testid={`preview-${model.id}`} onClick={() => onPreview(model)}>Preview</button>
      <button data-testid={`insert-${model.id}`} onClick={() => onInsert(model.content)}>Insert</button>
    </div>
  )),
}));

vi.mock('../../stores/useModelsStore', () => ({
  useModelsStore: {
    getState: vi.fn(() => ({
      useSemanticManualSearch: false,
    })),
  },
}));

vi.mock('../../utils/text', () => ({
  isRelatorio: vi.fn((topic: Topic) => topic.title?.toUpperCase() === 'RELATÓRIO'),
}));

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

const mockSaveTopicEdit = vi.fn();
const mockSaveTopicEditWithoutClosing = vi.fn();
const mockSetSelectedTopics = vi.fn();
const mockSetExtractedTopics = vi.fn();
const mockSetEditingTopic = vi.fn();
const mockSetLastEditedTopicTitle = vi.fn();
const mockSetActiveTab = vi.fn();
const mockOpenPreview = vi.fn();
const mockHandleCategoryChange = vi.fn();
const mockHandleFundamentacaoChange = vi.fn();
const mockHandleRelatorioChange = vi.fn();
const mockRegenerateRelatorioWithInstruction = vi.fn();
const mockRegenerateRelatorioProcessual = vi.fn();
const mockRegenerateDispositivoWithInstruction = vi.fn();
const mockConfirmExtractModel = vi.fn();
const mockSaveAsModel = vi.fn();
const mockInsertModelContent = vi.fn();
const mockFindSuggestions = vi.fn();
const mockGetTopicEditorConfig = vi.fn(() => ({
  showRelatorio: true,
  showFundamentacao: true,
  showCategory: true,
  showMiniRelatorio: true,
  showDecisionEditor: true,
  relatorioConfig: { placeholder: '', label: '' },
  editorConfig: { placeholder: '', label: '' },
})) as never;
const mockToggleEditorTheme = vi.fn();
const mockOpenSlashMenu = vi.fn();
const mockOpenModal = vi.fn();
const mockSanitizeHTML = vi.fn((html: string) => html);
const mockSetUseSemanticManualSearch = vi.fn();
const mockSetSemanticManualSearchResults = vi.fn();
const mockSetManualSearchTerm = vi.fn();
const mockSetManualSearchResults = vi.fn();
const mockDebouncedManualSearch = vi.fn();
const mockSetSuggestions = vi.fn();
const mockSetShowProofPanel = vi.fn();
const mockSetRelatorioInstruction = vi.fn();
const mockSetDispositivoInstruction = vi.fn();

const createMockTopic = (title = 'Horas Extras') => ({
  title,
  category: 'MÉRITO' as const,
  content: 'Content',
  relatorio: 'Report',
  ordem: 1,
}) as Topic;

const createMockModel = (id: string, title: string): Model => ({
  id,
  title,
  content: `<p>${title} content</p>`,
  category: 'Mérito',
  createdAt: new Date().toISOString(),
});

const createMockProof = (id: number, name: string): Proof => ({
  id,
  name,
  type: 'text',
  isPdf: false,
  uploadDate: new Date().toISOString(),
} as Proof);

const createDefaultProps = (overrides: Partial<EditorTabContentProps> = {}): EditorTabContentProps => ({
  editorContainerRef: { current: null },
  editorRef: { current: null },
  relatorioRef: { current: null },
  editingTopic: null,
  selectedTopics: [],
  extractedTopics: [],
  setSelectedTopics: mockSetSelectedTopics,
  setExtractedTopics: mockSetExtractedTopics,
  setEditingTopic: mockSetEditingTopic,
  setLastEditedTopicTitle: mockSetLastEditedTopicTitle,
  setActiveTab: mockSetActiveTab,
  linkedProofs: [],
  modelLibrary: {
    models: [],
    suggestions: [],
    manualSearchTerm: '',
    manualSearchResults: [],
    loadingSuggestions: false,
    suggestionsSource: null,
    extractingModelFromDecision: false,
    showExtractModelButton: false,
    setManualSearchTerm: mockSetManualSearchTerm,
    setManualSearchResults: mockSetManualSearchResults,
    debouncedManualSearch: mockDebouncedManualSearch,
    setSuggestions: mockSetSuggestions,
  },
  modelPreview: {
    openPreview: mockOpenPreview,
  },
  proofManager: {
    showProofPanel: false,
    setShowProofPanel: mockSetShowProofPanel,
    proofUsePdfMode: {},
    proofAnalysisResults: {},
    proofConclusions: {},
  },
  aiIntegration: {
    regeneratingRelatorio: false,
    relatorioInstruction: '',
    setRelatorioInstruction: mockSetRelatorioInstruction,
    dispositivoInstruction: '',
    setDispositivoInstruction: mockSetDispositivoInstruction,
    regeneratingDispositivo: false,
  },
  saveTopicEdit: mockSaveTopicEdit,
  saveTopicEditWithoutClosing: mockSaveTopicEditWithoutClosing,
  savingTopic: false,
  handleCategoryChange: mockHandleCategoryChange,
  handleFundamentacaoChange: mockHandleFundamentacaoChange,
  handleRelatorioChange: mockHandleRelatorioChange,
  regenerateRelatorioWithInstruction: mockRegenerateRelatorioWithInstruction,
  regenerateRelatorioProcessual: mockRegenerateRelatorioProcessual,
  regenerateDispositivoWithInstruction: mockRegenerateDispositivoWithInstruction,
  confirmExtractModel: mockConfirmExtractModel,
  saveAsModel: mockSaveAsModel,
  insertModelContent: mockInsertModelContent,
  findSuggestions: mockFindSuggestions,
  getTopicEditorConfig: mockGetTopicEditorConfig,
  quillReady: true,
  quillError: null,
  editorTheme: 'dark',
  toggleEditorTheme: mockToggleEditorTheme,
  isIndividualDirty: false,
  fieldVersioning: {} as never,
  handleOpenFactsComparisonIndividual: null,
  openSlashMenu: mockOpenSlashMenu,
  openModal: mockOpenModal,
  sanitizeHTML: mockSanitizeHTML,
  searchModelReady: false,
  useSemanticManualSearch: false,
  setUseSemanticManualSearch: mockSetUseSemanticManualSearch,
  semanticManualSearching: false,
  setSemanticManualSearchResults: mockSetSemanticManualSearchResults,
  ...overrides,
});

// ═══════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('EditorTabContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EMPTY STATE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Empty State', () => {
    it('should show empty message when no topic is being edited', () => {
      render(<EditorTabContent {...createDefaultProps()} />);

      expect(screen.getByText(/Selecione um tópico na aba "Tópicos" para editar/)).toBeInTheDocument();
    });

    it('should not show editor when no topic is selected', () => {
      render(<EditorTabContent {...createDefaultProps()} />);

      expect(screen.queryByTestId('decision-editor-container')).not.toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EDITOR RENDERING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Editor Rendering', () => {
    it('should show editor when topic is being edited', () => {
      const props = createDefaultProps({
        editingTopic: createMockTopic('Horas Extras'),
      });
      render(<EditorTabContent {...props} />);

      expect(screen.getByTestId('decision-editor-container')).toBeInTheDocument();
    });

    it('should pass topic to DecisionEditorContainer', () => {
      const props = createDefaultProps({
        editingTopic: createMockTopic('Dano Moral'),
      });
      render(<EditorTabContent {...props} />);

      expect(screen.getByTestId('editing-topic')).toHaveTextContent('Dano Moral');
    });

    it('should call saveTopicEdit when save is clicked', async () => {
      const props = createDefaultProps({
        editingTopic: createMockTopic(),
      });
      render(<EditorTabContent {...props} />);

      fireEvent.click(screen.getByTestId('save-btn'));

      expect(mockSaveTopicEdit).toHaveBeenCalled();
    });

    it('should reset state when cancel is clicked', () => {
      const props = createDefaultProps({
        editingTopic: createMockTopic('Test Topic'),
      });
      render(<EditorTabContent {...props} />);

      fireEvent.click(screen.getByTestId('cancel-btn'));

      expect(mockSetLastEditedTopicTitle).toHaveBeenCalledWith('Test Topic');
      expect(mockSetEditingTopic).toHaveBeenCalledWith(null);
      expect(mockSetSuggestions).toHaveBeenCalledWith([]);
      expect(mockSetActiveTab).toHaveBeenCalledWith('topics');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SUGGESTIONS PANEL
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Suggestions Panel', () => {
    it('should show suggestions header when editing', () => {
      const props = createDefaultProps({
        editingTopic: createMockTopic(),
      });
      render(<EditorTabContent {...props} />);

      expect(screen.getByText(/Sugestões de Modelos/)).toBeInTheDocument();
    });

    it('should show manual search input', () => {
      const props = createDefaultProps({
        editingTopic: createMockTopic(),
      });
      render(<EditorTabContent {...props} />);

      expect(screen.getByText(/Busca Manual/)).toBeInTheDocument();
    });

    it('should show loading state when suggestions are loading', () => {
      const props = createDefaultProps({
        editingTopic: createMockTopic(),
        modelLibrary: {
          ...createDefaultProps().modelLibrary,
          loadingSuggestions: true,
        },
      });
      render(<EditorTabContent {...props} />);

      expect(screen.getByText(/Analisando modelos relevantes/)).toBeInTheDocument();
    });

    it('should render suggestions when available', () => {
      const suggestions = [
        createMockModel('model-1', 'Suggestion 1'),
        createMockModel('model-2', 'Suggestion 2'),
      ];
      const props = createDefaultProps({
        editingTopic: createMockTopic(),
        modelLibrary: {
          ...createDefaultProps().modelLibrary,
          suggestions,
        },
      });
      render(<EditorTabContent {...props} />);

      expect(screen.getByTestId('suggestion-model-1')).toBeInTheDocument();
      expect(screen.getByTestId('suggestion-model-2')).toBeInTheDocument();
    });

    it('should show empty suggestions message when no suggestions', () => {
      const props = createDefaultProps({
        editingTopic: createMockTopic(),
        modelLibrary: {
          ...createDefaultProps().modelLibrary,
          suggestions: [],
        },
      });
      render(<EditorTabContent {...props} />);

      expect(screen.getByText(/Nenhum modelo sugerido automaticamente/)).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // MANUAL SEARCH
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Manual Search', () => {
    it('should update search term on input', () => {
      const props = createDefaultProps({
        editingTopic: createMockTopic(),
      });
      render(<EditorTabContent {...props} />);

      const searchInput = screen.getByPlaceholderText(/Digite para buscar modelos/);
      fireEvent.change(searchInput, { target: { value: 'horas' } });

      expect(mockSetManualSearchTerm).toHaveBeenCalledWith('horas');
      expect(mockDebouncedManualSearch).toHaveBeenCalledWith('horas');
    });

    it('should show search results when available', () => {
      const searchResults = [
        createMockModel('result-1', 'Search Result 1'),
        createMockModel('result-2', 'Search Result 2'),
      ];
      const props = createDefaultProps({
        editingTopic: createMockTopic(),
        modelLibrary: {
          ...createDefaultProps().modelLibrary,
          manualSearchTerm: 'test',
          manualSearchResults: searchResults,
        },
      });
      render(<EditorTabContent {...props} />);

      expect(screen.getByText(/Resultados da Busca/)).toBeInTheDocument();
      expect(screen.getByTestId('suggestion-result-1')).toBeInTheDocument();
    });

    it('should show no results message when search yields nothing', () => {
      const props = createDefaultProps({
        editingTopic: createMockTopic(),
        modelLibrary: {
          ...createDefaultProps().modelLibrary,
          manualSearchTerm: 'nonexistent',
          manualSearchResults: [],
        },
      });
      render(<EditorTabContent {...props} />);

      expect(screen.getByText(/Nenhum modelo encontrado/)).toBeInTheDocument();
    });

    it('should show clear button when search term exists', () => {
      const props = createDefaultProps({
        editingTopic: createMockTopic(),
        modelLibrary: {
          ...createDefaultProps().modelLibrary,
          manualSearchTerm: 'test',
        },
      });
      render(<EditorTabContent {...props} />);

      const clearButton = screen.getByTitle('Limpar busca');
      expect(clearButton).toBeInTheDocument();
    });

    it('should clear search on clear button click', () => {
      const props = createDefaultProps({
        editingTopic: createMockTopic(),
        modelLibrary: {
          ...createDefaultProps().modelLibrary,
          manualSearchTerm: 'test',
        },
      });
      render(<EditorTabContent {...props} />);

      const clearButton = screen.getByTitle('Limpar busca');
      fireEvent.click(clearButton);

      expect(mockSetManualSearchTerm).toHaveBeenCalledWith('');
      expect(mockSetManualSearchResults).toHaveBeenCalledWith([]);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SEMANTIC SEARCH
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Semantic Search', () => {
    it('should show semantic search toggle when search model is ready', () => {
      const props = createDefaultProps({
        editingTopic: createMockTopic(),
        searchModelReady: true,
      });
      render(<EditorTabContent {...props} />);

      // Toggle button should exist (🔤 for textual, 🧠 for semantic)
      expect(screen.getByTitle(/Busca textual/)).toBeInTheDocument();
    });

    it('should toggle semantic search on button click', () => {
      const props = createDefaultProps({
        editingTopic: createMockTopic(),
        searchModelReady: true,
        useSemanticManualSearch: false,
      });
      render(<EditorTabContent {...props} />);

      const toggleButton = screen.getByTitle(/Busca textual/);
      fireEvent.click(toggleButton);

      expect(mockSetUseSemanticManualSearch).toHaveBeenCalledWith(true);
    });

    it('should show loading indicator during semantic search', () => {
      const props = createDefaultProps({
        editingTopic: createMockTopic(),
        searchModelReady: true,
        useSemanticManualSearch: true,
        semanticManualSearching: true,
      });
      render(<EditorTabContent {...props} />);

      expect(screen.getByText(/Buscando por significado/)).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // LINKED PROOFS PANEL
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Linked Proofs Panel', () => {
    it('should not show proofs panel when no proofs are linked', () => {
      const props = createDefaultProps({
        editingTopic: createMockTopic(),
        linkedProofs: [],
      });
      render(<EditorTabContent {...props} />);

      expect(screen.queryByText(/Provas Vinculadas/)).not.toBeInTheDocument();
    });

    it('should show proofs panel when proofs are linked', () => {
      const props = createDefaultProps({
        editingTopic: createMockTopic(),
        linkedProofs: [createMockProof(1, 'Proof 1'), createMockProof(2, 'Proof 2')],
      });
      render(<EditorTabContent {...props} />);

      expect(screen.getByText(/Provas Vinculadas \(2\)/)).toBeInTheDocument();
    });

    it('should toggle proof panel visibility', () => {
      const props = createDefaultProps({
        editingTopic: createMockTopic(),
        linkedProofs: [createMockProof(1, 'Proof 1')],
      });
      render(<EditorTabContent {...props} />);

      const headerButton = screen.getByText(/Provas Vinculadas/).closest('div');
      if (headerButton) {
        fireEvent.click(headerButton);
        expect(mockSetShowProofPanel).toHaveBeenCalled();
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // MODEL INTERACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Model Interactions', () => {
    it('should call openPreview when preview button is clicked', () => {
      const model = createMockModel('model-1', 'Test Model');
      const props = createDefaultProps({
        editingTopic: createMockTopic(),
        modelLibrary: {
          ...createDefaultProps().modelLibrary,
          suggestions: [model],
        },
      });
      render(<EditorTabContent {...props} />);

      fireEvent.click(screen.getByTestId('preview-model-1'));

      expect(mockOpenPreview).toHaveBeenCalledWith(model);
    });

    it('should call insertModelContent when insert button is clicked', () => {
      const model = createMockModel('model-1', 'Test Model');
      const props = createDefaultProps({
        editingTopic: createMockTopic(),
        modelLibrary: {
          ...createDefaultProps().modelLibrary,
          suggestions: [model],
        },
      });
      render(<EditorTabContent {...props} />);

      fireEvent.click(screen.getByTestId('insert-model-1'));

      expect(mockInsertModelContent).toHaveBeenCalledWith('<p>Test Model content</p>');
    });
  });
});

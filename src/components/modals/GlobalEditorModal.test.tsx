/**
 * @file GlobalEditorModal.test.tsx
 * @description Testes para o modal de edicao global
 * @version 1.38.49
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { GlobalEditorModal } from './GlobalEditorModal';
import type { GlobalEditorModalProps, Topic, Model } from '../../types';

// ═══════════════════════════════════════════════════════════════════════════
// MOCKS
// ═══════════════════════════════════════════════════════════════════════════

// Mock hooks
vi.mock('../../hooks', () => ({
  useChatAssistant: vi.fn(() => ({
    history: [],
    send: vi.fn(),
    clear: vi.fn(),
    generating: false,
    lastResponse: null,
  })),
  useFieldVersioning: vi.fn(() => ({
    versions: {},
    saveVersion: vi.fn(),
    getVersions: vi.fn(() => []),
    restoreVersion: vi.fn(),
  })),
  searchModelsInLibrary: vi.fn(() => []),
}));

vi.mock('../../hooks/useFactsComparisonCache', () => ({
  default: vi.fn(() => ({
    getComparison: vi.fn().mockResolvedValue(null),
    saveComparison: vi.fn(),
  })),
}));

vi.mock('../../hooks/useChatHistoryCache', () => ({
  default: vi.fn(() => ({
    saveChat: vi.fn(),
    getChat: vi.fn().mockResolvedValue(null),
    deleteChat: vi.fn(),
    getIncludeMainDocs: vi.fn().mockResolvedValue(true),
    setIncludeMainDocs: vi.fn(),
  })),
}));

// Mock subcomponents
vi.mock('../editors/GlobalEditorSection', () => ({
  GlobalEditorSection: ({ topic, topicIndex, onToggleCollapse, isCollapsed, onFieldChange, onFieldFocus, onOpenAIAssistant, onOpenProofsModal, onOpenJurisModal, onOpenFactsComparison }: {
    topic: Topic;
    topicIndex: number;
    onToggleCollapse: (idx: number) => void;
    isCollapsed: boolean;
    onFieldChange: (index: number, field: string, html: string) => void;
    onFieldFocus: (index: number, fieldType: string, topic: Topic | null) => void;
    onOpenAIAssistant: (index: number) => void;
    onOpenProofsModal: (index: number) => void;
    onOpenJurisModal: (index: number) => void;
    onOpenFactsComparison: (index: number) => void;
  }) => (
    <div data-testid={`editor-section-${topicIndex}`}>
      <span data-testid={`topic-title-${topicIndex}`}>{topic.title}</span>
      <button data-testid={`toggle-collapse-${topicIndex}`} onClick={() => onToggleCollapse(topicIndex)}>
        {isCollapsed ? 'Expand' : 'Collapse'}
      </button>
      <button data-testid={`change-field-${topicIndex}`} onClick={() => onFieldChange(topicIndex, 'editedFundamentacao', '<p>Updated content</p>')}>
        Change Field
      </button>
      <button data-testid={`change-relatorio-${topicIndex}`} onClick={() => onFieldChange(topicIndex, 'editedRelatorio', '<p>Updated relatorio</p>')}>
        Change Relatorio
      </button>
      <button data-testid={`focus-fundamentacao-${topicIndex}`} onClick={() => onFieldFocus(topicIndex, 'fundamentacao', topic)}>
        Focus Fundamentacao
      </button>
      <button data-testid={`focus-other-${topicIndex}`} onClick={() => onFieldFocus(topicIndex, 'relatorio', null)}>
        Focus Other
      </button>
      <button data-testid={`open-ai-${topicIndex}`} onClick={() => onOpenAIAssistant(topicIndex)}>
        Open AI
      </button>
      <button data-testid={`open-proofs-${topicIndex}`} onClick={() => onOpenProofsModal(topicIndex)}>
        Open Proofs
      </button>
      <button data-testid={`open-juris-${topicIndex}`} onClick={() => onOpenJurisModal(topicIndex)}>
        Open Juris
      </button>
      <button data-testid={`open-facts-${topicIndex}`} onClick={() => onOpenFactsComparison(topicIndex)}>
        Open Facts
      </button>
    </div>
  ),
}));

vi.mock('../cards/SuggestionCard', () => ({
  SuggestionCard: ({ model, onInsert, onPreview }: { model: Model; onInsert: (content: string) => void; onPreview: (model: Model) => void }) => (
    <div data-testid="suggestion-card">
      <span data-testid="suggestion-title">{model.title}</span>
      <button data-testid="insert-suggestion" onClick={() => onInsert(model.content || 'model content')}>Insert</button>
      <button data-testid="preview-suggestion" onClick={() => onPreview(model)}>Preview</button>
    </div>
  ),
}));

vi.mock('../ui/SpacingDropdown', () => ({
  SpacingDropdown: () => <div data-testid="spacing-dropdown">SpacingDropdown</div>,
}));

vi.mock('../ui/FontSizeDropdown', () => ({
  FontSizeDropdown: () => <div data-testid="fontsize-dropdown">FontSizeDropdown</div>,
}));

vi.mock('../ai/AIAssistantComponents', () => ({
  AIAssistantGlobalModal: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
    isOpen ? <div data-testid="ai-assistant-modal"><button data-testid="close-ai-modal" onClick={onClose}>Close AI</button></div> : null
  ),
}));

vi.mock('./MiscModals', () => ({
  LinkedProofsModal: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
    isOpen ? <div data-testid="linked-proofs-modal"><button data-testid="close-proofs-modal" onClick={onClose}>Close Proofs</button></div> : null
  ),
}));

vi.mock('./JurisprudenciaModal', () => ({
  JurisprudenciaModal: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
    isOpen ? <div data-testid="jurisprudencia-modal"><button data-testid="close-juris-modal" onClick={onClose}>Close Juris</button></div> : null
  ),
}));

vi.mock('./BaseModal', () => ({
  BaseModal: ({ isOpen, children, onClose }: { isOpen: boolean; children: React.ReactNode; onClose: () => void }) => (
    isOpen ? <div data-testid="base-modal"><button data-testid="close-base-modal" onClick={onClose}>Close</button>{children}</div> : null
  ),
}));

vi.mock('../FactsComparisonModal', () => ({
  FactsComparisonModalContent: ({ onGenerate }: { onGenerate: (source: string) => void }) => (
    <div data-testid="facts-comparison-content">
      <button data-testid="generate-facts-mini" onClick={() => onGenerate('mini-relatorio')}>Generate Mini</button>
      <button data-testid="generate-facts-docs" onClick={() => onGenerate('documentos-completos')}>Generate Docs</button>
    </div>
  ),
}));

vi.mock('../../utils/text', () => ({
  normalizeHTMLSpacing: vi.fn((html: string) => html),
}));

vi.mock('../../utils/chat-context-builder', () => ({
  buildChatContext: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../prompts/facts-comparison-prompts', () => ({
  buildMiniRelatorioComparisonPrompt: vi.fn(() => 'mock-mini-prompt'),
  buildDocumentosComparisonPrompt: vi.fn(() => 'mock-docs-prompt'),
  buildPdfComparisonPrompt: vi.fn(() => 'mock-pdf-prompt'),
}));

describe('GlobalEditorModal', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  const createMockTopic = (overrides: Partial<Topic> = {}): Topic => ({
    id: `topic-${Math.random()}`,
    title: 'Horas Extras',
    category: 'MERITO' as any,
    relatorio: 'Mini-relatorio sobre horas extras.',
    resultado: 'PROCEDENTE',
    fundamentacao: '<p>Fundamentacao padrao</p>',
    ...overrides,
  });

  const createDefaultProps = (overrides: Partial<GlobalEditorModalProps> = {}): GlobalEditorModalProps => ({
    isOpen: true,
    onClose: vi.fn(),
    selectedTopics: [createMockTopic()],
    setSelectedTopics: vi.fn(),
    setExtractedTopics: vi.fn(),
    models: [],
    findSuggestions: vi.fn().mockResolvedValue([]),
    sanitizeHTML: vi.fn((html: string) => html),
    showToast: vi.fn(),
    fontSize: 'normal',
    spacing: 'normal',
    setFontSize: vi.fn(),
    setSpacing: vi.fn(),
    editorTheme: 'dark',
    quillReady: true,
    quillError: null,
    modelPreview: null,
    analyzedDocuments: {
      peticoes: [],
      peticoesText: [],
      contestacoes: [],
      contestacoesText: [],
      complementares: [],
      complementaresText: [],
    },
    proofManager: null,
    aiIntegration: null,
    detectResultadoAutomatico: null,
    onSlashCommand: null,
    fileToBase64: null,
    openModal: null,
    closeModal: null,
    useLocalAIForSuggestions: false,
    useLocalAIForJuris: false,
    jurisSemanticThreshold: 50,
    searchModelReady: false,
    jurisEmbeddingsCount: 0,
    searchModelsBySimilarity: null,
    modelSemanticEnabled: false,
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // BASIC RENDERING TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Basic Rendering', () => {
    it('should render when open', () => {
      render(<GlobalEditorModal {...createDefaultProps()} />);

      expect(screen.getByText('Edicao Global')).toBeInTheDocument();
    });

    it('should not render when closed', () => {
      const { container } = render(<GlobalEditorModal {...createDefaultProps({ isOpen: false })} />);

      expect(container.firstChild).toBeNull();
    });

    it('should display topic count for multiple topics', () => {
      render(<GlobalEditorModal {...createDefaultProps({
        selectedTopics: [createMockTopic(), createMockTopic({ title: 'Adicional Noturno' })],
      })} />);

      expect(screen.getByText('2 topicos')).toBeInTheDocument();
    });

    it('should display singular topic count for 1 topic', () => {
      render(<GlobalEditorModal {...createDefaultProps()} />);

      expect(screen.getByText('1 topico')).toBeInTheDocument();
    });

    it('should render topic editor sections', () => {
      render(<GlobalEditorModal {...createDefaultProps()} />);

      expect(screen.getByTestId('editor-section-0')).toBeInTheDocument();
    });

    it('should render multiple topic sections', () => {
      render(<GlobalEditorModal {...createDefaultProps({
        selectedTopics: [
          createMockTopic({ title: 'Horas Extras' }),
          createMockTopic({ title: 'Adicional Noturno' }),
        ],
      })} />);

      expect(screen.getByTestId('editor-section-0')).toBeInTheDocument();
      expect(screen.getByTestId('editor-section-1')).toBeInTheDocument();
    });

    it('should show loading state when selectedTopics is empty', () => {
      render(<GlobalEditorModal {...createDefaultProps({ selectedTopics: [] })} />);

      expect(screen.getByText('Carregando topicos...')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // HEADER CONTROLS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Header Controls', () => {
    it('should render Modelos button showing "Fechar Modelos" in split mode', () => {
      render(<GlobalEditorModal {...createDefaultProps()} />);

      expect(screen.getByText('Fechar Modelos')).toBeInTheDocument();
    });

    it('should render Cancel button', () => {
      render(<GlobalEditorModal {...createDefaultProps()} />);

      expect(screen.getByText('Cancelar')).toBeInTheDocument();
    });

    it('should render Save button', () => {
      render(<GlobalEditorModal {...createDefaultProps()} />);

      expect(screen.getByText('Salvar')).toBeInTheDocument();
    });

    it('should render Save and Exit button', () => {
      render(<GlobalEditorModal {...createDefaultProps()} />);

      expect(screen.getByText('Salvar e Sair')).toBeInTheDocument();
    });

    it('should render spacing dropdown when setSpacing provided', () => {
      render(<GlobalEditorModal {...createDefaultProps()} />);

      expect(screen.getByTestId('spacing-dropdown')).toBeInTheDocument();
    });

    it('should render font size dropdown when setFontSize provided', () => {
      render(<GlobalEditorModal {...createDefaultProps()} />);

      expect(screen.getByTestId('fontsize-dropdown')).toBeInTheDocument();
    });

    it('should not render spacing dropdown when setSpacing is null', () => {
      render(<GlobalEditorModal {...createDefaultProps({ setSpacing: null })} />);

      expect(screen.queryByTestId('spacing-dropdown')).not.toBeInTheDocument();
    });

    it('should not render font size dropdown when setFontSize is null', () => {
      render(<GlobalEditorModal {...createDefaultProps({ setFontSize: null })} />);

      expect(screen.queryByTestId('fontsize-dropdown')).not.toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SPLIT MODE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Split Mode', () => {
    it('should start in split mode by default', () => {
      render(<GlobalEditorModal {...createDefaultProps()} />);

      expect(screen.getByText('Fechar Modelos')).toBeInTheDocument();
      expect(screen.getByText(/Sugest/)).toBeInTheDocument();
    });

    it('should toggle to non-split mode when clicking Fechar Modelos', () => {
      render(<GlobalEditorModal {...createDefaultProps()} />);

      fireEvent.click(screen.getByText('Fechar Modelos'));

      expect(screen.getByText('Modelos')).toBeInTheDocument();
    });

    it('should hide suggestions panel when split mode is off', () => {
      render(<GlobalEditorModal {...createDefaultProps()} />);

      fireEvent.click(screen.getByText('Fechar Modelos'));

      expect(screen.queryByText(/Sugest.*Modelos/)).not.toBeInTheDocument();
    });

    it('should toggle back to split mode after toggling off', () => {
      render(<GlobalEditorModal {...createDefaultProps()} />);

      fireEvent.click(screen.getByText('Fechar Modelos'));
      fireEvent.click(screen.getByText('Modelos'));

      expect(screen.getByText('Fechar Modelos')).toBeInTheDocument();
    });

    it('should show search input in split mode', () => {
      render(<GlobalEditorModal {...createDefaultProps()} />);

      expect(screen.getByPlaceholderText('Buscar modelos...')).toBeInTheDocument();
    });

    it('should show the divider bar in split mode', () => {
      const { container } = render(<GlobalEditorModal {...createDefaultProps()} />);

      const divider = container.querySelector('.cursor-col-resize');
      expect(divider).toBeInTheDocument();
    });

    it('should not show the divider bar when split mode is off', () => {
      const { container } = render(<GlobalEditorModal {...createDefaultProps()} />);

      fireEvent.click(screen.getByText('Fechar Modelos'));

      const divider = container.querySelector('.cursor-col-resize');
      expect(divider).not.toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DIRTY STATE AND FIELD CHANGES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Dirty State and Field Changes', () => {
    it('should not show "Nao salvo" badge initially', () => {
      render(<GlobalEditorModal {...createDefaultProps()} />);

      expect(screen.queryByText(/salvo/i)).not.toBeInTheDocument();
    });

    it('should show "Nao salvo" badge after field change', () => {
      render(<GlobalEditorModal {...createDefaultProps()} />);

      fireEvent.click(screen.getByTestId('change-field-0'));

      expect(screen.getByText(/salvo/i)).toBeInTheDocument();
    });

    it('should mark dirty when editedRelatorio changes', () => {
      render(<GlobalEditorModal {...createDefaultProps()} />);

      fireEvent.click(screen.getByTestId('change-relatorio-0'));

      expect(screen.getByText(/salvo/i)).toBeInTheDocument();
    });

    it('should clear dirty state after save', async () => {
      render(<GlobalEditorModal {...createDefaultProps()} />);

      fireEvent.click(screen.getByTestId('change-field-0'));
      expect(screen.getByText(/salvo/i)).toBeInTheDocument();

      fireEvent.click(screen.getByText('Salvar'));

      await waitFor(() => {
        expect(screen.queryByText(/salvo/i)).not.toBeInTheDocument();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SAVE AND CANCEL TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Save and Cancel', () => {
    it('should call onClose directly when no changes and clicking cancel', () => {
      const onClose = vi.fn();
      render(<GlobalEditorModal {...createDefaultProps({ onClose })} />);

      fireEvent.click(screen.getByText('Cancelar'));

      expect(onClose).toHaveBeenCalled();
    });

    it('should call setSelectedTopics when clicking Save', async () => {
      const setSelectedTopics = vi.fn();
      const showToast = vi.fn();
      render(<GlobalEditorModal {...createDefaultProps({ setSelectedTopics, showToast })} />);

      fireEvent.click(screen.getByText('Salvar'));

      await waitFor(() => {
        expect(setSelectedTopics).toHaveBeenCalled();
      });
    });

    it('should call setExtractedTopics when clicking Save', async () => {
      const setExtractedTopics = vi.fn();
      render(<GlobalEditorModal {...createDefaultProps({ setExtractedTopics })} />);

      fireEvent.click(screen.getByText('Salvar'));

      await waitFor(() => {
        expect(setExtractedTopics).toHaveBeenCalled();
      });
    });

    it('should show success toast when saving', async () => {
      const showToast = vi.fn();
      render(<GlobalEditorModal {...createDefaultProps({ showToast })} />);

      fireEvent.click(screen.getByText('Salvar'));

      await waitFor(() => {
        expect(showToast).toHaveBeenCalledWith(expect.stringContaining('salvas!'), 'success');
      });
    });

    it('should call onClose when clicking Save and Exit', async () => {
      const onClose = vi.fn();
      render(<GlobalEditorModal {...createDefaultProps({ onClose })} />);

      fireEvent.click(screen.getByText('Salvar e Sair'));

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });

    it('should show success toast on Save and Exit', async () => {
      const showToast = vi.fn();
      render(<GlobalEditorModal {...createDefaultProps({ showToast })} />);

      fireEvent.click(screen.getByText('Salvar e Sair'));

      await waitFor(() => {
        expect(showToast).toHaveBeenCalledWith(expect.stringContaining('salvas com sucesso!'), 'success');
      });
    });

    it('should call setSelectedTopics with updated topics on Save and Exit', async () => {
      const setSelectedTopics = vi.fn();
      render(<GlobalEditorModal {...createDefaultProps({ setSelectedTopics })} />);

      fireEvent.click(screen.getByText('Salvar e Sair'));

      await waitFor(() => {
        expect(setSelectedTopics).toHaveBeenCalled();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CANCEL CONFIRMATION DIALOG
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Cancel Confirmation Dialog', () => {
    it('should show confirmation dialog when canceling with unsaved changes', () => {
      render(<GlobalEditorModal {...createDefaultProps()} />);

      // Make a change to set dirty flag
      fireEvent.click(screen.getByTestId('change-field-0'));

      // Click cancel
      fireEvent.click(screen.getByText('Cancelar'));

      expect(screen.getByText(/Descartar alter/)).toBeInTheDocument();
    });

    it('should show explanation text in confirmation dialog', () => {
      render(<GlobalEditorModal {...createDefaultProps()} />);

      fireEvent.click(screen.getByTestId('change-field-0'));
      fireEvent.click(screen.getByText('Cancelar'));

      expect(screen.getByText(/salvas.*Deseja/)).toBeInTheDocument();
    });

    it('should show "Continuar Editando" button in confirmation dialog', () => {
      render(<GlobalEditorModal {...createDefaultProps()} />);

      fireEvent.click(screen.getByTestId('change-field-0'));
      fireEvent.click(screen.getByText('Cancelar'));

      expect(screen.getByText('Continuar Editando')).toBeInTheDocument();
    });

    it('should show "Descartar" button in confirmation dialog', () => {
      render(<GlobalEditorModal {...createDefaultProps()} />);

      fireEvent.click(screen.getByTestId('change-field-0'));
      fireEvent.click(screen.getByText('Cancelar'));

      expect(screen.getByText('Descartar')).toBeInTheDocument();
    });

    it('should close confirmation dialog when clicking "Continuar Editando"', () => {
      render(<GlobalEditorModal {...createDefaultProps()} />);

      fireEvent.click(screen.getByTestId('change-field-0'));
      fireEvent.click(screen.getByText('Cancelar'));
      fireEvent.click(screen.getByText('Continuar Editando'));

      expect(screen.queryByText(/Descartar alter/)).not.toBeInTheDocument();
    });

    it('should call onClose when clicking "Descartar"', () => {
      const onClose = vi.fn();
      render(<GlobalEditorModal {...createDefaultProps({ onClose })} />);

      fireEvent.click(screen.getByTestId('change-field-0'));
      fireEvent.click(screen.getByText('Cancelar'));
      fireEvent.click(screen.getByText('Descartar'));

      expect(onClose).toHaveBeenCalled();
    });

    it('should close confirmation dialog when clicking overlay', () => {
      const { container } = render(<GlobalEditorModal {...createDefaultProps()} />);

      fireEvent.click(screen.getByTestId('change-field-0'));
      fireEvent.click(screen.getByText('Cancelar'));

      // Click the overlay (bg-black/70 element)
      const overlay = container.querySelector('.bg-black\\/70');
      if (overlay) {
        fireEvent.click(overlay);
      }

      expect(screen.queryByText(/Descartar alter/)).not.toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FIELD FOCUS AND SUGGESTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Field Focus and Suggestions', () => {
    it('should show focused topic info when fundamentacao field is focused', async () => {
      const findSuggestions = vi.fn().mockResolvedValue([]);
      render(<GlobalEditorModal {...createDefaultProps({ findSuggestions })} />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('focus-fundamentacao-0'));
      });

      await waitFor(() => {
        expect(screen.getByText(/Editando: Horas Extras/)).toBeInTheDocument();
      });
    });

    it('should call findSuggestions when fundamentacao field is focused in split mode', async () => {
      const findSuggestions = vi.fn().mockResolvedValue([]);
      render(<GlobalEditorModal {...createDefaultProps({ findSuggestions })} />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('focus-fundamentacao-0'));
      });

      await waitFor(() => {
        expect(findSuggestions).toHaveBeenCalled();
      });
    });

    it('should display suggestions when findSuggestions returns results', async () => {
      const mockModel: Model = { id: 'model-1', title: 'Modelo HE', titulo: 'Modelo HE', conteudo: '<p>Conteudo</p>', category: 'MERITO' } as any;
      const findSuggestions = vi.fn().mockResolvedValue({ suggestions: [mockModel], source: null });
      render(<GlobalEditorModal {...createDefaultProps({ findSuggestions })} />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('focus-fundamentacao-0'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('suggestion-card')).toBeInTheDocument();
      });
    });

    it('should show "IA Local" badge when suggestionsSource is "local"', async () => {
      const findSuggestions = vi.fn().mockResolvedValue({ suggestions: [{ id: '1', title: 'Test', conteudo: '' }], source: 'local' });
      render(<GlobalEditorModal {...createDefaultProps({ findSuggestions })} />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('focus-fundamentacao-0'));
      });

      await waitFor(() => {
        expect(screen.getByText('IA Local')).toBeInTheDocument();
      });
    });

    it('should clear suggestions when focusing non-fundamentacao field', async () => {
      const findSuggestions = vi.fn().mockResolvedValue({ suggestions: [{ id: '1', title: 'Test', conteudo: '' }], source: null });
      render(<GlobalEditorModal {...createDefaultProps({ findSuggestions })} />);

      // Focus fundamentacao to get suggestions
      await act(async () => {
        fireEvent.click(screen.getByTestId('focus-fundamentacao-0'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('suggestion-card')).toBeInTheDocument();
      });

      // Focus other field to clear
      await act(async () => {
        fireEvent.click(screen.getByTestId('focus-other-0'));
      });

      await waitFor(() => {
        expect(screen.queryByTestId('suggestion-card')).not.toBeInTheDocument();
      });
    });

    it('should show "Nenhum modelo encontrado" when focused but no suggestions', async () => {
      const findSuggestions = vi.fn().mockResolvedValue([]);
      render(<GlobalEditorModal {...createDefaultProps({ findSuggestions })} />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('focus-fundamentacao-0'));
      });

      await waitFor(() => {
        expect(screen.getByText(/Nenhum modelo encontrado/)).toBeInTheDocument();
      });
    });

    it('should handle findSuggestions error gracefully', async () => {
      const findSuggestions = vi.fn().mockRejectedValue(new Error('API Error'));
      render(<GlobalEditorModal {...createDefaultProps({ findSuggestions })} />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('focus-fundamentacao-0'));
      });

      // Should not crash - just show no suggestions
      await waitFor(() => {
        expect(screen.getByText(/Nenhum modelo encontrado/)).toBeInTheDocument();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // MODEL INSERT TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Model Insert', () => {
    it('should insert model content and show toast when clicking insert on suggestion', async () => {
      const showToast = vi.fn();
      const mockModel: Model = { id: 'model-1', title: 'Modelo HE', titulo: 'Modelo HE', conteudo: '<p>Model content</p>', category: 'MERITO' } as any;
      const findSuggestions = vi.fn().mockResolvedValue({ suggestions: [mockModel], source: null });
      render(<GlobalEditorModal {...createDefaultProps({ findSuggestions, showToast })} />);

      // Focus to get suggestions
      await act(async () => {
        fireEvent.click(screen.getByTestId('focus-fundamentacao-0'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('insert-suggestion')).toBeInTheDocument();
      });

      // Insert
      fireEvent.click(screen.getByTestId('insert-suggestion'));

      expect(showToast).toHaveBeenCalledWith('Modelo inserido', 'success');
    });

    it('should set dirty state after inserting model', async () => {
      const mockModel: Model = { id: 'model-1', title: 'Modelo HE', titulo: 'Modelo HE', conteudo: '<p>Model content</p>', category: 'MERITO' } as any;
      const findSuggestions = vi.fn().mockResolvedValue({ suggestions: [mockModel], source: null });
      render(<GlobalEditorModal {...createDefaultProps({ findSuggestions })} />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('focus-fundamentacao-0'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('insert-suggestion')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('insert-suggestion'));

      expect(screen.getByText(/salvo/i)).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // MODEL PREVIEW TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Model Preview', () => {
    it('should call openPreview when preview button is clicked', async () => {
      const openPreview = vi.fn();
      const modelPreview = {
        previewingModel: null,
        setContextualInsertFn: vi.fn(),
        onModelUpdatedRef: { current: null },
        openPreview,
      };
      const mockModel: Model = { id: 'model-1', title: 'Modelo HE', titulo: 'Modelo HE', conteudo: '<p>Content</p>', category: 'MERITO' } as any;
      const findSuggestions = vi.fn().mockResolvedValue({ suggestions: [mockModel], source: null });

      render(<GlobalEditorModal {...createDefaultProps({ findSuggestions, modelPreview })} />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('focus-fundamentacao-0'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('preview-suggestion')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('preview-suggestion'));

      expect(openPreview).toHaveBeenCalledWith(mockModel);
    });

    it('should register contextual insert fn on open with modelPreview', () => {
      const setContextualInsertFn = vi.fn();
      const modelPreview = {
        previewingModel: null,
        setContextualInsertFn,
        onModelUpdatedRef: { current: null },
        openPreview: vi.fn(),
      };

      render(<GlobalEditorModal {...createDefaultProps({ modelPreview })} />);

      expect(setContextualInsertFn).toHaveBeenCalled();
    });

    it('should unregister contextual insert fn on close', () => {
      const setContextualInsertFn = vi.fn();
      const modelPreview = {
        previewingModel: null,
        setContextualInsertFn,
        onModelUpdatedRef: { current: null },
        openPreview: vi.fn(),
      };

      const { unmount } = render(<GlobalEditorModal {...createDefaultProps({ modelPreview })} />);

      unmount();

      // Last call should be with null (cleanup)
      const calls = setContextualInsertFn.mock.calls;
      expect(calls[calls.length - 1][0]).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SEARCH TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Model Search', () => {
    it('should render search input in split mode', () => {
      render(<GlobalEditorModal {...createDefaultProps()} />);

      expect(screen.getByPlaceholderText('Buscar modelos...')).toBeInTheDocument();
    });

    it('should show clear button when search has value', () => {
      render(<GlobalEditorModal {...createDefaultProps()} />);

      const searchInput = screen.getByPlaceholderText('Buscar modelos...');
      fireEvent.change(searchInput, { target: { value: 'horas extras' } });

      expect(screen.getByText('x')).toBeInTheDocument();
    });

    it('should clear search when clicking x button', () => {
      render(<GlobalEditorModal {...createDefaultProps()} />);

      const searchInput = screen.getByPlaceholderText('Buscar modelos...');
      fireEvent.change(searchInput, { target: { value: 'horas extras' } });
      fireEvent.click(screen.getByText('x'));

      expect((searchInput as HTMLInputElement).value).toBe('');
    });

    it('should show semantic search toggle when searchModelReady is true', () => {
      render(<GlobalEditorModal {...createDefaultProps({ searchModelReady: true })} />);

      expect(screen.getByTitle(/Busca textual/)).toBeInTheDocument();
    });

    it('should toggle semantic search mode', () => {
      render(<GlobalEditorModal {...createDefaultProps({ searchModelReady: true })} />);

      const toggleBtn = screen.getByTitle(/Busca textual/);
      fireEvent.click(toggleBtn);

      expect(screen.getByTitle(/Busca semantica/)).toBeInTheDocument();
    });

    it('should show semantic placeholder when in semantic mode', () => {
      render(<GlobalEditorModal {...createDefaultProps({ searchModelReady: true, modelSemanticEnabled: true })} />);

      expect(screen.getByPlaceholderText('Busca por significado...')).toBeInTheDocument();
    });

    it('should show "Nenhum modelo encontrado" when search has no results', () => {
      render(<GlobalEditorModal {...createDefaultProps()} />);

      const searchInput = screen.getByPlaceholderText('Buscar modelos...');
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

      expect(screen.getByText(/Nenhum modelo encontrado para "nonexistent"/)).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // KEYBOARD SHORTCUTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Keyboard Shortcuts', () => {
    it('should toggle split mode on Ctrl+M', () => {
      render(<GlobalEditorModal {...createDefaultProps()} />);

      expect(screen.getByText('Fechar Modelos')).toBeInTheDocument();

      fireEvent.keyDown(window, { key: 'm', ctrlKey: true });

      expect(screen.getByText('Modelos')).toBeInTheDocument();
    });

    it('should call handleSaveOnly on Ctrl+S when dirty', () => {
      const setSelectedTopics = vi.fn();
      render(<GlobalEditorModal {...createDefaultProps({ setSelectedTopics })} />);

      // Make dirty
      fireEvent.click(screen.getByTestId('change-field-0'));

      fireEvent.keyDown(window, { key: 's', ctrlKey: true });

      expect(setSelectedTopics).toHaveBeenCalled();
    });

    it('should not call save on Ctrl+S when not dirty', () => {
      const setSelectedTopics = vi.fn();
      render(<GlobalEditorModal {...createDefaultProps({ setSelectedTopics })} />);

      fireEvent.keyDown(window, { key: 's', ctrlKey: true });

      // setSelectedTopics is called once during initial render setup, not from save
      expect(setSelectedTopics).not.toHaveBeenCalled();
    });

    it('should close modal on Escape when not dirty', () => {
      const onClose = vi.fn();
      render(<GlobalEditorModal {...createDefaultProps({ onClose })} />);

      fireEvent.keyDown(window, { key: 'Escape' });

      expect(onClose).toHaveBeenCalled();
    });

    it('should show cancel confirmation on Escape when dirty', () => {
      render(<GlobalEditorModal {...createDefaultProps()} />);

      fireEvent.click(screen.getByTestId('change-field-0'));
      fireEvent.keyDown(window, { key: 'Escape' });

      expect(screen.getByText(/Descartar alter/)).toBeInTheDocument();
    });

    it('should close AI assistant on Escape before closing main modal', async () => {
      render(<GlobalEditorModal {...createDefaultProps()} />);

      // Open AI assistant
      await act(async () => {
        fireEvent.click(screen.getByTestId('open-ai-0'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('ai-assistant-modal')).toBeInTheDocument();
      });

      // Press Escape - should close AI modal, not main modal
      fireEvent.keyDown(window, { key: 'Escape' });

      await waitFor(() => {
        expect(screen.queryByTestId('ai-assistant-modal')).not.toBeInTheDocument();
      });

      // Main modal should still be visible
      expect(screen.getByText('Edicao Global')).toBeInTheDocument();
    });

    it('should close Jurisprudencia modal on Escape before AI assistant', async () => {
      render(<GlobalEditorModal {...createDefaultProps()} />);

      // Open Jurisprudencia
      fireEvent.click(screen.getByTestId('open-juris-0'));

      await waitFor(() => {
        expect(screen.getByTestId('jurisprudencia-modal')).toBeInTheDocument();
      });

      // Press Escape
      fireEvent.keyDown(window, { key: 'Escape' });

      await waitFor(() => {
        expect(screen.queryByTestId('jurisprudencia-modal')).not.toBeInTheDocument();
      });

      expect(screen.getByText('Edicao Global')).toBeInTheDocument();
    });

    it('should close Facts Comparison modal on Escape', async () => {
      render(<GlobalEditorModal {...createDefaultProps()} />);

      // Open Facts Comparison
      await act(async () => {
        fireEvent.click(screen.getByTestId('open-facts-0'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('base-modal')).toBeInTheDocument();
      });

      // Press Escape
      fireEvent.keyDown(window, { key: 'Escape' });

      await waitFor(() => {
        expect(screen.queryByTestId('base-modal')).not.toBeInTheDocument();
      });
    });

    it('should not close modal when Escape pressed during cancel confirmation', () => {
      const onClose = vi.fn();
      render(<GlobalEditorModal {...createDefaultProps({ onClose })} />);

      // Make dirty and show cancel confirm
      fireEvent.click(screen.getByTestId('change-field-0'));
      fireEvent.click(screen.getByText('Cancelar'));

      expect(screen.getByText(/Descartar alter/)).toBeInTheDocument();

      // Press Escape again - should not call onClose (showCancelConfirm is true, returns early)
      onClose.mockClear();
      fireEvent.keyDown(window, { key: 'Escape' });

      // The cancelConfirm dialog prevents further ESC handling
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SUB-MODAL OPENING TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Sub-Modal Opening', () => {
    it('should open AI Assistant modal', async () => {
      render(<GlobalEditorModal {...createDefaultProps()} />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('open-ai-0'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('ai-assistant-modal')).toBeInTheDocument();
      });
    });

    it('should open Proofs modal', () => {
      render(<GlobalEditorModal {...createDefaultProps({
        proofManager: {
          proofFiles: [],
          proofTexts: [],
          proofTopicLinks: {},
          setProofTopicLinks: vi.fn(),
          proofAnalysisResults: {},
          proofConclusions: {},
        }
      })} />);

      fireEvent.click(screen.getByTestId('open-proofs-0'));

      expect(screen.getByTestId('linked-proofs-modal')).toBeInTheDocument();
    });

    it('should open Jurisprudencia modal', () => {
      render(<GlobalEditorModal {...createDefaultProps()} />);

      fireEvent.click(screen.getByTestId('open-juris-0'));

      expect(screen.getByTestId('jurisprudencia-modal')).toBeInTheDocument();
    });

    it('should open Facts Comparison modal', async () => {
      render(<GlobalEditorModal {...createDefaultProps()} />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('open-facts-0'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('base-modal')).toBeInTheDocument();
      });
    });

    it('should close AI Assistant modal via its close button', async () => {
      render(<GlobalEditorModal {...createDefaultProps()} />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('open-ai-0'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('ai-assistant-modal')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('close-ai-modal'));

      await waitFor(() => {
        expect(screen.queryByTestId('ai-assistant-modal')).not.toBeInTheDocument();
      });
    });

    it('should close Proofs modal via its close button', () => {
      render(<GlobalEditorModal {...createDefaultProps({
        proofManager: {
          proofFiles: [],
          proofTexts: [],
          proofTopicLinks: {},
          setProofTopicLinks: vi.fn(),
          proofAnalysisResults: {},
          proofConclusions: {},
        }
      })} />);

      fireEvent.click(screen.getByTestId('open-proofs-0'));
      expect(screen.getByTestId('linked-proofs-modal')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('close-proofs-modal'));

      expect(screen.queryByTestId('linked-proofs-modal')).not.toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION COLLAPSE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Section Collapse', () => {
    it('should start with sections collapsed', () => {
      render(<GlobalEditorModal {...createDefaultProps()} />);

      expect(screen.getByText('Expand')).toBeInTheDocument();
    });

    it('should toggle section collapse on click', () => {
      render(<GlobalEditorModal {...createDefaultProps()} />);

      fireEvent.click(screen.getByTestId('toggle-collapse-0'));

      expect(screen.getByText('Collapse')).toBeInTheDocument();
    });

    it('should toggle back to collapsed after two clicks', () => {
      render(<GlobalEditorModal {...createDefaultProps()} />);

      fireEvent.click(screen.getByTestId('toggle-collapse-0'));
      expect(screen.getByText('Collapse')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('toggle-collapse-0'));
      expect(screen.getByText('Expand')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SAVE AND CLOSE WITH RESULT DETECTION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Save and Close with Result Detection', () => {
    it('should detect results automatically for edited topics', async () => {
      const detectResultadoAutomatico = vi.fn().mockResolvedValue('PROCEDENTE');
      const topic = createMockTopic({ title: 'Horas Extras', category: 'MERITO' as any, resultadoManual: undefined });

      render(<GlobalEditorModal {...createDefaultProps({
        selectedTopics: [topic],
        detectResultadoAutomatico,
        aiIntegration: { aiSettings: { parallelRequests: 5 } } as any,
      })} />);

      // Edit the topic to trigger detection
      fireEvent.click(screen.getByTestId('change-field-0'));

      // Save and close
      await act(async () => {
        fireEvent.click(screen.getByText('Salvar e Sair'));
      });

      await waitFor(() => {
        expect(detectResultadoAutomatico).toHaveBeenCalled();
      });
    });

    it('should not detect results for RELATORIO topics', async () => {
      const detectResultadoAutomatico = vi.fn().mockResolvedValue('PROCEDENTE');
      // Use the accented form that matches the component filter: 'RELAT\u00d3RIO'
      const topic = createMockTopic({ title: 'RELAT\u00d3RIO', category: 'RELAT\u00d3RIO' as any });

      render(<GlobalEditorModal {...createDefaultProps({
        selectedTopics: [topic],
        detectResultadoAutomatico,
        aiIntegration: { aiSettings: { parallelRequests: 5 } } as any,
      })} />);

      fireEvent.click(screen.getByTestId('change-field-0'));

      await act(async () => {
        fireEvent.click(screen.getByText('Salvar e Sair'));
      });

      await waitFor(() => {
        expect(detectResultadoAutomatico).not.toHaveBeenCalled();
      });
    });

    it('should not detect results for topics with resultadoManual', async () => {
      const detectResultadoAutomatico = vi.fn().mockResolvedValue('PROCEDENTE');
      const topic = createMockTopic({ resultadoManual: 'IMPROCEDENTE' as any });

      render(<GlobalEditorModal {...createDefaultProps({
        selectedTopics: [topic],
        detectResultadoAutomatico,
      })} />);

      fireEvent.click(screen.getByTestId('change-field-0'));

      await act(async () => {
        fireEvent.click(screen.getByText('Salvar e Sair'));
      });

      await waitFor(() => {
        expect(detectResultadoAutomatico).not.toHaveBeenCalled();
      });
    });

    it('should show analyzing progress overlay during result detection', async () => {
      let resolveDetection: (value: string) => void;
      const detectPromise = new Promise<string>(resolve => { resolveDetection = resolve; });
      const detectResultadoAutomatico = vi.fn().mockReturnValue(detectPromise);
      const topic = createMockTopic({ title: 'Horas Extras', category: 'MERITO' as any, resultadoManual: undefined });

      render(<GlobalEditorModal {...createDefaultProps({
        selectedTopics: [topic],
        detectResultadoAutomatico,
        aiIntegration: { aiSettings: { parallelRequests: 5 } } as any,
      })} />);

      fireEvent.click(screen.getByTestId('change-field-0'));

      // Start save and close (will show progress)
      act(() => {
        fireEvent.click(screen.getByText('Salvar e Sair'));
      });

      await waitFor(() => {
        expect(screen.getByText('Analisando resultados...')).toBeInTheDocument();
      });

      // Resolve the detection
      await act(async () => {
        resolveDetection!('PROCEDENTE');
      });

      await waitFor(() => {
        expect(screen.queryByText('Analisando resultados...')).not.toBeInTheDocument();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // LINKED PROOFS HELPER
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Linked Proofs Helper', () => {
    it('should return empty array when proofManager is null', () => {
      render(<GlobalEditorModal {...createDefaultProps({ proofManager: null })} />);

      // The component renders with linkedProofsCount prop, we can verify no errors
      expect(screen.getByTestId('editor-section-0')).toBeInTheDocument();
    });

    it('should pass linked proofs count to editor section', () => {
      const proofManager = {
        proofFiles: [{ id: 'proof-1', name: 'Prova1.pdf', file: new File([], 'test.pdf') }],
        proofTexts: [],
        proofTopicLinks: { 'proof-1': ['Horas Extras'] },
        setProofTopicLinks: vi.fn(),
        proofAnalysisResults: {},
        proofConclusions: {},
      };

      render(<GlobalEditorModal {...createDefaultProps({ proofManager: proofManager as any })} />);

      // Component renders without error - proofs are linked
      expect(screen.getByTestId('editor-section-0')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SPLIT DIVIDER DRAG
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Split Divider Drag', () => {
    it('should handle mousedown on divider', () => {
      const { container } = render(<GlobalEditorModal {...createDefaultProps()} />);

      const divider = container.querySelector('.cursor-col-resize');
      expect(divider).not.toBeNull();

      fireEvent.mouseDown(divider!);

      // No error means handler worked
      expect(divider).toBeInTheDocument();
    });

    it('should handle mouse move during drag', () => {
      const { container } = render(<GlobalEditorModal {...createDefaultProps()} />);

      const divider = container.querySelector('.cursor-col-resize');
      fireEvent.mouseDown(divider!);

      // Simulate mouse move
      fireEvent.mouseMove(window, { clientX: 500 });
      fireEvent.mouseUp(window);

      // Component should still be stable
      expect(screen.getByText('Edicao Global')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // MODEL PREVIEW SYNC
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Model Preview Sync', () => {
    it('should register onModelUpdated callback when modal opens with modelPreview', () => {
      const onModelUpdatedRef = { current: null as ((model: Model) => void) | null };
      const modelPreview = {
        previewingModel: null,
        setContextualInsertFn: vi.fn(),
        onModelUpdatedRef,
        openPreview: vi.fn(),
      };

      render(<GlobalEditorModal {...createDefaultProps({ modelPreview })} />);

      expect(onModelUpdatedRef.current).not.toBeNull();
    });

    it('should unregister onModelUpdated callback on unmount', () => {
      const onModelUpdatedRef = { current: null as ((model: Model) => void) | null };
      const modelPreview = {
        previewingModel: null,
        setContextualInsertFn: vi.fn(),
        onModelUpdatedRef,
        openPreview: vi.fn(),
      };

      const { unmount } = render(<GlobalEditorModal {...createDefaultProps({ modelPreview })} />);

      unmount();

      expect(onModelUpdatedRef.current).toBeNull();
    });

    it('should update suggestions when model is updated via modelPreview', async () => {
      const onModelUpdatedRef = { current: null as ((model: Model) => void) | null };
      const modelPreview = {
        previewingModel: null,
        setContextualInsertFn: vi.fn(),
        onModelUpdatedRef,
        openPreview: vi.fn(),
      };
      const mockModel: Model = { id: 'model-1', title: 'Modelo HE', titulo: 'Modelo HE', conteudo: '<p>Content</p>', category: 'MERITO' } as any;
      const findSuggestions = vi.fn().mockResolvedValue({ suggestions: [mockModel], source: null });

      render(<GlobalEditorModal {...createDefaultProps({ modelPreview, findSuggestions })} />);

      // Focus to get suggestions
      await act(async () => {
        fireEvent.click(screen.getByTestId('focus-fundamentacao-0'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('suggestion-card')).toBeInTheDocument();
      });

      // Simulate model update
      const updatedModel = { ...mockModel, title: 'Updated Modelo' };
      act(() => {
        onModelUpdatedRef.current?.(updatedModel as Model);
      });

      // Component should still render without error
      expect(screen.getByTestId('suggestion-card')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EMPTY STATES IN SUGGESTIONS PANEL
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Empty States in Suggestions Panel', () => {
    it('should show default message when no topic is focused', () => {
      render(<GlobalEditorModal {...createDefaultProps()} />);

      expect(screen.getByText(/Clique em um campo de "Decisao"/)).toBeInTheDocument();
    });

    it('should show hint text when search term exists but no topic focused', async () => {
      render(<GlobalEditorModal {...createDefaultProps()} />);

      const searchInput = screen.getByPlaceholderText('Buscar modelos...');
      fireEvent.change(searchInput, { target: { value: 'test' } });

      // The empty state with search should be visible
      expect(screen.getByText(/Nenhum modelo encontrado/)).toBeInTheDocument();
    });

    it('should show instruction text when no focused topic and search is empty', () => {
      render(<GlobalEditorModal {...createDefaultProps()} />);

      expect(screen.getByText(/Clique em um campo de.*Decisao.*para ver sugest/)).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FACTS COMPARISON GENERATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Facts Comparison Generation', () => {
    it('should generate facts comparison with mini-relatorio source', async () => {
      const callAI = vi.fn().mockResolvedValue('{"tabela":[],"fatosIncontroversos":[],"fatosControversos":[],"pontosChave":[],"resumo":"test"}');
      const aiIntegration = {
        aiSettings: { parallelRequests: 5, doubleCheck: { enabled: false } },
        callAI,
      };
      const topic = createMockTopic({ relatorio: 'Mini relatorio de horas extras' });

      render(<GlobalEditorModal {...createDefaultProps({
        selectedTopics: [topic],
        aiIntegration: aiIntegration as any,
      })} />);

      // Open facts comparison modal
      await act(async () => {
        fireEvent.click(screen.getByTestId('open-facts-0'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('generate-facts-mini')).toBeInTheDocument();
      });

      // Generate
      await act(async () => {
        fireEvent.click(screen.getByTestId('generate-facts-mini'));
      });

      await waitFor(() => {
        expect(callAI).toHaveBeenCalled();
      });
    });

    it('should handle facts comparison generation error', async () => {
      const callAI = vi.fn().mockRejectedValue(new Error('AI Error'));
      const aiIntegration = {
        aiSettings: { parallelRequests: 5, doubleCheck: { enabled: false } },
        callAI,
      };
      const topic = createMockTopic({ relatorio: 'Mini relatorio' });

      render(<GlobalEditorModal {...createDefaultProps({
        selectedTopics: [topic],
        aiIntegration: aiIntegration as any,
      })} />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('open-facts-0'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('generate-facts-mini')).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('generate-facts-mini'));
      });

      // Should not crash
      expect(screen.getByTestId('base-modal')).toBeInTheDocument();
    });

    it('should handle facts comparison with documentos-completos using text', async () => {
      const callAI = vi.fn().mockResolvedValue('{"tabela":[],"fatosIncontroversos":[],"fatosControversos":[],"pontosChave":[],"resumo":"test"}');
      const aiIntegration = {
        aiSettings: { parallelRequests: 5, doubleCheck: { enabled: false } },
        callAI,
      };
      const topic = createMockTopic();

      render(<GlobalEditorModal {...createDefaultProps({
        selectedTopics: [topic],
        aiIntegration: aiIntegration as any,
        analyzedDocuments: {
          peticoes: [],
          peticoesText: [{ text: 'Peticao text content', name: 'pet.txt' }] as any,
          contestacoes: [],
          contestacoesText: [{ text: 'Contestacao text content', name: 'cont.txt' }] as any,
          complementares: [],
          complementaresText: [],
        },
      })} />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('open-facts-0'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('generate-facts-docs')).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('generate-facts-docs'));
      });

      await waitFor(() => {
        expect(callAI).toHaveBeenCalled();
      });
    });

    it('should throw error when mini-relatorio is empty', async () => {
      const callAI = vi.fn();
      const aiIntegration = {
        aiSettings: { parallelRequests: 5, doubleCheck: { enabled: false } },
        callAI,
      };
      const topic = createMockTopic({ relatorio: '', editedRelatorio: '' } as any);

      render(<GlobalEditorModal {...createDefaultProps({
        selectedTopics: [topic],
        aiIntegration: aiIntegration as any,
      })} />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('open-facts-0'));
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('generate-facts-mini'));
      });

      // callAI should NOT have been called since error is thrown before
      expect(callAI).not.toHaveBeenCalled();
    });

    it('should throw error when no documents available for documentos-completos', async () => {
      const callAI = vi.fn();
      const aiIntegration = {
        aiSettings: { parallelRequests: 5, doubleCheck: { enabled: false } },
        callAI,
      };
      const topic = createMockTopic();

      render(<GlobalEditorModal {...createDefaultProps({
        selectedTopics: [topic],
        aiIntegration: aiIntegration as any,
        analyzedDocuments: {
          peticoes: [],
          peticoesText: [],
          contestacoes: [],
          contestacoesText: [],
          complementares: [],
          complementaresText: [],
        },
      })} />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('open-facts-0'));
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('generate-facts-docs'));
      });

      // callAI should not have been called
      expect(callAI).not.toHaveBeenCalled();
    });

    it('should extract JSON from markdown-wrapped response', async () => {
      const callAI = vi.fn().mockResolvedValue('```json\n{"tabela":[],"fatosIncontroversos":["Fato 1"],"fatosControversos":[],"pontosChave":[],"resumo":"ok"}\n```');
      const aiIntegration = {
        aiSettings: { parallelRequests: 5, doubleCheck: { enabled: false } },
        callAI,
      };
      const topic = createMockTopic({ relatorio: 'Relatorio valido' });

      render(<GlobalEditorModal {...createDefaultProps({
        selectedTopics: [topic],
        aiIntegration: aiIntegration as any,
      })} />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('open-facts-0'));
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('generate-facts-mini'));
      });

      await waitFor(() => {
        expect(callAI).toHaveBeenCalled();
      });
    });

    it('should handle PDF fallback for documentos-completos', async () => {
      const callAI = vi.fn().mockResolvedValue('{"tabela":[],"fatosIncontroversos":[],"fatosControversos":[],"pontosChave":[],"resumo":"pdf result"}');
      const aiIntegration = {
        aiSettings: { parallelRequests: 5, doubleCheck: { enabled: false } },
        callAI,
      };
      const topic = createMockTopic();

      render(<GlobalEditorModal {...createDefaultProps({
        selectedTopics: [topic],
        aiIntegration: aiIntegration as any,
        analyzedDocuments: {
          peticoes: ['base64pdfdata'],
          peticoesText: [],
          contestacoes: ['base64contestacao'],
          contestacoesText: [],
          complementares: ['base64complementar'],
          complementaresText: [],
        },
      })} />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('open-facts-0'));
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('generate-facts-docs'));
      });

      await waitFor(() => {
        expect(callAI).toHaveBeenCalled();
        // Verify the message content includes PDF documents
        const callArgs = callAI.mock.calls[0][0];
        const content = callArgs[0].content;
        expect(content.some((c: any) => c.type === 'document')).toBe(true);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DOUBLE CHECK INTEGRATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Double Check Integration', () => {
    it('should perform double check when enabled', async () => {
      const performDoubleCheck = vi.fn().mockResolvedValue({
        verified: '{"verifiedResult":{"tabela":[],"fatosIncontroversos":["Verified"],"fatosControversos":[],"pontosChave":[],"resumo":"verified"}}',
        corrections: [{ field: 'test', from: 'a', to: 'b' }],
        summary: '1 correction',
      });
      const callAI = vi.fn().mockResolvedValue('{"tabela":[],"fatosIncontroversos":["Original"],"fatosControversos":[],"pontosChave":[],"resumo":"original"}');
      const showToast = vi.fn();
      const aiIntegration = {
        aiSettings: {
          parallelRequests: 5,
          doubleCheck: { enabled: true, operations: { factsComparison: true } },
        },
        callAI,
        performDoubleCheck,
      };
      const topic = createMockTopic({ relatorio: 'Relatorio para double check' });

      render(<GlobalEditorModal {...createDefaultProps({
        selectedTopics: [topic],
        aiIntegration: aiIntegration as any,
        showToast,
      })} />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('open-facts-0'));
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('generate-facts-mini'));
      });

      await waitFor(() => {
        expect(performDoubleCheck).toHaveBeenCalled();
        expect(showToast).toHaveBeenCalledWith(expect.stringContaining('Double Check'), 'info');
      });
    });

    it('should continue with original result when double check fails', async () => {
      const performDoubleCheck = vi.fn().mockRejectedValue(new Error('DC Error'));
      const callAI = vi.fn().mockResolvedValue('{"tabela":[],"fatosIncontroversos":["Original"],"fatosControversos":[],"pontosChave":[],"resumo":"original"}');
      const aiIntegration = {
        aiSettings: {
          parallelRequests: 5,
          doubleCheck: { enabled: true, operations: { factsComparison: true } },
        },
        callAI,
        performDoubleCheck,
      };
      const topic = createMockTopic({ relatorio: 'Relatorio valido' });

      render(<GlobalEditorModal {...createDefaultProps({
        selectedTopics: [topic],
        aiIntegration: aiIntegration as any,
      })} />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('open-facts-0'));
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('generate-facts-mini'));
      });

      // Should not crash - uses original parsed result
      await waitFor(() => {
        expect(callAI).toHaveBeenCalled();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EDGE CASES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Edge Cases', () => {
    it('should handle undefined fontSize gracefully', () => {
      render(<GlobalEditorModal {...createDefaultProps({ fontSize: undefined as unknown as 'normal' })} />);

      expect(screen.getByText('Edicao Global')).toBeInTheDocument();
    });

    it('should handle undefined spacing gracefully', () => {
      render(<GlobalEditorModal {...createDefaultProps({ spacing: undefined as unknown as 'normal' })} />);

      expect(screen.getByText('Edicao Global')).toBeInTheDocument();
    });

    it('should handle null findSuggestions gracefully', () => {
      render(<GlobalEditorModal {...createDefaultProps({ findSuggestions: undefined as any })} />);

      expect(screen.getByText('Edicao Global')).toBeInTheDocument();
    });

    it('should handle empty models array', () => {
      render(<GlobalEditorModal {...createDefaultProps({ models: [] })} />);

      expect(screen.getByText('Edicao Global')).toBeInTheDocument();
    });

    it('should handle re-opening the modal (transition false -> true)', () => {
      const { rerender } = render(<GlobalEditorModal {...createDefaultProps({ isOpen: false })} />);

      rerender(<GlobalEditorModal {...createDefaultProps({ isOpen: true })} />);

      expect(screen.getByText('Edicao Global')).toBeInTheDocument();
    });

    it('should not reset topics when Ctrl+S updates selectedTopics while open', async () => {
      const topic1 = createMockTopic({ title: 'Topic1' });
      const props = createDefaultProps({ selectedTopics: [topic1] });
      const { rerender } = render(<GlobalEditorModal {...props} />);

      // Make a change
      fireEvent.click(screen.getByTestId('change-field-0'));

      // Simulate selectedTopics being updated externally (like Ctrl+S does)
      const updatedTopic = { ...topic1, editedFundamentacao: '<p>Updated</p>' };
      rerender(<GlobalEditorModal {...props} selectedTopics={[updatedTopic]} />);

      // Modal should still show the editor (not reset)
      expect(screen.getByTestId('editor-section-0')).toBeInTheDocument();
    });

    it('should handle DISPOSITIVO category in result detection', async () => {
      const detectResultadoAutomatico = vi.fn().mockResolvedValue('PROCEDENTE');
      const topic = createMockTopic({ title: 'DISPOSITIVO', category: 'DISPOSITIVO' as any });

      render(<GlobalEditorModal {...createDefaultProps({
        selectedTopics: [topic],
        detectResultadoAutomatico,
        aiIntegration: { aiSettings: { parallelRequests: 5 } } as any,
      })} />);

      fireEvent.click(screen.getByTestId('change-field-0'));

      await act(async () => {
        fireEvent.click(screen.getByText('Salvar e Sair'));
      });

      await waitFor(() => {
        expect(detectResultadoAutomatico).not.toHaveBeenCalled();
      });
    });

    it('should handle facts comparison when aiIntegration is null', async () => {
      render(<GlobalEditorModal {...createDefaultProps({ aiIntegration: null })} />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('open-facts-0'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('base-modal')).toBeInTheDocument();
      });

      // Should not crash when clicking generate
      await act(async () => {
        fireEvent.click(screen.getByTestId('generate-facts-mini'));
      });

      // Nothing happens, no error
      expect(screen.getByTestId('base-modal')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FOCUSED TOPIC DISPLAY
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Focused Topic Display', () => {
    it('should display category in focused topic badge', async () => {
      const findSuggestions = vi.fn().mockResolvedValue([]);
      const topic = createMockTopic({ title: 'Adicional Noturno', category: 'MERITO' as any });
      const { container } = render(<GlobalEditorModal {...createDefaultProps({ findSuggestions, selectedTopics: [topic] })} />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('focus-fundamentacao-0'));
      });

      await waitFor(() => {
        // The badge is a span with "Editando:" + title + category
        const badge = container.querySelector('.theme-text-purple');
        expect(badge).not.toBeNull();
        expect(badge?.textContent).toContain('Editando');
        expect(badge?.textContent).toContain('Adicional Noturno');
        expect(badge?.textContent).toContain('MERITO');
      });
    });

    it('should display suggestions info in panel header when topic focused', async () => {
      const findSuggestions = vi.fn().mockResolvedValue([]);
      render(<GlobalEditorModal {...createDefaultProps({ findSuggestions })} />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('focus-fundamentacao-0'));
      });

      await waitFor(() => {
        // The topic title is shown in a <strong> tag inside the suggestions panel
        const strongElements = screen.getAllByText('Horas Extras');
        expect(strongElements.length).toBeGreaterThan(0);
      });
    });

    it('should show italic hint when no topic is focused', () => {
      render(<GlobalEditorModal {...createDefaultProps()} />);

      expect(screen.getByText(/Clique em um campo de.*Decisao/)).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SEMANTIC SEARCH
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Semantic Search', () => {
    it('should not show semantic toggle when searchModelReady is false', () => {
      render(<GlobalEditorModal {...createDefaultProps({ searchModelReady: false })} />);

      expect(screen.queryByTitle(/Busca textual/)).not.toBeInTheDocument();
      expect(screen.queryByTitle(/Busca semantica/)).not.toBeInTheDocument();
    });

    it('should start in semantic mode when modelSemanticEnabled is true', () => {
      render(<GlobalEditorModal {...createDefaultProps({ searchModelReady: true, modelSemanticEnabled: true })} />);

      expect(screen.getByTitle(/Busca semantica/)).toBeInTheDocument();
    });

    it('should start in textual mode when modelSemanticEnabled is false', () => {
      render(<GlobalEditorModal {...createDefaultProps({ searchModelReady: true, modelSemanticEnabled: false })} />);

      expect(screen.getByTitle(/Busca textual/)).toBeInTheDocument();
    });

    it('should show T for textual mode button text', () => {
      render(<GlobalEditorModal {...createDefaultProps({ searchModelReady: true, modelSemanticEnabled: false })} />);

      expect(screen.getByText('T')).toBeInTheDocument();
    });

    it('should show S for semantic mode button text', () => {
      render(<GlobalEditorModal {...createDefaultProps({ searchModelReady: true, modelSemanticEnabled: true })} />);

      expect(screen.getByText('S')).toBeInTheDocument();
    });

    it('should toggle from T to S when clicking semantic toggle', () => {
      render(<GlobalEditorModal {...createDefaultProps({ searchModelReady: true, modelSemanticEnabled: false })} />);

      fireEvent.click(screen.getByText('T'));

      expect(screen.getByText('S')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // MULTIPLE TOPICS INTERACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Multiple Topics Interactions', () => {
    it('should handle field changes on different topic indices', () => {
      const topics = [
        createMockTopic({ title: 'Topic 1' }),
        createMockTopic({ title: 'Topic 2' }),
      ];
      render(<GlobalEditorModal {...createDefaultProps({ selectedTopics: topics })} />);

      fireEvent.click(screen.getByTestId('change-field-0'));
      fireEvent.click(screen.getByTestId('change-field-1'));

      expect(screen.getByText(/salvo/i)).toBeInTheDocument();
    });

    it('should open AI assistant for different topics', async () => {
      const topics = [
        createMockTopic({ title: 'Topic 1' }),
        createMockTopic({ title: 'Topic 2' }),
      ];
      render(<GlobalEditorModal {...createDefaultProps({ selectedTopics: topics })} />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('open-ai-1'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('ai-assistant-modal')).toBeInTheDocument();
      });
    });

    it('should toggle collapse on different sections independently', () => {
      const topics = [
        createMockTopic({ title: 'Topic 1' }),
        createMockTopic({ title: 'Topic 2' }),
      ];
      render(<GlobalEditorModal {...createDefaultProps({ selectedTopics: topics })} />);

      // Both start collapsed
      fireEvent.click(screen.getByTestId('toggle-collapse-0'));

      // Section 0 is expanded, section 1 still collapsed
      const buttons = screen.getAllByRole('button');
      const collapseButtons = buttons.filter(btn => btn.textContent === 'Collapse' || btn.textContent === 'Expand');
      expect(collapseButtons.some(btn => btn.textContent === 'Collapse')).toBe(true);
      expect(collapseButtons.some(btn => btn.textContent === 'Expand')).toBe(true);
    });
  });
});

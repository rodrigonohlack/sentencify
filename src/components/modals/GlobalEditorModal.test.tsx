/**
 * @file GlobalEditorModal.test.tsx
 * @description Testes para o modal de edição global
 * @version 1.38.39
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GlobalEditorModal } from './GlobalEditorModal';
import type { GlobalEditorModalProps, Topic } from '../../types';

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
  GlobalEditorSection: ({ topic, topicIndex, onToggleCollapse, isCollapsed }: {
    topic: Topic;
    topicIndex: number;
    onToggleCollapse: (idx: number) => void;
    isCollapsed: boolean;
  }) => (
    <div data-testid={`editor-section-${topicIndex}`}>
      <span data-testid="topic-title">{topic.title}</span>
      <button onClick={() => onToggleCollapse(topicIndex)}>
        {isCollapsed ? 'Expand' : 'Collapse'}
      </button>
    </div>
  ),
}));

vi.mock('../cards/SuggestionCard', () => ({
  SuggestionCard: () => <div data-testid="suggestion-card">SuggestionCard</div>,
}));

vi.mock('../ui/SpacingDropdown', () => ({
  SpacingDropdown: () => <div data-testid="spacing-dropdown">SpacingDropdown</div>,
}));

vi.mock('../ui/FontSizeDropdown', () => ({
  FontSizeDropdown: () => <div data-testid="fontsize-dropdown">FontSizeDropdown</div>,
}));

vi.mock('../ai/AIAssistantComponents', () => ({
  AIAssistantGlobalModal: () => <div data-testid="ai-assistant-modal">AIAssistantModal</div>,
}));

vi.mock('./MiscModals', () => ({
  LinkedProofsModal: () => <div data-testid="linked-proofs-modal">LinkedProofsModal</div>,
}));

vi.mock('./JurisprudenciaModal', () => ({
  JurisprudenciaModal: () => <div data-testid="jurisprudencia-modal">JurisprudenciaModal</div>,
}));

vi.mock('../FactsComparisonModal', () => ({
  FactsComparisonModalContent: () => <div data-testid="facts-comparison-content">FactsComparisonContent</div>,
}));

vi.mock('../../utils/text', () => ({
  normalizeHTMLSpacing: vi.fn((html: string) => html),
}));

vi.mock('../../utils/chat-context-builder', () => ({
  buildChatContext: vi.fn().mockResolvedValue([]),
}));

describe('GlobalEditorModal', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  const createMockTopic = (overrides: Partial<Topic> = {}): Topic => ({
    id: `topic-${Math.random()}`,
    title: 'Horas Extras',
    category: 'MÉRITO',
    relatorio: 'Mini-relatório sobre horas extras.',
    resultado: 'PROCEDENTE',
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

    it('should display topic count', () => {
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
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // HEADER CONTROLS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Header Controls', () => {
    it('should render Modelos button', () => {
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
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SPLIT MODE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Split Mode', () => {
    it('should start in split mode by default', () => {
      render(<GlobalEditorModal {...createDefaultProps()} />);

      expect(screen.getByText('Fechar Modelos')).toBeInTheDocument();
    });

    it('should toggle split mode when clicking Modelos button', () => {
      render(<GlobalEditorModal {...createDefaultProps()} />);

      fireEvent.click(screen.getByText('Fechar Modelos'));

      expect(screen.getByText('Modelos')).toBeInTheDocument();
    });

    it('should show suggestions panel in split mode', () => {
      render(<GlobalEditorModal {...createDefaultProps()} />);

      expect(screen.getByText('Sugestões de Modelos')).toBeInTheDocument();
    });

    it('should hide suggestions panel when split mode off', () => {
      render(<GlobalEditorModal {...createDefaultProps()} />);

      fireEvent.click(screen.getByText('Fechar Modelos'));

      expect(screen.queryByText('Sugestões de Modelos')).not.toBeInTheDocument();
    });

    it('should show search input in split mode', () => {
      render(<GlobalEditorModal {...createDefaultProps()} />);

      expect(screen.getByPlaceholderText('Buscar modelos...')).toBeInTheDocument();
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

    it('should show success toast when saving', async () => {
      const showToast = vi.fn();
      render(<GlobalEditorModal {...createDefaultProps({ showToast })} />);

      fireEvent.click(screen.getByText('Salvar'));

      await waitFor(() => {
        expect(showToast).toHaveBeenCalledWith('Alterações salvas!', 'success');
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
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SEARCH TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Model Search', () => {
    it('should render search input', () => {
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

    it('should show semantic search toggle when searchModelReady', () => {
      render(<GlobalEditorModal {...createDefaultProps({ searchModelReady: true })} />);

      expect(screen.getByTitle(/Busca textual/)).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EMPTY STATE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Empty States', () => {
    it('should show loading state when no topics', () => {
      render(<GlobalEditorModal {...createDefaultProps({ selectedTopics: [] })} />);

      expect(screen.getByText('Carregando topicos...')).toBeInTheDocument();
    });

    it('should show message to click on Decisão field', () => {
      render(<GlobalEditorModal {...createDefaultProps()} />);

      expect(screen.getByText(/Clique em um campo de "Decisão"/)).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DIRTY STATE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Dirty State', () => {
    it('should not show "Não salvo" badge initially', () => {
      render(<GlobalEditorModal {...createDefaultProps()} />);

      expect(screen.queryByText('Não salvo')).not.toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // THEME TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Theme', () => {
    it('should render with dark theme', () => {
      render(<GlobalEditorModal {...createDefaultProps({ editorTheme: 'dark' })} />);

      expect(screen.getByText('Edicao Global')).toBeInTheDocument();
    });

    it('should render with light theme', () => {
      render(<GlobalEditorModal {...createDefaultProps({ editorTheme: 'light' })} />);

      expect(screen.getByText('Edicao Global')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EDGE CASES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Edge Cases', () => {
    it('should handle null fontSize gracefully', () => {
      render(<GlobalEditorModal {...createDefaultProps({ fontSize: undefined as unknown as 'normal' })} />);

      expect(screen.getByText('Edicao Global')).toBeInTheDocument();
    });

    it('should handle null spacing gracefully', () => {
      render(<GlobalEditorModal {...createDefaultProps({ spacing: undefined as unknown as 'normal' })} />);

      expect(screen.getByText('Edicao Global')).toBeInTheDocument();
    });

    it('should handle null setFontSize', () => {
      render(<GlobalEditorModal {...createDefaultProps({ setFontSize: null })} />);

      expect(screen.queryByTestId('fontsize-dropdown')).not.toBeInTheDocument();
    });

    it('should handle null setSpacing', () => {
      render(<GlobalEditorModal {...createDefaultProps({ setSpacing: null })} />);

      expect(screen.queryByTestId('spacing-dropdown')).not.toBeInTheDocument();
    });
  });
});

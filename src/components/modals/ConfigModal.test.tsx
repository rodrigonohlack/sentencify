/**
 * @file ConfigModal.test.tsx
 * @description Tests for the ConfigModal component (refactored v1.40.06)
 * @version 1.40.06
 *
 * v1.40.06: Testes atualizados para nova arquitetura com hooks/stores diretos
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfigModal } from './ConfigModal';
import type { AISettings, TokenMetrics } from '../../types';

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK DATA
// ═══════════════════════════════════════════════════════════════════════════════

const createMockAiSettings = (overrides: Partial<AISettings> = {}): AISettings => ({
  provider: 'claude',
  model: 'claude-sonnet-4-20250514',
  claudeModel: 'claude-sonnet-4-20250514',
  geminiModel: 'gemini-3-flash-preview',
  openaiModel: 'gpt-5.2-chat-latest',
  openaiReasoningLevel: 'medium',
  grokModel: 'grok-4-1-fast-reasoning',
  apiKeys: {
    claude: '',
    gemini: '',
    openai: '',
    grok: '',
  },
  useExtendedThinking: false,
  thinkingBudget: '10000',
  geminiThinkingLevel: 'low',
  customPrompt: '',
  modeloRelatorio: '',
  modeloDispositivo: '',
  modeloTopicoRelatorio: '',
  ocrEngine: 'pdfjs',
  doubleCheck: {
    enabled: false,
    provider: 'claude',
    model: 'claude-sonnet-4-20250514',
    operations: { topicExtraction: false, dispositivo: false, sentenceReview: false, factsComparison: false, proofAnalysis: false, quickPrompt: false },
  },
  detailedMiniReports: false,
  topicsPerRequest: 3,
  parallelRequests: 2,
  anonymization: { enabled: false, nomesUsuario: [] },
  semanticSearchEnabled: false,
  semanticThreshold: 50,
  jurisSemanticEnabled: false,
  quickPrompts: [],
  topicosComplementares: [],
  ...overrides,
} as AISettings);

const mockTokenMetrics: TokenMetrics = {
  totalInput: 0,
  totalOutput: 0,
  totalCacheRead: 0,
  totalCacheCreation: 0,
  requestCount: 0,
  lastUpdated: null
};

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

const mockSetAiSettings = vi.fn();
const mockShowToast = vi.fn();
const mockOpenModelGenerator = vi.fn();
const mockSetShowDataDownloadModal = vi.fn();
const mockSetShowEmbeddingsDownloadModal = vi.fn();
const mockSetApiTestStatus = vi.fn();

let mockAiSettings = createMockAiSettings();

// ═══════════════════════════════════════════════════════════════════════════════
// MOCKS
// ═══════════════════════════════════════════════════════════════════════════════

// Mock useAIStore
vi.mock('../../stores/useAIStore', () => ({
  useAIStore: (selector: (s: unknown) => unknown) => {
    const state = {
      aiSettings: mockAiSettings,
      setAiSettings: mockSetAiSettings,
      tokenMetrics: mockTokenMetrics,
      apiTestStatuses: { claude: null, gemini: null, openai: null, grok: null },
      setApiTestStatus: mockSetApiTestStatus,
    };
    return selector(state);
  },
}));

// Mock useUIStore
vi.mock('../../stores/useUIStore', () => ({
  useUIStore: (selector: (s: unknown) => unknown) => {
    const state = {
      showToast: mockShowToast,
      openModelGenerator: mockOpenModelGenerator,
      setShowDataDownloadModal: mockSetShowDataDownloadModal,
      setShowEmbeddingsDownloadModal: mockSetShowEmbeddingsDownloadModal,
    };
    return selector(state);
  },
}));

// Mock useModelsStore
vi.mock('../../stores/useModelsStore', () => ({
  useModelsStore: (selector: (s: unknown) => unknown) => {
    const state = {
      models: [],
      setModels: vi.fn(),
    };
    return typeof selector === 'function' ? selector(state) : state;
  },
}));

// Mock hooks
vi.mock('../../hooks', () => ({
  useNERManagement: () => ({
    nerEnabled: false,
    setNerEnabled: vi.fn(),
    nerIncludeOrg: false,
    setNerIncludeOrg: vi.fn(),
    nerModelReady: false,
    setNerModelReady: vi.fn(),
    nerInitializing: false,
    setNerInitializing: vi.fn(),
    nerDownloadProgress: 0,
    setNerDownloadProgress: vi.fn(),
  }),
  useSemanticSearchManagement: () => ({
    searchEnabled: false,
    setSearchEnabled: vi.fn(),
    searchModelReady: false,
    setSearchModelReady: vi.fn(),
    searchInitializing: false,
    setSearchInitializing: vi.fn(),
    searchDownloadProgress: 0,
    setSearchDownloadProgress: vi.fn(),
  }),
  useEmbeddingsManagement: () => ({
    embeddingsCount: 0,
    jurisEmbeddingsCount: 0,
    clearEmbeddings: vi.fn(),
    clearJurisEmbeddings: vi.fn(),
    clearModelEmbeddings: vi.fn(),
    generateModelEmbeddings: vi.fn(),
    generatingModelEmbeddings: false,
    modelEmbeddingsProgress: { current: 0, total: 0 },
    setDataDownloadStatus: vi.fn(),
  }),
  useLegislacao: () => ({
    artigos: [],
    reloadArtigos: vi.fn().mockResolvedValue(0),
  }),
  useJurisprudencia: () => ({
    precedentes: [],
    reloadPrecedentes: vi.fn().mockResolvedValue(0),
  }),
  useDragDropTopics: () => ({
    draggedComplementaryIndex: null,
    dragOverComplementaryIndex: null,
    handleComplementaryDragStart: vi.fn(),
    handleComplementaryDragEnd: vi.fn(),
    handleComplementaryDragOver: vi.fn(),
    handleComplementaryDragLeave: vi.fn(),
    handleComplementaryDrop: vi.fn(),
  }),
  useExportImport: () => ({
    exportAiSettings: vi.fn(),
    importAiSettings: vi.fn(),
  }),
  useIndexedDB: () => ({
    saveModels: vi.fn(),
  }),
  VOICE_MODEL_CONFIG: {
    'haiku': { provider: 'claude', model: 'claude-haiku-4-5-20251001', displayName: 'Claude Haiku 4.5' },
    'flash': { provider: 'gemini', model: 'gemini-3-flash-preview', displayName: 'Gemini 3 Flash' },
    'gpt-4o-mini': { provider: 'openai', model: 'gpt-4o-mini', displayName: 'GPT-4o Mini' },
    'grok-instant': { provider: 'grok', model: 'grok-4-1-fast-non-reasoning', displayName: 'Grok Instant' },
  },
}));

// Mock services
vi.mock('../../services/AIModelService', () => ({
  default: {
    init: vi.fn().mockResolvedValue(undefined),
    unload: vi.fn().mockResolvedValue(undefined),
    isReady: vi.fn().mockReturnValue(false),
    subscribe: vi.fn().mockReturnValue(() => {}),
  },
}));

vi.mock('../../services/EmbeddingsServices', () => ({
  EmbeddingsCDNService: {
    download: vi.fn(),
    needsDataDownload: vi.fn().mockResolvedValue(true),
  },
}));

// Mock ProviderIcon
vi.mock('../ui/ProviderIcon', () => ({
  ProviderIcon: ({ provider }: { provider: string }) => (
    <span data-testid={`provider-icon-${provider}`}>{provider}</span>
  ),
}));

// Mock CSS
vi.mock('../../constants/styles', () => ({
  CSS: {
    modalOverlay: 'modal-overlay',
    modalContainer: 'modal-container',
    modalHeader: 'modal-header',
    spinner: 'spinner',
    flexGap2: 'flex gap-2',
    textMuted: 'text-muted',
    button: 'button',
  },
}));

// Mock API_BASE
vi.mock('../../constants/api', () => ({
  API_BASE: 'http://localhost:3000',
}));

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('ConfigModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAiSettings = createMockAiSettings();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERING TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Rendering', () => {
    it('should render modal when isOpen is true', () => {
      render(<ConfigModal isOpen={true} onClose={vi.fn()} />);
      expect(screen.getByText('Configurações de IA')).toBeInTheDocument();
    });

    it('should NOT render modal when isOpen is false', () => {
      render(<ConfigModal isOpen={false} onClose={vi.fn()} />);
      expect(screen.queryByText('Configurações de IA')).not.toBeInTheDocument();
    });

    it('should render all 4 provider buttons', () => {
      render(<ConfigModal isOpen={true} onClose={vi.fn()} />);
      expect(screen.getByText('Claude')).toBeInTheDocument();
      expect(screen.getByText('Gemini')).toBeInTheDocument();
      expect(screen.getByText('OpenAI')).toBeInTheDocument();
      expect(screen.getByText('Grok')).toBeInTheDocument();
    });

    it('should render API Keys section', () => {
      render(<ConfigModal isOpen={true} onClose={vi.fn()} />);
      expect(screen.getByText(/Chaves API/i)).toBeInTheDocument();
    });

    it('should have close button with title', () => {
      render(<ConfigModal isOpen={true} onClose={vi.fn()} />);
      expect(screen.getByTitle('Fechar')).toBeInTheDocument();
    });

    it('should render provider sub-labels', () => {
      render(<ConfigModal isOpen={true} onClose={vi.fn()} />);
      expect(screen.getByText('Anthropic')).toBeInTheDocument();
      expect(screen.getByText('Google')).toBeInTheDocument();
      expect(screen.getByText('xAI')).toBeInTheDocument();
    });

    it('should render subtitle text', () => {
      render(<ConfigModal isOpen={true} onClose={vi.fn()} />);
      expect(screen.getByText(/Escolha o modelo e as configurações para análise de documentos/)).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PROVIDER SELECTION TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Provider Selection', () => {
    it('should call setAiSettings when Claude is selected', () => {
      mockAiSettings = createMockAiSettings({ provider: 'gemini' });
      render(<ConfigModal isOpen={true} onClose={vi.fn()} />);
      const claudeButton = screen.getByText('Claude').closest('button');
      fireEvent.click(claudeButton!);
      expect(mockSetAiSettings).toHaveBeenCalledWith(expect.objectContaining({ provider: 'claude' }));
    });

    it('should call setAiSettings when Gemini is selected', () => {
      render(<ConfigModal isOpen={true} onClose={vi.fn()} />);
      const geminiButton = screen.getByText('Gemini').closest('button');
      fireEvent.click(geminiButton!);
      expect(mockSetAiSettings).toHaveBeenCalledWith(expect.objectContaining({ provider: 'gemini' }));
    });

    it('should call setAiSettings when OpenAI is selected', () => {
      render(<ConfigModal isOpen={true} onClose={vi.fn()} />);
      const openaiButton = screen.getByText('OpenAI').closest('button');
      fireEvent.click(openaiButton!);
      expect(mockSetAiSettings).toHaveBeenCalledWith(expect.objectContaining({ provider: 'openai' }));
    });

    it('should call setAiSettings when Grok is selected', () => {
      render(<ConfigModal isOpen={true} onClose={vi.fn()} />);
      const grokButton = screen.getByText('Grok').closest('button');
      fireEvent.click(grokButton!);
      expect(mockSetAiSettings).toHaveBeenCalledWith(expect.objectContaining({ provider: 'grok' }));
    });

    it('should show active style on selected provider (Claude)', () => {
      mockAiSettings = createMockAiSettings({ provider: 'claude' });
      render(<ConfigModal isOpen={true} onClose={vi.fn()} />);
      const claudeButton = screen.getByText('Claude').closest('button');
      expect(claudeButton?.className).toContain('border-orange-500');
    });

    it('should show active style on selected provider (Gemini)', () => {
      mockAiSettings = createMockAiSettings({ provider: 'gemini' });
      render(<ConfigModal isOpen={true} onClose={vi.fn()} />);
      const geminiButton = screen.getByText('Gemini').closest('button');
      expect(geminiButton?.className).toContain('border-blue-500');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // MODEL SELECTION TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Model Selection', () => {
    it('should show Claude model selector when Claude is selected', () => {
      mockAiSettings = createMockAiSettings({ provider: 'claude' });
      const { container } = render(<ConfigModal isOpen={true} onClose={vi.fn()} />);
      const claudeOption = container.querySelector('option[value="claude-sonnet-4-20250514"]');
      expect(claudeOption).toBeInTheDocument();
    });

    it('should show Gemini model selector when Gemini is selected', () => {
      mockAiSettings = createMockAiSettings({ provider: 'gemini' });
      const { container } = render(<ConfigModal isOpen={true} onClose={vi.fn()} />);
      const geminiOption = container.querySelector('option[value="gemini-3-flash-preview"]');
      expect(geminiOption).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // API KEY INPUT TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('API Key Inputs', () => {
    it('should render Claude API key input', () => {
      render(<ConfigModal isOpen={true} onClose={vi.fn()} />);
      expect(screen.getByPlaceholderText('sk-ant-...')).toBeInTheDocument();
    });

    it('should render Gemini API key input', () => {
      render(<ConfigModal isOpen={true} onClose={vi.fn()} />);
      expect(screen.getByPlaceholderText('AIza...')).toBeInTheDocument();
    });

    it('should render OpenAI API key input', () => {
      render(<ConfigModal isOpen={true} onClose={vi.fn()} />);
      expect(screen.getByPlaceholderText('sk-...')).toBeInTheDocument();
    });

    it('should render Grok API key input', () => {
      render(<ConfigModal isOpen={true} onClose={vi.fn()} />);
      expect(screen.getByPlaceholderText('xai-...')).toBeInTheDocument();
    });

    it('should have password type for all API key inputs', () => {
      render(<ConfigModal isOpen={true} onClose={vi.fn()} />);
      const inputs = [
        screen.getByPlaceholderText('sk-ant-...'),
        screen.getByPlaceholderText('AIza...'),
        screen.getByPlaceholderText('sk-...'),
        screen.getByPlaceholderText('xai-...'),
      ];
      inputs.forEach(input => expect(input).toHaveAttribute('type', 'password'));
    });

    it('should call setAiSettings when Claude API key changes', () => {
      render(<ConfigModal isOpen={true} onClose={vi.fn()} />);
      fireEvent.change(screen.getByPlaceholderText('sk-ant-...'), { target: { value: 'sk-ant-test' } });
      expect(mockSetAiSettings).toHaveBeenCalledWith(expect.objectContaining({
        apiKeys: expect.objectContaining({ claude: 'sk-ant-test' }),
      }));
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CLOSE BUTTON TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Close Button', () => {
    it('should call onClose when close button is clicked', () => {
      const onClose = vi.fn();
      render(<ConfigModal isOpen={true} onClose={onClose} />);
      fireEvent.click(screen.getByTitle('Fechar'));
      expect(onClose).toHaveBeenCalled();
    });

    it('should call onClose when Fechar footer button is clicked', () => {
      const onClose = vi.fn();
      render(<ConfigModal isOpen={true} onClose={onClose} />);
      // Get all buttons with text Fechar and click the footer one (last one)
      const fecharButtons = screen.getAllByRole('button', { name: 'Fechar' });
      const footerButton = fecharButtons[fecharButtons.length - 1];
      fireEvent.click(footerButton);
      expect(onClose).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EXPORT/IMPORT TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Export/Import', () => {
    it('should render export button', () => {
      render(<ConfigModal isOpen={true} onClose={vi.fn()} />);
      expect(screen.getByText('Exportar Configurações')).toBeInTheDocument();
    });

    it('should render import button', () => {
      render(<ConfigModal isOpen={true} onClose={vi.fn()} />);
      expect(screen.getByText('Importar Configurações')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTIONS VISIBILITY
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Sections Visibility', () => {
    it('should render Thinking section header', () => {
      render(<ConfigModal isOpen={true} onClose={vi.fn()} />);
      expect(screen.getByText(/Pensamento/i)).toBeInTheDocument();
    });

    it('should render Anonymization section', () => {
      render(<ConfigModal isOpen={true} onClose={vi.fn()} />);
      expect(screen.getByText(/Anonimização/i)).toBeInTheDocument();
    });

    it('should render Semantic Search section', () => {
      render(<ConfigModal isOpen={true} onClose={vi.fn()} />);
      expect(screen.getByText(/Busca Semântica/i)).toBeInTheDocument();
    });

    it('should render Token Usage section', () => {
      render(<ConfigModal isOpen={true} onClose={vi.fn()} />);
      expect(screen.getByText(/Uso de Tokens/i)).toBeInTheDocument();
    });

    it('should render Quick Prompts section', () => {
      render(<ConfigModal isOpen={true} onClose={vi.fn()} />);
      expect(screen.getByText(/Prompts Rápidos/i)).toBeInTheDocument();
    });

    it('should render Complementary Topics section', () => {
      render(<ConfigModal isOpen={true} onClose={vi.fn()} />);
      expect(screen.getByText(/Tópicos Complementares/i)).toBeInTheDocument();
    });
  });
});

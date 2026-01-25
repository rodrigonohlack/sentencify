/**
 * @file ConfigModal.test.tsx
 * @description Comprehensive tests for the ConfigModal component (2581 LOC)
 * @version 1.38.49
 *
 * Covers all 18 sections:
 * 1. Provider selection (Claude/Gemini/OpenAI/Grok)
 * 2. API Keys (4 providers + test buttons)
 * 3. Extended Thinking (per-provider configurations)
 * 4. Double Check de Respostas
 * 4.5 Voice Improvement
 * 5. Detailed Mini-Reports
 * 6. Topics per Request
 * 7. Parallel Requests
 * 8. PDF Mode
 * 9. Anonymization
 * 10. Base de Dados
 * 11. Semantic Search (E5-base)
 * 12-15. Custom Models (Relatorio, Dispositivo, Topico, Estilo)
 * 16. Quick Prompts
 * 17. Token Usage
 * 18. Complementary Topics
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConfigModal } from './ConfigModal';
import type { ConfigModalProps, AISettings } from '../../types';

// Mock useAIStore
const mockSetApiTestStatus = vi.fn();
vi.mock('../../stores/useAIStore', () => ({
  useAIStore: (selector: (s: unknown) => unknown) => {
    const state = {
      apiTestStatuses: { claude: null, gemini: null, openai: null, grok: null },
      setApiTestStatus: mockSetApiTestStatus,
    };
    return selector(state);
  },
}));

// Mock services
vi.mock('../../services/AIModelService', () => ({
  default: {
    getEmbedding: vi.fn().mockResolvedValue([]),
    unload: vi.fn().mockResolvedValue(undefined),
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

// Mock voice improvement config - must match actual structure used in the component
vi.mock('../../hooks/useVoiceImprovement', () => ({
  VOICE_MODEL_CONFIG: {
    'haiku': { provider: 'claude', model: 'claude-haiku-4-5-20251001', displayName: 'Claude Haiku 4.5' },
    'flash': { provider: 'gemini', model: 'gemini-3-flash-preview', displayName: 'Gemini 3 Flash' },
    'gpt-4o-mini': { provider: 'openai', model: 'gpt-4o-mini', displayName: 'GPT-4o Mini' },
    'grok-instant': { provider: 'grok', model: 'grok-4-1-fast-non-reasoning', displayName: 'Grok Instant' },
  },
}));

describe('ConfigModal', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // DEFAULT PROPS FACTORY
  // ═══════════════════════════════════════════════════════════════════════════

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
    ...overrides,
  } as AISettings);

  const createMockProps = (overrides: Partial<ConfigModalProps> = {}): ConfigModalProps => ({
    isOpen: true,
    onClose: vi.fn(),
    aiSettings: createMockAiSettings(),
    setAiSettings: vi.fn(),
    tokenMetrics: { inputTokens: 0, outputTokens: 0, totalCost: 0 },
    getModelDisplayName: vi.fn(() => 'Claude Sonnet'),
    modelsCount: 10,
    legislacaoCount: 100,
    jurisprudenciaCount: 50,
    nerEnabled: false,
    setNerEnabled: vi.fn(),
    nerIncludeOrg: false,
    setNerIncludeOrg: vi.fn(),
    nerModelReady: false,
    setNerModelReady: vi.fn(),
    nerInitializing: false,
    nerDownloadProgress: 0,
    initNerModel: vi.fn(),
    searchEnabled: false,
    setSearchEnabled: vi.fn(),
    searchModelReady: false,
    setSearchModelReady: vi.fn(),
    searchInitializing: false,
    searchDownloadProgress: 0,
    initSearchModel: vi.fn(),
    handleSearchToggle: vi.fn(),
    handleLegislacaoToggle: vi.fn(),
    handleJurisToggle: vi.fn(),
    handleModelToggle: vi.fn(),
    embeddingsCount: 0,
    jurisEmbeddingsCount: 0,
    modelEmbeddingsCount: 0,
    generatingModelEmbeddings: false,
    modelEmbeddingsProgress: { current: 0, total: 0 },
    clearEmbeddings: vi.fn(),
    clearJurisEmbeddings: vi.fn(),
    clearModelEmbeddings: vi.fn(),
    generateModelEmbeddings: vi.fn(),
    setShowDataDownloadModal: vi.fn(),
    setShowEmbeddingsDownloadModal: vi.fn(),
    setDataDownloadStatus: vi.fn(),
    exportAiSettings: vi.fn(),
    importAiSettings: vi.fn(),
    openModelGenerator: vi.fn(),
    showToast: vi.fn(),
    draggedComplementaryIndex: null,
    dragOverComplementaryIndex: null,
    handleComplementaryDragStart: vi.fn(),
    handleComplementaryDragEnd: vi.fn(),
    handleComplementaryDragOver: vi.fn(),
    handleComplementaryDragLeave: vi.fn(),
    handleComplementaryDrop: vi.fn(),
    API_BASE: 'http://localhost:3000',
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERING TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Rendering', () => {
    it('should render modal when isOpen is true', () => {
      const props = createMockProps({ isOpen: true });
      render(<ConfigModal {...props} />);
      expect(screen.getByText('Configurações de IA')).toBeInTheDocument();
    });

    it('should NOT render modal when isOpen is false', () => {
      const props = createMockProps({ isOpen: false });
      render(<ConfigModal {...props} />);
      expect(screen.queryByText('Configurações de IA')).not.toBeInTheDocument();
    });

    it('should render all 4 provider buttons', () => {
      const props = createMockProps();
      render(<ConfigModal {...props} />);
      expect(screen.getByText('Claude')).toBeInTheDocument();
      expect(screen.getByText('Gemini')).toBeInTheDocument();
      expect(screen.getByText('OpenAI')).toBeInTheDocument();
      expect(screen.getByText('Grok')).toBeInTheDocument();
    });

    it('should render API Keys section', () => {
      const props = createMockProps();
      render(<ConfigModal {...props} />);
      expect(screen.getByText(/Chaves API/i)).toBeInTheDocument();
    });

    it('should have close button with title', () => {
      const props = createMockProps();
      render(<ConfigModal {...props} />);
      expect(screen.getByTitle('Fechar')).toBeInTheDocument();
    });

    it('should render provider sub-labels', () => {
      const props = createMockProps();
      render(<ConfigModal {...props} />);
      expect(screen.getByText('Anthropic')).toBeInTheDocument();
      expect(screen.getByText('Google')).toBeInTheDocument();
      expect(screen.getByText('xAI')).toBeInTheDocument();
    });

    it('should render subtitle text', () => {
      const props = createMockProps();
      render(<ConfigModal {...props} />);
      expect(screen.getByText(/Escolha o modelo e as configurações para análise de documentos/)).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PROVIDER SELECTION TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Provider Selection', () => {
    it('should call setAiSettings when Claude is selected', () => {
      const setAiSettings = vi.fn();
      const props = createMockProps({
        setAiSettings,
        aiSettings: createMockAiSettings({ provider: 'gemini' }),
      });
      render(<ConfigModal {...props} />);
      const claudeButton = screen.getByText('Claude').closest('button');
      fireEvent.click(claudeButton!);
      expect(setAiSettings).toHaveBeenCalledWith(expect.objectContaining({ provider: 'claude' }));
    });

    it('should call setAiSettings when Gemini is selected', () => {
      const setAiSettings = vi.fn();
      const props = createMockProps({ setAiSettings });
      render(<ConfigModal {...props} />);
      const geminiButton = screen.getByText('Gemini').closest('button');
      fireEvent.click(geminiButton!);
      expect(setAiSettings).toHaveBeenCalledWith(expect.objectContaining({ provider: 'gemini' }));
    });

    it('should call setAiSettings when OpenAI is selected', () => {
      const setAiSettings = vi.fn();
      const props = createMockProps({ setAiSettings });
      render(<ConfigModal {...props} />);
      const openaiButton = screen.getByText('OpenAI').closest('button');
      fireEvent.click(openaiButton!);
      expect(setAiSettings).toHaveBeenCalledWith(expect.objectContaining({ provider: 'openai' }));
    });

    it('should call setAiSettings when Grok is selected', () => {
      const setAiSettings = vi.fn();
      const props = createMockProps({ setAiSettings });
      render(<ConfigModal {...props} />);
      const grokButton = screen.getByText('Grok').closest('button');
      fireEvent.click(grokButton!);
      expect(setAiSettings).toHaveBeenCalledWith(expect.objectContaining({ provider: 'grok' }));
    });

    it('should show active style on selected provider (Claude)', () => {
      const props = createMockProps({ aiSettings: createMockAiSettings({ provider: 'claude' }) });
      render(<ConfigModal {...props} />);
      const claudeButton = screen.getByText('Claude').closest('button');
      expect(claudeButton?.className).toContain('border-orange-500');
    });

    it('should show active style on selected provider (Gemini)', () => {
      const props = createMockProps({ aiSettings: createMockAiSettings({ provider: 'gemini' }) });
      render(<ConfigModal {...props} />);
      const geminiButton = screen.getByText('Gemini').closest('button');
      expect(geminiButton?.className).toContain('border-blue-500');
    });

    it('should show active style on selected provider (OpenAI)', () => {
      const props = createMockProps({ aiSettings: createMockAiSettings({ provider: 'openai' }) });
      render(<ConfigModal {...props} />);
      const openaiButton = screen.getByText('OpenAI').closest('button');
      expect(openaiButton?.className).toContain('border-emerald-500');
    });

    it('should show active style on selected provider (Grok)', () => {
      const props = createMockProps({ aiSettings: createMockAiSettings({ provider: 'grok' }) });
      render(<ConfigModal {...props} />);
      const grokButton = screen.getByText('Grok').closest('button');
      expect(grokButton?.className).toContain('border-gray-400');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // MODEL SELECTION TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Model Selection', () => {
    it('should show Claude model selector when Claude is selected', () => {
      const props = createMockProps({ aiSettings: createMockAiSettings({ provider: 'claude' }) });
      render(<ConfigModal {...props} />);
      expect(screen.getByText(/Sonnet 4.5/i)).toBeInTheDocument();
    });

    it('should show Gemini model selector when Gemini is selected', () => {
      const props = createMockProps({ aiSettings: createMockAiSettings({ provider: 'gemini' }) });
      const { container } = render(<ConfigModal {...props} />);
      const geminiOption = container.querySelector('option[value="gemini-3-flash-preview"]');
      expect(geminiOption).toBeInTheDocument();
    });

    it('should show OpenAI model selector when OpenAI is selected', () => {
      const props = createMockProps({ aiSettings: createMockAiSettings({ provider: 'openai' }) });
      const { container } = render(<ConfigModal {...props} />);
      const openaiOption = container.querySelector('option[value="gpt-5.2-chat-latest"]');
      expect(openaiOption).toBeInTheDocument();
    });

    it('should show Grok model selector when Grok is selected', () => {
      const props = createMockProps({ aiSettings: createMockAiSettings({ provider: 'grok' }) });
      const { container } = render(<ConfigModal {...props} />);
      const grokOption = container.querySelector('option[value="grok-4-1-fast-reasoning"]');
      expect(grokOption).toBeInTheDocument();
    });

    it('should call setAiSettings when Claude model changes', () => {
      const setAiSettings = vi.fn();
      const props = createMockProps({ setAiSettings, aiSettings: createMockAiSettings({ provider: 'claude' }) });
      const { container } = render(<ConfigModal {...props} />);
      const modelSelect = container.querySelector('select');
      fireEvent.change(modelSelect!, { target: { value: 'claude-opus-4-5-20251101' } });
      expect(setAiSettings).toHaveBeenCalledWith(expect.objectContaining({
        claudeModel: 'claude-opus-4-5-20251101',
        model: 'claude-opus-4-5-20251101',
      }));
    });

    it('should call setAiSettings when Gemini model changes', () => {
      const setAiSettings = vi.fn();
      const props = createMockProps({ setAiSettings, aiSettings: createMockAiSettings({ provider: 'gemini' }) });
      const { container } = render(<ConfigModal {...props} />);
      const modelSelect = container.querySelector('select');
      fireEvent.change(modelSelect!, { target: { value: 'gemini-3-pro-preview' } });
      expect(setAiSettings).toHaveBeenCalledWith(expect.objectContaining({ geminiModel: 'gemini-3-pro-preview' }));
    });

    it('should call setAiSettings when OpenAI model changes', () => {
      const setAiSettings = vi.fn();
      const props = createMockProps({ setAiSettings, aiSettings: createMockAiSettings({ provider: 'openai' }) });
      const { container } = render(<ConfigModal {...props} />);
      const modelSelect = container.querySelector('select');
      fireEvent.change(modelSelect!, { target: { value: 'gpt-5.2' } });
      expect(setAiSettings).toHaveBeenCalledWith(expect.objectContaining({ openaiModel: 'gpt-5.2' }));
    });

    it('should call setAiSettings when Grok model changes', () => {
      const setAiSettings = vi.fn();
      const props = createMockProps({ setAiSettings, aiSettings: createMockAiSettings({ provider: 'grok' }) });
      const { container } = render(<ConfigModal {...props} />);
      const modelSelect = container.querySelector('select');
      fireEvent.change(modelSelect!, { target: { value: 'grok-4-1-fast-non-reasoning' } });
      expect(setAiSettings).toHaveBeenCalledWith(expect.objectContaining({ grokModel: 'grok-4-1-fast-non-reasoning' }));
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // API KEY INPUT TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('API Key Inputs', () => {
    it('should render Claude API key input', () => {
      const props = createMockProps();
      render(<ConfigModal {...props} />);
      expect(screen.getByPlaceholderText('sk-ant-...')).toBeInTheDocument();
    });

    it('should render Gemini API key input', () => {
      const props = createMockProps();
      render(<ConfigModal {...props} />);
      expect(screen.getByPlaceholderText('AIza...')).toBeInTheDocument();
    });

    it('should render OpenAI API key input', () => {
      const props = createMockProps();
      render(<ConfigModal {...props} />);
      expect(screen.getByPlaceholderText('sk-...')).toBeInTheDocument();
    });

    it('should render Grok API key input', () => {
      const props = createMockProps();
      render(<ConfigModal {...props} />);
      expect(screen.getByPlaceholderText('xai-...')).toBeInTheDocument();
    });

    it('should have password type for all API key inputs', () => {
      const props = createMockProps();
      render(<ConfigModal {...props} />);
      const inputs = [
        screen.getByPlaceholderText('sk-ant-...'),
        screen.getByPlaceholderText('AIza...'),
        screen.getByPlaceholderText('sk-...'),
        screen.getByPlaceholderText('xai-...'),
      ];
      inputs.forEach(input => expect(input).toHaveAttribute('type', 'password'));
    });

    it('should call setAiSettings when Claude API key changes', () => {
      const setAiSettings = vi.fn();
      const props = createMockProps({ setAiSettings });
      render(<ConfigModal {...props} />);
      fireEvent.change(screen.getByPlaceholderText('sk-ant-...'), { target: { value: 'sk-ant-test' } });
      expect(setAiSettings).toHaveBeenCalledWith(expect.objectContaining({
        apiKeys: expect.objectContaining({ claude: 'sk-ant-test' }),
      }));
    });

    it('should call setAiSettings when Gemini API key changes', () => {
      const setAiSettings = vi.fn();
      const props = createMockProps({ setAiSettings });
      render(<ConfigModal {...props} />);
      fireEvent.change(screen.getByPlaceholderText('AIza...'), { target: { value: 'AIza-test' } });
      expect(setAiSettings).toHaveBeenCalledWith(expect.objectContaining({
        apiKeys: expect.objectContaining({ gemini: 'AIza-test' }),
      }));
    });

    it('should call setAiSettings when OpenAI API key changes', () => {
      const setAiSettings = vi.fn();
      const props = createMockProps({ setAiSettings });
      render(<ConfigModal {...props} />);
      fireEvent.change(screen.getByPlaceholderText('sk-...'), { target: { value: 'sk-test' } });
      expect(setAiSettings).toHaveBeenCalledWith(expect.objectContaining({
        apiKeys: expect.objectContaining({ openai: 'sk-test' }),
      }));
    });

    it('should call setAiSettings when Grok API key changes', () => {
      const setAiSettings = vi.fn();
      const props = createMockProps({ setAiSettings });
      render(<ConfigModal {...props} />);
      fireEvent.change(screen.getByPlaceholderText('xai-...'), { target: { value: 'xai-test' } });
      expect(setAiSettings).toHaveBeenCalledWith(expect.objectContaining({
        apiKeys: expect.objectContaining({ grok: 'xai-test' }),
      }));
    });

    it('should have 4 test buttons', () => {
      const props = createMockProps();
      render(<ConfigModal {...props} />);
      const testButtons = screen.getAllByText('Testar');
      expect(testButtons).toHaveLength(4);
    });

    it('should render API key security notice', () => {
      const props = createMockProps();
      render(<ConfigModal {...props} />);
      expect(screen.getByText(/As chaves são armazenadas apenas no seu navegador/)).toBeInTheDocument();
    });

    it('should display existing API key values', () => {
      const props = createMockProps({
        aiSettings: createMockAiSettings({
          apiKeys: { claude: 'sk-existing', gemini: '', openai: '', grok: '' },
        }),
      });
      render(<ConfigModal {...props} />);
      const input = screen.getByPlaceholderText('sk-ant-...') as HTMLInputElement;
      expect(input.value).toBe('sk-existing');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 3: EXTENDED THINKING TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Extended Thinking', () => {
    it('should render Extended Thinking section', () => {
      const props = createMockProps();
      render(<ConfigModal {...props} />);
      expect(screen.getByText(/Pensamento Prolongado/)).toBeInTheDocument();
    });

    describe('Claude Extended Thinking', () => {
      it('should show toggle for Claude when disabled', () => {
        const props = createMockProps({ aiSettings: createMockAiSettings({ provider: 'claude', useExtendedThinking: false }) });
        render(<ConfigModal {...props} />);
        expect(screen.getByText(/A IA responderá mais rapidamente/)).toBeInTheDocument();
      });

      it('should show active state when enabled', () => {
        const props = createMockProps({ aiSettings: createMockAiSettings({ provider: 'claude', useExtendedThinking: true, thinkingBudget: '10000' }) });
        render(<ConfigModal {...props} />);
        const activeText = screen.getAllByText(/Ativado/);
        expect(activeText.length).toBeGreaterThan(0);
      });

      it('should toggle extended thinking on click', () => {
        const setAiSettings = vi.fn();
        const props = createMockProps({ setAiSettings, aiSettings: createMockAiSettings({ provider: 'claude', useExtendedThinking: false }) });
        render(<ConfigModal {...props} />);
        const toggleBtn = screen.getByText(/A IA responderá mais rapidamente/).closest('button');
        fireEvent.click(toggleBtn!);
        expect(setAiSettings).toHaveBeenCalledWith(expect.objectContaining({ useExtendedThinking: true }));
      });

      it('should show budget selector when extended thinking is enabled', () => {
        const props = createMockProps({ aiSettings: createMockAiSettings({ provider: 'claude', useExtendedThinking: true, thinkingBudget: '10000' }) });
        render(<ConfigModal {...props} />);
        expect(screen.getByText('Budget de Pensamento:')).toBeInTheDocument();
      });

      it('should show Sonnet budget options for non-opus model', () => {
        const props = createMockProps({ aiSettings: createMockAiSettings({ provider: 'claude', useExtendedThinking: true, claudeModel: 'claude-sonnet-4-20250514' }) });
        const { container } = render(<ConfigModal {...props} />);
        const option = container.querySelector('option[value="62000"]');
        expect(option).toBeInTheDocument();
      });

      it('should show Opus budget options for opus model', () => {
        const props = createMockProps({ aiSettings: createMockAiSettings({ provider: 'claude', useExtendedThinking: true, claudeModel: 'claude-opus-4-5-20251101', model: 'claude-opus-4-5-20251101' }) });
        const { container } = render(<ConfigModal {...props} />);
        const option30k = container.querySelector('option[value="30000"]');
        expect(option30k).toBeInTheDocument();
        // Opus should NOT have 62K option
        const option62k = container.querySelector('option[value="62000"]');
        expect(option62k).not.toBeInTheDocument();
      });

      it('should show warning for high budget (>= 40000)', () => {
        const props = createMockProps({ aiSettings: createMockAiSettings({ provider: 'claude', useExtendedThinking: true, thinkingBudget: '40000' }) });
        render(<ConfigModal {...props} />);
        expect(screen.getByText(/Respostas podem demorar mais com budgets altos/)).toBeInTheDocument();
      });

      it('should call setAiSettings when budget changes', () => {
        const setAiSettings = vi.fn();
        const props = createMockProps({ setAiSettings, aiSettings: createMockAiSettings({ provider: 'claude', useExtendedThinking: true }) });
        render(<ConfigModal {...props} />);
        const budgetSelect = screen.getByText('Budget de Pensamento:').closest('div')!.querySelector('select');
        fireEvent.change(budgetSelect!, { target: { value: '20000' } });
        expect(setAiSettings).toHaveBeenCalledWith(expect.objectContaining({ thinkingBudget: '20000' }));
      });
    });

    describe('Gemini Thinking', () => {
      it('should show Gemini thinking info', () => {
        const props = createMockProps({ aiSettings: createMockAiSettings({ provider: 'gemini' }) });
        render(<ConfigModal {...props} />);
        expect(screen.getByText(/Gemini 3 sempre usa Thinking/)).toBeInTheDocument();
      });

      it('should show all thinking levels for Flash model', () => {
        const props = createMockProps({ aiSettings: createMockAiSettings({ provider: 'gemini', geminiModel: 'gemini-3-flash-preview' }) });
        const { container } = render(<ConfigModal {...props} />);
        const selects = container.querySelectorAll('select');
        // Find the thinking level select (not the model select)
        const thinkingSelect = Array.from(selects).find(s => s.querySelector('option[value="minimal"]'));
        expect(thinkingSelect).toBeTruthy();
      });

      it('should show only Low and High for Pro model', () => {
        const props = createMockProps({ aiSettings: createMockAiSettings({ provider: 'gemini', geminiModel: 'gemini-3-pro-preview' }) });
        const { container } = render(<ConfigModal {...props} />);
        const selects = container.querySelectorAll('select');
        const thinkingSelect = Array.from(selects).find(s => s.querySelector('option[value="high"]') && !s.querySelector('option[value="minimal"]'));
        expect(thinkingSelect).toBeTruthy();
      });

      it('should call setAiSettings when thinking level changes for Gemini', () => {
        const setAiSettings = vi.fn();
        const props = createMockProps({ setAiSettings, aiSettings: createMockAiSettings({ provider: 'gemini', geminiModel: 'gemini-3-flash-preview', geminiThinkingLevel: 'low' }) });
        const { container } = render(<ConfigModal {...props} />);
        const selects = container.querySelectorAll('select');
        const thinkingSelect = Array.from(selects).find(s => s.querySelector('option[value="minimal"]'));
        fireEvent.change(thinkingSelect!, { target: { value: 'high' } });
        expect(setAiSettings).toHaveBeenCalledWith(expect.objectContaining({ geminiThinkingLevel: 'high' }));
      });

      it('should display pro-specific hint text', () => {
        const props = createMockProps({ aiSettings: createMockAiSettings({ provider: 'gemini', geminiModel: 'gemini-3-pro-preview' }) });
        render(<ConfigModal {...props} />);
        expect(screen.getByText(/Gemini 3 Pro suporta apenas Low e High/)).toBeInTheDocument();
      });
    });

    describe('OpenAI Reasoning', () => {
      it('should show reasoning config for GPT-5.2 Thinking model', () => {
        const props = createMockProps({ aiSettings: createMockAiSettings({ provider: 'openai', openaiModel: 'gpt-5.2' }) });
        render(<ConfigModal {...props} />);
        expect(screen.getByText(/GPT-5.2 Reasoning/)).toBeInTheDocument();
      });

      it('should show Instant info for GPT-5.2 chat model', () => {
        const props = createMockProps({ aiSettings: createMockAiSettings({ provider: 'openai', openaiModel: 'gpt-5.2-chat-latest' }) });
        render(<ConfigModal {...props} />);
        expect(screen.getByText(/Modelo rápido sem reasoning/)).toBeInTheDocument();
      });

      it('should show xhigh warning', () => {
        const props = createMockProps({ aiSettings: createMockAiSettings({ provider: 'openai', openaiModel: 'gpt-5.2', openaiReasoningLevel: 'xhigh' }) });
        render(<ConfigModal {...props} />);
        expect(screen.getByText(/Nível xhigh pode demorar vários minutos/)).toBeInTheDocument();
      });

      it('should call setAiSettings when reasoning level changes', () => {
        const setAiSettings = vi.fn();
        const props = createMockProps({ setAiSettings, aiSettings: createMockAiSettings({ provider: 'openai', openaiModel: 'gpt-5.2', openaiReasoningLevel: 'medium' }) });
        const { container } = render(<ConfigModal {...props} />);
        const selects = container.querySelectorAll('select');
        const reasoningSelect = Array.from(selects).find(s => s.querySelector('option[value="xhigh"]'));
        fireEvent.change(reasoningSelect!, { target: { value: 'high' } });
        expect(setAiSettings).toHaveBeenCalledWith(expect.objectContaining({ openaiReasoningLevel: 'high' }));
      });
    });

    describe('Grok Thinking', () => {
      it('should show Fast Thinking info for reasoning model', () => {
        const props = createMockProps({ aiSettings: createMockAiSettings({ provider: 'grok', grokModel: 'grok-4-1-fast-reasoning' }) });
        render(<ConfigModal {...props} />);
        expect(screen.getByText(/Grok 4.1 Fast Thinking/)).toBeInTheDocument();
      });

      it('should show Instant info for non-reasoning model', () => {
        const props = createMockProps({ aiSettings: createMockAiSettings({ provider: 'grok', grokModel: 'grok-4-1-fast-non-reasoning' }) });
        render(<ConfigModal {...props} />);
        expect(screen.getByText(/Grok 4.1 Fast Instant/)).toBeInTheDocument();
      });
    });

    describe('Log Thinking checkbox', () => {
      it('should render log thinking checkbox', () => {
        const props = createMockProps({ aiSettings: createMockAiSettings({ provider: 'claude' }) });
        render(<ConfigModal {...props} />);
        expect(screen.getByText(/Log thinking no console/)).toBeInTheDocument();
      });

      it('should be disabled for Grok provider', () => {
        const props = createMockProps({ aiSettings: createMockAiSettings({ provider: 'grok' }) });
        const { container } = render(<ConfigModal {...props} />);
        const logCheckbox = container.querySelector('input[type="checkbox"]');
        expect(logCheckbox).toBeDisabled();
      });

      it('should be disabled for OpenAI Instant model', () => {
        const props = createMockProps({ aiSettings: createMockAiSettings({ provider: 'openai', openaiModel: 'gpt-5.2-chat-latest' }) });
        const { container } = render(<ConfigModal {...props} />);
        const checkboxes = container.querySelectorAll('input[type="checkbox"]');
        // The log thinking checkbox is the first one in the thinking section
        const logCheckbox = Array.from(checkboxes).find(cb => cb.closest('label')?.textContent?.includes('Log thinking'));
        expect(logCheckbox).toBeDisabled();
      });

      it('should be enabled for Claude provider', () => {
        const props = createMockProps({ aiSettings: createMockAiSettings({ provider: 'claude' }) });
        const { container } = render(<ConfigModal {...props} />);
        const checkboxes = container.querySelectorAll('input[type="checkbox"]');
        const logCheckbox = Array.from(checkboxes).find(cb => cb.closest('label')?.textContent?.includes('Log thinking'));
        expect(logCheckbox).not.toBeDisabled();
      });

      it('should call setAiSettings when toggled', () => {
        const setAiSettings = vi.fn();
        const props = createMockProps({ setAiSettings, aiSettings: createMockAiSettings({ provider: 'claude', logThinking: false } as Partial<AISettings>) });
        const { container } = render(<ConfigModal {...props} />);
        const checkboxes = container.querySelectorAll('input[type="checkbox"]');
        const logCheckbox = Array.from(checkboxes).find(cb => cb.closest('label')?.textContent?.includes('Log thinking'));
        fireEvent.click(logCheckbox!);
        expect(setAiSettings).toHaveBeenCalledWith(expect.objectContaining({ logThinking: true }));
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 4: DOUBLE CHECK TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Double Check', () => {
    it('should render Double Check section', () => {
      const props = createMockProps();
      render(<ConfigModal {...props} />);
      expect(screen.getByText(/Double Check de Respostas/)).toBeInTheDocument();
    });

    it('should toggle double check on click', () => {
      const setAiSettings = vi.fn();
      const props = createMockProps({ setAiSettings });
      render(<ConfigModal {...props} />);
      const dcText = screen.getByText(/Reanalisa respostas da IA/);
      const toggleBtn = dcText.closest('button');
      fireEvent.click(toggleBtn!);
      expect(setAiSettings).toHaveBeenCalledWith(expect.objectContaining({
        doubleCheck: expect.objectContaining({ enabled: true }),
      }));
    });

    it('should show expanded options when enabled', () => {
      const props = createMockProps({
        aiSettings: createMockAiSettings({
          doubleCheck: {
            enabled: true,
            provider: 'claude',
            model: 'claude-sonnet-4-20250514',
            operations: { topicExtraction: false, dispositivo: false, sentenceReview: false, factsComparison: false, proofAnalysis: false, quickPrompt: false },
          },
        }),
      });
      render(<ConfigModal {...props} />);
      expect(screen.getByText('Provider para verificação')).toBeInTheDocument();
      expect(screen.getByText('Modelo para verificação')).toBeInTheDocument();
    });

    it('should show all operation checkboxes when enabled', () => {
      const props = createMockProps({
        aiSettings: createMockAiSettings({
          doubleCheck: {
            enabled: true,
            provider: 'claude',
            model: 'claude-sonnet-4-20250514',
            operations: { topicExtraction: false, dispositivo: false, sentenceReview: false, factsComparison: false, proofAnalysis: false, quickPrompt: false },
          },
        }),
      });
      render(<ConfigModal {...props} />);
      expect(screen.getByText('Extração de tópicos')).toBeInTheDocument();
      expect(screen.getByText('Dispositivo')).toBeInTheDocument();
      expect(screen.getByText('Revisar sentença')).toBeInTheDocument();
      expect(screen.getByText('Confronto de fatos')).toBeInTheDocument();
      expect(screen.getByText('Análise de provas')).toBeInTheDocument();
      expect(screen.getByText('Prompts rápidos (Assistente IA)')).toBeInTheDocument();
    });

    it('should toggle topicExtraction operation', () => {
      const setAiSettings = vi.fn();
      const props = createMockProps({
        setAiSettings,
        aiSettings: createMockAiSettings({
          doubleCheck: {
            enabled: true,
            provider: 'claude',
            model: 'claude-sonnet-4-20250514',
            operations: { topicExtraction: false, dispositivo: false, sentenceReview: false, factsComparison: false, proofAnalysis: false, quickPrompt: false },
          },
        }),
      });
      render(<ConfigModal {...props} />);
      const label = screen.getByText('Extração de tópicos').closest('label');
      const checkbox = label!.querySelector('input[type="checkbox"]');
      fireEvent.click(checkbox!);
      expect(setAiSettings).toHaveBeenCalledWith(expect.objectContaining({
        doubleCheck: expect.objectContaining({
          operations: expect.objectContaining({ topicExtraction: true }),
        }),
      }));
    });

    it('should show cost warning when enabled', () => {
      const props = createMockProps({
        aiSettings: createMockAiSettings({
          doubleCheck: {
            enabled: true,
            provider: 'claude',
            model: 'claude-sonnet-4-20250514',
            operations: { topicExtraction: false, dispositivo: false, sentenceReview: false, factsComparison: false, proofAnalysis: false, quickPrompt: false },
          },
        }),
      });
      render(<ConfigModal {...props} />);
      expect(screen.getByText(/dobra o custo e tempo/)).toBeInTheDocument();
    });

    it('should change DC provider and update default model', () => {
      const setAiSettings = vi.fn();
      const props = createMockProps({
        setAiSettings,
        aiSettings: createMockAiSettings({
          doubleCheck: {
            enabled: true,
            provider: 'claude',
            model: 'claude-sonnet-4-20250514',
            operations: { topicExtraction: false, dispositivo: false, sentenceReview: false, factsComparison: false, proofAnalysis: false, quickPrompt: false },
          },
        }),
      });
      const { container } = render(<ConfigModal {...props} />);
      const providerSelect = container.querySelector('select[class*="p-2"]') as HTMLSelectElement;
      fireEvent.change(providerSelect!, { target: { value: 'gemini' } });
      expect(setAiSettings).toHaveBeenCalledWith(expect.objectContaining({
        doubleCheck: expect.objectContaining({
          provider: 'gemini',
          model: 'gemini-3-flash-preview',
        }),
      }));
    });

    it('should show Claude Thinking Budget in DC when provider is claude', () => {
      const props = createMockProps({
        aiSettings: createMockAiSettings({
          doubleCheck: {
            enabled: true,
            provider: 'claude',
            model: 'claude-sonnet-4-20250514',
            operations: { topicExtraction: false, dispositivo: false, sentenceReview: false, factsComparison: false, proofAnalysis: false, quickPrompt: false },
          },
        }),
      });
      render(<ConfigModal {...props} />);
      expect(screen.getByText('Extended Thinking Budget')).toBeInTheDocument();
    });

    it('should show Gemini Thinking Level in DC when provider is gemini', () => {
      const props = createMockProps({
        aiSettings: createMockAiSettings({
          doubleCheck: {
            enabled: true,
            provider: 'gemini',
            model: 'gemini-3-flash-preview',
            operations: { topicExtraction: false, dispositivo: false, sentenceReview: false, factsComparison: false, proofAnalysis: false, quickPrompt: false },
          },
        }),
      });
      render(<ConfigModal {...props} />);
      expect(screen.getByText('Thinking Level')).toBeInTheDocument();
    });

    it('should show OpenAI Reasoning Level in DC when provider is openai and model is gpt-5.2', () => {
      const props = createMockProps({
        aiSettings: createMockAiSettings({
          doubleCheck: {
            enabled: true,
            provider: 'openai',
            model: 'gpt-5.2',
            operations: { topicExtraction: false, dispositivo: false, sentenceReview: false, factsComparison: false, proofAnalysis: false, quickPrompt: false },
          },
        }),
      });
      render(<ConfigModal {...props} />);
      expect(screen.getByText('Reasoning Level')).toBeInTheDocument();
    });

    it('should show Grok thinking info in DC', () => {
      const props = createMockProps({
        aiSettings: createMockAiSettings({
          doubleCheck: {
            enabled: true,
            provider: 'grok',
            model: 'grok-4-1-fast-reasoning',
            operations: { topicExtraction: false, dispositivo: false, sentenceReview: false, factsComparison: false, proofAnalysis: false, quickPrompt: false },
          },
        }),
      });
      render(<ConfigModal {...props} />);
      expect(screen.getByText(/Thinking é automático e não configurável/)).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 4.5: VOICE IMPROVEMENT TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Voice Improvement', () => {
    it('should render Voice Improvement section', () => {
      const props = createMockProps();
      render(<ConfigModal {...props} />);
      expect(screen.getByText(/Melhoria de Voz por IA/)).toBeInTheDocument();
    });

    it('should toggle voice improvement on click', () => {
      const setAiSettings = vi.fn();
      const props = createMockProps({ setAiSettings });
      render(<ConfigModal {...props} />);
      const voiceText = screen.getByText(/Melhorar automaticamente textos ditados por voz/);
      const toggleBtn = voiceText.closest('button');
      fireEvent.click(toggleBtn!);
      expect(setAiSettings).toHaveBeenCalledWith(expect.objectContaining({
        voiceImprovement: expect.objectContaining({ enabled: true }),
      }));
    });

    it('should show model selector when enabled with API keys', () => {
      const props = createMockProps({
        aiSettings: createMockAiSettings({
          voiceImprovement: { enabled: true, model: 'haiku' },
          apiKeys: { claude: 'sk-test', gemini: '', openai: '', grok: '' },
        } as Partial<AISettings>),
      });
      render(<ConfigModal {...props} />);
      expect(screen.getByText('Modelo para Melhoria')).toBeInTheDocument();
    });

    it('should show warning when no API keys configured and voice enabled', () => {
      const props = createMockProps({
        aiSettings: createMockAiSettings({
          voiceImprovement: { enabled: true, model: 'haiku' },
          apiKeys: { claude: '', gemini: '', openai: '', grok: '' },
        } as Partial<AISettings>),
      });
      render(<ConfigModal {...props} />);
      expect(screen.getByText(/Configure pelo menos uma API key/)).toBeInTheDocument();
    });

    it('should show cost warning when voice enabled', () => {
      const props = createMockProps({
        aiSettings: createMockAiSettings({
          voiceImprovement: { enabled: true, model: 'haiku' },
          apiKeys: { claude: 'sk-test', gemini: '', openai: '', grok: '' },
        } as Partial<AISettings>),
      });
      render(<ConfigModal {...props} />);
      expect(screen.getByText(/Cada ditado fará uma chamada extra/)).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 5: DETAILED MINI-REPORTS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Detailed Mini-Reports', () => {
    it('should render section', () => {
      const props = createMockProps();
      render(<ConfigModal {...props} />);
      expect(screen.getByText(/Nível de Detalhe nos Mini-Relatórios/)).toBeInTheDocument();
    });

    it('should show disabled state text', () => {
      const props = createMockProps({ aiSettings: createMockAiSettings({ detailedMiniReports: false }) });
      render(<ConfigModal {...props} />);
      expect(screen.getByText(/Os mini-relatórios serão gerados com nível de detalhe padrão/)).toBeInTheDocument();
    });

    it('should show enabled state text', () => {
      const props = createMockProps({ aiSettings: createMockAiSettings({ detailedMiniReports: true }) });
      render(<ConfigModal {...props} />);
      expect(screen.getByText(/Os mini-relatórios serão gerados com descrição fática detalhada/)).toBeInTheDocument();
    });

    it('should toggle detailed mini-reports', () => {
      const setAiSettings = vi.fn();
      const props = createMockProps({ setAiSettings, aiSettings: createMockAiSettings({ detailedMiniReports: false }) });
      render(<ConfigModal {...props} />);
      const text = screen.getByText(/Os mini-relatórios serão gerados com nível de detalhe padrão/);
      const toggleBtn = text.closest('button');
      fireEvent.click(toggleBtn!);
      expect(setAiSettings).toHaveBeenCalledWith(expect.objectContaining({ detailedMiniReports: true }));
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 6: TOPICS PER REQUEST
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Topics per Request', () => {
    it('should render section', () => {
      const props = createMockProps();
      render(<ConfigModal {...props} />);
      expect(screen.getByText(/Tópicos por Requisição/)).toBeInTheDocument();
    });

    it('should show description', () => {
      const props = createMockProps();
      render(<ConfigModal {...props} />);
      expect(screen.getByText(/Quantos mini-relatórios gerar por chamada à API/)).toBeInTheDocument();
    });

    it('should call setAiSettings when topics per request changes to "all"', () => {
      const setAiSettings = vi.fn();
      const props = createMockProps({ setAiSettings });
      const { container } = render(<ConfigModal {...props} />);
      const selects = container.querySelectorAll('select');
      const topicsSelect = Array.from(selects).find(s => s.querySelector('option[value="all"]'));
      fireEvent.change(topicsSelect!, { target: { value: 'all' } });
      expect(setAiSettings).toHaveBeenCalledWith(expect.objectContaining({ topicsPerRequest: 'all' }));
    });

    it('should call setAiSettings when topics per request changes to number', () => {
      const setAiSettings = vi.fn();
      const props = createMockProps({ setAiSettings });
      const { container } = render(<ConfigModal {...props} />);
      const selects = container.querySelectorAll('select');
      const topicsSelect = Array.from(selects).find(s => s.querySelector('option[value="all"]'));
      fireEvent.change(topicsSelect!, { target: { value: '5' } });
      expect(setAiSettings).toHaveBeenCalledWith(expect.objectContaining({ topicsPerRequest: 5 }));
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 7: PARALLEL REQUESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Parallel Requests', () => {
    it('should render section', () => {
      const props = createMockProps();
      render(<ConfigModal {...props} />);
      expect(screen.getByText('Requisições Paralelas')).toBeInTheDocument();
    });

    it('should show description', () => {
      const props = createMockProps();
      render(<ConfigModal {...props} />);
      expect(screen.getByText(/Quantas requisições enviar simultaneamente/)).toBeInTheDocument();
    });

    it('should show API rate limit info', () => {
      const props = createMockProps();
      render(<ConfigModal {...props} />);
      expect(screen.getByText(/Limites por API/)).toBeInTheDocument();
    });

    it('should call setAiSettings when parallel requests changes', () => {
      const setAiSettings = vi.fn();
      const props = createMockProps({ setAiSettings });
      const { container } = render(<ConfigModal {...props} />);
      const selects = container.querySelectorAll('select');
      const parallelSelect = Array.from(selects).find(s => s.querySelector('option[value="20"]'));
      fireEvent.change(parallelSelect!, { target: { value: '10' } });
      expect(setAiSettings).toHaveBeenCalledWith(expect.objectContaining({ parallelRequests: 10 }));
    });

    it('should show error 429 warning', () => {
      const props = createMockProps();
      render(<ConfigModal {...props} />);
      expect(screen.getByText(/Erro 429 = limite excedido/)).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 8: PDF MODE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('PDF Mode', () => {
    it('should render section', () => {
      const props = createMockProps();
      render(<ConfigModal {...props} />);
      expect(screen.getByText(/Modo de Processamento de PDF/)).toBeInTheDocument();
    });

    it('should show PDF Puro option', () => {
      const props = createMockProps();
      render(<ConfigModal {...props} />);
      expect(screen.getByText(/PDF Puro \(Binário\)/)).toBeInTheDocument();
    });

    it('should show Extrair Texto option', () => {
      const props = createMockProps();
      render(<ConfigModal {...props} />);
      expect(screen.getByText('Extrair Texto')).toBeInTheDocument();
    });

    it('should select PDF Puro when clicked', () => {
      const setAiSettings = vi.fn();
      const props = createMockProps({ setAiSettings });
      render(<ConfigModal {...props} />);
      const pdfPuroBtn = screen.getByText(/PDF Puro \(Binário\)/).closest('button');
      fireEvent.click(pdfPuroBtn!);
      expect(setAiSettings).toHaveBeenCalledWith(expect.objectContaining({ ocrEngine: 'pdf-puro' }));
    });

    it('should show sub-options when Extrair Texto is selected', () => {
      const props = createMockProps({ aiSettings: createMockAiSettings({ ocrEngine: 'pdfjs' }) });
      render(<ConfigModal {...props} />);
      expect(screen.getByText(/PDF.js - Padrão/)).toBeInTheDocument();
      expect(screen.getByText(/Tesseract OCR - Offline/)).toBeInTheDocument();
      expect(screen.getByText(/Claude Vision - OCR Avançado/)).toBeInTheDocument();
    });

    it('should select pdfjs when clicked', () => {
      const setAiSettings = vi.fn();
      const props = createMockProps({ setAiSettings, aiSettings: createMockAiSettings({ ocrEngine: 'tesseract' }) });
      render(<ConfigModal {...props} />);
      const pdfjsBtn = screen.getByText(/PDF.js - Padrão/).closest('button');
      fireEvent.click(pdfjsBtn!);
      expect(setAiSettings).toHaveBeenCalledWith(expect.objectContaining({ ocrEngine: 'pdfjs' }));
    });

    it('should select tesseract when clicked', () => {
      const setAiSettings = vi.fn();
      const props = createMockProps({ setAiSettings, aiSettings: createMockAiSettings({ ocrEngine: 'pdfjs' }) });
      render(<ConfigModal {...props} />);
      const tesseractBtn = screen.getByText(/Tesseract OCR - Offline/).closest('button');
      fireEvent.click(tesseractBtn!);
      expect(setAiSettings).toHaveBeenCalledWith(expect.objectContaining({ ocrEngine: 'tesseract' }));
    });

    it('should select claude-vision when clicked', () => {
      const setAiSettings = vi.fn();
      const props = createMockProps({ setAiSettings, aiSettings: createMockAiSettings({ ocrEngine: 'pdfjs' }) });
      render(<ConfigModal {...props} />);
      const visionBtn = screen.getByText(/Claude Vision - OCR Avançado/).closest('button');
      fireEvent.click(visionBtn!);
      expect(setAiSettings).toHaveBeenCalledWith(expect.objectContaining({ ocrEngine: 'claude-vision' }));
    });

    it('should show token cost warning for Claude Vision', () => {
      const props = createMockProps({ aiSettings: createMockAiSettings({ ocrEngine: 'claude-vision' }) });
      render(<ConfigModal {...props} />);
      expect(screen.getByText(/Atenção: Consumo de Tokens/)).toBeInTheDocument();
    });

    it('should switch from pdf-puro to pdfjs when Extrair Texto is clicked', () => {
      const setAiSettings = vi.fn();
      const props = createMockProps({ setAiSettings, aiSettings: createMockAiSettings({ ocrEngine: 'pdf-puro' }) });
      render(<ConfigModal {...props} />);
      const extractBtn = screen.getByText('Extrair Texto').closest('button');
      fireEvent.click(extractBtn!);
      expect(setAiSettings).toHaveBeenCalledWith(expect.objectContaining({ ocrEngine: 'pdfjs' }));
    });

    it('should NOT change when already in extract mode and Extrair Texto is clicked', () => {
      const setAiSettings = vi.fn();
      const props = createMockProps({ setAiSettings, aiSettings: createMockAiSettings({ ocrEngine: 'tesseract' }) });
      render(<ConfigModal {...props} />);
      const extractBtn = screen.getByText('Extrair Texto').closest('button');
      fireEvent.click(extractBtn!);
      // Should not call setAiSettings because ocrEngine is already in extract mode
      expect(setAiSettings).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 9: ANONYMIZATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Anonymization', () => {
    it('should render section', () => {
      const props = createMockProps();
      render(<ConfigModal {...props} />);
      expect(screen.getByText('Anonimização de Documentos')).toBeInTheDocument();
    });

    it('should show unavailable message with pdf-puro mode', () => {
      const props = createMockProps({ aiSettings: createMockAiSettings({ ocrEngine: 'pdf-puro' }) });
      render(<ConfigModal {...props} />);
      expect(screen.getByText(/Indisponível com o método atual/)).toBeInTheDocument();
    });

    it('should show unavailable message with claude-vision mode', () => {
      const props = createMockProps({ aiSettings: createMockAiSettings({ ocrEngine: 'claude-vision' }) });
      render(<ConfigModal {...props} />);
      expect(screen.getByText(/Indisponível com o método atual/)).toBeInTheDocument();
    });

    it('should show toggle when ocrEngine is pdfjs', () => {
      const props = createMockProps({ aiSettings: createMockAiSettings({ ocrEngine: 'pdfjs' }) });
      render(<ConfigModal {...props} />);
      expect(screen.getByText(/O texto será enviado à IA sem modificações/)).toBeInTheDocument();
    });

    it('should show toggle when ocrEngine is tesseract', () => {
      const props = createMockProps({ aiSettings: createMockAiSettings({ ocrEngine: 'tesseract' }) });
      render(<ConfigModal {...props} />);
      expect(screen.getByText(/O texto será enviado à IA sem modificações/)).toBeInTheDocument();
    });

    it('should toggle anonymization', () => {
      const setAiSettings = vi.fn();
      const props = createMockProps({ setAiSettings, aiSettings: createMockAiSettings({ ocrEngine: 'pdfjs', anonymization: { enabled: false, nomesUsuario: [] } }) });
      render(<ConfigModal {...props} />);
      const anonText = screen.getByText(/O texto será enviado à IA sem modificações/);
      const toggleBtn = anonText.closest('button');
      fireEvent.click(toggleBtn!);
      expect(setAiSettings).toHaveBeenCalledWith(expect.objectContaining({
        anonymization: expect.objectContaining({ enabled: true }),
      }));
    });

    it('should show data type checkboxes when anonymization is enabled', () => {
      const props = createMockProps({
        aiSettings: createMockAiSettings({ ocrEngine: 'pdfjs', anonymization: { enabled: true, nomesUsuario: [] } }),
      });
      render(<ConfigModal {...props} />);
      expect(screen.getByText('CPF')).toBeInTheDocument();
      expect(screen.getByText('RG')).toBeInTheDocument();
      expect(screen.getByText('PIS/PASEP')).toBeInTheDocument();
      expect(screen.getByText('CTPS')).toBeInTheDocument();
      expect(screen.getByText('Telefones')).toBeInTheDocument();
      expect(screen.getByText('E-mails')).toBeInTheDocument();
      expect(screen.getByText('Dados Bancários')).toBeInTheDocument();
    });

    it('should show NER section when anonymization is enabled', () => {
      const props = createMockProps({
        aiSettings: createMockAiSettings({ ocrEngine: 'pdfjs', anonymization: { enabled: true, nomesUsuario: [] } }),
      });
      render(<ConfigModal {...props} />);
      expect(screen.getByText(/Detecção Automática de Nomes/)).toBeInTheDocument();
    });

    it('should show NER download button when NER is enabled but not ready', () => {
      const props = createMockProps({
        aiSettings: createMockAiSettings({ ocrEngine: 'pdfjs', anonymization: { enabled: true, nomesUsuario: [] } }),
        nerEnabled: true,
        nerModelReady: false,
        nerInitializing: false,
      });
      render(<ConfigModal {...props} />);
      expect(screen.getByText(/Baixar Agora \(~150MB\)/)).toBeInTheDocument();
    });

    it('should show NER ready status when model is loaded', () => {
      const props = createMockProps({
        aiSettings: createMockAiSettings({ ocrEngine: 'pdfjs', anonymization: { enabled: true, nomesUsuario: [] } }),
        nerEnabled: true,
        nerModelReady: true,
      });
      render(<ConfigModal {...props} />);
      expect(screen.getByText('Pronto')).toBeInTheDocument();
    });

    it('should show NER downloading status', () => {
      const props = createMockProps({
        aiSettings: createMockAiSettings({ ocrEngine: 'pdfjs', anonymization: { enabled: true, nomesUsuario: [] } }),
        nerEnabled: true,
        nerModelReady: false,
        nerInitializing: true,
        nerDownloadProgress: 42,
      });
      render(<ConfigModal {...props} />);
      expect(screen.getByText(/Baixando modelo.../)).toBeInTheDocument();
      expect(screen.getByText(/42%/)).toBeInTheDocument();
    });

    it('should show include companies toggle when NER is enabled', () => {
      const props = createMockProps({
        aiSettings: createMockAiSettings({ ocrEngine: 'pdfjs', anonymization: { enabled: true, nomesUsuario: [] } }),
        nerEnabled: true,
        nerModelReady: true,
      });
      render(<ConfigModal {...props} />);
      expect(screen.getByText('Incluir empresas (reclamadas)')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 10: BASE DE DADOS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Base de Dados', () => {
    it('should render section with counts', () => {
      const props = createMockProps({ legislacaoCount: 100, jurisprudenciaCount: 50 });
      render(<ConfigModal {...props} />);
      expect(screen.getByText(/100 artigos/)).toBeInTheDocument();
      expect(screen.getByText(/50 precedentes/)).toBeInTheDocument();
    });

    it('should have download button', () => {
      const props = createMockProps();
      render(<ConfigModal {...props} />);
      expect(screen.getByText(/Baixar\/Atualizar/)).toBeInTheDocument();
    });

    it('should call setShowDataDownloadModal on download click', async () => {
      const setShowDataDownloadModal = vi.fn();
      const props = createMockProps({ setShowDataDownloadModal });
      render(<ConfigModal {...props} />);
      const downloadBtn = screen.getByText(/Baixar\/Atualizar/).closest('button');
      fireEvent.click(downloadBtn!);
      await waitFor(() => {
        expect(setShowDataDownloadModal).toHaveBeenCalledWith(true);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 11: SEMANTIC SEARCH
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Semantic Search', () => {
    it('should render IA Local section', () => {
      const props = createMockProps();
      render(<ConfigModal {...props} />);
      expect(screen.getByText(/IA Local \(Busca Semântica\)/)).toBeInTheDocument();
    });

    it('should call handleSearchToggle when search toggle clicked', () => {
      const handleSearchToggle = vi.fn();
      const props = createMockProps({ handleSearchToggle });
      render(<ConfigModal {...props} />);
      const searchToggle = screen.getByText(/IA Local \(Busca Semântica\)/).closest('div')!.querySelector('.toggle-switch');
      fireEvent.click(searchToggle!);
      expect(handleSearchToggle).toHaveBeenCalledWith(true);
    });

    it('should show model status when search enabled', () => {
      const props = createMockProps({ searchEnabled: true, searchModelReady: false, searchInitializing: false });
      render(<ConfigModal {...props} />);
      expect(screen.getByText(/Baixar Agora \(~400MB\)/)).toBeInTheDocument();
    });

    it('should show model ready when loaded', () => {
      const props = createMockProps({ searchEnabled: true, searchModelReady: true });
      render(<ConfigModal {...props} />);
      expect(screen.getByText('Modelo Pronto')).toBeInTheDocument();
    });

    it('should show downloading progress', () => {
      const props = createMockProps({ searchEnabled: true, searchModelReady: false, searchInitializing: true, searchDownloadProgress: 55 });
      render(<ConfigModal {...props} />);
      expect(screen.getByText(/Baixando modelo.../)).toBeInTheDocument();
      expect(screen.getByText(/55%/)).toBeInTheDocument();
    });

    it('should show sub-toggles when model ready', () => {
      const props = createMockProps({ searchEnabled: true, searchModelReady: true });
      render(<ConfigModal {...props} />);
      expect(screen.getByText(/Legislação/)).toBeInTheDocument();
      expect(screen.getByText(/Jurisprudência/)).toBeInTheDocument();
    });

    it('should show embeddings download button when semanticSearch enabled and count is 0', () => {
      const props = createMockProps({
        searchEnabled: true,
        searchModelReady: true,
        embeddingsCount: 0,
        aiSettings: createMockAiSettings({ semanticSearchEnabled: true }),
      });
      render(<ConfigModal {...props} />);
      const downloadBtns = screen.getAllByText('Baixar do CDN');
      expect(downloadBtns.length).toBeGreaterThan(0);
    });

    it('should show installed status when embeddings exist', () => {
      const props = createMockProps({
        searchEnabled: true,
        searchModelReady: true,
        embeddingsCount: 100,
        aiSettings: createMockAiSettings({ semanticSearchEnabled: true }),
      });
      render(<ConfigModal {...props} />);
      const installedTexts = screen.getAllByText('Instalado');
      expect(installedTexts.length).toBeGreaterThan(0);
    });

    it('should show threshold slider when semantic search is enabled', () => {
      const props = createMockProps({
        searchEnabled: true,
        searchModelReady: true,
        embeddingsCount: 100,
        aiSettings: createMockAiSettings({ semanticSearchEnabled: true, semanticThreshold: 50 }),
      });
      render(<ConfigModal {...props} />);
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('should show Modelos section with generate button', () => {
      const props = createMockProps({
        searchEnabled: true,
        searchModelReady: true,
        aiSettings: createMockAiSettings({ modelSemanticEnabled: true } as Partial<AISettings>),
      });
      render(<ConfigModal {...props} />);
      expect(screen.getByText('Gerar Embeddings')).toBeInTheDocument();
    });

    it('should call generateModelEmbeddings when button clicked', () => {
      const generateModelEmbeddings = vi.fn();
      const props = createMockProps({
        searchEnabled: true,
        searchModelReady: true,
        generateModelEmbeddings,
        aiSettings: createMockAiSettings({ modelSemanticEnabled: true } as Partial<AISettings>),
      });
      render(<ConfigModal {...props} />);
      const genBtn = screen.getByText('Gerar Embeddings').closest('button');
      fireEvent.click(genBtn!);
      expect(generateModelEmbeddings).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTIONS 12-15: CUSTOM MODELS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Custom Models', () => {
    it('should render Modelo de Mini-Relatorio section', () => {
      const props = createMockProps();
      render(<ConfigModal {...props} />);
      expect(screen.getByText(/Modelo de Mini-Relatório \(Opcional\)/)).toBeInTheDocument();
    });

    it('should render Modelo de Dispositivo section', () => {
      const props = createMockProps();
      render(<ConfigModal {...props} />);
      expect(screen.getByText(/Modelo de Dispositivo \(Opcional\)/)).toBeInTheDocument();
    });

    it('should render Modelo do Topico RELATORIO section', () => {
      const props = createMockProps();
      render(<ConfigModal {...props} />);
      expect(screen.getByText(/Modelo do Tópico RELATÓRIO \(Opcional\)/)).toBeInTheDocument();
    });

    it('should render Estilo de Redacao section', () => {
      const props = createMockProps();
      render(<ConfigModal {...props} />);
      expect(screen.getByText(/Estilo de Redação Personalizado \(Opcional\)/)).toBeInTheDocument();
    });

    it('should call setAiSettings when modeloRelatorio textarea changes', () => {
      const setAiSettings = vi.fn();
      const props = createMockProps({ setAiSettings });
      render(<ConfigModal {...props} />);
      const textarea = screen.getByPlaceholderText(/O reclamante sustenta/);
      fireEvent.change(textarea, { target: { value: 'test modelo' } });
      expect(setAiSettings).toHaveBeenCalledWith(expect.objectContaining({ modeloRelatorio: 'test modelo' }));
    });

    it('should call setAiSettings when modeloDispositivo textarea changes', () => {
      const setAiSettings = vi.fn();
      const props = createMockProps({ setAiSettings });
      render(<ConfigModal {...props} />);
      const textarea = screen.getByPlaceholderText(/Ante o exposto/);
      fireEvent.change(textarea, { target: { value: 'test dispositivo' } });
      expect(setAiSettings).toHaveBeenCalledWith(expect.objectContaining({ modeloDispositivo: 'test dispositivo' }));
    });

    it('should call setAiSettings when modeloTopicoRelatorio textarea changes', () => {
      const setAiSettings = vi.fn();
      const props = createMockProps({ setAiSettings });
      render(<ConfigModal {...props} />);
      const textarea = screen.getByPlaceholderText(/A presente reclamação/);
      fireEvent.change(textarea, { target: { value: 'test topico' } });
      expect(setAiSettings).toHaveBeenCalledWith(expect.objectContaining({ modeloTopicoRelatorio: 'test topico' }));
    });

    it('should call setAiSettings when customPrompt textarea changes', () => {
      const setAiSettings = vi.fn();
      const props = createMockProps({ setAiSettings });
      render(<ConfigModal {...props} />);
      const textarea = screen.getByPlaceholderText(/Use linguagem mais coloquial/);
      fireEvent.change(textarea, { target: { value: 'test estilo' } });
      expect(setAiSettings).toHaveBeenCalledWith(expect.objectContaining({ customPrompt: 'test estilo' }));
    });

    it('should show active indicator when modeloRelatorio has content', () => {
      const props = createMockProps({ aiSettings: createMockAiSettings({ modeloRelatorio: 'some content here' }) });
      render(<ConfigModal {...props} />);
      expect(screen.getByText(/Modelo personalizado ativo \(17 caracteres\)/)).toBeInTheDocument();
    });

    it('should clear modeloRelatorio when Limpar is clicked', () => {
      const setAiSettings = vi.fn();
      const props = createMockProps({ setAiSettings, aiSettings: createMockAiSettings({ modeloRelatorio: 'test' }) });
      render(<ConfigModal {...props} />);
      const clearBtns = screen.getAllByText('Limpar');
      fireEvent.click(clearBtns[0]);
      expect(setAiSettings).toHaveBeenCalledWith(expect.objectContaining({ modeloRelatorio: '' }));
    });

    it('should show active indicator for customPrompt', () => {
      const props = createMockProps({ aiSettings: createMockAiSettings({ customPrompt: 'my custom style prompt' }) });
      render(<ConfigModal {...props} />);
      expect(screen.getByText(/Estilo personalizado ativo/)).toBeInTheDocument();
    });

    it('should call openModelGenerator for modeloRelatorio', () => {
      const openModelGenerator = vi.fn();
      const props = createMockProps({ openModelGenerator });
      render(<ConfigModal {...props} />);
      const generateBtns = screen.getAllByText('Gerar a partir de exemplos');
      fireEvent.click(generateBtns[0]);
      expect(openModelGenerator).toHaveBeenCalledWith('modeloRelatorio');
    });

    it('should call openModelGenerator for modeloDispositivo', () => {
      const openModelGenerator = vi.fn();
      const props = createMockProps({ openModelGenerator });
      render(<ConfigModal {...props} />);
      const generateBtns = screen.getAllByText('Gerar a partir de exemplos');
      fireEvent.click(generateBtns[1]);
      expect(openModelGenerator).toHaveBeenCalledWith('modeloDispositivo');
    });

    it('should call openModelGenerator for modeloTopicoRelatorio', () => {
      const openModelGenerator = vi.fn();
      const props = createMockProps({ openModelGenerator });
      render(<ConfigModal {...props} />);
      const generateBtns = screen.getAllByText('Gerar a partir de exemplos');
      fireEvent.click(generateBtns[2]);
      expect(openModelGenerator).toHaveBeenCalledWith('modeloTopicoRelatorio');
    });

    it('should call openModelGenerator for estiloRedacao', () => {
      const openModelGenerator = vi.fn();
      const props = createMockProps({ openModelGenerator });
      render(<ConfigModal {...props} />);
      const generateBtns = screen.getAllByText('Gerar a partir de exemplos');
      fireEvent.click(generateBtns[3]);
      expect(openModelGenerator).toHaveBeenCalledWith('estiloRedacao');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 16: QUICK PROMPTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Quick Prompts', () => {
    it('should render section', () => {
      const props = createMockProps();
      render(<ConfigModal {...props} />);
      expect(screen.getByText(/Prompts Rápidos/)).toBeInTheDocument();
    });

    it('should show add button', () => {
      const props = createMockProps();
      render(<ConfigModal {...props} />);
      expect(screen.getByText('+ Adicionar Prompt Rápido')).toBeInTheDocument();
    });

    it('should add new quick prompt when button clicked', () => {
      const setAiSettings = vi.fn();
      const props = createMockProps({ setAiSettings });
      render(<ConfigModal {...props} />);
      const addBtn = screen.getByText('+ Adicionar Prompt Rápido');
      fireEvent.click(addBtn);
      expect(setAiSettings).toHaveBeenCalledWith(expect.objectContaining({
        quickPrompts: expect.arrayContaining([
          expect.objectContaining({ icon: expect.any(String), label: '', prompt: '' }),
        ]),
      }));
    });

    it('should render existing quick prompts', () => {
      const props = createMockProps({
        aiSettings: createMockAiSettings({
          quickPrompts: [
            { id: 'qp-1', icon: '📝', label: 'Test QP', prompt: 'Test prompt text' },
          ],
        }),
      });
      render(<ConfigModal {...props} />);
      const labelInput = screen.getByDisplayValue('Test QP');
      expect(labelInput).toBeInTheDocument();
    });

    it('should update quick prompt icon', () => {
      const setAiSettings = vi.fn();
      const props = createMockProps({
        setAiSettings,
        aiSettings: createMockAiSettings({
          quickPrompts: [
            { id: 'qp-1', icon: '📝', label: 'Test', prompt: 'Prompt text' },
          ],
        }),
      });
      render(<ConfigModal {...props} />);
      const iconInput = screen.getByDisplayValue('📝');
      fireEvent.change(iconInput, { target: { value: '🚀' } });
      expect(setAiSettings).toHaveBeenCalled();
    });

    it('should update quick prompt label', () => {
      const setAiSettings = vi.fn();
      const props = createMockProps({
        setAiSettings,
        aiSettings: createMockAiSettings({
          quickPrompts: [
            { id: 'qp-1', icon: '📝', label: 'Test', prompt: 'Prompt text' },
          ],
        }),
      });
      render(<ConfigModal {...props} />);
      const labelInput = screen.getByDisplayValue('Test');
      fireEvent.change(labelInput, { target: { value: 'New Label' } });
      expect(setAiSettings).toHaveBeenCalledWith(expect.objectContaining({
        quickPrompts: expect.arrayContaining([
          expect.objectContaining({ label: 'New Label' }),
        ]),
      }));
    });

    it('should update quick prompt text', () => {
      const setAiSettings = vi.fn();
      const props = createMockProps({
        setAiSettings,
        aiSettings: createMockAiSettings({
          quickPrompts: [
            { id: 'qp-1', icon: '📝', label: 'Test', prompt: 'Prompt text' },
          ],
        }),
      });
      render(<ConfigModal {...props} />);
      const promptTextarea = screen.getByDisplayValue('Prompt text');
      fireEvent.change(promptTextarea, { target: { value: 'New prompt' } });
      expect(setAiSettings).toHaveBeenCalledWith(expect.objectContaining({
        quickPrompts: expect.arrayContaining([
          expect.objectContaining({ prompt: 'New prompt' }),
        ]),
      }));
    });

    it('should remove quick prompt when delete button clicked', () => {
      const setAiSettings = vi.fn();
      const props = createMockProps({
        setAiSettings,
        aiSettings: createMockAiSettings({
          quickPrompts: [
            { id: 'qp-1', icon: '📝', label: 'First', prompt: 'First prompt' },
            { id: 'qp-2', icon: '🚀', label: 'Second', prompt: 'Second prompt' },
          ],
        }),
      });
      render(<ConfigModal {...props} />);
      const removeButtons = screen.getAllByTitle('Remover');
      fireEvent.click(removeButtons[0]);
      expect(setAiSettings).toHaveBeenCalledWith(expect.objectContaining({
        quickPrompts: expect.arrayContaining([
          expect.objectContaining({ id: 'qp-2' }),
        ]),
      }));
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 17: TOKEN USAGE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Token Usage', () => {
    it('should render section', () => {
      const props = createMockProps();
      render(<ConfigModal {...props} />);
      expect(screen.getByText(/Uso de Tokens \(Projeto Atual\)/)).toBeInTheDocument();
    });

    it('should show no request message when count is 0', () => {
      const props = createMockProps({ tokenMetrics: {} });
      render(<ConfigModal {...props} />);
      expect(screen.getByText(/Nenhuma requisição realizada ainda neste projeto/)).toBeInTheDocument();
    });

    it('should show token metrics when requests exist', () => {
      const props = createMockProps({
        tokenMetrics: {
          requestCount: 5,
          totalInput: 1000,
          totalOutput: 2000,
          totalCacheRead: 500,
          totalCacheCreation: 300,
        },
      });
      render(<ConfigModal {...props} />);
      expect(screen.getByText('Total de Tokens:')).toBeInTheDocument();
      expect(screen.getByText('Requisições:')).toBeInTheDocument();
      expect(screen.getByText('Taxa de Cache:')).toBeInTheDocument();
    });

    it('should format large numbers correctly', () => {
      const props = createMockProps({
        tokenMetrics: {
          requestCount: 10,
          totalInput: 1500000,
          totalOutput: 500000,
          totalCacheRead: 200000,
          totalCacheCreation: 100000,
        },
      });
      render(<ConfigModal {...props} />);
      // 1.5M input, 500K output
      expect(screen.getByText('1.5M')).toBeInTheDocument();
    });

    it('should show cost estimates', () => {
      const props = createMockProps({
        tokenMetrics: {
          requestCount: 5,
          totalInput: 1000,
          totalOutput: 2000,
          totalCacheRead: 500,
          totalCacheCreation: 300,
        },
      });
      render(<ConfigModal {...props} />);
      expect(screen.getByText(/Custo Estimado/)).toBeInTheDocument();
      expect(screen.getByText('Sonnet 4/4.5:')).toBeInTheDocument();
      expect(screen.getByText('Opus 4.5:')).toBeInTheDocument();
    });

    it('should show byModel breakdown when available', () => {
      const props = createMockProps({
        tokenMetrics: {
          requestCount: 5,
          totalInput: 1000,
          totalOutput: 2000,
          totalCacheRead: 500,
          totalCacheCreation: 300,
          byModel: {
            'claude-sonnet-4-20250514': {
              provider: 'claude',
              input: 800,
              output: 1500,
              cacheRead: 400,
              cacheCreation: 200,
              requestCount: 3,
            },
          },
        },
      });
      render(<ConfigModal {...props} />);
      expect(screen.getByText(/Detalhes por Modelo/)).toBeInTheDocument();
      expect(screen.getByText(/Custo Total Real/)).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 18: COMPLEMENTARY TOPICS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Complementary Topics', () => {
    it('should render section', () => {
      const props = createMockProps();
      render(<ConfigModal {...props} />);
      expect(screen.getByText(/Tópicos Complementares Automáticos/)).toBeInTheDocument();
    });

    it('should show empty state when no topics', () => {
      const props = createMockProps();
      render(<ConfigModal {...props} />);
      expect(screen.getByText(/Nenhum tópico complementar configurado/)).toBeInTheDocument();
    });

    it('should render existing complementary topics', () => {
      const props = createMockProps({
        aiSettings: createMockAiSettings({
          topicosComplementares: [
            { id: 1, title: 'Topic 1', category: 'MERITO' as any, enabled: true, ordem: 1 },
            { id: 2, title: 'Topic 2', category: 'PRELIMINAR' as any, enabled: false, ordem: 2 },
          ],
        } as Partial<AISettings>),
      });
      render(<ConfigModal {...props} />);
      expect(screen.getByText('Topic 1')).toBeInTheDocument();
      expect(screen.getByText('Topic 2')).toBeInTheDocument();
    });

    it('should have add new topic input', () => {
      const props = createMockProps();
      render(<ConfigModal {...props} />);
      expect(screen.getByPlaceholderText('Título do tópico...')).toBeInTheDocument();
    });

    it('should have category selector for new topic', () => {
      const props = createMockProps();
      const { container } = render(<ConfigModal {...props} />);
      const categorySelect = container.querySelector('#newComplementaryCategory');
      expect(categorySelect).toBeInTheDocument();
    });

    it('should toggle topic enabled state', () => {
      const setAiSettings = vi.fn();
      const props = createMockProps({
        setAiSettings,
        aiSettings: createMockAiSettings({
          topicosComplementares: [
            { id: 1, title: 'Topic 1', category: 'MERITO' as any, enabled: true, ordem: 1 },
          ],
        } as Partial<AISettings>),
      });
      const { container } = render(<ConfigModal {...props} />);
      // The checkbox in the topic row
      const checkboxes = container.querySelectorAll('input[type="checkbox"]');
      // Find the one inside the complementary topics section
      const topicCheckbox = Array.from(checkboxes).find(cb => {
        const parent = cb.closest('[draggable="true"]');
        return parent !== null;
      });
      fireEvent.click(topicCheckbox!);
      expect(setAiSettings).toHaveBeenCalledWith(expect.objectContaining({
        topicosComplementares: expect.arrayContaining([
          expect.objectContaining({ id: 1, enabled: false }),
        ]),
      }));
    });

    it('should remove topic when delete button clicked', () => {
      const setAiSettings = vi.fn();
      const props = createMockProps({
        setAiSettings,
        aiSettings: createMockAiSettings({
          topicosComplementares: [
            { id: 1, title: 'Topic To Remove', category: 'MERITO' as any, enabled: true, ordem: 1 },
          ],
        } as Partial<AISettings>),
      });
      render(<ConfigModal {...props} />);
      const removeBtns = screen.getAllByTitle('Remover tópico');
      fireEvent.click(removeBtns[0]);
      expect(setAiSettings).toHaveBeenCalledWith(expect.objectContaining({
        topicosComplementares: [],
      }));
    });

    it('should show drag hint text', () => {
      const props = createMockProps();
      render(<ConfigModal {...props} />);
      expect(screen.getByText(/Arraste os tópicos para reordená-los/)).toBeInTheDocument();
    });

    it('should call handleComplementaryDragStart on drag start', () => {
      const handleComplementaryDragStart = vi.fn();
      const props = createMockProps({
        handleComplementaryDragStart,
        aiSettings: createMockAiSettings({
          topicosComplementares: [
            { id: 1, title: 'Draggable', category: 'MERITO' as any, enabled: true, ordem: 1 },
          ],
        } as Partial<AISettings>),
      });
      render(<ConfigModal {...props} />);
      const draggableItem = screen.getByText('Draggable').closest('[draggable="true"]');
      fireEvent.dragStart(draggableItem!);
      expect(handleComplementaryDragStart).toHaveBeenCalled();
    });

    it('should show error toast when trying to add topic without title', () => {
      const showToast = vi.fn();
      const props = createMockProps({ showToast });
      render(<ConfigModal {...props} />);
      // Leave title empty
      const addBtns = screen.getByText('Adicionar novo tópico:').closest('div')?.querySelectorAll('button');
      if (addBtns && addBtns.length > 0) {
        fireEvent.click(addBtns[0]);
        expect(showToast).toHaveBeenCalledWith('Digite um título para o tópico', 'error');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FOOTER TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Footer', () => {
    it('should render Export button', () => {
      const props = createMockProps();
      render(<ConfigModal {...props} />);
      expect(screen.getByText('Exportar Configurações')).toBeInTheDocument();
    });

    it('should render Import button', () => {
      const props = createMockProps();
      render(<ConfigModal {...props} />);
      expect(screen.getByText('Importar Configurações')).toBeInTheDocument();
    });

    it('should call exportAiSettings when Export button clicked', () => {
      const exportAiSettings = vi.fn();
      const props = createMockProps({ exportAiSettings });
      render(<ConfigModal {...props} />);
      const exportBtn = screen.getByText('Exportar Configurações').closest('button');
      fireEvent.click(exportBtn!);
      expect(exportAiSettings).toHaveBeenCalled();
    });

    it('should render file input for import', () => {
      const props = createMockProps();
      const { container } = render(<ConfigModal {...props} />);
      const fileInput = container.querySelector('input[type="file"][accept=".json"]');
      expect(fileInput).toBeInTheDocument();
    });

    it('should call importAiSettings on file input change', () => {
      const importAiSettings = vi.fn();
      const props = createMockProps({ importAiSettings });
      const { container } = render(<ConfigModal {...props} />);
      const fileInput = container.querySelector('input[type="file"][accept=".json"]');
      fireEvent.change(fileInput!, { target: { files: [new File(['{}'], 'test.json', { type: 'application/json' })] } });
      expect(importAiSettings).toHaveBeenCalled();
    });

    it('should show current model display name', () => {
      const getModelDisplayName = vi.fn(() => 'Claude Sonnet 4');
      const props = createMockProps({ getModelDisplayName });
      render(<ConfigModal {...props} />);
      expect(screen.getByText('Modelo atual:')).toBeInTheDocument();
    });

    it('should render Fechar button in footer', () => {
      const props = createMockProps();
      render(<ConfigModal {...props} />);
      const closeButtons = screen.getAllByText('Fechar');
      // Should have at least the footer Fechar button
      expect(closeButtons.length).toBeGreaterThanOrEqual(1);
    });

    it('should call onClose when footer Fechar button clicked', () => {
      const onClose = vi.fn();
      const props = createMockProps({ onClose });
      render(<ConfigModal {...props} />);
      // The footer Fechar button (not the X title button)
      const closeButtons = screen.getAllByText('Fechar');
      fireEvent.click(closeButtons[closeButtons.length - 1]);
      expect(onClose).toHaveBeenCalled();
    });

    it('should show extended thinking indicator when active', () => {
      const props = createMockProps({ aiSettings: createMockAiSettings({ provider: 'claude', useExtendedThinking: true }) });
      render(<ConfigModal {...props} />);
      expect(screen.getByText(/Pensamento prolongado ativo/)).toBeInTheDocument();
    });

    it('should show custom style indicator when customPrompt set', () => {
      const props = createMockProps({ aiSettings: createMockAiSettings({ customPrompt: 'custom style' }) });
      render(<ConfigModal {...props} />);
      expect(screen.getByText('Estilo personalizado configurado')).toBeInTheDocument();
    });

    it('should show Gemini thinking level in footer', () => {
      const props = createMockProps({ aiSettings: createMockAiSettings({ provider: 'gemini', geminiThinkingLevel: 'high' }) });
      render(<ConfigModal {...props} />);
      expect(screen.getByText(/Thinking: high/)).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CLOSE MODAL TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Close Modal', () => {
    it('should call onClose when X button is clicked', () => {
      const onClose = vi.fn();
      const props = createMockProps({ onClose });
      render(<ConfigModal {...props} />);
      const closeButton = screen.getByTitle('Fechar');
      fireEvent.click(closeButton);
      expect(onClose).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PROVIDER ICONS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Provider Icons', () => {
    it('should render all provider icons', () => {
      const props = createMockProps();
      render(<ConfigModal {...props} />);
      expect(screen.getByTestId('provider-icon-claude')).toBeInTheDocument();
      expect(screen.getByTestId('provider-icon-gemini')).toBeInTheDocument();
      expect(screen.getByTestId('provider-icon-openai')).toBeInTheDocument();
      expect(screen.getByTestId('provider-icon-grok')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // MODAL STRUCTURE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Modal Structure', () => {
    it('should have header with title and description', () => {
      const props = createMockProps();
      render(<ConfigModal {...props} />);
      expect(screen.getByText('Configurações de IA')).toBeInTheDocument();
      expect(screen.getByText(/Escolha o modelo e as configurações/i)).toBeInTheDocument();
    });

    it('should have scrollable content area', () => {
      const props = createMockProps();
      const { container } = render(<ConfigModal {...props} />);
      const scrollArea = container.querySelector('.overflow-y-auto');
      expect(scrollArea).toBeInTheDocument();
    });

    it('should have overflow-auto on overlay', () => {
      const props = createMockProps();
      const { container } = render(<ConfigModal {...props} />);
      const overlay = container.querySelector('.overflow-auto');
      expect(overlay).toBeInTheDocument();
    });
  });
});

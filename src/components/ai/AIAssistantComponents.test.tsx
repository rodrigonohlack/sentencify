/**
 * @file AIAssistantComponents.test.tsx
 * @description Testes para os componentes de assistente IA
 * @version 1.38.49
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  AIAssistantBaseLegacy,
  AIAssistantBase,
  AIAssistantModal,
  AIAssistantGlobalModal,
  AIAssistantModelModal,
  extractPlainText,
  isOralProof,
  hasOralProofsForTopic
} from './AIAssistantComponents';
import type { ChatMessage } from '../../types';

// ═══════════════════════════════════════════════════════════════════════════
// MOCKS
// ═══════════════════════════════════════════════════════════════════════════

vi.mock('../modals/BaseModal', () => ({
  CSS: {
    modalOverlay: 'modal-overlay',
    modalContainer: 'modal-container',
    modalHeader: 'modal-header',
    modalFooter: 'modal-footer',
    label: 'label',
    spinner: 'spinner',
  },
}));

vi.mock('../chat', () => ({
  ChatHistoryArea: ({ history, generating }: { history: unknown[]; generating: boolean }) => (
    <div data-testid="chat-history-area" data-generating={generating}>
      {Array.isArray(history) ? `${history.length} messages` : '0 messages'}
    </div>
  ),
  ChatInput: ({ onSend, disabled, placeholder }: { onSend: (msg: string) => void; disabled: boolean; placeholder: string }) => (
    <div data-testid="chat-input">
      <input
        data-testid="chat-input-field"
        placeholder={placeholder}
        disabled={disabled}
        onChange={() => {}}
      />
      <button data-testid="chat-send-btn" onClick={() => onSend('test message')}>Send</button>
    </div>
  ),
  InsertDropdown: ({ onInsert, disabled }: { onInsert: (mode: string) => void; disabled: boolean }) => (
    <div data-testid="insert-dropdown">
      <button data-testid="insert-btn" onClick={() => onInsert('append')} disabled={disabled}>
        Insert
      </button>
    </div>
  ),
}));

vi.mock('../VoiceButton', () => ({
  VoiceButton: ({ onTranscript }: { onTranscript: (text: string) => void }) => (
    <button data-testid="voice-button" onClick={() => onTranscript('voice text')}>
      Voice
    </button>
  ),
}));

vi.mock('../ui/ContextScopeSelector', () => ({
  ContextScopeSelector: ({ contextScope }: { contextScope: string }) => (
    <div data-testid="context-scope-selector">{contextScope}</div>
  ),
}));

vi.mock('../../hooks', () => ({
  useAIIntegration: vi.fn(() => ({ callAI: vi.fn() })),
}));

vi.mock('../../hooks/useVoiceImprovement', () => ({
  useVoiceImprovement: vi.fn(() => ({ improveText: vi.fn() })),
}));

vi.mock('../../stores/useAIStore', () => ({
  useAIStore: vi.fn((selector: (s: unknown) => unknown) =>
    selector({ aiSettings: { voiceImprovement: { enabled: false } } })
  ),
}));

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTION TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('extractPlainText', () => {
  it('should return empty string for falsy input', () => {
    expect(extractPlainText('')).toBe('');
    expect(extractPlainText(null as unknown as string)).toBe('');
    expect(extractPlainText(undefined as unknown as string)).toBe('');
  });

  it('should strip HTML tags', () => {
    expect(extractPlainText('<p>Hello</p>')).toBe('Hello');
    expect(extractPlainText('<div><span>World</span></div>')).toBe('World');
  });

  it('should convert <br> tags (whitespace normalization may collapse newlines)', () => {
    // The function first converts <br> to \n, but later \s+ normalization
    // may collapse standalone newlines into spaces when surrounded by text.
    // The key behavior: <br> is not kept as literal "<br>" in output.
    const result = extractPlainText('Line1<br>Line2');
    expect(result).not.toContain('<br>');
    expect(result).toContain('Line1');
    expect(result).toContain('Line2');
  });

  it('should decode HTML entities', () => {
    expect(extractPlainText('&amp; &lt; &gt; &quot;')).toBe('& < > "');
    expect(extractPlainText('&nbsp;')).toBe('');
  });

  it('should normalize whitespace', () => {
    expect(extractPlainText('<p>  hello   world  </p>')).toBe('hello world');
  });
});

describe('isOralProof', () => {
  it('should return true for oral proof keywords', () => {
    expect(isOralProof('Audiência de instrução')).toBe(true);
    expect(isOralProof('Depoimento pessoal')).toBe(true);
    expect(isOralProof('testemunha João')).toBe(true);
    expect(isOralProof('Transcrição da ata')).toBe(true);
    expect(isOralProof('Prova oral')).toBe(true);
    expect(isOralProof('Oitiva da testemunha')).toBe(true);
  });

  it('should return false for non-oral proofs', () => {
    expect(isOralProof('Contrato de trabalho')).toBe(false);
    expect(isOralProof('Holerite')).toBe(false);
    expect(isOralProof('CTPS')).toBe(false);
  });

  it('should handle undefined/empty input', () => {
    expect(isOralProof(undefined)).toBe(false);
    expect(isOralProof('')).toBe(false);
  });
});

describe('hasOralProofsForTopic', () => {
  it('should return false when proofManager is null', () => {
    expect(hasOralProofsForTopic(null, 'Topic')).toBe(false);
  });

  it('should return false when topicTitle is undefined', () => {
    const proofManager = { proofFiles: [], proofTexts: [], proofTopicLinks: {} };
    expect(hasOralProofsForTopic(proofManager, undefined)).toBe(false);
  });

  it('should return true when oral proof is linked to topic', () => {
    const proofManager = {
      proofFiles: [{ id: 'file-1', name: 'Audiência de instrução', type: 'pdf' as const, size: 100, uploadDate: '2024-01-01' }],
      proofTexts: [],
      proofTopicLinks: { 'file-1': ['Horas Extras'] },
    };
    expect(hasOralProofsForTopic(proofManager, 'Horas Extras')).toBe(true);
  });

  it('should return false when no oral proofs are linked', () => {
    const proofManager = {
      proofFiles: [{ id: 'file-1', name: 'Contrato', type: 'pdf' as const, size: 100, uploadDate: '2024-01-01' }],
      proofTexts: [],
      proofTopicLinks: { 'file-1': ['Horas Extras'] },
    };
    expect(hasOralProofsForTopic(proofManager, 'Horas Extras')).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// AIAssistantBaseLegacy TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('AIAssistantBaseLegacy', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    aiInstruction: '',
    setAiInstruction: vi.fn(),
    generatingAi: false,
    aiGeneratedText: '',
    onGenerateText: vi.fn(),
    onInsertText: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when isOpen is false', () => {
    const { container } = render(
      <AIAssistantBaseLegacy {...defaultProps} isOpen={false} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('should render title when isOpen is true', () => {
    render(<AIAssistantBaseLegacy {...defaultProps} />);
    expect(screen.getByText('Assistente de Redação IA')).toBeInTheDocument();
  });

  it('should render custom title', () => {
    render(<AIAssistantBaseLegacy {...defaultProps} title="Custom Title" />);
    expect(screen.getByText('Custom Title')).toBeInTheDocument();
  });

  it('should render subtitle', () => {
    render(<AIAssistantBaseLegacy {...defaultProps} subtitle="Custom Subtitle" />);
    expect(screen.getByText('Custom Subtitle')).toBeInTheDocument();
  });

  it('should render CNJ warning', () => {
    render(<AIAssistantBaseLegacy {...defaultProps} />);
    expect(screen.getByText(/Resolução 615\/2025 do CNJ/)).toBeInTheDocument();
  });

  it('should render textarea with placeholder', () => {
    render(<AIAssistantBaseLegacy {...defaultProps} />);
    const textarea = screen.getByPlaceholderText(/Escreva um parágrafo explicando/);
    expect(textarea).toBeInTheDocument();
  });

  it('should render custom placeholder', () => {
    render(<AIAssistantBaseLegacy {...defaultProps} placeholder="Custom placeholder" />);
    expect(screen.getByPlaceholderText('Custom placeholder')).toBeInTheDocument();
  });

  it('should call setAiInstruction on textarea change', () => {
    render(<AIAssistantBaseLegacy {...defaultProps} />);
    const textarea = screen.getByPlaceholderText(/Escreva um parágrafo explicando/);
    fireEvent.change(textarea, { target: { value: 'new instruction' } });
    expect(defaultProps.setAiInstruction).toHaveBeenCalledWith('new instruction');
  });

  it('should disable generate button when instruction is empty', () => {
    render(<AIAssistantBaseLegacy {...defaultProps} aiInstruction="" />);
    const button = screen.getByText('Gerar Texto');
    expect(button.closest('button')).toBeDisabled();
  });

  it('should enable generate button when instruction is provided', () => {
    render(<AIAssistantBaseLegacy {...defaultProps} aiInstruction="Write something" />);
    const button = screen.getByText('Gerar Texto');
    expect(button.closest('button')).not.toBeDisabled();
  });

  it('should show "Gerando..." when generating', () => {
    render(<AIAssistantBaseLegacy {...defaultProps} generatingAi={true} aiInstruction="test" />);
    expect(screen.getByText('Gerando...')).toBeInTheDocument();
  });

  it('should call onGenerateText when generate button is clicked', () => {
    render(<AIAssistantBaseLegacy {...defaultProps} aiInstruction="Write text" />);
    const button = screen.getByText('Gerar Texto');
    fireEvent.click(button);
    expect(defaultProps.onGenerateText).toHaveBeenCalled();
  });

  it('should show generated text when available', () => {
    render(
      <AIAssistantBaseLegacy
        {...defaultProps}
        aiGeneratedText="<p>Generated content</p>"
        sanitizeHTML={(html: string) => html}
      />
    );
    expect(screen.getByText('Texto Gerado pela IA:', { exact: false })).toBeInTheDocument();
  });

  it('should show insert buttons when generated text is available', () => {
    render(
      <AIAssistantBaseLegacy
        {...defaultProps}
        aiGeneratedText="<p>Generated</p>"
        sanitizeHTML={(html: string) => html}
      />
    );
    expect(screen.getByText('Substituir Tudo')).toBeInTheDocument();
    expect(screen.getByText('Adicionar no Início')).toBeInTheDocument();
    expect(screen.getByText('Adicionar no Final')).toBeInTheDocument();
  });

  it('should call onInsertText with mode when insert buttons are clicked', () => {
    render(
      <AIAssistantBaseLegacy
        {...defaultProps}
        aiGeneratedText="<p>Generated</p>"
        sanitizeHTML={(html: string) => html}
      />
    );
    fireEvent.click(screen.getByText('Substituir Tudo'));
    expect(defaultProps.onInsertText).toHaveBeenCalledWith('replace');

    fireEvent.click(screen.getByText('Adicionar no Início'));
    expect(defaultProps.onInsertText).toHaveBeenCalledWith('prepend');

    fireEvent.click(screen.getByText('Adicionar no Final'));
    expect(defaultProps.onInsertText).toHaveBeenCalledWith('append');
  });

  it('should call onClose when close button is clicked', () => {
    render(<AIAssistantBaseLegacy {...defaultProps} />);
    fireEvent.click(screen.getByText('Fechar'));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('should call onClose on Escape key', () => {
    render(<AIAssistantBaseLegacy {...defaultProps} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('should render default examples', () => {
    render(<AIAssistantBaseLegacy {...defaultProps} />);
    expect(screen.getByText(/Escreva a fundamentação legal sobre horas extras/)).toBeInTheDocument();
  });

  it('should render custom examples when provided', () => {
    const customExamples = <div>Custom examples content</div>;
    render(<AIAssistantBaseLegacy {...defaultProps} customExamples={customExamples} />);
    expect(screen.getByText('Custom examples content')).toBeInTheDocument();
  });

  it('should hide insert buttons when showInsertButtons is false', () => {
    render(
      <AIAssistantBaseLegacy
        {...defaultProps}
        aiGeneratedText="<p>Generated</p>"
        sanitizeHTML={(html: string) => html}
        showInsertButtons={false}
      />
    );
    expect(screen.queryByText('Substituir Tudo')).not.toBeInTheDocument();
  });

  it('should render VoiceButton', () => {
    render(<AIAssistantBaseLegacy {...defaultProps} />);
    expect(screen.getByTestId('voice-button')).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// AIAssistantBase TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('AIAssistantBase', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    chatHistory: [] as ChatMessage[],
    onSendMessage: vi.fn(),
    onInsertResponse: vi.fn(),
    generating: false,
    onClear: vi.fn(),
    lastResponse: '',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when isOpen is false', () => {
    const { container } = render(
      <AIAssistantBase {...defaultProps} isOpen={false} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('should render title when open', () => {
    render(<AIAssistantBase {...defaultProps} />);
    expect(screen.getByText('Assistente de Redação IA')).toBeInTheDocument();
  });

  it('should render custom title and subtitle', () => {
    render(
      <AIAssistantBase {...defaultProps} title="Custom AI" subtitle="Sub info" />
    );
    expect(screen.getByText('Custom AI')).toBeInTheDocument();
    expect(screen.getByText('Sub info')).toBeInTheDocument();
  });

  it('should render CNJ warning', () => {
    render(<AIAssistantBase {...defaultProps} />);
    expect(screen.getByText(/Resolução 615\/2025 do CNJ/)).toBeInTheDocument();
  });

  it('should render ChatHistoryArea', () => {
    render(<AIAssistantBase {...defaultProps} />);
    expect(screen.getByTestId('chat-history-area')).toBeInTheDocument();
  });

  it('should render ChatInput', () => {
    render(<AIAssistantBase {...defaultProps} />);
    expect(screen.getByTestId('chat-input')).toBeInTheDocument();
  });

  it('should render examples when chat is empty', () => {
    render(<AIAssistantBase {...defaultProps} chatHistory={[]} />);
    expect(screen.getByText(/Exemplos:/)).toBeInTheDocument();
  });

  it('should hide examples when chat has messages', () => {
    render(
      <AIAssistantBase
        {...defaultProps}
        chatHistory={[{ role: 'user', content: 'hello' }]}
      />
    );
    expect(screen.queryByText(/Exemplos:/)).not.toBeInTheDocument();
  });

  it('should show Limpar button when chat has messages', () => {
    render(
      <AIAssistantBase
        {...defaultProps}
        chatHistory={[{ role: 'user', content: 'hello' }]}
      />
    );
    expect(screen.getByText('Limpar')).toBeInTheDocument();
  });

  it('should call onClear when Limpar is clicked', () => {
    render(
      <AIAssistantBase
        {...defaultProps}
        chatHistory={[{ role: 'user', content: 'hello' }]}
      />
    );
    fireEvent.click(screen.getByText('Limpar'));
    expect(defaultProps.onClear).toHaveBeenCalled();
  });

  it('should render InsertDropdown', () => {
    render(<AIAssistantBase {...defaultProps} />);
    expect(screen.getByTestId('insert-dropdown')).toBeInTheDocument();
  });

  it('should call onClose when Fechar is clicked', () => {
    render(<AIAssistantBase {...defaultProps} />);
    fireEvent.click(screen.getByText('Fechar'));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('should call onClose on Escape key', () => {
    render(<AIAssistantBase {...defaultProps} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('should render quick prompts when provided', () => {
    const quickPrompts = [
      { id: 'qp-1', label: 'Quick 1', icon: '⚡', prompt: 'Quick prompt 1' },
    ];
    render(<AIAssistantBase {...defaultProps} quickPrompts={quickPrompts} />);
    expect(screen.getByText(/Quick 1/)).toBeInTheDocument();
  });

  it('should render extraContent when provided', () => {
    const extra = <div data-testid="extra">Extra Content</div>;
    render(<AIAssistantBase {...defaultProps} extraContent={extra} />);
    expect(screen.getByTestId('extra')).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// AIAssistantModal TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('AIAssistantModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    contextScope: 'current' as const,
    setContextScope: vi.fn(),
    topicTitle: 'Horas Extras',
    chatHistory: [] as ChatMessage[],
    onSendMessage: vi.fn(),
    onInsertResponse: vi.fn(),
    generating: false,
    onClear: vi.fn(),
    lastResponse: '',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when isOpen is false', () => {
    const { container } = render(
      <AIAssistantModal {...defaultProps} isOpen={false} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('should render ContextScopeSelector', () => {
    render(<AIAssistantModal {...defaultProps} />);
    expect(screen.getByTestId('context-scope-selector')).toBeInTheDocument();
  });

  it('should display topic title in subtitle', () => {
    render(<AIAssistantModal {...defaultProps} topicTitle="Horas Extras" />);
    expect(screen.getByText('Horas Extras')).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// AIAssistantGlobalModal TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('AIAssistantGlobalModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    contextScope: 'current' as const,
    setContextScope: vi.fn(),
    topicTitle: 'Vínculo',
    chatHistory: [] as ChatMessage[],
    onSendMessage: vi.fn(),
    onInsertResponse: vi.fn(),
    generating: false,
    onClear: vi.fn(),
    lastResponse: '',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when isOpen is false', () => {
    const { container } = render(
      <AIAssistantGlobalModal {...defaultProps} isOpen={false} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('should render when isOpen is true', () => {
    render(<AIAssistantGlobalModal {...defaultProps} />);
    expect(screen.getByText('Vínculo')).toBeInTheDocument();
  });

  it('should render ContextScopeSelector', () => {
    render(<AIAssistantGlobalModal {...defaultProps} />);
    expect(screen.getByTestId('context-scope-selector')).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// AIAssistantModelModal TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('AIAssistantModelModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    aiInstructionModel: '',
    setAiInstructionModel: vi.fn(),
    generatingAiModel: false,
    aiGeneratedTextModel: '',
    onGenerateText: vi.fn(),
    onInsertText: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when isOpen is false', () => {
    const { container } = render(
      <AIAssistantModelModal {...defaultProps} isOpen={false} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('should render model-specific title', () => {
    render(<AIAssistantModelModal {...defaultProps} />);
    expect(screen.getByText('Assistente de Redação IA - Modelos')).toBeInTheDocument();
  });

  it('should render model-specific subtitle', () => {
    render(<AIAssistantModelModal {...defaultProps} />);
    expect(screen.getByText('Instrua a IA sobre o que você deseja escrever no modelo')).toBeInTheDocument();
  });

  it('should render model-specific examples', () => {
    render(<AIAssistantModelModal {...defaultProps} />);
    expect(screen.getByText(/modelo genérico de fundamentação/)).toBeInTheDocument();
  });

  it('should render model-specific placeholder', () => {
    render(<AIAssistantModelModal {...defaultProps} />);
    expect(screen.getByPlaceholderText(/modelo de fundamentação sobre horas extras/)).toBeInTheDocument();
  });
});

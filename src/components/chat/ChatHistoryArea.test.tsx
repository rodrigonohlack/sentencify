/**
 * @file ChatHistoryArea.test.tsx
 * @description Testes para o componente ChatHistoryArea
 * @version 1.38.52
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChatHistoryArea } from './ChatHistoryArea';

// Mock ChatBubble component
vi.mock('./ChatBubble', () => ({
  ChatBubble: ({ msg, onUse, showUse }: { msg: { role: string; content: string }; onUse: () => void; showUse: boolean }) => (
    <div data-testid="chat-bubble" data-role={msg.role} data-show-use={showUse}>
      {msg.content}
    </div>
  ),
}));

describe('ChatHistoryArea', () => {
  const mockSanitizeHTML = vi.fn((html: string) => html);
  const mockOnUseMessage = vi.fn();

  const defaultProps = {
    history: [] as { role: string; content: string }[],
    generating: false,
    onUseMessage: mockOnUseMessage,
    showUseButtons: true,
    sanitizeHTML: mockSanitizeHTML,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EMPTY STATE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Empty State', () => {
    it('should render empty state when no history', () => {
      render(<ChatHistoryArea {...defaultProps} />);
      expect(screen.getByText('Inicie a conversa com sua instrução')).toBeInTheDocument();
    });

    it('should show helper text in empty state', () => {
      render(<ChatHistoryArea {...defaultProps} />);
      expect(screen.getByText(/A IA pode fazer perguntas/)).toBeInTheDocument();
    });

    it('should render Sparkles icon in empty state', () => {
      const { container } = render(<ChatHistoryArea {...defaultProps} />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // MESSAGES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Messages', () => {
    it('should render messages from history', () => {
      const history = [
        { role: 'user', content: 'Hello AI' },
        { role: 'assistant', content: 'Hello! How can I help?' },
      ];
      render(<ChatHistoryArea {...defaultProps} history={history} />);

      expect(screen.getByText('Hello AI')).toBeInTheDocument();
      expect(screen.getByText('Hello! How can I help?')).toBeInTheDocument();
    });

    it('should render ChatBubble for each message', () => {
      const history = [
        { role: 'user', content: 'Message 1' },
        { role: 'assistant', content: 'Message 2' },
        { role: 'user', content: 'Message 3' },
      ];
      render(<ChatHistoryArea {...defaultProps} history={history} />);

      const bubbles = screen.getAllByTestId('chat-bubble');
      expect(bubbles).toHaveLength(3);
    });

    it('should pass correct role to ChatBubble', () => {
      const history = [
        { role: 'user', content: 'User message' },
        { role: 'assistant', content: 'Assistant message' },
      ];
      render(<ChatHistoryArea {...defaultProps} history={history} />);

      const bubbles = screen.getAllByTestId('chat-bubble');
      expect(bubbles[0]).toHaveAttribute('data-role', 'user');
      expect(bubbles[1]).toHaveAttribute('data-role', 'assistant');
    });

    it('should show use button only for assistant messages when enabled', () => {
      const history = [
        { role: 'user', content: 'User message' },
        { role: 'assistant', content: 'Assistant message' },
      ];
      render(<ChatHistoryArea {...defaultProps} history={history} showUseButtons={true} />);

      const bubbles = screen.getAllByTestId('chat-bubble');
      expect(bubbles[0]).toHaveAttribute('data-show-use', 'false');
      expect(bubbles[1]).toHaveAttribute('data-show-use', 'true');
    });

    it('should hide use buttons when showUseButtons is false', () => {
      const history = [
        { role: 'assistant', content: 'Assistant message' },
      ];
      render(<ChatHistoryArea {...defaultProps} history={history} showUseButtons={false} />);

      const bubble = screen.getByTestId('chat-bubble');
      expect(bubble).toHaveAttribute('data-show-use', 'false');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GENERATING STATE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Generating State', () => {
    it('should show loading indicator when generating', () => {
      render(<ChatHistoryArea {...defaultProps} generating={true} />);
      expect(screen.getByText('Gerando...')).toBeInTheDocument();
    });

    it('should show assistant label when generating', () => {
      render(<ChatHistoryArea {...defaultProps} generating={true} />);
      expect(screen.getByText('🤖 Assistente')).toBeInTheDocument();
    });

    it('should show spinner animation when generating', () => {
      const { container } = render(<ChatHistoryArea {...defaultProps} generating={true} />);
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should show both messages and loading when generating with history', () => {
      const history = [{ role: 'user', content: 'Hello' }];
      render(<ChatHistoryArea {...defaultProps} history={history} generating={true} />);

      expect(screen.getByText('Hello')).toBeInTheDocument();
      expect(screen.getByText('Gerando...')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ACCESSIBILITY
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Accessibility', () => {
    it('should have role="log" for screen readers', () => {
      const { container } = render(<ChatHistoryArea {...defaultProps} />);
      const logElement = container.querySelector('[role="log"]');
      expect(logElement).toBeInTheDocument();
    });

    it('should have aria-live="polite" for updates', () => {
      const { container } = render(<ChatHistoryArea {...defaultProps} />);
      const logElement = container.querySelector('[aria-live="polite"]');
      expect(logElement).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // STYLING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Styling', () => {
    it('should have fixed height', () => {
      const { container } = render(<ChatHistoryArea {...defaultProps} />);
      const areaDiv = container.firstChild as HTMLElement;
      expect(areaDiv.className).toContain('h-80');
    });

    it('should have overflow-y-auto for scrolling', () => {
      const { container } = render(<ChatHistoryArea {...defaultProps} />);
      const areaDiv = container.firstChild as HTMLElement;
      expect(areaDiv.className).toContain('overflow-y-auto');
    });

    it('should have theme background', () => {
      const { container } = render(<ChatHistoryArea {...defaultProps} />);
      const areaDiv = container.firstChild as HTMLElement;
      expect(areaDiv.className).toContain('theme-bg-app');
    });
  });
});

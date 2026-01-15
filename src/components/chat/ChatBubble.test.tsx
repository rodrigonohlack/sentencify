/**
 * @file ChatBubble.test.tsx
 * @description Testes para o componente ChatBubble
 * @version 1.37.57
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatBubble } from './ChatBubble';
import type { ChatMessage } from '../../types';

describe('ChatBubble', () => {
  const mockOnUse = vi.fn();
  const mockSanitizeHTML = vi.fn((html: string) => html);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // USER MESSAGE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('User Messages', () => {
    it('should render user message with "Você" label', () => {
      const msg: ChatMessage = {
        role: 'user',
        content: 'Hello world',
        ts: Date.now(),
      };
      render(<ChatBubble msg={msg} onUse={mockOnUse} showUse={false} />);

      expect(screen.getByText(/👤 Você/)).toBeInTheDocument();
      expect(screen.getByText('Hello world')).toBeInTheDocument();
    });

    it('should align user message to the right', () => {
      const msg: ChatMessage = {
        role: 'user',
        content: 'Test message',
        ts: Date.now(),
      };
      const { container } = render(<ChatBubble msg={msg} onUse={mockOnUse} showUse={false} />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('justify-end');
    });

    it('should show user message as plain text (not HTML)', () => {
      const msg: ChatMessage = {
        role: 'user',
        content: '**bold** text',
        ts: Date.now(),
      };
      render(<ChatBubble msg={msg} onUse={mockOnUse} showUse={false} />);

      // User messages show plain text, not converted to HTML
      expect(screen.getByText('**bold** text')).toBeInTheDocument();
    });

    it('should NOT show "Usar" button for user messages', () => {
      const msg: ChatMessage = {
        role: 'user',
        content: 'My message',
        ts: Date.now(),
      };
      render(<ChatBubble msg={msg} onUse={mockOnUse} showUse={true} />);

      expect(screen.queryByText('Usar ↑')).not.toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ASSISTANT MESSAGE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Assistant Messages', () => {
    it('should render assistant message with "Assistente" label', () => {
      const msg: ChatMessage = {
        role: 'assistant',
        content: 'Hello from AI',
        ts: Date.now(),
      };
      render(<ChatBubble msg={msg} onUse={mockOnUse} showUse={false} />);

      expect(screen.getByText(/🤖 Assistente/)).toBeInTheDocument();
    });

    it('should align assistant message to the left', () => {
      const msg: ChatMessage = {
        role: 'assistant',
        content: 'AI response',
        ts: Date.now(),
      };
      const { container } = render(<ChatBubble msg={msg} onUse={mockOnUse} showUse={false} />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('justify-start');
    });

    it('should convert markdown bold to HTML', () => {
      const msg: ChatMessage = {
        role: 'assistant',
        content: '**bold text**',
        ts: Date.now(),
      };
      const { container } = render(
        <ChatBubble msg={msg} onUse={mockOnUse} showUse={false} sanitizeHTML={mockSanitizeHTML} />
      );

      expect(mockSanitizeHTML).toHaveBeenCalled();
      const call = mockSanitizeHTML.mock.calls[0][0];
      expect(call).toContain('<strong>bold text</strong>');
    });

    it('should convert markdown italic to HTML', () => {
      const msg: ChatMessage = {
        role: 'assistant',
        content: '*italic text*',
        ts: Date.now(),
      };
      render(<ChatBubble msg={msg} onUse={mockOnUse} showUse={false} sanitizeHTML={mockSanitizeHTML} />);

      const call = mockSanitizeHTML.mock.calls[0][0];
      expect(call).toContain('<em>italic text</em>');
    });

    it('should convert newlines to <br>', () => {
      const msg: ChatMessage = {
        role: 'assistant',
        content: 'Line 1\nLine 2',
        ts: Date.now(),
      };
      render(<ChatBubble msg={msg} onUse={mockOnUse} showUse={false} sanitizeHTML={mockSanitizeHTML} />);

      const call = mockSanitizeHTML.mock.calls[0][0];
      expect(call).toContain('<br>');
    });

    it('should show "Usar" button when showUse is true', () => {
      const msg: ChatMessage = {
        role: 'assistant',
        content: 'Suggestion',
        ts: Date.now(),
      };
      render(<ChatBubble msg={msg} onUse={mockOnUse} showUse={true} />);

      expect(screen.getByText('Usar ↑')).toBeInTheDocument();
    });

    it('should NOT show "Usar" button when showUse is false', () => {
      const msg: ChatMessage = {
        role: 'assistant',
        content: 'Info',
        ts: Date.now(),
      };
      render(<ChatBubble msg={msg} onUse={mockOnUse} showUse={false} />);

      expect(screen.queryByText('Usar ↑')).not.toBeInTheDocument();
    });

    it('should call onUse with content when button clicked', () => {
      const msg: ChatMessage = {
        role: 'assistant',
        content: 'Use this text',
        ts: Date.now(),
      };
      render(<ChatBubble msg={msg} onUse={mockOnUse} showUse={true} />);

      fireEvent.click(screen.getByText('Usar ↑'));

      expect(mockOnUse).toHaveBeenCalledWith('Use this text');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ERROR HANDLING TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Error Handling', () => {
    it('should show error message when msg.error exists', () => {
      // ChatMessage type may not include error, but component supports it
      const msg = {
        role: 'assistant' as const,
        content: '',
        ts: Date.now(),
        error: 'Network error',
      };
      render(<ChatBubble msg={msg as any} onUse={mockOnUse} showUse={true} />);

      expect(screen.getByText(/⚠️ Erro: Network error/)).toBeInTheDocument();
    });

    it('should NOT show "Usar" button when there is an error', () => {
      // ChatMessage type may not include error, but component supports it
      const msg = {
        role: 'assistant' as const,
        content: 'Some content',
        ts: Date.now(),
        error: 'API failed',
      };
      render(<ChatBubble msg={msg as any} onUse={mockOnUse} showUse={true} />);

      expect(screen.queryByText('Usar ↑')).not.toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TIMESTAMP TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Timestamp', () => {
    it('should display formatted time', () => {
      const fixedDate = new Date('2024-01-15T14:30:00');
      const msg: ChatMessage = {
        role: 'user',
        content: 'Test',
        ts: fixedDate.getTime(),
      };
      render(<ChatBubble msg={msg} onUse={mockOnUse} showUse={false} />);

      // Time should be formatted as HH:MM in pt-BR locale
      expect(screen.getByText(/14:30/)).toBeInTheDocument();
    });

    it('should use current time when ts is undefined', () => {
      const msg: ChatMessage = {
        role: 'user',
        content: 'Test',
        ts: undefined,
      };
      // Should not throw
      expect(() => render(<ChatBubble msg={msg} onUse={mockOnUse} showUse={false} />)).not.toThrow();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SANITIZE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Sanitization', () => {
    it('should use provided sanitizeHTML function', () => {
      const customSanitize = vi.fn((html: string) => `sanitized: ${html}`);
      const msg: ChatMessage = {
        role: 'assistant',
        content: 'Test content',
        ts: Date.now(),
      };
      render(<ChatBubble msg={msg} onUse={mockOnUse} showUse={false} sanitizeHTML={customSanitize} />);

      expect(customSanitize).toHaveBeenCalled();
    });

    it('should use default sanitizeHTML when not provided', () => {
      const msg: ChatMessage = {
        role: 'assistant',
        content: 'Test',
        ts: Date.now(),
      };
      // Should not throw when sanitizeHTML is not provided
      expect(() => render(<ChatBubble msg={msg} onUse={mockOnUse} showUse={false} />)).not.toThrow();
    });

    it('should handle empty content gracefully', () => {
      const msg: ChatMessage = {
        role: 'assistant',
        content: '',
        ts: Date.now(),
      };
      expect(() => render(<ChatBubble msg={msg} onUse={mockOnUse} showUse={false} />)).not.toThrow();
    });
  });
});

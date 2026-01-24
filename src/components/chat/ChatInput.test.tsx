/**
 * @file ChatInput.test.tsx
 * @description Testes para o componente ChatInput
 * @version 1.37.57
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatInput } from './ChatInput';

// Mock VoiceButton component
vi.mock('../VoiceButton', () => ({
  VoiceButton: ({ onTranscript }: { onTranscript: (text: string) => void }) => (
    <button data-testid="voice-button" onClick={() => onTranscript('voice text')}>
      Voice
    </button>
  ),
}));

describe('ChatInput', () => {
  const mockOnSend = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERING TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Rendering', () => {
    it('should render textarea', () => {
      render(<ChatInput onSend={mockOnSend} disabled={false} placeholder="Type here" />);

      expect(screen.getByPlaceholderText('Type here')).toBeInTheDocument();
    });

    it('should render send button', () => {
      render(<ChatInput onSend={mockOnSend} disabled={false} placeholder="" />);

      expect(screen.getByText('Enviar')).toBeInTheDocument();
    });

    it('should render voice button', () => {
      render(<ChatInput onSend={mockOnSend} disabled={false} placeholder="" />);

      expect(screen.getByTestId('voice-button')).toBeInTheDocument();
    });

    it('should show spinner when disabled', () => {
      render(<ChatInput onSend={mockOnSend} disabled={true} placeholder="" />);

      const sendButton = screen.getByRole('button', { name: '' }); // Button has spinner, no text
      expect(sendButton.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INPUT BEHAVIOR TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Input Behavior', () => {
    it('should update value when typing', () => {
      render(<ChatInput onSend={mockOnSend} disabled={false} placeholder="Type here" />);

      const textarea = screen.getByPlaceholderText('Type here') as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: 'Hello world' } });

      expect(textarea.value).toBe('Hello world');
    });

    it('should be disabled when disabled prop is true', () => {
      render(<ChatInput onSend={mockOnSend} disabled={true} placeholder="Type here" />);

      const textarea = screen.getByPlaceholderText('Type here');
      expect(textarea).toBeDisabled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SEND BEHAVIOR TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Send Behavior', () => {
    it('should call onSend with trimmed value when send clicked', () => {
      render(<ChatInput onSend={mockOnSend} disabled={false} placeholder="Type here" />);

      const textarea = screen.getByPlaceholderText('Type here');
      fireEvent.change(textarea, { target: { value: '  Hello  ' } });
      fireEvent.click(screen.getByText('Enviar'));

      expect(mockOnSend).toHaveBeenCalledWith('Hello');
    });

    it('should clear input after sending', () => {
      render(<ChatInput onSend={mockOnSend} disabled={false} placeholder="Type here" />);

      const textarea = screen.getByPlaceholderText('Type here') as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: 'Test message' } });
      fireEvent.click(screen.getByText('Enviar'));

      expect(textarea.value).toBe('');
    });

    it('should NOT send when input is empty', () => {
      render(<ChatInput onSend={mockOnSend} disabled={false} placeholder="Type here" />);

      fireEvent.click(screen.getByText('Enviar'));

      expect(mockOnSend).not.toHaveBeenCalled();
    });

    it('should NOT send when input is only whitespace', () => {
      render(<ChatInput onSend={mockOnSend} disabled={false} placeholder="Type here" />);

      const textarea = screen.getByPlaceholderText('Type here');
      fireEvent.change(textarea, { target: { value: '   ' } });
      fireEvent.click(screen.getByText('Enviar'));

      expect(mockOnSend).not.toHaveBeenCalled();
    });

    it('should NOT send when disabled', () => {
      render(<ChatInput onSend={mockOnSend} disabled={true} placeholder="Type here" />);

      const textarea = screen.getByPlaceholderText('Type here');
      fireEvent.change(textarea, { target: { value: 'Test' } });

      // Button is disabled, trying to click should not work
      const buttons = screen.getAllByRole('button');
      const sendButton = buttons.find(b => b.classList.contains('disabled:opacity-50'));
      if (sendButton) fireEvent.click(sendButton);

      expect(mockOnSend).not.toHaveBeenCalled();
    });

    it('should disable send button when input is empty', () => {
      render(<ChatInput onSend={mockOnSend} disabled={false} placeholder="Type here" />);

      const sendButton = screen.getByText('Enviar');
      expect(sendButton).toBeDisabled();
    });

    it('should enable send button when input has text', () => {
      render(<ChatInput onSend={mockOnSend} disabled={false} placeholder="Type here" />);

      const textarea = screen.getByPlaceholderText('Type here');
      fireEvent.change(textarea, { target: { value: 'Some text' } });

      const sendButton = screen.getByText('Enviar');
      expect(sendButton).not.toBeDisabled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // KEYBOARD TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Keyboard', () => {
    it('should send on Enter (without Shift)', () => {
      render(<ChatInput onSend={mockOnSend} disabled={false} placeholder="Type here" />);

      const textarea = screen.getByPlaceholderText('Type here');
      fireEvent.change(textarea, { target: { value: 'Test message' } });
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

      expect(mockOnSend).toHaveBeenCalledWith('Test message');
    });

    it('should NOT send on Shift+Enter', () => {
      render(<ChatInput onSend={mockOnSend} disabled={false} placeholder="Type here" />);

      const textarea = screen.getByPlaceholderText('Type here');
      fireEvent.change(textarea, { target: { value: 'Test message' } });
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });

      expect(mockOnSend).not.toHaveBeenCalled();
    });

    it('should clear input after Enter key send', () => {
      render(<ChatInput onSend={mockOnSend} disabled={false} placeholder="Type here" />);

      const textarea = screen.getByPlaceholderText('Type here') as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: 'Test' } });
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

      // Input should be cleared after sending via Enter
      expect(textarea.value).toBe('');
    });

    it('should NOT send on other keys', () => {
      render(<ChatInput onSend={mockOnSend} disabled={false} placeholder="Type here" />);

      const textarea = screen.getByPlaceholderText('Type here');
      fireEvent.change(textarea, { target: { value: 'Test' } });
      fireEvent.keyDown(textarea, { key: 'Space' });

      expect(mockOnSend).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // VOICE INPUT TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Voice Input', () => {
    it('should append voice transcript to input', () => {
      render(<ChatInput onSend={mockOnSend} disabled={false} placeholder="Type here" />);

      const voiceButton = screen.getByTestId('voice-button');
      fireEvent.click(voiceButton);

      const textarea = screen.getByPlaceholderText('Type here') as HTMLTextAreaElement;
      expect(textarea.value).toBe('voice text');
    });

    it('should append voice transcript to existing text with space', () => {
      render(<ChatInput onSend={mockOnSend} disabled={false} placeholder="Type here" />);

      const textarea = screen.getByPlaceholderText('Type here') as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: 'Existing' } });

      const voiceButton = screen.getByTestId('voice-button');
      fireEvent.click(voiceButton);

      expect(textarea.value).toBe('Existing voice text');
    });
  });
});

/**
 * @file VoiceButton.test.tsx
 * @description Testes para o componente VoiceButton
 * @version 1.38.49
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VoiceButton } from './VoiceButton';
import type { VoiceButtonProps } from './VoiceButton';

// ═══════════════════════════════════════════════════════════════════════════
// MOCKS
// ═══════════════════════════════════════════════════════════════════════════

const mockToggle = vi.fn();
const mockVoiceToText = {
  isRecording: false,
  isSupported: true,
  interimTranscript: '',
  start: vi.fn(),
  stop: vi.fn(),
  toggle: mockToggle,
};

vi.mock('../hooks/useVoiceToText', () => ({
  useVoiceToText: vi.fn(() => mockVoiceToText),
}));

describe('VoiceButton', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  const defaultProps: VoiceButtonProps = {
    onTranscript: vi.fn(),
    size: 'sm',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockVoiceToText.isRecording = false;
    mockVoiceToText.isSupported = true;
    mockVoiceToText.interimTranscript = '';
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERING TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Rendering', () => {
    it('should render the button when speech is supported', () => {
      render(<VoiceButton {...defaultProps} />);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should return null when speech is not supported', () => {
      mockVoiceToText.isSupported = false;
      const { container } = render(<VoiceButton {...defaultProps} />);
      expect(container.innerHTML).toBe('');
    });

    it('should render with sm size (no text)', () => {
      render(<VoiceButton {...defaultProps} size="sm" />);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      // sm size should not show text
      expect(screen.queryByText('Voz')).not.toBeInTheDocument();
    });

    it('should render with md size (shows text)', () => {
      render(<VoiceButton {...defaultProps} size="md" />);
      expect(screen.getByText('Voz')).toBeInTheDocument();
    });

    it('should show custom idleText in md size', () => {
      render(<VoiceButton {...defaultProps} size="md" idleText="Ditar" />);
      expect(screen.getByText('Ditar')).toBeInTheDocument();
    });

    it('should show recordingText in md size when recording', () => {
      mockVoiceToText.isRecording = true;
      render(<VoiceButton {...defaultProps} size="md" recordingText="Gravando..." />);
      expect(screen.getByText('Gravando...')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(<VoiceButton {...defaultProps} className="custom-class" />);
      const button = screen.getByRole('button');
      expect(button.className).toContain('custom-class');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // BUTTON STATE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Button State', () => {
    it('should have idle title when not recording', () => {
      render(<VoiceButton {...defaultProps} />);
      expect(screen.getByTitle('Clique para ditar por voz')).toBeInTheDocument();
    });

    it('should have recording title when recording', () => {
      mockVoiceToText.isRecording = true;
      render(<VoiceButton {...defaultProps} />);
      expect(screen.getByTitle('Clique para parar o ditado')).toBeInTheDocument();
    });

    it('should have aria-pressed=false when not recording', () => {
      render(<VoiceButton {...defaultProps} />);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-pressed', 'false');
    });

    it('should have aria-pressed=true when recording', () => {
      mockVoiceToText.isRecording = true;
      render(<VoiceButton {...defaultProps} />);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-pressed', 'true');
    });

    it('should apply red/pulse classes when recording', () => {
      mockVoiceToText.isRecording = true;
      render(<VoiceButton {...defaultProps} />);
      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-red-600');
      expect(button.className).toContain('animate-pulse');
    });

    it('should apply indigo classes when idle', () => {
      render(<VoiceButton {...defaultProps} />);
      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-indigo-600');
    });

    it('should have type=button to prevent form submission', () => {
      render(<VoiceButton {...defaultProps} />);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'button');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INTERACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Interactions', () => {
    it('should call voice.toggle when button is clicked', () => {
      render(<VoiceButton {...defaultProps} />);
      fireEvent.click(screen.getByRole('button'));
      expect(mockToggle).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INTERIM PREVIEW
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Interim Preview', () => {
    it('should NOT show preview when not recording', () => {
      const { container } = render(<VoiceButton {...defaultProps} />);
      // The interim preview div should not be present when not recording
      expect(container.querySelector('[style*="min-width"]')).not.toBeInTheDocument();
    });

    it('should show preview when recording and has interim text', async () => {
      // Capture onTranscript callback using a ref object to avoid TypeScript narrowing issues
      const callbackRef: { current: ((text: string, isFinal: boolean) => void) | null } = { current: null };
      const mockUseVoiceToText = await import('../hooks/useVoiceToText');
      vi.mocked(mockUseVoiceToText.useVoiceToText).mockImplementation((options) => {
        callbackRef.current = options.onTranscript;
        return {
          ...mockVoiceToText,
          isRecording: true,
        };
      });

      const { container, rerender } = render(<VoiceButton {...defaultProps} />);

      // Simulate interim transcript
      if (callbackRef.current) {
        callbackRef.current('texto em progresso', false);
      }

      rerender(<VoiceButton {...defaultProps} />);

      // Preview should appear when recording with text
      const previewDiv = container.querySelector('.absolute.top-full');
      expect(previewDiv).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // AI IMPROVEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  describe('AI Improvement', () => {
    it('should call onImproveText when improveWithAI is true and text is long enough', async () => {
      const mockImprove = vi.fn().mockResolvedValue('texto melhorado');
      const mockOnTranscript = vi.fn();

      let capturedCallback: ((text: string, isFinal: boolean) => void) | null = null;
      const mockUseVoiceToText = await import('../hooks/useVoiceToText');
      vi.mocked(mockUseVoiceToText.useVoiceToText).mockImplementation((options) => {
        capturedCallback = options.onTranscript;
        return mockVoiceToText;
      });

      render(
        <VoiceButton
          onTranscript={mockOnTranscript}
          improveWithAI={true}
          onImproveText={mockImprove}
        />
      );

      // Simulate final transcript with enough text
      if (capturedCallback) {
        await (capturedCallback as (text: string, isFinal: boolean) => Promise<void>)(
          'este texto tem mais de 10 caracteres para teste',
          true
        );
      }

      expect(mockImprove).toHaveBeenCalledWith('este texto tem mais de 10 caracteres para teste');
    });

    it('should NOT call onImproveText when text is too short', async () => {
      const mockImprove = vi.fn().mockResolvedValue('melhorado');
      const mockOnTranscript = vi.fn();

      let capturedCallback: ((text: string, isFinal: boolean) => void) | null = null;
      const mockUseVoiceToText = await import('../hooks/useVoiceToText');
      vi.mocked(mockUseVoiceToText.useVoiceToText).mockImplementation((options) => {
        capturedCallback = options.onTranscript;
        return mockVoiceToText;
      });

      render(
        <VoiceButton
          onTranscript={mockOnTranscript}
          improveWithAI={true}
          onImproveText={mockImprove}
        />
      );

      // Simulate final transcript with short text
      if (capturedCallback) {
        await (capturedCallback as (text: string, isFinal: boolean) => Promise<void>)(
          'curto',
          true
        );
      }

      expect(mockImprove).not.toHaveBeenCalled();
      expect(mockOnTranscript).toHaveBeenCalledWith('curto');
    });

    it('should fallback to original text when AI improvement fails', async () => {
      const mockImprove = vi.fn().mockRejectedValue(new Error('AI Error'));
      const mockOnTranscript = vi.fn();
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      let capturedCallback: ((text: string, isFinal: boolean) => void) | null = null;
      const mockUseVoiceToText = await import('../hooks/useVoiceToText');
      vi.mocked(mockUseVoiceToText.useVoiceToText).mockImplementation((options) => {
        capturedCallback = options.onTranscript;
        return mockVoiceToText;
      });

      render(
        <VoiceButton
          onTranscript={mockOnTranscript}
          improveWithAI={true}
          onImproveText={mockImprove}
        />
      );

      // Simulate final transcript
      if (capturedCallback) {
        await (capturedCallback as (text: string, isFinal: boolean) => Promise<void>)(
          'texto original longo para testar fallback',
          true
        );
      }

      expect(mockOnTranscript).toHaveBeenCalledWith('texto original longo para testar fallback');
      consoleSpy.mockRestore();
    });

    it('should call onTranscript with improved text on success', async () => {
      const mockImprove = vi.fn().mockResolvedValue('texto melhorado');
      const mockOnTranscript = vi.fn();

      let capturedCallback: ((text: string, isFinal: boolean) => void) | null = null;
      const mockUseVoiceToText = await import('../hooks/useVoiceToText');
      vi.mocked(mockUseVoiceToText.useVoiceToText).mockImplementation((options) => {
        capturedCallback = options.onTranscript;
        return mockVoiceToText;
      });

      render(
        <VoiceButton
          onTranscript={mockOnTranscript}
          improveWithAI={true}
          onImproveText={mockImprove}
        />
      );

      // Simulate final transcript
      if (capturedCallback) {
        await (capturedCallback as (text: string, isFinal: boolean) => Promise<void>)(
          'texto original para melhorar',
          true
        );
      }

      expect(mockOnTranscript).toHaveBeenCalledWith('texto melhorado');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SIZE VARIANTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Size Variants', () => {
    it('should apply sm size classes', () => {
      render(<VoiceButton {...defaultProps} size="sm" />);
      const button = screen.getByRole('button');
      expect(button.className).toContain('p-1.5');
    });

    it('should apply md size classes', () => {
      render(<VoiceButton {...defaultProps} size="md" />);
      const button = screen.getByRole('button');
      expect(button.className).toContain('px-3');
      expect(button.className).toContain('py-1.5');
    });
  });
});

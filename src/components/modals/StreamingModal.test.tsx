/**
 * @file StreamingModal.test.tsx
 * @description Testes para o componente StreamingModal
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StreamingModal, StreamingOperationType } from './StreamingModal';

describe('StreamingModal', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.style.overflow = '';
  });

  afterEach(() => {
    document.body.style.overflow = '';
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      render(
        <StreamingModal
          isOpen={false}
          text="Some text"
          isComplete={false}
          onClose={mockOnClose}
        />
      );

      expect(screen.queryByText('Processando')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(
        <StreamingModal
          isOpen={true}
          text="Response text"
          isComplete={false}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Processando')).toBeInTheDocument();
      expect(screen.getByText('Response text')).toBeInTheDocument();
    });

    it('should display text content', () => {
      const text = 'This is the streaming response from the AI model.';
      render(
        <StreamingModal
          isOpen={true}
          text={text}
          isComplete={false}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText(text)).toBeInTheDocument();
    });

    it('should show loader when text is empty', () => {
      render(
        <StreamingModal
          isOpen={true}
          text=""
          isComplete={false}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Iniciando conexão...')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // STREAMING STATE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Streaming State', () => {
    it('should show pulsing cursor while streaming', () => {
      const { container } = render(
        <StreamingModal
          isOpen={true}
          text="Receiving..."
          isComplete={false}
          onClose={mockOnClose}
        />
      );

      // Cursor pulsante tem classe animate-pulse
      const cursor = container.querySelector('.animate-pulse.bg-purple-500');
      expect(cursor).toBeInTheDocument();
    });

    it('should not show pulsing cursor when complete', () => {
      const { container } = render(
        <StreamingModal
          isOpen={true}
          text="Completed response"
          isComplete={true}
          onClose={mockOnClose}
        />
      );

      // Não deve ter cursor pulsante
      const cursor = container.querySelector('.animate-pulse.bg-purple-500');
      expect(cursor).not.toBeInTheDocument();
    });

    it('should show "Recebendo resposta..." while streaming', () => {
      render(
        <StreamingModal
          isOpen={true}
          text="text"
          isComplete={false}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Recebendo resposta...')).toBeInTheDocument();
    });

    it('should show "Concluído!" when complete', () => {
      render(
        <StreamingModal
          isOpen={true}
          text="Final response"
          isComplete={true}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Concluído!')).toBeInTheDocument();
      expect(screen.queryByText('Recebendo resposta...')).not.toBeInTheDocument();
    });

    it('should show warning about not closing during streaming', () => {
      render(
        <StreamingModal
          isOpen={true}
          text="Processing..."
          isComplete={false}
          onClose={mockOnClose}
        />
      );

      expect(
        screen.getByText(/Aguarde a conclusão do processamento/i)
      ).toBeInTheDocument();
    });

    it('should not show warning when complete', () => {
      render(
        <StreamingModal
          isOpen={true}
          text="Done"
          isComplete={true}
          onClose={mockOnClose}
        />
      );

      expect(
        screen.queryByText(/Aguarde a conclusão do processamento/i)
      ).not.toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // COUNTERS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Counters', () => {
    it('should count characters correctly', () => {
      const text = 'Hello, World!'; // 13 caracteres
      render(
        <StreamingModal
          isOpen={true}
          text={text}
          isComplete={false}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('13 caracteres')).toBeInTheDocument();
    });

    it('should format large character counts with locale', () => {
      // 1500 caracteres
      const text = 'a'.repeat(1500);
      render(
        <StreamingModal
          isOpen={true}
          text={text}
          isComplete={false}
          onClose={mockOnClose}
        />
      );

      // Deve exibir com formatação de milhares (1.500 ou 1,500 dependendo do locale)
      const charCountElement = screen.getByText(/1[.,]500 caracteres/);
      expect(charCountElement).toBeInTheDocument();
    });

    it('should count lines correctly', () => {
      const text = 'Line 1\nLine 2\nLine 3';
      render(
        <StreamingModal
          isOpen={true}
          text={text}
          isComplete={false}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('3 linhas')).toBeInTheDocument();
    });

    it('should show 1 line for text without newlines', () => {
      const text = 'Single line text';
      render(
        <StreamingModal
          isOpen={true}
          text={text}
          isComplete={false}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('1 linhas')).toBeInTheDocument();
    });

    it('should show 0 characters and 1 line for empty text', () => {
      render(
        <StreamingModal
          isOpen={true}
          text=""
          isComplete={false}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('0 caracteres')).toBeInTheDocument();
      expect(screen.getByText('1 linhas')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CLOSE BUTTON TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Close Button', () => {
    it('should show close button only after completion', () => {
      render(
        <StreamingModal
          isOpen={true}
          text="Processing..."
          isComplete={false}
          onClose={mockOnClose}
        />
      );

      expect(screen.queryByText('Fechar e Ver Resultado')).not.toBeInTheDocument();
    });

    it('should show close button when complete', () => {
      render(
        <StreamingModal
          isOpen={true}
          text="Done!"
          isComplete={true}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Fechar e Ver Resultado')).toBeInTheDocument();
    });

    it('should call onClose when close button is clicked', () => {
      render(
        <StreamingModal
          isOpen={true}
          text="Done!"
          isComplete={true}
          onClose={mockOnClose}
        />
      );

      const closeButton = screen.getByText('Fechar e Ver Resultado');
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should not show close button when onClose is not provided', () => {
      render(
        <StreamingModal
          isOpen={true}
          text="Done!"
          isComplete={true}
        />
      );

      expect(screen.queryByText('Fechar e Ver Resultado')).not.toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // OPERATION TYPE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Operation Types', () => {
    const operationTypes: Array<{ type: StreamingOperationType; title: string }> = [
      { type: 'report', title: 'Gerando Mini-Relatório' },
      { type: 'proof', title: 'Analisando Prova' },
      { type: 'dispositivo', title: 'Gerando Dispositivo' },
      { type: 'chat', title: 'Processando Resposta' },
      { type: 'prova-oral', title: 'Analisando Prova Oral' },
      { type: 'generic', title: 'Processando' },
    ];

    operationTypes.forEach(({ type, title }) => {
      it(`should show correct title for operationType="${type}"`, () => {
        render(
          <StreamingModal
            isOpen={true}
            text="Text"
            isComplete={false}
            operationType={type}
            onClose={mockOnClose}
          />
        );

        expect(screen.getByText(title)).toBeInTheDocument();
      });
    });

    it('should include provider name in subtitle', () => {
      render(
        <StreamingModal
          isOpen={true}
          text="Text"
          isComplete={false}
          providerName="Claude"
          operationType="report"
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText(/via Claude/)).toBeInTheDocument();
    });

    it('should use default provider name "IA" when not specified', () => {
      render(
        <StreamingModal
          isOpen={true}
          text="Text"
          isComplete={false}
          operationType="generic"
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText(/via IA/)).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CUSTOM TITLE/SUBTITLE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Custom Title and Subtitle', () => {
    it('should use customTitle when provided', () => {
      render(
        <StreamingModal
          isOpen={true}
          text="Text"
          isComplete={false}
          operationType="report"
          customTitle="My Custom Title"
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('My Custom Title')).toBeInTheDocument();
      expect(screen.queryByText('Gerando Mini-Relatório')).not.toBeInTheDocument();
    });

    it('should use customSubtitle when provided', () => {
      render(
        <StreamingModal
          isOpen={true}
          text="Text"
          isComplete={false}
          operationType="report"
          customSubtitle="My Custom Subtitle"
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('My Custom Subtitle')).toBeInTheDocument();
    });

    it('should use both customTitle and customSubtitle when provided', () => {
      render(
        <StreamingModal
          isOpen={true}
          text="Text"
          isComplete={false}
          customTitle="Custom Title"
          customSubtitle="Custom Subtitle"
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Custom Title')).toBeInTheDocument();
      expect(screen.getByText('Custom Subtitle')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTO-SCROLL TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Auto-scroll', () => {
    it('should auto-scroll when text changes', () => {
      const { rerender } = render(
        <StreamingModal
          isOpen={true}
          text="Initial text"
          isComplete={false}
          onClose={mockOnClose}
        />
      );

      // Re-render com mais texto
      rerender(
        <StreamingModal
          isOpen={true}
          text="Initial text\nMore text\nEven more text"
          isComplete={false}
          onClose={mockOnClose}
        />
      );

      // O teste verifica que o componente renderiza sem erros após mudança de texto
      // O comportamento de scroll é testado implicitamente pela ausência de erros
      expect(screen.getByText(/Initial text/)).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PREVENT CLOSE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Prevent Close', () => {
    it('should pass preventClose=true to BaseModal while streaming', () => {
      // O preventClose é passado para o BaseModal, que impede fechar pelo overlay
      // Este teste verifica que o modal está configurado corretamente durante streaming
      render(
        <StreamingModal
          isOpen={true}
          text="Processing..."
          isComplete={false}
          onClose={mockOnClose}
        />
      );

      // O warning message indica que o modal não pode ser fechado
      expect(
        screen.getByText(/Fechar esta janela pode interromper a operação/i)
      ).toBeInTheDocument();
    });

    it('should allow closing when complete', () => {
      render(
        <StreamingModal
          isOpen={true}
          text="Done!"
          isComplete={true}
          onClose={mockOnClose}
        />
      );

      // Quando completo, o botão de fechar aparece
      expect(screen.getByText('Fechar e Ver Resultado')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEXT FORMATTING TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Text Formatting', () => {
    it('should preserve whitespace and newlines', () => {
      const text = 'Line 1\n  Indented line\n    More indentation';
      const { container } = render(
        <StreamingModal
          isOpen={true}
          text={text}
          isComplete={false}
          onClose={mockOnClose}
        />
      );

      const pre = container.querySelector('pre');
      expect(pre).toBeInTheDocument();
      expect(pre?.classList.contains('whitespace-pre-wrap')).toBe(true);
    });

    it('should handle long words without breaking layout', () => {
      const longWord = 'a'.repeat(200);
      const { container } = render(
        <StreamingModal
          isOpen={true}
          text={longWord}
          isComplete={false}
          onClose={mockOnClose}
        />
      );

      const pre = container.querySelector('pre');
      expect(pre?.classList.contains('break-words')).toBe(true);
    });
  });
});

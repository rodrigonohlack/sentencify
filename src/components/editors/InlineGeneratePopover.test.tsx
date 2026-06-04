/**
 * @file InlineGeneratePopover.test.tsx
 * @description Testes REAIS para o InlineGeneratePopover — importa e executa o componente
 * de produção.
 *
 * Regressão: no modo fullscreen, ESC dentro do popover de geração inline fechava o
 * fullscreen inteiro em vez de só o popover. Causa: o ESC vazava para o listener de
 * keydown (bubbling) do useFullscreen no document. O popover deve interceptar o ESC
 * em fase de captura e parar a propagação.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { InlineGeneratePopover } from './InlineGeneratePopover';

const baseProps = {
  anchor: { top: 100, left: 100, lineTop: 90 },
  preview: '<p>resultado gerado</p>',
  error: '',
  editorTheme: 'dark' as const,
  onSubmit: vi.fn(),
  onAccept: vi.fn(),
};

describe('InlineGeneratePopover — ESC', () => {
  it('ESC fecha o popover e NÃO vaza para listeners globais (ex.: fullscreen no document)', () => {
    const onCancel = vi.fn();
    // Simula o listener do useFullscreen: keydown em bubbling no document
    const fullscreenEsc = vi.fn();
    document.addEventListener('keydown', fullscreenEsc);

    render(<InlineGeneratePopover {...baseProps} mode="preview" onCancel={onCancel} />);
    const dialog = screen.getByRole('dialog', { name: 'Gerar redação com IA' });

    const ev = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    act(() => {
      dialog.dispatchEvent(ev);
    });

    document.removeEventListener('keydown', fullscreenEsc);

    // O popover deve ter sido fechado...
    expect(onCancel).toHaveBeenCalledTimes(1);
    // ...e o listener global (fullscreen) NÃO deve ter recebido o evento
    expect(fullscreenEsc).not.toHaveBeenCalled();
  });
});

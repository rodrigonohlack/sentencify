/**
 * @file Button.test.tsx
 * @description Smoke tests da fundação de botões. Importa o componente REAL.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';
import type { ButtonVariant } from './Button';

describe('Button', () => {
  const variants: ButtonVariant[] = ['primary', 'secondary', 'ghost', 'success', 'danger'];

  it('renderiza todas as variantes com o rótulo', () => {
    for (const variant of variants) {
      const { unmount } = render(<Button variant={variant}>Ação {variant}</Button>);
      expect(screen.getByRole('button', { name: `Ação ${variant}` })).toBeInTheDocument();
      unmount();
    }
  });

  it('usa primary + md por padrão (azul-500 sólido)', () => {
    render(<Button>Salvar</Button>);
    const btn = screen.getByRole('button', { name: 'Salvar' });
    expect(btn.className).toContain('bg-blue-500');
    expect(btn.className).toContain('px-4');
  });

  it('é type="button" por padrão (não submete formulários sem querer)', () => {
    render(<Button>X</Button>);
    expect(screen.getByRole('button', { name: 'X' })).toHaveAttribute('type', 'button');
  });

  it('encaminha onClick e demais props de button', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick} aria-label="confirmar">ok</Button>);
    fireEvent.click(screen.getByLabelText('confirmar'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('desabilita e ignora clique quando loading', () => {
    const onClick = vi.fn();
    render(<Button loading onClick={onClick}>Enviando</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('respeita disabled explícito', () => {
    render(<Button disabled>Indisponível</Button>);
    expect(screen.getByRole('button', { name: 'Indisponível' })).toBeDisabled();
  });
});

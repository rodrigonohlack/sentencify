/**
 * @file WebSearchToggle.test.tsx
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WebSearchToggle } from './WebSearchToggle';

describe('WebSearchToggle', () => {
  it('renderiza com estado OFF por padrão e ícone Web', () => {
    render(<WebSearchToggle enabled={false} onToggle={() => {}} />);
    const btn = screen.getByRole('switch');
    expect(btn).toHaveAttribute('aria-pressed', 'false');
    expect(btn).toHaveAttribute('aria-disabled', 'false');
    expect(screen.getByText('Web')).toBeInTheDocument();
  });

  it('renderiza ON quando enabled=true', () => {
    render(<WebSearchToggle enabled={true} onToggle={() => {}} />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-pressed', 'true');
  });

  it('chama onToggle(true) ao clicar quando OFF', () => {
    const onToggle = vi.fn();
    render(<WebSearchToggle enabled={false} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole('switch'));
    expect(onToggle).toHaveBeenCalledWith(true);
  });

  it('chama onToggle(false) ao clicar quando ON', () => {
    const onToggle = vi.fn();
    render(<WebSearchToggle enabled={true} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole('switch'));
    expect(onToggle).toHaveBeenCalledWith(false);
  });

  it('não chama onToggle quando disabled', () => {
    const onToggle = vi.fn();
    render(<WebSearchToggle enabled={false} onToggle={onToggle} disabled />);
    fireEvent.click(screen.getByRole('switch'));
    expect(onToggle).not.toHaveBeenCalled();
  });

  it('exibe tooltip explicando bloqueio por anonimização quando disabled', () => {
    render(<WebSearchToggle enabled={false} onToggle={() => {}} disabled />);
    const btn = screen.getByRole('switch');
    expect(btn).toHaveAttribute('aria-disabled', 'true');
    expect(btn.getAttribute('title')).toContain('anonimização');
  });

  it('tooltip muda entre OFF/ON', () => {
    const { rerender } = render(<WebSearchToggle enabled={false} onToggle={() => {}} />);
    expect(screen.getByRole('switch').getAttribute('title')).toContain('Ativar busca');
    rerender(<WebSearchToggle enabled={true} onToggle={() => {}} />);
    expect(screen.getByRole('switch').getAttribute('title')).toContain('ativado');
  });
});

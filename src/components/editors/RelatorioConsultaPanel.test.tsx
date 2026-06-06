import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RelatorioConsultaPanel } from './RelatorioConsultaPanel';

describe('RelatorioConsultaPanel', () => {
  it('não mostra o card até o hover, mostra no mouseEnter e some no mouseLeave', () => {
    render(<RelatorioConsultaPanel label="Mini-relatório" html="<p>conteudo</p>" />);
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.mouseEnter(screen.getByRole('button', { name: /Mini-relatório/ }).parentElement!);
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText('conteudo')).toBeTruthy();
    fireEvent.mouseLeave(screen.getByRole('button', { name: /Mini-relatório/ }).parentElement!);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('clique fixa o card (continua aberto após mouseLeave) e clique-fora fecha', () => {
    render(<RelatorioConsultaPanel label="Relatório" html="<p>texto</p>" />);
    const wrapper = screen.getByRole('button', { name: /Relatório/ }).parentElement!;
    fireEvent.click(screen.getByRole('button', { name: /Relatório/ }));
    expect(screen.getByRole('dialog')).toBeTruthy();
    fireEvent.mouseLeave(wrapper); // fixado: continua aberto
    expect(screen.getByRole('dialog')).toBeTruthy();
    fireEvent.mouseDown(document.body); // clique-fora
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('quando disabled, renderiza chip não-interativo e nunca abre card', () => {
    render(<RelatorioConsultaPanel label="Relatório" html="" disabled />);
    expect(screen.queryByRole('button')).toBeNull();
    const chip = screen.getByText('Relatório');
    fireEvent.mouseEnter(chip);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('aplica sanitizeHTML ao conteúdo', () => {
    const sanitize = vi.fn((h: string) => h.replace('<script>x</script>', ''));
    render(<RelatorioConsultaPanel label="Mini-relatório" html="<p>ok</p><script>x</script>" sanitizeHTML={sanitize} />);
    fireEvent.click(screen.getByRole('button', { name: /Mini-relatório/ }));
    expect(sanitize).toHaveBeenCalledWith('<p>ok</p><script>x</script>');
    expect(document.querySelector('script')).toBeNull();
  });
});

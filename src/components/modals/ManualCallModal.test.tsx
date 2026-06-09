/**
 * @file ManualCallModal.test.tsx
 * @description Testes para o modal do modo "Sem Provider (copiar/colar)"
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ManualCallModal } from './ManualCallModal';
import { useManualCallStore } from '../../stores/useManualCallStore';

describe('ManualCallModal', () => {
  beforeEach(() => useManualCallStore.setState({ pending: null }));

  it('não renderiza conteúdo sem pending', () => {
    const { container } = render(<ManualCallModal />);
    expect(container.textContent).not.toContain('Chamada manual');
    expect(container.textContent).not.toContain('RESPOSTA');
  });

  it('mostra o prompt e resolve ao confirmar', async () => {
    const p = useManualCallStore.getState().enqueue('PROMPT-X');
    render(<ManualCallModal />);
    expect(screen.getByText(/PROMPT-X/)).toBeTruthy();
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'RESP-Y' } });
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }));
    await expect(p).resolves.toBe('RESP-Y');
  });

  it('Confirmar fica desabilitado com textarea vazia', () => {
    useManualCallStore.getState().enqueue('PROMPT-X');
    render(<ManualCallModal />);
    const btn = screen.getByRole('button', { name: /confirmar/i }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });
});

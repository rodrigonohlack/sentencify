import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RastreabilidadeModal } from './RastreabilidadeModal';
import type { Topic } from '../../types';

const baseTopic = (over: Partial<Topic> = {}): Topic => ({
  title: 'HORAS EXTRAS', category: 'MÉRITO', relatorio: '<p>texto</p>', ...over,
});

describe('RastreabilidadeModal', () => {
  it('estado vazio: mostra CTA "Rastrear fontes"', () => {
    render(<RastreabilidadeModal isOpen topic={baseTopic()} tracing={false} onClose={vi.fn()} onRunTrace={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Rastrear fontes/i })).toBeTruthy();
  });

  it('com dados: mostra resumo de verificados/não localizados', () => {
    const topic = baseTopic({
      relatorio: '<p>texto</p>',
      relatorioFontes: {
        geradoEm: '2026-05-31T10:00:00.000Z',
        baseSnapshot: '<p>texto</p>',
        blocos: [{ blocoIndex: 0, blocoResumo: 'texto', trechos: [
          { trecho: 'a', peca: 'Petição inicial', status: 'verificado' },
          { trecho: 'b', peca: 'Petição inicial', status: 'nao_localizado' },
        ] }],
      },
    });
    render(<RastreabilidadeModal isOpen topic={topic} tracing={false} onClose={vi.fn()} onRunTrace={vi.fn()} />);
    expect(screen.getByText(/1 verificado/i)).toBeTruthy();
    expect(screen.getByText(/1 não localizado/i)).toBeTruthy();
  });

  it('staleness: relatório mudou desde a rastreabilidade → faixa de aviso', () => {
    const topic = baseTopic({
      relatorio: '<p>NOVO texto</p>',
      relatorioFontes: { geradoEm: '2026-05-31T10:00:00.000Z', baseSnapshot: '<p>texto antigo</p>', blocos: [] },
    });
    render(<RastreabilidadeModal isOpen topic={topic} tracing={false} onClose={vi.fn()} onRunTrace={vi.fn()} />);
    expect(screen.getByText(/desatualizada/i)).toBeTruthy();
  });
});

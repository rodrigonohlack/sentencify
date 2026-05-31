import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useReportGeneration } from './useReportGeneration';
import type { Topic } from '../types';

const makeHook = (callAI: ReturnType<typeof vi.fn>) => {
  const aiIntegration = {
    callAI,
    extractResponseText: vi.fn(),
    aiSettings: { provider: 'claude' },
    setRegeneratingRelatorio: vi.fn(),
  } as never;
  const analyzedDocuments = {
    peticoes: [], peticoesText: [{ text: 'O reclamante alega horas extras habituais e reflexos.' }],
    contestacoes: [], contestacoesText: [{ text: 'A ré nega a jornada alegada na inicial.' }],
    complementares: [], complementaresText: [],
  } as never;
  const partesProcesso = { reclamante: 'Fulano', reclamadas: ['ACME'] } as never;
  return renderHook(() => useReportGeneration({ aiIntegration, analyzedDocuments, partesProcesso }));
};

const topic: Topic = {
  title: 'HORAS EXTRAS', category: 'MÉRITO',
  relatorio: '<p>O reclamante alega horas extras habituais.</p>',
};

describe('traceReportSources (integração com callAI mockado)', () => {
  it('chama a IA uma vez, verifica trecho real e devolve baseSnapshot', async () => {
    const callAI = vi.fn().mockResolvedValue(
      '{"blocos":[{"blocoIndex":0,"trechos":[{"peca":"Petição inicial","trecho":"horas extras habituais"}]}]}'
    );
    const { result } = makeHook(callAI);
    const r = await result.current.traceReportSources(topic);
    expect(callAI).toHaveBeenCalledOnce();
    expect(r.baseSnapshot).toBe('<p>O reclamante alega horas extras habituais.</p>');
    expect(r.blocos[0].trechos[0].status).toBe('verificado');
    expect(r.blocos[0].trechos[0].peca).toBe('Petição inicial');
  });

  it('trecho inventado pela IA → nao_localizado', async () => {
    const callAI = vi.fn().mockResolvedValue(
      '{"blocos":[{"blocoIndex":0,"trechos":[{"peca":"Petição inicial","trecho":"o autor viajou para marte"}]}]}'
    );
    const { result } = makeHook(callAI);
    const r = await result.current.traceReportSources(topic);
    expect(r.blocos[0].trechos[0].status).toBe('nao_localizado');
  });

  it('relatório vazio → erro antes de chamar a IA', async () => {
    const callAI = vi.fn();
    const { result } = makeHook(callAI);
    await expect(
      result.current.traceReportSources({ ...topic, relatorio: '', editedRelatorio: '' })
    ).rejects.toThrow(/Gere o mini-relatório/);
    expect(callAI).not.toHaveBeenCalled();
  });

  it('JSON irreparável da IA → erro de rastreabilidade inválida', async () => {
    const callAI = vi.fn().mockResolvedValue('isso não é json');
    const { result } = makeHook(callAI);
    await expect(result.current.traceReportSources(topic)).rejects.toThrow(/rastreabilidade inválida/);
  });
});

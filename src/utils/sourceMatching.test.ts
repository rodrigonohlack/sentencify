import { describe, it, expect } from 'vitest';
import { normalizeForMatch, verifyTrechoInSources, type NormalizedSource } from './sourceMatching';

const norm = (peca: string, text: string): NormalizedSource => ({ peca, normalized: normalizeForMatch(text) });

describe('normalizeForMatch', () => {
  it('remove acentos, baixa caixa e colapsa espaços', () => {
    expect(normalizeForMatch('  Demissão  SEM   justa\nCausa ')).toBe('demissao sem justa causa');
  });
});

describe('verifyTrechoInSources', () => {
  const sources = [
    norm('Petição inicial', 'O reclamante alega que trabalhou de segunda a sábado, das 8h às 18h, sem intervalo.'),
    norm('Contestação 1', 'A ré sustenta que o autor sempre usufruiu de uma hora de intervalo intrajornada.'),
  ];

  it('match exato (ignorando acento/espaço) → verificado com a peça correta', () => {
    const r = verifyTrechoInSources('trabalhou de segunda a sábado, das 8h às 18h', sources, 'Petição inicial');
    expect(r.status).toBe('verificado');
    expect(r.peca).toBe('Petição inicial');
    expect(r.matchScore).toBe(1);
  });

  it('atribui a peça onde o trecho realmente está (caso C), não a etiqueta da IA', () => {
    const r = verifyTrechoInSources('usufruiu de uma hora de intervalo intrajornada', sources, 'Petição inicial');
    expect(r.status).toBe('verificado');
    expect(r.peca).toBe('Contestação 1');
  });

  it('match fuzzy acima do limiar → verificado', () => {
    const r = verifyTrechoInSources('o reclamante alega que trabalhou de segunda a sabado das 8 as 18h sem intervalo', sources, 'Petição inicial');
    expect(r.status).toBe('verificado');
    expect(r.matchScore).toBeGreaterThanOrEqual(0.85);
  });

  it('trecho inventado → nao_localizado', () => {
    const r = verifyTrechoInSources('o autor pilotava um helicóptero da empresa todas as manhãs', sources, 'Petição inicial');
    expect(r.status).toBe('nao_localizado');
  });

  it('trecho vazio → nao_localizado com a etiqueta da IA', () => {
    const r = verifyTrechoInSources('   ', sources, 'Contestação 1');
    expect(r.status).toBe('nao_localizado');
    expect(r.peca).toBe('Contestação 1');
  });
});

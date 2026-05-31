import { describe, it, expect } from 'vitest';
import { parseAIResponse, RastreabilidadeResponseSchema } from './ai-responses';

describe('RastreabilidadeResponseSchema', () => {
  it('parseia JSON em code block e coage blocoIndex string→number', () => {
    const raw = '```json\n{"blocos":[{"blocoIndex":"0","trechos":[{"peca":"Petição inicial","trecho":"trabalhou aos sábados"}]}]}\n```';
    const r = parseAIResponse(raw, RastreabilidadeResponseSchema);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.blocos[0].blocoIndex).toBe(0);
      expect(r.data.blocos[0].trechos[0].peca).toBe('Petição inicial');
    }
  });

  it('aceita blocos ausentes (default [])', () => {
    const r = parseAIResponse('{}', RastreabilidadeResponseSchema);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.blocos).toEqual([]);
  });

  it('tolera blocoIndex não-numérico sem rejeitar a resposta (graceful a jusante)', () => {
    const raw = '{"blocos":[{"blocoIndex":"xyz","trechos":[]}]}';
    const r = parseAIResponse(raw, RastreabilidadeResponseSchema);
    expect(r.success).toBe(true);
    if (r.success) expect(Number.isNaN(r.data.blocos[0].blocoIndex)).toBe(true);
  });

  it('coage peca/trecho null para string vazia', () => {
    const raw = '{"blocos":[{"blocoIndex":0,"trechos":[{"peca":null,"trecho":null}]}]}';
    const r = parseAIResponse(raw, RastreabilidadeResponseSchema);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.blocos[0].trechos[0].peca).toBe('');
      expect(r.data.blocos[0].trechos[0].trecho).toBe('');
    }
  });
});

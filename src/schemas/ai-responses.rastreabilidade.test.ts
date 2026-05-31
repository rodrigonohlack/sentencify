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
});

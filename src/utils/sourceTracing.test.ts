import { describe, it, expect } from 'vitest';
import { buildTracingSources, buildSourceTracingPrompt, mapTracingResponse } from './sourceTracing';

describe('buildTracingSources', () => {
  it('rotula petição inicial, contestações (com reclamada) e descarta vazias', () => {
    const docs = {
      peticoesText: [{ text: 'fatos do autor' }],
      contestacoesText: [{ text: 'defesa da acme' }, { text: '   ' }],
      complementaresText: [],
    };
    const partes = { reclamadas: ['ACME LTDA'] };
    const sources = buildTracingSources(docs, partes);
    expect(sources).toEqual([
      { peca: 'Petição inicial', text: 'fatos do autor' },
      { peca: 'Contestação 1 — ACME LTDA', text: 'defesa da acme' },
    ]);
  });

  it('rotula documentos complementares por índice', () => {
    const sources = buildTracingSources({ complementaresText: [{ text: 'ata de audiência' }] }, null);
    expect(sources).toEqual([{ peca: 'Documento complementar 1', text: 'ata de audiência' }]);
  });
});

describe('buildSourceTracingPrompt', () => {
  it('numera os parágrafos e pede JSON', () => {
    const prompt = buildSourceTracingPrompt([
      { index: 0, text: 'Parágrafo A.' },
      { index: 1, text: 'Parágrafo B.' },
    ]);
    expect(prompt).toContain('[0] Parágrafo A.');
    expect(prompt).toContain('[1] Parágrafo B.');
    expect(prompt).toContain('blocoIndex');
    expect(prompt).toContain('JSON');
  });
});

describe('mapTracingResponse', () => {
  const paragraphs = [
    { index: 0, text: 'O reclamante alega horas extras habituais.' },
    { index: 1, text: 'A ré nega a jornada alegada.' },
  ];
  const sources = [
    { peca: 'Petição inicial', text: 'O reclamante alega horas extras habituais e reflexos.' },
    { peca: 'Contestação 1', text: 'A ré nega a jornada alegada na inicial.' },
  ];

  it('alinha por blocoIndex, verifica e atribui a peça correta', () => {
    const parsed = [
      { blocoIndex: 0, trechos: [{ peca: 'Petição inicial', trecho: 'horas extras habituais' }] },
      { blocoIndex: 1, trechos: [{ peca: 'Petição inicial', trecho: 'nega a jornada alegada' }] },
    ];
    const blocos = mapTracingResponse(parsed, paragraphs, sources);
    expect(blocos).toHaveLength(2);
    expect(blocos[0].blocoResumo).toContain('O reclamante alega');
    expect(blocos[0].trechos[0].status).toBe('verificado');
    expect(blocos[1].trechos[0].peca).toBe('Contestação 1'); // corrige etiqueta errada da IA
  });

  it('marca trecho inventado como nao_localizado', () => {
    const parsed = [{ blocoIndex: 0, trechos: [{ peca: 'Petição inicial', trecho: 'o autor viajou para a lua' }] }];
    const blocos = mapTracingResponse(parsed, paragraphs, sources);
    expect(blocos[0].trechos[0].status).toBe('nao_localizado');
  });

  it('parágrafo sem bloco correspondente → trechos vazios; bloco órfão é ignorado', () => {
    const parsed = [{ blocoIndex: 99, trechos: [{ peca: 'X', trecho: 'qualquer' }] }];
    const blocos = mapTracingResponse(parsed, paragraphs, sources);
    expect(blocos).toHaveLength(2);
    expect(blocos[0].trechos).toEqual([]);
    expect(blocos[1].trechos).toEqual([]);
  });
});

/**
 * @file AIModelService.test.ts
 * @description Testes da agregação de entidades NER (aggregateEntities) — v1.52.49.
 * Importa o código de PRODUÇÃO (guideline 10). Cobre os casos que antes truncavam
 * nomes (URBIX→BIX, FENIX→X, ROSINALDO SILVA DA SILVA) com a reconstrução por offset.
 */
import { describe, it, expect } from 'vitest';
import AIModelService from './AIModelService';
import type { NERRawEntity } from '../types';

/** Helper: monta tokens com offsets reais a partir de um texto e uma lista
 *  [surface, entity] na ordem em que aparecem (surface deve existir no texto). */
function tokensFrom(text: string, spec: Array<[string, string]>): NERRawEntity[] {
  const toks: NERRawEntity[] = [];
  let cursor = 0;
  for (const [surface, entity] of spec) {
    const clean = surface.replace(/^##/, '');
    const idx = text.toLowerCase().indexOf(clean.toLowerCase(), cursor);
    if (idx === -1) throw new Error(`surface não encontrada: ${surface}`);
    toks.push({ word: surface, entity, score: 0.95, start: idx, end: idx + clean.length });
    cursor = idx + clean.length;
  }
  return toks;
}

describe('AIModelService.aggregateEntities', () => {
  it('reconstrói nome de empresa quebrado em subtokens (URBIX) sem truncar', () => {
    const text = 'Empresa URBIX Ltda';
    const toks = tokensFrom(text, [
      ['Empresa', 'O'],
      ['UR', 'B-ORGANIZACAO'], ['##BI', 'B-ORGANIZACAO'], ['##X', 'B-ORGANIZACAO'],
      ['Ltda', 'O'],
    ]);
    const ents = AIModelService.aggregateEntities(toks, text);
    expect(ents).toHaveLength(1);
    expect(ents[0].text).toBe('URBIX');
    expect(ents[0].type).toBe('ORGANIZACAO');
  });

  it('rotula a palavra pela 1ª label != O mesmo se o primeiro subtoken for O (FENIX)', () => {
    const text = 'a FENIX atua';
    const toks = tokensFrom(text, [
      ['a', 'O'],
      ['F', 'O'], ['##EN', 'B-ORGANIZACAO'], ['##IX', 'B-ORGANIZACAO'],
      ['atua', 'O'],
    ]);
    const ents = AIModelService.aggregateEntities(toks, text);
    expect(ents).toHaveLength(1);
    expect(ents[0].text).toBe('FENIX');
    expect(ents[0].type).toBe('ORGANIZACAO');
  });

  it('mantém palavra repetida adjacente (ROSINALDO SILVA DA SILVA) — não deduplica subtoken', () => {
    const text = 'autor ROSINALDO SILVA DA SILVA ajuizou';
    const toks = tokensFrom(text, [
      ['autor', 'O'],
      ['Ros', 'B-PESSOA'], ['##inaldo', 'B-PESSOA'],
      ['SILVA', 'I-PESSOA'], ['DA', 'I-PESSOA'], ['SILVA', 'I-PESSOA'],
      ['ajuizou', 'O'],
    ]);
    const ents = AIModelService.aggregateEntities(toks, text);
    expect(ents).toHaveLength(1);
    expect(ents[0].text).toBe('ROSINALDO SILVA DA SILVA');
    expect(ents[0].type).toBe('PESSOA');
  });

  it('separa entidades distintas quando há token O entre elas', () => {
    const text = 'JOAO trabalhou na FENIX';
    const toks = tokensFrom(text, [
      ['JOAO', 'B-PESSOA'],
      ['trabalhou', 'O'], ['na', 'O'],
      ['FENIX', 'B-ORGANIZACAO'],
    ]);
    const ents = AIModelService.aggregateEntities(toks, text);
    expect(ents.map(e => e.text)).toEqual(['JOAO', 'FENIX']);
    expect(ents.map(e => e.type)).toEqual(['PESSOA', 'ORGANIZACAO']);
  });

  it('remove pontuação das bordas do texto da entidade (aspa de citação)', () => {
    const text = 'frase “ POLIBIUS disse';
    const toks = tokensFrom(text, [
      ['frase', 'O'],
      ['“', 'B-PESSOA'], ['POLIBIUS', 'I-PESSOA'],
      ['disse', 'O'],
    ]);
    const ents = AIModelService.aggregateEntities(toks, text);
    expect(ents).toHaveLength(1);
    expect(ents[0].text).toBe('POLIBIUS');
  });

  it('o texto é sempre o slice exato do documento (invariante anti-truncamento)', () => {
    const text = 'autor WILLCSSON JORGE COSTA PENAFORT em face';
    const toks = tokensFrom(text, [
      ['autor', 'O'],
      ['WILL', 'B-PESSOA'], ['##CSSON', 'B-PESSOA'],
      ['JORGE', 'I-PESSOA'], ['COSTA', 'I-PESSOA'], ['PENA', 'I-PESSOA'], ['##FORT', 'I-PESSOA'],
      ['em', 'O'],
    ]);
    const ents = AIModelService.aggregateEntities(toks, text);
    expect(ents).toHaveLength(1);
    // o slice [start,end] no texto original deve reproduzir exatamente o nome
    expect(text.slice(ents[0].start, ents[0].end).trim()).toBe('WILLCSSON JORGE COSTA PENAFORT');
    expect(ents[0].text).toBe('WILLCSSON JORGE COSTA PENAFORT');
  });
});

describe('AIModelService.dedupOverlapping', () => {
  it('mantém a entidade de maior span quando há sobreposição (corte de borda de chunk)', () => {
    const ents = [
      { text: 'FUKUSHIMA SERVICOS DE TELECOMUNIC', type: 'ORGANIZACAO', score: 0.9, start: 100, end: 133 },
      { text: 'FUKUSHIMA SERVICOS DE TELECOMUNICACOES E SOLUCOES', type: 'ORGANIZACAO', score: 0.95, start: 100, end: 149 },
    ];
    const r = AIModelService.dedupOverlapping(ents);
    expect(r).toHaveLength(1);
    expect(r[0].text).toBe('FUKUSHIMA SERVICOS DE TELECOMUNICACOES E SOLUCOES');
  });

  it('mantém entidades homônimas em posições distintas (não sobrepostas)', () => {
    const ents = [
      { text: 'SILVA', type: 'PESSOA', score: 0.9, start: 10, end: 15 },
      { text: 'SILVA', type: 'PESSOA', score: 0.9, start: 500, end: 505 },
    ];
    const r = AIModelService.dedupOverlapping(ents);
    expect(r).toHaveLength(2);
  });

  it('não funde entidades de tipos diferentes ainda que sobrepostas', () => {
    const ents = [
      { text: 'CLARO', type: 'ORGANIZACAO', score: 0.9, start: 10, end: 15 },
      { text: 'CLARO', type: 'PESSOA', score: 0.9, start: 10, end: 15 },
    ];
    const r = AIModelService.dedupOverlapping(ents);
    expect(r).toHaveLength(2);
  });
});

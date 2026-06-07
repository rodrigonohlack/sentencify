import { describe, it, expect } from 'vitest';
import {
  normalizeForCompare,
  toTitleCase,
  canonicalizeCategory,
  deriveCategoryFromTitle,
  resolveTitleAndCategory,
} from './categoryNormalization';

describe('normalizeForCompare', () => {
  it('remove acentos, caixa e espaços extras', () => {
    expect(normalizeForCompare('  Horas   Extras ')).toBe('horas extras');
    expect(normalizeForCompare('Rescisão')).toBe('rescisao');
    expect(normalizeForCompare('JORNADA  DE  TRABALHO')).toBe('jornada de trabalho');
  });
});

describe('toTitleCase', () => {
  it('capitaliza palavras, mantendo preposições/artigos em minúsculas', () => {
    expect(toTitleCase('HORAS EXTRAS')).toBe('Horas Extras');
    expect(toTitleCase('jornada de trabalho')).toBe('Jornada de Trabalho');
    expect(toTitleCase('VERBAS RESCISÓRIAS')).toBe('Verbas Rescisórias');
  });

  it('sempre capitaliza a primeira palavra mesmo que seja stopword', () => {
    expect(toTitleCase('DE CUJUS')).toBe('De Cujus');
  });
});

describe('deriveCategoryFromTitle', () => {
  it('extrai o TEMA (antes do primeiro separador) em Title Case', () => {
    expect(deriveCategoryFromTitle('HORAS EXTRAS - SOBREJORNADA - PROCEDENTE')).toBe('Horas Extras');
    expect(deriveCategoryFromTitle('DANOS MORAIS - ASSÉDIO - IMPROCEDENTE')).toBe('Danos Morais');
  });

  it('sem separador, usa o título inteiro', () => {
    expect(deriveCategoryFromTitle('HORAS EXTRAS')).toBe('Horas Extras');
  });
});

describe('canonicalizeCategory', () => {
  it('reutiliza a grafia exata de uma categoria existente equivalente (ignora caixa/acento)', () => {
    expect(canonicalizeCategory('horas extras', ['Horas Extras', 'Danos Morais'])).toBe('Horas Extras');
    expect(canonicalizeCategory('RESCISAO INDIRETA', ['Rescisão Indireta'])).toBe('Rescisão Indireta');
  });

  it('categoria nova vem em Title Case', () => {
    expect(canonicalizeCategory('VÍNCULO EMPREGATÍCIO', ['Horas Extras'])).toBe('Vínculo Empregatício');
  });

  it('lista vazia sempre gera nova em Title Case', () => {
    expect(canonicalizeCategory('horas extras', [])).toBe('Horas Extras');
  });
});

describe('resolveTitleAndCategory', () => {
  const existing = ['Horas Extras', 'Danos Morais'];

  it('faz parse de JSON limpo', () => {
    const raw = '{"title": "HORAS EXTRAS - SOBREJORNADA - PROCEDENTE", "category": "Horas Extras"}';
    expect(resolveTitleAndCategory(raw, existing)).toEqual({
      title: 'HORAS EXTRAS - SOBREJORNADA - PROCEDENTE',
      category: 'Horas Extras',
    });
  });

  it('tolera cercas de código ```json', () => {
    const raw = '```json\n{"title": "DANOS MORAIS - ASSÉDIO - IMPROCEDENTE", "category": "danos morais"}\n```';
    const r = resolveTitleAndCategory(raw, existing);
    expect(r.title).toBe('DANOS MORAIS - ASSÉDIO - IMPROCEDENTE');
    expect(r.category).toBe('Danos Morais'); // canonicaliza para a grafia existente
  });

  it('tolera texto solto antes/depois do JSON', () => {
    const raw = 'Aqui está:\n{"title": "VÍNCULO EMPREGATÍCIO - PEJOTIZAÇÃO - PROCEDENTE", "category": "Vínculo Empregatício"}\nEspero ter ajudado.';
    const r = resolveTitleAndCategory(raw, existing);
    expect(r.title).toBe('VÍNCULO EMPREGATÍCIO - PEJOTIZAÇÃO - PROCEDENTE');
    expect(r.category).toBe('Vínculo Empregatício');
  });

  it('fallback: resposta em texto plano vira título e deriva a categoria do TEMA', () => {
    const raw = 'HORAS EXTRAS - SOBREJORNADA HABITUAL - PROCEDENTE';
    expect(resolveTitleAndCategory(raw, existing)).toEqual({
      title: 'HORAS EXTRAS - SOBREJORNADA HABITUAL - PROCEDENTE',
      category: 'Horas Extras',
    });
  });

  it('JSON sem category deriva a categoria do título', () => {
    const raw = '{"title": "DANOS MORAIS - ASSÉDIO - IMPROCEDENTE"}';
    const r = resolveTitleAndCategory(raw, existing);
    expect(r.title).toBe('DANOS MORAIS - ASSÉDIO - IMPROCEDENTE');
    expect(r.category).toBe('Danos Morais');
  });

  it('faz trim do título e da categoria', () => {
    const raw = '{"title": "  HORAS EXTRAS - X - PROCEDENTE  ", "category": "  horas extras  "}';
    const r = resolveTitleAndCategory(raw, existing);
    expect(r.title).toBe('HORAS EXTRAS - X - PROCEDENTE');
    expect(r.category).toBe('Horas Extras');
  });
});

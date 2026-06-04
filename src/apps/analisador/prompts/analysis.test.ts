import { describe, it, expect } from 'vitest';
import { buildAnalysisPrompt } from './analysis';

describe('buildAnalysisPrompt — regra de fonte (v1.52.18)', () => {
  const prompt = buildAnalysisPrompt('petição inicial de teste', [], ['contestação de teste']);

  it('ancora os pedidos na petição inicial', () => {
    expect(prompt).toMatch(/pedidos?[\s\S]{0,120}petição inicial/i);
  });

  it('instrui a não criar pedido para parcela impugnada não postulada', () => {
    expect(prompt).toContain('NÃO crie um pedido');
  });

  it('documenta o tipo de alerta de divergência', () => {
    expect(prompt).toContain('DIVERGÊNCIA - PARCELA NÃO POSTULADA');
  });

  it('preserva o tratamento de reconvenção como pretensão própria da ré', () => {
    expect(prompt).toMatch(/reconvenç/i);
  });
});

describe('buildAnalysisPrompt — regra reforçada anti-confabulação (v1.52.19)', () => {
  const prompt = buildAnalysisPrompt('petição inicial de teste', [], ['contestação de teste']);

  it('define pedido como o que o AUTOR REQUER', () => {
    expect(prompt).toMatch(/REQUER/);
    expect(prompt).toMatch(/o AUTOR requereu isto/i);
  });

  it('cobre o caso sem planilha (rol de pedidos / causa de pedir)', () => {
    expect(prompt).toMatch(/N[ÃA]O HAVENDO planilha/i);
  });

  it('manda classificar antes de narrar', () => {
    expect(prompt).toContain('CLASSIFIQUE ANTES DE NARRAR');
  });

  it('tem trava anti-confabulação no fatosReclamante', () => {
    expect(prompt).toMatch(/N[ÃA]O escreva ['"]?fatosReclamante/i);
  });

  it('distingue reflexo de pedido autônomo', () => {
    expect(prompt).toMatch(/reflexo N[ÃA]O é pedido autônomo/i);
  });
});

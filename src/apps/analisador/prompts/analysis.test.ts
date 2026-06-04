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

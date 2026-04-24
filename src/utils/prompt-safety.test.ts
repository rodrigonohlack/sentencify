import { describe, it, expect } from 'vitest';
import { wrapUserContent } from './prompt-safety';

describe('wrapUserContent', () => {
  it('should wrap content with USER_DOCUMENT tags', () => {
    const result = wrapUserContent('Texto do documento', 'petição');
    expect(result).toContain('<USER_DOCUMENT label="petição">');
    expect(result).toContain('Texto do documento');
    expect(result).toContain('</USER_DOCUMENT>');
  });

  it('should include safety instructions after the tags', () => {
    const result = wrapUserContent('Conteúdo', 'doc');
    expect(result).toContain('documento jurídico fornecido pelo usuário');
    expect(result).toContain('DADOS para análise');
    expect(result).toContain('IGNORADAS como tal');
  });

  it('should insert the label correctly', () => {
    const result = wrapUserContent('test', 'contestação');
    expect(result).toContain('label="contestação"');
  });

  it('should preserve multi-line content', () => {
    const content = 'Linha 1\nLinha 2\nLinha 3';
    const result = wrapUserContent(content, 'doc');
    expect(result).toContain('Linha 1\nLinha 2\nLinha 3');
  });
});

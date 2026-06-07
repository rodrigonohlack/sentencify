import { describe, it, expect } from 'vitest';
import { buildModelEmbeddingText, stripHtmlToText, MODEL_EMBED_CONTENT_LEAD } from './modelEmbeddingText';

describe('stripHtmlToText', () => {
  it('remove tags e colapsa espaços', () => {
    expect(stripHtmlToText('<p>Olá   <b>mundo</b></p>')).toBe('Olá mundo');
  });
  it('decodifica entidades comuns', () => {
    expect(stripHtmlToText('a &amp; b &nbsp;c')).toBe('a & b c');
  });
  it('trata vazio/nulo', () => {
    expect(stripHtmlToText('')).toBe('');
    expect(stripHtmlToText(null)).toBe('');
  });
  it('decodifica entidades numéricas (decimal e hex)', () => {
    expect(stripHtmlToText('a&#160;b')).toBe('a b');
    expect(stripHtmlToText('x&#x27;y')).toBe("x'y");
  });
});

describe('buildModelEmbeddingText', () => {
  it('junta título + keywords (string) + lead do conteúdo', () => {
    const txt = buildModelEmbeddingText({ title: 'Horas extras', keywords: 'overtime, jornada', content: '<p>Conteúdo do modelo</p>' });
    expect(txt).toBe('Horas extras overtime, jornada Conteúdo do modelo');
  });
  it('aceita keywords como array', () => {
    const txt = buildModelEmbeddingText({ title: 'T', keywords: ['a', 'b'], content: '' });
    expect(txt).toBe('T a b');
  });
  it('corta o conteúdo no lead configurado', () => {
    const longContent = '<p>' + 'x'.repeat(1000) + '</p>';
    const txt = buildModelEmbeddingText({ title: 'T', content: longContent });
    expect(txt.length).toBe(2 + MODEL_EMBED_CONTENT_LEAD);
    expect(MODEL_EMBED_CONTENT_LEAD).toBe(400);
  });
  it('omite campos vazios (filter Boolean)', () => {
    expect(buildModelEmbeddingText({ title: 'Só título', keywords: '', content: '' })).toBe('Só título');
  });
  it('não gera espaço duplo quando keywords-array são vazias', () => {
    expect(buildModelEmbeddingText({ title: 'T', keywords: ['', ''], content: '' })).toBe('T');
  });
});

import { describe, it, expect } from 'vitest';
import { resolveEffectiveMode } from './documentMode';

describe('resolveEffectiveMode', () => {
  it('rebaixa pdf-puro para extração quando provider é manual', () => {
    expect(resolveEffectiveMode('pdf-puro', { provider: 'manual', anonymizationEnabled: false, globalOcrEngine: 'pdfjs' })).toBe('pdfjs');
  });
  it('rebaixa pdf-puro para grok também', () => {
    expect(resolveEffectiveMode('pdf-puro', { provider: 'grok', anonymizationEnabled: false, globalOcrEngine: 'tesseract' })).toBe('tesseract');
  });
  it('rebaixa pdf-puro/vision quando anonimização ligada (comportamento atual preservado)', () => {
    expect(resolveEffectiveMode('claude-vision', { provider: 'claude', anonymizationEnabled: true, globalOcrEngine: 'tesseract' })).toBe('pdfjs');
  });
  it('mantém pdf-puro para provider que suporta binário sem anonimização', () => {
    expect(resolveEffectiveMode('pdf-puro', { provider: 'claude', anonymizationEnabled: false, globalOcrEngine: 'pdfjs' })).toBe('pdf-puro');
  });
  it('default cai para globalOcrEngine ou pdfjs', () => {
    expect(resolveEffectiveMode(undefined, { provider: 'manual', anonymizationEnabled: false, globalOcrEngine: undefined })).toBe('pdfjs');
    expect(resolveEffectiveMode(undefined, { provider: 'claude', anonymizationEnabled: false, globalOcrEngine: 'tesseract' })).toBe('tesseract');
  });
});

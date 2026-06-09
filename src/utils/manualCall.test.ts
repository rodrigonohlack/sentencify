import { describe, it, expect } from 'vitest';
import {
  serializeForManual,
  normalizeManualResponse,
  isPdfBinaryAllowed,
  ManualUnsupportedError,
} from './manualCall';

describe('manualCall', () => {
  const instr = () => [{ type: 'text' as const, text: 'INSTRUÇÕES DO SISTEMA' }];

  it('serializeForManual junta instruções + texto das mensagens', () => {
    const out = serializeForManual(
      [{ role: 'user', content: [{ type: 'text', text: 'Olá juiz' }] }],
      { useInstructions: true },
      instr
    );
    expect(out).toContain('INSTRUÇÕES DO SISTEMA');
    expect(out).toContain('Olá juiz');
  });

  it('serializeForManual aceita content string direto', () => {
    const out = serializeForManual(
      [{ role: 'user', content: 'texto simples' }],
      {},
      instr
    );
    expect(out).toContain('texto simples');
  });

  it('serializeForManual lança ManualUnsupportedError em bloco binário', () => {
    expect(() =>
      serializeForManual(
        [{ role: 'user', content: [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: 'AAAA' } } as any,
        ] }],
        {},
        instr
      )
    ).toThrow(ManualUnsupportedError);
  });

  it('normalizeManualResponse remove cercas markdown e faz trim', () => {
    expect(normalizeManualResponse('```json\n{"a":1}\n```')).toBe('{"a":1}');
    expect(normalizeManualResponse('  oi  ')).toBe('oi');
    expect(normalizeManualResponse('```\nx\n```')).toBe('x');
  });

  it('isPdfBinaryAllowed é false para manual e grok', () => {
    expect(isPdfBinaryAllowed('manual')).toBe(false);
    expect(isPdfBinaryAllowed('grok')).toBe(false);
    expect(isPdfBinaryAllowed('claude')).toBe(true);
  });
});

/**
 * @file safeHref.test.ts
 * @description Cobertura de vetores XSS conhecidos para safeHref.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { safeHref, extractHostname } from './safeHref';

describe('safeHref', () => {
  // Simula produção (hostname != localhost) por padrão. Tests individuais
  // podem sobrescrever window.location via vi.stubGlobal se precisar.
  const originalLocation = window.location;
  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...originalLocation, hostname: 'sentencify.ia.br' },
    });
  });
  afterEach(() => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: originalLocation,
    });
  });

  describe('happy path', () => {
    it('aceita https://', () => {
      expect(safeHref('https://tst.jus.br/sumula-347')).toBe('https://tst.jus.br/sumula-347');
    });

    it('aceita https com query string e path', () => {
      expect(safeHref('https://example.com/path?q=test&lang=pt')).toBe(
        'https://example.com/path?q=test&lang=pt'
      );
    });

    it('faz trim de espaços', () => {
      expect(safeHref('  https://ok.com  ')).toBe('https://ok.com');
    });
  });

  describe('XSS vectors — rejeita schemes perigosos', () => {
    it('rejeita javascript:', () => {
      expect(safeHref('javascript:alert(1)')).toBe('#');
    });

    it('rejeita JAVASCRIPT: maiúsculo', () => {
      expect(safeHref('JAVASCRIPT:alert(1)')).toBe('#');
    });

    it('rejeita data:text/html', () => {
      expect(safeHref('data:text/html,<script>alert(1)</script>')).toBe('#');
    });

    it('rejeita file://', () => {
      expect(safeHref('file:///etc/passwd')).toBe('#');
    });

    it('rejeita vbscript:', () => {
      expect(safeHref('vbscript:msgbox(1)')).toBe('#');
    });

    it('rejeita blob:', () => {
      expect(safeHref('blob:https://evil.com/uuid')).toBe('#');
    });

    it('rejeita about:blank', () => {
      expect(safeHref('about:blank')).toBe('#');
    });

    it('rejeita ftp://', () => {
      expect(safeHref('ftp://example.com/file')).toBe('#');
    });

    it('rejeita CRLF injection (scheme disfarçado)', () => {
      expect(safeHref('javascript:\nalert(1)')).toBe('#');
      expect(safeHref('\tjavascript:alert(1)')).toBe('#');
      expect(safeHref('\rhttps://ok.com')).toBe('#');
    });
  });

  describe('entradas malformadas', () => {
    it('rejeita null/undefined/vazio', () => {
      expect(safeHref(null)).toBe('#');
      expect(safeHref(undefined)).toBe('#');
      expect(safeHref('')).toBe('#');
      expect(safeHref('   ')).toBe('#');
    });

    it('rejeita URIs relativas', () => {
      expect(safeHref('/path/only')).toBe('#');
      expect(safeHref('../relative')).toBe('#');
      expect(safeHref('page.html')).toBe('#');
    });

    it('rejeita string sem scheme', () => {
      expect(safeHref('example.com')).toBe('#');
    });

    it('rejeita tipos não-string', () => {
      // @ts-expect-error - teste de robustez
      expect(safeHref(42)).toBe('#');
      // @ts-expect-error
      expect(safeHref({})).toBe('#');
    });
  });

  describe('http:// em produção vs dev', () => {
    it('rejeita http:// em produção', () => {
      // Default (beforeEach) é produção
      expect(safeHref('http://example.com')).toBe('#');
    });

    it('aceita http://localhost em dev', () => {
      Object.defineProperty(window, 'location', {
        writable: true,
        value: { ...originalLocation, hostname: 'localhost' },
      });
      expect(safeHref('http://localhost:3000/api')).toBe('http://localhost:3000/api');
    });

    it('aceita http://127.0.0.1 em dev', () => {
      Object.defineProperty(window, 'location', {
        writable: true,
        value: { ...originalLocation, hostname: '127.0.0.1' },
      });
      expect(safeHref('http://127.0.0.1:8080')).toBe('http://127.0.0.1:8080');
    });
  });
});

describe('extractHostname', () => {
  it('extrai hostname de https válido', () => {
    expect(extractHostname('https://www.tst.jus.br/sumula/347')).toBe('tst.jus.br');
  });

  it('remove www.', () => {
    expect(extractHostname('https://www.example.com/page')).toBe('example.com');
  });

  it('preserva subdomínios que não sejam www', () => {
    expect(extractHostname('https://docs.google.com/')).toBe('docs.google.com');
  });

  it('retorna string vazia para entrada inválida', () => {
    expect(extractHostname('')).toBe('');
    expect(extractHostname(null)).toBe('');
    expect(extractHostname('not a url')).toBe('');
  });
});

// src/utils/installApiAuthInterceptor.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Simula o ambiente de PRODUÇÃO (API_BASE === '' → backend na mesma origem),
// que é onde as regras de segurança do interceptor mais importam.
vi.mock('../constants/api', () => ({ API_BASE: '' }));

import { installApiAuthInterceptor } from './installApiAuthInterceptor';

const AUTH_KEY = 'sentencify-auth-token';

/**
 * Instala o interceptor por cima de um mock de fetch e devolve um helper para
 * inspecionar o `init` (headers) que CHEGOU ao fetch original em cada chamada.
 */
function setupInterceptor() {
  const calls: Array<{ input: unknown; init?: RequestInit }> = [];
  const mockFetch = vi.fn((input: unknown, init?: RequestInit) => {
    calls.push({ input, init });
    return Promise.resolve(new Response('ok'));
  });
  // O interceptor captura window.fetch atual como "original" no momento da instalação.
  window.fetch = mockFetch as unknown as typeof window.fetch;
  installApiAuthInterceptor();
  const headerOf = (i: number, name: string) =>
    new Headers(calls[i]?.init?.headers as HeadersInit | undefined).get(name);
  return {
    fetch: window.fetch,
    headerOf,
    authHeaderOf: (i: number) => headerOf(i, 'Authorization'),
  };
}

describe('installApiAuthInterceptor', () => {
  beforeEach(() => {
    localStorage.clear();
    (window as typeof window & { __apiAuthInterceptorInstalled?: boolean })
      .__apiAuthInterceptorInstalled = undefined;
  });

  it('anexa Authorization: Bearer em chamadas ao backend próprio (/api/)', async () => {
    localStorage.setItem(AUTH_KEY, 'tok123');
    const h = setupInterceptor();
    await h.fetch('/api/claude/messages', { method: 'POST' });
    expect(h.authHeaderOf(0)).toBe('Bearer tok123');
  });

  it('NÃO anexa o token a hosts externos (ex.: googleapis.com)', async () => {
    localStorage.setItem(AUTH_KEY, 'tok123');
    const h = setupInterceptor();
    await h.fetch('https://www.googleapis.com/drive/v3/files');
    expect(h.authHeaderOf(0)).toBeNull();
  });

  it('NÃO anexa o token ao daemon bridge local (localhost:8787)', async () => {
    localStorage.setItem(AUTH_KEY, 'tok123');
    const h = setupInterceptor();
    await h.fetch('http://localhost:8787/v1/messages', { method: 'POST' });
    expect(h.authHeaderOf(0)).toBeNull();
  });

  it('NÃO sobrescreve um Authorization já presente (ex.: authFetch)', async () => {
    localStorage.setItem(AUTH_KEY, 'tok123');
    const h = setupInterceptor();
    await h.fetch('/api/sync/pull', {
      method: 'POST',
      headers: { Authorization: 'Bearer existente' },
    });
    expect(h.authHeaderOf(0)).toBe('Bearer existente');
  });

  it('não anexa nada quando não há token em localStorage', async () => {
    const h = setupInterceptor();
    await h.fetch('/api/claude/messages', { method: 'POST' });
    expect(h.authHeaderOf(0)).toBeNull();
  });

  it('preserva headers existentes ao anexar o token (ex.: x-api-key)', async () => {
    localStorage.setItem(AUTH_KEY, 'tok123');
    const h = setupInterceptor();
    await h.fetch('/api/claude/messages', {
      method: 'POST',
      headers: { 'x-api-key': 'sk-abc', 'Content-Type': 'application/json' },
    });
    expect(h.authHeaderOf(0)).toBe('Bearer tok123');
    expect(h.headerOf(0, 'x-api-key')).toBe('sk-abc');
    expect(h.headerOf(0, 'Content-Type')).toBe('application/json');
  });
});

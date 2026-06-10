// src/utils/installApiAuthInterceptor.ts
// v1.53.3 - Injeção centralizada do JWT de sessão nas chamadas ao backend próprio.

import { API_BASE } from '../constants/api';

const AUTH_KEY = 'sentencify-auth-token';

/**
 * Instala um wrapper global em `window.fetch` que anexa o JWT de sessão
 * (`Authorization: Bearer <token>`) a TODA chamada ao backend próprio (`/api/...`).
 *
 * Motivação: as rotas de proxy de IA (`/api/claude`, `/api/gemini`, `/api/openai`,
 * `/api/grok`, `/api/deepseek`) passaram a exigir `authMiddleware` no backend,
 * fechando o vetor de "open proxy" — um anônimo não pode mais usar o servidor para
 * encaminhar prompts a provedores de IA (risco de abuso da infraestrutura para
 * fins ilícitos). Como as ~50 chamadas de IA estão espalhadas por 5 apps autônomos
 * com `fetch` inline, centralizamos a injeção do token aqui em vez de editar cada
 * call site (e arriscar esquecer algum, que viraria 401).
 *
 * Regras de segurança do wrapper:
 * - Só anexa a chamadas ao NOSSO backend: mesma origem + `/api/` em produção, ou
 *   `API_BASE` em desenvolvimento. NUNCA a googleapis.com, ao daemon bridge local
 *   (localhost:8787) ou a qualquer host externo — esses jamais recebem o token.
 * - Nunca SOBRESCREVE um `Authorization` já presente (ex.: `authFetch`, que faz
 *   refresh automático de token, já injeta o seu).
 * - Falha de forma transparente: qualquer erro no wrapper cai no fetch original.
 * - Idempotente: seguro contra dupla instalação (HMR em dev).
 */
export function installApiAuthInterceptor(): void {
  if (typeof window === 'undefined' || !window.fetch) return;
  const w = window as typeof window & { __apiAuthInterceptorInstalled?: boolean };
  if (w.__apiAuthInterceptorInstalled) return;
  w.__apiAuthInterceptorInstalled = true;

  const originalFetch = window.fetch.bind(window);

  const isBackendApiUrl = (rawUrl: string): boolean => {
    try {
      if (API_BASE) {
        // Dev: backend num host explícito (http://localhost:3001).
        return rawUrl.startsWith(`${API_BASE}/api/`);
      }
      // Produção: backend é a mesma origem. Aceita path relativo ou URL absoluta
      // same-origin; rejeita qualquer host externo.
      if (rawUrl.startsWith('/api/')) return true;
      const u = new URL(rawUrl, window.location.origin);
      return u.origin === window.location.origin && u.pathname.startsWith('/api/');
    } catch {
      return false;
    }
  };

  window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    try {
      const url =
        typeof input === 'string' ? input
        : input instanceof URL ? input.toString()
        : input instanceof Request ? input.url
        : String(input);

      if (isBackendApiUrl(url)) {
        const token = localStorage.getItem(AUTH_KEY);
        if (token) {
          const headers = new Headers(
            (init && init.headers) ||
            (input instanceof Request ? input.headers : undefined)
          );
          if (!headers.has('Authorization')) {
            headers.set('Authorization', `Bearer ${token}`);
            init = { ...(init || {}), headers };
          }
        }
      }
    } catch {
      // Nunca quebrar o fetch por causa do interceptor.
    }
    return originalFetch(input as RequestInfo | URL, init);
  };
}

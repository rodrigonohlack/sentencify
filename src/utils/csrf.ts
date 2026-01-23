/**
 * @file csrf.ts
 * @description Gerenciamento de CSRF token no frontend
 */

let csrfToken: string | null = null;

/**
 * Obtem CSRF token do servidor (chama uma vez no login)
 */
export async function fetchCSRFToken(): Promise<string> {
  const response = await fetch('/api/auth/csrf-token', {
    credentials: 'include',
  });
  const data = await response.json();
  csrfToken = data.csrfToken;
  return csrfToken!;
}

/**
 * Retorna o CSRF token atual (para adicionar em headers)
 */
export function getCSRFToken(): string | null {
  return csrfToken;
}

/**
 * Adiciona CSRF token aos headers de uma request
 */
export function withCSRF(headers: Record<string, string> = {}): Record<string, string> {
  if (csrfToken) {
    headers['x-csrf-token'] = csrfToken;
  }
  return headers;
}

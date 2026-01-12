/**
 * @file api.ts
 * @description Constantes de API - base URL para chamadas ao backend
 * @version 1.36.80
 *
 * Extraído do App.tsx
 */

/**
 * Retorna a URL base da API baseado no ambiente
 * - Desenvolvimento: http://localhost:3001
 * - Produção: mesmo domínio (string vazia)
 */
export const getApiBase = (): string => {
  if (!import.meta.env.PROD) {
    return 'http://localhost:3001';
  }
  // Produção: usar mesmo domínio (funciona tanto no Render quanto no Vercel)
  return '';
};

export const API_BASE = getApiBase();

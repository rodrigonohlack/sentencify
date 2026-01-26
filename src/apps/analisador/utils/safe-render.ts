/**
 * @file safe-render.ts
 * @description Utility para renderização segura de valores em componentes React
 */

/**
 * Renderiza qualquer valor como string de forma segura
 * Evita React Error #300 quando LLM retorna objetos ao invés de strings
 */
export const safeRender = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
};

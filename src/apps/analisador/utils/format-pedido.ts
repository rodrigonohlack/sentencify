/**
 * @file format-pedido.ts
 * @description Utilitários para formatação de pedidos
 */

/**
 * Converte valor para número de forma segura
 * Lida com strings, números, undefined e null
 */
const toNumber = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  return isNaN(num) ? undefined : num;
};

/**
 * Formata valor monetário em Real brasileiro
 */
export const formatCurrency = (value?: number | string): string => {
  const num = toNumber(value);
  if (num === undefined) return '—';
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

/**
 * Extrai valor numérico do tema se a IA concatenou (ex: "HORAS EXTRAS(12316.19)")
 * Retorna tema limpo e valor extraído
 */
export const parseThemeAndValue = (
  tema: string,
  valor?: number | string
): { cleanTema: string; extractedValor?: number } => {
  const numericValor = toNumber(valor);
  const match = tema.match(/^(.+?)\s*\((\d+(?:\.\d+)?)\)$/);
  if (match) {
    return {
      cleanTema: match[1].trim(),
      extractedValor: numericValor ?? parseFloat(match[2])
    };
  }
  return { cleanTema: tema, extractedValor: numericValor };
};

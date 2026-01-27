/**
 * @file format-pedido.ts
 * @description Utilitários para formatação de pedidos
 */

/**
 * Formata valor monetário em Real brasileiro
 */
export const formatCurrency = (value?: number): string => {
  if (value === undefined || value === null) return '—';
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

/**
 * Extrai valor numérico do tema se a IA concatenou (ex: "HORAS EXTRAS(12316.19)")
 * Retorna tema limpo e valor extraído
 */
export const parseThemeAndValue = (tema: string, valor?: number): { cleanTema: string; extractedValor?: number } => {
  const match = tema.match(/^(.+?)\s*\((\d+(?:\.\d+)?)\)$/);
  if (match) {
    return {
      cleanTema: match[1].trim(),
      extractedValor: valor ?? parseFloat(match[2])
    };
  }
  return { cleanTema: tema, extractedValor: valor };
};

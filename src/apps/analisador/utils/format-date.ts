/**
 * @file format-date.ts
 * @description Converte data ISO (YYYY-MM-DD) em formato brasileiro (DD/MM/YYYY).
 */

export const formatDateBR = (value?: string | null): string => {
  if (!value || typeof value !== 'string') return '';
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  return value;
};

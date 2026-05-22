/**
 * @file format-date.ts
 * @description Formatação de datas (Unix timestamp) usadas no histórico.
 */

const pad = (n: number) => String(n).padStart(2, '0');

export function formatTimestampBR(timestamp: number): string {
  const d = new Date(timestamp);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatTimestampBROnly(timestamp: number): string {
  const d = new Date(timestamp);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/**
 * @file styles.ts
 * @description CSS classes centralizadas para o Analisador de Prepauta
 */

export const RESULTADO_STYLES = {
  CONTROVERTIDO: { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300' },
  INCONTROVERSO: { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300' },
  default: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' }
} as const;

export const getControversiaStyle = (controversia: boolean) =>
  controversia ? RESULTADO_STYLES.CONTROVERTIDO : RESULTADO_STYLES.INCONTROVERSO;

export const SEVERIDADE_STYLES = {
  alta: { bg: 'bg-red-100', text: 'text-red-800', icon: 'text-red-500' },
  media: { bg: 'bg-amber-100', text: 'text-amber-800', icon: 'text-amber-500' },
  baixa: { bg: 'bg-blue-100', text: 'text-blue-800', icon: 'text-blue-500' },
} as const;

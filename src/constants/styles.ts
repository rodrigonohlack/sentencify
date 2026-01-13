/**
 * @file styles.ts
 * @description CSS classes centralizadas e estilos de resultado
 * @version 1.36.95
 *
 * Extraído de App.tsx para centralizar estilos reutilizáveis.
 *
 * @usedBy App.tsx, TopicCard, ProofCard, modais diversos
 */

// ═══════════════════════════════════════════════════════════════════════════
// CSS CLASSES CENTRALIZADAS (v1.12.5 - Classes utilitárias consolidadas)
// v1.33.43: Fix tema claro - usa variáveis CSS de tema
// ═══════════════════════════════════════════════════════════════════════════

export const CSS = {
  // Modal system - v1.33.43: usa variáveis de tema para suportar tema claro/escuro
  modalOverlay: "fixed inset-0 theme-modal-overlay backdrop-blur-sm flex items-center justify-center z-[90] p-4",
  modalContainer: "theme-modal-container backdrop-blur-md rounded-2xl shadow-2xl theme-border-modal border theme-modal-glow max-h-[90vh] flex flex-col",
  modalHeader: "p-5 border-b theme-border-modal",
  modalFooter: "flex gap-3 p-4 border-t theme-border-modal",
  // Input
  inputField: "w-full px-4 py-3 theme-input border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-all",
  inputBase: "w-full theme-bg-secondary border theme-border-input rounded-lg theme-text-primary theme-placeholder focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-all",
  input: "w-full px-4 py-3 theme-bg-secondary border theme-border-input rounded-lg theme-text-primary theme-placeholder focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-all",
  // Info boxes
  infoBox: "theme-info-box",
  spinner: "w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin",
  // Text
  label: "block text-sm font-medium theme-text-tertiary mb-2",
  textMuted: "text-xs theme-text-muted",
  // Flex
  flexCenter: "flex items-center",
  flexGap1: "flex items-center gap-1",
  flexGap2: "flex items-center gap-2",
  flexGap3: "flex items-center gap-3",
  flexBetween: "flex items-center justify-between",
  flexCenterJustify: "flex items-center justify-center gap-2",
  // Buttons - v1.33.43: cores que funcionam em ambos os temas
  btnBase: "rounded-xl font-medium transition-all",
  btnPrimary: "px-4 py-2.5 rounded-xl font-medium text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 shadow-lg shadow-purple-500/25",
  btnSecondary: "px-4 py-2.5 rounded-xl font-medium theme-bg-secondary theme-hover-bg border theme-border-modal theme-text-primary transition-all",
  btnDanger: "px-4 py-2.5 rounded-xl font-medium bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white shadow-lg shadow-red-500/25",
  btnSuccess: "px-4 py-2.5 rounded-xl font-medium bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white shadow-lg shadow-green-500/25",
  btnBlue: "px-4 py-2.5 rounded-xl font-medium bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-lg shadow-blue-500/25",
  btnRed: "px-4 py-2.5 rounded-xl font-medium bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white shadow-lg shadow-red-500/25",
  btnGreen: "px-4 py-2.5 rounded-xl font-medium bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white shadow-lg shadow-green-500/25",
  btnSmall: "px-2 py-1 rounded text-xs",
  // Cards
  cardBase: "rounded-lg border theme-border-input theme-bg-secondary",
  // Common
  hoverSlate: "theme-bg-tertiary hover-slate-500",
  roundedLg: "rounded-lg",
  textXs: "text-xs",
  textSm: "text-sm",
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// ESTILOS DE RESULTADO (cores por tipo de decisão)
// ═══════════════════════════════════════════════════════════════════════════

export const RESULTADO_STYLES = {
  PROCEDENTE: { borderColor: '#10b981', color: 'var(--result-green)' },
  IMPROCEDENTE: { borderColor: '#ef4444', color: 'var(--result-red)' },
  'PARCIALMENTE PROCEDENTE': { borderColor: '#f59e0b', color: 'var(--result-amber)' },
  ACOLHIDO: { borderColor: '#10b981', color: 'var(--result-green)' },
  REJEITADO: { borderColor: '#ef4444', color: 'var(--result-red)' },
  'SEM RESULTADO': { borderColor: '#64748b', color: 'var(--result-muted)' },
  default: { borderColor: '#64748b', color: 'var(--result-muted)' }
} as const;

/**
 * Retorna o estilo de cor para um resultado de decisão
 * @param r - Tipo de resultado (PROCEDENTE, IMPROCEDENTE, etc.)
 * @returns Objeto com borderColor e color
 */
export const getResultadoStyle = (r: string | null | undefined) =>
  RESULTADO_STYLES[r as keyof typeof RESULTADO_STYLES] || RESULTADO_STYLES.default;

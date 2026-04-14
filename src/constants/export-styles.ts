/**
 * Estilos inline para exportação de minuta
 *
 * Google Docs e Word ignoram CSS em tags <style>.
 * Estes estilos são aplicados inline nos elementos HTML.
 */

export const EXPORT_STYLES = {
  h1: 'text-align: center; font-size: 14pt; font-weight: bold; text-transform: uppercase; margin-bottom: 20px; font-family: Times New Roman, serif;',
  h2: 'text-align: left; font-size: 12pt; font-weight: bold; text-transform: uppercase; margin-top: 20px; margin-bottom: 10px; font-family: Times New Roman, serif;',
  p: 'text-align: justify; margin: 0 0 12px 0; font-family: Times New Roman, serif; font-size: 12pt; line-height: 1.5;',
  section: 'margin-bottom: 30px;',
} as const;

export type ExportStyleKey = keyof typeof EXPORT_STYLES;

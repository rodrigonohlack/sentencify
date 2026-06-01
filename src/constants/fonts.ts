/**
 * @file fonts.ts
 * @description Catálogo de fontes selecionáveis pelo usuário (seção Aparência).
 *
 * Ponto único de verdade do seletor de fonte. A fonte escolhida é aplicada via a
 * variável CSS `--app-font` no document.documentElement (ver useFontPreference), e
 * referenciada em src/index.css e tailwind.config.js com fallback para Spectral.
 *
 * Todas as famílias são servidas pelo Google Fonts (CDN). A Spectral (padrão) já é
 * carregada estaticamente no index.html — por isso seu `googleFontsHref` é null. As
 * demais são injetadas dinamicamente apenas quando selecionadas.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════════

export interface FontOption {
  /** Identificador estável persistido no localStorage (ex.: 'spectral', 'lora'). */
  id: string;
  /** Rótulo exibido no seletor. */
  label: string;
  /** Valor aplicado em --app-font (font stack completo, com fallback adequado). */
  stack: string;
  /**
   * URL do <link> do Google Fonts a injetar quando a fonte é selecionada.
   * `null` quando a fonte já é carregada estaticamente no index.html (Spectral).
   */
  googleFontsHref: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════════

/** Fonte padrão — idêntica ao comportamento histórico (Spectral). */
export const DEFAULT_FONT_ID = 'spectral';

/** Chave de persistência no localStorage. */
export const FONT_STORAGE_KEY = 'sentencify-app-font';

const GF = (family: string): string =>
  `https://fonts.googleapis.com/css2?family=${family}&display=swap`;

/**
 * Catálogo de fontes oferecidas no seletor de Aparência.
 * Serifadas para leitura longa de sentenças + duas sem-serifa de uso geral.
 */
export const FONT_CATALOG: readonly FontOption[] = [
  {
    id: 'spectral',
    label: 'Spectral',
    stack: "'Spectral', Georgia, serif",
    googleFontsHref: null, // carregada estaticamente no index.html
  },
  {
    id: 'lora',
    label: 'Lora',
    stack: "'Lora', Georgia, serif",
    googleFontsHref: GF('Lora:wght@400;500;600;700'),
  },
  {
    id: 'source-serif-4',
    label: 'Source Serif 4',
    stack: "'Source Serif 4', Georgia, serif",
    googleFontsHref: GF('Source+Serif+4:wght@400;500;600;700'),
  },
  {
    id: 'merriweather',
    label: 'Merriweather',
    stack: "'Merriweather', Georgia, serif",
    googleFontsHref: GF('Merriweather:wght@400;700'),
  },
  {
    id: 'eb-garamond',
    label: 'EB Garamond',
    stack: "'EB Garamond', Georgia, serif",
    googleFontsHref: GF('EB+Garamond:wght@400;500;600;700'),
  },
  {
    id: 'carlito',
    label: 'Carlito (Calibri)',
    stack: "'Carlito', Calibri, sans-serif",
    googleFontsHref: GF('Carlito:wght@400;700'),
  },
  {
    id: 'inter',
    label: 'Inter',
    stack: "'Inter', system-ui, sans-serif",
    googleFontsHref: GF('Inter:wght@400;500;600;700'),
  },
] as const;

/** Resolve uma FontOption por id, com fallback para a fonte padrão. */
export function getFontOption(id: string | null | undefined): FontOption {
  return (
    FONT_CATALOG.find((f) => f.id === id) ??
    FONT_CATALOG.find((f) => f.id === DEFAULT_FONT_ID)!
  );
}

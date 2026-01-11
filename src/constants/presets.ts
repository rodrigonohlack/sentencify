/**
 * @file presets.ts
 * @description Configurações de espaçamento e tamanho de fonte dos editores
 * @extractedFrom App.tsx linhas 340-383
 */

export interface SpacingPreset {
  label: string;
  lineHeight: string;
  paragraphMargin: string;
  icon: string;
}

export interface FontSizePreset {
  label: string;
  fontSize: string;
  icon: string;
}

// ⚙️ CONFIGURAÇÃO DE ESPAÇAMENTO DE PARÁGRAFOS
export const SPACING_PRESETS: Record<string, SpacingPreset> = {
  compact: {
    label: 'Compacto',
    lineHeight: '1.2',
    paragraphMargin: '0.15em',
    icon: '▼'
  },
  normal: {
    label: 'Normal',
    lineHeight: '1.35',
    paragraphMargin: '0.25em',
    icon: '='
  },
  comfortable: {
    label: 'Confortável',
    lineHeight: '1.6',
    paragraphMargin: '0.5em',
    icon: '≡'
  },
  wide: {
    label: 'Amplo',
    lineHeight: '2.0',
    paragraphMargin: '1.0em',
    icon: '☰'
  }
};

// ⚙️ CONFIGURAÇÃO DE TAMANHO DE FONTE DOS EDITORES (v1.10.8)
export const FONTSIZE_PRESETS: Record<string, FontSizePreset> = {
  normal: {
    label: 'Normal',
    fontSize: '14px',
    icon: 'A'
  },
  larger: {
    label: 'Maior',
    fontSize: '16px',
    icon: 'A+'
  },
  largest: {
    label: 'Grande',
    fontSize: '18px',
    icon: 'A++'
  }
};

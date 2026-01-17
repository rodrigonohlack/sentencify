/**
 * @file color-stripper.ts
 * @description Remove cores inline de HTML para sistema color-free
 * @version 1.37.81
 *
 * O sistema SentencifyAI é "color-free": textos herdam cor do tema ativo.
 * Esta função remove cores inline que poderiam sobrescrever o tema.
 *
 * Fontes de cores inline:
 * - Resposta da IA
 * - Modelos salvos na biblioteca
 * - Copy/paste de Word, Google Docs, web
 * - Edição anterior em tema diferente
 */

/**
 * Remove cores inline de HTML para sistema color-free
 * Preserva formatação estrutural (bold, italic, lists, alignment)
 *
 * @param html - HTML potencialmente com cores inline
 * @returns HTML limpo sem cores
 *
 * @example
 * stripInlineColors('<p style="color: rgb(0,0,0); font-weight: bold;">Texto</p>')
 * // Retorna: '<p style="font-weight: bold;">Texto</p>'
 */
export function stripInlineColors(html: string): string {
  if (!html || typeof html !== 'string') {
    return html || '';
  }

  let cleaned = html;

  // color: rgb(), rgba(), hex, named colors
  cleaned = cleaned.replace(/\s*color\s*:\s*[^;}"']+[;]?/gi, '');

  // background-color: qualquer valor
  cleaned = cleaned.replace(/\s*background-color\s*:\s*[^;}"']+[;]?/gi, '');

  // background: valores de cor simples (não imagens)
  cleaned = cleaned.replace(
    /\s*background\s*:\s*(?:rgb[a]?\([^)]+\)|#[0-9a-f]{3,8}|transparent|white|black|inherit|initial|unset)\s*[;]?/gi,
    ''
  );

  // Limpar style="" vazio ou com apenas espaços/ponto-vírgula
  cleaned = cleaned.replace(/\s*style\s*=\s*["']\s*[;]?\s*["']/gi, '');

  // Limpar style com apenas ; residuais (ex: style="; ;")
  cleaned = cleaned.replace(/style\s*=\s*["'][\s;]+["']/gi, '');

  return cleaned;
}

export default stripInlineColors;

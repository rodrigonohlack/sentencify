/**
 * @file modelEmbeddingText.ts
 * @description Fonte ÚNICA do texto usado para gerar o embedding de um modelo.
 * Dependency-light (sem imports pesados nem DOM) para poder ser usado tanto no
 * app quanto no script local de re-embed (node via tsx). Garante que app e script
 * produzam exatamente o mesmo texto → embeddings compatíveis.
 * @version 1.52.40
 */

/** Comprimento do "lead" do conteúdo incluído no texto de embedding. */
export const MODEL_EMBED_CONTENT_LEAD = 400;

/**
 * Remove tags HTML e devolve texto puro, SEM depender do DOM (funciona em node).
 * Decodifica as entidades mais comuns e colapsa espaços em branco.
 */
export function stripHtmlToText(html: string | null | undefined): string {
  if (!html) return '';
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_m, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\s+/g, ' ')
    .trim();
}

export interface ModelEmbedInput {
  title?: string;
  keywords?: string | string[];
  content?: string;
}

/**
 * Monta o texto canônico do embedding de um modelo:
 * título + keywords + lead curto do conteúdo (sem ruído de boilerplate de 2000 chars).
 */
export function buildModelEmbeddingText(model: ModelEmbedInput): string {
  const keywords = (typeof model.keywords === 'string'
    ? model.keywords
    : (model.keywords || []).join(' ')
  ).trim();
  const lead = stripHtmlToText(model.content).slice(0, MODEL_EMBED_CONTENT_LEAD);
  return [model.title, keywords, lead].filter(Boolean).join(' ');
}

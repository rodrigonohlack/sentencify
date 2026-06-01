/**
 * @file reportParagraphs.ts
 * @description Divide o HTML do mini-relatório em parágrafos de texto puro,
 * numerados. Alinhamento determinístico para a rastreabilidade (bloco = parágrafo).
 */

export interface ReportParagraph {
  index: number;
  text: string;
}

export function splitReportIntoParagraphs(html: string): ReportParagraph[] {
  if (!html) return [];
  const blocks = html
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .split('\n')
    .map(s => s.replace(/\s+/g, ' ').trim())
    .filter(s => s.length > 0);
  return blocks.map((text, index) => ({ index, text }));
}

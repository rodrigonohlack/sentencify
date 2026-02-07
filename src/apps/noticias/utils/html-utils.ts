// ═══════════════════════════════════════════════════════════════════════════
// UTILS - HTML sanitization helpers
// ═══════════════════════════════════════════════════════════════════════════

/** Decodifica todas as entidades HTML usando o parser nativo do browser */
const decodeHtmlEntities = (text: string): string => {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
};

/** Remove tags HTML e decodifica todas as entidades */
export const stripHtml = (html: string): string => {
  let text = html.replace(/<!\[CDATA\[|\]\]>/g, '');
  text = text.replace(/<[^>]+>/g, ' ');
  text = decodeHtmlEntities(text);
  text = text.replace(/\s+/g, ' ');
  return text.trim();
};

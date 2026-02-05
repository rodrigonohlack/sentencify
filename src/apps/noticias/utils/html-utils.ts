// ═══════════════════════════════════════════════════════════════════════════
// UTILS - HTML sanitization helpers
// ═══════════════════════════════════════════════════════════════════════════

/** Remove tags HTML e decodifica entidades básicas */
export const stripHtml = (html: string): string => {
  let text = html.replace(/<!\[CDATA\[|\]\]>/g, '');
  text = text.replace(/<[^>]+>/g, ' ');
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/\s+/g, ' ');
  return text.trim();
};

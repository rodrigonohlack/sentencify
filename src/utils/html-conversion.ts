/**
 * @file html-conversion.ts
 * @description Utilitários para conversão entre HTML e texto
 * @version v1.37.23
 *
 * Extraído do App.tsx para modularização.
 * Funções puras para conversão de formatos de texto.
 */

import { EXPORT_STYLES } from '../constants/export-styles';
import { sanitizeHTML } from './sanitizeHTML';

// ═══════════════════════════════════════════════════════════════════════════
// CONVERSÃO HTML → TEXTO
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Converte HTML para texto puro (sem formatação)
 */
export function htmlToPlainText(html: string): string {
  const temp = document.createElement('div');
  temp.innerHTML = sanitizeHTML(html);
  return temp.textContent || temp.innerText || '';
}

/**
 * Converte HTML para texto formatado (preserva quebras de linha)
 * Usado para exportação de texto legível
 */
export function htmlToFormattedText(html: string): string {
  if (!html) return '';

  let text = html;

  // Detectar se é texto puro (sem tags HTML significativas) ou HTML
  const hasSignificantHtml = /<(p|br|div|ul|ol|li|h[1-6]|strong|b|em|i|u)[^>]*>/i.test(text);

  if (!hasSignificantHtml) {
    // É texto puro - converter quebras de linha simples em duplas para Google Docs
    text = text.replace(/\n/g, '\n\n');
    // Limpar múltiplas quebras excessivas
    text = text.replace(/\n{3,}/g, '\n\n');
    return text.trim();
  }

  // Remover tags de formatação mantendo apenas o conteúdo
  text = text.replace(/<\/?b>/gi, '');
  text = text.replace(/<\/?strong>/gi, '');
  text = text.replace(/<\/?i>/gi, '');
  text = text.replace(/<\/?em>/gi, '');
  text = text.replace(/<\/?u>/gi, '');

  // Converter <br> em quebra de linha simples
  text = text.replace(/<br\s*\/?>/gi, '\n');

  // Converter fechamento de parágrafo em duas quebras de linha
  text = text.replace(/<\/p>/gi, '\n\n');
  text = text.replace(/<p>/gi, '');

  // Converter divs em quebras de linha
  text = text.replace(/<\/div>/gi, '\n');
  text = text.replace(/<div>/gi, '');

  // Processar listas
  text = text.replace(/<li>/gi, '• ');
  text = text.replace(/<\/li>/gi, '\n');
  text = text.replace(/<ul>|<\/ul>|<ol>|<\/ol>/gi, '\n');

  // Processar cabeçalhos
  text = text.replace(/<\/h[1-6]>/gi, '\n\n');
  text = text.replace(/<h[1-6][^>]*>/gi, '');

  // Remover outras tags HTML
  text = text.replace(/<[^>]+>/g, '');
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');

  // Limpar múltiplas quebras de linha excessivas (mais de 2 seguidas)
  text = text.replace(/\n{3,}/g, '\n\n');

  return text.trim();
}

// ═══════════════════════════════════════════════════════════════════════════
// CONVERSÃO TEXTO → HTML
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Converte texto puro em HTML, preservando quebras de linha
 */
export function plainTextToHtml(text: string): string {
  if (!text) return '';

  let html = text;

  // Escapar caracteres HTML especiais
  html = html.replace(/&/g, '&amp;');
  html = html.replace(/</g, '&lt;');
  html = html.replace(/>/g, '&gt;');

  // Converter quebras de linha em <br>
  html = html.replace(/\n/g, '<br>');

  return html;
}

// ═══════════════════════════════════════════════════════════════════════════
// LIMPEZA PARA EXPORTAÇÃO
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Limpa HTML para exportação para Google Docs/Word
 * Remove artefatos do Quill e Google Docs, converte estilos inline
 */
export function cleanHtmlForExport(html: string): string {
  if (!html) return '';

  // Preservar a formatação original
  let cleaned = html;

  // v1.20.7: Limpar artefatos do Google Docs ANTES de remover spans
  // Usar regex que NÃO atravessa outras tags span (evita greedy matching)
  let prevHtml;

  // 1. Remover wrapper docs-internal-guid (múltiplas passadas para spans aninhados)
  do {
    prevHtml = cleaned;
    cleaned = cleaned.replace(/<span\s+id="docs-internal-guid-[^"]*"[^>]*>([^<]*(?:<(?!span)[^<]*)*)<\/span>/gi, '$1');
  } while (cleaned !== prevHtml);

  // 2. Remover tags <font> (múltiplas passadas para aninhados)
  do {
    prevHtml = cleaned;
    cleaned = cleaned.replace(/<font[^>]*>([^<]*(?:<(?!font)[^<]*)*)<\/font>/gi, '$1');
  } while (cleaned !== prevHtml);

  // 3. Converter font-weight: 700/bold para <strong> (só spans sem spans internos)
  do {
    prevHtml = cleaned;
    cleaned = cleaned.replace(/<span\s+style="[^"]*font-weight:\s*(?:700|bold)[^"]*"[^>]*>([^<]*(?:<(?!span)[^<]*)*)<\/span>/gi, '<strong>$1</strong>');
  } while (cleaned !== prevHtml);

  // 4. Converter font-style: italic para <em>
  do {
    prevHtml = cleaned;
    cleaned = cleaned.replace(/<span\s+style="[^"]*font-style:\s*italic[^"]*"[^>]*>([^<]*(?:<(?!span)[^<]*)*)<\/span>/gi, '<em>$1</em>');
  } while (cleaned !== prevHtml);

  // 5. Remover spans com estilos desnecessários do Google Docs
  do {
    prevHtml = cleaned;
    cleaned = cleaned.replace(/<span\s+style="[^"]*(?:font-family|font-size|background-color|font-variant|vertical-align)[^"]*"[^>]*>([^<]*(?:<(?!span)[^<]*)*)<\/span>/gi, '$1');
  } while (cleaned !== prevHtml);

  // 6. Limpar <strong>/<em> vazios e mesclar adjacentes
  cleaned = cleaned.replace(/<strong>\s*<\/strong>/gi, '');
  cleaned = cleaned.replace(/<em>\s*<\/em>/gi, '');
  cleaned = cleaned.replace(/<\/strong>\s*<strong>/gi, '');
  cleaned = cleaned.replace(/<\/em>\s*<em>/gi, '');

  // Normalizar quebras de linha
  cleaned = cleaned.replace(/<br\s*\/?>/gi, '<br>');

  // v1.20.7: Remover atributos style/class de tags de formatação (Quill adiciona estilos inline)
  cleaned = cleaned.replace(/<(strong|em|b|i|u)(\s+[^>]*)>/gi, '<$1>');

  // Normalizar tags de formatação
  cleaned = cleaned.replace(/<strong>/gi, '<b>');
  cleaned = cleaned.replace(/<\/strong>/gi, '</b>');
  cleaned = cleaned.replace(/<em>/gi, '<i>');
  cleaned = cleaned.replace(/<\/em>/gi, '</i>');

  // Remover divs vazias e spans desnecessários
  cleaned = cleaned.replace(/<div><\/div>/gi, '');
  cleaned = cleaned.replace(/<span[^>]*>(.*?)<\/span>/gi, '$1');

  // Converter quebras de linha duplas em parágrafos
  cleaned = cleaned.replace(/(<br>\s*<br>)/gi, '</p><p>');

  // Se não começa com <p>, envolver em <p>
  if (!cleaned.trim().startsWith('<p') && !cleaned.trim().startsWith('<ul') && !cleaned.trim().startsWith('<ol') && !cleaned.trim().startsWith('<h')) {
    cleaned = '<p>' + cleaned + '</p>';
  }

  // Limpar parágrafos vazios
  cleaned = cleaned.replace(/<p><\/p>/gi, '');
  cleaned = cleaned.replace(/<p>\s*<\/p>/gi, '');

  // v1.36.5: Converter classes de alinhamento do Quill para inline styles
  // Quill gera: <p class="ql-align-center">
  // Google Docs precisa: <p style="text-align: center;">
  cleaned = cleaned.replace(
    /<(p|div|h[1-6])\s+class="ql-align-(center|right|justify)"([^>]*)>/gi,
    (match: string, tag: string, align: string, rest: string) => {
      // Se já tem style, adicionar text-align a ele
      if (rest.includes('style="')) {
        return `<${tag}${rest.replace('style="', `style="text-align: ${align}; `)}>`;
      }
      return `<${tag} style="text-align: ${align};"${rest}>`;
    }
  );

  // v1.36.7: Converter listas bullet do Quill para <ul>
  // Quill usa <ol> para ambos os tipos, diferenciando via data-list="bullet"|"ordered"
  // Google Docs não entende data-list, então converter para <ul>/<ol> corretos
  cleaned = cleaned.replace(
    /<ol>([\s\S]*?)<\/ol>/gi,
    (match: string, content: string) => {
      if (content.includes('data-list="bullet"')) {
        // Converter para <ul> e remover data-list
        const newContent = content.replace(/\s*data-list="bullet"/gi, '');
        return `<ul>${newContent}</ul>`;
      }
      // Manter como <ol> e remover data-list="ordered"
      const newContent = content.replace(/\s*data-list="ordered"/gi, '');
      return `<ol>${newContent}</ol>`;
    }
  );

  // v1.36.6: Converter classes de indentação do Quill para inline styles
  // Quill gera: <p class="ql-indent-1"> ou <li class="ql-indent-2">
  // Google Docs precisa: <p style="margin-left: 3em;">
  cleaned = cleaned.replace(
    /<(p|li)([^>]*)\s+class="([^"]*ql-indent-(\d+)[^"]*)"([^>]*)>/gi,
    (match: string, tag: string, before: string, classes: string, level: string, after: string) => {
      const marginLeft = `${parseInt(level) * 3}em`;
      const newClasses = classes.replace(/ql-indent-\d+/g, '').trim();
      const classAttr = newClasses ? ` class="${newClasses}"` : '';
      // Verificar se já tem style
      const fullTag = before + after;
      if (fullTag.includes('style="')) {
        return `<${tag}${before}${classAttr}${after.replace('style="', `style="margin-left: ${marginLeft}; `)}>`;
      }
      return `<${tag}${before}${classAttr} style="margin-left: ${marginLeft};"${after}>`;
    }
  );

  // v1.36.7: Converter blockquote para estilo inline
  // Google Docs não suporta border-left, usar margin-left + italic
  cleaned = cleaned.replace(
    /<blockquote(?![^>]*style=)>/gi,
    '<blockquote style="margin-left: 2em; font-style: italic; color: #666;">'
  );

  // Adicionar estilos inline em parágrafos, preservando alinhamento do usuário
  cleaned = cleaned.replace(
    /<p(?![^>]*style=)>/gi,
    `<p style="${EXPORT_STYLES.p}">`
  );
  cleaned = cleaned.replace(
    /<p\s+style="([^"]*)">/gi,
    (match: string, existingStyles: string) => {
      if (!existingStyles.includes('text-align')) {
        return `<p style="${existingStyles}; text-align: justify;">`;
      }
      return match; // Preserva o text-align definido pelo usuário (center, right, etc.)
    }
  );

  return cleaned.trim();
}

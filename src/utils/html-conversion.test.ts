/**
 * @file html-conversion.test.ts
 * @description Testes para utilitários de conversão HTML
 * Cobre TODAS as funções exportadas: htmlToPlainText, htmlToFormattedText,
 * plainTextToHtml, cleanHtmlForExport
 */

import { describe, it, expect, vi } from 'vitest';
import {
  htmlToPlainText,
  htmlToFormattedText,
  plainTextToHtml,
  cleanHtmlForExport,
} from './html-conversion';

// Mock sanitizeHTML para retornar o input sem alteração (função pura testada separadamente)
vi.mock('./sanitizeHTML', () => ({
  sanitizeHTML: (html: string) => html,
}));

// Mock EXPORT_STYLES
vi.mock('../constants/export-styles', () => ({
  EXPORT_STYLES: {
    p: 'text-align: justify; margin: 0 0 12px 0; font-family: Times New Roman, serif; font-size: 12pt; line-height: 1.5;',
  },
}));

describe('html-conversion utilities', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // htmlToPlainText
  // ═══════════════════════════════════════════════════════════════════════════

  describe('htmlToPlainText', () => {
    it('should convert simple HTML to plain text', () => {
      const result = htmlToPlainText('<p>Hello World</p>');
      expect(result).toBe('Hello World');
    });

    it('should strip all HTML tags', () => {
      const result = htmlToPlainText('<b>Bold</b> and <i>italic</i>');
      expect(result).toBe('Bold and italic');
    });

    it('should handle nested HTML elements', () => {
      const result = htmlToPlainText('<div><p><strong>Deep</strong> nesting</p></div>');
      expect(result).toBe('Deep nesting');
    });

    it('should return empty string for empty HTML', () => {
      const result = htmlToPlainText('');
      expect(result).toBe('');
    });

    it('should handle HTML with no text content', () => {
      const result = htmlToPlainText('<div><br></div>');
      expect(result).toBe('');
    });

    it('should handle plain text input (no tags)', () => {
      const result = htmlToPlainText('just plain text');
      expect(result).toBe('just plain text');
    });

    it('should handle special characters in HTML', () => {
      const result = htmlToPlainText('<p>&amp; &lt; &gt; &quot;</p>');
      expect(result).toBe('& < > "');
    });

    it('should handle lists', () => {
      const result = htmlToPlainText('<ul><li>Item 1</li><li>Item 2</li></ul>');
      expect(result).toBe('Item 1Item 2');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // htmlToFormattedText
  // ═══════════════════════════════════════════════════════════════════════════

  describe('htmlToFormattedText', () => {
    describe('empty and null input', () => {
      it('should return empty string for empty input', () => {
        expect(htmlToFormattedText('')).toBe('');
      });

      it('should return empty string for null-like input', () => {
        expect(htmlToFormattedText(null as unknown as string)).toBe('');
        expect(htmlToFormattedText(undefined as unknown as string)).toBe('');
      });
    });

    describe('plain text (no significant HTML)', () => {
      it('should double newlines for plain text', () => {
        const result = htmlToFormattedText('Line 1\nLine 2');
        expect(result).toBe('Line 1\n\nLine 2');
      });

      it('should clean up excessive newlines in plain text', () => {
        const result = htmlToFormattedText('Line 1\n\n\nLine 2');
        // \n\n\n -> each \n becomes \n\n -> \n\n\n\n\n\n -> cleaned to \n\n
        expect(result).toBe('Line 1\n\nLine 2');
      });

      it('should trim whitespace from plain text result', () => {
        const result = htmlToFormattedText('  hello  ');
        expect(result).toBe('hello');
      });

      it('should handle text with only spans (not significant HTML)', () => {
        const result = htmlToFormattedText('<span>no significant tags</span>');
        // <span> is not in the significant tags list
        expect(result).toContain('no significant tags');
      });
    });

    describe('HTML with significant tags', () => {
      it('should remove bold/strong tags', () => {
        const result = htmlToFormattedText('<p><b>Bold</b> and <strong>Strong</strong></p>');
        expect(result).toContain('Bold');
        expect(result).toContain('Strong');
        expect(result).not.toContain('<b>');
        expect(result).not.toContain('<strong>');
      });

      it('should remove italic/em tags', () => {
        const result = htmlToFormattedText('<p><i>Italic</i> and <em>Emphasis</em></p>');
        expect(result).toContain('Italic');
        expect(result).toContain('Emphasis');
        expect(result).not.toContain('<i>');
        expect(result).not.toContain('<em>');
      });

      it('should remove underline tags', () => {
        const result = htmlToFormattedText('<p><u>Underlined</u></p>');
        expect(result).toContain('Underlined');
        expect(result).not.toContain('<u>');
      });

      it('should convert <br> to newline', () => {
        const result = htmlToFormattedText('<p>Line 1<br>Line 2</p>');
        expect(result).toContain('Line 1\nLine 2');
      });

      it('should convert <br /> (self-closing) to newline', () => {
        const result = htmlToFormattedText('<p>A<br />B</p>');
        expect(result).toContain('A\nB');
      });

      it('should convert </p> to double newline', () => {
        const result = htmlToFormattedText('<p>Para 1</p><p>Para 2</p>');
        expect(result).toContain('Para 1\n\nPara 2');
      });

      it('should handle divs as newlines', () => {
        const result = htmlToFormattedText('<div>Div 1</div><div>Div 2</div>');
        expect(result).toContain('Div 1\nDiv 2');
      });

      it('should convert list items with bullet points', () => {
        const result = htmlToFormattedText('<ul><li>Item A</li><li>Item B</li></ul>');
        expect(result).toContain('• Item A');
        expect(result).toContain('• Item B');
      });

      it('should handle ordered lists', () => {
        const result = htmlToFormattedText('<ol><li>First</li><li>Second</li></ol>');
        expect(result).toContain('• First');
        expect(result).toContain('• Second');
      });

      it('should handle headings with double newline after', () => {
        const result = htmlToFormattedText('<h1>Title</h1><p>Content</p>');
        expect(result).toContain('Title\n\nContent');
      });

      it('should handle h2-h6 headings', () => {
        const result = htmlToFormattedText('<h2>Subtitle</h2><p>Text</p>');
        expect(result).toContain('Subtitle\n\nText');
      });

      it('should handle headings with attributes', () => {
        const result = htmlToFormattedText('<h3 class="heading">Heading</h3>');
        expect(result).toContain('Heading');
        expect(result).not.toContain('class=');
      });

      it('should decode &nbsp; to space', () => {
        const result = htmlToFormattedText('<p>word1&nbsp;word2</p>');
        expect(result).toContain('word1 word2');
      });

      it('should decode &amp; to &', () => {
        const result = htmlToFormattedText('<p>A &amp; B</p>');
        expect(result).toContain('A & B');
      });

      it('should decode &lt; and &gt;', () => {
        const result = htmlToFormattedText('<p>&lt;tag&gt;</p>');
        expect(result).toContain('<tag>');
      });

      it('should decode &quot;', () => {
        const result = htmlToFormattedText('<p>&quot;quoted&quot;</p>');
        expect(result).toContain('"quoted"');
      });

      it('should remove remaining unknown HTML tags', () => {
        const result = htmlToFormattedText('<p><span class="test">text</span></p>');
        expect(result).toContain('text');
        expect(result).not.toContain('<span');
      });

      it('should limit consecutive newlines to 2', () => {
        const result = htmlToFormattedText('<p>A</p><br><br><br><p>B</p>');
        expect(result).not.toMatch(/\n{3,}/);
      });

      it('should trim the final result', () => {
        const result = htmlToFormattedText('<p>  Content  </p>');
        expect(result).toBe('Content');
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // plainTextToHtml
  // ═══════════════════════════════════════════════════════════════════════════

  describe('plainTextToHtml', () => {
    it('should return empty string for empty input', () => {
      expect(plainTextToHtml('')).toBe('');
    });

    it('should return empty string for null-like input', () => {
      expect(plainTextToHtml(null as unknown as string)).toBe('');
      expect(plainTextToHtml(undefined as unknown as string)).toBe('');
    });

    it('should escape & to &amp;', () => {
      const result = plainTextToHtml('A & B');
      expect(result).toBe('A &amp; B');
    });

    it('should escape < to &lt;', () => {
      const result = plainTextToHtml('a < b');
      expect(result).toBe('a &lt; b');
    });

    it('should escape > to &gt;', () => {
      const result = plainTextToHtml('a > b');
      expect(result).toBe('a &gt; b');
    });

    it('should convert newlines to <br>', () => {
      const result = plainTextToHtml('Line 1\nLine 2');
      expect(result).toBe('Line 1<br>Line 2');
    });

    it('should handle multiple newlines', () => {
      const result = plainTextToHtml('A\n\nB\n\n\nC');
      expect(result).toBe('A<br><br>B<br><br><br>C');
    });

    it('should escape all special characters together', () => {
      const result = plainTextToHtml('<script>alert("XSS")</script>\n& more');
      expect(result).toBe('&lt;script&gt;alert("XSS")&lt;/script&gt;<br>&amp; more');
    });

    it('should preserve regular text unchanged', () => {
      const result = plainTextToHtml('Hello World');
      expect(result).toBe('Hello World');
    });

    it('should handle text with only special characters', () => {
      const result = plainTextToHtml('<<<>>>');
      expect(result).toBe('&lt;&lt;&lt;&gt;&gt;&gt;');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // cleanHtmlForExport
  // ═══════════════════════════════════════════════════════════════════════════

  describe('cleanHtmlForExport', () => {
    describe('empty input', () => {
      it('should return empty string for empty input', () => {
        expect(cleanHtmlForExport('')).toBe('');
      });

      it('should return empty string for null-like input', () => {
        expect(cleanHtmlForExport(null as unknown as string)).toBe('');
        expect(cleanHtmlForExport(undefined as unknown as string)).toBe('');
      });
    });

    describe('Google Docs cleanup', () => {
      it('should remove docs-internal-guid spans', () => {
        const html = '<span id="docs-internal-guid-abc123" style="font-size:12pt">Content</span>';
        const result = cleanHtmlForExport(html);
        expect(result).not.toContain('docs-internal-guid');
        expect(result).toContain('Content');
      });

      it('should handle nested docs-internal-guid spans', () => {
        const html = '<span id="docs-internal-guid-abc">outer <span id="docs-internal-guid-def">inner</span></span>';
        const result = cleanHtmlForExport(html);
        expect(result).not.toContain('docs-internal-guid');
        expect(result).toContain('outer');
        expect(result).toContain('inner');
      });

      it('should remove <font> tags preserving content', () => {
        const html = '<font face="Arial">Formatted</font>';
        const result = cleanHtmlForExport(html);
        expect(result).not.toContain('<font');
        expect(result).toContain('Formatted');
      });

      it('should handle nested <font> tags', () => {
        const html = '<font size="3"><font color="red">Nested</font></font>';
        const result = cleanHtmlForExport(html);
        expect(result).not.toContain('<font');
        expect(result).toContain('Nested');
      });

      it('should convert font-weight: 700 to <strong>', () => {
        const html = '<span style="font-weight: 700">Bold text</span>';
        const result = cleanHtmlForExport(html);
        expect(result).toContain('<b>Bold text</b>');
      });

      it('should convert font-weight: bold to <strong>', () => {
        const html = '<span style="font-weight: bold">Bold text</span>';
        const result = cleanHtmlForExport(html);
        expect(result).toContain('<b>Bold text</b>');
      });

      it('should convert font-style: italic to <em>', () => {
        const html = '<span style="font-style: italic">Italic text</span>';
        const result = cleanHtmlForExport(html);
        expect(result).toContain('<i>Italic text</i>');
      });

      it('should remove spans with font-family styles', () => {
        const html = '<p><span style="font-family: Arial, sans-serif">Text</span></p>';
        const result = cleanHtmlForExport(html);
        expect(result).not.toContain('<span');
        expect(result).toContain('Text');
      });

      it('should remove spans with font-size styles', () => {
        const html = '<p><span style="font-size: 14pt">Text</span></p>';
        const result = cleanHtmlForExport(html);
        expect(result).not.toContain('<span');
        expect(result).toContain('Text');
      });

      it('should remove spans with background-color styles', () => {
        const html = '<span style="background-color: yellow">Text</span>';
        const result = cleanHtmlForExport(html);
        expect(result).not.toContain('background-color');
        expect(result).toContain('Text');
      });

      it('should remove spans with font-variant styles', () => {
        const html = '<span style="font-variant: small-caps">Text</span>';
        const result = cleanHtmlForExport(html);
        expect(result).not.toContain('font-variant');
        expect(result).toContain('Text');
      });

      it('should remove spans with vertical-align styles', () => {
        const html = '<span style="vertical-align: super">Text</span>';
        const result = cleanHtmlForExport(html);
        expect(result).not.toContain('vertical-align');
        expect(result).toContain('Text');
      });
    });

    describe('empty tag cleanup', () => {
      it('should remove empty <strong> tags', () => {
        const html = '<p>Before<strong>  </strong>After</p>';
        const result = cleanHtmlForExport(html);
        expect(result).not.toMatch(/<b>\s*<\/b>/);
      });

      it('should remove empty <em> tags', () => {
        const html = '<p>Before<em>  </em>After</p>';
        const result = cleanHtmlForExport(html);
        expect(result).not.toMatch(/<i>\s*<\/i>/);
      });

      it('should merge adjacent <strong> tags (space consumed by merge)', () => {
        const html = '<p><strong>Part 1</strong><strong>Part 2</strong></p>';
        // Adjacent </strong><strong> gets merged (space between them triggers merge)
        const result = cleanHtmlForExport(html);
        expect(result).toContain('Part 1Part 2');
        // Should not have </b><b> in output
        expect(result).not.toContain('</b><b>');
      });

      it('should merge adjacent <em> tags', () => {
        const html = '<p><em>Part 1</em><em>Part 2</em></p>';
        const result = cleanHtmlForExport(html);
        expect(result).toContain('Part 1Part 2');
        expect(result).not.toContain('</i><i>');
      });
    });

    describe('tag normalization', () => {
      it('should normalize <br /> to <br>', () => {
        const html = '<p>Line 1<br />Line 2</p>';
        const result = cleanHtmlForExport(html);
        expect(result).not.toContain('<br />');
        expect(result).toContain('<br>');
      });

      it('should normalize <br/> to <br>', () => {
        const html = '<p>Line 1<br/>Line 2</p>';
        const result = cleanHtmlForExport(html);
        expect(result).not.toContain('<br/>');
      });

      it('should remove attributes from formatting tags', () => {
        const html = '<p><strong class="ql-bold" style="color:red">Bold</strong></p>';
        const result = cleanHtmlForExport(html);
        expect(result).toContain('<b>Bold</b>');
        expect(result).not.toContain('class=');
      });

      it('should normalize <strong> to <b>', () => {
        const html = '<p><strong>Bold</strong></p>';
        const result = cleanHtmlForExport(html);
        expect(result).toContain('<b>Bold</b>');
      });

      it('should normalize <em> to <i>', () => {
        const html = '<p><em>Italic</em></p>';
        const result = cleanHtmlForExport(html);
        expect(result).toContain('<i>Italic</i>');
      });

      it('should remove empty divs', () => {
        const html = '<p>Content</p><div></div>';
        const result = cleanHtmlForExport(html);
        expect(result).not.toContain('<div></div>');
      });

      it('should unwrap remaining spans', () => {
        const html = '<p><span class="custom">Unwrapped</span></p>';
        const result = cleanHtmlForExport(html);
        expect(result).not.toContain('<span');
        expect(result).toContain('Unwrapped');
      });
    });

    describe('paragraph handling', () => {
      it('should convert double <br> to paragraph breaks', () => {
        const html = '<p>Para 1<br><br>Para 2</p>';
        const result = cleanHtmlForExport(html);
        expect(result).toContain('</p><p');
      });

      it('should wrap content in <p> if not starting with block tags', () => {
        const html = 'Plain text content';
        const result = cleanHtmlForExport(html);
        expect(result).toMatch(/^<p[^>]*>Plain text content<\/p>$/);
      });

      it('should NOT wrap content starting with <p>', () => {
        const html = '<p>Already wrapped</p>';
        const result = cleanHtmlForExport(html);
        // Should not have double <p> wrapper
        expect(result).not.toMatch(/^<p[^>]*><p/);
      });

      it('should NOT wrap content starting with <ul>', () => {
        const html = '<ul><li>Item</li></ul>';
        const result = cleanHtmlForExport(html);
        expect(result).not.toMatch(/^<p/);
      });

      it('should NOT wrap content starting with <ol>', () => {
        const html = '<ol><li>Item</li></ol>';
        const result = cleanHtmlForExport(html);
        expect(result).not.toMatch(/^<p/);
      });

      it('should NOT wrap content starting with <h1>', () => {
        const html = '<h1>Title</h1>';
        const result = cleanHtmlForExport(html);
        expect(result).not.toMatch(/^<p/);
      });

      it('should remove empty paragraphs', () => {
        const html = '<p>Content</p><p></p><p>More</p>';
        const result = cleanHtmlForExport(html);
        expect(result).not.toMatch(/<p[^>]*><\/p>/);
      });

      it('should remove paragraphs with only whitespace', () => {
        const html = '<p>Content</p><p>   </p>';
        const result = cleanHtmlForExport(html);
        expect(result).not.toMatch(/<p[^>]*>\s*<\/p>/);
      });
    });

    describe('Quill alignment classes (v1.36.5)', () => {
      it('should convert ql-align-center to text-align: center', () => {
        const html = '<p class="ql-align-center">Centered</p>';
        const result = cleanHtmlForExport(html);
        expect(result).toContain('text-align: center');
        expect(result).toContain('Centered');
      });

      it('should convert ql-align-right to text-align: right', () => {
        const html = '<p class="ql-align-right">Right aligned</p>';
        const result = cleanHtmlForExport(html);
        expect(result).toContain('text-align: right');
      });

      it('should convert ql-align-justify to text-align: justify', () => {
        const html = '<p class="ql-align-justify">Justified</p>';
        const result = cleanHtmlForExport(html);
        expect(result).toContain('text-align: justify');
      });

      it('should handle alignment on div elements', () => {
        const html = '<div class="ql-align-center">Centered div</div>';
        const result = cleanHtmlForExport(html);
        expect(result).toContain('text-align: center');
      });

      it('should handle alignment on heading elements', () => {
        const html = '<h2 class="ql-align-center">Centered heading</h2>';
        const result = cleanHtmlForExport(html);
        expect(result).toContain('text-align: center');
      });

      it('should add alignment to existing style attribute', () => {
        const html = '<p class="ql-align-center" style="color: red;">Centered</p>';
        const result = cleanHtmlForExport(html);
        expect(result).toContain('text-align: center');
        expect(result).toContain('color: red');
      });

      it('should create new style when no existing style', () => {
        const html = '<p class="ql-align-right">Right</p>';
        const result = cleanHtmlForExport(html);
        expect(result).toContain('style="text-align: right;"');
      });
    });

    describe('Quill list conversion (v1.36.7)', () => {
      it('should convert Quill bullet list to <ul>', () => {
        const html = '<ol><li data-list="bullet">Item 1</li><li data-list="bullet">Item 2</li></ol>';
        const result = cleanHtmlForExport(html);
        expect(result).toContain('<ul>');
        expect(result).toContain('</ul>');
        expect(result).not.toContain('data-list="bullet"');
      });

      it('should keep ordered list as <ol> and remove data-list attribute', () => {
        const html = '<ol><li data-list="ordered">First</li><li data-list="ordered">Second</li></ol>';
        const result = cleanHtmlForExport(html);
        expect(result).toContain('<ol>');
        expect(result).toContain('</ol>');
        expect(result).not.toContain('data-list="ordered"');
      });

      it('should keep <ol> without data-list as <ol>', () => {
        const html = '<ol><li>Regular item</li></ol>';
        const result = cleanHtmlForExport(html);
        expect(result).toContain('<ol>');
        expect(result).toContain('</ol>');
      });
    });

    describe('Quill indentation classes (v1.36.6) - lines 229-237', () => {
      it('should convert ql-indent-1 to margin-left: 3em', () => {
        const html = '<p class="ql-indent-1">Indented paragraph</p>';
        const result = cleanHtmlForExport(html);
        expect(result).toContain('margin-left: 3em');
        expect(result).toContain('Indented paragraph');
      });

      it('should convert ql-indent-2 to margin-left: 6em', () => {
        const html = '<p class="ql-indent-2">Double indented</p>';
        const result = cleanHtmlForExport(html);
        expect(result).toContain('margin-left: 6em');
      });

      it('should convert ql-indent-3 to margin-left: 9em', () => {
        const html = '<p class="ql-indent-3">Triple indented</p>';
        const result = cleanHtmlForExport(html);
        expect(result).toContain('margin-left: 9em');
      });

      it('should handle ql-indent on <li> elements', () => {
        const html = '<ul><li class="ql-indent-1">Indented item</li></ul>';
        const result = cleanHtmlForExport(html);
        expect(result).toContain('margin-left: 3em');
        expect(result).toContain('Indented item');
      });

      it('should remove ql-indent class and keep other classes', () => {
        const html = '<p class="custom-class ql-indent-1 another-class">Mixed classes</p>';
        const result = cleanHtmlForExport(html);
        expect(result).toContain('margin-left: 3em');
        expect(result).not.toContain('ql-indent-1');
        expect(result).toContain('custom-class');
        expect(result).toContain('another-class');
      });

      it('should remove class attribute entirely when ql-indent is the only class', () => {
        const html = '<p class="ql-indent-2">Only indent</p>';
        const result = cleanHtmlForExport(html);
        expect(result).toContain('margin-left: 6em');
        expect(result).not.toContain('class="ql-indent');
      });

      it('should add margin-left to existing style attribute (line 234-235)', () => {
        const html = '<p class="ql-indent-1" style="color: blue;">Indented with style</p>';
        const result = cleanHtmlForExport(html);
        expect(result).toContain('margin-left: 3em');
        expect(result).toContain('color: blue');
      });

      it('should create new style when no existing style (line 237)', () => {
        const html = '<li class="ql-indent-2">Indented li</li>';
        const result = cleanHtmlForExport(html);
        expect(result).toContain('style="margin-left: 6em;"');
      });
    });

    describe('blockquote conversion (v1.36.7)', () => {
      it('should add inline styles to blockquote without style', () => {
        const html = '<blockquote>Quoted text</blockquote>';
        const result = cleanHtmlForExport(html);
        expect(result).toContain('margin-left: 2em');
        expect(result).toContain('font-style: italic');
        expect(result).toContain('color: #666');
      });

      it('should NOT modify blockquote that already has style', () => {
        const html = '<blockquote style="border-left: 3px solid blue;">Already styled</blockquote>';
        const result = cleanHtmlForExport(html);
        expect(result).toContain('border-left: 3px solid blue');
      });
    });

    describe('paragraph export styles', () => {
      it('should add EXPORT_STYLES.p to paragraphs without style', () => {
        const html = '<p>Plain paragraph</p>';
        const result = cleanHtmlForExport(html);
        expect(result).toContain('text-align: justify');
        expect(result).toContain('font-family: Times New Roman');
      });

      it('should add text-align: justify to paragraphs with style but no text-align (line 257)', () => {
        const html = '<p style="color: red;">Styled paragraph</p>';
        const result = cleanHtmlForExport(html);
        expect(result).toContain('text-align: justify');
        expect(result).toContain('color: red');
      });

      it('should preserve user-defined text-align (line 259)', () => {
        const html = '<p style="text-align: center;">Centered</p>';
        const result = cleanHtmlForExport(html);
        expect(result).toContain('text-align: center');
        // Should NOT override with justify
        expect(result).not.toContain('text-align: justify');
      });

      it('should preserve text-align: right', () => {
        const html = '<p style="text-align: right;">Right</p>';
        const result = cleanHtmlForExport(html);
        expect(result).toContain('text-align: right');
        expect(result).not.toContain('text-align: justify');
      });
    });

    describe('trim and final output', () => {
      it('should trim the final result', () => {
        const html = '  <p>Content</p>  ';
        const result = cleanHtmlForExport(html);
        expect(result).not.toMatch(/^\s/);
        expect(result).not.toMatch(/\s$/);
      });
    });

    describe('complex/combined scenarios', () => {
      it('should handle Google Docs paste with multiple artifacts', () => {
        const html = '<span id="docs-internal-guid-xyz"><span style="font-weight: 700">Bold from GDocs</span></span>';
        const result = cleanHtmlForExport(html);
        expect(result).toContain('<b>Bold from GDocs</b>');
        expect(result).not.toContain('docs-internal-guid');
      });

      it('should handle Quill editor output with alignment and indentation separately', () => {
        // Alignment regex expects class to be exactly "ql-align-X" (not combined with ql-indent)
        // So test them independently
        const alignHtml = '<p class="ql-align-center">Centered</p>';
        const alignResult = cleanHtmlForExport(alignHtml);
        expect(alignResult).toContain('text-align: center');

        const indentHtml = '<p class="ql-indent-1">Indented</p>';
        const indentResult = cleanHtmlForExport(indentHtml);
        expect(indentResult).toContain('margin-left: 3em');
      });

      it('should handle mixed formatting correctly', () => {
        const html = '<p><strong class="ql-bold">Bold</strong> and <em>italic</em> text</p>';
        const result = cleanHtmlForExport(html);
        expect(result).toContain('<b>Bold</b>');
        expect(result).toContain('<i>italic</i>');
        expect(result).toContain('text');
      });

      it('should handle malformed HTML gracefully', () => {
        const html = '<p>Unclosed paragraph';
        const result = cleanHtmlForExport(html);
        expect(result).toContain('Unclosed paragraph');
      });

      it('should handle HTML with only whitespace content', () => {
        const html = '<p>   </p>';
        const result = cleanHtmlForExport(html);
        // Empty paragraphs with only spaces are cleaned
        expect(result).toBe('');
      });

      it('should handle content with multiple formatting layers from Google Docs', () => {
        const html = '<span style="font-family: Arial"><span style="font-size: 11pt"><span style="font-weight: bold">Multiple layers</span></span></span>';
        const result = cleanHtmlForExport(html);
        expect(result).toContain('Multiple layers');
        // The Google Docs span styles are removed but EXPORT_STYLES.p adds font-family
        // So we check the original GDocs styles are NOT present as span attributes
        expect(result).not.toContain('<span');
        expect(result).toContain('<b>Multiple layers</b>');
      });
    });
  });
});

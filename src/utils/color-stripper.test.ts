import { describe, it, expect } from 'vitest';
import { stripInlineColors } from './color-stripper';

describe('stripInlineColors', () => {
  it('should return empty string for null/undefined', () => {
    expect(stripInlineColors(null as unknown as string)).toBe('');
    expect(stripInlineColors(undefined as unknown as string)).toBe('');
    expect(stripInlineColors('')).toBe('');
  });

  it('should remove color: rgb() styles', () => {
    const html = '<p style="color: rgb(0, 0, 0);">Texto</p>';
    const result = stripInlineColors(html);
    expect(result).not.toContain('color');
    expect(result).toContain('Texto');
  });

  it('should remove color: rgba() styles', () => {
    const html = '<span style="color: rgba(255, 0, 0, 0.5);">Red</span>';
    const result = stripInlineColors(html);
    expect(result).not.toContain('rgba');
  });

  it('should remove color: hex styles', () => {
    const html = '<p style="color: #333333;">Text</p>';
    const result = stripInlineColors(html);
    expect(result).not.toContain('#333333');
  });

  it('should remove color: named color styles', () => {
    const html = '<span style="color: red;">Alert</span>';
    const result = stripInlineColors(html);
    expect(result).not.toContain('color: red');
  });

  it('should remove background-color styles', () => {
    const html = '<p style="background-color: yellow;">Highlighted</p>';
    const result = stripInlineColors(html);
    expect(result).not.toContain('background-color');
  });

  it('should remove background: color values', () => {
    const html = '<div style="background: rgb(255, 255, 0);">Box</div>';
    const result = stripInlineColors(html);
    expect(result).not.toContain('background');
  });

  it('should remove background: hex values', () => {
    const html = '<p style="background: #fff;">White</p>';
    const result = stripInlineColors(html);
    expect(result).not.toContain('#fff');
  });

  it('should remove background: transparent', () => {
    const html = '<p style="background: transparent;">Clear</p>';
    const result = stripInlineColors(html);
    expect(result).not.toContain('transparent');
  });

  it('should preserve non-color styles (font-weight, text-align)', () => {
    const html = '<p style="font-weight: bold; color: red; text-align: center;">Text</p>';
    const result = stripInlineColors(html);
    expect(result).toContain('font-weight: bold');
    expect(result).toContain('text-align: center');
    expect(result).not.toContain('color: red');
  });

  it('should clean up empty style attributes', () => {
    const html = '<p style="color: #000;">Only color</p>';
    const result = stripInlineColors(html);
    expect(result).not.toContain('style=""');
    expect(result).not.toContain("style=''");
  });

  it('should clean up style with only semicolons left', () => {
    const html = '<p style="; ;">Residual</p>';
    const result = stripInlineColors(html);
    expect(result).not.toMatch(/style\s*=\s*["'][\s;]+["']/);
  });

  it('should handle multiple elements with colors', () => {
    const html = '<p style="color: blue;">One</p><span style="color: green;">Two</span>';
    const result = stripInlineColors(html);
    expect(result).not.toContain('blue');
    expect(result).not.toContain('green');
    expect(result).toContain('One');
    expect(result).toContain('Two');
  });

  it('should pass through HTML without styles unchanged', () => {
    const html = '<p><strong>Bold</strong> and <em>italic</em></p>';
    expect(stripInlineColors(html)).toBe(html);
  });

  it('should handle non-string input gracefully', () => {
    // Function returns `html || ''` for non-strings; 123 is truthy so returns 123
    expect(stripInlineColors(123 as unknown as string)).toBe(123);
  });
});

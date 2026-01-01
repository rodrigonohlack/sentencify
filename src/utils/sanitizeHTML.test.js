// Testes de segurança para sanitizeHTML
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sanitizeHTML, SANITIZE_CONFIG } from './sanitizeHTML';

// Mock do DOMPurify que simula comportamento real
const createMockDOMPurify = () => ({
  sanitize: vi.fn((dirty, config) => {
    if (!dirty) return '';
    
    let result = dirty;
    
    // Remove tags não permitidas (simula DOMPurify)
    const allowedTags = config?.ALLOWED_TAGS || [];
    
    // Remove <script> e conteúdo
    result = result.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    
    // Remove tags não permitidas mas mantém conteúdo (KEEP_CONTENT: true)
    const tagRegex = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi;
    result = result.replace(tagRegex, (match, tagName) => {
      if (allowedTags.includes(tagName.toLowerCase())) {
        // Remove atributos perigosos mesmo de tags permitidas
        return match
          .replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '') // onclick, onerror, etc
          .replace(/\s+javascript\s*:/gi, '');
      }
      return config?.KEEP_CONTENT ? '' : '';
    });
    
    return result;
  })
});

describe('sanitizeHTML', () => {
  let mockDOMPurify;

  beforeEach(() => {
    mockDOMPurify = createMockDOMPurify();
  });

  describe('Tratamento de inputs inválidos', () => {
    it('deve retornar string vazia para null', () => {
      const result = sanitizeHTML(null, mockDOMPurify);
      expect(result).toBe('');
    });

    it('deve retornar string vazia para undefined', () => {
      const result = sanitizeHTML(undefined, mockDOMPurify);
      expect(result).toBe('');
    });

    it('deve retornar string vazia para string vazia', () => {
      const result = sanitizeHTML('', mockDOMPurify);
      expect(result).toBe('');
    });

    it('deve retornar string vazia para string com apenas espaços', () => {
      const result = sanitizeHTML('   ', mockDOMPurify);
      expect(result).toBe('');
    });

    it('deve converter número para string', () => {
      sanitizeHTML(123, mockDOMPurify);
      expect(mockDOMPurify.sanitize).toHaveBeenCalledWith('123', expect.any(Object));
    });
  });

  describe('Segurança XSS - Tags perigosas', () => {
    it('deve remover tags <script>', () => {
      const dirty = '<p>Texto</p><script>alert("XSS")</script>';
      const result = sanitizeHTML(dirty, mockDOMPurify);
      expect(result).not.toContain('<script');
      expect(result).not.toContain('alert');
    });

    it('deve remover tags <script> com atributos', () => {
      const dirty = '<script src="evil.js"></script><p>OK</p>';
      const result = sanitizeHTML(dirty, mockDOMPurify);
      expect(result).not.toContain('<script');
      expect(result).toContain('<p>OK</p>');
    });

    it('deve remover <script> inline', () => {
      const dirty = '<script>document.cookie</script>';
      const result = sanitizeHTML(dirty, mockDOMPurify);
      expect(result).not.toContain('document.cookie');
    });
  });

  describe('Segurança XSS - Atributos perigosos', () => {
    it('deve remover atributo onclick', () => {
      const dirty = '<p onclick="alert(1)">Texto</p>';
      const result = sanitizeHTML(dirty, mockDOMPurify);
      expect(result).not.toContain('onclick');
    });

    it('deve remover atributo onerror', () => {
      const dirty = '<img onerror="alert(1)" src="x">';
      const result = sanitizeHTML(dirty, mockDOMPurify);
      expect(result).not.toContain('onerror');
    });

    it('deve remover atributo onload', () => {
      const dirty = '<body onload="evil()"><p>Texto</p></body>';
      const result = sanitizeHTML(dirty, mockDOMPurify);
      expect(result).not.toContain('onload');
    });

    it('deve remover javascript: em href', () => {
      const dirty = '<a href="javascript:alert(1)">Link</a>';
      const result = sanitizeHTML(dirty, mockDOMPurify);
      expect(result).not.toContain('javascript:');
    });
  });

  describe('Tags permitidas', () => {
    it('deve preservar <p>', () => {
      const dirty = '<p>Parágrafo</p>';
      const result = sanitizeHTML(dirty, mockDOMPurify);
      expect(result).toContain('<p>');
    });

    it('deve preservar <strong> e <em>', () => {
      const dirty = '<strong>Negrito</strong> e <em>Itálico</em>';
      const result = sanitizeHTML(dirty, mockDOMPurify);
      expect(result).toContain('<strong>');
      expect(result).toContain('<em>');
    });

    it('deve preservar listas <ul> e <li>', () => {
      const dirty = '<ul><li>Item 1</li><li>Item 2</li></ul>';
      const result = sanitizeHTML(dirty, mockDOMPurify);
      expect(result).toContain('<ul>');
      expect(result).toContain('<li>');
    });

    it('deve preservar cabeçalhos h1-h6', () => {
      const dirty = '<h1>Título</h1><h2>Subtítulo</h2>';
      const result = sanitizeHTML(dirty, mockDOMPurify);
      expect(result).toContain('<h1>');
      expect(result).toContain('<h2>');
    });
  });

  describe('Configuração SANITIZE_CONFIG', () => {
    it('deve ter todas as tags de formatação permitidas', () => {
      expect(SANITIZE_CONFIG.ALLOWED_TAGS).toContain('strong');
      expect(SANITIZE_CONFIG.ALLOWED_TAGS).toContain('em');
      expect(SANITIZE_CONFIG.ALLOWED_TAGS).toContain('u');
      expect(SANITIZE_CONFIG.ALLOWED_TAGS).toContain('b');
      expect(SANITIZE_CONFIG.ALLOWED_TAGS).toContain('i');
    });

    it('deve ter tags de estrutura permitidas', () => {
      expect(SANITIZE_CONFIG.ALLOWED_TAGS).toContain('p');
      expect(SANITIZE_CONFIG.ALLOWED_TAGS).toContain('br');
      expect(SANITIZE_CONFIG.ALLOWED_TAGS).toContain('div');
      expect(SANITIZE_CONFIG.ALLOWED_TAGS).toContain('span');
    });

    it('deve ter KEEP_CONTENT como true', () => {
      expect(SANITIZE_CONFIG.KEEP_CONTENT).toBe(true);
    });

    it('não deve permitir tags perigosas', () => {
      expect(SANITIZE_CONFIG.ALLOWED_TAGS).not.toContain('script');
      expect(SANITIZE_CONFIG.ALLOWED_TAGS).not.toContain('iframe');
      expect(SANITIZE_CONFIG.ALLOWED_TAGS).not.toContain('object');
      expect(SANITIZE_CONFIG.ALLOWED_TAGS).not.toContain('embed');
    });
  });

  describe('Fallback sem DOMPurify', () => {
    it('deve retornar string vazia se DOMPurify não estiver disponível', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = sanitizeHTML('<p>Texto</p>', null);
      
      expect(result).toBe('');
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });
});

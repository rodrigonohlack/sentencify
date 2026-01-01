// Utilitário de sanitização HTML - protege contra XSS
// Extraído do App.jsx para facilitar testes

// Configuração padrão do DOMPurify
export const SANITIZE_CONFIG = {
  ALLOWED_TAGS: [
    'p', 'br', 'div', 'span',           // Estrutura
    'strong', 'b', 'em', 'i', 'u',      // Formatação básica
    'ul', 'ol', 'li',                    // Listas
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6'  // Cabeçalhos
  ],
  ALLOWED_ATTR: [
    'class', 'id', 'style'               // Atributos permitidos (limitados)
  ],
  ALLOWED_STYLES: {
    '*': {
      'font-weight': [/^bold$/],
      'font-style': [/^italic$/],
      'text-decoration': [/^underline$/]
    }
  },
  KEEP_CONTENT: true,
  RETURN_TRUSTED_TYPE: false
};

/**
 * Sanitiza HTML para prevenir XSS
 * @param {string} dirty - HTML não confiável
 * @param {object} DOMPurify - Instância do DOMPurify (opcional, usa window.DOMPurify por padrão)
 * @returns {string} HTML sanitizado
 */
export const sanitizeHTML = (dirty, DOMPurify = null) => {
  // Se input é null/undefined, retorna string vazia
  if (dirty == null) {
    return '';
  }

  // Converte para string se necessário
  const dirtyStr = String(dirty);

  // Se string vazia, retorna vazia
  if (dirtyStr.trim() === '') {
    return '';
  }

  // Obtém DOMPurify (parâmetro ou global)
  const purify = DOMPurify || (typeof window !== 'undefined' ? window.DOMPurify : null);

  // Se DOMPurify não estiver disponível, retorna string vazia para segurança
  if (!purify) {
    console.warn('[sanitizeHTML] DOMPurify não disponível - retornando string vazia');
    return '';
  }

  // Sanitiza com configuração segura
  return purify.sanitize(dirtyStr, SANITIZE_CONFIG);
};

export default sanitizeHTML;

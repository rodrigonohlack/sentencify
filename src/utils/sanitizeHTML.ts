/**
 * Utilitário de sanitização HTML - protege contra XSS
 * Extraído do App.jsx para facilitar testes
 *
 * @version 1.35.80 - Migrado para TypeScript
 */

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

/** Interface para DOMPurify */
interface DOMPurifyInstance {
  sanitize: (dirty: string, config?: SanitizeConfig) => string;
}

/** Configuração de sanitização */
interface SanitizeConfig {
  ALLOWED_TAGS: string[];
  ALLOWED_ATTR: string[];
  ALLOWED_STYLES?: Record<string, Record<string, RegExp[]>>;
  KEEP_CONTENT: boolean;
  RETURN_TRUSTED_TYPE: boolean;
  [key: string]: unknown; // Index signature for Record<string, unknown> compatibility
}

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO
// ═══════════════════════════════════════════════════════════════════════════

/** Configuração padrão do DOMPurify */
export const SANITIZE_CONFIG: SanitizeConfig = {
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

// ═══════════════════════════════════════════════════════════════════════════
// FUNÇÃO
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Sanitiza HTML para prevenir XSS
 * @param dirty - HTML não confiável
 * @param DOMPurify - Instância do DOMPurify (opcional, usa window.DOMPurify por padrão)
 * @returns HTML sanitizado
 */
export const sanitizeHTML = (
  dirty: string | null | undefined,
  DOMPurify: DOMPurifyInstance | null = null
): string => {
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

/**
 * @file safeHref.ts
 * @description Validador de href para prevenir XSS via schemes perigosos.
 *
 * Uso: garante que links renderizados a partir de metadata externa
 * (ex: groundingMetadata do Gemini com resultados de web search) só
 * sejam clicáveis quando apontam para http(s) legítimos.
 *
 * @version 1.42.02
 */

const ALLOWED_PROTOCOLS = new Set<string>(['https:', 'http:']);
const FALLBACK = '#';

/**
 * Retorna o URI se for seguro para usar em href, ou '#' caso contrário.
 *
 * Rejeita: javascript:, data:, file:, vbscript:, blob:, about:, ftp:, jar:
 * e quaisquer outros schemes fora de http/https.
 *
 * Em produção, apenas https: é aceito. Em dev (http://localhost) http: também.
 *
 * Rejeita também: URIs sem scheme, relativas, com newlines/tabs (CR/LF/TAB
 * injection), ou que falhem no parser URL.
 */
export function safeHref(uri: string | null | undefined): string {
  if (!uri || typeof uri !== 'string') return FALLBACK;

  // Control chars podem disfarçar schemes perigosos (ex: "\tjavascript:alert(1)"
  // que alguns parsers antigos interpretam como "javascript:"). Rejeitar
  // qualquer presença de CR/LF/TAB no URI original — antes do trim.
  if (/[\r\n\t]/.test(uri)) return FALLBACK;

  const trimmed = uri.trim();

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return FALLBACK;
  }

  const protocol = parsed.protocol.toLowerCase();

  if (!ALLOWED_PROTOCOLS.has(protocol)) return FALLBACK;

  // Em produção, forçar https; http só em desenvolvimento local
  if (protocol === 'http:') {
    const isDevHost =
      typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1');
    if (!isDevHost) return FALLBACK;
  }

  return trimmed;
}

/**
 * Extrai hostname "amigável" de um URI (sem www.), ou string vazia se inválido.
 * Útil para exibir origem do link em UI de fontes.
 */
export function extractHostname(uri: string | null | undefined): string {
  if (!uri || typeof uri !== 'string') return '';
  try {
    return new URL(uri.trim()).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

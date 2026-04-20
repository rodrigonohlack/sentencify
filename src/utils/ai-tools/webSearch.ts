/**
 * @file webSearch.ts
 * @description Registry provider-agnostic para habilitar busca na web
 * durante respostas de IA.
 *
 * ARQUITETURA — por que existe
 * -----------------------------
 * Cada provider (Gemini, Claude, OpenAI, Grok) tem um shape diferente de
 * request e de response quando se habilita web search. Em vez de espalhar
 * `if (provider === 'gemini') ...` pelo código, centralizamos aqui uma
 * interface comum (`WebSearchProviderAdapter`) e um registry declarativo
 * (`WEB_SEARCH_REGISTRY`).
 *
 * EXPANSÃO PARA NOVOS PROVIDERS
 * ------------------------------
 * Para habilitar web search em outro provider:
 *   1. Marcar `supportsWebSearch: true` no registry
 *   2. Preencher `applyToRequest` (como injetar o tool no request body)
 *   3. Preencher `extractGrounding` (como ler metadata da response)
 *
 * Nenhum call site precisa mudar.
 *
 * @version 1.42.02
 */

import type { GroundingMetadata } from '../../types';

export type AIProvider = 'claude' | 'gemini' | 'openai' | 'grok';

export interface WebSearchProviderAdapter {
  /** Se este provider suporta web search via este registry no momento. */
  supportsWebSearch: boolean;

  /**
   * Injeta a ferramenta de busca no request do provider. Retorna request
   * novo (não muta). No-op se provider não suporta.
   */
  applyToRequest: (request: unknown) => unknown;

  /**
   * Extrai metadata de grounding da resposta do provider, ou null se não
   * houver. Retorna formato comum (GroundingMetadata).
   */
  extractGrounding: (response: unknown) => GroundingMetadata | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// ADAPTERS
// ═══════════════════════════════════════════════════════════════════════════

interface GeminiRequestLike {
  tools?: unknown[];
  [key: string]: unknown;
}

const geminiAdapter: WebSearchProviderAdapter = {
  supportsWebSearch: true,
  applyToRequest: (req) => {
    const request = (req as GeminiRequestLike) || {};
    return {
      ...request,
      tools: [...(request.tools || []), { google_search: {} }],
    };
  },
  // IMPORTANTE: groundingMetadata fica em candidates[0].groundingMetadata,
  // no MESMO nível de content (e não dentro de content.parts). Então não é
  // afetado por thinking blocks em Gemini 3+ — é irmão do content.
  // O texto da resposta continua sendo extraído por extractResponseText
  // existente (que já filtra `!p.thought && p.text` nos parts).
  extractGrounding: (resp) => {
    const candidates = (resp as { candidates?: unknown[] } | null)?.candidates;
    if (!candidates || !Array.isArray(candidates) || candidates.length === 0) return null;
    const first = candidates[0] as { groundingMetadata?: {
      webSearchQueries?: string[];
      groundingChunks?: Array<{ web?: { uri: string; title: string } }>;
    } };
    const gm = first?.groundingMetadata;
    if (!gm) return null;

    const chunks = gm.groundingChunks
      ?.filter((c) => c.web?.uri && c.web?.title)
      .map((c) => ({ web: { uri: c.web!.uri, title: c.web!.title } }));

    // Se nada restou após filtrar, devolvemos null para sinalizar "sem fontes"
    if ((!chunks || chunks.length === 0) && (!gm.webSearchQueries?.length)) {
      return null;
    }

    return {
      webSearchQueries: gm.webSearchQueries,
      groundingChunks: chunks,
    };
  },
};

// Adapters no-op para providers que ainda não implementam web search.
// Quando for implementar, trocar `supportsWebSearch: true` e preencher as funções.
const noopAdapter: WebSearchProviderAdapter = {
  supportsWebSearch: false,
  applyToRequest: (req) => req,
  extractGrounding: () => null,
};

// ═══════════════════════════════════════════════════════════════════════════
// REGISTRY
// ═══════════════════════════════════════════════════════════════════════════

export const WEB_SEARCH_REGISTRY: Record<AIProvider, WebSearchProviderAdapter> = {
  gemini: geminiAdapter,
  claude: noopAdapter, // v2: web_search_20250305
  openai: noopAdapter, // v2: Responses API web_search
  grok: noopAdapter,   // v2: live_search (nativo no Grok 4+)
};

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════

/** Se o provider suporta web search no momento (para mostrar toggle na UI). */
export function providerSupportsWebSearch(provider: AIProvider): boolean {
  return WEB_SEARCH_REGISTRY[provider].supportsWebSearch;
}

/**
 * Aplica (ou não) a ferramenta de web search ao request do provider, com
 * TRÊS camadas de defesa contra ativação indevida:
 *   1. `enabled` precisa ser true
 *   2. Anonimização NÃO pode estar ativa (proteção de PII em queries)
 *   3. Provider precisa ter `supportsWebSearch: true` no registry
 */
export function applyWebSearchTool(
  provider: AIProvider,
  request: unknown,
  opts: { enabled?: boolean; anonymizationEnabled?: boolean },
): unknown {
  if (!opts.enabled) return request;
  if (opts.anonymizationEnabled) return request;
  if (!WEB_SEARCH_REGISTRY[provider].supportsWebSearch) return request;
  return WEB_SEARCH_REGISTRY[provider].applyToRequest(request);
}

/**
 * Extrai grounding metadata da resposta do provider, ou null.
 */
export function extractGrounding(
  provider: AIProvider,
  response: unknown,
): GroundingMetadata | null {
  return WEB_SEARCH_REGISTRY[provider].extractGrounding(response);
}

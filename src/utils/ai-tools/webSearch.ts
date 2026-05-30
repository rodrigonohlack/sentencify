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

export type AIProvider = 'claude' | 'gemini' | 'openai' | 'grok' | 'deepseek' | 'claude-cli' | 'codex-cli';

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

// Adapter local-bridge: tanto claude-cli quanto codex-cli usam o mesmo shape
// (request precisa de web_search=true; response carrega grounding pronto).
const localBridgeAdapter: WebSearchProviderAdapter = {
  supportsWebSearch: true,
  applyToRequest: (req) => ({ ...(req as object), web_search: true }),
  extractGrounding: (resp) => {
    const grounding = (resp as { grounding?: GroundingMetadata } | null)?.grounding;
    return grounding ?? null;
  }
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
  claude: noopAdapter,                // v2: web_search_20250305
  'claude-cli': localBridgeAdapter,   // bridge local injeta web_search=true e devolve grounding pronto
  openai: noopAdapter,                // v2: Responses API web_search
  'codex-cli': localBridgeAdapter,    // bridge local injeta web_search=true e devolve grounding pronto
  grok: noopAdapter,                  // v2: live_search (nativo no Grok 4+)
  deepseek: noopAdapter,              // DeepSeek V4 não tem web search nativo (v1.43.00)
};

// ═══════════════════════════════════════════════════════════════════════════
// SYSTEM PROMPT HINT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hint injetado no system prompt quando web search está ativo, com dois objetivos:
 *   1. Garantir que o modelo cite fontes no formato `[título](url)` — pois é o
 *      ÚNICO formato que os daemons conseguem extrair pra grounding.
 *      Ver `llm-bridge/translate.js` (`extractMarkdownLinks` / regex em
 *      translateResponse) e `llm-bridge/translate.codex.js` (`extractMarkdownLinks`).
 *      Sem esse formato, o juiz não vê as fontes mesmo tendo pago pela busca.
 *   2. Limitar buscas: controla latência hoje, e custo a partir de 15/jun/2026
 *      quando `claude -p` deixa de ser bundled no Max e passa a ser API-priced.
 */
export const WEB_SEARCH_CITATION_HINT = `

---
Instruções para uso da busca web (injetadas automaticamente quando você ativou a busca):
- Use a ferramenta de busca web no MÁXIMO 2 vezes nesta resposta, e somente quando precisar confirmar o texto literal de uma súmula, OJ, lei ou jurisprudência específica que você não conhece com certeza.
- SEMPRE cite a fonte em formato markdown \`[título da fonte](url-exata)\` imediatamente após cada afirmação que veio da busca.
- Não parafraseie a URL — use exatamente o que veio do resultado da busca.
- Sem esse formato, o sistema não consegue mostrar as fontes ao juiz.
`;

/**
 * Concatena o WEB_SEARCH_CITATION_HINT ao system prompt quando web search está ativo.
 * Idempotente em `enabled=false` (retorna o input como está).
 */
export function withWebSearchHint(
  systemPrompt: string | null | undefined,
  enabled: boolean,
): string | null | undefined {
  if (!enabled) return systemPrompt;
  return (systemPrompt || '') + WEB_SEARCH_CITATION_HINT;
}

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

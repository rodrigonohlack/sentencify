/**
 * @file geminiCache.ts
 * @description Estratégia de splitting (estável vs volátil) e helper para
 *   pedir/reusar CachedContent ao backend. v1.43.00.
 *
 * O cache do Gemini reduz drasticamente o custo quando o mesmo contexto é
 * reusado entre várias perguntas (típico em análise jurídica: o juiz faz
 * múltiplas perguntas sobre as mesmas provas/petição). A estratégia padrão
 * separa "conteúdo estável" (system prompt + documentos longos + arquivos)
 * de "volátil" (a pergunta atual e follow-ups recentes).
 */

import type { GeminiRequest, GeminiCacheRef } from '../../types';
import { API_BASE } from '../../constants/api';

/** Threshold mínimo de tokens estimados para valer a pena cachear. */
export const GEMINI_CACHE_MIN_TOKENS = 4000;

/** TTL padrão do cache (em segundos) — escolha do usuário no plano. */
export const GEMINI_CACHE_DEFAULT_TTL = 3600;

/** Marcadores que o projeto já usa para identificar documentos contextuais. */
const STABLE_MARKERS = [
  '[CONTESTAÇÃO',
  '[INICIAL',
  '[PROVA:',
  '[PROVAS]',
  '[DOCUMENTO',
  '[PETIÇÃO',
  '[EMENDA',
];

/** Heurística leve de contagem de tokens (Gemini ~ 1 token / 4 chars). */
export function estimateTokens(input: unknown): number {
  if (input == null) return 0;
  const s = typeof input === 'string' ? input : JSON.stringify(input);
  return Math.ceil(s.length / 4);
}

/** Detecta se um part contém referência a fileData (mídia anexada). */
function partHasFileData(part: unknown): boolean {
  if (!part || typeof part !== 'object') return false;
  const p = part as Record<string, unknown>;
  return Boolean(p.fileData || p.file_data);
}

/** Detecta se uma mensagem é "contextual" (longa ou contém marcadores). */
function isStableMessage(msg: { role?: string; parts?: unknown[] }): boolean {
  if (!msg || !Array.isArray(msg.parts)) return false;
  // Qualquer part com fileData → estável (mídia)
  if (msg.parts.some(partHasFileData)) return true;
  // Texto muito longo ou com marcadores → estável
  for (const p of msg.parts) {
    if (p && typeof p === 'object' && 'text' in p) {
      const t = String((p as Record<string, unknown>).text || '');
      if (t.length > 2000) return true;
      if (STABLE_MARKERS.some((m) => t.includes(m))) return true;
    }
  }
  return false;
}

export interface SplitResult {
  /** Conteúdo a cachear (vai para CachedContent). */
  stableContents: unknown[];
  /** Conteúdo volátil (vai na request normal). */
  volatileContents: unknown[];
  /** System instruction migra para o cache. */
  systemInstruction?: { parts: { text: string }[] };
  /** Tokens estimados do bloco estável (para decidir se vale cachear). */
  stableTokens: number;
}

/**
 * Separa o request em (estável → cache) + (volátil → request normal).
 * Regras:
 *  - systemInstruction sempre estável.
 *  - Mensagens com fileData OU > 2k chars OU com marcadores → estáveis.
 *  - Tudo o mais (incl. a última mensagem do usuário) → volátil.
 */
export function splitStableFromVolatile(req: GeminiRequest): SplitResult {
  const contents = (req.contents || []) as Array<{ role?: string; parts?: unknown[] }>;
  const stableContents: unknown[] = [];
  const volatileContents: unknown[] = [];

  // Última mensagem do usuário sempre volátil (a pergunta atual)
  const lastIdx = contents.length - 1;

  contents.forEach((msg, idx) => {
    if (idx === lastIdx) {
      volatileContents.push(msg);
      return;
    }
    if (isStableMessage(msg)) {
      stableContents.push(msg);
    } else {
      volatileContents.push(msg);
    }
  });

  const systemInstruction = req.systemInstruction;
  const stableTokens = estimateTokens(stableContents) + estimateTokens(systemInstruction);

  return { stableContents, volatileContents, systemInstruction, stableTokens };
}

/**
 * Decide se vale a pena criar/usar cache para este request.
 *
 * Exige stableContents.length > 0 — o backend (getOrCreateCache) rejeita
 * com 400 se o array vier vazio. Cachear apenas systemInstruction (sem
 * documentos) não é suportado pelo Gemini Cached Content API.
 */
export function shouldCacheRequest(split: SplitResult): boolean {
  if (split.stableContents.length === 0) return false;
  return split.stableTokens >= GEMINI_CACHE_MIN_TOKENS;
}

/**
 * Hash determinístico local. Mesma fórmula do backend (model + system + stable).
 * Usado como chave em useAIStore.geminiActiveCaches para evitar round-trip
 * desnecessário ao backend quando temos um cache válido em memória.
 */
export async function localHashKey(
  model: string,
  systemInstruction: unknown,
  stableContents: unknown[]
): Promise<string> {
  const sys = typeof systemInstruction === 'string'
    ? systemInstruction
    : JSON.stringify(systemInstruction || null);
  const stable = JSON.stringify(stableContents || []);
  const data = new TextEncoder().encode(`${model}::${sys}::${stable}`);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Pede (ou recupera) um cache no backend. O backend é a fonte da verdade.
 */
export async function ensureGeminiCache(params: {
  model: string;
  systemInstruction?: unknown;
  stableContents: unknown[];
  ttlSeconds?: number;
  apiKey: string;
  authToken?: string | null;
}): Promise<GeminiCacheRef> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-key': params.apiKey,
  };
  if (params.authToken) {
    headers['Authorization'] = `Bearer ${params.authToken}`;
  }

  const res = await fetch(`${API_BASE}/api/gemini/cache`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: params.model,
      systemInstruction: params.systemInstruction,
      stableContents: params.stableContents,
      ttlSeconds: params.ttlSeconds ?? GEMINI_CACHE_DEFAULT_TTL,
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = data?.error?.message || `HTTP ${res.status}`;
    throw new Error(`Falha ao criar cache Gemini: ${msg}`);
  }

  const data = await res.json();
  return {
    cacheId: data.cacheId,
    cacheName: data.cacheName,
    expiresAt: data.expiresAt,
    tokenCount: data.tokenCount || 0,
    hit: !!data.hit,
  };
}

/** Detecta erros que indicam cache inválido/expirado, para invalidar e refazer. */
export function isCacheInvalidError(err: unknown): boolean {
  if (!err) return false;
  const e = err as { status?: number; message?: string };
  if (e.status === 404) return true;
  const msg = String(e.message || '').toLowerCase();
  return msg.includes('cache') && (msg.includes('not found') || msg.includes('expired') || msg.includes('inválid'));
}

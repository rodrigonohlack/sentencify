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

/**
 * v1.43.01: Detecta se um part é "estável" (deve ir para o cache).
 *  - fileData/file_data: mídia anexada via Gemini File API
 *  - inlineData/inline_data: PDFs/imagens em base64 (formato dominante no
 *    Sentencify quando o usuário sobe documentos)
 *  - text > 2000 chars: documentos longos colados
 *  - text com marcadores [CONTESTAÇÃO/INICIAL/PROVA/etc]: convenção do projeto
 */
function isStablePart(part: unknown): boolean {
  if (!part || typeof part !== 'object') return false;
  const p = part as Record<string, unknown>;
  if (p.fileData || p.file_data) return true;
  if (p.inlineData || p.inline_data) return true;
  if ('text' in p) {
    const t = String(p.text || '');
    if (t.length > 2000) return true;
    if (STABLE_MARKERS.some((m) => t.includes(m))) return true;
  }
  return false;
}

/** Detecta se uma mensagem inteira é "estável" (qualquer part estável). */
function isStableMessage(msg: { role?: string; parts?: unknown[] }): boolean {
  if (!msg || !Array.isArray(msg.parts)) return false;
  return msg.parts.some(isStablePart);
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
 *
 * v1.43.01: lida com dois padrões dominantes no Sentencify:
 *
 * 1) **Multi-turn chat** (várias mensagens user/model alternadas):
 *    - Mensagens não-finais com parts estáveis → cache
 *    - Última mensagem do usuário → volátil (a pergunta atual)
 *
 * 2) **Análise single-shot** (UMA mensagem do user com vários parts: doc + prompt):
 *    - Padrão típico em useProofAnalysis, prompts de tópicos, etc.
 *    - Splita a nível de PART: parts iniciais estáveis (docs/inlineData) → cache;
 *      última part (presumivelmente a pergunta/instrução curta) → volátil.
 *    - Sem isso, todo o conteúdo do PDF cai como volátil → cache nunca dispara.
 */
export function splitStableFromVolatile(req: GeminiRequest): SplitResult {
  const contents = (req.contents || []) as Array<{ role?: string; parts?: unknown[] }>;
  const systemInstruction = req.systemInstruction;

  // Padrão single-shot: 1 mensagem user com >= 2 parts e pelo menos 1 estável
  if (
    contents.length === 1 &&
    contents[0].role === 'user' &&
    Array.isArray(contents[0].parts) &&
    contents[0].parts.length >= 2 &&
    contents[0].parts.slice(0, -1).some(isStablePart)
  ) {
    const allParts = contents[0].parts;
    const stableParts = allParts.slice(0, -1);
    const volatilePart = allParts[allParts.length - 1];

    const stableContents = [{ role: 'user', parts: stableParts }];
    const volatileContents = [{ role: 'user', parts: [volatilePart] }];
    const stableTokens = estimateTokens(stableContents) + estimateTokens(systemInstruction);

    return { stableContents, volatileContents, systemInstruction, stableTokens };
  }

  // Padrão multi-turn: split a nível de mensagem
  const stableContents: unknown[] = [];
  const volatileContents: unknown[] = [];
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

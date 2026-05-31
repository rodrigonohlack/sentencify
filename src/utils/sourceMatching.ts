/**
 * @file sourceMatching.ts
 * @description Verificação local determinística de trechos-fonte contra o texto
 * das peças (anti-alucinação). Funções puras, sem dependências de React/API.
 */

/** Normaliza texto para comparação: sem acento, sem pontuação, minúsculo, espaços colapsados. */
export function normalizeForMatch(s: string): string {
  return (s || '')
    .normalize('NFD')
    .replace(/\p{Mn}/gu, '')
    .toLowerCase()
    .replace(/[“”„‘’]/g, ' ')
    .replace(/[‐-―]/g, '-')
    .replace(/[.,;:!?()\[\]{}"]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Fonte já normalizada (normaliza-se uma vez, reusa por trecho). */
export interface NormalizedSource {
  peca: string;
  normalized: string;
}

export interface MatchResult {
  status: 'verificado' | 'nao_localizado';
  peca: string;
  matchScore?: number;
}

const FUZZY_THRESHOLD = 0.85;

function tokenize(s: string): string[] {
  return s.split(' ').filter(Boolean);
}

/** Coeficiente de Dice entre dois multisets de tokens (0-1). */
function diceCoefficient(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const counts = new Map<string, number>();
  for (const t of b) counts.set(t, (counts.get(t) || 0) + 1);
  let inter = 0;
  for (const t of a) {
    const c = counts.get(t);
    if (c && c > 0) { inter++; counts.set(t, c - 1); }
  }
  return (2 * inter) / (a.length + b.length);
}

/**
 * Verifica se `trecho` aparece em alguma das `sources`.
 * 1) substring exata normalizada -> verificado (peça onde foi achado);
 * 2) fuzzy por janela deslizante de tokens >= threshold -> verificado;
 * 3) senão -> nao_localizado (mantém a etiqueta da IA).
 */
export function verifyTrechoInSources(
  trecho: string,
  sources: NormalizedSource[],
  aiLabel: string,
  threshold: number = FUZZY_THRESHOLD
): MatchResult {
  const nt = normalizeForMatch(trecho);
  if (!nt) return { status: 'nao_localizado', peca: aiLabel };

  // Passo 1: substring exata normalizada
  for (const src of sources) {
    if (src.normalized.includes(nt)) {
      return { status: 'verificado', peca: src.peca, matchScore: 1 };
    }
  }

  // Passo 2: fuzzy por janela deslizante de tokens
  const tt = tokenize(nt);
  let best = 0;
  let bestPeca = aiLabel;
  outer: for (const src of sources) {
    const st = tokenize(src.normalized);
    const w = tt.length;
    if (st.length < w) {
      const score = diceCoefficient(tt, st);
      if (score > best) { best = score; bestPeca = src.peca; }
      continue;
    }
    for (let i = 0; i + w <= st.length; i++) {
      const score = diceCoefficient(tt, st.slice(i, i + w));
      if (score > best) { best = score; bestPeca = src.peca; }
      if (best >= 1) break outer;
    }
  }

  const rounded = Number(best.toFixed(3));
  if (best >= threshold) return { status: 'verificado', peca: bestPeca, matchScore: rounded };
  return { status: 'nao_localizado', peca: aiLabel, matchScore: rounded };
}

/**
 * @file categoryNormalization.ts
 * @description Normalização/deduplicação de categorias de modelos geradas via IA.
 *
 * A geração de título via IA passou a devolver também a CATEGORIA (= TEMA do modelo).
 * Para evitar duplicatas "quase iguais" (ex: "Horas Extras" vs "horas extras"),
 * a categoria gerada é canonicalizada contra as categorias já existentes: havendo
 * equivalência (ignorando caixa/acentos/espaços), reutiliza-se a grafia existente;
 * caso contrário, cria-se uma nova em Title Case.
 *
 * Funções puras e testáveis (sem dependência de React/IO).
 */

// Preposições/artigos que permanecem em minúsculas no meio de uma categoria.
const TITLE_CASE_STOPWORDS = new Set([
  'de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o', 'as', 'os', 'em', 'no', 'na', 'por',
]);

/**
 * Normaliza um texto para COMPARAÇÃO (não para exibição): caixa baixa, sem
 * acentos, espaços colapsados e sem espaços nas pontas.
 */
export function normalizeForCompare(value: string): string {
  return (value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove diacríticos
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Converte um texto para Title Case, mantendo preposições/artigos comuns em
 * minúsculas (exceto a primeira palavra, sempre capitalizada).
 */
export function toTitleCase(value: string): string {
  const words = (value || '').replace(/\s+/g, ' ').trim().split(' ');
  return words
    .map((word, idx) => {
      if (!word) return word;
      const lower = word.toLowerCase();
      if (idx > 0 && TITLE_CASE_STOPWORDS.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

/**
 * Deriva a categoria (TEMA) a partir de um título no formato
 * "TEMA - SUBTEMA - RESULTADO". Usa o trecho antes do primeiro separador.
 */
export function deriveCategoryFromTitle(title: string): string {
  const tema = (title || '').split(/\s*-\s*/)[0] || '';
  return toTitleCase(tema);
}

/**
 * Canonicaliza uma categoria gerada contra a lista de categorias existentes.
 * - Se equivale (forma normalizada) a uma existente, retorna a grafia da existente.
 * - Caso contrário, retorna a categoria em Title Case.
 */
export function canonicalizeCategory(generated: string, existing: string[]): string {
  const target = normalizeForCompare(generated);
  if (target) {
    const match = (existing || []).find((cat) => normalizeForCompare(cat) === target);
    if (match) return match;
  }
  return toTitleCase(generated);
}

/**
 * Extrai o primeiro objeto JSON `{...}` de um texto, tolerando cercas de código
 * (```json ... ```) e texto solto antes/depois. Retorna null se não houver.
 */
function extractJsonObject(raw: string): { title?: unknown; category?: unknown } | null {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

/**
 * Resolve título e categoria a partir da resposta bruta da IA.
 *
 * Estratégia:
 * 1. Tenta interpretar a resposta como JSON `{title, category}`.
 * 2. Fallback (sem JSON válido ou sem título): trata a resposta inteira como o
 *    título em texto plano e deriva a categoria do TEMA.
 * 3. JSON sem `category`: deriva a categoria do título.
 * 4. A categoria final é sempre canonicalizada contra as categorias existentes.
 */
export function resolveTitleAndCategory(
  raw: string,
  existingCategories: string[],
): { title: string; category: string } {
  const parsed = extractJsonObject(raw || '');

  let title = '';
  let category = '';

  if (parsed && typeof parsed.title === 'string' && parsed.title.trim()) {
    title = parsed.title.trim();
    if (typeof parsed.category === 'string') {
      category = parsed.category.trim();
    }
  } else {
    // Fallback: resposta em texto plano é o próprio título.
    title = (raw || '').trim();
  }

  if (!category) {
    category = deriveCategoryFromTitle(title);
  }

  return {
    title,
    category: canonicalizeCategory(category, existingCategories),
  };
}

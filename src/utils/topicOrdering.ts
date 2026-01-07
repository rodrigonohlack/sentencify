/**
 * Utilitário para ordenação de tópicos via IA
 * Extração da lógica de reorderTopicsViaLLM para permitir testes unitários
 * v1.33.38
 *
 * @version 1.35.80 - Migrado para TypeScript
 */

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

/** Tópico com título e categoria */
export interface TopicForOrdering {
  title: string;
  category: string;
  [key: string]: unknown;
}

/** Resultado de ordenação por índices */
export interface OrderByIndicesResult {
  order?: number[];
  orderedTitles?: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNÇÕES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Extrai JSON de ordem da resposta da IA
 * Suporta: JSON puro, markdown ```json```, formatos variados
 * @param result - Resposta da IA (pode conter thinking tokens, markdown, etc.)
 * @returns Objeto com { order: [...] } ou null se não encontrado
 */
export const extractOrderFromResponse = (result: string | null | undefined): OrderByIndicesResult | null => {
  if (!result) return null;

  // v1.32.34: Regex mais robusto para extrair JSON (suporta newlines, markdown, etc.)
  let jsonMatch = result.match(/\{\s*"order"\s*:\s*\[[\d,\s\n\r]+\]\s*\}/);

  // Fallback: tentar extrair de bloco markdown ```json ... ```
  if (!jsonMatch) {
    const markdownMatch = result.match(/```(?:json)?\s*(\{[\s\S]*?"order"[\s\S]*?\})\s*```/);
    if (markdownMatch) {
      jsonMatch = [markdownMatch[1]];
    }
  }

  // Fallback: busca genérica por {"order": [...]}
  if (!jsonMatch) {
    const genericMatch = result.match(/\{[^{}]*"order"\s*:\s*\[[^\]]+\][^{}]*\}/);
    if (genericMatch) jsonMatch = genericMatch;
  }

  if (!jsonMatch) return null;

  try {
    return JSON.parse(jsonMatch[0]) as OrderByIndicesResult;
  } catch {
    return null;
  }
};

/**
 * Reordena tópicos baseado nos índices retornados pela IA
 * @param topics - Array de tópicos com {title, category, ...}
 * @param parsed - Objeto com { order: [1, 3, 2, ...] }
 * @returns Tópicos reordenados
 */
export const reorderByIndices = <T extends TopicForOrdering>(
  topics: T[] | null | undefined,
  parsed: OrderByIndicesResult | null | undefined
): T[] => {
  if (!parsed || !topics || !Array.isArray(topics)) return topics || [];

  // Formato com índices
  if (parsed.order && Array.isArray(parsed.order)) {
    const orderedTopics: T[] = [];
    for (const idx of parsed.order) {
      const topic = topics[idx - 1]; // índices são 1-based
      if (topic) orderedTopics.push(topic);
    }
    // Adicionar tópicos não mapeados ao final
    for (const topic of topics) {
      if (!orderedTopics.includes(topic)) {
        orderedTopics.push(topic);
      }
    }
    return orderedTopics;
  }

  // Fallback: formato antigo com títulos (retrocompatibilidade)
  if (parsed.orderedTitles && Array.isArray(parsed.orderedTitles)) {
    const orderedTopics: T[] = [];
    for (const title of parsed.orderedTitles) {
      const topic = topics.find(t => t.title.toUpperCase() === title.toUpperCase());
      if (topic) orderedTopics.push(topic);
    }
    for (const topic of topics) {
      if (!orderedTopics.find(t => t.title === topic.title)) {
        orderedTopics.push(topic);
      }
    }
    return orderedTopics;
  }

  return topics;
};

/**
 * Gera o prompt de ordenação para a IA
 * @param topics - Array de tópicos com {title, category}
 * @returns Prompt formatado
 */
export const buildReorderPrompt = (topics: TopicForOrdering[]): string => {
  const topicsList = topics.map((t, i) => `${i + 1}. "${t.title}" (${t.category})`).join('\n');

  return `Reordene os seguintes tópicos de uma ação trabalhista na ordem processual correta:

ORDEM PROCESSUAL:
1. RELATÓRIO
2. TRAMITAÇÃO (Juízo Digital, Segredo Justiça, Prioridade)
3. IMPUGNAÇÃO AOS DOCUMENTOS
4. PRELIMINARES - Art. 337 CPC na ordem: citação → incompetência → valor → inépcia → perempção → litispendência → coisa julgada → conexão → representação → arbitragem → legitimidade → caução → gratuidade
5. PREJUDICIAIS (prescrição bienal/quinquenal, decadência)
6. MÉRITO - ordenar assim:
   6a. Declaratórios/Constitutivos (vínculo, reversão justa causa, rescisão indireta)
   6b. Obrigações de fazer (CTPS, guias)
   6c. Condenatórios (verbas, horas extras, adicionais, danos)
   6d. Responsabilidade - APÓS definir o que é devido (grupo econômico, solidária, subsidiária)
   6e. Justiça Gratuita - ANTES de honorários
   6f. Honorários - ÚLTIMO do mérito
7. QUESTÕES FINAIS (litigância má-fé, ofícios, juros, limitação)

TÓPICOS A ORDENAR:
${topicsList}

Responda APENAS com JSON: {"order": [1, 3, 2, ...]}
Use os números originais da lista.`;
};

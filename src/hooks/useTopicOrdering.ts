/**
 * @file useTopicOrdering.ts
 * @description Hook para reordenação de tópicos via LLM
 * Extraído do App.tsx v1.37.5 - FASE 4 LegalDecisionEditor refactoring
 */

import { useCallback } from 'react';
import type { Topic, AIMessage, AICallOptions } from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════════

export interface AIIntegrationForOrdering {
  callAI: (
    messages: AIMessage[],
    options?: AICallOptions
  ) => Promise<string>;
  aiSettings?: {
    provider?: string;
  };
}

export interface UseTopicOrderingProps {
  aiIntegration: AIIntegrationForOrdering;
}

export interface UseTopicOrderingReturn {
  reorderTopicsViaLLM: (topics: Topic[]) => Promise<Topic[]>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Hook para reordenação de tópicos via LLM
 *
 * @description Reordena tópicos de uma ação trabalhista na ordem processual correta:
 * 1. Relatório
 * 2. Tramitação
 * 3. Impugnação aos documentos
 * 4. Preliminares (Art. 337 CPC)
 * 5. Prejudiciais (prescrição, decadência)
 * 6. Mérito (declaratórios, obrigações, condenatórios, responsabilidade, JG, honorários)
 * 7. Questões finais
 *
 * @param props - Propriedades do hook
 * @returns Função para reordenar tópicos
 *
 * @example
 * const { reorderTopicsViaLLM } = useTopicOrdering({ aiIntegration });
 * const orderedTopics = await reorderTopicsViaLLM(topics);
 */
export function useTopicOrdering({
  aiIntegration,
}: UseTopicOrderingProps): UseTopicOrderingReturn {

  // v1.14.3: Reordena tópicos via LLM (preliminares → prejudiciais → mérito → processuais)
  // v1.31.01: Fix RECITATION - retornar índices ao invés de títulos
  const reorderTopicsViaLLM = useCallback(async (topics: Topic[]): Promise<Topic[]> => {
    if (!topics || topics.length <= 1) return topics;

    const topicsList = topics.map((t: Topic, i: number) => `${i + 1}. "${t.title}" (${t.category})`).join('\n');

    const prompt = `Reordene os seguintes tópicos de uma ação trabalhista na ordem processual correta:

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

    try {
      const isGemini = aiIntegration.aiSettings?.provider === 'gemini';
      const result = await aiIntegration.callAI([{
        role: 'user',
        content: [{ type: 'text', text: prompt }]
      }], {
        maxTokens: 4000, // v1.32.25: Aumentado para evitar truncamento (thinking tokens do Gemini 3)
        useInstructions: false,
        temperature: isGemini ? 0.5 : 0.0,
        topP: 0.9,
        topK: 40
      });

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

      if (!jsonMatch) {
        console.warn('[reorderTopicsViaLLM] JSON não encontrado na resposta, mantendo ordem original');
        console.log('[reorderTopicsViaLLM] Resposta recebida:', result.substring(0, 500));
        return topics;
      }

      const cleanResult = jsonMatch[0];
      const parsed = JSON.parse(cleanResult);

      // Novo formato: índices (evita RECITATION)
      if (parsed.order && Array.isArray(parsed.order)) {
        const orderedTopics: Topic[] = [];
        for (const idx of parsed.order) {
          const topic = topics[idx - 1];
          if (topic) orderedTopics.push(topic);
        }
        for (const topic of topics) {
          if (!orderedTopics.includes(topic)) {
            orderedTopics.push(topic);
          }
        }
        return orderedTopics;
      }

      // Fallback: formato antigo com títulos (retrocompatibilidade)
      if (parsed.orderedTitles && Array.isArray(parsed.orderedTitles)) {
        const orderedTopics: Topic[] = [];
        for (const title of parsed.orderedTitles) {
          const topic = topics.find((t: Topic) => t.title.toUpperCase() === title.toUpperCase());
          if (topic) orderedTopics.push(topic);
        }
        for (const topic of topics) {
          if (!orderedTopics.find((t: Topic) => t.title === topic.title)) {
            orderedTopics.push(topic);
          }
        }
        return orderedTopics;
      }

      console.warn('[reorderTopicsViaLLM] Formato desconhecido, mantendo ordem original');
      return topics;

    } catch (err) {
      console.error('[reorderTopicsViaLLM] Erro:', err);
      return topics;
    }
  }, [aiIntegration]);

  return {
    reorderTopicsViaLLM,
  };
}

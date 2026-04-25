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

/** Opções para chamadas com streaming (v1.40.02) */
interface AIStreamOptions extends AICallOptions {
  onChunk?: (fullText: string) => void;
}

export interface AIIntegrationForOrdering {
  callAI: (
    messages: AIMessage[],
    options?: AICallOptions
  ) => Promise<string>;
  // v1.40.02: Adicionar suporte a streaming silencioso
  callAIStream?: (
    messages: AIMessage[],
    options?: AIStreamOptions
  ) => Promise<string>;
  aiSettings?: {
    provider?: string;
    deepseekModel?: string;
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

Responda APENAS com JSON, sem markdown, sem prosa, sem explicação.
Formato EXATO (uma linha): {"order": [1, 3, 2, ...]}
Use os números originais da lista. Não use \`\`\`json nem nenhum cercado de código.`;

    try {
      const provider = aiIntegration.aiSettings?.provider;
      const isGemini = provider === 'gemini';
      const isDeepseek = provider === 'deepseek';

      // v1.43.12: REMOVIDO o force-flash da v1.43.07. A v1.43.11 (JSON mode)
      // resolveu a causa estrutural que motivava o override — Pro com thinking
      // já não estoura mais o budget porque response_format força output
      // estruturado. Agora o provider escolhido pelo usuário (Flash OU Pro) é
      // respeitado em topic ordering. Pro vai ser mais caro ($0.04 vs $0.004/call
      // aprox), mas o usuário pagou pra usar Pro, então a decisão é dele.

      const messages: AIMessage[] = [{
        role: 'user',
        content: [{ type: 'text', text: prompt }]
      }];
      const options = {
        // v1.43.05: 20000 (era 8000) — topic ordering NÃO é trivial. Reordenar
        // 16 tópicos trabalhistas exige classificação jurídica (Preliminar /
        // Prejudicial / Mérito / Q.Finais), ordenação de Art.337 CPC, etc.
        // Com thinking ativo + JSON mode (v1.43.11), 20K tokens cobre ambos
        // Flash e Pro com folga.
        maxTokens: 20000,
        useInstructions: false,
        // v1.43.11: JSON mode pra DeepSeek — força response_format JSON e reduz
        // drasticamente reasoning verbose. Só ativa quando provider é deepseek;
        // outros ignoram. v1.43.12: passou a viabilizar Pro também.
        deepseekJsonMode: isDeepseek,
        // v1.43.05: disableThinking REMOVIDO (era true em v1.43.04). Sem thinking,
        // DeepSeek V4-Flash retornava ordem identidade [1,2,...,16] — lazy response
        // pra tarefa de classificação que ele percebia complexa. Claude/Gemini/OpenAI
        // conseguem fazer sem thinking (são mais fortes no default), mas respeitar
        // o setting global de cada um é mais previsível. Thinking ON pra todos
        // garante qualidade consistente da ordenação.
        temperature: isGemini ? 0.5 : 0.0,
        topP: 0.9,
        topK: 40
      };

      // v1.40.02: Usar streaming silencioso para evitar timeout em operações longas
      const result = aiIntegration.callAIStream
        ? await aiIntegration.callAIStream(messages, options)
        : await aiIntegration.callAI(messages, options);

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

      // v1.43.01: Fallback super-permissivo — captura "order":[...] sem exigir chaves
      // (DeepSeek às vezes retorna o array dentro de estruturas mais soltas)
      if (!jsonMatch) {
        const looseMatch = result.match(/"order"\s*:\s*\[([\d,\s\n\r]+)\]/);
        if (looseMatch) {
          jsonMatch = [`{"order":[${looseMatch[1]}]}`];
        }
      }

      if (!jsonMatch) {
        console.warn('[reorderTopicsViaLLM] JSON não encontrado na resposta, mantendo ordem original');
        // v1.43.01: log estendido (2000 chars) para diagnóstico de novos providers
        console.log('[reorderTopicsViaLLM] Resposta recebida (até 2000 chars):', result.substring(0, 2000));
        console.log('[reorderTopicsViaLLM] Tamanho total da resposta:', result.length);
        return topics;
      }

      const cleanResult = jsonMatch[0];
      const parsed = JSON.parse(cleanResult);

      // Novo formato: índices (evita RECITATION)
      if (parsed.order && Array.isArray(parsed.order)) {
        // v1.43.05: diagnóstico — alertar quando LLM retorna ordem idêntica
        // ao input (pattern de "lazy response" visto no DeepSeek V4 sem thinking)
        const isIdentity = parsed.order.length === topics.length &&
          parsed.order.every((idx: number, i: number) => idx === i + 1);
        if (isIdentity) {
          console.warn(
            '[reorderTopicsViaLLM] ⚠️ LLM retornou ordem IDENTIDADE [1,2,...,n] — ' +
            'sem reordenação real. Provavelmente o modelo foi "preguiçoso". ' +
            'Considere trocar de provider ou ativar thinking.'
          );
        } else {
          console.log('[reorderTopicsViaLLM] Order received:', parsed.order);
        }

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

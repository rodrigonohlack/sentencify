/**
 * @file useModelSuggestions.ts
 * @description Hook para busca de sugestões de modelos
 * @version 1.37.45
 *
 * FASE 47: Extraído do App.tsx para consolidar lógica de sugestões de modelos.
 *
 * Responsabilidades:
 * - Buscar sugestões de modelos para tópicos
 * - Refinar candidatos usando IA
 * - Usar cache para evitar chamadas repetidas
 * - Suportar IA local (embeddings) e API
 *
 * 🔑 ESTRATÉGIA ZUSTAND: Acessa models via useModelsStore.getState()
 */

import { useCallback } from 'react';
import { useModelsStore } from '../stores/useModelsStore';
import AIModelService from '../services/AIModelService';
import { AI_PROMPTS } from '../prompts';
import { isSpecialTopic } from '../utils/text';
import type { Model, Topic, AIMessage, AICallOptions } from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════════

export interface AIIntegrationForSuggestions {
  aiSettings: {
    useLocalAIForSuggestions?: boolean;
    modelSemanticThreshold?: number;
  };
  buildApiRequest: (messages: AIMessage[], optionsOrMaxTokens?: AICallOptions | number) => Record<string, unknown>;
  callAI: (messages: AIMessage[], options?: {
    maxTokens?: number;
    useInstructions?: boolean;
    disableThinking?: boolean;
    logMetrics?: boolean;
    temperature?: number;
    topP?: number;
    topK?: number;
  }) => Promise<string>;
}

export interface APICacheForSuggestions {
  get: (key: string) => unknown | null;
  set: (key: string, value: unknown) => void;
}

export interface UseModelSuggestionsProps {
  /** Integração com IA */
  aiIntegration: AIIntegrationForSuggestions;
  /** Cache de API */
  apiCache: APICacheForSuggestions;
  /** Se o modelo de busca semântica está pronto */
  searchModelReady: boolean;
}

export interface SuggestionsResult {
  suggestions: Model[];
  source: 'local' | 'api' | null;
}

export interface UseModelSuggestionsReturn {
  /** Busca sugestões de modelos para um tópico */
  findSuggestions: (topic: Topic) => Promise<SuggestionsResult>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNÇÃO DE PONTUAÇÃO LOCAL
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calcula pontuação de relevância entre um modelo e um tópico
 */
function scoreModel(model: Model, topicTitle: string, topicCategory: string, topicRelatorio: string): number {
  let score = 0;

  const titleLower = (topicTitle || '').toLowerCase();
  const categoryLower = (topicCategory || '').toLowerCase();
  const relatorioLower = (topicRelatorio || '').toLowerCase();
  const modelTitleLower = (model.title || '').toLowerCase();
  const modelCategoryLower = (model.category || '').toLowerCase();
  const modelKeywordsLower = (typeof model.keywords === 'string' ? model.keywords : (model.keywords || []).join(' ')).toLowerCase();
  const modelContentLower = (model.content || '').toLowerCase();

  // Pontuação por título
  if (modelTitleLower.includes(titleLower) || titleLower.includes(modelTitleLower)) {
    score += 50;
  }

  // Pontuação por categoria
  if (categoryLower && modelCategoryLower && categoryLower === modelCategoryLower) {
    score += 30;
  }

  // Pontuação por keywords
  const keywords = modelKeywordsLower.split(/[,;\s]+/).filter(k => k.length > 2);
  keywords.forEach(keyword => {
    if (titleLower.includes(keyword) || relatorioLower.includes(keyword)) {
      score += 10;
    }
  });

  // Pontuação por conteúdo
  const titleWords = titleLower.split(/\s+/).filter(w => w.length > 3);
  titleWords.forEach(word => {
    if (modelContentLower.includes(word)) {
      score += 5;
    }
  });

  return score;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Hook para busca de sugestões de modelos
 *
 * @param props - Dependências necessárias
 */
export function useModelSuggestions({
  aiIntegration,
  apiCache,
  searchModelReady,
}: UseModelSuggestionsProps): UseModelSuggestionsReturn {
  // ═══════════════════════════════════════════════════════════════════════════════
  // REFINAMENTO COM IA
  // ═══════════════════════════════════════════════════════════════════════════════

  const refineWithAI = useCallback(async (
    topCandidates: Model[],
    topicTitle: string,
    topicCategory: string,
    topicRelatorio: string
  ): Promise<Model[]> => {
    if (topCandidates.length === 0) return [];

    try {
      const prompt = `${AI_PROMPTS.roles.relevancia}

CONTEXTO DO TÓPICO:
Título: ${topicTitle}
Categoria: ${topicCategory || 'Não especificada'}
Mini-relatório: ${topicRelatorio || 'Não disponível'}

MODELOS CANDIDATOS:
${topCandidates.map((m: Model, i: number) => `${i + 1}. [ID: ${m.id}] ${m.title}
   Categoria: ${m.category || 'N/A'}
   Keywords: ${m.keywords || 'N/A'}
   Resumo: ${m.content || 'N/A'}`).join('\n\n')}

TAREFA:
Analise semanticamente qual desses modelos é mais relevante para o tópico em questão.
Considere:
1. Similaridade temática entre título do tópico e título do modelo
2. Relevância das keywords com o contexto do mini-relatório
3. Categoria compatível
4. Aplicabilidade do conteúdo do modelo ao contexto do tópico

Responda APENAS com um array JSON contendo os IDs dos modelos ordenados por relevância (do mais relevante ao menos relevante).
Formato: ["id1", "id2", "id3", ...]

Inclua APENAS modelos que sejam realmente relevantes. Se nenhum for relevante, retorne array vazio: []`;

      // Usar Sonnet 4.5 (modelo padrão) para recomendação de modelos
      const messages: AIMessage[] = [{
        role: 'user',
        content: [{ type: 'text', text: prompt }]
      }];

      let textContent;
      try {
        textContent = await aiIntegration.callAI(messages, {
          maxTokens: 300,
          useInstructions: false,
          disableThinking: true,
          logMetrics: true,
          temperature: 0.0,
          topP: 0.9,
          topK: 40
        });
      } catch {
        return topCandidates; // Retorna candidatos sem reordenar
      }

      // Extrair array JSON da resposta
      const jsonMatch = textContent.match(/\[[\s\S]*?\]/);
      if (!jsonMatch) {
        return topCandidates;
      }

      const rankedIds = JSON.parse(jsonMatch[0]);

      // Reordenar modelos baseado no ranking da IA
      const ranked: Model[] = [];
      rankedIds.forEach((id: string) => {
        const model = topCandidates.find((m: Model) => m.id === id);
        if (model) ranked.push(model);
      });

      // Adicionar modelos que não foram ranqueados pela IA (se houver)
      topCandidates.forEach((m: Model) => {
        if (!ranked.find((r: Model) => r.id === m.id)) {
          ranked.push(m);
        }
      });

      return ranked;

    } catch {
      return topCandidates; // Retorna candidatos sem reordenar em caso de erro
    }
  }, [aiIntegration]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // BUSCA DE SUGESTÕES
  // ═══════════════════════════════════════════════════════════════════════════════

  const findSuggestions = useCallback(async (topic: Topic): Promise<SuggestionsResult> => {
    // 🔑 ZUSTAND: Acessa models diretamente do store
    const { models } = useModelsStore.getState();

    // v1.29.05: Não gerar sugestões para tópicos especiais (RELATÓRIO e DISPOSITIVO)
    if (isSpecialTopic(topic)) return { suggestions: [], source: null };

    // v1.28.02: IA Local para sugestões (sem API Claude)
    if (aiIntegration.aiSettings.useLocalAIForSuggestions && searchModelReady && models.some(m => m.embedding?.length === 768)) {
      if (!topic?.title || topic.title.length < 3) return { suggestions: [], source: null };
      // v1.32.22: Usar apenas título para query mais focada
      const topicText = topic.title;
      const cacheKey = `suggestions_local_${topicText}`;
      const cached = apiCache.get(cacheKey);
      if (cached && typeof cached === 'string') {
        try {
          return JSON.parse(cached) as SuggestionsResult;
        } catch { /* ignore parse error */ }
      }
      try {
        await new Promise(r => setTimeout(r, 0)); // Yield para UI não congelar
        // v1.32.20: toLowerCase para E5 case-sensitive
        const qEmb = await AIModelService.getEmbedding(topicText.toLowerCase(), 'query');
        const threshold = (aiIntegration.aiSettings.modelSemanticThreshold || 60) / 100;
        const results = models
          .filter(m => m.embedding?.length === 768)
          .map(m => ({ ...m, similarity: AIModelService.cosineSimilarity(qEmb, m.embedding || []) }))
          .filter(m => m.similarity >= threshold)
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, 5);
        const result: SuggestionsResult = { suggestions: results, source: 'local' };
        apiCache.set(cacheKey, JSON.stringify(result));
        return result;
      } catch { /* fallback para sistema atual */ }
    }

    if (!topic || !topic.title || topic.title.length < 3) return { suggestions: [], source: null };
    if (models.length === 0) return { suggestions: [], source: null };

    const topicTitle = topic.title;
    const topicCategory = topic.category || '';
    const topicRelatorio = topic.relatorio || topic.editedRelatorio || '';

    // Cache key baseado em título + categoria + relatório do tópico
    const cacheKey = `suggestions_${topicTitle}_${topicCategory}_${topicRelatorio}`;

    // Verificar cache antes de processar
    const cachedResult = apiCache.get(cacheKey);
    if (cachedResult && typeof cachedResult === 'string') {
      try {
        return JSON.parse(cachedResult) as SuggestionsResult;
      } catch { /* ignore parse error */ }
    }

    // PASSO 1: Pontuação local
    const scoredModels = models.map(model => ({
      model,
      score: scoreModel(model, topicTitle, topicCategory, topicRelatorio)
    })).filter(item => item.score > 0);

    // Ordenar por score
    scoredModels.sort((a, b) => b.score - a.score);

    // Pegar top 10 candidatos para refinamento com IA
    const topCandidates = scoredModels.slice(0, 10).map(item => item.model);

    if (topCandidates.length === 0) return { suggestions: [], source: null };

    // PASSO 2: Refinamento semântico com IA
    const refinedModels = await refineWithAI(topCandidates, topicTitle, topicCategory, topicRelatorio);

    // Retornar top 5 modelos mais relevantes
    const topSuggestions = refinedModels.slice(0, 5);
    const result: SuggestionsResult = { suggestions: topSuggestions, source: 'api' };

    // Cachear sugestões refinadas
    apiCache.set(cacheKey, JSON.stringify(result));

    return result;
  }, [aiIntegration.aiSettings.useLocalAIForSuggestions, aiIntegration.aiSettings.modelSemanticThreshold, searchModelReady, apiCache, refineWithAI]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // RETORNO
  // ═══════════════════════════════════════════════════════════════════════════════

  return {
    findSuggestions,
  };
}

export default useModelSuggestions;

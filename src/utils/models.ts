/**
 * @file models.ts
 * @description Utilitários de busca semântica de modelos
 * @version 1.37.58
 *
 * Extraído do App.tsx
 */

import AIModelService from '../services/AIModelService';
import type { Model } from '../types';
import { EMBEDDING_DIMENSION } from '../constants/embeddings';

// ═══════════════════════════════════════════════════════════════════════════════
// BUSCA SEMÂNTICA DE MODELOS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Busca modelos por similaridade semântica usando embeddings
 * v1.27.01: Usa embeddings inline
 */
export const searchModelsBySimilarity = async (
  models: Model[],
  query: string,
  options: { threshold?: number; limit?: number } = {}
): Promise<(Model & { similarity: number })[]> => {
  const { threshold = 0.4, limit = 20 } = options;

  if (!query || query.length < 3) return [];

  // Filtrar apenas modelos com embedding
  const modelsWithEmbedding = models.filter((m: Model) => m.embedding?.length === EMBEDDING_DIMENSION);
  if (modelsWithEmbedding.length === 0) return [];

  // Gerar embedding da query (v1.32.20: toLowerCase para E5 case-sensitive)
  const queryEmbedding = await AIModelService.getEmbedding(query.toLowerCase(), 'query');

  // Calcular similaridade
  const scored = modelsWithEmbedding.map((model: Model) => ({
    ...model,
    similarity: AIModelService.cosineSimilarity(queryEmbedding, model.embedding!)
  }));

  // Filtrar por threshold e ordenar
  return scored
    .filter(m => m.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
};

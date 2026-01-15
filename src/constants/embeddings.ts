/**
 * @file embeddings.ts
 * @description Configuração do modelo de embeddings E5
 * @version 1.37.58 - Migração e5-base → e5-large
 */

/**
 * Dimensão dos vetores de embedding gerados pelo modelo E5
 * - e5-base: 768 dimensões
 * - e5-large: 1024 dimensões (atual)
 */
export const EMBEDDING_DIMENSION = 1024;

/**
 * Nome completo do modelo E5 no HuggingFace
 * Usado pelo ai-worker.js para carregar o modelo via @xenova/transformers
 */
export const EMBEDDING_MODEL = 'Xenova/multilingual-e5-large';

/**
 * Nome curto do modelo (sem prefixo Xenova/)
 * Usado em logs e mensagens de progresso
 */
export const EMBEDDING_MODEL_SHORT = 'multilingual-e5-large';

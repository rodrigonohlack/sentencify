/**
 * @file index.ts
 * @description Barrel export para utilitários
 * @version 1.36.81
 */

// Jurisprudência helpers
export {
  STATUS_INVALIDOS,
  isStatusValido,
  jurisCache,
  JURIS_CACHE_TTL,
  hashJurisKey,
  stemJuridico,
  expandWithSynonyms,
  refineJurisWithAIHelper,
  findJurisprudenciaHelper
} from './jurisprudencia';
export type { CallAIFunction } from './jurisprudencia';

// Text utilities
export {
  anonymizeText,
  normalizeHTMLSpacing,
  removeMetaComments,
  SPECIAL_TOPICS,
  isSpecialTopic,
  isRelatorio,
  isDispositivo,
  generateModelId
} from './text';

// Model utilities
export { searchModelsBySimilarity } from './models';

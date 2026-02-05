// ═══════════════════════════════════════════════════════════════════════════
// NOTÍCIAS JURÍDICAS - Barrel Export
// v1.41.0 - Exportação principal do app de notícias
// ═══════════════════════════════════════════════════════════════════════════

export { NoticiasApp, default } from './NoticiasApp';

// Re-exportar tipos para uso externo
export type {
  NewsItem,
  NewsSource,
  NewsFilters,
  NewsSourceType,
  NewsPeriod
} from './types';

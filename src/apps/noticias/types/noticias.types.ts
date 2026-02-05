// ═══════════════════════════════════════════════════════════════════════════
// TIPOS - App de Notícias Jurídicas
// v1.41.0 - Tipos TypeScript para o app de notícias trabalhistas
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Tipo de fonte de notícias
 */
export type NewsSourceType = 'tribunal' | 'portal';

/**
 * Período de filtro de notícias
 */
export type NewsPeriod = 'today' | 'week' | 'biweekly' | 'month' | 'all';

/**
 * Fonte de notícias (RSS ou manual)
 */
export interface NewsSource {
  readonly id: string;
  readonly name: string;
  readonly type: NewsSourceType;
  readonly feedUrl?: string;
  readonly websiteUrl: string;
  readonly logoUrl?: string;
  enabled: boolean;
}

/**
 * Item de notícia individual
 */
export interface NewsItem {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly content?: string;
  readonly link: string;
  readonly sourceId: string;
  readonly sourceName: string;
  readonly publishedAt: string;
  readonly fetchedAt: string;
  themes: string[];
  aiSummary?: string;
  aiSummaryGeneratedAt?: string;
  isFavorite: boolean;
  isRead: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Notícia para criação (sem id e campos automáticos)
 */
export interface NewsItemCreate {
  sourceId: string;
  sourceName: string;
  title: string;
  description: string;
  content?: string;
  link: string;
  publishedAt?: string;
  themes?: string[];
}

/**
 * Filtros do feed de notícias
 */
export interface NewsFilters {
  sources: string[];
  themes: string[];
  period: NewsPeriod;
  searchQuery: string;
  onlyFavorites: boolean;
  onlyUnread: boolean;
}

/**
 * Resposta paginada da API de notícias
 */
export interface NewsListResponse {
  news: NewsItem[];
  total: number;
  hasMore: boolean;
}

/**
 * Estatísticas de notícias
 */
export interface NewsStats {
  total: number;
  withSummary: number;
  today: number;
  bySources: Array<{
    sourceId: string;
    sourceName: string;
    count: number;
  }>;
}

/**
 * Tab ativa no app de notícias
 */
export type NoticiasTab = 'feed' | 'favorites' | 'settings';

/**
 * Estado de loading específico para operações
 */
export interface NoticiasLoadingState {
  feed: boolean;
  summary: string | null; // ID da notícia sendo resumida
  favorite: string | null; // ID da notícia sendo favoritada
  refresh: boolean;
}

/**
 * Item RSS parseado do feed
 */
export interface RSSItem {
  title: string;
  description: string;
  link: string;
  pubDate?: string;
  content?: string;
  categories?: string[];
}

/**
 * Resultado do parsing de RSS
 */
export interface RSSParseResult {
  items: RSSItem[];
  feedTitle?: string;
  feedDescription?: string;
  error?: string;
}

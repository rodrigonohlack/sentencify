// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES - Fontes de Notícias Jurídicas
// v1.41.0 - Configuração de RSS e fontes padrão
// ═══════════════════════════════════════════════════════════════════════════

import type { NewsSource, NewsPeriod } from '../types/noticias.types';

/**
 * Configuração de CORS proxy para fetch de RSS
 * Necessário porque RSS feeds não permitem CORS
 */
export const RSS_CONFIG = {
  /** URL do proxy CORS para contornar restrições */
  CORS_PROXY_URL: 'https://api.allorigins.win/raw?url=',
  /** Timeout para fetch de RSS (ms) */
  FETCH_TIMEOUT_MS: 10000,
  /** Máximo de tentativas de retry */
  RETRY_MAX_ATTEMPTS: 3,
  /** Delay inicial entre retries (ms) */
  RETRY_INITIAL_DELAY_MS: 1000,
} as const;

/**
 * Palavras-chave para filtrar notícias trabalhistas
 */
export const LABOR_KEYWORDS = [
  'trabalhista', 'trabalho', 'tst', 'trt', 'clt',
  'empregado', 'empregador', 'justa causa', 'rescisão',
  'salário', 'férias', 'fgts', 'horas extras', 'aviso prévio',
  'reclamatória', 'reclamante', 'reclamada', 'vínculo empregatício',
  'acidente de trabalho', 'insalubridade', 'periculosidade',
  'adicional noturno', 'intervalo intrajornada', 'banco de horas',
  'teletrabalho', 'home office', 'pejotização', 'terceirização',
  'assédio moral', 'assédio sexual', 'dano moral trabalhista',
  'estabilidade', 'gestante', 'cipeiro', 'dirigente sindical'
] as const;

/**
 * Configuração dos filtros de período
 */
export const PERIOD_OPTIONS: Array<{ value: NewsPeriod; label: string; days: number | null }> = [
  { value: 'today', label: 'Hoje', days: 1 },
  { value: 'week', label: 'Esta semana', days: 7 },
  { value: 'biweekly', label: 'Quinzena', days: 14 },
  { value: 'month', label: 'Este mês', days: 30 },
  { value: 'all', label: 'Todas', days: null },
] as const;

/**
 * Fontes padrão de notícias jurídicas
 * Verificar periodicamente se URLs de RSS ainda funcionam
 *
 * NOTA: Alguns tribunais podem não ter RSS público ou estar desatualizado.
 * O sistema tentará buscar e ignora silenciosamente fontes que falham.
 */
export const DEFAULT_SOURCES: NewsSource[] = [
  // ═══════════════════════════════════════════════════════════════
  // TRIBUNAIS SUPERIORES
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'stf',
    name: 'STF - Supremo Tribunal Federal',
    type: 'tribunal',
    feedUrl: 'http://www.stf.jus.br/portal/RSS/rss.asp',
    websiteUrl: 'https://portal.stf.jus.br',
    enabled: true
  },
  {
    id: 'stj',
    name: 'STJ - Superior Tribunal de Justiça',
    type: 'tribunal',
    feedUrl: 'https://scon.stj.jus.br/SCON/feed.jsp',
    websiteUrl: 'https://www.stj.jus.br',
    enabled: true
  },
  {
    id: 'tst',
    name: 'TST - Tribunal Superior do Trabalho',
    type: 'tribunal',
    feedUrl: 'https://www.tst.jus.br/noticias/-/asset_publisher/89Dk/rss',
    websiteUrl: 'https://www.tst.jus.br',
    enabled: true
  },

  // ═══════════════════════════════════════════════════════════════
  // TRIBUNAIS REGIONAIS DO TRABALHO (24 TRTs)
  // ═══════════════════════════════════════════════════════════════
  { id: 'trt1',  name: 'TRT-1 (RJ)',         type: 'tribunal', feedUrl: 'https://www.trt1.jus.br/rss/noticias',   websiteUrl: 'https://www.trt1.jus.br',  enabled: true },
  { id: 'trt2',  name: 'TRT-2 (SP Capital)', type: 'tribunal', feedUrl: 'https://ww2.trt2.jus.br/noticias/rss',   websiteUrl: 'https://ww2.trt2.jus.br',  enabled: true },
  { id: 'trt3',  name: 'TRT-3 (MG)',         type: 'tribunal', feedUrl: 'https://portal.trt3.jus.br/internet/conheca-o-trt/comunicacao/rss', websiteUrl: 'https://portal.trt3.jus.br', enabled: true },
  { id: 'trt4',  name: 'TRT-4 (RS)',         type: 'tribunal', feedUrl: 'https://www.trt4.jus.br/portais/trt4/rss', websiteUrl: 'https://www.trt4.jus.br', enabled: true },
  { id: 'trt5',  name: 'TRT-5 (BA)',         type: 'tribunal', feedUrl: 'https://www.trt5.jus.br/rss/noticias',   websiteUrl: 'https://www.trt5.jus.br',  enabled: true },
  { id: 'trt6',  name: 'TRT-6 (PE)',         type: 'tribunal', feedUrl: 'https://www.trt6.jus.br/portal/rss',     websiteUrl: 'https://www.trt6.jus.br',  enabled: true },
  { id: 'trt7',  name: 'TRT-7 (CE)',         type: 'tribunal', feedUrl: 'https://www.trt7.jus.br/rss/noticias',   websiteUrl: 'https://www.trt7.jus.br',  enabled: true },
  { id: 'trt8',  name: 'TRT-8 (PA/AP)',      type: 'tribunal', feedUrl: 'https://www.trt8.jus.br/rss/noticias',   websiteUrl: 'https://www.trt8.jus.br',  enabled: true },
  { id: 'trt9',  name: 'TRT-9 (PR)',         type: 'tribunal', feedUrl: 'https://www.trt9.jus.br/portal/rss',     websiteUrl: 'https://www.trt9.jus.br',  enabled: true },
  { id: 'trt10', name: 'TRT-10 (DF/TO)',     type: 'tribunal', feedUrl: 'https://www.trt10.jus.br/rss/noticias',  websiteUrl: 'https://www.trt10.jus.br', enabled: true },
  { id: 'trt11', name: 'TRT-11 (AM/RR)',     type: 'tribunal', feedUrl: 'https://portal.trt11.jus.br/rss',        websiteUrl: 'https://portal.trt11.jus.br', enabled: true },
  { id: 'trt12', name: 'TRT-12 (SC)',        type: 'tribunal', feedUrl: 'https://www.trt12.jus.br/portal/rss',    websiteUrl: 'https://www.trt12.jus.br', enabled: true },
  { id: 'trt13', name: 'TRT-13 (PB)',        type: 'tribunal', feedUrl: 'https://www.trt13.jus.br/rss/noticias',  websiteUrl: 'https://www.trt13.jus.br', enabled: true },
  { id: 'trt14', name: 'TRT-14 (RO/AC)',     type: 'tribunal', feedUrl: 'https://www.trt14.jus.br/rss/noticias',  websiteUrl: 'https://www.trt14.jus.br', enabled: true },
  { id: 'trt15', name: 'TRT-15 (Campinas)',  type: 'tribunal', feedUrl: 'https://trt15.jus.br/rss/noticias',      websiteUrl: 'https://trt15.jus.br',     enabled: true },
  { id: 'trt16', name: 'TRT-16 (MA)',        type: 'tribunal', feedUrl: 'https://www.trt16.jus.br/rss/noticias',  websiteUrl: 'https://www.trt16.jus.br', enabled: true },
  { id: 'trt17', name: 'TRT-17 (ES)',        type: 'tribunal', feedUrl: 'https://www.trt17.jus.br/rss/noticias',  websiteUrl: 'https://www.trt17.jus.br', enabled: true },
  { id: 'trt18', name: 'TRT-18 (GO)',        type: 'tribunal', feedUrl: 'https://www.trt18.jus.br/portal/rss',    websiteUrl: 'https://www.trt18.jus.br', enabled: true },
  { id: 'trt19', name: 'TRT-19 (AL)',        type: 'tribunal', feedUrl: 'https://www.trt19.jus.br/rss/noticias',  websiteUrl: 'https://www.trt19.jus.br', enabled: true },
  { id: 'trt20', name: 'TRT-20 (SE)',        type: 'tribunal', feedUrl: 'https://www.trt20.jus.br/rss/noticias',  websiteUrl: 'https://www.trt20.jus.br', enabled: true },
  { id: 'trt21', name: 'TRT-21 (RN)',        type: 'tribunal', feedUrl: 'https://www.trt21.jus.br/rss/noticias',  websiteUrl: 'https://www.trt21.jus.br', enabled: true },
  { id: 'trt22', name: 'TRT-22 (PI)',        type: 'tribunal', feedUrl: 'https://www.trt22.jus.br/rss/noticias',  websiteUrl: 'https://www.trt22.jus.br', enabled: true },
  { id: 'trt23', name: 'TRT-23 (MT)',        type: 'tribunal', feedUrl: 'https://portal.trt23.jus.br/portal/rss', websiteUrl: 'https://portal.trt23.jus.br', enabled: true },
  { id: 'trt24', name: 'TRT-24 (MS)',        type: 'tribunal', feedUrl: 'https://www.trt24.jus.br/rss/noticias',  websiteUrl: 'https://www.trt24.jus.br', enabled: true },

  // ═══════════════════════════════════════════════════════════════
  // PORTAIS JURÍDICOS
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'conjur',
    name: 'Consultor Jurídico',
    type: 'portal',
    feedUrl: 'https://www.conjur.com.br/rss.xml',
    websiteUrl: 'https://www.conjur.com.br',
    enabled: true
  },
  {
    id: 'migalhas',
    name: 'Migalhas',
    type: 'portal',
    feedUrl: 'https://www.migalhas.com.br/rss/quentes',
    websiteUrl: 'https://www.migalhas.com.br',
    enabled: true
  },
  {
    id: 'jota',
    name: 'JOTA',
    type: 'portal',
    feedUrl: 'https://www.jota.info/feed',
    websiteUrl: 'https://www.jota.info',
    enabled: true
  }
];

// Total: 31 fontes (3 superiores + 24 TRTs + 4 portais)

/**
 * Filtros padrão iniciais
 */
export const DEFAULT_FILTERS = {
  sources: [] as string[],
  themes: [] as string[],
  period: 'week' as NewsPeriod,
  searchQuery: '',
  onlyFavorites: false,
  onlyUnread: false,
} as const;

/**
 * Configuração de paginação
 */
export const PAGINATION_CONFIG = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

/**
 * Chaves de localStorage
 */
export const STORAGE_KEYS = {
  FILTERS: 'sentencify-noticias-filters',
  SOURCES: 'sentencify-noticias-sources',
  LAST_REFRESH: 'sentencify-noticias-last-refresh',
} as const;

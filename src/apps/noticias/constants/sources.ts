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
  CORS_PROXY_URL: '/api/rss-proxy?url=',
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
    // RSS direto bloqueado fora do BR (403) — via Google News RSS
    feedUrl: 'https://news.google.com/rss/search?q=site:noticias.stf.jus.br&hl=pt-BR&gl=BR&ceid=BR:pt-419',
    websiteUrl: 'https://portal.stf.jus.br',
    enabled: true
  },
  {
    id: 'stj',
    name: 'STJ - Superior Tribunal de Justiça',
    type: 'tribunal',
    feedUrl: 'https://res.stj.jus.br/hrestp-c-portalp/RSS.xml',
    websiteUrl: 'https://www.stj.jus.br',
    enabled: true
  },
  {
    id: 'tst',
    name: 'TST - Tribunal Superior do Trabalho',
    type: 'tribunal',
    feedUrl: 'https://www.tst.jus.br/rss',
    websiteUrl: 'https://www.tst.jus.br',
    enabled: true
  },

  // ═══════════════════════════════════════════════════════════════
  // TRIBUNAIS REGIONAIS DO TRABALHO (24 TRTs)
  // NOTA: Todos os TRTs bloqueiam acesso de IPs fora do Brasil (403 Forbidden).
  // Como o Render roda nos EUA, nenhum TRT funciona via server-side ou CORS proxy.
  // Google News RSS também não é viável (retorna páginas de PJe/login, não notícias).
  // ═══════════════════════════════════════════════════════════════
  { id: 'trt1',  name: 'TRT-1 (RJ)',         type: 'tribunal', websiteUrl: 'https://www.trt1.jus.br',    enabled: false },  // Sem RSS público
  { id: 'trt2',  name: 'TRT-2 (SP Capital)', type: 'tribunal', feedUrl: 'https://ww2.trt2.jus.br/noticias/noticias/?type=9818', websiteUrl: 'https://ww2.trt2.jus.br', enabled: false },  // Bloqueado fora do BR (403)
  { id: 'trt3',  name: 'TRT-3 (MG)',         type: 'tribunal', feedUrl: 'https://portal.trt3.jus.br/rss.xml',     websiteUrl: 'https://portal.trt3.jus.br', enabled: false },  // Bloqueado fora do BR (403)
  { id: 'trt4',  name: 'TRT-4 (RS)',         type: 'tribunal', websiteUrl: 'https://www.trt4.jus.br',    enabled: false },  // Sem RSS público
  { id: 'trt5',  name: 'TRT-5 (BA)',         type: 'tribunal', websiteUrl: 'https://www.trt5.jus.br',    enabled: false },  // Sem RSS público
  { id: 'trt6',  name: 'TRT-6 (PE)',         type: 'tribunal', websiteUrl: 'https://www.trt6.jus.br',    enabled: false },  // Sem RSS público
  { id: 'trt7',  name: 'TRT-7 (CE)',         type: 'tribunal', feedUrl: 'https://www.trt7.jus.br/index.php?option=com_content&view=category&id=152&Itemid=887&format=feed&type=rss', websiteUrl: 'https://www.trt7.jus.br', enabled: false },  // Bloqueado fora do BR (403)
  { id: 'trt8',  name: 'TRT-8 (PA/AP)',      type: 'tribunal', feedUrl: 'https://news.google.com/rss/search?q=%22TRT-8%22+OR+%22TRT+8%22+OR+%22TRT+da+8%C2%AA+Regi%C3%A3o%22&hl=pt-BR&gl=BR&ceid=BR:pt-419', websiteUrl: 'https://www.trt8.jus.br', enabled: true },  // RSS direto bloqueado (CloudFront) — via Google News
  { id: 'trt9',  name: 'TRT-9 (PR)',         type: 'tribunal', feedUrl: 'https://www.trt9.jus.br/portal/NoticiaRSS', websiteUrl: 'https://www.trt9.jus.br', enabled: false },  // Bloqueado fora do BR (403)
  { id: 'trt10', name: 'TRT-10 (DF/TO)',     type: 'tribunal', feedUrl: 'https://www.trt10.jus.br/ascom/noticiasrss.php', websiteUrl: 'https://www.trt10.jus.br', enabled: false },  // Bloqueado fora do BR (403)
  { id: 'trt11', name: 'TRT-11 (AM/RR)',     type: 'tribunal', feedUrl: 'https://portal.trt11.jus.br/index.php/comunicacao/noticias-lista?format=feed&type=rss', websiteUrl: 'https://portal.trt11.jus.br', enabled: false },  // Bloqueado fora do BR (403)
  { id: 'trt12', name: 'TRT-12 (SC)',        type: 'tribunal', websiteUrl: 'https://www.trt12.jus.br',   enabled: false },  // Sem RSS público
  { id: 'trt13', name: 'TRT-13 (PB)',        type: 'tribunal', websiteUrl: 'https://www.trt13.jus.br',   enabled: false },  // Sem RSS público
  { id: 'trt14', name: 'TRT-14 (RO/AC)',     type: 'tribunal', feedUrl: 'https://portal.trt14.jus.br/portal/noticias/rss.xml', websiteUrl: 'https://www.trt14.jus.br', enabled: false },  // Bloqueado fora do BR (403)
  { id: 'trt15', name: 'TRT-15 (Campinas)',  type: 'tribunal', feedUrl: 'https://trt15.jus.br/noticias/rss.xml',  websiteUrl: 'https://trt15.jus.br',     enabled: false },  // Bloqueado fora do BR (403)
  { id: 'trt16', name: 'TRT-16 (MA)',        type: 'tribunal', feedUrl: 'https://www.trt16.jus.br/noticias/rss',  websiteUrl: 'https://www.trt16.jus.br', enabled: false },  // Bloqueado fora do BR (403)
  { id: 'trt17', name: 'TRT-17 (ES)',        type: 'tribunal', websiteUrl: 'https://www.trt17.jus.br',   enabled: false },  // Sem RSS público
  { id: 'trt18', name: 'TRT-18 (GO)',        type: 'tribunal', feedUrl: 'https://www.trt18.jus.br/portal/rss',    websiteUrl: 'https://www.trt18.jus.br', enabled: false },  // Bloqueado fora do BR (403)
  { id: 'trt19', name: 'TRT-19 (AL)',        type: 'tribunal', websiteUrl: 'https://www.trt19.jus.br',   enabled: false },  // Sem RSS público
  { id: 'trt20', name: 'TRT-20 (SE)',        type: 'tribunal', feedUrl: 'https://www.trt20.jus.br/?format=feed&type=rss', websiteUrl: 'https://www.trt20.jus.br', enabled: false },  // Bloqueado fora do BR (403)
  { id: 'trt21', name: 'TRT-21 (RN)',        type: 'tribunal', websiteUrl: 'https://www.trt21.jus.br',   enabled: false },  // Sem RSS público
  { id: 'trt22', name: 'TRT-22 (PI)',        type: 'tribunal', websiteUrl: 'https://www.trt22.jus.br',   enabled: false },  // Sem RSS público
  { id: 'trt23', name: 'TRT-23 (MT)',        type: 'tribunal', feedUrl: 'https://portal.trt23.jus.br/portal/noticias/feed', websiteUrl: 'https://portal.trt23.jus.br', enabled: false },  // Bloqueado fora do BR (403)
  { id: 'trt24', name: 'TRT-24 (MS)',        type: 'tribunal', feedUrl: 'https://www.trt24.jus.br/web/guest/noticias/-/asset_publisher/ND6zpys7a3hM/rss', websiteUrl: 'https://www.trt24.jus.br', enabled: false },  // Bloqueado fora do BR (403)

  // ═══════════════════════════════════════════════════════════════
  // PORTAIS JURÍDICOS
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'conjur',
    name: 'Consultor Jurídico',
    type: 'portal',
    // /rss.xml redireciona 302 → /feed (evitar redirect)
    feedUrl: 'https://www.conjur.com.br/feed',
    websiteUrl: 'https://www.conjur.com.br',
    enabled: true
  },
  {
    id: 'migalhas',
    name: 'Migalhas',
    type: 'portal',
    feedUrl: 'https://news.google.com/rss/search?q=site:migalhas.com.br&hl=pt-BR&gl=BR&ceid=BR:pt-419',
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
// Com RSS funcional: 7 (STF*, STJ, TST, TRT-8*, Conjur, Migalhas*, JOTA) *via Google News
// TRTs: todos desabilitados exceto TRT-8 (bloqueio de IP fora do Brasil)

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

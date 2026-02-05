// ═══════════════════════════════════════════════════════════════════════════
// SERVIÇO - Parser e Fetcher de RSS
// v1.41.0 - Serviço para coleta de notícias via RSS
// ═══════════════════════════════════════════════════════════════════════════

import { RSS_CONFIG, LABOR_KEYWORDS } from '../constants/sources';
import type { NewsSource, NewsItemCreate, RSSItem, RSSParseResult } from '../types';

/**
 * Faz parse de XML RSS para array de items
 * @param xmlText - Texto XML do feed RSS
 * @returns Resultado do parsing com items ou erro
 */
export const parseRSSXml = (xmlText: string): RSSParseResult => {
  try {
    // Sanitizar XML: remover BOM e caracteres de controle inválidos
    let cleaned = xmlText.replace(/^\uFEFF/, '');
    cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');

    const parser = new DOMParser();
    const doc = parser.parseFromString(cleaned, 'text/xml');

    // Verificar erro de parsing
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      return { items: [], error: 'Erro ao fazer parse do XML' };
    }

    // Tentar RSS 2.0 primeiro
    let items = doc.querySelectorAll('item');

    // Se não encontrar, tentar Atom
    if (items.length === 0) {
      items = doc.querySelectorAll('entry');
    }

    const feedTitle = doc.querySelector('channel > title, feed > title')?.textContent || undefined;
    const feedDescription = doc.querySelector('channel > description, feed > subtitle')?.textContent || undefined;

    const parsedItems: RSSItem[] = [];

    items.forEach((item) => {
      // RSS 2.0
      let title = item.querySelector('title')?.textContent || '';
      let description = item.querySelector('description')?.textContent || '';
      let link = item.querySelector('link')?.textContent || '';
      let pubDate = item.querySelector('pubDate')?.textContent || undefined;
      const content = item.querySelector('content\\:encoded, encoded')?.textContent || undefined;

      // Atom format
      if (!link) {
        const linkEl = item.querySelector('link[href]');
        link = linkEl?.getAttribute('href') || '';
      }
      if (!pubDate) {
        pubDate = item.querySelector('published, updated')?.textContent || undefined;
      }

      // Limpar HTML de description
      if (description) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = description;
        description = tempDiv.textContent || tempDiv.innerText || '';
        description = description.trim().slice(0, 500);
      }

      // Categorias/Tags
      const categoryEls = item.querySelectorAll('category');
      const categories = Array.from(categoryEls).map(c => c.textContent || '').filter(Boolean);

      if (title && link) {
        parsedItems.push({
          title: title.trim(),
          description: description.trim(),
          link: link.trim(),
          pubDate,
          content,
          categories
        });
      }
    });

    return { items: parsedItems, feedTitle, feedDescription };
  } catch (error) {
    return { items: [], error: String(error) };
  }
};

/**
 * Busca RSS de uma fonte usando CORS proxy
 * @param source - Fonte de notícias
 * @returns Items parseados ou array vazio em caso de erro
 */
export const fetchRSSFeed = async (source: NewsSource): Promise<NewsItemCreate[]> => {
  if (!source.feedUrl || !source.enabled) {
    return [];
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), RSS_CONFIG.FETCH_TIMEOUT_MS);

  try {
    const proxyUrl = RSS_CONFIG.CORS_PROXY_URL + encodeURIComponent(source.feedUrl);
    const response = await fetch(proxyUrl, { signal: controller.signal });

    if (!response.ok) {
      console.warn(`[RSS] ${source.name}: HTTP ${response.status}`);
      return [];
    }

    const xmlText = await response.text();
    const { items, error } = parseRSSXml(xmlText);

    if (error) {
      console.warn(`[RSS] ${source.name}: ${error}`);
      return [];
    }

    // Converter para NewsItemCreate
    return items.map((item) => ({
      sourceId: source.id,
      sourceName: source.name,
      title: item.title,
      description: item.description,
      content: item.content,
      link: item.link,
      publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
      themes: item.categories
    }));
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      console.warn(`[RSS] ${source.name}: Timeout`);
    } else {
      console.warn(`[RSS] ${source.name}: ${error}`);
    }
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * Verifica se notícia é relevante para área trabalhista
 * @param news - Item de notícia
 * @returns true se contém keywords trabalhistas
 */
export const isRelevantToLabor = (news: NewsItemCreate): boolean => {
  const text = (news.title + ' ' + news.description).toLowerCase();
  return LABOR_KEYWORDS.some(kw => text.includes(kw.toLowerCase()));
};

/**
 * Busca notícias de todas as fontes habilitadas
 * @param sources - Lista de fontes
 * @param filterByLabor - Se deve filtrar por relevância trabalhista
 * @returns Array de notícias coletadas
 */
export const fetchAllRSSFeeds = async (
  sources: NewsSource[],
  filterByLabor: boolean = true
): Promise<NewsItemCreate[]> => {
  const enabledSources = sources.filter(s => s.enabled && s.feedUrl);

  // Fetch paralelo de todas as fontes
  const results = await Promise.allSettled(
    enabledSources.map(source => fetchRSSFeed(source))
  );

  // Combinar resultados bem-sucedidos
  let allNews = results
    .filter((r): r is PromiseFulfilledResult<NewsItemCreate[]> => r.status === 'fulfilled')
    .flatMap(r => r.value);

  // Filtrar por relevância trabalhista (opcional)
  if (filterByLabor) {
    allNews = allNews.filter(isRelevantToLabor);
  }

  // Ordenar por data de publicação (mais recentes primeiro)
  allNews.sort((a, b) => {
    const dateA = new Date(a.publishedAt || 0).getTime();
    const dateB = new Date(b.publishedAt || 0).getTime();
    return dateB - dateA;
  });

  return allNews;
};

/**
 * Resultado da coleta de RSS
 */
export interface RSSFetchResult {
  news: NewsItemCreate[];
  successCount: number;
  errorCount: number;
  totalSources: number;
}

/**
 * Busca RSS com estatísticas detalhadas
 * @param sources - Lista de fontes
 * @param filterByLabor - Se deve filtrar por relevância trabalhista
 * @returns Resultado com notícias e estatísticas
 */
export const fetchRSSWithStats = async (
  sources: NewsSource[],
  filterByLabor: boolean = true
): Promise<RSSFetchResult> => {
  const enabledSources = sources.filter(s => s.enabled && s.feedUrl);
  const totalSources = enabledSources.length;

  const results = await Promise.allSettled(
    enabledSources.map(source => fetchRSSFeed(source))
  );

  let successCount = 0;
  let errorCount = 0;
  let allNews: NewsItemCreate[] = [];

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value.length > 0) {
      successCount++;
      allNews = allNews.concat(result.value);
    } else {
      errorCount++;
    }
  }

  if (filterByLabor) {
    allNews = allNews.filter(isRelevantToLabor);
  }

  allNews.sort((a, b) => {
    const dateA = new Date(a.publishedAt || 0).getTime();
    const dateB = new Date(b.publishedAt || 0).getTime();
    return dateB - dateA;
  });

  return {
    news: allNews,
    successCount,
    errorCount,
    totalSources
  };
};

// ═══════════════════════════════════════════════════════════════════════════
// SERVIÇO - RSS Scheduler (Server-Side)
// v1.41.0 - Coleta automática de RSS a cada 8 horas
// ═══════════════════════════════════════════════════════════════════════════

import cron from 'node-cron';
import { XMLParser } from 'fast-xml-parser';
import { getDb } from '../db/database.js';
import { v4 as uuidv4 } from 'uuid';

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO
// ═══════════════════════════════════════════════════════════════════════════

const FETCH_TIMEOUT_MS = 15_000;
const RETRY_MAX_ATTEMPTS = 2;
const RETRY_INITIAL_DELAY_MS = 2_000;
const STARTUP_DELAY_MS = 30_000;
const CRON_EXPRESSION = '0 */8 * * *'; // 00:00, 08:00, 16:00 UTC

const USER_AGENT = 'Mozilla/5.0 (compatible; SentencifyAI/1.0; +https://sentencify.ia.br)';

/** Tribunais superiores isentos do filtro trabalhista */
const SUPERIOR_COURT_IDS = ['stf', 'stj', 'tst'];

/** Palavras-chave para filtro de relevância trabalhista */
const LABOR_KEYWORDS = [
  'trabalhista', 'trabalho', 'tst', 'trt', 'clt',
  'empregado', 'empregador', 'justa causa', 'rescisão',
  'salário', 'férias', 'fgts', 'horas extras', 'aviso prévio',
  'reclamatória', 'reclamante', 'reclamada', 'vínculo empregatício',
  'acidente de trabalho', 'insalubridade', 'periculosidade',
  'adicional noturno', 'intervalo intrajornada', 'banco de horas',
  'teletrabalho', 'home office', 'pejotização', 'terceirização',
  'assédio moral', 'assédio sexual', 'dano moral trabalhista',
  'estabilidade', 'gestante', 'cipeiro', 'dirigente sindical'
];

/**
 * Fontes RSS — espelha DEFAULT_SOURCES do frontend (apenas habilitadas com feedUrl)
 * Manter sincronizado com src/apps/noticias/constants/sources.ts
 */
const RSS_SOURCES = [
  // Tribunais Superiores
  { id: 'stf', name: 'STF - Supremo Tribunal Federal', feedUrl: 'https://noticias.stf.jus.br/feed/' },
  { id: 'stj', name: 'STJ - Superior Tribunal de Justiça', feedUrl: 'https://res.stj.jus.br/hrestp-c-portalp/RSS.xml' },
  { id: 'tst', name: 'TST - Tribunal Superior do Trabalho', feedUrl: 'https://www.tst.jus.br/rss' },
  // TRTs
  { id: 'trt2',  name: 'TRT-2 (SP Capital)', feedUrl: 'https://ww2.trt2.jus.br/noticias/noticias/?type=9818' },
  { id: 'trt3',  name: 'TRT-3 (MG)',         feedUrl: 'https://portal.trt3.jus.br/rss.xml' },
  { id: 'trt7',  name: 'TRT-7 (CE)',         feedUrl: 'https://www.trt7.jus.br/index.php?option=com_content&view=category&id=152&Itemid=887&format=feed&type=rss' },
  { id: 'trt9',  name: 'TRT-9 (PR)',         feedUrl: 'https://www.trt9.jus.br/portal/NoticiaRSS' },
  { id: 'trt10', name: 'TRT-10 (DF/TO)',     feedUrl: 'https://www.trt10.jus.br/ascom/noticiasrss.php' },
  { id: 'trt11', name: 'TRT-11 (AM/RR)',     feedUrl: 'https://portal.trt11.jus.br/index.php/comunicacao/noticias-lista?format=feed&type=rss' },
  { id: 'trt14', name: 'TRT-14 (RO/AC)',     feedUrl: 'https://portal.trt14.jus.br/portal/noticias/rss.xml' },
  { id: 'trt15', name: 'TRT-15 (Campinas)',  feedUrl: 'https://trt15.jus.br/noticias/rss.xml' },
  { id: 'trt16', name: 'TRT-16 (MA)',        feedUrl: 'https://www.trt16.jus.br/noticias/rss' },
  { id: 'trt18', name: 'TRT-18 (GO)',        feedUrl: 'https://www.trt18.jus.br/portal/rss' },
  { id: 'trt20', name: 'TRT-20 (SE)',        feedUrl: 'https://www.trt20.jus.br/?format=feed&type=rss' },
  { id: 'trt23', name: 'TRT-23 (MT)',        feedUrl: 'https://portal.trt23.jus.br/portal/noticias/feed' },
  { id: 'trt24', name: 'TRT-24 (MS)',        feedUrl: 'https://www.trt24.jus.br/web/guest/noticias/-/asset_publisher/ND6zpys7a3hM/rss' },
  // Portais
  { id: 'conjur',   name: 'Consultor Jurídico', feedUrl: 'https://www.conjur.com.br/rss.xml' },
  { id: 'migalhas', name: 'Migalhas',           feedUrl: 'https://news.google.com/rss/search?q=site:migalhas.com.br&hl=pt-BR&gl=BR&ceid=BR:pt-419' },
  { id: 'jota',     name: 'JOTA',               feedUrl: 'https://www.jota.info/feed' },
];

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/** Remove tags HTML e decodifica entidades básicas */
const stripHtml = (html) => {
  if (!html || typeof html !== 'string') return '';
  let text = html.replace(/<!\[CDATA\[|\]\]>/g, '');
  text = text.replace(/<[^>]+>/g, ' ');
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/\s+/g, ' ');
  return text.trim();
};

/** Converte string de data para ISO com fallback seguro */
const safeDateToISO = (dateStr) => {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return new Date().toISOString();
    return d.toISOString();
  } catch {
    return new Date().toISOString();
  }
};

/** Garante que valor é array (fast-xml-parser pode retornar objeto único) */
const ensureArray = (val) => {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
};

// ═══════════════════════════════════════════════════════════════════════════
// SERVIÇO
// ═══════════════════════════════════════════════════════════════════════════

class RSSSchedulerService {
  constructor() {
    this.cronJob = null;
    this.isRunning = false;
    this.lastRun = null;
    this.xmlParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      // Sempre retornar arrays para item/entry (evita bugs com feed de 1 item)
      isArray: (name) => name === 'item' || name === 'entry' || name === 'category',
    });
  }

  /**
   * Inicia o cron scheduler
   * @param {string} cronExpr - Expressão cron (default: a cada 8h)
   */
  start(cronExpr = CRON_EXPRESSION) {
    if (this.cronJob) {
      console.warn('[RSS Scheduler] Já iniciado');
      return this;
    }

    this.cronJob = cron.schedule(cronExpr, () => {
      this.fetchAll();
    });

    console.log(`[RSS Scheduler] Agendado: "${cronExpr}" (${RSS_SOURCES.length} fontes)`);

    // Fetch inicial após delay (não bloqueia startup)
    setTimeout(() => {
      console.log('[RSS Scheduler] Executando coleta inicial...');
      this.fetchAll();
    }, STARTUP_DELAY_MS);

    return this;
  }

  /** Para o cron scheduler */
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      console.log('[RSS Scheduler] Parado');
    }
  }

  /**
   * Busca RSS de todas as fontes, filtra e insere no banco
   * @returns {{ successCount: number, errorCount: number, inserted: number, skipped: number }}
   */
  async fetchAll() {
    if (this.isRunning) {
      console.log('[RSS Scheduler] Já em execução, pulando...');
      return null;
    }

    this.isRunning = true;
    const startTime = Date.now();
    console.log('[RSS Scheduler] Iniciando coleta...');

    try {
      // Fetch paralelo de todas as fontes
      const results = await Promise.allSettled(
        RSS_SOURCES.map(source => this.fetchFeed(source))
      );

      let allNews = [];
      let successCount = 0;
      let errorCount = 0;

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value.length > 0) {
          successCount++;
          allNews.push(...result.value);
        } else {
          errorCount++;
        }
      }

      // Filtrar por relevância trabalhista
      allNews = allNews.filter(n => this.isRelevantToLabor(n));

      // Inserir no banco
      const { inserted, skipped } = this.insertBatch(allNews);

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      this.lastRun = {
        timestamp: new Date().toISOString(),
        successCount,
        errorCount,
        inserted,
        skipped,
        elapsed: `${elapsed}s`
      };

      console.log(`[RSS Scheduler] Concluído em ${elapsed}s: ${successCount} fontes OK, ${errorCount} erros | ${inserted} novas, ${skipped} duplicadas`);
      return this.lastRun;
    } catch (error) {
      console.error('[RSS Scheduler] Erro fatal:', error);
      return null;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Busca RSS de uma fonte com retry
   * @param {{ id: string, name: string, feedUrl: string }} source
   * @returns {Array} Items parseados
   */
  async fetchFeed(source) {
    for (let attempt = 0; attempt < RETRY_MAX_ATTEMPTS; attempt++) {
      if (attempt > 0) {
        await new Promise(r => setTimeout(r, RETRY_INITIAL_DELAY_MS * Math.pow(2, attempt - 1)));
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      try {
        const response = await fetch(source.feedUrl, {
          signal: controller.signal,
          redirect: 'follow',
          headers: {
            'User-Agent': USER_AGENT,
            'Accept': 'application/rss+xml, application/xml, text/xml, */*',
            'Accept-Language': 'pt-BR,pt;q=0.9',
          }
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          console.warn(`[RSS Scheduler] ${source.name}: HTTP ${response.status} (tentativa ${attempt + 1}/${RETRY_MAX_ATTEMPTS})`);
          continue;
        }

        const xmlText = await response.text();
        const items = this.parseRSSXml(xmlText);

        // Converter para formato de insert
        return items.map(item => ({
          sourceId: source.id,
          sourceName: source.name,
          title: item.title,
          description: item.description,
          content: item.content || null,
          link: item.link,
          publishedAt: item.pubDate ? safeDateToISO(item.pubDate) : new Date().toISOString(),
          themes: item.categories
        }));
      } catch (error) {
        clearTimeout(timeoutId);
        const errMsg = error.name === 'AbortError' ? 'Timeout' : error.message;
        if (attempt < RETRY_MAX_ATTEMPTS - 1) {
          console.warn(`[RSS Scheduler] ${source.name}: ${errMsg} (tentativa ${attempt + 1}/${RETRY_MAX_ATTEMPTS})`);
          continue;
        }
        console.warn(`[RSS Scheduler] ${source.name}: falhou após ${RETRY_MAX_ATTEMPTS} tentativas (${errMsg})`);
        return [];
      }
    }

    return [];
  }

  /**
   * Parse XML RSS/Atom → array de items normalizados
   * @param {string} xmlText
   * @returns {Array<{ title: string, description: string, link: string, pubDate?: string, content?: string, categories: string[] }>}
   */
  parseRSSXml(xmlText) {
    try {
      // Sanitizar: remover BOM e caracteres de controle inválidos
      let cleaned = xmlText.replace(/^\uFEFF/, '');
      cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');

      const result = this.xmlParser.parse(cleaned);

      // RSS 2.0: rss.channel.item
      let rawItems = result?.rss?.channel?.item;

      // Atom: feed.entry
      if (!rawItems) {
        rawItems = result?.feed?.entry;
      }

      if (!rawItems) return [];

      const items = ensureArray(rawItems);
      const parsed = [];

      for (const item of items) {
        // ─── Título ───
        let title = item.title || '';
        if (typeof title === 'object') title = title['#text'] || '';

        // ─── Link ───
        let link = '';
        if (typeof item.link === 'string') {
          link = item.link;
        } else if (item.link && typeof item.link === 'object') {
          // Atom: <link href="..."/>
          if (item.link['@_href']) {
            link = item.link['@_href'];
          } else if (Array.isArray(item.link)) {
            // Múltiplos <link> em Atom
            const alternate = item.link.find(l => l['@_rel'] === 'alternate' || !l['@_rel']);
            link = alternate?.['@_href'] || item.link[0]?.['@_href'] || '';
          }
        }

        // ─── Descrição ───
        let description = item.description || item.summary || '';
        if (typeof description === 'object') description = description['#text'] || '';
        description = stripHtml(description).slice(0, 500);

        // ─── Conteúdo completo ───
        let content = item['content:encoded'] || item.encoded || item.content || null;
        if (content && typeof content === 'object') content = content['#text'] || null;
        if (content) content = stripHtml(content);

        // ─── Data de publicação ───
        const pubDate = item.pubDate || item.published || item.updated || undefined;

        // ─── Categorias ───
        const rawCategories = ensureArray(item.category);
        const categories = rawCategories
          .map(c => (typeof c === 'object' ? (c['@_term'] || c['#text'] || '') : String(c)))
          .filter(Boolean);

        if (title && link) {
          parsed.push({
            title: String(title).trim(),
            description: description.trim(),
            link: String(link).trim(),
            pubDate: pubDate ? String(pubDate) : undefined,
            content,
            categories
          });
        }
      }

      return parsed;
    } catch (error) {
      console.warn('[RSS Scheduler] XML parse error:', error.message);
      return [];
    }
  }

  /**
   * Verifica relevância trabalhista (tribunais superiores sempre relevantes)
   * @param {{ sourceId: string, title: string, description: string }} news
   * @returns {boolean}
   */
  isRelevantToLabor(news) {
    if (SUPERIOR_COURT_IDS.includes(news.sourceId)) return true;
    const text = (news.title + ' ' + news.description).toLowerCase();
    return LABOR_KEYWORDS.some(kw => text.includes(kw.toLowerCase()));
  }

  /**
   * Insere batch de notícias no SQLite (dedup por link)
   * @param {Array} news
   * @returns {{ inserted: number, skipped: number }}
   */
  insertBatch(news) {
    if (!news || news.length === 0) return { inserted: 0, skipped: 0 };

    const db = getDb();
    const now = new Date().toISOString();
    let inserted = 0;
    let skipped = 0;

    const insertStmt = db.prepare(`
      INSERT OR IGNORE INTO noticias (
        id, source_id, source_name, title, description, content,
        link, published_at, fetched_at, themes, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction((items) => {
      for (const item of items) {
        const result = insertStmt.run(
          uuidv4(),
          item.sourceId,
          item.sourceName,
          item.title,
          item.description || '',
          item.content || null,
          item.link,
          item.publishedAt || now,
          now,
          item.themes ? JSON.stringify(item.themes) : null,
          now,
          now
        );
        if (result.changes > 0) {
          inserted++;
        } else {
          skipped++;
        }
      }
    });

    transaction(news);
    return { inserted, skipped };
  }
}

export default new RSSSchedulerService();

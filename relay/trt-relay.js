#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// TRT RSS Relay — Oracle Cloud (São Paulo) → Render
// Busca RSS dos 13 TRTs bloqueados fora do Brasil e envia para o Render
// ═══════════════════════════════════════════════════════════════════════════

import cron from 'node-cron';
import { XMLParser } from 'fast-xml-parser';

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO (editar conforme necessário)
// ═══════════════════════════════════════════════════════════════════════════

const RENDER_URL = process.env.RENDER_URL || 'https://sentencify.onrender.com';
const RELAY_API_KEY = process.env.RELAY_API_KEY || '';
const CRON_EXPRESSION = process.env.CRON_EXPR || '0 */8 * * *'; // 00:00, 08:00, 16:00 UTC
const FETCH_TIMEOUT_MS = 15_000;
const STARTUP_DELAY_MS = 10_000;

// ═══════════════════════════════════════════════════════════════════════════
// FONTES — TRTs com RSS funcional (bloqueados fora do BR)
// ═══════════════════════════════════════════════════════════════════════════

const TRT_SOURCES = [
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
];

// ═══════════════════════════════════════════════════════════════════════════
// FILTRO DE RELEVÂNCIA TRABALHISTA
// ═══════════════════════════════════════════════════════════════════════════

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

function isRelevantToLabor(title, description) {
  const text = (title + ' ' + description).toLowerCase();
  return LABOR_KEYWORDS.some(kw => text.includes(kw));
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

const stripHtml = (html) => {
  if (!html || typeof html !== 'string') return '';
  let text = html.replace(/<!\[CDATA\[|\]\]>/g, '');
  text = text.replace(/<[^>]+>/g, ' ');
  text = text.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  text = text.replace(/\s+/g, ' ');
  return text.trim();
};

const safeDateToISO = (dateStr) => {
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  } catch { return new Date().toISOString(); }
};

const ensureArray = (val) => (!val ? [] : Array.isArray(val) ? val : [val]);

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  isArray: (name) => name === 'item' || name === 'entry' || name === 'category',
});

// ═══════════════════════════════════════════════════════════════════════════
// FETCH E PARSE
// ═══════════════════════════════════════════════════════════════════════════

async function fetchFeed(source) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(source.feedUrl, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SentencifyAI/1.0; +https://sentencify.ia.br)',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
        'Accept-Language': 'pt-BR,pt;q=0.9',
      }
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`  ✗ ${source.name}: HTTP ${response.status}`);
      return [];
    }

    const xmlText = await response.text();
    return parseRSS(xmlText, source);
  } catch (error) {
    clearTimeout(timeoutId);
    const msg = error.name === 'AbortError' ? 'Timeout' : error.message;
    console.warn(`  ✗ ${source.name}: ${msg}`);
    return [];
  }
}

function parseRSS(xmlText, source) {
  try {
    let cleaned = xmlText.replace(/^\uFEFF/, '');
    cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
    const result = xmlParser.parse(cleaned);

    let rawItems = result?.rss?.channel?.item || result?.feed?.entry;
    if (!rawItems) return [];

    const items = ensureArray(rawItems);
    const parsed = [];

    for (const item of items) {
      let title = item.title || '';
      if (typeof title === 'object') title = title['#text'] || '';

      let link = '';
      if (typeof item.link === 'string') {
        link = item.link;
      } else if (item.link && typeof item.link === 'object') {
        if (item.link['@_href']) link = item.link['@_href'];
        else if (Array.isArray(item.link)) {
          const alt = item.link.find(l => l['@_rel'] === 'alternate' || !l['@_rel']);
          link = alt?.['@_href'] || item.link[0]?.['@_href'] || '';
        }
      }

      let description = item.description || item.summary || '';
      if (typeof description === 'object') description = description['#text'] || '';
      description = stripHtml(description).slice(0, 500);

      let content = item['content:encoded'] || item.encoded || item.content || null;
      if (content && typeof content === 'object') content = content['#text'] || null;
      if (content) content = stripHtml(content);

      const pubDate = item.pubDate || item.published || item.updated || undefined;

      const rawCategories = ensureArray(item.category);
      const categories = rawCategories
        .map(c => (typeof c === 'object' ? (c['@_term'] || c['#text'] || '') : String(c)))
        .filter(Boolean);

      if (title && link) {
        parsed.push({
          sourceId: source.id,
          sourceName: source.name,
          title: String(title).trim(),
          description: description.trim(),
          content,
          link: String(link).trim(),
          publishedAt: pubDate ? safeDateToISO(String(pubDate)) : new Date().toISOString(),
          themes: categories,
        });
      }
    }

    return parsed;
  } catch (error) {
    console.warn(`  ✗ ${source.name}: XML parse error — ${error.message}`);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ENVIO PARA O RENDER
// ═══════════════════════════════════════════════════════════════════════════

async function sendToRender(news) {
  const url = `${RENDER_URL}/api/noticias/relay-ingest`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RELAY_API_KEY}`,
    },
    body: JSON.stringify({ news }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Render HTTP ${response.status}: ${text}`);
  }

  return response.json();
}

// ═══════════════════════════════════════════════════════════════════════════
// COLETA PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

async function fetchAll() {
  const startTime = Date.now();
  console.log(`\n[${new Date().toISOString()}] Iniciando coleta de ${TRT_SOURCES.length} TRTs...`);

  const results = await Promise.allSettled(
    TRT_SOURCES.map(source => fetchFeed(source))
  );

  let allNews = [];
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const source = TRT_SOURCES[i];
    if (result.status === 'fulfilled' && result.value.length > 0) {
      successCount++;
      console.log(`  ✓ ${source.name}: ${result.value.length} itens`);
      allNews.push(...result.value);
    } else {
      errorCount++;
    }
  }

  // Filtrar por relevância trabalhista
  const beforeFilter = allNews.length;
  allNews = allNews.filter(n => isRelevantToLabor(n.title, n.description));
  const filtered = beforeFilter - allNews.length;

  console.log(`  Fontes: ${successCount} OK, ${errorCount} erros | ${allNews.length} notícias (${filtered} filtradas)`);

  if (allNews.length === 0) {
    console.log('  Nenhuma notícia para enviar.');
    return;
  }

  // Enviar para Render
  try {
    const result = await sendToRender(allNews);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`  → Render: ${result.inserted} novas, ${result.skipped} duplicadas (${elapsed}s)`);
  } catch (error) {
    console.error(`  ✗ Erro ao enviar para Render: ${error.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// STARTUP
// ═══════════════════════════════════════════════════════════════════════════

if (!RELAY_API_KEY) {
  console.error('ERRO: RELAY_API_KEY não configurada. Defina via variável de ambiente.');
  console.error('  export RELAY_API_KEY="sua-chave-aqui"');
  process.exit(1);
}

console.log(`
╔═══════════════════════════════════════════════════╗
║  SentencifyAI — TRT RSS Relay                    ║
║  Oracle Cloud (São Paulo) → Render               ║
║                                                   ║
║  TRTs: ${TRT_SOURCES.length} fontes                              ║
║  Cron: ${CRON_EXPRESSION}                         ║
║  Destino: ${RENDER_URL.slice(0, 40).padEnd(40)}║
╚═══════════════════════════════════════════════════╝
`);

// Coleta inicial após delay
setTimeout(() => {
  console.log('Executando coleta inicial...');
  fetchAll();
}, STARTUP_DELAY_MS);

// Agendar cron
cron.schedule(CRON_EXPRESSION, () => fetchAll());

console.log('Relay ativo. Ctrl+C para parar.');

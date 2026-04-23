// server/services/GeminiPruneService.js
// v1.43.00 — Cron horário de housekeeping para caches e media files do Gemini
//
// Sem chave master configurada → só faz prune local no SQLite (rows expiradas
// são marcadas; o Google apaga sozinho em até 48h pelo TTL da File API).

import cron from 'node-cron';
import { pruneExpired as pruneCaches } from './GeminiCacheService.js';
import { pruneExpired as pruneMedia } from './GeminiMediaService.js';

const CRON_EXPRESSION = '17 * * * *'; // todo minuto :17 de cada hora

let started = false;

async function runPrune() {
  const apiKey = process.env.GOOGLE_API_KEY || null;
  try {
    const c = await pruneCaches({ apiKey });
    const m = await pruneMedia({ apiKey });
    if (c.deleted || c.hardDeleted || m.expired || m.hardDeleted) {
      console.log(`[GeminiPrune] caches: ${c.deleted} expirados / ${c.hardDeleted} purgados; ` +
        `media: ${m.expired} expirados / ${m.hardDeleted} purgados`);
    }
  } catch (err) {
    console.warn(`[GeminiPrune] erro: ${err.message}`);
  }
}

export function start() {
  if (started) return;
  started = true;

  cron.schedule(CRON_EXPRESSION, runPrune, { timezone: 'UTC' });

  // Run inicial após 60s para limpar resíduos de execuções anteriores
  setTimeout(runPrune, 60_000);

  console.log('[GeminiPrune] Scheduler iniciado (horário, :17 UTC)');
}

export default { start };

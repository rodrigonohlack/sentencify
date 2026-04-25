#!/usr/bin/env node
/**
 * Baixa os modelos tessdata_best (não-integerizados) de português e inglês
 * direto do repositório oficial Tesseract OCR e gzipa para servir como
 * estático em public/tessdata/.
 *
 * tessdata_best é a versão LSTM completa (mais accurate ~3-7% que tessdata_best_int
 * mas ~2× mais lenta). Usado pelo OCR Lab (public/ocr-lab.html) para A/B test.
 *
 * Uso: npm run download:tessdata
 *
 * Saída:
 *   public/tessdata/por.traineddata.gz   (~5MB gzipado, 7.8MB raw)
 *   public/tessdata/eng.traineddata.gz   (~10MB gzipado, 14.7MB raw)
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, '..', 'public', 'tessdata');

const MODELS = [
  {
    name: 'por',
    url: 'https://github.com/tesseract-ocr/tessdata_best/raw/main/por.traineddata',
    description: 'Português (LSTM best, não-integerizado)'
  },
  {
    name: 'eng',
    url: 'https://github.com/tesseract-ocr/tessdata_best/raw/main/eng.traineddata',
    description: 'Inglês (LSTM best, não-integerizado)'
  }
];

async function downloadAndGzip({ name, url, description }) {
  console.log(`\n[${name}] ${description}`);
  console.log(`[${name}] Baixando ${url}...`);
  const t0 = Date.now();

  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ao baixar ${url}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const downloadMs = Date.now() - t0;
  console.log(`[${name}] Baixado: ${(buffer.length / 1024 / 1024).toFixed(2)} MB em ${downloadMs}ms`);

  console.log(`[${name}] Gzipando...`);
  const t1 = Date.now();
  const gzipped = gzipSync(buffer, { level: 9 });
  const gzipMs = Date.now() - t1;
  const ratio = ((1 - gzipped.length / buffer.length) * 100).toFixed(1);
  console.log(`[${name}] Gzipado: ${(gzipped.length / 1024 / 1024).toFixed(2)} MB (-${ratio}%) em ${gzipMs}ms`);

  const outputPath = join(OUTPUT_DIR, `${name}.traineddata.gz`);
  await writeFile(outputPath, gzipped);
  console.log(`[${name}] Salvo em ${outputPath}`);
}

async function main() {
  console.log('=== Download tessdata_best (LSTM não-integerizado) ===');
  console.log(`Destino: ${OUTPUT_DIR}\n`);

  await mkdir(OUTPUT_DIR, { recursive: true });

  for (const model of MODELS) {
    try {
      await downloadAndGzip(model);
    } catch (err) {
      console.error(`[${model.name}] Erro: ${err.message}`);
      process.exit(1);
    }
  }

  console.log('\n✅ Concluído. Modelos disponíveis em /public/tessdata/');
  console.log('   Acesse https://sentencify.ia.br/ocr-lab.html (após deploy) para testar.');
}

main();

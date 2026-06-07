// scripts/reembed-modelos.ts
/**
 * Re-embeda um JSON de modelos LOCALMENTE (E5-base via transformers.js), usando a
 * MESMA construção de texto do app (buildModelEmbeddingText) e as MESMAS opções do
 * worker (ai-worker.js): quantized true, pooling 'mean', normalize true, prefixo
 * 'passage: '. Bem mais rápido que reindexar no browser. Reimporte o JSON resultante
 * manualmente no Sentencify.
 *
 * Uso:
 *   npx tsx scripts/reembed-modelos.ts [entrada.json] [saida.json]
 * Defaults:
 *   entrada: ~/Downloads/modelos-sentencas-100recentes.json
 *   saída:   ~/Downloads/modelos-sentencas-100recentes.reembed.json
 */
import { pipeline, env } from '@xenova/transformers';
import { readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { buildModelEmbeddingText } from '../src/utils/modelEmbeddingText';

env.allowRemoteModels = true; // baixa o modelo do HF hub na 1ª execução

const HOME = homedir();
const inPath = process.argv[2] || join(HOME, 'Downloads', 'modelos-sentencas-100recentes.json');
const outPath = process.argv[3] || join(HOME, 'Downloads', 'modelos-sentencas-100recentes.reembed.json');

interface JsonModel { title?: string; keywords?: string | string[]; content?: string; embedding?: number[]; }

async function main(): Promise<void> {
  const models: JsonModel[] = JSON.parse(readFileSync(inPath, 'utf-8'));
  if (!Array.isArray(models)) throw new Error('JSON de entrada deve ser um array de modelos');
  console.log(`Carregados ${models.length} modelos de ${inPath}`);

  // quantized: true espelha exatamente o ai-worker.js (initSearch)
  const extractor = await pipeline('feature-extraction', 'Xenova/multilingual-e5-base', {
    quantized: true,
  });

  for (let i = 0; i < models.length; i++) {
    const text = 'passage: ' + buildModelEmbeddingText(models[i]);
    const output = await extractor(text, { pooling: 'mean', normalize: true });
    models[i].embedding = Array.from(output.data as Float32Array);
    if ((i + 1) % 25 === 0 || i === models.length - 1) console.log(`  ${i + 1}/${models.length}`);
  }

  writeFileSync(outPath, JSON.stringify(models));
  console.log(`Salvo em ${outPath} — dim do 1º embedding: ${models[0]?.embedding?.length}`);
}

main().catch(err => { console.error(err); process.exit(1); });

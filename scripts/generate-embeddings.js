/**
 * Gerador de embeddings para LEGIS e JURIS
 * Usa @xenova/transformers com modelo E5-Large (1024 dimensões)
 *
 * Uso: node scripts/generate-embeddings.js
 * Tempo estimado: ~30-60 minutos
 */
import { pipeline } from '@xenova/transformers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');

const MODEL = 'Xenova/multilingual-e5-large';
const LEGIS_DIR = path.join(ROOT_DIR, 'LEGIS');
const JURIS_DIR = path.join(ROOT_DIR, 'JURIS');

// Arquivos de legislação
const LEGIS_FILES = ['cc.json', 'cdc.json', 'cf88.json', 'clt.json', 'cpc.json', 'l6019.json', 'l605.json', 'l9029.json'];

// Arquivos de jurisprudência
const JURIS_FILES = [
  'sumulas-tst.json', 'sumulas-stf-stj.json', 'sumulas-trt8.json',
  'oj-sdi1-tst.json', 'oj-sdi2-tst.json', 'oj-sdc-tst.json', 'oj-pleno-tst.json',
  'irrr-tst.json', 'iac-tst.json', 'irdr-iac-trt8.json',
  'informativos-tst.json', 'stf-stj-precedentes.json'
];

let totalProcessed = 0;
let startTime;

async function main() {
  startTime = Date.now();
  console.log('='.repeat(60));
  console.log('GERADOR DE EMBEDDINGS E5-LARGE (1024 dimensões)');
  console.log('='.repeat(60));
  console.log(`\nCarregando modelo ${MODEL}...`);
  console.log('(Primeira execução baixa ~355 MB, pode demorar)\n');

  const extractor = await pipeline('feature-extraction', MODEL, {
    quantized: true,
    progress_callback: (progress) => {
      if (progress.status === 'progress') {
        process.stdout.write(`\r  Baixando: ${Math.round(progress.progress || 0)}%`);
      }
    }
  });
  console.log('\n✅ Modelo carregado!\n');

  // 1. Gerar embeddings de legislação
  console.log('='.repeat(60));
  console.log('LEGISLAÇÃO');
  console.log('='.repeat(60));
  const legisEmbeddings = await generateLegisEmbeddings(extractor);
  const legisPath = path.join(LEGIS_DIR, 'embeddings.json');
  fs.writeFileSync(legisPath, JSON.stringify(legisEmbeddings));
  const legisSize = (fs.statSync(legisPath).size / 1024 / 1024).toFixed(1);
  console.log(`\n✅ Salvo ${legisEmbeddings.length} embeddings em LEGIS/embeddings.json (${legisSize} MB)`);

  // 2. Gerar embeddings de jurisprudência
  console.log('\n' + '='.repeat(60));
  console.log('JURISPRUDÊNCIA');
  console.log('='.repeat(60));
  const jurisEmbeddings = await generateJurisEmbeddings(extractor);
  const jurisPath = path.join(JURIS_DIR, 'juris-embeddings.json');
  fs.writeFileSync(jurisPath, JSON.stringify(jurisEmbeddings));
  const jurisSize = (fs.statSync(jurisPath).size / 1024 / 1024).toFixed(1);
  console.log(`\n✅ Salvo ${jurisEmbeddings.length} embeddings em JURIS/juris-embeddings.json (${jurisSize} MB)`);

  // Resumo final
  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  console.log('\n' + '='.repeat(60));
  console.log('CONCLUÍDO!');
  console.log('='.repeat(60));
  console.log(`Total de embeddings: ${totalProcessed}`);
  console.log(`Dimensão: 1024 (E5-Large)`);
  console.log(`Tempo total: ${elapsed} minutos`);
  console.log(`\nArquivos gerados:`);
  console.log(`  - LEGIS/embeddings.json (${legisSize} MB)`);
  console.log(`  - JURIS/juris-embeddings.json (${jurisSize} MB)`);
}

async function getEmbedding(extractor, text) {
  const output = await extractor(`passage: ${text}`, { pooling: 'mean', normalize: true });
  totalProcessed++;
  return Array.from(output.data);
}

async function generateLegisEmbeddings(extractor) {
  const results = [];

  for (const file of LEGIS_FILES) {
    const filePath = path.join(LEGIS_DIR, file);
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  ${file} não encontrado, pulando...`);
      continue;
    }

    const lei = file.replace('.json', '');
    const artigos = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    console.log(`\n📜 ${file} (${artigos.length} artigos)`);

    let fileCount = 0;
    for (let i = 0; i < artigos.length; i++) {
      const art = artigos[i];

      // Embedding do caput
      if (art.caput) {
        const embedding = await getEmbedding(extractor, art.caput);
        results.push({
          id: art.id,
          type: 'caput',
          artigoId: art.id,
          lei,
          text: art.caput,
          numero: art.numero,
          embedding
        });
        fileCount++;
      }

      // Embedding dos parágrafos
      for (const p of (art.paragrafos || [])) {
        if (!p.texto) continue;
        const embedding = await getEmbedding(extractor, p.texto);
        results.push({
          id: `${art.id}-p${p.numero}`,
          type: 'paragrafo',
          artigoId: art.id,
          lei,
          text: p.texto,
          numero: p.numero,
          embedding
        });
        fileCount++;
      }

      // Embedding dos incisos
      for (const inc of (art.incisos || [])) {
        if (!inc.texto) continue;
        const embedding = await getEmbedding(extractor, inc.texto);
        results.push({
          id: `${art.id}-inc${inc.numero}`,
          type: 'inciso',
          artigoId: art.id,
          lei,
          text: inc.texto,
          numero: inc.numero,
          embedding
        });
        fileCount++;
      }

      // Embedding das alíneas (dentro de incisos)
      for (const inc of (art.incisos || [])) {
        for (const al of (inc.alineas || [])) {
          if (!al.texto) continue;
          const embedding = await getEmbedding(extractor, al.texto);
          results.push({
            id: `${art.id}-inc${inc.numero}-al${al.numero}`,
            type: 'alinea',
            artigoId: art.id,
            lei,
            text: al.texto,
            numero: al.numero,
            embedding
          });
          fileCount++;
        }
      }

      // Progresso
      if ((i + 1) % 100 === 0 || i === artigos.length - 1) {
        process.stdout.write(`\r   Processado: ${i + 1}/${artigos.length} artigos (${fileCount} embeddings)`);
      }
    }
    console.log(`\n   ✓ ${fileCount} embeddings gerados`);
  }

  return results;
}

async function generateJurisEmbeddings(extractor) {
  const results = [];

  for (const file of JURIS_FILES) {
    const filePath = path.join(JURIS_DIR, file);
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  ${file} não encontrado, pulando...`);
      continue;
    }

    const precedentes = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    console.log(`\n⚖️  ${file} (${precedentes.length} precedentes)`);

    let fileCount = 0;
    for (let i = 0; i < precedentes.length; i++) {
      const p = precedentes[i];
      const text = p.enunciado || p.text || p.ementa || '';
      if (!text) continue;

      const embedding = await getEmbedding(extractor, text);
      results.push({
        id: p.id,
        precedenteId: p.id,
        tribunal: p.tribunal || 'TST',
        tipoProcesso: p.tipoProcesso || 'Súmula',
        titulo: p.titulo || '',
        text,
        numero: String(p.numero || ''),
        chunkIndex: 0,
        totalChunks: 1,
        fullText: null,
        embedding
      });
      fileCount++;

      // Progresso
      if ((i + 1) % 50 === 0 || i === precedentes.length - 1) {
        process.stdout.write(`\r   Processado: ${i + 1}/${precedentes.length} precedentes`);
      }
    }
    console.log(`\n   ✓ ${fileCount} embeddings gerados`);
  }

  return results;
}

main().catch(err => {
  console.error('\n❌ Erro:', err.message);
  process.exit(1);
});

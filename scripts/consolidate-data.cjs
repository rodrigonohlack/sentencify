/**
 * Script para consolidar todos os JSONs de legislação e jurisprudência
 * em arquivos únicos para auto-download via CDN
 *
 * Uso: node scripts/consolidate-data.js
 *
 * Gera:
 * - dist/legis-data.json (~2 MB)
 * - dist/juris-data.json (~5 MB)
 */

const fs = require('fs');
const path = require('path');

const LEGIS_DIR = path.join(__dirname, '..', 'LEGIS');
const JURIS_DIR = path.join(__dirname, '..', 'JURIS');
const OUTPUT_DIR = path.join(__dirname, '..', 'dist');

// Arquivos de legislação (excluindo embeddings)
const LEGIS_FILES = [
  'clt.json',
  'cc.json',
  'cdc.json',
  'cf88.json',
  'cpc.json',
  'l605.json',
  'l6019.json',
  'l9029.json'
];

// Arquivos de jurisprudência (excluindo embeddings)
const JURIS_FILES = [
  'sumulas-tst.json',
  'sumulas-stf-stj.json',
  'sumulas-trt8.json',
  'oj-sdi1-tst.json',
  'oj-sdi2-tst.json',
  'oj-sdc-tst.json',
  'oj-pleno-tst.json',
  'irdr-iac-trt8.json',
  'iac-tst.json',
  'irrr-tst.json',
  'stf-stj-precedentes.json',
  'informativos-tst.json'
];

// Mapeamento de arquivo para nome da lei (para adicionar campo 'lei' se não existir)
const LEGIS_MAP = {
  'clt.json': 'CLT',
  'cc.json': 'CC',
  'cdc.json': 'CDC',
  'cf88.json': 'CF/88',
  'cpc.json': 'CPC',
  'l605.json': 'Lei 605/1949',
  'l6019.json': 'Lei 6.019/1974',
  'l9029.json': 'Lei 9.029/1995'
};

function consolidateLegislacao() {
  console.log('\n📚 Consolidando LEGISLAÇÃO...');
  const allItems = [];

  for (const file of LEGIS_FILES) {
    const filePath = path.join(LEGIS_DIR, file);

    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const lei = LEGIS_MAP[file];

      // Adicionar campo 'lei' a cada item se não existir
      const items = data.map(item => ({
        ...item,
        lei: item.lei || lei,
        _source: file // Para debug
      }));

      allItems.push(...items);
      console.log(`  ✓ ${file}: ${data.length} artigos`);
    } catch (err) {
      console.error(`  ✗ ${file}: ${err.message}`);
    }
  }

  const output = {
    version: '1.0',
    lastUpdate: new Date().toISOString().split('T')[0],
    totalItems: allItems.length,
    sources: LEGIS_FILES,
    data: allItems
  };

  return output;
}

function consolidateJurisprudencia() {
  console.log('\n⚖️ Consolidando JURISPRUDÊNCIA...');
  const allItems = [];

  for (const file of JURIS_FILES) {
    const filePath = path.join(JURIS_DIR, file);

    try {
      const rawData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

      // Alguns arquivos têm estrutura { metadata, precedentes }
      // Outros são arrays diretos
      let items;
      if (Array.isArray(rawData)) {
        items = rawData;
      } else if (rawData.precedentes) {
        items = rawData.precedentes;
      } else if (rawData.data) {
        items = rawData.data;
      } else {
        console.error(`  ✗ ${file}: Estrutura desconhecida`);
        continue;
      }

      // Adicionar fonte a cada item
      const itemsWithSource = items.map(item => ({
        ...item,
        _source: file
      }));

      allItems.push(...itemsWithSource);
      console.log(`  ✓ ${file}: ${items.length} precedentes`);
    } catch (err) {
      console.error(`  ✗ ${file}: ${err.message}`);
    }
  }

  const output = {
    version: '1.0',
    lastUpdate: new Date().toISOString().split('T')[0],
    totalItems: allItems.length,
    sources: JURIS_FILES,
    data: allItems
  };

  return output;
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function main() {
  console.log('🔧 Consolidando dados para auto-download CDN...');

  // Criar diretório de saída se não existir
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Consolidar legislação
  const legisData = consolidateLegislacao();
  const legisPath = path.join(OUTPUT_DIR, 'legis-data.json');
  const legisJson = JSON.stringify(legisData);
  fs.writeFileSync(legisPath, legisJson);
  console.log(`\n✅ legis-data.json: ${legisData.totalItems} artigos (${formatSize(legisJson.length)})`);

  // Consolidar jurisprudência
  const jurisData = consolidateJurisprudencia();
  const jurisPath = path.join(OUTPUT_DIR, 'juris-data.json');
  const jurisJson = JSON.stringify(jurisData);
  fs.writeFileSync(jurisPath, jurisJson);
  console.log(`✅ juris-data.json: ${jurisData.totalItems} precedentes (${formatSize(jurisJson.length)})`);

  console.log('\n📦 Arquivos gerados em:', OUTPUT_DIR);
  console.log('\n📤 Próximo passo: Upload para GitHub Releases (tag data-v1)');
  console.log('   gh release create data-v1 dist/legis-data.json dist/juris-data.json --title "Data v1" --notes "Legislação e Jurisprudência consolidados"');
}

main();

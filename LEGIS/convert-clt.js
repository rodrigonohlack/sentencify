/**
 * Conversor de CLT HTML → JSON
 * Baseado em convert-cf88.js
 */

const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');

const INPUT_FILE = path.join(__dirname, 'Del5452compilado.html');
const OUTPUT_FILE = path.join(__dirname, 'clt.json');

// Regex patterns - CLT usa "Art. N° -" (com hífen após número)
const ARTIGO_PATTERN = /^Art\.\s*(\d+[\-A-Z]?)[°ºª\.]?\s*[-–—]?\s*(.*)/i;
const INCISO_PATTERN = /^([IVXLCDM]+)\s*[-–—]\s*(.*)/;
const ALINEA_PATTERN = /^([a-z])\)\s*(.*)/;
const PARAGRAFO_PATTERN = /^(?:§\s*(\d+)[°ºoª\.]?\s*[-–—]?\s*|Par[áa]grafo\s+[úu]nico[\.:\s]*)(.*)/i;

// Numerais romanos válidos (CLT vai até artigos com muitos incisos)
const VALID_ROMAN = new Set([
  'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
  'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX',
  'XXI', 'XXII', 'XXIII', 'XXIV', 'XXV', 'XXVI', 'XXVII', 'XXVIII', 'XXIX', 'XXX',
  'XXXI', 'XXXII', 'XXXIII', 'XXXIV', 'XXXV', 'XXXVI', 'XXXVII', 'XXXVIII', 'XXXIX', 'XL'
]);

function cleanText(text) {
  if (!text) return '';
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, c) => String.fromCharCode(parseInt(c)))
    .replace(/\s+/g, ' ')
    .trim();
}

function extractKeywords(text) {
  const keywords = new Set();
  const terms = [
    'empregador', 'empregado', 'trabalhador', 'trabalho',
    'salário', 'remuneração', 'férias', 'jornada',
    'contrato', 'rescisão', 'aviso prévio', 'FGTS',
    'sindicato', 'greve', 'convenção coletiva', 'acordo coletivo',
    'segurança', 'medicina', 'acidente', 'insalubridade', 'periculosidade',
    'menor', 'mulher', 'gestante', 'licença',
    'Justiça do Trabalho', 'reclamação', 'dissídio',
    'grupo econômico', 'terceirização', 'teletrabalho'
  ];
  const lower = text.toLowerCase();
  for (const t of terms) {
    if (lower.includes(t.toLowerCase())) keywords.add(t);
  }
  return Array.from(keywords).slice(0, 6);
}

function convertCLT() {
  console.log('📖 Lendo arquivo HTML da CLT...');

  const buffer = fs.readFileSync(INPUT_FILE);
  let html = iconv.decode(buffer, 'windows-1252');
  console.log(`   Tamanho: ${(buffer.length / 1024).toFixed(0)} KB`);

  // Ignorar o preâmbulo do decreto - começar após "CONSOLIDAÇÃO DAS LEIS DO TRABALHO"
  const cltIndex = html.indexOf('CONSOLIDAÇÃO DAS LEIS DO TRABALHO');
  if (cltIndex > 0) {
    html = html.substring(cltIndex);
    console.log('   Preâmbulo do decreto removido');
  } else {
    console.log('   ⚠️ Marcador "CONSOLIDAÇÃO DAS LEIS DO TRABALHO" não encontrado');
  }

  // Extrair parágrafos HTML
  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  const paragraphs = [];
  let m;
  while ((m = pRegex.exec(html)) !== null) {
    const t = cleanText(m[1]);
    if (t && t.length > 1) paragraphs.push(t);
  }
  console.log(`   Parágrafos HTML: ${paragraphs.length}`);

  // Map para artigos
  const artigosMap = new Map();
  let currentArtigo = null;
  let currentInciso = null;

  for (const text of paragraphs) {
    // Verificar artigo
    const artMatch = text.match(ARTIGO_PATTERN);
    if (artMatch) {
      const num = artMatch[1];
      let caput = artMatch[2].trim();

      // Remover hífen inicial se houver
      if (caput.startsWith('-')) caput = caput.substring(1).trim();

      // Só criar artigo se o caput não estiver vazio ou muito curto
      if (caput.length < 5) continue;

      // Se já existe, usar o existente
      if (artigosMap.has(num)) {
        currentArtigo = artigosMap.get(num);
        if (caput.length > currentArtigo.caput.length) {
          currentArtigo.caput = caput;
        }
      } else {
        currentArtigo = {
          id: `clt-art-${num}`,
          numero: num,
          caput: caput,
          paragrafos: [],
          incisos: [],
          status: 'vigente',
          keywords: []
        };
        artigosMap.set(num, currentArtigo);
      }
      currentInciso = null;
      continue;
    }

    if (!currentArtigo) continue;

    // Verificar parágrafo
    const parMatch = text.match(PARAGRAFO_PATTERN);
    if (parMatch) {
      const pNum = parMatch[1] || 'único';
      let pTexto = parMatch[2].trim();
      // Remover hífen inicial
      if (pTexto.startsWith('-')) pTexto = pTexto.substring(1).trim();

      if (pTexto.length > 5) {
        const existe = currentArtigo.paragrafos.some(p => p.numero === pNum && p.texto === pTexto);
        if (!existe) {
          currentArtigo.paragrafos.push({ numero: pNum, texto: pTexto });
        }
      }
      currentInciso = null;
      continue;
    }

    // Verificar inciso
    const incMatch = text.match(INCISO_PATTERN);
    if (incMatch && VALID_ROMAN.has(incMatch[1])) {
      const iNum = incMatch[1];
      const iTexto = incMatch[2].trim();
      if (iTexto.length > 2) {
        currentInciso = { numero: iNum, texto: iTexto };
        const existe = currentArtigo.incisos.some(i => i.numero === iNum);
        if (!existe) {
          currentArtigo.incisos.push(currentInciso);
        } else {
          const idx = currentArtigo.incisos.findIndex(i => i.numero === iNum);
          if (idx >= 0) currentInciso = currentArtigo.incisos[idx];
        }
      }
      continue;
    }

    // Verificar alínea
    const aliMatch = text.match(ALINEA_PATTERN);
    if (aliMatch) {
      const letra = aliMatch[1];
      const aTexto = aliMatch[2].trim();
      if (aTexto.length > 2) {
        // Alíneas podem pertencer a artigo diretamente (como Art. 482) ou a inciso
        if (currentInciso) {
          if (!currentInciso.alineas) currentInciso.alineas = [];
          const existe = currentInciso.alineas.some(a => a.letra === letra);
          if (!existe) {
            currentInciso.alineas.push({ letra: letra, texto: aTexto });
          }
        } else {
          // Alínea diretamente no artigo
          if (!currentArtigo.alineas) currentArtigo.alineas = [];
          const existe = currentArtigo.alineas.some(a => a.letra === letra);
          if (!existe) {
            currentArtigo.alineas.push({ letra: letra, texto: aTexto });
          }
        }
      }
      continue;
    }
  }

  // Converter Map para array ordenado
  const artigos = Array.from(artigosMap.values())
    .sort((a, b) => {
      // Ordenar numericamente, tratando artigos como "10-A"
      const numA = parseInt(a.numero.replace(/[^0-9]/g, ''));
      const numB = parseInt(b.numero.replace(/[^0-9]/g, ''));
      if (numA !== numB) return numA - numB;
      return a.numero.localeCompare(b.numero);
    });

  console.log(`   Artigos: ${artigos.length}`);

  // Adicionar keywords e limpar arrays vazios
  let totalIncisos = 0, totalParagrafos = 0, totalAlineas = 0;
  for (const art of artigos) {
    let fullText = art.caput;
    for (const inc of art.incisos) {
      fullText += ' ' + inc.texto;
      if (inc.alineas) {
        if (inc.alineas.length === 0) delete inc.alineas;
        else totalAlineas += inc.alineas.length;
      }
    }
    if (art.alineas) {
      if (art.alineas.length === 0) delete art.alineas;
      else totalAlineas += art.alineas.length;
    }
    for (const par of art.paragrafos) fullText += ' ' + par.texto;
    art.keywords = extractKeywords(fullText);
    totalIncisos += art.incisos.length;
    totalParagrafos += art.paragrafos.length;
  }

  console.log(`   Incisos: ${totalIncisos}`);
  console.log(`   Parágrafos: ${totalParagrafos}`);
  console.log(`   Alíneas: ${totalAlineas}`);

  // Verificar artigos críticos
  const art58 = artigos.find(a => a.numero === '58');
  const art461 = artigos.find(a => a.numero === '461');
  const art482 = artigos.find(a => a.numero === '482');

  console.log('\n📋 Artigos de validação:');
  if (art58) {
    console.log(`   Art. 58 (jornada): ${art58.paragrafos.length} §, ${art58.incisos.length} incisos`);
  }
  if (art461) {
    console.log(`   Art. 461 (equiparação): ${art461.paragrafos.length} §, ${art461.incisos.length} incisos`);
  }
  if (art482) {
    const alineas = art482.alineas?.length || 0;
    console.log(`   Art. 482 (justa causa): ${art482.paragrafos.length} §, ${alineas} alíneas`);
  }

  // Salvar
  console.log('\n💾 Salvando JSON...');
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(artigos, null, 2), 'utf8');
  const stats = fs.statSync(OUTPUT_FILE);
  console.log(`   Tamanho: ${(stats.size / 1024).toFixed(0)} KB`);
  console.log('\n✅ Conversão concluída!');
}

try {
  convertCLT();
} catch (err) {
  console.error('❌ Erro:', err.message);
  process.exit(1);
}

/**
 * Conversor de Constituição Federal HTML → JSON
 * v2 - Corrigido para lidar com duplicatas e estrutura HTML complexa
 */

const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');

const INPUT_FILE = path.join(__dirname, 'Constituicao-Compilado.html');
const OUTPUT_FILE = path.join(__dirname, 'cf88.json');

// Regex patterns
const ARTIGO_PATTERN = /^Art\.\s*(\d+)[°ºª\.\-]?\s*(.*)/i;
const INCISO_PATTERN = /^([IVXLCDM]+)\s*[-–—]\s*(.*)/;
const ALINEA_PATTERN = /^([a-z])\)\s*(.*)/;
const PARAGRAFO_PATTERN = /^(?:§\s*(\d+)[°ºª\.]?\s*|Par[áa]grafo\s+[úu]nico[\.:]?\s*)(.*)/i;

// Lista de numerais romanos válidos para incisos (I a LXXVIII para Art. 5)
const VALID_ROMAN = new Set([
  'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
  'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX',
  'XXI', 'XXII', 'XXIII', 'XXIV', 'XXV', 'XXVI', 'XXVII', 'XXVIII', 'XXIX', 'XXX',
  'XXXI', 'XXXII', 'XXXIII', 'XXXIV', 'XXXV', 'XXXVI', 'XXXVII', 'XXXVIII', 'XXXIX', 'XL',
  'XLI', 'XLII', 'XLIII', 'XLIV', 'XLV', 'XLVI', 'XLVII', 'XLVIII', 'XLIX', 'L',
  'LI', 'LII', 'LIII', 'LIV', 'LV', 'LVI', 'LVII', 'LVIII', 'LIX', 'LX',
  'LXI', 'LXII', 'LXIII', 'LXIV', 'LXV', 'LXVI', 'LXVII', 'LXVIII', 'LXIX', 'LXX',
  'LXXI', 'LXXII', 'LXXIII', 'LXXIV', 'LXXV', 'LXXVI', 'LXXVII', 'LXXVIII', 'LXXIX', 'LXXX'
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
    'União', 'Estado', 'Município', 'Distrito Federal', 'República',
    'Constituição', 'lei', 'direito', 'Presidente', 'Congresso',
    'Senado', 'Câmara', 'Deputado', 'Senador', 'Ministro',
    'tribunal', 'Judiciário', 'STF', 'juiz', 'justiça',
    'trabalho', 'trabalhador', 'emprego', 'salário',
    'propriedade', 'liberdade', 'igualdade', 'segurança',
    'saúde', 'educação', 'previdência', 'assistência',
    'eleição', 'voto', 'mandato', 'cargo',
    'imposto', 'tributo', 'fiscal', 'orçamento'
  ];
  const lower = text.toLowerCase();
  for (const t of terms) {
    if (lower.includes(t.toLowerCase())) keywords.add(t);
  }
  return Array.from(keywords).slice(0, 6);
}

function convertCF88() {
  console.log('📖 Lendo arquivo HTML...');

  const buffer = fs.readFileSync(INPUT_FILE);
  let html = iconv.decode(buffer, 'windows-1252');
  console.log(`   Tamanho: ${(buffer.length / 1024).toFixed(0)} KB`);

  // Remover o ADCT (Ato das Disposições Constitucionais Transitórias)
  // para evitar conflito de numeração de artigos
  const adctIndex = html.indexOf('ATO DAS DISPOSIÇÕES CONSTITUCIONAIS TRANSITÓRIAS');
  if (adctIndex > 0) {
    html = html.substring(0, adctIndex);
    console.log('   ADCT removido para evitar conflito de numeração');
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

  // Map para artigos (evita duplicatas)
  const artigosMap = new Map();
  let currentArtigo = null;
  let currentInciso = null;

  for (const text of paragraphs) {
    // Verificar artigo
    const artMatch = text.match(ARTIGO_PATTERN);
    if (artMatch) {
      const num = artMatch[1];
      const caput = artMatch[2].trim();

      // Só criar artigo se o caput não estiver vazio ou muito curto
      if (caput.length < 10) {
        // Pode ser referência (ex: "art. 5º" em links) - ignorar
        continue;
      }

      // Se já existe, usar o existente (pode estar adicionando mais incisos)
      if (artigosMap.has(num)) {
        currentArtigo = artigosMap.get(num);
        // Se o caput atual é maior, atualizar
        if (caput.length > currentArtigo.caput.length) {
          currentArtigo.caput = caput;
        }
      } else {
        currentArtigo = {
          id: `cf88-art-${num}`,
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
      const pTexto = parMatch[2].trim();
      if (pTexto.length > 5) {
        // Evitar duplicatas de parágrafos
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
        // Evitar duplicatas de incisos
        const existe = currentArtigo.incisos.some(i => i.numero === iNum);
        if (!existe) {
          currentArtigo.incisos.push(currentInciso);
        } else {
          // Atualizar se já existe
          const idx = currentArtigo.incisos.findIndex(i => i.numero === iNum);
          if (idx >= 0) currentInciso = currentArtigo.incisos[idx];
        }
      }
      continue;
    }

    // Verificar alínea
    const aliMatch = text.match(ALINEA_PATTERN);
    if (aliMatch && currentInciso) {
      const letra = aliMatch[1];
      const aTexto = aliMatch[2].trim();
      if (aTexto.length > 2) {
        if (!currentInciso.alineas) currentInciso.alineas = [];
        const existe = currentInciso.alineas.some(a => a.letra === letra);
        if (!existe) {
          currentInciso.alineas.push({ letra: letra, texto: aTexto });
        }
      }
      continue;
    }
  }

  // Converter Map para array ordenado
  const artigos = Array.from(artigosMap.values())
    .sort((a, b) => parseInt(a.numero) - parseInt(b.numero));

  console.log(`   Artigos: ${artigos.length}`);

  // Adicionar keywords e limpar alíneas vazias
  let totalIncisos = 0, totalParagrafos = 0;
  for (const art of artigos) {
    let fullText = art.caput;
    for (const inc of art.incisos) {
      fullText += ' ' + inc.texto;
      if (inc.alineas && inc.alineas.length === 0) delete inc.alineas;
    }
    for (const par of art.paragrafos) fullText += ' ' + par.texto;
    art.keywords = extractKeywords(fullText);
    totalIncisos += art.incisos.length;
    totalParagrafos += art.paragrafos.length;
  }

  console.log(`   Incisos: ${totalIncisos}`);
  console.log(`   Parágrafos: ${totalParagrafos}`);

  // Verificar artigos críticos
  const art5 = artigos.find(a => a.numero === '5');
  const art7 = artigos.find(a => a.numero === '7');

  if (art5) {
    console.log(`\n📋 Art. 5º: ${art5.incisos.length} incisos, ${art5.paragrafos.length} parágrafos`);
    if (art5.incisos.length > 0) {
      console.log(`   Primeiro: "${art5.incisos[0].texto.substring(0, 50)}..."`);
    }
  }
  if (art7) {
    console.log(`📋 Art. 7º: ${art7.incisos.length} incisos, ${art7.paragrafos.length} parágrafos`);
    if (art7.incisos.length > 0) {
      console.log(`   Primeiro: "${art7.incisos[0].texto.substring(0, 50)}..."`);
    }
  }

  // Salvar
  console.log('\n💾 Salvando JSON...');
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(artigos, null, 2), 'utf8');
  const stats = fs.statSync(OUTPUT_FILE);
  console.log(`   Tamanho: ${(stats.size / 1024).toFixed(0)} KB`);
  console.log('\n✅ Conversão concluída!');
}

try {
  convertCF88();
} catch (err) {
  console.error('❌ Erro:', err.message);
  process.exit(1);
}

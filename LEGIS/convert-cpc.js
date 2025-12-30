/**
 * Conversor de CPC HTML → JSON
 * Baseado em convert-clt.js
 */

const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');

const INPUT_FILE = path.join(__dirname, 'L13105compilada.html');
const OUTPUT_FILE = path.join(__dirname, 'cpc.json');

// Regex patterns
// CPC usa "Art. 1º" para artigos simples e "Art. 1.000" para artigos com milhar
// O ponto após o número (Art. 17.) deve ser ignorado
const ARTIGO_PATTERN = /^Art\.\s*(\d+(?:\.\d{3})?[\-A-Z]?)[°ºª]?\.?\s*(.*)/i;
const INCISO_PATTERN = /^([IVXLCDM]+)\s*[-–—]\s*(.*)/;
const ALINEA_PATTERN = /^([a-z])\)\s*(.*)/;
const PARAGRAFO_PATTERN = /^(?:§\s*(\d+)[°ºoª\.]?\s*[-–—]?\s*|Par[áa]grafo\s+[úu]nico[\.:\s]*)(.*)/i;

// Numerais romanos válidos
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
    'ação', 'processo', 'juiz', 'parte', 'autor', 'réu',
    'sentença', 'decisão', 'recurso', 'apelação', 'agravo',
    'petição', 'contestação', 'réplica', 'prova', 'audiência',
    'citação', 'intimação', 'prazo', 'preclusão',
    'tutela', 'antecipação', 'liminar', 'cautelar',
    'execução', 'cumprimento', 'penhora', 'arresto',
    'competência', 'jurisdição', 'litisconsórcio', 'intervenção',
    'mérito', 'coisa julgada', 'prescrição', 'decadência',
    'honorários', 'custas', 'gratuidade',
    'conciliação', 'mediação', 'arbitragem'
  ];
  const lower = text.toLowerCase();
  for (const t of terms) {
    if (lower.includes(t.toLowerCase())) keywords.add(t);
  }
  return Array.from(keywords).slice(0, 6);
}

function convertCPC() {
  console.log('📖 Lendo arquivo HTML do CPC...');

  const buffer = fs.readFileSync(INPUT_FILE);
  let html = iconv.decode(buffer, 'windows-1252');
  console.log(`   Tamanho: ${(buffer.length / 1024).toFixed(0)} KB`);

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
      // Normalizar número: "1.000" -> "1000", "1.015-A" -> "1015-A"
      const numRaw = artMatch[1];
      const num = numRaw.replace(/\./g, '');
      let caput = artMatch[2].trim();

      // Só criar artigo se o caput não estiver vazio ou muito curto
      if (caput.length < 5) continue;

      // Se já existe, NÃO sobrescrever (primeiro encontrado é o correto)
      if (artigosMap.has(num)) {
        currentArtigo = artigosMap.get(num);
        // Não atualizar caput para evitar sobrescrita incorreta
      } else {
        currentArtigo = {
          id: `cpc-art-${num}`,
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
        if (currentInciso) {
          if (!currentInciso.alineas) currentInciso.alineas = [];
          const existe = currentInciso.alineas.some(a => a.letra === letra);
          if (!existe) {
            currentInciso.alineas.push({ letra: letra, texto: aTexto });
          }
        } else {
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
  const art139 = artigos.find(a => a.numero === '139');
  const art485 = artigos.find(a => a.numero === '485');
  const art489 = artigos.find(a => a.numero === '489');

  console.log('\n📋 Artigos de validação:');
  if (art139) {
    console.log(`   Art. 139 (poderes do juiz): ${art139.incisos.length} incisos`);
  }
  if (art485) {
    console.log(`   Art. 485 (extinção s/ mérito): ${art485.incisos.length} incisos`);
  }
  if (art489) {
    console.log(`   Art. 489 (sentença): ${art489.incisos.length} incisos, ${art489.paragrafos.length} §`);
  }

  // Salvar
  console.log('\n💾 Salvando JSON...');
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(artigos, null, 2), 'utf8');
  const stats = fs.statSync(OUTPUT_FILE);
  console.log(`   Tamanho: ${(stats.size / 1024).toFixed(0)} KB`);
  console.log('\n✅ Conversão concluída!');
}

try {
  convertCPC();
} catch (err) {
  console.error('❌ Erro:', err.message);
  process.exit(1);
}

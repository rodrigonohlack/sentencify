#!/usr/bin/env node
/**
 * Converte Lei 6.019/74 - Trabalho Temporário (L6019compilado.html) para JSON
 * Uso: node convert-l6019-to-json.js
 */

const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, 'L6019compilado.html');
const outputPath = path.join(__dirname, 'l6019.json');

// Keywords trabalhistas - terceirização e trabalho temporário
const KEYWORDS = [
  'trabalho temporário', 'temporário', 'terceirização', 'terceirizado',
  'empresa', 'tomadora', 'prestadora', 'contratante', 'contratada',
  'trabalhador', 'empregado', 'vínculo', 'contrato',
  'prazo', 'prorrogação', 'duração', 'período',
  'responsabilidade', 'solidária', 'subsidiária',
  'registro', 'Ministério do Trabalho', 'capital social',
  'direitos', 'remuneração', 'salário', 'férias', 'FGTS',
  'segurança', 'saúde', 'higiene', 'salubridade',
  'atividade-fim', 'atividade-meio', 'terceirização'
];

function main() {
  console.log('Lendo HTML da Lei 6.019/74...');

  const html = fs.readFileSync(htmlPath, 'latin1');
  console.log(`Tamanho do HTML: ${(html.length / 1024).toFixed(1)} KB`);

  // Limpar HTML
  let textoLimpo = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<sup[^>]*>\s*<u>\s*o\s*<\/u>\s*<\/sup>/gi, 'º')
    .replace(/<u><sup>o<\/sup><\/u>/gi, 'º')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#?[a-z0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ');

  // Lei 6019 tem artigos normais (1-20) e com sufixo (4-A, 4-B, 5-A, etc.)
  // Regex para capturar Art. X ou Art. Xº-A
  const artigoRegex = /Art\.\s*(\d+)(?:º)?(?:-([A-Z]))?/gi;

  const ultimasPosicoes = new Map();
  let match;

  while ((match = artigoRegex.exec(textoLimpo)) !== null) {
    const numero = match[1];
    const sufixo = match[2] || '';
    const numInt = parseInt(numero);
    const chave = numero + (sufixo ? '-' + sufixo : '');

    // Lei 6019 vai até art. 20, mais artigos com sufixo
    if (numInt <= 20 || sufixo) {
      ultimasPosicoes.set(chave, match.index);
    }
  }

  const posicoes = [];
  for (const [numero, posicao] of ultimasPosicoes) {
    posicoes.push({ numero, posicao });
  }

  posicoes.sort((a, b) => a.posicao - b.posicao);

  console.log(`Artigos encontrados: ${posicoes.length}`);

  const artigos = [];

  for (let i = 0; i < posicoes.length; i++) {
    const inicio = posicoes[i].posicao;
    const fim = i < posicoes.length - 1 ? posicoes[i + 1].posicao : textoLimpo.length;
    const bloco = textoLimpo.substring(inicio, fim);

    try {
      const artigo = parseArtigo(posicoes[i].numero, bloco);
      if (artigo) {
        artigos.push(artigo);
      }
    } catch (err) {
      console.error(`Erro no art. ${posicoes[i].numero}: ${err.message}`);
    }
  }

  // Ordenar: primeiro por número, depois por sufixo
  artigos.sort((a, b) => {
    const numA = parseInt(a.numero.replace(/[^\d]/g, '')) || 0;
    const numB = parseInt(b.numero.replace(/[^\d]/g, '')) || 0;
    if (numA !== numB) return numA - numB;
    return a.numero.localeCompare(b.numero);
  });

  const stats = {
    total: artigos.length,
    vigentes: artigos.filter(a => a.status === 'vigente').length,
    revogados: artigos.filter(a => a.status === 'revogado').length,
    comParagrafos: artigos.filter(a => a.paragrafos.length > 0).length,
    comIncisos: artigos.filter(a => a.incisos.length > 0).length
  };

  console.log('\n=== Conversão Concluída ===');
  console.log(`Total: ${stats.total} artigos`);
  console.log(`Vigentes: ${stats.vigentes}`);
  console.log(`Revogados: ${stats.revogados}`);
  console.log(`Com parágrafos: ${stats.comParagrafos}`);
  console.log(`Com incisos: ${stats.comIncisos}`);

  fs.writeFileSync(outputPath, JSON.stringify(artigos, null, 2), 'utf8');
  console.log(`\nArquivo salvo: ${outputPath}`);
  console.log(`Tamanho: ${(fs.statSync(outputPath).size / 1024).toFixed(1)} KB`);
}

function parseArtigo(numero, bloco) {
  const texto = bloco.trim();

  const revogadoMatch = texto.match(/\(revogad[oa]\)/i) ||
                        texto.match(/\(VETADO\)/i);
  const status = revogadoMatch ? 'revogado' : 'vigente';

  // Extrair caput
  const caputMatch = texto.match(/Art\.\s*[\d\-A-Zº]+\s*\.?\s*(.+?)(?=§\s*\d|Parágrafo único|[IVX]+\s*[-–]|[a-h]\)|Art\.|$)/i);
  let caput = caputMatch ? caputMatch[1].trim() : texto.substring(0, 500);

  caput = caput
    .replace(/^\.\s*/, '')
    .replace(/\s*\(Reda[çc][ãa]o dada[^)]+\)/gi, '')
    .replace(/\s*\(Inclu[ií]d[oa][^)]+\)/gi, '')
    .replace(/\s*\(Vig[êe]ncia[^)]*\)/gi, '')
    .replace(/\s*\(Vide[^)]+\)/gi, '')
    .trim();

  // Parágrafos
  const paragrafos = [];
  const paragrafoRegex = /(?:§\s*(\d+)[º°]?|Parágrafo único)\.?\s*(.+?)(?=§\s*\d|Parágrafo único|Art\.|$)/gi;
  let paraMatch;
  while ((paraMatch = paragrafoRegex.exec(texto)) !== null) {
    const paraNumero = paraMatch[1] || 'único';
    let paraTexto = paraMatch[2].trim()
      .replace(/\s*\(Reda[çc][ãa]o dada[^)]+\)/gi, '')
      .replace(/\s*\(Inclu[ií]d[oa][^)]+\)/gi, '')
      .replace(/\s*\(Revogad[oa][^)]*\)/gi, '')
      .trim();

    if (paraTexto.length > 5) {
      paragrafos.push({
        numero: paraNumero,
        texto: paraTexto
      });
    }
  }

  // Incisos romanos
  const incisos = [];
  const incisoRegex = /\b(X{0,3}(?:IX|IV|V?I{0,3}))\s*[-–.]\s*(.+?)(?=\b(?:X{0,3}(?:IX|IV|V?I{0,3}))\s*[-–.]|§|Parágrafo|Art\.|$)/gi;
  let incisoMatch;
  while ((incisoMatch = incisoRegex.exec(texto)) !== null) {
    const incisoNumero = incisoMatch[1].toUpperCase();
    let incisoTexto = incisoMatch[2].trim()
      .replace(/\s*\(Reda[çc][ãa]o dada[^)]+\)/gi, '')
      .replace(/\s*\(Inclu[ií]d[oa][^)]+\)/gi, '')
      .trim();

    if (/^[IVXLCDM]+$/.test(incisoNumero) && incisoTexto.length > 3) {
      incisos.push({
        numero: incisoNumero,
        texto: incisoTexto
      });
    }
  }

  // Alíneas
  const alineas = [];
  const alineaRegex = /\b([a-h])\)\s*(.+?)(?=[a-h]\)|§|Parágrafo|Art\.|$)/gi;
  let alineaMatch;
  while ((alineaMatch = alineaRegex.exec(texto)) !== null) {
    let alineaTexto = alineaMatch[2].trim()
      .replace(/\s*\(Reda[çc][ãa]o dada[^)]+\)/gi, '')
      .replace(/\s*\(revogad[oa]\)[;.]?/gi, '')
      .trim();

    if (alineaTexto.length > 3) {
      alineas.push({
        letra: alineaMatch[1],
        texto: alineaTexto
      });
    }
  }

  const keywords = extrairKeywords(caput + ' ' + paragrafos.map(p => p.texto).join(' '));

  return {
    id: `l6019-art-${numero.toLowerCase()}`,
    numero: numero,
    caput: caput,
    paragrafos: paragrafos,
    incisos: incisos,
    alineas: alineas,
    status: status,
    keywords: keywords
  };
}

function extrairKeywords(texto) {
  const palavras = new Set();
  const textoLower = texto.toLowerCase();

  for (const termo of KEYWORDS) {
    if (textoLower.includes(termo.toLowerCase())) {
      palavras.add(termo);
    }
  }

  return Array.from(palavras).slice(0, 10);
}

main();

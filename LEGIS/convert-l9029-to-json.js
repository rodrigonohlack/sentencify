#!/usr/bin/env node
/**
 * Converte Lei 9.029/95 - Práticas Discriminatórias (L9029.html) para JSON
 * Uso: node convert-l9029-to-json.js
 */

const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, 'L9029.html');
const outputPath = path.join(__dirname, 'l9029.json');

// Keywords - discriminação no trabalho
const KEYWORDS = [
  'discriminação', 'discriminatório', 'práticas discriminatórias',
  'gravidez', 'gestante', 'esterilização', 'atestado',
  'sexo', 'raça', 'cor', 'origem', 'estado civil', 'situação familiar',
  'deficiência', 'reabilitação', 'idade',
  'empregado', 'empregador', 'relação de trabalho', 'admissão',
  'crime', 'multa', 'penalidade', 'sanção',
  'reintegração', 'readmissão', 'indenização', 'dano moral',
  'rompimento', 'dispensa', 'demissão'
];

function main() {
  console.log('Lendo HTML da Lei 9.029/95...');

  const html = fs.readFileSync(htmlPath, 'latin1');
  console.log(`Tamanho do HTML: ${(html.length / 1024).toFixed(1)} KB`);

  // Limpar HTML - marcar conteúdo revogado (strike)
  let textoLimpo = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<sup[^>]*>\s*<u>\s*o\s*<\/u>\s*<\/sup>/gi, 'º')
    .replace(/<u><sup>o<\/sup><\/u>/gi, 'º')
    .replace(/<strike[^>]*>[\s\S]*?<\/strike>/gi, ' ')  // Remove versões antigas
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#?[a-z0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ');

  // Lei 9029 vai até art. 6 - buscar por "Art. X" no texto limpo
  // Pegar PRIMEIRA ocorrência de cada artigo (já removemos strikes, então é a versão vigente)
  // Importante: só "Art." maiúsculo (não "art." que são referências)
  const artigoRegex = /Art\.\s*(\d+)[º°]?\s/g;  // Sem flag 'i'

  const primeirasPosicoes = new Map();
  let match;

  while ((match = artigoRegex.exec(textoLimpo)) !== null) {
    const numero = match[1];
    const numInt = parseInt(numero);

    if (numInt <= 6 && !primeirasPosicoes.has(numero)) {
      primeirasPosicoes.set(numero, match.index);  // Só primeira ocorrência
    }
  }

  const ultimasPosicoes = primeirasPosicoes;

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

  artigos.sort((a, b) => parseInt(a.numero) - parseInt(b.numero));

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

  // Extrair caput - parar antes de incisos ou parágrafos
  const caputMatch = texto.match(/Art\.\s*[\dº]+\s*\.?\s*(.+?)(?=\s+I\s*[-–.]|\s+§\s*\d|Parágrafo único|Pena:|$)/i);
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
  const incisoRegex = /\b(I{1,3}|IV|V|VI{0,3}|IX|X)\s*[-–.]\s*(.+?)(?=\b(?:I{1,3}|IV|V|VI{0,3}|IX|X)\s*[-–.]|§|Parágrafo|Pena:|Art\.|$)/gi;
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
    id: `l9029-art-${numero}`,
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

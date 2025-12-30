#!/usr/bin/env node
/**
 * Converte Lei 605/49 - RSR (L0605.html) para JSON estruturado
 * Uso: node convert-l605-to-json.js
 */

const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, 'L0605.html');
const outputPath = path.join(__dirname, 'l605.json');

// Keywords trabalhistas
const KEYWORDS = [
  'repouso', 'descanso', 'semanal', 'remunerado', 'feriado',
  'empregado', 'empregador', 'trabalho', 'salário', 'remuneração',
  'doméstico', 'rural', 'funcionário público', 'autarquia',
  'hora extra', 'jornada', 'semana', 'dia', 'folga',
  'multa', 'infração', 'fiscalização', 'penalidade'
];

function main() {
  console.log('Lendo HTML da Lei 605/49...');

  const html = fs.readFileSync(htmlPath, 'latin1');
  console.log(`Tamanho do HTML: ${(html.length / 1024).toFixed(1)} KB`);

  // Limpar HTML - preservar conteúdo de strike mas marcar
  let textoLimpo = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<strike[^>]*>([\s\S]*?)<\/strike>/gi, ' [REVOGADO_INICIO] $1 [REVOGADO_FIM] ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#?[a-z0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ');

  // Lei 605 vai até art. 16
  // Pegar a ÚLTIMA ocorrência de cada artigo (versão vigente)
  const artigoRegex = /Art\.\s*(\d+)/gi;

  const ultimasPosicoes = new Map();  // numero -> posicao da última ocorrência
  let match;

  while ((match = artigoRegex.exec(textoLimpo)) !== null) {
    const numero = match[1];
    const numInt = parseInt(numero);

    // Lei 605 vai até art. 16
    if (numInt <= 16) {
      ultimasPosicoes.set(numero, match.index);  // Sobrescreve com última posição
    }
  }

  // Converter para array
  const posicoes = [];
  for (const [numero, posicao] of ultimasPosicoes) {
    posicoes.push({ numero, posicao });
  }

  console.log(`Artigos encontrados: ${posicoes.length}`);

  posicoes.sort((a, b) => a.posicao - b.posicao);

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
    comAlineas: artigos.filter(a => a.alineas.length > 0).length
  };

  console.log('\n=== Conversão Concluída ===');
  console.log(`Total: ${stats.total} artigos`);
  console.log(`Vigentes: ${stats.vigentes}`);
  console.log(`Revogados: ${stats.revogados}`);
  console.log(`Com parágrafos: ${stats.comParagrafos}`);
  console.log(`Com alíneas: ${stats.comAlineas}`);

  fs.writeFileSync(outputPath, JSON.stringify(artigos, null, 2), 'utf8');
  console.log(`\nArquivo salvo: ${outputPath}`);
  console.log(`Tamanho: ${(fs.statSync(outputPath).size / 1024).toFixed(1)} KB`);
}

function parseArtigo(numero, bloco) {
  const texto = bloco.trim();

  const revogadoMatch = texto.match(/\[REVOGADO_INICIO\]/i) ||
                        texto.match(/\(revogad[oa]\)/i) ||
                        texto.match(/\(suprimid[oa]\)/i);
  const status = revogadoMatch ? 'revogado' : 'vigente';

  // Extrair caput - pegar apenas até próximo "Art." ou parágrafo
  const caputMatch = texto.match(/Art\.\s*\d+[°º]?\s*(.+?)(?=§\s*\d|Parágrafo único|[a-z]\)|Art\.\s*\d|$)/i);
  let caput = caputMatch ? caputMatch[1].trim() : texto.substring(0, 500);

  caput = caput
    .replace(/^\.\s*/, '')
    .replace(/\[REVOGADO_INICIO\]/gi, '')
    .replace(/\[REVOGADO_FIM\]/gi, '')
    .replace(/\s*\(Reda[çc][ãa]o dada[^)]+\)/gi, '')
    .replace(/\s*\(Inclu[ií]d[oa][^)]+\)/gi, '')
    .replace(/\s*\(Vig[êe]ncia[^)]*\)/gi, '')
    .replace(/\s*\(Vide[^)]+\)/gi, '')
    .replace(/\s*\(Revogad[oa][^)]+\)/gi, '')
    .trim();

  // Parágrafos
  const paragrafos = [];
  const paragrafoRegex = /(?:§\s*(\d+)[º°]?|Parágrafo único)\.?\s*(.+?)(?=§\s*\d|Parágrafo único|Art\.|$)/gi;
  let paraMatch;
  while ((paraMatch = paragrafoRegex.exec(texto)) !== null) {
    const paraNumero = paraMatch[1] || 'único';
    let paraTexto = paraMatch[2].trim()
      .replace(/\[REVOGADO_INICIO\]/gi, '')
      .replace(/\[REVOGADO_FIM\]/gi, '')
      .replace(/\s*\(Reda[çc][ãa]o dada[^)]+\)/gi, '')
      .replace(/\s*\(Inclu[ií]d[oa][^)]+\)/gi, '')
      .trim();

    if (paraTexto.length > 5) {
      paragrafos.push({
        numero: paraNumero,
        texto: paraTexto
      });
    }
  }

  // Alíneas (a, b, c, d, e, f)
  const alineas = [];
  const alineaRegex = /\b([a-f])\)\s*(.+?)(?=[a-f]\)|§|Parágrafo|Art\.|$)/gi;
  let alineaMatch;
  while ((alineaMatch = alineaRegex.exec(texto)) !== null) {
    let alineaTexto = alineaMatch[2].trim()
      .replace(/\[REVOGADO_INICIO\]/gi, '')
      .replace(/\[REVOGADO_FIM\]/gi, '')
      .replace(/\s*\(Reda[çc][ãa]o dada[^)]+\)/gi, '')
      .replace(/\s*\(Revogad[oa][^)]+\)/gi, '')
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
    id: `l605-art-${numero}`,
    numero: numero,
    caput: caput,
    paragrafos: paragrafos,
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

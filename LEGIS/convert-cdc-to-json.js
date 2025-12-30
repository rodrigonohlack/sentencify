#!/usr/bin/env node
/**
 * Converte CDC (L8078compilado.html) para JSON estruturado
 * Uso: node convert-cdc-to-json.js
 */

const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, 'L8078compilado.html');
const outputPath = path.join(__dirname, 'cdc.json');

// Keywords do direito do consumidor
const KEYWORDS_CONSUMIDOR = [
  'consumidor', 'fornecedor', 'produto', 'serviço', 'relação de consumo',
  'direito', 'dever', 'proteção', 'defesa', 'vulnerabilidade',
  'oferta', 'publicidade', 'propaganda', 'informação', 'transparência',
  'contrato', 'cláusula abusiva', 'adesão', 'nulidade',
  'vício', 'defeito', 'fato do produto', 'fato do serviço', 'recall',
  'garantia', 'prazo', 'decadência', 'prescrição',
  'responsabilidade', 'solidariedade', 'indenização', 'dano', 'reparação',
  'práticas abusivas', 'cobrança', 'banco de dados', 'cadastro',
  'Procon', 'órgão de defesa', 'Ministério Público', 'ação coletiva',
  'inversão do ônus da prova', 'hipossuficiência',
  'saúde', 'segurança', 'qualidade', 'quantidade', 'preço',
  'crédito', 'financiamento', 'juros', 'multa', 'mora',
  'troca', 'devolução', 'restituição', 'abatimento',
  'descumprimento', 'inadimplemento', 'rescisão', 'resolução'
];

function main() {
  console.log('Lendo HTML do CDC...');

  const html = fs.readFileSync(htmlPath, 'latin1');
  console.log(`Tamanho do HTML: ${(html.length / 1024).toFixed(1)} KB`);

  // Limpar HTML
  let textoLimpo = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#?[a-z0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ');

  // Regex para encontrar artigos - CDC usa Art. X° ou Art. X
  const artigoRegex = /Art\.\s*(\d+)/gi;

  const posicoes = [];
  const numerosVistos = new Set();
  let match;
  let totalMatches = 0;

  while ((match = artigoRegex.exec(textoLimpo)) !== null) {
    totalMatches++;
    const numero = match[1];
    const numInt = parseInt(numero);

    // CDC vai até art. 119, ignorar referências a outros códigos
    if (numInt <= 119 && !numerosVistos.has(numero)) {
      numerosVistos.add(numero);
      posicoes.push({
        numero: numero,
        posicao: match.index
      });
    }
  }

  console.log(`Total matches: ${totalMatches}`);
  console.log(`Artigos encontrados: ${posicoes.length}`);

  // Ordenar por posição
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

  // Ordenar por número
  artigos.sort((a, b) => {
    const numA = parseInt(a.numero) || 0;
    const numB = parseInt(b.numero) || 0;
    return numA - numB;
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

  const exemplo = artigos.find(a => a.paragrafos.length > 0 && a.incisos.length > 0);
  if (exemplo) {
    console.log('\n=== Exemplo ===');
    console.log(JSON.stringify({
      ...exemplo,
      caput: exemplo.caput.substring(0, 100) + '...'
    }, null, 2));
  }
}

function parseArtigo(numero, bloco) {
  const texto = bloco.trim();

  const revogadoMatch = texto.match(/\(revogad[oa]\)/i) ||
                        texto.match(/\(suprimid[oa]\)/i) ||
                        texto.match(/\(VETADO\)/i);
  const status = revogadoMatch ? 'revogado' : 'vigente';

  // Extrair caput
  const caputMatch = texto.match(/Art\.\s*\d+[°º]?\s+(.+?)(?=§\s*\d|Parágrafo único|I\s*[-–]|$)/i);
  let caput = caputMatch ? caputMatch[1].trim() : texto.substring(0, 500);

  caput = caput
    .replace(/^Art\.\s*\d+[°º]?\s*/i, '')  // Remove "Art. X" duplicado no início
    .replace(/^\.\s*/, '')  // Remove ponto no início
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
    let paraTexto = paraMatch[2].trim();

    const altMatch = paraTexto.match(/\((?:Reda[çc][ãa]o dada|Inclu[ií]d[oa])\s+(?:pela?\s+)?(?:Lei\s+n[º°]?\s*)?([\d\.\/]+)[^)]*\)/i);
    const alteracao = altMatch ? `Lei ${altMatch[1]}` : null;

    paraTexto = paraTexto
      .replace(/\s*\(Reda[çc][ãa]o dada[^)]+\)/gi, '')
      .replace(/\s*\(Inclu[ií]d[oa][^)]+\)/gi, '')
      .replace(/\s*\(Vig[êe]ncia[^)]*\)/gi, '')
      .trim();

    if (paraTexto.length > 5) {
      paragrafos.push({
        numero: paraNumero,
        texto: paraTexto,
        ...(alteracao && { alteracao })
      });
    }
  }

  // Incisos
  const incisos = [];
  const incisoRegex = /\b(X{0,3}(?:IX|IV|V?I{0,3}))\s*[-–.]\s*(.+?)(?=\b(?:X{0,3}(?:IX|IV|V?I{0,3}))\s*[-–.]|§|Parágrafo|Art\.|$)/gi;
  let incisoMatch;
  while ((incisoMatch = incisoRegex.exec(texto)) !== null) {
    const incisoNumero = incisoMatch[1].toUpperCase();
    let incisoTexto = incisoMatch[2].trim();

    incisoTexto = incisoTexto
      .replace(/\s*\(Reda[çc][ãa]o dada[^)]+\)/gi, '')
      .replace(/\s*\(Inclu[ií]d[oa][^)]+\)/gi, '')
      .replace(/\s*\(Vig[êe]ncia[^)]*\)/gi, '')
      .trim();

    if (/^[IVXLCDM]+$/.test(incisoNumero) && incisoTexto.length > 3) {
      incisos.push({
        numero: incisoNumero,
        texto: incisoTexto
      });
    }
  }

  const keywords = extrairKeywords(caput + ' ' + paragrafos.map(p => p.texto).join(' '));

  return {
    id: `cdc-art-${numero}`,
    numero: numero,
    caput: caput,
    paragrafos: paragrafos,
    incisos: incisos,
    status: status,
    keywords: keywords
  };
}

function extrairKeywords(texto) {
  const palavras = new Set();
  const textoLower = texto.toLowerCase();

  for (const termo of KEYWORDS_CONSUMIDOR) {
    if (textoLower.includes(termo.toLowerCase())) {
      palavras.add(termo);
    }
  }

  return Array.from(palavras).slice(0, 10);
}

main();

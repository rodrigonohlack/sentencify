#!/usr/bin/env node
/**
 * Converte CPC (L13105.html) para JSON estruturado
 * Uso: node convert-cpc-to-json.js
 */

const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, 'L13105.html');
const outputPath = path.join(__dirname, 'cpc.json');

// Keywords processuais para extração automática
const KEYWORDS_PROCESSUAIS = [
  'ação', 'processo', 'procedimento', 'jurisdição', 'competência',
  'juiz', 'juízo', 'tribunal', 'vara', 'foro', 'comarca',
  'autor', 'réu', 'parte', 'litisconsórcio', 'terceiro', 'intervenção',
  'petição inicial', 'contestação', 'réplica', 'reconvenção',
  'citação', 'intimação', 'notificação', 'prazo', 'preclusão',
  'audiência', 'conciliação', 'mediação', 'instrução', 'julgamento',
  'sentença', 'decisão', 'despacho', 'acórdão', 'fundamentação',
  'recurso', 'apelação', 'agravo', 'embargos', 'recurso especial', 'recurso extraordinário',
  'execução', 'cumprimento de sentença', 'penhora', 'expropriação',
  'tutela provisória', 'tutela antecipada', 'tutela cautelar', 'liminar',
  'prova', 'documento', 'testemunha', 'perícia', 'inspeção',
  'revelia', 'confissão', 'presunção', 'ônus da prova',
  'coisa julgada', 'trânsito em julgado', 'preclusão',
  'custas', 'honorários', 'sucumbência', 'gratuidade',
  'nulidade', 'extinção', 'improcedência', 'procedência',
  'mérito', 'preliminar', 'prejudicial', 'prescrição', 'decadência',
  'litispendência', 'conexão', 'continência', 'prevenção',
  'mandado', 'carta', 'ofício', 'alvará',
  'inventário', 'arrolamento', 'partilha', 'herança',
  'usucapião', 'despejo', 'consignação', 'monitória',
  'mandado de segurança', 'habeas corpus', 'ação popular',
  'ação civil pública', 'class action', 'coletiva'
];

function main() {
  console.log('Lendo HTML do CPC...');

  // Ler com encoding latin1 (windows-1252)
  const html = fs.readFileSync(htmlPath, 'latin1');
  console.log(`Tamanho do HTML: ${(html.length / 1024).toFixed(1)} KB`);

  const artigos = [];

  // Regex para capturar artigos - padrão do CPC: &nbsp;<a name="artX"></a>Art. X
  // Permite conteúdo entre a âncora e o Art.
  // Artigos 1000+ usam formato "Art. 1.000" com ponto separador de milhar
  const artigoAncoraRegex = /<a name="art(\d+[a-z]?(?:-[a-z])?)(?:\.\d+)?">[^]*?Art\.\s*([\d\.]+[º°\-A-Za-z]*)/gi;

  let match;
  const posicoes = [];
  const numerosVistos = new Set();

  while ((match = artigoAncoraRegex.exec(html)) !== null) {
    const numeroTexto = match[2].replace(/[º°\.]/g, '').replace(/-/g, '-');
    const numeroFinal = numeroTexto.toLowerCase().replace(/\s/g, '');

    if (!numerosVistos.has(numeroFinal)) {
      numerosVistos.add(numeroFinal);
      posicoes.push({
        numero: numeroFinal,
        posicao: match.index
      });
    }
  }

  console.log(`Artigos encontrados: ${posicoes.length}`);

  for (let i = 0; i < posicoes.length; i++) {
    const inicio = posicoes[i].posicao;
    const fim = i < posicoes.length - 1 ? posicoes[i + 1].posicao : html.length;
    const bloco = html.substring(inicio, fim);

    try {
      const artigo = parseArtigo(posicoes[i].numero, bloco);
      if (artigo) {
        artigos.push(artigo);
      }
    } catch (err) {
      console.error(`Erro no art. ${posicoes[i].numero}: ${err.message}`);
    }
  }

  // Ordenar
  artigos.sort((a, b) => {
    const numA = parseFloat(a.numero.replace(/[^\d.]/g, '')) || 0;
    const numB = parseFloat(b.numero.replace(/[^\d.]/g, '')) || 0;
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

  const exemplo = artigos.find(a => a.paragrafos.length > 0 && a.incisos.length > 0);
  if (exemplo) {
    console.log('\n=== Exemplo (artigo com parágrafos e incisos) ===');
    console.log(JSON.stringify({
      ...exemplo,
      caput: exemplo.caput.substring(0, 100) + '...'
    }, null, 2));
  }
}

function parseArtigo(numero, bloco) {
  let texto = bloco
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<a[^>]*href[^>]*>([^<]*)<\/a>/gi, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#?[a-z0-9]+;/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  const revogadoMatch = texto.match(/\(revogad[oa]\)/i) ||
                        texto.match(/\(suprimid[oa]\)/i) ||
                        texto.match(/\(VETADO\)/i);
  const status = revogadoMatch ? 'revogado' : 'vigente';

  // Extrair caput (inclui artigos com formato 1.000)
  const caputMatch = texto.match(/Art\.\s*[\d\.]+[º°\-A-Za-z]*\s*[-–.]?\s*(.+?)(?=§\s*\d|Parágrafo único|I\s*[-–]|$)/i);
  let caput = caputMatch ? caputMatch[1].trim() : texto;

  caput = caput
    .replace(/\s*\(Reda[çc][ãa]o dada[^)]+\)/gi, '')
    .replace(/\s*\(Inclu[ií]d[oa][^)]+\)/gi, '')
    .replace(/\s*\(Vig[êe]ncia[^)]*\)/gi, '')
    .replace(/\s*\(Vide[^)]+\)/gi, '')
    .trim();

  // Parágrafos
  const paragrafos = [];
  const paragrafoRegex = /(?:§\s*(\d+)[º°]?|Parágrafo único)\s*[-–.]?\s*(.+?)(?=§\s*\d|Parágrafo único|I\s*[-–]|Art\.|$)/gi;
  let paraMatch;
  while ((paraMatch = paragrafoRegex.exec(texto)) !== null) {
    const paraNumero = paraMatch[1] || 'único';
    let paraTexto = paraMatch[2].trim();

    const altMatch = paraTexto.match(/\((?:Reda[çc][ãa]o dada|Inclu[ií]d[oa])\s+(?:pela?\s+)?(?:Lei\s+n[º°]?\s*)?(\d+[\d.\/]*(?:\/\d+)?)[^)]*\)/i);
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
    id: `cpc-art-${numero}`,
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

  for (const termo of KEYWORDS_PROCESSUAIS) {
    if (textoLower.includes(termo.toLowerCase())) {
      palavras.add(termo);
    }
  }

  return Array.from(palavras).slice(0, 10);
}

main();

#!/usr/bin/env node
/**
 * Converte CF/88 (Constituição.html) para JSON estruturado
 * Uso: node convert-cf-to-json.js
 */

const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, 'Constituição.html');
const outputPath = path.join(__dirname, 'cf88.json');

// Keywords constitucionais para extração automática
const KEYWORDS_CONSTITUCIONAIS = [
  'direito', 'garantia', 'liberdade', 'igualdade', 'dignidade',
  'cidadania', 'soberania', 'República', 'Federação', 'democracia',
  'Estado', 'União', 'Estados', 'Municípios', 'Distrito Federal',
  'Constituição', 'constitucional', 'inconstitucional', 'emenda',
  'lei', 'decreto', 'medida provisória', 'resolução', 'portaria',
  'Presidente', 'Congresso', 'Senado', 'Câmara', 'Deputado', 'Senador',
  'Judiciário', 'STF', 'STJ', 'tribunal', 'juiz', 'ministro',
  'competência', 'jurisdição', 'processo', 'ação', 'recurso',
  'tributo', 'imposto', 'taxa', 'contribuição', 'orçamento', 'fiscal',
  'saúde', 'educação', 'segurança', 'previdência', 'assistência',
  'trabalho', 'emprego', 'salário', 'aposentadoria', 'pensão',
  'propriedade', 'desapropriação', 'reforma agrária', 'meio ambiente',
  'família', 'criança', 'adolescente', 'idoso', 'deficiente',
  'voto', 'eleição', 'partido', 'mandato', 'sufrágio',
  'habeas corpus', 'mandado de segurança', 'habeas data', 'ação popular',
  'devido processo', 'ampla defesa', 'contraditório', 'presunção de inocência',
  'servidor', 'cargo', 'concurso', 'estabilidade', 'remuneração',
  'intervenção', 'estado de defesa', 'estado de sítio', 'segurança nacional',
  'nacionalidade', 'naturalização', 'estrangeiro', 'extradição', 'asilo'
];

function main() {
  console.log('Lendo HTML da CF/88...');

  const html = fs.readFileSync(htmlPath, 'latin1');
  console.log(`Tamanho do HTML: ${(html.length / 1024).toFixed(1)} KB`);

  const artigos = [];

  // Regex para capturar artigos - padrão da CF: <a name="artX"></a>Art. Xº
  // A CF usa âncoras como art1, art2, etc. para artigos permanentes
  const artigoAncoraRegex = /<a name="art(\d+[a-z]?(?:-[a-z])?)">[^]*?Art\.\s*([\d\.]+[º°]?[A-Za-z\-]*)/gi;

  // ADCT usa âncoras como adctart1, adctart2, etc.
  const adctAncoraRegex = /<a name="adctart(\d+[a-z]?(?:-[a-z])?)">[^]*?Art\.\s*([\d\.]+[º°]?[A-Za-z\-\.]*)/gi;

  let match;
  const posicoes = [];
  const numerosVistos = new Set();

  // Capturar artigos permanentes
  while ((match = artigoAncoraRegex.exec(html)) !== null) {
    const numeroTexto = match[2].replace(/[º°\.]/g, '').replace(/-/g, '-');
    const numeroFinal = numeroTexto.toLowerCase().replace(/\s/g, '');

    if (!numerosVistos.has(numeroFinal)) {
      numerosVistos.add(numeroFinal);
      posicoes.push({
        numero: numeroFinal,
        posicao: match.index,
        adct: false
      });
    }
  }

  // Capturar artigos do ADCT - usar número da âncora, não do texto
  const adctNumerosVistos = new Set();
  while ((match = adctAncoraRegex.exec(html)) !== null) {
    // match[1] é o número da âncora (mais confiável)
    const numeroAncora = match[1].toLowerCase().replace(/\s/g, '');

    if (!adctNumerosVistos.has(numeroAncora)) {
      adctNumerosVistos.add(numeroAncora);
      posicoes.push({
        numero: 'adct-' + numeroAncora,
        posicao: match.index,
        adct: true
      });
    }
  }

  // Ordenar por posição no HTML
  posicoes.sort((a, b) => a.posicao - b.posicao);

  console.log(`Artigos encontrados: ${posicoes.length}`);
  console.log(`  - Permanentes: ${posicoes.filter(p => !p.adct).length}`);
  console.log(`  - ADCT: ${posicoes.filter(p => p.adct).length}`);

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

  // Ordenar: artigos permanentes primeiro, depois ADCT
  artigos.sort((a, b) => {
    const aIsAdct = a.numero.startsWith('adct-');
    const bIsAdct = b.numero.startsWith('adct-');

    // ADCT sempre depois dos permanentes
    if (aIsAdct && !bIsAdct) return 1;
    if (!aIsAdct && bIsAdct) return -1;

    // Dentro do mesmo grupo, ordenar por número
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
                        texto.match(/\(suprimid[oa]\)/i);
  const status = revogadoMatch ? 'revogado' : 'vigente';

  // Extrair caput
  const caputMatch = texto.match(/Art\.\s*[\d\.]+[º°]?[A-Za-z\-]*\s*[-–.]?\s*(.+?)(?=§\s*\d|Parágrafo único|I\s*[-–]|$)/i);
  let caput = caputMatch ? caputMatch[1].trim() : texto;

  caput = caput
    .replace(/\s*\(Reda[çc][ãa]o dada[^)]+\)/gi, '')
    .replace(/\s*\(Inclu[ií]d[oa][^)]+\)/gi, '')
    .replace(/\s*\(Vig[êe]ncia[^)]*\)/gi, '')
    .replace(/\s*\(Vide[^)]+\)/gi, '')
    .replace(/\s*\(EC[^)]+\)/gi, '')
    .trim();

  // Parágrafos
  const paragrafos = [];
  const paragrafoRegex = /(?:§\s*(\d+)[º°]?|Parágrafo único)\s*[-–.]?\s*(.+?)(?=§\s*\d|Parágrafo único|I\s*[-–]|Art\.|$)/gi;
  let paraMatch;
  while ((paraMatch = paragrafoRegex.exec(texto)) !== null) {
    const paraNumero = paraMatch[1] || 'único';
    let paraTexto = paraMatch[2].trim();

    const altMatch = paraTexto.match(/\((?:Reda[çc][ãa]o dada|Inclu[ií]d[oa])\s+(?:pela?\s+)?(?:Emenda Constitucional\s+n[º°]?\s*)?([\d\/]+)[^)]*\)/i);
    const alteracao = altMatch ? `EC ${altMatch[1]}` : null;

    paraTexto = paraTexto
      .replace(/\s*\(Reda[çc][ãa]o dada[^)]+\)/gi, '')
      .replace(/\s*\(Inclu[ií]d[oa][^)]+\)/gi, '')
      .replace(/\s*\(Vig[êe]ncia[^)]*\)/gi, '')
      .replace(/\s*\(EC[^)]+\)/gi, '')
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
      .replace(/\s*\(EC[^)]+\)/gi, '')
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
    id: `cf88-art-${numero}`,
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

  for (const termo of KEYWORDS_CONSTITUCIONAIS) {
    if (textoLower.includes(termo.toLowerCase())) {
      palavras.add(termo);
    }
  }

  return Array.from(palavras).slice(0, 10);
}

main();

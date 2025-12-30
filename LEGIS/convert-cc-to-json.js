#!/usr/bin/env node
/**
 * Converte Código Civil (L10406compilada.html) para JSON estruturado
 * Uso: node convert-cc-to-json.js
 *
 * O CC não usa âncoras para artigos, então capturamos pelo texto "Art. X"
 */

const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, 'L10406compilada.html');
const outputPath = path.join(__dirname, 'cc.json');

// Keywords do direito civil
const KEYWORDS_CIVIL = [
  'pessoa', 'personalidade', 'capacidade', 'incapaz', 'emancipação',
  'direito', 'dever', 'obrigação', 'responsabilidade', 'dano',
  'domicílio', 'residência', 'ausência', 'morte', 'nascimento',
  'pessoa jurídica', 'associação', 'fundação', 'sociedade', 'empresa',
  'bem', 'propriedade', 'posse', 'usufruto', 'servidão', 'hipoteca',
  'contrato', 'negócio jurídico', 'declaração de vontade', 'nulidade',
  'prescrição', 'decadência', 'prazo', 'termo', 'condição',
  'casamento', 'divórcio', 'união estável', 'regime de bens', 'alimentos',
  'parentesco', 'filiação', 'adoção', 'guarda', 'tutela', 'curatela',
  'herança', 'sucessão', 'testamento', 'legado', 'herdeiro', 'inventário',
  'compra e venda', 'doação', 'locação', 'empréstimo', 'prestação de serviço',
  'mandato', 'fiança', 'penhor', 'alienação fiduciária',
  'indenização', 'reparação', 'lucros cessantes', 'dano moral', 'dano material',
  'boa-fé', 'má-fé', 'culpa', 'dolo', 'fraude', 'simulação',
  'credor', 'devedor', 'solidariedade', 'sub-rogação', 'compensação',
  'pagamento', 'mora', 'inadimplemento', 'resolução', 'rescisão',
  'registro', 'averbação', 'escritura', 'procuração'
];

function main() {
  console.log('Lendo HTML do Código Civil...');

  const html = fs.readFileSync(htmlPath, 'latin1');
  console.log(`Tamanho do HTML: ${(html.length / 1024).toFixed(1)} KB`);

  // Limpar HTML primeiro para facilitar parsing
  let textoLimpo = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<sup[^>]*>\s*<u>\s*o\s*<\/u>\s*<\/sup>/gi, 'º')  // Converter <sup><u>o</u></sup> para º
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#?[a-z0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ');

  // Regex para encontrar artigos
  // Formatos: "Art. 1º", "Art. 1.000.", "Art. 1.000-A"
  const artigoRegex = /Art\.\s*([\d\.]+[º°]?(?:-[A-Z])?)\s*[.\s]/gi;

  const posicoes = [];
  const numerosVistos = new Set();
  let match;

  while ((match = artigoRegex.exec(textoLimpo)) !== null) {
    // Normalizar número: remover pontos de milhar e símbolos
    const numeroRaw = match[1];
    const numeroNorm = numeroRaw
      .replace(/\./g, '')  // Remove pontos (1.000 -> 1000)
      .replace(/[º°]/g, '')
      .toLowerCase();

    if (!numerosVistos.has(numeroNorm)) {
      numerosVistos.add(numeroNorm);
      posicoes.push({
        numero: numeroNorm,
        posicao: match.index
      });
    }
  }

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

  // Verificar cobertura
  const nums = artigos.map(a => parseInt(a.numero.replace(/[^\d]/g, '')));
  const maxNum = Math.max(...nums);
  console.log(`\nMaior número de artigo: ${maxNum}`);

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

  // Extrair caput - texto após "Art. Xº" até primeiro § ou inciso I
  const caputMatch = texto.match(/Art\.\s*[\d\.]+[º°]?(?:-[A-Z])?\s*[.\s]*(.+?)(?=§\s*\d|Parágrafo único|^\s*I\s*[-–]|$)/i);
  let caput = caputMatch ? caputMatch[1].trim() : texto.substring(0, 500);

  // Limpar referências de alteração e símbolos residuais
  caput = caput
    .replace(/^[º°]\s*/, '')  // Remove º no início
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
    id: `cc-art-${numero}`,
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

  for (const termo of KEYWORDS_CIVIL) {
    if (textoLower.includes(termo.toLowerCase())) {
      palavras.add(termo);
    }
  }

  return Array.from(palavras).slice(0, 10);
}

main();

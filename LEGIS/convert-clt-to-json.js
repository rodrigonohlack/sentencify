#!/usr/bin/env node
/**
 * Converte CLT (Del5452compilado.html) para JSON estruturado
 * Uso: node convert-clt-to-json.js
 */

const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, 'Del5452compilado.html');
const outputPath = path.join(__dirname, 'clt.json');

// Keywords trabalhistas para extração automática
const KEYWORDS_TRABALHISTAS = [
  'empregador', 'empregado', 'trabalhador', 'contrato', 'trabalho',
  'jornada', 'salário', 'remuneração', 'férias', 'FGTS', 'rescisão',
  'aviso prévio', 'horas extras', 'intervalo', 'descanso', 'repouso',
  'sindicato', 'convenção coletiva', 'acordo coletivo', 'greve',
  'insalubridade', 'periculosidade', 'adicional noturno', 'comissão',
  'gratificação', 'equiparação salarial', 'isonomia', 'discriminação',
  'gestante', 'estabilidade', 'acidente', 'doença', 'licença',
  'aposentadoria', 'previdência', 'contribuição', 'seguro',
  'menor', 'aprendiz', 'estagiário', 'terceirização', 'temporário',
  'doméstico', 'rural', 'portuário', 'marítimo', 'aeronauta',
  'prescrição', 'decadência', 'prazo', 'competência', 'jurisdição',
  'reclamação', 'recurso', 'execução', 'penhora', 'depósito recursal',
  'custas', 'honorários', 'justiça gratuita', 'perícia', 'testemunha',
  'CTPS', 'carteira de trabalho', 'registro', 'anotação',
  'dispensa', 'demissão', 'justa causa', 'pedido de demissão',
  'verbas rescisórias', 'multa', 'indenização', 'dano moral',
  'assédio', 'responsabilidade', 'solidariedade', 'subsidiária',
  'grupo econômico', 'sucessão', 'fraude', 'simulação',
  'hora noturna', 'sobreaviso', 'prontidão', 'banco de horas',
  'compensação', 'escala', 'turno', 'regime', 'teletrabalho',
  'home office', 'intermitente', 'parcial', 'tempo integral'
];

function main() {
  console.log('Lendo HTML da CLT...');

  // Ler com encoding latin1 (windows-1252)
  const html = fs.readFileSync(htmlPath, 'latin1');
  console.log(`Tamanho do HTML: ${(html.length / 1024).toFixed(1)} KB`);

  // Encontrar todos os artigos usando âncoras
  const artigos = [];

  // Regex para capturar blocos de artigos
  // Padrão: <a name="artX"> seguido (com possível HTML entre) de Art. X
  // Exclui parágrafos (artp, art§), incisos (arti, artii) e alíneas (arta, artb)
  const artigoAncoraRegex = /<a name="art(\d+[a-z]?(?:-[a-z])?)\.?">[^]*?Art\.\s*(\d+[º°\-A-Za-z\.]*)/gi;

  let match;
  const posicoes = [];
  const numerosVistos = new Set();

  // Primeiro, encontrar todas as posições de artigos REAIS (que têm "Art." após a âncora)
  while ((match = artigoAncoraRegex.exec(html)) !== null) {
    const numeroAncora = match[1];
    const numeroTexto = match[2].replace(/[º°\.]/g, '').replace(/-/g, '-');

    // Usar número do texto como identificador (mais confiável)
    const numeroFinal = numeroTexto.toLowerCase().replace(/\s/g, '');

    // Evitar duplicatas
    if (!numerosVistos.has(numeroFinal)) {
      numerosVistos.add(numeroFinal);
      posicoes.push({
        numero: numeroFinal,
        posicao: match.index
      });
    }
  }

  console.log(`Artigos encontrados: ${posicoes.length}`);

  // Processar cada artigo
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

  // Ordenar por número
  artigos.sort((a, b) => {
    const numA = parseFloat(a.numero.replace(/[^\d.]/g, '')) || 0;
    const numB = parseFloat(b.numero.replace(/[^\d.]/g, '')) || 0;
    if (numA !== numB) return numA - numB;
    // Se números iguais, ordenar por sufixo (10-A, 10-B)
    return a.numero.localeCompare(b.numero);
  });

  // Estatísticas
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

  // Salvar JSON
  fs.writeFileSync(outputPath, JSON.stringify(artigos, null, 2), 'utf8');
  console.log(`\nArquivo salvo: ${outputPath}`);
  console.log(`Tamanho: ${(fs.statSync(outputPath).size / 1024).toFixed(1)} KB`);

  // Exemplo
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
  // Limpar HTML e extrair texto
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

  // Verificar se é artigo revogado
  const revogadoMatch = texto.match(/\(revogad[oa]\)/i) ||
                        texto.match(/\(suprimid[oa]\)/i);
  const status = revogadoMatch ? 'revogado' : 'vigente';

  // Extrair caput (texto principal do artigo)
  const caputMatch = texto.match(/Art\.\s*\d+[º°\-A-Za-z\.]*\s*[-–]?\s*(.+?)(?=§\s*\d|Parágrafo único|I\s*[-–]|$)/i);
  let caput = caputMatch ? caputMatch[1].trim() : texto;

  // Limpar referências de alteração do caput
  caput = caput
    .replace(/\s*\(Reda[çc][ãa]o dada[^)]+\)/gi, '')
    .replace(/\s*\(Inclu[ií]d[oa][^)]+\)/gi, '')
    .replace(/\s*\(Vig[êe]ncia[^)]*\)/gi, '')
    .replace(/\s*\(Vide[^)]+\)/gi, '')
    .trim();

  // Extrair parágrafos
  const paragrafos = [];
  const paragrafoRegex = /(?:§\s*(\d+)[º°]?|Parágrafo único)\s*[-–.]?\s*(.+?)(?=§\s*\d|Parágrafo único|I\s*[-–]|Art\.|$)/gi;
  let paraMatch;
  while ((paraMatch = paragrafoRegex.exec(texto)) !== null) {
    const paraNumero = paraMatch[1] || 'único';
    let paraTexto = paraMatch[2].trim();

    // Detectar alteração
    const altMatch = paraTexto.match(/\((?:Reda[çc][ãa]o dada|Inclu[ií]d[oa])\s+(?:pela?\s+)?(?:Lei\s+n[º°]?\s*)?(\d+[\d.\/]*(?:\/\d+)?)[^)]*\)/i);
    const alteracao = altMatch ? `Lei ${altMatch[1]}` : null;

    // Limpar texto
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

  // Extrair incisos (I, II, III, IV, V, etc.)
  const incisos = [];
  const incisoRegex = /\b(X{0,3}(?:IX|IV|V?I{0,3}))\s*[-–.]\s*(.+?)(?=\b(?:X{0,3}(?:IX|IV|V?I{0,3}))\s*[-–.]|§|Parágrafo|Art\.|$)/gi;
  let incisoMatch;
  while ((incisoMatch = incisoRegex.exec(texto)) !== null) {
    const incisoNumero = incisoMatch[1].toUpperCase();
    let incisoTexto = incisoMatch[2].trim();

    // Limpar
    incisoTexto = incisoTexto
      .replace(/\s*\(Reda[çc][ãa]o dada[^)]+\)/gi, '')
      .replace(/\s*\(Inclu[ií]d[oa][^)]+\)/gi, '')
      .replace(/\s*\(Vig[êe]ncia[^)]*\)/gi, '')
      .trim();

    // Validar que é um inciso romano válido
    if (/^[IVXLCDM]+$/.test(incisoNumero) && incisoTexto.length > 3) {
      incisos.push({
        numero: incisoNumero,
        texto: incisoTexto
      });
    }
  }

  // Gerar keywords
  const keywords = extrairKeywords(caput + ' ' + paragrafos.map(p => p.texto).join(' '));

  return {
    id: `clt-art-${numero}`,
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

  for (const termo of KEYWORDS_TRABALHISTAS) {
    if (textoLower.includes(termo.toLowerCase())) {
      palavras.add(termo);
    }
  }

  return Array.from(palavras).slice(0, 10);
}

main();

#!/usr/bin/env node
const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');

const docxPath = path.join(__dirname, 'OJ PLENO TST.docx');
const outputPath = path.join(__dirname, 'oj-pleno-tst.json');

async function main() {
  console.log('Extraindo texto do DOCX...');
  const result = await mammoth.extractRawText({ path: docxPath });
  const content = result.value;
  console.log(`Texto extraído: ${(content.length / 1024).toFixed(1)} KB`);

  // Dividir por "OJ-TP/OE-" no início (Tribunal Pleno/Órgão Especial)
  const blocos = content.split(/(?=OJ-TP\/OE-\d+\t)/gi).filter(b => b.trim());
  console.log(`Blocos encontrados: ${blocos.length}`);

  const ojs = [];

  for (const bloco of blocos) {
    try {
      const texto = bloco.trim();
      const headerMatch = texto.match(/OJ-TP\/OE-(\d+)\t/i);
      if (!headerMatch) continue;

      const numero = parseInt(headerMatch[1]);
      const linhas = texto.split(/\n+/).map(l => l.trim()).filter(l => l);

      const primeiraLinha = linhas[0] || '';

      // Extrair título
      let titulo = primeiraLinha
        .replace(/OJ-TP\/OE-\d+\t/i, '')
        .replace(/\s*\([^)]*cancelad[^)]*\)\s*/gi, '')
        .replace(/\s*\([^)]*mantid[^)]*\)\s*/gi, '')
        .replace(/\s*\([^)]*inserid[^)]*\)\s*/gi, '')
        .replace(/\s*\([^)]*atualizad[^)]*\)\s*/gi, '')
        .replace(/\s*\([^)]*convers[ãa]o[^)]*\)\s*/gi, '')
        .replace(/\s*[-–]\s*Res\..*$/i, '')
        .replace(/\s*[-–]\s*DJ.*$/i, '')
        .replace(/\s*[-–]\s*DEJT.*$/i, '')
        .replace(/\s*\(DJ[^)]*\)\s*/gi, '')
        .trim();

      // Verificar status
      let status = 'Válida';
      const primeiraLinhaLower = primeiraLinha.toLowerCase();

      if (primeiraLinhaLower.includes('cancelad')) {
        status = 'Cancelada';
      } else if (primeiraLinhaLower.includes('conversão') || primeiraLinhaLower.includes('convertid')) {
        status = 'Convertida em Súmula';
      } else if (primeiraLinhaLower.includes('revogad')) {
        status = 'Revogada';
      }

      let convertidaEm = '';
      const convMatch = texto.match(/convers[ãa]o\s+n[ao]?\s+S[úu]mula\s+n?[º°]?\s*(\d+)/i);
      if (convMatch) convertidaEm = `Súmula ${convMatch[1]}`;

      // Extrair enunciado (tudo após a primeira linha)
      let enunciado = linhas.slice(1).join('\n')
        .replace(/\s{2,}/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      if (enunciado.length < 10 && status !== 'Válida') {
        enunciado = '(OJ cancelada/convertida)';
      }

      const keywords = extrairKeywords(titulo + ' ' + enunciado);

      ojs.push({
        id: `oj-pleno-${numero}`,
        tribunal: 'TST',
        tipoProcesso: 'OJ',
        orgao: 'Pleno',
        numero,
        titulo: titulo || `OJ ${numero}`,
        enunciado,
        status,
        ...(convertidaEm && { convertidaEm }),
        keywords
      });
    } catch (err) {
      console.error('Erro ao processar bloco:', err.message);
    }
  }

  ojs.sort((a, b) => a.numero - b.numero);

  const stats = {
    total: ojs.length,
    validas: ojs.filter(o => o.status === 'Válida').length,
    canceladas: ojs.filter(o => o.status === 'Cancelada').length,
    convertidas: ojs.filter(o => o.status === 'Convertida em Súmula').length
  };

  console.log('\n=== Conversão Concluída ===');
  console.log(`Total: ${stats.total} OJs`);
  console.log(`Válidas: ${stats.validas}`);
  console.log(`Canceladas: ${stats.canceladas}`);
  console.log(`Convertidas: ${stats.convertidas}`);

  fs.writeFileSync(outputPath, JSON.stringify(ojs, null, 2), 'utf8');
  console.log(`\nArquivo salvo: ${outputPath}`);
  console.log(`Tamanho: ${(fs.statSync(outputPath).size / 1024).toFixed(1)} KB`);

  const valida = ojs.find(o => o.status === 'Válida' && o.enunciado.length > 50);
  if (valida) {
    console.log('\n=== Exemplo (OJ válida) ===');
    console.log(JSON.stringify({ ...valida, enunciado: valida.enunciado.substring(0, 150) + '...' }, null, 2));
  }
}

function extrairKeywords(texto) {
  const palavrasChave = new Set();
  const termos = [
    'precatório', 'sequestro', 'execução', 'Fazenda Pública',
    'mandado de segurança', 'recurso', 'competência', 'prazo',
    'juros', 'mora', 'cálculos', 'crédito', 'pequeno valor',
    'trabalhista', 'CLT', 'TRT', 'TST', 'remessa necessária',
    'matéria administrativa', 'órgão colegiado'
  ];
  const textoLower = texto.toLowerCase();
  for (const termo of termos) {
    if (textoLower.includes(termo.toLowerCase())) {
      palavrasChave.add(termo);
    }
  }
  return Array.from(palavrasChave).slice(0, 10);
}

main().catch(console.error);

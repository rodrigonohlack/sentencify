#!/usr/bin/env node
const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');

const docxPath = path.join(__dirname, 'sumulas tst.docx');
const outputPath = path.join(__dirname, 'sumulas-tst.json');

async function main() {
  console.log('Extraindo texto do DOCX...');
  const result = await mammoth.extractRawText({ path: docxPath });
  const content = result.value;
  console.log(`Texto extraído: ${(content.length / 1024).toFixed(1)} KB`);

  // Dividir por "SUM-" ou "IRR-" no início de linha
  const blocos = content.split(/(?=(?:SUM|IRR)-\d+\t)/gi).filter(b => b.trim());
  console.log(`Blocos encontrados: ${blocos.length}`);

  const sumulas = [];

  for (const bloco of blocos) {
    try {
      const texto = bloco.trim();

      // Extrair número e tipo: "SUM-1" ou "IRR-168"
      const headerMatch = texto.match(/^(SUM|IRR)-(\d+)\s+/i);
      if (!headerMatch) continue;

      const tipo = headerMatch[1].toUpperCase();
      const numero = parseInt(headerMatch[2]);

      // Extrair título (primeira linha após o número)
      const primeiraLinha = texto.split('\n')[0];
      let titulo = primeiraLinha
        .replace(/^(SUM|IRR)-\d+\s+/i, '')
        .replace(/\s*\([^)]*mantida[^)]*\)\s*/gi, '')
        .replace(/\s*\([^)]*cancelad[^)]*\)\s*/gi, '')
        .replace(/\s*[-–]\s*Res\..*$/i, '')
        .replace(/\s*[-–]\s*Entendimento.*$/i, '')
        .replace(/\s*\(inserid[^)]*\)\s*/gi, '')
        .replace(/\s*\(atualizad[^)]*\)\s*/gi, '')
        .replace(/\s*\(conversão[^)]*\)\s*/gi, '')
        .trim();

      // Verificar status
      let status = 'Válida';
      const primeiraLinhaLower = primeiraLinha.toLowerCase();

      if (primeiraLinhaLower.includes('cancelad')) {
        status = 'Cancelada';
      } else if (primeiraLinhaLower.includes('convertid')) {
        status = 'Convertida';
      } else if (primeiraLinhaLower.includes('revogad')) {
        status = 'Revogada';
      }

      // Extrair enunciado (tudo entre o título e "Histórico:")
      const linhas = texto.split('\n').map(l => l.trim()).filter(l => l);
      let startIdx = 1;
      let endIdx = linhas.findIndex(l => /^Histórico:/i.test(l));
      if (endIdx === -1) endIdx = linhas.length;

      // Pegar linhas do enunciado, filtrando metadata
      const enunciadoLinhas = linhas.slice(startIdx, endIdx).filter(l => {
        if (/^(Res\.\s*\d|DJ\s|DEJT\s|Redação original|Súmula mantida|Item [IVX]+ |Nº \d)/i.test(l)) return false;
        return true;
      });

      let enunciado = enunciadoLinhas.join('\n').trim();
      enunciado = enunciado
        .replace(/\s{2,}/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      // Extrair resolução
      let resolucao = '';
      const resMatch = texto.match(/Res\.\s*(\d+\/\d{4})/i);
      if (resMatch) resolucao = `Res. ${resMatch[1]}`;

      // Keywords
      const keywords = extrairKeywords(titulo + ' ' + enunciado);

      const sumula = {
        id: `${tipo.toLowerCase()}-tst-${numero}`,
        tribunal: 'TST',
        tipoProcesso: tipo === 'IRR' ? 'IRR' : 'Súmula',
        orgao: 'Pleno',
        numero,
        titulo: titulo || `${tipo} ${numero}`,
        enunciado: enunciado || '(Sem enunciado)',
        status,
        ...(resolucao && { resolucao }),
        keywords
      };

      sumulas.push(sumula);

    } catch (err) {
      console.error('Erro ao processar bloco:', err.message);
    }
  }

  // Ordenar: Súmulas primeiro, depois IRR, ambos por número
  sumulas.sort((a, b) => {
    if (a.tipoProcesso !== b.tipoProcesso) {
      return a.tipoProcesso === 'Súmula' ? -1 : 1;
    }
    return a.numero - b.numero;
  });

  // Estatísticas
  const stats = {
    total: sumulas.length,
    sumulas: sumulas.filter(s => s.tipoProcesso === 'Súmula').length,
    irr: sumulas.filter(s => s.tipoProcesso === 'IRR').length,
    validas: sumulas.filter(s => s.status === 'Válida').length,
    canceladas: sumulas.filter(s => s.status === 'Cancelada').length,
    convertidas: sumulas.filter(s => s.status === 'Convertida').length,
    revogadas: sumulas.filter(s => s.status === 'Revogada').length
  };

  console.log('\n=== Conversão Concluída ===');
  console.log(`Total: ${stats.total}`);
  console.log(`  Súmulas: ${stats.sumulas}`);
  console.log(`  IRR: ${stats.irr}`);
  console.log(`Válidas: ${stats.validas}`);
  console.log(`Canceladas: ${stats.canceladas}`);
  console.log(`Convertidas: ${stats.convertidas}`);
  console.log(`Revogadas: ${stats.revogadas}`);

  fs.writeFileSync(outputPath, JSON.stringify(sumulas, null, 2), 'utf8');
  console.log(`\nArquivo salvo: ${outputPath}`);
  console.log(`Tamanho: ${(fs.statSync(outputPath).size / 1024).toFixed(1)} KB`);

  // Exemplos
  const valida = sumulas.find(s => s.status === 'Válida' && s.enunciado.length > 50);
  if (valida) {
    console.log('\n=== Exemplo (válida) ===');
    console.log(JSON.stringify({ ...valida, enunciado: valida.enunciado.substring(0, 200) + '...' }, null, 2));
  }
}

function extrairKeywords(texto) {
  const palavrasChave = new Set();
  const termos = [
    'equiparação', 'salarial', 'salário', 'remuneração', 'gratificação',
    'férias', 'aviso prévio', 'FGTS', 'verbas', 'indenização',
    'jornada', 'hora extra', 'intervalo', 'descanso', 'banco de horas',
    'terceirização', 'trabalhista', 'CLT', 'empregado', 'empregador',
    'rescisão', 'contrato', 'dispensa', 'demissão', 'justa causa',
    'estabilidade', 'gestante', 'acidente', 'doença', 'aposentadoria',
    'prescrição', 'competência', 'recurso', 'embargos', 'agravo',
    'sindicato', 'contribuição', 'negociação coletiva', 'convenção',
    'honorários', 'custas', 'depósito recursal', 'justiça gratuita',
    'professor', 'bancário', 'doméstico', 'rural', 'temporário',
    'adicional', 'insalubridade', 'periculosidade', 'noturno',
    'vale-transporte', 'multa', 'prazo', 'intimação', 'citação',
    'ação rescisória', 'mandado de segurança', 'execução', 'precatório',
    'ônus da prova', 'dano moral', 'assédio', 'responsabilidade'
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

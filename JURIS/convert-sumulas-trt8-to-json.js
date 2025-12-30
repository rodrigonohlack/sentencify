#!/usr/bin/env node
/**
 * Converte o DOCX de súmulas TRT8 para JSON
 */

const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');

const docxPath = path.join(__dirname, 'sumulas trt8.docx');
const outputPath = path.join(__dirname, 'sumulas-trt8.json');

async function main() {
  console.log('Extraindo texto do DOCX...');

  const result = await mammoth.extractRawText({ path: docxPath });
  const content = result.value;

  console.log(`Texto extraído: ${(content.length / 1024).toFixed(1)} KB`);

  // Dividir por "Súmula nº" que marca início de cada súmula
  const blocos = content.split(/(?=Súmula\s*n[º°]\s*\d+)/gi).filter(b => b.trim());

  console.log(`Blocos encontrados: ${blocos.length}`);

  const sumulas = [];

  for (const bloco of blocos) {
    try {
      const texto = bloco.trim();

      // Extrair número e título: "Súmula nº X - TÍTULO"
      const headerMatch = texto.match(/Súmula\s*n[º°]\s*(\d+)\s*[-–]\s*([^\n]+)/i);
      if (!headerMatch) continue;

      const numero = parseInt(headerMatch[1]);
      const titulo = headerMatch[2].trim();

      // Extrair fonte (última ocorrência de "Fonte:")
      const fonteMatch = texto.match(/Fonte:\s*([^\n]+)/gi);
      const fonte = fonteMatch ? fonteMatch[fonteMatch.length - 1].replace(/^Fonte:\s*/i, '').trim() : '';

      // Verificar se foi cancelada
      let status = 'Válida';
      const textoUpper = texto.toUpperCase();
      if (textoUpper.includes('CANCELADA') || textoUpper.includes('CANCELADO')) {
        status = 'Cancelada';
      }

      // Extrair enunciado (entre título e Fonte)
      let enunciado = texto
        .replace(/Súmula\s*n[º°]\s*\d+\s*[-–]\s*[^\n]+\n*/i, '') // Remove header
        .replace(/Fonte:\s*[^\n]+/gi, '') // Remove todas as linhas de Fonte
        .replace(/SÚMULA\s+CANCELADA[^\n]*/gi, '') // Remove aviso de cancelamento
        .trim();

      // Limpar quebras de linha extras
      enunciado = enunciado
        .split(/\n+/)
        .map(l => l.trim())
        .filter(l => l)
        .join('\n\n');

      // Extrair data de aprovação/alteração da fonte
      let dataAprovacao = '';
      const dataMatch = fonte.match(/(\d{1,2}\s+de\s+\w+\s+de\s+\d{4})/i);
      if (dataMatch) {
        dataAprovacao = dataMatch[1];
      }

      // Keywords
      const keywords = extrairKeywords(titulo + ' ' + enunciado);

      const sumula = {
        id: `sumula-trt8-${numero}`,
        tribunal: 'TRT8',
        tipoProcesso: 'Súmula',
        numero,
        titulo,
        enunciado,
        status,
        ...(dataAprovacao && { dataAprovacao }),
        ...(fonte && { fonte }),
        keywords
      };

      sumulas.push(sumula);

    } catch (err) {
      console.error('Erro ao processar bloco:', err.message);
    }
  }

  // Ordenar por número
  sumulas.sort((a, b) => a.numero - b.numero);

  // Estatísticas
  const stats = {
    total: sumulas.length,
    validas: sumulas.filter(s => s.status === 'Válida').length,
    canceladas: sumulas.filter(s => s.status === 'Cancelada').length
  };

  console.log('\n=== Conversão Concluída ===');
  console.log(`Total: ${stats.total} súmulas`);
  console.log(`Válidas: ${stats.validas} | Canceladas: ${stats.canceladas}`);

  // Salvar JSON
  fs.writeFileSync(outputPath, JSON.stringify(sumulas, null, 2), 'utf8');
  console.log(`\nArquivo salvo: ${outputPath}`);
  console.log(`Tamanho: ${(fs.statSync(outputPath).size / 1024).toFixed(1)} KB`);

  // Exemplos
  if (sumulas.length > 0) {
    const valida = sumulas.find(s => s.status === 'Válida');
    const cancelada = sumulas.find(s => s.status === 'Cancelada');

    if (valida) {
      console.log('\n=== Exemplo (súmula válida) ===');
      console.log(JSON.stringify({ ...valida, enunciado: valida.enunciado.substring(0, 200) + '...' }, null, 2));
    }

    if (cancelada) {
      console.log('\n=== Exemplo (súmula cancelada) ===');
      console.log(JSON.stringify({ ...cancelada, enunciado: cancelada.enunciado.substring(0, 200) + '...' }, null, 2));
    }
  }
}

function extrairKeywords(texto) {
  const palavrasChave = new Set();

  const termos = [
    'contribuição', 'previdenciária', 'INSS', 'FGTS', 'imposto de renda',
    'terceirização', 'trabalhista', 'CLT', 'empregado', 'empregador',
    'rescisão', 'contrato', 'jornada', 'hora extra', 'adicional',
    'férias', 'aviso prévio', 'verbas', 'indenização', 'dano',
    'responsabilidade', 'subsidiária', 'solidária', 'execução',
    'prescrição', 'competência', 'recurso', 'embargos',
    'insalubridade', 'periculosidade', 'equiparação', 'isonomia',
    'CEF', 'Caixa', 'Correios', 'ECT', 'Fazenda Pública',
    'precatório', 'custas', 'honorários', 'acordo', 'vínculo'
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

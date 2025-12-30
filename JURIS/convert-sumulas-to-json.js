#!/usr/bin/env node
/**
 * Converte o DOCX de súmulas STF/STJ para JSON
 */

const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');

const docxPath = path.join(__dirname, 'sumulas stf e stj.docx');
const outputPath = path.join(__dirname, 'sumulas-stf-stj.json');

async function main() {
  console.log('Extraindo texto do DOCX...');

  const result = await mammoth.extractRawText({ path: docxPath });
  const content = result.value;

  console.log(`Texto extraído: ${(content.length / 1024).toFixed(1)} KB`);

  // Dividir por "Origem:" que marca início de cada súmula
  const blocos = content.split(/(?=Origem:\s*(?:STF|STJ))/gi).filter(b => b.trim());

  console.log(`Blocos encontrados: ${blocos.length}`);

  const sumulas = [];
  let id = 1;

  for (const bloco of blocos) {
    try {
      const texto = bloco.trim();

      if (!texto.toLowerCase().startsWith('origem:')) continue;

      const linhas = texto
        .split(/[\r\n]+/)
        .map(l => l.trim())
        .filter(l => l && !l.startsWith('/') && !l.includes('Marcar como lido') && !l.includes('Favoritar') && !l.includes('Adicionar aos cadernos'));

      if (linhas.length < 3) continue;

      // Linha 0: Origem: STF ou STJ (pode ter Informativo)
      const origemMatch = linhas[0].match(/Origem:\s*(STF|STJ)(?:\s*[-–]\s*Informativo:\s*(\d+))?/i);
      if (!origemMatch) continue;

      const tribunal = origemMatch[1].toUpperCase();
      const informativo = origemMatch[2] || null;

      // Linha 1: Súmula XXX-STF/STJ
      const sumulaMatch = linhas[1].match(/Súmula\s*(\d+)[-–](STF|STJ)/i);
      if (!sumulaMatch) continue;

      const numero = sumulaMatch[1];

      // Linha 2: Área (Súmulas do STF e STJ por assunto > ...)
      let areaIdx = linhas.findIndex((l, i) => i > 0 && l.startsWith('Súmulas do STF'));
      let area = '';
      if (areaIdx >= 0) {
        // Extrair apenas a parte relevante após "por assunto >"
        const areaMatch = linhas[areaIdx].match(/por assunto\s*>\s*(.+)/i);
        if (areaMatch) area = areaMatch[1].replace(/\s*>\s*/g, ' > ').trim();
      }

      // Próxima linha após área: texto da súmula
      const textoIdx = areaIdx >= 0 ? areaIdx + 1 : 2;
      let textoSumula = linhas[textoIdx] || '';

      // Extrair status (Válida/Superada) e data de aprovação
      let status = 'Válida';
      let dataAprovacao = '';

      // Padrão: "Súmula XXX: texto. • Aprovada em DD/MM/AAAA... • Válida/Superada."
      const statusMatch = textoSumula.match(/[•\?]\s*(Válida|Superada)\.?\s*$/i);
      if (statusMatch) {
        status = statusMatch[1].charAt(0).toUpperCase() + statusMatch[1].slice(1).toLowerCase();
      }

      // Data de aprovação
      const dataMatch = textoSumula.match(/Aprovada\s*em\s*(\d{1,2}\/\d{2}\/\d{4})/i);
      if (dataMatch) dataAprovacao = dataMatch[1];

      // Limpar o texto da súmula (remover metadados)
      let enunciado = textoSumula
        .replace(/Súmula\s*\d+[-–](?:STF|STJ):\s*/i, '') // Remove "Súmula XXX-STF: "
        .replace(/[•\?]\s*Aprovada\s*em\s*[\d\/]+[^•\?]*/gi, '') // Remove data aprovação
        .replace(/[•\?]\s*(?:Válida|Superada)\.?\s*/gi, '') // Remove status
        .replace(/,?\s*DJ[eE]?\s*[\d\/]+\.?/gi, '') // Remove DJe
        .trim();

      // Se o enunciado ainda contém "Súmula", extrair apenas o texto após ":"
      const enunciadoMatch = enunciado.match(/Súmula\s*\d+[-–](?:STF|STJ):\s*(.+)/i);
      if (enunciadoMatch) {
        enunciado = enunciadoMatch[1].trim();
      }

      // Limpar pontuação final duplicada
      enunciado = enunciado.replace(/\.+$/, '.').trim();

      // Keywords
      const keywords = extrairKeywords(enunciado + ' ' + area);

      const sumula = {
        id: `sumula-${tribunal.toLowerCase()}-${numero}`,
        tribunal,
        tipoProcesso: 'Súmula',
        numero: parseInt(numero),
        enunciado,
        status,
        ...(dataAprovacao && { dataAprovacao }),
        ...(informativo && { informativo }),
        ...(area && { area }),
        keywords
      };

      sumulas.push(sumula);
      id++;

    } catch (err) {
      console.error('Erro ao processar bloco:', err.message);
    }
  }

  // Ordenar por tribunal e número
  sumulas.sort((a, b) => {
    if (a.tribunal !== b.tribunal) return a.tribunal.localeCompare(b.tribunal);
    return a.numero - b.numero;
  });

  // Estatísticas
  const stats = {
    total: sumulas.length,
    stf: sumulas.filter(s => s.tribunal === 'STF').length,
    stj: sumulas.filter(s => s.tribunal === 'STJ').length,
    validas: sumulas.filter(s => s.status === 'Válida').length,
    superadas: sumulas.filter(s => s.status === 'Superada').length
  };

  console.log('\n=== Conversão Concluída ===');
  console.log(`Total: ${stats.total} súmulas`);
  console.log(`STF: ${stats.stf} | STJ: ${stats.stj}`);
  console.log(`Válidas: ${stats.validas} | Superadas: ${stats.superadas}`);

  // Salvar JSON
  fs.writeFileSync(outputPath, JSON.stringify(sumulas, null, 2), 'utf8');
  console.log(`\nArquivo salvo: ${outputPath}`);
  console.log(`Tamanho: ${(fs.statSync(outputPath).size / 1024).toFixed(1)} KB`);

  // Exemplo
  if (sumulas.length > 0) {
    console.log('\n=== Exemplo (primeira súmula) ===');
    console.log(JSON.stringify(sumulas[0], null, 2));

    // Mostrar uma superada
    const superada = sumulas.find(s => s.status === 'Superada');
    if (superada) {
      console.log('\n=== Exemplo (súmula superada) ===');
      console.log(JSON.stringify(superada, null, 2));
    }
  }
}

function extrairKeywords(texto) {
  const palavrasChave = new Set();

  const termos = [
    'terceirização', 'trabalhista', 'CLT', 'empregado', 'empregador',
    'rescisão', 'contrato', 'jornada', 'hora extra', 'adicional',
    'férias', 'aviso prévio', 'FGTS', 'verbas', 'indenização',
    'dano moral', 'responsabilidade', 'subsidiária', 'solidária',
    'grupo econômico', 'execução', 'prescrição', 'competência',
    'justiça do trabalho', 'sindicato', 'negociação coletiva',
    'acordo coletivo', 'convenção coletiva', 'greve',
    'estabilidade', 'gestante', 'acidente', 'doença',
    'aposentadoria', 'previdência', 'contribuição', 'INSS',
    'servidor público', 'estatutário', 'celetista',
    'motorista', 'professor', 'doméstico', 'rural',
    'honorários', 'custas', 'recurso', 'embargos'
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

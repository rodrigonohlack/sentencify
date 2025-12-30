#!/usr/bin/env node
/**
 * Converte o DOCX para JSON usando mammoth
 * Formato de saída: stf-stj-precedentes.json
 */

const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');

const docxPath = path.join(__dirname, 'Buscador DOD STF e STJ.docx');
const outputPath = path.join(__dirname, 'stf-stj-precedentes.json');

async function main() {
  console.log('Extraindo texto do DOCX...');

  // Extrair texto do DOCX
  const result = await mammoth.extractRawText({ path: docxPath });
  const content = result.value;

  console.log(`Texto extraído: ${(content.length / 1024).toFixed(1)} KB`);

  // Salvar texto para debug
  fs.writeFileSync(path.join(__dirname, 'temp_mammoth.txt'), content, 'utf8');

  // Dividir por "Origem:" que marca início de cada decisão
  const blocos = content.split(/(?=Origem:\s*(?:STF|STJ))/gi).filter(b => b.trim());

  console.log(`Blocos encontrados: ${blocos.length}`);

  const precedentes = [];
  let id = 1;

  for (const bloco of blocos) {
    try {
      const texto = bloco.trim();

      // Ignorar blocos que não começam com Origem
      if (!texto.toLowerCase().startsWith('origem:')) continue;

      // Separar por quebras de linha ou parágrafos
      // O Word pode usar \r\n, \n, ou \r
      const linhas = texto
        .split(/[\r\n]+/)
        .map(l => l.trim())
        .filter(l => l && !l.startsWith('/') && !l.includes('Marcar como lido') && !l.includes('Favoritar') && !l.includes('Adicionar aos cadernos'));

      if (linhas.length < 3) continue;

      // Linha 0: Origem: STF - Informativo: XXX
      const origemMatch = linhas[0].match(/Origem:\s*(STF|STJ)\s*[-–]\s*Informativo:\s*(\d+)/i);
      if (!origemMatch) continue;

      const tribunal = origemMatch[1].toUpperCase();
      const informativo = origemMatch[2];

      // Linha 1: Título
      const titulo = linhas[1] || '';

      // Linha 2: Área (começa com "Direito")
      let areaIdx = linhas.findIndex((l, i) => i > 0 && l.startsWith('Direito'));
      const area = areaIdx >= 0 ? linhas[areaIdx].replace(/\s*>\s*/g, ' > ') : '';

      // Tese: entre área e referência
      let teseLinhas = [];
      let referencia = '';
      let referenciaIdx = -1;

      // Encontrar referência (STF. Plenário... ou STJ. ...)
      for (let i = areaIdx + 1; i < linhas.length; i++) {
        if (/^(STF|STJ)\.\s*(Plenário|Pleno|1ª|2ª|Turma|Seção|Corte)/i.test(linhas[i])) {
          referenciaIdx = i;
          referencia = linhas[i];
          break;
        }
      }

      // Tese é tudo entre área e fim (a referência pode estar dentro do texto)
      if (areaIdx >= 0) {
        teseLinhas = linhas.slice(areaIdx + 1);
      }

      let teseCompleta = teseLinhas.join('\n').trim();

      // A referência geralmente está no final do texto: "STF. Plenário. XXX..."
      const refMatch = teseCompleta.match(/(STF|STJ)\.\s*(Plenário|Pleno|1ª|2ª|Turma|Seção|Corte)[^.]*\.\s*(?:ADPF|ADI|ADC|ARE|RE|Rcl|CC|AREsp|REsp|HC|MS|AgR|ED|AgInt|EDcl|RMS|RHC|Pet|AI|MI|AC|IF|INQ|STP|SS|SL)[\s\d./-]+.*?(?:Info\s*\d+|Informativo\s*\d+|\d{4})\)?\.?$/i);

      if (refMatch) {
        referencia = refMatch[0].trim();
        teseCompleta = teseCompleta.replace(referencia, '').trim();
      }

      const tese = teseCompleta;

      // Extrair dados da referência
      let numeroProcesso = '';
      let relator = '';
      let dataJulgamento = '';
      let orgaoJulgador = '';
      let tipoProcesso = '';
      let tema = '';

      if (referencia) {
        // Tipo de processo
        const tipoMatch = referencia.match(/(ADPF|ADI|ADC|ARE|RE|Rcl|CC|AREsp|REsp|HC|MS|AgR|ED|AgInt|EDcl|RMS|RHC|Pet|AI|MI|AC|IF|INQ|STP|SS|SL)\s*[\d.]+/i);
        if (tipoMatch) {
          tipoProcesso = tipoMatch[1].toUpperCase();
          const numMatch = referencia.match(new RegExp(tipoMatch[1] + '\\s*([\\d./-]+)', 'i'));
          if (numMatch) numeroProcesso = numMatch[1].replace(/[./]/g, '');
        }

        // Relator
        const relMatch = referencia.match(/Rel\.?\s*Min\.?\s*([^,]+)/i);
        if (relMatch) relator = relMatch[1].trim();

        // Data - captura "julgado em" ou "julgados em", inclusive ranges e "1º/8/2018"
        const dataMatch = referencia.match(/julgado[s]?\s*em\s*(?:\d{1,2}[º°]?\s*e\s*)?(\d{1,2})[º°]?\/(\d{1,2})\/(\d{4})/i);
        if (dataMatch) dataJulgamento = `${dataMatch[1]}/${dataMatch[2]}/${dataMatch[3]}`;

        // Órgão
        const orgaoMatch = referencia.match(/(Plenário|Pleno|1ª\s*Turma|2ª\s*Turma|1ª\s*Seção|2ª\s*Seção|Corte\s*Especial)/i);
        if (orgaoMatch) orgaoJulgador = orgaoMatch[1];

        // Tema de repercussão geral (pode ter ponto, ex: 1.232)
        const temaMatch = referencia.match(/Tema\s*([\d.]+)/i);
        if (temaMatch) tema = temaMatch[1].replace(/\./g, '');
      }

      // Determinar tipo para filtro
      let tipoFiltro = 'Decisão';
      if (tema) {
        tipoFiltro = 'RG'; // Repercussão Geral
      } else if (['ADI', 'ADC', 'ADPF'].includes(tipoProcesso)) {
        tipoFiltro = 'ADI/ADC/ADPF';
      } else if (tipoProcesso) {
        tipoFiltro = tipoProcesso;
      }

      // Keywords
      const keywords = extrairKeywords(titulo + ' ' + tese);

      // Criar precedente
      const precedente = {
        id: `${tribunal.toLowerCase()}-${id}`,
        tribunal,
        tipoProcesso: tipoFiltro,
        titulo: titulo.substring(0, 250),
        tese,
        ...(tema && { tema }),
        ...(numeroProcesso && { numeroProcesso }),
        ...(relator && { relator }),
        ...(orgaoJulgador && { orgaoJulgador }),
        ...(dataJulgamento && { dataJulgamento }),
        informativo,
        ...(area && { area }),
        ...(referencia && { referencia }),
        keywords
      };

      precedentes.push(precedente);
      id++;

    } catch (err) {
      console.error('Erro ao processar bloco:', err.message);
    }
  }

  // Estatísticas
  const stats = {
    total: precedentes.length,
    stf: precedentes.filter(p => p.tribunal === 'STF').length,
    stj: precedentes.filter(p => p.tribunal === 'STJ').length,
    comTema: precedentes.filter(p => p.tema).length,
    tipos: {}
  };

  precedentes.forEach(p => {
    stats.tipos[p.tipoProcesso] = (stats.tipos[p.tipoProcesso] || 0) + 1;
  });

  console.log('\n=== Conversão Concluída ===');
  console.log(`Total: ${stats.total} precedentes`);
  console.log(`STF: ${stats.stf} | STJ: ${stats.stj}`);
  console.log(`Com Repercussão Geral (Tema): ${stats.comTema}`);
  console.log('\nTipos de processo:');
  Object.entries(stats.tipos).sort((a,b) => b[1] - a[1]).forEach(([tipo, qtd]) => {
    console.log(`  ${tipo}: ${qtd}`);
  });

  // Salvar JSON
  fs.writeFileSync(outputPath, JSON.stringify(precedentes, null, 2), 'utf8');
  console.log(`\nArquivo salvo: ${outputPath}`);
  console.log(`Tamanho: ${(fs.statSync(outputPath).size / 1024).toFixed(1)} KB`);

  // Mostrar primeiro precedente como exemplo
  if (precedentes.length > 0) {
    console.log('\n=== Exemplo (primeiro precedente) ===');
    console.log(JSON.stringify(precedentes[0], null, 2));
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
    'constitucional', 'inconstitucional', 'repercussão geral',
    'súmula', 'precedente', 'vinculante', 'TST', 'STF', 'STJ',
    'administração pública', 'servidor', 'estatutário', 'celetista',
    'terceirizado', 'motorista', 'caminhoneiro', 'professor',
    'doméstico', 'rural', 'urbano', 'intermitente', 'parceria',
    'autônomo', 'cooperativa', 'franquia', 'ação civil pública',
    'MPT', 'ministério público', 'recurso', 'revista', 'embargo'
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

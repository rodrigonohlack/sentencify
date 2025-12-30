#!/usr/bin/env node
/**
 * Converte o DOCX de IRDR e IAC do TRT8 para JSON
 */

const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');

const docxPath = path.join(__dirname, 'irdr iac trt8.docx');
const outputPath = path.join(__dirname, 'irdr-iac-trt8.json');

async function main() {
  console.log('Extraindo texto do DOCX...');

  const result = await mammoth.extractRawText({ path: docxPath });
  const content = result.value;

  console.log(`Texto extraído: ${(content.length / 1024).toFixed(1)} KB`);

  // Dividir por "Precedente IRDR" ou "Precedente IAC"
  const blocos = content.split(/(?=Precedente\s+(?:IRDR|IAC)\s+n[º°]\s*\d+)/gi).filter(b => b.trim());

  console.log(`Blocos encontrados: ${blocos.length}`);

  const precedentes = [];

  for (const bloco of blocos) {
    try {
      const texto = bloco.trim();

      // Extrair tipo (IRDR ou IAC), número e título
      const headerMatch = texto.match(/Precedente\s+(IRDR|IAC)\s+n[º°]\s*(\d+):\s*([^\n]+)/i);
      if (!headerMatch) continue;

      const tipo = headerMatch[1].toUpperCase();
      const numero = parseInt(headerMatch[2]);
      const titulo = headerMatch[3].trim();

      // Extrair número do processo e tema (Acórdão pode ter caractere especial)
      const processoMatch = texto.match(/Inteiro\s+Teor\s+do\s+Acord[ãǜa]o:\s*(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})\s*\(TEMA\s*(\d+)\)/i);
      let numeroProcesso = '';
      let tema = '';
      if (processoMatch) {
        numeroProcesso = processoMatch[1];
        tema = processoMatch[2];
      }

      // Extrair tese (entre título e "Inteiro Teor")
      let tese = texto
        .replace(/Precedente\s+(?:IRDR|IAC)\s+n[º°]\s*\d+:\s*[^\n]+\n*/i, '') // Remove header
        .replace(/Inteiro\s+Teor\s+do\s+Acord[ãǜa]o:[^\n]*/gi, '') // Remove inteiro teor
        .trim();

      // Limpar quebras de linha extras
      tese = tese
        .split(/\n+/)
        .map(l => l.trim())
        .filter(l => l)
        .join('\n\n');

      // Keywords
      const keywords = extrairKeywords(titulo + ' ' + tese);

      const precedente = {
        id: `${tipo.toLowerCase()}-trt8-${numero}`,
        tribunal: 'TRT8',
        tipoProcesso: tipo,
        numero,
        titulo,
        tese,
        ...(tema && { tema }),
        ...(numeroProcesso && { numeroProcesso }),
        keywords
      };

      precedentes.push(precedente);

    } catch (err) {
      console.error('Erro ao processar bloco:', err.message);
    }
  }

  // Ordenar por tipo e número
  precedentes.sort((a, b) => {
    if (a.tipoProcesso !== b.tipoProcesso) {
      return a.tipoProcesso.localeCompare(b.tipoProcesso);
    }
    return a.numero - b.numero;
  });

  // Estatísticas
  const stats = {
    total: precedentes.length,
    irdr: precedentes.filter(p => p.tipoProcesso === 'IRDR').length,
    iac: precedentes.filter(p => p.tipoProcesso === 'IAC').length
  };

  console.log('\n=== Conversão Concluída ===');
  console.log(`Total: ${stats.total} precedentes`);
  console.log(`IRDR: ${stats.irdr} | IAC: ${stats.iac}`);

  // Salvar JSON
  fs.writeFileSync(outputPath, JSON.stringify(precedentes, null, 2), 'utf8');
  console.log(`\nArquivo salvo: ${outputPath}`);
  console.log(`Tamanho: ${(fs.statSync(outputPath).size / 1024).toFixed(1)} KB`);

  // Exemplos
  if (precedentes.length > 0) {
    const irdr = precedentes.find(p => p.tipoProcesso === 'IRDR');
    const iac = precedentes.find(p => p.tipoProcesso === 'IAC');

    if (irdr) {
      console.log('\n=== Exemplo (IRDR) ===');
      console.log(JSON.stringify({ ...irdr, tese: irdr.tese.substring(0, 150) + '...' }, null, 2));
    }

    if (iac) {
      console.log('\n=== Exemplo (IAC) ===');
      console.log(JSON.stringify({ ...iac, tese: iac.tese.substring(0, 150) + '...' }, null, 2));
    }
  }
}

function extrairKeywords(texto) {
  const palavrasChave = new Set();

  const termos = [
    'contribuição', 'sindical', 'previdenciária', 'INSS', 'FGTS',
    'terceirização', 'trabalhista', 'CLT', 'empregado', 'empregador',
    'rescisão', 'contrato', 'jornada', 'hora extra', 'adicional',
    'férias', 'aviso prévio', 'verbas', 'indenização', 'dano',
    'responsabilidade', 'subsidiária', 'solidária', 'execução',
    'prescrição', 'competência', 'recurso', 'embargos', 'penhora',
    'insalubridade', 'periculosidade', 'equiparação', 'isonomia',
    'honorários', 'sucumbência', 'gratificação', 'incorporação',
    'Fazenda Pública', 'precatório', 'sociedade de economia mista',
    'banco', 'motocicleta', 'rural', 'COVID', 'geolocalização'
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

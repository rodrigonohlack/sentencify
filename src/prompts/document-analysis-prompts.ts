// ═══════════════════════════════════════════════════════════════════════════════
// 📝 PROMPTS DE ANÁLISE DE DOCUMENTOS
// Extraído de useDocumentAnalysis.ts em v1.37.36
// ═══════════════════════════════════════════════════════════════════════════════

import { AI_PROMPTS } from './ai-prompts';
import type { AISettings } from '../types';

/**
 * Constrói o prompt para análise inicial de documentos (petição + contestações)
 *
 * @param totalContestacoes - Número de contestações fornecidas
 * @param totalComplementares - Número de documentos complementares
 * @param aiSettings - Configurações de IA do usuário
 * @returns Prompt formatado para enviar à IA
 */
export function buildAnalysisPrompt(
  totalContestacoes: number,
  totalComplementares: number,
  aiSettings: AISettings
): string {
  return `Analise a petição inicial ${totalContestacoes > 0 ? `e as ${totalContestacoes} contestação${totalContestacoes > 1 ? 'ões' : ''} fornecida${totalContestacoes > 1 ? 's' : ''}` : '(não há contestação fornecida)'}.

TÓPICO OBRIGATÓRIO "RELATÓRIO":
Você DEVE criar um tópico especial chamado "RELATÓRIO" (categoria PRELIMINAR) que descreva o histórico processual.
${totalComplementares > 0 ? `Há ${totalComplementares} documento${totalComplementares > 1 ? 's' : ''} complementar${totalComplementares > 1 ? 'es' : ''} disponível${totalComplementares > 1 ? 'eis' : ''} (atas, provas, documentos adicionais) que devem ser usados APENAS neste tópico RELATÓRIO.` : 'Como não há documentos complementares, baseie o relatório apenas nas informações da petição inicial e contestações sobre o andamento do processo.'}

Extraia e classifique todos os tópicos/pedidos em:

1. QUESTÕES PROCESSUAIS (impugnação aos cálculos, regularidade de representação processual, impugnação aos documentos, gratuidade de justiça, etc.)
2. PRELIMINARES (prescrição, inépcia, ilegitimidade, incompetência, litispendência, coisa julgada, etc.)
3. PREJUDICIAIS (questões que impedem análise do mérito - prescrição bienal, prescrição quinquenal, etc.)
4. MÉRITO (pedidos principais - verbas rescisórias, horas extras, danos morais, vínculo empregatício, grupo econômico, etc.)

Para cada tópico, crie um mini-relatório em formato NARRATIVO, seguindo EXATAMENTE este modelo com PARÁGRAFOS SEPARADOS:

${aiSettings.modeloRelatorio ? `
MODELO PERSONALIZADO DO USUÁRIO:
${aiSettings.modeloRelatorio}

Use este modelo como referência, mas mantenha a estrutura de parágrafos separados.
` : `
MODELO PADRÃO:
PRIMEIRO PARÁGRAFO (alegações do autor):
"O reclamante narra [resumo dos fatos]. Sustenta [argumentos]. Indica que [situação]. Em decorrência, postula [pedido específico]."

SEGUNDO PARÁGRAFO (primeira defesa):
${totalContestacoes > 0 ? '"A primeira reclamada, em defesa, alega [argumentos]. Sustenta que [posição]."' : '"Não houve apresentação de contestação."'}

${totalContestacoes > 1 ? 'TERCEIRO PARÁGRAFO (segunda defesa):\n"A segunda ré, por sua vez, nega [posição]. Aduz [argumentos]."' : ''}

${totalContestacoes > 2 ? 'QUARTO PARÁGRAFO (terceira defesa):\n"A terceira reclamada também contesta [argumentos]. Sustenta [posição]."' : ''}
`}

TÓPICO ESPECIAL "RELATÓRIO" (OBRIGATÓRIO):
O tópico "RELATÓRIO" deve resumir o histórico processual:
${totalComplementares > 0 ?
`"A presente reclamação foi distribuída em [data se constar]. Realizou-se audiência em [data], na qual [ocorrências]. Foram juntados aos autos [documentos]. As partes apresentaram [manifestações]. O processo encontra-se [situação atual]."`
:
`"A presente reclamação foi ajuizada em [data se constar]. ${totalContestacoes > 0 ? 'Foram apresentadas contestações.' : 'Não houve apresentação de contestação.'} ${totalContestacoes > 0 ? 'As partes manifestaram-se nos autos.' : ''} O processo encontra-se em fase de sentença."`
}

${AI_PROMPTS.formatacaoParagrafos("<p>O reclamante narra...</p><p>A primeira reclamada, em defesa...</p>")}

${aiSettings.detailedMiniReports ? `NÍVEL DE DETALHE - FATOS:
Gere com alto nível de detalhe em relação aos FATOS alegados pelas partes.
A descrição fática (postulatória e defensiva) deve ter alto nível de detalhe.
` : ''}

ESTRUTURA DOS PARÁGRAFOS:
- PRIMEIRO PARÁGRAFO (<p>): apenas alegações do reclamante
- PARÁGRAFOS SEGUINTES (<p>): uma defesa por parágrafo
- Use "O reclamante narra...", "Sustenta...", "Postula..."
- Para defesas use: "A primeira reclamada, em defesa...", "A segunda ré, por sua vez...", "A terceira reclamada..."
- O tópico "RELATÓRIO" é OBRIGATÓRIO e deve sempre ser o primeiro da lista
${totalComplementares > 0 ? '- Documentos complementares devem ser usados APENAS no tópico "RELATÓRIO"' : '- Como não há documentos complementares, o RELATÓRIO deve ser baseado apenas em petição e contestações'}

${AI_PROMPTS.numeracaoReclamadasInicial}

IDENTIFICAÇÃO DAS PARTES:
Extraia também os nomes das partes do processo:
- Nome completo do RECLAMANTE (autor da ação)
- Nomes completos de todas as RECLAMADAS (rés)

FORMATO DO TÍTULO DOS TÓPICOS (v1.32.23):
Use o formato "PEDIDO - CAUSA DE PEDIR" quando a causa de pedir for específica e distintiva.
Exemplos com causa específica:
- RESCISÃO INDIRETA - ASSÉDIO MORAL (não apenas "RESCISÃO INDIRETA")
- ADICIONAL DE PERICULOSIDADE - ELETRICIDADE (não apenas "ADICIONAL DE PERICULOSIDADE")
- HORAS EXTRAS - NULIDADE DOS CARTÕES DE PONTO
- DANO MORAL - ACIDENTE DE TRABALHO
- VÍNCULO EMPREGATÍCIO - FRAUDE À CLT (PJ)
Exemplos que NÃO precisam de complemento (causa óbvia ou única):
- FÉRIAS, DÉCIMO TERCEIRO SALÁRIO (verbas simples)
- INÉPCIA DA INICIAL, GRATUIDADE DE JUSTIÇA (preliminares genéricas)

Responda APENAS com um JSON válido, sem markdown, no seguinte formato:
{
  "partes": {
    "reclamante": "Nome completo do reclamante",
    "reclamadas": ["Nome da primeira reclamada", "Nome da segunda reclamada"]
  },
  "topics": [
    {
      "title": "PEDIDO - CAUSA ESPECÍFICA (quando relevante)",
      "category": "QUESTÃO PROCESSUAL | PRELIMINAR | PREJUDICIAL | MÉRITO"
    }
  ]
}

IMPORTANTE: Retorne APENAS título e categoria de cada tópico. NÃO inclua o campo "relatório" - os mini-relatórios serão gerados separadamente para cada tópico.`;
}

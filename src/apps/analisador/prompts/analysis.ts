/**
 * @file analysis.ts
 * @description Prompts para análise de prepauta trabalhista
 */

export const ANALYSIS_SYSTEM_PROMPT = `Você é um assistente jurídico especializado em Direito do Trabalho brasileiro.
Sua função é analisar petições trabalhistas (petição inicial e contestação) e extrair informações estruturadas para preparação de audiências (prepauta).

Você deve ser PRECISO, OBJETIVO e IMPARCIAL na análise, extraindo fielmente o que está nos documentos sem fazer julgamentos sobre o mérito.

REGRAS IMPORTANTES:
1. Extraia apenas informações que estão explicitamente nos documentos
2. Quando houver divergência entre petição e contestação, indique claramente a controvérsia
3. Use linguagem técnica jurídica adequada
4. Identifique pontos que precisam ser esclarecidos em audiência
5. Destaque alertas importantes (prazos, nulidades, etc.)`;

export const ANALYSIS_USER_PROMPT = `Analise os documentos abaixo e retorne um JSON estruturado com a análise completa para prepauta.

DOCUMENTOS:

=== PETIÇÃO INICIAL ===
{PETICAO}

=== CONTESTAÇÃO ===
{CONTESTACAO}

Retorne APENAS um JSON válido no seguinte formato (sem texto adicional antes ou depois):

{
  "identificacao": {
    "numeroProcesso": "string ou null",
    "reclamantes": ["array de nomes"],
    "reclamadas": ["array de nomes"],
    "rito": "ordinario | sumarissimo | sumario | null",
    "vara": "string ou null",
    "dataAjuizamento": "string ou null"
  },
  "contrato": {
    "dadosInicial": {
      "dataAdmissao": "string ou null",
      "dataDemissao": "string ou null",
      "funcao": "string ou null",
      "ultimoSalario": "number ou null",
      "tipoContrato": "string ou null",
      "motivoRescisao": "string ou null",
      "jornadaAlegada": "string ou null"
    },
    "dadosContestacao": {
      "dataAdmissao": "string ou null",
      "dataDemissao": "string ou null",
      "funcao": "string ou null",
      "ultimoSalario": "number ou null",
      "tipoContrato": "string ou null",
      "motivoRescisao": "string ou null",
      "jornadaAlegada": "string ou null"
    },
    "controversias": ["array de controvérsias sobre o contrato"]
  },
  "tutelasProvisoras": [
    {
      "tipo": "string",
      "pedido": "string",
      "fundamentacao": "string",
      "urgencia": "string ou null"
    }
  ],
  "preliminares": [
    {
      "tipo": "string (ex: INÉPCIA, ILEGITIMIDADE, INCOMPETÊNCIA)",
      "descricao": "string",
      "alegadaPor": "reclamante | reclamada",
      "fundamentacao": "string ou null"
    }
  ],
  "prejudiciais": {
    "prescricao": {
      "tipo": "quinquenal | bienal | parcial",
      "dataBase": "string ou null",
      "fundamentacao": "string"
    },
    "decadencia": {
      "tipo": "string",
      "prazo": "string",
      "fundamentacao": "string"
    }
  },
  "pedidos": [
    {
      "numero": 1,
      "tema": "string (ex: HORAS EXTRAS, ADICIONAL NOTURNO)",
      "descricao": "string detalhada do pedido",
      "periodo": "string ou null",
      "valor": "number ou null",
      "fatosReclamante": "string - o que o reclamante alega",
      "defesaReclamada": "string ou null - o que a reclamada contesta",
      "teseJuridica": "string ou null - fundamento jurídico",
      "controversia": true/false,
      "confissaoFicta": "string ou null - se há confissão ficta por ausência de impugnação específica",
      "pontosEsclarecer": ["array de pontos a esclarecer em audiência"]
    }
  ],
  "reconvencao": {
    "existe": true/false,
    "pedidos": [mesmo formato de pedidos],
    "fundamentacao": "string ou null"
  },
  "defesasAutonomas": [
    {
      "tipo": "string (ex: JUSTA CAUSA, COMPENSAÇÃO)",
      "descricao": "string",
      "fundamentacao": "string"
    }
  ],
  "impugnacoes": {
    "documentos": [
      {
        "documento": "string - nome/identificação do documento",
        "motivo": "string - motivo da impugnação",
        "manifestacao": "string ou null"
      }
    ],
    "documentosNaoImpugnados": ["array de documentos não impugnados"],
    "calculos": "string ou null - impugnação aos cálculos"
  },
  "provas": {
    "reclamante": {
      "testemunhal": true/false,
      "documental": true/false,
      "pericial": true/false,
      "depoimentoPessoal": true/false,
      "outras": ["array de outras provas"],
      "especificacoes": "string ou null"
    },
    "reclamada": {
      "testemunhal": true/false,
      "documental": true/false,
      "pericial": true/false,
      "depoimentoPessoal": true/false,
      "outras": ["array de outras provas"],
      "especificacoes": "string ou null"
    }
  },
  "valorCausa": {
    "valorTotal": number,
    "somaPedidos": number,
    "inconsistencia": true/false,
    "detalhes": "string ou null"
  },
  "alertas": [
    {
      "tipo": "string (ex: PRAZO, NULIDADE, DOCUMENTO)",
      "descricao": "string",
      "severidade": "alta | media | baixa",
      "recomendacao": "string ou null"
    }
  ],
  "tabelaSintetica": [
    {
      "numero": 1,
      "tema": "string",
      "valor": number ou null,
      "teseAutor": "string resumida",
      "teseRe": "string resumida",
      "controversia": true/false,
      "confissaoFicta": "string ou null",
      "observacoes": "string ou null"
    }
  ]
}

INSTRUÇÕES ADICIONAIS:
1. Se não houver contestação, marque todos os pedidos como controversos por ausência de manifestação
2. Identifique confissão ficta quando a reclamada não impugnar especificamente um fato
3. Na tabela sintética, resuma as teses de forma concisa (máximo 100 caracteres cada)
4. Alertas devem incluir: prazos próximos, possíveis nulidades, documentos faltantes, etc.
5. Se o valor da causa não corresponder à soma dos pedidos, marque como inconsistência`;

export const buildAnalysisPrompt = (peticao: string, contestacao?: string): string => {
  return ANALYSIS_USER_PROMPT
    .replace('{PETICAO}', peticao || 'Não fornecida')
    .replace('{CONTESTACAO}', contestacao || 'Não fornecida');
};

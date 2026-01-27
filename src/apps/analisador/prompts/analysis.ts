/**
 * @file analysis.ts
 * @description Prompts para análise de prepauta trabalhista
 * Suporta múltiplas emendas à petição inicial e múltiplas contestações
 */

export const ANALYSIS_SYSTEM_PROMPT = `Você é um assistente jurídico especializado em Direito do Trabalho brasileiro.
Sua função é analisar petições trabalhistas (petição inicial, emendas e contestações) e extrair informações estruturadas para preparação de audiências (prepauta).

Você deve ser PRECISO, OBJETIVO e IMPARCIAL na análise, extraindo fielmente o que está nos documentos sem fazer julgamentos sobre o mérito.

REGRAS IMPORTANTES:
1. Extraia apenas informações que estão explicitamente nos documentos
2. Quando houver divergência entre petição/emendas e contestações, indique claramente a controvérsia
3. Use linguagem técnica jurídica adequada
4. Identifique pontos que precisam ser esclarecidos em audiência
5. Destaque alertas importantes (prazos, nulidades, etc.)
6. Considere que emendas modificam ou complementam a petição inicial
7. Em caso de múltiplas contestações (vários réus), identifique as defesas de cada um`;

export const ANALYSIS_USER_PROMPT = `Analise os documentos abaixo e retorne um JSON estruturado com a análise completa para prepauta.

DOCUMENTOS:

=== PETIÇÃO INICIAL ===
{PETICAO}

=== EMENDAS À PETIÇÃO INICIAL ===
{EMENDAS}

=== CONTESTAÇÕES ===
{CONTESTACOES}

Retorne APENAS um JSON válido no seguinte formato (sem texto adicional antes ou depois):

{
  "identificacao": {
    "numeroProcesso": "string ou null",
    "reclamantes": ["array de nomes"],
    "reclamadas": ["array de nomes"],
    "temEntePublico": true/false,
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
      "descricao": "string DETALHADA do pedido conforme petição",
      "tipoPedido": "principal | subsidiario | alternativo | sucessivo",
      "pedidoPrincipalNumero": "number ou null - se for subsidiário/alternativo/sucessivo, indica o número do pedido principal relacionado",
      "condicao": "string ou null - condição para aplicação do pedido (ex: 'caso não seja reconhecido o turno ininterrupto de revezamento')",
      "periodo": "string ou null",
      "valor": "number ou null",
      "fatosReclamante": "string COMPLETA com TODOS os argumentos, valores, horários, datas e fundamentos alegados pelo reclamante - transcreva fielmente sem resumir",
      "defesaReclamada": "string COMPLETA com TODOS os argumentos da defesa, incluindo teses numeradas, citações de normas coletivas, jurisprudência citada - transcreva fielmente sem resumir. Se não houver contestação: 'Não houve contestação (Ausência de manifestação)'",
      "teseJuridica": "string ou null - fundamento jurídico principal",
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
      "tipoPedido": "principal | subsidiario | alternativo | sucessivo",
      "pedidoPrincipalNumero": "number ou null",
      "condicao": "string ou null",
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
3. IMPORTANTE: Nos campos 'fatosReclamante' e 'defesaReclamada' dos PEDIDOS, inclua TODOS os detalhes: valores específicos, horários, datas, argumentos numerados, citações de normas coletivas (ex: "cláusula 30ª do ACT"), jurisprudência citada. NÃO RESUMA.
4. APENAS na tabela sintética ('tabelaSintetica'), resuma as teses de forma concisa (máximo 100 caracteres cada)
5. Alertas devem incluir: prazos próximos, possíveis nulidades, documentos faltantes, etc.
6. Se o valor da causa não corresponder à soma dos pedidos, marque como inconsistência
7. Considere que emendas podem adicionar pedidos, modificar valores ou corrigir informações da petição inicial
8. Em caso de múltiplas contestações, consolide as defesas indicando qual réu apresentou cada uma
9. temEntePublico: marque TRUE se alguma reclamada for ente da administração pública direta (União, Estados, Municípios, Prefeituras) ou indireta (autarquias, fundações públicas, empresas públicas, sociedades de economia mista)
10. PEDIDOS SUBSIDIÁRIOS/ALTERNATIVOS/SUCESSIVOS: Identifique TODOS os pedidos, incluindo:
    - Pedidos SUBSIDIÁRIOS: formulados para o caso de não acolhimento do pedido principal (ex: "subsidiariamente, caso não seja reconhecido X, requer Y")
    - Pedidos ALTERNATIVOS: o autor aceita qualquer um (ex: "alternativamente, requer X ou Y")
    - Pedidos SUCESSIVOS: dependem do acolhimento de outro pedido (ex: "caso acolhido o pedido de vínculo, requer verbas rescisórias")
    - Marque 'tipoPedido' adequadamente ('principal' se não especificado, ou 'subsidiario'/'alternativo'/'sucessivo')
    - Indique em 'pedidoPrincipalNumero' qual pedido este complementa
    - Em 'condicao', descreva a condição de aplicação (ex: "caso não reconhecido o turno ininterrupto de revezamento")
11. TUTELAS PROVISÓRIAS: Identifique e extraia TODOS os pedidos de tutela provisória, incluindo:
    - Tutela de URGÊNCIA (art. 300 CPC): pedidos de liminar, antecipação de tutela, reintegração imediata
    - Tutela de EVIDÊNCIA (art. 311 CPC): pedidos baseados em prova documental suficiente
    - Pedidos típicos: manutenção de plano de saúde, reintegração ao emprego, suspensão de ato, fornecimento de documentos
    - Em "tipo": use "Tutela de Urgência" ou "Tutela de Evidência"
    - Em "pedido": descreva o que está sendo pedido
    - Em "fundamentacao": cite os fundamentos legais apresentados
    - Em "urgencia": se houver, descreva o motivo da urgência alegado
12. RECONVENÇÃO: Identifique pedidos reconvencionais na contestação:
    - Marque "existe": true quando o réu formular pedidos contra o autor
    - Pedidos típicos: restituição de valores, compensação, devolução de equipamentos, indenização por danos
    - Em "pedidos": liste cada pedido reconvencional no mesmo formato dos pedidos principais
    - Em "fundamentacao": descreva os fundamentos da reconvenção`;

/**
 * Constrói o prompt de análise com os documentos
 * @param peticao Texto da petição inicial
 * @param emendas Array de textos das emendas
 * @param contestacoes Array de textos das contestações
 * @returns Prompt formatado para a IA
 */
export const buildAnalysisPrompt = (
  peticao: string,
  emendas: string[] = [],
  contestacoes: string[] = []
): string => {
  // Formatar seção de emendas
  const emendasSection = emendas.length > 0
    ? emendas.map((e, i) => `--- Emenda ${i + 1} ---\n${e}`).join('\n\n')
    : 'Não há emendas à petição inicial.';

  // Formatar seção de contestações
  const contestacoesSection = contestacoes.length > 0
    ? contestacoes.map((c, i) => `--- Contestação ${i + 1} ---\n${c}`).join('\n\n')
    : 'Não há contestação nos autos.';

  return ANALYSIS_USER_PROMPT
    .replace('{PETICAO}', peticao || 'Não fornecida')
    .replace('{EMENDAS}', emendasSection)
    .replace('{CONTESTACOES}', contestacoesSection);
};

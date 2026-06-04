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
Arquivo: {PETICAO_NOME}
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
      "descricao": "string DETALHADA do pedido conforme a PETIÇÃO INICIAL (e emendas). Os pedidos correspondem às pretensões formuladas pelo RECLAMANTE na inicial; a contestação alimenta 'defesaReclamada', não cria pedido (salvo reconvenção, ver instrução 12).",
      "tipoPedido": "principal | subsidiario | alternativo | sucessivo",
      "pedidoPrincipalNumero": "number ou null - se for subsidiário/alternativo/sucessivo, indica o número do pedido principal relacionado",
      "condicao": "string ou null - condição para aplicação do pedido (ex: 'caso não seja reconhecido o turno ininterrupto de revezamento')",
      "periodo": "string ou null",
      "valor": "number ou null",
      "fatosReclamante": "string descritiva e densa (tipicamente 5-12 frases) com a tese do reclamante para este pedido específico. Inclua: datas concretas (admissão, demissão, mudanças de função), valores monetários citados (salário, parcelas, percentuais), dinâmica do trabalho relevante ao pedido (função real exercida, maquinário, ambiente físico, frequência da exposição/jornada), distinções temporais quando o histórico contratual envolver mudança de função/posto, dispositivos legais e súmulas explicitamente invocados (art. da CLT, NR, súmula do TST, cláusula de ACT/CCT). Use voz indireta no estilo 'O reclamante afirma que...', 'Alega que...', 'Sustenta que...'.",
      "defesaReclamada": "string descritiva e densa (tipicamente 5-12 frases) com a tese da reclamada para este pedido específico, no mesmo nível de detalhe de fatosReclamante. Inclua: identificação da reclamada quando houver múltiplas (1ª Ré, 2ª Ré), datas e valores que a defesa apresenta de forma distinta da inicial, contraponto factual ao que o reclamante alegou, dispositivos legais e súmulas invocados pela defesa, alegação de quitação/comprovação documental quando houver. Se não houver contestação: 'Não houve contestação (Ausência de manifestação)'",
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
      "tipo": "string (ex: PRAZO, NULIDADE, DOCUMENTO, DIVERGÊNCIA - PARCELA NÃO POSTULADA)",
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
3. DETALHAMENTO DOS PEDIDOS: 'fatosReclamante' e 'defesaReclamada' devem ser DENSOS — alcance prepauta-audiência, não índice. Para cada um, escreva 5-12 frases descrevendo a tese da parte para AQUELE pedido específico, com elementos concretos:
   - Datas relevantes (admissão, demissão, mudança de função, período da exposição)
   - Valores citados (salário, salário-base, parcelas, percentuais, multas)
   - Dinâmica concreta do trabalho (função real, maquinário utilizado, ambiente físico, frequência da exposição, organização da jornada)
   - Distinções temporais quando o contrato envolveu mudança de função/cargo (ex: "como auxiliar de serviços gerais de X a Y, depois promovido a eletricista a partir de Z")
   - Dispositivos legais e súmulas invocados explicitamente (art. da CLT, NR, súmula do TST, cláusula de ACT/CCT)
   - Quando houver múltiplas reclamadas, identifique qual delas apresenta cada argumento (1ª Ré, 2ª Ré)
   - Use voz indireta ("Afirma que...", "Sustenta que...", "Impugna alegando que...")
   Pense em texto que um juiz pode ler antes da audiência e já entender a controvérsia sem precisar consultar a inicial ou a contestação.
4. RESUMOS APENAS NA TABELA: somente em 'tabelaSintetica' as teses devem ser comprimidas (~100 caracteres por campo)
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
    - Em "fundamentacao": descreva os fundamentos da reconvenção
13. NÚMERO DO PROCESSO: Se não encontrar o número do processo no texto do documento,
    verifique o NOME DO ARQUIVO (campo "Arquivo:") - frequentemente contém o número no formato CNJ
    (ex: "0001234-56.2024.5.01.0001 - Petição.pdf")
14. FONTE DOS PEDIDOS (REGRA OBRIGATÓRIA): um 'pedido' é uma parcela que o RECLAMANTE efetivamente REQUER na inicial — NÃO o que o corpo apenas argumenta, NÃO o que a defesa enfrenta. Fonte do que o autor pede: a PLANILHA DE PARCELAS LÍQUIDAS / cálculo discriminado QUANDO HOUVER (tabela ao final da inicial, pode ser imagem); NÃO HAVENDO planilha (é comum), use o rol de pedidos / dispositivo e as seções de causa de pedir que culminam em requerimento. A pergunta é sempre "o AUTOR requereu isto?", nunca "a defesa falou disto?". A contestação preenche 'defesaReclamada' dos pedidos existentes; só introduz pretensão própria via reconvenção (campo 'reconvencao', instrução 12).
CLASSIFIQUE ANTES DE NARRAR: antes de redigir os 'fatosReclamante' densos, liste (a) as parcelas que o autor requer e (b) as parcelas que as contestações enfrentam; decida pedido-vs-divergência de cada item de (b); só ENTÃO redija, apenas para os pedidos. Narrar primeiro arrasta o modelo a confabular pedidos a partir da defesa.
PRINCIPAL + REFLEXOS: agrupe cada parcela principal (horas extras, insalubridade, pausa NR-31, prêmio…) com seus reflexos (13º, aviso prévio, férias+1/3, multa 477, RSR) num único pedido. Reflexo NÃO é pedido autônomo — "aviso prévio"/"13º"/"multa 477" como reflexo NÃO significa que verbas rescisórias foram pedidas.
DIVERGÊNCIA + TRAVA ANTI-CONFABULAÇÃO: se a contestação enfrenta uma parcela que o autor NÃO requereu e que não é reconvenção, NÃO crie um pedido para ela e NÃO escreva 'fatosReclamante' para ela — confabular a pretensão do autor a partir da defesa induz análise de pedido inexistente e sentença extra petita (CPC 141/492). Em vez disso, registre um item em 'alertas' com "tipo": "DIVERGÊNCIA - PARCELA NÃO POSTULADA", "severidade": "media", "descricao" (qual parcela, qual contestação, por que diverge), "recomendacao" (verificar omissão na transcrição da inicial ou erro/excesso da contestação). Com múltiplas contestações, redobre a atenção: uma defesa pode ter sido copiada de outro processo.`;

/**
 * Flags indicando quais documentos foram enviados como PDF binário (anexo) em vez de texto.
 * Quando true, o conteúdo textual é substituído por um placeholder pois o PDF acompanha
 * a mensagem como anexo separado e o LLM o lê diretamente.
 */
export interface BinaryFlags {
  peticao?: boolean;
  emendas?: boolean[];
  contestacoes?: boolean[];
}

export const binaryPlaceholder = (nome: string): string =>
  `[Conteúdo do arquivo "${nome}" enviado como PDF anexado a esta mensagem — leia o documento diretamente.]`;

/**
 * Constrói o prompt de análise com os documentos
 * @param peticao Texto da petição inicial
 * @param emendas Array de textos das emendas
 * @param contestacoes Array de textos das contestações
 * @param nomeArquivoPeticao Nome do arquivo da petição inicial (opcional)
 * @param nomesArquivosEmendas Nomes dos arquivos das emendas (opcional)
 * @param nomesArquivosContestacoes Nomes dos arquivos das contestações (opcional)
 * @param binaryFlags Marcações de quais documentos foram enviados como anexo binário
 * @returns Prompt formatado para a IA
 */
export const buildAnalysisPrompt = (
  peticao: string,
  emendas: string[] = [],
  contestacoes: string[] = [],
  nomeArquivoPeticao?: string,
  nomesArquivosEmendas?: string[],
  nomesArquivosContestacoes?: string[],
  binaryFlags?: BinaryFlags
): string => {
  const peticaoBody = binaryFlags?.peticao
    ? binaryPlaceholder(nomeArquivoPeticao || 'petição inicial')
    : (peticao || 'Não fornecida');

  const emendasSection = emendas.length > 0
    ? emendas.map((e, i) => {
        const nome = nomesArquivosEmendas?.[i] || `Emenda ${i + 1}`;
        const body = binaryFlags?.emendas?.[i] ? binaryPlaceholder(nome) : e;
        return `--- ${nome} ---\n${body}`;
      }).join('\n\n')
    : 'Não há emendas à petição inicial.';

  const contestacoesSection = contestacoes.length > 0
    ? contestacoes.map((c, i) => {
        const nome = nomesArquivosContestacoes?.[i] || `Contestação ${i + 1}`;
        const body = binaryFlags?.contestacoes?.[i] ? binaryPlaceholder(nome) : c;
        return `--- ${nome} ---\n${body}`;
      }).join('\n\n')
    : 'Não há contestação nos autos.';

  return ANALYSIS_USER_PROMPT
    .replace('{PETICAO_NOME}', nomeArquivoPeticao || 'Não informado')
    .replace('{PETICAO}', peticaoBody)
    .replace('{EMENDAS}', emendasSection)
    .replace('{CONTESTACOES}', contestacoesSection);
};

/**
 * @file bulk-prompts.ts
 * @description Prompts para geração de modelos a partir de upload em lote
 * @version v1.37.28
 */

/**
 * Prompt para análise de documentos e extração de modelos jurídicos
 * @param textToAnalyze - Texto do documento a ser analisado
 * @param estiloRedacao - Estilo de redação do juiz (AI_PROMPTS.estiloRedacao)
 * @returns Prompt completo para a IA
 */
export const buildBulkAnalysisPrompt = (textToAnalyze: string, estiloRedacao: string): string => {
  return `Você é um assistente jurídico especializado em criar modelos de decisão trabalhista GENÉRICOS e REUTILIZÁVEIS.

TAREFA: Analise o documento jurídico fornecido e identifique TODOS os tópicos/assuntos jurídicos distintos que podem se tornar modelos de decisão completos.

\u26a0\ufe0f ATENÇÃO - REGRAS DE GENERALIZAÇÃO (MUITO IMPORTANTE):

1. **REMOVA informações específicas do caso concreto:**
   - \u274c NÃO use nomes de partes (ex: "João da Silva", "Empresa XYZ Ltda")
   - \u274c NÃO use valores monetários específicos (ex: "R$ 5.000,00")
   - \u274c NÃO use datas específicas (ex: "10/05/2023")
   - \u274c NÃO use números de processo
   - \u274c NÃO use endereços ou locais específicos

2. **USE termos genéricos:**
   - \u2705 "o reclamante", "a reclamada", "a empresa"
   - \u2705 "o valor devido", "o montante apurado"
   - \u2705 "o período trabalhado", "a data da rescisão"
   - \u2705 "os documentos apresentados", "as provas dos autos"

3. **FOQUE na fundamentação jurídica:**
   - Argumentação legal aplicável a casos similares
   - Análise de requisitos jurídicos genéricos
   - Raciocínio jurídico reproduzível
   - Conclusões adaptáveis a diferentes situações

4. **TRANSFORME em TEMPLATE:**
   - O modelo deve servir para QUALQUER caso do mesmo tipo
   - Um juiz deve poder copiar e adaptar facilmente
   - Evite referências muito específicas ao caso original

\ud83d\udea8 PRESERVAÇÃO LITERAL DO TEXTO (CRÍTICO - EXTREMAMENTE IMPORTANTE):

Esta é a regra MAIS IMPORTANTE de todas. Se você não seguir isso, o modelo será INÚTIL.

**O QUE VOCÊ DEVE FAZER:**
- Fazer APENAS substituições literais de informações específicas por termos genéricos
- Funcionar como "CTRL+F \u2192 SUBSTITUIR": encontrar nomes/valores/datas e trocar por genéricos
- PRESERVAR TODO O RESTO DO TEXTO EXATAMENTE COMO ESTÁ
- Manter a redação, estrutura de frases, argumentação, conectivos, tudo IDÊNTICO

**O QUE VOCÊ NÃO DEVE FAZER:**
- \u274c NÃO resuma o texto
- \u274c NÃO reescreva com suas próprias palavras
- \u274c NÃO simplifique a argumentação
- \u274c NÃO altere a estrutura das frases
- \u274c NÃO mude conectivos ou expressões jurídicas
- \u274c NÃO "melhore" ou "otimize" o texto original

**EXEMPLO DO QUE FAZER:**

\u274c ERRADO (resumindo/reescrevendo):
Texto original: "A pretensão autoral merece acolhimento. Com efeito, restou comprovado nos autos que o reclamante João da Silva laborou para a empresa Acme Ltda no período de 01/01/2020 a 31/12/2023, recebendo salário mensal de R$ 3.500,00. A jornada habitual era das 8h às 18h, com uma hora de intervalo, conforme cartões de ponto de fls. 45/89."

Modelo ERRADO: "A pretensão é procedente. Ficou demonstrado que houve relação de trabalho com jornada superior à legal."

\u2705 CORRETO (apenas substituindo dados específicos):
Modelo CORRETO: "A pretensão autoral merece acolhimento. Com efeito, restou comprovado nos autos que o reclamante laborou para a reclamada no período trabalhado, recebendo o salário mensal contratado. A jornada habitual era das [horário de início] às [horário de término], com uma hora de intervalo, conforme cartões de ponto dos autos."

**REGRA DE OURO:**
Se você não tem certeza se deve alterar algo, NÃO ALTERE. Preserve o texto original.
Seu trabalho é fazer "buscar e substituir" de dados específicos, NÃO reescrever.

**CHECKLIST FINAL - VERIFIQUE ANTES DE RESPONDER:**
\u2713 Mantive a estrutura exata das frases do original?
\u2713 Mantive os mesmos conectivos (ademais, com efeito, nesse sentido, etc.)?
\u2713 Mantive a mesma argumentação jurídica?
\u2713 Mantive a mesma ordem dos argumentos?
\u2713 Fiz APENAS substituições de nomes, valores, datas por termos genéricos?
\u2713 O texto tem o mesmo tamanho/extensão do original (não resumi)?

EXCLUSAO OBRIGATORIA DE MINI-RELATORIO (CRITICO):

Esta e uma das regras MAIS IMPORTANTES. Se voce incluir mini-relatorio, o modelo sera INUTIL.

PROIBIDO ABSOLUTAMENTE (exemplos do que NAO fazer):
- "O reclamante pleiteia..."
- "O reclamante postula..."
- "O reclamante alega..."
- "As reclamadas impugnaram..."
- "A reclamada sustenta..."
- "Trata-se de..."
- "Cuida-se de..."
- "O reclamante ajuizou..."
- Qualquer resumo das alegacoes das partes
- Qualquer descricao do que foi pedido ou contestado

CORRETO - Como DEVE comecar o modelo:
- "A configuracao de grupo economico..."
- "O reconhecimento do vinculo empregaticio..."
- "A concessao de horas extras..."
- "Para caracterizacao da jornada..."
- "A caracterizacao do dano moral..."
- Diretamente com ANALISE JURIDICA, FUNDAMENTOS LEGAIS, DOUTRINA, PRECEDENTES

\u26a0\ufe0f IMPORTANTE - PRESERVAÇÃO DE CITAÇÕES DOUTRINÁRIAS E JURISPRUDENCIAIS:

Esta regra e CRITICA para manter a qualidade e fundamentacao do modelo extraido.

O QUE PRESERVAR (MANTER INTEGRALMENTE):
\u2705 Citacoes de autores (ex: "Segundo Mauricio Godinho Delgado...")
\u2705 Citacoes de jurisprudencia (ex: "Conforme TST-AIRR-1234-56.2023...")
\u2705 Sumulas (ex: "A Sumula 437 do TST estabelece...")
\u2705 Orientacoes Jurisprudenciais (ex: "A OJ 415 da SDI-1 dispoe...")
\u2705 Precedentes vinculantes (ex: "Nos termos do Tema 1046 do TST...")
\u2705 Referencias doutrinarias completas (autor, obra, citacao)
\u2705 Referencias jurisprudenciais completas (tribunal, numero, ementa)
\u2705 Fundamentos teoricos e academicos

O QUE GENERALIZAR (SUBSTITUIR POR TERMOS GENERICOS):
\ud83d\udd04 Nomes de partes especificas \u2192 "o reclamante", "a reclamada"
\ud83d\udd04 Valores monetarios especificos \u2192 "[valor]", "quantia devida"
\ud83d\udd04 Datas especificas \u2192 "periodo trabalhado", "data da rescisao"
\ud83d\udd04 Locais especificos \u2192 "local de trabalho", "estabelecimento"
\ud83d\udd04 Documentos especificos do caso \u2192 "prova documental", "laudo pericial"
\ud83d\udd04 Testemunhas especificas \u2192 "prova testemunhal"

O QUE NUNCA FAZER:
\u274c NÃO remova citacoes de autores renomados
\u274c NÃO remova referencias a precedentes e jurisprudencia
\u274c NÃO remova fundamentacao teorica/doutrinaria
\u274c NÃO substitua nomes de doutrinadores por termos genericos
\u274c NÃO remova numeros de processos citados como precedentes

EXEMPLO CORRETO DE PRESERVAÇÃO:

ORIGINAL:
"A pretensao autoral merece acolhimento. Segundo Mauricio Godinho Delgado,
a configuracao de grupo economico exige demonstracao de direcao, controle
ou administracao comum (TST-AIRR-1234-56.2023.5.01.0000). No caso concreto,
a Empresa XYZ demonstrou..."

MODELO EXTRAÍDO (CORRETO):
"A pretensao autoral merece acolhimento. Segundo Mauricio Godinho Delgado,
a configuracao de grupo economico exige demonstracao de direcao, controle
ou administracao comum (TST-AIRR-1234-56.2023.5.01.0000). No caso concreto,
a reclamada demonstrou..."

\u2705 Citacao de Godinho Delgado \u2192 PRESERVADA
\u2705 Precedente TST-AIRR \u2192 PRESERVADO
\ud83d\udd04 "Empresa XYZ" \u2192 "a reclamada" (generalizado)

REGRA DE OURO:
Se o primeiro paragrafo fala sobre "o que o reclamante pede" ou "o que as partes alegam", ESTA ERRADO.
O primeiro paragrafo DEVE comecar com analise juridica do instituto/direito discutido.

EXEMPLO COMPARATIVO:

ERRADO (tem mini-relatorio):
"O reclamante pleiteia a condenacao solidaria das reclamadas, sob a alegacao de que integram o mesmo grupo economico. As reclamadas impugnaram o pedido."

CORRETO (sem mini-relatorio):
"A configuracao de grupo economico trabalhista demanda a presenca dos requisitos previstos no artigo 2 paragrafo 2 da CLT..."

ACAO REQUERIDA:
Se o texto original da decisao tiver mini-relatorio no inicio, voce DEVE REMOVE-LO completamente antes de generalizar.
Identifique onde termina o mini-relatorio e onde comeca a fundamentacao. Mantenha APENAS a fundamentacao.

Voce entendeu? INICIE DIRETAMENTE NA ANALISE JURIDICA. ZERO mini-relatorio.

${estiloRedacao}

A redação do modelo deve ser de EXCELENTE QUALIDADE, seguindo rigorosamente estes critérios.

IMPORTANTE:
- Um documento pode conter 1, 2, 3 ou mais tópicos diferentes
- Cada tópico deve ser tratado independentemente
- Crie modelos ROBUSTOS, COMPLETOS e PRONTOS PARA REUTILIZAÇÃO
- Os modelos devem seguir o estilo de um juiz do trabalho experiente e didático
- Use linguagem formal, mas acessível e agradável de ler
- Fundamente em bases legais, doutrina e jurisprudência
- GENERALIZE apenas dados do caso concreto (nomes, valores, datas)
- PRESERVE citações doutrinárias, precedentes e jurisprudência integralmente

Para CADA tópico identificado, crie:
1. **Título**: Claro e objetivo. IMPORTANTE: O titulo DEVE estar em LETRAS MAIUSCULAS. Exemplos: "HORAS EXTRAS - PROCEDENCIA", "GRUPO ECONOMICO - IMPROCEDENCIA"
2. **Categoria**: Classificação jurídica precisa (ex: "Verbas Rescisórias", "Jornada de Trabalho", "Preliminares", "Estabilidade")

3. **Palavras-chave** (5 a 10 termos estratégicos):

   INCLUA:
   - \u2705 Termos técnicos jurídicos principais
   - \u2705 Sinônimos e variações do tema
   - \u2705 Palavras que um juiz digitaria na busca
   - \u2705 Conceitos-chave relacionados
   - \u2705 Artigos de lei relevantes (ex: "CLT art 59", "Lei 13467")

   EVITE:
   - \u274c Palavras muito genéricas ("direito", "trabalho", "lei", "justiça")
   - \u274c Verbos conjugados ("trabalhar", "receber", "pagar")
   - \u274c Artigos e preposições (o, a, de, da, para)
   - \u274c Nomes próprios ou específicos

   EXEMPLOS:
   \u274c Ruins: "direito, trabalho, empregado, salário, lei"
   \u2705 Bons: "horas extras, sobrejornada, adicional hora extra, banco de horas, controle jornada, CLT art 59, 7\u00ba inciso XVI, prova horário"

4. **Conteúdo**: Modelo de decisão GENÉRICO em formato HTML com REDAÇÃO FLUIDA, COESA E CONTÍNUA:
   - INICIE DIRETAMENTE na análise jurídica (SEM mini-relatório)
   - Análise fundamentada em prosa corrida (SEM enumerações ou títulos)
   - Use conectores textuais entre parágrafos
   - Base legal pertinente integrada ao texto
   - Conclusão clara e adaptável
   - Formatação com <p>, <strong>, <em>, etc.
   - Texto agradável, didático e bem articulado

EXEMPLO DE GENERALIZAÇÃO:

\u274c ERRADO (específico demais):
"João da Silva trabalhou para a Empresa ABC Ltda de 01/01/2020 a 31/12/2022, fazendo jus a R$ 15.000,00 de horas extras conforme planilha de fls. 45."

\u2705 CORRETO (genérico e reutilizável):
"O reclamante comprovou o labor em sobrejornada durante o período contratual, fazendo jus ao pagamento das horas extras apuradas em liquidação de sentença, conforme documentação apresentada nos autos."

FORMATO DE RESPOSTA - JSON valido:

IMPORTANTE: Retorne APENAS JSON puro. Nada de texto antes ou depois.

Sua resposta deve comecar com { e terminar com }

Use aspas duplas para strings.
Escape caracteres especiais corretamente.
Sem virgulas sobrando no ultimo elemento.

{
  "modelos": [
    {
      "titulo": "TITULO EM MAIUSCULAS - RESULTADO",
      "categoria": "Categoria Juridica",
      "palavrasChave": "palavra1, palavra2, palavra3",
      "conteudo": "<p>Modelo em HTML.</p><p>Tudo em uma string.</p>"
    }
  ]
}

LEMBRE-SE: O titulo DEVE estar em MAIUSCULAS!

DOCUMENTO A ANALISAR:
${textToAnalyze}`;
};

/** Configurações default para chamada de IA no bulk upload */
export const BULK_AI_CONFIG = {
  maxTokens: 8000,
  timeout: 180000, // 3 minutos
  temperature: 0.3,
  topP: 0.9,
  topK: 50
} as const;

/** Delay entre batches de processamento */
export const INTER_BATCH_DELAY = 3000; // 3 segundos

/** Timeout para chamadas de API */
export const BULK_API_TIMEOUT_MS = 60000; // 60 segundos

/** Extensões de arquivo válidas para upload em lote */
export const VALID_FILE_EXTENSIONS = ['.pdf', '.txt', '.docx', '.doc'] as const;

/** MIME types válidos para upload em lote */
export const VALID_FILE_TYPES = [
  'application/pdf',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword'
] as const;

/** Limite máximo de arquivos por lote */
export const MAX_BULK_FILES = 20;

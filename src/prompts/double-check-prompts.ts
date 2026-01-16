/**
 * Prompts para Double Check de Respostas da IA
 * Verificação secundária para identificar falhas, omissões e falsos positivos
 *
 * @version 1.37.65 - Double Check para proofAnalysis e quickPrompt + userPrompt parameter
 */

import type { DoubleCheckOperations } from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// PROMPTS DE DOUBLE CHECK
// ═══════════════════════════════════════════════════════════════════════════

type DoubleCheckOperation = keyof DoubleCheckOperations;

/**
 * Prompts de verificação por tipo de operação
 */
export const DOUBLE_CHECK_PROMPTS: Record<DoubleCheckOperation, string> = {
  topicExtraction: `## TAREFA: Verificação de Extração de Tópicos

Você é um revisor jurídico especializado em análise de petições trabalhistas brasileiras.
Sua função é verificar criticamente a extração de tópicos realizada, identificando erros e omissões.

## DOCUMENTOS ORIGINAIS:
{context}

## TÓPICOS EXTRAÍDOS (a verificar):
{originalResponse}

## CRITÉRIOS DE VERIFICAÇÃO:

### 1. FALSOS POSITIVOS
Identifique tópicos que NÃO deveriam estar na lista:
- Não há pedido real nos documentos para este tema
- O texto menciona o tema apenas como contexto/histórico, não como pedido
- Tópico duplica outro já existente com nome diferente

### 2. OMISSÕES
Identifique pedidos/tópicos que FALTAM e deveriam estar:
- Releia os pedidos da petição inicial
- Verifique se há pedidos implícitos ou subsidiários
- Confira pedidos comuns (honorários, juros, custas) se aplicável

### 3. CATEGORIZAÇÃO
Verifique se os tópicos estão corretamente classificados:
- PRELIMINAR: matérias processuais (prescrição, inépcia, ilegitimidade, etc.)
- MÉRITO: pedidos de direito material (horas extras, verbas rescisórias, etc.)

### 4. DUPLICATAS
Identifique tópicos redundantes que poderiam ser mesclados:
- Mesmo pedido com nomes diferentes
- Pedidos que são variações do mesmo tema

## IDIOMA OBRIGATÓRIO
RESPONDA SEMPRE EM PORTUGUÊS BRASILEIRO. Todos os campos da resposta JSON (reason, suggestion, summary, item, etc.) devem estar em português.

## FORMATO DE RESPOSTA (JSON estrito):

\`\`\`json
{
  "corrections": [
    { "type": "remove", "topic": "TÍTULO DO TÓPICO", "reason": "Justificativa" },
    { "type": "add", "topic": { "title": "NOVO TÓPICO", "category": "MÉRITO ou PRELIMINAR" }, "reason": "Justificativa" },
    { "type": "merge", "topics": ["TÓPICO A", "TÓPICO B"], "into": "TÓPICO FINAL", "reason": "Justificativa" },
    { "type": "reclassify", "topic": "TÍTULO", "from": "MÉRITO", "to": "PRELIMINAR", "reason": "Justificativa" }
  ],
  "verifiedTopics": [
    { "title": "TÓPICO 1", "category": "MÉRITO" },
    { "title": "TÓPICO 2", "category": "PRELIMINAR" }
  ],
  "confidence": 0.95,
  "summary": "Resumo breve das alterações (ou 'Nenhuma correção necessária')"
}
\`\`\`

IMPORTANTE:
- Se a extração original estiver correta, retorne corrections: [] e copie os tópicos originais em verifiedTopics
- Mantenha a ordem lógica: preliminares primeiro, mérito depois
- Use confidence entre 0.0 e 1.0 para indicar sua certeza na verificação
- O campo summary deve ser conciso (1-2 frases)`,

  // v1.36.56: Verificação do Dispositivo
  dispositivo: `## TAREFA: Verificação do Dispositivo da Sentença

Você é um revisor jurídico especializado em sentenças trabalhistas brasileiras.
Sua função é verificar criticamente o dispositivo gerado, identificando omissões e inconsistências.

## FUNDAMENTAÇÃO (contexto da decisão):
{context}

## DISPOSITIVO GERADO (a verificar):
{originalResponse}

## CRITÉRIOS DE VERIFICAÇÃO:

### 1. COMPLETUDE - Todos os pedidos foram julgados?
- Compare com os tópicos da fundamentação
- Verifique se CADA pedido tem seu julgamento (procedente/improcedente)
- Identifique pedidos omitidos no dispositivo

### 2. COERÊNCIA COM A FUNDAMENTAÇÃO
- O resultado no dispositivo corresponde ao decidido na fundamentação?
- Há contradições (ex: fundamentação defere, dispositivo indefere)?
- Verbas acessórias (juros, honorários, custas) estão consistentes?

### 3. PARÂMETROS DAS CONDENAÇÕES
- Valores/percentuais estão definidos quando necessário?
- Períodos de apuração estão especificados?
- Bases de cálculo estão indicadas?

### 4. FORMATO TÉCNICO
- Usa termos corretos: JULGAR PROCEDENTE/IMPROCEDENTE/PARCIALMENTE PROCEDENTE?
- Estrutura clara: primeiro declara resultado, depois especifica condenações?
- Cláusulas obrigatórias: custas, honorários, INSS/IR?

## IDIOMA OBRIGATÓRIO
RESPONDA SEMPRE EM PORTUGUÊS BRASILEIRO. Todos os campos da resposta JSON (reason, suggestion, summary, item, etc.) devem estar em português.

## FORMATO DE RESPOSTA (JSON estrito):

\`\`\`json
{
  "corrections": [
    { "type": "add", "item": "DESCRIÇÃO DO QUE FALTA", "reason": "Justificativa" },
    { "type": "modify", "item": "O QUE MODIFICAR", "suggestion": "TEXTO SUGERIDO", "reason": "Justificativa" },
    { "type": "remove", "item": "O QUE REMOVER", "reason": "Justificativa" }
  ],
  "verifiedDispositivo": "TEXTO DO DISPOSITIVO CORRIGIDO (ou original se não houver correções)",
  "confidence": 0.95,
  "summary": "Resumo breve das alterações (ou 'Dispositivo correto, nenhuma correção necessária')"
}
\`\`\`

IMPORTANTE:
- Se o dispositivo estiver correto, retorne corrections: [] e copie o original em verifiedDispositivo
- Foque em erros substanciais (omissões, contradições), não em estilo
- Use confidence entre 0.0 e 1.0 para indicar sua certeza`,

  // v1.36.56: Verificação da Revisão de Sentença
  sentenceReview: `## TAREFA: Verificação da Análise Crítica da Sentença

Você é um revisor jurídico especializado em controle de qualidade de sentenças trabalhistas.
Sua função é verificar se a análise crítica (revisão) está correta e útil.

## SENTENÇA ORIGINAL:
{context}

## ANÁLISE CRÍTICA GERADA (a verificar):
{originalResponse}

## CRITÉRIOS DE VERIFICAÇÃO:

### 1. OMISSÕES IDENTIFICADAS
- As omissões apontadas são REAIS? (pedido existe e não foi decidido)
- Há omissões que a análise não detectou?
- Há falsos positivos (apontou omissão que não existe)?

### 2. CONTRADIÇÕES IDENTIFICADAS
- As contradições apontadas são PERTINENTES?
- Fundamentação e dispositivo realmente divergem nos pontos indicados?
- Há contradições não detectadas?

### 3. OBSCURIDADES IDENTIFICADAS
- Os pontos obscuros apontados são REAIS?
- A decisão é realmente incompreensível nos trechos indicados?
- As sugestões de clarificação são úteis?

### 4. QUALIDADE DAS SUGESTÕES
- As correções sugeridas são APLICÁVEIS?
- As sugestões respeitam os limites da sentença trabalhista?
- Há sugestões desnecessárias ou excessivas?

## IDIOMA OBRIGATÓRIO
RESPONDA SEMPRE EM PORTUGUÊS BRASILEIRO. Todos os campos da resposta JSON (reason, suggestion, summary, item, etc.) devem estar em português.

## FORMATO DE RESPOSTA (JSON estrito):

\`\`\`json
{
  "corrections": [
    { "type": "false_positive", "item": "PROBLEMA INCORRETAMENTE APONTADO", "reason": "Por que não é problema real" },
    { "type": "missed", "item": "PROBLEMA NÃO DETECTADO", "reason": "Por que deveria ter sido detectado" },
    { "type": "improve", "item": "SUGESTÃO A MELHORAR", "suggestion": "SUGESTÃO MELHORADA", "reason": "Justificativa" }
  ],
  "verifiedReview": "ANÁLISE CRÍTICA CORRIGIDA (ou original se não houver correções)",
  "confidence": 0.95,
  "summary": "Resumo breve das alterações (ou 'Análise correta, nenhuma correção necessária')"
}
\`\`\`

IMPORTANTE:
- Se a análise estiver correta, retorne corrections: [] e copie o original em verifiedReview
- Foque em erros substanciais, não em preferências de redação
- Use confidence entre 0.0 e 1.0 para indicar sua certeza`,

  // v1.37.61: Verificação do Confronto de Fatos - Regras movidas para o início
  factsComparison: `## TAREFA: Verificação do Confronto de Fatos

Você é um revisor jurídico especializado em análise comparativa de alegações trabalhistas.

## ⚠️ REGRAS OBRIGATÓRIAS PARA CORREÇÕES fix_row (LEIA PRIMEIRO!)

Ao gerar correções do tipo "fix_row", você DEVE seguir estas regras:

1. **"tema" = NOME EXATO DO TEMA NA TABELA**
   ✅ CORRETO: "tema": "Subordinação Hierárquica"
   ✅ CORRETO: "tema": "Jornada de Trabalho"
   ✅ CORRETO: "tema": "Período de Prestação de Serviços"
   ❌ ERRADO: "tema": "Correção 1" (NUNCA use identificadores genéricos!)
   ❌ ERRADO: "tema": "Linha 1"
   ❌ ERRADO: "tema": "Item 2"

2. **"field" = CAMPO ESPECÍFICO A CORRIGIR**
   Campos válidos: "alegacaoReclamante", "alegacaoReclamada", "status", "relevancia", "observacao"
   ✅ CORRETO: "field": "status"
   ✅ CORRETO: "field": "alegacaoReclamante"
   ✅ CORRETO: "field": "observacao"
   ❌ ERRADO: "field": "tabela" (NUNCA use "tabela"!)

3. **"newValue" = VALOR CORRIGIDO COMPLETO**
   ✅ CORRETO: "newValue": "incontroverso"
   ✅ CORRETO: "newValue": "Alega que trabalhava das 8h às 18h sem intervalo"
   ❌ ERRADO: "newValue": "" (NUNCA deixe vazio!)

## EXEMPLO DE CORREÇÃO CORRETA:

{
  "type": "fix_row",
  "tema": "Período de Prestação de Serviços",
  "field": "status",
  "newValue": "incontroverso",
  "reason": "As datas não foram contestadas especificamente pela ré (Art. 341 CPC)"
}

## DOCUMENTOS ORIGINAIS:
{context}

## CONFRONTO GERADO (a verificar):
{originalResponse}

## CRITÉRIOS DE VERIFICAÇÃO:

### 1. COMPLETUDE DA TABELA
- Todos os pontos fáticos relevantes foram incluídos?
- Há omissões de alegações importantes?

### 2. CLASSIFICAÇÃO DE STATUS
- "controverso": partes divergem sobre o fato
- "incontroverso": partes concordam (expresso ou tácito, Art. 341 CPC)
- "silencio": uma parte não se manifestou
- A classificação está correta para cada linha?

### 3. FATOS INCONTROVERSOS/CONTROVERSOS
- As listas estão corretas e completas?

## IDIOMA OBRIGATÓRIO
RESPONDA SEMPRE EM PORTUGUÊS BRASILEIRO. Todos os campos da resposta JSON (reason, suggestion, summary, tema, etc.) devem estar em português.

## FORMATO DE RESPOSTA (JSON estrito):

\`\`\`json
{
  "corrections": [
    { "type": "fix_row", "tema": "NOME EXATO DO TEMA", "field": "status", "newValue": "incontroverso", "reason": "..." },
    { "type": "add_row", "row": {"tema": "...", "alegacaoReclamante": "...", "alegacaoReclamada": "...", "status": "...", "relevancia": "..."}, "reason": "..." },
    { "type": "add_fato", "list": "fatosIncontroversos", "fato": "...", "reason": "..." }
  ],
  "verifiedResult": { /* Objeto FactsComparisonResult corrigido ou original */ },
  "confidence": 0.95,
  "summary": "Resumo breve das alterações"
}
\`\`\`

IMPORTANTE: Se não houver correções necessárias, retorne corrections: [] e copie o original em verifiedResult.`,

  // v1.37.65: Verificação da Análise de Provas
  proofAnalysis: `## TAREFA: Verificação de Análise de Prova

Você é um revisor jurídico especializado em análise probatória trabalhista.
Sua função é verificar criticamente a análise de prova realizada.

## CONTEÚDO DA PROVA:
{context}

## ANÁLISE GERADA (a verificar):
{originalResponse}

## CRITÉRIOS DE VERIFICAÇÃO:

### 1. COMPLETUDE
- A análise abordou todos os elementos relevantes da prova?
- Há informações na prova que foram ignoradas?

### 2. COERÊNCIA COM A PROVA
- As conclusões derivam logicamente do conteúdo da prova?
- Há afirmações não sustentadas pelo documento?

### 3. OBJETIVIDADE
- A análise é imparcial ou contém viés?
- As inferências são razoáveis?

### 4. RELEVÂNCIA JURÍDICA
- A análise identifica corretamente a força probatória?
- Relaciona adequadamente com os pedidos/defesa?

## IDIOMA OBRIGATÓRIO
RESPONDA SEMPRE EM PORTUGUÊS BRASILEIRO. Todos os campos da resposta JSON (reason, suggestion, summary, item, etc.) devem estar em português.

## FORMATO DE RESPOSTA (JSON estrito):

\`\`\`json
{
  "corrections": [
    { "type": "improve", "reason": "Motivo da correção", "item": "Elemento específico", "suggestion": "Texto corrigido" }
  ],
  "verifiedResult": "Análise verificada e corrigida (ou original se sem correções)",
  "confidence": 0.95,
  "summary": "Resumo breve das alterações (ou 'Nenhuma correção necessária')"
}
\`\`\`

IMPORTANTE:
- Se a análise estiver correta, retorne corrections: [] e copie a análise original em verifiedResult
- Use confidence entre 0.0 e 1.0 para indicar sua certeza
- O campo summary deve ser conciso (1-2 frases)`,

  // v1.37.65: Verificação dos Quick Prompts do Assistente IA
  quickPrompt: `## TAREFA: Verificação de Resposta do Assistente IA

Você é um revisor jurídico especializado em sentenças trabalhistas.
Sua função é verificar criticamente a resposta do assistente de redação.

## SOLICITAÇÃO DO USUÁRIO:
{userPrompt}

## CONTEXTO DA DECISÃO:
{context}

## RESPOSTA DO ASSISTENTE (a verificar):
{originalResponse}

## CRITÉRIOS DE VERIFICAÇÃO:

### 1. ATENDIMENTO À SOLICITAÇÃO
- A resposta atende ao que foi solicitado pelo usuário?
- O objetivo específico da solicitação foi cumprido?
- Há aspectos da solicitação que não foram abordados?

### 2. PRECISÃO JURÍDICA
- As afirmações jurídicas estão corretas?
- Cita corretamente legislação e jurisprudência (se aplicável)?

### 3. COERÊNCIA COM OS DOCUMENTOS
- As observações são sustentadas pelos documentos do processo?
- Há afirmações que contradizem o conteúdo dos autos?

### 4. QUALIDADE DA ANÁLISE
- A análise é equilibrada e imparcial?
- As conclusões são lógicas e bem fundamentadas?

## IDIOMA OBRIGATÓRIO
RESPONDA SEMPRE EM PORTUGUÊS BRASILEIRO. Todos os campos da resposta JSON (reason, suggestion, summary, item, etc.) devem estar em português.

## FORMATO DE RESPOSTA (JSON estrito):

\`\`\`json
{
  "corrections": [
    { "type": "improve", "reason": "Motivo da correção", "item": "Elemento específico", "suggestion": "Texto corrigido" }
  ],
  "verifiedResult": "Resposta verificada (ou original se sem correções)",
  "confidence": 0.95,
  "summary": "Resumo breve das alterações (ou 'Nenhuma correção necessária')"
}
\`\`\`

IMPORTANTE:
- PRIORIZE verificar se a resposta atende à solicitação específica do usuário
- Se a resposta estiver correta, retorne corrections: [] e copie a resposta original em verifiedResult
- Use confidence entre 0.0 e 1.0 para indicar sua certeza
- O campo summary deve ser conciso (1-2 frases)`
};

/**
 * Constrói o prompt de double check com contexto
 * @param operation - Tipo de operação sendo verificada
 * @param originalResponse - Resposta original da IA (JSON stringificado)
 * @param context - Contexto/documentos originais
 * @param userPrompt - (v1.37.65) Solicitação original do usuário (para quickPrompt)
 */
export const buildDoubleCheckPrompt = (
  operation: DoubleCheckOperation,
  originalResponse: string,
  context: string,
  userPrompt?: string
): string => {
  const template = DOUBLE_CHECK_PROMPTS[operation];

  let result = template
    .replace('{context}', context)
    .replace('{originalResponse}', originalResponse);

  // v1.37.65: Substituir {userPrompt} se existir no template
  if (userPrompt) {
    result = result.replace('{userPrompt}', userPrompt);
  } else {
    // Remover seção com placeholder não preenchido
    result = result.replace(/## SOLICITAÇÃO DO USUÁRIO:\n\{userPrompt\}\n\n/g, '');
  }

  return result;
};

/**
 * Labels amigáveis para as operações
 */
export const DOUBLE_CHECK_OPERATION_LABELS: Record<DoubleCheckOperation, { label: string; description: string }> = {
  topicExtraction: {
    label: 'Extração de tópicos',
    description: 'Verifica falsos positivos, omissões e categorização incorreta'
  },
  dispositivo: {
    label: 'Dispositivo',
    description: 'Verifica omissões de pedidos e contradições com fundamentação'
  },
  sentenceReview: {
    label: 'Revisar sentença',
    description: 'Valida análise de omissões, contradições e obscuridades'
  },
  factsComparison: {
    label: 'Confronto de fatos',
    description: 'Verifica completude, classificação e correção das alegações'
  },
  // v1.37.65: Novas operações
  proofAnalysis: {
    label: 'Análise de provas',
    description: 'Verifica completude, coerência e objetividade da análise'
  },
  quickPrompt: {
    label: 'Prompts rápidos',
    description: 'Verifica atendimento à solicitação e precisão jurídica'
  }
};

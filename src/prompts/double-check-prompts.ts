/**
 * Prompts para Double Check de Respostas da IA
 * Verificação secundária para identificar falhas, omissões e falsos positivos
 *
 * @version 1.36.56 - Adicionado dispositivo e sentenceReview
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
- Use confidence entre 0.0 e 1.0 para indicar sua certeza`
};

/**
 * Constrói o prompt de double check com contexto
 * @param operation - Tipo de operação sendo verificada
 * @param originalResponse - Resposta original da IA (JSON stringificado)
 * @param context - Contexto/documentos originais
 */
export const buildDoubleCheckPrompt = (
  operation: DoubleCheckOperation,
  originalResponse: string,
  context: string
): string => {
  const template = DOUBLE_CHECK_PROMPTS[operation];

  return template
    .replace('{context}', context)
    .replace('{originalResponse}', originalResponse);
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
  }
};

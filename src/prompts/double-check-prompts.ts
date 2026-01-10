/**
 * Prompts para Double Check de Respostas da IA
 * Verificação secundária para identificar falhas, omissões e falsos positivos
 *
 * @version 1.36.50
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
- O campo summary deve ser conciso (1-2 frases)`
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
  }
  // Futuras expansões:
  // proofAnalysis: { label: 'Análise de provas', description: '...' },
  // miniReports: { label: 'Mini-relatórios', description: '...' },
  // fundamentacao: { label: 'Fundamentação', description: '...' },
};

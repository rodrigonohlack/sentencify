/**
 * Meta-prompts para geração automática de modelos personalizados
 *
 * Estes prompts instruem a LLM a analisar exemplos do magistrado
 * e gerar um prompt profissional que reproduza seu estilo.
 *
 * @version 1.35.70
 */

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

export type TargetField = 'modeloRelatorio' | 'modeloDispositivo' | 'modeloTopicoRelatorio';

// ═══════════════════════════════════════════════════════════════════════════
// LABELS
// ═══════════════════════════════════════════════════════════════════════════

export const FIELD_LABELS: Record<TargetField, string> = {
  modeloRelatorio: 'Mini-Relatório',
  modeloDispositivo: 'Dispositivo',
  modeloTopicoRelatorio: 'Relatório Processual'
};

const TYPE_LABELS: Record<TargetField, string> = {
  modeloRelatorio: 'MINI-RELATÓRIO',
  modeloDispositivo: 'DISPOSITIVO DE SENTENÇA',
  modeloTopicoRelatorio: 'RELATÓRIO PROCESSUAL'
};

// ═══════════════════════════════════════════════════════════════════════════
// BUILDER DO META-PROMPT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Constrói o meta-prompt para gerar um modelo personalizado
 *
 * @param targetField - Qual campo está sendo gerado
 * @param examples - Array de exemplos fornecidos pelo juiz
 * @param hardcodedPrompt - Prompt padrão do sistema como referência de estrutura
 */
export function buildMetaPrompt(
  targetField: TargetField,
  examples: string[],
  hardcodedPrompt: string
): string {
  const tipo = TYPE_LABELS[targetField];

  const exemplosFormatados = examples
    .map((e, i) => `══ EXEMPLO ${i + 1} ══\n${e}`)
    .join('\n\n');

  return `Você é um especialista em engenharia de prompts jurídicos.

═══════════════════════════════════════════════════════════════════════════════
TAREFA
═══════════════════════════════════════════════════════════════════════════════

Analise os exemplos de ${tipo} fornecidos pelo magistrado e gere um PROMPT DE INSTRUÇÃO
completo que permita a uma IA reproduzir fielmente o estilo de redação deste juiz.

═══════════════════════════════════════════════════════════════════════════════
EXEMPLOS DO MAGISTRADO
═══════════════════════════════════════════════════════════════════════════════

${exemplosFormatados}

═══════════════════════════════════════════════════════════════════════════════
PROMPT DE REFERÊNCIA (Use esta ESTRUTURA, adapte o CONTEÚDO aos exemplos)
═══════════════════════════════════════════════════════════════════════════════

${hardcodedPrompt}

═══════════════════════════════════════════════════════════════════════════════
ANÁLISE REQUERIDA
═══════════════════════════════════════════════════════════════════════════════

1. ESTRUTURA: Quantos parágrafos, ordem das informações, divisões
2. VOCABULÁRIO: Termos preferidos, conectivos, expressões recorrentes
3. TOM: Formal/informal, técnico/acessível, detalhado/conciso
4. PADRÕES: Como inicia, como conclui, como referencia partes

═══════════════════════════════════════════════════════════════════════════════
FORMATO DA RESPOSTA
═══════════════════════════════════════════════════════════════════════════════

Gere um prompt de instrução que:
- Siga a ESTRUTURA do prompt de referência
- Adapte o CONTEÚDO para refletir o estilo detectado nos exemplos
- Inclua exemplos de frases modelo com placeholders [INFO]
- Seja autocontido (qualquer LLM deve poder usá-lo)

⚠️ Responda APENAS com o prompt de instrução, sem explicações.`;
}

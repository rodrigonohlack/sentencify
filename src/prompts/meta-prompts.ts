/**
 * Meta-prompts para geração automática de modelos personalizados
 *
 * Estes prompts instruem a LLM a analisar exemplos do magistrado
 * e gerar um prompt profissional que reproduza seu estilo.
 *
 * @version 1.35.77
 * - buildMetaPrompt(): Extrai ESTRUTURA (ordem, seções, formato) para modelos
 * - buildStyleMetaPrompt(): Extrai ESTILO (tom, vocabulário, ritmo) para redação personalizada
 */

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

export type TargetField = 'modeloRelatorio' | 'modeloDispositivo' | 'modeloTopicoRelatorio' | 'estiloRedacao';

// ═══════════════════════════════════════════════════════════════════════════
// LABELS
// ═══════════════════════════════════════════════════════════════════════════

export const FIELD_LABELS: Record<TargetField, string> = {
  modeloRelatorio: 'Mini-Relatório',
  modeloDispositivo: 'Dispositivo',
  modeloTopicoRelatorio: 'Relatório Processual',
  estiloRedacao: 'Estilo de Redação'
};

// TYPE_LABELS para buildMetaPrompt (não inclui estiloRedacao - usa buildStyleMetaPrompt separado)
type StructureField = Exclude<TargetField, 'estiloRedacao'>;
const TYPE_LABELS: Record<StructureField, string> = {
  modeloRelatorio: 'MINI-RELATÓRIO',
  modeloDispositivo: 'DISPOSITIVO DE SENTENÇA',
  modeloTopicoRelatorio: 'RELATÓRIO PROCESSUAL'
};

// ═══════════════════════════════════════════════════════════════════════════
// BUILDER DO META-PROMPT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Constrói o meta-prompt para gerar um modelo de ESTRUTURA personalizado
 * (Mini-Relatório, Dispositivo, Relatório Processual)
 *
 * @param targetField - Qual campo está sendo gerado (exceto estiloRedacao)
 * @param examples - Array de exemplos fornecidos pelo juiz
 * @param hardcodedPrompt - Prompt padrão do sistema como referência de estrutura
 */
export function buildMetaPrompt(
  targetField: StructureField,
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

// ═══════════════════════════════════════════════════════════════════════════
// BUILDER DO META-PROMPT PARA ESTILO
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Constrói o meta-prompt para gerar um ESTILO DE REDAÇÃO personalizado
 * (foco em tom, vocabulário, ritmo - NÃO em estrutura)
 *
 * @param examples - Array de exemplos de sentenças fornecidos pelo juiz
 * @param styleReference - AI_INSTRUCTIONS_STYLE como referência base
 */
export function buildStyleMetaPrompt(
  examples: string[],
  styleReference: string
): string {
  const exemplosFormatados = examples
    .map((e, i) => `══ EXEMPLO ${i + 1} ══\n${e}`)
    .join('\n\n');

  return `Você é um especialista em análise linguística e engenharia de prompts.

═══════════════════════════════════════════════════════════════════════════════
TAREFA
═══════════════════════════════════════════════════════════════════════════════

Analise os exemplos de SENTENÇAS TRABALHISTAS fornecidos pelo magistrado e extraia
o ESTILO DE REDAÇÃO característico. Gere um PROMPT DE INSTRUÇÃO que faça uma IA
reproduzir fielmente esse estilo.

⚠️ FOCO EXCLUSIVO EM ESTILO (não em estrutura):
- TOM: Formal/informal, autoritativo/didático, sereno/incisivo
- VOCABULÁRIO: Termos preferidos, expressões recorrentes, latinismos ou linguagem acessível
- CONECTIVOS: Quais usa para transição (ademais, outrossim, nesse sentido, por outro lado...)
- RITMO: Frases longas/curtas, parágrafos densos/espaçados, cadência da escrita
- PESSOA: 1ª pessoa singular? Plural majestático? Impessoal?
- ADJETIVAÇÃO: Evita? Usa moderadamente? Abundante?
- FUNDAMENTAÇÃO: Como introduz argumentos, cita doutrina, menciona jurisprudência

═══════════════════════════════════════════════════════════════════════════════
EXEMPLOS DO MAGISTRADO
═══════════════════════════════════════════════════════════════════════════════

${exemplosFormatados}

═══════════════════════════════════════════════════════════════════════════════
ESTILO DE REFERÊNCIA (adapte ao estilo detectado nos exemplos)
═══════════════════════════════════════════════════════════════════════════════

${styleReference}

═══════════════════════════════════════════════════════════════════════════════
ANÁLISE REQUERIDA
═══════════════════════════════════════════════════════════════════════════════

Extraia do texto do magistrado:

1. TOM GERAL
   - É técnico ou acessível?
   - É direto ou elaborado?
   - Demonstra autoridade ou busca convencer?

2. VOCABULÁRIO CARACTERÍSTICO
   - Liste os conectivos mais usados
   - Identifique expressões recorrentes
   - Note se usa latinismos (v.g., e.g., data venia) ou evita

3. ESTRUTURA DAS FRASES
   - Frases longas com múltiplas orações ou curtas e diretas?
   - Como constrói argumentos complexos?

4. PADRÕES DE FUNDAMENTAÇÃO
   - Como introduz citações de jurisprudência?
   - Como referencia doutrina?
   - Como conecta norma ao caso concreto?

═══════════════════════════════════════════════════════════════════════════════
FORMATO DA RESPOSTA
═══════════════════════════════════════════════════════════════════════════════

Gere um prompt de instrução de ESTILO que:

1. Descreva o TOM característico do magistrado em 2-3 frases
2. Liste os CONECTIVOS E EXPRESSÕES preferidos (mínimo 10 exemplos)
3. Defina o RITMO textual (comprimento típico de frases, estrutura de parágrafos)
4. Especifique regras de VOCABULÁRIO (termos a usar, termos a evitar)
5. Inclua 3-5 EXEMPLOS de frases no estilo do magistrado
6. Defina como FUNDAMENTAR (estilo de citação, transições argumentativas)

O prompt gerado deve ser autocontido - qualquer LLM deve poder usá-lo para
reproduzir o estilo do magistrado sem acesso aos exemplos originais.

⚠️ Responda APENAS com o prompt de estilo, sem explicações ou análises.`;
}

/**
 * Prompts para Confronto de Fatos
 * Análise comparativa de alegações entre partes processuais
 *
 * @version 1.36.12
 */

// ═══════════════════════════════════════════════════════════════════════════
// PROMPTS DE CONFRONTO DE FATOS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Prompt para gerar análise comparativa de fatos
 * @param topicTitle - Título do tópico (ex: "HORAS EXTRAS")
 * @param sourceContent - Conteúdo fonte (mini-relatório ou documentos)
 * @param sourceType - Tipo de fonte usada
 */
export const buildFactsComparisonPrompt = (
  topicTitle: string,
  sourceContent: string,
  sourceType: 'mini-relatorio' | 'documentos-completos'
): string => {
  const sourceDescription = sourceType === 'mini-relatorio'
    ? 'o mini-relatório do tópico (resumo já processado das alegações)'
    : 'os documentos completos do processo (petição inicial, contestação e impugnação)';

  return `## TAREFA: Confronto de Fatos

Você é um assistente jurídico especializado em análise comparativa de alegações em ações trabalhistas brasileiras.

Analise ${sourceDescription} e construa uma tabela comparativa das alegações das partes sobre o tópico: **${topicTitle}**

## CONTEÚDO A ANALISAR:
${sourceContent}

## INSTRUÇÕES:

1. **Identifique as alegações de cada parte** sobre o tema "${topicTitle}"
2. **Compare fato a fato** as versões de reclamante e reclamada
3. **Classifique cada ponto** como:
   - **controverso**: versões divergentes ou contraditórias
   - **incontroverso**: ambas as partes concordam (explícita ou tacitamente)
   - **silencio**: uma das partes não se manifestou sobre o ponto

4. **Avalie a relevância** de cada ponto para a decisão:
   - **alta**: fato essencial para o deslinde da controvérsia
   - **media**: fato relevante mas não determinante
   - **baixa**: fato periférico ou de menor importância

## FORMATO DE RESPOSTA (JSON):

Responda APENAS com JSON válido, sem texto adicional antes ou depois:

\`\`\`json
{
  "tabela": [
    {
      "tema": "Descrição concisa do ponto fático",
      "alegacaoReclamante": "O que o reclamante alega (ou 'Não se manifestou')",
      "alegacaoReclamada": "O que a reclamada alega (ou 'Não se manifestou')",
      "status": "controverso",
      "relevancia": "alta",
      "observacao": "Nota opcional sobre inconsistências ou pontos de atenção"
    }
  ],
  "fatosIncontroversos": [
    "Fato 1 que ambas as partes concordam",
    "Fato 2 incontroverso"
  ],
  "fatosControversos": [
    "Ponto 1 de divergência principal",
    "Ponto 2 de divergência"
  ],
  "pontosChave": [
    "Questão central 1 a ser decidida pelo juiz",
    "Questão central 2"
  ],
  "resumo": "Breve síntese do confronto de fatos em 2-3 frases, destacando os pontos principais de divergência e convergência."
}
\`\`\`

## REGRAS IMPORTANTES:

1. Responda APENAS com JSON válido (sem markdown, sem explicações)
2. Seja objetivo e imparcial na descrição das alegações
3. NÃO faça juízo de valor sobre a veracidade das alegações
4. Foque nos FATOS, não nas teses jurídicas
5. Use linguagem técnica mas acessível
6. Se o conteúdo não tiver informações suficientes sobre o tópico, retorne arrays vazios
7. A tabela deve ter pelo menos 1 linha se houver qualquer alegação relevante
8. O campo "observacao" é opcional - use apenas quando houver algo importante a destacar
`;
};

/**
 * Prompt simplificado para mini-relatório (já processado)
 */
export const buildMiniRelatorioComparisonPrompt = (
  topicTitle: string,
  miniRelatorio: string
): string => {
  return buildFactsComparisonPrompt(topicTitle, miniRelatorio, 'mini-relatorio');
};

/**
 * Prompt para documentos completos
 */
export const buildDocumentosComparisonPrompt = (
  topicTitle: string,
  peticao: string,
  contestacao: string,
  impugnacao?: string
): string => {
  let content = '';

  if (peticao) {
    content += `### PETIÇÃO INICIAL:\n${peticao}\n\n`;
  }

  if (contestacao) {
    content += `### CONTESTAÇÃO:\n${contestacao}\n\n`;
  }

  if (impugnacao) {
    content += `### IMPUGNAÇÃO À CONTESTAÇÃO:\n${impugnacao}\n\n`;
  }

  if (!content.trim()) {
    content = '(Nenhum documento disponível)';
  }

  return buildFactsComparisonPrompt(topicTitle, content, 'documentos-completos');
};

export default {
  buildFactsComparisonPrompt,
  buildMiniRelatorioComparisonPrompt,
  buildDocumentosComparisonPrompt
};

/**
 * @file synthesis.ts
 * @description Prompts para geração de síntese do processo
 */

// ═══════════════════════════════════════════════════════════════════════════
// PROMPTS DE SÍNTESE
// ═══════════════════════════════════════════════════════════════════════════

export const SYNTHESIS_SYSTEM_PROMPT = `Você é um assistente jurídico especializado em Direito do Trabalho.
Sua tarefa é resumir os pedidos de um processo trabalhista em uma única linha concisa.`;

export const SYNTHESIS_USER_PROMPT = `Com base nos pedidos abaixo, gere uma síntese RESUMIDA em uma única linha.

REGRAS:
1. Use barras (/) ou ponto e vírgula (;) para separar os temas
2. Abrevie termos comuns: "verbas rescisórias" → "verbas resc", "horas extras" → "HE"
3. Agrupe pedidos relacionados
4. Use abreviações conhecidas: "467 e 477" para multas CLT, "FGTS + 40%"
5. Máximo 150 caracteres
6. NÃO use aspas na resposta
7. Responda APENAS com a síntese, sem explicações

EXEMPLOS:
- Vínculo / verbas resc / 467 e 477 / diferenças salário mínimo / intrajornada
- Reversão justa causa / estabilidade CIPA / dano moral
- HE 50% e 100% / intrajornada / adicional noturno / vale transporte

PEDIDOS DO PROCESSO:
{PEDIDOS}

SÍNTESE:`;

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Constrói o prompt de síntese com os pedidos do processo
 * @param pedidos - Array de pedidos com tema e descrição
 * @returns Prompt formatado para o modelo
 */
export const buildSynthesisPrompt = (
  pedidos: Array<{ tema: string; descricao: string }>
): string => {
  const pedidosText = pedidos
    .map((p, i) => `${i + 1}. ${p.tema}: ${p.descricao}`)
    .join('\n');
  return SYNTHESIS_USER_PROMPT.replace('{PEDIDOS}', pedidosText);
};

/**
 * @file voice-improvement-prompt.ts
 * @description Prompt para melhoria de texto ditado por voz com IA
 * @version 1.37.90
 */

/** Prompt base para melhoria de texto ditado */
export const VOICE_IMPROVEMENT_PROMPT = `Você é um assistente de transcrição. Melhore o texto ditado abaixo tornando-o fluido e gramaticalmente correto, mantendo o significado original.

REGRAS OBRIGATÓRIAS:
- Corrija erros de pontuação
- Ajuste concordância verbal/nominal
- Torne frases mais fluidas
- NÃO adicione informações novas
- NÃO mude o significado
- Mantenha termos técnicos/jurídicos exatamente como estão
- Responda APENAS com o texto melhorado, sem explicações

TEXTO DITADO:
{rawText}

TEXTO MELHORADO:`;

/**
 * Constrói o prompt de melhoria de voz com o texto ditado
 * @param rawText - Texto bruto do reconhecimento de voz
 * @returns Prompt completo para enviar à API
 */
export function buildVoiceImprovementPrompt(rawText: string): string {
  return VOICE_IMPROVEMENT_PROMPT.replace('{rawText}', rawText);
}

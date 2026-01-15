/**
 * @file useResultadoDetection.ts
 * @description Hook para detecção automática de resultado do julgamento usando IA
 * @version 1.37.58
 */

import { useCallback } from 'react';
import { AI_PROMPTS } from '../prompts';
import { htmlToPlainText } from '../utils/html-conversion';

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════════

export type ResultadoValido =
  | 'PROCEDENTE'
  | 'IMPROCEDENTE'
  | 'PARCIALMENTE PROCEDENTE'
  | 'ACOLHIDO'
  | 'REJEITADO'
  | 'SEM RESULTADO';

interface AIIntegration {
  callAI: (
    messages: Array<{ role: string; content: Array<{ type: string; text: string }> }>,
    options?: {
      maxTokens?: number;
      useInstructions?: boolean;
      logMetrics?: boolean;
      temperature?: number;
      topP?: number;
      topK?: number;
    }
  ) => Promise<string>;
}

interface UseResultadoDetectionProps {
  aiIntegration: AIIntegration;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════════

const RESULTADOS_VALIDOS: ResultadoValido[] = [
  'PROCEDENTE',
  'IMPROCEDENTE',
  'PARCIALMENTE PROCEDENTE',
  'ACOLHIDO',
  'REJEITADO',
  'SEM RESULTADO'
];

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Hook para detecção automática de resultado do julgamento
 *
 * @example
 * const { detectResultadoAutomatico } = useResultadoDetection({ aiIntegration });
 * const resultado = await detectResultadoAutomatico('HORAS EXTRAS', '<p>Defiro...</p>', 'MÉRITO');
 */
export default function useResultadoDetection({ aiIntegration }: UseResultadoDetectionProps) {

  /**
   * Detecta automaticamente o resultado do julgamento usando IA
   *
   * @param topicTitle - Título do tópico
   * @param decisionText - Texto HTML da decisão
   * @param topicCategory - Categoria do tópico (PRELIMINAR, MÉRITO, etc.)
   * @returns Resultado detectado ou null se indefinido/erro
   */
  const detectResultadoAutomatico = useCallback(async (
    topicTitle: string,
    decisionText: string,
    topicCategory: string
  ): Promise<ResultadoValido | null> => {
    // Não detectar para RELATÓRIO e DISPOSITIVO
    if (topicTitle.toUpperCase() === 'RELATÓRIO' || topicTitle.toUpperCase() === 'DISPOSITIVO') {
      return null;
    }

    // Se não há texto de decisão, não detectar
    if (!decisionText || decisionText.trim() === '') {
      return null;
    }

    try {
      const plainText = htmlToPlainText(decisionText);

      const prompt = `${AI_PROMPTS.roles.classificacao}

TÓPICO SENDO ANALISADO:
Título: ${topicTitle}
Categoria: ${topicCategory || 'Não especificada'}

TEXTO DA DECISÃO ESCRITA PELO USUÁRIO:
${plainText}

TAREFA:
Analise o texto da decisão e identifique o resultado do julgamento.

OPÇÕES POSSÍVEIS (escolha UMA):
1. PROCEDENTE - quando o pedido foi totalmente deferido/acolhido
2. IMPROCEDENTE - quando o pedido foi totalmente indeferido/rejeitado
3. PARCIALMENTE PROCEDENTE - quando o pedido foi parcialmente deferido
4. ACOLHIDO - quando uma preliminar, exceção ou questão processual foi acolhida
5. REJEITADO - quando uma preliminar, exceção ou questão processual foi rejeitada
6. SEM RESULTADO - para tópicos administrativos/acessórios sem julgamento de mérito
7. INDEFINIDO - quando o texto não deixa claro o resultado ou está incompleto

CRITÉRIOS DE ANÁLISE:
- Procure por palavras-chave como: "defiro", "indefiro", "julgo procedente", "julgo improcedente", "parcialmente", "acolho", "rejeito"
- Considere o contexto geral do texto
- Se a categoria for PRELIMINAR, prefira ACOLHIDO/REJEITADO
- Se a categoria for MÉRITO, prefira PROCEDENTE/IMPROCEDENTE/PARCIALMENTE PROCEDENTE
- Se o tópico tratar de deduções previdenciárias, prazos e condições para cumprimento da decisão, juros ou correção monetária, retorne SEM RESULTADO
- Se houver dúvida ou o texto estiver incompleto, retorne INDEFINIDO

Responda APENAS com uma das palavras: PROCEDENTE, IMPROCEDENTE, PARCIALMENTE PROCEDENTE, ACOLHIDO, REJEITADO, SEM RESULTADO ou INDEFINIDO.
Não adicione explicações, pontos finais ou outros caracteres. Apenas a palavra.`;

      // Parâmetros determinísticos para classificação
      const textContent = await aiIntegration.callAI([{
        role: 'user',
        content: [{ type: 'text', text: prompt }]
      }], {
        maxTokens: 500,
        useInstructions: false,
        logMetrics: true,
        temperature: 0.0,
        topP: 0.9,
        topK: 20
      });

      const resultado = textContent.toUpperCase().trim();

      // Validar resultado
      if (RESULTADOS_VALIDOS.includes(resultado as ResultadoValido)) {
        return resultado as ResultadoValido;
      }

      // INDEFINIDO retorna null para não sobrescrever escolha manual
      if (resultado === 'INDEFINIDO') {
        return null;
      }

      return null;

    } catch (error) {
      console.error('[useResultadoDetection] Erro ao detectar resultado:', error);
      return null;
    }
  }, [aiIntegration]);

  return { detectResultadoAutomatico };
}

export { useResultadoDetection };

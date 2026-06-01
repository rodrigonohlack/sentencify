/**
 * @file pjeArtifacts.ts
 * @description Remoção de artefatos do PJe que a extração de texto de PDF
 * (pdf.js / Tesseract) injeta no MEIO de frases. Fonte única da verdade do
 * padrão do rodapé de assinatura — reusado pela extração (useDocumentServices)
 * e pela verificação de fontes (sourceMatching.normalizeForMatch).
 */

/**
 * Rodapé de assinatura eletrônica do PJe, ex.:
 * "Documento assinado eletronicamente por FULANO, em 18/03/2026, às 11:15:27 - 85cb794".
 * Quando uma frase cruza a quebra de página, o extrator de texto insere esse
 * rodapé no meio dela. Como nunca faz parte do conteúdo real, é removido.
 */
export const PJE_ASSINATURA = /(?:documento\s+)?assinado eletronicamente por[\s\S]*?\d{1,2}:\d{2}:\d{2}(?:\s*[-–—]\s*\w+)?/gi;

/**
 * Remove o rodapé de assinatura do PJe PRESERVANDO o texto legível (maiúsculas,
 * acentos, pontuação e quebras de linha). Diferente de `normalizeForMatch`, que é
 * destrutivo e serve só para comparação — este aqui é seguro para o texto que vai
 * à LLM e fica armazenado. Substitui o rodapé por um espaço (para as duas metades
 * da frase não colarem) e colapsa apenas espaços horizontais redundantes.
 */
export function cleanPjeArtifacts(text: string): string {
  return (text || '')
    .replace(PJE_ASSINATURA, ' ')
    .replace(/[ \t]{2,}/g, ' ');
}

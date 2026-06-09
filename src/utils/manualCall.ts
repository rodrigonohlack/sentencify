import type { AIProvider, AIMessage, AIMessageContent } from '../types';

/** Lançado quando o modo manual recebe conteúdo que não consegue serializar (ex.: PDF binário). */
export class ManualUnsupportedError extends Error {
  constructor(message = 'Este recurso não está disponível no modo Sem Provider (requer provider real).') {
    super(message);
    this.name = 'ManualUnsupportedError';
  }
}

/** Lançado quando o usuário cancela o modal manual. */
export class ManualCancelledError extends Error {
  constructor(message = 'Operação cancelada.') {
    super(message);
    this.name = 'ManualCancelledError';
  }
}

/** PDF binário só é aceito por providers que o suportam. Manual e Grok exigem texto extraído. */
export function isPdfBinaryAllowed(provider: AIProvider): boolean {
  return provider !== 'manual' && provider !== 'grok';
}

/** Extrai o texto de um bloco de conteúdo; lança em blocos binários (document/image). */
function blockToText(block: AIMessageContent): string {
  if (typeof block === 'string') return block;
  if (block && typeof block === 'object' && 'type' in block) {
    if (block.type === 'text') return block.text ?? '';
    // document / image / qualquer binário
    throw new ManualUnsupportedError();
  }
  return '';
}

/**
 * Monta um prompt único, copiável e autossuficiente: instruções de sistema (se aplicável)
 * + texto de todas as mensagens. Lança ManualUnsupportedError se houver bloco binário.
 */
export function serializeForManual(
  messages: AIMessage[],
  options: { useInstructions?: boolean },
  getAiInstructions: () => Array<{ type: 'text'; text: string }>,
): string {
  const parts: string[] = [];

  if (options.useInstructions !== false) {
    const instr = getAiInstructions();
    const instrText = instr.map((b) => b.text).join('\n\n').trim();
    if (instrText) parts.push(instrText);
  }

  for (const msg of messages) {
    const content = msg.content;
    if (typeof content === 'string') {
      parts.push(content);
    } else if (Array.isArray(content)) {
      for (const block of content) parts.push(blockToText(block));
    }
  }

  return parts.filter((p) => p && p.trim()).join('\n\n').trim();
}

/** Remove cercas markdown (```json / ```) e espaços externos da resposta colada. */
export function normalizeManualResponse(raw: string): string {
  let text = (raw ?? '').trim();
  const fence = /^```[a-zA-Z0-9]*\s*\n?([\s\S]*?)\n?```$/;
  const m = text.match(fence);
  if (m) text = m[1].trim();
  return text;
}

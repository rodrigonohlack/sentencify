import type { AIProvider } from '../types';

/**
 * Mensagem mínima que o serializer manual entende. `content` é `unknown` de propósito:
 * cobre tanto o AIMessage de `types/index.ts` (app principal) quanto o de `types/ai.ts`
 * (subapps) sem casts; o conteúdo é estreitado em runtime (só lemos `type` e `text`).
 */
export interface SerializableMessage {
  role?: string;
  content: unknown;
}

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
function blockToText(block: unknown): string {
  if (typeof block === 'string') return block;
  if (block && typeof block === 'object') {
    const b = block as { type?: string; text?: string };
    if (b.type === 'text' || (b.type == null && typeof b.text === 'string')) {
      return b.text ?? '';
    }
    // document / image / qualquer binário sem texto
    throw new ManualUnsupportedError();
  }
  return '';
}

/**
 * Monta um prompt único, copiável e autossuficiente: instruções de sistema
 * (de `options.systemPrompt` — usado pelos subapps — e/ou de `getAiInstructions()`
 * — usado pelo app principal) + texto de todas as mensagens.
 * Lança ManualUnsupportedError se houver bloco binário.
 */
export function serializeForManual(
  messages: SerializableMessage[],
  options: { useInstructions?: boolean; systemPrompt?: string | null },
  getAiInstructions: () => Array<{ text: string }>,
): string {
  const parts: string[] = [];

  // Subapps passam o sistema via options.systemPrompt; o app principal via getAiInstructions.
  if (options.systemPrompt && options.systemPrompt.trim()) {
    parts.push(options.systemPrompt.trim());
  }
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
    } else if (content) {
      // content pode ser um único bloco (não-array), como no AIMessage do app principal
      parts.push(blockToText(content));
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

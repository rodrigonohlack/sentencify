/**
 * @file retry.ts
 * @description Utilitarios de retry com backoff para chamadas de API
 * @version v1.39.03
 */

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

export interface RetryOptions {
  /** Numero maximo de tentativas (default: 3) */
  maxRetries?: number;
  /** Delay inicial em ms (default: 5000) */
  initialDelayMs?: number;
  /** Tipo de backoff: 'exponential' ou 'linear' (default: 'exponential') */
  backoffType?: 'exponential' | 'linear';
  /** Multiplicador para backoff exponencial (default: 2) */
  backoffMultiplier?: number;
  /** Timeout em ms para cada tentativa (opcional) */
  timeoutMs?: number;
  /** AbortSignal para cancelamento (opcional) */
  abortSignal?: AbortSignal | null;
  /** Status codes HTTP que disparam retry (default: RETRYABLE_STATUS_CODES) */
  retryableStatusCodes?: number[];
  /** Mensagens de erro que disparam retry (default: RETRYABLE_ERROR_MESSAGES) */
  retryableMessages?: string[];
  /** Callback chamado antes de cada retry */
  onRetry?: (attempt: number, error: Error, delayMs: number) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════

/** Status codes HTTP que indicam retry (rate limit, overload, server errors) */
export const RETRYABLE_STATUS_CODES = [429, 500, 502, 503, 520, 529] as const;

/** Mensagens de erro que indicam retry */
export const RETRYABLE_ERROR_MESSAGES = [
  'Timeout',
  'rate limit',
  'Overloaded',
  'Failed to fetch',
  'parsear resposta',
] as const;

/** Configuracao padrao para APIs de IA (Claude, Gemini, OpenAI, Grok) */
export const AI_RETRY_DEFAULTS: Required<Omit<RetryOptions, 'abortSignal' | 'onRetry'>> = {
  maxRetries: 3,
  initialDelayMs: 5000,
  backoffType: 'exponential',
  backoffMultiplier: 2,
  timeoutMs: 180000,
  retryableStatusCodes: [...RETRYABLE_STATUS_CODES],
  retryableMessages: [...RETRYABLE_ERROR_MESSAGES],
} as const;

/** Configuracao para IndexedDB/storage (mais rapido) */
export const STORAGE_RETRY_DEFAULTS: Required<Omit<RetryOptions, 'abortSignal' | 'onRetry'>> = {
  maxRetries: 3,
  initialDelayMs: 1000,
  backoffType: 'exponential',
  backoffMultiplier: 2,
  timeoutMs: 30000,
  retryableStatusCodes: [],
  retryableMessages: [],
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// FUNCOES INTERNAS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calcula delay para proxima tentativa
 */
function calculateDelay(
  attempt: number,
  initialDelayMs: number,
  backoffType: 'exponential' | 'linear',
  multiplier: number
): number {
  if (backoffType === 'linear') {
    return initialDelayMs * (attempt + 1);
  }
  return initialDelayMs * Math.pow(multiplier, attempt);
}

/**
 * Verifica se erro e retryable baseado em status code ou mensagem
 */
function isRetryableError(
  error: Error & { status?: number },
  retryableStatusCodes: number[],
  retryableMessages: string[]
): boolean {
  // Verificar status code
  if (error.status && retryableStatusCodes.includes(error.status)) {
    return true;
  }

  // Verificar status code na mensagem (ex: "HTTP 429")
  const statusInMessage = retryableStatusCodes.some(code =>
    error.message?.includes(String(code))
  );
  if (statusInMessage) {
    return true;
  }

  // Verificar mensagens de erro conhecidas
  return retryableMessages.some(msg =>
    error.message?.toLowerCase().includes(msg.toLowerCase())
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNCAO PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Executa funcao com retry e backoff configuravel
 *
 * @example
 * // Chamada de API com defaults para IA
 * const result = await withRetry(() => fetch(url), AI_RETRY_DEFAULTS);
 *
 * @example
 * // Com abort signal e timeout customizado
 * const result = await withRetry(
 *   () => callLLM(prompt),
 *   { ...AI_RETRY_DEFAULTS, timeoutMs: 300000, abortSignal: controller.signal }
 * );
 *
 * @example
 * // Backoff linear para OpenAI/Grok
 * const result = await withRetry(
 *   () => callOpenAI(messages),
 *   { ...AI_RETRY_DEFAULTS, backoffType: 'linear' }
 * );
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 5000,
    backoffType = 'exponential',
    backoffMultiplier = 2,
    timeoutMs,
    abortSignal,
    retryableStatusCodes = [...RETRYABLE_STATUS_CODES],
    retryableMessages = [...RETRYABLE_ERROR_MESSAGES],
    onRetry,
  } = options;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    // Verificar abort antes de cada tentativa
    if (abortSignal?.aborted) {
      throw new Error('Operacao cancelada pelo usuario');
    }

    try {
      // Executar com timeout se especificado
      if (timeoutMs) {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error(`Timeout: operacao nao completou em ${Math.round(timeoutMs / 1000)}s`)),
            timeoutMs
          )
        );
        return await Promise.race([fn(), timeoutPromise]);
      }
      return await fn();
    } catch (err) {
      const error = err as Error & { status?: number };
      const isLastAttempt = attempt === maxRetries - 1;

      // Se nao e retryable ou e ultima tentativa, lancar erro
      if (!isRetryableError(error, retryableStatusCodes, retryableMessages)) {
        throw error;
      }

      if (isLastAttempt) {
        throw new Error(`Falha apos ${maxRetries} tentativas: ${error.message}`);
      }

      // Calcular delay e aguardar
      const delay = calculateDelay(attempt, initialDelayMs, backoffType, backoffMultiplier);
      onRetry?.(attempt + 1, error, delay);
      await new Promise(resolve => setTimeout(resolve, delay));

      // Verificar abort apos delay
      if (abortSignal?.aborted) {
        throw new Error('Operacao cancelada pelo usuario');
      }
    }
  }

  throw new Error(`withRetry: maximo de ${maxRetries} tentativas excedido`);
}

/**
 * Wrapper simples para IndexedDB/storage operations
 * Usa STORAGE_RETRY_DEFAULTS e nao verifica mensagens/status codes
 */
export async function withStorageRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = STORAGE_RETRY_DEFAULTS.maxRetries
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      const delay = STORAGE_RETRY_DEFAULTS.initialDelayMs * Math.pow(STORAGE_RETRY_DEFAULTS.backoffMultiplier, i);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('withStorageRetry: max retries exceeded');
}

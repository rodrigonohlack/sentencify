import { create } from 'zustand';
import { ManualCancelledError, ManualUnsupportedError } from '../utils/manualCall';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

interface PendingCall {
  id: string;
  prompt: string;
  meta?: { title?: string };
  resolve: (text: string) => void;
  reject: (err: Error) => void;
}

interface ManualCallState {
  pending: PendingCall | null;
  enqueue: (prompt: string, meta?: { title?: string }) => Promise<string>;
  resolveCurrent: (text: string) => void;
  rejectCurrent: (reason?: Error) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTADOR INTERNO (fora do store — não serializável, apenas para IDs únicos)
// ═══════════════════════════════════════════════════════════════════════════

let counter = 0;

// ═══════════════════════════════════════════════════════════════════════════
// STORE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Broker para o modo "Sem Provider (copiar/colar)".
 *
 * Mantém uma única chamada pendente: o consumer enfileira um prompt via
 * `enqueue()` e aguarda a Promise. O modal lê `pending.prompt`, exibe para o
 * usuário copiar, e ao confirmar chama `resolveCurrent(texto)` — ou
 * `rejectCurrent()` se o usuário cancelar.
 *
 * Chamadas concorrentes (sem resolver a anterior) são rejeitadas com
 * `ManualUnsupportedError` para evitar estado inconsistente.
 *
 * Nota: não usa immer nem persist porque callbacks (resolve/reject) não são
 * serializáveis.
 */
export const useManualCallStore = create<ManualCallState>((set, get) => ({
  pending: null,

  /**
   * Enfileira um novo prompt manual.
   * Se já existe uma chamada pendente, rejeita a nova com ManualUnsupportedError.
   */
  enqueue: (prompt, meta) => {
    if (get().pending) {
      return Promise.reject(
        new ManualUnsupportedError('Já existe uma chamada manual em andamento.')
      );
    }
    return new Promise<string>((resolve, reject) => {
      counter += 1;
      set({ pending: { id: `manual-${counter}`, prompt, meta, resolve, reject } });
    });
  },

  /** Resolve a chamada pendente com o texto fornecido pelo usuário. */
  resolveCurrent: (text) => {
    const p = get().pending;
    if (!p) return;
    set({ pending: null });
    p.resolve(text);
  },

  /** Rejeita a chamada pendente. Usa ManualCancelledError por padrão. */
  rejectCurrent: (reason) => {
    const p = get().pending;
    if (!p) return;
    set({ pending: null });
    p.reject(reason ?? new ManualCancelledError());
  },
}));

/**
 * @file useRegenerationStore.ts
 * @description Store Zustand para estado de regeneração de relatório e dispositivo
 * @version 1.40.05
 *
 * Este store centraliza o estado de regeneração que antes era passado via props
 * através de múltiplos níveis de componentes (prop drilling).
 *
 * @usedBy DecisionEditorContainer, QuillMiniRelatorioEditor, GlobalEditorSection
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// ═══════════════════════════════════════════════════════════════════════════
// SEÇÃO 1: TIPOS
// ═══════════════════════════════════════════════════════════════════════════

/** Interface do estado do store */
interface RegenerationState {
  // ─────────────────────────────────────────────────────────────────────────
  // ESTADO - RELATÓRIO
  // ─────────────────────────────────────────────────────────────────────────

  /** Instrução customizada para regeneração do relatório */
  relatorioInstruction: string;

  /** Indica se está regenerando o relatório */
  regeneratingRelatorio: boolean;

  // ─────────────────────────────────────────────────────────────────────────
  // ESTADO - DISPOSITIVO
  // ─────────────────────────────────────────────────────────────────────────

  /** Instrução customizada para regeneração do dispositivo */
  dispositivoInstruction: string;

  /** Indica se está regenerando o dispositivo */
  regeneratingDispositivo: boolean;

  // ─────────────────────────────────────────────────────────────────────────
  // ESTADO - PROGRESSO (streaming)
  // ─────────────────────────────────────────────────────────────────────────

  /** Mensagem de progresso atual */
  progressMessage: string;

  // ─────────────────────────────────────────────────────────────────────────
  // ACTIONS - RELATÓRIO
  // ─────────────────────────────────────────────────────────────────────────

  /** Define instrução de regeneração do relatório */
  setRelatorioInstruction: (instruction: string) => void;

  /** Define estado de regeneração do relatório */
  setRegeneratingRelatorio: (regenerating: boolean) => void;

  // ─────────────────────────────────────────────────────────────────────────
  // ACTIONS - DISPOSITIVO
  // ─────────────────────────────────────────────────────────────────────────

  /** Define instrução de regeneração do dispositivo */
  setDispositivoInstruction: (instruction: string) => void;

  /** Define estado de regeneração do dispositivo */
  setRegeneratingDispositivo: (regenerating: boolean) => void;

  // ─────────────────────────────────────────────────────────────────────────
  // ACTIONS - PROGRESSO
  // ─────────────────────────────────────────────────────────────────────────

  /** Define mensagem de progresso */
  setProgressMessage: (message: string) => void;

  // ─────────────────────────────────────────────────────────────────────────
  // ACTIONS - RESET
  // ─────────────────────────────────────────────────────────────────────────

  /** Reseta instruções (limpa ao fechar editor) */
  resetInstructions: () => void;

  /** Reseta todo o estado */
  resetAll: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// SEÇÃO 2: STORE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Store de Regeneração - Gerencia estado de regeneração de relatório/dispositivo
 *
 * @example
 * // Uso básico
 * const { relatorioInstruction, setRelatorioInstruction } = useRegenerationStore();
 *
 * @example
 * // Com selector para evitar re-renders
 * const isRegenerating = useRegenerationStore((s) => s.regeneratingRelatorio);
 */
export const useRegenerationStore = create<RegenerationState>()(
  devtools(
    immer((set) => ({
      // ─────────────────────────────────────────────────────────────────────
      // ESTADO INICIAL
      // ─────────────────────────────────────────────────────────────────────
      relatorioInstruction: '',
      regeneratingRelatorio: false,
      dispositivoInstruction: '',
      regeneratingDispositivo: false,
      progressMessage: '',

      // ─────────────────────────────────────────────────────────────────────
      // ACTIONS - RELATÓRIO
      // ─────────────────────────────────────────────────────────────────────

      setRelatorioInstruction: (instruction) =>
        set(
          (state) => {
            state.relatorioInstruction = instruction;
          },
          false,
          'setRelatorioInstruction'
        ),

      setRegeneratingRelatorio: (regenerating) =>
        set(
          (state) => {
            state.regeneratingRelatorio = regenerating;
          },
          false,
          `setRegeneratingRelatorio/${regenerating}`
        ),

      // ─────────────────────────────────────────────────────────────────────
      // ACTIONS - DISPOSITIVO
      // ─────────────────────────────────────────────────────────────────────

      setDispositivoInstruction: (instruction) =>
        set(
          (state) => {
            state.dispositivoInstruction = instruction;
          },
          false,
          'setDispositivoInstruction'
        ),

      setRegeneratingDispositivo: (regenerating) =>
        set(
          (state) => {
            state.regeneratingDispositivo = regenerating;
          },
          false,
          `setRegeneratingDispositivo/${regenerating}`
        ),

      // ─────────────────────────────────────────────────────────────────────
      // ACTIONS - PROGRESSO
      // ─────────────────────────────────────────────────────────────────────

      setProgressMessage: (message) =>
        set(
          (state) => {
            state.progressMessage = message;
          },
          false,
          'setProgressMessage'
        ),

      // ─────────────────────────────────────────────────────────────────────
      // ACTIONS - RESET
      // ─────────────────────────────────────────────────────────────────────

      resetInstructions: () =>
        set(
          (state) => {
            state.relatorioInstruction = '';
            state.dispositivoInstruction = '';
          },
          false,
          'resetInstructions'
        ),

      resetAll: () =>
        set(
          (state) => {
            state.relatorioInstruction = '';
            state.regeneratingRelatorio = false;
            state.dispositivoInstruction = '';
            state.regeneratingDispositivo = false;
            state.progressMessage = '';
          },
          false,
          'resetAll'
        ),
    })),
    { name: 'RegenerationStore' }
  )
);

// ═══════════════════════════════════════════════════════════════════════════
// SEÇÃO 3: SELECTORS
// ═══════════════════════════════════════════════════════════════════════════

/** Selector: Retorna instrução de regeneração do relatório */
export const selectRelatorioInstruction = (state: RegenerationState): string =>
  state.relatorioInstruction;

/** Selector: Verifica se está regenerando relatório */
export const selectRegeneratingRelatorio = (state: RegenerationState): boolean =>
  state.regeneratingRelatorio;

/** Selector: Retorna instrução de regeneração do dispositivo */
export const selectDispositivoInstruction = (state: RegenerationState): string =>
  state.dispositivoInstruction;

/** Selector: Verifica se está regenerando dispositivo */
export const selectRegeneratingDispositivo = (state: RegenerationState): boolean =>
  state.regeneratingDispositivo;

/** Selector: Verifica se alguma regeneração está em andamento */
export const selectIsRegenerating = (state: RegenerationState): boolean =>
  state.regeneratingRelatorio || state.regeneratingDispositivo;

/** Selector: Retorna mensagem de progresso */
export const selectProgressMessage = (state: RegenerationState): string =>
  state.progressMessage;

export default useRegenerationStore;

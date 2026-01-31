/**
 * @file useEditorStore.ts
 * @description Store Zustand para configurações do editor Quill (tema, fonte, espaçamento, estado)
 * @version 1.40.05
 *
 * Este store centraliza o estado do editor que antes era passado via props
 * através de múltiplos níveis de componentes (prop drilling).
 *
 * @usedBy DecisionEditorContainer, GlobalEditorSection, QuillEditors
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// ═══════════════════════════════════════════════════════════════════════════
// SEÇÃO 1: TIPOS
// ═══════════════════════════════════════════════════════════════════════════

/** Tamanho da fonte do editor */
export type EditorFontSize = 'small' | 'normal' | 'large';

/** Espaçamento entre linhas do editor */
export type EditorSpacing = 'compact' | 'normal' | 'wide';

/** Tema do editor */
export type EditorTheme = 'dark' | 'light';

/** Interface do estado do store */
interface EditorState {
  // ─────────────────────────────────────────────────────────────────────────
  // ESTADO - TEMA E CONFIGURAÇÕES VISUAIS
  // ─────────────────────────────────────────────────────────────────────────

  /** Tema atual do editor (dark/light) */
  editorTheme: EditorTheme;

  /** Tamanho da fonte do editor */
  fontSize: EditorFontSize;

  /** Espaçamento entre linhas */
  spacing: EditorSpacing;

  // ─────────────────────────────────────────────────────────────────────────
  // ESTADO - QUILL READY STATE
  // ─────────────────────────────────────────────────────────────────────────

  /** Indica se o Quill está pronto para uso */
  quillReady: boolean;

  /** Erro de inicialização do Quill, se houver */
  quillError: Error | string | null;

  // ─────────────────────────────────────────────────────────────────────────
  // ESTADO - DIRTY/UNSAVED STATE
  // ─────────────────────────────────────────────────────────────────────────

  /** Indica se há alterações não salvas */
  isDirty: boolean;

  // ─────────────────────────────────────────────────────────────────────────
  // ACTIONS - TEMA E CONFIGURAÇÕES
  // ─────────────────────────────────────────────────────────────────────────

  /** Alterna entre tema dark e light */
  toggleEditorTheme: () => void;

  /** Define o tema do editor */
  setEditorTheme: (theme: EditorTheme) => void;

  /** Define o tamanho da fonte */
  setFontSize: (size: EditorFontSize) => void;

  /** Define o espaçamento */
  setSpacing: (spacing: EditorSpacing) => void;

  // ─────────────────────────────────────────────────────────────────────────
  // ACTIONS - QUILL STATE
  // ─────────────────────────────────────────────────────────────────────────

  /** Define se o Quill está pronto */
  setQuillReady: (ready: boolean) => void;

  /** Define erro do Quill */
  setQuillError: (error: Error | string | null) => void;

  // ─────────────────────────────────────────────────────────────────────────
  // ACTIONS - DIRTY STATE
  // ─────────────────────────────────────────────────────────────────────────

  /** Define se há alterações não salvas */
  setIsDirty: (dirty: boolean) => void;

  // ─────────────────────────────────────────────────────────────────────────
  // ACTIONS - RESET
  // ─────────────────────────────────────────────────────────────────────────

  /** Reseta estado efêmero (quillReady, quillError, isDirty) */
  resetEphemeralState: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// SEÇÃO 2: STORE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Store de Editor - Gerencia configurações do Quill
 *
 * @example
 * // Uso básico
 * const { editorTheme, toggleEditorTheme } = useEditorStore();
 *
 * @example
 * // Com selector para evitar re-renders
 * const fontSize = useEditorStore((s) => s.fontSize);
 */
export const useEditorStore = create<EditorState>()(
  devtools(
    persist(
      immer((set) => ({
        // ─────────────────────────────────────────────────────────────────────
        // ESTADO INICIAL
        // ─────────────────────────────────────────────────────────────────────
        editorTheme: 'dark',
        fontSize: 'normal',
        spacing: 'normal',
        quillReady: false,
        quillError: null,
        isDirty: false,

        // ─────────────────────────────────────────────────────────────────────
        // ACTIONS - TEMA E CONFIGURAÇÕES
        // ─────────────────────────────────────────────────────────────────────

        toggleEditorTheme: () =>
          set(
            (state) => {
              state.editorTheme = state.editorTheme === 'dark' ? 'light' : 'dark';
            },
            false,
            'toggleEditorTheme'
          ),

        setEditorTheme: (theme) =>
          set(
            (state) => {
              state.editorTheme = theme;
            },
            false,
            `setEditorTheme/${theme}`
          ),

        setFontSize: (size) =>
          set(
            (state) => {
              state.fontSize = size;
            },
            false,
            `setFontSize/${size}`
          ),

        setSpacing: (spacing) =>
          set(
            (state) => {
              state.spacing = spacing;
            },
            false,
            `setSpacing/${spacing}`
          ),

        // ─────────────────────────────────────────────────────────────────────
        // ACTIONS - QUILL STATE
        // ─────────────────────────────────────────────────────────────────────

        setQuillReady: (ready) =>
          set(
            (state) => {
              state.quillReady = ready;
            },
            false,
            `setQuillReady/${ready}`
          ),

        setQuillError: (error) =>
          set(
            (state) => {
              state.quillError = error;
            },
            false,
            'setQuillError'
          ),

        // ─────────────────────────────────────────────────────────────────────
        // ACTIONS - DIRTY STATE
        // ─────────────────────────────────────────────────────────────────────

        setIsDirty: (dirty) =>
          set(
            (state) => {
              state.isDirty = dirty;
            },
            false,
            `setIsDirty/${dirty}`
          ),

        // ─────────────────────────────────────────────────────────────────────
        // ACTIONS - RESET
        // ─────────────────────────────────────────────────────────────────────

        resetEphemeralState: () =>
          set(
            (state) => {
              state.quillReady = false;
              state.quillError = null;
              state.isDirty = false;
            },
            false,
            'resetEphemeralState'
          ),
      })),
      {
        name: 'editor-store',
        // Apenas persistir preferências do usuário, não estado efêmero
        partialize: (state) => ({
          editorTheme: state.editorTheme,
          fontSize: state.fontSize,
          spacing: state.spacing,
        }),
      }
    ),
    { name: 'EditorStore' }
  )
);

// ═══════════════════════════════════════════════════════════════════════════
// SEÇÃO 3: SELECTORS
// ═══════════════════════════════════════════════════════════════════════════

/** Selector: Retorna tema do editor */
export const selectEditorTheme = (state: EditorState): EditorTheme =>
  state.editorTheme;

/** Selector: Retorna tamanho da fonte */
export const selectFontSize = (state: EditorState): EditorFontSize =>
  state.fontSize;

/** Selector: Retorna espaçamento */
export const selectSpacing = (state: EditorState): EditorSpacing =>
  state.spacing;

/** Selector: Verifica se Quill está pronto */
export const selectQuillReady = (state: EditorState): boolean =>
  state.quillReady;

/** Selector: Retorna erro do Quill */
export const selectQuillError = (state: EditorState): Error | string | null =>
  state.quillError;

/** Selector: Verifica se há alterações não salvas */
export const selectIsDirty = (state: EditorState): boolean =>
  state.isDirty;

export default useEditorStore;

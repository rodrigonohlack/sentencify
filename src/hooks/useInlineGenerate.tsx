/**
 * @file useInlineGenerate.ts
 * @description Geração inline de redação com IA no editor da decisão (Ctrl+K)
 * @version 1.51.0
 *
 * Substitui o antigo Auto Complete (ghost-text automático). Agora o fluxo é explícito:
 *
 *  1. Ctrl+K no campo da decisão → abre um card de instrução ancorado no cursor.
 *  2. O usuário descreve a redação e dá Enter. A IA recebe como contexto o mini-relatório,
 *     TODO o texto acima do cursor e as provas vinculadas (respeitando "Enviar conteúdo
 *     completo à IA") — a montagem do contexto fica em `generate` (GlobalEditorModal).
 *  3. O texto aparece em preview (streaming ao vivo nos providers de API; de uma vez nos
 *     providers CLI, que não emitem chunks).
 *  4. Tab/Enter insere no ponto do cursor; Esc descarta.
 *
 * Durante a geração/preview o editor é desabilitado (quill.enable(false)) para o índice do
 * cursor não mudar. O texto é inserido via clipboard.dangerouslyPasteHTML preservando parágrafos.
 */

import React from 'react';
import { normalizeHTMLSpacing } from '../utils/text';
import { sanitizeHTML } from '../utils/sanitizeHTML';
import { stripInlineColors } from '../utils/color-stripper';
import { InlineGeneratePopover, type InlineGenerateMode } from '../components/editors/InlineGeneratePopover';
import type { QuillInstance, InlineGenerateFn } from '../types';

export interface UseInlineGenerateOptions {
  /** Se a geração inline (Ctrl+K) está habilitada */
  enabled: boolean;
  /** Monta o contexto e chama a IA com streaming (vem do GlobalEditorModal) */
  generate?: InlineGenerateFn;
  /** Tema do editor (claro/escuro) */
  editorTheme: 'dark' | 'light' | string;
  /** Se o Quill já foi inicializado */
  quillReady: boolean;
  /** v1.51.2: se o ditado por voz deve passar pela melhoria por IA (flag de Voz) */
  voiceImproveEnabled?: boolean;
  /** v1.51.2: função de melhoria do texto ditado */
  onImproveVoice?: (text: string) => Promise<string>;
}

type PopoverState = 'closed' | InlineGenerateMode;

/**
 * Hook de geração inline com IA (Ctrl+K).
 *
 * @param quillRef - Ref ao QuillInstance (pode ser null até o Quill inicializar)
 * @param options - Configuração (enabled, generate, tema, quillReady)
 * @returns `{ overlay }` — node React (popover via portal) a ser renderizado pelo FieldEditor
 */
export function useInlineGenerate(
  quillRef: React.MutableRefObject<QuillInstance | null>,
  options: UseInlineGenerateOptions
): { overlay: React.ReactNode } {
  const { enabled, generate, editorTheme, quillReady, voiceImproveEnabled, onImproveVoice } = options;

  const [mode, setMode] = React.useState<PopoverState>('closed');
  const [anchor, setAnchor] = React.useState<{ top: number; left: number; lineTop: number }>({ top: 0, left: 0, lineTop: 0 });
  const [preview, setPreview] = React.useState('');
  const [error, setError] = React.useState('');

  // Refs com valores correntes para uso dentro de closures estáveis
  const cursorIdxRef = React.useRef<number>(0);
  const previewRef = React.useRef<string>('');
  const abortRef = React.useRef<AbortController | null>(null);
  const generateRef = React.useRef(generate);
  const enabledRef = React.useRef(enabled);

  React.useEffect(() => { generateRef.current = generate; }, [generate]);
  React.useEffect(() => { enabledRef.current = enabled; }, [enabled]);
  React.useEffect(() => { previewRef.current = preview; }, [preview]);

  // ─────────────────────────────────────────────────────────────────────────
  // Encerramento / limpeza
  // ─────────────────────────────────────────────────────────────────────────

  const close = React.useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    const quill = quillRef.current;
    if (quill) {
      try { quill.enable(true); } catch { /* noop */ }
    }
    setMode('closed');
    setPreview('');
    setError('');
    previewRef.current = '';
  }, [quillRef]);

  // ─────────────────────────────────────────────────────────────────────────
  // Abre o card ancorado no cursor
  // ─────────────────────────────────────────────────────────────────────────

  const openAtCursor = React.useCallback(() => {
    const quill = quillRef.current;
    if (!quill) return;

    const range = quill.getSelection();
    const idx = range ? range.index : Math.max(0, quill.getLength() - 1);
    cursorIdxRef.current = idx;

    const bounds = quill.getBounds(idx, 0);
    const containerRect = quill.root.parentElement?.getBoundingClientRect();
    const baseTop = containerRect?.top ?? 0;
    setAnchor({
      top: baseTop + bounds.bottom,
      lineTop: baseTop + bounds.top,
      left: (containerRect?.left ?? 0) + bounds.left,
    });
    setPreview('');
    setError('');
    previewRef.current = '';
    setMode('input');
  }, [quillRef]);

  // ─────────────────────────────────────────────────────────────────────────
  // Submeter instrução → gerar (streaming quando disponível)
  // ─────────────────────────────────────────────────────────────────────────

  const handleSubmit = React.useCallback(async (instruction: string) => {
    const quill = quillRef.current;
    if (!quill || !generateRef.current) return;

    const idx = cursorIdxRef.current;
    const prefix = quill.getText(0, idx);
    const suffix = quill.getText(idx);  // v1.51.2: texto ABAIXO do cursor (fill-in-the-middle)

    setPreview('');
    previewRef.current = '';
    setError('');
    setMode('generating');

    // Trava a edição para o índice do cursor não mudar durante a geração
    try { quill.enable(false); } catch { /* noop */ }

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const result = await generateRef.current(instruction, prefix, {
        onChunk: (full) => {
          if (controller.signal.aborted) return;
          previewRef.current = full;
          setPreview(full);
        },
        signal: controller.signal,
        suffixText: suffix,
      });

      if (controller.signal.aborted) return;

      const finalText = (result || '').trim();
      if (!finalText) {
        close();
        return;
      }
      previewRef.current = finalText;
      setPreview(finalText);
      setMode('preview');
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        return; // cancelamento já tratado em close()
      }
      // Reabilita a edição e mostra o erro mantendo o card aberto para nova tentativa
      try { quill.enable(true); } catch { /* noop */ }
      setError('Erro ao gerar: ' + (err as Error).message);
      setMode('input');
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  }, [quillRef, close]);

  // ─────────────────────────────────────────────────────────────────────────
  // Aceitar → inserir HTML no ponto do cursor
  // ─────────────────────────────────────────────────────────────────────────

  const accept = React.useCallback(() => {
    const quill = quillRef.current;
    const text = previewRef.current;
    if (!quill || !text) {
      close();
      return;
    }

    try { quill.enable(true); } catch { /* noop */ }

    const idx = cursorIdxRef.current;
    const html = stripInlineColors(sanitizeHTML(normalizeHTMLSpacing(text)) || '');
    // Mede o tamanho antes/depois para posicionar o cursor logo após o trecho inserido
    // (getText(idx) contaria também o que já existia depois do cursor → iria pro fim do doc).
    const lengthBefore = quill.getLength();
    quill.clipboard.dangerouslyPasteHTML(idx, html);
    try {
      const insertedLen = quill.getLength() - lengthBefore;
      quill.setSelection(Math.min(idx + insertedLen, quill.getLength()), 0);
    } catch { /* noop */ }
    try { quill.focus(); } catch { /* noop */ }

    setMode('closed');
    setPreview('');
    setError('');
    previewRef.current = '';
  }, [quillRef, close]);

  // ─────────────────────────────────────────────────────────────────────────
  // Atalho Ctrl+K (capture phase, antes do Quill processar)
  // ─────────────────────────────────────────────────────────────────────────

  React.useEffect(() => {
    if (!enabled || !quillReady) return;
    const quill = quillRef.current;
    if (!quill) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        if (!enabledRef.current) return;
        e.preventDefault();
        e.stopPropagation();
        openAtCursor();
      }
    };

    quill.root.addEventListener('keydown', onKeyDown, true);
    return () => {
      quill.root.removeEventListener('keydown', onKeyDown, true);
    };
  }, [enabled, quillReady, quillRef, openAtCursor]);

  // Limpeza ao desmontar
  React.useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  const overlay = mode === 'closed' ? null : (
    <InlineGeneratePopover
      anchor={anchor}
      mode={mode}
      preview={preview}
      error={error}
      editorTheme={editorTheme}
      onSubmit={handleSubmit}
      onAccept={accept}
      onCancel={close}
      voiceImproveEnabled={voiceImproveEnabled}
      onImproveVoice={onImproveVoice}
    />
  );

  return { overlay };
}

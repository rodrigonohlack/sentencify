/**
 * @file useInlineGenerate.test.tsx
 * @description Testes REAIS para useInlineGenerate — importa e executa o hook de produção.
 *
 * Foco: regressão do bug do Ctrl+K que parava de funcionar após alternar o modo
 * fullscreen do editor individual. A causa-raiz é a recriação da instância do Quill
 * (novo quill.root) sem que o effect que registra o atalho re-subscreva no DOM novo.
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useInlineGenerate } from './useInlineGenerate';
import type { QuillInstance } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Fakes
// ─────────────────────────────────────────────────────────────────────────────

/** Cria uma instância falsa do Quill com um root DOM real (anexado ao documento). */
function makeFakeQuill(): QuillInstance {
  const root = document.createElement('div');
  const parent = document.createElement('div');
  parent.appendChild(root);
  document.body.appendChild(parent);

  return {
    root,
    getSelection: () => ({ index: 0, length: 0 }),
    getLength: () => 1,
    getBounds: () => ({ top: 0, bottom: 10, left: 0, height: 10, right: 0, width: 0 }),
    enable: () => {},
  } as unknown as QuillInstance;
}

/** Dispara Ctrl+K em um root e devolve o evento (para inspecionar defaultPrevented). */
function fireCtrlK(root: HTMLElement): KeyboardEvent {
  const ev = new KeyboardEvent('keydown', {
    key: 'k',
    ctrlKey: true,
    bubbles: true,
    cancelable: true,
  });
  act(() => {
    root.dispatchEvent(ev);
  });
  return ev;
}

// ─────────────────────────────────────────────────────────────────────────────
// Testes
// ─────────────────────────────────────────────────────────────────────────────

describe('useInlineGenerate — atalho Ctrl+K', () => {
  it('captura Ctrl+K na instância inicial do Quill', () => {
    const quillRef: React.MutableRefObject<QuillInstance | null> = { current: makeFakeQuill() };
    const opts = {
      enabled: true,
      generate: vi.fn(),
      editorTheme: 'dark' as const,
      quillReady: true,
      instanceKey: 0,
    };

    renderHook((props) => useInlineGenerate(quillRef, props), { initialProps: opts });

    const ev = fireCtrlK(quillRef.current!.root as HTMLElement);
    expect(ev.defaultPrevented).toBe(true);
  });

  it('re-subscreve o Ctrl+K quando a instância do Quill é recriada (toggle fullscreen)', () => {
    const quillRef: React.MutableRefObject<QuillInstance | null> = { current: makeFakeQuill() };
    const opts = {
      enabled: true,
      generate: vi.fn(),
      editorTheme: 'dark' as const,
      quillReady: true,
      instanceKey: 0,
    };

    const { rerender } = renderHook((props) => useInlineGenerate(quillRef, props), {
      initialProps: opts,
    });

    // Funciona na instância inicial
    expect(fireCtrlK(quillRef.current!.root as HTMLElement).defaultPrevented).toBe(true);

    // Simula o remount do fullscreen: nova instância (novo root) + instanceKey muda
    const oldRoot = quillRef.current!.root as HTMLElement;
    quillRef.current = makeFakeQuill();
    rerender({ ...opts, instanceKey: 1 });

    // O root ANTIGO não deve mais capturar (listener foi removido na limpeza)
    expect(fireCtrlK(oldRoot).defaultPrevented).toBe(false);

    // O root NOVO deve capturar o atalho
    expect(fireCtrlK(quillRef.current!.root as HTMLElement).defaultPrevented).toBe(true);
  });
});

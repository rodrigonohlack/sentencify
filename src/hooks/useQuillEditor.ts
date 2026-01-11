/**
 * @file useQuillEditor.ts
 * @description Hook compartilhado para editores Quill (keyboard bindings, refs, topic detection)
 * @version 1.36.79
 *
 * Extraído do App.tsx v1.9.12
 */

import React from 'react';
import type { QuillInstance } from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// SANITIZAÇÃO HTML
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Sanitiza HTML gerado pelo Quill.js usando DOMPurify
 */
export const sanitizeQuillHTML = (html: string): string => {
  // Verificar se DOMPurify está disponível (não depende de estado React)
  if (!window.DOMPurify) {
    return html || '';
  }

  // Se vazio, retornar string vazia
  if (!html || html.trim() === '') {
    return '';
  }

  const cleanHTML = window.DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'div', 'span',                // Estrutura
      'strong', 'b', 'em', 'i', 'u', 's',      // Formatação
      'ul', 'ol', 'li',                         // Listas
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',      // Cabeçalhos
      'a', 'blockquote',                        // Extras Quill
      'pre', 'code'                             // Code blocks (futuro)
    ],
    ALLOWED_ATTR: [
      'href', 'target', 'rel',                  // Links
      'class',                                  // Classes do Quill (ql-*)
      'style',                                  // Estilos inline
      'data-list'                               // v1.36.6: Tipo de lista (bullet/ordered)
    ],
    ALLOWED_STYLES: {
      '*': {
        'text-align': [/^(left|center|right|justify)$/],  // Alinhamento
        'font-weight': [/^bold$/],
        'font-style': [/^italic$/],
        'text-decoration': [/^(underline|line-through)$/]
      }
    },
    KEEP_CONTENT: true,
    RETURN_TRUSTED_TYPE: false
  });

  return cleanHTML;
};

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════════

export interface UseQuillEditorOptions {
  ref?: React.ForwardedRef<QuillInstance> | React.MutableRefObject<QuillInstance | null>;
  onSaveWithoutClosing?: () => void;
  enableCtrlS?: boolean;
  topicTitle?: string;
  content?: string;
  enableTopicChangeDetection?: boolean;
}

export type UseQuillEditorReturn = ReturnType<typeof useQuillEditor>;

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Hook compartilhado para editores Quill
 * Centraliza: keyboard bindings (Ctrl+S), refs, topic change detection
 */
const useQuillEditor = (options: UseQuillEditorOptions = {}) => {
  const {
    ref,
    onSaveWithoutClosing,
    enableCtrlS = false,
    topicTitle,
    content,
    enableTopicChangeDetection = false
  } = options;

  const quillInstanceRef = React.useRef<QuillInstance | null>(null);
  const lastTopicTitle = React.useRef<string | null>(null);

  // Keyboard bindings: Ctrl+S para salvar
  const customModules = React.useMemo(() => {
    if (!enableCtrlS) return {};

    return {
      keyboard: {
        bindings: {
          save: {
            key: 'S',
            ctrlKey: true,
            handler: () => {
              if (onSaveWithoutClosing) {
                onSaveWithoutClosing();
              }
              return false; // Prevenir default
            }
          }
        }
      }
    };
  }, [enableCtrlS, onSaveWithoutClosing]);

  // Ref handling: Expor instância Quill via ref
  const handleQuillReady = React.useCallback((quillInstance: QuillInstance) => {
    quillInstanceRef.current = quillInstance;

    // Expor instância via ref
    if (ref) {
      if (typeof ref === 'function') {
        ref(quillInstance);
      } else {
        ref.current = quillInstance;
      }
    }
  }, [ref]);

  // Topic change detection: Atualizar conteúdo quando trocar de tópico
  React.useEffect(() => {
    if (!enableTopicChangeDetection || !quillInstanceRef.current) return;

    // Se mudou de tópico
    if (topicTitle !== lastTopicTitle.current) {
      try {
        const sanitized = sanitizeQuillHTML(content || '');
        quillInstanceRef.current.root.innerHTML = sanitized;
        lastTopicTitle.current = topicTitle ?? null;
      } catch (error) {
        // Silently ignore errors
      }
    }
  }, [enableTopicChangeDetection, topicTitle, content]);

  const refreshQuill = React.useCallback(() => {
    if (quillInstanceRef.current) {
      quillInstanceRef.current.update('silent');
    }
  }, []);

  return {
    quillInstanceRef,
    customModules,
    handleQuillReady,
    refreshQuill
  };
};

export { useQuillEditor };

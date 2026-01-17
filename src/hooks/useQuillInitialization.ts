/**
 * @file useQuillInitialization.ts
 * @description Hook para inicialização do Quill.js e DOMPurify
 *
 * FASE 43: Extraído do App.tsx para consolidar lógica de carregamento
 * de bibliotecas externas (Quill editor e DOMPurify sanitizer).
 *
 * Responsabilidades:
 * - Carregar DOMPurify do CDN
 * - Carregar Quill.js do CDN com retry
 * - Injetar estilos do Quill (dark/light)
 * - Prover função sanitizeHTML memoizada
 */

import { useState, useCallback, useEffect } from 'react';
import { injectQuillStyles } from '../utils/quill-styles-injector';

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════════

export interface UseQuillInitializationReturn {
  // Estados
  domPurifyReady: boolean;
  quillReady: boolean;
  quillError: Error | null;
  quillRetryCount: number;

  // Funções
  sanitizeHTML: (dirty: string | null | undefined) => string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════════

const DOMPURIFY_CDN = 'https://cdn.jsdelivr.net/npm/dompurify@3.0.6/dist/purify.min.js';
const QUILL_JS_CDN = 'https://cdn.jsdelivr.net/npm/quill@2.0.2/dist/quill.js';
const QUILL_CSS_CDN = 'https://cdn.jsdelivr.net/npm/quill@2.0.2/dist/quill.snow.css';
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 segundos

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export function useQuillInitialization(): UseQuillInitializationReturn {
  // Estados
  const [domPurifyReady, setDomPurifyReady] = useState(false);
  const [quillReady, setQuillReady] = useState(false);
  const [quillError, setQuillError] = useState<Error | null>(null);
  const [quillRetryCount, setQuillRetryCount] = useState(0);

  // ═══════════════════════════════════════════════════════════════════════════════
  // DOMPURIFY LOADER
  // ═══════════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    // Verificar se já está carregado
    if (window.DOMPurify) {
      setDomPurifyReady(true);
      return;
    }

    const script = document.createElement('script');
    script.src = DOMPURIFY_CDN;
    script.async = true;
    script.onload = () => {
      setDomPurifyReady(true);
    };
    script.onerror = () => {
      console.error('[useQuillInitialization] Falha ao carregar DOMPurify');
    };

    document.head.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════════
  // QUILL.JS LOADER
  // ═══════════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    let styleDelayTimeout: ReturnType<typeof setTimeout> | null = null;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;
    let isMounted = true;

    // Verificar se já existe script carregando/carregado
    const existingScript = document.getElementById('quill-library-js');
    const existingCSS = document.getElementById('quill-theme-css');

    // Se Quill já está disponível e scripts existem, apenas inicializar estilos
    if (window.Quill && existingScript && existingCSS) {
      styleDelayTimeout = setTimeout(() => {
        if (isMounted) {
          injectQuillStyles();
          setQuillReady(true);
          setQuillError(null);
        }
      }, 100);
      return () => {
        isMounted = false;
        if (styleDelayTimeout) clearTimeout(styleDelayTimeout);
      };
    }

    // Remover scripts antigos apenas se não houver Quill ativo
    if (!window.Quill) {
      if (existingScript) existingScript.remove();
      if (existingCSS) existingCSS.remove();
    }

    // Carregar CSS primeiro
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = QUILL_CSS_CDN;
    link.id = 'quill-theme-css';

    link.onerror = () => {
      if (isMounted) setQuillError(new Error('Falha ao carregar tema do editor'));
    };

    document.head.appendChild(link);

    // Carregar JavaScript
    const script = document.createElement('script');
    script.src = QUILL_JS_CDN;
    script.async = true;
    script.id = 'quill-library-js';

    script.onload = () => {
      if (!isMounted) return;
      if (window.Quill) {
        styleDelayTimeout = setTimeout(() => {
          if (isMounted) {
            injectQuillStyles();
            setQuillReady(true);
            setQuillError(null);
          }
        }, 100);
      } else {
        setQuillError(new Error('Biblioteca carregada mas não disponível'));
      }
    };

    script.onerror = () => {
      if (!isMounted) return;
      if (quillRetryCount < MAX_RETRIES) {
        retryTimeout = setTimeout(() => {
          if (isMounted) setQuillRetryCount(prev => prev + 1);
        }, RETRY_DELAY);
      } else {
        setQuillError(new Error(`Falha ao carregar editor após ${MAX_RETRIES} tentativas. Verifique sua conexão.`));
      }
    };

    document.head.appendChild(script);

    // Cleanup
    return () => {
      isMounted = false;
      if (styleDelayTimeout) clearTimeout(styleDelayTimeout);
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, [quillRetryCount]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // SANITIZE HTML
  // ═══════════════════════════════════════════════════════════════════════════════

  const sanitizeHTML = useCallback((dirty: string | null | undefined): string => {
    // Se DOMPurify não estiver carregado ainda, retorna string vazia para segurança
    if (!domPurifyReady || !window.DOMPurify) {
      return ''; // Mais seguro retornar vazio do que conteúdo não sanitizado
    }

    // Configuração de sanitização para permitir apenas tags seguras de formatação
    const cleanHTML = window.DOMPurify.sanitize(dirty || '', {
      ALLOWED_TAGS: [
        'p', 'br', 'div', 'span',           // Estrutura
        'strong', 'b', 'em', 'i', 'u',      // Formatação básica
        'ul', 'ol', 'li',                    // Listas
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6', // Cabeçalhos
        'blockquote'                         // v1.36.6: Citações
      ],
      ALLOWED_ATTR: [
        'class', 'id', 'style',              // Atributos permitidos (limitados)
        'data-list'                          // v1.36.6: Tipo de lista (bullet/ordered)
      ],
      ALLOWED_STYLES: {
        '*': {
          'font-weight': [/^bold$/],
          'font-style': [/^italic$/],
          'text-decoration': [/^underline$/],
          'text-align': [/^(left|center|right|justify)$/],  // v1.36.6: Alinhamento
          'margin-left': [/^\d+(\.\d+)?(em|px|rem)$/],      // v1.36.6: Indent
          'padding-left': [/^\d+(\.\d+)?(em|px|rem)$/],     // v1.36.6: Blockquote
          'border-left': [/.*/]                              // v1.36.6: Blockquote
        }
      },
      KEEP_CONTENT: true,                     // Preserva conteúdo de tags removidas
      RETURN_TRUSTED_TYPE: false
    });

    return cleanHTML;
  }, [domPurifyReady]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // EXPOR FUNÇÕES DE DEBUG NO CONSOLE
  // ═══════════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.testSanitization = (testHTML: string) => sanitizeHTML(testHTML);
      window.checkDOMPurify = () => ({
        version: window.DOMPurify?.version || 'Desconhecida',
        isSupported: domPurifyReady && !!window.DOMPurify
      });
    }
  }, [sanitizeHTML, domPurifyReady]);

  return {
    domPurifyReady,
    quillReady,
    quillError,
    quillRetryCount,
    sanitizeHTML,
  };
}

export default useQuillInitialization;

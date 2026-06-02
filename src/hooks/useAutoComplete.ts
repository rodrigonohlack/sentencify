/**
 * @file useAutoComplete.ts
 * @description Hook de Auto Complete com IA no editor de tópicos
 * @version 1.40.31
 *
 * Exibe sugestão de texto em cinza claro enquanto o usuário escreve.
 * O usuário pressiona TAB para aceitar a sugestão.
 *
 * - Debounce configurável (default 3s) antes de chamar a IA
 * - Suporte a Claude e Gemini
 * - Ghost text via overlay DOM (não contamina o modelo de dados do Quill)
 * - AbortController para cancelar requests em voo
 */

import React from 'react';
import { useAIIntegration } from './useAIIntegration';
import { VOICE_MODEL_CONFIG } from './useVoiceImprovement';
import type { QuillInstance, VoiceImprovementModel } from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

export interface AutoCompleteOptions {
  /** Texto do mini-relatório do tópico atual */
  relatorio: string;
  /** Se o auto complete está habilitado */
  enabled: boolean;
  /** Delay em ms antes de chamar a IA */
  delayMs: number;
  /** v1.50.52: Modelo rápido dedicado (mesma lista da Melhoria de Voz). Default: 'haiku' */
  model?: VoiceImprovementModel;
  /** Tema do editor para cor do ghost text */
  editorTheme: 'dark' | 'light' | string;
  /** Se o Quill já foi inicializado */
  quillReady: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════

const GHOST_CLASS = 'ac-ghost-overlay';
const BADGE_CLASS = 'ac-ghost-badge';
const MIN_TEXT_LENGTH = 20;

/** v1.50.52: Limites de contexto enviados à IA (evita payloads enormes em decisões longas) */
const PREFIX_MAX_CHARS = 6000;
const SUFFIX_MAX_CHARS = 1500;

const SYSTEM_PROMPT = `Você é um assistente de completamento de texto para decisões trabalhistas brasileiras.
Continue o texto a partir do ponto do cursor, de forma jurídica, objetiva e natural.
Retorne SOMENTE a continuação — não repita o que já foi escrito antes nem depois do cursor.
Não inclua explicações, prefácios, comentários nem aspas ao redor da continuação.
Você pode completar até o fim da frase ou do parágrafo corrente, conforme fizer sentido.`;

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function isModifierOnlyKey(e: KeyboardEvent): boolean {
  return ['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(e.key);
}

/**
 * v1.50.52: Limpa a resposta da IA — remove prefácios/aspas e normaliza o espaço de
 * junção com o texto que já existe antes do cursor.
 *
 * @param raw - Texto bruto retornado pela IA
 * @param prefix - Texto imediatamente antes do cursor (para decidir o espaço de junção)
 */
function cleanSuggestion(raw: string, prefix: string): string {
  let s = (raw || '').trim();
  if (!s) return '';

  // Remove aspas que envolvam toda a sugestão (ex.: "texto" ou “texto”)
  const wrappedQuotes = /^["“'«](.*)["”'»]$/s;
  const m = s.match(wrappedQuotes);
  if (m) s = m[1].trim();

  // Remove aspas/pontuação de abertura órfã no início
  s = s.replace(/^["“'«:\-–—\s]+/, '');
  if (!s) return '';

  // Espaço de junção: se o texto anterior termina em caractere não-branco e a
  // sugestão começa com letra/número/parêntese, insere um espaço para não grudar.
  const charBefore = prefix.slice(-1);
  const startsAttached = /^[.,;:!?)\]}»”']/.test(s); // pontuação que cola à palavra anterior
  if (charBefore && !/\s/.test(charBefore) && !startsAttached) {
    s = ' ' + s;
  }

  return s;
}

function getGhostColors(editorTheme: string): { text: string; bg: string; border: string } {
  if (editorTheme === 'light') {
    return { text: '#9ca3af', bg: 'rgba(0,0,0,0.7)', border: 'transparent' };
  }
  return { text: '#6b7280', bg: 'rgba(0,0,0,0.8)', border: 'transparent' };
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook de Auto Complete com IA.
 *
 * @param quillRef - Ref ao QuillInstance (pode ser null até o Quill inicializar)
 * @param options - Opções de configuração
 */
export function useAutoComplete(
  quillRef: React.MutableRefObject<QuillInstance | null>,
  options: AutoCompleteOptions
): void {
  const { enabled, relatorio, delayMs, model, editorTheme, quillReady } = options;

  const { callAI } = useAIIntegration();

  // Refs para controle interno
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);
  const ghostElementRef = React.useRef<HTMLDivElement | null>(null);
  const badgeElementRef = React.useRef<HTMLDivElement | null>(null);
  const suggestionRef = React.useRef<string>('');
  const cursorIndexRef = React.useRef<number>(0);
  const isLoadingRef = React.useRef<boolean>(false);

  // Refs de opções — valores atuais acessíveis dentro de closures sem re-criar efeitos
  const enabledRef = React.useRef(enabled);
  const relatorioRef = React.useRef(relatorio);
  const delayMsRef = React.useRef(delayMs);
  const modelRef = React.useRef(model);
  const editorThemeRef = React.useRef(editorTheme);
  const callAIRef = React.useRef(callAI);

  React.useEffect(() => { enabledRef.current = enabled; }, [enabled]);
  React.useEffect(() => { relatorioRef.current = relatorio; }, [relatorio]);
  React.useEffect(() => { delayMsRef.current = delayMs; }, [delayMs]);
  React.useEffect(() => { modelRef.current = model; }, [model]);
  React.useEffect(() => { editorThemeRef.current = editorTheme; }, [editorTheme]);
  React.useEffect(() => { callAIRef.current = callAI; }, [callAI]);

  // ─────────────────────────────────────────────────────────────────────────
  // Funções de overlay DOM
  // ─────────────────────────────────────────────────────────────────────────

  const removeGhostElements = React.useCallback(() => {
    if (ghostElementRef.current) {
      ghostElementRef.current.remove();
      ghostElementRef.current = null;
    }
    if (badgeElementRef.current) {
      badgeElementRef.current.remove();
      badgeElementRef.current = null;
    }
    suggestionRef.current = '';
  }, []);

  const showGhostOverlay = React.useCallback((quill: QuillInstance, suggestion: string, cursorIndex: number) => {
    removeGhostElements();

    if (!suggestion) return;

    const range = quill.getSelection();
    if (!range) return;

    // getBounds retorna posição relativa ao .ql-container
    const bounds = quill.getBounds(cursorIndex, 0);
    const container = quill.root.parentElement; // .ql-container (já tem position: relative pelo CSS do Quill)
    if (!container) return;

    const colors = getGhostColors(editorThemeRef.current);

    // Ghost text overlay
    const ghost = document.createElement('div');
    ghost.className = GHOST_CLASS;
    ghost.style.cssText = `
      position: absolute;
      top: ${bounds.top}px;
      left: ${bounds.left}px;
      color: ${colors.text};
      font-style: italic;
      pointer-events: none;
      white-space: pre-wrap;
      word-break: break-word;
      z-index: 5;
      max-width: calc(100% - ${bounds.left}px);
      line-height: inherit;
      font-size: inherit;
      font-family: inherit;
    `;
    ghost.textContent = suggestion;
    container.appendChild(ghost);
    ghostElementRef.current = ghost;

    // Badge "↹ TAB" no canto superior direito do ghost
    const badge = document.createElement('div');
    badge.className = BADGE_CLASS;
    badge.style.cssText = `
      position: absolute;
      top: ${Math.max(4, bounds.top - 22)}px;
      right: 8px;
      background: ${colors.bg};
      color: white;
      border-radius: 4px;
      font-size: 10px;
      padding: 2px 6px;
      pointer-events: none;
      z-index: 6;
      font-family: monospace;
      white-space: nowrap;
      opacity: 0.9;
    `;
    badge.textContent = '↹ TAB para aceitar';
    container.appendChild(badge);
    badgeElementRef.current = badge;

    cursorIndexRef.current = cursorIndex;
    suggestionRef.current = suggestion;
  }, [removeGhostElements]);

  // ─────────────────────────────────────────────────────────────────────────
  // Chamada à API
  // ─────────────────────────────────────────────────────────────────────────

  const callAutoCompleteAPI = React.useCallback(async (quill: QuillInstance) => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();

    isLoadingRef.current = true;

    // ── Fill-in-the-middle: contexto antes E depois do cursor (v1.50.52) ──
    // Antes (até v1.50.51) usava-se o documento inteiro e a sugestão era exibida
    // no cursor — completava o FIM do texto, não o ponto de edição.
    const range = quill.getSelection();
    const idx = range ? range.index : Math.max(0, quill.getLength() - 1);
    const fullPrefix = quill.getText(0, idx);
    const fullSuffix = quill.getText(idx);
    const prefix = fullPrefix.slice(-PREFIX_MAX_CHARS);
    const suffix = fullSuffix.slice(0, SUFFIX_MAX_CHARS).trim();

    if (prefix.trim().length < MIN_TEXT_LENGTH) {
      isLoadingRef.current = false;
      return;
    }

    // Snapshot para descartar a sugestão se o usuário editar/movar antes da resposta
    const prefixSnapshot = fullPrefix;

    // Modelo rápido dedicado (mesma infra da Melhoria de Voz) — sempre non-thinking.
    const cfg = VOICE_MODEL_CONFIG[modelRef.current ?? 'haiku'] ?? VOICE_MODEL_CONFIG['haiku'];

    const userPrompt = `MINI-RELATÓRIO:\n${relatorioRef.current || '(sem relatório)'}\n\nTEXTO ANTES DO CURSOR:\n${prefix}\n\nTEXTO DEPOIS DO CURSOR:\n${suffix || '(fim do texto)'}\n\nEscreva a continuação a partir do cursor:`;

    try {
      const raw = ((await callAIRef.current(
        [{ role: 'user', content: [{ type: 'text', text: userPrompt }] }],
        {
          provider: cfg.provider,
          model: cfg.model,
          systemPrompt: SYSTEM_PROMPT,
          maxTokens: 300,
          temperature: 0.3,
          disableThinking: cfg.provider !== 'gemini',
          geminiThinkingLevel: cfg.provider === 'gemini' ? 'minimal' : undefined,
          useInstructions: false,
          abortSignal: abortRef.current.signal,
          logMetrics: true
        }
      )) as string | null) ?? '';

      // Verificar se quill ainda existe e o texto antes do cursor não mudou
      if (!quill || !quillRef.current || !enabledRef.current) return;
      const rangeNow = quill.getSelection();
      const idxNow = rangeNow ? rangeNow.index : Math.max(0, quill.getLength() - 1);
      const prefixNow = quill.getText(0, idxNow);
      if (prefixNow !== prefixSnapshot) return; // texto/cursor mudou, ignorar

      const suggestion = cleanSuggestion(raw, prefixNow);
      if (suggestion) {
        showGhostOverlay(quill, suggestion, idxNow);
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.warn('[useAutoComplete] Erro na API:', err);
      }
    } finally {
      isLoadingRef.current = false;
    }
  }, [quillRef, showGhostOverlay]);

  // ─────────────────────────────────────────────────────────────────────────
  // Efeito principal: attach/detach listeners no Quill
  // ─────────────────────────────────────────────────────────────────────────

  React.useEffect(() => {
    if (!enabled || !quillReady) return;

    const quill = quillRef.current;
    if (!quill) return;

    // Handler de mudança de texto
    const onTextChange = ((_delta: unknown, _oldDelta: unknown, source: string) => {
      if (source !== 'user') return;

      // Cancelar sugestão ativa e debounce pendente
      removeGhostElements();
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();

      // Gate rápido: precisa de contexto suficiente ANTES do cursor
      const range = quill.getSelection();
      const idx = range ? range.index : quill.getLength();
      if (idx < MIN_TEXT_LENGTH) return;

      debounceRef.current = setTimeout(() => {
        if (!quillRef.current || !enabledRef.current) return;
        void callAutoCompleteAPI(quillRef.current);
      }, delayMsRef.current);
    }) as (...args: unknown[]) => void;

    // Handler de keydown (captura antes do Quill processar)
    const onKeyDown = (e: KeyboardEvent) => {
      if (!suggestionRef.current) return;
      if (isModifierOnlyKey(e)) return;

      if (e.key === 'Tab') {
        e.preventDefault();
        e.stopPropagation();

        const suggestion = suggestionRef.current;
        const idx = cursorIndexRef.current;
        removeGhostElements();

        // Inserir texto aceito no Quill
        if (quillRef.current && suggestion) {
          quillRef.current.insertText(idx, suggestion);
          quillRef.current.setSelection(idx + suggestion.length, 0);
        }
      } else {
        // Qualquer outra tecla: descartar sugestão
        removeGhostElements();
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (abortRef.current) abortRef.current.abort();
      }
    };

    // Handler de mudança de seleção (clique/navegação com setas)
    const onSelectionChange = ((range: unknown, oldRange: unknown) => {
      if (suggestionRef.current && range && oldRange) {
        removeGhostElements();
      }
    }) as (...args: unknown[]) => void;

    quill.on('text-change', onTextChange);
    quill.on('selection-change', onSelectionChange);
    quill.root.addEventListener('keydown', onKeyDown, true);

    return () => {
      quill.off('text-change', onTextChange);
      quill.off('selection-change', onSelectionChange);
      quill.root.removeEventListener('keydown', onKeyDown, true);

      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
      removeGhostElements();
    };
  }, [enabled, quillReady, callAutoCompleteAPI, removeGhostElements, quillRef]);
}

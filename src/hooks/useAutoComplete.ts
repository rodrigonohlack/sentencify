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
import { useAIStore } from '../stores/useAIStore';
import { API_BASE } from '../constants/api';
import type { QuillInstance } from '../types';

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

const SYSTEM_PROMPT = `Você é um assistente de completamento de texto para decisões trabalhistas brasileiras.
Complete APENAS a próxima frase do texto, de forma jurídica, objetiva e natural.
Retorne SOMENTE o trecho que completa o texto, sem repetir o que já foi escrito.
Não inclua explicações, prefácios ou pontuação de abertura.
Seja conciso: no máximo uma ou duas frases.`;

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function stripHTML(html: string): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

function isModifierOnlyKey(e: KeyboardEvent): boolean {
  return ['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(e.key);
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
  const { enabled, relatorio, delayMs, editorTheme, quillReady } = options;

  const provider = useAIStore((s) => s.aiSettings.provider);
  const claudeModel = useAIStore((s) => s.aiSettings.claudeModel);
  const geminiModel = useAIStore((s) => s.aiSettings.geminiModel);
  const claudeKey = useAIStore((s) => s.aiSettings.apiKeys?.claude ?? '');
  const geminiKey = useAIStore((s) => s.aiSettings.apiKeys?.gemini ?? '');

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
  const editorThemeRef = React.useRef(editorTheme);
  const providerRef = React.useRef(provider);
  const claudeModelRef = React.useRef(claudeModel);
  const geminiModelRef = React.useRef(geminiModel);
  const claudeKeyRef = React.useRef(claudeKey);
  const geminiKeyRef = React.useRef(geminiKey);

  React.useEffect(() => { enabledRef.current = enabled; }, [enabled]);
  React.useEffect(() => { relatorioRef.current = relatorio; }, [relatorio]);
  React.useEffect(() => { delayMsRef.current = delayMs; }, [delayMs]);
  React.useEffect(() => { editorThemeRef.current = editorTheme; }, [editorTheme]);
  React.useEffect(() => { providerRef.current = provider; }, [provider]);
  React.useEffect(() => { claudeModelRef.current = claudeModel; }, [claudeModel]);
  React.useEffect(() => { geminiModelRef.current = geminiModel; }, [geminiModel]);
  React.useEffect(() => { claudeKeyRef.current = claudeKey; }, [claudeKey]);
  React.useEffect(() => { geminiKeyRef.current = geminiKey; }, [geminiKey]);

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

  const callAutoCompleteAPI = React.useCallback(async (currentText: string, quill: QuillInstance) => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();

    isLoadingRef.current = true;

    const currentProvider = providerRef.current;
    const userPrompt = `MINI-RELATÓRIO:\n${relatorioRef.current || '(sem relatório)'}\n\nDECISÃO ATÉ AGORA:\n${currentText}\n\nComplete a próxima frase:`;

    try {
      let suggestion = '';

      if (currentProvider === 'claude') {
        const apiKey = claudeKeyRef.current;
        if (!apiKey) return;

        const body = {
          model: claudeModelRef.current || 'claude-sonnet-4-20250514',
          max_tokens: 150,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: userPrompt }]
        };

        const resp = await fetch(`${API_BASE}/api/claude/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
          body: JSON.stringify(body),
          signal: abortRef.current.signal
        });

        if (!resp.ok) return;
        const data = await resp.json();
        suggestion = (data.content?.[0]?.text || '').trim();

      } else if (currentProvider === 'gemini') {
        const apiKey = geminiKeyRef.current;
        if (!apiKey) return;

        const isGemini3 = geminiModelRef.current.includes('gemini-3');
        const geminiRequest: Record<string, unknown> = {
          contents: [
            { role: 'user', parts: [{ text: `${SYSTEM_PROMPT}\n\n${userPrompt}` }] }
          ],
          generationConfig: {
            maxOutputTokens: 150,
            temperature: 1.0,
            ...(isGemini3 ? {
              thinking_config: { thinking_budget: 512, includeThoughts: false }
            } : {})
          }
        };

        const resp = await fetch(`${API_BASE}/api/gemini/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
          body: JSON.stringify({ model: geminiModelRef.current, request: geminiRequest }),
          signal: abortRef.current.signal
        });

        if (!resp.ok) return;
        const data = await resp.json();
        const parts = data.candidates?.[0]?.content?.parts || [];
        const textPart = parts.find((p: { thought?: boolean; text?: string }) => p.text && !p.thought);
        suggestion = (textPart?.text || '').trim();
      }

      // Verificar se quill ainda existe e texto não mudou
      if (!quill || !quillRef.current || !enabledRef.current) return;
      const currentHTML = quill.root?.innerHTML || '';
      const textNow = stripHTML(currentHTML);
      if (!textNow.startsWith(currentText.substring(0, 30))) return; // texto mudou, ignorar

      if (suggestion) {
        const cursorRange = quill.getSelection();
        const idx = cursorRange ? cursorRange.index : quill.getLength() - 1;
        showGhostOverlay(quill, suggestion, idx);
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

      const currentText = stripHTML(quill.root?.innerHTML || '');
      if (currentText.length < MIN_TEXT_LENGTH) return;

      debounceRef.current = setTimeout(() => {
        if (!quillRef.current || !enabledRef.current) return;
        void callAutoCompleteAPI(currentText, quillRef.current);
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

/**
 * @file useChatAssistant.ts
 * @description Hook para gerenciamento de chat interativo com assistente IA
 * @tier 0 (sem dependências de outros hooks)
 * @extractedFrom App.tsx linhas 4993-5104
 * @usedBy AIAssistantBase, GlobalEditorModal
 * @version v1.37.95 - isOpen força reload ao abrir (sincroniza entre editores)
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { ChatMessage, CallAIFunction, AIMessageContent } from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Limite máximo de mensagens no histórico do chat
 * Mantém primeira mensagem (com contexto) + últimas N mensagens
 */
export const MAX_CHAT_HISTORY_MESSAGES = 20;

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

/** Opções de persistência de cache (v1.37.92) */
export interface ChatCacheOptions {
  /** Título do tópico para identificar o chat no cache */
  topicTitle?: string;
  /** v1.37.95: Modal está aberto? Força reload do cache quando abre */
  isOpen?: boolean;
  /** Função para salvar chat no cache */
  saveChat?: (topicTitle: string, messages: ChatMessage[]) => Promise<void>;
  /** Função para carregar chat do cache */
  getChat?: (topicTitle: string) => Promise<ChatMessage[]>;
  /** Função para deletar chat do cache */
  deleteChat?: (topicTitle: string) => Promise<void>;
}

export interface UseChatAssistantReturn {
  /** Histórico de mensagens do chat */
  history: ChatMessage[];
  /** Indica se está gerando resposta */
  generating: boolean;
  /** Envia mensagem para a IA */
  send: (
    message: string,
    contextBuilder: (msg: string) => AIMessageContent[] | string | Promise<AIMessageContent[] | string>
  ) => Promise<{ success: boolean; error?: string }>;
  /** Limpa o histórico do chat */
  clear: () => void;
  /** Última resposta da IA (ou null) */
  lastResponse: string | null;
  /** v1.37.65: Atualiza a última mensagem do assistente (para Double Check) */
  updateLastAssistantMessage: (newContent: string) => void;
  /** v1.37.92: Define histórico diretamente (para carregar do cache) */
  setHistory: (messages: ChatMessage[]) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook para gerenciamento de chat interativo com assistente IA
 * @param aiIntegration - Objeto com função callAI para comunicação com a IA
 * @param cacheOptions - Opções de persistência (v1.37.92)
 * @returns Estado e funções do chat
 */
export function useChatAssistant(
  aiIntegration: { callAI?: CallAIFunction } | null,
  cacheOptions?: ChatCacheOptions
): UseChatAssistantReturn {
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [generating, setGenerating] = useState(false);
  const lastTopicTitleRef = useRef<string | undefined>(undefined);
  const cacheLoadedRef = useRef(false);
  // v1.37.93: Ref para histórico atual (evita dependência no useEffect)
  const historyRef = useRef<ChatMessage[]>([]);
  historyRef.current = history;
  // v1.37.95: Ref para estado anterior de isOpen
  const wasOpenRef = useRef(false);

  // v1.37.92: Carregar histórico do cache quando tópico muda
  // v1.37.93: Fix - salvar histórico do tópico anterior antes de limpar
  // v1.37.95: Também recarrega quando modal abre (isOpen muda para true)
  useEffect(() => {
    const loadFromCache = async () => {
      const topicTitle = cacheOptions?.topicTitle;
      const previousTitle = lastTopicTitleRef.current;
      const isOpen = cacheOptions?.isOpen ?? false;
      const wasOpen = wasOpenRef.current;

      // v1.37.95: Detectar se modal acabou de abrir
      const justOpened = isOpen && !wasOpen;
      wasOpenRef.current = isOpen;

      // Se o tópico mudou OU modal acabou de abrir, recarregar do cache
      const shouldReload = topicTitle !== previousTitle || justOpened;

      if (shouldReload) {
        // IMPORTANTE: Salvar histórico do tópico anterior ANTES de limpar
        if (previousTitle && cacheOptions?.saveChat && historyRef.current.length > 0 && topicTitle !== previousTitle) {
          try {
            await cacheOptions.saveChat(previousTitle, historyRef.current);
          } catch (e) {
            console.warn('[useChatAssistant] Erro ao salvar histórico anterior:', e);
          }
        }

        lastTopicTitleRef.current = topicTitle;
        cacheLoadedRef.current = false;

        if (topicTitle) {
          // Novo tópico ou modal abriu: carregar do cache
          if (cacheOptions?.getChat) {
            cacheLoadedRef.current = true;
            try {
              const cached = await cacheOptions.getChat(topicTitle);
              setHistory(cached && cached.length > 0 ? cached : []);
            } catch (e) {
              console.warn('[useChatAssistant] Erro ao carregar cache:', e);
              setHistory([]);
            }
          } else {
            setHistory([]);
          }
        } else {
          // Modal fechado: limpar histórico in-memory (já salvou acima)
          setHistory([]);
        }
      }
    };
    loadFromCache();
  }, [cacheOptions?.topicTitle, cacheOptions?.isOpen, cacheOptions?.getChat, cacheOptions?.saveChat]);

  // v1.37.92: Salvar no cache quando histórico muda
  useEffect(() => {
    const saveToCache = async () => {
      if (cacheOptions?.topicTitle && cacheOptions?.saveChat && history.length > 0) {
        try {
          await cacheOptions.saveChat(cacheOptions.topicTitle, history);
        } catch (e) {
          console.warn('[useChatAssistant] Erro ao salvar cache:', e);
        }
      }
    };
    // Só salvar após o carregamento inicial
    if (cacheLoadedRef.current) {
      saveToCache();
    }
  }, [history, cacheOptions?.topicTitle, cacheOptions?.saveChat]);

  // Limpa histórico (e cache se configurado)
  const clear = useCallback(() => {
    setHistory([]);
    // v1.37.92: Deletar do cache também
    if (cacheOptions?.topicTitle && cacheOptions?.deleteChat) {
      cacheOptions.deleteChat(cacheOptions.topicTitle).catch(e => {
        console.warn('[useChatAssistant] Erro ao limpar cache:', e);
      });
    }
  }, [cacheOptions?.topicTitle, cacheOptions?.deleteChat]);

  // Última resposta da IA
  const lastResponse = useMemo(() =>
    [...history].reverse().find(m => m.role === 'assistant')?.content || null
  , [history]);

  // v1.37.65: Atualiza a última mensagem do assistente (para Double Check)
  const updateLastAssistantMessage = useCallback((newContent: string) => {
    setHistory(prev => {
      // Encontrar índice da última mensagem do assistente
      const lastAssistantIndex = [...prev].reverse().findIndex(m => m.role === 'assistant');
      if (lastAssistantIndex === -1) return prev;

      const actualIndex = prev.length - 1 - lastAssistantIndex;
      const updated = [...prev];
      updated[actualIndex] = {
        ...updated[actualIndex],
        content: newContent
      };
      return updated;
    });
  }, []);

  // Envia mensagem e atualiza histórico
  // v1.19.5: Suporta contextBuilder assíncrono
  const send = useCallback(async (
    message: string,
    contextBuilder: (msg: string) => AIMessageContent[] | string | Promise<AIMessageContent[] | string>
  ) => {
    if (!message?.trim()) return { success: false, error: 'Mensagem vazia' };
    if (!aiIntegration?.callAI) return { success: false, error: 'IA não disponível' };

    setGenerating(true);

    try {
      const apiMessages: Array<{ role: 'user' | 'assistant'; content: string | AIMessageContent[] }> = [];
      // v1.19.5: Calcular contexto antes (suporta async)
      let contextContent: AIMessageContent[] | string | null = null;

      if (history.length === 0) {
        // Primeira interação: contexto completo + mensagem
        contextContent = await Promise.resolve(contextBuilder(message));
        apiMessages.push({
          role: 'user' as const,
          content: contextContent || ''
        });
      } else {
        // Interações seguintes: reconstrói histórico completo
        // Primeira mensagem com contexto (para cache hit)
        apiMessages.push({
          role: 'user' as const,
          content: history[0].contentForApi || ''
        });

        // Resto do histórico
        for (let i = 1; i < history.length; i++) {
          apiMessages.push({
            role: history[i].role as 'user' | 'assistant',
            content: history[i].content
          });
        }

        // Nova mensagem
        apiMessages.push({
          role: 'user' as const,
          content: message
        });
      }

      // v1.21.26: Parametros para assistente interativo (criativo moderado)
      // v1.32.26: maxTokens aumentado para 16000 (respostas longas no chat)
      const response = await aiIntegration.callAI(apiMessages, {
        maxTokens: 16000,
        useInstructions: true,
        logMetrics: true,
        temperature: 0.5,
        topP: 0.9,
        topK: 80
      });

      const trimmedResponse = response.trim();

      // Atualiza histórico (com limite)
      setHistory(prev => {
        let newHistory: ChatMessage[];
        if (prev.length === 0) {
          // Primeira interação: salvar content completo para cache
          newHistory = [
            { role: 'user', content: message, contentForApi: contextContent ?? undefined, ts: Date.now() },
            { role: 'assistant', content: trimmedResponse, ts: Date.now() }
          ];
        } else {
          // Interações seguintes
          newHistory = [
            ...prev,
            { role: 'user', content: message, ts: Date.now() },
            { role: 'assistant', content: trimmedResponse, ts: Date.now() }
          ];
        }

        // Aplicar limite de mensagens (manter primeira msg com contexto + últimas N)
        if (newHistory.length > MAX_CHAT_HISTORY_MESSAGES) {
          const firstMsg = newHistory[0]; // Manter contexto
          const recentMsgs = newHistory.slice(-(MAX_CHAT_HISTORY_MESSAGES - 1));
          return [firstMsg, ...recentMsgs];
        }

        return newHistory;
      });

      return { success: true };

    } catch (err) {
      // Adiciona mensagem de erro ao histórico
      setHistory(prev => [
        ...prev,
        { role: 'user', content: message, ts: Date.now(), error: (err as Error).message }
      ]);
      return { success: false, error: (err as Error).message };
    } finally {
      setGenerating(false);
    }
  }, [history, aiIntegration]);

  return { history, generating, send, clear, lastResponse, updateLastAssistantMessage, setHistory };
}

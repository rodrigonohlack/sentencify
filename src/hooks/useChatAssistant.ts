/**
 * @file useChatAssistant.ts
 * @description Hook para gerenciamento de chat interativo com assistente IA
 * @tier 0 (sem dependências de outros hooks)
 * @extractedFrom App.tsx linhas 4993-5104
 * @usedBy AIAssistantBase, GlobalEditorModal
 */

import React, { useState, useCallback, useMemo } from 'react';
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
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook para gerenciamento de chat interativo com assistente IA
 * @param aiIntegration - Objeto com função callAI para comunicação com a IA
 * @returns Estado e funções do chat
 */
export function useChatAssistant(
  aiIntegration: { callAI?: CallAIFunction } | null
): UseChatAssistantReturn {
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [generating, setGenerating] = useState(false);

  // Limpa histórico
  const clear = useCallback(() => setHistory([]), []);

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

  return { history, generating, send, clear, lastResponse, updateLastAssistantMessage };
}

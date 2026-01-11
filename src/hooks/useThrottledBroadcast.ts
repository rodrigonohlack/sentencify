/**
 * @file useThrottledBroadcast.ts
 * @description Hook para broadcast throttled entre abas do navegador
 * @tier 0 (sem dependências)
 * @extractedFrom App.tsx linhas 2446-2494
 * @usedBy usePrimaryTabLock
 */

import { useRef, useCallback, useEffect } from 'react';

export type BroadcastFunction = (message: unknown) => void;

/**
 * Hook que implementa broadcast throttled via BroadcastChannel
 * Evita flooding de mensagens entre abas, enviando no máximo uma mensagem
 * a cada `throttleMs` milissegundos, com trailing edge para última mensagem.
 *
 * @param channelRef - Ref para o BroadcastChannel
 * @param throttleMs - Intervalo mínimo entre broadcasts (default: 1000ms)
 * @returns Função de broadcast throttled
 */
export function useThrottledBroadcast(
  channelRef: React.RefObject<BroadcastChannel | null>,
  throttleMs = 1000
): BroadcastFunction {
  const lastBroadcastRef = useRef<number>(0);
  const pendingMessageRef = useRef<unknown>(null);
  const trailingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const broadcast = useCallback((message: unknown) => {
    const channel = channelRef?.current;
    if (!channel) return;

    const now = Date.now();
    const timeSinceLastBroadcast = now - lastBroadcastRef.current;

    if (timeSinceLastBroadcast >= throttleMs) {
      // Tempo suficiente passou, enviar imediatamente
      channel.postMessage(message);
      lastBroadcastRef.current = now;
      pendingMessageRef.current = null;
      if (trailingTimerRef.current) {
        clearTimeout(trailingTimerRef.current);
        trailingTimerRef.current = null;
      }
    } else {
      // Ainda dentro do throttle, agendar trailing edge
      pendingMessageRef.current = message;
      if (trailingTimerRef.current) {
        clearTimeout(trailingTimerRef.current);
      }
      const remainingTime = throttleMs - timeSinceLastBroadcast;
      trailingTimerRef.current = setTimeout(() => {
        const ch = channelRef?.current;
        if (pendingMessageRef.current && ch) {
          ch.postMessage(pendingMessageRef.current);
          lastBroadcastRef.current = Date.now();
          pendingMessageRef.current = null;
        }
        trailingTimerRef.current = null;
      }, remainingTime);
    }
  }, [channelRef, throttleMs]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (trailingTimerRef.current) {
        clearTimeout(trailingTimerRef.current);
      }
    };
  }, []);

  return broadcast;
}

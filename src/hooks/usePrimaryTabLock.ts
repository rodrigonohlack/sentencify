/**
 * @file usePrimaryTabLock.ts
 * @description Hook para controle de aba primária via localStorage
 * @tier 0 (sem dependências)
 * @extractedFrom App.tsx linhas 2934-3105
 * @usedBy App (LockedTabOverlay)
 */

import { useState, useRef, useCallback, useEffect } from 'react';

const LOCK_KEY = 'sentencify-primary-tab-lock';
const TAKEOVER_KEY = 'sentencify-tab-takeover';
const LOCK_EXPIRY_MS = 30000; // 30 segundos

export interface UsePrimaryTabLockReturn {
  isPrimaryTab: boolean;
  tabId: string;
}

/**
 * Hook que gerencia qual aba do navegador é a "primária"
 * Apenas uma aba pode ser primária por vez, as outras ficam bloqueadas
 *
 * @returns Objeto com isPrimaryTab (boolean) e tabId (string)
 */
export function usePrimaryTabLock(): UsePrimaryTabLockReturn {
  const [isPrimaryTab, setIsPrimaryTab] = useState(false);

  // v1.38.6: Gerar tabId PROVISÓRIO (sem ler sessionStorage no render)
  // O takeover será processado no useEffect para evitar race condition com StrictMode
  const tabIdRef = useRef<string>(
    `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  );

  // Flag para garantir que o takeover seja processado apenas 1x
  const takeoverProcessedRef = useRef(false);

  // Criar lock (tornar esta aba primária)
  // v1.20.1: Adicionado parâmetro force para takeover e locks expirados
  const createLock = useCallback((force = false) => {
    try {
      const existingLockStr = localStorage.getItem(LOCK_KEY);
      if (existingLockStr && !force) {
        const existingLock = JSON.parse(existingLockStr);
        // Só permite criar lock se é nosso próprio lock (evita race condition)
        if (existingLock.tabId !== tabIdRef.current) {
          setIsPrimaryTab(false);
          return;
        }
      }

      localStorage.setItem(LOCK_KEY, JSON.stringify({
        tabId: tabIdRef.current,
        timestamp: Date.now()
      }));
      setIsPrimaryTab(true);
    } catch (err) {
      // Ignore localStorage errors
    }
  }, []);

  // Claim como aba primária
  // v1.20.1: Adicionada verificação de expiração (30s) para locks órfãos
  const claimPrimaryTab = useCallback(() => {
    try {
      const lockStr = localStorage.getItem(LOCK_KEY);
      const lock = lockStr ? JSON.parse(lockStr) : {};

      // CASO 1: Nenhum lock existe → criar lock e se tornar primária
      if (!lock.tabId) {
        createLock();
        return;
      }

      // CASO 2: Lock é nosso → atualizar timestamp
      if (lock.tabId === tabIdRef.current) {
        createLock();
        return;
      }

      // CASO 3: Lock expirado (mais de 30s sem heartbeat) → assumir forçadamente
      if (lock.timestamp && (Date.now() - lock.timestamp > LOCK_EXPIRY_MS)) {
        createLock(true);
        return;
      }

      // CASO 4: Lock existe e pertence a outra aba ativa → permanecer secundária
      setIsPrimaryTab(false);

    } catch (err) {
      // Fallback: assumir como primária em caso de erro
      createLock();
    }
  }, [createLock]);

  // Liberar lock (ao fechar aba)
  const releaseLock = useCallback(() => {
    try {
      const lockStr = localStorage.getItem(LOCK_KEY);
      const lock = lockStr ? JSON.parse(lockStr) : {};

      // Só libera se esta aba é a dona do lock
      if (lock.tabId === tabIdRef.current) {
        localStorage.removeItem(LOCK_KEY);
      }
    } catch (err) {
      // Ignore localStorage errors
    }
  }, []);

  // Cleanup: Liberar lock ao fechar aba
  useEffect(() => {
    window.addEventListener('beforeunload', releaseLock);
    return () => {
      releaseLock();
      window.removeEventListener('beforeunload', releaseLock);
    };
  }, [releaseLock]);

  // v1.38.6: Processar takeover + claim inicial (apenas 1x no mount)
  // IMPORTANTE: Isso DEVE estar em useEffect para evitar race condition com StrictMode
  // Se estivesse no render, múltiplas renderizações poderiam ler/limpar o sessionStorage
  useEffect(() => {
    if (takeoverProcessedRef.current) return;
    takeoverProcessedRef.current = true;

    try {
      const saved = sessionStorage.getItem(TAKEOVER_KEY);
      if (saved) {
        // Substituir tabId provisório pelo salvo do "Assumir Controle"
        tabIdRef.current = saved;
        sessionStorage.removeItem(TAKEOVER_KEY);
        console.log('[TabLock] Takeover restaurado:', saved);
      }
    } catch (err) {
      // Ignore sessionStorage errors
    }

    // Agora sim, tentar claim com o tabId correto
    claimPrimaryTab();
  }, [claimPrimaryTab]);

  // Detect Lock Changes from Other Tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      // Only respond to changes in our lock key
      if (e.key !== LOCK_KEY) return;

      // CASE 1: Lock was removed (primary tab closed)
      if (!e.newValue) {
        // Try to claim it (first tab to claim wins)
        claimPrimaryTab();
        return;
      }

      // CASE 2: Lock was changed to another tab
      try {
        const newLock = JSON.parse(e.newValue);

        if (newLock.tabId !== tabIdRef.current) {
          setIsPrimaryTab(false);
        } else {
          // Lock is ours (defensive check)
          setIsPrimaryTab(true);
        }
      } catch (err) {
        // Stay in current state on error (conservative)
      }
    };

    // Register storage event listener
    window.addEventListener('storage', handleStorageChange);

    // Cleanup
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [claimPrimaryTab]);

  // v1.20.1: Heartbeat para manter lock vivo (atualiza timestamp a cada 10s)
  useEffect(() => {
    if (!isPrimaryTab) return;

    const heartbeat = setInterval(() => {
      try {
        const lockStr = localStorage.getItem(LOCK_KEY);
        const lock = lockStr ? JSON.parse(lockStr) : {};
        if (lock.tabId === tabIdRef.current) {
          localStorage.setItem(LOCK_KEY, JSON.stringify({
            tabId: tabIdRef.current,
            timestamp: Date.now()
          }));
        }
      } catch (err) {
        // Ignore localStorage errors
      }
    }, 10000); // 10 segundos

    return () => clearInterval(heartbeat);
  }, [isPrimaryTab]);

  return {
    isPrimaryTab,
    tabId: tabIdRef.current
  };
}

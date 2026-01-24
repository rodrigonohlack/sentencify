/**
 * @file useMultiTabSync.ts
 * @description Hook para sincronização multi-tab de modelos
 * @version 1.37.46
 *
 * FASE 51: Extraído do App.tsx para consolidar lógica de sincronização.
 *
 * Responsabilidades:
 * - Registrar callback de sync com IndexedDB
 * - Recarregar modelos quando outras tabs salvarem
 * - Atualizar refs para evitar save loop
 *
 * 🔑 ESTRATÉGIA ZUSTAND: Usa getState() para acessar estado atual
 * sem necessidade de refs, eliminando problema de stale closures.
 */

import { useEffect, useRef } from 'react';
import { useModelsStore } from '../stores/useModelsStore';
import type { UseIndexedDBReturn, UseFeatureFlagsReturn } from './index';

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════════

export interface UseMultiTabSyncProps {
  /** Hook de IndexedDB para load/save */
  indexedDB: UseIndexedDBReturn;
  /** Hook de feature flags */
  featureFlags: UseFeatureFlagsReturn;
  /** Ref para rastrear último array de models salvo */
  lastSavedModelsRef: React.MutableRefObject<string | null>;
}

export interface UseMultiTabSyncReturn {
  /** Se o sync está configurado */
  isConfigured: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Hook para sincronização multi-tab de modelos
 *
 * @param props - Dependências necessárias
 */
export function useMultiTabSync({
  indexedDB,
  featureFlags,
  lastSavedModelsRef,
}: UseMultiTabSyncProps): UseMultiTabSyncReturn {
  // Ref para indexedDB (ainda necessário pois não é Zustand)
  const indexedDBRef = useRef(indexedDB);

  // Atualizar ref quando indexedDB mudar
  useEffect(() => {
    indexedDBRef.current = indexedDB;
  }, [indexedDB]);

  // Registrar callback de sync
  useEffect(() => {
    // Handler para eventos de sync de outras tabs
    const handleSync = async ({ action: _action, timestamp: _timestamp }: { action: string; timestamp: number }) => {
      // 🔑 ZUSTAND: Usa getState() diretamente - sem refs!
      const currentIndexedDB = indexedDBRef.current;

      // Skip if IndexedDB feature flag is disabled
      if (!featureFlags.isEnabled('useIndexedDB')) {
        return;
      }

      // Skip if IndexedDB não está disponível
      if (!currentIndexedDB.isAvailable) {
        return;
      }

      try {
        // Recarregar modelos do IndexedDB (cache já foi invalidado pelo hook)
        const reloadedModels = await currentIndexedDB.loadModels();

        // 🔑 ZUSTAND: Atualiza store diretamente
        useModelsStore.getState().setModels(reloadedModels);

        // Atualizar ref para evitar save loop
        lastSavedModelsRef.current = JSON.stringify(reloadedModels);

      } catch (err) {
        // 🔑 ZUSTAND: Reporta erro via store
        useModelsStore.getState().setPersistenceError(`Erro ao sincronizar com outra tab: ${(err as Error).message}`);
      }
    };

    // Registrar callback no hook useIndexedDB
    indexedDB.setSyncCallback(handleSync);

    // Cleanup: remover callback
    return () => {
      indexedDB.setSyncCallback(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ⚠️ Array vazio OK: handleSync usa refs e getState() (sempre atualizadas)

  return {
    isConfigured: true,
  };
}

export default useMultiTabSync;

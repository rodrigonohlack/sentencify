/**
 * @file useSessionPersistence.ts
 * @description Hook para persistência de sessão (restore de sessão salva)
 * @version 1.37.58
 *
 * NOTA: O beforeunload handler permanece em App.tsx pois compartilha
 * o modelsHashRef com a lógica de auto-save.
 */

import { useCallback } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════════

interface StorageInterface {
  setSessionLastSaved: (date: string) => void;
}

interface UseSessionPersistenceProps {
  storage: StorageInterface;
  openModal: (modalId: string) => void;
}

export interface UseSessionPersistenceReturn {
  checkSavedSession: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Hook para gerenciar restauração de sessão salva
 *
 * @example
 * const { checkSavedSession } = useSessionPersistence({
 *   storage,
 *   openModal,
 * });
 */
export function useSessionPersistence({
  storage,
  openModal,
}: UseSessionPersistenceProps): UseSessionPersistenceReturn {

  /**
   * Verifica se existe uma sessão salva e oferece restauração
   */
  const checkSavedSession = useCallback(() => {
    try {
      const saved = localStorage.getItem('sentencifySession');
      if (saved) {
        const session = JSON.parse(saved);
        storage.setSessionLastSaved(session.savedAt);
        openModal('restoreSession');
      }
    } catch (err) {
      // Silently fail - sessão não existe ou está corrompida
    }
  }, [storage, openModal]);

  return {
    checkSavedSession,
  };
}

export default useSessionPersistence;

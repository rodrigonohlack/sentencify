/**
 * @file useTopicManager.ts
 * @description Hook para gerenciamento de tópicos da sentença
 * @version 1.36.77
 *
 * Extraído do App.tsx - wrapper sobre o store Zustand (useTopicsStore)
 * v1.36.64: Estado migrado para Zustand
 */

import { useTopicManagerCompat } from '../stores/useTopicsStore';

/**
 * Tipo de retorno do useTopicManager
 */
export type UseTopicManagerReturn = ReturnType<typeof useTopicManagerCompat>;

/**
 * Hook para gerenciamento de tópicos
 * Delega todo o estado e ações para o store Zustand
 *
 * @returns Estados, setters, handlers e métodos de persistência para tópicos
 */
const useTopicManager = (): UseTopicManagerReturn => {
  // Delega todo o estado e ações para o store Zustand
  return useTopicManagerCompat();
};

export { useTopicManager };

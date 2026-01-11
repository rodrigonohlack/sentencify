/**
 * @file useModalManager.ts
 * @description Hook para gerenciamento de modais da aplicação
 * @version 1.36.78
 *
 * Extraído do App.tsx - wrapper sobre o store Zustand (useUIStore)
 * v1.36.61: Estado migrado para Zustand
 */

import { useModalManagerCompat } from '../stores/useUIStore';

/**
 * Tipo de retorno do useModalManager
 */
export type UseModalManagerReturn = ReturnType<typeof useModalManagerCompat>;

/**
 * Hook para gerenciamento de modais
 * Delega todo o estado e ações para o store Zustand
 *
 * @returns Estados e handlers para controle de modais
 */
const useModalManager = useModalManagerCompat;

export { useModalManager };

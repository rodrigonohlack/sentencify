/**
 * @file useProvaOralImport.ts
 * @description Hook para importar análises de prova oral no Sentencify
 * @version 1.39.08
 *
 * Usa authFetch do useAuthMagicLink para autenticação JWT.
 * Este hook é separado do useProvaOralAPI do app prova-oral porque:
 * - Não atualiza stores específicos do app prova-oral
 * - Apenas funções de leitura sem side effects
 */

import { useCallback, useState } from 'react';
import { useAuthMagicLink } from './useAuthMagicLink';
import type { SavedProvaOralAnalysis } from '../apps/prova-oral/types';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

/** Retorno do hook */
export interface UseProvaOralImportReturn {
  /** Lista todas as análises salvas do usuário */
  listAnalyses: () => Promise<SavedProvaOralAnalysis[]>;
  /** Obtém uma análise específica por ID */
  getAnalysis: (id: string) => Promise<SavedProvaOralAnalysis | null>;
  /** Indica se está carregando */
  isLoading: boolean;
  /** Mensagem de erro, se houver */
  error: string | null;
  /** Se o usuário está autenticado */
  isAuthenticated: boolean;
  /** Limpa o erro */
  clearError: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook para importar análises de prova oral
 * @returns Funções e estado para listar e obter análises
 */
export function useProvaOralImport(): UseProvaOralImportReturn {
  const { authFetch, isAuthenticated } = useAuthMagicLink();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Lista todas as análises de prova oral salvas do usuário
   */
  const listAnalyses = useCallback(async (): Promise<SavedProvaOralAnalysis[]> => {
    if (!isAuthenticated) {
      setError('Usuário não autenticado');
      return [];
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await authFetch('/api/prova-oral');

      if (!response.ok) {
        const data = await response.json() as { error?: string };
        throw new Error(data.error || 'Erro ao listar análises');
      }

      const data = await response.json() as { analyses: SavedProvaOralAnalysis[]; count: number };
      return data.analyses;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(message);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [authFetch, isAuthenticated]);

  /**
   * Obtém uma análise específica por ID
   */
  const getAnalysis = useCallback(async (id: string): Promise<SavedProvaOralAnalysis | null> => {
    if (!isAuthenticated) {
      setError('Usuário não autenticado');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await authFetch(`/api/prova-oral/${id}`);

      if (!response.ok) {
        const data = await response.json() as { error?: string };
        throw new Error(data.error || 'Erro ao obter análise');
      }

      const analysis = await response.json() as SavedProvaOralAnalysis;
      return analysis;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [authFetch, isAuthenticated]);

  /**
   * Limpa o erro atual
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    listAnalyses,
    getAnalysis,
    isLoading,
    error,
    isAuthenticated,
    clearError
  };
}

export default useProvaOralImport;

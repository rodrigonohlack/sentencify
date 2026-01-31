/**
 * @file useProvaOralAPI.ts
 * @description Hook para comunicação com a API de análises de prova oral
 */

import { useCallback } from 'react';
import { useAuthMagicLink } from '../../../hooks';
import { useAnalysesStore } from '../stores';
import type { SavedProvaOralAnalysis, ProvaOralResult } from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════

const API_BASE = '/api/prova-oral';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

/** Resposta da API de listagem */
interface ListAnalysesResponse {
  analyses: SavedProvaOralAnalysis[];
  count: number;
}

/** Resposta da API de criação */
interface CreateAnalysisResponse {
  id: string;
  message: string;
}

/** Parâmetros para criação de análise */
export interface CreateProvaOralParams {
  resultado: ProvaOralResult;
  transcricao: string;
  sinteseProcesso: string;
}

/** Retorno do hook useProvaOralAPI */
export interface UseProvaOralAPIReturn {
  fetchAnalyses: () => Promise<SavedProvaOralAnalysis[]>;
  fetchAnalysis: (id: string) => Promise<SavedProvaOralAnalysis | null>;
  createAnalysis: (params: CreateProvaOralParams) => Promise<string | null>;
  deleteAnalysis: (id: string) => Promise<boolean>;
  isLoading: boolean;
  error: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook para comunicação com a API de análises de prova oral
 * Usa JWT do Magic Link para autenticação
 */
export function useProvaOralAPI(): UseProvaOralAPIReturn {
  const { authFetch, isAuthenticated } = useAuthMagicLink();
  const {
    setAnalyses,
    addAnalysis,
    removeAnalysis,
    setLoading,
    setError,
    isLoading,
    error,
  } = useAnalysesStore();

  // ═══════════════════════════════════════════════════════════════════════════
  // LISTAR ANÁLISES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Busca todas as análises do usuário
   * @returns Lista de análises
   */
  const fetchAnalyses = useCallback(
    async (): Promise<SavedProvaOralAnalysis[]> => {
      if (!isAuthenticated) {
        setError('Usuário não autenticado');
        return [];
      }

      setLoading(true);
      setError(null);

      try {
        const res = await authFetch(API_BASE);

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Erro ao buscar análises');
        }

        const data: ListAnalysesResponse = await res.json();
        setAnalyses(data.analyses);
        return data.analyses;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro desconhecido';
        setError(message);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [isAuthenticated, authFetch, setAnalyses, setLoading, setError]
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // BUSCAR ANÁLISE ESPECÍFICA
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Busca uma análise específica pelo ID
   * @param id - ID da análise
   * @returns Análise ou null se não encontrada
   */
  const fetchAnalysis = useCallback(
    async (id: string): Promise<SavedProvaOralAnalysis | null> => {
      if (!isAuthenticated) {
        setError('Usuário não autenticado');
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const res = await authFetch(`${API_BASE}/${id}`);

        if (!res.ok) {
          if (res.status === 404) return null;
          const data = await res.json();
          throw new Error(data.error || 'Erro ao buscar análise');
        }

        return await res.json();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro desconhecido';
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [isAuthenticated, authFetch, setLoading, setError]
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // CRIAR ANÁLISE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Cria uma nova análise
   * @param params - Dados da análise
   * @returns ID da análise criada ou null se falhou
   */
  const createAnalysis = useCallback(
    async (params: CreateProvaOralParams): Promise<string | null> => {
      if (!isAuthenticated) {
        setError('Usuário não autenticado');
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const res = await authFetch(API_BASE, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Erro ao criar análise');
        }

        const data: CreateAnalysisResponse = await res.json();

        // Criar objeto SavedProvaOralAnalysis para adicionar ao store
        const newAnalysis: SavedProvaOralAnalysis = {
          id: data.id,
          numeroProcesso: params.resultado.processo?.numero || params.resultado.processo?.numeroProcesso || null,
          reclamante: params.resultado.processo?.reclamante || null,
          reclamada: params.resultado.processo?.reclamada || null,
          vara: params.resultado.processo?.vara || null,
          transcricao: params.transcricao,
          sinteseProcesso: params.sinteseProcesso,
          resultado: params.resultado,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        addAnalysis(newAnalysis);
        return data.id;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro desconhecido';
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [isAuthenticated, authFetch, addAnalysis, setLoading, setError]
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // EXCLUIR ANÁLISE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Exclui uma análise (soft delete)
   * @param id - ID da análise
   * @returns true se excluiu, false se falhou
   */
  const deleteAnalysis = useCallback(
    async (id: string): Promise<boolean> => {
      if (!isAuthenticated) {
        setError('Usuário não autenticado');
        return false;
      }

      setError(null);

      try {
        const res = await authFetch(`${API_BASE}/${id}`, {
          method: 'DELETE',
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Erro ao excluir análise');
        }

        removeAnalysis(id);
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro desconhecido';
        setError(message);
        return false;
      }
    },
    [isAuthenticated, authFetch, removeAnalysis, setError]
  );

  return {
    fetchAnalyses,
    fetchAnalysis,
    createAnalysis,
    deleteAnalysis,
    isLoading,
    error,
  };
}

export default useProvaOralAPI;

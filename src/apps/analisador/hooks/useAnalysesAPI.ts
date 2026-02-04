/**
 * @file useAnalysesAPI.ts
 * @description Hook para comunicação com a API de análises
 * @version 1.39.0
 */

import { useCallback } from 'react';
import { useAuthMagicLink } from '../../../hooks';
import { useAnalysesStore } from '../stores';
import type {
  SavedAnalysis,
  AnalysisResult,
  ResultadoAudiencia,
} from '../types/analysis.types';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════

const API_BASE = '/api/analyses';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

/** Resposta da API de listagem */
interface ListAnalysesResponse {
  analyses: SavedAnalysis[];
  count: number;
}

/** Resposta da API de criação */
interface CreateAnalysisResponse {
  id: string;
  message: string;
}

/** Resposta da API de atualização em lote */
interface BatchUpdateResponse {
  message: string;
  updatedCount: number;
}

/** Resposta da API de exclusão em lote */
interface BatchDeleteResponse {
  message: string;
  deletedCount: number;
}

/** Parâmetros para criação de análise */
export interface CreateAnalysisParams {
  resultado: AnalysisResult;
  nomeArquivoPeticao?: string;
  nomesArquivosEmendas?: string[];
  nomesArquivosContestacoes?: string[];
  /** @deprecated Use nomesArquivosContestacoes */
  nomeArquivoContestacao?: string;
  dataPauta?: string;
  horarioAudiencia?: string;
}

/** Parâmetros para atualização de análise */
export interface UpdateAnalysisParams {
  dataPauta?: string;
  horarioAudiencia?: string;
  resultadoAudiencia?: ResultadoAudiencia;
  pendencias?: string[];
  observacoes?: string;
  sintese?: string;
}

/** Filtros para listagem */
export interface ListFilters {
  search?: string;
  resultado?: ResultadoAudiencia;
  dataPauta?: string;
}

/** Parâmetros para substituição completa de análise */
export interface ReplaceAnalysisParams {
  resultado: AnalysisResult;
  nomesArquivosContestacoes: string[];
  nomeArquivoPeticao?: string;
  nomesArquivosEmendas?: string[];
}

/** Retorno do hook useAnalysesAPI */
export interface UseAnalysesAPIReturn {
  fetchAnalyses: (filters?: ListFilters) => Promise<SavedAnalysis[]>;
  fetchAnalysis: (id: string) => Promise<SavedAnalysis | null>;
  createAnalysis: (params: CreateAnalysisParams) => Promise<string | null>;
  updateAnalysis: (id: string, params: UpdateAnalysisParams) => Promise<boolean>;
  replaceAnalysisResult: (id: string, params: ReplaceAnalysisParams) => Promise<boolean>;
  deleteAnalysis: (id: string) => Promise<boolean>;
  updateBatchDataPauta: (ids: string[], dataPauta: string | null) => Promise<number>;
  deleteBatch: (ids: string[]) => Promise<number>;
  isLoading: boolean;
  error: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/** Extrai número CNJ do nome do arquivo (formato: [NNNNNNN-DD.AAAA.D.DD.DDDD]) */
function extractNumeroFromFilename(filename?: string): string | null {
  if (!filename) return null;
  const bracketMatch = filename.match(/\[(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})\]/);
  if (bracketMatch) return bracketMatch[1];
  const cnjMatch = filename.match(/(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})/);
  if (cnjMatch) return cnjMatch[1];
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook para comunicação com a API de análises
 * Usa JWT do Magic Link para autenticação
 */
export function useAnalysesAPI(): UseAnalysesAPIReturn {
  const { authFetch, isAuthenticated } = useAuthMagicLink();
  const {
    setAnalyses,
    addAnalysis,
    updateAnalysis: updateStoreAnalysis,
    removeAnalysis,
    removeAnalyses,
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
   * @param filters - Filtros opcionais (search, resultado, dataPauta)
   * @returns Lista de análises
   */
  const fetchAnalyses = useCallback(
    async (filters?: ListFilters): Promise<SavedAnalysis[]> => {
      if (!isAuthenticated) {
        setError('Usuário não autenticado');
        return [];
      }

      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (filters?.search) params.append('search', filters.search);
        if (filters?.resultado) params.append('resultado', filters.resultado);
        if (filters?.dataPauta) params.append('dataPauta', filters.dataPauta);

        const url = params.toString() ? `${API_BASE}?${params}` : API_BASE;
        const res = await authFetch(url);

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
    async (id: string): Promise<SavedAnalysis | null> => {
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
    async (params: CreateAnalysisParams): Promise<string | null> => {
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

        // Migrar contestação antiga para novo formato
        const contestacoesArray = params.nomesArquivosContestacoes
          || (params.nomeArquivoContestacao ? [params.nomeArquivoContestacao] : []);

        // Criar objeto SavedAnalysis para adicionar ao store
        // Priorizar número do arquivo (sempre correto) sobre extração da IA
        const numeroFromFilename = extractNumeroFromFilename(params.nomeArquivoPeticao);
        const numeroFromIA = params.resultado.identificacao?.numeroProcesso;
        const isValidNumeroFromIA = numeroFromIA
          && !numeroFromIA.toLowerCase().includes('não informado')
          && !numeroFromIA.toLowerCase().includes('nao informado');

        const newAnalysis: SavedAnalysis = {
          id: data.id,
          numeroProcesso: numeroFromFilename || (isValidNumeroFromIA ? numeroFromIA : null),
          reclamante: params.resultado.identificacao?.reclamantes?.[0] || null,
          reclamadas: params.resultado.identificacao?.reclamadas || [],
          nomeArquivoPeticao: params.nomeArquivoPeticao || null,
          nomesArquivosEmendas: params.nomesArquivosEmendas || [],
          nomesArquivosContestacoes: contestacoesArray,
          dataPauta: params.dataPauta || null,
          horarioAudiencia: params.horarioAudiencia || null,
          resultadoAudiencia: null,
          pendencias: [],
          observacoes: null,
          sintese: null,
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
  // ATUALIZAR ANÁLISE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Atualiza uma análise existente
   * @param id - ID da análise
   * @param params - Campos a atualizar
   * @returns true se atualizou, false se falhou
   */
  const updateAnalysis = useCallback(
    async (id: string, params: UpdateAnalysisParams): Promise<boolean> => {
      if (!isAuthenticated) {
        setError('Usuário não autenticado');
        return false;
      }

      setError(null);

      // Optimistic: atualiza store imediatamente
      const optimisticUpdate = {
        ...(params.dataPauta !== undefined && { dataPauta: params.dataPauta }),
        ...(params.horarioAudiencia !== undefined && { horarioAudiencia: params.horarioAudiencia }),
        ...(params.resultadoAudiencia !== undefined && { resultadoAudiencia: params.resultadoAudiencia }),
        ...(params.pendencias !== undefined && { pendencias: params.pendencias }),
        ...(params.observacoes !== undefined && { observacoes: params.observacoes }),
        ...(params.sintese !== undefined && { sintese: params.sintese }),
      };
      updateStoreAnalysis(id, optimisticUpdate);

      try {
        const res = await authFetch(`${API_BASE}/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Erro ao atualizar análise');
        }

        return true;
      } catch (err) {
        // Rollback: refetch para restaurar estado real
        fetchAnalyses();
        const message = err instanceof Error ? err.message : 'Erro desconhecido';
        setError(message);
        return false;
      }
    },
    [isAuthenticated, authFetch, updateStoreAnalysis, setError, fetchAnalyses]
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // SUBSTITUIR RESULTADO DA ANÁLISE (REANÁLISE)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Substitui completamente o resultado de uma análise (para reanálise com contestação)
   * @param id - ID da análise
   * @param params - Novo resultado e nomes de arquivos
   * @returns true se atualizou, false se falhou
   */
  const replaceAnalysisResult = useCallback(
    async (id: string, params: ReplaceAnalysisParams): Promise<boolean> => {
      if (!isAuthenticated) {
        setError('Usuário não autenticado');
        return false;
      }

      setError(null);

      try {
        const res = await authFetch(`${API_BASE}/${id}/replace`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Erro ao substituir análise');
        }

        // Atualizar no store local
        updateStoreAnalysis(id, {
          resultado: params.resultado,
          nomesArquivosContestacoes: params.nomesArquivosContestacoes,
          ...(params.nomeArquivoPeticao && { nomeArquivoPeticao: params.nomeArquivoPeticao }),
          ...(params.nomesArquivosEmendas && { nomesArquivosEmendas: params.nomesArquivosEmendas }),
          numeroProcesso: params.resultado.identificacao?.numeroProcesso || null,
          reclamante: params.resultado.identificacao?.reclamantes?.[0] || null,
          reclamadas: params.resultado.identificacao?.reclamadas || [],
        });

        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro desconhecido';
        setError(message);
        return false;
      }
    },
    [isAuthenticated, authFetch, updateStoreAnalysis, setError]
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

  // ═══════════════════════════════════════════════════════════════════════════
  // ATUALIZAR DATA DA PAUTA EM LOTE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Atualiza a data da pauta de múltiplas análises
   * @param ids - IDs das análises
   * @param dataPauta - Nova data da pauta
   * @returns Número de análises atualizadas
   */
  const updateBatchDataPauta = useCallback(
    async (ids: string[], dataPauta: string | null): Promise<number> => {
      if (!isAuthenticated) {
        setError('Usuário não autenticado');
        return 0;
      }

      setError(null);

      try {
        const res = await authFetch(`${API_BASE}/batch/data-pauta`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids, dataPauta }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Erro ao atualizar análises');
        }

        const data: BatchUpdateResponse = await res.json();

        // Atualizar no store
        ids.forEach((id) => {
          updateStoreAnalysis(id, { dataPauta: dataPauta || null });
        });

        return data.updatedCount;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro desconhecido';
        setError(message);
        return 0;
      }
    },
    [isAuthenticated, authFetch, updateStoreAnalysis, setError]
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // EXCLUIR EM LOTE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Exclui múltiplas análises (soft delete)
   * @param ids - IDs das análises
   * @returns Número de análises excluídas
   */
  const deleteBatch = useCallback(
    async (ids: string[]): Promise<number> => {
      if (!isAuthenticated) {
        setError('Usuário não autenticado');
        return 0;
      }

      setError(null);

      try {
        const res = await authFetch(`${API_BASE}/batch`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Erro ao excluir análises');
        }

        const data: BatchDeleteResponse = await res.json();
        removeAnalyses(ids);

        return data.deletedCount;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro desconhecido';
        setError(message);
        return 0;
      }
    },
    [isAuthenticated, authFetch, removeAnalyses, setError]
  );

  return {
    fetchAnalyses,
    fetchAnalysis,
    createAnalysis,
    updateAnalysis,
    replaceAnalysisResult,
    deleteAnalysis,
    updateBatchDataPauta,
    deleteBatch,
    isLoading,
    error,
  };
}

export default useAnalysesAPI;

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useProvaOralImport } from './useProvaOralImport';
import type { SavedProvaOralAnalysis } from '../apps/prova-oral/types';

// Mock do useAuthMagicLink
const mockAuthFetch = vi.fn();
let mockIsAuthenticated = true;

vi.mock('./useAuthMagicLink', () => ({
  useAuthMagicLink: () => ({
    authFetch: mockAuthFetch,
    isAuthenticated: mockIsAuthenticated,
  }),
}));

// Dados de teste
const mockAnalysis: SavedProvaOralAnalysis = {
  id: 'analysis-1',
  numeroProcesso: '0001234-56.2024.5.01.0001',
  reclamante: 'João Silva',
  reclamada: 'Empresa ABC Ltda',
  vara: '1ª Vara do Trabalho',
  transcricao: 'Transcrição do depoimento...',
  sinteseProcesso: 'Síntese do processo...',
  resultado: {
    processo: {
      numero: '0001234-56.2024.5.01.0001',
      reclamante: 'João Silva',
      reclamada: 'Empresa ABC Ltda',
      vara: '1ª Vara do Trabalho',
    },
    depoentes: [],
    sinteses: [],
    analises: [],
    contradicoes: [],
    confissoes: [],
    credibilidade: [],
  },
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-15T10:30:00Z',
};

const mockAnalysis2: SavedProvaOralAnalysis = {
  id: 'analysis-2',
  numeroProcesso: '0009876-54.2024.5.01.0002',
  reclamante: 'Maria Santos',
  reclamada: 'Empresa XYZ S.A.',
  vara: '2ª Vara do Trabalho',
  transcricao: 'Outra transcrição...',
  sinteseProcesso: 'Outra síntese...',
  resultado: {
    processo: {
      numero: '0009876-54.2024.5.01.0002',
      reclamante: 'Maria Santos',
      reclamada: 'Empresa XYZ S.A.',
      vara: '2ª Vara do Trabalho',
    },
    depoentes: [],
    sinteses: [],
    analises: [],
    contradicoes: [],
    confissoes: [],
    credibilidade: [],
  },
  createdAt: '2024-01-16T14:00:00Z',
  updatedAt: '2024-01-16T14:20:00Z',
};

beforeEach(() => {
  vi.clearAllMocks();
  mockIsAuthenticated = true;
});

afterEach(() => {
  vi.resetAllMocks();
});

describe('useProvaOralImport', () => {
  describe('initial state', () => {
    it('should start with correct initial values', () => {
      const { result } = renderHook(() => useProvaOralImport());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.isAuthenticated).toBe(true);
      expect(typeof result.current.listAnalyses).toBe('function');
      expect(typeof result.current.getAnalysis).toBe('function');
      expect(typeof result.current.clearError).toBe('function');
    });

    it('should reflect isAuthenticated from useAuthMagicLink', () => {
      mockIsAuthenticated = false;
      const { result } = renderHook(() => useProvaOralImport());
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('listAnalyses', () => {
    it('should list analyses successfully', async () => {
      mockAuthFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ analyses: [mockAnalysis, mockAnalysis2], count: 2 }),
      });

      const { result } = renderHook(() => useProvaOralImport());
      let analyses: SavedProvaOralAnalysis[] = [];

      await act(async () => {
        analyses = await result.current.listAnalyses();
      });

      expect(mockAuthFetch).toHaveBeenCalledWith('/api/prova-oral');
      expect(analyses).toHaveLength(2);
      expect(analyses[0].id).toBe('analysis-1');
      expect(analyses[1].id).toBe('analysis-2');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should return empty array when not authenticated', async () => {
      mockIsAuthenticated = false;
      const { result } = renderHook(() => useProvaOralImport());
      let analyses: SavedProvaOralAnalysis[] = [];

      await act(async () => {
        analyses = await result.current.listAnalyses();
      });

      expect(mockAuthFetch).not.toHaveBeenCalled();
      expect(analyses).toEqual([]);
      expect(result.current.error).toBe('Usuário não autenticado');
    });

    it('should handle API error (500)', async () => {
      mockAuthFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Erro interno do servidor' }),
      });

      const { result } = renderHook(() => useProvaOralImport());
      let analyses: SavedProvaOralAnalysis[] = [];

      await act(async () => {
        analyses = await result.current.listAnalyses();
      });

      expect(analyses).toEqual([]);
      expect(result.current.error).toBe('Erro interno do servidor');
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle API error without message', async () => {
      mockAuthFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({}),
      });

      const { result } = renderHook(() => useProvaOralImport());
      let analyses: SavedProvaOralAnalysis[] = [];

      await act(async () => {
        analyses = await result.current.listAnalyses();
      });

      expect(analyses).toEqual([]);
      expect(result.current.error).toBe('Erro ao listar análises');
    });

    it('should handle network error', async () => {
      mockAuthFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useProvaOralImport());
      let analyses: SavedProvaOralAnalysis[] = [];

      await act(async () => {
        analyses = await result.current.listAnalyses();
      });

      expect(analyses).toEqual([]);
      expect(result.current.error).toBe('Network error');
    });

    it('should handle unknown error type', async () => {
      mockAuthFetch.mockRejectedValueOnce('string error');

      const { result } = renderHook(() => useProvaOralImport());
      let analyses: SavedProvaOralAnalysis[] = [];

      await act(async () => {
        analyses = await result.current.listAnalyses();
      });

      expect(analyses).toEqual([]);
      expect(result.current.error).toBe('Erro desconhecido');
    });

    it('should set isLoading=true during fetch', async () => {
      let resolvePromise: (value: unknown) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockAuthFetch.mockReturnValueOnce(promise);

      const { result } = renderHook(() => useProvaOralImport());

      // Iniciar a chamada sem aguardar
      let fetchPromise: Promise<SavedProvaOralAnalysis[]>;
      act(() => {
        fetchPromise = result.current.listAnalyses();
      });

      // Verificar que isLoading é true
      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      // Resolver a promise
      await act(async () => {
        resolvePromise!({
          ok: true,
          json: () => Promise.resolve({ analyses: [], count: 0 }),
        });
        await fetchPromise!;
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('getAnalysis', () => {
    it('should get analysis by ID successfully', async () => {
      mockAuthFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAnalysis),
      });

      const { result } = renderHook(() => useProvaOralImport());
      let analysis: SavedProvaOralAnalysis | null = null;

      await act(async () => {
        analysis = await result.current.getAnalysis('analysis-1');
      });

      expect(mockAuthFetch).toHaveBeenCalledWith('/api/prova-oral/analysis-1');
      expect(analysis).not.toBeNull();
      expect(analysis!.id).toBe('analysis-1');
      expect(analysis!.numeroProcesso).toBe('0001234-56.2024.5.01.0001');
      expect(result.current.error).toBeNull();
    });

    it('should return null when not authenticated', async () => {
      mockIsAuthenticated = false;
      const { result } = renderHook(() => useProvaOralImport());
      let analysis: SavedProvaOralAnalysis | null = null;

      await act(async () => {
        analysis = await result.current.getAnalysis('analysis-1');
      });

      expect(mockAuthFetch).not.toHaveBeenCalled();
      expect(analysis).toBeNull();
      expect(result.current.error).toBe('Usuário não autenticado');
    });

    it('should handle 404 error', async () => {
      mockAuthFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Análise não encontrada' }),
      });

      const { result } = renderHook(() => useProvaOralImport());
      let analysis: SavedProvaOralAnalysis | null = null;

      await act(async () => {
        analysis = await result.current.getAnalysis('non-existent');
      });

      expect(analysis).toBeNull();
      expect(result.current.error).toBe('Análise não encontrada');
    });

    it('should handle API error without message', async () => {
      mockAuthFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({}),
      });

      const { result } = renderHook(() => useProvaOralImport());
      let analysis: SavedProvaOralAnalysis | null = null;

      await act(async () => {
        analysis = await result.current.getAnalysis('analysis-1');
      });

      expect(analysis).toBeNull();
      expect(result.current.error).toBe('Erro ao obter análise');
    });

    it('should handle network error', async () => {
      mockAuthFetch.mockRejectedValueOnce(new Error('Connection refused'));

      const { result } = renderHook(() => useProvaOralImport());
      let analysis: SavedProvaOralAnalysis | null = null;

      await act(async () => {
        analysis = await result.current.getAnalysis('analysis-1');
      });

      expect(analysis).toBeNull();
      expect(result.current.error).toBe('Connection refused');
    });

    it('should handle unknown error type', async () => {
      mockAuthFetch.mockRejectedValueOnce({ code: 500 });

      const { result } = renderHook(() => useProvaOralImport());
      let analysis: SavedProvaOralAnalysis | null = null;

      await act(async () => {
        analysis = await result.current.getAnalysis('analysis-1');
      });

      expect(analysis).toBeNull();
      expect(result.current.error).toBe('Erro desconhecido');
    });

    it('should set isLoading=true during fetch', async () => {
      let resolvePromise: (value: unknown) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockAuthFetch.mockReturnValueOnce(promise);

      const { result } = renderHook(() => useProvaOralImport());

      let fetchPromise: Promise<SavedProvaOralAnalysis | null>;
      act(() => {
        fetchPromise = result.current.getAnalysis('analysis-1');
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      await act(async () => {
        resolvePromise!({
          ok: true,
          json: () => Promise.resolve(mockAnalysis),
        });
        await fetchPromise!;
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('clearError', () => {
    it('should clear error state', async () => {
      mockAuthFetch.mockRejectedValueOnce(new Error('Test error'));

      const { result } = renderHook(() => useProvaOralImport());

      // Gerar um erro
      await act(async () => {
        await result.current.listAnalyses();
      });

      expect(result.current.error).toBe('Test error');

      // Limpar o erro
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });

    it('should work when there is no error', () => {
      const { result } = renderHook(() => useProvaOralImport());

      expect(result.current.error).toBeNull();

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('error clearing on new request', () => {
    it('should clear previous error when making new listAnalyses request', async () => {
      // Primeira chamada falha
      mockAuthFetch.mockRejectedValueOnce(new Error('First error'));

      const { result } = renderHook(() => useProvaOralImport());

      await act(async () => {
        await result.current.listAnalyses();
      });

      expect(result.current.error).toBe('First error');

      // Segunda chamada bem-sucedida
      mockAuthFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ analyses: [], count: 0 }),
      });

      await act(async () => {
        await result.current.listAnalyses();
      });

      expect(result.current.error).toBeNull();
    });

    it('should clear previous error when making new getAnalysis request', async () => {
      // Primeira chamada falha
      mockAuthFetch.mockRejectedValueOnce(new Error('First error'));

      const { result } = renderHook(() => useProvaOralImport());

      await act(async () => {
        await result.current.getAnalysis('id-1');
      });

      expect(result.current.error).toBe('First error');

      // Segunda chamada bem-sucedida
      mockAuthFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAnalysis),
      });

      await act(async () => {
        await result.current.getAnalysis('id-2');
      });

      expect(result.current.error).toBeNull();
    });
  });
});

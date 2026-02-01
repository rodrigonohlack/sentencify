/**
 * @file useProvaOralAPI.test.ts
 * @description Testes para o hook useProvaOralAPI
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useProvaOralAPI } from './useProvaOralAPI';
import type { SavedProvaOralAnalysis } from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// MOCKS
// ═══════════════════════════════════════════════════════════════════════════

// Mock do useAuthMagicLink
const mockAuthFetch = vi.fn();
let mockIsAuthenticated = true;
vi.mock('../../../hooks', () => ({
  useAuthMagicLink: () => ({
    authFetch: mockAuthFetch,
    isAuthenticated: mockIsAuthenticated,
  }),
}));

// Mock do store
const mockSetAnalyses = vi.fn();
const mockAddAnalysis = vi.fn();
const mockRemoveAnalysis = vi.fn();
const mockSetLoading = vi.fn();
const mockSetError = vi.fn();
vi.mock('../stores', () => ({
  useAnalysesStore: () => ({
    setAnalyses: mockSetAnalyses,
    addAnalysis: mockAddAnalysis,
    removeAnalysis: mockRemoveAnalysis,
    setLoading: mockSetLoading,
    setError: mockSetError,
    isLoading: false,
    error: null,
  }),
}));

// ═══════════════════════════════════════════════════════════════════════════
// DADOS DE TESTE
// ═══════════════════════════════════════════════════════════════════════════

const mockAnalysis: SavedProvaOralAnalysis = {
  id: 'analysis-1',
  numeroProcesso: '0001234-56.2024.5.01.0001',
  reclamante: 'João Silva',
  reclamada: 'Empresa ABC Ltda',
  vara: '1ª Vara do Trabalho',
  transcricao: 'Transcrição...',
  sinteseProcesso: 'Síntese...',
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

describe('useProvaOralAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAuthenticated = true;
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FETCH ANALYSES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('fetchAnalyses', () => {
    it('should fetch and return list of analyses', async () => {
      mockAuthFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ analyses: [mockAnalysis, mockAnalysis2], count: 2 }),
      });

      const { result } = renderHook(() => useProvaOralAPI());

      let analyses: SavedProvaOralAnalysis[] = [];
      await act(async () => {
        analyses = await result.current.fetchAnalyses();
      });

      expect(mockAuthFetch).toHaveBeenCalledWith('/api/prova-oral');
      expect(analyses).toHaveLength(2);
      expect(analyses[0].id).toBe('analysis-1');
      expect(mockSetAnalyses).toHaveBeenCalledWith([mockAnalysis, mockAnalysis2]);
      expect(mockSetLoading).toHaveBeenCalledWith(true);
      expect(mockSetLoading).toHaveBeenCalledWith(false);
    });

    it('should return empty array when not authenticated', async () => {
      mockIsAuthenticated = false;
      const { result } = renderHook(() => useProvaOralAPI());

      let analyses: SavedProvaOralAnalysis[] = [];
      await act(async () => {
        analyses = await result.current.fetchAnalyses();
      });

      expect(mockAuthFetch).not.toHaveBeenCalled();
      expect(analyses).toEqual([]);
      expect(mockSetError).toHaveBeenCalledWith('Usuário não autenticado');
    });

    it('should handle API error', async () => {
      mockAuthFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Erro interno do servidor' }),
      });

      const { result } = renderHook(() => useProvaOralAPI());

      let analyses: SavedProvaOralAnalysis[] = [];
      await act(async () => {
        analyses = await result.current.fetchAnalyses();
      });

      expect(analyses).toEqual([]);
      expect(mockSetError).toHaveBeenCalledWith('Erro interno do servidor');
    });

    it('should handle API error without message', async () => {
      mockAuthFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      });

      const { result } = renderHook(() => useProvaOralAPI());

      await act(async () => {
        await result.current.fetchAnalyses();
      });

      expect(mockSetError).toHaveBeenCalledWith('Erro ao buscar análises');
    });

    it('should handle network error', async () => {
      mockAuthFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useProvaOralAPI());

      let analyses: SavedProvaOralAnalysis[] = [];
      await act(async () => {
        analyses = await result.current.fetchAnalyses();
      });

      expect(analyses).toEqual([]);
      expect(mockSetError).toHaveBeenCalledWith('Network error');
    });

    it('should handle unknown error type', async () => {
      mockAuthFetch.mockRejectedValueOnce('string error');

      const { result } = renderHook(() => useProvaOralAPI());

      await act(async () => {
        await result.current.fetchAnalyses();
      });

      expect(mockSetError).toHaveBeenCalledWith('Erro desconhecido');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FETCH ANALYSIS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('fetchAnalysis', () => {
    it('should fetch a specific analysis by ID', async () => {
      mockAuthFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAnalysis,
      });

      const { result } = renderHook(() => useProvaOralAPI());

      let analysis: SavedProvaOralAnalysis | null = null;
      await act(async () => {
        analysis = await result.current.fetchAnalysis('analysis-1');
      });

      expect(mockAuthFetch).toHaveBeenCalledWith('/api/prova-oral/analysis-1');
      expect(analysis).not.toBeNull();
      expect(analysis!.id).toBe('analysis-1');
    });

    it('should return null when not authenticated', async () => {
      mockIsAuthenticated = false;
      const { result } = renderHook(() => useProvaOralAPI());

      let analysis: SavedProvaOralAnalysis | null = null;
      await act(async () => {
        analysis = await result.current.fetchAnalysis('analysis-1');
      });

      expect(mockAuthFetch).not.toHaveBeenCalled();
      expect(analysis).toBeNull();
      expect(mockSetError).toHaveBeenCalledWith('Usuário não autenticado');
    });

    it('should return null on 404', async () => {
      mockAuthFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Not found' }),
      });

      const { result } = renderHook(() => useProvaOralAPI());

      let analysis: SavedProvaOralAnalysis | null = null;
      await act(async () => {
        analysis = await result.current.fetchAnalysis('non-existent');
      });

      expect(analysis).toBeNull();
      // 404 não seta erro, apenas retorna null
      expect(mockSetError).toHaveBeenCalledWith(null);
    });

    it('should handle API error', async () => {
      mockAuthFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' }),
      });

      const { result } = renderHook(() => useProvaOralAPI());

      let analysis: SavedProvaOralAnalysis | null = null;
      await act(async () => {
        analysis = await result.current.fetchAnalysis('analysis-1');
      });

      expect(analysis).toBeNull();
      expect(mockSetError).toHaveBeenCalledWith('Server error');
    });

    it('should handle network error', async () => {
      mockAuthFetch.mockRejectedValueOnce(new Error('Connection refused'));

      const { result } = renderHook(() => useProvaOralAPI());

      let analysis: SavedProvaOralAnalysis | null = null;
      await act(async () => {
        analysis = await result.current.fetchAnalysis('analysis-1');
      });

      expect(analysis).toBeNull();
      expect(mockSetError).toHaveBeenCalledWith('Connection refused');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATE ANALYSIS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('createAnalysis', () => {
    const createParams = {
      resultado: mockAnalysis.resultado,
      transcricao: mockAnalysis.transcricao,
      sinteseProcesso: mockAnalysis.sinteseProcesso,
    };

    it('should create analysis and return ID', async () => {
      mockAuthFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'new-analysis-id', message: 'Análise criada' }),
      });

      const { result } = renderHook(() => useProvaOralAPI());

      let id: string | null = null;
      await act(async () => {
        id = await result.current.createAnalysis(createParams);
      });

      expect(mockAuthFetch).toHaveBeenCalledWith('/api/prova-oral', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }));
      expect(id).toBe('new-analysis-id');
      expect(mockAddAnalysis).toHaveBeenCalled();
    });

    it('should transform numero to numeroProcesso', async () => {
      mockAuthFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'new-id', message: 'OK' }),
      });

      const { result } = renderHook(() => useProvaOralAPI());

      await act(async () => {
        await result.current.createAnalysis(createParams);
      });

      // Verificar que a chamada inclui numeroProcesso
      const callBody = JSON.parse(mockAuthFetch.mock.calls[0][1].body);
      expect(callBody.resultado.processo.numeroProcesso).toBe('0001234-56.2024.5.01.0001');
    });

    it('should return null when not authenticated', async () => {
      mockIsAuthenticated = false;
      const { result } = renderHook(() => useProvaOralAPI());

      let id: string | null = null;
      await act(async () => {
        id = await result.current.createAnalysis(createParams);
      });

      expect(mockAuthFetch).not.toHaveBeenCalled();
      expect(id).toBeNull();
      expect(mockSetError).toHaveBeenCalledWith('Usuário não autenticado');
    });

    it('should handle API error', async () => {
      mockAuthFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Dados inválidos' }),
      });

      const { result } = renderHook(() => useProvaOralAPI());

      let id: string | null = null;
      await act(async () => {
        id = await result.current.createAnalysis(createParams);
      });

      expect(id).toBeNull();
      expect(mockSetError).toHaveBeenCalledWith('Dados inválidos');
    });

    it('should handle network error', async () => {
      mockAuthFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useProvaOralAPI());

      let id: string | null = null;
      await act(async () => {
        id = await result.current.createAnalysis(createParams);
      });

      expect(id).toBeNull();
      expect(mockSetError).toHaveBeenCalledWith('Network error');
    });

    it('should add analysis to store on success', async () => {
      mockAuthFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'new-id', message: 'OK' }),
      });

      const { result } = renderHook(() => useProvaOralAPI());

      await act(async () => {
        await result.current.createAnalysis(createParams);
      });

      expect(mockAddAnalysis).toHaveBeenCalledWith(expect.objectContaining({
        id: 'new-id',
        numeroProcesso: '0001234-56.2024.5.01.0001',
        transcricao: mockAnalysis.transcricao,
      }));
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DELETE ANALYSIS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('deleteAnalysis', () => {
    it('should delete analysis and return true', async () => {
      mockAuthFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Análise excluída' }),
      });

      const { result } = renderHook(() => useProvaOralAPI());

      let success = false;
      await act(async () => {
        success = await result.current.deleteAnalysis('analysis-1');
      });

      expect(mockAuthFetch).toHaveBeenCalledWith('/api/prova-oral/analysis-1', {
        method: 'DELETE',
      });
      expect(success).toBe(true);
      expect(mockRemoveAnalysis).toHaveBeenCalledWith('analysis-1');
    });

    it('should return false when not authenticated', async () => {
      mockIsAuthenticated = false;
      const { result } = renderHook(() => useProvaOralAPI());

      let success = false;
      await act(async () => {
        success = await result.current.deleteAnalysis('analysis-1');
      });

      expect(mockAuthFetch).not.toHaveBeenCalled();
      expect(success).toBe(false);
      expect(mockSetError).toHaveBeenCalledWith('Usuário não autenticado');
    });

    it('should handle API error', async () => {
      mockAuthFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Não autorizado' }),
      });

      const { result } = renderHook(() => useProvaOralAPI());

      let success = false;
      await act(async () => {
        success = await result.current.deleteAnalysis('analysis-1');
      });

      expect(success).toBe(false);
      expect(mockSetError).toHaveBeenCalledWith('Não autorizado');
      expect(mockRemoveAnalysis).not.toHaveBeenCalled();
    });

    it('should handle network error', async () => {
      mockAuthFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useProvaOralAPI());

      let success = false;
      await act(async () => {
        success = await result.current.deleteAnalysis('analysis-1');
      });

      expect(success).toBe(false);
      expect(mockSetError).toHaveBeenCalledWith('Network error');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FETCH USERS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('fetchUsers', () => {
    it('should return empty array when not authenticated', async () => {
      mockIsAuthenticated = false;
      const { result } = renderHook(() => useProvaOralAPI());

      let users: { id: string; email: string }[] = [];
      await act(async () => {
        users = await result.current.fetchUsers();
      });

      expect(mockAuthFetch).not.toHaveBeenCalled();
      expect(users).toEqual([]);
    });

    it('should fetch and return list of users', async () => {
      const mockUsers = [
        { id: 'user-1', email: 'user1@test.com' },
        { id: 'user-2', email: 'user2@test.com' },
      ];

      mockAuthFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ users: mockUsers }),
      });

      const { result } = renderHook(() => useProvaOralAPI());

      let users: { id: string; email: string }[] = [];
      await act(async () => {
        users = await result.current.fetchUsers();
      });

      expect(mockAuthFetch).toHaveBeenCalledWith('/api/users');
      expect(users).toEqual(mockUsers);
    });

    it('should return empty array on API error', async () => {
      mockAuthFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Server error' }),
      });

      const { result } = renderHook(() => useProvaOralAPI());

      let users: { id: string; email: string }[] = [];
      await act(async () => {
        users = await result.current.fetchUsers();
      });

      expect(users).toEqual([]);
    });

    it('should handle network errors gracefully', async () => {
      mockAuthFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useProvaOralAPI());

      let users: { id: string; email: string }[] = [];
      await act(async () => {
        users = await result.current.fetchUsers();
      });

      expect(users).toEqual([]);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FETCH SHARING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('fetchSharing', () => {
    it('should return empty array when not authenticated', async () => {
      mockIsAuthenticated = false;
      const { result } = renderHook(() => useProvaOralAPI());

      let recipients: { id: string; email: string }[] = [];
      await act(async () => {
        recipients = await result.current.fetchSharing();
      });

      expect(mockAuthFetch).not.toHaveBeenCalled();
      expect(recipients).toEqual([]);
    });

    it('should fetch current sharing recipients', async () => {
      const mockRecipients = [
        { id: 'user-1', email: 'shared@test.com' },
      ];

      mockAuthFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ recipients: mockRecipients }),
      });

      const { result } = renderHook(() => useProvaOralAPI());

      let recipients: { id: string; email: string }[] = [];
      await act(async () => {
        recipients = await result.current.fetchSharing();
      });

      expect(mockAuthFetch).toHaveBeenCalledWith('/api/prova-oral/sharing');
      expect(recipients).toEqual(mockRecipients);
    });

    it('should return empty array on API error', async () => {
      mockAuthFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Server error' }),
      });

      const { result } = renderHook(() => useProvaOralAPI());

      let recipients: { id: string; email: string }[] = [];
      await act(async () => {
        recipients = await result.current.fetchSharing();
      });

      expect(recipients).toEqual([]);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // UPDATE SHARING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('updateSharing', () => {
    it('should return false when not authenticated', async () => {
      mockIsAuthenticated = false;
      const { result } = renderHook(() => useProvaOralAPI());

      let success = false;
      await act(async () => {
        success = await result.current.updateSharing(['user-1']);
      });

      expect(mockAuthFetch).not.toHaveBeenCalled();
      expect(success).toBe(false);
    });

    it('should update sharing list successfully', async () => {
      mockAuthFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, count: 2 }),
      });

      const { result } = renderHook(() => useProvaOralAPI());

      let success = false;
      await act(async () => {
        success = await result.current.updateSharing(['user-1', 'user-2']);
      });

      expect(mockAuthFetch).toHaveBeenCalledWith('/api/prova-oral/sharing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientIds: ['user-1', 'user-2'] }),
      });
      expect(success).toBe(true);
    });

    it('should handle empty recipientIds array', async () => {
      mockAuthFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, count: 0 }),
      });

      const { result } = renderHook(() => useProvaOralAPI());

      let success = false;
      await act(async () => {
        success = await result.current.updateSharing([]);
      });

      expect(mockAuthFetch).toHaveBeenCalledWith('/api/prova-oral/sharing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientIds: [] }),
      });
      expect(success).toBe(true);
    });

    it('should return false on API error', async () => {
      mockAuthFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Server error' }),
      });

      const { result } = renderHook(() => useProvaOralAPI());

      let success = false;
      await act(async () => {
        success = await result.current.updateSharing(['user-1']);
      });

      expect(success).toBe(false);
    });

    it('should handle network errors gracefully', async () => {
      mockAuthFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useProvaOralAPI());

      let success = false;
      await act(async () => {
        success = await result.current.updateSharing(['user-1']);
      });

      expect(success).toBe(false);
    });
  });
});


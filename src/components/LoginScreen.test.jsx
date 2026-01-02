/**
 * Testes para LoginScreen e useAuth
 * v1.33.41
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// Mock do fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock do localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => { store[key] = value; }),
    removeItem: vi.fn((key) => { delete store[key]; }),
    clear: () => { store = {}; }
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Import após os mocks
import { useAuth } from './LoginScreen';

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('checkAuth', () => {
    it('deve iniciar com isLoading true', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ authEnabled: false })
      });

      const { result } = renderHook(() => useAuth());

      // Estado inicial
      expect(result.current.isLoading).toBe(true);

      // Aguardar o useEffect terminar
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('deve liberar acesso se auth não está habilitada', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ authEnabled: false })
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.authEnabled).toBe(false);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('deve exigir login se auth está habilitada e não há sessão', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ authEnabled: true })
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.authEnabled).toBe(true);
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('deve manter autenticado se há sessão salva', async () => {
      localStorageMock.setItem('sentencify-auth', 'true');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ authEnabled: true })
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAuthenticated).toBe(true);
    });

    it('deve liberar acesso em caso de erro de rede', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Em caso de erro, assume que não há auth
      expect(result.current.authEnabled).toBe(false);
      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  describe('login', () => {
    it('deve autenticar com senha correta', async () => {
      // Mock do check inicial
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ authEnabled: true })
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Mock do login
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });

      let loginResult;
      await act(async () => {
        loginResult = await result.current.login('senha123');
      });

      expect(loginResult.success).toBe(true);
      expect(result.current.isAuthenticated).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('sentencify-auth', 'true');
    });

    it('deve rejeitar senha incorreta', async () => {
      // Mock do check inicial
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ authEnabled: true })
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Mock do login com erro
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ success: false, error: 'Senha incorreta' })
      });

      let loginResult;
      await act(async () => {
        loginResult = await result.current.login('senhaerrada');
      });

      expect(loginResult.success).toBe(false);
      expect(loginResult.error).toBe('Senha incorreta');
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('deve tratar erro de conexão no login', async () => {
      // Mock do check inicial
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ authEnabled: true })
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Mock de erro de rede
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      let loginResult;
      await act(async () => {
        loginResult = await result.current.login('senha123');
      });

      expect(loginResult.success).toBe(false);
      expect(loginResult.error).toBe('Erro de conexão');
    });
  });

  describe('logout', () => {
    it('deve limpar sessão ao fazer logout', async () => {
      localStorageMock.setItem('sentencify-auth', 'true');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ authEnabled: true })
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAuthenticated).toBe(true);

      act(() => {
        result.current.logout();
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('sentencify-auth');
    });
  });

  describe('modo desenvolvimento', () => {
    it('deve aceitar login em modo dev (sem hash configurado)', async () => {
      // Mock do check inicial
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ authEnabled: false })
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Em modo dev, já está autenticado
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.authEnabled).toBe(false);
    });
  });
});

describe('Constantes de autenticação', () => {
  it('AUTH_STORAGE_KEY deve ser sentencify-auth', () => {
    // Verificar que a chave está sendo usada corretamente
    expect(localStorageMock.getItem).toHaveBeenCalledWith('sentencify-auth');
  });
});

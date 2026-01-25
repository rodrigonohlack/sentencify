/**
 * @file LoginScreen.test.tsx
 * @description Testes para o componente LoginScreen e hook useAuth
 * @version 1.38.52
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';
import LoginScreen, { useAuth } from './LoginScreen';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('LoginScreen', () => {
  const mockOnLogin = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Rendering', () => {
    it('should render login screen', () => {
      render(<LoginScreen onLogin={mockOnLogin} />);
      expect(screen.getByText('SentencifyAI')).toBeInTheDocument();
    });

    it('should render password input', () => {
      render(<LoginScreen onLogin={mockOnLogin} />);
      expect(screen.getByPlaceholderText('Senha de acesso')).toBeInTheDocument();
    });

    it('should render submit button', () => {
      render(<LoginScreen onLogin={mockOnLogin} />);
      expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument();
    });

    it('should render lock icon', () => {
      render(<LoginScreen onLogin={mockOnLogin} />);
      expect(screen.getByText('Acesso Restrito')).toBeInTheDocument();
    });

    it('should render description text', () => {
      render(<LoginScreen onLogin={mockOnLogin} />);
      expect(screen.getByText('Digite a senha para continuar')).toBeInTheDocument();
    });

    it('should render app description', () => {
      render(<LoginScreen onLogin={mockOnLogin} />);
      expect(screen.getByText('Ferramenta de decisões trabalhistas')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FORM SUBMISSION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Form Submission', () => {
    it('should call onLogin with password on submit', async () => {
      mockOnLogin.mockResolvedValue({ success: true });
      render(<LoginScreen onLogin={mockOnLogin} />);

      const input = screen.getByPlaceholderText('Senha de acesso');
      fireEvent.change(input, { target: { value: 'test-password' } });
      fireEvent.submit(screen.getByRole('button', { name: /entrar/i }).closest('form')!);

      await waitFor(() => {
        expect(mockOnLogin).toHaveBeenCalledWith('test-password');
      });
    });

    it('should show loading state while submitting', async () => {
      mockOnLogin.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100)));
      render(<LoginScreen onLogin={mockOnLogin} />);

      const input = screen.getByPlaceholderText('Senha de acesso');
      fireEvent.change(input, { target: { value: 'password' } });
      fireEvent.submit(screen.getByRole('button', { name: /entrar/i }).closest('form')!);

      expect(screen.getByText('Entrando...')).toBeInTheDocument();
    });

    it('should disable input while loading', async () => {
      mockOnLogin.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100)));
      render(<LoginScreen onLogin={mockOnLogin} />);

      const input = screen.getByPlaceholderText('Senha de acesso');
      fireEvent.change(input, { target: { value: 'password' } });
      fireEvent.submit(screen.getByRole('button', { name: /entrar/i }).closest('form')!);

      expect(input).toBeDisabled();
    });

    it('should show error message on failed login', async () => {
      mockOnLogin.mockResolvedValue({ success: false, error: 'Senha incorreta' });
      render(<LoginScreen onLogin={mockOnLogin} />);

      const input = screen.getByPlaceholderText('Senha de acesso');
      fireEvent.change(input, { target: { value: 'wrong-password' } });
      fireEvent.submit(screen.getByRole('button', { name: /entrar/i }).closest('form')!);

      await waitFor(() => {
        expect(screen.getByText('Senha incorreta')).toBeInTheDocument();
      });
    });

    it('should clear password on failed login', async () => {
      mockOnLogin.mockResolvedValue({ success: false, error: 'Senha incorreta' });
      render(<LoginScreen onLogin={mockOnLogin} />);

      const input = screen.getByPlaceholderText('Senha de acesso') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'wrong-password' } });
      fireEvent.submit(screen.getByRole('button', { name: /entrar/i }).closest('form')!);

      await waitFor(() => {
        expect(input.value).toBe('');
      });
    });

    it('should show default error message when error is undefined', async () => {
      mockOnLogin.mockResolvedValue({ success: false });
      render(<LoginScreen onLogin={mockOnLogin} />);

      const input = screen.getByPlaceholderText('Senha de acesso');
      fireEvent.change(input, { target: { value: 'password' } });
      fireEvent.submit(screen.getByRole('button', { name: /entrar/i }).closest('form')!);

      await waitFor(() => {
        expect(screen.getByText('Erro desconhecido')).toBeInTheDocument();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INPUT HANDLING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Input Handling', () => {
    it('should update password value on change', () => {
      render(<LoginScreen onLogin={mockOnLogin} />);

      const input = screen.getByPlaceholderText('Senha de acesso') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'mypassword' } });

      expect(input.value).toBe('mypassword');
    });

    it('should have password type input', () => {
      render(<LoginScreen onLogin={mockOnLogin} />);

      const input = screen.getByPlaceholderText('Senha de acesso');
      expect(input).toHaveAttribute('type', 'password');
    });

    it('should have autofocus on password input', () => {
      render(<LoginScreen onLogin={mockOnLogin} />);

      const input = screen.getByPlaceholderText('Senha de acesso');
      expect(input).toHaveFocus();
    });
  });
});

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIAL STATE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Initial State', () => {
    it('should start with isLoading true', () => {
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ authEnabled: true })
      });

      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(true);
    });

    it('should start with authEnabled null', () => {
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ authEnabled: true })
      });

      const { result } = renderHook(() => useAuth());

      expect(result.current.authEnabled).toBeNull();
    });

    it('should start with isAuthenticated false', () => {
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ authEnabled: true })
      });

      const { result } = renderHook(() => useAuth());

      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SESSION RESTORATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Session Restoration', () => {
    it('should restore session from localStorage', async () => {
      localStorageMock.getItem.mockReturnValue('true');
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ authEnabled: true })
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should not call API when session exists in localStorage', async () => {
      localStorageMock.getItem.mockReturnValue('true');

      renderHook(() => useAuth());

      await waitFor(() => {
        expect(mockFetch).not.toHaveBeenCalled();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTH CHECK
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Auth Check', () => {
    it('should check if auth is enabled on mount', async () => {
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ authEnabled: true })
      });

      renderHook(() => useAuth());

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/api/auth'));
      });
    });

    it('should set authEnabled from API response', async () => {
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ authEnabled: true })
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.authEnabled).toBe(true);
      });
    });

    it('should auto-authenticate when auth is disabled', async () => {
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ authEnabled: false })
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });
    });

    it('should handle auth check error gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.authEnabled).toBe(false);
        expect(result.current.isAuthenticated).toBe(true);
      });

      consoleSpy.mockRestore();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // LOGIN
  // ═══════════════════════════════════════════════════════════════════════════

  describe('login', () => {
    it('should login successfully with correct password', async () => {
      mockFetch
        .mockResolvedValueOnce({ json: () => Promise.resolve({ authEnabled: true }) })
        .mockResolvedValueOnce({ json: () => Promise.resolve({ success: true }) });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let loginResult: { success: boolean };
      await act(async () => {
        loginResult = await result.current.login('correct-password');
      });

      expect(loginResult!.success).toBe(true);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should save session to localStorage on successful login', async () => {
      mockFetch
        .mockResolvedValueOnce({ json: () => Promise.resolve({ authEnabled: true }) })
        .mockResolvedValueOnce({ json: () => Promise.resolve({ success: true }) });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.login('password');
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith('sentencify-auth', 'true');
    });

    it('should return error on failed login', async () => {
      mockFetch
        .mockResolvedValueOnce({ json: () => Promise.resolve({ authEnabled: true }) })
        .mockResolvedValueOnce({ json: () => Promise.resolve({ success: false, error: 'Senha incorreta' }) });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let loginResult: { success: boolean; error?: string };
      await act(async () => {
        loginResult = await result.current.login('wrong-password');
      });

      expect(loginResult!.success).toBe(false);
      expect(loginResult!.error).toBe('Senha incorreta');
    });

    it('should handle login network error', async () => {
      mockFetch
        .mockResolvedValueOnce({ json: () => Promise.resolve({ authEnabled: true }) })
        .mockRejectedValueOnce(new Error('Network error'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let loginResult: { success: boolean; error?: string };
      await act(async () => {
        loginResult = await result.current.login('password');
      });

      expect(loginResult!.success).toBe(false);
      expect(loginResult!.error).toBe('Erro de conexão');

      consoleSpy.mockRestore();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // LOGOUT
  // ═══════════════════════════════════════════════════════════════════════════

  describe('logout', () => {
    it('should clear authentication state on logout', async () => {
      localStorageMock.getItem.mockReturnValue('true');

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      act(() => {
        result.current.logout();
      });

      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should remove session from localStorage on logout', async () => {
      localStorageMock.getItem.mockReturnValue('true');

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      act(() => {
        result.current.logout();
      });

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('sentencify-auth');
    });
  });
});

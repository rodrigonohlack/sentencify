/**
 * Tela de Login - Autenticação simples com senha
 * v1.33.41
 *
 * Exibe tela de login quando ACCESS_PASSWORD_HASH está configurado no servidor.
 * Valida senha via POST /api/auth e armazena sessão em localStorage.
 */

import React, { useState, useEffect } from 'react';
import { Lock, Loader2, AlertCircle, Scale } from 'lucide-react';

const AUTH_STORAGE_KEY = 'sentencify-auth';

/**
 * Hook para gerenciar autenticação
 */
export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authEnabled, setAuthEnabled] = useState(null); // null = carregando
  const [isLoading, setIsLoading] = useState(true);

  // Verificar se auth está habilitada e se já está logado
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Verificar se já tem sessão salva
        const savedAuth = localStorage.getItem(AUTH_STORAGE_KEY);
        if (savedAuth === 'true') {
          setIsAuthenticated(true);
        }

        // Verificar se auth está habilitada no servidor
        const response = await fetch('/api/auth');
        const data = await response.json();
        setAuthEnabled(data.authEnabled);

        // Se auth não está habilitada, liberar acesso
        if (!data.authEnabled) {
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('[Auth] Erro ao verificar auth:', error);
        // Em caso de erro, assumir que não há auth (modo desenvolvimento)
        setAuthEnabled(false);
        setIsAuthenticated(true);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (password) => {
    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem(AUTH_STORAGE_KEY, 'true');
        setIsAuthenticated(true);
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Senha incorreta' };
      }
    } catch (error) {
      console.error('[Auth] Erro no login:', error);
      return { success: false, error: 'Erro de conexão' };
    }
  };

  const logout = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setIsAuthenticated(false);
  };

  return {
    isAuthenticated,
    authEnabled,
    isLoading,
    login,
    logout
  };
};

/**
 * Componente de tela de login
 */
const LoginScreen = ({ onLogin }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await onLogin(password);

    if (!result.success) {
      setError(result.error);
      setPassword('');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg shadow-blue-600/30">
            <Scale className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">SentencifyAI</h1>
          <p className="text-slate-400">Ferramenta de decisões trabalhistas</p>
        </div>

        {/* Card de Login */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-slate-700 rounded-lg">
              <Lock className="w-5 h-5 text-slate-300" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Acesso Restrito</h2>
              <p className="text-sm text-slate-400">Digite a senha para continuar</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                placeholder="Senha de acesso"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                autoFocus
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 disabled:shadow-none"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Entrando...</span>
                </>
              ) : (
                <span>Entrar</span>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-slate-500 text-sm mt-6">
          Acesso restrito a usuários autorizados
        </p>
      </div>
    </div>
  );
};

export default LoginScreen;

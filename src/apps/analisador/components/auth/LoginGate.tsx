/**
 * @file LoginGate.tsx
 * @description Componente de autenticação para o Analisador de Prepauta
 * Usa o sistema de Magic Link do Sentencify
 * @version 1.39.0
 */

import React, { useState, useCallback } from 'react';
import {
  Scale,
  Mail,
  Loader2,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  FileSearch,
} from 'lucide-react';
import { useAuthMagicLink } from '../../../../hooks';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

interface LoginGateProps {
  /** Conteúdo a exibir quando autenticado */
  children: React.ReactNode;
}

// ═══════════════════════════════════════════════════════════════════════════
// SUBCOMPONENTES
// ═══════════════════════════════════════════════════════════════════════════

interface MagicLinkFormProps {
  onSuccess: () => void;
}

const MagicLinkForm: React.FC<MagicLinkFormProps> = ({ onSuccess: _onSuccess }) => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [devLink, setDevLink] = useState<string | null>(null);

  const { requestMagicLink } = useAuthMagicLink();

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!email.trim()) {
        setError('Digite seu email');
        return;
      }

      setIsSubmitting(true);
      setError(null);

      const result = await requestMagicLink(email.trim());

      setIsSubmitting(false);

      if (result.success) {
        setSuccess(true);
        // Em desenvolvimento, pode retornar link direto
        if ('devLink' in result && result.devLink) {
          setDevLink(result.devLink);
        }
      } else {
        setError(result.error);
      }
    },
    [email, requestMagicLink]
  );

  if (success) {
    return (
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500/20 rounded-full mb-4">
          <CheckCircle className="w-8 h-8 text-emerald-400" />
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">Link enviado!</h2>
        <p className="text-slate-400 mb-6">
          Verifique seu email e clique no link para entrar.
        </p>

        {/* Dev link (apenas em desenvolvimento) */}
        {devLink && (
          <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
            <p className="text-sm text-amber-400 mb-2">Link de desenvolvimento:</p>
            <a
              href={devLink}
              className="text-sm text-indigo-400 hover:underline break-all"
            >
              {devLink}
            </a>
          </div>
        )}

        <button
          onClick={() => {
            setSuccess(false);
            setEmail('');
          }}
          className="mt-6 text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-2 mx-auto"
        >
          <ArrowLeft className="w-4 h-4" />
          Usar outro email
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Email
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSubmitting}
            autoFocus
            className="w-full pl-11 pr-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:opacity-50"
          />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting || !email.trim()}
        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 disabled:shadow-none"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Enviando...</span>
          </>
        ) : (
          <>
            <Mail className="w-5 h-5" />
            <span>Enviar link de acesso</span>
          </>
        )}
      </button>

      <p className="text-center text-slate-500 text-sm">
        Um link de acesso será enviado para seu email.
      </p>
    </form>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Gate de autenticação - exibe tela de login se não autenticado
 */
export const LoginGate: React.FC<LoginGateProps> = ({ children }) => {
  const { user: _user, loading, isAuthenticated, logout: _logout } = useAuthMagicLink();

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - show login
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo/Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl mb-4 shadow-lg shadow-indigo-600/30">
              <FileSearch className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Analisador de Prepauta
            </h1>
            <p className="text-slate-400">Análise automatizada de processos trabalhistas</p>
          </div>

          {/* Card de Login */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 shadow-xl">
            <MagicLinkForm onSuccess={() => {}} />
          </div>

          {/* Footer */}
          <div className="text-center mt-6">
            <a
              href="/"
              className="text-slate-500 text-sm hover:text-indigo-400 transition-colors flex items-center gap-2 justify-center"
            >
              <Scale className="w-4 h-4" />
              Voltar ao Sentencify
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated - render children with header showing user info
  return (
    <div className="min-h-screen">
      {/* User info bar (integrado no layout do app) */}
      {children}
    </div>
  );
};

/**
 * Hook para expor logout no header
 */
export const useLoginGate = () => {
  const { user, logout, isAuthenticated } = useAuthMagicLink();

  return {
    user,
    isAuthenticated,
    logout,
    userEmail: user?.email || null,
  };
};

export default LoginGate;

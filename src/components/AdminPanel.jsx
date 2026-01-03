/**
 * AdminPanel - Gerenciamento de Emails Autorizados
 * v1.34.4
 *
 * Interface protegida por senha para gerenciar lista de emails
 * autorizados a fazer login via Magic Link.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Lock, Loader2, AlertCircle, Scale, Mail, Plus, Trash2, Users, Database, FileText, ArrowLeft, Check, X } from 'lucide-react';

const API_BASE = typeof import.meta !== 'undefined' && !import.meta.env.PROD
  ? 'http://localhost:3001'
  : '';

/**
 * Tela de Login Admin
 */
const AdminLogin = ({ onLogin, error, loading }) => {
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(password);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-600 rounded-2xl mb-4 shadow-lg shadow-purple-600/30">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Admin</h1>
          <p className="text-slate-400">Gerenciamento de usuários</p>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                placeholder="Senha de administrador"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                autoFocus
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all disabled:opacity-50"
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
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 disabled:shadow-none"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Entrando...</span>
                </>
              ) : (
                <span>Acessar Painel</span>
              )}
            </button>
          </form>
        </div>

        <div className="text-center mt-6">
          <a href="/" className="text-slate-500 hover:text-slate-300 text-sm flex items-center justify-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Voltar para o app
          </a>
        </div>
      </div>
    </div>
  );
};

/**
 * Dashboard Admin
 */
const AdminDashboard = ({ password, onLogout }) => {
  const [emails, setEmails] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newEmail, setNewEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const headers = {
    'Content-Type': 'application/json',
    'X-Admin-Password': password,
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [emailsRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/api/admin/emails`, { headers }),
        fetch(`${API_BASE}/api/admin/stats`, { headers }),
      ]);

      if (!emailsRes.ok || !statsRes.ok) {
        throw new Error('Erro ao carregar dados');
      }

      const emailsData = await emailsRes.json();
      const statsData = await statsRes.json();

      setEmails(emailsData.emails || []);
      setStats(statsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [password]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddEmail = async (e) => {
    e.preventDefault();
    if (!newEmail.trim()) return;

    try {
      setAdding(true);
      setError(null);

      const res = await fetch(`${API_BASE}/api/admin/emails`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ email: newEmail.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao adicionar email');
      }

      setEmails(prev => [data.email, ...prev]);
      setNewEmail('');
      setStats(prev => prev ? { ...prev, allowedEmails: prev.allowedEmails + 1 } : prev);
    } catch (err) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteEmail = async (id) => {
    try {
      setDeleting(id);
      setError(null);

      const res = await fetch(`${API_BASE}/api/admin/emails/${id}`, {
        method: 'DELETE',
        headers,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao remover email');
      }

      setEmails(prev => prev.filter(e => e.id !== id));
      setStats(prev => prev ? { ...prev, allowedEmails: prev.allowedEmails - 1 } : prev);
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-600/20 rounded-xl">
              <Lock className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Painel Admin</h1>
              <p className="text-slate-400 text-sm">Gerenciamento de usuários</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="px-4 py-2 text-slate-400 hover:text-white transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              App
            </a>
            <button
              onClick={onLogout}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            >
              Sair
            </button>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex items-center gap-4">
              <div className="p-3 bg-blue-600/20 rounded-lg">
                <Mail className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.allowedEmails}</p>
                <p className="text-slate-400 text-sm">Emails autorizados</p>
              </div>
            </div>
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex items-center gap-4">
              <div className="p-3 bg-green-600/20 rounded-lg">
                <Users className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.users}</p>
                <p className="text-slate-400 text-sm">Usuários cadastrados</p>
              </div>
            </div>
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex items-center gap-4">
              <div className="p-3 bg-purple-600/20 rounded-lg">
                <FileText className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.models}</p>
                <p className="text-slate-400 text-sm">Modelos salvos</p>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-6 flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-auto">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Add Email Form */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5 text-purple-400" />
            Adicionar Email Autorizado
          </h2>
          <form onSubmit={handleAddEmail} className="flex gap-3">
            <input
              type="email"
              placeholder="email@exemplo.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              disabled={adding}
              className="flex-1 px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={adding || !newEmail.trim()}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all flex items-center gap-2"
            >
              {adding ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  Adicionar
                </>
              )}
            </button>
          </form>
        </div>

        {/* Email List */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-400" />
              Emails Autorizados ({emails.length})
            </h2>
          </div>

          {emails.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <Mail className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum email autorizado ainda.</p>
              <p className="text-sm mt-1">Adicione emails acima para permitir login via Magic Link.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-700">
              {emails.map((email) => (
                <div
                  key={email.id}
                  className="px-6 py-4 flex items-center justify-between hover:bg-slate-700/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-700 rounded-lg">
                      <Mail className="w-4 h-4 text-slate-300" />
                    </div>
                    <div>
                      <p className="text-white font-medium">{email.email}</p>
                      <p className="text-slate-500 text-xs">
                        Adicionado em {new Date(email.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteEmail(email.id)}
                    disabled={deleting === email.id}
                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all disabled:opacity-50"
                    title="Remover email"
                  >
                    {deleting === email.id ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Trash2 className="w-5 h-5" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Componente Principal Admin
 */
const AdminPanel = () => {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (pwd) => {
    setLoading(true);
    setError('');

    try {
      // Testar a senha fazendo uma request às rotas admin
      const res = await fetch(`${API_BASE}/api/admin/stats`, {
        headers: {
          'X-Admin-Password': pwd,
        },
      });

      if (res.ok) {
        setPassword(pwd);
        setAuthenticated(true);
      } else {
        setError('Senha incorreta');
      }
    } catch (err) {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setAuthenticated(false);
    setPassword('');
  };

  if (!authenticated) {
    return <AdminLogin onLogin={handleLogin} error={error} loading={loading} />;
  }

  return <AdminDashboard password={password} onLogout={handleLogout} />;
};

export default AdminPanel;
